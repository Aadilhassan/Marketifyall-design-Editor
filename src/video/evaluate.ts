/**
 * Timeline evaluation — the single source of truth for "what does the frame
 * look like at time t". Pure: preview (playback.ts → apply.ts) and export
 * (render.ts) both call this and only this, so they can't disagree.
 *
 * Per canvas object it answers visibility, an opacity multiplier (fades,
 * crossfades), the media time to show (video) and a transition transform; per
 * frame it lists the audible clips with their gain, plus a full-frame
 * dip-to-black amount.
 *
 * Transition semantics (`clip.transitionIn` on the incoming clip B, with A the
 * clip on the same track that ends where B starts):
 *  - crossfade / slide / wipe / zoom run over [B.start, B.start + d). A is held
 *    on screen during that window, continuing its media past its out point
 *    (clamped to the source length — frozen last frame if there's no handle).
 *  - dip runs over [B.start − d/2, B.start + d/2): the frame fades to black and
 *    back; no hold needed.
 *  - Crossfade alpha goes on whichever of A/B is higher in the layer order, so
 *    "upper over lower" composites to (1−p)·A + p·B.
 *  - Transforms are in fractions of the page (tx/ty) or of the object (scale,
 *    reveal), so the renderer stays resolution independent.
 *
 * Objects no clip refers to are always visible.
 */
import {
  Clip,
  ObjectRef,
  VideoProject,
  clipDuration,
  clipEnd,
  findAsset,
  findTrack,
  projectDuration,
} from './model'

export interface TransitionTransform {
  /** Horizontal offset as a fraction of the page width (+ = right). */
  tx: number
  /** Vertical offset as a fraction of the page height (+ = down). */
  ty: number
  /** Uniform scale around the object's centre. */
  scale: number
  /** 0..1 — visible fraction of the object, revealed from its left edge (wipe). */
  reveal?: number
}

export interface ObjectState {
  visible: boolean
  /** Multiplier on the object's authored opacity. */
  opacity: number
  clipId?: string
  /** Seconds into the source media (video objects only). */
  mediaTime?: number
  /** Playback rate of the source media (clip speed). */
  rate?: number
  transform?: TransitionTransform
}

export interface AudioState {
  clipId: string
  assetId: string
  /** Set for video clips: the canvas object whose <video> carries the sound. */
  objectId?: string
  mediaTime: number
  gain: number
  rate: number
}

export interface FrameState {
  time: number
  duration: number
  objects: Record<string, ObjectState>
  activeAudio: AudioState[]
  /** 0..1 black overlay over the whole page (dip-to-black transitions). */
  dip: number
}

const EPS = 1e-6

