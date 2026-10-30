/**
 * Properties of the selected clip, docked on the right of the timeline:
 * speed, volume/mute, fades, transition from the previous clip, element
 * in/out animation, and the clip actions. Sliders commit once on release
 * (one undo step per adjustment), not on every input event.
 */
import React, { useEffect, useState } from 'react'
import { styled } from 'baseui'
import { color, font } from '@/theme/tokens'
import { Clip, Command, TransitionType, clipDuration } from '@/video/model'
import { ENTER_EXIT_PRESETS } from '@/utils/animation/presets'
import { readAnimation, setPreset } from '@/utils/animation/authoring'
import type { PresetInstance } from '@/utils/animation/types'
import { Icon, IconBtn, Overline, TextBtn, TL, focusRing } from './ui'
import type { ClipKind } from './actions'

type AnyObj = any

export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
export const TRANSITIONS: Array<{ type: TransitionType; label: string }> = [
  { type: 'crossfade', label: 'Crossfade' },
  { type: 'dip', label: 'Dip to black' },
  { type: 'slide', label: 'Slide' },
  { type: 'wipe', label: 'Wipe' },
  { type: 'zoom', label: 'Zoom' },
]

const Panel = styled('aside', {
  width: `${TL.inspectorW}px`,
  flex: 'none',
  borderLeftWidth: '1px',
  borderLeftStyle: 'solid',
  borderLeftColor: color.line,
  backgroundColor: color.surface,
  overflowY: 'auto',
  fontFamily: font.sans,
  fontSize: '12px',
  color: color.ink,
})

