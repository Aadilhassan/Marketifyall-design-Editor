import { useEffect, useMemo, useState } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { fabric } from 'fabric'
import { styled } from 'baseui'
import { X } from 'lucide-react'
import useAppContext from '@/hooks/useAppContext'
import { color, font } from '@/theme/tokens'
import { log } from '@/lib/logger'
import { isImageObject, isVideoObject } from '@/utils/imageEdits'
import {
  ElementEffectsState,
  FRAMES,
  FrameShape,
  SHADOW_PRESETS,
  SHADOW_PRESET_ORDER,
  ShadowParams,
  ShadowPreset,
  borderWeight,
  borderWidth,
  buildClipPath,
  hasSavedState,
  readEffectsState,
  scaleFramePath,
  shadowOptions,
  writeEffectsState,
} from '@/utils/elementEffects'
import { PanelBody, PanelHeader, PanelRoot, SectionLabel, Tile, EmptyNote } from '../PanelKit'

type Kind = 'photo' | 'video' | 'group' | 'shape'

const TEXT_TYPES = ['textbox', 'text', 'i-text', 'StaticText', 'DynamicText']
/** metadata key holding a vector group's child strokes from before an outline was added */
const ORIGINAL_STROKES = 'elementEffectsOriginalStrokes'

const SHADOW_LABEL: Record<ShadowPreset, string> = { none: 'None', drop: 'Drop', soft: 'Soft', glow: 'Glow', hard: 'Hard' }
const SHADOW_CSS: Record<ShadowPreset, string> = {
  none: 'none',
  drop: '4px 4px 6px rgba(0,0,0,0.45)',
  soft: '0 4px 12px rgba(0,0,0,0.3)',
  glow: '0 0 10px #d8401c',
  hard: `4px 4px 0 ${color.ink}`,
}

const SHADOW_SLIDERS: { key: keyof Omit<ShadowParams, 'color'>; label: string; min: number; max: number }[] = [
  { key: 'offset', label: 'Offset', min: 0, max: 100 },
  { key: 'direction', label: 'Direction', min: -180, max: 180 },
  { key: 'blur', label: 'Blur', min: 0, max: 100 },
  { key: 'transparency', label: 'Transparency', min: 0, max: 100 },
]

