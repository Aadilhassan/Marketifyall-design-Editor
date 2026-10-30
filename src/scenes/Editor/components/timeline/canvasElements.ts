/**
 * The canvas side of the timeline: which elements are on the page (with the
 * ids clips use), their display names/kinds, whether anything is animated,
 * and helpers to add elements/media and wait for the new object.
 *
 * Re-computed on object add/remove/modify (coalesced to one per frame) and
 * only published when the visible summary changes — playback frames don't
 * fire these events, so nothing here runs per tick.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { collectObjects, isPageObject, objectKey, writeMetadata } from '@/video/apply'
import { Asset, VideoProject, makeId } from '@/video/model'
import { hasActiveAnimation } from '@/utils/animation/engine'
import type { VideoClip } from '@/contexts/VideoContext'
import { ignoreError } from '@/lib/logger'

type AnyObj = any

export type ElementKind = 'text' | 'image' | 'shape' | 'video'

export interface ElementInfo {
  id: string
  kind: ElementKind
  name: string
  animated: boolean
}

const TEXT_TYPES = ['textbox', 'text', 'i-text', 'StaticText', 'DynamicText']

export function elementKind(o: AnyObj): ElementKind {
  if (o?.metadata?.isVideo || o?.metadata?.videoSrc || o?.metadata?.assetId) return 'video'
  if (TEXT_TYPES.includes(o?.type) || /text/i.test(o?.type || '')) return 'text'
  if (o?.type === 'StaticImage' || o?.type === 'image') return 'image'
  return 'shape'
}

export function elementName(o: AnyObj): string {
  const kind = elementKind(o)
  const text = typeof o?.text === 'string' ? o.text : o?.metadata?.text
  if (kind === 'text' && text) return String(text).replace(/\s+/g, ' ').trim().slice(0, 40) || 'Text'
  if (o?.metadata?.name) return String(o.metadata.name).slice(0, 40)
  if (o?.name && o.name !== 'clip') return String(o.name).slice(0, 40)
  return kind === 'image' ? 'Image' : kind === 'video' ? 'Video' : 'Shape'
}

function legacyAnimated(md: AnyObj): boolean {
  return !!md && !!md.animation && md.animation !== 'none'
}

/**
 * Element clips are keyed by object id, so every content object needs one
 * that survives save/load (the SDK serialises `id` and `metadata`). Objects
 * created without one get a fresh id, mirrored into `metadata.id`.
 */
export function ensureId(o: AnyObj): void {
  if (isPageObject(o) || o.id || o.metadata?.id) return
  try {
    o.id = makeId('el')
    writeMetadata(o, { id: o.id })
  } catch (err) {
    ignoreError(err, 'frozen object keeps an anonymous timeline id')
  }
}

export function ensureIds(canvas: AnyObj): void {
  const list: AnyObj[] = canvas?.getObjects?.() || []
  list.forEach(ensureId)
}

export function useCanvasElements(canvas: AnyObj, project: VideoProject): { elements: ElementInfo[]; byId: Map<string, ElementInfo>; version: number } {
  const [state, setState] = useState<{ elements: ElementInfo[]; sig: string; version: number }>({ elements: [], sig: '', version: 0 })
  const projectRef = useRef(project)
  projectRef.current = project

  const recompute = useRef<() => void>(() => undefined)
  recompute.current = () => {
    if (!canvas) return
    ensureIds(canvas)
    const entries = collectObjects(canvas, projectRef.current)
    const elements = entries.map(e => ({ id: e.id, kind: elementKind(e.obj), name: elementName(e.obj), animated: hasActiveAnimation(e.obj.metadata?.anim) || legacyAnimated(e.obj.metadata) }))
    const sig = elements.map(e => `${e.id}:${e.kind}:${e.name}:${e.animated ? 1 : 0}`).join('|')
    setState(prev => (prev.sig === sig ? prev : { elements, sig, version: prev.version + 1 }))
  }

  useEffect(() => {
    if (!canvas) return
    let raf = 0
    const bump = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        recompute.current()
      })
    }
    bump()
    const events = ['object:added', 'object:removed', 'object:modified', 'text:changed']
    events.forEach(ev => canvas.on?.(ev, bump))
    return () => {
      if (raf) cancelAnimationFrame(raf)
      events.forEach(ev => canvas.off?.(ev, bump))
    }
  }, [canvas])

  // Clip ids change which key an object is known by (objectKey's `referenced`).
  const clipObjects = project.clips.map(c => c.objectId || '').join('|')
  useEffect(() => {
    recompute.current()
  }, [clipObjects])

  const byId = useMemo(() => new Map(state.elements.map(e => [e.id, e])), [state.elements])
  return { elements: state.elements, byId, version: state.version }
}

