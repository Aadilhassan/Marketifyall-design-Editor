/**
 * Animation driver — applies ElementAnimations to live fabric objects based on
 * a global timeline time. This is the single authority that turns the keyframe
 * model into on-canvas motion; because VideoCanvasPlayer mirrors live object
 * props into its DOM overlays, animating the fabric object animates the preview
 * everywhere (canvas + overlay) with one code path.
 *
 * State (captured base transform, last opacity, prior caching flag) is held in
 * a WeakMap keyed by the fabric object — NOT as properties on the object —
 * because scenify/template objects are frozen/non-extensible and would throw on
 * `obj.__animBase = ...`. The WeakMap also avoids leaking memory.
 */
import { fabric } from 'fabric'
import { computeTextReveal, evaluateAnimation, hasActiveAnimation } from './engine'
import { PresetContext } from './presets'
import { AnimTransform, ElementAnimation, PresetDirection } from './types'

const TEXT_TYPES = ['textbox', 'text', 'i-text', 'StaticText', 'DynamicText']
function isTextObject(obj: any): boolean {
  return !!obj && (TEXT_TYPES.includes(obj.type) || /text/i.test(obj.type || ''))
}

const REST_EPS = 0.015

interface AnimBase {
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
  opacity: number
  width: number
  height: number
  originX: string
  originY: string
}

interface AnimState {
  base: AnimBase
  opacity: number // last applied opacity (read by the DOM overlay mirror)
  cachingWas: boolean
  fullText?: string // original text content (for kinetic text reveal)
}

type AnyObj = any

// Per-object animation state. WeakMap so we never mutate (possibly frozen) objects.
const stateMap: WeakMap<object, AnimState> = new WeakMap()

export function getObjectAnimation(obj: AnyObj): ElementAnimation | undefined {
  return obj && obj.metadata && obj.metadata.anim
}

/** Last opacity the driver applied to this object (for the DOM overlay mirror). */
export function getAnimOpacity(obj: AnyObj): number | undefined {
  const s = obj && stateMap.get(obj)
  return s ? s.opacity : undefined
}

export function getObjectWindow(obj: AnyObj): { start: number; duration: number } {
  const md = obj.metadata || {}
  const start = typeof md.timelineStart === 'number' ? md.timelineStart : 0
  const duration = typeof md.timelineDuration === 'number' ? md.timelineDuration : 5
  return { start, duration }
}

function captureBase(obj: AnyObj): AnimBase {
  return {
    left: obj.left || 0,
    top: obj.top || 0,
    scaleX: obj.scaleX || 1,
    scaleY: obj.scaleY || 1,
    angle: obj.angle || 0,
    opacity: obj.opacity == null ? 1 : obj.opacity,
    width: obj.width || 1,
    height: obj.height || 1,
    originX: obj.originX || 'left',
    originY: obj.originY || 'top',
  }
}

function ensureState(obj: AnyObj): AnimState {
  let s = stateMap.get(obj)
  if (!s) {
    s = {
      base: captureBase(obj),
      opacity: obj.opacity == null ? 1 : obj.opacity,
      cachingWas: obj.objectCaching !== false,
      fullText: isTextObject(obj) ? (obj.text as string) || '' : undefined,
    }
    // Render animated objects uncached so per-frame transforms never flash a
    // stale cache canvas. Wrapped because some objects are frozen.
    try {
      obj.objectCaching = false
    } catch {
      /* frozen object — fabric will still render it each frame */
    }
    stateMap.set(obj, s)
  }
  return s
}

function baseCenter(base: AnimBase): { x: number; y: number } {
  const w = base.width * base.scaleX
  const h = base.height * base.scaleY
  const x =
    base.originX === 'center' ? base.left : base.originX === 'right' ? base.left - w / 2 : base.left + w / 2
  const y =
    base.originY === 'center' ? base.top : base.originY === 'bottom' ? base.top - h / 2 : base.top + h / 2
  return { x, y }
}

function restoreBase(obj: AnyObj, base: AnimBase): void {
  obj.set({
    left: base.left,
    top: base.top,
    scaleX: base.scaleX,
    scaleY: base.scaleY,
    angle: base.angle,
    opacity: base.opacity,
  })
  obj.setCoords()
}

function applyTransform(obj: AnyObj, base: AnimBase, tf: AnimTransform): void {
  const center = baseCenter(base)
  obj.set({
    scaleX: base.scaleX * tf.scale,
    scaleY: base.scaleY * tf.scale,
    angle: base.angle + tf.rotate,
    opacity: Math.max(0, Math.min(1, base.opacity * tf.opacity)),
  })
  // Position so the element's CENTER lands at base-center + translation. This
  // makes scale and rotation pivot around the center regardless of origin.
  obj.setPositionByOrigin(new fabric.Point(center.x + tf.tx, center.y + tf.ty), 'center', 'center')
  obj.dirty = true
  obj.setCoords()
}

