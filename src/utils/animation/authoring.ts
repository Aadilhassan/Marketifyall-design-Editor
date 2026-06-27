/**
 * Authoring helpers: read/write the animation model on a fabric object and
 * notify the canvas so the driver, timeline and overlays pick up the change.
 */
import { invalidateBase } from './driver'
import { ANIM_VERSION, ElementAnimation, PresetCategory, PresetInstance, TextRevealInstance } from './types'

type AnyObj = any

export function readAnimation(obj: AnyObj): ElementAnimation {
  if (!obj) return {}
  return (obj.metadata && (obj.metadata.anim as ElementAnimation)) || {}
}

// Replace the whole metadata object rather than mutating it — scenify/template
// objects are frozen/non-extensible, so `obj.metadata.anim = x` throws
// "Cannot add property anim, object is not extensible".
function writeMetadata(obj: AnyObj, patch: Record<string, any>): void {
  const current = obj.metadata && typeof obj.metadata === 'object' ? obj.metadata : {}
  const next = { ...current, ...patch }
  try {
    obj.metadata = next
  } catch {
    // Even reassigning failed (object fully frozen) — fall back to defineProperty.
    try {
      Object.defineProperty(obj, 'metadata', { value: next, configurable: true, writable: true, enumerable: true })
    } catch {
      /* give up silently */
    }
  }
}

function commit(canvas: AnyObj, obj: AnyObj, anim: ElementAnimation): void {
  const md = obj.metadata || {}
  writeMetadata(obj, {
    anim: { ...anim, version: ANIM_VERSION },
    // Ensure the element has a timeline window so the driver/timeline know its span.
    timelineStart: typeof md.timelineStart === 'number' ? md.timelineStart : 0,
    timelineDuration: typeof md.timelineDuration === 'number' ? md.timelineDuration : 5,
  })
  invalidateBase(obj)
  if (canvas) {
    if (typeof canvas.fire === 'function') canvas.fire('object:modified', { target: obj })
    if (typeof canvas.requestRenderAll === 'function') canvas.requestRenderAll()
  }
}

export function setPreset(
  canvas: AnyObj,
  obj: AnyObj,
  category: PresetCategory,
  instance: PresetInstance | null
): void {
  if (!obj) return
  const anim = { ...readAnimation(obj) }
  if (!instance || instance.preset === 'none') {
    delete anim[category]
  } else {
    anim[category] = instance
  }
  commit(canvas, obj, anim)
}

export function setTextReveal(canvas: AnyObj, obj: AnyObj, instance: TextRevealInstance | null): void {
  if (!obj) return
  const anim = { ...readAnimation(obj) }
  if (!instance || instance.preset === 'none') {
    delete anim.text
  } else {
    anim.text = instance
  }
  commit(canvas, obj, anim)
}

export function clearAnimation(canvas: AnyObj, obj: AnyObj): void {
  if (!obj) return
  writeMetadata(obj, { anim: undefined })
  invalidateBase(obj)
  if (canvas) {
    if (typeof canvas.fire === 'function') canvas.fire('object:modified', { target: obj })
    if (typeof canvas.requestRenderAll === 'function') canvas.requestRenderAll()
  }
}

/** A short human label of what's animated, for the timeline/badge. */
export function animationSummary(obj: AnyObj): string {
  const a = readAnimation(obj)
  const parts: string[] = []
  if (a.in && a.in.preset !== 'none') parts.push(a.in.preset)
  if (a.emphasis && a.emphasis.preset !== 'none') parts.push(a.emphasis.preset)
  if (a.out && a.out.preset !== 'none') parts.push(a.out.preset)
  return parts.join(' · ')
}
