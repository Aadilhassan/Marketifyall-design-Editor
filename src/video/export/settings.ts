/**
 * Export settings — pure math only (no DOM, no WebCodecs), so it's all unit
 * tested: frame timeline, output sizing, bitrates, H.264 level choice, size
 * estimates and GIF timing/palette sampling.
 */

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'audio'
export type ResolutionId = '480p' | '720p' | '1080p' | '4k'
export type QualityId = 'standard' | 'high' | 'max'

export interface TimeRange {
  start: number
  end: number
}

export interface Size {
  width: number
  height: number
}

// ---------------------------------------------------------------------------
// Frame timeline
// ---------------------------------------------------------------------------

export const FPS_OPTIONS = [24, 30, 60] as const

/** Clamp a requested range into [0, duration]; an empty/invalid range means the whole video. */
export function clampRange(range: TimeRange | null | undefined, duration: number): TimeRange {
  const d = Math.max(0, duration || 0)
  if (!range || !(range.end > range.start)) return { start: 0, end: d }
  const start = Math.max(0, Math.min(range.start, d))
  const end = Math.max(start, Math.min(range.end, d))
  return end > start ? { start, end } : { start: 0, end: d }
}

/** Number of frames covering `range` at `fps` (at least one). */
export function frameCount(range: TimeRange, fps: number): number {
  const span = Math.max(0, range.end - range.start)
  return Math.max(1, Math.round(span * fps - 1e-9))
}

/** Project time shown by frame `n`. */
export function frameTime(range: TimeRange, fps: number, n: number): number {
  return range.start + n / fps
}

/** Presentation timestamp of frame `n` in microseconds (output starts at 0). */
export function frameTimestampUs(n: number, fps: number): number {
  return Math.round((n * 1e6) / fps)
}

/** Duration of frame `n` in microseconds; consecutive frames tile exactly. */
export function frameDurationUs(n: number, fps: number): number {
  return frameTimestampUs(n + 1, fps) - frameTimestampUs(n, fps)
}

// ---------------------------------------------------------------------------
// Output size
// ---------------------------------------------------------------------------

export const RESOLUTIONS: Array<{ id: ResolutionId; label: string; shortSide: number }> = [
  { id: '480p', label: '480p', shortSide: 480 },
  { id: '720p', label: '720p', shortSide: 720 },
  { id: '1080p', label: '1080p', shortSide: 1080 },
  { id: '4k', label: '4K', shortSide: 2160 },
]

const even = (v: number) => Math.max(2, Math.round(v / 2) * 2)

/**
 * Output size for a page at a resolution preset: the preset is the short side
 * (1080p of a 9:16 page is 1080×1920), page aspect kept, both sides even
 * (required by H.264 4:2:0).
 */
export function outputSize(page: Size, resolution: ResolutionId): Size {
  const preset = RESOLUTIONS.find(r => r.id === resolution) || RESOLUTIONS[2]
  const w = Math.max(1, page.width || 1)
  const h = Math.max(1, page.height || 1)
  const s = preset.shortSide / Math.min(w, h)
  return { width: even(w * s), height: even(h * s) }
}

/** GIF: at most `maxWidth` wide (and never upscaled past the page), aspect kept. */
export function gifSize(page: Size, maxWidth = 720): Size {
  const w = Math.max(1, page.width || 1)
  const h = Math.max(1, page.height || 1)
  const width = Math.min(maxWidth, Math.round(w))
  return { width: Math.max(2, width), height: Math.max(2, Math.round((h * width) / w)) }
}

// ---------------------------------------------------------------------------
// Bitrates
// ---------------------------------------------------------------------------

export const QUALITIES: Array<{ id: QualityId; label: string; bitsPerPixel: number; audioBitrate: number }> = [
  { id: 'standard', label: 'Standard', bitsPerPixel: 0.06, audioBitrate: 128000 },
  { id: 'high', label: 'High', bitsPerPixel: 0.1, audioBitrate: 160000 },
  { id: 'max', label: 'Max', bitsPerPixel: 0.18, audioBitrate: 192000 },
]

const MIN_VIDEO_BITRATE = 500000
const MAX_VIDEO_BITRATE = 100000000

/** Video bitrate (bits/s) for a size, frame rate and quality preset. */
export function videoBitrate(size: Size, fps: number, quality: QualityId): number {
  const q = QUALITIES.find(x => x.id === quality) || QUALITIES[1]
  const bps = size.width * size.height * fps * q.bitsPerPixel
  return Math.round(Math.min(MAX_VIDEO_BITRATE, Math.max(MIN_VIDEO_BITRATE, bps)))
}

export function audioBitrate(quality: QualityId): number {
  return (QUALITIES.find(x => x.id === quality) || QUALITIES[1]).audioBitrate
}

// ---------------------------------------------------------------------------
// H.264 codec strings
// ---------------------------------------------------------------------------

/** [level_idc, max macroblocks per frame, max macroblocks per second, max bitrate kbps (Main)] */
const AVC_LEVELS: Array<[number, number, number, number]> = [
  [30, 1620, 40500, 10000],
  [31, 3600, 108000, 14000],
  [32, 5120, 216000, 20000],
  [40, 8192, 245760, 20000],
  [41, 8192, 245760, 50000],
  [42, 8704, 522240, 50000],
  [50, 22080, 589824, 135000],
  [51, 36864, 983040, 240000],
  [52, 36864, 2073600, 240000],
  [60, 139264, 4177920, 240000],
  [61, 139264, 8355840, 480000],
  [62, 139264, 16711680, 800000],
]

