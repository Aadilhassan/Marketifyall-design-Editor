/**
 * Pure timeline geometry: time ↔ pixels, zoom, ruler ticks, snapping,
 * magnetic insertion and virtualization ranges. No DOM, no React — the UI
 * only feeds pointer positions in and renders what comes out.
 */

/** Pixels per second limits (zoom). */
export const MIN_PPS = 4
export const MAX_PPS = 480
export const DEFAULT_PPS = 60
/** Snap radius in screen pixels (converted to seconds at the current zoom). */
export const SNAP_PX = 8

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

export const timeToPx = (t: number, pps: number): number => t * pps
export const pxToTime = (x: number, pps: number): number => (pps > 0 ? x / pps : 0)

export const clampPps = (pps: number): number => clamp(Number.isFinite(pps) ? pps : DEFAULT_PPS, MIN_PPS, MAX_PPS)

/** Zoom slider position 0..1 ↔ pixels per second, on a log scale so every notch feels the same. */
export function sliderToPps(v: number): number {
  const k = clamp(v, 0, 1)
  return clampPps(Math.exp(Math.log(MIN_PPS) + k * (Math.log(MAX_PPS) - Math.log(MIN_PPS))))
}

export function ppsToSlider(pps: number): number {
  return (Math.log(clampPps(pps)) - Math.log(MIN_PPS)) / (Math.log(MAX_PPS) - Math.log(MIN_PPS))
}

/** One zoom step (keyboard +/−, buttons): ×/÷ 1.25. */
export const stepZoom = (pps: number, dir: 1 | -1): number => clampPps(dir > 0 ? pps * 1.25 : pps / 1.25)

/** Zoom that shows `duration` seconds in `viewportPx` with a little room on the right. */
export function fitPps(duration: number, viewportPx: number, padPx = 48): number {
  const d = Math.max(1, duration)
  return clampPps((Math.max(80, viewportPx) - padPx) / d)
}

/**
 * New scrollLeft after a zoom so the time under `anchorX` (px from the visible
 * left edge of the time area) stays under the cursor.
 */
export function scrollForZoom(scrollLeft: number, anchorX: number, oldPps: number, newPps: number): number {
  const t = pxToTime(scrollLeft + anchorX, oldPps)
  return Math.max(0, timeToPx(t, newPps) - anchorX)
}

// ---------------------------------------------------------------------------
// Ruler
// ---------------------------------------------------------------------------

/** Labeled-step candidates in seconds (frame-ish below 1 s). */
const NICE_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

export interface RulerTick {
  t: number
  major: boolean
}

/**
 * Ticks between `from` and `to` seconds. A label lands roughly every
 * `minLabelPx` pixels; minor ticks subdivide each labeled step.
 */
export function rulerTicks(pps: number, from: number, to: number, minLabelPx = 72): { major: number; minor: number; ticks: RulerTick[] } {
  const major = NICE_STEPS.find(s => s * pps >= minLabelPx) ?? NICE_STEPS[NICE_STEPS.length - 1]
  const divisions = major * pps >= 160 ? 10 : major * pps >= 60 ? 5 : 2
  const minor = major / divisions
  const ticks: RulerTick[] = []
  const first = Math.max(0, Math.floor(from / minor))
  const last = Math.ceil(Math.max(from, to) / minor)
  for (let i = first; i <= last && ticks.length < 5000; i++) {
    const t = Math.round(i * minor * 1000) / 1000
    ticks.push({ t, major: i % divisions === 0 })
  }
  return { major, minor, ticks }
}

