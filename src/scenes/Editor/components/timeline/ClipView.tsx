/**
 * One clip on a track. Memoized: it re-renders only when its own clip, zoom,
 * selection or the (quantized) visible window changes — never on playhead
 * ticks. Filmstrips and waveforms are drawn into 512 px canvas tiles, only
 * for tiles inside the visible window, once per zoom level.
 */
import React, { useEffect, useRef } from 'react'
import { color, font, radius } from '@/theme/tokens'
import { Asset, Clip, clipDuration } from '@/video/model'
import { frameAt, peakBetween, useFilmstrip, usePeaks } from './mediaCache'
import { clipColors, Icon, kindIcon } from './ui'
import type { ClipKind } from './actions'

export type ClipZone = 'body' | 'trim-start' | 'trim-end' | 'fade-in' | 'fade-out'

const TILE = 512

export interface ClipViewProps {
  clip: Clip
  kind: ClipKind | 'text'
  label: string
  x: number
  width: number
  height: number
  pps: number
  selected: boolean
  tabbable: boolean
  locked: boolean
  asset?: Asset
  url?: string | null
  /** Visible window in clip-local px (quantized by the parent). */
  visStart: number
  visEnd: number
  /** Element clip shown for the whole video (no clip of its own yet). */
  loose?: boolean
  onPointerDown: (e: React.PointerEvent, clipId: string, zone: ClipZone) => void
  onContextMenu: (e: React.MouseEvent, clipId: string) => void
  /** Focus landed on the clip; `activate` = Enter (select it). */
  onFocusClip: (clipId: string, activate?: boolean) => void
}

type Draw = (ctx: CanvasRenderingContext2D, x0: number, w: number, h: number) => void

