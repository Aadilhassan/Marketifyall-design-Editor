/**
 * Canva-style element styling (shadow, photo frames / corner rounding / border,
 * shape outlines) expressed as plain fabric properties — `shadow`, `clipPath`,
 * `stroke` — so nothing needs custom serialisation. The panel's state lives in
 * `obj.metadata.elementEffects` so reselecting an element shows its values.
 *
 * Photo border: fabric.Image strokes its bounding rectangle, which a shaped
 * clipPath would cut away. `installShapedImageStroke()` makes images with a
 * rect/path clipPath stroke the clip outline instead (inset so the whole border
 * stays inside the mask), so borders follow rounded corners and frame shapes.
 */
import { fabric } from 'fabric'
import { hexToRgba } from './textEffects'

// ---------------------------------------------------------------- shadow

export type ShadowPreset = 'none' | 'drop' | 'soft' | 'glow' | 'hard'

export interface ShadowParams {
  /** 0-100, distance relative to the element size */
  offset: number
  /** degrees, 0 = right, 90 = down */
  direction: number
  /** 0-100 */
  blur: number
  /** 0-100 */
  transparency: number
  color: string
}

export const SHADOW_PRESETS: Record<ShadowPreset, ShadowParams> = {
  none: { offset: 0, direction: 45, blur: 0, transparency: 0, color: '#000000' },
  drop: { offset: 30, direction: 45, blur: 20, transparency: 55, color: '#000000' },
  soft: { offset: 15, direction: 90, blur: 60, transparency: 70, color: '#000000' },
  glow: { offset: 0, direction: 0, blur: 50, transparency: 20, color: '#d8401c' },
  hard: { offset: 35, direction: 45, blur: 0, transparency: 0, color: '#181410' },
}

export const SHADOW_PRESET_ORDER: ShadowPreset[] = ['none', 'drop', 'soft', 'glow', 'hard']

/** Shadow offset in object-local units. offset 100 = 15% of the element's longer side. */
export function shadowOffset(params: Pick<ShadowParams, 'offset' | 'direction'>, size: number) {
  const dist = (params.offset / 100) * size * 0.15
  const rad = (params.direction * Math.PI) / 180
  const round = (n: number) => Math.round(n * 100) / 100 || 0
  return { x: round(Math.cos(rad) * dist), y: round(Math.sin(rad) * dist) }
}

/**
 * Plain options for `new fabric.Shadow(...)`, or null for "no shadow".
 * `size` is the element's longer local side (width/height before scaling —
 * fabric scales shadow offsets/blur with the object).
 */
export function shadowOptions(preset: ShadowPreset, params: ShadowParams, size: number) {
  if (preset === 'none') return null
  const { x, y } = shadowOffset(params, size)
  return {
    color: hexToRgba(params.color, Math.round((1 - params.transparency / 100) * 100) / 100),
    blur: Math.round((params.blur / 100) * size * 0.25 * 100) / 100,
    offsetX: x,
    offsetY: y,
    affectStroke: true,
  }
}

// ---------------------------------------------------------------- photo rounding / border

/** Corner radius for a rounding percentage; 100% = half the shorter side (pill / circle). */
export function cornerRadius(percent: number, width: number, height: number): number {
  const p = Math.min(100, Math.max(0, percent || 0))
  return (p / 100) * (Math.min(width, height) / 2)
}

/** Border weight 0-100 → stroke width in image-local px (100 = 8% of the shorter side). */
export function borderWidth(weight: number, width: number, height: number): number {
  const w = Math.min(100, Math.max(0, weight || 0))
  return Math.round((w / 100) * Math.min(width, height) * 0.08 * 100) / 100
}

/** Inverse of borderWidth, used when an image has a stroke but no saved state. */
export function borderWeight(strokeWidth: number, width: number, height: number): number {
  const unit = Math.min(width, height) * 0.08
  if (!strokeWidth || !unit) return 0
  return Math.min(100, Math.round((strokeWidth / unit) * 100))
}

// ---------------------------------------------------------------- frames

export type FrameShape = 'none' | 'circle' | 'rounded' | 'arch' | 'heart' | 'star' | 'hexagon' | 'blob' | 'triangle'

export interface FrameDef {
  id: FrameShape
  label: string
  /** Absolute M/L/C/Q/Z path in a 100×100 box (only coordinate pairs as numbers). */
  d: string
  /** Fit into a square of the shorter side instead of stretching to the photo. */
  keepAspect: boolean
}

