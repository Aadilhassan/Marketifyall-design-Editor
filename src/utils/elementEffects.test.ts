import { fabric } from 'fabric'
import {
  DEFAULT_STATE,
  ElementEffectsState,
  FRAMES,
  SHADOW_PRESETS,
  borderWeight,
  borderWidth,
  buildClipPath,
  cornerRadius,
  frameBox,
  readEffectsState,
  scaleFramePath,
  shadowOffset,
  shadowOptions,
  writeEffectsState,
} from './elementEffects'

function coords(d: string) {
  const nums = (d.match(/-?\d*\.?\d+/g) || []).map(Number)
  return { xs: nums.filter((_, i) => i % 2 === 0), ys: nums.filter((_, i) => i % 2 === 1) }
}

describe('shadow', () => {
  it('points the offset along the direction', () => {
    expect(shadowOffset({ offset: 100, direction: 0 }, 200)).toEqual({ x: 30, y: 0 })
    expect(shadowOffset({ offset: 100, direction: 90 }, 200)).toEqual({ x: 0, y: 30 })
    expect(shadowOffset({ offset: 100, direction: 180 }, 200)).toEqual({ x: -30, y: 0 })
    expect(shadowOffset({ offset: 100, direction: -90 }, 200)).toEqual({ x: 0, y: -30 })
    const d = shadowOffset({ offset: 50, direction: 45 }, 200)
    expect(d.x).toBeCloseTo(15 / Math.SQRT2, 1)
    expect(d.y).toBeCloseTo(15 / Math.SQRT2, 1)
  })

  it('maps transparency to rgba alpha', () => {
    const o = shadowOptions('drop', { ...SHADOW_PRESETS.drop, color: '#ff0000', transparency: 25 }, 100)
    expect(o?.color).toBe('rgba(255,0,0,0.75)')
    expect(shadowOptions('drop', { ...SHADOW_PRESETS.drop, color: '#000', transparency: 100 }, 100)?.color).toBe('rgba(0,0,0,0)')
  })

  it('returns null for none and no blur for hard', () => {
    expect(shadowOptions('none', SHADOW_PRESETS.none, 100)).toBeNull()
    const hard = shadowOptions('hard', SHADOW_PRESETS.hard, 100)
    expect(hard?.blur).toBe(0)
    expect(hard?.offsetX).toBeGreaterThan(0)
  })
})

describe('corner radius / border', () => {
  it('clamps at 50% of the shorter side', () => {
    expect(cornerRadius(100, 400, 200)).toBe(100)
    expect(cornerRadius(250, 400, 200)).toBe(100)
    expect(cornerRadius(-5, 400, 200)).toBe(0)
    expect(cornerRadius(50, 400, 200)).toBe(50)
  })

  it('border weight round-trips through stroke width', () => {
    const sw = borderWidth(40, 1000, 500)
    expect(sw).toBe(16)
    expect(borderWeight(sw, 1000, 500)).toBe(40)
    expect(borderWeight(0, 1000, 500)).toBe(0)
  })
})

describe('frames', () => {
  it.each(FRAMES.map(f => [f.id, f.d]))('%s scales to the requested box', (_id, d) => {
    for (const [w, h] of [
      [300, 200],
      [64, 64],
      [1200, 1800],
    ]) {
      const out = scaleFramePath(d, w, h)
      expect(out).not.toMatch(/NaN/)
      const { xs, ys } = coords(out)
      expect(Math.max(...xs)).toBeCloseTo(w, 1)
      expect(Math.max(...ys)).toBeCloseTo(h, 1)
      expect(Math.min(...xs)).toBeCloseTo(0, 1)
      expect(Math.min(...ys)).toBeCloseTo(0, 1)
    }
  })

  it('keeps aspect for circle-like frames', () => {
    expect(frameBox('circle', 400, 200)).toEqual({ w: 200, h: 200 })
    expect(frameBox('rounded', 400, 200)).toEqual({ w: 400, h: 200 })
  })

  it('builds a centred clipPath of the right size', () => {
    const circle = buildClipPath({ ...DEFAULT_STATE, frame: 'circle' }, 400, 200)
    expect(circle.type).toBe('path')
    expect(circle.width).toBeCloseTo(200, 0)
    expect(circle.left).toBe(0)
    expect(circle.originX).toBe('center')
    const rounded = buildClipPath({ ...DEFAULT_STATE, radius: 100 }, 400, 200)
    expect(rounded.type).toBe('rect')
    expect(rounded.rx).toBe(100)
    expect(buildClipPath(DEFAULT_STATE, 400, 200)).toBeNull()
    expect(buildClipPath({ ...DEFAULT_STATE, border: { weight: 10, color: '#fff' } }, 400, 200).rx).toBe(0)
  })
})

