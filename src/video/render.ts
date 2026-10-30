/**
 * Frame-accurate rendering API for export (Phase 5). Used by
 * src/video/export (scene.ts → frames.ts); roughly:
 *
 *   controller.pause()                       // the live clock stops writing
 *   for (let n = 0; n < frames; n++) {
 *     const { frame, late } = await prepareFrameReport(project, start + n / fps, entries, {
 *       canvas, videoFor, keepAlive, timeoutMs,
 *     })
 *     renderSceneToContext(canvas, ctx, pageRect(canvas), outWidth / pageRect(canvas).width, { dip: frame.dip })
 *     encoder.encode(new VideoFrame(ctx.canvas, { timestamp: n * 1e6 / fps }))
 *   }
 *   controller.seek(previousTime)            // put the editor back on the playhead frame
 *
 * `prepareFrameReport` uses the same `evaluateTimeline` + `applyFrame` as
 * preview, so export can't drift from what the user saw; it seeks every
 * visible video to its exact media time and waits for the decoded frame
 * (`seeked` + requestVideoFrameCallback, bounded by a timeout) and reports the
 * videos that didn't make it (`late`) so the caller can retry or hold the last
 * good frame — never a poster/blank frame. Audio is mixed separately
 * (export/audio.ts) from the same evaluation.
 *
 * `canvas` may be an off-screen snapshot of the page; `keepAlive` (the editor
 * canvas) keeps the applier from forgetting the live objects' authored state.
 *
 * `renderSceneToContext` draws the page region object by object into any 2D
 * context with its own transform. It never changes the live canvas viewport,
 * zoom or selection; the only live props it touches (`skipOffscreen`,
 * per-object `objectCaching`) are restored before it returns, synchronously.
 */
import { FrameState, evaluateTimeline } from './evaluate'
import { CanvasEntry, applyFrame, pageRect } from './apply'
import { VideoProject } from './model'
import { ignoreError } from '@/lib/logger'

type AnyObj = any

export interface PrepareOptions {
  canvas?: AnyObj
  /** The <video> bound to a canvas object (SceneEngine.videoFor). */
  videoFor?: (objectId: string) => HTMLVideoElement | null
  /** Max wait per video for the frame, ms. */
  timeoutMs?: number
  /**
   * Another canvas whose objects the applier must keep tracking (the live
   * editor canvas while `canvas` is an export snapshot of it).
   */
  keepAlive?: AnyObj
}

const FRAME_EPS = 1e-3

/**
 * Seek `el` to exactly `t` and resolve once that frame is decoded. Resolves
 * `true` when the frame is ready, `false` after `timeoutMs` (the element may
 * still be seeking — the caller decides what to show instead).
 */
export function seekExact(el: HTMLVideoElement, t: number, timeoutMs = 3000): Promise<boolean> {
  const end = Number.isFinite(el.duration) && el.duration > 0 ? el.duration - FRAME_EPS : t
  const target = Math.max(0, Math.min(t, end))
  if (!el.paused) el.pause()
  if (Math.abs(el.currentTime - target) < FRAME_EPS && el.readyState >= 2 && !el.seeking) return Promise.resolve(true)
  return new Promise(resolve => {
    let timer = 0
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      el.removeEventListener('seeked', onSeeked)
      resolve(ok)
    }
    const onSeeked = () => {
      // requestVideoFrameCallback only fires when a frame is *presented*; the
      // export's off-screen (detached) video elements never present, so waiting
      // on it timed out every frame (~2 s/frame). After 'seeked' with data, a
      // drawImage already yields the new frame: use rVFC only for attached
      // elements, and never wait on it for more than a moment.
      const v = el as any
      if (el.isConnected && typeof v.requestVideoFrameCallback === 'function') {
        v.requestVideoFrameCallback(() => finish(true))
        window.setTimeout(() => finish(el.readyState >= 2), 100)
      } else {
        finish(el.readyState >= 2)
      }
    }
    timer = window.setTimeout(() => finish(false), timeoutMs)
    el.addEventListener('seeked', onSeeked)
    try {
      el.currentTime = target
    } catch (err) {
      ignoreError(err, 'seek before metadata — reported as late')
      finish(false)
    }
  })
}

/** The element can never show a frame (load error / no source): don't wait on it. */
export function isBrokenMedia(el: HTMLMediaElement): boolean {
  // NETWORK_NO_SOURCE (3) is also the *initial* state while a freshly created
  // element starts its resource selection, so it only means "broken" when there
  // is genuinely no source. Treating it as broken made exports discard every
  // video before it loaded and render the poster for the whole clip.
  return !!el.error || (el.networkState === 3 && !el.currentSrc && !el.getAttribute?.('src'))
}

