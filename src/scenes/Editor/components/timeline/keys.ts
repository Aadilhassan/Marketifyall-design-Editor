/**
 * Pure keyboard logic for the timeline: the J/K/L shuttle state machine, the
 * key → action map and the Space tap-vs-pan decision used by the stage.
 */

// ---------------------------------------------------------------------------
// J/K/L
// ---------------------------------------------------------------------------

export const MAX_SHUTTLE = 4

/**
 * Next transport rate after J, K or L.
 *  - K stops.
 *  - L from stopped/backwards plays at 1×; repeated L doubles (2×, 4×).
 *  - J mirrors L backwards (−1×, −2×, −4×).
 */
export function nextShuttleRate(current: number, key: 'j' | 'k' | 'l'): number {
  if (key === 'k') return 0
  if (key === 'l') return current > 0 ? Math.min(current * 2, MAX_SHUTTLE) : 1
  return current < 0 ? Math.max(current * 2, -MAX_SHUTTLE) : -1
}

// ---------------------------------------------------------------------------
// Key map
// ---------------------------------------------------------------------------

export type TimelineAction =
  | { type: 'shuttle'; key: 'j' | 'k' | 'l' }
  | { type: 'step'; frames: number }
  | { type: 'stepSeconds'; seconds: number }
  | { type: 'home' }
  | { type: 'end' }
  | { type: 'split' }
  | { type: 'delete'; ripple: boolean }
  | { type: 'duplicate' }
  | { type: 'zoom'; dir: 1 | -1 }
  | { type: 'marker' }
  | { type: 'focusClip'; dir: 1 | -1 }
  | { type: 'deselect' }
  | { type: 'togglePlay' }

export interface KeyLike {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

export interface KeyContext {
  /** Focus or the last pointer-down is inside the timeline. */
  timelineFocused: boolean
  /** The design has a timeline (media, element clips or animation). */
  hasTimeline: boolean
  /** Focus is in a text field / contenteditable / a canvas text being edited. */
  typing: boolean
  /** Space is owned by the stage (tap = play/pause there); the timeline must not also handle it. */
  stageOwnsSpace?: boolean
}

/**
 * Map a keydown to a timeline action, or null to let it through (canvas
 * shortcuts, typing). Transport keys (J/K/L, Home/End) work anywhere in the
 * editor once there is a timeline; editing keys (arrows, S, Delete, ⌘D, +/−,
 * M) only while the timeline is focused, so they never steal canvas nudging,
 * deleting or duplicating. Undo/redo is not here: it goes through
 * `editor.undo/redo`, which the undo bridge routes (see undoJournal).
 */
export function resolveTimelineKey(e: KeyLike, ctx: KeyContext): TimelineAction | null {
  if (ctx.typing || !ctx.hasTimeline) return null
  const mod = !!(e.ctrlKey || e.metaKey)
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key

  if (!mod && !e.altKey) {
    if (k === 'j' || k === 'k' || k === 'l') return { type: 'shuttle', key: k }
    if (k === 'Home') return { type: 'home' }
    if (k === 'End') return { type: 'end' }
    if (k === ' ' && !ctx.stageOwnsSpace) return { type: 'togglePlay' }
  }
  if (!ctx.timelineFocused) return null

  if (mod && !e.altKey && k === 'd') return { type: 'duplicate' }
  if (mod) return null

  if (e.altKey && (k === 'ArrowLeft' || k === 'ArrowRight')) return { type: 'focusClip', dir: k === 'ArrowLeft' ? -1 : 1 }
  if (e.altKey) return null
  switch (k) {
    case 'ArrowLeft':
      return e.shiftKey ? { type: 'stepSeconds', seconds: -1 } : { type: 'step', frames: -1 }
    case 'ArrowRight':
      return e.shiftKey ? { type: 'stepSeconds', seconds: 1 } : { type: 'step', frames: 1 }
    case 's':
      return e.shiftKey ? null : { type: 'split' }
    case 'm':
      return e.shiftKey ? null : { type: 'marker' }
    case 'Delete':
    case 'Backspace':
      return { type: 'delete', ripple: !!e.shiftKey }
    case '+':
    case '=':
      return { type: 'zoom', dir: 1 }
    case '-':
    case '_':
      return { type: 'zoom', dir: -1 }
    case 'Escape':
      return { type: 'deselect' }
    default:
      return null
  }
}

/** Focus is in something that takes text. */
export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const h = el as HTMLElement
  const tag = h.tagName
  if (tag === 'TEXTAREA' || h.isContentEditable) return true
  if (tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = ((h as HTMLInputElement).type || 'text').toLowerCase()
    // Range / checkbox / button inputs don't take typing; arrows on a range still belong to it.
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file'].includes(type)
  }
  return false
}

// ---------------------------------------------------------------------------
// Space: tap = play/pause, hold + drag = pan
// ---------------------------------------------------------------------------

/** A Space held longer than this without panning is treated as "about to pan", not a tap. */
export const SPACE_TAP_MS = 400

/**
 * Decide what a Space release means on the stage. A short press with no pan
 * in between is a tap (→ play/pause when there's a timeline); any pan, or a
 * long hold, is a pan gesture and never toggles playback.
 */
export function decideSpaceRelease(s: { heldMs: number; panned: boolean }): 'tap' | 'none' {
  if (s.panned) return 'none'
  return s.heldMs <= SPACE_TAP_MS ? 'tap' : 'none'
}

/** Window event the stage fires on a Space tap (the timeline toggles playback on it). */
export const SPACE_TAP_EVENT = 'mfa:space-tap'
