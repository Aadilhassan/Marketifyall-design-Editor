/** @jest-environment node */
import { applyPinch, clampZoom, midpoint, movedBeyond, pinchStep, zoomViewportAt } from './gestureMath'

// screen position of a page point under viewport transform vpt
const toScreen = (vpt: number[], p: { x: number; y: number }) => ({ x: p.x * vpt[0] + vpt[4], y: p.y * vpt[3] + vpt[5] })
const toPage = (vpt: number[], s: { x: number; y: number }) => ({ x: (s.x - vpt[4]) / vpt[0], y: (s.y - vpt[5]) / vpt[3] })

describe('pinchStep', () => {
  it('spreading the fingers to twice the distance doubles the zoom', () => {
    const step = pinchStep(
      [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ],
      [
        { x: 50, y: 100 },
        { x: 250, y: 100 },
      ]
    )
    expect(step.scale).toBeCloseTo(2)
    expect(step.anchor).toEqual({ x: 150, y: 100 })
    expect(step.pan).toEqual({ x: 0, y: 0 })
  })

  it('moving both fingers together pans without zooming', () => {
    const step = pinchStep(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      [
        { x: 30, y: 40 },
        { x: 130, y: 40 },
      ]
    )
    expect(step.scale).toBeCloseTo(1)
    expect(step.pan).toEqual({ x: 30, y: 40 })
  })

  it('ignores the ratio when the fingers coincide', () => {
    const p = { x: 10, y: 10 }
    expect(pinchStep([p, p], [p, { x: 50, y: 10 }]).scale).toBe(1)
  })
})

describe('applyPinch', () => {
  it('keeps the page point under the fingers under the fingers', () => {
    const vpt = [0.5, 0, 0, 0.5, 40, 60]
    const prev: [any, any] = [
      { x: 100, y: 200 },
      { x: 220, y: 260 },
    ]
    const next: [any, any] = [
      { x: 80, y: 190 },
      { x: 280, y: 300 },
    ]
    const before = toPage(vpt, midpoint(prev[0], prev[1]))
    const out = applyPinch(vpt, pinchStep(prev, next))
    const after = toScreen(out, before)
    const m1 = midpoint(next[0], next[1])
    expect(after.x).toBeCloseTo(m1.x)
    expect(after.y).toBeCloseTo(m1.y)
  })

  it('clamps to the SDK zoom range', () => {
    const vpt = [2.5, 0, 0, 2.5, 0, 0]
    const out = applyPinch(vpt, { scale: 4, anchor: { x: 0, y: 0 }, pan: { x: 0, y: 0 } })
    expect(out[0]).toBe(3)
    expect(clampZoom(0.01)).toBe(0.1)
  })
})

describe('zoomViewportAt', () => {
  it('leaves the anchor point fixed', () => {
    const vpt = [1, 0, 0, 1, 10, 20]
    const anchor = { x: 200, y: 150 }
    const page = toPage(vpt, anchor)
    const out = zoomViewportAt(vpt, anchor, 1.7)
    const s = toScreen(out, page)
    expect(s.x).toBeCloseTo(anchor.x)
    expect(s.y).toBeCloseTo(anchor.y)
  })
})

describe('movedBeyond', () => {
  it('uses an 8px slop by default', () => {
    expect(movedBeyond({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(false)
    expect(movedBeyond({ x: 0, y: 0 }, { x: 9, y: 0 })).toBe(true)
  })
})