/** Smallest H.264 level that fits the frame size, rate and bitrate (null if none). */
export function avcLevel(size: Size, fps: number, bitrate = 0, profile: 'high' | 'main' = 'high'): number | null {
  const mbs = Math.ceil(size.width / 16) * Math.ceil(size.height / 16)
  const mbps = mbs * fps
  const kbps = bitrate / 1000
  const brFactor = profile === 'high' ? 1.25 : 1
  // A frame side may not exceed sqrt(8 * maxFS) macroblocks.
  const maxSide = Math.max(Math.ceil(size.width / 16), Math.ceil(size.height / 16))
  for (const [level, maxFs, maxMbps, maxBr] of AVC_LEVELS) {
    if (mbs <= maxFs && mbps <= maxMbps && kbps <= maxBr * brFactor && maxSide * maxSide <= 8 * maxFs) return level
  }
  return null
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0')

/**
 * H.264 codec strings to try, best first: High / Main / Baseline at the level
 * the output needs, then the widely supported fallbacks.
 */
export function avcCandidates(size: Size, fps: number, bitrate = 0): string[] {
  const out: string[] = []
  const high = avcLevel(size, fps, bitrate, 'high')
  const main = avcLevel(size, fps, bitrate, 'main')
  if (high !== null) out.push(`avc1.6400${hex2(high)}`)
  if (main !== null) {
    out.push(`avc1.4d00${hex2(main)}`)
    out.push(`avc1.4200${hex2(main)}`)
  }
  for (const c of ['avc1.640028', 'avc1.42003e', 'avc1.640033']) if (!out.includes(c)) out.push(c)
  return out
}

// ---------------------------------------------------------------------------
// Estimates
// ---------------------------------------------------------------------------

/** Rough file size in bytes. GIF is a heuristic (LZW on indexed colour), video is bitrate × time. */
export function estimateBytes(opts: {
  format: ExportFormat
  duration: number
  size: Size
  fps: number
  quality: QualityId
  withAudio: boolean
}): number {
  const d = Math.max(0, opts.duration)
  if (opts.format === 'gif') {
    const frames = Math.max(1, Math.round(d * opts.fps))
    return Math.round(opts.size.width * opts.size.height * frames * 0.35)
  }
  if (opts.format === 'audio') return Math.round((audioBitrate(opts.quality) * d) / 8)
  const v = videoBitrate(opts.size, opts.fps, opts.quality)
  const a = opts.withAudio ? audioBitrate(opts.quality) : 0
  return Math.round(((v + a) * d) / 8 * 1.02)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds)
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)} s`
  const m = Math.floor(s / 60)
  const r = Math.round(s - m * 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// GIF
// ---------------------------------------------------------------------------

export const GIF_MAX_FPS = 15
export const GIF_MAX_WIDTH = 720

export function gifFps(requested: number): number {
  return Math.max(1, Math.min(GIF_MAX_FPS, Math.round(requested) || GIF_MAX_FPS))
}

/**
 * Per-frame GIF delays in ms. GIF stores centiseconds; delays are taken from
 * rounded cumulative times so a 15 fps GIF stays in sync (7,6,7,7,6,7 cs…)
 * instead of drifting with a constant rounded delay.
 */
export function gifDelaysMs(count: number, fps: number): number[] {
  const cs = (n: number) => Math.round((n * 100) / fps)
  const out: number[] = []
  for (let n = 0; n < count; n++) out.push(Math.max(2, cs(n + 1) - cs(n)) * 10)
  return out
}

/** Evenly spaced frame indices (first and last included) used to build the global palette. */
export function paletteSampleIndices(count: number, maxSamples = 8): number[] {
  if (count <= 0) return []
  const k = Math.max(1, Math.min(count, maxSamples))
  if (k === 1) return [0]
  const out = new Set<number>()
  for (let i = 0; i < k; i++) out.add(Math.round((i * (count - 1)) / (k - 1)))
  return Array.from(out).sort((a, b) => a - b)
}

/**
 * Concatenate a pixel subsample of every sampled frame (RGBA) — at most
 * `maxPixels` in total — for one global quantisation. Strides over whole
 * pixels so channels never mix.
 */
export function paletteSource(frames: Uint8ClampedArray[], maxPixels = 400000): Uint8ClampedArray {
  const totalPixels = frames.reduce((n, f) => n + Math.floor(f.length / 4), 0)
  const stride = Math.max(1, Math.ceil(totalPixels / maxPixels))
  const outPixels = frames.reduce((n, f) => n + Math.ceil(Math.floor(f.length / 4) / stride), 0)
  const out = new Uint8ClampedArray(outPixels * 4)
  let o = 0
  for (const f of frames) {
    const px = Math.floor(f.length / 4)
    for (let p = 0; p < px; p += stride) {
      const i = p * 4
      out[o++] = f[i]
      out[o++] = f[i + 1]
      out[o++] = f[i + 2]
      out[o++] = f[i + 3]
    }
  }
  return out.subarray(0, o)
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/**
 * Light ordered (Bayer 4×4) dithering in place. The pattern is fixed per
 * pixel position, so it doesn't shimmer between frames like error diffusion.
 * `strength` is the ± amplitude in 8-bit levels.
 */
export function ditherOrdered(data: Uint8ClampedArray, width: number, height: number, strength = 6): void {
  if (strength <= 0) return
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = ((BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 2 * strength
      const i = (y * width + x) * 4
      data[i] = data[i] + d
      data[i + 1] = data[i + 1] + d
      data[i + 2] = data[i + 2] + d
    }
  }
}
