/**
 * Canva-style text effects expressed as plain fabric.Textbox properties
 * (shadow / stroke / paintFirst / backgroundColor / fill), so they serialise
 * with the design and need no custom rendering. The text's own fill before any
 * effect is remembered in metadata.textEffect.baseFill so switching effects or
 * choosing "none" restores it.
 */

export type TextEffectType = 'none' | 'shadow' | 'lift' | 'hollow' | 'splice' | 'echo' | 'outline' | 'neon' | 'background'

export interface TextEffectParams {
  /** 0-100 */
  offset: number
  /** degrees, 0 = right, 90 = down */
  direction: number
  /** 0-100 */
  blur: number
  /** 0-100 */
  transparency: number
  /** 0-100, stroke thickness / glow strength depending on effect */
  intensity: number
  color: string
}

export interface TextEffectState {
  type: TextEffectType
  params: TextEffectParams
  baseFill: string
}

export const DEFAULT_PARAMS: Record<TextEffectType, TextEffectParams> = {
  none: { offset: 0, direction: 0, blur: 0, transparency: 0, intensity: 0, color: '#000000' },
  shadow: { offset: 50, direction: 45, blur: 20, transparency: 60, intensity: 0, color: '#000000' },
  lift: { offset: 0, direction: 90, blur: 0, transparency: 0, intensity: 50, color: '#000000' },
  hollow: { offset: 0, direction: 0, blur: 0, transparency: 0, intensity: 40, color: '#000000' },
  splice: { offset: 50, direction: 45, blur: 0, transparency: 0, intensity: 40, color: '#e8a33d' },
  echo: { offset: 50, direction: 45, blur: 0, transparency: 50, intensity: 0, color: '#000000' },
  outline: { offset: 0, direction: 0, blur: 0, transparency: 0, intensity: 40, color: '#181410' },
  neon: { offset: 0, direction: 0, blur: 0, transparency: 0, intensity: 60, color: '#ff4fd8' },
  background: { offset: 0, direction: 0, blur: 0, transparency: 0, intensity: 0, color: '#e8a33d' },
}

/** Which sliders/pickers each effect exposes in the panel. */
export const EFFECT_CONTROLS: Record<TextEffectType, (keyof TextEffectParams)[]> = {
  none: [],
  shadow: ['offset', 'direction', 'blur', 'transparency', 'color'],
  lift: ['intensity'],
  hollow: ['intensity'],
  splice: ['intensity', 'offset', 'direction', 'color'],
  echo: ['offset', 'direction', 'transparency'],
  outline: ['intensity', 'color'],
  neon: ['intensity', 'color'],
  background: ['color'],
}

export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return `rgba(0,0,0,${alpha})`
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function offsetXY(params: TextEffectParams, fontSize: number) {
  // offset 100 ≈ 25% of the font size, like Canva's scale
  const dist = (params.offset / 100) * fontSize * 0.25
  const rad = (params.direction * Math.PI) / 180
  return { x: Math.round(Math.cos(rad) * dist * 10) / 10, y: Math.round(Math.sin(rad) * dist * 10) / 10 }
}

/** Fabric properties to set for an effect. `fontSize` scales distances. */
export function effectProps(type: TextEffectType, params: TextEffectParams, baseFill: string, fontSize: number) {
  const reset = {
    shadow: null as any,
    stroke: null as string | null,
    strokeWidth: 0,
    paintFirst: 'fill',
    backgroundColor: '',
    fill: baseFill,
  }
  // thickness 100 ≈ 12% of the font size; Canva-like default (40) ≈ 2px on 32px text
  const stroke = Math.max(1, (params.intensity / 100) * fontSize * 0.12) + 0.5
  const { x, y } = offsetXY(params, fontSize)

  switch (type) {
    case 'shadow':
      return {
        ...reset,
        shadow: {
          color: hexToRgba(params.color, 1 - params.transparency / 100),
          blur: (params.blur / 100) * fontSize * 0.5,
          offsetX: x,
          offsetY: y,
        },
      }
    case 'lift':
      return {
        ...reset,
        shadow: {
          color: hexToRgba('#000000', 0.15 + (params.intensity / 100) * 0.35),
          blur: fontSize * 0.25 + (params.intensity / 100) * fontSize * 0.35,
          offsetX: 0,
          offsetY: fontSize * 0.06,
        },
      }
    case 'hollow':
      return { ...reset, fill: 'rgba(0,0,0,0)', stroke: baseFill, strokeWidth: stroke }
    case 'splice':
      return {
        ...reset,
        fill: 'rgba(0,0,0,0)',
        stroke: baseFill,
        strokeWidth: stroke,
        shadow: { color: params.color, blur: 0, offsetX: x, offsetY: y },
      }
    case 'echo':
      return {
        ...reset,
        shadow: { color: hexToRgba(baseFill, 1 - params.transparency / 100), blur: 0, offsetX: x, offsetY: y },
      }
    case 'outline':
      return { ...reset, stroke: params.color, strokeWidth: stroke * 2, paintFirst: 'stroke' }
    case 'neon':
      return {
        ...reset,
        fill: '#ffffff',
        stroke: params.color,
        strokeWidth: Math.max(0.5, fontSize * 0.012),
        shadow: { color: params.color, blur: fontSize * (0.15 + (params.intensity / 100) * 0.6), offsetX: 0, offsetY: 0 },
      }
    case 'background':
      return { ...reset, backgroundColor: params.color }
    default:
      return reset
  }
}

/** CSS approximation used for the preview tiles in the panel. */
export function effectPreviewStyle(type: TextEffectType, ink = '#181410'): Record<string, string> {
  switch (type) {
    case 'shadow':
      return { color: ink, textShadow: '3px 3px 4px rgba(0,0,0,0.45)' }
    case 'lift':
      return { color: ink, textShadow: '0 3px 8px rgba(0,0,0,0.35)' }
    case 'hollow':
      return { color: 'transparent', WebkitTextStroke: `1.5px ${ink}` }
    case 'splice':
      return { color: 'transparent', WebkitTextStroke: `1.5px ${ink}`, textShadow: '3px 3px 0 #e8a33d' }
    case 'echo':
      return { color: ink, textShadow: `3px 3px 0 rgba(24,20,16,0.45), 6px 6px 0 rgba(24,20,16,0.2)` }
    case 'outline':
      return { color: '#ffffff', WebkitTextStroke: `1.5px ${ink}` }
    case 'neon':
      return { color: '#ffffff', textShadow: '0 0 4px #ff4fd8, 0 0 10px #ff4fd8' }
    case 'background':
      return { color: ink, background: '#e8a33d', padding: '0 4px' }
    default:
      return { color: ink }
  }
}
