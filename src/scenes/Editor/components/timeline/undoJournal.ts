/**
 * One undo order for two histories.
 *
 * The canvas (scenify's HistoryHandler: JSON snapshots) and the timeline
 * (VideoProject command stack) keep separate stacks. The journal remembers
 * which of them each user action went to, so Ctrl/⌘+Z — and the navbar's
 * undo button, and the timeline's own buttons — always undo the most recent
 * action, whichever side it was on.
 *
 * `installUndoBridge` wraps `editor.undo/redo` (every undo path in the app
 * calls these) and the history handler's `save` (every new canvas action), so
 * no caller has to know the journal exists. If the journal points at a side
 * that has nothing left (e.g. the timeline's 100-step limit dropped it), the
 * other side is used.
 */
import { ignoreError } from '@/lib/logger'
import type { HistoryEvent } from '@/video/VideoProjectContext'

export type UndoDomain = 'canvas' | 'timeline'
/** One user action: a single side, or several steps recorded inside `group()`. */
export type UndoEntry = UndoDomain | UndoDomain[]

const LIMIT = 500

export class UndoJournal {
  private done: UndoEntry[] = []
  private undone: UndoEntry[] = []
  private grouping: UndoDomain[] | null = null

  /** A new action happened on `d` (clears the redo order, like both stacks do). */
  record(d: UndoDomain): void {
    if (this.grouping) {
      this.grouping.push(d)
      return
    }
    this.push(d)
  }

  /**
   * Everything recorded while `fn` runs is ONE user action (e.g. deleting a
   * video clip also removes its object from the page), so one undo/redo
   * reverts or replays every side it touched.
   */
  group(fn: () => void): void {
    if (this.grouping) {
      fn()
      return
    }
    this.grouping = []
    try {
      fn()
    } finally {
      const steps = this.grouping
      this.grouping = null
      if (steps.length === 1) this.push(steps[0])
      else if (steps.length > 1) this.push(steps)
    }
  }

  /** Which side(s) an undo should go to, given what each side can do right now. */
  pickUndo(can: Record<UndoDomain, boolean>): UndoEntry | null {
    return pick(this.done, can, true)
  }

  pickRedo(can: Record<UndoDomain, boolean>): UndoEntry | null {
    // Nothing undone since the last new action: a stale redo on the other side must not resurface.
    return pick(this.undone, can, false)
  }

  /** An undo ran for `e`. */
  didUndo(e: UndoEntry): void {
    removeLast(this.done, e)
    this.undone.push(e)
  }

  /** A redo ran for `e`. */
  didRedo(e: UndoEntry): void {
    removeLast(this.undone, e)
    this.done.push(e)
  }

  private push(e: UndoEntry): void {
    this.done.push(e)
    if (this.done.length > LIMIT) this.done.shift()
    this.undone = []
  }

  /** History was reset (new design loaded). */
  clear(): void {
    this.done = []
    this.undone = []
  }

  get snapshot(): { done: UndoEntry[]; undone: UndoEntry[] } {
    return { done: this.done.slice(), undone: this.undone.slice() }
  }
}

const able = (e: UndoEntry, can: Record<UndoDomain, boolean>) => (Array.isArray(e) ? e.some(d => can[d]) : can[e])

function pick(list: UndoEntry[], can: Record<UndoDomain, boolean>, fallback: boolean): UndoEntry | null {
  const last = list[list.length - 1]
  if (last && able(last, can)) return last
  // Journal out of step with a stack (limits, history cleared on one side): use whichever side can.
  for (let i = list.length - 2; i >= 0; i--) if (able(list[i], can)) return list[i]
  if (!fallback && !list.length) return null
  if (can.timeline && !can.canvas) return 'timeline'
  if (can.canvas) return 'canvas'
  return null
}

function removeLast(list: UndoEntry[], e: UndoEntry): void {
  const i = list.lastIndexOf(e)
  if (i >= 0) list.splice(i, 1)
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

type AnyObj = any

export interface TimelineHistory {
  undo: () => void
  redo: () => void
  getHistory: () => { canUndo: boolean; canRedo: boolean }
  subscribeHistory: (fn: (e: HistoryEvent) => void) => () => void
}

/** Snapshot types that aren't user actions (initial state, template load). */
const NOT_ACTIONS = new Set(['init', 'template:load'])

/**
 * Route `editor.undo/redo` through the journal. Returns an uninstaller.
 * Idempotent per editor (a second install is a no-op returning a no-op).
 */
export function installUndoBridge(editor: AnyObj, timeline: () => TimelineHistory, journal = new UndoJournal()): () => void {
  const hh = editor?.handlers?.historyHandler
  if (!editor || !hh || typeof editor.undo !== 'function' || editor.__undoBridge) return () => undefined
  editor.__undoBridge = journal

  const origUndo = editor.undo
  const origRedo = editor.redo
  const origSave = hh.save

  const canvasCan = () => ({
    undo: Array.isArray(hh.undos) ? hh.undos.length > 1 : true,
    redo: Array.isArray(hh.redos) ? hh.redos.length > 0 : true,
  })

  hh.save = function (type: string, ...rest: any[]) {
    if (!NOT_ACTIONS.has(type)) journal.record('canvas')
    return origSave.call(this, type, ...rest)
  }
  const offTimeline = timeline().subscribeHistory(e => {
    if (e === 'do') journal.record('timeline')
  })

  const undoOne = (d: UndoDomain) => {
    const tl = timeline()
    if (d === 'timeline') {
      if (tl.getHistory().canUndo) tl.undo()
    } else if (canvasCan().undo) origUndo.call(editor)
  }
  const redoOne = (d: UndoDomain) => {
    const tl = timeline()
    if (d === 'timeline') {
      if (tl.getHistory().canRedo) tl.redo()
    } else if (canvasCan().redo) origRedo.call(editor)
  }

  editor.undo = function () {
    const e = journal.pickUndo({ canvas: canvasCan().undo, timeline: timeline().getHistory().canUndo })
    if (!e) return
    journal.didUndo(e)
    // A grouped action is reverted newest step first.
    ;(Array.isArray(e) ? e.slice().reverse() : [e]).forEach(undoOne)
  }
  editor.redo = function () {
    const e = journal.pickRedo({ canvas: canvasCan().redo, timeline: timeline().getHistory().canRedo })
    if (!e) return
    journal.didRedo(e)
    ;(Array.isArray(e) ? e : [e]).forEach(redoOne)
  }

  return () => {
    try {
      offTimeline()
      if (hh.save !== origSave) hh.save = origSave
      editor.undo = origUndo
      editor.redo = origRedo
      delete editor.__undoBridge
    } catch (err) {
      ignoreError(err, 'undo bridge already torn down with the editor')
    }
  }
}
