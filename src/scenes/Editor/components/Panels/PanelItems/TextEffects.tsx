import { useEffect, useMemo, useState } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { X } from 'lucide-react'
import { fabric } from 'fabric'
import useAppContext from '@/hooks/useAppContext'
import { color, font } from '@/theme/tokens'
import { log } from '@/lib/logger'
import {
  DEFAULT_PARAMS,
  EFFECT_CONTROLS,
  TextEffectParams,
  TextEffectState,
  TextEffectType,
  effectPreviewStyle,
  effectProps,
} from '@/utils/textEffects'
import { CURVE_MAX, CURVE_MIN, installCurvedText, readCurveAmount, setTextCurve } from '@/utils/curveText'
import { PanelBody, PanelHeader, PanelRoot, SectionLabel, Tile, EmptyNote } from '../PanelKit'

// Curved textboxes rebuild their path whenever fabric re-measures them (typing,
// font changes, reload). Installed at import time, like elementEffects, so it
// is active before any design loads (PanelItems are imported eagerly).
installCurvedText(fabric)

const EFFECTS: { type: TextEffectType; label: string }[] = [
  { type: 'none', label: 'None' },
  { type: 'shadow', label: 'Shadow' },
  { type: 'lift', label: 'Lift' },
  { type: 'hollow', label: 'Hollow' },
  { type: 'splice', label: 'Splice' },
  { type: 'echo', label: 'Echo' },
  { type: 'outline', label: 'Outline' },
  { type: 'neon', label: 'Neon' },
  { type: 'background', label: 'Background' },
]

const CONTROL_LABEL: Record<keyof TextEffectParams, string> = {
  offset: 'Offset',
  direction: 'Direction',
  blur: 'Blur',
  transparency: 'Transparency',
  intensity: 'Thickness',
  color: 'Color',
}

const TEXT_TYPES = ['textbox', 'text', 'i-text', 'StaticText', 'DynamicText']

const Grid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
})

const Preview = styled('div', ({ $dark }: { $dark?: boolean }) => ({
  width: '100%',
  height: '54px',
  borderRadius: '4px',
  background: $dark ? color.ink : color.paper,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: font.serif,
  fontWeight: 800,
  fontSize: '26px',
}))

const Row = styled('label', {
  display: 'grid',
  gridTemplateColumns: '84px 1fr 34px',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12.5px',
  color: color.ink2,
  marginBottom: '10px',
})

function textTargets(obj: any): any[] {
  if (!obj) return []
  if (obj.type === 'activeSelection' && obj.getObjects)
    return obj.getObjects().filter((o: any) => TEXT_TYPES.includes(o.type))
  return TEXT_TYPES.includes(obj.type) ? [obj] : []
}

function readState(obj: any): TextEffectState {
  const saved = obj?.metadata?.textEffect as TextEffectState | undefined
  if (saved?.type) return saved
  const fill = typeof obj?.fill === 'string' ? obj.fill : '#000000'
  return { type: 'none', params: DEFAULT_PARAMS.none, baseFill: fill }
}