const Grid = styled('div', ({ $cols = 3 }: { $cols?: number }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${$cols}, 1fr)`,
  gap: '8px',
}))

const Swatch = styled('div', {
  width: '100%',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const Row = styled('label', {
  display: 'grid',
  gridTemplateColumns: '84px 1fr 34px',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12.5px',
  color: color.ink2,
  marginBottom: '10px',
})

const Note = styled('p', {
  margin: '0 0 10px',
  fontSize: '11.5px',
  lineHeight: 1.45,
  color: color.muted,
})

function kindOf(obj: any): Kind | null {
  if (!obj || obj.type === 'activeSelection' || TEXT_TYPES.includes(obj.type) || obj.type === 'Background' || obj.type === 'Frame') return null
  if (isImageObject(obj)) return isVideoObject(obj) ? 'video' : 'photo'
  if (Array.isArray(obj._objects)) return 'group'
  return 'shape'
}

function readState(obj: any, kind: Kind | null): ElementEffectsState {
  const state = readEffectsState(obj?.metadata)
  if (kind === 'shape') {
    // Plain shapes: the object's own stroke is the truth (the Shape toolbar edits it too).
    state.outline = { width: obj.stroke ? Math.round(obj.strokeWidth || 0) : 0, color: typeof obj.stroke === 'string' && obj.stroke ? obj.stroke : state.outline.color }
  }
  if (kind === 'photo' && !hasSavedState(obj?.metadata) && obj.stroke && obj.strokeWidth) {
    state.border = { weight: borderWeight(obj.strokeWidth, obj.width || 1, obj.height || 1), color: obj.stroke }
  }
  return state
}

function applyOutline(obj: any, kind: Kind, outline: ElementEffectsState['outline']) {
  if (kind === 'shape') {
    if (outline.width > 0) obj.set({ stroke: outline.color, strokeWidth: outline.width, strokeUniform: true })
    else obj.set({ strokeWidth: 0 })
    return
  }
  const children: any[] = obj.getObjects ? obj.getObjects() : obj._objects || []
  const saved = obj.metadata?.[ORIGINAL_STROKES]
  if (outline.width > 0) {
    if (!saved) {
      const originals = children.map(c => ({ stroke: c.stroke ?? null, strokeWidth: c.strokeWidth ?? 0, strokeUniform: !!c.strokeUniform }))
      obj.set('metadata', { ...(obj.metadata || {}), [ORIGINAL_STROKES]: originals })
    }
    children.forEach(c => c.set({ stroke: outline.color, strokeWidth: outline.width, strokeUniform: true, dirty: true }))
  } else if (saved) {
    children.forEach((c, i) => c.set({ ...(saved[i] || { stroke: null, strokeWidth: 0, strokeUniform: false }), dirty: true }))
    const rest = { ...(obj.metadata || {}) }
    delete rest[ORIGINAL_STROKES]
    obj.set('metadata', rest)
  }
}

function ElementEffects() {
  const editor = useEditor() as any
  const { activeObject } = useEditorContext() as any
  const { setActiveSubMenu } = useAppContext()
  const kind = useMemo(() => kindOf(activeObject), [activeObject])
  const [state, setState] = useState<ElementEffectsState>(() => readState(activeObject, kind))

  useEffect(() => {
    setState(readState(activeObject, kind))
  }, [activeObject, kind])

  const canvas = editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas

  const apply = (next: ElementEffectsState, commit: boolean) => {
    setState(next)
    const obj = activeObject
    if (!obj || !kind) return
    try {
      const w = obj.width || 1
      const h = obj.height || 1
      const shadow = shadowOptions(next.shadow.preset, next.shadow.params, Math.max(w, h))
      obj.set('shadow', shadow ? new fabric.Shadow(shadow) : null)

      if (kind === 'photo') {
        obj.set('clipPath', buildClipPath(next, w, h) || undefined)
        if (next.border.weight > 0) obj.set({ stroke: next.border.color, strokeWidth: borderWidth(next.border.weight, w, h), strokeUniform: false })
        else obj.set({ strokeWidth: 0 })
      }
      if (kind === 'group' || kind === 'shape') applyOutline(obj, kind, next.outline)

      obj.set('metadata', writeEffectsState(obj.metadata, next))
      obj.set('dirty', true)
      canvas?.requestRenderAll()
      if (commit) canvas?.fire('object:modified', { target: obj })
    } catch (err) {
      log.warn('elementEffects', 'failed to apply element effect', err)
    }
  }

  const pickShadow = (preset: ShadowPreset) => {
    const params = preset === state.shadow.preset ? state.shadow.params : SHADOW_PRESETS[preset]
    apply({ ...state, shadow: { preset, params } }, true)
  }
  const setShadowParam = (key: keyof ShadowParams, value: number | string, commit: boolean) => {
    apply({ ...state, shadow: { ...state.shadow, params: { ...state.shadow.params, [key]: value } } }, commit)
  }
  // Frames and corner rounding are both masks — choosing one resets the other.
  const pickFrame = (frame: FrameShape) => apply({ ...state, frame, radius: 0 }, true)
  const setRadius = (radius: number, commit: boolean) => apply({ ...state, radius, frame: 'none' }, commit)
  const setBorder = (patch: Partial<ElementEffectsState['border']>, commit: boolean) =>
    apply({ ...state, border: { ...state.border, ...patch } }, commit)
  const setOutline = (patch: Partial<ElementEffectsState['outline']>, commit: boolean) =>
    apply({ ...state, outline: { ...state.outline, ...patch } }, commit)

  const slider = (label: string, value: number, min: number, max: number, onValue: (v: number, commit: boolean) => void) => (
    <Row key={label}>
      {label}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onValue(Number(e.target.value), false)}
        onMouseUp={e => onValue(Number((e.target as HTMLInputElement).value), true)}
        onKeyUp={e => onValue(Number((e.target as HTMLInputElement).value), true)}
        style={{ width: '100%', accentColor: color.accent }}
      />
      <span style={{ fontFamily: font.mono, fontSize: 11, textAlign: 'right' }}>{value}</span>
    </Row>
  )

  const colorInput = (label: string, value: string, onValue: (v: string, commit: boolean) => void) => (
    <Row key={label}>
      {label}
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
        onChange={e => onValue(e.target.value, false)}
        onBlur={e => onValue(e.target.value, true)}
        style={{ width: '100%', height: 30, border: `1px solid ${color.line2}`, borderRadius: 4, padding: 2, background: color.white }}
      />
      <span />
    </Row>
  )

  const subtitle =
    kind === 'photo'
      ? 'Shadows, frames, rounded corners and borders — all stay editable.'
      : kind === 'video'
      ? 'Shadows for video clips. Frames and borders are for photos.'
      : 'Shadows and outlines that stay editable.'

  return (
    <PanelRoot>
      <PanelHeader
        title="Effects"
        subtitle={kind ? subtitle : undefined}
        action={
          <button
            type="button"
            aria-label="Close effects"
            onClick={() => setActiveSubMenu(null as any)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: color.muted, padding: 4 }}
          >
            <X size={18} />
          </button>
        }
      />
      <PanelBody>
        {!kind ? (
          <EmptyNote>
            {activeObject?.type === 'activeSelection'
              ? 'Select a single element to style it.'
              : 'Select a photo, icon or shape to apply effects.'}
          </EmptyNote>
        ) : (
          <>
            <SectionLabel>Shadow</SectionLabel>
            <Grid $cols={5}>
              {SHADOW_PRESET_ORDER.map(p => (
                <Tile key={p} type="button" $active={state.shadow.preset === p} onClick={() => pickShadow(p)} aria-pressed={state.shadow.preset === p}>
                  <Swatch>
                    <div style={{ width: 22, height: 22, borderRadius: 3, background: p === 'glow' ? '#ffffff' : color.paper2, border: `1px solid ${color.line2}`, boxShadow: SHADOW_CSS[p] }} />
                  </Swatch>
                  {SHADOW_LABEL[p]}
                </Tile>
              ))}
            </Grid>
            {state.shadow.preset !== 'none' && (
              <div style={{ marginTop: 14 }}>
                {SHADOW_SLIDERS.map(s =>
                  slider(s.label, state.shadow.params[s.key], s.min, s.max, (v, commit) => setShadowParam(s.key, v, commit)),
                )}
                {colorInput('Color', state.shadow.params.color, (v, commit) => setShadowParam('color', v, commit))}
              </div>
            )}

            {kind === 'photo' && (
              <>
                <SectionLabel>Frame</SectionLabel>
                <Grid $cols={3}>
                  {FRAMES.map(f => (
                    <Tile key={f.id} type="button" $active={state.frame === f.id} onClick={() => pickFrame(f.id)} aria-pressed={state.frame === f.id}>
                      <Swatch>
                        {f.id === 'none' ? (
                          <div style={{ width: 34, height: 34, border: `1px dashed ${color.line2}` }} />
                        ) : (
                          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
                            <path d={scaleFramePath(f.d, 34, 34)} fill={color.ink2} />
                          </svg>
                        )}
                      </Swatch>
                      {f.label}
                    </Tile>
                  ))}
                </Grid>

                <SectionLabel>Corners</SectionLabel>
                {slider('Rounding', state.radius, 0, 100, setRadius)}

                <SectionLabel>Border</SectionLabel>
                {slider('Weight', state.border.weight, 0, 100, (v, commit) => setBorder({ weight: v }, commit))}
                {colorInput('Color', state.border.color, (v, commit) => setBorder({ color: v }, commit))}
              </>
            )}

            {(kind === 'group' || kind === 'shape') && (
              <>
                <SectionLabel>Outline</SectionLabel>
                {slider('Width', state.outline.width, 0, 30, (v, commit) => setOutline({ width: v }, commit))}
                {colorInput('Color', state.outline.color, (v, commit) => setOutline({ color: v }, commit))}
                {kind === 'group' && <Note>Applies to every part of the icon. Set width to 0 to restore its original strokes.</Note>}
              </>
            )}
          </>
        )}
      </PanelBody>
    </PanelRoot>
  )
}

export default ElementEffects
