/**
 * Video project model — pure data + pure functions (no DOM, no React).
 *
 * A project is a set of tracks, the clips placed on them and the media assets
 * those clips play. Every edit goes through `applyCommand`, which returns the
 * next project AND an `inverse` command, so undo/redo is just "apply the
 * inverse". All times are in seconds on the project timeline unless named
 * `inPoint`/`outPoint`/`mediaTime`, which are seconds inside the source media.
 *
 * Track kinds:
 *  - `video`   — the main track. Magnetic: clips never overlap; inserting or
 *                lengthening a clip pushes the following clips right.
 *  - `overlay` — free placement (titles, stickers, picture-in-picture). Clips on
 *                one track never overlap; a colliding move lands in the nearest gap.
 *  - `audio`   — same rules as overlay.
 *
 * A clip either plays an asset (`assetId`) or times a canvas element
 * (`objectId` only — text/shape/image). Video clips have both: the asset is the
 * media and the object is the fabric image that shows it on the page.
 */

export const PROJECT_VERSION = 1 as const
export const PROJECT_FPS = 30 as const
/** Shortest clip a trim/split may produce (one frame). */
export const MIN_CLIP = 1 / PROJECT_FPS
const EPS = 1e-6

export type AssetKind = 'video' | 'audio' | 'image'
export type AssetSource = { kind: 'idb'; key: string } | { kind: 'url'; url: string }

export interface Asset {
  id: string
  kind: AssetKind
  name: string
  /** Source length in seconds (Infinity-free; images use a nominal length). */
  duration: number
  width?: number
  height?: number
  src: AssetSource
  poster?: string
  /** Duration came from an untrusted place (API metadata, legacy save) — probe the media. */
  needsProbe?: boolean
}

export type TrackKind = 'video' | 'overlay' | 'audio'

export interface Track {
  id: string
  kind: TrackKind
  name: string
  muted?: boolean
  locked?: boolean
  hidden?: boolean
}

export type TransitionType = 'crossfade' | 'dip' | 'slide' | 'wipe' | 'zoom'

export interface Transition {
  type: TransitionType
  duration: number
}

export interface Clip {
  id: string
  trackId: string
  assetId?: string
  /** Canvas element (fabric object id) this clip shows. */
  objectId?: string
  name?: string
  start: number
  inPoint: number
  outPoint: number
  speed: number
  volume: number
  fadeIn: number
  fadeOut: number
  transitionIn?: Transition
  /** Silenced (e.g. its audio was detached to an audio track). */
  muted?: boolean
}

/** A named point on the timeline (snap target, navigation). */
export interface Marker {
  id: string
  time: number
  label?: string
}

