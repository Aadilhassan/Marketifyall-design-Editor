/** @jest-environment node */
import { alignBoxes, distributeBoxes, unionBox } from './arrange'
import type { Box } from './arrange'

const page: Box = { left: 0, top: 0, width: 1000, height: 500 }
const apply = (boxes: Box[], deltas: { dx: number; dy: number }[]): Box[] =>
  boxes.map((b, i) => ({ ...b, left: b.left + deltas[i].dx, top: b.top + deltas[i].dy }))

describe('unionBox', () => {
  it('spans all boxes', () => {
    expect(
      unionBox([
        { left: 10, top: 20, width: 30, height: 40 },
        { left: -5, top: 50, width: 10, height: 100 },
      ]),
    ).toEqual({ left: -5, top: 20, width: 45, height: 130 })
  })
  it('returns a zero box for empty input', () => {
    expect(unionBox([])).toEqual({ left: 0, top: 0, width: 0, height: 0 })
  })
})

describe('alignBoxes', () => {
  const box: Box = { left: 100, top: 100, width: 200, height: 50 }

  it('aligns a single box to the page', () => {
    expect(alignBoxes([box], 'left', page)).toEqual([{ dx: -100, dy: 0 }])
    expect(alignBoxes([box], 'center', page)).toEqual([{ dx: 300, dy: 0 }])
    expect(alignBoxes([box], 'right', page)).toEqual([{ dx: 700, dy: 0 }])
    expect(alignBoxes([box], 'top', page)).toEqual([{ dx: 0, dy: -100 }])
    expect(alignBoxes([box], 'middle', page)).toEqual([{ dx: 0, dy: 125 }])
    expect(alignBoxes([box], 'bottom', page)).toEqual([{ dx: 0, dy: 350 }])
  })

  it('aligns several boxes to their union', () => {
    const boxes: Box[] = [
      { left: 0, top: 0, width: 100, height: 10 },
      { left: 50, top: 40, width: 20, height: 60 },
      { left: 300, top: 10, width: 50, height: 30 },
    ]
    const u = unionBox(boxes)
    const right = apply(boxes, alignBoxes(boxes, 'right', u))
    right.forEach(b => expect(b.left + b.width).toBe(350))
    const middle = apply(boxes, alignBoxes(boxes, 'middle', u))
    middle.forEach(b => expect(b.top + b.height / 2).toBe(50))
    // Left/top alignment leaves the edge object where it is.
    expect(alignBoxes(boxes, 'left', u)[0]).toEqual({ dx: 0, dy: 0 })
  })
})

describe('distributeBoxes', () => {
  it('equalises gaps with unequal sizes and keeps the ends fixed', () => {
    const boxes: Box[] = [
      { left: 0, top: 0, width: 100, height: 10 },
      { left: 110, top: 0, width: 50, height: 10 },
      { left: 400, top: 0, width: 200, height: 10 },
      { left: 170, top: 0, width: 30, height: 10 },
    ]
    const d = distributeBoxes(boxes, 'horizontal')
    expect(d[0]).toEqual({ dx: 0, dy: 0 })
    expect(d[2]).toEqual({ dx: 0, dy: 0 })
    const out = apply(boxes, d).sort((a, b) => a.left - b.left)
    const gaps = out.slice(1).map((b, i) => b.left - (out[i].left + out[i].width))
    // span 600, total width 380 → 3 gaps of 220/3
    gaps.forEach(g => expect(g).toBeCloseTo(220 / 3))
  })

  it('is independent of input order', () => {
    const a: Box = { left: 0, top: 0, width: 10, height: 10 }
    const b: Box = { left: 0, top: 30, width: 10, height: 40 }
    const c: Box = { left: 0, top: 200, width: 10, height: 20 }
    const one = distributeBoxes([a, b, c], 'vertical')
    const two = distributeBoxes([c, a, b], 'vertical')
    expect(two).toEqual([one[2], one[0], one[1]])
    // gaps: span 220, total 70 → 75 each; b moves to top 85
    expect(one[1]).toEqual({ dx: 0, dy: 55 })
  })

  it('is a no-op for 1 or 2 boxes', () => {
    const boxes: Box[] = [
      { left: 0, top: 0, width: 10, height: 10 },
      { left: 90, top: 5, width: 10, height: 10 },
    ]
    expect(distributeBoxes(boxes, 'horizontal')).toEqual([
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
    ])
    expect(distributeBoxes([boxes[0]], 'vertical')).toEqual([{ dx: 0, dy: 0 }])
    expect(distributeBoxes([], 'vertical')).toEqual([])
  })
})
