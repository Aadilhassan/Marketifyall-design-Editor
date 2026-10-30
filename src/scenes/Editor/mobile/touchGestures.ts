import { fabric } from 'fabric'
import { ignoreError, log } from '@/lib/logger'
import { LONG_PRESS_MS, movedBeyond, pinchStep, Pt } from './gestureMath'

/**
 * Touch on the stage, all breakpoints:
 *  - two fingers: pinch-zoom around the midpoint + pan. Goes through the SDK
 *    zoomHandler.zoomToPoint so the zoom % and fit/manual mode stay in sync
 *    (useStageViewport wraps it).
 *  - long-press (500 ms, no movement) on an object opens the existing
 *    ContextMenu at that point (it listens for `contextmenu` on the canvas).
 *
 * Fabric 4.6 reads *touch* events (not pointer events) on upperCanvasEl, plus
 * document-level touchmove/touchend once a touch starts. So pointers are
 * tracked with pointer events (capture on wrapperEl), and fabric is kept out of
 * a gesture by stopping touch events before they reach it: the second
 * finger's touchstart at wrapperEl (capture), and every touchmove at window
 * (capture, which runs before fabric's document listener). touchend is left
 * alone — fabric needs the final one to reset its main-touch id.
 */
export interface TouchGestureOptions {
  /** Re-apply the pan clamp after a manual viewport change. */
  clampPan: () => void
}

type FabricCanvas = any

/** Undo whatever fabric started with the first finger (drag, scale, marquee). */
function cancelFabricInteraction(canvas: FabricCanvas): void {
  try {
    const t = canvas._currentTransform
    if (t?.target && t.original) {
      t.target.set(t.original)
      t.target.setCoords()
    }
    canvas._currentTransform = null
    canvas._groupSelector = null
    canvas.requestRenderAll()
  } catch (err) {
    ignoreError(err, 'resetting fabric private transform state before a pinch')
  }
}

export function attachTouchGestures(canvas: FabricCanvas, zoomHandler: any, opts: TouchGestureOptions): () => void {
  const wrapper: HTMLElement = canvas.wrapperEl
  const upper: HTMLElement = canvas.upperCanvasEl
  const pointers = new Map<number, Pt>()
  let last: [Pt, Pt] | null = null
  // true from the moment a gesture (pinch or long-press) owns the touch
  // sequence until every finger is up
  let suppressing = false
  let press: { id: number; start: Pt; timer: number; hasTarget: boolean } | null = null
  let swallowClickUntil = 0

  const local = (p: Pt): Pt => {
    const r = upper.getBoundingClientRect()
    return { x: p.x - r.left, y: p.y - r.top }
  }
  const pair = (): [Pt, Pt] => {
    const v = Array.from(pointers.values())
    return [v[0], v[1]]
  }
  const clearPress = () => {
    if (press) window.clearTimeout(press.timer)
    press = null
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 1) {
      let hasTarget = false
      try {
        const target = canvas.findTarget(e, false)
        hasTarget = !!target && target.selectable !== false
      } catch (err) {
        ignoreError(err, 'findTarget for long-press is best-effort')
      }
      const start = { x: e.clientX, y: e.clientY }
      press = {
        id: e.pointerId,
        start,
        hasTarget,
        timer: window.setTimeout(() => fireLongPress(start), LONG_PRESS_MS),
      }
    } else {
      clearPress()
    }
    if (pointers.size === 2) {
      suppressing = true
      last = pair()
      cancelFabricInteraction(canvas)
    }
  }

  const fireLongPress = (at: Pt) => {
    const p = press
    press = null
    if (!p || !p.hasTarget || pointers.size !== 1) return
    suppressing = true // a finger drift after the menu opens must not move the object
    cancelFabricInteraction(canvas)
    try {
      upper.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, button: 2 })
      )
    } catch (err) {
      log.warn('touch', 'could not open the context menu from a long-press', err)
    }
    if (navigator.vibrate) navigator.vibrate(10)
  }

  let frame = 0
  const applyStep = () => {
    frame = 0
    if (!last || pointers.size < 2) return
    const next = pair()
    const step = pinchStep(last, next)
    last = next
    try {
      const anchor = local(step.anchor)
      zoomHandler.zoomToPoint(new fabric.Point(anchor.x, anchor.y), canvas.getZoom() * step.scale)
      const vpt = canvas.viewportTransform.slice()
      vpt[4] += step.pan.x
      vpt[5] += step.pan.y
      canvas.setViewportTransform(vpt)
      opts.clampPan()
      canvas.requestRenderAll()
      canvas.fire('viewport:changed')
    } catch (err) {
      log.warn('touch', 'pinch step failed', err)
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return
    const p = { x: e.clientX, y: e.clientY }
    pointers.set(e.pointerId, p)
    if (press && press.id === e.pointerId && movedBeyond(press.start, p)) clearPress()
    if (last && pointers.size >= 2 && !frame) frame = requestAnimationFrame(applyStep)
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return
    if (press?.id === e.pointerId) clearPress()
    if (pointers.size < 2) last = null
    if (pointers.size === 0) {
      if (suppressing) swallowClickUntil = performance.now() + 350
      suppressing = false
    }
  }

  // --- keep fabric out of a gesture -----------------------------------------
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length < 2) return
    e.preventDefault()
    e.stopPropagation()
  }
  const onTouchMove = (e: TouchEvent) => {
    if (!suppressing) return
    e.preventDefault()
    e.stopPropagation()
  }
  // a tap synthesised after a gesture must not close the menu it just opened
  const onClick = (e: MouseEvent) => {
    if (performance.now() < swallowClickUntil) {
      swallowClickUntil = 0
      e.stopPropagation()
      e.preventDefault()
    }
  }

  // iOS Safari zooms the whole page on pinch unless its gesture events are cancelled
  const onGesture = (e: Event) => e.preventDefault()

  wrapper.addEventListener('pointerdown', onPointerDown, { capture: true })
  wrapper.addEventListener('gesturestart', onGesture)
  wrapper.addEventListener('gesturechange', onGesture)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  wrapper.addEventListener('touchstart', onTouchStart, { capture: true, passive: false })
  window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
  window.addEventListener('click', onClick, { capture: true })

  return () => {
    clearPress()
    cancelAnimationFrame(frame)
    wrapper.removeEventListener('pointerdown', onPointerDown, { capture: true } as any)
    wrapper.removeEventListener('gesturestart', onGesture)
    wrapper.removeEventListener('gesturechange', onGesture)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    wrapper.removeEventListener('touchstart', onTouchStart, { capture: true } as any)
    window.removeEventListener('touchmove', onTouchMove, { capture: true } as any)
    window.removeEventListener('click', onClick, { capture: true } as any)
  }
}

/**
 * Finger-sized selection handles on coarse pointers. Fabric hit-tests touch
 * with `touchCornerSize` (the SDK's controls don't override it); `padding`
 * puts a little air between the object and its handles. Global prototype
 * defaults, so only applied when the primary pointer is coarse.
 */
export function applyTouchControlSizing(): void {
  const proto: any = fabric.Object.prototype
  proto.touchCornerSize = 44
  proto.padding = 6
  ;['ml', 'mr', 'mt', 'mb', 'tl', 'tr', 'bl', 'br', 'mtr'].forEach(key => {
    const ctrl = proto.controls?.[key]
    if (ctrl) {
      ctrl.touchSizeX = 44
      ctrl.touchSizeY = 44
    }
  })
}
