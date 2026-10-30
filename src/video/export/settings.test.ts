import {
  avcCandidates,
  avcLevel,
  clampRange,
  ditherOrdered,
  estimateBytes,
  frameCount,
  frameDurationUs,
  frameTime,
  frameTimestampUs,
  gifDelaysMs,
  gifFps,
  gifSize,
  outputSize,
  paletteSampleIndices,
  paletteSource,
  videoBitrate,
} from './settings'

describe('frame timeline', () => {
  it('counts frames over the range', () => {
    expect(frameCount({ start: 0, end: 10 }, 30)).toBe(300)
    expect(frameCount({ start: 2, end: 3.5 }, 24)).toBe(36)
    // Float noise must not add a frame.
    expect(frameCount({ start: 0, end: 0.1 + 0.2 }, 30)).toBe(9)
    expect(frameCount({ start: 1, end: 1 }, 30)).toBe(1)
  })

  it('maps frame n to range.start + n / fps', () => {
    const r = { start: 1.5, end: 3 }
    expect(frameTime(r, 30, 0)).toBe(1.5)
    expect(frameTime(r, 30, 15)).toBeCloseTo(2, 10)
    const last = frameCount(r, 30) - 1
    expect(frameTime(r, 30, last)).toBeLessThan(r.end)
  })

  it('gives timestamps that start at 0 and tile without gaps', () => {
    expect(frameTimestampUs(0, 30)).toBe(0)
    let t = 0
    for (let n = 0; n < 90; n++) {
      expect(frameTimestampUs(n, 30)).toBe(t)
      t += frameDurationUs(n, 30)
    }
    expect(t).toBe(3000000)
  })

  it('clamps ranges into the video and treats empty ranges as the whole video', () => {
    expect(clampRange(null, 12)).toEqual({ start: 0, end: 12 })
    expect(clampRange({ start: 4, end: 2 }, 12)).toEqual({ start: 0, end: 12 })
    expect(clampRange({ start: 3, end: 40 }, 12)).toEqual({ start: 3, end: 12 })
    expect(clampRange({ start: 20, end: 40 }, 12)).toEqual({ start: 0, end: 12 })
  })
})

describe('output size', () => {
  it('uses the preset as the short side, keeps aspect and even sides', () => {
    expect(outputSize({ width: 1920, height: 1080 }, '1080p')).toEqual({ width: 1920, height: 1080 })
    expect(outputSize({ width: 1080, height: 1920 }, '1080p')).toEqual({ width: 1080, height: 1920 })
    expect(outputSize({ width: 1080, height: 1080 }, '720p')).toEqual({ width: 720, height: 720 })
    expect(outputSize({ width: 1080, height: 1350 }, '4k')).toEqual({ width: 2160, height: 2700 })
    expect(outputSize({ width: 1920, height: 1080 }, '480p')).toEqual({ width: 854, height: 480 })
  })

  it('always produces even dimensions', () => {
    const pages = [
      { width: 1000, height: 333 },
      { width: 777, height: 1001 },
      { width: 1, height: 3 },
    ]
    for (const p of pages)
      for (const r of ['480p', '720p', '1080p', '4k'] as const) {
        const s = outputSize(p, r)
        expect(s.width % 2).toBe(0)
        expect(s.height % 2).toBe(0)
      }
  })

  it('caps GIF width and never upscales', () => {
    expect(gifSize({ width: 1920, height: 1080 })).toEqual({ width: 720, height: 405 })
    expect(gifSize({ width: 400, height: 400 })).toEqual({ width: 400, height: 400 })
    expect(gifFps(30)).toBe(15)
    expect(gifFps(10)).toBe(10)
  })
})

