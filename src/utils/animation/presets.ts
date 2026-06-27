/**
 * Canva-style animation presets.
 *
 * Entrance/Exit presets are "progress" presets: given eased progress p in
 * [0,1] (p = 1 means fully on-screen / identity) they return the transform
 * deltas. The same builder powers both the entrance (p: 0 -> 1) and the exit
 * (p: 1 -> 0), so "Rise" in == "Rise" out reversed, just like Canva.
 *
 * Emphasis presets are periodic: given the local time and a cycle duration
 * they return a looping transform applied during the element's steady middle.
 */
import { AnimTransform, IDENTITY_TRANSFORM, PresetDirection } from './types'

export interface PresetContext {
  intensity: number // 0..1+ strength multiplier
  direction: PresetDirection
  width: number // base width (px, pre-scale)
  height: number // base height (px, pre-scale)
}

type ProgressBuilder = (p: number, ctx: PresetContext) => AnimTransform
type PeriodicBuilder = (phase: number, ctx: PresetContext) => AnimTransform // phase in [0,1)

export interface PresetDef<B> {
  id: string
  label: string
  build: B
  /** Default easing that makes the preset feel right. */
  easing?: import('./types').EasingName
  /** Whether the UI should offer a direction control. */
  directional?: boolean
}

function slideDistance(ctx: PresetContext, axis: 'x' | 'y'): number {
  const base = axis === 'x' ? ctx.width : ctx.height
  return (ctx.intensity || 1) * Math.max(60, base * 0.7)
}

function directionalOffset(p: number, ctx: PresetContext): { tx: number; ty: number } {
  const k = 1 - p
  switch (ctx.direction) {
    case 'down':
      return { tx: 0, ty: -slideDistance(ctx, 'y') * k }
    case 'left':
      return { tx: slideDistance(ctx, 'x') * k, ty: 0 }
    case 'right':
      return { tx: -slideDistance(ctx, 'x') * k, ty: 0 }
    case 'up':
    default:
      return { tx: 0, ty: slideDistance(ctx, 'y') * k }
  }
}

// ---------------------------------------------------------------------------
// Entrance / Exit presets
// ---------------------------------------------------------------------------

export const ENTER_EXIT_PRESETS: PresetDef<ProgressBuilder>[] = [
  {
    id: 'none',
    label: 'None',
    build: () => ({ ...IDENTITY_TRANSFORM }),
  },
  {
    id: 'fade',
    label: 'Fade',
    easing: 'easeOut',
    build: p => ({ ...IDENTITY_TRANSFORM, opacity: p }),
  },
  {
    id: 'rise',
    label: 'Rise',
    easing: 'easeOutCubic',
    build: (p, ctx) => ({
      ...IDENTITY_TRANSFORM,
      ty: slideDistance(ctx, 'y') * (1 - p),
      opacity: Math.min(1, p * 1.4),
    }),
  },
  {
    id: 'slide',
    label: 'Slide',
    easing: 'easeOutCubic',
    directional: true,
    build: (p, ctx) => ({
      ...IDENTITY_TRANSFORM,
      ...directionalOffset(p, ctx),
      opacity: Math.min(1, p * 1.6),
    }),
  },
  {
    id: 'pop',
    label: 'Pop',
    easing: 'easeOutBack',
    build: p => ({ ...IDENTITY_TRANSFORM, scale: 0.3 + 0.7 * p, opacity: Math.min(1, p * 1.6) }),
  },
  {
    id: 'zoom',
    label: 'Zoom in',
    easing: 'easeOutCubic',
    build: p => ({ ...IDENTITY_TRANSFORM, scale: 0.4 + 0.6 * p, opacity: p }),
  },
  {
    id: 'shrink',
    label: 'Zoom out',
    easing: 'easeOutCubic',
    build: p => ({ ...IDENTITY_TRANSFORM, scale: 1 + 0.7 * (1 - p), opacity: p }),
  },
  {
    id: 'spin',
    label: 'Spin',
    easing: 'easeOutCubic',
    build: (p, ctx) => ({
      ...IDENTITY_TRANSFORM,
      rotate: -180 * (ctx.intensity || 1) * (1 - p),
      scale: 0.6 + 0.4 * p,
      opacity: p,
    }),
  },
  {
    id: 'drop',
    label: 'Drop',
    easing: 'easeOutBounce',
    build: (p, ctx) => ({
      ...IDENTITY_TRANSFORM,
      ty: -slideDistance(ctx, 'y') * (1 - p),
      opacity: Math.min(1, p * 2),
    }),
  },
  {
    id: 'bounce',
    label: 'Bounce',
    easing: 'easeOutBounce',
    build: (p, ctx) => ({
      ...IDENTITY_TRANSFORM,
      ty: slideDistance(ctx, 'y') * (1 - p),
      opacity: Math.min(1, p * 2),
    }),
  },
  {
    id: 'fly',
    label: 'Fly in',
    easing: 'easeOutCubic',
    directional: true,
    build: (p, ctx) => {
      const big = { ...ctx, intensity: (ctx.intensity || 1) * 2.2 }
      return { ...IDENTITY_TRANSFORM, ...directionalOffset(p, big), scale: 0.85 + 0.15 * p, opacity: Math.min(1, p * 2) }
    },
  },
  {
    id: 'tumble',
    label: 'Tumble',
    easing: 'easeOutCubic',
    build: (p, ctx) => ({
      ...IDENTITY_TRANSFORM,
      rotate: 25 * (ctx.intensity || 1) * (1 - p),
      ty: slideDistance(ctx, 'y') * 0.6 * (1 - p),
      opacity: p,
    }),
  },
]

