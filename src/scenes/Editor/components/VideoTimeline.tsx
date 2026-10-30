/**
 * Docked video timeline (desktop / tablet). The editing UI lives in
 * ./timeline; this file owns the dock: visibility (only designs with media,
 * element clips or animation get one), the collapsed 40 px bar, the
 * user-resizable height (top-edge drag, remembered in `mfa-timeline-height`),
 * and the editor-wide bridges (undo routing, Space tap → play/pause).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import useVideoContext from '@/hooks/useVideoContext'
import { usePlayback, useVideoProject } from '@/video/VideoProjectContext'
import { color, font } from '@/theme/tokens'
import Timeline from './timeline/Timeline'
import { useCanvasElements } from './timeline/canvasElements'
import { hasTimelineContent, useTimelineBridges } from './timeline/bridges'
import { formatTimecode } from './timeline/math'
import { Icon, TextBtn } from './timeline/ui'

const LS_HEIGHT = 'mfa-timeline-height'
const DEFAULT_HEIGHT = 240
const clampDock = (h: number) => Math.round(Math.min(Math.max(h, 180), Math.max(220, window.innerHeight * 0.6)))

/** Writes the playhead time into a span without re-rendering anything. */
export function LiveTime({ style }: { style?: React.CSSProperties }) {
  const { controller } = useVideoProject()
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const set = (t: number) => {
      if (ref.current) ref.current.textContent = formatTimecode(t)
    }
    set(controller.time)
    return controller.subscribe(s => set(s.time))
  }, [controller])
  return <span ref={ref} style={{ fontFamily: font.mono, ...style }} />
}

function CollapsedBar({ onOpen }: { onOpen: () => void }) {
  const playback = usePlayback()
  const { controller } = useVideoProject()
  return (
    <div
      role="region"
      aria-label="Video timeline (collapsed)"
      style={{ flex: 'none', height: 40, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10, paddingRight: 10, backgroundColor: color.surface, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: color.ink, fontFamily: font.sans }}
    >
      <button
        type="button"
        aria-label={playback.playing ? 'Pause' : 'Play'}
        onClick={() => controller.toggle()}
        style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderStyle: 'solid', borderColor: color.ink, backgroundColor: playback.playing ? color.ink : color.accent, color: color.white, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        {playback.playing ? <Icon.Pause size={12} /> : <Icon.Play size={12} />}
      </button>
      <LiveTime style={{ fontSize: 12, color: color.ink }} />
      <div style={{ flex: 1 }} />
      <TextBtn onClick={onOpen} aria-label="Show timeline">
        <Icon.Chevron dir="up" size={14} /> Show timeline
      </TextBtn>
    </div>
  )
}

const VideoTimeline: React.FC = () => {
  const api = useVideoProject()
  const { isTimelineOpen, setTimelineOpen } = useVideoContext()
  const editor = useEditor()
  const { canvas } = useEditorContext() as any
  const { elements, byId, version } = useCanvasElements(canvas, api.project)
  const show = hasTimelineContent(api, elements)
  useTimelineBridges(editor, api, show)

  const [dockHeight, setDockHeight] = useState(() => clampDock(Number(localStorage.getItem(LS_HEIGHT)) || DEFAULT_HEIGHT))
  const heightRef = useRef(dockHeight)
  heightRef.current = dockHeight
  const startDockResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = heightRef.current
    let latest = startH
    const move = (ev: PointerEvent) => {
      latest = clampDock(startH + (startY - ev.clientY))
      setDockHeight(latest)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      localStorage.setItem(LS_HEIGHT, String(latest))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [])

  if (!show) return null
  if (!isTimelineOpen) return <CollapsedBar onOpen={() => setTimelineOpen(true)} />
  return (
    <Timeline
      height={dockHeight}
      elements={elements}
      elementsById={byId}
      elementsVersion={version}
      onCollapse={() => setTimelineOpen(false)}
      onResizeStart={startDockResize}
    />
  )
}

export default VideoTimeline
