import { inpaint, inpaintDiffusion, inpaintExemplar, inpaintCore } from './index'
import { inpaintWorkerSource } from './inpaint.worker'
import { compositeWithAlpha, coverageToMask, planRegion, rasterizeStrokes, strokesBounds } from './region'

type Img = { data: Uint8ClampedArray; width: number; height: number }

const SENTINEL = [255, 0, 255, 255]

function makeImage(w: number, h: number, px: (x: number, y: number) => number[]): Img {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = px(x, y)
      const k = (y * w + x) * 4
      data[k] = c[0]
      data[k + 1] = c[1]
      data[k + 2] = c[2]
      data[k + 3] = c.length > 3 ? c[3] : 255
    }
  }
  return { data, width: w, height: h }
}

/** Rect hole; also paints the sentinel colour into the hole so leftovers are detectable. */
function punch(img: Img, x0: number, y0: number, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(img.width * img.height)
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = y * img.width + x
      mask[i] = 1
      img.data.set(SENTINEL, i * 4)
    }
  }
  return mask
}

/** Deterministic pseudo-random texture (value noise + gradient). */
function texture(w: number, h: number): Img {
  let s = 12345
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  const noise = new Float32Array(w * h).map(() => rnd())
  return makeImage(w, h, (x, y) => {
    const n = noise[y * w + x] * 40
    return [80 + x * 0.5 + n, 120 + y * 0.4 + n, 60 + n]
  })
}

function expectFilledAndUntouched(before: Img, out: Uint8ClampedArray, mask: Uint8Array) {
  expect(out.length).toBe(before.data.length)
  let changedOutside = 0
  let leftover = 0
  for (let i = 0; i < mask.length; i++) {
    const k = i * 4
    if (mask[i]) {
      for (let c = 0; c < 4; c++) expect(Number.isFinite(out[k + c])).toBe(true)
      if (out[k] === SENTINEL[0] && out[k + 1] === SENTINEL[1] && out[k + 2] === SENTINEL[2]) leftover++
    } else if (out[k] !== before.data[k] || out[k + 1] !== before.data[k + 1] || out[k + 2] !== before.data[k + 2] || out[k + 3] !== before.data[k + 3]) {
      changedOutside++
    }
  }
  expect(leftover).toBe(0)
  expect(changedOutside).toBe(0)
}