// ---------------------------------------------------------------------------
// Emphasis (looping) presets
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2

export const EMPHASIS_PRESETS: PresetDef<PeriodicBuilder>[] = [
  { id: 'none', label: 'None', build: () => ({ ...IDENTITY_TRANSFORM }) },
  {
    id: 'pulse',
    label: 'Pulse',
    build: (phase, ctx) => ({ ...IDENTITY_TRANSFORM, scale: 1 + 0.07 * (ctx.intensity || 1) * Math.sin(phase * TAU) }),
  },
  {
    id: 'breathe',
    label: 'Breathe',
    build: (phase, ctx) => ({
      ...IDENTITY_TRANSFORM,
      scale: 1 + 0.05 * (ctx.intensity || 1) * (0.5 - 0.5 * Math.cos(phase * TAU)),
    }),
  },
  {
    id: 'wobble',
    label: 'Wobble',
    build: (phase, ctx) => ({ ...IDENTITY_TRANSFORM, rotate: 4 * (ctx.intensity || 1) * Math.sin(phase * TAU) }),
  },
  {
    id: 'bob',
    label: 'Float',
    build: (phase, ctx) => ({ ...IDENTITY_TRANSFORM, ty: -12 * (ctx.intensity || 1) * (0.5 - 0.5 * Math.cos(phase * TAU)) }),
  },
  {
    id: 'shake',
    label: 'Shake',
    build: (phase, ctx) => ({ ...IDENTITY_TRANSFORM, tx: 6 * (ctx.intensity || 1) * Math.sin(phase * TAU * 3) }),
  },
  {
    id: 'flash',
    label: 'Flash',
    build: (phase, ctx) => ({
      ...IDENTITY_TRANSFORM,
      opacity: 1 - 0.6 * (ctx.intensity || 1) * (0.5 - 0.5 * Math.cos(phase * TAU)),
    }),
  },
  {
    id: 'tada',
    label: 'Tada',
    build: (phase, ctx) => {
      const i = ctx.intensity || 1
      return {
        ...IDENTITY_TRANSFORM,
        scale: 1 + 0.08 * i * Math.sin(phase * TAU * 2),
        rotate: 4 * i * Math.sin(phase * TAU * 3),
      }
    },
  },
]

export const ENTER_EXIT_MAP: Record<string, PresetDef<ProgressBuilder>> = Object.fromEntries(
  ENTER_EXIT_PRESETS.map(p => [p.id, p])
)
export const EMPHASIS_MAP: Record<string, PresetDef<PeriodicBuilder>> = Object.fromEntries(
  EMPHASIS_PRESETS.map(p => [p.id, p])
)
