/**
 * Pure geometry helpers for the Magic Eraser: brush strokes -> masks, picking
 * the working region around the mask, and feathered compositing. No DOM.
 */

/** A brush stroke in image pixels. `points` is flat: [x0, y0, x1, y1, ...]. */
export interface Stroke {
  points: number[]
  radius: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface WorkRegion extends Rect {
  /** working px per source px (<= 1) */
  scale: number
  /** working buffer size */
  ww: number
  wh: number
}

/** Axis-aligned bounds of all strokes (including radius + pad), or null if empty. */
export function strokesBounds(strokes: Stroke[], pad = 0): Rect | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const s of strokes) {
    const r = s.radius + pad
    for (let i = 0; i + 1 < s.points.length; i += 2) {
      const x = s.points[i]
      const y = s.points[i + 1]
      if (x - r < x0) x0 = x - r
      if (y - r < y0) y0 = y - r
      if (x + r > x1) x1 = x + r
      if (y + r > y1) y1 = y + r
    }
  }
  if (!isFinite(x0)) return null
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Integer intersection of two rects (may be empty: w/h = 0). */
export function intersectRect(a: Rect, b: Rect): Rect {
  const x = Math.max(Math.floor(a.x), Math.floor(b.x))
  const y = Math.max(Math.floor(a.y), Math.floor(b.y))
  const x1 = Math.min(Math.ceil(a.x + a.w), Math.floor(b.x + b.w))
  const y1 = Math.min(Math.ceil(a.y + a.h), Math.floor(b.y + b.h))
  return { x, y, w: Math.max(0, x1 - x), h: Math.max(0, y1 - y) }
}

/**
 * Working region: mask bounds grown by a context margin (source material for
 * the fill), clipped to `clip`, and the scale that brings its long side down
 * to `maxSide`.
 */
export function planRegion(maskBounds: Rect, clip: Rect, maxSide = 1024, minMargin = 48): WorkRegion {
  const margin = Math.max(minMargin, 0.75 * Math.max(maskBounds.w, maskBounds.h))
  const grown = { x: maskBounds.x - margin, y: maskBounds.y - margin, w: maskBounds.w + 2 * margin, h: maskBounds.h + 2 * margin }
  const r = intersectRect(grown, clip)
  const scale = Math.min(1, maxSide / Math.max(1, r.w, r.h))
  return { ...r, scale, ww: Math.max(1, Math.round(r.w * scale)), wh: Math.max(1, Math.round(r.h * scale)) }
}

/**
 * Rasterise strokes into an 8-bit coverage map of `area` sampled at `scale`
 * (output size = round(area.w*scale) x round(area.h*scale)). With v = distance
 * from the stroke edge in output px: 255 where v <= inner, 0 where v >= outer,
 * smooth ramp between (a hard edge when inner >= outer).
 */
export function rasterizeStrokes(strokes: Stroke[], area: Rect, scale: number, inner: number, outer: number): Uint8ClampedArray {
  const W = Math.max(1, Math.round(area.w * scale))
  const H = Math.max(1, Math.round(area.h * scale))
  const out = new Uint8ClampedArray(W * H)
  const hard = inner >= outer
  const reach = Math.max(inner, outer)
  const span = outer - inner

  const stamp = (ax: number, ay: number, bx: number, by: number, r: number) => {
    const ext = r + reach + 1
    const minX = Math.max(0, Math.floor(Math.min(ax, bx) - ext))
    const maxX = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + ext))
    const minY = Math.max(0, Math.floor(Math.min(ay, by) - ext))
    const maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by) + ext))
    if (minX > maxX || minY > maxY) return
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5
        let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
        if (t < 0) t = 0
        else if (t > 1) t = 1
        const ex = px - (ax + t * dx)
        const ey = py - (ay + t * dy)
        const v = Math.sqrt(ex * ex + ey * ey) - r
        let a: number
        if (v <= inner) a = 255
        else if (hard || v >= outer) a = 0
        else {
          const u = (outer - v) / span
          a = 255 * u * u * (3 - 2 * u)
        }
        const i = y * W + x
        if (a > out[i]) out[i] = a
      }
    }
  }

  for (const s of strokes) {
    const r = s.radius * scale
    const pts = s.points
    if (pts.length < 2) continue
    const tx = (i: number) => (pts[i] - area.x) * scale
    const ty = (i: number) => (pts[i + 1] - area.y) * scale
    if (pts.length < 4) stamp(tx(0), ty(0), tx(0), ty(0), r)
    for (let i = 0; i + 3 < pts.length; i += 2) stamp(tx(i), ty(i), tx(i + 2), ty(i + 2), r)
  }
  return out
}

/** Binary mask (1 = fill) from a coverage map. */
export function coverageToMask(coverage: Uint8ClampedArray): Uint8Array {
  const m = new Uint8Array(coverage.length)
  for (let i = 0; i < coverage.length; i++) m[i] = coverage[i] > 0 ? 1 : 0
  return m
}

/** In-place: base = base*(1-a) + fill*a per pixel (RGBA buffers, 8-bit alpha map). */
export function compositeWithAlpha(base: Uint8ClampedArray, fill: Uint8ClampedArray, alpha: Uint8ClampedArray): Uint8ClampedArray {
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i]
    if (!a) continue
    const k = i * 4
    if (a === 255) {
      base[k] = fill[k]
      base[k + 1] = fill[k + 1]
      base[k + 2] = fill[k + 2]
      base[k + 3] = fill[k + 3]
    } else {
      const f = a / 255
      base[k] = base[k] + (fill[k] - base[k]) * f
      base[k + 1] = base[k + 1] + (fill[k + 1] - base[k + 1]) * f
      base[k + 2] = base[k + 2] + (fill[k + 2] - base[k + 2]) * f
      base[k + 3] = base[k + 3] + (fill[k + 3] - base[k + 3]) * f
    }
  }
  return base
}
