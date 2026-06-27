/** Returns a user-facing warning when MP4 was requested but the browser
 *  could only record WebM. Null when no notice is needed. */
export function mp4FallbackMessage(requestedFormat: string, actualExt: string): string | null {
  if (requestedFormat === 'mp4' && actualExt !== 'mp4') {
    return "Your browser can't record MP4 — exported as WebM instead."
  }
  return null
}

export interface GifPlan {
  frameCount: number
  delayMs: number
  width: number
  height: number
}

/** GIFs balloon fast, so cap fps and resolution. Returns an encoding plan
 *  (frame count, per-frame delay, and output dimensions). Never upscales. */
export function computeGifPlan(opts: {
  durationSec: number
  srcWidth: number
  srcHeight: number
  maxFps?: number
  maxDimension?: number
  maxFrames?: number
}): GifPlan {
  const maxFps = opts.maxFps ?? 12
  const maxDimension = opts.maxDimension ?? 640
  const maxFrames = opts.maxFrames ?? 150
  const dur = Math.max(0.1, opts.durationSec || 0.1)
  const frameCount = Math.max(1, Math.min(maxFrames, Math.round(dur * maxFps)))
  const effectiveFps = frameCount / dur
  const delayMs = Math.max(1, Math.round(1000 / effectiveFps))
  const scale = Math.min(1, maxDimension / Math.max(opts.srcWidth, opts.srcHeight))
  const width = Math.max(2, Math.round(opts.srcWidth * scale))
  const height = Math.max(2, Math.round(opts.srcHeight * scale))
  return { frameCount, delayMs, width, height }
}
