/**
 * The open timeline dock: header, ruler, tracks, playhead, inspector.
 *
 * Rendering rules that keep playback smooth:
 *  - Nothing here subscribes to the clock through React state. The playhead,
 *    its ruler handle, the time readout and follow-scrolling are written to
 *    the DOM directly from one `controller.subscribe` callback.
 *  - Clips are memoized and only those inside the (quantized) visible window
 *    are mounted; scroll re-renders only when the window crosses a bucket.
 *  - Drags preview by applying the very command they'll dispatch to the
 *    project as it was at pointer-down; release dispatches it once (one undo step).
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { color, font } from '@/theme/tokens'
import { fail, ignoreError, log } from '@/lib/logger'
import { notify } from '@/lib/notify'
import useVideoContext from '@/hooks/useVideoContext'
import { usePlayback, useVideoProject } from '@/video/VideoProjectContext'
import { addAudioFile, addVideoFile, fileToDataUrl } from '@/video/importMedia'
import {
  Clip,
  Command,
  Track,
  TransitionType,
  VideoProject,
  applyCommand,
  clipDuration,
  clipEnd,
  findAsset,
  findClip,
  findTrack,
  makeClip,
  makeId,
  projectDuration,
  snapTargets,
  trackClips,
} from '@/video/model'
import { resizeDesign } from '@/utils/magicResize'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import {
  canPlace,
  clipKind,
  clipTraversal,
  deleteCommand,
  detachAudioCommand,
  duplicateCommand,
  isMainTrack,
  moveCommand,
  propsCommand,
  splitCommand,
  trimCommand,
} from './actions'
import { ClipView, ClipZone } from './ClipView'
import { ClipInspector, SPEEDS, TRANSITIONS } from './ClipInspector'
import { Ruler } from './Ruler'
import {
  DEFAULT_PPS,
  boundaryTime,
  clampPps,
  fitPps,
  followScroll,
  formatTimecode,
  frameStep,
  magneticInsertIndex,
  ppsToSlider,
  quantizedRange,
  resolveSnap,
  scrollForZoom,
  sliderToPps,
  stepZoom,
} from './math'
import { isTypingTarget, nextShuttleRate, resolveTimelineKey, TimelineAction } from './keys'
import { ElementInfo, frameSizeOf, nextAddedObject } from './canvasElements'
import { activeMediaDrag, dragKind, MediaDragKind } from './mediaDrag'
import { findObject } from './bridges'
import { Divider, Icon, IconBtn, Kbd, MenuItem, Overline, Surface, TextBtn, TL } from './ui'

type AnyObj = any

const LS_SNAP = 'mfa-timeline-snap'
const LS_ZOOM = 'mfa-timeline-pps'
const NEW_OVERLAY = '__new-overlay'
const NEW_AUDIO = '__new-audio'

export const ASPECTS = [
  { id: '16:9', label: '16:9 Landscape', width: 1920, height: 1080 },
  { id: '9:16', label: '9:16 Story', width: 1080, height: 1920 },
  { id: '1:1', label: '1:1 Square', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5 Portrait', width: 1080, height: 1350 },
]

type RowKind = 'overlay' | 'video' | 'audio' | 'loose' | 'loose-head' | 'new-overlay' | 'new-audio'

interface Row {
  key: string
  kind: RowKind
  track?: Track
  clips: Clip[]
  height: number
  label: string
  objectId?: string
}

const looseId = (objectId: string) => `loose:${objectId}`
const elementClipId = (objectId: string) => `el-${objectId}`

function buildRows(p: VideoProject, elements: ElementInfo[], looseOpen: boolean, duration: number): Row[] {
  const rows: Row[] = []
  const overlays = p.tracks.filter(t => t.kind === 'overlay')
  const audio = p.tracks.filter(t => t.kind === 'audio')
  if (!overlays.length) rows.push({ key: NEW_OVERLAY, kind: 'new-overlay', clips: [], height: TL.row.placeholder, label: 'Text & overlays' })
  overlays.forEach(t => rows.push({ key: t.id, kind: 'overlay', track: t, clips: trackClips(p, t.id), height: TL.row.overlay, label: t.name }))
  const timed = new Set(p.clips.map(c => c.objectId).filter(Boolean) as string[])
  const loose = elements.filter(e => !timed.has(e.id) && e.kind !== 'video')
  if (loose.length) {
    rows.push({ key: 'loose-head', kind: 'loose-head', clips: [], height: 24, label: `${loose.length} element${loose.length > 1 ? 's' : ''} on the whole video` })
    if (looseOpen) {
      loose.forEach(e =>
        rows.push({
          key: looseId(e.id),
          kind: 'loose',
          objectId: e.id,
          label: e.name,
          height: TL.row.loose,
          clips: [makeClip({ id: looseId(e.id), trackId: '', objectId: e.id, start: 0, duration: Math.max(1, duration) })],
        }),
      )
    }
  }
  p.tracks.filter(t => t.kind === 'video').forEach(t => rows.push({ key: t.id, kind: 'video', track: t, clips: trackClips(p, t.id), height: TL.row.video, label: t.name }))
  audio.forEach(t => rows.push({ key: t.id, kind: 'audio', track: t, clips: trackClips(p, t.id), height: TL.row.audio, label: t.name }))
  if (!audio.length) rows.push({ key: NEW_AUDIO, kind: 'new-audio', clips: [], height: TL.row.placeholder, label: 'Music & sound' })
  return rows
}

interface Gesture {
  zone: ClipZone
  clipId: string
  ids: string[]
  pointerId: number
  x0: number
  y0: number
  scroll0: number
  base: VideoProject
  prefix?: Command
  moved: boolean
  cmd: Command | null
  additive: boolean
}

interface Preview {
  project: VideoProject
  snapAt: number | null
  insert: { rowKey: string; t: number } | null
}

interface DropHint {
  rowKey: string
  t: number
  duration: number
  label: string
  magnetic: boolean
}

export interface TimelineProps {
  height: number
  elements: ElementInfo[]
  elementsById: Map<string, ElementInfo>
  elementsVersion: number
  onCollapse: () => void
  onResizeStart: (e: React.PointerEvent) => void
}

export default function Timeline({ height, elements, elementsById, elementsVersion, onCollapse, onResizeStart }: TimelineProps) {
  const api = useVideoProject()
  const { project, dispatch, controller, getProject, assetUrls, missingAssets, relinkAsset, setElementTiming } = api
  const playback = usePlayback()
  const { addClip, addAudioClip, setActiveClip } = useVideoContext()
  const editor = useEditor() as AnyObj
  const { canvas } = useEditorContext() as AnyObj

  // ---- view state -----------------------------------------------------------
  const [pps, setPpsState] = useState(() => clampPps(Number(localStorage.getItem(LS_ZOOM)) || DEFAULT_PPS))
  const ppsRef = useRef(pps)
  ppsRef.current = pps
  const [snapOn, setSnapOn] = useState(() => localStorage.getItem(LS_SNAP) !== '0')
  const snapOnRef = useRef(snapOn)
  snapOnRef.current = snapOn
  const [selection, setSelection] = useState<string[]>([])
  const selectionRef = useRef(selection)
  selectionRef.current = selection
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [looseOpen, setLooseOpen] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; clipId: string } | null>(null)
  const [joint, setJoint] = useState<{ x: number; y: number; clipId: string } | null>(null)
  const [drop, setDrop] = useState<DropHint | null>(null)
  const [viewportW, setViewportW] = useState(800)
  const [range, setRange] = useState<[number, number]>([0, 60])

  const rootRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const relinkInputRef = useRef<HTMLInputElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const focusedRef = useRef(false)

  const setPps = useCallback((next: number, anchorX?: number) => {
    const sc = scrollerRef.current
    const old = ppsRef.current
    const v = clampPps(next)
    if (v === old) return
    const ax = anchorX ?? (sc ? (sc.clientWidth - TL.headerW) / 2 : 0)
    ppsRef.current = v
    setPpsState(v)
    localStorage.setItem(LS_ZOOM, String(Math.round(v * 100) / 100))
    if (sc) {
      const left = scrollForZoom(sc.scrollLeft, ax, old, v)
      requestAnimationFrame(() => {
        sc.scrollLeft = left
      })
    }
  }, [])

  const view = preview?.project || project

  // ---- duration --------------------------------------------------------------
  const duration = useMemo(
    () => Math.max(api.getDuration(), projectDuration(project)),
    // elementsVersion: animation windows live on canvas objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, elementsVersion],
  )
  const durationRef = useRef(duration)
  durationRef.current = duration

  const rows = useMemo(() => buildRows(view, elements, looseOpen, duration), [view, elements, looseOpen, duration])
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const contentW = Math.max(viewportW - TL.headerW, (Math.max(duration, 10) + 5) * pps + 200)
  const rowsH = rows.reduce((h, r) => h + r.height, 0)

  // ---- viewport size / scroll window -----------------------------------------
  useLayoutEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const update = () => {
      setViewportW(sc.clientWidth)
      const r = quantizedRange(sc.scrollLeft, sc.clientWidth - TL.headerW, ppsRef.current)
      setRange(prev => (prev[0] === r[0] && prev[1] === r[1] ? prev : r))
    }
    update()
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        update()
      })
    }
    sc.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(onScroll)
    ro.observe(sc)
    return () => {
      sc.removeEventListener('scroll', onScroll)
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const r = quantizedRange(sc.scrollLeft, sc.clientWidth - TL.headerW, pps)
    setRange(prev => (prev[0] === r[0] && prev[1] === r[1] ? prev : r))
  }, [pps])

  // Fit once when opened with content and no remembered zoom.
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || !(duration > 0) || viewportW < 200) return
    fitted.current = true
    if (!localStorage.getItem(LS_ZOOM)) setPps(fitPps(duration, viewportW - TL.headerW))
  }, [duration, viewportW, setPps])

  // Ctrl/⌘+wheel zooms around the cursor (non-passive listener so the page doesn't zoom).
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const rect = sc.getBoundingClientRect()
      setPps(ppsRef.current * Math.exp(-e.deltaY * 0.002), Math.max(0, e.clientX - rect.left - TL.headerW))
    }
    sc.addEventListener('wheel', onWheel, { passive: false })
    return () => sc.removeEventListener('wheel', onWheel)
  }, [setPps])

  // ---- playhead: DOM writes only ---------------------------------------------
  useEffect(() => {
    const update = (t: number) => {
      const x = t * ppsRef.current
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${x}px)`
      if (headRef.current) headRef.current.style.transform = `translateX(${x}px)`
      if (timeRef.current) timeRef.current.textContent = formatTimecode(t)
      const sc = scrollerRef.current
      if (sc && (controller.playing || controller.rate !== 0)) {
        const next = followScroll(x, sc.scrollLeft, sc.clientWidth - TL.headerW)
        if (next !== null) sc.scrollLeft = next
      }
    }
    update(controller.time)
    return controller.subscribe(s => update(s.time))
  }, [controller, pps])

  // ---- selection -------------------------------------------------------------
  // Drop selected ids that no longer exist (undo, delete).
  useEffect(() => {
    setSelection(sel => {
      const next = sel.filter(id => findClip(project, id))
      return next.length === sel.length ? sel : next
    })
  }, [project])

  const selectCanvasFor = useCallback(
    (clipId: string) => {
      const c = findClip(getProject(), clipId)
      const obj = findObject(canvas, c?.objectId)
      if (!obj || !canvas) return
      try {
        canvas.setActiveObject(obj)
        canvas.requestRenderAll()
      } catch (err) {
        ignoreError(err, 'object not selectable right now (locked / mid-transform)')
      }
    },
    [canvas, getProject],
  )

  const select = useCallback(
    (ids: string[], focusCanvas = true) => {
      setSelection(ids)
      setInspectorOpen(true)
      if (ids.length === 1) {
        setActiveClip(ids[0])
        if (focusCanvas) selectCanvasFor(ids[0])
      }
    },
    [selectCanvasFor, setActiveClip],
  )

  // ---- commands --------------------------------------------------------------
  const removeOrphanObjects = useCallback(
    (removed: Clip[]) => {
      if (!canvas) return
      const p = getProject()
      const still = new Set(p.clips.map(c => c.objectId).filter(Boolean) as string[])
      const gone = removed.filter(c => c.objectId && !still.has(c.objectId)).map(c => findObject(canvas, c.objectId)).filter(Boolean)
      if (!gone.length) return
      gone.forEach(o => canvas.remove(o))
      canvas.discardActiveObject?.()
      canvas.requestRenderAll?.()
      try {
        editor?.handlers?.historyHandler?.save('object:removed')
      } catch (err) {
        log.warn('timeline', 'canvas history snapshot failed after removing clip objects', err)
      }
    },
    [canvas, editor, getProject],
  )

  const runDelete = useCallback(
    (ids: string[], ripple: boolean) => {
      const p = getProject()
      const cmd = deleteCommand(p, ids, ripple)
      if (!cmd) return
      const removed = ids.map(id => findClip(p, id)).filter(Boolean) as Clip[]
      const run = () => {
        dispatch(cmd)
        removeOrphanObjects(removed)
      }
      // Removing the clip and its page object is one action → one undo.
      const journal = (editor as any)?.__undoBridge
      if (journal?.group) journal.group(run)
      else run()
      setSelection([])
    },
    [dispatch, getProject, removeOrphanObjects, editor],
  )

  const runSplit = useCallback(
    (ids: string[]) => {
      const r = splitCommand(getProject(), ids, controller.time)
      if (!r) {
        notify('Move the playhead over a clip to split it.', 'info')
        return
      }
      dispatch(r.command)
      setSelection(r.rightIds)
    },
    [controller, dispatch, getProject],
  )

  const runDuplicate = useCallback(
    (ids: string[]) => {
      const r = duplicateCommand(getProject(), ids)
      if (!r) return
      dispatch(r.command)
      setSelection(r.newIds)
    },
    [dispatch, getProject],
  )

  const runDetach = useCallback(
    (clipId: string) => {
      const r = detachAudioCommand(getProject(), clipId)
      if (!r) return
      dispatch(r.command)
      setSelection([r.audioClipId])
    },
    [dispatch, getProject],
  )

  const runWholeVideo = useCallback(
    (clipId: string) => {
      const p = getProject()
      const c = findClip(p, clipId)
      if (!c?.objectId) return
      const others = p.clips.filter(x => x.objectId === c.objectId && x.id !== c.id && !x.assetId)
      const total = Math.max(1, durationRef.current)
      dispatch({
        type: 'batch',
        commands: [
          ...others.map(o => ({ type: 'removeClip' as const, clipId: o.id })),
          { type: 'placeElement', clip: { ...c, start: 0, inPoint: 0, outPoint: total * c.speed }, preferTrackId: c.trackId },
        ],
      })
    },
    [dispatch, getProject],
  )

  /** Inspector / menu edits: setClipProps, with magnetic re-pack where it changes length. */
  const dispatchProps = useCallback(
    (cmd: Command) => {
      const next = cmd.type === 'setClipProps' ? propsCommand(getProject(), cmd.clipId, cmd.patch) : cmd
      if (next) dispatch(next)
    },
    [dispatch, getProject],
  )

  const addMarker = useCallback(() => {
    dispatch({ type: 'addMarker', marker: { id: makeId('marker'), time: controller.time } })
  }, [controller, dispatch])

  // ---- adding media ----------------------------------------------------------
  /** After an add flow placed a clip, move it onto the requested track (second step, own undo). */
  const moveToTrack = useCallback(
    (clipId: string | void, trackId?: string) => {
      if (!clipId || !trackId) return
      let p = getProject()
      const c = findClip(p, clipId)
      if (!c || c.trackId === trackId) return
      const pre: Command[] = []
      let target = trackId
      if (trackId === NEW_OVERLAY || trackId === NEW_AUDIO) {
        const kind = trackId === NEW_AUDIO ? 'audio' : 'overlay'
        target = makeId(`track-${kind}`)
        const add: Command = { type: 'addTrack', track: { id: target, kind, name: kind === 'audio' ? 'Audio' : 'Overlay' }, ...(kind === 'overlay' ? { index: 0 } : {}) }
        pre.push(add)
        p = applyCommand(p, add).project
      }
      if (!canPlace(p, c, findTrack(p, target))) return
      const move = moveCommand(p, { primaryId: clipId, ids: [clipId], delta: 0, targetTrackId: target })
      if (move) dispatch(pre.length ? { type: 'batch', commands: [...pre, move] } : move)
    },
    [dispatch, getProject],
  )

  const addImageAt = useCallback(
    async (file: File, start: number) => {
      if (!editor) return
      const src = await fileToDataUrl(file)
      const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.width, h: img.height })
        img.onerror = () => reject(new Error('image decode failed'))
        img.src = src
      })
      const frame = frameSizeOf(canvas)
      const k = Math.min(1, (frame.width * 0.8) / size.w, (frame.height * 0.6) / size.h)
      const added = nextAddedObject(canvas)
      await editor.add({
        type: 'StaticImage',
        metadata: { src, name: file.name, id: makeId('image') },
        width: size.w,
        height: size.h,
        left: (frame.width - size.w * k) / 2,
        top: (frame.height - size.h * k) / 2,
        scaleX: k,
        scaleY: k,
        opacity: 1,
      })
      const id = await added
      if (id) setElementTiming(id, start, 5)
    },
    [canvas, editor, setElementTiming],
  )

  const importFile = useCallback(
    async (file: File, at: { start?: number; trackId?: string } = {}) => {
      try {
        if (file.type.startsWith('video/')) {
          if (!editor) return
          const id = await addVideoFile(editor, file, addClip, { frame: frameSizeOf(canvas), start: at.start })
          setActiveClip(id)
          moveToTrack(id, at.trackId)
        } else if (file.type.startsWith('audio/')) {
          const id = await addAudioFile(file, addAudioClip, at.start ?? controller.time)
          moveToTrack(id, at.trackId)
        } else if (file.type.startsWith('image/')) {
          await addImageAt(file, at.start ?? controller.time)
        } else {
          notify('That file type can’t go on the timeline.', 'warning')
        }
      } catch (err) {
        fail('timeline', `Could not add “${file.name}”.`, err)
      }
    },
    [addAudioClip, addClip, addImageAt, canvas, controller, editor, moveToTrack, setActiveClip],
  )

  const addText = useCallback(async () => {
    if (!editor || !canvas) return
    const start = controller.time
    const added = nextAddedObject(canvas)
    addObjectToCanvas(
      editor,
      { type: 'StaticText', width: 480, metadata: { text: 'Your title', fontSize: 64, fontWeight: 700, fontFamily: 'Poppins', textAlign: 'center', fill: '#181410' } },
      480,
      canvas,
    )
    const id = await added
    if (id) setElementTiming(id, start, 3)
  }, [canvas, controller, editor, setElementTiming])

  // ---- geometry helpers --------------------------------------------------------
  const laneLeft = () => (contentRef.current?.getBoundingClientRect().left ?? 0) + TL.headerW
  const timeAtClientX = (clientX: number) => Math.max(0, (clientX - laneLeft()) / ppsRef.current)
  const rowAtPoint = (clientX: number, clientY: number): Row | undefined => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const key = el?.closest('[data-row]')?.getAttribute('data-row')
    return key ? rowsRef.current.find(r => r.key === key) : undefined
  }
  const trackIdForRow = (row: Row | undefined): string | undefined =>
    row?.track?.id ?? (row?.kind === 'new-overlay' ? NEW_OVERLAY : row?.kind === 'new-audio' ? NEW_AUDIO : undefined)

  // ---- clip gestures ---------------------------------------------------------
  const onClipPointerDown = useCallback(
    (e: React.PointerEvent, clipId: string, zone: ClipZone) => {
      if (e.button !== 0) return
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).focus?.({ preventScroll: true } as any)
      let base = getProject()
      let prefix: Command | undefined
      let id = clipId
      if (clipId.startsWith('loose:')) {
        // A whole-video element: dragging it gives it a clip (same undo step as the drag).
        const objectId = clipId.slice('loose:'.length)
        id = elementClipId(objectId)
        prefix = { type: 'placeElement', clip: makeClip({ id, trackId: '', objectId, start: 0, duration: Math.max(1, durationRef.current) }) }
        base = applyCommand(base, prefix).project
      }
      const clip = findClip(base, id)
      if (!clip) return
      if (findTrack(base, clip.trackId)?.locked) {
        select([id])
        return
      }
      const additive = e.shiftKey || e.metaKey || e.ctrlKey
      const sel = selectionRef.current
      const ids = zone === 'body' && sel.includes(id) && sel.length > 1 ? sel : [id]
      gestureRef.current = {
        zone,
        clipId: id,
        ids,
        pointerId: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        scroll0: scrollerRef.current?.scrollLeft || 0,
        base,
        prefix,
        moved: false,
        cmd: null,
        additive,
      }
      if (zone !== 'body' && !sel.includes(id)) select([id])
    },
    [getProject, select],
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const g = gestureRef.current
      if (!g || e.pointerId !== g.pointerId) return
      const sc = scrollerRef.current
      const scrollDx = (sc?.scrollLeft || 0) - g.scroll0
      const dxPx = e.clientX - g.x0 + scrollDx
      if (!g.moved && Math.abs(dxPx) < 3 && Math.abs(e.clientY - g.y0) < 3) return
      g.moved = true
      const pps = ppsRef.current
      const dt = dxPx / pps
      const c = findClip(g.base, g.clipId)
      if (!c) return
      const targets = snapTargets(g.base, { exclude: g.ids, playhead: controller.time })
      let cmd: Command | null = null
      let snapAt: number | null = null
      let insert: Preview['insert'] = null
      const bypass = e.altKey

      if (g.zone === 'body') {
        const row = rowAtPoint(e.clientX, e.clientY)
        let targetId = trackIdForRow(row) || c.trackId
        let base = g.base
        const pre: Command[] = []
        if (targetId === NEW_OVERLAY || targetId === NEW_AUDIO) {
          const kind = targetId === NEW_AUDIO ? 'audio' : 'overlay'
          const add: Command = { type: 'addTrack', track: { id: `track-${kind}-new`, kind, name: kind === 'audio' ? 'Audio' : 'Overlay' }, ...(kind === 'overlay' ? { index: 0 } : {}) }
          base = applyCommand(base, add).project
          if (canPlace(base, c, findTrack(base, `track-${kind}-new`))) {
            pre.push(add)
            targetId = `track-${kind}-new`
          } else {
            base = g.base
            targetId = c.trackId
          }
        }
        const target = findTrack(base, targetId)
        if (target && isMainTrack(target) && canPlace(base, c, target)) {
          const others = trackClips(base, target.id).filter(o => o.id !== c.id)
          const spans = others.map(o => ({ id: o.id, start: o.start, end: clipEnd(o) }))
          const idx = magneticInsertIndex(spans, timeAtClientX(e.clientX))
          cmd = moveCommand(base, { primaryId: c.id, ids: [c.id], delta: 0, targetTrackId: target.id, insertIndex: idx })
          insert = { rowKey: target.id, t: boundaryTime(spans, idx) }
        } else {
          const s = resolveSnap({ edges: [c.start + dt, clipEnd(c) + dt], targets, pps, enabled: snapOnRef.current, bypass })
          const delta = Math.max(-c.start, dt + s.delta)
          snapAt = s.at
          cmd = moveCommand(base, { primaryId: c.id, ids: g.ids, delta, targetTrackId: targetId })
        }
        if (cmd && pre.length) cmd = { type: 'batch', commands: [...pre, cmd] }
      } else if (g.zone === 'trim-start' || g.zone === 'trim-end') {
        const edge = g.zone === 'trim-start' ? 'start' : 'end'
        const raw = (edge === 'start' ? c.start : clipEnd(c)) + dt
        const s = resolveSnap({ edges: [raw], targets, pps, enabled: snapOnRef.current, bypass })
        snapAt = s.at
        cmd = trimCommand(g.base, c.id, edge, Math.max(0, raw + s.delta))
      } else {
        const d = clipDuration(c)
        const v = g.zone === 'fade-in' ? Math.min(d, Math.max(0, c.fadeIn + dt)) : Math.min(d, Math.max(0, c.fadeOut - dt))
        cmd = { type: 'setClipProps', clipId: c.id, patch: g.zone === 'fade-in' ? { fadeIn: v } : { fadeOut: v } }
      }

      g.cmd = cmd
      const next = cmd ? applyCommand(g.base, cmd).project : g.base
      setPreview({ project: next, snapAt, insert })

      // Edge auto-scroll while dragging.
      if (sc) {
        const r = sc.getBoundingClientRect()
        if (e.clientX > r.right - 32) sc.scrollLeft += 12
        else if (e.clientX < r.left + TL.headerW + 24) sc.scrollLeft -= 12
      }
    }
    const onUp = (e: PointerEvent) => {
      const g = gestureRef.current
      if (!g || e.pointerId !== g.pointerId) return
      gestureRef.current = null
      setPreview(null)
      if (!g.moved) {
        if (g.zone === 'body') {
          const sel = selectionRef.current
          if (g.prefix) {
            // Clicking a whole-video element selects it on the page (no clip yet).
            setSelection([])
            const obj = findObject(canvas, findClip(g.base, g.clipId)?.objectId)
            if (obj && canvas) {
              canvas.setActiveObject(obj)
              canvas.requestRenderAll()
            }
          } else if (g.additive) select(sel.includes(g.clipId) ? sel.filter(x => x !== g.clipId) : [...sel, g.clipId], false)
          else select([g.clipId])
        }
        return
      }
      if (!g.cmd) return
      dispatch(g.prefix ? { type: 'batch', commands: [g.prefix, g.cmd] } : g.cmd)
      if (g.prefix) setSelection([g.clipId])
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, controller, dispatch, select])

  const onClipContextMenu = useCallback(
    (e: React.MouseEvent, clipId: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (clipId.startsWith('loose:')) return
      if (!selectionRef.current.includes(clipId)) select([clipId])
      // Keyboard context-menu key / Shift+F10 reports no pointer position: anchor to the clip.
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX || r.left + 8
      const y = e.clientY || r.bottom
      setMenu({ x: Math.min(x, window.innerWidth - 240), y: Math.min(y, window.innerHeight - 380), clipId })
    },
    [select],
  )

  const onFocusClip = useCallback(
    (clipId: string, activate?: boolean) => {
      focusedRef.current = true
      if (activate && !clipId.startsWith('loose:')) select([clipId])
    },
    [select],
  )

  // ---- ruler scrubbing -------------------------------------------------------
  const onScrub = useCallback(
    (t: number, phase: 'start' | 'move' | 'end') => {
      const v = Math.min(t, durationRef.current)
      if (phase === 'end') {
        controller.scrub(v)
        controller.endScrub()
      } else controller.scrub(v)
    },
    [controller],
  )
  const onMarkerClick = useCallback((m: { time: number }) => controller.seek(m.time), [controller])
  const onMarkerRemove = useCallback((m: { id: string }) => dispatch({ type: 'removeMarker', markerId: m.id }), [dispatch])

  // ---- keyboard ----------------------------------------------------------------
  const runAction = useCallback(
    (a: TimelineAction) => {
      const sel = selectionRef.current
      switch (a.type) {
        case 'shuttle':
          controller.shuttle(nextShuttleRate(controller.rate, a.key))
          break
        case 'togglePlay':
          controller.toggle()
          break
        case 'step':
          controller.seek(frameStep(controller.time, a.frames, getProject().fps))
          break
        case 'stepSeconds':
          controller.seek(controller.time + a.seconds)
          break
        case 'home':
          controller.seek(0)
          break
        case 'end':
          controller.seek(durationRef.current)
          break
        case 'split':
          runSplit(sel)
          break
        case 'delete':
          if (sel.length) runDelete(sel, a.ripple)
          break
        case 'duplicate':
          if (sel.length) runDuplicate(sel)
          break
        case 'zoom':
          setPps(stepZoom(ppsRef.current, a.dir))
          break
        case 'marker':
          addMarker()
          break
        case 'deselect':
          setSelection([])
          setMenu(null)
          setJoint(null)
          break
        case 'focusClip': {
          const order = clipTraversal(getProject(), rowsRef.current.filter(r => r.track).map(r => r.track!.id))
          if (!order.length) break
          const cur = sel.length ? order.indexOf(sel[sel.length - 1]) : -1
          const next = order[Math.max(0, Math.min(order.length - 1, cur + a.dir))]
          select([next])
          const c = findClip(getProject(), next)
          const sc = scrollerRef.current
          if (c && sc) {
            const x = c.start * ppsRef.current
            if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - TL.headerW - 40) sc.scrollLeft = Math.max(0, x - 80)
          }
          requestAnimationFrame(() => (rootRef.current?.querySelector(`[data-clip-id="${CSS.escape(next)}"]`) as HTMLElement | null)?.focus())
          break
        }
      }
    },
    [addMarker, controller, getProject, runDelete, runDuplicate, runSplit, select, setPps],
  )

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      focusedRef.current = !!rootRef.current?.contains(e.target as Node)
    }
    const onFocusIn = (e: FocusEvent) => {
      if (rootRef.current?.contains(e.target as Node)) focusedRef.current = true
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const target = (e.target as HTMLElement) || null
      // Arrow keys on a focused slider belong to the slider.
      if (target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range' && e.key.startsWith('Arrow')) return
      if (target?.closest?.('[role="menu"]')) return
      const typing = isTypingTarget(document.activeElement) || isTypingTarget(target) || !!canvas?.getActiveObject?.()?.isEditing
      const action = resolveTimelineKey(e, {
        timelineFocused: focusedRef.current,
        hasTimeline: true,
        typing,
        stageOwnsSpace: !!editor?.__stageViewport,
      })
      if (!action) return
      // Nothing selected on the timeline: Delete / ⌘D stay with the canvas selection.
      if ((action.type === 'delete' || action.type === 'duplicate') && !selectionRef.current.length) return
      e.preventDefault()
      e.stopPropagation()
      runAction(action)
    }
    window.addEventListener('pointerdown', onDown, true)
    document.addEventListener('focusin', onFocusIn)
    // Capture on window runs before the canvas shortcuts (document capture), so
    // Delete/⌘D on a focused timeline act on clips, not on the selected object.
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [canvas, editor, runAction])

  // Canvas selection → timeline selection (clicking an element on the page highlights its clip).
  useEffect(() => {
    if (!canvas?.on) return
    const onSel = () => {
      if (gestureRef.current) return
      const obj = canvas.getActiveObject?.()
      if (!obj) return
      const ids = getProject()
        .clips.filter(c => c.objectId && (c.objectId === obj.id || c.objectId === obj.metadata?.id))
        .map(c => c.id)
      if (!ids.length) return
      setSelection(sel => (ids.some(id => sel.includes(id)) ? sel : [ids[0]]))
    }
    canvas.on('selection:created', onSel)
    canvas.on('selection:updated', onSel)
    return () => {
      canvas.off?.('selection:created', onSel)
      canvas.off?.('selection:updated', onSel)
    }
  }, [canvas, getProject])

  // ---- drag & drop from panels / OS ----------------------------------------------
  const dropTarget = (e: React.DragEvent): DropHint | null => {
    const kind = dragKind(e)
    if (!kind) return null
    const payload = activeMediaDrag()
    let mediaKind: MediaDragKind | undefined = payload?.kind
    if (!mediaKind) {
      const item = Array.from(e.dataTransfer.items || []).find(i => i.kind === 'file')
      const t = item?.type || ''
      mediaKind = t.startsWith('audio/') ? 'audio' : t.startsWith('image/') ? 'image' : 'video'
    }
    const row = rowAtPoint(e.clientX, e.clientY)
    const p = getProject()
    const t = timeAtClientX(e.clientX)
    const dur = payload?.duration || (mediaKind === 'image' ? 5 : 5)
    const label = payload?.label || 'Drop to add'
    if (mediaKind === 'audio') {
      const key = row && (row.kind === 'audio' || row.kind === 'new-audio') ? row.key : rowsRef.current.find(r => r.kind === 'audio' || r.kind === 'new-audio')?.key
      return key ? { rowKey: key, t, duration: dur, label, magnetic: false } : null
    }
    if (mediaKind === 'image' || (row && (row.kind === 'overlay' || row.kind === 'new-overlay') && mediaKind === 'video')) {
      const key = row && (row.kind === 'overlay' || row.kind === 'new-overlay') ? row.key : rowsRef.current.find(r => r.kind === 'overlay' || r.kind === 'new-overlay')?.key
      if (key) {
        const s = resolveSnap({ edges: [t], targets: snapTargets(p, { playhead: controller.time }), pps: ppsRef.current, enabled: snapOnRef.current, bypass: e.altKey })
        return { rowKey: key, t: Math.max(0, t + s.delta), duration: dur, label, magnetic: false }
      }
    }
    const main = p.tracks.find(tr => tr.kind === 'video')
    if (!main) return null
    const spans = trackClips(p, main.id).map(c => ({ id: c.id, start: c.start, end: clipEnd(c) }))
    const idx = magneticInsertIndex(spans, t)
    return { rowKey: main.id, t: spans.length ? boundaryTime(spans, idx) : 0, duration: dur, label, magnetic: true }
  }

  const onDragOver = (e: React.DragEvent) => {
    const hint = dropTarget(e)
    if (!hint) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDrop(prev => (prev && prev.rowKey === hint.rowKey && Math.abs(prev.t - hint.t) < 1 / ppsRef.current ? prev : hint))
  }

  const onDrop = (e: React.DragEvent) => {
    const hint = dropTarget(e)
    setDrop(null)
    if (!hint) return
    e.preventDefault()
    const trackId = hint.magnetic ? undefined : hint.rowKey
    const payload = activeMediaDrag()
    if (payload) {
      payload
        .insert({ start: hint.t, trackId })
        .then(id => {
          if (payload.kind !== 'image') moveToTrack(id, trackId)
        })
        .catch(err => fail('timeline', `Could not add “${payload.label}”.`, err))
      return
    }
    Array.from(e.dataTransfer.files || []).forEach(f => importFile(f, { start: hint.t, trackId }))
  }

  // ---- track header actions ------------------------------------------------------
  const toggleTrack = (t: Track, key: 'hidden' | 'muted' | 'locked') => dispatch({ type: 'updateTrack', trackId: t.id, patch: { [key]: !t[key] } })

  // ---- render ----------------------------------------------------------------
  const selected = selection.length === 1 ? findClip(project, selection[0]) : undefined
  const selectedKind = selected ? (clipKind(project, selected) === 'element' ? (elementsById.get(selected.objectId || '')?.kind === 'text' ? 'text' : 'element') : clipKind(project, selected)) : undefined
  const mainId = project.tracks.find(t => t.kind === 'video')?.id
  const hasPredecessor = !!selected && selected.trackId === mainId && trackClips(project, selected.trackId).some(c => Math.abs(clipEnd(c) - selected.start) < 1 / 30 && c.id !== selected.id)
  const frame = frameSizeOf(canvas)
  const aspectId = ASPECTS.find(a => Math.abs(a.width / a.height - frame.width / frame.height) < 0.01)?.id || 'custom'
  const rangePx: [number, number] = [range[0] * pps, range[1] * pps]

  const labelFor = (c: Clip): string => {
    const a = findAsset(view, c.assetId)
    if (c.name) return c.name
    if (a) return a.name
    return elementsById.get(c.objectId || '')?.name || 'Element'
  }
  const kindFor = (c: Clip) => {
    const k = clipKind(view, c)
    if (k !== 'element') return k
    const ek = elementsById.get(c.objectId || '')?.kind
    return ek === 'text' ? 'text' : ek === 'image' ? 'image' : 'element'
  }

  let top = TL.rulerH
  const rowTops = new Map<string, number>()
  rows.forEach(r => {
    rowTops.set(r.key, top)
    top += r.height
  })

  const tabbableId = selection[selection.length - 1] || rows.find(r => r.clips.length && r.track)?.clips[0]?.id

  return (
    <div
      ref={rootRef}
      className="mfa-timeline"
      role="region"
      aria-label="Video timeline"
      style={{ position: 'relative', flex: 'none', height, display: 'flex', flexDirection: 'column', backgroundColor: color.white, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: color.ink, fontFamily: font.sans, color: color.ink, overflow: 'hidden', zIndex: 12 }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize timeline"
        title="Drag to resize the timeline"
        onPointerDown={onResizeStart}
        style={{ position: 'absolute', top: -4, left: 0, right: 0, height: 8, cursor: 'row-resize', zIndex: 20 }}
      />

      {/* ---------------- header ---------------- */}
      <div role="toolbar" aria-label="Timeline controls" style={{ height: TL.barH, flex: 'none', display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 8, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: color.line, backgroundColor: color.surface, overflowX: 'auto', overflowY: 'hidden' }}>
        <IconBtn aria-label="Previous frame (←)" title="Previous frame (←)" onClick={() => runAction({ type: 'step', frames: -1 })}>
          <Icon.StepBack size={14} />
        </IconBtn>
        <button
          type="button"
          aria-label={playback.playing ? 'Pause (Space)' : 'Play (Space)'}
          title={playback.playing ? 'Pause (Space)' : 'Play (Space)'}
          onClick={() => controller.toggle()}
          className="mfa-tl-play"
          style={{ width: 36, height: 36, flex: 'none', borderRadius: 18, borderWidth: 1, borderStyle: 'solid', borderColor: color.ink, backgroundColor: playback.playing || playback.rate ? color.ink : color.accent, color: color.white, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '2px 2px 0 #181410' }}
        >
          {playback.playing || playback.rate ? <Icon.Pause size={14} /> : <Icon.Play size={14} />}
        </button>
        <IconBtn aria-label="Next frame (→)" title="Next frame (→)" onClick={() => runAction({ type: 'step', frames: 1 })}>
          <Icon.StepFwd size={14} />
        </IconBtn>
        <div aria-live="off" style={{ fontFamily: font.mono, fontSize: 13, whiteSpace: 'nowrap', paddingLeft: 6, paddingRight: 6, flex: 'none' }}>
          <span ref={timeRef}>{formatTimecode(controller.time)}</span>
          <span style={{ color: color.faint }}> / {formatTimecode(duration)}</span>
          {playback.rate !== 0 && playback.rate !== 1 && <span style={{ color: color.accent, marginLeft: 6 }}>{playback.rate}×</span>}
        </div>
        <Divider />
        <IconBtn aria-label="Split at playhead (S)" title="Split at playhead (S)" onClick={() => runSplit(selection)}>
          <Icon.Split size={15} />
        </IconBtn>
        <IconBtn aria-label="Delete selected clips (Delete)" title="Delete (Del) · Ripple delete (⇧Del)" disabled={!selection.length} onClick={() => runDelete(selection, false)}>
          <Icon.Trash size={15} />
        </IconBtn>
        <IconBtn aria-label="Undo" title="Undo (⌘Z)" onClick={() => (editor?.undo ? editor.undo() : api.undo())}>
          <Icon.Undo size={15} />
        </IconBtn>
        <IconBtn aria-label="Redo" title="Redo (⇧⌘Z)" onClick={() => (editor?.redo ? editor.redo() : api.redo())}>
          <Icon.Redo size={15} />
        </IconBtn>
        <IconBtn
          aria-label="Snapping"
          aria-pressed={snapOn}
          $active={snapOn}
          title={snapOn ? 'Snapping on (hold Alt to bypass)' : 'Snapping off'}
          onClick={() => {
            localStorage.setItem(LS_SNAP, snapOn ? '0' : '1')
            setSnapOn(!snapOn)
          }}
        >
          <Icon.Magnet size={15} />
        </IconBtn>
        <IconBtn aria-label="Add marker at playhead (M)" title="Add marker (M)" onClick={addMarker}>
          <Icon.Marker size={14} />
        </IconBtn>
        <Divider />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 'none' }} title="Video size (re-flows the page with Magic Resize)">
          <select
            value={aspectId}
            aria-label="Aspect ratio"
            onChange={e => {
              const a = ASPECTS.find(x => x.id === e.target.value)
              if (!a || !editor) return
              try {
                resizeDesign(editor, { width: a.width, height: a.height })
              } catch (err) {
                fail('timeline', 'Could not resize the design.', err)
              }
            }}
            style={{ height: 30, borderWidth: 1, borderStyle: 'solid', borderColor: color.line2, borderRadius: 6, backgroundColor: color.white, fontFamily: font.mono, fontSize: 12, color: color.ink, paddingLeft: 6, paddingRight: 6 }}
          >
            {aspectId === 'custom' && <option value="custom">Custom</option>}
            {ASPECTS.map(a => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <Divider />
        <IconBtn aria-label="Zoom out (−)" title="Zoom out (−)" onClick={() => setPps(stepZoom(pps, -1))}>
          <Icon.ZoomOut size={15} />
        </IconBtn>
        <input
          type="range"
          aria-label="Timeline zoom"
          min={0}
          max={1}
          step={0.01}
          value={ppsToSlider(pps)}
          onChange={e => setPps(sliderToPps(Number(e.target.value)))}
          style={{ width: 90, flex: 'none', accentColor: color.accent }}
        />
        <IconBtn aria-label="Zoom in (+)" title="Zoom in (+)" onClick={() => setPps(stepZoom(pps, 1))}>
          <Icon.ZoomIn size={15} />
        </IconBtn>
        <IconBtn
          aria-label="Fit timeline"
          title="Fit timeline"
          onClick={() => {
            setPps(fitPps(duration, viewportW - TL.headerW))
            requestAnimationFrame(() => scrollerRef.current && (scrollerRef.current.scrollLeft = 0))
          }}
        >
          <Icon.Fit size={15} />
        </IconBtn>
        <div style={{ flex: 1, minWidth: 8 }} />
        {missingAssets.length > 0 && (
          <TextBtn onClick={() => relinkInputRef.current?.click()} title={`Media missing on this device: ${missingAssets.map(a => a.name).join(', ')}`}>
            Relink “{missingAssets[0].name}”{missingAssets.length > 1 ? ` +${missingAssets.length - 1}` : ''}
          </TextBtn>
        )}
        <TextBtn onClick={() => mediaInputRef.current?.click()} title="Add video, image or audio from your device">
          <Icon.Plus size={13} /> Media
        </TextBtn>
        <TextBtn onClick={() => audioInputRef.current?.click()} title="Add music or sound at the playhead">
          <Icon.Plus size={13} /> Audio
        </TextBtn>
        <TextBtn onClick={addText} title="Add a title at the playhead">
          <Icon.Plus size={13} /> Text
        </TextBtn>
        <IconBtn aria-label="Collapse timeline" title="Collapse timeline" onClick={onCollapse}>
          <Icon.Chevron dir="down" size={16} />
        </IconBtn>
        <input
          ref={mediaInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          multiple
          hidden
          onChange={e => {
            Array.from(e.target.files || []).forEach(f => importFile(f, f.type.startsWith('video/') ? {} : { start: controller.time }))
            e.target.value = ''
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) importFile(f, { start: controller.time })
            e.target.value = ''
          }}
        />
        <input
          ref={relinkInputRef}
          type="file"
          accept={missingAssets[0]?.kind === 'audio' ? 'audio/*' : 'video/*'}
          hidden
          onChange={e => {
            const f = e.target.files?.[0]
            const target = missingAssets[0]
            if (f && target) {
              relinkAsset(target.id, f)
                .then(() => notify(`Relinked “${target.name}”.`, 'positive'))
                .catch(err => fail('timeline', 'Could not use that file.', err))
            }
            e.target.value = ''
          }}
        />
      </div>

      {/* ---------------- body ---------------- */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div ref={scrollerRef} style={{ flex: 1, minWidth: 0, overflow: 'auto', position: 'relative' }} onDragOver={onDragOver} onDragLeave={e => !e.currentTarget.contains(e.relatedTarget as Node) && setDrop(null)} onDrop={onDrop}>
          <div ref={contentRef} style={{ position: 'relative', width: TL.headerW + contentW, minHeight: '100%', height: TL.rulerH + rowsH }}>
            {/* ruler row */}
            <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', height: TL.rulerH, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: color.line, backgroundColor: color.surface }}>
              <div style={{ position: 'sticky', left: 0, zIndex: 7, width: TL.headerW, flex: 'none', backgroundColor: color.surface, borderRightWidth: 1, borderRightStyle: 'solid', borderRightColor: color.line, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                <Overline>Tracks</Overline>
              </div>
              <div style={{ position: 'relative' }}>
                <Ruler pps={pps} width={contentW} height={TL.rulerH - 1} from={range[0]} to={range[1]} markers={view.markers || []} onScrub={onScrub} onMarkerClick={onMarkerClick} onMarkerRemove={onMarkerRemove} />
                <div ref={headRef} aria-hidden style={{ position: 'absolute', left: -6, top: 0, width: 12, height: TL.rulerH - 1, pointerEvents: 'none', willChange: 'transform' }}>
                  <div style={{ width: 12, height: 14, backgroundColor: color.accent, clipPath: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)' }} />
                </div>
              </div>
            </div>

            {/* rows */}
            {rows.map(row => (
              <div key={row.key} style={{ display: 'flex', height: row.height, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: color.line, boxSizing: 'border-box' }}>
                <TrackHeader row={row} looseOpen={looseOpen} onToggleLoose={() => setLooseOpen(o => !o)} onToggle={toggleTrack} />
                <div
                  data-row={row.key}
                  onPointerDown={e => {
                    if (e.target !== e.currentTarget || e.button !== 0) return
                    setSelection([])
                    controller.seek(Math.min(timeAtClientX(e.clientX), durationRef.current))
                  }}
                  style={{
                    position: 'relative',
                    width: contentW,
                    flex: 'none',
                    backgroundColor: row.kind === 'video' ? '#f7f3ea' : row.kind === 'loose' || row.kind === 'loose-head' ? color.surface : color.white,
                    opacity: row.track?.hidden ? 0.5 : 1,
                  }}
                >
                  {(row.kind === 'new-overlay' || row.kind === 'new-audio' || (row.kind !== 'loose-head' && !row.clips.length)) && (
                    <span style={{ position: 'sticky', left: 8, top: 0, display: 'inline-block', paddingLeft: 8, lineHeight: `${row.height - 1}px`, fontSize: 11, color: color.faint, pointerEvents: 'none' }}>
                      {row.kind === 'video' ? 'Drag videos here, or click + Media' : row.kind === 'new-audio' || row.kind === 'audio' ? 'Drop music or sound here' : 'Drop text, images or picture-in-picture here'}
                    </span>
                  )}
                  {row.clips.map(c => {
                    const x = c.start * pps
                    const w = clipDuration(c) * pps
                    if (x > rangePx[1] || x + w < rangePx[0]) return null
                    const asset = findAsset(view, c.assetId)
                    return (
                      <ClipView
                        key={c.id}
                        clip={c}
                        kind={kindFor(c)}
                        label={row.kind === 'loose' ? row.label : labelFor(c)}
                        x={x}
                        width={w}
                        height={row.height}
                        pps={pps}
                        selected={selection.includes(c.id)}
                        tabbable={c.id === tabbableId}
                        locked={!!row.track?.locked}
                        asset={asset}
                        url={asset ? assetUrls[asset.id] : undefined}
                        visStart={Math.max(0, rangePx[0] - x)}
                        visEnd={Math.min(w, rangePx[1] - x)}
                        loose={row.kind === 'loose'}
                        onPointerDown={onClipPointerDown}
                        onContextMenu={onClipContextMenu}
                        onFocusClip={onFocusClip}
                      />
                    )
                  })}
                  {row.kind === 'video' &&
                    row.clips.slice(1).map((c, i) => {
                      const prev = row.clips[i]
                      if (Math.abs(clipEnd(prev) - c.start) > 1 / 30) return null
                      const x = c.start * pps
                      if (x < rangePx[0] || x > rangePx[1]) return null
                      const on = !!c.transitionIn
                      return (
                        <button
                          key={`j-${c.id}`}
                          type="button"
                          aria-label={on ? `Transition: ${c.transitionIn!.type}. Edit` : 'Add transition'}
                          title={on ? `${c.transitionIn!.type} · ${c.transitionIn!.duration.toFixed(2)}s` : 'Add transition'}
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setJoint({ x: Math.min(r.left, window.innerWidth - 230), y: Math.max(8, r.top - 230), clipId: c.id })
                          }}
                          style={{
                            position: 'absolute',
                            // Sits on the top edge of the joint so the trim handles of
                            // both clips stay grabbable along most of their height.
                            left: x - 7,
                            top: -7,
                            width: 14,
                            height: 14,
                            padding: 0,
                            transform: 'rotate(45deg)',
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: color.ink,
                            backgroundColor: on ? color.accent : color.white,
                            color: on ? color.white : color.ink,
                            cursor: 'pointer',
                            zIndex: 3,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ transform: 'rotate(-45deg)', display: 'inline-flex' }}>{on ? null : <Icon.Plus size={10} />}</span>
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}

            {/* playhead */}
            <div
              ref={playheadRef}
              aria-hidden
              style={{ position: 'absolute', left: TL.headerW - 1, top: TL.rulerH, width: 2, height: rowsH, backgroundColor: color.accent, pointerEvents: 'none', zIndex: 4, willChange: 'transform' }}
            />
            {/* snap line */}
            {preview?.snapAt !== null && preview?.snapAt !== undefined && (
              <div aria-hidden style={{ position: 'absolute', left: TL.headerW + preview.snapAt * pps, top: 0, width: 0, height: TL.rulerH + rowsH, borderLeftWidth: 1, borderLeftStyle: 'dashed', borderLeftColor: color.accent, pointerEvents: 'none', zIndex: 8 }} />
            )}
            {/* magnetic insertion line */}
            {preview?.insert && rowTops.has(preview.insert.rowKey) && (
              <div aria-hidden style={{ position: 'absolute', left: TL.headerW + preview.insert.t * pps - 2, top: rowTops.get(preview.insert.rowKey), width: 4, height: TL.row.video, backgroundColor: color.ink, pointerEvents: 'none', zIndex: 8 }} />
            )}
            {/* drop ghost */}
            {drop && rowTops.has(drop.rowKey) && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: TL.headerW + drop.t * pps,
                  top: (rowTops.get(drop.rowKey) || 0) + 3,
                  width: Math.max(24, drop.duration * pps),
                  height: (rows.find(r => r.key === drop.rowKey)?.height || 36) - 6,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: color.accent,
                  backgroundColor: 'rgba(216,64,28,0.08)',
                  borderRadius: 4,
                  pointerEvents: 'none',
                  zIndex: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: color.accent,
                  paddingLeft: 6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {drop.magnetic && <span style={{ position: 'absolute', left: -3, top: -3, bottom: -3, width: 4, backgroundColor: color.ink }} />}
                {drop.label}
              </div>
            )}
          </div>
        </div>

        {selected && inspectorOpen && selectedKind && (
          <ClipInspector
            clip={selected}
            kind={selectedKind as any}
            label={labelFor(selected)}
            hasPredecessor={hasPredecessor}
            object={selectedKind !== 'video' && selectedKind !== 'audio' ? findObject(canvas, selected.objectId) : undefined}
            canvas={canvas}
            dispatch={dispatchProps}
            onSplit={() => runSplit([selected.id])}
            onDuplicate={() => runDuplicate([selected.id])}
            onDelete={() => runDelete([selected.id], false)}
            onDetachAudio={selectedKind === 'video' ? () => runDetach(selected.id) : undefined}
            onWholeVideo={selectedKind !== 'video' && selectedKind !== 'audio' && selected.objectId ? () => runWholeVideo(selected.id) : undefined}
            onClose={() => setInspectorOpen(false)}
          />
        )}
      </div>

      {menu && (
        <ClipMenu
          x={menu.x}
          y={menu.y}
          clip={findClip(project, menu.clipId)}
          kind={(() => {
            const c = findClip(project, menu.clipId)
            return c ? kindFor(c) : 'element'
          })()}
          onClose={() => setMenu(null)}
          onSplit={() => runSplit(selectionRef.current)}
          onDuplicate={() => runDuplicate(selectionRef.current)}
          onDelete={ripple => runDelete(selectionRef.current, ripple)}
          onDetach={() => runDetach(menu.clipId)}
          onWholeVideo={() => runWholeVideo(menu.clipId)}
          onSpeed={s => dispatchProps({ type: 'setClipProps', clipId: menu.clipId, patch: { speed: s } })}
          onMute={m => dispatchProps({ type: 'setClipProps', clipId: menu.clipId, patch: { muted: m } })}
          onProperties={() => {
            select([menu.clipId], false)
            setInspectorOpen(true)
          }}
        />
      )}
      {joint && (
        <TransitionPopover
          x={joint.x}
          y={joint.y}
          clip={findClip(project, joint.clipId)}
          onClose={() => setJoint(null)}
          onSet={tr => dispatchProps({ type: 'setClipProps', clipId: joint.clipId, patch: { transitionIn: tr } })}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Track header
// ---------------------------------------------------------------------------

function TrackHeader({ row, looseOpen, onToggleLoose, onToggle }: { row: Row; looseOpen: boolean; onToggleLoose: () => void; onToggle: (t: Track, key: 'hidden' | 'muted' | 'locked') => void }) {
  const t = row.track
  const base: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: 5,
    width: TL.headerW,
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 10,
    paddingRight: 4,
    backgroundColor: row.kind === 'video' ? color.paper : color.surface,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: color.line,
    boxSizing: 'border-box',
    fontSize: 12,
    fontWeight: 600,
  }
  if (row.kind === 'loose-head') {
    return (
      <div style={base}>
        <button
          type="button"
          aria-expanded={looseOpen}
          onClick={onToggleLoose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderWidth: 0, backgroundColor: 'transparent', padding: 0, fontFamily: font.sans, fontSize: 11, color: color.muted, cursor: 'pointer', textAlign: 'left' }}
        >
          <Icon.Chevron dir={looseOpen ? 'down' : 'right'} size={12} />
          {row.label}
        </button>
      </div>
    )
  }
  if (row.kind === 'loose') {
    return (
      <div style={{ ...base, fontWeight: 500, fontSize: 11, color: color.muted, paddingLeft: 24 }} title="Shown for the whole video — drag or trim its bar to time it">
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</span>
      </div>
    )
  }
  const icon = row.kind === 'audio' || row.kind === 'new-audio' ? <Icon.Music size={13} /> : row.kind === 'video' ? <Icon.Film size={13} /> : <Icon.Text size={13} />
  return (
    <div style={base}>
      <span style={{ display: 'inline-flex', color: color.ink2 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 4 }}>
        {row.label}
        {row.kind === 'video' && <span style={{ display: 'block', fontFamily: font.mono, fontSize: 9, fontWeight: 400, color: color.muted }}>MAIN · MAGNETIC</span>}
      </span>
      {t && (
        <>
          {(t.kind === 'audio' || t.kind === 'video') && (
            <IconBtn $size={24} aria-label={t.muted ? `Unmute ${t.name}` : `Mute ${t.name}`} aria-pressed={!!t.muted} title={t.muted ? 'Unmute track' : 'Mute track'} onClick={() => onToggle(t, 'muted')}>
              <Icon.Speaker size={13} off={t.muted} />
            </IconBtn>
          )}
          {t.kind !== 'audio' && (
            <IconBtn $size={24} aria-label={t.hidden ? `Show ${t.name}` : `Hide ${t.name}`} aria-pressed={!!t.hidden} title={t.hidden ? 'Show track' : 'Hide track'} onClick={() => onToggle(t, 'hidden')}>
              <Icon.Eye size={13} off={t.hidden} />
            </IconBtn>
          )}
          <IconBtn $size={24} aria-label={t.locked ? `Unlock ${t.name}` : `Lock ${t.name}`} aria-pressed={!!t.locked} title={t.locked ? 'Unlock track' : 'Lock track'} onClick={() => onToggle(t, 'locked')}>
            <Icon.Lock size={13} open={!t.locked} />
          </IconBtn>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Context menu & transition popover
// ---------------------------------------------------------------------------

function useDismiss(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    ;(ref.current?.querySelector('button:not([disabled])') as HTMLElement | null)?.focus()
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [ref, onClose])
}

function menuArrows(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  e.preventDefault()
  const items = Array.from(e.currentTarget.querySelectorAll('button:not([disabled])')) as HTMLElement[]
  const i = items.indexOf(document.activeElement as HTMLElement)
  items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
}

function ClipMenu(p: {
  x: number
  y: number
  clip?: Clip
  kind: string
  onClose: () => void
  onSplit: () => void
  onDuplicate: () => void
  onDelete: (ripple: boolean) => void
  onDetach: () => void
  onWholeVideo: () => void
  onSpeed: (s: number) => void
  onMute: (m: boolean) => void
  onProperties: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, p.onClose)
  if (!p.clip) return null
  const media = p.kind === 'video' || p.kind === 'audio'
  const run = (fn: () => void) => () => {
    fn()
    p.onClose()
  }
  return (
    <div ref={ref}>
    <Surface role="menu" aria-label="Clip actions" style={{ left: p.x, top: p.y }} onKeyDown={menuArrows}>
      <MenuItem role="menuitem" onClick={run(p.onSplit)}>
        Split at playhead <Kbd>S</Kbd>
      </MenuItem>
      <MenuItem role="menuitem" onClick={run(p.onDuplicate)}>
        Duplicate <Kbd>⌘D</Kbd>
      </MenuItem>
      <MenuItem role="menuitem" onClick={run(() => p.onDelete(false))}>
        Delete <Kbd>Del</Kbd>
      </MenuItem>
      <MenuItem role="menuitem" onClick={run(() => p.onDelete(true))}>
        Ripple delete <Kbd>⇧Del</Kbd>
      </MenuItem>
      {p.kind === 'video' && !p.clip.muted && (
        <MenuItem role="menuitem" onClick={run(p.onDetach)}>
          Detach audio
        </MenuItem>
      )}
      {media && (
        <MenuItem role="menuitem" onClick={run(() => p.onMute(!p.clip!.muted))}>
          {p.clip.muted ? 'Unmute clip' : 'Mute clip'}
        </MenuItem>
      )}
      {!media && (
        <MenuItem role="menuitem" onClick={run(p.onWholeVideo)}>
          Show for whole video
        </MenuItem>
      )}
      {media && (
        <div style={{ paddingTop: 6, paddingBottom: 6, paddingLeft: 12, paddingRight: 12, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: color.line }}>
          <Overline>Speed</Overline>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {SPEEDS.filter(s => [0.5, 1, 1.5, 2, 4].includes(s)).map(s => (
              <MenuItem
                key={s}
                role="menuitemradio"
                aria-checked={Math.abs(p.clip!.speed - s) < 1e-6}
                onClick={run(() => p.onSpeed(s))}
                style={{ width: 'auto', paddingLeft: 6, paddingRight: 6, fontFamily: font.mono, fontSize: 11, backgroundColor: Math.abs(p.clip!.speed - s) < 1e-6 ? color.paper2 : undefined }}
              >
                {s}×
              </MenuItem>
            ))}
          </div>
        </div>
      )}
      <MenuItem role="menuitem" onClick={run(p.onProperties)} style={{ borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: color.line }}>
        {media ? 'Volume, fades & more…' : 'Animation & fades…'}
      </MenuItem>
    </Surface>
    </div>
  )
}

function TransitionPopover(p: { x: number; y: number; clip?: Clip; onClose: () => void; onSet: (tr: Clip['transitionIn']) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, p.onClose)
  if (!p.clip) return null
  const cur = p.clip.transitionIn
  const dur = cur?.duration ?? 0.5
  const set = (type: TransitionType | null, d = dur) => p.onSet(type ? { type, duration: d } : undefined)
  return (
    <div ref={ref}>
    <Surface role="menu" aria-label="Transition" style={{ left: p.x, top: p.y, minWidth: 220 }} onKeyDown={menuArrows}>
      <div style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}>
        <Overline>Transition</Overline>
      </div>
      {TRANSITIONS.map(t => (
        <MenuItem key={t.type} role="menuitemradio" aria-checked={cur?.type === t.type} onClick={() => set(t.type)} style={{ fontWeight: cur?.type === t.type ? 700 : 400 }}>
          {t.label} {cur?.type === t.type && <span aria-hidden>●</span>}
        </MenuItem>
      ))}
      <div style={{ display: 'flex', gap: 4, paddingLeft: 12, paddingRight: 12, paddingTop: 6, paddingBottom: 6, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: color.line }}>
        {[0.25, 0.5, 1, 1.5].map(d => (
          <MenuItem
            key={d}
            role="menuitemradio"
            aria-checked={Math.abs(dur - d) < 1e-6}
            disabled={!cur}
            onClick={() => cur && set(cur.type, d)}
            style={{ width: 'auto', paddingLeft: 6, paddingRight: 6, fontFamily: font.mono, fontSize: 11, backgroundColor: cur && Math.abs(dur - d) < 1e-6 ? color.paper2 : undefined }}
          >
            {d}s
          </MenuItem>
        ))}
      </div>
      {cur && (
        <MenuItem
          role="menuitem"
          onClick={() => {
            set(null)
            p.onClose()
          }}
        >
          Remove transition
        </MenuItem>
      )}
    </Surface>
    </div>
  )
}