export interface VideoProject {
  version: typeof PROJECT_VERSION
  fps: typeof PROJECT_FPS
  tracks: Track[]
  clips: Clip[]
  assets: Asset[]
  /** Optional: absent on projects that never had a marker. */
  markers?: Marker[]
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export const MAIN_TRACK_ID = 'track-video'

let idCounter = 0
/** Non-deterministic id helper for UI callers; commands accept explicit ids for tests. */
export function makeId(prefix: string): string {
  idCounter = (idCounter + 1) % 1e6
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function emptyProject(): VideoProject {
  return {
    version: PROJECT_VERSION,
    fps: PROJECT_FPS,
    tracks: [{ id: MAIN_TRACK_ID, kind: 'video', name: 'Video' }],
    clips: [],
    assets: [],
  }
}

export function isEmptyProject(p: VideoProject | null | undefined): boolean {
  return !p || (p.clips.length === 0 && p.assets.length === 0)
}

/** Fill defaults for a partially specified clip. */
export function makeClip(c: Partial<Clip> & Pick<Clip, 'id' | 'trackId' | 'start'> & { duration?: number }): Clip {
  const inPoint = c.inPoint ?? 0
  const speed = c.speed && c.speed > 0 ? c.speed : 1
  const outPoint = c.outPoint ?? inPoint + (c.duration ?? 5) * speed
  const clip: Clip = {
    id: c.id,
    trackId: c.trackId,
    start: Math.max(0, c.start),
    inPoint,
    outPoint: Math.max(outPoint, inPoint + MIN_CLIP * speed),
    speed,
    volume: c.volume ?? 1,
    fadeIn: c.fadeIn ?? 0,
    fadeOut: c.fadeOut ?? 0,
  }
  if (c.assetId) clip.assetId = c.assetId
  if (c.objectId) clip.objectId = c.objectId
  if (c.name) clip.name = c.name
  if (c.transitionIn) clip.transitionIn = c.transitionIn
  if (c.muted) clip.muted = true
  return clip
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const clipDuration = (c: Clip): number => (c.outPoint - c.inPoint) / (c.speed || 1)
export const clipEnd = (c: Clip): number => c.start + clipDuration(c)

export const findClip = (p: VideoProject, id: string): Clip | undefined => p.clips.find(c => c.id === id)
export const findTrack = (p: VideoProject, id: string): Track | undefined => p.tracks.find(t => t.id === id)
export const findAsset = (p: VideoProject, id: string | undefined): Asset | undefined =>
  id ? p.assets.find(a => a.id === id) : undefined

/** True for clips that time a canvas element rather than play media. */
export const isElementClip = (c: Clip): boolean => !c.assetId && !!c.objectId

/**
 * End of the last clip. `presentObjects`, when given, ignores element clips
 * whose canvas object isn't on the current page (and video clips whose object
 * is gone), so leftovers from other pages don't stretch playback.
 */
export function projectDuration(p: VideoProject, presentObjects?: Set<string>): number {
  let end = 0
  for (const c of p.clips) {
    if (presentObjects && c.objectId && !presentObjects.has(c.objectId)) continue
    end = Math.max(end, clipEnd(c))
  }
  return end
}

export const trackClips = (p: VideoProject, trackId: string): Clip[] =>
  p.clips.filter(c => c.trackId === trackId).sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : 1))

/** The clip on `trackId` playing at `t` (start inclusive, end exclusive). */
export function clipAt(p: VideoProject, trackId: string, t: number): Clip | undefined {
  const hits = trackClips(p, trackId).filter(c => t >= c.start - EPS && t < clipEnd(c) - EPS)
  return hits[hits.length - 1]
}

/** Seconds inside the source media shown at project time `t` (clamped to the clip's in/out). */
export function mediaTimeAt(c: Clip, t: number): number {
  const m = c.inPoint + (t - c.start) * (c.speed || 1)
  return Math.min(c.outPoint, Math.max(c.inPoint, m))
}

/** Times worth snapping to while dragging: 0, the playhead, markers and every clip edge. */
export function snapTargets(p: VideoProject, opts: { exclude?: string | string[]; playhead?: number } = {}): number[] {
  const set = new Set<number>([0])
  const skip = new Set(Array.isArray(opts.exclude) ? opts.exclude : opts.exclude ? [opts.exclude] : [])
  if (opts.playhead !== undefined) set.add(round(opts.playhead))
  for (const m of p.markers || []) set.add(round(m.time))
  for (const c of p.clips) {
    if (skip.has(c.id)) continue
    set.add(round(c.start))
    set.add(round(clipEnd(c)))
  }
  return Array.from(set).sort((a, b) => a - b)
}

/** Snap `t` to the nearest target within `threshold` seconds, else return `t`. */
export function snap(t: number, targets: number[], threshold: number): number {
  let best = t
  let bestD = threshold
  for (const x of targets) {
    const d = Math.abs(x - t)
    if (d <= bestD) {
      best = x
      bestD = d
    }
  }
  return best
}

const round = (t: number) => Math.round(t * 1e6) / 1e6

// ---------------------------------------------------------------------------
// Single-clip operations (pure, no overlap resolution)
// ---------------------------------------------------------------------------

/** Split at project time `t`. Returns null when `t` isn't at least one frame inside the clip. */
export function split(c: Clip, t: number, rightId: string): [Clip, Clip] | null {
  if (t <= c.start + MIN_CLIP - EPS || t >= clipEnd(c) - MIN_CLIP + EPS) return null
  const cut = c.inPoint + (t - c.start) * c.speed
  const left: Clip = { ...c, outPoint: cut, fadeOut: 0 }
  const right: Clip = { ...c, id: rightId, start: t, inPoint: cut, fadeIn: 0 }
  delete right.transitionIn
  return [left, right]
}

/**
 * Move one edge of a clip to project time `t`. Media clips can't reach before
 * the source start or past the source end (`assetDuration`); element clips
 * have no source so only the minimum length applies. Never shorter than MIN_CLIP.
 */
export function trim(c: Clip, edge: 'start' | 'end', t: number, assetDuration: number = Infinity): Clip {
  const minSpan = MIN_CLIP * c.speed
  const element = isElementClip(c) || !Number.isFinite(assetDuration)
  if (edge === 'end') {
    let out = c.inPoint + (t - c.start) * c.speed
    out = Math.max(c.inPoint + minSpan, out)
    if (!element) out = Math.min(assetDuration, out)
    return { ...c, outPoint: out }
  }
  // start edge: keep the end fixed in project time.
  const end = clipEnd(c)
  let start = Math.max(0, Math.min(t, end - MIN_CLIP))
  if (element) {
    // No source to reveal: the length simply follows the edge.
    return { ...c, start, inPoint: 0, outPoint: (end - start) * c.speed }
  }
  let inPoint = c.inPoint + (start - c.start) * c.speed
  if (inPoint < 0) {
    inPoint = 0
    start = end - (c.outPoint - inPoint) / c.speed
  }
  return { ...c, start, inPoint }
}

// ---------------------------------------------------------------------------
// Overlap resolution
// ---------------------------------------------------------------------------

const overlaps = (a: Clip, b: Clip) => a.start < clipEnd(b) - EPS && b.start < clipEnd(a) - EPS

/**
 * Magnetic placement on the main track: `moved` is inserted at its start;
 * if that lands inside another clip it snaps to that clip's nearer edge, and
 * every following clip is pushed right as far as needed (gaps elsewhere stay).
 */
function placeMagnetic(others: Clip[], moved: Clip): Clip[] {
  const sorted = others.slice().sort((a, b) => a.start - b.start)
  let start = Math.max(0, moved.start)
  const hit = sorted.find(o => start > o.start + EPS && start < clipEnd(o) - EPS)
  if (hit) start = start - hit.start < clipEnd(hit) - start ? hit.start : clipEnd(hit)
  const placed = { ...moved, start }
  const out: Clip[] = []
  let cursor = clipEnd(placed)
  for (const o of sorted) {
    if (o.start < start - EPS || (Math.abs(o.start - start) < EPS && clipEnd(o) <= start + EPS)) {
      out.push(o)
      continue
    }
    if (o.start < cursor - EPS) {
      const pushed = { ...o, start: cursor }
      out.push(pushed)
      cursor = clipEnd(pushed)
    } else {
      out.push(o)
      cursor = Math.max(cursor, clipEnd(o))
    }
  }
  out.push(placed)
  return out
}

/** Free tracks: keep `moved` where asked if it fits, else the nearest start that does. */
function placeFree(others: Clip[], moved: Clip): Clip {
  const dur = clipDuration(moved)
  const fits = (s: number) => s >= -EPS && !others.some(o => overlaps(o, { ...moved, start: s }))
  const want = Math.max(0, moved.start)
  if (fits(want)) return { ...moved, start: want }
  const candidates = [0]
  for (const o of others) {
    candidates.push(clipEnd(o))
    candidates.push(o.start - dur)
  }
  let best: number | null = null
  for (const s of candidates) {
    if (s < -EPS || !fits(s)) continue
    if (best === null || Math.abs(s - want) < Math.abs(best - want)) best = Math.max(0, s)
  }
  if (best === null) best = Math.max(0, ...others.map(clipEnd))
  return { ...moved, start: best }
}

/** Shift clips on `trackId` that start at/after `from` by `delta` (ripple). */
function ripple(clips: Clip[], trackId: string, from: number, delta: number, exclude?: string): Clip[] {
  return clips.map(c =>
    c.trackId === trackId && c.id !== exclude && c.start >= from - EPS ? { ...c, start: Math.max(0, c.start + delta) } : c,
  )
}

/** Place `clip` (new or changed) on its track according to the track's rules. */
function place(p: VideoProject, clip: Clip): Clip[] {
  const track = findTrack(p, clip.trackId)
  const rest = p.clips.filter(c => c.id !== clip.id)
  const others = rest.filter(c => c.trackId === clip.trackId)
  const elsewhere = rest.filter(c => c.trackId !== clip.trackId)
  if (track?.kind === 'video') return [...elsewhere, ...placeMagnetic(others, clip)]
  return [...rest, placeFree(others, clip)]
}

/** Re-pack the following clips on a magnetic track after `clip` changed length. */
function pushFollowing(clips: Clip[], clip: Clip): Clip[] {
  const sameTrack = clips.filter(c => c.trackId === clip.trackId && c.id !== clip.id).sort((a, b) => a.start - b.start)
  const moved = new Map<string, Clip>()
  let cursor = clipEnd(clip)
  for (const o of sameTrack) {
    if (o.start < clip.start - EPS) continue
    if (o.start < cursor - EPS) {
      const pushed = { ...o, start: cursor }
      moved.set(o.id, pushed)
      cursor = clipEnd(pushed)
    } else {
      cursor = Math.max(cursor, clipEnd(o))
    }
  }
  return clips.map(c => moved.get(c.id) || c)
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export type ClipProps = Partial<Pick<Clip, 'volume' | 'speed' | 'fadeIn' | 'fadeOut' | 'transitionIn' | 'name' | 'objectId' | 'muted'>>

/** Raw state edit with no rules applied — what inverses are made of. */
export interface PatchCommand {
  type: 'patch'
  putClips?: Clip[]
  removeClipIds?: string[]
  putTracks?: Track[]
  removeTrackIds?: string[]
  trackOrder?: string[]
  putAssets?: Asset[]
  removeAssetIds?: string[]
  /** Full replacement of the marker list ([] = none). */
  markers?: Marker[]
}

export type Command =
  | PatchCommand
  | { type: 'addAsset'; asset: Asset }
  | { type: 'updateAsset'; assetId: string; patch: Partial<Omit<Asset, 'id'>> }
  | { type: 'removeAsset'; assetId: string }
  | { type: 'addTrack'; track: Track; index?: number }
  | { type: 'updateTrack'; trackId: string; patch: Partial<Omit<Track, 'id'>> }
  | { type: 'removeTrack'; trackId: string }
  | { type: 'addClip'; clip: Clip }
  | { type: 'removeClip'; clipId: string; ripple?: boolean }
  | { type: 'moveClip'; clipId: string; start: number; trackId?: string; ripple?: boolean }
  | { type: 'trimClip'; clipId: string; edge: 'start' | 'end'; time: number; ripple?: boolean }
  | { type: 'splitClip'; clipId: string; time: number; newId: string }
  | { type: 'duplicateClip'; clipId: string; newId: string }
  | { type: 'setClipProps'; clipId: string; patch: ClipProps }
  /** Put an element clip exactly at its start on the first overlay track with room (new track if none). */
  | { type: 'placeElement'; clip: Clip; preferTrackId?: string }
  /**
   * Lay the listed clips end to end on `trackId` starting at `from` (default 0),
   * moving them onto that track. Clips already on the track but not listed
   * follow in their current order. Magnetic main-track reorder / insert /
   * ripple are all this. The first clip loses its transition (nothing precedes it).
   */
  | { type: 'arrangeTrack'; trackId: string; order?: string[]; from?: number }
  | { type: 'addMarker'; marker: Marker }
  | { type: 'removeMarker'; markerId: string }
  | { type: 'batch'; commands: Command[] }
  | { type: 'replace'; project: VideoProject }

export interface CommandResult {
  project: VideoProject
  inverse: Command
}

const MAX_SPEED = 16
const MIN_SPEED = 0.0625

function applyRaw(p: VideoProject, cmd: Command): VideoProject {
  switch (cmd.type) {
    case 'patch': {
      const rmC = new Set(cmd.removeClipIds || [])
      const putC = new Map((cmd.putClips || []).map(c => [c.id, c]))
      const clips = p.clips.filter(c => !rmC.has(c.id)).map(c => putC.get(c.id) || c)
      putC.forEach((c, id) => {
        if (!clips.some(x => x.id === id)) clips.push(c)
      })
      const rmT = new Set(cmd.removeTrackIds || [])
      const putT = new Map((cmd.putTracks || []).map(t => [t.id, t]))
      let tracks = p.tracks.filter(t => !rmT.has(t.id)).map(t => putT.get(t.id) || t)
      putT.forEach((t, id) => {
        if (!tracks.some(x => x.id === id)) tracks.push(t)
      })
      if (cmd.trackOrder) {
        const order = new Map(cmd.trackOrder.map((id, i) => [id, i]))
        tracks = tracks.slice().sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9))
      }
      const rmA = new Set(cmd.removeAssetIds || [])
      const putA = new Map((cmd.putAssets || []).map(a => [a.id, a]))
      const assets = p.assets.filter(a => !rmA.has(a.id)).map(a => putA.get(a.id) || a)
      putA.forEach((a, id) => {
        if (!assets.some(x => x.id === id)) assets.push(a)
      })
      if (cmd.markers) return withMarkers({ ...p, clips, tracks, assets }, cmd.markers)
      return { ...p, clips, tracks, assets }
    }
    case 'replace':
      return cmd.project
    case 'batch':
      return cmd.commands.reduce(applyRaw, p)
    case 'placeElement': {
      const clip = makeClip({ ...cmd.clip })
      const base = { ...p, clips: p.clips.filter(c => c.id !== clip.id) }
      const fits = (t: Track) => t.kind === 'overlay' && !base.clips.some(o => o.trackId === t.id && overlaps(o, clip))
      const preferred = cmd.preferTrackId ? findTrack(base, cmd.preferTrackId) : undefined
      let track = preferred && fits(preferred) ? preferred : base.tracks.find(fits)
      let tracks = base.tracks
      if (!track) {
        let n = base.tracks.filter(t => t.kind === 'overlay').length + 1
        while (findTrack(base, `track-overlay-${n}`)) n++
        track = { id: `track-overlay-${n}`, kind: 'overlay', name: n > 1 ? `Elements ${n}` : 'Elements' }
        tracks = [track, ...base.tracks]
      }
      return { ...base, tracks, clips: [...base.clips, { ...clip, trackId: track.id }] }
    }
    case 'arrangeTrack': {
      if (!findTrack(p, cmd.trackId)) return p
      const listed = (cmd.order || trackClips(p, cmd.trackId).map(c => c.id)).filter((id, i, a) => a.indexOf(id) === i)
      const rest = trackClips(p, cmd.trackId)
        .map(c => c.id)
        .filter(id => !listed.includes(id))
      const put = new Map<string, Clip>()
      let cursor = Math.max(0, cmd.from ?? 0)
      for (const id of listed.concat(rest)) {
        const c = findClip(p, id)
        if (!c) continue
        const n: Clip = { ...c, trackId: cmd.trackId, start: cursor }
        if (put.size === 0) delete n.transitionIn
        put.set(id, n)
        cursor = clipEnd(n)
      }
      return { ...p, clips: p.clips.map(c => put.get(c.id) || c) }
    }
    case 'addMarker': {
      const others = (p.markers || []).filter(m => m.id !== cmd.marker.id)
      const marker = { ...cmd.marker, time: Math.max(0, cmd.marker.time) }
      return withMarkers(p, [...others, marker].sort((a, b) => a.time - b.time))
    }
    case 'removeMarker':
      return withMarkers(p, (p.markers || []).filter(m => m.id !== cmd.markerId))
    case 'addAsset':
      if (p.assets.some(a => a.id === cmd.asset.id)) return applyRaw(p, { type: 'updateAsset', assetId: cmd.asset.id, patch: cmd.asset })
      return { ...p, assets: [...p.assets, cmd.asset] }
    case 'updateAsset':
      return { ...p, assets: p.assets.map(a => (a.id === cmd.assetId ? { ...a, ...cmd.patch, id: a.id } : a)) }
    case 'removeAsset':
      return {
        ...p,
        assets: p.assets.filter(a => a.id !== cmd.assetId),
        clips: p.clips.filter(c => c.assetId !== cmd.assetId),
      }
    case 'addTrack': {
      if (p.tracks.some(t => t.id === cmd.track.id)) return p
      const tracks = p.tracks.slice()
      tracks.splice(cmd.index ?? tracks.length, 0, cmd.track)
      return { ...p, tracks }
    }
    case 'updateTrack':
      return { ...p, tracks: p.tracks.map(t => (t.id === cmd.trackId ? { ...t, ...cmd.patch, id: t.id } : t)) }
    case 'removeTrack':
      return { ...p, tracks: p.tracks.filter(t => t.id !== cmd.trackId), clips: p.clips.filter(c => c.trackId !== cmd.trackId) }
    case 'addClip': {
      if (!findTrack(p, cmd.clip.trackId)) return p
      const clip = makeClip({ ...cmd.clip })
      return { ...p, clips: place({ ...p, clips: p.clips.filter(c => c.id !== clip.id) }, clip) }
    }
    case 'removeClip': {
      const c = findClip(p, cmd.clipId)
      if (!c) return p
      let clips = p.clips.filter(x => x.id !== c.id)
      if (cmd.ripple) clips = ripple(clips, c.trackId, clipEnd(c), -clipDuration(c))
      return { ...p, clips }
    }
    case 'moveClip': {
      const c = findClip(p, cmd.clipId)
      if (!c) return p
      const trackId = cmd.trackId && findTrack(p, cmd.trackId) ? cmd.trackId : c.trackId
      let base = p.clips
      if (cmd.ripple) base = ripple(base.filter(x => x.id !== c.id), c.trackId, clipEnd(c), -clipDuration(c)).concat([c])
      const moved = { ...c, trackId, start: Math.max(0, cmd.start) }
      return { ...p, clips: place({ ...p, clips: base }, moved) }
    }
    case 'trimClip': {
      const c = findClip(p, cmd.clipId)
      if (!c) return p
      const asset = findAsset(p, c.assetId)
      const assetDur = asset && asset.kind !== 'image' ? asset.duration : Infinity
      let next = trim(c, cmd.edge, cmd.time, assetDur)
      const track = findTrack(p, c.trackId)
      const others = p.clips.filter(x => x.trackId === c.trackId && x.id !== c.id)
      if (track?.kind !== 'video') {
        // Free tracks: a trim can't run into a neighbour.
        if (cmd.edge === 'end') {
          const nextStart = Math.min(Infinity, ...others.filter(o => o.start >= c.start + EPS).map(o => o.start))
          if (clipEnd(next) > nextStart + EPS) next = trim(c, 'end', nextStart, assetDur)
        } else {
          const prevEnd = Math.max(0, ...others.filter(o => o.start < c.start - EPS).map(clipEnd))
          if (next.start < prevEnd - EPS) next = trim(c, 'start', prevEnd, assetDur)
        }
      } else if (cmd.edge === 'start') {
        const prevEnd = Math.max(0, ...others.filter(o => o.start < c.start - EPS).map(clipEnd))
        if (next.start < prevEnd - EPS) next = trim(c, 'start', prevEnd, assetDur)
      }
      let clips = p.clips.map(x => (x.id === c.id ? next : x))
      const delta = clipEnd(next) - clipEnd(c)
      if (cmd.ripple && cmd.edge === 'end' && delta < 0) clips = ripple(clips, c.trackId, clipEnd(c), delta, c.id)
      if (cmd.ripple && cmd.edge === 'start' && next.start > c.start) {
        // Ripple-trimming the head closes the gap it opens: the clip stays put, later clips follow.
        const shift = next.start - c.start
        next = { ...next, start: c.start }
        clips = ripple(clips.map(x => (x.id === c.id ? next : x)), c.trackId, clipEnd(c), -shift, c.id)
      }
      if (track?.kind === 'video') clips = pushFollowing(clips, next)
      return { ...p, clips }
    }
    case 'splitClip': {
      const c = findClip(p, cmd.clipId)
      if (!c) return p
      const parts = split(c, cmd.time, cmd.newId)
      if (!parts) return p
      return { ...p, clips: [...p.clips.filter(x => x.id !== c.id), parts[0], parts[1]] }
    }
    case 'duplicateClip': {
      const c = findClip(p, cmd.clipId)
      if (!c) return p
      const copy: Clip = { ...c, id: cmd.newId, start: clipEnd(c) }
      delete copy.transitionIn
      return { ...p, clips: place(p, copy) }
    }
    case 'setClipProps': {
      const c = findClip(p, cmd.clipId)
      if (!c) return p
      const patch = { ...cmd.patch }
      if (patch.speed !== undefined) patch.speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, patch.speed))
      if (patch.volume !== undefined) patch.volume = Math.max(0, patch.volume)
      const next: Clip = { ...c, ...patch }
      if ('muted' in patch && !patch.muted) delete next.muted
      const dur = clipDuration(next)
      next.fadeIn = Math.max(0, Math.min(next.fadeIn, dur))
      next.fadeOut = Math.max(0, Math.min(next.fadeOut, dur - next.fadeIn))
      if (next.transitionIn) next.transitionIn = { ...next.transitionIn, duration: Math.max(0, Math.min(next.transitionIn.duration, dur)) }
      if ('transitionIn' in patch && !patch.transitionIn) delete next.transitionIn
      let clips = p.clips.map(x => (x.id === c.id ? next : x))
      if (findTrack(p, c.trackId)?.kind === 'video') clips = pushFollowing(clips, next)
      return { ...p, clips }
    }
    default:
      return p
  }
}

