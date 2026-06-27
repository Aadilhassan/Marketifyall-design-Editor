import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { useActiveObject, useEditorContext } from '@nkyo/scenify-sdk'
import useVideoContext from '@/hooks/useVideoContext'
import {
  ENTER_EXIT_PRESETS,
  EMPHASIS_PRESETS,
  EASING_OPTIONS,
  readAnimation,
  setPreset,
  setTextReveal,
  clearAnimation,
} from '@/utils/animation'
import { EasingName, PresetCategory, PresetDirection, TextRevealPreset } from '@/utils/animation/types'

const TEXT_PRESETS: { id: TextRevealPreset; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'word', label: 'By word' },
]

const isTextObject = (obj: any): boolean =>
  !!obj && (/text/i.test(obj.type || '') || obj.type === 'StaticText' || obj.type === 'DynamicText')

type TabKey = 'in' | 'emphasis' | 'out'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'in', label: 'Animate in' },
  { key: 'emphasis', label: 'Loop' },
  { key: 'out', label: 'Animate out' },
]

const DIRECTIONS: { id: PresetDirection; label: string }[] = [
  { id: 'up', label: '↑' },
  { id: 'down', label: '↓' },
  { id: 'left', label: '←' },
  { id: 'right', label: '→' },
]

const DEFAULT_DURATION = 0.6
const DEFAULT_EMPHASIS_DURATION = 1.2

