import {
  addGuide,
  designToScreen,
  formatLabel,
  generateTicks,
  getActiveGuides,
  moveGuide,
  pickStep,
  removeGuide,
  sanitizeGuides,
  screenToDesign,
  setActiveGuides,
  stepLadder,
} from './guides'

describe('stepLadder / pickStep', () => {
  it('follows 1, 2, 5, 10, 25, 50, 100, 250, 500…', () => {
    expect(stepLadder(1000).slice(0, 12)).toEqual([1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000])
  })

  it('keeps label spacing >= 50px at common zooms', () => {
    expect(pickStep(1)).toBe(50)
    expect(pickStep(0.5)).toBe(100)
    expect(pickStep(0.3)).toBe(250)
    expect(pickStep(2)).toBe(25)
  })

  it('handles extreme zooms', () => {
    expect(pickStep(10)).toBe(5)
    expect(pickStep(0.05)).toBe(1000)
    expect(pickStep(100)).toBe(1)
    for (const z of [0.05, 0.1, 0.33, 1, 3.7, 10]) expect(pickStep(z) * z).toBeGreaterThanOrEqual(50)
  })

  it('falls back on invalid zoom', () => {
    expect(pickStep(0)).toBe(100)
    expect(pickStep(NaN)).toBe(100)
  })
})

describe('generateTicks', () => {
  it('labels multiples of the step inside the range, including negatives', () => {
    const t = generateTicks(-120, 160, 50, 1)
    expect(t.major.map(m => m.pos)).toEqual([-100, -50, 0, 50, 100, 150])
    expect(t.major.map(m => m.label)).toEqual(['-100', '-50', '0', '50', '100', '150'])
  })

  it('accepts reversed ranges and never prints -0', () => {
    const t = generateTicks(10, -10, 5, 10)
    expect(t.major.map(m => m.label)).toEqual(['-10', '-5', '0', '5', '10'])
    expect(formatLabel(-0)).toBe('0')
  })

  it('adds minor ticks only when they have room on screen', () => {
    expect(generateTicks(0, 100, 100, 1).minor).toEqual([20, 40, 60, 80])
    expect(generateTicks(0, 100, 100, 0.1).minor).toEqual([]) // 20 * 0.1 = 2px < 4px
  })

  it('works at zoom 0.05 and 10 with a sensible tick count', () => {
    const far = generateTicks(-5000, 20000, pickStep(0.05), 0.05)
    expect(far.major[0].pos).toBe(-5000)
    expect(far.major.length).toBe(26)
    const near = generateTicks(-3, 7, pickStep(10), 10)
    expect(near.major.map(m => m.pos)).toEqual([0, 5])
    expect(near.minor).toEqual([-3, -2, -1, 1, 2, 3, 4, 6, 7])
  })

  it('refuses absurd ranges', () => {
    expect(generateTicks(0, 1e9, 1, 1)).toEqual({ major: [], minor: [] })
  })
})

describe('screen <-> design conversion', () => {
  const origin = { x: 200, y: 100 } // page top-left in scene coords

  it('round-trips at zoom 1 with pan', () => {
    const vpt = [1, 0, 0, 1, 30, 40]
    expect(designToScreen(0, 'x', vpt, origin)).toBe(230)
    expect(designToScreen(0, 'y', vpt, origin)).toBe(140)
    expect(screenToDesign(230, 'x', vpt, origin)).toBe(0)
    expect(screenToDesign(140, 'y', vpt, origin)).toBe(0)
  })

  it('gives negative design positions left of / above the page', () => {
    const vpt = [0.5, 0, 0, 0.5, 0, 0]
    expect(screenToDesign(50, 'x', vpt, origin)).toBe(-100)
    expect(screenToDesign(0, 'y', vpt, origin)).toBe(-100)
    expect(designToScreen(-100, 'x', vpt, origin)).toBe(50)
  })

  it('round-trips at extreme zooms', () => {
    for (const z of [0.05, 10]) {
      const vpt = [z, 0, 0, z, -123, 456]
      for (const d of [-250, 0, 37.5, 1080]) {
        expect(screenToDesign(designToScreen(d, 'x', vpt, origin), 'x', vpt, origin)).toBeCloseTo(d, 6)
        expect(screenToDesign(designToScreen(d, 'y', vpt, origin), 'y', vpt, origin)).toBeCloseTo(d, 6)
      }
    }
  })
})

describe('guide lists', () => {
  it('add keeps sorted and deduped', () => {
    expect(addGuide([10, 50], 30)).toEqual([10, 30, 50])
    expect(addGuide([10, 30], 30)).toEqual([10, 30])
    expect(addGuide([], -20)).toEqual([-20])
    expect(addGuide([0], -20.004)).toEqual([-20, 0])
  })

  it('remove drops the matching guide only', () => {
    expect(removeGuide([-5, 10, 30], 10)).toEqual([-5, 30])
    expect(removeGuide([10], 99)).toEqual([10])
  })

  it('move re-sorts and merges duplicates', () => {
    expect(moveGuide([10, 30, 50], 10, 60)).toEqual([30, 50, 60])
    expect(moveGuide([10, 30], 10, 30)).toEqual([30])
    expect(moveGuide([10], 10, -40)).toEqual([-40])
  })

  it('does not mutate the input', () => {
    const list = [10, 20]
    addGuide(list, 5)
    removeGuide(list, 10)
    expect(list).toEqual([10, 20])
  })

  it('sanitizes stored data', () => {
    expect(sanitizeGuides(null)).toEqual({ x: [], y: [] })
    expect(sanitizeGuides({ x: [30, 'a', 10, 10, NaN], y: 'nope' })).toEqual({ x: [10, 30], y: [] })
  })
})

describe('active guides registry', () => {
  it('publishes and clears per canvas', () => {
    const canvas = {}
    expect(getActiveGuides(canvas)).toBeNull()
    setActiveGuides(canvas, { x: [1], y: [] })
    expect(getActiveGuides(canvas)).toEqual({ x: [1], y: [] })
    setActiveGuides(canvas, null)
    expect(getActiveGuides(canvas)).toBeNull()
  })
})