function restoreText(obj: AnyObj, s: AnimState): void {
  if (s.fullText != null && obj.text !== s.fullText) {
    obj.set('text', s.fullText)
    obj.dirty = true
  }
}

/** Reveal a substring of the text and keep its left edge anchored (typewriter feel). */
function applyTextReveal(obj: AnyObj, base: AnimBase, reveal: string): void {
  if (obj.text !== reveal) {
    obj.set('text', reveal)
    obj.dirty = true
  }
  // Keep the left edge fixed where the full text started so it grows rightward.
  const c = baseCenter(base)
  const leftEdge = c.x - (base.width * base.scaleX) / 2
  obj.setPositionByOrigin(new fabric.Point(leftEdge, c.y), 'left', 'center')
  obj.setCoords()
}

function presetCtx(obj: AnyObj, base: AnimBase): PresetContext {
  const anim = getObjectAnimation(obj)
  const intensity =
    (anim && (anim.in?.intensity ?? anim.out?.intensity ?? anim.emphasis?.intensity)) ?? 1
  const direction: PresetDirection = (anim && (anim.in?.direction ?? anim.out?.direction)) || 'up'
  return {
    intensity,
    direction,
    width: base.width * base.scaleX,
    height: base.height * base.scaleY,
  }
}

/** Apply all element animations on the canvas for the given global time. */
export function applyAnimationsToCanvas(canvas: AnyObj, globalTime: number, playing: boolean): boolean {
  if (!canvas || typeof canvas.getObjects !== 'function') return false
  const objects = canvas.getObjects()
  let touched = false
  const atRest = !playing && globalTime <= REST_EPS

  for (const obj of objects) {
   try {
    if (!obj || obj.name === 'clip' || obj.id === 'clip' || obj.type === 'Frame') continue
    const anim = getObjectAnimation(obj)

    if (!hasActiveAnimation(anim)) {
      // Object lost its animation — make sure it's back at base.
      const s = stateMap.get(obj)
      if (s) {
        try {
          restoreText(obj, s)
          restoreBase(obj, s.base)
          obj.objectCaching = s.cachingWas
        } catch {
          /* ignore */
        }
        stateMap.delete(obj)
        touched = true
      }
      continue
    }

    const s = ensureState(obj)
    const base = s.base

    if (atRest) {
      // Show authored state while editing.
      restoreText(obj, s)
      restoreBase(obj, base)
      s.opacity = base.opacity
      touched = true
      continue
    }

    restoreBase(obj, base)
    const { start, duration } = getObjectWindow(obj)

    // Outside the element's timeline window the element is hidden — the driver is
    // the single authority for animated objects' visibility AND motion.
    if (globalTime < start || globalTime >= start + duration) {
      obj.set('opacity', 0)
      s.opacity = 0
      touched = true
      continue
    }

    const animObj = anim as ElementAnimation
    const tf = evaluateAnimation(animObj, start, duration, globalTime, presetCtx(obj, base))
    applyTransform(obj, base, tf)

    // Kinetic text reveal (typewriter / by-word) — renders on the canvas so it exports.
    if (s.fullText != null && animObj.text && animObj.text.preset !== 'none') {
      const reveal = computeTextReveal(animObj, start, duration, globalTime, s.fullText)
      if (reveal != null) applyTextReveal(obj, base, reveal)
    } else if (s.fullText != null) {
      restoreText(obj, s)
    }

    s.opacity = obj.opacity
    touched = true
   } catch {
    /* never let one object break the whole pass */
   }
  }

  if (touched && typeof canvas.requestRenderAll === 'function') {
    canvas.requestRenderAll()
  }
  return touched
}

/** Restore every animated object to its authored base (e.g. when leaving playback). */
export function restoreAllBases(canvas: AnyObj): void {
  if (!canvas || typeof canvas.getObjects !== 'function') return
  for (const obj of canvas.getObjects()) {
    const s = stateMap.get(obj)
    if (s) {
      try {
        restoreText(obj, s)
        restoreBase(obj, s.base)
        obj.objectCaching = s.cachingWas
      } catch {
        /* ignore */
      }
    }
  }
  if (typeof canvas.requestRenderAll === 'function') canvas.requestRenderAll()
}

/** Forget the cached base for an object so it re-captures authored props (call after a user edit at rest). */
export function invalidateBase(obj: AnyObj): void {
  if (obj) stateMap.delete(obj)
}
