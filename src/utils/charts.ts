/**
 * Pure chart → SVG rendering for the Apps panel. No React, no DOM.
 *
 * The output is consumed by fabric's SVG parser (loadSVGFromString), which is
 * limited, so we only emit rect / line / path / circle / text with explicit
 * presentation attributes: no <style>, no <tspan>, no transforms.
 */

export type ChartType = 'bar' | 'hbar' | 'line' | 'pie' | 'donut'

export interface ChartDatum {
  label: string
  value: number
}

export interface ChartConfig {
  type: ChartType
  data: ChartDatum[]
  title?: string
  showValues: boolean
  showLegend: boolean
  palette: string[]
  width: number
  height: number
  fontFamily: string
  /** Axis/label/title colour. Defaults to brand ink. */
  textColor?: string
}

export const BRAND_PALETTE = ['#181410', '#d8401c', '#e8a33d', '#2f7d4f', '#3b6ea8', '#a39d8c']
export const WARM_PALETTE = ['#d8401c', '#e8a33d', '#b8340f', '#f2c879', '#7a2a12', '#efb39c']
export const COOL_PALETTE = ['#3b6ea8', '#2f7d4f', '#7fa7cf', '#8dbf9f', '#1f3f63', '#c9d6c1']
export const INK_PALETTE = ['#181410', '#3a352b', '#736d5c', '#a39d8c', '#cfc8b6', '#ebe4d4']

export const CHART_PALETTES: { id: string; name: string; colors: string[] }[] = [
  { id: 'brand', name: 'Brand', colors: BRAND_PALETTE },
  { id: 'warm', name: 'Warm', colors: WARM_PALETTE },
  { id: 'cool', name: 'Cool', colors: COOL_PALETTE },
  { id: 'ink', name: 'Ink', colors: INK_PALETTE },
]

export const DEFAULT_CHART_FONT = 'Space Grotesk, sans-serif'

const DEFAULT_INK = '#181410'

export function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Format a coordinate: finite, max 2 decimals, never "NaN"/"Infinity". */
function n(x: number): string {
  if (!Number.isFinite(x)) return '0'
  const r = Math.round(x * 100) / 100
  return String(Object.is(r, -0) ? 0 : r)
}

function safeNum(v: unknown): number {
  const x = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(x) ? x : 0
}

export function formatValue(v: number): string {
  if (!Number.isFinite(v)) return '0'
  const abs = Math.abs(v)
  if (abs >= 1e6) return `${trimNum(v / 1e6)}M`
  if (abs >= 1e4) return `${trimNum(v / 1e3)}k`
  return trimNum(v)
}

function trimNum(v: number): string {
  const f = Math.abs(v) < 10 ? 100 : 10
  const r = Math.round(v * f) / f
  return String(Object.is(r, -0) ? 0 : r)
}

function truncate(s: string, max: number): string {
  const str = String(s ?? '')
  if (max < 2) return ''
  return str.length > max ? `${str.slice(0, max - 1)}…` : str
}

/** Relative luminance-ish check so slice labels stay readable. */
function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return true
  const int = parseInt(m[1], 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return 0.299 * r + 0.587 * g + 0.114 * b < 150
}

/**
 * Parse "label,value" lines. Tolerates a header row, quoted labels, tabs or
 * semicolons as separators, and thousands separators in values.
 */
export function parseChartCSV(text: string): ChartDatum[] {
  const out: ChartDatum[] = []
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const idx = Math.max(line.lastIndexOf(','), line.lastIndexOf('\t'), line.lastIndexOf(';'))
    if (idx < 0) continue
    const label = line.slice(0, idx).trim().replace(/^"(.*)"$/, '$1')
    const valueStr = line.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1').replace(/[\s_]/g, '')
    const value = parseFloat(valueStr)
    if (!Number.isFinite(value)) continue // header row or junk
    out.push({ label, value })
  }
  return out
}

function niceStep(range: number): number {
  const raw = range / 4
  if (!(raw > 0) || !Number.isFinite(raw)) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return step * mag
}

interface Scale {
  min: number
  max: number
  ticks: number[]
}

function valueScale(values: number[]): Scale {
  let min = Math.min(0, ...values)
  let max = Math.max(0, ...values)
  if (min === max) max = min + 1
  const step = niceStep(max - min)
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let t = min; t <= max + step / 2 && ticks.length < 12; t += step) ticks.push(Math.round(t / step) * step)
  return { min, max, ticks }
}

