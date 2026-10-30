/**
 * Timeline edits as pure functions: project + intent → one Command (one undo
 * step). The UI computes previews by applying the same command to the
 * current project, so what you see while dragging is what you get on release.
 *
 * Main-track rule (magnetic): after any edit the main track is re-packed end
 * to end from 0 — no gaps, deletes ripple, drops insert between clips.
 */
import {
  Asset,
  Clip,
  ClipProps,
  Command,
  MAIN_TRACK_ID,
  MIN_CLIP,
  Track,
  VideoProject,
  clipDuration,
  clipEnd,
  findAsset,
  findClip,
  findTrack,
  makeId,
  trackClips,
} from '@/video/model'
import { insertOrder } from './math'

const EPS = 1e-6

export const isMainTrack = (t: Track | undefined): boolean => !!t && t.kind === 'video'

export function mainTrackId(p: VideoProject): string {
  return p.tracks.find(t => t.kind === 'video')?.id || MAIN_TRACK_ID
}

const pack = (trackId: string, order?: string[]): Command => ({ type: 'arrangeTrack', trackId, ...(order ? { order } : {}) })

/** What a clip is, for colours/icons/placement rules. */
export type ClipKind = 'video' | 'audio' | 'image' | 'element'

export function clipKind(p: VideoProject, c: Clip): ClipKind {
  const a = findAsset(p, c.assetId)
  if (!a) return 'element'
  return a.kind
}

/** May `c` live on `track`? Audio only on audio tracks; elements only on overlay tracks; video/images on main or overlay. */
export function canPlace(p: VideoProject, c: Clip, track: Track | undefined): boolean {
  if (!track) return false
  const kind = clipKind(p, c)
  if (kind === 'audio') return track.kind === 'audio'
  if (kind === 'element') return track.kind === 'overlay'
  return track.kind === 'video' || track.kind === 'overlay'
}

const isLocked = (p: VideoProject, c: Clip) => !!findTrack(p, c.trackId)?.locked

// ---------------------------------------------------------------------------
// Split / delete / duplicate
// ---------------------------------------------------------------------------

/**
 * Split at `t`: the selected clips that contain `t`, or — with nothing
 * selected — every unlocked clip under the playhead. Returns the command and
 * the ids of the right-hand parts (new selection), or null when nothing splits.
 */
export function splitCommand(
  p: VideoProject,
  selected: string[],
  t: number,
  newId: (c: Clip) => string = () => makeId('clip'),
): { command: Command; rightIds: string[] } | null {
  const inside = (c: Clip) => t > c.start + EPS && t < clipEnd(c) - EPS && !isLocked(p, c)
  const pool = selected.length ? selected.map(id => findClip(p, id)).filter(Boolean) as Clip[] : p.clips
  const targets = pool.filter(inside)
  if (!targets.length) return null
  const rightIds: string[] = []
  const commands: Command[] = targets.map(c => {
    const id = newId(c)
    rightIds.push(id)
    return { type: 'splitClip', clipId: c.id, time: t, newId: id }
  })
  return { command: commands.length === 1 ? commands[0] : { type: 'batch', commands }, rightIds }
}

/**
 * Delete clips. Main-track deletes always ripple (magnetic). `ripple` also
 * closes the gap on free tracks: later clips on that track move left.
 */
export function deleteCommand(p: VideoProject, ids: string[], ripple: boolean): Command | null {
  const clips = ids.map(id => findClip(p, id)).filter((c): c is Clip => !!c && !isLocked(p, c))
  if (!clips.length) return null
  const commands: Command[] = []
  const packTracks = new Set<string>()
  // Free-track ripples are applied right-to-left so each shift uses the original positions.
  clips
    .slice()
    .sort((a, b) => b.start - a.start)
    .forEach(c => {
      const main = isMainTrack(findTrack(p, c.trackId))
      if (main) packTracks.add(c.trackId)
      commands.push({ type: 'removeClip', clipId: c.id, ripple: ripple && !main })
    })
  packTracks.forEach(id => commands.push(pack(id)))
  return commands.length === 1 ? commands[0] : { type: 'batch', commands }
}

