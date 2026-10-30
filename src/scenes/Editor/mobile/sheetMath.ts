/**
 * Bottom-sheet geometry. Panel sheets snap to ~45% (stage stays visible above)
 * or ~92% of the viewport; dragging below the half snap, or flicking down from
 * it, dismisses. Menu sheets are content-height and only "stay" or "dismiss".
 */
export type SheetSnap = 'half' | 'full'
export type SnapResult = SheetSnap | 'dismiss'

export const SNAP_FRACTION: Record<SheetSnap, number> = { half: 0.45, full: 0.92 }

/** px/ms; faster than this counts as a flick in that direction. */
export const FLICK_VELOCITY = 0.5

export function snapHeight(snap: SheetSnap, viewportHeight: number): number {
  return Math.round(viewportHeight * SNAP_FRACTION[snap])
}

/** Sheet height while dragging: dy > 0 is a downward drag. */
export function dragHeight(startHeight: number, dy: number, viewportHeight: number): number {
  return Math.min(snapHeight('full', viewportHeight), Math.max(0, startHeight - dy))
}

/**
 * Where a released panel sheet settles. `velocity` is px/ms, positive = down.
 */
export function resolveSnap(height: number, velocity: number, viewportHeight: number): SnapResult {
  const half = snapHeight('half', viewportHeight)
  const full = snapHeight('full', viewportHeight)
  if (velocity > FLICK_VELOCITY) return height > half + 1 ? 'half' : 'dismiss'
  if (velocity < -FLICK_VELOCITY) return 'full'
  const targets: [number, SnapResult][] = [
    [0, 'dismiss'],
    [half, 'half'],
    [full, 'full'],
  ]
  let best = targets[0]
  targets.forEach(t => {
    if (Math.abs(height - t[0]) < Math.abs(height - best[0])) best = t
  })
  return best[1]
}

/** Content-height (menu) sheets: dismiss after a 30% drag or a downward flick. */
export function resolveMenuDrag(dy: number, sheetHeight: number, velocity: number): 'stay' | 'dismiss' {
  if (velocity > FLICK_VELOCITY && dy > 0) return 'dismiss'
  return dy > sheetHeight * 0.3 ? 'dismiss' : 'stay'
}

/** Velocity over the last samples of a drag (px/ms, positive = down). */
export function releaseVelocity(samples: { y: number; t: number }[], windowMs = 100): number {
  if (samples.length < 2) return 0
  const last = samples[samples.length - 1]
  let first = samples[0]
  for (let i = samples.length - 1; i >= 0; i--) {
    if (last.t - samples[i].t > windowMs) break
    first = samples[i]
  }
  const dt = last.t - first.t
  return dt > 0 ? (last.y - first.y) / dt : 0
}