function TextEffects() {
  const editor = useEditor() as any
  const { activeObject } = useEditorContext() as any
  const { setActiveSubMenu } = useAppContext()
  const targets = useMemo(() => textTargets(activeObject), [activeObject])
  const [state, setState] = useState<TextEffectState>(() => readState(targets[0]))

  const [curve, setCurve] = useState(() => readCurveAmount(targets[0]))

  useEffect(() => {
    setState(readState(targets[0]))
    setCurve(readCurveAmount(targets[0]))
  }, [targets])

  const canvas = editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas

  const apply = (next: TextEffectState, commit: boolean) => {
    setState(next)
    try {
      targets.forEach(obj => {
        const prev = readState(obj)
        // Each object keeps its own base fill so multi-select doesn't recolor everything.
        const own = { ...next, baseFill: prev.baseFill }
        obj.set(effectProps(own.type, own.params, own.baseFill, obj.fontSize || 32))
        obj.set('metadata', { ...(obj.metadata || {}), textEffect: own })
        obj.set('dirty', true)
      })
      canvas?.requestRenderAll()
      if (commit && targets[0]) canvas?.fire('object:modified', { target: targets[0] })
    } catch (err) {
      log.warn('textEffects', 'failed to apply text effect', err)
    }
  }

  const applyCurve = (value: number, commit: boolean) => {
    setCurve(value)
    try {
      targets.forEach(obj => setTextCurve(obj, value))
      // a multi-selection's box must follow its members' new sizes
      if (activeObject?.type === 'activeSelection' && activeObject.addWithUpdate) activeObject.addWithUpdate()
      canvas?.requestRenderAll()
      if (commit && targets[0]) canvas?.fire('object:modified', { target: targets[0] })
    } catch (err) {
      log.warn('textEffects', 'failed to apply text curve', err)
    }
  }

  const hasLineBreaks = targets.some(obj => typeof obj.text === 'string' && obj.text.includes('\n'))

  const pick = (type: TextEffectType) => {
    const params = type === state.type ? state.params : DEFAULT_PARAMS[type]
    apply({ ...state, type, params }, true)
  }

  const setParam = (key: keyof TextEffectParams, value: number | string, commit: boolean) => {
    apply({ ...state, params: { ...state.params, [key]: value } }, commit)
  }

  return (
    <PanelRoot>
      <PanelHeader
        title="Effects"
        subtitle="Styles that stay editable — change the text any time."
        action={
          <button
            type="button"
            aria-label="Close effects"
            onClick={() => setActiveSubMenu(null as any)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: color.muted,
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        }
      />
      <PanelBody>
        {targets.length === 0 ? (
          <EmptyNote>Select a text box to apply effects.</EmptyNote>
        ) : (
          <>
            <Grid>
              {EFFECTS.map(e => (
                <Tile
                  key={e.type}
                  type="button"
                  $active={state.type === e.type}
                  onClick={() => pick(e.type)}
                  aria-pressed={state.type === e.type}
                >
                  <Preview $dark={e.type === 'neon'}>
                    <span
                      style={effectPreviewStyle(e.type, e.type === 'neon' ? '#ffffff' : color.ink) as any}
                    >
                      Ag
                    </span>
                  </Preview>
                  {e.label}
                </Tile>
              ))}
            </Grid>

            {EFFECT_CONTROLS[state.type].length > 0 && <SectionLabel>Adjust</SectionLabel>}
            {EFFECT_CONTROLS[state.type].map(key =>
              key === 'color' ? (
                <Row key={key}>
                  {CONTROL_LABEL[key]}
                  <input
                    type="color"
                    value={state.params.color}
                    onChange={e => setParam('color', e.target.value, false)}
                    onBlur={e => setParam('color', e.target.value, true)}
                    style={{
                      width: '100%',
                      height: 30,
                      border: `1px solid ${color.line2}`,
                      borderRadius: 4,
                      padding: 2,
                      background: color.white,
                    }}
                  />
                  <span />
                </Row>
              ) : (
                <Row key={key}>
                  {key === 'intensity' && state.type === 'neon' ? 'Intensity' : CONTROL_LABEL[key]}
                  <input
                    type="range"
                    min={key === 'direction' ? -180 : 0}
                    max={key === 'direction' ? 180 : 100}
                    value={state.params[key] as number}
                    onChange={e => setParam(key, Number(e.target.value), false)}
                    onMouseUp={e => setParam(key, Number((e.target as HTMLInputElement).value), true)}
                    onKeyUp={e => setParam(key, Number((e.target as HTMLInputElement).value), true)}
                    style={{ width: '100%', accentColor: color.accent }}
                  />
                  <span style={{ fontFamily: font.mono, fontSize: 11, textAlign: 'right' }}>
                    {state.params[key]}
                  </span>
                </Row>
              )
            )}

            <SectionLabel>Curve</SectionLabel>
            <Row>
              Curve
              <input
                type="range"
                min={CURVE_MIN}
                max={CURVE_MAX}
                step={1}
                value={curve}
                aria-label="Curve"
                onChange={e => applyCurve(Number(e.target.value), false)}
                onMouseUp={e => applyCurve(Number((e.target as HTMLInputElement).value), true)}
                onTouchEnd={e => applyCurve(Number((e.target as HTMLInputElement).value), true)}
                onKeyUp={e => applyCurve(Number((e.target as HTMLInputElement).value), true)}
                onDoubleClick={() => applyCurve(0, true)}
                style={{ width: '100%', accentColor: color.accent }}
              />
              <span style={{ fontFamily: font.mono, fontSize: 11, textAlign: 'right' }}>{curve}</span>
            </Row>
            {curve !== 0 && hasLineBreaks && (
              <div style={{ fontSize: 12, lineHeight: 1.5, color: color.muted, marginTop: -2 }}>
                Line breaks overlap on a curve, since all lines follow one arc. Curve works best on a single
                line.
              </div>
            )}
          </>
        )}
      </PanelBody>
    </PanelRoot>
  )
}

export default TextEffects
