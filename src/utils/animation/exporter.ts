/**
 * WYSIWYG video recorder.
 *
 * Drives the SAME animation engine used by the live preview, frame by frame,
 * and captures the composited result with MediaRecorder — so whatever you see
 * animating in the editor is exactly what lands in the downloaded file
 * (animations, filters, transitions, kinetic text), with audio from any video
 * clips. Self-contained: it does not depend on the React playback clock.
 *
 * Robustness: every per-frame step is isolated so a single bad frame can't
 * break the capture loop, and the promise is GUARANTEED to settle (a hard
 * watchdog force-stops the recorder even if requestAnimationFrame stalls).
 */
import { applyAnimationsToCanvas, getAnimOpacity, restoreAllBases } from './driver'
import { ignoreError } from '@/lib/logger'

export interface DesignRect {
  left: number
  top: number
  width: number
  height: number
}

export interface VideoTarget {
  el: HTMLVideoElement
  rect: DesignRect // in fabric/design coordinates (authored, used as fallback)
  start: number
  duration: number
  /** The fabric object backing this clip — read live each frame so clip
   *  transitions (fade/slide/zoom) on the video bake into the export. */
  obj?: any
}

export interface RecordOptions {
  fabricCanvas: any
  designRect: DesignRect
  outWidth: number
  outHeight: number
  fps: number
  durationSec: number
  bitrate: number
  format: 'mp4' | 'webm'
  backgroundColor?: string
  videoTargets?: VideoTarget[]
  onProgress?: (p: number, phase?: string) => void
}

export interface RecordResult {
  blob: Blob
  ext: string
  mime: string
}

function pickMime(format: 'mp4' | 'webm'): { mime: string; ext: string } {
  const supported = (t: string) => {
    try {
      return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)
    } catch {
      return false
    }
  }
  if (format === 'mp4') {
    if (supported('video/mp4;codecs=h264')) return { mime: 'video/mp4;codecs=h264', ext: 'mp4' }
    if (supported('video/mp4')) return { mime: 'video/mp4', ext: 'mp4' }
  }
  if (supported('video/webm;codecs=vp9')) return { mime: 'video/webm;codecs=vp9', ext: 'webm' }
  if (supported('video/webm;codecs=vp8')) return { mime: 'video/webm;codecs=vp8', ext: 'webm' }
  if (supported('video/webm')) return { mime: 'video/webm', ext: 'webm' }
  return { mime: '', ext: 'webm' }
}

export interface FrameRenderParams {
  ctx: CanvasRenderingContext2D
  exportCanvas: HTMLCanvasElement
  fabricCanvas: any
  designRect: DesignRect
  outWidth: number
  outHeight: number
  backgroundColor: string
  videoTargets: VideoTarget[]
  mult: number
  t: number
}

/** Renders ONE composited frame (animations + design crop + live video
 *  overlays) into the given 2D context. Shared by the video recorder and the
 *  GIF encoder so both produce identical output. */
export function renderDesignFrame(p: FrameRenderParams): void {
  const { ctx, exportCanvas, fabricCanvas, designRect, outWidth, outHeight, backgroundColor, videoTargets, mult, t } = p
  try {
    applyAnimationsToCanvas(fabricCanvas, t, true)
    fabricCanvas.renderAll()
  } catch (err) {
    ignoreError(err, 'bad animation frame — skipped in export')
  }
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
  try {
    const cropped = fabricCanvas.toCanvasElement(mult, {
      left: designRect.left,
      top: designRect.top,
      width: designRect.width,
      height: designRect.height,
    })
    if (cropped) ctx.drawImage(cropped, 0, 0, exportCanvas.width, exportCanvas.height)
  } catch (err) {
    ignoreError(err, 'bad crop frame — skipped in export')
  }
  for (const v of videoTargets) {
    if (t < v.start || t >= v.start + v.duration) continue
    if (v.el.readyState < 2) continue
    let rect = v.rect
    let opacity = 1
    let angle = 0
    if (v.obj) {
      const o = v.obj
      const w0 = (o.width || rect.width) * (o.scaleX || 1)
      const h0 = (o.height || rect.height) * (o.scaleY || 1)
      let l0 = o.left != null ? o.left : rect.left
      let tp0 = o.top != null ? o.top : rect.top
      if (o.originX === 'center') l0 -= w0 / 2
      if (o.originY === 'center') tp0 -= h0 / 2
      rect = { left: l0, top: tp0, width: w0, height: h0 }
      opacity = getAnimOpacity(o) ?? (o.opacity == null ? 1 : o.opacity)
      angle = o.angle || 0
    }
    if (opacity <= 0.001) continue
    const x = ((rect.left - designRect.left) / designRect.width) * outWidth
    const y = ((rect.top - designRect.top) / designRect.height) * outHeight
    const w = (rect.width / designRect.width) * outWidth
    const h = (rect.height / designRect.height) * outHeight
    try {
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity))
      if (angle) {
        ctx.translate(x + w / 2, y + h / 2)
        ctx.rotate((angle * Math.PI) / 180)
        ctx.drawImage(v.el, -w / 2, -h / 2, w, h)
      } else {
        ctx.drawImage(v.el, x, y, w, h)
      }
      ctx.restore()
    } catch {
      ctx.restore()
    }
  }
}

