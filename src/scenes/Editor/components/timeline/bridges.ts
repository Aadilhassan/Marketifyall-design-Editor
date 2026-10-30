/**
 * Editor-wide wiring the timeline needs whether it's open, collapsed or the
 * phone strip: the canvas/timeline undo bridge, Space-tap → play/pause, and
 * the "does this design have a timeline" rule.
 */
import { useEffect, useRef } from 'react'
import { ignoreError } from '@/lib/logger'
import type { VideoProjectApi } from '@/video/VideoProjectContext'
import { installUndoBridge } from './undoJournal'
import { SPACE_TAP_EVENT } from './keys'
import type { ElementInfo } from './canvasElements'

type AnyObj = any

/** Media/element clips on the project, or any animated element on the page. */
export function hasTimelineContent(api: VideoProjectApi, elements: ElementInfo[]): boolean {
  return api.project.clips.length > 0 || elements.some(e => e.animated)
}

export function useTimelineBridges(editor: AnyObj, api: VideoProjectApi, hasTimeline: boolean): void {
  const apiRef = useRef(api)
  apiRef.current = api
  const hasRef = useRef(hasTimeline)
  hasRef.current = hasTimeline

  useEffect(() => {
    if (!editor) return
    try {
      return installUndoBridge(editor, () => apiRef.current)
    } catch (err) {
      ignoreError(err, 'editor without a history handler (embed/test shells): timeline keeps its own undo')
      return undefined
    }
  }, [editor])

  useEffect(() => {
    const onTap = () => {
      if (hasRef.current) apiRef.current.controller.toggle()
    }
    window.addEventListener(SPACE_TAP_EVENT, onTap)
    return () => window.removeEventListener(SPACE_TAP_EVENT, onTap)
  }, [])
}

/** Fabric object for a timeline id (fabric id or legacy metadata.id). */
export function findObject(canvas: AnyObj, id: string | undefined): AnyObj | undefined {
  if (!canvas || !id) return undefined
  const list: AnyObj[] = canvas.getObjects?.() || []
  return list.find(o => o?.id === id) || list.find(o => o?.metadata?.id === id)
}
