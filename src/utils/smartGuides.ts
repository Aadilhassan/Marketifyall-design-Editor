/**
 * Canva-style smart guides: while dragging, snap the object's edges/centre to
 * the page's edges/centre and to other objects, and draw the matching guide
 * lines. Works in canvas (scene) coordinates; the threshold is in screen pixels
 * so snapping feels the same at every zoom level.
 */
import { color } from '../theme/tokens'
import { getActiveGuides } from './guides'

const SNAP_PX = 6

type Box = { left: number; top: number; width: number; height: number }
type Guide = { axis: 'x' | 'y'; pos: number; from: number; to: number }

const isPageObj = (o: any) =>
  !!o && (o.type === 'Frame' || o.type === 'Background' || o.type === 'StaticFrame' || o.name === 'clip' || o.id === 'clip')

const xs = (b: Box) => [b.left, b.left + b.width / 2, b.left + b.width]
const ys = (b: Box) => [b.top, b.top + b.height / 2, b.top + b.height]

/** Best snap along one axis. Exported for tests. */
export function findSnap(moving: number[], targets: number[], threshold: number): { delta: number; at: number } | null {
  let best: { delta: number; at: number } | null = null
  for (const m of moving) {
    for (const t of targets) {
      const d = t - m
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, at: t }
    }
  }
  return best
}

export function attachSmartGuides(canvas: any): () => void {
  let guides: Guide[] = []

  const frameBox = (): Box | null => {
    const frame = canvas.getObjects().find((o: any) => o.type === 'Frame')
    return frame ? frame.getBoundingRect(true, true) : null
  }

  const onMoving = (e: any) => {
    const target = e?.target
    if (!target || isPageObj(target)) return
    const zoom = canvas.getZoom?.() || 1
    const threshold = SNAP_PX / zoom
    target.setCoords()
    const box: Box = target.getBoundingRect(true, true)

    const others: Box[] = []
    const page = frameBox()
    if (page) others.push(page)
    const movingSet = new Set(target.type === 'activeSelection' ? target.getObjects() : [target])
    canvas.getObjects().forEach((o: any) => {
      if (isPageObj(o) || movingSet.has(o) || !o.visible) return
      others.push(o.getBoundingRect(true, true))
    })

    // User ruler guides (design px, page-relative) become extra snap lines.
    const user = page ? getActiveGuides(canvas) : null
    const guideXs = user ? user.x.map(v => page.left + v) : []
    const guideYs = user ? user.y.map(v => page.top + v) : []

    const sx = findSnap(xs(box), [...others.flatMap(xs), ...guideXs], threshold)
    const sy = findSnap(ys(box), [...others.flatMap(ys), ...guideYs], threshold)
    if (sx) target.set('left', target.left + sx.delta)
    if (sy) target.set('top', target.top + sy.delta)
    if (sx || sy) target.setCoords()

    // Guide extents span the moved box and every object aligned on that line.
    const snapped: Box = { ...box, left: box.left + (sx?.delta || 0), top: box.top + (sy?.delta || 0) }
    guides = []
    if (sx) {
      const aligned = [snapped, ...others].filter(b => xs(b).some(v => Math.abs(v - sx.at) < 0.5))
      guides.push({ axis: 'x', pos: sx.at, from: Math.min(...aligned.map(b => b.top)), to: Math.max(...aligned.map(b => b.top + b.height)) })
    }
    if (sy) {
      const aligned = [snapped, ...others].filter(b => ys(b).some(v => Math.abs(v - sy.at) < 0.5))
      guides.push({ axis: 'y', pos: sy.at, from: Math.min(...aligned.map(b => b.left)), to: Math.max(...aligned.map(b => b.left + b.width)) })
    }
  }

  const clear = () => {
    if (!guides.length) return
    guides = []
    canvas.requestRenderAll()
  }

  const draw = () => {
    if (!guides.length) return
    const ctx = canvas.getContext()
    const vpt = canvas.viewportTransform
    const zoom = canvas.getZoom?.() || 1
    ctx.save()
    ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5])
    ctx.strokeStyle = color.accent
    ctx.lineWidth = 1 / zoom
    ctx.setLineDash([4 / zoom, 3 / zoom])
    ctx.beginPath()
    guides.forEach(g => {
      if (g.axis === 'x') {
        ctx.moveTo(g.pos, g.from)
        ctx.lineTo(g.pos, g.to)
      } else {
        ctx.moveTo(g.from, g.pos)
        ctx.lineTo(g.to, g.pos)
      }
    })
    ctx.stroke()
    ctx.restore()
  }

  canvas.on('object:moving', onMoving)
  canvas.on('mouse:up', clear)
  canvas.on('selection:cleared', clear)
  canvas.on('after:render', draw)
  return () => {
    canvas.off('object:moving', onMoving)
    canvas.off('mouse:up', clear)
    canvas.off('selection:cleared', clear)
    canvas.off('after:render', draw)
  }
}
