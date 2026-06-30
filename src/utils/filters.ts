/**
 * Image filters & color adjustments built on fabric.js' native filter pipeline.
 * Adjustment values are stored on `obj.metadata.adjustments` so they persist
 * (metadata is in scenify PROPERTIES_TO_INCLUDE) and can be re-edited.
 *
 * Works on any fabric.Image-derived object (StaticImage, uploaded images, and
 * video poster objects), rendered natively by fabric — no compositor required
 * for the on-canvas preview.
 *
 * Only fabric's built-in filters are used here; every one of them ships both a
 * WebGL and a 2D backend, so the pipeline never breaks regardless of which
 * filter backend fabric initialises with.
 */
import { fabric } from 'fabric'

export interface Adjustments {
  brightness: number // -100..100
  contrast: number // -100..100
  exposure: number // -100..100 (gamma / midtone lift)
  saturation: number // -100..100
  vibrance: number // -100..100 (saturation that protects skin tones)
  temperature: number // -100..100 (cool..warm)
  tint: number // -100..100 (green..magenta)
  hue: number // -180..180
  sharpen: number // 0..100
  blur: number // 0..100
  noise: number // 0..100 (film grain)
  vignette: number // 0..100 (edge darkening)
  duotone: string // duotone preset id ('none' = off)
  preset: string
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  exposure: 0,
  saturation: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  hue: 0,
  sharpen: 0,
  blur: 0,
  noise: 0,
  vignette: 0,
  duotone: 'none',
  preset: 'none',
}

/** Numeric slider keys, used when merging preset values over the sliders. */
export const ADJUSTMENT_KEYS: (keyof Adjustments)[] = [
  'brightness',
  'contrast',
  'exposure',
  'saturation',
  'vibrance',
  'temperature',
  'tint',
  'hue',
  'sharpen',
  'blur',
  'noise',
  'vignette',
]

export interface DuotonePreset {
  id: string
  label: string
  dark: string // hex shadow colour
  light: string // hex highlight colour
}

export const DUOTONE_PRESETS: DuotonePreset[] = [
  { id: 'none', label: 'Off', dark: '#000000', light: '#ffffff' },
  { id: 'noir', label: 'Noir', dark: '#0b0b0b', light: '#f4f4f5' },
  { id: 'indigo', label: 'Indigo', dark: '#1e1b4b', light: '#c7d2fe' },
  { id: 'sunset', label: 'Sunset', dark: '#4a0e4e', light: '#ffd166' },
  { id: 'ocean', label: 'Ocean', dark: '#022c43', light: '#7de2fc' },
  { id: 'forest', label: 'Forest', dark: '#0b3d2e', light: '#cdeccb' },
  { id: 'cherry', label: 'Cherry', dark: '#3d0c2a', light: '#ffd1e8' },
  { id: 'copper', label: 'Copper', dark: '#2a1505', light: '#ffc48a' },
]

export const DUOTONE_PRESET_MAP: Record<string, DuotonePreset> = Object.fromEntries(
  DUOTONE_PRESETS.map(p => [p.id, p])
)

/** Hex (#rrggbb) → normalised [r,g,b] in 0..1 for shader/2d use. */
function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export interface FilterPreset {
  id: string
  label: string
  adjustments?: Partial<Adjustments>
  /** Extra fabric filters layered on top of the slider-driven ones. */
  extra?: () => any[]
}

const F = () => (fabric as any).Image.filters

/**
 * Register custom Vignette + Duotone filters once. Both implement a WebGL
 * fragment shader AND a 2D fallback so they work on either fabric filter
 * backend, plus toObject/fromObject so they survive scenify's JSON
 * serialisation (the app reconstructs filters from saved JSON on load).
 */
