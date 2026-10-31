import { useEffect, useMemo, useState } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import qrcode from 'qrcode-generator'
import {
  AlertTriangle,
  BarChart3,
  BarChartHorizontal,
  CircleDot,
  ClipboardPaste,
  LineChart,
  PieChart,
  Plus,
  QrCode,
  X,
} from 'lucide-react'
import { color, font, radius } from '@/theme/tokens'
import { log, ignoreError } from '@/lib/logger'
import { notify } from '@/lib/notify'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import {
  CHART_PALETTES,
  DEFAULT_CHART_FONT,
  escapeXml,
  parseChartCSV,
  renderChartSVG,
} from '@/utils/charts'
import type { ChartConfig, ChartType } from '@/utils/charts'
import { EmptyNote, KitButton, PanelBody, PanelHeader, PanelRoot, SectionLabel, TextField, Tile } from '../PanelKit'

// qrcode-generator defaults to Latin-1 byte mapping; use UTF-8 so non-ASCII text scans correctly.
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']

const SCOPE = 'apps-panel'
const QR_WARN_LENGTH = 1000
const FRAME_FRACTION = 0.6

// ─── canvas helpers ──────────────────────────────────────────────────────────

function getCanvas(editor: any): any {
  return editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas || null
}

function frameWidth(canvas: any): number {
  const clip = canvas?.clipPath
  return (clip?.width || 900) * (clip?.scaleX || 1)
}

interface InsertOptions {
  /** Final on-canvas width in canvas px. Defaults to 60% of the frame. */
  displayWidth?: number
  left?: number
  top?: number
  angle?: number
  /** Merged into the added object's metadata (used for chart re-editing). */
  metadata?: Record<string, unknown>
}

/**
 * Insert an SVG as an editable StaticVector. addObjectToCanvas doesn't return the
 * created group, so we catch it on the canvas's object:added event (fabric parses
 * plain-shape SVG synchronously; the timeout is only a safety net).
 */
function insertSvg(editor: any, svg: string, svgWidth: number, svgHeight: number, opts: InsertOptions = {}): boolean {
  const canvas = getCanvas(editor)
  if (!editor || !canvas) {
    notify('The canvas is not ready yet.', 'warning')
    return false
  }
  const scale = (opts.displayWidth || frameWidth(canvas) * FRAME_FRACTION) / svgWidth

  let handler: ((e: any) => void) | null = null
  const detach = () => {
    if (!handler) return
    try {
      canvas.off('object:added', handler)
    } catch (err) {
      ignoreError(err, 'apps-panel: detaching object:added listener')
    }
    handler = null
  }
  if ((opts.metadata || opts.angle) && typeof canvas.on === 'function') {
    handler = (e: any) => {
      const target = e?.target
      if (!target) return
      detach()
      if (opts.metadata) target.set('metadata', { ...(target.metadata || {}), type: 'StaticVector', ...opts.metadata })
      if (opts.angle) {
        target.set('angle', opts.angle)
        target.setCoords?.()
      }
    }
    canvas.on('object:added', handler)
    setTimeout(detach, 3000)
  }

  const ok = addObjectToCanvas(
    editor,
    {
      type: 'StaticVector',
      metadata: { svg },
      width: svgWidth,
      height: svgHeight,
      scaleX: scale,
      scaleY: scale,
      ...(opts.left !== undefined ? { left: opts.left } : {}),
      ...(opts.top !== undefined ? { top: opts.top } : {}),
    },
    undefined,
    canvas
  )
  if (!ok) {
    detach()
    log.error(SCOPE, 'addObjectToCanvas returned false for SVG insert')
    notify('Could not add that to your design.', 'negative')
  }
  return !!ok
}

// ─── QR code ─────────────────────────────────────────────────────────────────

type ECLevel = 'L' | 'M' | 'Q' | 'H'

interface QrOptions {
  text: string
  fg: string
  bg: string
  transparent: boolean
  ec: ECLevel
  margin: number
}

const QR_MODULE = 10