export function duplicateCommand(
  p: VideoProject,
  ids: string[],
  newId: (c: Clip) => string = () => makeId('clip'),
): { command: Command; newIds: string[] } | null {
  const clips = ids.map(id => findClip(p, id)).filter((c): c is Clip => !!c && !isLocked(p, c))
  if (!clips.length) return null
  const newIds: string[] = []
  const commands: Command[] = clips
    .sort((a, b) => b.start - a.start)
    .map(c => {
      const id = newId(c)
      newIds.push(id)
      return { type: 'duplicateClip', clipId: c.id, newId: id }
    })
  return { command: commands.length === 1 ? commands[0] : { type: 'batch', commands }, newIds }
}

// ---------------------------------------------------------------------------
// Detach audio
// ---------------------------------------------------------------------------

/**
 * Copy a video clip's sound to an audio track (same timing, in/out, speed,
 * volume, fades) and mute the video clip. The audio clip plays an audio twin
 * of the video asset (same source), so the audio engine and export treat it
 * like any other audio file.
 */
export function detachAudioCommand(
  p: VideoProject,
  clipId: string,
  ids: { clipId: string; trackId?: string } = { clipId: makeId('audio') },
): { command: Command; audioClipId: string } | null {
  const c = findClip(p, clipId)
  const a = findAsset(p, c?.assetId)
  if (!c || !a || a.kind !== 'video' || c.muted) return null
  const twinId = `${a.id}~audio`
  const commands: Command[] = []
  if (!findAsset(p, twinId)) {
    const twin: Asset = { ...a, id: twinId, kind: 'audio', name: `${a.name} (audio)` }
    delete twin.poster
    delete twin.width
    delete twin.height
    commands.push({ type: 'addAsset', asset: twin })
  }
  const audio: Clip = {
    id: ids.clipId,
    trackId: '',
    assetId: twinId,
    name: `${c.name || a.name} (audio)`,
    start: c.start,
    inPoint: c.inPoint,
    outPoint: c.outPoint,
    speed: c.speed,
    volume: c.volume,
    fadeIn: c.fadeIn,
    fadeOut: c.fadeOut,
  }
  const end = clipEnd(c)
  const free = p.tracks.find(t => t.kind === 'audio' && !p.clips.some(o => o.trackId === t.id && o.start < end - EPS && c.start < clipEnd(o) - EPS))
  let trackId = free?.id
  if (!trackId) {
    trackId = ids.trackId || makeId('track-audio')
    const n = p.tracks.filter(t => t.kind === 'audio').length + 1
    commands.push({ type: 'addTrack', track: { id: trackId, kind: 'audio', name: n > 1 ? `Audio ${n}` : 'Audio' } })
  }
  commands.push({ type: 'addClip', clip: { ...audio, trackId } })
  commands.push({ type: 'setClipProps', clipId: c.id, patch: { muted: true } })
  return { command: { type: 'batch', commands }, audioClipId: ids.clipId }
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

/** Clip property edit; a speed change on the magnetic track re-packs it (a faster clip leaves no gap). */
export function propsCommand(p: VideoProject, clipId: string, patch: ClipProps): Command | null {
  const c = findClip(p, clipId)
  if (!c || isLocked(p, c)) return null
  const cmd: Command = { type: 'setClipProps', clipId, patch }
  if ('speed' in patch && isMainTrack(findTrack(p, c.trackId))) return { type: 'batch', commands: [cmd, pack(c.trackId)] }
  return cmd
}

// ---------------------------------------------------------------------------
// Trim / move
// ---------------------------------------------------------------------------

/**
 * Trim one edge to project time `time` (the model stops it at the source bounds).
 * On the magnetic track the clip stays where it is and the head trim moves the
 * in point instead (dragging left reveals earlier media and pushes later clips
 * right; dragging right drops media and pulls them left) — the track stays packed.
 */
export function trimCommand(p: VideoProject, clipId: string, edge: 'start' | 'end', time: number): Command | null {
  const c = findClip(p, clipId)
  if (!c || isLocked(p, c)) return null
  const track = findTrack(p, c.trackId)
  if (!isMainTrack(track)) return { type: 'trimClip', clipId, edge, time }
  if (edge === 'end') return { type: 'batch', commands: [{ type: 'trimClip', clipId, edge, time, ripple: true }, pack(c.trackId)] }
  const a = findAsset(p, c.assetId)
  const media = a && a.kind !== 'image'
  const minSpan = MIN_CLIP * c.speed
  let inPoint = c.inPoint + (time - c.start) * c.speed
  inPoint = Math.min(c.outPoint - minSpan, Math.max(media ? 0 : -Infinity, inPoint))
  // Element/image clips have no source to reveal: the length simply changes.
  const next: Clip = media ? { ...c, inPoint } : { ...c, inPoint: 0, outPoint: Math.max(minSpan, c.outPoint - inPoint) }
  const d = clipDuration(next)
  next.fadeIn = Math.min(next.fadeIn, d)
  next.fadeOut = Math.min(next.fadeOut, d - next.fadeIn)
  return { type: 'batch', commands: [{ type: 'patch', putClips: [next] }, pack(c.trackId)] }
}

export interface MoveIntent {
  /** Clip under the pointer. */
  primaryId: string
  /** Every clip being dragged (includes the primary). */
  ids: string[]
  /** Seconds to add to each clip's start (already snapped). */
  delta: number
  /** Track the primary is over (may differ from its own). */
  targetTrackId: string
  /** Magnetic target: insertion index among the target track's other clips. */
  insertIndex?: number
}

/**
 * Move clips. Free tracks: every dragged clip shifts by `delta`; the primary
 * may change track (if its kind is allowed there). Magnetic target: the
 * primary is inserted at `insertIndex` and the track re-packs; a clip leaving
 * the main track closes its gap.
 */
export function moveCommand(p: VideoProject, m: MoveIntent): Command | null {
  const primary = findClip(p, m.primaryId)
  if (!primary || isLocked(p, primary)) return null
  const target = findTrack(p, m.targetTrackId)
  const targetTrack = target && !target.locked && canPlace(p, primary, target) ? target : findTrack(p, primary.trackId)
  if (!targetTrack) return null
  const from = findTrack(p, primary.trackId)
  const commands: Command[] = []

  if (isMainTrack(targetTrack)) {
    const others = trackClips(p, targetTrack.id).filter(c => c.id !== primary.id)
    const index = m.insertIndex ?? others.filter(c => c.start + clipDuration(c) / 2 <= primary.start + m.delta).length
    commands.push(pack(targetTrack.id, insertOrder(others.map(c => c.id), primary.id, index)))
    if (from && from.id !== targetTrack.id && isMainTrack(from)) commands.push(pack(from.id))
  } else {
    const movers = m.ids
      .map(id => findClip(p, id))
      .filter((c): c is Clip => !!c && !isLocked(p, c) && !isMainTrack(findTrack(p, c.trackId)))
    if (!movers.some(c => c.id === primary.id)) movers.unshift(primary)
    // Leftmost first, so a group keeps its spacing when it collides.
    movers
      .sort((a, b) => a.start - b.start)
      .forEach(c => {
        const trackId = c.id === primary.id ? targetTrack.id : c.trackId
        commands.push({ type: 'moveClip', clipId: c.id, start: Math.max(0, c.start + m.delta), trackId })
      })
    if (from && from.id !== targetTrack.id && isMainTrack(from)) commands.push(pack(from.id))
  }
  return commands.length === 1 ? commands[0] : { type: 'batch', commands }
}

/** Clip ids in on-screen order (track by track, left to right) for keyboard focus traversal. */
export function clipTraversal(p: VideoProject, trackOrder: string[]): string[] {
  return trackOrder.flatMap(id => trackClips(p, id).map(c => c.id))
}
