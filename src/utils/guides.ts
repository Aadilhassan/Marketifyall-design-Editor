/**
 * Pure helpers for the editor rulers and user guides: tick-step selection,
 * tick generation, screen <-> design conversion and sorted guide lists.
 *
 * "Design" coordinates are page pixels with 0 at the page's top-left corner.
 * "Scene" coordinates are fabric's untransformed canvas space. "Screen"
 * coordinates are CSS pixels relative to the fabric canvas element, i.e.
 * scene * zoom + pan (from `canvas.viewportTransform`).
 */

export type Axis = 'x' | 'y'
export type GuideSet = { x: number[]; y: number[] }
/** fabric viewport transform: [zoom, 0, 0, zoom, panX, panY] */
export type Vpt = number[]

/** Ladder of ruler label steps: 1, 2, 5, 10, 25, 50, 100, 250, 500, ... */
export function stepLadder(max = 1e7): number[] {
  const out = [1, 2, 5]
  for (let p = 10; p <= max; p *= 10) out.push(p, p * 2.5, p * 5)
  return out
}

const LADDER = stepLadder()

/**
 * Smallest step from the ladder whose on-screen spacing is at least `minPx`,
 * so labels never overlap. Labels are at most ~6 chars of 9px mono (~33px),
 * so the default 50px keeps a comfortable gap.
 */
export function pickStep(zoom: number, minPx = 50): number {
  if (!(zoom > 0) || !isFinite(zoom)) return 100
  for (const s of LADDER) if (s * zoom >= minPx) return s
  return LADDER[LADDER.length - 1]
}

export type Ticks = { major: { pos: number; label: string }[]; minor: number[] }

/** Minor-tick subdivisions per major step (drawn only if they're >= minMinorPx apart). */
export const MINOR_DIVISIONS = 5

/**
 * Ticks covering the design range [from, to] (either order). Majors land on
 * multiples of `step`; minors subdivide each step when there's room on screen.
 */
export function generateTicks(from: number, to: number, step: number, zoom: number, minMinorPx = 4): Ticks {
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const major: Ticks['major'] = []
  const minor: number[] = []
  if (!(step > 0) || !isFinite(lo) || !isFinite(hi)) return { major, minor }
  const first = Math.floor(lo / step)
  const last = Math.ceil(hi / step)
  // Hard cap so a bad zoom can't produce millions of ticks.
  if (last - first > 2000) return { major, minor }
  const minorStep = step / MINOR_DIVISIONS
  const withMinor = minorStep * zoom >= minMinorPx
  for (let i = first; i <= last; i++) {
    const pos = i * step
    if (pos >= lo && pos <= hi) major.push({ pos, label: formatLabel(pos) })
    if (withMinor) {
      for (let k = 1; k < MINOR_DIVISIONS; k++) {
        const m = round4(pos + k * minorStep)
        if (m >= lo && m <= hi) minor.push(m)
      }
    }
  }
  return { major, minor }
}

const round4 = (v: number) => Math.round(v * 1e4) / 1e4

export function formatLabel(pos: number): string {
  const r = round4(pos)
  return String(r === 0 ? 0 : r) // avoid "-0"
}

const zoomOf = (axis: Axis, vpt: Vpt) => (axis === 'x' ? vpt[0] : vpt[3]) || 1
const panOf = (axis: Axis, vpt: Vpt) => (axis === 'x' ? vpt[4] : vpt[5]) || 0

/** Screen px (relative to the canvas element) -> design px. `origin` = page top-left in scene coords. */
export function screenToDesign(screen: number, axis: Axis, vpt: Vpt, origin: { x: number; y: number }): number {
  return (screen - panOf(axis, vpt)) / zoomOf(axis, vpt) - (axis === 'x' ? origin.x : origin.y)
}

/** Design px -> screen px (relative to the canvas element). */
export function designToScreen(design: number, axis: Axis, vpt: Vpt, origin: { x: number; y: number }): number {
  return (design + (axis === 'x' ? origin.x : origin.y)) * zoomOf(axis, vpt) + panOf(axis, vpt)
}

// ---- Guide lists (sorted ascending, deduplicated) ---------------------------

const norm = (v: number) => Math.round(v * 100) / 100
const sortUniq = (list: number[]) =>
  Array.from(new Set(list.filter(v => typeof v === 'number' && isFinite(v)).map(norm))).sort((a, b) => a - b)

export function addGuide(list: number[], pos: number): number[] {
  return sortUniq([...(list || []), pos])
}

export function removeGuide(list: number[], pos: number): number[] {
  const p = norm(pos)
  return sortUniq((list || []).filter(v => norm(v) !== p))
}

export function moveGuide(list: number[], from: number, to: number): number[] {
  return addGuide(removeGuide(list, from), to)
}

/** Coerce untrusted (stored) data into a clean GuideSet. */
export function sanitizeGuides(raw: any): GuideSet {
  return {
    x: Array.isArray(raw?.x) ? sortUniq(raw.x) : [],
    y: Array.isArray(raw?.y) ? sortUniq(raw.y) : [],
  }
}

// ---- Active guides registry (read by smartGuides for snapping) --------------

const active = new WeakMap<object, GuideSet>()

/** Publish the current page's guides (design px) for snapping; `null` disables guide snapping. */
export function setActiveGuides(canvas: object, guides: GuideSet | null): void {
  if (!canvas) return
  if (guides) active.set(canvas, guides)
  else active.delete(canvas)
}

export function getActiveGuides(canvas: object): GuideSet | null {
  return (canvas && active.get(canvas)) || null
}