export const FRAMES: FrameDef[] = [
  { id: 'none', label: 'None', d: 'M0 0 L100 0 L100 100 L0 100 Z', keepAspect: false },
  {
    id: 'circle',
    label: 'Circle',
    d: 'M50 0 C77.61 0 100 22.39 100 50 C100 77.61 77.61 100 50 100 C22.39 100 0 77.61 0 50 C0 22.39 22.39 0 50 0 Z',
    keepAspect: true,
  },
  {
    id: 'rounded',
    label: 'Rounded',
    d: 'M16 0 L84 0 Q100 0 100 16 L100 84 Q100 100 84 100 L16 100 Q0 100 0 84 L0 16 Q0 0 16 0 Z',
    keepAspect: false,
  },
  {
    id: 'arch',
    label: 'Arch',
    d: 'M0 50 C0 22.39 22.39 0 50 0 C77.61 0 100 22.39 100 50 L100 100 L0 100 Z',
    keepAspect: true,
  },
  {
    id: 'heart',
    label: 'Heart',
    d: 'M50 100 C20 76 0 56 0 32 C0 13 14 0 30 0 C40 0 47 6 50 15 C53 6 60 0 70 0 C86 0 100 13 100 32 C100 56 80 76 50 100 Z',
    keepAspect: true,
  },
  {
    id: 'star',
    label: 'Star',
    d: 'M50 0 L61.76 33.82 L97.55 34.55 L69.02 56.18 L79.39 90.45 L50 70 L20.61 90.45 L30.98 56.18 L2.45 34.55 L38.24 33.82 Z',
    keepAspect: true,
  },
  { id: 'hexagon', label: 'Hexagon', d: 'M25 0 L75 0 L100 50 L75 100 L25 100 L0 50 Z', keepAspect: true },
  {
    id: 'blob',
    label: 'Blob',
    d: 'M52 0 C80 0 100 20 98 48 C96 78 74 100 46 98 C18 96 0 76 2 50 C4 22 24 0 52 0 Z',
    keepAspect: false,
  },
  { id: 'triangle', label: 'Triangle', d: 'M50 0 L100 100 L0 100 Z', keepAspect: true },
]

export function frameDef(id: FrameShape): FrameDef | undefined {
  return FRAMES.find(f => f.id === id)
}