/** Set the marker list; an empty list removes the field (projects without markers stay byte-identical). */
function withMarkers(p: VideoProject, markers: Marker[]): VideoProject {
  const next = { ...p }
  if (markers.length) next.markers = markers
  else delete next.markers
  return next
}

/** Raw diff `to → from`: the patch that turns `to` back into `from`. */
export function diffPatch(from: VideoProject, to: VideoProject): PatchCommand {
  const patch: PatchCommand = { type: 'patch' }
  const toClips = new Map(to.clips.map(c => [c.id, c]))
  const fromClips = new Map(from.clips.map(c => [c.id, c]))
  const putClips = from.clips.filter(c => toClips.get(c.id) !== c && !sameJson(toClips.get(c.id), c))
  const removeClipIds = to.clips.filter(c => !fromClips.has(c.id)).map(c => c.id)
  const toTracks = new Map(to.tracks.map(t => [t.id, t]))
  const fromTracks = new Set(from.tracks.map(t => t.id))
  const putTracks = from.tracks.filter(t => !sameJson(toTracks.get(t.id), t))
  const removeTrackIds = to.tracks.filter(t => !fromTracks.has(t.id)).map(t => t.id)
  const toAssets = new Map(to.assets.map(a => [a.id, a]))
  const fromAssets = new Set(from.assets.map(a => a.id))
  const putAssets = from.assets.filter(a => !sameJson(toAssets.get(a.id), a))
  const removeAssetIds = to.assets.filter(a => !fromAssets.has(a.id)).map(a => a.id)
  if (putClips.length) patch.putClips = putClips
  if (removeClipIds.length) patch.removeClipIds = removeClipIds
  if (putTracks.length) patch.putTracks = putTracks
  if (removeTrackIds.length) patch.removeTrackIds = removeTrackIds
  if (from.tracks.map(t => t.id).join('|') !== to.tracks.map(t => t.id).join('|')) patch.trackOrder = from.tracks.map(t => t.id)
  if (putAssets.length) patch.putAssets = putAssets
  if (removeAssetIds.length) patch.removeAssetIds = removeAssetIds
  if (!sameJson(from.markers || [], to.markers || [])) patch.markers = from.markers || []
  return patch
}

