import React, { useCallback, useEffect, useState } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { useActiveObject, useEditorContext } from '@nkyo/scenify-sdk'
import {
  Adjustments as AdjustmentsModel,
  DEFAULT_ADJUSTMENTS,
  DUOTONE_PRESETS,
  FILTER_PRESETS,
  applyAdjustments,
  readAdjustments,
} from '@/utils/filters'

type SliderKey = keyof Omit<AdjustmentsModel, 'preset' | 'duotone'>

interface SliderDef {
  key: SliderKey
  label: string
  min: number
  max: number
}

const GROUPS: { title: string; sliders: SliderDef[] }[] = [
  {
    title: 'Light',
    sliders: [
      { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
      { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
      { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
    ],
  },
  {
    title: 'Color',
    sliders: [
      { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
      { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
      { key: 'temperature', label: 'Warmth', min: -100, max: 100 },
      { key: 'tint', label: 'Tint', min: -100, max: 100 },
      { key: 'hue', label: 'Hue', min: -180, max: 180 },
    ],
  },
  {
    title: 'Detail & effects',
    sliders: [
      { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
      { key: 'blur', label: 'Blur', min: 0, max: 100 },
      { key: 'noise', label: 'Grain', min: 0, max: 100 },
      { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
    ],
  },
]

function Panel() {
  const hookActive = useActiveObject<any>()
  const { canvas, activeObject: ctxActive } = useEditorContext() as any
  const activeObject = hookActive || ctxActive || (canvas && canvas.getActiveObject && canvas.getActiveObject()) || null
  const [adj, setAdj] = useState<AdjustmentsModel>(DEFAULT_ADJUSTMENTS)

  const objId = activeObject ? activeObject.id || activeObject.metadata?.id : null
  const filterable = !!activeObject && typeof activeObject.applyFilters === 'function'

  useEffect(() => {
    if (activeObject) setAdj(readAdjustments(activeObject))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objId])

  const update = useCallback(
    (patch: Partial<AdjustmentsModel>) => {
      if (!activeObject) return
      const next = { ...adj, ...patch }
      setAdj(next)
      applyAdjustments(canvas, activeObject, next)
    },
    [activeObject, canvas, adj]
  )

  const resetSlider = useCallback(
    (key: SliderKey) => update({ [key]: DEFAULT_ADJUSTMENTS[key] } as Partial<AdjustmentsModel>),
    [update]
  )

  const reset = useCallback(() => {
    if (!activeObject) return
    setAdj(DEFAULT_ADJUSTMENTS)
    applyAdjustments(canvas, activeObject, DEFAULT_ADJUSTMENTS)
  }, [activeObject, canvas])

  if (!activeObject || !filterable) return <EmptyState />

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#181410' }}>Adjust</div>
        <div style={{ fontSize: 12, color: '#736d5c', marginTop: 2 }}>Filters &amp; color for the selected media.</div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Scrollbars>
          <div style={{ padding: '4px 16px 24px' }}>
            <SectionTitle>Filters</SectionTitle>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 1fr' }}>
              {FILTER_PRESETS.map(p => {
                const selected = adj.preset === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => update({ preset: p.id })}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid ' + (selected ? '#d8401c' : '#e6e0d2'),
                      background: selected ? '#fbe8e0' : '#fbf9f4',
                      color: selected ? '#b8340f' : '#3a352b',
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            {GROUPS.map(group => (
              <div key={group.title}>
                <div style={{ height: 1, background: '#f3efe4', margin: '18px 0 16px' }} />
                <SectionTitle>{group.title}</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {group.sliders.map(s => (
                    <Slider
                      key={s.key}
                      def={s}
                      value={adj[s.key]}
                      onChange={v => update({ [s.key]: v } as Partial<AdjustmentsModel>)}
                      onReset={() => resetSlider(s.key)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div style={{ height: 1, background: '#f3efe4', margin: '18px 0 16px' }} />
            <SectionTitle>Duotone</SectionTitle>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
              {DUOTONE_PRESETS.map(d => {
                const selected = adj.duotone === d.id
                return (
                  <button
                    key={d.id}
                    onClick={() => update({ duotone: d.id })}
                    title={d.label}
                    style={{
                      height: 46,
                      borderRadius: 8,
                      cursor: 'pointer',
                      padding: 0,
                      overflow: 'hidden',
                      position: 'relative',
                      border: '2px solid ' + (selected ? '#d8401c' : 'transparent'),
                      boxShadow: selected ? '0 0 0 1px #d8401c' : 'inset 0 0 0 1px #e5e7eb',
                      background:
                        d.id === 'none'
                          ? '#ffffff'
                          : `linear-gradient(135deg, ${d.dark} 0%, ${d.light} 100%)`,
                    }}
                  >
                    {d.id === 'none' && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#736d5c' }}>Off</span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={reset}
              style={{
                marginTop: 22,
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid #e6e0d2',
                background: '#fff',
                color: '#736d5c',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Reset all
            </button>
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#a39d8c', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function Slider({
  def,
  value,
  onChange,
  onReset,
}: {
  def: SliderDef
  value: number
  onChange: (v: number) => void
  onReset: () => void
}) {
  const isDefault = value === DEFAULT_ADJUSTMENTS[def.key]
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 600,
          color: '#3a352b',
          marginBottom: 6,
        }}
      >
        <span>{def.label}</span>
        <span
          title="Double-click to reset"
          onDoubleClick={onReset}
          style={{ color: isDefault ? '#a39d8c' : '#b8340f', cursor: 'pointer', minWidth: 28, textAlign: 'right' }}
        >
          {Math.round(value)}
        </span>
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={1}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        onDoubleClick={onReset}
        style={{ width: '100%', accentColor: '#d8401c' }}
      />
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
        color: '#736d5c',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 34 }}>🎚️</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#3a352b' }}>Select an image or video</div>
      <div style={{ fontSize: 12 }}>Filters and color adjustments apply to images and video clips.</div>
    </div>
  )
}

export default Panel
