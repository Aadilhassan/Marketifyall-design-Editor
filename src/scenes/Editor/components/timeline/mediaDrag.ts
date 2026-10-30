/**
 * Drag media from a panel onto the timeline (HTML5 DnD).
 *
 * `dataTransfer` can't be read during `dragover`, and panel items aren't
 * serialisable anyway (they need the panel's add flow), so the source
 * registers the payload here on `dragstart` and the timeline reads it while
 * hovering (ghost size, allowed tracks) and calls `insert` on drop.
 */
import type { DragEvent as ReactDragEvent } from 'react'

export type MediaDragKind = 'video' | 'audio' | 'image'

export interface MediaDropTarget {
  /** Timeline time of the drop (already snapped / at a main-track boundary). */
  start: number
  /** Track under the pointer; undefined = let the add flow pick. */
  trackId?: string
}

export interface MediaDragPayload {
  kind: MediaDragKind
  label: string
  /** Best guess for the ghost width (seconds); the real length is probed on insert. */
  duration?: number
  /** Add the media at the drop target. Resolves to the new clip id (if any). */
  insert: (at: MediaDropTarget) => Promise<string | void>
}

export const MEDIA_DRAG_MIME = 'application/x-mfa-media'

let current: MediaDragPayload | null = null

export function beginMediaDrag(e: ReactDragEvent | DragEvent, payload: MediaDragPayload): void {
  current = payload
  const dt = e.dataTransfer
  if (!dt) return
  dt.effectAllowed = 'copy'
  dt.setData(MEDIA_DRAG_MIME, payload.kind)
  // Firefox only starts a drag with some data set.
  dt.setData('text/plain', payload.label)
}

export function endMediaDrag(): void {
  current = null
}

export function activeMediaDrag(): MediaDragPayload | null {
  return current
}

/** The drag carries one of our payloads or OS files. */
export function dragKind(e: { dataTransfer: DataTransfer | null }): 'media' | 'files' | null {
  const types = Array.from(e.dataTransfer?.types || [])
  if (current && types.includes(MEDIA_DRAG_MIME)) return 'media'
  if (types.includes('Files')) return 'files'
  return null
}
