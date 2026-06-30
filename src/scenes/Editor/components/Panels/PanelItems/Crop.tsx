import React, { useCallback, useEffect, useState } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2 } from 'lucide-react'
import { useActiveObject, useEditorContext } from '@nkyo/scenify-sdk'
import {
  CropInsets,
  DEFAULT_CROP,
  applyCrop,
  cropToAspect,
  flip,
  isImageObject,
  readCrop,
  readGeometry,
  resetCrop,
  resetGeometry,
  rotate90,
  setStraighten,
} from '@/utils/imageEdits'

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '2:3', label: '2:3', ratio: 2 / 3 },
]

type InsetKey = keyof CropInsets

const INSET_SLIDERS: { key: InsetKey; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
]

function Panel() {
  const hookActive = useActiveObject<any>()
  const { canvas, activeObject: ctxActive } = useEditorContext() as any
  const activeObject = hookActive || ctxActive || (canvas && canvas.getActiveObject && canvas.getActiveObject()) || null
  const objId = activeObject ? activeObject.id || activeObject.metadata?.id : null
  const editable = isImageObject(activeObject)

  const [crop, setCrop] = useState<CropInsets>(DEFAULT_CROP)
  const [straighten, setStraightenState] = useState(0)
  const [aspect, setAspect] = useState('free')

  useEffect(() => {
    if (editable) {
      setCrop(readCrop(activeObject))
      setStraightenState(readGeometry(activeObject).straighten)
      setAspect('free')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objId])

  const updateCrop = useCallback(
    (patch: Partial<CropInsets>) => {
      if (!editable) return
      const next = { ...crop, ...patch }
      setCrop(next)
      setAspect('free')
      applyCrop(canvas, activeObject, next)
    },
    [crop, editable, canvas, activeObject]
  )

  const pickAspect = useCallback(
    (a: { id: string; ratio: number | null }) => {
      if (!editable) return
      setAspect(a.id)
      cropToAspect(canvas, activeObject, a.ratio)
      setCrop(readCrop(activeObject))
    },
    [editable, canvas, activeObject]
  )

  const onStraighten = useCallback(
    (deg: number) => {
      if (!editable) return
      setStraightenState(deg)
      setStraighten(canvas, activeObject, deg)
    },
    [editable, canvas, activeObject]
  )

  const resetAll = useCallback(() => {
    if (!editable) return
    resetCrop(canvas, activeObject)
    resetGeometry(canvas, activeObject)
    setCrop(DEFAULT_CROP)
    setStraightenState(0)
    setAspect('free')
  }, [editable, canvas, activeObject])

  if (!editable) {
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
        <div style={{ fontSize: 34 }}>✂️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Select an image</div>
        <div style={{ fontSize: 12 }}>Crop, rotate and flip apply to images.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Crop &amp; rotate</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Trim, straighten and flip the selected image.</div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Scrollbars>
          <div style={{ padding: '4px 16px 24px' }}>
            <SectionTitle>Aspect ratio</SectionTitle>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
              {ASPECTS.map(a => {
                const selected = aspect === a.id
                return (
                  <button
                    key={a.id}
                    onClick={() => pickAspect(a)}
                    style={{
                      padding: '9px 4px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid ' + (selected ? '#6366f1' : '#e5e7eb'),
                      background: selected ? '#eef2ff' : '#fafafa',
                      color: selected ? '#4338ca' : '#374151',
                    }}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>

            <Divider />
            <SectionTitle>Crop edges</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {INSET_SLIDERS.map(s => (
                <div key={s.key}>
                  <div style={labelRow}>
                    <span>{s.label}</span>
                    <span style={{ color: '#6b7280' }}>{Math.round(crop[s.key] * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={1}
                    value={Math.round(crop[s.key] * 100)}
                    onChange={e => updateCrop({ [s.key]: parseFloat(e.target.value) / 100 } as Partial<CropInsets>)}
                    style={{ width: '100%', accentColor: '#6366f1' }}
                  />
                </div>
              ))}
            </div>

            <Divider />
            <SectionTitle>Straighten</SectionTitle>
            <div style={labelRow}>
              <span>Angle</span>
              <span style={{ color: '#6b7280' }}>{Math.round(straighten)}°</span>
            </div>
            <input
              type="range"
              min={-45}
              max={45}
              step={1}
              value={straighten}
              onChange={e => onStraighten(parseFloat(e.target.value))}
              onDoubleClick={() => onStraighten(0)}
              style={{ width: '100%', accentColor: '#6366f1' }}
            />

            <Divider />
            <SectionTitle>Rotate &amp; flip</SectionTitle>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
              <IconBtn label="Rotate left" onClick={() => rotate90(canvas, activeObject, -1)}>
                <RotateCcw size={16} />
              </IconBtn>
              <IconBtn label="Rotate right" onClick={() => rotate90(canvas, activeObject, 1)}>
                <RotateCw size={16} />
              </IconBtn>
              <IconBtn label="Flip horizontal" onClick={() => flip(canvas, activeObject, 'x')}>
                <FlipHorizontal2 size={16} />
              </IconBtn>
              <IconBtn label="Flip vertical" onClick={() => flip(canvas, activeObject, 'y')}>
                <FlipVertical2 size={16} />
              </IconBtn>
            </div>

            <button
              onClick={resetAll}
              style={{
                marginTop: 22,
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
              Reset crop &amp; rotation
            </button>
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

const labelRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#f1f5f9', margin: '18px 0 16px' }} />
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        background: '#fafafa',
        color: '#374151',
        fontWeight: 600,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {children}
      <span>{label.replace('Rotate ', '').replace('Flip ', '')}</span>
    </button>
  )
}

export default Panel