describe('state', () => {
  const state: ElementEffectsState = {
    shadow: { preset: 'hard', params: { offset: 20, direction: 135, blur: 0, transparency: 10, color: '#123456' } },
    radius: 30,
    frame: 'heart',
    border: { weight: 12, color: '#abcdef' },
    outline: { width: 4, color: '#ff0000' },
  }

  it('round-trips through metadata and keeps other metadata', () => {
    const md = writeEffectsState({ src: 'x.png' }, state)
    expect(md.src).toBe('x.png')
    expect(readEffectsState(JSON.parse(JSON.stringify(md)))).toEqual(state)
  })

  it('falls back to defaults for missing / bad data', () => {
    expect(readEffectsState(undefined)).toEqual(DEFAULT_STATE)
    const s = readEffectsState({ elementEffects: { frame: 'bogus', shadow: { preset: 'nope' }, radius: 'x' } })
    expect(s.frame).toBe('none')
    expect(s.shadow.preset).toBe('none')
    expect(s.radius).toBe(0)
  })

  it('shadow, clipPath, stroke and metadata survive fabric toObject → enlivenObjects', done => {
    const obj: any = new fabric.Rect({ width: 400, height: 200 })
    obj.set('shadow', new fabric.Shadow(shadowOptions('hard', SHADOW_PRESETS.hard, 400) as any))
    obj.clipPath = buildClipPath(state, 400, 200)
    obj.set({ stroke: '#abcdef', strokeWidth: 5, strokeUniform: true })
    obj.set('metadata', writeEffectsState({}, state))
    const json = JSON.parse(JSON.stringify(obj.toObject(['metadata'])))
    ;(fabric.util as any).enlivenObjects(
      [json],
      (objs: any[]) => {
        const back = objs[0]
        expect(back.shadow.offsetX).toBeGreaterThan(0)
        expect(back.shadow.blur).toBe(0)
        expect(back.clipPath.type).toBe('path')
        expect(back.clipPath.originX).toBe('center')
        expect(back.clipPath.width).toBeCloseTo(200, 0)
        expect(back.stroke).toBe('#abcdef')
        expect(back.strokeUniform).toBe(true)
        expect(readEffectsState(back.metadata)).toEqual(state)
        done()
      },
      '',
    )
  })
})

describe('shaped image border', () => {
  function mockCtx() {
    const calls: [string, number[]][] = []
    const rec = (name: string) => (...args: number[]) => calls.push([name, args])
    return {
      calls,
      ctx: {
        beginPath: rec('beginPath'),
        moveTo: rec('moveTo'),
        lineTo: rec('lineTo'),
        bezierCurveTo: rec('bezierCurveTo'),
        quadraticCurveTo: rec('quadraticCurveTo'),
        closePath: rec('closePath'),
        save: rec('save'),
        restore: rec('restore'),
        translate: rec('translate'),
        scale: rec('scale'),
      } as any,
    }
  }
  const image = () => new (fabric as any).Image(document.createElement('img'), { width: 400, height: 200 })

  it('keeps the default rectangle without a clipPath', () => {
    const img = image()
    img.set({ stroke: '#fff', strokeWidth: 10 })
    const { ctx, calls } = mockCtx()
    img._stroke(ctx)
    expect(calls.find(c => c[0] === 'moveTo')?.[1]).toEqual([-200, -100])
  })

  it('traces a rounded clip, inset by half the stroke', () => {
    const img = image()
    img.set({ stroke: '#fff', strokeWidth: 10 })
    img.clipPath = buildClipPath({ ...DEFAULT_STATE, radius: 50 }, 400, 200)
    const { ctx, calls } = mockCtx()
    img._stroke(ctx)
    // rx 50, inset 5 → x starts at -195 + 45
    expect(calls.find(c => c[0] === 'moveTo')?.[1]).toEqual([-150, -95])
    expect(calls.some(c => c[0] === 'bezierCurveTo')).toBe(true)
  })

  it('traces a frame path', () => {
    const img = image()
    img.set({ stroke: '#fff', strokeWidth: 10 })
    img.clipPath = buildClipPath({ ...DEFAULT_STATE, frame: 'star' }, 400, 200)
    const { ctx, calls } = mockCtx()
    img._stroke(ctx)
    expect(calls.filter(c => c[0] === 'lineTo').length).toBeGreaterThanOrEqual(9)
    expect(calls.find(c => c[0] === 'scale')?.[1][0]).toBeCloseTo(0.95, 2)
  })
})
