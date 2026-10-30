/**
 * Canva-style "Curve" for text, built on fabric 4.6's text-on-a-path
 * (`textbox.path` / `pathSide` / `pathStartOffset`).
 *
 * Geometry (pure): the text is laid on a circular arc whose length is the text
 * width plus a little padding. The curve amount (-100..100) sets the arc's
 * sweep linearly: |1| is a very flat arc (huge radius), |100| is nearly a full
 * circle. Positive bends up (a frown, letters outside the circle), negative
 * bends down (a smile, letters inside). The path always runs left to right, so
 * the letters stay upright on both sides and fabric's `pathSide` stays 'left'.
 *
 * The SVG path starts with two bare `M` points at the corners of the box the
 * glyphs occupy. fabric counts them in the path's bounding box (but they have
 * zero length, so text placement ignores them), which makes the object's
 * width/height wrap the curved glyphs instead of just the baseline arc.
 *
 * Fabric integration: `installCurvedText(fabric)` patches Textbox once so any
 * textbox whose `metadata.textCurve.amount` is non-zero rebuilds its path every
 * time fabric re-measures it (typing, font changes, reload, clone, undo).
 * fabric is passed in rather than imported so this module stays free of
 * fabric/DOM imports and Jest can load it with relative imports only.
 */

export const CURVE_MIN = -100
export const CURVE_MAX = 100

/** Largest sweep, at |amount| = 100. A hair under a full turn leaves a gap. */
const MAX_SWEEP = 2 * Math.PI * 0.98
/** Extra arc length beyond the text width, as a fraction of the font size. */
const ARC_PAD = 0.3
/** Space the glyphs take on each side of the baseline, as fractions of the font size. */
const GLYPH_ABOVE = 1.0
const GLYPH_BELOW = 0.3

export type PathSide = 'left' | 'right'

export interface TextCurveState {
  /** -100..100, 0 = straight */
  amount: number
}

export interface CurveGeometry {
  /** SVG path data for fabric.Path */
  d: string
  /** circle radius of the baseline arc */
  radius: number
  /** sweep of the baseline arc in radians */
  sweep: number
  /** length of the baseline arc (>= text width) */
  arcLength: number
  /** fabric `pathStartOffset` that centres the text on the arc */
  pathStartOffset: number
  /** fabric `pathSide` */
  side: PathSide
}