const TOKEN = /[MLCQZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi

/**
 * Re-map a frame path (absolute M/L/C/Q/Z only) so its coordinate extents fill
 * 0..w × 0..h. Pure string transform — no fabric involved.
 */
export function scaleFramePath(d: string, w: number, h: number): string {
  const tokens = d.match(TOKEN) || []
  const xs: number[] = []
  const ys: number[] = []
  let i = 0
  tokens.forEach(t => {
    if (/^[a-z]$/i.test(t)) return
    ;(i++ % 2 === 0 ? xs : ys).push(Number(t))
  })
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const sx = w / (Math.max(...xs) - minX || 1)
  const sy = h / (Math.max(...ys) - minY || 1)
  const round = (n: number) => String(Math.round(n * 100) / 100)
  let n = 0
  return tokens
    .map(t => {
      if (/^[a-z]$/i.test(t)) {
        n = 0
        return t.toUpperCase()
      }
      const v = Number(t)
      return n++ % 2 === 0 ? round((v - minX) * sx) : round((v - minY) * sy)
    })
    .join(' ')
}

/** Box a frame occupies inside a w×h photo (square of the shorter side for keepAspect frames). */
export function frameBox(shape: FrameShape, w: number, h: number) {
  const def = frameDef(shape)
  if (def?.keepAspect) {
    const s = Math.min(w, h)
    return { w: s, h: s }
  }
  return { w, h }
}

// ---------------------------------------------------------------- state

export interface ElementEffectsState {
  shadow: { preset: ShadowPreset; params: ShadowParams }
  /** photo corner rounding, 0-100 % */
  radius: number
  frame: FrameShape
  /** photo border, weight 0-100 */
  border: { weight: number; color: string }
  /** shape outline, px (stroke is uniform so it doesn't grow with scale) */
  outline: { width: number; color: string }
}

export const DEFAULT_STATE: ElementEffectsState = {
  shadow: { preset: 'none', params: SHADOW_PRESETS.none },
  radius: 0,
  frame: 'none',
  border: { weight: 0, color: '#ffffff' },
  outline: { width: 0, color: '#181410' },
}

const isPreset = (p: any): p is ShadowPreset => SHADOW_PRESET_ORDER.includes(p)
const isFrame = (f: any): f is FrameShape => FRAMES.some(d => d.id === f)
const num = (v: any, fallback: number) => (typeof v === 'number' && isFinite(v) ? v : fallback)
const str = (v: any, fallback: string) => (typeof v === 'string' && v ? v : fallback)

/** Read (and sanitise) saved state from an object's metadata; missing fields fall back to defaults. */
export function readEffectsState(metadata: any): ElementEffectsState {
  const s = metadata?.elementEffects || {}
  const preset = isPreset(s.shadow?.preset) ? s.shadow.preset : 'none'
  const base = SHADOW_PRESETS[preset]
  const p = s.shadow?.params || {}
  return {
    shadow: {
      preset,
      params: {
        offset: num(p.offset, base.offset),
        direction: num(p.direction, base.direction),
        blur: num(p.blur, base.blur),
        transparency: num(p.transparency, base.transparency),
        color: str(p.color, base.color),
      },
    },
    radius: num(s.radius, 0),
    frame: isFrame(s.frame) ? s.frame : 'none',
    border: { weight: num(s.border?.weight, 0), color: str(s.border?.color, DEFAULT_STATE.border.color) },
    outline: { width: num(s.outline?.width, 0), color: str(s.outline?.color, DEFAULT_STATE.outline.color) },
  }
}

export function hasSavedState(metadata: any): boolean {
  return !!metadata?.elementEffects
}

/** New metadata object with the state stored under `elementEffects`. */
export function writeEffectsState(metadata: any, state: ElementEffectsState): any {
  return { ...(metadata || {}), elementEffects: state }
}

// ---------------------------------------------------------------- fabric builders

/**
 * clipPath for a photo in object-local (unscaled) coords, centred on the image,
 * or null when no mask is needed. A border alone gets a plain rect mask so the
 * stroke is drawn inside the photo edge like the shaped cases.
 */
export function buildClipPath(state: ElementEffectsState, w: number, h: number): any {
  if (state.frame !== 'none') {
    const def = frameDef(state.frame)
    if (def) {
      const box = frameBox(state.frame, w, h)
      return new fabric.Path(scaleFramePath(def.d, box.w, box.h), { left: 0, top: 0, originX: 'center', originY: 'center' })
    }
  }
  if (state.radius > 0 || state.border.weight > 0) {
    const r = cornerRadius(state.radius, w, h)
    return new fabric.Rect({ left: 0, top: 0, width: w, height: h, rx: r, ry: r, originX: 'center', originY: 'center' })
  }
  return null
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  const k = 1 - 0.5523
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.bezierCurveTo(x + w - k * rr, y, x + w, y + k * rr, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.bezierCurveTo(x + w, y + h - k * rr, x + w - k * rr, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.bezierCurveTo(x + k * rr, y + h, x, y + h - k * rr, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.bezierCurveTo(x, y + k * rr, x + k * rr, y, x + rr, y)
  ctx.closePath()
}

/**
 * Patch fabric.Image so a stroked image with a rect/path clipPath traces the
 * clip outline, inset by half the stroke so the full border shows inside the
 * mask. Images without a clipPath keep fabric's default rectangle stroke.
 * Idempotent.
 */
export function installShapedImageStroke(): void {
  const proto: any = (fabric as any).Image?.prototype
  if (!proto || proto.__shapedStroke) return
  const original = proto._stroke
  proto.__shapedStroke = true
  proto._stroke = function (this: any, ctx: CanvasRenderingContext2D) {
    const cp = this.clipPath
    if (!this.stroke || !this.strokeWidth || !cp || cp.absolutePositioned || cp.inverted) return original.call(this, ctx)
    const half = this.strokeWidth / 2
    if (cp.type === 'rect') {
      const w = cp.width * (cp.scaleX || 1)
      const h = cp.height * (cp.scaleY || 1)
      const r = (cp.rx || 0) * (cp.scaleX || 1)
      roundRectPath(ctx, -w / 2 + half, -h / 2 + half, w - half * 2, h - half * 2, Math.max(0, r - half))
      return
    }
    if (cp.type === 'path' && typeof cp._renderPathCommands === 'function') {
      const w = cp.width * (cp.scaleX || 1)
      const h = cp.height * (cp.scaleY || 1)
      ctx.save()
      ctx.translate(cp.left || 0, cp.top || 0)
      // shrink about the centre so the outline sits half a stroke inside the mask
      ctx.scale(Math.max(0, (w - half * 2) / w) * (cp.scaleX || 1), Math.max(0, (h - half * 2) / h) * (cp.scaleY || 1))
      cp._renderPathCommands(ctx)
      ctx.restore()
      return
    }
    return original.call(this, ctx)
  }
}

installShapedImageStroke()
