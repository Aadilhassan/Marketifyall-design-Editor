/**
 * Animated GIF from the deterministic frame loop.
 *
 * Two passes over the same renderer: a few evenly spaced frames build one
 * global 256-colour palette (no per-frame palettes → no colour shimmer), then
 * every frame is lightly ordered-dithered and mapped onto that palette.
 * gifenc is loaded on demand so it stays out of the main bundle.
 */
import { FrameScene, FrameStats, renderFrames } from './frames'
import { Size, TimeRange, ditherOrdered, frameCount, gifDelaysMs, paletteSampleIndices, paletteSource } from './settings'

export interface GifOptions {
  range: TimeRange
  fps: number
  size: Size
  dither?: boolean
  signal?: AbortSignal
  onProgress?: (phase: 'palette' | 'frames', done: number, total: number, preview: HTMLCanvasElement) => void
}

function readCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  const ctx = (canvas.getContext('2d', { willReadFrequently: true } as any) || canvas.getContext('2d')) as CanvasRenderingContext2D
  if (!ctx) throw new Error('Could not create a canvas for the GIF')
  return { canvas, ctx }
}

export async function writeGif(scene: FrameScene, opts: GifOptions): Promise<{ blob: Blob; stats: FrameStats }> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const { width, height } = opts.size
  const { canvas, ctx } = readCanvas()
  const total = frameCount(opts.range, opts.fps)
  const dither = opts.dither !== false

  try {
    // Pass 1 — global palette from sampled frames (undithered: the palette should hold the real colours).
    const samples: Uint8ClampedArray[] = []
    const sampleAt = paletteSampleIndices(total)
    await renderFrames(scene, {
      range: opts.range,
      fps: opts.fps,
      width,
      height,
      canvas,
      only: sampleAt,
      signal: opts.signal,
      onFrame: c => {
        samples.push(ctx.getImageData(0, 0, width, height).data)
        opts.onProgress?.('palette', samples.length, sampleAt.length, c)
      },
    })
    const palette = quantize(paletteSource(samples), 256)
    samples.length = 0

    // Pass 2 — every frame on the shared palette.
    const gif = GIFEncoder()
    const delays = gifDelaysMs(total, opts.fps)
    const stats = await renderFrames(scene, {
      range: opts.range,
      fps: opts.fps,
      width,
      height,
      canvas,
      signal: opts.signal,
      onFrame: (c, info) => {
        const data = ctx.getImageData(0, 0, width, height).data
        if (dither) ditherOrdered(data, width, height)
        const index = applyPalette(data, palette)
        gif.writeFrame(index, width, height, info.index === 0 ? { palette, delay: delays[info.index], repeat: 0 } : { delay: delays[info.index] })
        opts.onProgress?.('frames', info.index + 1, info.count, c)
      },
    })
    gif.finish()
    return { blob: new Blob([gif.bytes()], { type: 'image/gif' }), stats }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
