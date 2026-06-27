/**
 * Easing functions. Each maps a normalized progress p in [0,1] -> eased [0,1]
 * (overshoot/bounce easings may briefly leave the range, which is intended).
 */
import { EasingName } from './types'

const c1 = 1.70158
const c3 = c1 + 1
const c4 = (2 * Math.PI) / 3

export const easings: Record<EasingName, (p: number) => number> = {
  linear: p => p,
  easeIn: p => p * p,
  easeOut: p => 1 - (1 - p) * (1 - p),
  easeInOut: p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  easeInQuad: p => p * p,
  easeOutQuad: p => 1 - (1 - p) * (1 - p),
  easeInOutQuad: p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  easeInCubic: p => p * p * p,
  easeOutCubic: p => 1 - Math.pow(1 - p, 3),
  easeInOutCubic: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  easeOutBack: p => 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2),
  easeOutElastic: p =>
    p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c4) + 1,
  easeOutBounce: p => {
    const n1 = 7.5625
    const d1 = 2.75
    if (p < 1 / d1) return n1 * p * p
    if (p < 2 / d1) return n1 * (p -= 1.5 / d1) * p + 0.75
    if (p < 2.5 / d1) return n1 * (p -= 2.25 / d1) * p + 0.9375
    return n1 * (p -= 2.625 / d1) * p + 0.984375
  },
}

export function ease(name: EasingName | undefined, p: number): number {
  const fn = (name && easings[name]) || easings.easeOut
  return fn(Math.max(0, Math.min(1, p)))
}

/** Friendly labels for the easing dropdown in the UI. */
export const EASING_OPTIONS: { id: EasingName; label: string }[] = [
  { id: 'easeOut', label: 'Ease out' },
  { id: 'easeInOut', label: 'Ease in-out' },
  { id: 'easeIn', label: 'Ease in' },
  { id: 'linear', label: 'Linear' },
  { id: 'easeOutCubic', label: 'Smooth' },
  { id: 'easeOutBack', label: 'Overshoot' },
  { id: 'easeOutElastic', label: 'Elastic' },
  { id: 'easeOutBounce', label: 'Bounce' },
]
