/**
 * Phone timeline: one combined strip — overlay lane on top, main track, a
 * thin audio lane — under a fixed centre playhead. Drag the strip to scrub,
 * tap a clip to select it, drag its big edge handles to trim, split/delete
 * from the bar. Every target is ≥ 44 px. The strip moves by a transform
 * written from the clock subscription (no React render per frame).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { color, font } from '@/theme/tokens'
import useVideoContext from '@/hooks/useVideoContext'
import { usePlayback, useVideoProject } from '@/video/VideoProjectContext'
import { Clip, Command, VideoProject, applyCommand, clipDuration, clipEnd, findAsset, findClip, findTrack } from '@/video/model'
import { clipKind, deleteCommand, splitCommand, trimCommand } from './actions'
import { useCanvasElements } from './canvasElements'
import { hasTimelineContent, useTimelineBridges, findObject } from './bridges'
import { formatTimecode } from './math'
import { clipColors, Icon } from './ui'
import { notify } from '@/lib/notify'

type AnyObj = any

const PPS = 48
const LANE = { overlay: 30, main: 52, audio: 14 }
const HIT = 44

const btn: React.CSSProperties = {
  width: HIT,
  height: HIT,
  flex: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0,
  backgroundColor: 'transparent',
  color: color.ink,
  padding: 0,
  cursor: 'pointer',
}

interface Gesture {
  type: 'scrub' | 'trim-start' | 'trim-end'
  pointerId: number
  x0: number
  t0: number
  moved: boolean
  clipId?: string
  base: VideoProject
  cmd: Command | null
  tapClip?: string
}

export default function MobileTimeline() {
  const api = useVideoProject()
  const { project, controller, dispatch, getProject } = api
  const playback = usePlayback()
  const { isTimelineOpen, setTimelineOpen } = useVideoContext()
  const editor = useEditor()
  const { canvas } = useEditorContext() as AnyObj
  const { elements, byId } = useCanvasElements(canvas, project)
  const show = hasTimelineContent(api, elements)
  useTimelineBridges(editor, api, show)

  const [selected, setSelected] = useState<string | null>(null)
  const [preview, setPreview] = useState<VideoProject | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const gesture = useRef<Gesture | null>(null)

  // Strip position + time readout follow the clock without React renders.
  useEffect(() => {
    const set = (t: number) => {
      if (timeRef.current) timeRef.current.textContent = formatTimecode(t)
      const strip = stripRef.current
      if (contentRef.current && strip) contentRef.current.style.transform = `translateX(${strip.clientWidth / 2 - t * PPS}px)`
    }
    set(controller.time)
    return controller.subscribe(s => set(s.time))
  }, [controller, isTimelineOpen, show])

  useEffect(() => {
    if (selected && !findClip(project, selected)) setSelected(null)
  }, [project, selected])

  const onPointerDown = useCallback(
    (e: React.PointerEvent, opts: { trim?: 'trim-start' | 'trim-end'; clipId?: string } = {}) => {
      if (e.button !== 0) return
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
      gesture.current = {
        type: opts.trim || 'scrub',
        pointerId: e.pointerId,
        x0: e.clientX,
        t0: controller.time,
        moved: false,
        clipId: opts.clipId,
        base: getProject(),
        cmd: null,
        tapClip: opts.trim ? undefined : opts.clipId,
      }
    },
    [controller, getProject],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current
      if (!g || g.pointerId !== e.pointerId) return
      const dx = e.clientX - g.x0
      if (!g.moved && Math.abs(dx) < 4) return
      g.moved = true
      if (g.type === 'scrub') {
        controller.scrub(Math.max(0, Math.min(api.getDuration(), g.t0 - dx / PPS)))
        return
      }
      const c = g.clipId ? findClip(g.base, g.clipId) : undefined
      if (!c) return
      const edge = g.type === 'trim-start' ? 'start' : 'end'
      const t = (edge === 'start' ? c.start : clipEnd(c)) + dx / PPS
      g.cmd = trimCommand(g.base, c.id, edge, Math.max(0, t))
      setPreview(g.cmd ? applyCommand(g.base, g.cmd).project : null)
    },
    [api, controller],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current
      if (!g || g.pointerId !== e.pointerId) return
      gesture.current = null
      if (g.type === 'scrub') {
        if (g.moved) controller.endScrub()
        else {
          setSelected(g.tapClip || null)
          const c = g.tapClip ? findClip(getProject(), g.tapClip) : undefined
          const obj = findObject(canvas, c?.objectId)
          if (obj && canvas) {
            canvas.setActiveObject(obj)
            canvas.requestRenderAll()
          }
        }
        return
      }
      setPreview(null)
      if (g.moved && g.cmd) dispatch(g.cmd)
    },
    [canvas, controller, dispatch, getProject],
  )

  if (!show) return null

  const view = preview || project
  const lanes = {
    overlay: view.clips.filter(c => findTrack(view, c.trackId)?.kind === 'overlay'),
    main: view.clips.filter(c => findTrack(view, c.trackId)?.kind === 'video'),
    audio: view.clips.filter(c => findTrack(view, c.trackId)?.kind === 'audio'),
  }
  const sel = selected ? findClip(view, selected) : undefined

  const bar = (
    <div style={{ height: HIT, display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 4, paddingRight: 4, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: color.ink, backgroundColor: color.surface, fontFamily: font.sans }}>
      <button type="button" aria-label={playback.playing ? 'Pause' : 'Play'} onClick={() => controller.toggle()} style={btn}>
        <span style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: playback.playing ? color.ink : color.accent, color: color.white, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {playback.playing ? <Icon.Pause size={13} /> : <Icon.Play size={13} />}
        </span>
      </button>
      <span ref={timeRef} style={{ fontFamily: font.mono, fontSize: 12 }}>
        {formatTimecode(controller.time)}
      </span>
      <div style={{ flex: 1 }} />
      {isTimelineOpen && (
        <>
          <button
            type="button"
            aria-label="Split at playhead"
            style={btn}
            onClick={() => {
              const r = splitCommand(getProject(), selected ? [selected] : [], controller.time)
              if (!r) notify('Move the playhead over a clip to split it.', 'info')
              else {
                dispatch(r.command)
                setSelected(r.rightIds[0] || null)
              }
            }}
          >
            <Icon.Split size={18} />
          </button>
          <button
            type="button"
            aria-label="Delete selected clip"
            disabled={!selected}
            style={{ ...btn, opacity: selected ? 1 : 0.35 }}
            onClick={() => {
              const cmd = selected ? deleteCommand(getProject(), [selected], false) : null
              if (cmd) dispatch(cmd)
              setSelected(null)
            }}
          >
            <Icon.Trash size={18} />
          </button>
        </>
      )}
      <button type="button" aria-label={isTimelineOpen ? 'Hide timeline' : 'Show timeline'} aria-expanded={isTimelineOpen} style={btn} onClick={() => setTimelineOpen(!isTimelineOpen)}>
        <Icon.Chevron dir={isTimelineOpen ? 'down' : 'up'} size={20} />
      </button>
    </div>
  )

  if (!isTimelineOpen) return bar

  const block = (c: Clip, top: number, h: number) => {
    const k = clipKind(view, c)
    const ek = byId.get(c.objectId || '')?.kind
    const pal = clipColors[k === 'element' ? (ek === 'text' ? 'text' : 'element') : k]
    const a = findAsset(view, c.assetId)
    const isSel = c.id === selected
    return (
      <div
        key={c.id}
        role="button"
        tabIndex={0}
        aria-pressed={isSel}
        aria-label={`${c.name || a?.name || byId.get(c.objectId || '')?.name || 'Clip'}`}
        onPointerDown={e => onPointerDown(e, { clipId: c.id })}
        onKeyDown={e => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          setSelected(c.id)
        }}
        style={{
          position: 'absolute',
          left: c.start * PPS,
          top,
          width: Math.max(4, clipDuration(c) * PPS),
          height: h,
          boxSizing: 'border-box',
          backgroundColor: pal.bg,
          color: pal.fg,
          borderWidth: isSel ? 2 : 1,
          borderStyle: 'solid',
          borderColor: isSel ? color.ink : pal.edge,
          borderRadius: 4,
          overflow: 'hidden',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: `${h - 2}px`,
          paddingLeft: 6,
          whiteSpace: 'nowrap',
          zIndex: isSel ? 2 : 1,
        }}
      >
        {h > 20 && (c.name || a?.name || byId.get(c.objectId || '')?.name || '')}
      </div>
    )
  }

  const selTop = sel ? (findTrack(view, sel.trackId)?.kind === 'overlay' ? 6 : findTrack(view, sel.trackId)?.kind === 'audio' ? 8 + LANE.overlay + LANE.main + 4 : 8 + LANE.overlay) : 0
  const selH = sel ? (findTrack(view, sel.trackId)?.kind === 'overlay' ? LANE.overlay : findTrack(view, sel.trackId)?.kind === 'audio' ? LANE.audio : LANE.main) : 0
  const stripH = 12 + LANE.overlay + LANE.main + LANE.audio + 8

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: color.white }}>
      {bar}
      <div
        ref={stripRef}
        role="slider"
        tabIndex={0}
        aria-label="Timeline — drag to scrub"
        aria-valuemin={0}
        aria-valuemax={Math.round(api.getDuration())}
        aria-valuenow={Math.round(controller.time)}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') controller.seek(controller.time - 1 / 30)
          if (e.key === 'ArrowRight') controller.seek(controller.time + 1 / 30)
        }}
        onPointerDown={e => onPointerDown(e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ position: 'relative', height: stripH, overflow: 'hidden', touchAction: 'none', backgroundColor: color.surface, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: color.line }}
      >
        <div ref={contentRef} style={{ position: 'absolute', left: 0, top: 0, height: stripH, willChange: 'transform' }}>
          {lanes.overlay.map(c => block(c, 6, LANE.overlay))}
          {lanes.main.map(c => block(c, 8 + LANE.overlay, LANE.main))}
          {lanes.audio.map(c => block(c, 8 + LANE.overlay + LANE.main + 4, LANE.audio))}
          {sel &&
            !findTrack(view, sel.trackId)?.locked &&
            (['trim-start', 'trim-end'] as const).map(edge => (
              <div
                key={edge}
                role="button"
                aria-label={edge === 'trim-start' ? 'Trim start' : 'Trim end'}
                onPointerDown={e => onPointerDown(e, { trim: edge, clipId: sel.id })}
                style={{
                  position: 'absolute',
                  left: (edge === 'trim-start' ? sel.start : clipEnd(sel)) * PPS - HIT / 2,
                  top: Math.max(0, selTop + selH / 2 - HIT / 2),
                  width: HIT,
                  height: HIT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                  touchAction: 'none',
                }}
              >
                <span style={{ width: 14, height: Math.min(HIT - 8, Math.max(24, selH + 6)), borderRadius: 4, backgroundColor: color.ink, borderWidth: 2, borderStyle: 'solid', borderColor: color.white }} />
              </div>
            ))}
        </div>
        <div aria-hidden style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: color.accent, pointerEvents: 'none', zIndex: 4 }} />
      </div>
    </div>
  )
}
