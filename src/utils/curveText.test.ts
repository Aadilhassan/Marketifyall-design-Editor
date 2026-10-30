import { fabric } from 'fabric'
import {
  curveArcLength,
  curveGeometry,
  curveRadius,
  curveSide,
  curveStartOffset,
  curveSweep,
  installCurvedText,
  normalizeCurve,
  readCurveAmount,
  setTextCurve,
} from './curveText'

/** Parse the numbers of every command in a path string. */
function commands(d: string): { cmd: string; args: number[] }[] {
  return (d.match(/[MA][^MA]*/g) || []).map(seg => ({
    cmd: seg[0],
    args: seg.slice(1).trim().split(/\s+/).filter(Boolean).map(Number),
  }))
}

describe('curve geometry', () => {
  it('0 (and NaN / garbage) means no path', () => {
    expect(curveGeometry(0, 200, 32)).toBeNull()
    expect(curveGeometry(NaN, 200, 32)).toBeNull()
    expect(curveGeometry(undefined as any, 200, 32)).toBeNull()
    expect(curveRadius(0, 200, 32)).toBe(Infinity)
  })

  it('clamps and sanitises the amount', () => {
    expect(normalizeCurve(150)).toBe(100)
    expect(normalizeCurve(-150)).toBe(-100)
    expect(normalizeCurve(NaN)).toBe(0)
    expect(normalizeCurve(Infinity)).toBe(0)
    expect(normalizeCurve('40')).toBe(0)
  })

  it('is NaN-safe for width and font size', () => {
    const g = curveGeometry(50, NaN, NaN)
    expect(g).not.toBeNull()
    expect(g.d).not.toMatch(/NaN|Infinity|e[+-]/)
    expect(Number.isFinite(g.radius)).toBe(true)
    expect(Number.isFinite(g.pathStartOffset)).toBe(true)
  })

  it('is symmetric for +/- amounts (same radius, mirrored vertically)', () => {
    for (const a of [1, 10, 37, 50, 80, 100]) {
      const up = curveGeometry(a, 240, 32)
      const down = curveGeometry(-a, 240, 32)
      expect(up.radius).toBeCloseTo(down.radius, 9)
      expect(up.arcLength).toBeCloseTo(down.arcLength, 9)
      expect(up.side).toBe(down.side)
      // the baseline arc (from the 3rd M) mirrors in y; sweep flag flips
      const cu = commands(up.d).slice(2)
      const cd = commands(down.d).slice(2)
      expect(cu[0].args[0]).toBeCloseTo(cd[0].args[0], 3)
      expect(cu[0].args[1]).toBeCloseTo(-cd[0].args[1], 3)
      expect(cu[2].args[5]).toBeCloseTo(cd[2].args[5], 3)
      expect(cu[2].args[6]).toBeCloseTo(-cd[2].args[6], 3)
      expect(cu[1].args[4]).toBe(1)
      expect(cd[1].args[4]).toBe(0)
    }
  })

  it('bends up for positive and down for negative', () => {
    // arc ends lie below the apex (y down) for a frown, above it for a smile
    const up = commands(curveGeometry(40, 200, 32).d)[2].args
    const down = commands(curveGeometry(-40, 200, 32).d)[2].args
    expect(up[1]).toBeGreaterThan(0)
    expect(down[1]).toBeLessThan(0)
  })

  it('radius shrinks monotonically as |amount| grows', () => {
    let prev = Infinity
    for (let a = 1; a <= 100; a++) {
      const r = curveRadius(a, 300, 40)
      expect(r).toBeLessThan(prev)
      expect(curveRadius(-a, 300, 40)).toBeCloseTo(r, 9)
      prev = r
    }
    // small amounts are nearly flat, 100 nearly closes the circle
    expect(curveRadius(1, 300, 40)).toBeGreaterThan(300 * 10)
    expect(curveSweep(100)).toBeGreaterThan(2 * Math.PI * 0.95)
    expect(curveSweep(100)).toBeLessThan(2 * Math.PI)
    expect(2 * Math.PI * curveRadius(100, 300, 40)).toBeGreaterThan(curveArcLength(300, 40))
  })

  it('arc length always fits the text', () => {
    for (const w of [0, 1, 20, 300, 2000]) {
      for (const a of [1, -1, 50, -75, 100]) {
        const g = curveGeometry(a, w, 24)
        expect(g.arcLength).toBeGreaterThanOrEqual(w)
        expect(g.radius * g.sweep).toBeCloseTo(g.arcLength, 6)
      }
    }
  })

  it('centres the text on the arc for every alignment', () => {
    const L = 120
    const w = 100
    // fabric's own start position per align (see fabric.Text#_measureLine)
    const start = (align: string, reverse: boolean) =>
      align === 'center'
        ? (L - w) / 2
        : align === 'left'
        ? reverse
          ? L - w
          : 0
        : align === 'right'
        ? reverse
          ? 0
          : L - w
        : 0
    for (const align of ['left', 'center', 'right', 'justify']) {
      for (const side of ['left', 'right'] as const) {
        const off = curveStartOffset(L, w, align, side)
        const final = start(align, side === 'right') + off * (side === 'right' ? -1 : 1)
        expect(final).toBeCloseTo((L - w) / 2, 9)
      }
    }
    expect(curveStartOffset(L, w, 'center', 'left')).toBe(0)
  })

  it('keeps letters on the left side (path always runs left to right)', () => {
    expect(curveSide(50)).toBe('left')
    expect(curveSide(-50)).toBe('left')
    expect(curveGeometry(-50, 100, 20).side).toBe('left')
  })
})

