import { useEffect, useRef } from 'react'
import { color } from '@/theme/tokens'
import { attachSmartGuides } from '@/utils/smartGuides'
import { migrateVectorGroups } from '@/utils/vectorGroup'
import { getFabricCanvas } from '@/utils/magicResize'
import { finalizeExport, orderedIndices, prepareImport } from '@/utils/designJson'
import useStageViewport from './useStageViewport'
import { useVideoProjectOptional, VideoProjectApi } from '@/video/VideoProjectContext'
import { withAuthoredState } from '@/video/apply'
import { isEmptyProject, parseProject } from '@/video/model'

/**
 * Canvas behaviour shared by the standalone editor and the embed editor, so a
 * fix lands in both places:
 *  - every importFromJSON gets a mutable copy (templates come from the frozen
 *    Redux store) with legacy SVG groups migrated so they load intact, and is
 *    normalised by designJson.prepareImport (page-relative coordinates, template
 *    text/photos as plain fabric objects); exportToJSON stores page-relative;
 *  - the SDK's cool-grey backdrop becomes the warm brand one;
 *  - smart alignment guides while dragging;
 *  - the video project travels inside the design JSON as `video` (v1 schema)
 *    so the server save path keeps it; exports are taken in each object's
 *    authored state (never a hidden/mid-animation playback frame); importing
 *    the first JSON with `video` into an editor whose project is empty restores
 *    it (embed loads — page switches never clobber the live project).
 */
const isPageObj = (o: any) => o?.type === 'Frame' || o?.type === 'Background'

/**
 * Raw objects are added as they finish loading (images wait for downloads), so
 * a design can come back with photos stacked over its text. Re-sort into the
 * saved order as objects arrive, for a bounded window after each import.
 */
function keepSavedOrder(canvas: any, saved: any[]) {
  const orderById = new Map<string, number>()
  saved.forEach((o, i) => o?.id && orderById.set(o.id, i))
  let frame = 0
  const reorder = () => {
    frame = 0
    const current = canvas.getObjects()
    const wanted = orderedIndices(current, isPageObj, orderById)
    wanted.forEach((o: any, i: number) => {
      if (current[i] !== o) canvas.moveTo(o, i)
    })
    canvas.requestRenderAll()
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(reorder)
  }
  const expected = saved.filter(o => o && !isPageObj(o)).length
  // Stop as soon as everything has arrived or the user starts editing, so their
  // own layer changes are never overridden.
  const stop = () => {
    canvas.off('object:added', onAdded)
    canvas.off('object:modified', stop)
    clearTimeout(timer)
  }
  const onAdded = () => {
    schedule()
    if (canvas.getObjects().filter((o: any) => !isPageObj(o)).length >= expected) stop()
  }
  canvas.on('object:added', onAdded)
  canvas.on('object:modified', stop)
  const timer = setTimeout(stop, 15000)
  schedule()
}

export default function useCanvasEnhancements(editor: any) {
  useStageViewport(editor)
  const video = useVideoProjectOptional()
  const videoRef = useRef<VideoProjectApi | null>(video)
  videoRef.current = video
  useEffect(() => {
    const ed = editor as any
    if (!ed?.importFromJSON) return
    // The wrappers are installed once per editor; they read the live project through this ref.
    ed.__videoProjectRef = videoRef
    if (ed.__importGuard) return
    const originalImport = ed.importFromJSON.bind(ed)
    ed.importFromJSON = (json: any) => {
      const cv = getFabricCanvas(ed)
      const size = cv?.getWidth ? { width: cv.getWidth(), height: cv.getHeight() } : null
      const copy = json ? JSON.parse(JSON.stringify(json)) : json
      const api: VideoProjectApi | null = ed.__videoProjectRef?.current
      // Only the first import of an editor may bring a project in: later imports are
      // page switches/history whose `video` copies are stale snapshots.
      const saved = !ed.__videoImported && copy && parseProject(copy.video)
      ed.__videoImported = true
      if (api && saved && isEmptyProject(api.getProject())) api.restore(saved)
      if (copy && 'video' in copy) delete copy.video
      const prepared = prepareImport(migrateVectorGroups(copy), size)
      const result = originalImport(prepared)
      if (cv && Array.isArray(prepared?.objects)) keepSavedOrder(cv, prepared.objects)
      return result
    }
    const originalExport = ed.exportToJSON.bind(ed)
    ed.exportToJSON = (...args: any[]) => {
      const frame = getFabricCanvas(ed)?.getObjects?.().find((o: any) => o.type === 'Frame')
      const json = finalizeExport(withAuthoredState(() => originalExport(...args)), frame ? { left: frame.left, top: frame.top } : null)
      const project = ed.__videoProjectRef?.current?.getProject()
      return json && project && !isEmptyProject(project) ? { ...json, video: project } : json
    }
    ed.__importGuard = true
  }, [editor])

  useEffect(() => {
    const cv = getFabricCanvas(editor)
    if (!cv?.on) return
    // Only the SDK default is replaced so whiteboard's dot pattern is left alone.
    if (cv.backgroundColor === '#f6f7f9') {
      cv.backgroundColor = color.canvasBg
      cv.requestRenderAll?.()
    }
    return attachSmartGuides(cv)
  }, [editor])
}
