import React, { useCallback, useEffect, useState } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { useActiveObject, useEditorContext } from '@nkyo/scenify-sdk'
import {
  Adjustments as AdjustmentsModel,
  DEFAULT_ADJUSTMENTS,
  FILTER_PRESETS,
  applyAdjustments,
  readAdjustments,
} from '@/utils/filters'

type SliderKey = 'brightness' | 'contrast' | 'saturation' | 'temperature' | 'blur'

const SLIDERS: { key: SliderKey; label: string; min: number; max: number }[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'blur', label: 'Blur', min: 0, max: 100 },
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

  const reset = useCallback(() => {
    if (!activeObject) return
    setAdj(DEFAULT_ADJUSTMENTS)
    applyAdjustments(canvas, activeObject, DEFAULT_ADJUSTMENTS)
  }, [activeObject, canvas])

  if (!activeObject || !filterable) {
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
        <div style={{ fontSize: 34 }}>🎚️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Select an image or video</div>
        <div style={{ fontSize: 12 }}>Filters and color adjustments apply to images and video clips.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Adjust</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Filters &amp; color for the selected media.</div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Scrollbars>
          <div style={{ padding: '4px 16px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Filters</div>
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
                      border: '1px solid ' + (selected ? '#6366f1' : '#e5e7eb'),
                      background: selected ? '#eef2ff' : '#fafafa',
                      color: selected ? '#4338ca' : '#374151',
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            <div style={{ height: 1, background: '#f1f5f9', margin: '18px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SLIDERS.map(s => (
                <div key={s.key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 6,
                    }}
                  >
                    <span>{s.label}</span>
                    <span style={{ color: '#6b7280' }}>{Math.round(adj[s.key])}</span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={1}
                    value={adj[s.key]}
                    onChange={e => update({ [s.key]: parseFloat(e.target.value) } as Partial<AdjustmentsModel>)}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              style={{
                marginTop: 20,
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#6b7280',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

export default Panel
