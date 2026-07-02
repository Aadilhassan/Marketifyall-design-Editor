/** @jest-environment node */
import { fnv1a } from './saveManager'

describe('fnv1a', () => {
  it('is deterministic', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'))
  })
  it('differs for different content of the SAME length (the length-detection bug)', () => {
    // 'abcd' and 'abce' are both length 4 — the old `.length` signature missed this.
    expect(fnv1a('abcd')).not.toBe(fnv1a('abce'))
  })
  it('returns a stable hex string', () => {
    expect(fnv1a('marketifyall')).toMatch(/^[0-9a-f]{8}$/)
  })
  it('handles empty string', () => {
    expect(fnv1a('')).toMatch(/^[0-9a-f]{8}$/)
  })
})