function Panel() {
  // Resolve the active object robustly: useActiveObject() can be null for
  // template/StaticText objects while the editor context still has it.
  const hookActive = useActiveObject<any>()
  const { canvas, activeObject: ctxActive } = useEditorContext() as any
  const activeObject = hookActive || ctxActive || (canvas && canvas.getActiveObject && canvas.getActiveObject()) || null
  const { setTimelineOpen, setCurrentTime, play, pause } = useVideoContext()

  const [tab, setTab] = useState<TabKey>('in')
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [easing, setEasing] = useState<EasingName>('easeOut')
  const [direction, setDirection] = useState<PresetDirection>('up')
  const [intensity, setIntensity] = useState(1)
  // Bump to force re-read of the object's animation after we mutate it.
  const [version, setVersion] = useState(0)

  const objId = activeObject ? activeObject.id || activeObject.metadata?.id : null

  // Re-initialise controls from the selected object's existing animation.
  useEffect(() => {
    if (!activeObject) return
    const anim = readAnimation(activeObject)
    const inst = (tab === 'in' && anim.in) || (tab === 'out' && anim.out) || (tab === 'emphasis' && anim.emphasis)
    if (inst) {
      setDuration(inst.duration)
      setEasing(inst.easing)
      if (inst.direction) setDirection(inst.direction)
      if (typeof inst.intensity === 'number') setIntensity(inst.intensity)
    } else {
      setDuration(tab === 'emphasis' ? DEFAULT_EMPHASIS_DURATION : DEFAULT_DURATION)
      setEasing('easeOut')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objId, tab])

  const anim = useMemo(() => (activeObject ? readAnimation(activeObject) : {}), [activeObject, version])
  const presets = tab === 'emphasis' ? EMPHASIS_PRESETS : ENTER_EXIT_PRESETS
  const currentPreset = (tab === 'in' && anim.in?.preset) || (tab === 'out' && anim.out?.preset) || (tab === 'emphasis' && anim.emphasis?.preset) || 'none'
  const isText = isTextObject(activeObject)
  const currentTextPreset: TextRevealPreset = (anim.text && anim.text.preset) || 'none'

  const preview = useCallback(() => {
    if (!activeObject) return
    setTimelineOpen(true)
    const md = activeObject.metadata || {}
    const start = typeof md.timelineStart === 'number' ? md.timelineStart : 0
    const dur = typeof md.timelineDuration === 'number' ? md.timelineDuration : 5
    setCurrentTime(Math.max(0, start - 0.001))
    setTimeout(() => {
      setCurrentTime(start)
      play()
    }, 30)
    window.setTimeout(() => pause(), (dur + 0.2) * 1000)
  }, [activeObject, setTimelineOpen, setCurrentTime, play, pause])

  const applyPreset = useCallback(
    (presetId: string) => {
      if (!activeObject) return
      const category: PresetCategory = tab
      if (presetId === 'none') {
        setPreset(canvas, activeObject, category, null)
      } else {
        const def = presets.find(p => p.id === presetId)
        setPreset(canvas, activeObject, category, {
          preset: presetId,
          duration,
          easing: def?.easing || easing,
          direction,
          intensity,
        })
        if (def?.easing) setEasing(def.easing)
      }
      setVersion(v => v + 1)
      // Give a quick preview of what was applied.
      setTimeout(preview, 0)
    },
    [activeObject, canvas, tab, presets, duration, easing, direction, intensity, preview]
  )

  // When the user tweaks duration/easing/etc, update the active preset in place.
  const reapply = useCallback(
    (patch: { duration?: number; easing?: EasingName; direction?: PresetDirection; intensity?: number }) => {
      if (!activeObject || currentPreset === 'none') return
      const category: PresetCategory = tab
      setPreset(canvas, activeObject, category, {
        preset: currentPreset as string,
        duration: patch.duration ?? duration,
        easing: patch.easing ?? easing,
        direction: patch.direction ?? direction,
        intensity: patch.intensity ?? intensity,
      })
      setVersion(v => v + 1)
    },
    [activeObject, canvas, tab, currentPreset, duration, easing, direction, intensity]
  )

  const applyTextPreset = useCallback(
    (presetId: TextRevealPreset) => {
      if (!activeObject) return
      if (presetId === 'none') {
        setTextReveal(canvas, activeObject, null)
      } else {
        setTextReveal(canvas, activeObject, { preset: presetId, duration: 1.2, easing: 'linear' })
      }
      setVersion(v => v + 1)
      setTimeout(preview, 0)
    },
    [activeObject, canvas, preview]
  )

  const removeAll = useCallback(() => {
    if (!activeObject) return
    clearAnimation(canvas, activeObject)
    setVersion(v => v + 1)
  }, [activeObject, canvas])

  if (!activeObject) {
    return (
      <EmptyState />
    )
  }

  const selectedDef = presets.find(p => p.id === currentPreset)
  const showDirection = tab !== 'emphasis' && !!selectedDef?.directional

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Animate</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
          Add motion to the selected element. Plays on the timeline and bakes into exports.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '0 12px 10px' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: '8px 6px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              cursor: 'pointer',
              border: '1px solid ' + (tab === t.key ? '#6366f1' : '#e5e7eb'),
              background: tab === t.key ? '#eef2ff' : '#fff',
              color: tab === t.key ? '#4338ca' : '#374151',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Scrollbars>
          <div style={{ padding: '4px 12px 24px' }}>
            <div
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: '1fr 1fr 1fr',
              }}
            >
              {presets.map(p => {
                const selected = currentPreset === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    title={p.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 6px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: '1px solid ' + (selected ? '#6366f1' : '#e5e7eb'),
                      background: selected ? '#eef2ff' : '#fafafa',
                      transition: 'all .15s ease',
                    }}
                  >
                    <PresetGlyph id={p.id} active={selected} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: selected ? '#4338ca' : '#374151' }}>
                      {p.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {currentPreset !== 'none' && (
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Duration */}
                <Control label={`${tab === 'emphasis' ? 'Cycle' : 'Speed'}: ${duration.toFixed(2)}s`}>
                  <input
                    type="range"
                    min={0.1}
                    max={tab === 'emphasis' ? 4 : 3}
                    step={0.05}
                    value={duration}
                    onChange={e => {
                      const v = parseFloat(e.target.value)
                      setDuration(v)
                      reapply({ duration: v })
                    }}
                    style={{ width: '100%' }}
                  />
                </Control>

                {/* Easing */}
                {tab !== 'emphasis' && (
                  <Control label="Easing">
                    <select
                      value={easing}
                      onChange={e => {
                        const v = e.target.value as EasingName
                        setEasing(v)
                        reapply({ easing: v })
                      }}
                      style={selectStyle}
                    >
                      {EASING_OPTIONS.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Control>
                )}

                {/* Direction */}
                {showDirection && (
                  <Control label="Direction">
                    <div style={{ display: 'flex', gap: 6 }}>
                      {DIRECTIONS.map(d => (
                        <button
                          key={d.id}
                          onClick={() => {
                            setDirection(d.id)
                            reapply({ direction: d.id })
                          }}
                          style={{
                            width: 38,
                            height: 34,
                            borderRadius: 8,
                            fontSize: 16,
                            cursor: 'pointer',
                            border: '1px solid ' + (direction === d.id ? '#6366f1' : '#e5e7eb'),
                            background: direction === d.id ? '#eef2ff' : '#fff',
                            color: '#374151',
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </Control>
                )}

                {/* Intensity */}
                <Control label={`Intensity: ${Math.round(intensity * 100)}%`}>
                  <input
                    type="range"
                    min={0.2}
                    max={2}
                    step={0.1}
                    value={intensity}
                    onChange={e => {
                      const v = parseFloat(e.target.value)
                      setIntensity(v)
                      reapply({ intensity: v })
                    }}
                    style={{ width: '100%' }}
                  />
                </Control>
              </div>
            )}

            {/* Kinetic text (only for text elements) */}
            {isText && (
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Kinetic text</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                  Reveal the words or letters over time.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TEXT_PRESETS.map(tp => {
                    const selected = currentTextPreset === tp.id
                    return (
                      <button
                        key={tp.id}
                        onClick={() => applyTextPreset(tp.id)}
                        style={{
                          flex: 1,
                          padding: '10px 4px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid ' + (selected ? '#6366f1' : '#e5e7eb'),
                          background: selected ? '#eef2ff' : '#fafafa',
                          color: selected ? '#4338ca' : '#374151',
                        }}
                      >
                        {tp.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={preview} style={primaryBtn}>
                ▶ Preview
              </button>
              <button onClick={removeAll} style={ghostBtn}>
                Remove all
              </button>
            </div>
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 13,
  background: '#fff',
  color: '#111827',
}

const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: 8,
  border: 'none',
  background: '#6366f1',
  color: '#fff',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#6b7280',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 24,
        textAlign: 'center',
        color: '#6b7280',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 34 }}>✨</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Select an element to animate</div>
      <div style={{ fontSize: 12 }}>
        Click any text, image or shape on your design, then choose an entrance, loop or exit animation.
      </div>
    </div>
  )
}

/** Tiny visual glyph hinting at the motion of each preset. */
function PresetGlyph({ id, active }: { id: string; active: boolean }) {
  const color = active ? '#6366f1' : '#9ca3af'
  const dot = (style: React.CSSProperties) => (
    <div style={{ width: 18, height: 18, borderRadius: 5, background: color, ...style }} />
  )
  const arrows: Record<string, string> = {
    none: '∅',
    fade: '◐',
    rise: '↑',
    slide: '⇄',
    pop: '◉',
    zoom: '⊕',
    shrink: '⊝',
    spin: '↻',
    drop: '↧',
    bounce: '⤊',
    fly: '✈',
    tumble: '⤿',
    pulse: '♥',
    breathe: '◯',
    wobble: '〰',
    bob: '⇕',
    shake: '↔',
    flash: '✦',
    tada: '✶',
  }
  return (
    <div
      style={{
        width: 30,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color,
      }}
    >
      {arrows[id] || dot({})}
    </div>
  )
}

export default Panel