const Tile = React.memo(function Tile({ index, width, height, draw, drawKey }: { index: number; width: number; height: number; draw: Draw; drawKey: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.max(1, Math.round(width * dpr))
    c.height = Math.max(1, Math.round(height * dpr))
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    draw(ctx, index * TILE, width, height)
    // drawKey captures everything `draw` depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawKey, width, height])
  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', left: index * TILE, top: 0, width, height, pointerEvents: 'none' }} />
})

function Tiles({ width, height, visStart, visEnd, draw, drawKey }: { width: number; height: number; visStart: number; visEnd: number; draw: Draw; drawKey: string }) {
  const first = Math.max(0, Math.floor(visStart / TILE))
  const last = Math.min(Math.ceil(width / TILE) - 1, Math.floor(visEnd / TILE))
  const tiles: React.ReactNode[] = []
  for (let i = first; i <= last; i++) {
    tiles.push(<Tile key={i} index={i} width={Math.min(TILE, width - i * TILE)} height={height} draw={draw} drawKey={drawKey} />)
  }
  return <>{tiles}</>
}

function fadeGain(c: Clip, local: number): number {
  const d = clipDuration(c)
  let g = 1
  if (c.fadeIn > 0) g *= Math.min(1, Math.max(0, local / c.fadeIn))
  if (c.fadeOut > 0) g *= Math.min(1, Math.max(0, (d - local) / c.fadeOut))
  return g
}

function Filmstrip({ clip, asset, url, pps, width, height, visStart, visEnd }: { clip: Clip; asset: Asset; url: string; pps: number; width: number; height: number; visStart: number; visEnd: number }) {
  const strip = useFilmstrip(asset.id, url, asset.duration)
  if (!strip) return null
  const cellW = Math.max(12, height * strip.aspect)
  const draw: Draw = (ctx, x0, w, h) => {
    for (let k = Math.floor(x0 / cellW); k * cellW < x0 + w; k++) {
      const x = k * cellW
      const t = clip.inPoint + ((x + cellW / 2) / pps) * clip.speed
      const f = frameAt(strip, t)
      if (f) ctx.drawImage(f.image, x - x0, 0, cellW, h)
    }
  }
  return <Tiles width={width} height={height} visStart={visStart} visEnd={visEnd} draw={draw} drawKey={`${pps}|${clip.inPoint}|${clip.speed}|${strip.frames.length}`} />
}

function Waveform({ clip, asset, url, pps, width, height, visStart, visEnd, tint }: { clip: Clip; asset: Asset; url: string; pps: number; width: number; height: number; visStart: number; visEnd: number; tint: string }) {
  const peaks = usePeaks(asset.id, url)
  if (!peaks) return null
  const draw: Draw = (ctx, x0, w, h) => {
    ctx.fillStyle = tint
    const mid = h / 2
    const gain = clip.muted ? 0.08 : Math.min(2, clip.volume)
    for (let px = 0; px < w; px += 2) {
      const local = (x0 + px) / pps
      const t0 = clip.inPoint + local * clip.speed
      const t1 = t0 + (2 / pps) * clip.speed
      const v = Math.min(1, peakBetween(peaks, t0, t1) * gain * fadeGain(clip, local))
      const bar = Math.max(1, v * (h - 4))
      ctx.fillRect(px, mid - bar / 2, 1.5, bar)
    }
  }
  return (
    <Tiles
      width={width}
      height={height}
      visStart={visStart}
      visEnd={visEnd}
      draw={draw}
      drawKey={`${pps}|${clip.inPoint}|${clip.speed}|${clip.volume}|${clip.fadeIn}|${clip.fadeOut}|${clip.muted ? 1 : 0}|${peaks.data.length}`}
    />
  )
}

function ClipViewImpl(p: ClipViewProps) {
  const { clip, kind, width, height, pps, selected, locked } = p
  const pal = clipColors[kind]
  const innerH = height - 6
  const stripH = kind === 'video' ? innerH - 18 : innerH
  const fadeInPx = clip.fadeIn * pps
  const fadeOutPx = clip.fadeOut * pps
  const showHandles = !locked && width >= 14
  const media = (kind === 'video' || kind === 'audio') && p.asset && p.url
  const name = p.label

  return (
    <div
      role="button"
      tabIndex={p.tabbable ? 0 : -1}
      aria-pressed={selected}
      aria-label={`${kind === 'text' ? 'Text' : kind} clip ${name}, ${clip.start.toFixed(2)} to ${(clip.start + clipDuration(clip)).toFixed(2)} seconds${locked ? ', locked' : ''}`}
      data-clip-id={clip.id}
      data-zone="body"
      className="mfa-tl-clip"
      onPointerDown={e => p.onPointerDown(e, clip.id, 'body')}
      onContextMenu={e => p.onContextMenu(e, clip.id)}
      onFocus={() => p.onFocusClip(clip.id)}
      onKeyDown={e => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        p.onFocusClip(clip.id, true)
      }}
      style={{
        position: 'absolute',
        left: p.x,
        top: 3,
        width: Math.max(3, width),
        height: innerH,
        boxSizing: 'border-box',
        backgroundColor: pal.bg,
        color: pal.fg,
        borderWidth: selected ? 2 : 1,
        borderStyle: p.loose ? 'dashed' : 'solid',
        borderColor: selected ? color.ink : pal.edge,
        borderRadius: radius.sm,
        boxShadow: selected ? '2px 2px 0 #181410' : 'none',
        overflow: 'hidden',
        cursor: locked ? 'not-allowed' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: selected ? 2 : 1,
      }}
    >
      {media && kind === 'video' && (
        <div style={{ position: 'absolute', left: 0, top: 18, width, height: stripH, overflow: 'hidden', pointerEvents: 'none', opacity: 0.95 }}>
          <Filmstrip clip={clip} asset={p.asset!} url={p.url!} pps={pps} width={width} height={stripH} visStart={p.visStart} visEnd={p.visEnd} />
        </div>
      )}
      {media && kind === 'audio' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width, height: stripH, overflow: 'hidden', pointerEvents: 'none' }}>
          <Waveform clip={clip} asset={p.asset!} url={p.url!} pps={pps} width={width} height={stripH} visStart={p.visStart} visEnd={p.visEnd} tint="rgba(47,125,79,0.55)" />
        </div>
      )}

      {/* label */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          top: kind === 'video' ? 1 : 0,
          height: kind === 'video' ? 16 : innerH,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: font.sans,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {width > 34 && <span style={{ display: 'inline-flex', flex: 'none', opacity: 0.85 }}>{kindIcon(kind)}</span>}
        {width > 50 && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.loose ? `${name} · whole video` : name}</span>}
        {clip.speed !== 1 && width > 80 && (
          <span style={{ flex: 'none', fontFamily: font.mono, fontSize: 10, paddingLeft: 4, paddingRight: 4, borderRadius: 3, backgroundColor: color.accent, color: color.white }}>
            {Number(clip.speed.toFixed(2))}×
          </span>
        )}
        {clip.muted && width > 70 && (
          <span style={{ flex: 'none', display: 'inline-flex' }} aria-label="muted">
            <Icon.Speaker size={11} off />
          </span>
        )}
        {clip.transitionIn && width > 90 && (
          <span style={{ flex: 'none', fontFamily: font.mono, fontSize: 9, opacity: 0.8 }}>{clip.transitionIn.type}</span>
        )}
      </div>

      {/* fades */}
      {fadeInPx > 1 && (
        <svg aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: fadeInPx, height: innerH, pointerEvents: 'none' }} viewBox={`0 0 ${fadeInPx} ${innerH}`} preserveAspectRatio="none">
          <polygon points={`0,0 ${fadeInPx},0 0,${innerH}`} fill="rgba(24,20,16,0.28)" />
        </svg>
      )}
      {fadeOutPx > 1 && (
        <svg aria-hidden style={{ position: 'absolute', right: 0, top: 0, width: fadeOutPx, height: innerH, pointerEvents: 'none' }} viewBox={`0 0 ${fadeOutPx} ${innerH}`} preserveAspectRatio="none">
          <polygon points={`0,0 ${fadeOutPx},0 ${fadeOutPx},${innerH}`} fill="rgba(24,20,16,0.28)" />
        </svg>
      )}
      {selected && showHandles && !p.loose && width >= 40 && (
        <>
          <span
            data-zone="fade-in"
            title="Drag to fade in"
            onPointerDown={e => {
              e.stopPropagation()
              p.onPointerDown(e, clip.id, 'fade-in')
            }}
            style={{ position: 'absolute', top: 1, left: Math.min(width - 22, Math.max(8, fadeInPx - 5)), width: 10, height: 10, borderRadius: 5, backgroundColor: color.white, borderWidth: 1, borderStyle: 'solid', borderColor: color.ink, cursor: 'ew-resize', zIndex: 3 }}
          />
          <span
            data-zone="fade-out"
            title="Drag to fade out"
            onPointerDown={e => {
              e.stopPropagation()
              p.onPointerDown(e, clip.id, 'fade-out')
            }}
            style={{ position: 'absolute', top: 1, left: Math.max(12, Math.min(width - 18, width - fadeOutPx - 5)), width: 10, height: 10, borderRadius: 5, backgroundColor: color.white, borderWidth: 1, borderStyle: 'solid', borderColor: color.ink, cursor: 'ew-resize', zIndex: 3 }}
          />
        </>
      )}

      {/* trim handles */}
      {showHandles &&
        (['trim-start', 'trim-end'] as const).map(zone => (
          <span
            key={zone}
            data-zone={zone}
            title={zone === 'trim-start' ? 'Drag to trim the start' : 'Drag to trim the end'}
            onPointerDown={e => {
              e.stopPropagation()
              p.onPointerDown(e, clip.id, zone)
            }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: zone === 'trim-start' ? 0 : undefined,
              right: zone === 'trim-end' ? 0 : undefined,
              width: 7,
              cursor: 'ew-resize',
              backgroundColor: selected ? color.ink : 'rgba(24,20,16,0.18)',
              zIndex: 2,
            }}
          />
        ))}
    </div>
  )
}

export const ClipView = React.memo(ClipViewImpl)
