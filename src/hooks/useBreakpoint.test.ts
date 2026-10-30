import { breakpointFor, readBreakpoint, PHONE_QUERY, DESKTOP_QUERY } from './useBreakpoint'

describe('breakpointFor', () => {
  it.each([
    [320, 'phone'],
    [390, 'phone'],
    [767, 'phone'],
    [768, 'tablet'],
    [1024, 'tablet'],
    [1199, 'tablet'],
    [1200, 'desktop'],
    [1440, 'desktop'],
  ])('%i px → %s', (w, bp) => {
    expect(breakpointFor(w)).toBe(bp)
  })
})

describe('readBreakpoint', () => {
  // A fake matchMedia that evaluates our two queries against a width.
  const at = (width: number) => (q: string) => ({
    matches: q === PHONE_QUERY ? width < 768 : q === DESKTOP_QUERY ? width >= 1200 : false,
  })

  it('is desktop without matchMedia (SSR / jsdom)', () => {
    expect(readBreakpoint(undefined)).toBe('desktop')
  })
  it('agrees with breakpointFor', () => {
    ;[390, 767, 768, 1199, 1200, 1920].forEach(w => expect(readBreakpoint(at(w))).toBe(breakpointFor(w)))
  })
})