function finite(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

/** NaN/Infinity -> 0, clamped to -100..100. */
export function normalizeCurve(amount: unknown): number {
  const n = finite(amount)
  return Math.max(CURVE_MIN, Math.min(CURVE_MAX, n))
}

/**
 * Which side of the path the letters sit on. Always 'left': the path runs left
 * to right for both directions, so a negative curve needs no flip (letters
 * read left to right, upright, on the inside of the smile). Kept as a helper so
 * callers always set `pathSide` explicitly.
 */
export function curveSide(_amount: number): PathSide {
  return 'left'
}

/** Arc sweep in radians for an amount; 0 for a straight line. */
export function curveSweep(amount: number): number {
  return (Math.abs(normalizeCurve(amount)) / CURVE_MAX) * MAX_SWEEP
}

/** Baseline arc length used for a text width / font size. Always >= textWidth. */
export function curveArcLength(textWidth: number, fontSize: number): number {
  const w = Math.max(0, finite(textWidth))
  const fs = Math.max(1, finite(fontSize, 1))
  return w + Math.max(2, fs * ARC_PAD)
}

/** Radius of the baseline circle; Infinity when straight. Shrinks as |amount| grows. */
export function curveRadius(amount: number, textWidth: number, fontSize: number): number {
  const sweep = curveSweep(amount)
  if (sweep <= 0) return Infinity
  return curveArcLength(textWidth, fontSize) / sweep
}

/**
 * pathStartOffset that puts the middle of the text at the middle of the arc,
 * undoing fabric's own textAlign placement on paths:
 *   left (and justify): starts at 0, center: (L - w) / 2, right: L - w
 *   (mirrored when pathSide is 'right'; the offset is then applied negated).
 */
export function curveStartOffset(
  arcLength: number,
  textWidth: number,
  textAlign: string,
  side: PathSide
): number {
  const L = finite(arcLength)
  const w = finite(textWidth)
  const reverse = side === 'right'
  let base = 0
  if (textAlign === 'center') base = (L - w) / 2
  else if (textAlign === 'left') base = reverse ? L - w : 0
  else if (textAlign === 'right') base = reverse ? 0 : L - w
  const off = (L - w) / 2 - base
  const signed = reverse ? -off : off
  return Math.abs(signed) < 1e-9 ? 0 : signed
}

function num(n: number): string {
  // fixed precision, never exponent notation, no "-0"
  const s = (Math.round(n * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

/**
 * Geometry for curved text, or null when the curve is 0 (remove the path).
 * Coordinates have the arc's apex at the origin; fabric re-centres the path on
 * its bounding box, so only relative positions matter.
 */
export function curveGeometry(
  amount: number,
  textWidth: number,
  fontSize: number,
  textAlign: string = 'center'
): CurveGeometry | null {
  const a = normalizeCurve(amount)
  const sweep = curveSweep(a)
  if (sweep <= 0) return null
  const fs = Math.max(1, finite(fontSize, 1))
  const w = Math.max(0, finite(textWidth))
  const L = curveArcLength(w, fs)
  const R = L / sweep
  const h = sweep / 2
  const up = a > 0
  const side = curveSide(a)

  // Baseline arc, drawn for a frown (centre below the apex at (0, R)); a smile
  // is the same shape mirrored vertically.
  const sy = up ? 1 : -1
  const sx0 = -R * Math.sin(h)
  const ex0 = R * Math.sin(h)
  const ey0 = sy * R * (1 - Math.cos(h))
  const sweepFlag = up ? 1 : 0

  // Box covered by the glyph band. Letters sit outside the circle for a frown
  // and inside it for a smile, so the band's radii differ.
  const outer = R + (up ? GLYPH_ABOVE : GLYPH_BELOW) * fs
  const inner = Math.max(0, R - (up ? GLYPH_BELOW : GLYPH_ABOVE) * fs)
  const angles = [0, h, -h]
  if (h >= Math.PI / 2) angles.push(Math.PI / 2, -Math.PI / 2)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  ;[inner, outer].forEach(r => {
    angles.forEach(phi => {
      const x = r * Math.sin(phi)
      const y = sy * (R - r * Math.cos(phi))
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    })
  })

  const d =
    `M ${num(minX)} ${num(minY)} M ${num(maxX)} ${num(maxY)} ` +
    `M ${num(sx0)} ${num(ey0)} ` +
    `A ${num(R)} ${num(R)} 0 0 ${sweepFlag} 0 0 ` +
    `A ${num(R)} ${num(R)} 0 0 ${sweepFlag} ${num(ex0)} ${num(ey0)}`

  return {
    d,
    radius: R,
    sweep,
    arcLength: L,
    pathStartOffset: curveStartOffset(L, w, textAlign, side),
    side,
  }
}

/** Curve amount stored on an object (0 when absent or invalid). */
export function readCurveAmount(obj: any): number {
  return normalizeCurve(obj?.metadata?.textCurve?.amount)
}

/* ------------------------------------------------------------------ */
/* fabric integration (fabric namespace injected, see header comment)  */
/* ------------------------------------------------------------------ */

function isFabricPath(p: any): boolean {
  return !!p && typeof p.isNotVisible === 'function' && Array.isArray(p.path)
}

/**
 * Re-fit the path of a curved textbox. Runs inside fabric's initDimensions, so
 * it is invoked for every text/font/size/align change and on construction.
 */
function fitCurve(fabricNs: any, obj: any, baseInit: () => void): void {
  const amount = readCurveAmount(obj)
  if (!amount) {
    // a stale curve path must go once the curve is off
    if (obj.path && obj.path.__curveD) {
      obj.path = null
      baseInit()
    }
    return
  }
  const geo = curveGeometry(amount, obj.calcTextWidth(), obj.fontSize, obj.textAlign)
  if (!geo) return
  if (!obj.path || obj.path.__curveD !== geo.d) {
    const path = new fabricNs.Path(geo.d, { visible: false })
    path.__curveD = geo.d
    obj.path = path
  }
  obj.pathSide = geo.side
  obj.pathStartOffset = geo.pathStartOffset
  obj.setPathInfo()
  // measure again so every glyph is placed on the new path
  baseInit()
  obj.width = Math.max(1, obj.path.width)
  obj.height = Math.max(1, obj.path.height)
  // width/height are dimension-affecting for Textbox; without this fabric
  // would see a "changed" state on every render and re-measure each frame.
  obj.saveState({ propertySet: '_dimensionAffectingProps' })
}

/**
 * Patch fabric.Textbox (and subclasses such as scenify's StaticText) so
 * `metadata.textCurve` drives a text path:
 *  - curved text never wraps (one line per paragraph; the box width follows
 *    the curve, not the other way round),
 *  - the path is rebuilt whenever fabric re-measures, including when an object
 *    is created from JSON (Textbox.fromObject does not revive `path` in 4.6,
 *    and the scenify exporter drops it; metadata survives both).
 * Idempotent.
 */
export function installCurvedText(fabricNs: any): void {
  const proto = fabricNs?.Textbox?.prototype
  if (!proto || proto.__curvedText) return
  proto.__curvedText = true
  const baseInit = proto.initDimensions
  const baseWrap = proto._wrapText

  proto._wrapText = function (this: any, lines: any, desiredWidth: number) {
    return baseWrap.call(this, lines, readCurveAmount(this) ? Number.MAX_SAFE_INTEGER : desiredWidth)
  }

  proto.initDimensions = function (this: any) {
    // A path revived from JSON is a plain object (Textbox.fromObject does not
    // enliven it) and has no pathOffset, which makes fabric's line measuring
    // throw. Drop it; a curve is rebuilt from metadata below.
    if (this.path && !isFabricPath(this.path)) this.path = null
    baseInit.call(this)
    if (this.__skipDimension || this.__fittingCurve) return
    this.__fittingCurve = true
    try {
      fitCurve(fabricNs, this, () => baseInit.call(this))
    } finally {
      this.__fittingCurve = false
    }
  }
}

/**
 * Set (or with 0, remove) the curve on a textbox. Requires installCurvedText.
 * Removing restores a box wide enough for the unwrapped text so it does not
 * suddenly wrap into the (narrower) curve's width.
 */
export function setTextCurve(obj: any, amount: number): void {
  const a = Math.round(normalizeCurve(amount))
  const meta = { ...(obj.metadata || {}) }
  // keep the visual centre put while the box resizes around the curve
  const center = typeof obj.getCenterPoint === 'function' ? obj.getCenterPoint() : null
  if (a) {
    meta.textCurve = { amount: a } as TextCurveState
    obj.set('metadata', meta)
    obj.initDimensions()
  } else {
    const wasCurved = !!readCurveAmount(obj)
    const textWidth = wasCurved ? obj.calcTextWidth() : 0
    delete meta.textCurve
    obj.set('metadata', meta)
    obj.path = null
    obj.pathStartOffset = 0
    obj.pathSide = 'left'
    if (wasCurved) obj.width = Math.ceil(textWidth) + 2
    obj.initDimensions()
  }
  if (center && typeof obj.setPositionByOrigin === 'function')
    obj.setPositionByOrigin(center, 'center', 'center')
  obj.setCoords()
  obj.dirty = true
}