function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

export function isNoopPatch(cmd: Command): boolean {
  if (cmd.type !== 'patch') return false
  return !Object.keys(cmd).some(k => k !== 'type')
}

/** Apply one edit. `inverse` restores the previous project exactly (clips, tracks, assets, track order). */
export function applyCommand(project: VideoProject, cmd: Command): CommandResult {
  const next = applyRaw(project, cmd)
  return { project: next, inverse: diffPatch(project, next) }
}

/**
 * Clip-order-insensitive comparison helper for tests and dirty checks:
 * clips/assets sorted by id, tracks kept in order.
 */
export function normalize(p: VideoProject): VideoProject {
  const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  return { ...p, clips: p.clips.slice().sort(byId), assets: p.assets.slice().sort(byId) }
}

// ---------------------------------------------------------------------------
// Validation / migration
// ---------------------------------------------------------------------------

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** Accept a persisted project (possibly from an older/foreign writer) or return null. */
export function parseProject(raw: any): VideoProject | null {
  if (!raw || typeof raw !== 'object' || raw.version !== PROJECT_VERSION || !Array.isArray(raw.clips)) return null
  const tracks: Track[] = (Array.isArray(raw.tracks) ? raw.tracks : [])
    .filter((t: any) => t && typeof t.id === 'string' && ['video', 'overlay', 'audio'].includes(t.kind))
    .map((t: any) => ({ ...t, name: String(t.name || t.kind) }))
  if (!tracks.some(t => t.kind === 'video')) tracks.unshift({ id: MAIN_TRACK_ID, kind: 'video', name: 'Video' })
  const trackIds = new Set(tracks.map(t => t.id))
  const assets: Asset[] = (Array.isArray(raw.assets) ? raw.assets : [])
    .filter((a: any) => a && typeof a.id === 'string' && a.src && (a.src.kind === 'idb' || a.src.kind === 'url'))
    .map((a: any) => ({ ...a, duration: Math.max(0, num(a.duration, 0)) }))
  const clips: Clip[] = raw.clips
    .filter((c: any) => c && typeof c.id === 'string' && trackIds.has(c.trackId))
    .map((c: any) =>
      makeClip({
        ...c,
        start: num(c.start, 0),
        inPoint: num(c.inPoint, 0),
        outPoint: num(c.outPoint, num(c.inPoint, 0) + 5),
        speed: num(c.speed, 1),
        volume: num(c.volume, 1),
        fadeIn: num(c.fadeIn, 0),
        fadeOut: num(c.fadeOut, 0),
      }),
    )
  const markers: Marker[] = (Array.isArray(raw.markers) ? raw.markers : [])
    .filter((m: any) => m && typeof m.id === 'string' && typeof m.time === 'number' && Number.isFinite(m.time))
    .map((m: any) => ({ id: m.id, time: Math.max(0, m.time), ...(typeof m.label === 'string' ? { label: m.label } : {}) }))
  const out: VideoProject = { version: PROJECT_VERSION, fps: PROJECT_FPS, tracks, clips, assets }
  if (markers.length) out.markers = markers
  return out
}

