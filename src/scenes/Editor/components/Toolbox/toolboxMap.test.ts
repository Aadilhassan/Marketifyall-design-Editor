/** @jest-environment node */
import { resolveToolboxKey, getContextMenuType, shapeControlsFor } from './toolboxMap'

describe('resolveToolboxKey', () => {
  it('maps native fabric image type to the StaticImage toolbox', () => {
    expect(resolveToolboxKey('image')).toBe('StaticImage')
  })
  it('keeps scenify StaticText mapping', () => {
    expect(resolveToolboxKey('StaticText')).toBe('StaticText')
  })
  it('returns MultiElement for an array of types', () => {
    expect(resolveToolboxKey(['StaticText', 'image'])).toBe('MultiElement')
  })
  it('falls back to Default for unknown types instead of undefined', () => {
    expect(resolveToolboxKey('totally-unknown')).toBe('Default')
  })
})

describe('getContextMenuType', () => {
  it('returns Default for Background', () => {
    expect(getContextMenuType({ type: 'Background' })).toBe('Default')
  })
  it('returns the single selected type', () => {
    expect(getContextMenuType({ type: 'image' })).toBe('image')
  })
})

describe('shape routing', () => {
  it('routes fabric shape types to the Shape toolbar', () => {
    for (const t of ['rect', 'circle', 'triangle', 'ellipse', 'line', 'polygon', 'polyline']) {
      expect(resolveToolboxKey(t)).toBe('Shape')
    }
  })
})

describe('shapeControlsFor', () => {
  it('rect gets a corner-radius control', () => {
    expect(shapeControlsFor('rect').cornerRadius).toBe(true)
  })
  it('circle/ellipse/triangle have no corner radius', () => {
    expect(shapeControlsFor('circle').cornerRadius).toBe(false)
    expect(shapeControlsFor('ellipse').cornerRadius).toBe(false)
    expect(shapeControlsFor('triangle').cornerRadius).toBe(false)
  })
  it('lines have no fill but do have stroke', () => {
    expect(shapeControlsFor('line').fill).toBe(false)
    expect(shapeControlsFor('line').stroke).toBe(true)
  })
  it('all shapes expose stroke width', () => {
    expect(shapeControlsFor('triangle').strokeWidth).toBe(true)
  })
})