function registerCustomFilters() {
  const filters = (fabric as any).Image.filters
  const util = (fabric as any).util

  if (!filters.Vignette) {
    const Vignette = util.createClass(filters.BaseFilter, {
      type: 'Vignette',
      fragmentSource: [
        'precision highp float;',
        'uniform sampler2D uTexture;',
        'uniform float uVignette;',
        'varying vec2 vTexCoord;',
        'void main() {',
        '  vec4 color = texture2D(uTexture, vTexCoord);',
        '  float d = distance(vTexCoord, vec2(0.5, 0.5));',
        '  float v = 1.0 - smoothstep(0.35, 0.78, d);',
        '  color.rgb *= mix(1.0 - uVignette, 1.0, v);',
        '  gl_FragColor = color;',
        '}',
      ].join('\n'),
      vignette: 0,
      mainParameter: 'vignette',
      applyTo2d(options: any) {
        if (!this.vignette) return
        const { data, width, height } = options.imageData
        const amount = this.vignette
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const nx = x / width - 0.5
            const ny = y / height - 0.5
            const d = Math.sqrt(nx * nx + ny * ny)
            let t = (d - 0.35) / (0.78 - 0.35)
            t = t < 0 ? 0 : t > 1 ? 1 : t
            const sm = t * t * (3 - 2 * t)
            const v = 1 - sm
            const f = (1 - amount) + amount * v
            const i = (y * width + x) * 4
            data[i] *= f
            data[i + 1] *= f
            data[i + 2] *= f
          }
        }
      },
      getUniformLocations(gl: any, program: any) {
        return { uVignette: gl.getUniformLocation(program, 'uVignette') }
      },
      sendUniformData(gl: any, u: any) {
        gl.uniform1f(u.uVignette, this.vignette)
      },
      isNeutralState() {
        return !this.vignette
      },
    })
    Vignette.fromObject = filters.BaseFilter.fromObject
    filters.Vignette = Vignette
  }

  if (!filters.Duotone) {
    const Duotone = util.createClass(filters.BaseFilter, {
      type: 'Duotone',
      fragmentSource: [
        'precision highp float;',
        'uniform sampler2D uTexture;',
        'uniform vec3 uDark;',
        'uniform vec3 uLight;',
        'uniform float uMix;',
        'varying vec2 vTexCoord;',
        'void main() {',
        '  vec4 color = texture2D(uTexture, vTexCoord);',
        '  float l = dot(color.rgb, vec3(0.299, 0.587, 0.114));',
        '  vec3 duo = mix(uDark, uLight, l);',
        '  gl_FragColor = vec4(mix(color.rgb, duo, uMix), color.a);',
        '}',
      ].join('\n'),
      dark: [0, 0, 0],
      light: [1, 1, 1],
      mix: 1,
      applyTo2d(options: any) {
        if (!this.mix) return
        const { data } = options.imageData
        const [dr0, dg0, db0] = this.dark
        const [lr0, lg0, lb0] = this.light
        const m = this.mix
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255
          const g = data[i + 1] / 255
          const b = data[i + 2] / 255
          const l = 0.299 * r + 0.587 * g + 0.114 * b
          const dr = dr0 + (lr0 - dr0) * l
          const dg = dg0 + (lg0 - dg0) * l
          const db = db0 + (lb0 - db0) * l
          data[i] = (r + (dr - r) * m) * 255
          data[i + 1] = (g + (dg - g) * m) * 255
          data[i + 2] = (b + (db - b) * m) * 255
        }
      },
      getUniformLocations(gl: any, program: any) {
        return {
          uDark: gl.getUniformLocation(program, 'uDark'),
          uLight: gl.getUniformLocation(program, 'uLight'),
          uMix: gl.getUniformLocation(program, 'uMix'),
        }
      },
      sendUniformData(gl: any, u: any) {
        gl.uniform3fv(u.uDark, this.dark)
        gl.uniform3fv(u.uLight, this.light)
        gl.uniform1f(u.uMix, this.mix)
      },
      toObject() {
        return util.object.extend(this.callSuper('toObject'), {
          dark: this.dark,
          light: this.light,
          mix: this.mix,
        })
      },
      isNeutralState() {
        return !this.mix
      },
    })
    Duotone.fromObject = function (object: any) {
      return new Duotone(object)
    }
    filters.Duotone = Duotone
  }
}

try {
  registerCustomFilters()
} catch (e) {
  // never let custom-filter registration break editor startup / project load
}

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

/** Green/magenta tint via a color matrix that scales the G channel. */
function tintFilter(tint: number): any | null {
  if (!tint) return null
  const g = 1 - 0.2 * (tint / 100) // +tint => magenta (less green)
  return new (F().ColorMatrix)({
    matrix: [1, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  })
}

/** Unsharp-style sharpen via a convolution kernel blended with identity. */
function sharpenFilter(amount: number): any | null {
  if (!amount) return null
  const a = (amount / 100) * 0.8 // keep it tasteful
  return new (F().Convolute)({
    matrix: [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0],
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
  { id: 'clarity', label: 'Clarity', adjustments: { contrast: 16, sharpen: 35, vibrance: 18 } },
  { id: 'lomo', label: 'Lomo', adjustments: { contrast: 30, saturation: 35, temperature: 18, noise: 10 } },
  { id: 'matte', label: 'Matte', adjustments: { contrast: -22, exposure: 10, saturation: -8 } },
  { id: 'invert', label: 'Invert', extra: () => [new (F().Invert)()] },
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
    for (const key of ADJUSTMENT_KEYS) {
      if (adj[key] === DEFAULT_ADJUSTMENTS[key] && preset.adjustments[key] != null) {
        ;(eff as any)[key] = preset.adjustments[key]
      }
    }
  }

  if (preset && preset.extra) filters.push(...preset.extra())
  if (eff.exposure) filters.push(new (F().Gamma)({ gamma: [1 + 0.8 * (eff.exposure / 100), 1 + 0.8 * (eff.exposure / 100), 1 + 0.8 * (eff.exposure / 100)] }))
  if (eff.brightness) filters.push(new (F().Brightness)({ brightness: eff.brightness / 100 }))
  if (eff.contrast) filters.push(new (F().Contrast)({ contrast: eff.contrast / 100 }))
  if (eff.saturation) filters.push(new (F().Saturation)({ saturation: eff.saturation / 100 }))
  if (eff.vibrance) filters.push(new (F().Vibrance)({ vibrance: eff.vibrance / 100 }))
  if (eff.hue) filters.push(new (F().HueRotation)({ rotation: eff.hue / 180 }))
  const temp = temperatureFilter(eff.temperature)
  if (temp) filters.push(temp)
  const tint = tintFilter(eff.tint)
  if (tint) filters.push(tint)
  const sharpen = sharpenFilter(eff.sharpen)
  if (sharpen) filters.push(sharpen)
  if (eff.blur) filters.push(new (F().Blur)({ blur: (eff.blur / 100) * 0.5 }))
  if (eff.noise) filters.push(new (F().Noise)({ noise: eff.noise * 1.5 }))
  if (eff.duotone && eff.duotone !== 'none') {
    const d = DUOTONE_PRESET_MAP[eff.duotone]
    if (d) filters.push(new (F().Duotone)({ dark: hexToRgb01(d.dark), light: hexToRgb01(d.light), mix: 1 }))
  }
  if (eff.vignette) filters.push(new (F().Vignette)({ vignette: eff.vignette / 100 }))

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
