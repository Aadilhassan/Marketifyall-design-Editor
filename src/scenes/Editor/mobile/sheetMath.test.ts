/** @jest-environment node */
import { dragHeight, releaseVelocity, resolveMenuDrag, resolveSnap, snapHeight } from './sheetMath'

const H = 844

describe('snapHeight', () => {
  it('maps the snaps to 45% / 92% of the viewport', () => {
    expect(snapHeight('half', H)).toBe(380)
    expect(snapHeight('full', H)).toBe(776)
  })
})

describe('dragHeight', () => {
  it('shrinks when dragged down and grows when dragged up', () => {
    expect(dragHeight(380, 100, H)).toBe(280)
    expect(dragHeight(380, -100, H)).toBe(480)
  })
  it('never exceeds the full snap or goes negative', () => {
    expect(dragHeight(380, -2000, H)).toBe(776)
    expect(dragHeight(380, 2000, H)).toBe(0)
  })
})

describe('resolveSnap', () => {
  it('settles on the nearest snap for a slow release', () => {
    expect(resolveSnap(400, 0, H)).toBe('half')
    expect(resolveSnap(700, 0, H)).toBe('full')
    expect(resolveSnap(120, 0, H)).toBe('dismiss')
  })
  it('a downward flick from above half goes to half', () => {
    expect(resolveSnap(700, 1.2, H)).toBe('half')
  })
  it('a downward flick at or below half dismisses', () => {
    expect(resolveSnap(380, 1.2, H)).toBe('dismiss')
    expect(resolveSnap(300, 0.8, H)).toBe('dismiss')
  })
  it('an upward flick expands to full', () => {
    expect(resolveSnap(300, -0.9, H)).toBe('full')
  })
})

describe('resolveMenuDrag', () => {
  it('dismisses past 30% of the sheet height', () => {
    expect(resolveMenuDrag(100, 300, 0)).toBe('dismiss')
    expect(resolveMenuDrag(80, 300, 0)).toBe('stay')
  })
  it('dismisses on a downward flick', () => {
    expect(resolveMenuDrag(20, 300, 1)).toBe('dismiss')
  })
})

describe('releaseVelocity', () => {
  it('uses only the last ~100 ms of samples', () => {
    const samples = [
      { y: 0, t: 0 },
      { y: 0, t: 400 },
      { y: 50, t: 450 },
      { y: 100, t: 500 },
    ]
    expect(releaseVelocity(samples)).toBeCloseTo(1)
  })
  it('is 0 without enough samples', () => {
    expect(releaseVelocity([{ y: 3, t: 1 }])).toBe(0)
  })
})