// ---------------------------------------------------------------------------
// Adding things
// ---------------------------------------------------------------------------

export function frameSizeOf(canvas: AnyObj): { width: number; height: number } {
  const f = canvas?.getObjects?.().find((o: AnyObj) => o.type === 'Frame')
  return f ? { width: f.width * (f.scaleX || 1), height: f.height * (f.scaleY || 1) } : { width: 900, height: 1200 }
}

/** Resolve with the next object added to the canvas (its timeline id), or null after `timeoutMs`. */
export function nextAddedObject(canvas: AnyObj, timeoutMs = 3000): Promise<string | null> {
  return new Promise(resolve => {
    if (!canvas?.on) {
      resolve(null)
      return
    }
    const onAdd = (e: AnyObj) => {
      const o = e?.target
      if (!o || isPageObject(o)) return
      ensureId(o)
      done(objectKey(o))
    }
    const timer = setTimeout(() => done(null), timeoutMs)
    function done(id: string | null) {
      clearTimeout(timer)
      canvas.off?.('object:added', onAdd)
      resolve(id)
    }
    canvas.on('object:added', onAdd)
  })
}

function placement(w: number, h: number, frame: { width: number; height: number }) {
  const k = Math.min(1, (frame.width * 0.8) / w, (frame.height * 0.6) / h)
  return { scale: k, left: (frame.width - w * k) / 2, top: (frame.height - h * k) / 2 }
}

function placeholderPoster(w: number, h: number): string {
  try {
    const c = document.createElement('canvas')
    c.width = Math.max(16, Math.round(w / 8))
    c.height = Math.max(9, Math.round(h / 8))
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#2b2620'
      ctx.fillRect(0, 0, c.width, c.height)
    }
    return c.toDataURL('image/png')
  } catch (err) {
    ignoreError(err, 'placeholder poster unavailable in this environment')
    return ''
  }
}

/**
 * Put another clip of an existing video asset on the timeline: a new poster
 * object on the page + a main-track clip at `start` (compat addClip → one undo step).
 */
export async function placeVideoAsset(
  editor: AnyObj,
  canvas: AnyObj,
  asset: Asset,
  addClip: (clip: VideoClip) => void,
  start?: number,
  makeId: () => string = () => `video-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
): Promise<string> {
  const frame = frameSizeOf(canvas)
  const pw = asset.width || 1280
  const ph = asset.height || 720
  const { scale, left, top } = placement(pw, ph, frame)
  const id = makeId()
  await editor.add({
    type: 'StaticImage',
    metadata: { src: asset.poster || placeholderPoster(pw, ph), name: asset.name, duration: asset.duration, id, isVideo: true, assetId: asset.id },
    width: pw,
    height: ph,
    left,
    top,
    scaleX: scale,
    scaleY: scale,
    opacity: 1,
  })
  addClip({ id, name: asset.name, src: '', duration: asset.duration, start: start as number, end: (start || 0) + asset.duration, poster: asset.poster, objectId: id, assetId: asset.id })
  return id
}