interface Ctx {
  W: number
  H: number
  font: string
  ink: string
  palette: string[]
  parts: string[]
}

function text(ctx: Ctx, x: number, y: number, content: string, opts: { size?: number; anchor?: 'start' | 'middle' | 'end'; fill?: string; weight?: number } = {}) {
  const { size = 14, anchor = 'start', fill = ctx.ink, weight = 400 } = opts
  ctx.parts.push(
    `<text x="${n(x)}" y="${n(y)}" fill="${escapeXml(fill)}" font-family="${escapeXml(ctx.font)}" font-size="${n(size)}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(content)}</text>`
  )
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, opacity = 0.12, width = 1) {
  ctx.parts.push(
    `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${escapeXml(ctx.ink)}" stroke-opacity="${opacity}" stroke-width="${width}"/>`
  )
}

function color(ctx: Ctx, i: number): string {
  return ctx.palette[i % ctx.palette.length]
}

function renderBars(ctx: Ctx, data: ChartDatum[], top: number, showValues: boolean) {
  const { W, H } = ctx
  const pad = 24
  const values = data.map(d => d.value)
  const scale = valueScale(values)
  const axisW = Math.max(...scale.ticks.map(t => formatValue(t).length)) * 8 + 12
  const x0 = pad + axisW
  const x1 = W - pad
  const y0 = top + (showValues ? 20 : 6)
  const y1 = H - pad - 28
  const span = scale.max - scale.min
  const y = (v: number) => y1 - ((v - scale.min) / span) * (y1 - y0)

  for (const t of scale.ticks) {
    line(ctx, x0, y(t), x1, y(t), t === 0 ? 0.5 : 0.12)
    text(ctx, x0 - 8, y(t) + 4, formatValue(t), { size: 12, anchor: 'end' })
  }

  const band = (x1 - x0) / data.length
  const barW = band * 0.62
  const zeroY = y(0)
  const maxChars = Math.max(2, Math.floor(band / 7.5))
  data.forEach((d, i) => {
    const vy = y(d.value)
    const h = Math.abs(vy - zeroY)
    const bx = x0 + i * band + (band - barW) / 2
    const by = Math.min(vy, zeroY)
    const rx = h > 8 ? Math.min(4, barW / 4) : 0
    ctx.parts.push(`<rect x="${n(bx)}" y="${n(by)}" width="${n(barW)}" height="${n(h)}" rx="${n(rx)}" ry="${n(rx)}" fill="${escapeXml(color(ctx, i))}"/>`)
    const cx = bx + barW / 2
    if (showValues) {
      const ly = d.value < 0 ? vy + 16 : vy - 6
      text(ctx, cx, ly, formatValue(d.value), { size: 13, anchor: 'middle', weight: 600 })
    }
    text(ctx, cx, y1 + 20, truncate(d.label, maxChars), { size: 13, anchor: 'middle' })
  })
}

function renderHBars(ctx: Ctx, data: ChartDatum[], top: number, showValues: boolean) {
  const { W, H } = ctx
  const pad = 24
  const values = data.map(d => d.value)
  const scale = valueScale(values)
  const longest = Math.max(...data.map(d => String(d.label).length), 1)
  const labelW = Math.min(W * 0.3, longest * 8 + 12)
  const valueRoom = showValues ? 48 : 12
  const x0 = pad + labelW
  const x1 = W - pad - valueRoom
  const y0 = top + 4
  const y1 = H - pad - 20
  const span = scale.max - scale.min
  const x = (v: number) => x0 + ((v - scale.min) / span) * (x1 - x0)

  for (const t of scale.ticks) {
    line(ctx, x(t), y0, x(t), y1, t === 0 ? 0.5 : 0.12)
    text(ctx, x(t), y1 + 16, formatValue(t), { size: 12, anchor: 'middle' })
  }

  const band = (y1 - y0) / data.length
  const barH = band * 0.62
  const zeroX = x(0)
  const maxChars = Math.max(2, Math.floor(labelW / 8))
  data.forEach((d, i) => {
    const vx = x(d.value)
    const w = Math.abs(vx - zeroX)
    const by = y0 + i * band + (band - barH) / 2
    const bx = Math.min(vx, zeroX)
    const rx = w > 8 ? Math.min(4, barH / 4) : 0
    ctx.parts.push(`<rect x="${n(bx)}" y="${n(by)}" width="${n(w)}" height="${n(barH)}" rx="${n(rx)}" ry="${n(rx)}" fill="${escapeXml(color(ctx, i))}"/>`)
    const cy = by + barH / 2 + 5
    text(ctx, x0 - 10, cy, truncate(d.label, maxChars), { size: 13, anchor: 'end' })
    if (showValues) {
      if (d.value < 0) text(ctx, vx - 6, cy, formatValue(d.value), { size: 13, anchor: 'end', weight: 600 })
      else text(ctx, vx + 6, cy, formatValue(d.value), { size: 13, anchor: 'start', weight: 600 })
    }
  })
}