export interface LegacyVideoClip {
  id: string
  name?: string
  src: string
  duration: number
  start: number
  end?: number
  poster?: string
  canvasObjectId?: string
}

export interface LegacyAudioClip {
  id: string
  name?: string
  src: string
  duration: number
  start: number
  volume?: number
}

/** Minimal view of a canvas object for migration/evaluation. */
export interface ObjectRef {
  id: string
  metadata?: Record<string, any>
}

/** Put each clip on the first track of `kind` where it doesn't overlap, adding tracks as needed. */
function assignFree(project: VideoProject, kind: 'overlay' | 'audio', clips: Clip[], prefix: string, label: string): VideoProject {
  let p = project
  for (const c of clips.slice().sort((a, b) => a.start - b.start)) {
    const current = p
    let track = current.tracks.find(t => t.kind === kind && !current.clips.some(o => o.trackId === t.id && overlaps(o, { ...c, trackId: t.id })))
    if (!track) {
      const n = p.tracks.filter(t => t.kind === kind).length
      track = { id: `${prefix}-${n + 1}`, kind, name: n ? `${label} ${n + 1}` : label }
      p = { ...p, tracks: kind === 'audio' ? [...p.tracks, track] : [track, ...p.tracks] }
    }
    p = { ...p, clips: [...p.clips, { ...c, trackId: track.id }] }
  }
  return p
}

