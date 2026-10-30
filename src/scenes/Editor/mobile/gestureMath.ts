/**
 * Two-finger stage gestures as pure math. Each pointer-move produces a step:
 * zoom by `scale` around `anchor` (the previous midpoint, in stage px), then
 * pan by `pan` (how far the midpoint moved). Applied in that order, the page
 * point that was under the fingers stays under the fingers.
 */
export interface Pt {
  x: number
  y: number
}

export interface PinchStep {
  scale: number
  anchor: Pt
  pan: Pt
}

export const distance = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y)

export const midpoint = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

export function pinchStep(prev: [Pt, Pt], next: [Pt, Pt]): PinchStep {
  const d0 = distance(prev[0], prev[1])
  const d1 = distance(next[0], next[1])
  const m0 = midpoint(prev[0], prev[1])
  const m1 = midpoint(next[0], next[1])
  return {
    // fingers on top of each other: no meaningful ratio, just pan
    scale: d0 > 1 && d1 > 1 ? d1 / d0 : 1,
    anchor: m0,
    pan: { x: m1.x - m0.x, y: m1.y - m0.y },
  }
}

/** Same limits as the SDK's zoomHandler.zoomToPoint (10%–300%). */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 3

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

/** 2D affine as fabric stores it: [a, b, c, d, e, f]. Zoom about a screen point. */
export function zoomViewportAt(vpt: number[], point: Pt, zoom: number): number[] {
  const k = zoom / vpt[0]
  return [zoom, vpt[1], vpt[2], zoom, point.x - (point.x - vpt[4]) * k, point.y - (point.y - vpt[5]) * k]
}

/** Full step on a viewport transform (what the DOM wiring does via the SDK). */
export function applyPinch(vpt: number[], step: PinchStep): number[] {
  const z = zoomViewportAt(vpt, step.anchor, clampZoom(vpt[0] * step.scale))
  z[4] += step.pan.x
  z[5] += step.pan.y
  return z
}

export const LONG_PRESS_MS = 500
/** Finger travel (px) that cancels a long-press. */
export const LONG_PRESS_SLOP = 8

export const movedBeyond = (start: Pt, now: Pt, slop = LONG_PRESS_SLOP): boolean => distance(start, now) > slop