const Section = styled('div', {
  paddingTop: '10px',
  paddingBottom: '10px',
  paddingLeft: '14px',
  paddingRight: '14px',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: color.line,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

const Chip = styled('button', ({ $on }: { $on?: boolean }) => ({
  height: '24px',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: '7px',
  paddingRight: '7px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $on ? color.ink : color.line2,
  borderRadius: '4px',
  backgroundColor: $on ? color.ink : color.white,
  color: $on ? color.paper : color.ink,
  fontFamily: font.mono,
  fontSize: '11px',
  cursor: 'pointer',
  ':hover': { borderColor: color.ink },
  ...focusRing,
}))

const Select = styled('select', {
  height: '28px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line2,
  borderRadius: '4px',
  backgroundColor: color.white,
  fontFamily: font.sans,
  fontSize: '12px',
  color: color.ink,
  ...focusRing,
})

/** Range input that reports once, when the user lets go. */
export function CommitRange({
  label,
  min,
  max,
  step,
  value,
  format,
  onCommit,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  format: (v: number) => string
  onCommit: (v: number) => void
}) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const commit = () => {
    if (Math.abs(v - value) > 1e-9) onCommit(v)
  }
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, alignItems: 'center' }}>
      <span>{label}</span>
      <span style={{ fontFamily: font.mono, fontSize: 11, color: color.muted }}>{format(v)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        aria-valuetext={format(v)}
        onChange={e => setV(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        style={{ gridColumn: '1 / span 2', accentColor: color.accent, width: '100%' }}
      />
    </label>
  )
}

interface Props {
  clip: Clip
  kind: ClipKind | 'text'
  label: string
  /** The clip directly before this one on the main track (transitions). */
  hasPredecessor: boolean
  /** Canvas object for element clips (animation presets). */
  object?: AnyObj
  canvas?: AnyObj
  dispatch: (cmd: Command) => void
  onSplit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onDetachAudio?: () => void
  onWholeVideo?: () => void
  onClose: () => void
}

function AnimationPicker({ canvas, obj, which }: { canvas: AnyObj; obj: AnyObj; which: 'in' | 'out' }) {
  const anim = readAnimation(obj)
  const cur = anim[which]
  const [, force] = useState(0)
  const set = (preset: string, duration = cur?.duration ?? 0.6) => {
    const def = ENTER_EXIT_PRESETS.find(p => p.id === preset)
    const inst: PresetInstance | null = preset === 'none' ? null : { preset, duration, easing: def?.easing || 'easeOutCubic', direction: cur?.direction }
    setPreset(canvas, obj, which, inst)
    force(n => n + 1)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 74px', gap: 6, alignItems: 'center' }}>
      <Select aria-label={which === 'in' ? 'Animation in' : 'Animation out'} value={cur?.preset || 'none'} onChange={e => set((e.target as HTMLSelectElement).value)}>
        {ENTER_EXIT_PRESETS.map(p => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </Select>
      <Select
        aria-label={`${which === 'in' ? 'In' : 'Out'} animation length`}
        value={String(cur?.duration ?? 0.6)}
        disabled={!cur}
        onChange={e => cur && set(cur.preset, Number((e.target as HTMLSelectElement).value))}
      >
        {[0.3, 0.6, 1, 1.5, 2].map(d => (
          <option key={d} value={d}>
            {d}s
          </option>
        ))}
      </Select>
    </div>
  )
}

export function ClipInspector(p: Props) {
  const { clip, kind, dispatch } = p
  const dur = clipDuration(clip)
  const media = kind === 'video' || kind === 'audio'
  const set = (patch: Partial<Clip>) => dispatch({ type: 'setClipProps', clipId: clip.id, patch })
  const tr = clip.transitionIn

  return (
    <Panel aria-label="Clip properties">
      <Section>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Overline>{kind === 'element' ? 'element' : kind} clip</Overline>
            <div style={{ fontFamily: font.serif, fontSize: 17, fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.label}>
              {p.label}
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: color.muted }}>
              {clip.start.toFixed(2)}s → {(clip.start + dur).toFixed(2)}s · {dur.toFixed(2)}s
            </div>
          </div>
          <IconBtn $size={28} aria-label="Close properties" onClick={p.onClose}>
            <Icon.Close size={14} />
          </IconBtn>
        </div>
      </Section>

      {media && (
        <Section>
          <Overline>Speed</Overline>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} role="group" aria-label="Speed presets">
            {SPEEDS.map(s => (
              <Chip key={s} $on={Math.abs(clip.speed - s) < 1e-6} aria-pressed={Math.abs(clip.speed - s) < 1e-6} onClick={() => set({ speed: s })}>
                {s}×
              </Chip>
            ))}
          </div>
          <CommitRange label="Custom" min={0.25} max={4} step={0.05} value={clip.speed} format={v => `${v.toFixed(2)}×`} onCommit={v => set({ speed: v })} />
        </Section>
      )}

      {media && (
        <Section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Overline>Audio</Overline>
            <Chip $on={!!clip.muted} aria-pressed={!!clip.muted} onClick={() => set({ muted: !clip.muted })}>
              {clip.muted ? 'Muted' : 'Mute'}
            </Chip>
          </div>
          <CommitRange label="Volume" min={0} max={2} step={0.05} value={clip.volume} format={v => `${Math.round(v * 100)}%`} onCommit={v => set({ volume: v })} />
          {kind === 'video' && p.onDetachAudio && !clip.muted && (
            <TextBtn onClick={p.onDetachAudio}>
              <Icon.Music size={13} /> Detach audio
            </TextBtn>
          )}
        </Section>
      )}

      <Section>
        <Overline>Fades</Overline>
        <CommitRange label="Fade in" min={0} max={Math.max(0.1, Math.min(5, dur))} step={0.05} value={clip.fadeIn} format={v => `${v.toFixed(2)}s`} onCommit={v => set({ fadeIn: v })} />
        <CommitRange label="Fade out" min={0} max={Math.max(0.1, Math.min(5, dur))} step={0.05} value={clip.fadeOut} format={v => `${v.toFixed(2)}s`} onCommit={v => set({ fadeOut: v })} />
      </Section>

      {p.hasPredecessor && (
        <Section>
          <Overline>Transition from previous clip</Overline>
          <Select
            aria-label="Transition type"
            value={tr?.type || 'none'}
            onChange={e => {
              const v = (e.target as HTMLSelectElement).value
              set({ transitionIn: v === 'none' ? undefined : { type: v as TransitionType, duration: tr?.duration ?? 0.5 } })
            }}
          >
            <option value="none">None</option>
            {TRANSITIONS.map(t => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </Select>
          {tr && (
            <CommitRange
              label="Duration"
              min={0.1}
              max={Math.max(0.2, Math.min(3, dur))}
              step={0.05}
              value={tr.duration}
              format={v => `${v.toFixed(2)}s`}
              onCommit={v => set({ transitionIn: { ...tr, duration: v } })}
            />
          )}
        </Section>
      )}

      {kind !== 'video' && kind !== 'audio' && p.object && p.canvas && (
        <Section>
          <Overline>Animate in</Overline>
          <AnimationPicker canvas={p.canvas} obj={p.object} which="in" />
          <Overline>Animate out</Overline>
          <AnimationPicker canvas={p.canvas} obj={p.object} which="out" />
        </Section>
      )}

      <Section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <TextBtn onClick={p.onSplit}>
            <Icon.Split size={13} /> Split
          </TextBtn>
          <TextBtn onClick={p.onDuplicate}>Duplicate</TextBtn>
          {p.onWholeVideo && <TextBtn onClick={p.onWholeVideo}>Show for whole video</TextBtn>}
          <TextBtn onClick={p.onDelete}>
            <Icon.Trash size={13} /> Delete
          </TextBtn>
        </div>
      </Section>
    </Panel>
  )
}
