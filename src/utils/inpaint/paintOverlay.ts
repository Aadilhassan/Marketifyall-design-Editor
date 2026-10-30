/**
 * Brush overlay for the Magic Eraser. A fixed-position host covers the fabric
 * canvas element (so the canvas gets no pointer events while painting and the
 * photo can't be moved), and a <canvas> inside it is mapped exactly onto the
 * selected image with a CSS matrix built from
 *   viewport transform x object transform x (-w/2, -h/2)
 * so it follows zoom, pan, scale, rotation and flips. Strokes are stored in the
 * image's *visible* pixel space (0..obj.width, 0..obj.height; i.e. after crop),
 * which is what magicErase() consumes.
 */
import type { Stroke } from './region'
import { ignoreError } from '../../lib/logger'

export interface PaintOverlay {
  /** Brush diameter in screen px. */
  setBrushSize: (px: number) => void
  undo: () => void
  clear: () => void
  getStrokes: () => Stroke[]
  /** Ignore painting while an erase is running. */
  setBusy: (busy: boolean) => void
  destroy: () => void
}

export interface PaintOverlayOptions {
  brushSize: number
  onChange?: (strokeCount: number) => void
}

type Mat = [number, number, number, number, number, number]

const MASK_RGB = 'rgb(216,64,28)'
const MASK_OPACITY = '0.45' // => rgba(216,64,28,0.45) without overlap build-up
const MAX_BUFFER_SIDE = 4096

function mul(a: Mat, b: Mat): Mat {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ]
}

function inv(m: Mat): Mat {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-12
  const a = m[3] / det
  const b = -m[1] / det
  const c = -m[2] / det
  const d = m[0] / det
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])]
}

function apply(m: Mat, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }
}

