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

  try {
    for (let i = 0; i < plan.frameCount; i++) {
      const t = (i / plan.frameCount) * opts.durationSec
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
    try {
      restoreAllBases(opts.fabricCanvas)
    } catch {
      /* ignore */
    }
    try {
      opts.fabricCanvas?.renderAll?.()
    } catch {
      /* ignore */
    }
    try {
      exportCanvas.remove()
    } catch {
      /* ignore */
    }
  }
}