function renderLine(ctx: Ctx, data: ChartDatum[], top: number, showValues: boolean) {
  const { W, H } = ctx
  const pad = 24
  const scale = valueScale(data.map(d => d.value))
  const axisW = Math.max(...scale.ticks.map(t => formatValue(t).length)) * 8 + 12
  const x0 = pad + axisW
  const x1 = W - pad
  const y0 = top + (showValues ? 22 : 8)
  const y1 = H - pad - 28
  const span = scale.max - scale.min
  const y = (v: number) => y1 - ((v - scale.min) / span) * (y1 - y0)

  for (const t of scale.ticks) {
    line(ctx, x0, y(t), x1, y(t), t === 0 ? 0.5 : 0.12)
    text(ctx, x0 - 8, y(t) + 4, formatValue(t), { size: 12, anchor: 'end' })
  }

  const band = (x1 - x0) / data.length
  const pts = data.map((d, i) => ({ x: x0 + band * (i + 0.5), y: y(d.value), d }))
  const stroke = color(ctx, 0)
  const accent = ctx.palette.length > 1 ? color(ctx, 1) : stroke
  if (pts.length > 1) {
    const dAttr = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${n(p.x)} ${n(p.y)}`).join(' ')
    ctx.parts.push(`<path d="${dAttr}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`)
  }
  const maxChars = Math.max(2, Math.floor(band / 7.5))
  for (const p of pts) {
    ctx.parts.push(`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="5" fill="${escapeXml(accent)}" stroke="#ffffff" stroke-width="2"/>`)
    if (showValues) text(ctx, p.x, p.d.value < 0 ? p.y + 20 : p.y - 12, formatValue(p.d.value), { size: 13, anchor: 'middle', weight: 600 })
    text(ctx, p.x, y1 + 20, truncate(p.d.label, maxChars), { size: 13, anchor: 'middle' })
  }
}

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function renderPie(ctx: Ctx, data: ChartDatum[], top: number, showValues: boolean, showLegend: boolean, donut: boolean) {
  const { W, H } = ctx
  const pad = 24
  const slices = data.map((d, i) => ({ ...d, i })).filter(d => d.value > 0)
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (!slices.length || !(total > 0)) {
    text(ctx, W / 2, (top + H) / 2, 'No positive values', { size: 16, anchor: 'middle', fill: ctx.ink })
    return
  }

  const legendW = showLegend ? Math.min(W * 0.4, 260) : 0
  const areaW = W - pad * 2 - legendW
  const areaH = H - top - pad
  const r = Math.max(10, Math.min(areaW, areaH) / 2 - 4)
  const cx = pad + areaW / 2
  const cy = top + areaH / 2
  const ir = donut ? r * 0.58 : 0

  if (slices.length === 1) {
    const fill = escapeXml(color(ctx, slices[0].i))
    if (donut) {
      // Full ring: two half arcs outside + two inside, even-odd so the hole is empty.
      const d =
        `M ${n(cx + r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 1 ${n(cx - r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(cy)} Z ` +
        `M ${n(cx + ir)} ${n(cy)} A ${n(ir)} ${n(ir)} 0 1 0 ${n(cx - ir)} ${n(cy)} A ${n(ir)} ${n(ir)} 0 1 0 ${n(cx + ir)} ${n(cy)} Z`
      ctx.parts.push(`<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`)
    } else {
      ctx.parts.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"/>`)
    }
  } else {
    let a = -Math.PI / 2
    for (const s of slices) {
      const sweep = (s.value / total) * Math.PI * 2
      const a2 = a + sweep
      const large = sweep > Math.PI ? 1 : 0
      const o1 = polar(cx, cy, r, a)
      const o2 = polar(cx, cy, r, a2)
      let d: string
      if (donut) {
        const i1 = polar(cx, cy, ir, a2)
        const i2 = polar(cx, cy, ir, a)
        d = `M ${n(o1.x)} ${n(o1.y)} A ${n(r)} ${n(r)} 0 ${large} 1 ${n(o2.x)} ${n(o2.y)} L ${n(i1.x)} ${n(i1.y)} A ${n(ir)} ${n(ir)} 0 ${large} 0 ${n(i2.x)} ${n(i2.y)} Z`
      } else {
        d = `M ${n(cx)} ${n(cy)} L ${n(o1.x)} ${n(o1.y)} A ${n(r)} ${n(r)} 0 ${large} 1 ${n(o2.x)} ${n(o2.y)} Z`
      }
      ctx.parts.push(`<path d="${d}" fill="${escapeXml(color(ctx, s.i))}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>`)
      a = a2
    }
  }

  if (showValues) {
    let a = -Math.PI / 2
    for (const s of slices) {
      const frac = s.value / total
      const mid = a + frac * Math.PI
      a += frac * Math.PI * 2
      if (frac < 0.04) continue // too thin to label
      const lr = donut ? (r + ir) / 2 : slices.length === 1 ? 0 : r * 0.64
      const p = polar(cx, cy, lr, mid)
      const fill = isDark(color(ctx, s.i)) ? '#ffffff' : DEFAULT_INK
      text(ctx, p.x, p.y + 5, `${Math.round(frac * 100)}%`, { size: 14, anchor: 'middle', fill, weight: 600 })
    }
  }

  if (showLegend) {
    const lx = W - pad - legendW + 16
    const rowH = 26
    const rows = slices.slice(0, Math.max(1, Math.floor(areaH / rowH)))
    let ly = top + Math.max(0, (areaH - rows.length * rowH) / 2)
    const maxChars = Math.max(4, Math.floor((legendW - 40) / 7.5))
    for (const s of rows) {
      ctx.parts.push(`<rect x="${n(lx)}" y="${n(ly + 4)}" width="14" height="14" rx="3" ry="3" fill="${escapeXml(color(ctx, s.i))}"/>`)
      const label = showValues ? `${s.label} (${formatValue(s.value)})` : s.label
      text(ctx, lx + 22, ly + 16, truncate(label, maxChars), { size: 14 })
      ly += rowH
    }
  }
}