export function createPaintOverlay(canvas: any, obj: any, opts: PaintOverlayOptions): PaintOverlay {
  const upper: HTMLCanvasElement | undefined = canvas && (canvas.upperCanvasEl || canvas.lowerCanvasEl)
  if (!upper || !obj || typeof obj.calcTransformMatrix !== 'function') throw new Error('Canvas is not ready')

  const strokes: Stroke[] = []
  let brush = opts.brushSize
  let busy = false
  let destroyed = false
  let drawing: Stroke | null = null
  let M: Mat = [1, 0, 0, 1, 0, 0] // image px -> host px
  let Minv: Mat = [1, 0, 0, 1, 0, 0]
  let screenScale = 1 // host px per image px
  let q = 0 // buffer px per image px
  let raf = 0

  const host = document.createElement('div')
  host.setAttribute('data-magic-eraser-overlay', '')
  host.style.cssText = 'position:fixed;z-index:9000;overflow:hidden;cursor:none;touch-action:none;user-select:none'
  const paint = document.createElement('canvas')
  paint.style.cssText = `position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;opacity:${MASK_OPACITY}`
  const cursor = document.createElement('div')
  cursor.style.cssText =
    'position:absolute;left:0;top:0;display:none;box-sizing:border-box;border-radius:50%;pointer-events:none;' +
    'border:1.5px solid #ffffff;box-shadow:0 0 0 1px rgba(24,20,16,0.55);background:rgba(216,64,28,0.15)'
  host.appendChild(paint)
  host.appendChild(cursor)
  document.body.appendChild(host)
  const ctx = paint.getContext('2d')

  // Lock fabric interaction while painting; restored in destroy().
  const saved = { selection: canvas.selection, skipTargetFind: canvas.skipTargetFind }
  canvas.selection = false
  canvas.skipTargetFind = true

  const emit = () => {
    if (opts.onChange) opts.onChange(strokes.length)
  }

  const drawStroke = (s: Stroke, from: number) => {
    if (!ctx) return
    const p = s.points
    ctx.fillStyle = MASK_RGB
    ctx.strokeStyle = MASK_RGB
    ctx.lineWidth = s.radius * 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (p.length <= 2 || from === 0) {
      ctx.beginPath()
      ctx.arc(p[0], p[1], s.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    if (p.length >= 4) {
      const start = Math.max(0, from - 2)
      ctx.beginPath()
      ctx.moveTo(p[start], p[start + 1])
      for (let i = start + 2; i + 1 < p.length; i += 2) ctx.lineTo(p[i], p[i + 1])
      ctx.stroke()
    }
  }

  const redraw = () => {
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, paint.width, paint.height)
    ctx.setTransform(q, 0, 0, q, 0, 0)
    for (const s of strokes) drawStroke(s, 0)
  }

  const layout = () => {
    if (destroyed) return
    try {
      const rect = upper.getBoundingClientRect()
      const cw = (canvas.getWidth && canvas.getWidth()) || upper.clientWidth || rect.width
      const ch = (canvas.getHeight && canvas.getHeight()) || upper.clientHeight || rect.height
      const sx = cw ? rect.width / cw : 1
      const sy = ch ? rect.height / ch : 1
      const vpt = (canvas.viewportTransform || [1, 0, 0, 1, 0, 0]) as Mat
      const om = obj.calcTransformMatrix() as Mat
      const w = obj.width || 1
      const h = obj.height || 1
      M = mul([sx, 0, 0, sy, 0, 0], mul(vpt, mul(om, [1, 0, 0, 1, -w / 2, -h / 2])))
      Minv = inv(M)
      screenScale = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1

      host.style.left = rect.left + 'px'
      host.style.top = rect.top + 'px'
      host.style.width = rect.width + 'px'
      host.style.height = rect.height + 'px'

      const dpr = window.devicePixelRatio || 1
      const nq = Math.max(0.02, Math.min(1, screenScale * dpr, MAX_BUFFER_SIDE / Math.max(w, h)))
      const bw = Math.max(1, Math.round(w * nq))
      const bh = Math.max(1, Math.round(h * nq))
      if (!q || Math.abs(nq - q) / q > 0.2 || paint.width !== bw || paint.height !== bh) {
        q = nq
        paint.width = Math.max(1, Math.round(w * q))
        paint.height = Math.max(1, Math.round(h * q))
        redraw()
      }
      paint.style.width = w + 'px'
      paint.style.height = h + 'px'
      paint.style.transform = `matrix(${M[0]},${M[1]},${M[2]},${M[3]},${M[4]},${M[5]})`
      cursor.style.width = brush + 'px'
      cursor.style.height = brush + 'px'
    } catch (err) {
      ignoreError(err, 'magic eraser overlay layout (object detached)')
    }
  }

  const schedule = () => {
    if (raf || destroyed) return
    raf = requestAnimationFrame(() => {
      raf = 0
      layout()
    })
  }

  const toImage = (e: PointerEvent) => {
    const hr = host.getBoundingClientRect()
    return apply(Minv, e.clientX - hr.left, e.clientY - hr.top)
  }

  const moveCursor = (e: PointerEvent) => {
    const hr = host.getBoundingClientRect()
    cursor.style.display = 'block'
    cursor.style.transform = `translate(${e.clientX - hr.left - brush / 2}px, ${e.clientY - hr.top - brush / 2}px)`
  }

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || busy) return
    e.preventDefault()
    try {
      host.setPointerCapture(e.pointerId)
    } catch (err) {
      ignoreError(err, 'pointer capture unsupported')
    }
    const p = toImage(e)
    drawing = { points: [p.x, p.y], radius: brush / 2 / screenScale }
    strokes.push(drawing)
    if (ctx) {
      ctx.setTransform(q, 0, 0, q, 0, 0)
      drawStroke(drawing, 0)
    }
  }

  const onMove = (e: PointerEvent) => {
    moveCursor(e)
    if (!drawing) return
    const p = toImage(e)
    const pts = drawing.points
    const lx = pts[pts.length - 2]
    const ly = pts[pts.length - 1]
    const minStep = Math.max(0.5, drawing.radius * 0.2)
    if ((p.x - lx) * (p.x - lx) + (p.y - ly) * (p.y - ly) < minStep * minStep) return
    pts.push(p.x, p.y)
    if (ctx) {
      ctx.setTransform(q, 0, 0, q, 0, 0)
      drawStroke(drawing, pts.length - 2)
    }
  }

  const onUp = (e: PointerEvent) => {
    if (!drawing) return
    const s = drawing
    drawing = null
    try {
      if (host.hasPointerCapture && host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId)
    } catch (err) {
      ignoreError(err, 'pointer capture already released')
    }
    // Drop strokes that never touched the photo.
    const w = obj.width || 1
    const h = obj.height || 1
    let touches = false
    for (let i = 0; i + 1 < s.points.length && !touches; i += 2) {
      const x = s.points[i]
      const y = s.points[i + 1]
      touches = x > -s.radius && y > -s.radius && x < w + s.radius && y < h + s.radius
    }
    if (!touches) {
      strokes.pop()
      redraw()
    }
    emit()
  }

  const onLeave = () => {
    cursor.style.display = 'none'
  }

  // Keep wheel zoom/scroll working while the overlay covers the canvas.
  const onWheel = (e: WheelEvent) => {
    try {
      upper.dispatchEvent(new WheelEvent('wheel', e))
    } catch (err) {
      ignoreError(err, 'wheel forwarding unsupported')
    }
    if (e.ctrlKey || e.metaKey) e.preventDefault()
  }

  host.addEventListener('pointerdown', onDown)
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerup', onUp)
  host.addEventListener('pointercancel', onUp)
  host.addEventListener('pointerleave', onLeave)
  host.addEventListener('wheel', onWheel, { passive: false })
  host.addEventListener('contextmenu', e => e.preventDefault())
  window.addEventListener('resize', schedule)
  window.addEventListener('scroll', schedule, true)
  canvas.on('after:render', schedule)
  layout()

  return {
    setBrushSize: (px: number) => {
      brush = px
      cursor.style.width = px + 'px'
      cursor.style.height = px + 'px'
    },
    undo: () => {
      if (!strokes.length) return
      strokes.pop()
      redraw()
      emit()
    },
    clear: () => {
      strokes.length = 0
      drawing = null
      redraw()
      emit()
    },
    getStrokes: () => strokes.map(s => ({ radius: s.radius, points: s.points.slice() })),
    setBusy: (b: boolean) => {
      busy = b
      if (b) drawing = null
    },
    destroy: () => {
      if (destroyed) return
      destroyed = true
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      try {
        canvas.off('after:render', schedule)
      } catch (err) {
        ignoreError(err, 'canvas already disposed')
      }
      canvas.selection = saved.selection
      canvas.skipTargetFind = saved.skipTargetFind
      if (host.parentNode) host.parentNode.removeChild(host)
    },
  }
}
