/**
 * Deterministic frame loop for export.
 *
 * Frame n shows project time t = range.start + n / fps. For each frame the
 * scene evaluates the timeline, seeks every visible video to its exact media
 * time and waits for the decoded frame (render.ts), applies the frame and
 * draws it into the output canvas; only then is the frame handed to the sink
 * (encoder / recorder / GIF writer). Nothing is real-time, so a slow seek
 * delays the export instead of producing a blank or poster frame.
 *
 * A video that misses its frame gets one retry with a longer timeout; if it
 * still isn't there, the scene draws that video's last good frame for this
 * frame only. After a few consecutive misses the loop stops retrying (it
 * would only slow the export down) but keeps holding frames.
 */
import { TimeRange, frameCount, frameDurationUs, frameTime, frameTimestampUs } from './settings'

export interface PreparedFrame {
  /** 0..1 dip-to-black over the whole frame. */
  dip: number
  /** Visible video objects at this time. */
  videos: string[]
  /** Visible videos that are not showing their exact frame. */
  late: string[]
}

/** What the loop needs from a scene (see scene.ts for the fabric implementation). */
export interface FrameScene {
  prepare(t: number, timeoutMs: number): Promise<PreparedFrame>
  /** Show the last good frame of each late video for the next draw; returns the undo. */
  holdLastGood(ids: string[]): () => void
  /** The given videos were just drawn at their exact frame: remember it. */
  keepGood(ids: string[]): void
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, dip: number): void
}

export interface FrameInfo {
  /** Position in the output (0-based, consecutive). */
  index: number
  count: number
  /** Project time of this frame. */
  time: number
  timestampUs: number
  durationUs: number
  /** Videos drawn from their last good frame. */
  held: string[]
}

export interface RenderFramesOptions {
  range: TimeRange
  fps: number
  width: number
  height: number
  /** Output canvas (created when omitted). */
  canvas?: HTMLCanvasElement
  /** Render only these frame numbers (palette sampling); default all. */
  only?: number[]
  timeoutMs?: number
  retryTimeoutMs?: number
  signal?: AbortSignal
  onFrame: (canvas: HTMLCanvasElement, info: FrameInfo) => void | Promise<void>
  onProgress?: (done: number, total: number) => void
}

export interface FrameStats {
  frames: number
  /** Frames where at least one video was drawn from its last good frame. */
  heldFrames: number
  /** Videos that missed at least one frame. */
  heldVideos: string[]
}

export class ExportAbortedError extends Error {
  constructor() {
    super('Export cancelled')
    this.name = 'AbortError'
  }
}

export const isAbort = (err: unknown): boolean =>
  err instanceof ExportAbortedError || (!!err && (err as any).name === 'AbortError')

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ExportAbortedError()
}

const DEFAULT_TIMEOUT = 3000
const DEGRADE_AFTER = 3
const DEGRADED_TIMEOUT = 400
const YIELD_EVERY_MS = 40

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const nextTask = () => new Promise<void>(r => setTimeout(r, 0))

export async function renderFrames(scene: FrameScene, opts: RenderFramesOptions): Promise<FrameStats> {
  const total = frameCount(opts.range, opts.fps)
  const indices = opts.only ? opts.only.filter(n => n >= 0 && n < total) : null
  const count = indices ? indices.length : total
  const canvas = opts.canvas || document.createElement('canvas')
  canvas.width = opts.width
  canvas.height = opts.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create a 2D canvas for export')

  const baseTimeout = opts.timeoutMs ?? DEFAULT_TIMEOUT
  const retryTimeout = opts.retryTimeoutMs ?? baseTimeout * 2
  const heldVideos = new Set<string>()
  let heldFrames = 0
  let consecutiveMisses = 0
  let lastYield = now()

  for (let i = 0; i < count; i++) {
    throwIfAborted(opts.signal)
    const n = indices ? indices[i] : i
    const t = frameTime(opts.range, opts.fps, n)
    const degraded = consecutiveMisses >= DEGRADE_AFTER

    let p = await scene.prepare(t, degraded ? Math.min(DEGRADED_TIMEOUT, baseTimeout) : baseTimeout)
    throwIfAborted(opts.signal)
    if (p.late.length && !degraded) {
      p = await scene.prepare(t, retryTimeout)
      throwIfAborted(opts.signal)
    }

    const held = p.late.slice()
    let undo: (() => void) | null = null
    if (held.length) {
      heldFrames++
      consecutiveMisses++
      held.forEach(id => heldVideos.add(id))
      undo = scene.holdLastGood(held)
    } else {
      consecutiveMisses = 0
    }
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, opts.width, opts.height)
      scene.draw(ctx, opts.width, opts.height, p.dip)
    } finally {
      undo?.()
    }
    const good = p.videos.filter(id => !held.includes(id))
    if (good.length) scene.keepGood(good)

    await opts.onFrame(canvas, {
      index: i,
      count,
      time: t,
      timestampUs: frameTimestampUs(i, opts.fps),
      durationUs: frameDurationUs(i, opts.fps),
      held,
    })
    opts.onProgress?.(i + 1, count)
    // Frames without video resolve in microtasks only — let the UI paint now and then.
    if (now() - lastYield > YIELD_EVERY_MS) {
      await nextTask()
      lastYield = now()
    }
  }
  return { frames: count, heldFrames, heldVideos: Array.from(heldVideos) }
}

/** The live playback clock, as far as export cares. */
export interface PausableClock {
  readonly time: number
  readonly playing: boolean
  pause(): void
  seek(t: number): void
}

/**
 * Pause the live clock for the duration of `fn` and put the playhead back
 * where it was afterwards (also on error/cancel). If the user started
 * playback meanwhile (snapshot exports leave the editor usable), it's left alone.
 */
export async function withPausedClock<T>(clock: PausableClock | null | undefined, fn: () => Promise<T>): Promise<T> {
  if (!clock) return fn()
  const t0 = clock.time
  clock.pause()
  try {
    return await fn()
  } finally {
    if (!clock.playing) clock.seek(t0)
  }
}
