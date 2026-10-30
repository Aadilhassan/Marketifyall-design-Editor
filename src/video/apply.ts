/**
 * The single writer of time-dependent object state on the live canvas.
 *
 * Given a `FrameState` from `evaluateTimeline`, it sets each object's opacity,
 * position/scale/rotation (keyframe animations from `utils/animation` + clip
 * transitions), wipe reveal and kinetic text — in that order, from one
 * captured "authored" base per object. Nothing else may write these props
 * during playback; that's what removes the old flicker from five competing
 * opacity writers.
 *
 * Authored state:
 *  - captured the first time an object is touched;
 *  - if anything else changes a tracked prop (user drag, toolbox), the change
 *    is detected on the next frame and becomes the new authored base;
 *  - `withAuthoredState` swaps the authored values in around serialisation
 *    (autosave, server save) so saves never contain a hidden/mid-animation frame;
 *  - `restoreAuthored` puts everything back (unmount, export).
 *
 * Rest rule (kept from the old AnimationDriver): paused at t≈0, animated
 * objects show their authored pose so they can be edited.
 */
import { fabric } from 'fabric'
import { computeTextReveal, evaluateAnimation, hasActiveAnimation } from '@/utils/animation/engine'
import { PresetContext } from '@/utils/animation/presets'
import { AnimTransform, ElementAnimation, PresetDirection } from '@/utils/animation/types'
import { ignoreError } from '@/lib/logger'
import { FrameState, ObjectState, objectWindow } from './evaluate'
import { ObjectRef, VideoProject } from './model'

type AnyObj = any

const REST_EPS = 0.015
const NUM_EPS = 1e-4
const TEXT_TYPES = ['textbox', 'text', 'i-text', 'StaticText', 'DynamicText']
const isTextObject = (o: AnyObj) => !!o && (TEXT_TYPES.includes(o.type) || /text/i.test(o.type || ''))

export const isPageObject = (o: AnyObj): boolean =>
  !o || o.type === 'Frame' || o.type === 'Background' || o.name === 'clip' || o.id === 'clip'

interface Base {
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
  clipPath: AnyObj
  text?: string
  objectCaching: boolean
}

interface Applied {
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
  opacity: number
  text?: string
}

const bases: WeakMap<object, Base> = new WeakMap()
const applied: WeakMap<object, Applied> = new WeakMap()
const tracked: Set<AnyObj> = new Set()
const wipeClips: WeakMap<object, AnyObj> = new WeakMap()
/** Objects drawing a live <video>: must never get object caching back. */
const liveMedia: WeakSet<object> = new WeakSet()
let suspended = 0

export function setLiveMedia(obj: AnyObj, on: boolean): void {
  if (on) liveMedia.add(obj)
  else liveMedia.delete(obj)
}

// ---------------------------------------------------------------------------
// Object identity
// ---------------------------------------------------------------------------

const anonIds: WeakMap<object, string> = new WeakMap()
let anonCounter = 0

/** Id the timeline knows this object by: its fabric id, else the legacy `metadata.id`. */
export function objectKey(obj: AnyObj, referenced?: Set<string>): string {
  const id = obj?.id
  const mid = obj?.metadata?.id
  if (referenced && mid && !(id && referenced.has(id)) && referenced.has(mid)) return mid
  if (id) return String(id)
  if (mid) return String(mid)
  let a = anonIds.get(obj)
  if (!a) {
    a = `__anon-${++anonCounter}`
    anonIds.set(obj, a)
  }
  return a
}

export interface CanvasEntry extends ObjectRef {
  obj: AnyObj
}

/** Canvas content objects in layer order with their timeline ids. */
export function collectObjects(canvas: AnyObj, project: VideoProject): CanvasEntry[] {
  const referenced = new Set<string>()
  project.clips.forEach(c => c.objectId && referenced.add(c.objectId))
  const out: CanvasEntry[] = []
  const list: AnyObj[] = canvas?.getObjects?.() || []
  for (const obj of list) {
    if (isPageObject(obj)) continue
    out.push({ id: objectKey(obj, referenced), metadata: obj.metadata, obj })
  }
  return out
}