/** Render a chart config to a standalone SVG string. Never throws on bad data. */
export function renderChartSVG(config: ChartConfig): string {
  const W = Math.max(120, safeNum(config?.width) || 800)
  const H = Math.max(90, safeNum(config?.height) || 500)
  const palette = (config?.palette || []).filter(c => typeof c === 'string' && c.trim())
  const ctx: Ctx = {
    W,
    H,
    font: config?.fontFamily || DEFAULT_CHART_FONT,
    ink: config?.textColor || DEFAULT_INK,
    palette: palette.length ? palette : BRAND_PALETTE,
    parts: [],
  }
  const data = (config?.data || []).map(d => ({ label: String(d?.label ?? ''), value: safeNum(d?.value) }))

  let top = 16
  const title = (config?.title || '').trim()
  if (title) {
    text(ctx, 24, 40, truncate(title, Math.floor((W - 48) / 14)), { size: 28, weight: 700 })
    top = 64
  }

  if (!data.length) {
    text(ctx, W / 2, (top + H) / 2, 'No data', { size: 16, anchor: 'middle' })
  } else {
    switch (config.type) {
      case 'hbar':
        renderHBars(ctx, data, top, !!config.showValues)
        break
      case 'line':
        renderLine(ctx, data, top, !!config.showValues)
        break
      case 'pie':
      case 'donut':
        renderPie(ctx, data, top, !!config.showValues, !!config.showLegend, config.type === 'donut')
        break
      case 'bar':
      default:
        renderBars(ctx, data, top, !!config.showValues)
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}" height="${n(H)}" viewBox="0 0 ${n(W)} ${n(H)}">` +
    ctx.parts.join('') +
    `</svg>`
  )
}