export async function recordAnimatedVideo(opts: RecordOptions): Promise<RecordResult> {
  const {
    fabricCanvas,
    designRect,
    outWidth,
    outHeight,
    fps,
    durationSec,
    bitrate,
    format,
    backgroundColor = '#ffffff',
    videoTargets = [],
    onProgress,
  } = opts

  const { mime, ext } = pickMime(format)

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = Math.max(2, Math.round(outWidth))
  exportCanvas.height = Math.max(2, Math.round(outHeight))
  // Keep the capture canvas in the DOM (off-screen) so the browser paints it
  // and captureStream reliably produces a frame on every rAF tick.
  exportCanvas.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none;opacity:0.01;'
  document.body.appendChild(exportCanvas)
  const ctx = exportCanvas.getContext('2d')!
  // Paint one frame immediately so the captured stream has content from t=0.
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

  // Auto-capture the canvas at the target fps: the browser samples it on a steady
  // clock while we repaint it every animation frame (real-time loop below). This
  // yields SMOOTH video. The previous manual captureStream(0) + requestFrame()
  // approach, paced by setTimeout(frameMs), produced uneven frame timing — choppy
  // "stop-motion" output — because MediaRecorder records in wall-clock time and
  // the per-frame render cost made the requestFrame cadence drift.
  let stream: MediaStream
  try {
    stream = exportCanvas.captureStream(fps)
  } catch {
    stream = (exportCanvas as any).captureStream()
  }

  videoTargets.forEach(v => {
    try {
      const vs = (v.el as any).captureStream?.() || (v.el as any).mozCaptureStream?.()
      vs?.getAudioTracks?.().forEach((t: MediaStreamTrack) => stream.addTrack(t))
    } catch (err) {
      ignoreError(err, 'export compositor best-effort step')
    }
  })

  const recorderOpts: MediaRecorderOptions = { videoBitsPerSecond: bitrate }
  if (mime) recorderOpts.mimeType = mime
  const recorder = new MediaRecorder(stream, recorderOpts)
  const chunks: Blob[] = []
  recorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  // Snapshot fabric state so we can restore the editor exactly afterwards.
  const savedVpt = [...(fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0])]
  const savedZoom = fabricCanvas.getZoom ? fabricCanvas.getZoom() : 1
  const savedSelection = fabricCanvas.selection
  const savedActive = fabricCanvas.getActiveObject ? fabricCanvas.getActiveObject() : null
  const guidelines = (fabricCanvas as any).guidelines
  const savedGuidelines = guidelines?.enabled
  const savedRenderTop = fabricCanvas.renderTopLayer

  const safe = (fn: () => void) => {
    try {
      fn()
    } catch (err) {
      ignoreError(err, 'export compositor best-effort step')
    }
  }

  safe(() => {
    fabricCanvas.selection = false
  })
  safe(() => fabricCanvas.discardActiveObject && fabricCanvas.discardActiveObject())
  safe(() => {
    if (guidelines) guidelines.enabled = false
  })
  if (typeof savedRenderTop === 'function') {
    safe(() => {
      fabricCanvas.renderTopLayer = function (c: CanvasRenderingContext2D) {
        if (!c || !this.contextTop) return this
        return savedRenderTop.call(this, c)
      }
    })
  }
  safe(() => fabricCanvas.setViewportTransform && fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]))
  safe(() => fabricCanvas.setZoom && fabricCanvas.setZoom(1))

  const mult = outWidth / Math.max(1, designRect.width)

  videoTargets.forEach(v =>
    safe(() => {
      v.el.currentTime = 0
      v.el.muted = false
      // The export is kicked off behind an `await` (canvas prep / preloading), so
      // the original click gesture has expired by now and an UNMUTED play() can be
      // blocked by the autoplay policy — which froze the source at frame 0 and
      // baked a still image into the video. Fall back to muted playback so the
      // frames always advance (audio is captured separately via captureStream).
      const p = v.el.play()
      if (p && (p as Promise<void>).catch) {
        ;(p as Promise<void>).catch(() => {
          v.el.muted = true
          v.el.play().catch((err) => ignoreError(err, 'export: video play() interrupted'))
        })
      }
    })
  )

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    safe(() => stream.getTracks().forEach(t => t.stop()))
    safe(() => exportCanvas.parentNode && exportCanvas.parentNode.removeChild(exportCanvas))
    videoTargets.forEach(v => safe(() => v.el.pause()))
    safe(() => restoreAllBases(fabricCanvas))
    safe(() => fabricCanvas.setViewportTransform && fabricCanvas.setViewportTransform(savedVpt))
    safe(() => fabricCanvas.setZoom && fabricCanvas.setZoom(savedZoom))
    safe(() => {
      fabricCanvas.selection = savedSelection
    })
    safe(() => {
      fabricCanvas.renderTopLayer = savedRenderTop
    })
    safe(() => {
      if (guidelines) guidelines.enabled = savedGuidelines
    })
    safe(() => {
      if (savedActive && fabricCanvas.setActiveObject) fabricCanvas.setActiveObject(savedActive)
    })
    safe(() => fabricCanvas.renderAll && fabricCanvas.renderAll())
  }

  return new Promise<RecordResult>(resolve => {
    let settled = false
    let watchdog: any = null
    let keepAlive: any = null
    const finish = () => {
      if (settled) return
      settled = true
      if (watchdog) clearTimeout(watchdog)
      if (keepAlive) clearInterval(keepAlive)
      cleanup()
      onProgress?.(100, 'Complete!')
      resolve({ blob: new Blob(chunks, { type: mime || 'video/webm' }), ext, mime })
    }

    recorder.onstop = finish
    recorder.onerror = finish

    const stopRecorder = () => {
      try {
        if (recorder.state !== 'inactive') {
          try {
            recorder.requestData()
          } catch (err) {
            ignoreError(err, 'export cleanup')
          }
          recorder.stop()
        } else finish()
      } catch {
        finish()
      }
    }

    let startWall = 0
    let stopScheduled = false
    let lastRenderWall = 0

    const renderFrame = (t: number) => {
      renderDesignFrame({
        ctx,
        exportCanvas,
        fabricCanvas,
        designRect,
        outWidth,
        outHeight,
        backgroundColor,
        videoTargets,
        mult,
        t,
      })
    }

    // Paint the frame for the CURRENT elapsed time, and detect completion. Driven
    // by BOTH requestAnimationFrame (smooth while the tab is focused) AND a timer
    // (rAF is fully suspended in a backgrounded tab — relying on it alone left the
    // capture empty/truncated when the user switched tabs mid-export). captureStream
    // samples whatever is painted, so either driver keeps real frames flowing.
    const renderNow = () => {
      if (settled || stopScheduled) return
      try {
        lastRenderWall = performance.now()
        const elapsed = (lastRenderWall - startWall) / 1000
        const t = Math.min(durationSec, elapsed)
        // Keep each in-window video on the exact frame this timestamp needs. Relying
        // on real-time play() alone froze exports on a single frame whenever playback
        // was throttled (autoplay policy, a backgrounded tab, or another effect
        // pausing the element). We still play() for smooth audio when it works, but
        // also nudge currentTime — a seek advances the decoded frame even when
        // playback is suspended, so the exported video actually MOVES.
        for (const v of videoTargets) {
          if (t < v.start || t >= v.start + v.duration) continue
          if (v.el.paused) {
            try {
              v.el.muted = true
              const pp = v.el.play()
              if (pp && (pp as Promise<void>).catch) (pp as Promise<void>).catch((err) => ignoreError(err, 'export: pause() race'))
            } catch (err) {
              ignoreError(err, 'export teardown')
            }
          }
          const expected = t - v.start
          const vDur = v.el.duration || v.duration || expected
          if (Math.abs(v.el.currentTime - expected) > 0.34) {
            try { v.el.currentTime = Math.max(0, Math.min(expected, vDur - 0.05)) } catch (err) { ignoreError(err, 'export teardown') }
          }
        }
        renderFrame(t)
        try {
          onProgress?.(Math.min(99, (t / Math.max(0.001, durationSec)) * 100), 'Rendering...')
        } catch (err) {
          ignoreError(err, 'export teardown')
        }
        if (elapsed >= durationSec) {
          // Hold the final frame briefly so it's captured, then stop.
          stopScheduled = true
          setTimeout(stopRecorder, 140)
        }
      } catch {
        stopRecorder()
      }
    }

    const rafLoop = () => {
      if (settled || stopScheduled) return
      renderNow()
      requestAnimationFrame(rafLoop)
    }

    try {
      // timeslice => MediaRecorder flushes data chunks periodically, so the output
      // has content even if the stream stalls (instead of one all-or-nothing chunk).
      recorder.start(250)
      onProgress?.(2, 'Rendering...')
      startWall = performance.now()
      lastRenderWall = startWall
      requestAnimationFrame(rafLoop)
      // Keep-alive is a STALL DETECTOR, not a second render loop: it only paints
      // when rAF hasn't run recently (i.e. the tab was backgrounded and rAF was
      // suspended). When focused, rAF keeps lastRenderWall fresh so this never
      // double-renders — running both loops in parallel saturated the main thread.
      keepAlive = setInterval(() => {
        if (settled || stopScheduled) return
        if (performance.now() - lastRenderWall > 250) renderNow()
      }, 250)
      // Hard watchdog: force-finish even if every loop stalls.
      watchdog = setTimeout(stopRecorder, durationSec * 1000 + 5000)
    } catch {
      finish()
    }
  })
}

export function downloadVideoBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
