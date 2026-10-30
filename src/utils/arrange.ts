/**
 * Pure geometry for the Position panel: align and distribute axis-aligned
 * boxes. Callers pass visual (rotated) bounding boxes in scene space and get
 * back per-box translation deltas, in the same order as the input.
 */

export type Box = { left: number; top: number; width: number; height: number }
export type Delta = { dx: number; dy: number }
export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type Axis = 'horizontal' | 'vertical'

/** Smallest box containing every input box. Empty input → zero box. */
export function unionBox(boxes: Box[]): Box {
  if (!boxes.length) return { left: 0, top: 0, width: 0, height: 0 }
  const left = Math.min(...boxes.map(b => b.left))
  const top = Math.min(...boxes.map(b => b.top))
  const right = Math.max(...boxes.map(b => b.left + b.width))
  const bottom = Math.max(...boxes.map(b => b.top + b.height))
  return { left, top, width: right - left, height: bottom - top }
}

function alignDelta(b: Box, mode: AlignMode, t: Box): Delta {
  switch (mode) {
    case 'left':
      return { dx: t.left - b.left, dy: 0 }
    case 'center':
      return { dx: t.left + t.width / 2 - (b.left + b.width / 2), dy: 0 }
    case 'right':
      return { dx: t.left + t.width - (b.left + b.width), dy: 0 }
    case 'top':
      return { dx: 0, dy: t.top - b.top }
    case 'middle':
      return { dx: 0, dy: t.top + t.height / 2 - (b.top + b.height / 2) }
    case 'bottom':
      return { dx: 0, dy: t.top + t.height - (b.top + b.height) }
    default:
      return { dx: 0, dy: 0 }
  }
}

/** Deltas that align each box to `target` (the page box or the selection's union box). */
export function alignBoxes(boxes: Box[], mode: AlignMode, target: Box): Delta[] {
  return boxes.map(b => alignDelta(b, mode, target))
}

/**
 * Deltas that make the gaps between neighbouring boxes equal along `axis`.
 * Boxes are ordered by their leading edge; the first and last stay put.
 * Fewer than 3 boxes → all-zero deltas.
 */
export function distributeBoxes(boxes: Box[], axis: Axis): Delta[] {
  const out: Delta[] = boxes.map(() => ({ dx: 0, dy: 0 }))
  if (boxes.length < 3) return out
  const start = (b: Box) => (axis === 'horizontal' ? b.left : b.top)
  const size = (b: Box) => (axis === 'horizontal' ? b.width : b.height)

  const order = boxes.map((_, i) => i).sort((a, b) => start(boxes[a]) - start(boxes[b]) || a - b)
  const first = boxes[order[0]]
  const last = boxes[order[order.length - 1]]
  const span = start(last) + size(last) - start(first)
  const total = order.reduce((sum, i) => sum + size(boxes[i]), 0)
  const gap = (span - total) / (order.length - 1)

  let cursor = start(first)
  order.forEach((i, k) => {
    // Ends stay exactly where they are (no float drift on the last box).
    const d = k === 0 || k === order.length - 1 ? 0 : cursor - start(boxes[i])
    out[i] = axis === 'horizontal' ? { dx: d, dy: 0 } : { dx: 0, dy: d }
    cursor += size(boxes[i]) + gap
  })
  return out
}
