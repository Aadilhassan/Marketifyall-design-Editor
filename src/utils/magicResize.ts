/**
 * Magic Resize: change the page size AND re-flow the content into it.
 *
 * The SDK's frame.setSize() only resizes the artboard; content keeps its old
 * coordinates, so going 1080×1080 → 1080×1920 leaves everything bunched in the
 * middle band. Here every user object keeps its position relative to the frame
 * centre (stretched per-axis) and is scaled uniformly by min(sx, sy) so nothing
 * distorts or falls off the page.
 */
import { log } from '../lib/logger'

type Size = { width: number; height: number }

const isPageObj = (o: any) =>
  !!o && (o.type === 'Frame' || o.type === 'Background' || o.type === 'StaticFrame' || o.name === 'clip' || o.id === 'clip')

export const getFabricCanvas = (editor: any) => editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas

function frameBox(canvas: any) {
  const frame = canvas?.getObjects?.().find((o: any) => o.type === 'Frame')
  if (!frame) return null
  const c = frame.getCenterPoint()
  return { cx: c.x, cy: c.y, w: frame.width * (frame.scaleX || 1), h: frame.height * (frame.scaleY || 1) }
}

/** Pure mapping, exported for tests: where an object centre lands and how much it scales. */
export function mapIntoFrame(
  point: { x: number; y: number },
  from: { cx: number; cy: number; w: number; h: number },
  to: { cx: number; cy: number; w: number; h: number },
) {
  const sx = to.w / from.w
  const sy = to.h / from.h
  return {
    x: to.cx + (point.x - from.cx) * sx,
    y: to.cy + (point.y - from.cy) * sy,
    scale: Math.min(sx, sy),
  }
}

export function resizeDesign(editor: any, size: Size, scaleContent = true): void {
  const canvas = getFabricCanvas(editor)
  const before = frameBox(canvas)
  const objects = (canvas?.getObjects?.() || []).filter((o: any) => !isPageObj(o))

  if (!scaleContent || !before || objects.length === 0 || before.w <= 0 || before.h <= 0) {
    editor.frame.setSize(size)
    return
  }

  canvas.discardActiveObject?.()
  editor.frame.setSize(size)
  const after = frameBox(canvas)
  if (!after) return

  const fabric = (window as any).fabric
  objects.forEach((o: any) => {
    try {
      const m = mapIntoFrame(o.getCenterPoint(), before, after)
      o.set({ scaleX: (o.scaleX || 1) * m.scale, scaleY: (o.scaleY || 1) * m.scale })
      o.setPositionByOrigin(new fabric.Point(m.x, m.y), 'center', 'center')
      o.setCoords()
    } catch (err) {
      log.warn('magicResize', 'could not re-flow object', err)
    }
  })
  canvas.requestRenderAll()
  canvas.fire('object:modified', { target: objects[0] })
}