/** Page frame rect in canvas coordinates (falls back to the canvas size). */
export function pageRect(canvas: AnyObj): { left: number; top: number; width: number; height: number } {
  const frame = (canvas?.getObjects?.() || []).find((o: AnyObj) => o?.type === 'Frame')
  if (frame) {
    const w = (frame.width || 0) * (frame.scaleX || 1)
    const h = (frame.height || 0) * (frame.scaleY || 1)
    const left = frame.originX === 'center' ? frame.left - w / 2 : frame.left
    const top = frame.originY === 'center' ? frame.top - h / 2 : frame.top
    return { left, top, width: w, height: h }
  }
  return { left: 0, top: 0, width: canvas?.getWidth?.() || 0, height: canvas?.getHeight?.() || 0 }
}

// ---------------------------------------------------------------------------
// Base capture / restore
// ---------------------------------------------------------------------------

function capture(obj: AnyObj): Base {
  return {
    left: obj.left || 0,
    top: obj.top || 0,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
    angle: obj.angle || 0,
    opacity: obj.opacity == null ? 1 : obj.opacity,
    width: obj.width || 1,
    height: obj.height || 1,
    originX: obj.originX || 'left',
    originY: obj.originY || 'top',
    clipPath: obj.clipPath,
    text: isTextObject(obj) ? obj.text : undefined,
    objectCaching: obj.objectCaching !== false,
  }
}

const differs = (a: number, b: number) => Math.abs(a - b) > NUM_EPS

/** Someone other than us changed the object since our last write → adopt it as authored. */
function externallyChanged(obj: AnyObj): boolean {
  const a = applied.get(obj)
  if (!a) return false
  return (
    differs(obj.left || 0, a.left) ||
    differs(obj.top || 0, a.top) ||
    differs(obj.scaleX ?? 1, a.scaleX) ||
    differs(obj.scaleY ?? 1, a.scaleY) ||
    differs(obj.angle || 0, a.angle) ||
    differs(obj.opacity == null ? 1 : obj.opacity, a.opacity) ||
    (a.text !== undefined && obj.text !== a.text)
  )
}

function ensureBase(obj: AnyObj): Base {
  let b = bases.get(obj)
  if (b && externallyChanged(obj)) {
    const fresh = capture(obj)
    // Keep the authored pieces we own (caching flag, clip path) — only the edited values move.
    b = { ...fresh, objectCaching: b.objectCaching, clipPath: b.clipPath }
    bases.set(obj, b)
  }
  if (!b) {
    b = capture(obj)
    bases.set(obj, b)
  }
  tracked.add(obj)
  return b
}

function setSafe(obj: AnyObj, props: Record<string, any>): void {
  try {
    obj.set(props)
  } catch (err) {
    ignoreError(err, 'frozen object cannot take timeline props')
  }
}

function restoreBase(obj: AnyObj, b: Base): void {
  const props: Record<string, any> = {
    left: b.left,
    top: b.top,
    scaleX: b.scaleX,
    scaleY: b.scaleY,
    angle: b.angle,
    opacity: b.opacity,
  }
  if (b.text !== undefined && obj.text !== b.text) props.text = b.text
  if (wipeClips.has(obj) && obj.clipPath === wipeClips.get(obj)) props.clipPath = b.clipPath
  setSafe(obj, props)
  wipeClips.delete(obj)
  obj.setCoords?.()
}

function remember(obj: AnyObj): void {
  applied.set(obj, {
    left: obj.left || 0,
    top: obj.top || 0,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
    angle: obj.angle || 0,
    opacity: obj.opacity == null ? 1 : obj.opacity,
    text: isTextObject(obj) ? obj.text : undefined,
  })
}

