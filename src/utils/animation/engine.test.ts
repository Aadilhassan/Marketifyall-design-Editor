import { evaluateAnimation } from './engine'
import { ease } from './easings'
import { ElementAnimation } from './types'
import { PresetContext } from './presets'

const ctx: PresetContext = { intensity: 1, direction: 'up', width: 200, height: 100 }

describe('easings', () => {
  it('start at 0 and end at 1', () => {
    for (const name of ['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeOutCubic'] as const) {
      expect(ease(name, 0)).toBeCloseTo(0, 5)
      expect(ease(name, 1)).toBeCloseTo(1, 5)
    }
  })
  it('clamps out-of-range input', () => {
    expect(ease('linear', -1)).toBe(0)
    expect(ease('linear', 2)).toBe(1)
  })
})

describe('fade entrance', () => {
  const anim: ElementAnimation = { in: { preset: 'fade', duration: 1, easing: 'linear' } }
  it('is invisible at window start while playing', () => {
    const t = evaluateAnimation(anim, 0, 5, 0, ctx)
    expect(t.opacity).toBeCloseTo(0, 2)
  })
  it('is half visible halfway through the entrance', () => {
    const t = evaluateAnimation(anim, 0, 5, 0.5, ctx)
    expect(t.opacity).toBeGreaterThan(0.3)
    expect(t.opacity).toBeLessThan(0.7)
  })
  it('is fully visible (identity) after the entrance', () => {
    const t = evaluateAnimation(anim, 0, 5, 2, ctx)
    expect(t.opacity).toBeCloseTo(1, 5)
    expect(t.tx).toBeCloseTo(0, 5)
    expect(t.scale).toBeCloseTo(1, 5)
  })
})

describe('rise entrance offsets then settles', () => {
  const anim: ElementAnimation = { in: { preset: 'rise', duration: 1, easing: 'linear' } }
  it('translates down (positive ty) at the start', () => {
    const t = evaluateAnimation(anim, 0, 5, 0, ctx)
    expect(t.ty).toBeGreaterThan(0)
  })
  it('settles to identity after entrance', () => {
    const t = evaluateAnimation(anim, 0, 5, 2, ctx)
    expect(t.ty).toBeCloseTo(0, 5)
  })
})

describe('exit runs in reverse near the end', () => {
  const anim: ElementAnimation = { out: { preset: 'fade', duration: 1, easing: 'linear' } }
  it('is visible in the middle', () => {
    const t = evaluateAnimation(anim, 0, 5, 2.5, ctx)
    expect(t.opacity).toBeCloseTo(1, 5)
  })
  it('fades toward the very end', () => {
    const mid = evaluateAnimation(anim, 0, 5, 4.5, ctx).opacity
    const late = evaluateAnimation(anim, 0, 5, 4.9, ctx).opacity
    expect(late).toBeLessThan(mid)
    expect(late).toBeLessThan(0.3)
  })
})

describe('emphasis loops in the steady middle', () => {
  const anim: ElementAnimation = { emphasis: { preset: 'pulse', duration: 1, easing: 'linear' } }
  it('produces a scale that varies over time', () => {
    const a = evaluateAnimation(anim, 0, 10, 2.25, ctx).scale
    const b = evaluateAnimation(anim, 0, 10, 2.75, ctx).scale
    expect(Math.abs(a - b)).toBeGreaterThan(0.01)
  })
})

describe('windowed timing', () => {
  const anim: ElementAnimation = { in: { preset: 'fade', duration: 1, easing: 'linear' } }
  it('respects a non-zero window start', () => {
    // entrance begins at global t=3 because windowStart=3
    const atStart = evaluateAnimation(anim, 3, 5, 3, ctx).opacity
    const afterIn = evaluateAnimation(anim, 3, 5, 4.5, ctx).opacity
    expect(atStart).toBeCloseTo(0, 2)
    expect(afterIn).toBeCloseTo(1, 2)
  })
})