describe('inpaintCore basics', () => {
  it('returns an untouched copy when the mask is empty', () => {
    const img = texture(32, 32)
    const out = inpaint(img, new Uint8Array(32 * 32))
    expect(out).not.toBe(img.data)
    expect(Array.from(out)).toEqual(Array.from(img.data))
  })

  it('rejects undersized buffers', () => {
    expect(() => inpaintCore(new Uint8ClampedArray(10), 4, 4, new Uint8Array(16))).toThrow()
  })

  for (const [name, fn] of [
    ['exemplar', inpaintExemplar],
    ['diffusion', inpaintDiffusion],
    ['auto', inpaint],
  ] as const) {
    it(`${name}: fills every masked pixel and leaves the rest unchanged`, () => {
      const img = texture(96, 80)
      const mask = punch(img, 30, 25, 22, 18)
      const before = { ...img, data: new Uint8ClampedArray(img.data) }
      const out = fn(img, mask)
      expectFilledAndUntouched(before, out, mask)
      // input not mutated
      expect(Array.from(img.data)).toEqual(Array.from(before.data))
    })

    it(`${name}: reproduces a uniform colour`, () => {
      const img = makeImage(64, 64, () => [120, 80, 200])
      const mask = punch(img, 20, 22, 16, 14)
      const out = fn(img, mask)
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue
        expect(Math.abs(out[i * 4] - 120)).toBeLessThanOrEqual(1)
        expect(Math.abs(out[i * 4 + 1] - 80)).toBeLessThanOrEqual(1)
        expect(Math.abs(out[i * 4 + 2] - 200)).toBeLessThanOrEqual(1)
        expect(out[i * 4 + 3]).toBe(255)
      }
    })
  }

  it('handles holes touching the image border', () => {
    const img = texture(48, 48)
    const mask = punch(img, 0, 30, 20, 18)
    const before = { ...img, data: new Uint8ClampedArray(img.data) }
    expectFilledAndUntouched(before, inpaintExemplar(img, mask), mask)
  })

  it('falls back to diffusion when no complete source patch exists', () => {
    const img = texture(12, 12)
    const mask = punch(img, 2, 2, 8, 8)
    const before = { ...img, data: new Uint8ClampedArray(img.data) }
    expectFilledAndUntouched(before, inpaintExemplar(img, mask), mask)
  })

  it('diffusion interpolates a smooth gradient across a thin scratch', () => {
    const img = makeImage(64, 32, x => [x * 4, 100, 255 - x * 4])
    const mask = punch(img, 5, 15, 54, 2)
    const out = inpaint(img, mask) // auto -> thin mask -> diffusion
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue
      const x = i % 64
      expect(Math.abs(out[i * 4] - x * 4)).toBeLessThanOrEqual(4)
      expect(Math.abs(out[i * 4 + 2] - (255 - x * 4))).toBeLessThanOrEqual(4)
    }
  })

  it('reports progress within [0, 1] and finishes at 1', () => {
    const img = texture(64, 64)
    const mask = punch(img, 20, 20, 24, 24)
    const seen: number[] = []
    inpaintCore(img.data, 64, 64, mask, { method: 'exemplar' }, r => seen.push(r))
    expect(seen.length).toBeGreaterThan(1)
    expect(seen.every(r => r >= 0 && r <= 1)).toBe(true)
    expect(seen[seen.length - 1]).toBe(1)
  })
})

describe('structure continuation', () => {
  const COLORS = [
    [230, 40, 40],
    [40, 200, 60],
    [30, 60, 220],
  ]
  const stripeColor = (x: number) => COLORS[Math.floor(x / 6) % COLORS.length]

  it('continues vertical stripes through a hole', () => {
    const img = makeImage(128, 128, x => stripeColor(x))
    const x0 = 53
    const y0 = 54
    const mask = punch(img, x0, y0, 20, 20)
    const out = inpaint(img, mask)
    let good = 0
    let total = 0
    for (let x = x0; x < x0 + 20; x++) {
      const want = stripeColor(x)
      let r = 0
      let g = 0
      let b = 0
      for (let y = y0; y < y0 + 20; y++) {
        const k = (y * 128 + x) * 4
        r += out[k]
        g += out[k + 1]
        b += out[k + 2]
        const d = Math.abs(out[k] - want[0]) + Math.abs(out[k + 1] - want[1]) + Math.abs(out[k + 2] - want[2])
        if (d < 60) good++
        total++
      }
      // column-wise mean colour stays close to the stripe colour above/below
      const dm = Math.abs(r / 20 - want[0]) + Math.abs(g / 20 - want[1]) + Math.abs(b / 20 - want[2])
      expect(dm).toBeLessThan(90)
    }
    expect(good / total).toBeGreaterThan(0.9)
  })
})

describe('performance', () => {
  it('fills a 20x20 hole in a 128x128 photo-like image in < 2s', () => {
    const img = texture(128, 128)
    const mask = punch(img, 54, 54, 20, 20)
    const t0 = Date.now()
    const out = inpaintExemplar(img, mask)
    const ms = Date.now() - t0
    // eslint-disable-next-line no-console
    console.log(`[inpaint perf] 128x128, 20x20 hole (exemplar): ${ms} ms`)
    expect(out.length).toBe(128 * 128 * 4)
    expect(ms).toBeLessThan(2000)
  })

  it('fills a 120x90 hole in a 512x384 image in reasonable time', () => {
    const img = texture(512, 384)
    const mask = punch(img, 200, 150, 120, 90)
    const t0 = Date.now()
    inpaint(img, mask)
    const ms = Date.now() - t0
    // eslint-disable-next-line no-console
    console.log(`[inpaint perf] 512x384, 120x90 hole (auto): ${ms} ms`)
    expect(ms).toBeLessThan(15000)
  })
})

