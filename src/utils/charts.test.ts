/** @jest-environment node */
import { renderChartSVG, parseChartCSV, escapeXml, BRAND_PALETTE } from './charts'
import type { ChartConfig, ChartDatum } from './charts'

const DATA: ChartDatum[] = [
  { label: 'Jan', value: 12 },
  { label: 'Feb', value: 30 },
  { label: 'Mar', value: 18 },
  { label: 'Apr', value: 24 },
]

function cfg(overrides: Partial<ChartConfig> = {}): ChartConfig {
  return {
    type: 'bar',
    data: DATA,
    showValues: true,
    showLegend: true,
    palette: BRAND_PALETTE,
    width: 800,
    height: 500,
    fontFamily: 'Space Grotesk, sans-serif',
    ...overrides,
  }
}

const count = (svg: string, tag: string) => (svg.match(new RegExp(`<${tag}[\\s>/]`, 'g')) || []).length

function expectValidSvg(svg: string) {
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
  expect(svg.endsWith('</svg>')).toBe(true)
  expect(svg).toMatch(/width="\d+(\.\d+)?" height="\d+(\.\d+)?" viewBox="0 0 /)
  expect(svg).not.toMatch(/NaN|Infinity|undefined/)
  // Fabric's SVG parser constraints
  expect(svg).not.toMatch(/<tspan|<style|<foreignObject|transform=/)
}

describe('renderChartSVG', () => {
  it('bar: one rect per datum', () => {
    const svg = renderChartSVG(cfg({ type: 'bar' }))
    expectValidSvg(svg)
    expect(count(svg, 'rect')).toBe(DATA.length)
  })

  it('horizontal bar: one rect per datum', () => {
    const svg = renderChartSVG(cfg({ type: 'hbar' }))
    expectValidSvg(svg)
    expect(count(svg, 'rect')).toBe(DATA.length)
  })

  it('line: one circle per point and a single line path', () => {
    const svg = renderChartSVG(cfg({ type: 'line' }))
    expectValidSvg(svg)
    expect(count(svg, 'circle')).toBe(DATA.length)
    expect(count(svg, 'path')).toBe(1)
  })

  it('pie: one arc path per slice, legend swatches when enabled', () => {
    const svg = renderChartSVG(cfg({ type: 'pie' }))
    expectValidSvg(svg)
    expect(count(svg, 'path')).toBe(DATA.length)
    expect(svg).toContain(' A ')
    expect(count(svg, 'rect')).toBe(DATA.length)
    const noLegend = renderChartSVG(cfg({ type: 'pie', showLegend: false }))
    expect(count(noLegend, 'rect')).toBe(0)
  })

  it('donut: one ring-segment path per slice', () => {
    const svg = renderChartSVG(cfg({ type: 'donut', showLegend: false }))
    expectValidSvg(svg)
    expect(count(svg, 'path')).toBe(DATA.length)
  })

  it('pie with a single slice renders a full circle; donut a full ring', () => {
    const one = [{ label: 'All', value: 5 }]
    const pie = renderChartSVG(cfg({ type: 'pie', data: one, showLegend: false }))
    expectValidSvg(pie)
    expect(count(pie, 'circle')).toBe(1)
    expect(count(pie, 'path')).toBe(0)
    expect(pie).toContain('100%')
    const donut = renderChartSVG(cfg({ type: 'donut', data: one, showLegend: false }))
    expectValidSvg(donut)
    expect(count(donut, 'path')).toBe(1)
    expect(donut).toContain('fill-rule="evenodd"')
  })

  it('pie skips zero/negative slices', () => {
    const svg = renderChartSVG(
      cfg({
        type: 'pie',
        showLegend: false,
        data: [
          { label: 'a', value: 3 },
          { label: 'b', value: 0 },
          { label: 'c', value: -2 },
          { label: 'd', value: 1 },
        ],
      })
    )
    expectValidSvg(svg)
    expect(count(svg, 'path')).toBe(2)
  })

  it.each(['bar', 'hbar', 'line', 'pie', 'donut'] as const)('%s: handles empty data', type => {
    const svg = renderChartSVG(cfg({ type, data: [] }))
    expectValidSvg(svg)
    expect(svg).toContain('No data')
  })

  it.each(['bar', 'hbar', 'line', 'pie', 'donut'] as const)('%s: all-zero values produce no NaN', type => {
    const svg = renderChartSVG(cfg({ type, data: [{ label: 'a', value: 0 }, { label: 'b', value: 0 }] }))
    expectValidSvg(svg)
  })

  it.each(['bar', 'hbar', 'line'] as const)('%s: negative and mixed values produce no NaN', type => {
    const svg = renderChartSVG(
      cfg({ type, data: [{ label: 'a', value: -5 }, { label: 'b', value: 10 }, { label: 'c', value: -0.5 }] })
    )
    expectValidSvg(svg)
    expect(svg).toContain('-5')
  })

  it('treats non-finite values as zero', () => {
    const svg = renderChartSVG(cfg({ data: [{ label: 'x', value: NaN }, { label: 'y', value: Infinity }, { label: 'z', value: 4 }] }))
    expectValidSvg(svg)
    expect(count(svg, 'rect')).toBe(3)
  })

  it('escapes XML in labels and title', () => {
    const evil = '<b>&"Tom\'s"</b>'
    for (const type of ['bar', 'hbar', 'line', 'pie'] as const) {
      const svg = renderChartSVG(cfg({ type, title: 'A & B <c>', data: [{ label: evil, value: 1 }, { label: 'ok', value: 2 }] }))
      expectValidSvg(svg)
      expect(svg).not.toContain('<b>')
      expect(svg).toContain('A &amp; B &lt;c&gt;')
      expect(svg).toMatch(/&lt;b&gt;&amp;&quot;/)
    }
  })

  it('falls back to the brand palette when palette is empty', () => {
    const svg = renderChartSVG(cfg({ palette: [] }))
    expect(svg).toContain(`fill="${BRAND_PALETTE[0]}"`)
  })

  it('uses the configured font family', () => {
    expect(renderChartSVG(cfg())).toContain('font-family="Space Grotesk, sans-serif"')
  })
})

describe('escapeXml', () => {
  it('escapes all five XML entities', () => {
    expect(escapeXml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&apos;')
  })
})

describe('parseChartCSV', () => {
  it('parses label,value lines, skipping header and blanks', () => {
    expect(parseChartCSV('Month,Sales\nJan, 10\n\nFeb,2.5\n')).toEqual([
      { label: 'Jan', value: 10 },
      { label: 'Feb', value: 2.5 },
    ])
  })
  it('keeps commas inside the label (splits on the last separator)', () => {
    expect(parseChartCSV('"Paris, FR",7')).toEqual([{ label: 'Paris, FR', value: 7 }])
  })
  it('accepts tabs and negatives', () => {
    expect(parseChartCSV('a\t-3')).toEqual([{ label: 'a', value: -3 }])
  })
})