describe('bitrates and codecs', () => {
  it('scales bitrate with pixels, fps and quality, within bounds', () => {
    const hd = { width: 1920, height: 1080 }
    const std = videoBitrate(hd, 30, 'standard')
    const high = videoBitrate(hd, 30, 'high')
    const max = videoBitrate(hd, 30, 'max')
    expect(std).toBeLessThan(high)
    expect(high).toBeLessThan(max)
    expect(videoBitrate(hd, 60, 'high')).toBe(high * 2)
    expect(videoBitrate({ width: 16, height: 16 }, 24, 'standard')).toBe(500000)
    expect(videoBitrate({ width: 7680, height: 4320 }, 60, 'max')).toBe(100000000)
  })

  it('picks the smallest H.264 level that fits', () => {
    expect(avcLevel({ width: 1280, height: 720 }, 30)).toBe(31)
    expect(avcLevel({ width: 1920, height: 1080 }, 30)).toBe(40)
    expect(avcLevel({ width: 1920, height: 1080 }, 60)).toBe(42)
    expect(avcLevel({ width: 3840, height: 2160 }, 30)).toBe(51)
    expect(avcLevel({ width: 3840, height: 2160 }, 60)).toBe(52)
  })

  it('lists High profile at that level first, with the common fallbacks', () => {
    const c = avcCandidates({ width: 1920, height: 1080 }, 30, 6000000)
    expect(c[0]).toBe('avc1.640028')
    expect(c).toContain('avc1.42003e')
    expect(new Set(c).size).toBe(c.length)
  })
})

describe('estimates', () => {
  it('estimates video size from bitrate × duration', () => {
    const size = { width: 1920, height: 1080 }
    const bytes = estimateBytes({ format: 'mp4', duration: 10, size, fps: 30, quality: 'high', withAudio: true })
    const expected = ((videoBitrate(size, 30, 'high') + 160000) * 10) / 8
    expect(bytes).toBeGreaterThan(expected)
    expect(bytes).toBeLessThan(expected * 1.05)
    expect(estimateBytes({ format: 'gif', duration: 2, size: { width: 100, height: 100 }, fps: 10, quality: 'high', withAudio: false })).toBeGreaterThan(0)
  })
})

describe('GIF timing and palette', () => {
  it('keeps cumulative GIF delays in sync with the frame rate', () => {
    const d = gifDelaysMs(15, 15)
    expect(d.reduce((a, b) => a + b, 0)).toBe(1000)
    d.forEach(x => expect(x % 10).toBe(0))
    expect(gifDelaysMs(10, 10)).toEqual(Array(10).fill(100))
  })

  it('samples evenly spaced frames including first and last', () => {
    expect(paletteSampleIndices(100, 5)).toEqual([0, 25, 50, 74, 99])
    expect(paletteSampleIndices(3, 8)).toEqual([0, 1, 2])
    expect(paletteSampleIndices(1)).toEqual([0])
    expect(paletteSampleIndices(0)).toEqual([])
  })

  it('subsamples whole pixels from every sampled frame', () => {
    const a = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255])
    const b = new Uint8ClampedArray([100, 101, 102, 255, 103, 104, 105, 255])
    expect(Array.from(paletteSource([a, b]))).toEqual(Array.from(a).concat(Array.from(b)))
    const sub = paletteSource([a, b], 3)
    expect(sub.length % 4).toBe(0)
    expect(sub.length / 4).toBeLessThanOrEqual(4)
    // Every subsampled pixel is a real pixel of an input frame.
    const pixels = new Set<string>()
    ;[a, b].forEach(f => {
      for (let i = 0; i < f.length; i += 4) pixels.add(Array.from(f.slice(i, i + 4)).join(','))
    })
    for (let i = 0; i < sub.length; i += 4) expect(pixels.has(Array.from(sub.slice(i, i + 4)).join(','))).toBe(true)
  })

  it('dithers with a fixed, bounded pattern', () => {
    const mk = () => new Uint8ClampedArray(4 * 4 * 4).fill(128)
    const x = mk()
    ditherOrdered(x, 4, 4, 0)
    expect(Array.from(x)).toEqual(Array.from(mk()))
    const y = mk()
    const z = mk()
    ditherOrdered(y, 4, 4, 6)
    ditherOrdered(z, 4, 4, 6)
    expect(Array.from(y)).toEqual(Array.from(z))
    for (let i = 0; i < y.length; i += 4) {
      expect(Math.abs(y[i] - 128)).toBeLessThanOrEqual(6)
      expect(y[i + 3]).toBe(128) // alpha untouched
    }
    const w = new Uint8ClampedArray([255, 0, 255, 255])
    ditherOrdered(w, 1, 1, 50)
    expect(w[0]).toBeLessThanOrEqual(255)
    expect(w[1]).toBeGreaterThanOrEqual(0)
  })
})