function release(obj: AnyObj): void {
  const b = bases.get(obj)
  if (b) {
    restoreBase(obj, b)
    try {
      if (!liveMedia.has(obj)) obj.objectCaching = b.objectCaching
    } catch (err) {
      ignoreError(err, 'frozen object keeps its caching flag')
    }
  }
  bases.delete(obj)
  applied.delete(obj)
  tracked.delete(obj)
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

function baseCenter(b: Base): { x: number; y: number } {
  const w = b.width * b.scaleX
  const h = b.height * b.scaleY
  const x = b.originX === 'center' ? b.left : b.originX === 'right' ? b.left - w / 2 : b.left + w / 2
  const y = b.originY === 'center' ? b.top : b.originY === 'bottom' ? b.top - h / 2 : b.top + h / 2
  return { x, y }
}

function presetCtx(anim: ElementAnimation, b: Base): PresetContext {
  const intensity = (anim.in?.intensity ?? anim.out?.intensity ?? anim.emphasis?.intensity) ?? 1
  const direction: PresetDirection = anim.in?.direction ?? anim.out?.direction ?? 'up'
  return { intensity, direction, width: b.width * b.scaleX, height: b.height * b.scaleY }
}

export function legacyWindow(obj: AnyObj): { start: number; duration: number } {
  const md = obj.metadata || {}
  return {
    start: typeof md.timelineStart === 'number' ? md.timelineStart : 0,
    duration: typeof md.timelineDuration === 'number' ? md.timelineDuration : 5,
  }
}

function wipeClip(obj: AnyObj, b: Base, reveal: number): AnyObj {
  let rect = wipeClips.get(obj)
  if (!rect) {
    rect = new fabric.Rect({ originX: 'left', originY: 'top', left: 0, top: 0, width: 1, height: 1 })
    wipeClips.set(obj, rect)
  }
  rect.set({ left: -b.width / 2, top: -b.height / 2, width: Math.max(0.001, b.width * reveal), height: b.height })
  return rect
}

export interface ApplyOptions {
  project: VideoProject
  playing: boolean
  page: { width: number; height: number }
}

/**
 * Write one evaluated frame onto the canvas objects. Does not render; the
 * caller issues one `requestRenderAll` per frame.
 */
export function applyFrame(entries: CanvasEntry[], frame: FrameState, opts: ApplyOptions, canvas?: AnyObj): void {
  if (suspended > 0) return
  const t = frame.time
  const atRest = !opts.playing && t <= REST_EPS
  const busy = canvas?._currentTransform?.target
  const seen = new Set<AnyObj>()

  for (const { id, obj } of entries) {
    try {
      seen.add(obj)
      // Never fight the user mid-drag or mid-typing.
      if (obj === busy || obj.isEditing) continue
      const s: ObjectState | undefined = frame.objects[id]
      const anim: ElementAnimation | undefined = obj.metadata?.anim
      const animated = hasActiveAnimation(anim)
      const timelineIdentity = !s || (s.visible && s.opacity >= 1 && !s.transform)
      if (!animated && timelineIdentity) {
        if (bases.has(obj)) release(obj)
        continue
      }
      const b = ensureBase(obj)
      restoreBase(obj, b)

      if (s && !s.visible) {
        setSafe(obj, { opacity: 0 })
        remember(obj)
        continue
      }

      let tf: AnimTransform = { tx: 0, ty: 0, scale: 1, rotate: 0, opacity: 1 }
      let reveal: string | null = null
      if (animated && !atRest) {
        const win = objectWindow(opts.project, id, legacyWindow(obj))
        if (t < win.start || t >= win.start + win.duration) {
          // Outside its window an animated element is hidden (old driver rule).
          setSafe(obj, { opacity: 0 })
          remember(obj)
          continue
        }
        tf = evaluateAnimation(anim as ElementAnimation, win.start, win.duration, t, presetCtx(anim as ElementAnimation, b))
        if (b.text !== undefined && anim?.text && anim.text.preset !== 'none') {
          reveal = computeTextReveal(anim as ElementAnimation, win.start, win.duration, t, b.text)
        }
      }

      const tr = s?.transform
      const scale = tf.scale * (tr ? tr.scale : 1)
      const opacity = Math.max(0, Math.min(1, b.opacity * (s ? s.opacity : 1) * tf.opacity))
      const moves = tf.tx !== 0 || tf.ty !== 0 || scale !== 1 || tf.rotate !== 0 || (tr && (tr.tx !== 0 || tr.ty !== 0))
      if (animated || tr) {
        try {
          obj.objectCaching = false
        } catch (err) {
          ignoreError(err, 'frozen object renders cached')
        }
      }
      setSafe(obj, { opacity })
      if (moves) {
        const c = baseCenter(b)
        setSafe(obj, { scaleX: b.scaleX * scale, scaleY: b.scaleY * scale, angle: b.angle + tf.rotate })
        const x = c.x + tf.tx + (tr ? tr.tx * opts.page.width : 0)
        const y = c.y + tf.ty + (tr ? tr.ty * opts.page.height : 0)
        obj.setPositionByOrigin(new fabric.Point(x, y), 'center', 'center')
      }
      if (tr && tr.reveal !== undefined && tr.reveal < 1 && !b.clipPath) {
        setSafe(obj, { clipPath: wipeClip(obj, b, tr.reveal) })
      }
      if (reveal != null && obj.text !== reveal) {
        setSafe(obj, { text: reveal })
        // Typewriter grows rightward from the authored left edge.
        const c = baseCenter(b)
        obj.setPositionByOrigin(new fabric.Point(c.x - (b.width * b.scaleX) / 2, c.y), 'left', 'center')
      }
      obj.dirty = true
      obj.setCoords?.()
      remember(obj)
    } catch (err) {
      ignoreError(err, 'one object must not break the frame')
    }
  }
  // Objects that left the canvas (page switch, delete) are forgotten.
  const live = new Set<AnyObj>(canvas?.getObjects?.() || [])
  tracked.forEach(o => {
    if (!seen.has(o) && !live.has(o)) {
      bases.delete(o)
      applied.delete(o)
      tracked.delete(o)
    }
  })
}

/** Put one object back to its authored state and stop tracking it (re-captured next frame). */
export function forgetObject(obj: AnyObj): void {
  if (tracked.has(obj) || bases.has(obj)) release(obj)
}

/** Put every touched object back to its authored state and stop tracking it. */
export function restoreAuthored(canvas?: AnyObj): void {
  Array.from(tracked).forEach(o => {
    try {
      release(o)
    } catch (err) {
      ignoreError(err, 'restore of a removed object')
    }
  })
  canvas?.requestRenderAll?.()
}

/**
 * Run `fn` with every object in its authored state (no render happens in
 * between), then put the current frame back. Use around serialisation.
 */
export function withAuthoredState<T>(fn: () => T): T {
  const snapshot: Array<[AnyObj, Record<string, any>]> = []
  tracked.forEach(o => {
    const b = bases.get(o)
    if (!b) return
    snapshot.push([
      o,
      { left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle, opacity: o.opacity, text: o.text, clipPath: o.clipPath },
    ])
    restoreBase(o, b)
  })
  try {
    return fn()
  } finally {
    snapshot.forEach(([o, props]) => {
      const p = { ...props }
      if (p.text === undefined) delete p.text
      setSafe(o, p)
      if (p.clipPath && p.clipPath !== bases.get(o)?.clipPath) wipeClips.set(o, p.clipPath)
      o.setCoords?.()
    })
  }
}

/** Stop applying frames (and show authored state) until the returned function is called. */
export function suspendApplier(canvas?: AnyObj): () => void {
  restoreAuthored(canvas)
  suspended++
  let done = false
  return () => {
    if (done) return
    done = true
    suspended = Math.max(0, suspended - 1)
  }
}

export const isApplierSuspended = (): boolean => suspended > 0

// ---------------------------------------------------------------------------
// Dip-to-black overlay
// ---------------------------------------------------------------------------

const dips: WeakMap<object, number> = new WeakMap()

export function setDip(canvas: AnyObj, amount: number): void {
  dips.set(canvas, amount)
}

/** Draw the frame-level black overlay after each render. Returns the uninstaller. */
export function installDipOverlay(canvas: AnyObj): () => void {
  const onAfter = (e?: { ctx?: CanvasRenderingContext2D }) => {
    const amount = dips.get(canvas) || 0
    // renderTop fires without a ctx — only paint over the main (lower) render.
    const ctx = e?.ctx
    if (amount <= 0.001 || !ctx) return
    const r = pageRect(canvas)
    const v = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
    ctx.save()
    ctx.setTransform(v[0], v[1], v[2], v[3], v[4], v[5])
    ctx.globalAlpha = Math.min(1, amount)
    ctx.fillStyle = '#000'
    ctx.fillRect(r.left, r.top, r.width, r.height)
    ctx.restore()
  }
  canvas.on?.('after:render', onAfter)
  return () => {
    canvas.off?.('after:render', onAfter)
    dips.delete(canvas)
  }
}

/** Replace (not mutate) metadata — some template objects are frozen. */
export function writeMetadata(obj: AnyObj, patch: Record<string, any>): void {
  const next = { ...(obj.metadata || {}), ...patch }
  Object.keys(patch).forEach(k => patch[k] === undefined && delete next[k])
  try {
    obj.metadata = next
  } catch (err) {
    try {
      Object.defineProperty(obj, 'metadata', { value: next, configurable: true, writable: true, enumerable: true })
    } catch (e) {
      ignoreError(e, 'frozen object keeps its metadata')
    }
    ignoreError(err, 'metadata reassigned via defineProperty')
  }
}