/** Build a light QR SVG: one path of merged horizontal runs, crisp edges. */
function buildQrSvg(o: QrOptions): { svg: string; size: number } {
  const qr = qrcode(0, o.ec)
  qr.addData(o.text)
  qr.make()
  const count = qr.getModuleCount()
  const m = Math.max(0, Math.min(10, Math.round(o.margin)))
  const total = (count + m * 2) * QR_MODULE
  const d: string[] = []
  for (let r = 0; r < count; r++) {
    let c = 0
    while (c < count) {
      if (!qr.isDark(r, c)) {
        c++
        continue
      }
      const start = c
      while (c < count && qr.isDark(r, c)) c++
      const run = (c - start) * QR_MODULE
      d.push(`M${(start + m) * QR_MODULE} ${(r + m) * QR_MODULE}h${run}v${QR_MODULE}h-${run}z`)
    }
  }
  // fill="none" keeps the quiet zone in the group's bounds when transparent.
  const bgFill = o.transparent ? 'none' : escapeXml(o.bg)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect x="0" y="0" width="${total}" height="${total}" fill="${bgFill}"/>` +
    `<path d="${d.join('')}" fill="${escapeXml(o.fg)}" shape-rendering="crispEdges"/>` +
    `</svg>`
  return { svg, size: total }
}

function svgDataUrl(svg: string) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function QrTool({ editor }: { editor: any }) {
  const [opts, setOpts] = useState<QrOptions>({
    text: 'https://',
    fg: '#181410',
    bg: '#ffffff',
    transparent: false,
    ec: 'M',
    margin: 2,
  })
  const set = <K extends keyof QrOptions>(k: K, v: QrOptions[K]) => setOpts(prev => ({ ...prev, [k]: v }))
  const trimmed = opts.text.trim()

  const result = useMemo(() => {
    if (!trimmed) return { error: 'Enter a URL or some text.' as string | null, svg: '', size: 0 }
    try {
      return { error: null, ...buildQrSvg({ ...opts, text: trimmed }) }
    } catch (err) {
      log.warn(SCOPE, 'QR generation failed', err)
      return { error: 'That text is too long for a QR code. Shorten it or lower error correction.', svg: '', size: 0 }
    }
  }, [opts, trimmed])

  const add = () => {
    if (!result.svg) return
    // QR codes land smaller than charts: ~35% of the frame width.
    const displayWidth = frameWidth(getCanvas(editor)) * 0.35
    if (insertSvg(editor, result.svg, result.size, result.size, { displayWidth })) {
      notify('QR code added', 'positive')
    }
  }

  return (
    <>
      <SectionLabel>URL or text</SectionLabel>
      <TextField
        value={opts.text}
        placeholder="https://example.com"
        onChange={e => set('text', (e.target as HTMLInputElement).value)}
        aria-label="QR code URL or text"
      />
      {trimmed.length > QR_WARN_LENGTH && (
        <Hint $tone="warn">
          <AlertTriangle size={13} /> Long content makes a dense code that may not scan from print.
        </Hint>
      )}

      <Preview $checker={opts.transparent}>
        {result.svg ? <img src={svgDataUrl(result.svg)} alt="QR code preview" style={{ width: 168, height: 168 }} /> : <EmptyNote>{result.error}</EmptyNote>}
      </Preview>

      <SectionLabel>Colours</SectionLabel>
      <FieldRow>
        <span>Foreground</span>
        <ColorInput type="color" value={opts.fg} onChange={e => set('fg', e.target.value)} aria-label="QR foreground colour" />
      </FieldRow>
      <FieldRow>
        <span>Background</span>
        <ColorInput type="color" value={opts.bg} disabled={opts.transparent} onChange={e => set('bg', e.target.value)} aria-label="QR background colour" />
      </FieldRow>
      <Check>
        <input type="checkbox" checked={opts.transparent} onChange={e => set('transparent', e.target.checked)} />
        Transparent background
      </Check>

      <SectionLabel>Error correction</SectionLabel>
      <Grid $cols={4}>
        {(['L', 'M', 'Q', 'H'] as ECLevel[]).map(level => (
          <Tile key={level} type="button" $active={opts.ec === level} aria-pressed={opts.ec === level} onClick={() => set('ec', level)}>
            <strong style={{ fontFamily: font.mono, fontSize: 13 }}>{level}</strong>
            {{ L: '7%', M: '15%', Q: '25%', H: '30%' }[level]}
          </Tile>
        ))}
      </Grid>

      <SectionLabel>
        Margin <span style={{ fontFamily: font.mono }}>{opts.margin}</span>
      </SectionLabel>
      <input
        type="range"
        min={0}
        max={8}
        value={opts.margin}
        onChange={e => set('margin', Number(e.target.value))}
        aria-label="Quiet zone in modules"
        style={{ width: '100%', accentColor: color.accent }}
      />

      <div style={{ marginTop: 18 }}>
        <KitButton type="button" $variant="primary" $block disabled={!result.svg} onClick={add}>
          <Plus size={15} /> Add to design
        </KitButton>
      </div>
    </>
  )
}

// ─── Charts ──────────────────────────────────────────────────────────────────

const CHART_TYPES: { type: ChartType; label: string; Icon: typeof BarChart3 }[] = [
  { type: 'bar', label: 'Bar', Icon: BarChart3 },
  { type: 'hbar', label: 'Horizontal', Icon: BarChartHorizontal },
  { type: 'line', label: 'Line', Icon: LineChart },
  { type: 'pie', label: 'Pie', Icon: PieChart },
  { type: 'donut', label: 'Donut', Icon: CircleDot },
]

interface Row {
  label: string
  value: string
}

interface ChartState {
  type: ChartType
  rows: Row[]
  title: string
  showValues: boolean
  showLegend: boolean
  paletteId: string
}

const DEFAULT_CHART: ChartState = {
  type: 'bar',
  rows: [
    { label: 'Q1', value: '24' },
    { label: 'Q2', value: '38' },
    { label: 'Q3', value: '31' },
    { label: 'Q4', value: '46' },
  ],
  title: '',
  showValues: true,
  showLegend: true,
  paletteId: 'brand',
}

function chartSize(type: ChartType, showLegend: boolean) {
  if ((type === 'pie' || type === 'donut') && !showLegend) return { width: 520, height: 500 }
  return { width: 800, height: 500 }
}

function toConfig(s: ChartState): ChartConfig {
  const palette = (CHART_PALETTES.find(p => p.id === s.paletteId) || CHART_PALETTES[0]).colors
  return {
    type: s.type,
    data: s.rows
      .filter(r => r.label.trim() || r.value.trim())
      .map(r => {
        const v = parseFloat(r.value)
        return { label: r.label.trim(), value: Number.isFinite(v) ? v : 0 }
      }),
    title: s.title.trim() || undefined,
    showValues: s.showValues,
    showLegend: s.showLegend,
    palette,
    ...chartSize(s.type, s.showLegend),
    fontFamily: DEFAULT_CHART_FONT,
  }
}

function fromConfig(c: any): ChartState | null {
  if (!c || !Array.isArray(c.data) || !CHART_TYPES.some(t => t.type === c.type)) return null
  const palette = CHART_PALETTES.find(p => p.colors.join() === (c.palette || []).join())
  return {
    type: c.type,
    rows: c.data.map((d: any) => ({ label: String(d?.label ?? ''), value: String(d?.value ?? '') })),
    title: c.title || '',
    showValues: !!c.showValues,
    showLegend: !!c.showLegend,
    paletteId: palette ? palette.id : 'brand',
  }
}

function ChartsTool({ editor }: { editor: any }) {
  const { activeObject } = useEditorContext() as any
  const [state, setState] = useState<ChartState>(DEFAULT_CHART)
  const [csvOpen, setCsvOpen] = useState(false)
  const [csv, setCsv] = useState('')
  const set = <K extends keyof ChartState>(k: K, v: ChartState[K]) => setState(prev => ({ ...prev, [k]: v }))

  const selectedChart = activeObject?.metadata?.chart ? activeObject : null

  // Selecting a chart on the canvas loads its config for editing.
  useEffect(() => {
    if (!selectedChart) return
    const loaded = fromConfig(selectedChart.metadata.chart)
    if (loaded) setState(loaded)
  }, [selectedChart])

  const config = useMemo(() => toConfig(state), [state])
  const svg = useMemo(() => renderChartSVG(config), [config])
  const isPie = state.type === 'pie' || state.type === 'donut'

  const updateRow = (i: number, patch: Partial<Row>) =>
    setState(prev => ({ ...prev, rows: prev.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
  const removeRow = (i: number) => setState(prev => ({ ...prev, rows: prev.rows.filter((_, j) => j !== i) }))
  const addRow = () => setState(prev => ({ ...prev, rows: [...prev.rows, { label: `Item ${prev.rows.length + 1}`, value: '10' }] }))

  const applyCsv = () => {
    const parsed = parseChartCSV(csv)
    if (!parsed.length) {
      notify('No "label,value" lines found.', 'warning')
      return
    }
    set('rows', parsed.map(d => ({ label: d.label, value: String(d.value) })))
    setCsvOpen(false)
    setCsv('')
  }

  const add = () => {
    if (!config.data.length) {
      notify('Add at least one data row first.', 'warning')
      return
    }
    if (insertSvg(editor, svg, config.width, config.height, { metadata: { chart: config } })) notify('Chart added', 'positive')
  }

  const update = () => {
    const canvas = getCanvas(editor)
    const old = selectedChart
    if (!canvas || !old) return
    if (!config.data.length) {
      notify('Add at least one data row first.', 'warning')
      return
    }
    const displayWidth = typeof old.getScaledWidth === 'function' ? old.getScaledWidth() : undefined
    const placement = { left: old.left, top: old.top, angle: old.angle || 0 }
    try {
      // Remove first so the add's history snapshot reflects only the new chart.
      canvas.remove(old)
    } catch (err) {
      log.error(SCOPE, 'removing the old chart failed', err)
      notify('Could not update that chart.', 'negative')
      return
    }
    if (insertSvg(editor, svg, config.width, config.height, { ...placement, displayWidth, metadata: { chart: config } })) {
      notify('Chart updated', 'positive')
    }
  }

  return (
    <>
      {selectedChart && <Hint $tone="info">Editing the selected chart. Changes apply when you press Update.</Hint>}

      <SectionLabel>Type</SectionLabel>
      <Grid $cols={5}>
        {CHART_TYPES.map(({ type, label, Icon }) => (
          <Tile key={type} type="button" $active={state.type === type} aria-pressed={state.type === type} onClick={() => set('type', type)} title={label}>
            <Icon size={18} strokeWidth={1.8} />
            <span style={{ fontSize: 10.5 }}>{label}</span>
          </Tile>
        ))}
      </Grid>

      <Preview>
        <img src={svgDataUrl(svg)} alt="Chart preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </Preview>

      <SectionLabel>Title</SectionLabel>
      <TextField value={state.title} placeholder="Optional" onChange={e => set('title', (e.target as HTMLInputElement).value)} aria-label="Chart title" />

      <SectionLabel>
        Data
        <KitButton type="button" $variant="ghost" style={{ height: 24, padding: '0 6px', fontSize: 11 }} onClick={() => setCsvOpen(v => !v)}>
          <ClipboardPaste size={13} /> {csvOpen ? 'Rows' : 'Paste CSV'}
        </KitButton>
      </SectionLabel>

      {csvOpen ? (
        <>
          <TextArea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            placeholder={'label,value\nJan,12\nFeb,30'}
            rows={6}
            aria-label="CSV data, one label,value pair per line"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <KitButton type="button" $variant="primary" onClick={applyCsv}>
              Replace rows
            </KitButton>
            <KitButton type="button" onClick={() => setCsvOpen(false)}>
              Cancel
            </KitButton>
          </div>
        </>
      ) : (
        <>
          {state.rows.map((r, i) => (
            <DataRow key={i}>
              <TextField value={r.label} placeholder="Label" onChange={e => updateRow(i, { label: (e.target as HTMLInputElement).value })} aria-label={`Row ${i + 1} label`} />
              <TextField value={r.value} inputMode="decimal" placeholder="0" onChange={e => updateRow(i, { value: (e.target as HTMLInputElement).value })} aria-label={`Row ${i + 1} value`} />
              <IconBtn type="button" onClick={() => removeRow(i)} aria-label={`Remove row ${i + 1}`}>
                <X size={14} />
              </IconBtn>
            </DataRow>
          ))}
          {state.rows.length === 0 && <EmptyNote>No rows yet.</EmptyNote>}
          <KitButton type="button" $block style={{ marginTop: 6 }} onClick={addRow}>
            <Plus size={14} /> Add row
          </KitButton>
        </>
      )}

      <SectionLabel>Options</SectionLabel>
      <Check>
        <input type="checkbox" checked={state.showValues} onChange={e => set('showValues', e.target.checked)} />
        {isPie ? 'Show percentages' : 'Show value labels'}
      </Check>
      {isPie && (
        <Check>
          <input type="checkbox" checked={state.showLegend} onChange={e => set('showLegend', e.target.checked)} />
          Show legend
        </Check>
      )}

      <SectionLabel>Palette</SectionLabel>
      <Grid $cols={2}>
        {CHART_PALETTES.map(p => (
          <Tile key={p.id} type="button" $active={state.paletteId === p.id} aria-pressed={state.paletteId === p.id} onClick={() => set('paletteId', p.id)}>
            <Swatches>
              {p.colors.map(c => (
                <span key={c} style={{ flex: 1, background: c }} />
              ))}
            </Swatches>
            {p.name}
          </Tile>
        ))}
      </Grid>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        {selectedChart && (
          <KitButton type="button" $variant="primary" $block onClick={update}>
            Update chart
          </KitButton>
        )}
        <KitButton type="button" $variant={selectedChart ? 'secondary' : 'primary'} $block onClick={add}>
          <Plus size={15} /> {selectedChart ? 'Add as new chart' : 'Add to design'}
        </KitButton>
      </div>
    </>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

type AppId = 'qr' | 'charts'

export default function Apps() {
  const editor = useEditor() as any
  const { activeObject } = useEditorContext() as any
  // ?app=charts (dashboard quick edit) opens straight on Charts.
  const [app, setApp] = useState<AppId>(() => (new URLSearchParams(window.location.search).get('app') === 'charts' ? 'charts' : 'qr'))

  // Jump to Charts when a chart is selected so it can be edited.
  const chartSelected = !!activeObject?.metadata?.chart
  useEffect(() => {
    if (chartSelected) setApp('charts')
  }, [chartSelected])

  return (
    <PanelRoot>
      <PanelHeader title="Apps" subtitle="Generate QR codes and charts as editable vectors." />
      <PanelBody>
        <Segmented role="tablist">
          <SegBtn type="button" role="tab" aria-selected={app === 'qr'} $active={app === 'qr'} onClick={() => setApp('qr')}>
            <QrCode size={15} /> QR code
          </SegBtn>
          <SegBtn type="button" role="tab" aria-selected={app === 'charts'} $active={app === 'charts'} onClick={() => setApp('charts')}>
            <BarChart3 size={15} /> Charts
          </SegBtn>
        </Segmented>
        {app === 'qr' ? <QrTool editor={editor} /> : <ChartsTool editor={editor} />}
      </PanelBody>
    </PanelRoot>
  )
}

// ─── styles ──────────────────────────────────────────────────────────────────

const Segmented = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '4px',
  padding: '3px',
  borderRadius: radius.md,
  background: color.paper2,
})

const SegBtn = styled('button', ({ $active }: { $active: boolean }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '32px',
  borderWidth: 0,
  borderRadius: radius.sm,
  fontFamily: font.sans,
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  color: $active ? color.ink : color.muted,
  background: $active ? color.white : 'transparent',
  boxShadow: $active ? `0 0 0 1px ${color.line2}` : 'none',
}))

const Grid = styled('div', ({ $cols }: { $cols: number }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${$cols}, minmax(0, 1fr))`,
  gap: '6px',
}))

