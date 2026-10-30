import { mapIntoFrame } from './magicResize'
import { findSnap } from './smartGuides'
import { DEFAULT_PARAMS, effectProps, hexToRgba } from './textEffects'
import { migrateVectorGroups } from './vectorGroup'

describe('mapIntoFrame (Magic Resize)', () => {
  const square = { cx: 500, cy: 500, w: 1000, h: 1000 }
  const story = { cx: 540, cy: 960, w: 1080, h: 1920 }

  it('keeps the frame centre at the frame centre', () => {
    expect(mapIntoFrame({ x: 500, y: 500 }, square, story)).toEqual({ x: 540, y: 960, scale: 1.08 })
  })

  it('keeps relative position per axis and scales uniformly by the smaller ratio', () => {
    const m = mapIntoFrame({ x: 0, y: 0 }, square, story)
    expect(m.x).toBeCloseTo(0)
    expect(m.y).toBeCloseTo(0)
    expect(m.scale).toBeCloseTo(1.08)
  })

  it('shrinks content when the page gets smaller', () => {
    expect(mapIntoFrame({ x: 750, y: 500 }, square, { cx: 250, cy: 250, w: 500, h: 500 })).toEqual({ x: 375, y: 250, scale: 0.5 })
  })
})

describe('findSnap (smart guides)', () => {
  it('snaps to the nearest target within the threshold', () => {
    expect(findSnap([100, 150, 200], [203, 400], 6)).toEqual({ delta: 3, at: 203 })
  })

  it('prefers the closest of several candidates', () => {
    expect(findSnap([100], [104, 98], 6)).toEqual({ delta: -2, at: 98 })
  })

  it('returns null when nothing is close enough', () => {
    expect(findSnap([100], [120], 6)).toBeNull()
  })
})

describe('text effects', () => {
  it('hexToRgba handles short, long and invalid hex', () => {
    expect(hexToRgba('#fff', 0.5)).toBe('rgba(255,255,255,0.5)')
    expect(hexToRgba('#d8401c', 1)).toBe('rgba(216,64,28,1)')
    expect(hexToRgba('nope', 0.2)).toBe('rgba(0,0,0,0.2)')
  })

  it('none restores the base fill and clears decoration', () => {
    const p = effectProps('none', DEFAULT_PARAMS.none, '#123456', 40)
    expect(p).toMatchObject({ fill: '#123456', shadow: null, stroke: null, strokeWidth: 0, backgroundColor: '' })
  })

  it('hollow strokes with the base fill and clears the fill', () => {
    const p = effectProps('hollow', DEFAULT_PARAMS.hollow, '#123456', 40)
    expect(p.fill).toBe('rgba(0,0,0,0)')
    expect(p.stroke).toBe('#123456')
    expect(p.strokeWidth).toBeGreaterThan(1)
  })

  it('shadow offset follows direction and scales with font size', () => {
    const p: any = effectProps('shadow', { ...DEFAULT_PARAMS.shadow, direction: 90, offset: 100 }, '#000', 100)
    expect(p.shadow.offsetX).toBeCloseTo(0)
    expect(p.shadow.offsetY).toBeCloseTo(25)
  })

  it('outline paints the stroke behind the fill', () => {
    expect(effectProps('outline', DEFAULT_PARAMS.outline, '#fff', 40).paintFirst).toBe('stroke')
  })
})

describe('migrateVectorGroups', () => {
  it('retags SVG groups with raw fabric children', () => {
    const json = { objects: [{ type: 'group', objects: [{ type: 'path' }, { type: 'rect' }] }] }
    expect(migrateVectorGroups(json).objects[0].type).toBe('vectorGroup')
  })

  it('leaves scenify-authored groups and other objects untouched', () => {
    const json = { objects: [{ type: 'group', objects: [{ type: 'StaticText' }] }, { type: 'textbox' }] }
    expect(migrateVectorGroups(json)).toBe(json)
  })

  it('tolerates empty or malformed input', () => {
    expect(migrateVectorGroups(null)).toBeNull()
    expect(migrateVectorGroups({ objects: [] } as any)).toEqual({ objects: [] })
  })
})

describe('text lists & case', () => {
  const { applyList, detectList, nextListMode, toggleUpper } = require('./textFormat')

  it('adds, switches and removes list prefixes, skipping blank lines', () => {
    const bullets = applyList('Apples\n\nPears', 'bullet')
    expect(bullets).toBe('• Apples\n\n• Pears')
    expect(detectList(bullets)).toBe('bullet')
    const numbered = applyList(bullets, 'number')
    expect(numbered).toBe('1. Apples\n\n2. Pears')
    expect(applyList(numbered, 'none')).toBe('Apples\n\nPears')
  })

  it('cycles none → bullet → number → none', () => {
    expect([nextListMode('none'), nextListMode('bullet'), nextListMode('number')]).toEqual(['bullet', 'number', 'none'])
  })

  it('toggles uppercase and restores the original casing', () => {
    const on = toggleUpper('Hello World', null)
    expect(on).toEqual({ text: 'HELLO WORLD', original: 'Hello World' })
    expect(toggleUpper(on.text, on.original)).toEqual({ text: 'Hello World', original: null })
  })

  it('keeps edits made while uppercased', () => {
    expect(toggleUpper('HELLO THERE', 'Hello World')).toEqual({ text: 'HELLO THERE', original: null })
  })
})