export interface PreparedFrameReport {
  frame: FrameState
  /** Visible video objects at `t` (ids). */
  videos: string[]
  /** Of those, the ones not showing their exact frame (seek timed out or media broken). */
  late: string[]
}

/**
 * Evaluate the timeline at `t`, wait until every visible video shows its
 * exact frame, then apply the frame to the canvas objects. Reports which
 * videos made it in time.
 */
export async function prepareFrameReport(
  project: VideoProject,
  t: number,
  objects: CanvasEntry[],
  opts: PrepareOptions = {},
): Promise<PreparedFrameReport> {
  const frame = evaluateTimeline(project, t, objects)
  const videos: string[] = []
  const late: string[] = []
  const waits: Promise<void>[] = []
  for (const o of objects) {
    const s = frame.objects[o.id]
    if (!s || !s.visible || s.mediaTime === undefined) continue
    const el = opts.videoFor?.(o.id)
    if (!el) continue
    videos.push(o.id)
    if (isBrokenMedia(el)) {
      late.push(o.id)
      continue
    }
    waits.push(
      seekExact(el, s.mediaTime, opts.timeoutMs).then(ok => {
        if (!ok || el.readyState < 2) late.push(o.id)
      }),
    )
  }
  await Promise.all(waits)
  const target = applyTarget(opts)
  const page = opts.canvas ? pageRect(opts.canvas) : { width: 0, height: 0 }
  // `playing: true` — export always shows animation, never the editing rest pose.
  applyFrame(objects, frame, { project, playing: true, page }, target)
  return { frame, videos, late }
}

/**
 * Evaluate the timeline at `t`, wait until every visible video shows its
 * exact frame, then apply the frame to the canvas objects.
 */
export async function prepareFrame(
  project: VideoProject,
  t: number,
  objects: CanvasEntry[],
  opts: PrepareOptions = {},
): Promise<FrameState> {
  return (await prepareFrameReport(project, t, objects, opts)).frame
}

/**
 * The canvas `applyFrame` sees. When rendering a snapshot (`keepAlive` = the
 * live editor canvas), its objects are listed too so applying export frames
 * never makes the applier forget the live objects' authored state.
 */
function applyTarget(opts: PrepareOptions): AnyObj {
  if (!opts.keepAlive || !opts.canvas) return opts.canvas
  const own = opts.canvas
  const live = opts.keepAlive
  return {
    _currentTransform: undefined,
    getObjects: () => [...(own.getObjects?.() || []), ...(live.getObjects?.() || [])],
  }
}

export interface FrameBox {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Draw the canvas objects inside `frameBox` (canvas/scene coordinates) into
 * `ctx`, scaled by `scale` (output px per scene px), origin at the box's
 * top-left. Optional full-frame dip-to-black on top.
 */
export function renderSceneToContext(
  canvas: AnyObj,
  ctx: CanvasRenderingContext2D,
  frameBox: FrameBox,
  scale: number,
  opts: { dip?: number; background?: string } = {},
): void {
  const objects: AnyObj[] = canvas.getObjects ? canvas.getObjects() : []
  const prevSkip = canvas.skipOffscreen
  const caching = objects.map(o => o.objectCaching)
  canvas.skipOffscreen = false
  ctx.save()
  try {
    ctx.setTransform(scale, 0, 0, scale, -frameBox.left * scale, -frameBox.top * scale)
    ctx.beginPath()
    ctx.rect(frameBox.left, frameBox.top, frameBox.width, frameBox.height)
    ctx.clip()
    if (opts.background) {
      ctx.fillStyle = opts.background
      ctx.fillRect(frameBox.left, frameBox.top, frameBox.width, frameBox.height)
    }
    objects.forEach(o => {
      if (!o || o.excludeFromExport) return
      // Draw at full output resolution, not from a cache sized for the live zoom.
      o.objectCaching = false
      o.render(ctx)
    })
    if (opts.dip && opts.dip > 0) {
      ctx.globalAlpha = Math.min(1, opts.dip)
      ctx.fillStyle = '#000'
      ctx.fillRect(frameBox.left, frameBox.top, frameBox.width, frameBox.height)
    }
  } finally {
    ctx.restore()
    objects.forEach((o, i) => {
      if (o) o.objectCaching = caching[i]
    })
    canvas.skipOffscreen = prevSkip
  }
}