const Preview = styled('div', ({ $checker }: { $checker?: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '14px',
  padding: '12px',
  minHeight: '120px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line,
  backgroundColor: color.surface,
  backgroundImage: $checker
    ? `linear-gradient(45deg, ${color.paper2} 25%, transparent 25%, transparent 75%, ${color.paper2} 75%), linear-gradient(45deg, ${color.paper2} 25%, transparent 25%, transparent 75%, ${color.paper2} 75%)`
    : 'none',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 8px 8px',
}))

const Hint = styled('div', ({ $tone }: { $tone: 'warn' | 'info' }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginTop: '8px',
  padding: '8px 10px',
  borderRadius: radius.md,
  fontSize: '12px',
  lineHeight: 1.4,
  color: $tone === 'warn' ? color.accentHover : color.ink2,
  background: $tone === 'warn' ? color.accentSoft : color.paper,
}))

const FieldRow = styled('label', {
  display: 'grid',
  gridTemplateColumns: '1fr 72px',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
  fontSize: '12.5px',
  color: color.ink2,
})

const ColorInput = styled('input', {
  width: '100%',
  height: '30px',
  padding: '2px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line2,
  borderRadius: radius.sm,
  background: color.white,
  cursor: 'pointer',
  ':disabled': {
    opacity: 0.4,
    cursor: 'default',
  },
})

const Check = styled('label', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
  fontSize: '12.5px',
  color: color.ink2,
  cursor: 'pointer',
})

const DataRow = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 72px 28px',
  gap: '6px',
  alignItems: 'center',
  marginBottom: '6px',
})

const IconBtn = styled('button', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  padding: 0,
  borderWidth: 0,
  borderRadius: radius.sm,
  background: 'transparent',
  color: color.muted,
  cursor: 'pointer',
  ':hover': {
    background: color.hover,
    color: color.ink,
  },
})

const TextArea = styled('textarea', {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line2,
  borderRadius: radius.md,
  background: color.white,
  fontFamily: font.mono,
  fontSize: '12px',
  lineHeight: 1.5,
  color: color.ink,
  outline: 'none',
  resize: 'vertical',
  ':focus': {
    borderColor: color.ink,
  },
})

const Swatches = styled('div', {
  display: 'flex',
  width: '100%',
  height: '14px',
  borderRadius: radius.sm,
  overflow: 'hidden',
})