interface Contribution {
  clip: Clip
  held: boolean
  opacity: number
  gain: number
  mediaTime: number
  transform?: TransitionTransform
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

function fadeFactor(c: Clip, t: number): number {
  let f = 1
  const end = clipEnd(c)
  if (c.fadeIn > 0) f *= clamp01((t - c.start) / c.fadeIn)
  if (c.fadeOut > 0) f *= clamp01((end - t) / c.fadeOut)
  return f
}

/** The clip on the same track that ends where `b` starts (within a frame). */
function predecessor(project: VideoProject, b: Clip): Clip | undefined {
  const tol = 1 / project.fps
  let best: Clip | undefined
  for (const c of project.clips) {
    if (c.id === b.id || c.trackId !== b.trackId) continue
    if (Math.abs(clipEnd(c) - b.start) <= tol && (!best || clipEnd(c) > clipEnd(best))) best = c
  }
  return best
}

function sourceLength(project: VideoProject, c: Clip): number {
  const a = findAsset(project, c.assetId)
  return a && a.kind !== 'image' && a.duration > 0 ? a.duration : Infinity
}

/**
 * Evaluate the project at time `t`. `objects` are the canvas objects in layer
 * order (bottom → top); only they get an entry in `objects`, and clips bound to
 * objects that aren't present (another page, deleted) are ignored.
 */
export function evaluateTimeline(project: VideoProject, t: number, objects: ObjectRef[] = []): FrameState {
  const present = new Set(objects.map(o => o.id))
  const layer = new Map(objects.map((o, i) => [o.id, i]))
  const duration = projectDuration(project, present)
  const contributions: Contribution[] = []
  let dip = 0

  const usable = (c: Clip) => !c.objectId || present.has(c.objectId)

  for (const c of project.clips) {
    if (!usable(c)) continue
    const track = findTrack(project, c.trackId)
    if (!track) continue
    const end = clipEnd(c)
    // The very last frame stays on screen when the playhead parks at the end.
    const atProjectEnd = Math.abs(end - duration) < EPS && t >= end - EPS && t <= end + EPS
    const active = (t >= c.start - EPS && t < end - EPS) || atProjectEnd
    const tr = c.transitionIn && c.transitionIn.duration > 0 ? c.transitionIn : undefined

    if (tr && tr.type === 'dip') {
      const half = tr.duration / 2
      const d = Math.abs(t - c.start)
      if (d < half) dip = Math.max(dip, 1 - d / half)
    }
    if (!active) continue

    const tt = Math.min(t, end - EPS)
    const base: Contribution = {
      clip: c,
      held: false,
      opacity: fadeFactor(c, tt),
      gain: fadeFactor(c, tt),
      mediaTime: Math.min(c.outPoint, Math.max(c.inPoint, c.inPoint + (tt - c.start) * c.speed)),
    }

    if (tr && tr.type !== 'dip' && t < c.start + tr.duration) {
      const p = clamp01((t - c.start) / tr.duration)
      const a = predecessor(project, c)
      const holdA = a && usable(a) && (!a.objectId || a.objectId !== c.objectId) ? a : undefined
      const aAbove = holdA && holdA.objectId && c.objectId ? (layer.get(holdA.objectId) ?? -1) > (layer.get(c.objectId) ?? -1) : false
      let heldOpacity = 1
      switch (tr.type) {
        case 'crossfade':
          if (holdA && aAbove) heldOpacity = 1 - p
          else base.opacity *= p
          break
        case 'slide':
          base.transform = { tx: 1 - p, ty: 0, scale: 1 }
          break
        case 'wipe':
          base.transform = { tx: 0, ty: 0, scale: 1, reveal: p }
          break
        case 'zoom':
          base.transform = { tx: 0, ty: 0, scale: 0.6 + 0.4 * p }
          base.opacity *= p
          break
      }
      base.gain *= p
      if (holdA) {
        const over = (t - c.start) * holdA.speed
        contributions.push({
          clip: holdA,
          held: true,
          opacity: heldOpacity,
          gain: 1 - p,
          mediaTime: Math.min(holdA.outPoint + over, sourceLength(project, holdA) - 1 / project.fps / 2),
          transform: tr.type === 'slide' ? { tx: -p, ty: 0, scale: 1 } : undefined,
        })
      }
    }
    if (tr && tr.type === 'dip') {
      const half = tr.duration / 2
      if (t < c.start + half) base.gain *= clamp01((t - c.start) / half)
    }
    // Outgoing half of a dip into the next clip.
    const next = project.clips.find(
      n => n.trackId === c.trackId && n.id !== c.id && n.transitionIn?.type === 'dip' && Math.abs(n.start - end) <= 1 / project.fps,
    )
    if (next && next.transitionIn) {
      const half = next.transitionIn.duration / 2
      if (t > end - half) base.gain *= clamp01((end - t) / half)
    }
    contributions.push(base)
  }

  // Resolve per object: a playing clip beats a held one; later start wins ties.
  const byObject = new Map<string, Contribution>()
  for (const k of contributions) {
    const id = k.clip.objectId
    if (!id) continue
    const track = findTrack(project, k.clip.trackId)
    if (track?.hidden) continue
    const cur = byObject.get(id)
    if (!cur || (cur.held && !k.held) || (cur.held === k.held && k.clip.start > cur.clip.start)) byObject.set(id, k)
  }

  const timed = new Set<string>()
  for (const c of project.clips) if (c.objectId) timed.add(c.objectId)

  const out: Record<string, ObjectState> = {}
  for (const o of objects) {
    if (!timed.has(o.id)) {
      out[o.id] = { visible: true, opacity: 1 }
      continue
    }
    const k = byObject.get(o.id)
    if (!k || k.opacity <= 0) {
      out[o.id] = { visible: false, opacity: 0, ...(k ? { clipId: k.clip.id } : {}) }
      continue
    }
    const s: ObjectState = { visible: true, opacity: clamp01(k.opacity), clipId: k.clip.id }
    if (k.clip.assetId) {
      s.mediaTime = k.mediaTime
      s.rate = k.clip.speed
    }
    if (k.transform) s.transform = k.transform
    out[o.id] = s
  }

  const activeAudio: AudioState[] = []
  for (const k of contributions) {
    const c = k.clip
    const asset = findAsset(project, c.assetId)
    if (!asset || (asset.kind !== 'audio' && asset.kind !== 'video')) continue
    const track = findTrack(project, c.trackId)
    // A video object resolved to another clip (or hidden) carries no sound for this one.
    if (c.objectId && byObject.get(c.objectId) !== k) continue
    const gain = track?.muted || c.muted ? 0 : Math.max(0, c.volume * k.gain)
    activeAudio.push({
      clipId: c.id,
      assetId: asset.id,
      ...(c.objectId ? { objectId: c.objectId } : {}),
      mediaTime: k.mediaTime,
      gain,
      rate: c.speed,
    })
  }

  return { time: t, duration, objects: out, activeAudio, dip: clamp01(dip) }
}

/** Animation window for a canvas object: its (first) clip, else `fallback`. */
export function objectWindow(
  project: VideoProject,
  objectId: string,
  fallback: { start: number; duration: number },
): { start: number; duration: number } {
  let best: Clip | undefined
  for (const c of project.clips) if (c.objectId === objectId && (!best || c.start < best.start)) best = c
  return best ? { start: best.start, duration: clipDuration(best) } : fallback
}
