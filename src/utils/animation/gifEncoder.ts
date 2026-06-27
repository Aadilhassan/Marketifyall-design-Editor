import { restoreAllBases } from './driver'
import { renderDesignFrame, DesignRect, VideoTarget } from './exporter'
import { computeGifPlan } from './exportHelpers'

export interface GifRecordOptions {
  fabricCanvas: any
  designRect: DesignRect
  outWidth: number
  outHeight: number
  durationSec: number
  backgroundColor?: string
  videoTargets?: VideoTarget[]
  onProgress?: (p: number, phase?: string) => void
}

export interface GifResult {
  blob: Blob
  ext: 'gif'
  mime: 'image/gif'
}

/** Renders the animated design frame-by-frame and encodes a real GIF.
 *  gifenc is dynamically imported so it never weighs down the initial bundle. */
export async function recordAnimatedGif(opts: GifRecordOptions): Promise<GifResult> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')

  const plan = computeGifPlan({
    durationSec: opts.durationSec,
    srcWidth: opts.outWidth,
    srcHeight: opts.outHeight,
  })

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = plan.width
  exportCanvas.height = plan.height
  const ctx = exportCanvas.getContext('2d')!
  const mult = plan.width / Math.max(1, opts.designRect.width)
  const gif = GIFEncoder()

  const fabricCanvas = opts.fabricCanvas
  const savedVpt = [...(fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0])]
  const savedZoom = fabricCanvas.getZoom ? fabricCanvas.getZoom() : 1
  const savedSelection = fabricCanvas.selection
  const safe = (fn: () => void) => { try { fn() } catch { /* ignore */ } }
  // Render GIF frames in design space (identity viewport), matching the video
  // exporter, so a zoomed/panned editor canvas still exports the full design.
  safe(() => fabricCanvas.setViewportTransform && fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]))
  safe(() => fabricCanvas.setZoom && fabricCanvas.setZoom(1))
  safe(() => fabricCanvas.discardActiveObject && fabricCanvas.discardActiveObject())
  safe(() => { fabricCanvas.selection = false })

  try {
    for (let i = 0; i < plan.frameCount; i++) {
      const t = plan.frameCount > 1 ? (i / (plan.frameCount - 1)) * opts.durationSec : 0
      renderDesignFrame({
        ctx,
        exportCanvas,
        fabricCanvas: opts.fabricCanvas,
        designRect: opts.designRect,
        outWidth: plan.width,
        outHeight: plan.height,
        backgroundColor: opts.backgroundColor || '#ffffff',
        videoTargets: opts.videoTargets || [],
        mult,
        t,
      })
      const { data } = ctx.getImageData(0, 0, plan.width, plan.height)
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      gif.writeFrame(index, plan.width, plan.height, { palette, delay: plan.delayMs })
      opts.onProgress?.(Math.min(99, (i / plan.frameCount) * 100), 'Encoding GIF…')
      // Yield to the event loop so the progress UI can paint.
      await new Promise(r => setTimeout(r, 0))
    }
    gif.finish()
    const bytes = gif.bytes()
    return { blob: new Blob([bytes], { type: 'image/gif' }), ext: 'gif', mime: 'image/gif' }
  } finally {
    safe(() => fabricCanvas.setViewportTransform && fabricCanvas.setViewportTransform(savedVpt))
    safe(() => fabricCanvas.setZoom && fabricCanvas.setZoom(savedZoom))
    safe(() => { fabricCanvas.selection = savedSelection })
    safe(() => restoreAllBases(fabricCanvas))
    safe(() => fabricCanvas.renderAll && fabricCanvas.renderAll())
    safe(() => exportCanvas.remove())
  }
}