describe('fabric integration', () => {
  let restore: (() => void) | null = null

  beforeAll(() => {
    // jsdom has no 2D canvas; give fabric a deterministic text measurer.
    const proto: any = (HTMLCanvasElement as any).prototype
    const original = proto.getContext
    const ctx: any = new Proxy(
      {
        // fabric measures at CACHE_FONT_SIZE (400) and scales down: 10px/char at 20px
        measureText: (t: string) => ({ width: t.length * 200 }),
        canvas: { setAttribute: () => undefined },
      },
      {
        get: (target: any, key) => (key in target ? target[key] : () => undefined),
        set: () => true,
      }
    )
    proto.getContext = () => ctx
    ;(fabric as any)._measuringContext = ctx
    restore = () => {
      proto.getContext = original
      ;(fabric as any)._measuringContext = null
    }
    installCurvedText(fabric)
  })

  afterAll(() => restore?.())

  const make = () =>
    new fabric.Textbox('Hello curved world', {
      left: 10,
      top: 10,
      width: 60,
      fontSize: 20,
      textAlign: 'center',
    } as any)

  it('fabric 4.6 has text-on-path support', () => {
    expect((fabric as any).version).toMatch(/^4\.6/)
    expect('pathStartOffset' in (fabric.Text as any).prototype).toBe(true)
  })

  it('curving a textbox sets a hidden path, single line, box around the arc', () => {
    const tb: any = make()
    expect(tb._textLines.length).toBeGreaterThan(1) // wraps at width 60
    setTextCurve(tb, 60)
    expect(readCurveAmount(tb)).toBe(60)
    expect(tb.path).toBeInstanceOf(fabric.Path)
    expect(tb.path.visible).toBe(false)
    expect(tb.pathSide).toBe('left')
    expect(tb._textLines.length).toBe(1) // curved text does not wrap
    expect(tb.width).toBeCloseTo(tb.path.width, 6)
    expect(tb.height).toBeCloseTo(tb.path.height, 6)
    // every glyph gets a finite position on the path (measured lazily)
    tb.getLineWidth(0)
    tb.__charBounds[0].slice(0, -1).forEach((b: any) => {
      expect(Number.isFinite(b.renderLeft)).toBe(true)
      expect(Number.isFinite(b.renderTop)).toBe(true)
    })
  })

  it('centres glyphs on the arc: ends level, middle at the apex', () => {
    for (const [amount, align] of [
      [50, 'center'],
      [-50, 'left'],
      [80, 'right'],
    ] as const) {
      const tb: any = new fabric.Textbox('ABCDEFG', { width: 30, fontSize: 20, textAlign: align } as any)
      setTextCurve(tb, amount)
      tb.getLineWidth(0)
      const b = tb.__charBounds[0]
      const first = b[0]
      const mid = b[3]
      const last = b[6]
      expect(first.renderTop).toBeCloseTo(last.renderTop, 0)
      expect(first.renderLeft).toBeCloseTo(-last.renderLeft, 0)
      expect(mid.renderLeft).toBeCloseTo(0, 0)
      // y grows downwards: frown => apex above the ends, smile => below
      expect(Math.sign(first.renderTop - mid.renderTop)).toBe(Math.sign(amount))
      // glyph centres stay inside the object's box
      ;[first, mid, last].forEach((g: any) => {
        expect(Math.abs(g.renderLeft)).toBeLessThanOrEqual(tb.width / 2)
        expect(Math.abs(g.renderTop)).toBeLessThanOrEqual(tb.height / 2)
      })
    }
  })

  it('re-curves when the text changes and keeps the curve', () => {
    const tb: any = make()
    setTextCurve(tb, 40)
    const d1 = tb.path.__curveD
    tb.set('text', 'Hello curved world, now longer')
    expect(tb.path).toBeInstanceOf(fabric.Path)
    expect(tb.path.__curveD).not.toBe(d1)
    expect(readCurveAmount(tb)).toBe(40)
    expect(tb._textLines.length).toBe(1)
  })

  it('setting the curve back to 0 removes the path completely', () => {
    const tb: any = make()
    setTextCurve(tb, -70)
    setTextCurve(tb, 0)
    expect(tb.path).toBeNull()
    expect(tb.metadata.textCurve).toBeUndefined()
    expect(tb.toObject(['metadata']).path).toBeFalsy()
    // box restored wide enough to keep the text on one line
    expect(tb._textLines.length).toBe(1)
  })

  it('keeps other metadata (e.g. text effects) intact', () => {
    const tb: any = make()
    tb.set('metadata', { textEffect: { type: 'shadow' } })
    setTextCurve(tb, 30)
    setTextCurve(tb, 0)
    expect(tb.metadata.textEffect).toEqual({ type: 'shadow' })
  })

  it('round-trips through toObject(["metadata"]) -> enlivenObjects', done => {
    const tb: any = make()
    setTextCurve(tb, 55)
    const json = tb.toObject(['metadata'])
    // fabric serialises the path as a plain object...
    expect(json.path).toBeTruthy()
    expect(Array.isArray(json.path.path)).toBe(true)
    expect(json.metadata.textCurve).toEqual({ amount: 55 })
    fabric.util.enlivenObjects(
      [JSON.parse(JSON.stringify(json))],
      (objs: any[]) => {
        const back = objs[0]
        expect(back.type).toBe('textbox')
        // ...but Textbox.fromObject would leave it plain; the patch rebuilds it
        expect(back.path).toBeInstanceOf(fabric.Path)
        expect(back.path.__curveD).toBe(tb.path.__curveD)
        expect(back.width).toBeCloseTo(tb.width, 6)
        expect(back.height).toBeCloseTo(tb.height, 6)
        expect(readCurveAmount(back)).toBe(55)
        done()
      },
      undefined as any
    )
  })

  it('rebuilds from metadata alone (exporters that drop `path`)', () => {
    const tb: any = make()
    setTextCurve(tb, -45)
    const json = tb.toObject(['metadata'])
    delete json.path
    const back: any = new fabric.Textbox(json.text, json)
    expect(back.path).toBeInstanceOf(fabric.Path)
    expect(back.path.__curveD).toBe(tb.path.__curveD)
  })
})
