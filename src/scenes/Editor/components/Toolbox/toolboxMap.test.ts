/** @jest-environment node */
import { resolveToolboxKey, getContextMenuType } from './toolboxMap'

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