describe('worker source', () => {
  it('serialised kernel is self-contained and matches the direct call', () => {
    const img = texture(40, 40)
    const mask = punch(img, 12, 12, 10, 10)
    const posted: any[] = []
    const fakeSelf: any = { postMessage: (m: any) => posted.push(m) }
    // eslint-disable-next-line no-new-func
    const factory = new Function('self', inpaintWorkerSource() + '\nreturn inpaintCore;')
    const serialised = factory(fakeSelf)
    expect(typeof serialised).toBe('function')
    expect(typeof fakeSelf.onmessage).toBe('function')

    const direct = inpaintCore(img.data, 40, 40, mask, { seed: 7 })
    fakeSelf.onmessage({ data: { data: img.data, width: 40, height: 40, mask, options: { seed: 7 } } })
    const result = posted.find(m => m.type === 'result')
    expect(result).toBeTruthy()
    expect(Array.from(result.data)).toEqual(Array.from(direct))
  })
})

describe('region helpers', () => {
  it('rasterises a dot and a segment', () => {
    const cov = rasterizeStrokes([{ points: [10, 10], radius: 3 }, { points: [0, 30, 39, 30], radius: 1 }], { x: 0, y: 0, w: 40, h: 40 }, 1, 0, 0)
    const m = coverageToMask(cov)
    expect(m[10 * 40 + 10]).toBe(1)
    expect(m[10 * 40 + 16]).toBe(0)
    expect(m[30 * 40 + 20]).toBe(1)
    expect(m[33 * 40 + 20]).toBe(0)
  })

  it('feathers between inner and outer', () => {
    const cov = rasterizeStrokes([{ points: [20, 20], radius: 5 }], { x: 0, y: 0, w: 40, h: 40 }, 1, 0, 4)
    expect(cov[20 * 40 + 20]).toBe(255)
    const mid = cov[20 * 40 + 27] // ~2px outside the edge
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(255)
    expect(cov[20 * 40 + 31]).toBe(0)
  })

  it('plans a capped working region around the mask', () => {
    const b = strokesBounds([{ points: [1000, 1000, 1400, 1100], radius: 50 }])!
    expect(b).toEqual({ x: 950, y: 950, w: 500, h: 200 })
    const r = planRegion(b, { x: 0, y: 0, w: 4000, h: 3000 }, 1024)
    expect(r.x).toBeLessThanOrEqual(950)
    expect(r.x + r.w).toBeGreaterThanOrEqual(1450)
    expect(Math.max(r.ww, r.wh)).toBeLessThanOrEqual(1024)
    expect(r.scale).toBeLessThanOrEqual(1)
    const small = planRegion({ x: 5, y: 5, w: 10, h: 10 }, { x: 0, y: 0, w: 100, h: 100 })
    expect(small).toMatchObject({ x: 0, y: 0, w: 63, h: 63, scale: 1 })
  })

  it('composites only where alpha > 0', () => {
    const base = new Uint8ClampedArray([10, 10, 10, 255, 10, 10, 10, 255, 10, 10, 10, 255])
    const fill = new Uint8ClampedArray([200, 200, 200, 255, 200, 200, 200, 255, 200, 200, 200, 255])
    compositeWithAlpha(base, fill, new Uint8ClampedArray([0, 128, 255]))
    expect(Array.from(base.slice(0, 4))).toEqual([10, 10, 10, 255])
    expect(base[4]).toBeGreaterThan(90)
    expect(base[4]).toBeLessThan(120)
    expect(Array.from(base.slice(8, 12))).toEqual([200, 200, 200, 255])
  })
})
