/**
 * Time ruler: adaptive ticks for the visible window only, markers, and
 * click/drag scrubbing (PlaybackController.scrub → endScrub on release).
 */
import React, { useRef } from 'react'
import { color, font } from '@/theme/tokens'
import { Marker } from '@/video/model'
import { formatRulerLabel, rulerTicks } from './math'

interface Props {
  pps: number
  width: number
  height: number
  /** Visible time window (quantized). */
  from: number
  to: number
  markers: Marker[]
  onScrub: (t: number, phase: 'start' | 'move' | 'end') => void
  onMarkerClick: (m: Marker) => void
  onMarkerRemove: (m: Marker) => void
}

function RulerImpl({ pps, width, height, from, to, markers, onScrub, onMarkerClick, onMarkerRemove }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { major, ticks } = rulerTicks(pps, from, to)
  const timeAt = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect()
    return r ? Math.max(0, (clientX - r.left) / pps) : 0
  }
  return (
    <div
      ref={ref}
      // Pointer-only scrub surface; the keyboard equivalents are ←/→, Shift+←/→, Home/End, J/K/L.
      title="Click or drag to move the playhead"
      onPointerDown={e => {
        if (e.button !== 0) return
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        onScrub(timeAt(e.clientX), 'start')
      }}
      onPointerMove={e => {
        if (!(e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) return
        onScrub(timeAt(e.clientX), 'move')
      }}
      onPointerUp={e => {
        if (!(e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) return
        ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
        onScrub(timeAt(e.clientX), 'end')
      }}
      style={{ position: 'relative', width, height, cursor: 'text', touchAction: 'none', backgroundColor: color.surface }}
    >
      {ticks.map(t => (
        <React.Fragment key={t.t}>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: t.t * pps,
              bottom: 0,
              width: 1,
              height: t.major ? 10 : 5,
              backgroundColor: t.major ? color.ink2 : color.line2,
            }}
          />
          {t.major && (
            <span
              aria-hidden
              style={{ position: 'absolute', left: t.t * pps + 4, top: 3, fontFamily: font.mono, fontSize: 10, color: color.muted, whiteSpace: 'nowrap', pointerEvents: 'none' }}
            >
              {formatRulerLabel(t.t, major)}
            </span>
          )}
        </React.Fragment>
      ))}
      {markers.map(m => (
        <button
          key={m.id}
          type="button"
          title={`${m.label || 'Marker'} — click to jump, double-click to remove`}
          aria-label={`Marker at ${m.time.toFixed(2)} seconds`}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onMarkerClick(m)}
          onDoubleClick={() => onMarkerRemove(m)}
          style={{
            position: 'absolute',
            left: m.time * pps - 5,
            top: 0,
            width: 10,
            height: 12,
            padding: 0,
            borderWidth: 0,
            backgroundColor: color.accent,
            clipPath: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)',
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  )
}

export const Ruler = React.memo(RulerImpl)
