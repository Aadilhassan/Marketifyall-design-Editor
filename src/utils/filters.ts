/**
 * Image filters & color adjustments built on fabric.js' native filter pipeline.
 * Adjustment values are stored on `obj.metadata.adjustments` so they persist
 * (metadata is in scenify PROPERTIES_TO_INCLUDE) and can be re-edited.
 *
 * Works on any fabric.Image-derived object (StaticImage, uploaded images, and
 * video poster objects), rendered natively by fabric — no compositor required
 * for the on-canvas preview.
 */
import { fabric } from 'fabric'

export interface Adjustments {
  brightness: number // -100..100
  contrast: number // -100..100
  saturation: number // -100..100
  blur: number // 0..100
  temperature: number // -100..100 (cool..warm)
  preset: string
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  temperature: 0,
  preset: 'none',
}

export interface FilterPreset {
  id: string
  label: string
  adjustments?: Partial<Adjustments>
  /** Extra fabric filters layered on top of the slider-driven ones. */
  extra?: () => any[]
}

const F = () => (fabric as any).Image.filters

/** Warm/cool tint via a color matrix that scales the R and B channels. */
function temperatureFilter(temp: number): any | null {
  if (!temp) return null
  const t = temp / 100 // -1..1
  const r = 1 + 0.25 * t
  const b = 1 - 0.25 * t
  return new (F().ColorMatrix)({
    matrix: [r, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0],
  })
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', label: 'Original' },
  { id: 'vivid', label: 'Vivid', adjustments: { saturation: 45, contrast: 18, brightness: 4 } },
  { id: 'mono', label: 'Mono', extra: () => [new (F().Grayscale)(), new (F().Contrast)({ contrast: 0.1 })] },
  { id: 'noir', label: 'Noir', adjustments: { contrast: 35, brightness: -8 }, extra: () => [new (F().Grayscale)()] },
  { id: 'sepia', label: 'Sepia', extra: () => [new (F().Sepia)()] },
  { id: 'vintage', label: 'Vintage', adjustments: { saturation: -25, temperature: 30, brightness: 6 }, extra: () => [new (F().Sepia)()] },
  { id: 'cool', label: 'Cool', adjustments: { temperature: -45, saturation: 8 } },
  { id: 'warm', label: 'Warm', adjustments: { temperature: 45, saturation: 12 } },
  { id: 'fade', label: 'Fade', adjustments: { contrast: -18, brightness: 10, saturation: -12 } },
  { id: 'dramatic', label: 'Dramatic', adjustments: { contrast: 40, saturation: 20, brightness: -6 } },
]

export const FILTER_PRESET_MAP: Record<string, FilterPreset> = Object.fromEntries(
  FILTER_PRESETS.map(p => [p.id, p])
)

export function isFilterable(obj: any): boolean {
  return !!obj && typeof obj.applyFilters === 'function'
}

/** Build the fabric filter stack for a set of adjustments. */
export function buildFilters(adj: Adjustments): any[] {
  const filters: any[] = []
  const preset = FILTER_PRESET_MAP[adj.preset]

  // Effective slider values = explicit sliders merged over the preset's baked-in values.
  const eff: Adjustments = { ...adj }
  if (preset && preset.adjustments) {
    for (const key of ['brightness', 'contrast', 'saturation', 'temperature', 'blur'] as const) {
      if (adj[key] === DEFAULT_ADJUSTMENTS[key] && preset.adjustments[key] != null) {
        eff[key] = preset.adjustments[key] as number
      }
    }
  }

  if (preset && preset.extra) filters.push(...preset.extra())
  if (eff.brightness) filters.push(new (F().Brightness)({ brightness: eff.brightness / 100 }))
  if (eff.contrast) filters.push(new (F().Contrast)({ contrast: eff.contrast / 100 }))
  if (eff.saturation) filters.push(new (F().Saturation)({ saturation: eff.saturation / 100 }))
  const temp = temperatureFilter(eff.temperature)
  if (temp) filters.push(temp)
  if (eff.blur) filters.push(new (F().Blur)({ blur: (eff.blur / 100) * 0.5 }))

  return filters
}

/** Apply adjustments to an object and persist them on metadata. */
export function applyAdjustments(canvas: any, obj: any, adj: Adjustments): void {
  if (!obj || typeof obj.applyFilters !== 'function') return
  try {
    obj.filters = buildFilters(adj)
    obj.applyFilters()
    if (!obj.metadata) obj.metadata = {}
    obj.metadata.adjustments = { ...adj }
    if (canvas) {
      if (typeof canvas.fire === 'function') canvas.fire('object:modified', { target: obj })
      if (typeof canvas.requestRenderAll === 'function') canvas.requestRenderAll()
    }
  } catch (e) {
    // fabric filter backend (webgl/2d) not ready — ignore
  }
}

export function readAdjustments(obj: any): Adjustments {
  const a = obj && obj.metadata && obj.metadata.adjustments
  return { ...DEFAULT_ADJUSTMENTS, ...(a || {}) }
}