/** `mm:ss.hh` (hundredths). Hours roll into minutes (99+ min shows as is). */
export function formatTimecode(t: number): string {
  const v = Math.max(0, Number.isFinite(t) ? t : 0)
  const totalHundredths = Math.round(v * 100)
  const m = Math.floor(totalHundredths / 6000)
  const s = Math.floor((totalHundredths % 6000) / 100)
  const h = totalHundredths % 100
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(h).padStart(2, '0')}`
}

/** Short ruler label: `0:05`, `1:30`, `0:02.5` below a second step. */
export function formatRulerLabel(t: number, step: number): string {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  const sec = step < 1 ? s.toFixed(1).padStart(4, '0') : String(Math.round(s)).padStart(2, '0')
  return `${m}:${sec}`
}

// ---------------------------------------------------------------------------
// Snapping
// ---------------------------------------------------------------------------

export interface SnapResult {
  /** Correction to add to the dragged times (0 when nothing snapped). */
  delta: number
  /** The target time snapped to (draw the snap line here), or null. */
  at: number | null
}

/**
 * Snap a dragged item. `edges` are the item's candidate times after the raw
 * drag (e.g. [start, end] for a move, [edge] for a trim); the closest
 * edge/target pair within `SNAP_PX` wins. Disabled snapping or a held Alt
 * (`bypass`) returns the raw position.
 */
export function resolveSnap(opts: {
  edges: number[]
  targets: number[]
  pps: number
  enabled: boolean
  bypass?: boolean
  thresholdPx?: number
}): SnapResult {
  if (!opts.enabled || opts.bypass || !(opts.pps > 0)) return { delta: 0, at: null }
  const threshold = (opts.thresholdPx ?? SNAP_PX) / opts.pps
  let best: SnapResult = { delta: 0, at: null }
  let bestD = threshold + 1e-9
  for (const e of opts.edges) {
    for (const t of opts.targets) {
      const d = Math.abs(t - e)
      if (d < bestD) {
        bestD = d
        best = { delta: t - e, at: t }
      }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Magnetic main track
// ---------------------------------------------------------------------------

export interface Span {
  id: string
  start: number
  end: number
}

/**
 * Where a clip dropped at time `t` lands among the (other) clips of a
 * magnetic track: before the first clip whose midpoint is right of `t`.
 */
export function magneticInsertIndex(others: Span[], t: number): number {
  const sorted = others.slice().sort((a, b) => a.start - b.start)
  let i = 0
  while (i < sorted.length && (sorted[i].start + sorted[i].end) / 2 <= t) i++
  return i
}

/** Track order with `id` inserted at `index` of the others (stable, removes `id` first). */
export function insertOrder(othersSorted: string[], id: string, index: number): string[] {
  const rest = othersSorted.filter(x => x !== id)
  const i = clamp(index, 0, rest.length)
  return [...rest.slice(0, i), id, ...rest.slice(i)]
}

/** Time of the boundary before index `i` on a packed track (where the insertion line is drawn). */
export function boundaryTime(othersSorted: Span[], index: number): number {
  if (index <= 0 || othersSorted.length === 0) return othersSorted[0]?.start ?? 0
  return othersSorted[Math.min(index, othersSorted.length) - 1].end
}

// ---------------------------------------------------------------------------
// Virtualization
// ---------------------------------------------------------------------------

/** Visible time range of the scroller, widened by `overscanPx` on both sides. */
export function visibleRange(scrollLeft: number, viewportPx: number, pps: number, overscanPx = 400): [number, number] {
  const from = pxToTime(Math.max(0, scrollLeft - overscanPx), pps)
  const to = pxToTime(scrollLeft + viewportPx + overscanPx, pps)
  return [from, to]
}

/**
 * The same range quantized to `bucketPx` so small scrolls don't change it
 * (consumers memoize on the result and don't re-render per scroll pixel).
 */
export function quantizedRange(scrollLeft: number, viewportPx: number, pps: number, bucketPx = 256): [number, number] {
  const a = Math.floor(Math.max(0, scrollLeft - bucketPx * 2) / bucketPx) * bucketPx
  const b = Math.ceil((scrollLeft + viewportPx + bucketPx * 2) / bucketPx) * bucketPx
  return [pxToTime(a, pps), pxToTime(b, pps)]
}

export const overlapsRange = (start: number, end: number, range: [number, number]): boolean => end >= range[0] && start <= range[1]

// ---------------------------------------------------------------------------
// Playhead navigation
// ---------------------------------------------------------------------------

/** Move by whole frames on the frame grid (←/→). */
export function frameStep(t: number, frames: number, fps: number): number {
  const f = Math.round(t * fps) + frames
  return Math.max(0, f / fps)
}

/**
 * Follow-the-playhead while playing: page-flip when the playhead leaves the
 * visible area (or is about to), else keep the scroll. Returns the new scrollLeft or null.
 */
export function followScroll(playheadPx: number, scrollLeft: number, viewportPx: number, marginPx = 40): number | null {
  if (viewportPx <= 0) return null
  if (playheadPx < scrollLeft || playheadPx > scrollLeft + viewportPx - marginPx) {
    return Math.max(0, playheadPx - viewportPx * 0.1)
  }
  return null
}