/** Element timing stored on a fabric object by older builds (`metadata.timelineStart/Duration`). */
export function legacyElementWindow(o: ObjectRef): { start: number; duration: number } | null {
  const md = o.metadata || {}
  if (md.isVideo || md.videoSrc) return null
  if (typeof md.timelineDuration !== 'number' || !(md.timelineDuration > 0)) return null
  return { start: Math.max(0, num(md.timelineStart, 0)), duration: md.timelineDuration }
}

/** Element clips for objects that carry a legacy window but have no clip yet. */
export function elementClipsFor(project: VideoProject, objects: ObjectRef[]): Clip[] {
  const timed = new Set(project.clips.filter(c => c.objectId).map(c => c.objectId as string))
  const out: Clip[] = []
  for (const o of objects) {
    if (!o || !o.id || timed.has(o.id)) continue
    const w = legacyElementWindow(o)
    if (!w) continue
    out.push(makeClip({ id: `el-${o.id}`, trackId: '', objectId: o.id, start: w.start, duration: w.duration }))
  }
  return out
}

/** Add element clips (from legacy windows) onto free overlay tracks. */
export function withElementClips(project: VideoProject, objects: ObjectRef[]): VideoProject {
  const add = elementClipsFor(project, objects)
  return add.length ? assignFree(project, 'overlay', add, 'track-overlay', 'Elements') : project
}

/**
 * Migrate the pre-v1 timeline: `clips` (video), `audioClips` and per-object
 * `metadata.timelineStart/Duration`. Durations from those saves came from APIs
 * or hardcoded values, so assets are flagged `needsProbe`; their sources keep
 * the saved URL (a dead `blob:` URL surfaces as missing media → relink).
 */
export function fromLegacy(
  clips: LegacyVideoClip[] = [],
  audioClips: LegacyAudioClip[] = [],
  canvasObjects: ObjectRef[] = [],
): VideoProject {
  let p = emptyProject()
  for (const c of clips || []) {
    if (!c || !c.id) continue
    const duration = Math.max(MIN_CLIP, num(c.duration, num(c.end, 0) - num(c.start, 0)) || 5)
    const assetId = `asset-${c.id}`
    p.assets.push({
      id: assetId,
      kind: 'video',
      name: c.name || 'Video',
      duration,
      src: { kind: 'url', url: c.src || '' },
      ...(c.poster ? { poster: c.poster } : {}),
      needsProbe: true,
    })
    p.clips.push(
      makeClip({
        id: c.id,
        trackId: MAIN_TRACK_ID,
        assetId,
        objectId: c.canvasObjectId || c.id,
        name: c.name,
        start: num(c.start, 0),
        inPoint: 0,
        outPoint: duration,
      }),
    )
  }
  const audio: Clip[] = []
  for (const a of audioClips || []) {
    if (!a || !a.id) continue
    const duration = Math.max(MIN_CLIP, num(a.duration, 5))
    const assetId = `asset-${a.id}`
    p.assets.push({ id: assetId, kind: 'audio', name: a.name || 'Audio', duration, src: { kind: 'url', url: a.src || '' }, needsProbe: true })
    audio.push(makeClip({ id: a.id, trackId: '', assetId, name: a.name, start: num(a.start, 0), inPoint: 0, outPoint: duration, volume: num(a.volume, 1) }))
  }
  p = assignFree(p, 'audio', audio, 'track-audio', 'Audio')
  return withElementClips(p, canvasObjects)
}
