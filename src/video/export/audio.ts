/**
 * Offline audio mix for export.
 *
 * `planAudio` (pure) turns the project into scheduled sources: one per audible
 * clip (audio clips and video clips with sound), with where it starts in the
 * output, the media offset, its length, playback rate and a gain envelope.
 * The envelope is sampled from `evaluateTimeline(...).activeAudio`, the same
 * gains preview uses (volume × fades × transitions × mute), so the export
 * sounds like the preview.
 *
 * `mixAudio` decodes each asset once and renders the plan in an
 * OfflineAudioContext (48 kHz stereo). Sources that can't be read (missing on
 * this device, blocked by CORS, undecodable) are skipped with a warning.
 */
import { ignoreError, log } from '@/lib/logger'
import { evaluateTimeline } from '../evaluate'
import { Clip, ObjectRef, VideoProject, clipEnd, findAsset, findTrack } from '../model'
import { TimeRange } from './settings'
import { throwIfAborted } from './frames'

export const EXPORT_SAMPLE_RATE = 48000
export const EXPORT_CHANNELS = 2
const ENVELOPE_STEP = 0.01
const EPS = 1e-6

export interface GainPoint {
  /** Seconds from the start of the output. */
  t: number
  gain: number
}

export interface ScheduledSource {
  clipId: string
  assetId: string
  /** Output time the source starts, seconds. */
  when: number
  /** Media time at `when`, seconds. */
  offset: number
  /** Output seconds it plays for. */
  duration: number
  rate: number
  envelope: GainPoint[]
}

/** Transition hold: the outgoing clip keeps playing under the next clip's (non-dip) transition. */
function holdAfter(project: VideoProject, c: Clip): number {
  const tol = 1 / project.fps
  const end = clipEnd(c)
  let hold = 0
  for (const n of project.clips) {
    if (n.id === c.id || n.trackId !== c.trackId || !n.transitionIn) continue
    if (n.transitionIn.type === 'dip' || !(n.transitionIn.duration > 0)) continue
    if (Math.abs(n.start - end) <= tol) hold = Math.max(hold, n.transitionIn.duration)
  }
  return hold
}

/** Drop points that lie on the line between their neighbours (constant gain runs, linear fades). */
export function compressEnvelope(points: GainPoint[], tolerance = 1e-4): GainPoint[] {
  if (points.length <= 2) return points.slice()
  const out: GainPoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1]
    const b = points[i]
    const c = points[i + 1]
    const span = c.t - a.t
    const lerp = span > 0 ? a.gain + ((c.gain - a.gain) * (b.t - a.t)) / span : c.gain
    if (Math.abs(lerp - b.gain) > tolerance) out.push(b)
  }
  out.push(points[points.length - 1])
  return out
}

/**
 * Schedule every audible clip of the project inside `range`. `objects` are the
 * canvas objects of the exported page (clips bound to other pages' objects are
 * ignored, as in preview).
 */
export function planAudio(project: VideoProject, range: TimeRange, objects: ObjectRef[], step = ENVELOPE_STEP): ScheduledSource[] {
  const present = new Set(objects.map(o => o.id))
  const windows: Array<{ clip: Clip; ws: number; we: number; points: GainPoint[] }> = []
  for (const c of project.clips) {
    const asset = findAsset(project, c.assetId)
    if (!asset || (asset.kind !== 'audio' && asset.kind !== 'video')) continue
    if (c.objectId && !present.has(c.objectId)) continue
    const track = findTrack(project, c.trackId)
    if (!track || track.muted || track.hidden) continue
    const ws = Math.max(c.start, range.start)
    const we = Math.min(clipEnd(c) + holdAfter(project, c), range.end)
    if (we - ws <= EPS) continue
    windows.push({ clip: c, ws, we, points: [] })
  }
  if (!windows.length) return []

  const gainAt = (frame: ReturnType<typeof evaluateTimeline>, clipId: string) => {
    const a = frame.activeAudio.find(x => x.clipId === clipId)
    return a ? a.gain : 0
  }
  // One evaluation per grid time for all sources, plus each window's own edges.
  const times = new Set<number>()
  for (let t = range.start; t < range.end - EPS; t += step) times.add(Math.round(t * 1e6) / 1e6)
  windows.forEach(w => {
    times.add(w.ws)
    // The end is exclusive in the timeline; sample just inside it.
    times.add(Math.max(w.ws, w.we - 1e-4))
  })
  Array.from(times)
    .sort((a, b) => a - b)
    .forEach(t => {
      const inWindow = windows.filter(w => t >= w.ws - EPS && t <= w.we + EPS)
      if (!inWindow.length) return
      const frame = evaluateTimeline(project, t, objects)
      inWindow.forEach(w => w.points.push({ t: t - range.start, gain: gainAt(frame, w.clip.id) }))
    })

  const out: ScheduledSource[] = []
  for (const w of windows) {
    if (!w.points.some(p => p.gain > 1e-4)) continue
    const c = w.clip
    out.push({
      clipId: c.id,
      assetId: c.assetId as string,
      when: w.ws - range.start,
      offset: c.inPoint + (w.ws - c.start) * c.speed,
      duration: w.we - w.ws,
      rate: c.speed || 1,
      envelope: compressEnvelope(w.points),
    })
  }
  return out
}

export interface MixResult {
  buffer: AudioBuffer | null
  warnings: string[]
}

function offlineCtor(): typeof OfflineAudioContext | undefined {
  return (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext
}

export const canMixAudio = (): boolean => typeof window !== 'undefined' && !!offlineCtor()

function decode(ctx: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    // Safari < 14 only has the callback form.
    const p = ctx.decodeAudioData(data, resolve, reject) as any
    if (p && typeof p.then === 'function') p.then(resolve, reject)
  })
}

/** Render the plan to a stereo buffer `duration` seconds long. */
export async function mixAudio(
  project: VideoProject,
  sources: ScheduledSource[],
  duration: number,
  assetUrl: (assetId: string) => string | null | undefined,
  signal?: AbortSignal,
): Promise<MixResult> {
  const warnings: string[] = []
  const Ctor = offlineCtor()
  if (!sources.length || !Ctor || !(duration > 0)) return { buffer: null, warnings }
  const ctx = new Ctor(EXPORT_CHANNELS, Math.max(1, Math.ceil(duration * EXPORT_SAMPLE_RATE)), EXPORT_SAMPLE_RATE)

  const buffers = new Map<string, AudioBuffer | null>()
  for (const assetId of Array.from(new Set(sources.map(s => s.assetId)))) {
    throwIfAborted(signal)
    const asset = findAsset(project, assetId)
    const name = asset?.name || 'Audio'
    const url = assetUrl(assetId)
    if (!url) {
      warnings.push(`"${name}" is missing on this device — its sound is not in the export.`)
      buffers.set(assetId, null)
      continue
    }
    let data: ArrayBuffer
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      data = await res.arrayBuffer()
    } catch (err) {
      log.warn('export', `could not read audio of ${name}`, err)
      warnings.push(`Couldn't read the sound of "${name}" (the host blocks access) — exported without it.`)
      buffers.set(assetId, null)
      continue
    }
    try {
      buffers.set(assetId, await decode(ctx, data))
    } catch (err) {
      buffers.set(assetId, null)
      if (asset?.kind === 'audio') {
        log.warn('export', `could not decode ${name}`, err)
        warnings.push(`Couldn't decode "${name}" — exported without it.`)
      } else {
        // Most often a video without an audio track.
        ignoreError(err, 'video has no decodable audio track')
      }
    }
  }
  throwIfAborted(signal)

  let scheduled = 0
  for (const s of sources) {
    const buf = buffers.get(s.assetId)
    if (!buf || s.offset >= buf.duration) continue
    const node = ctx.createBufferSource()
    node.buffer = buf
    node.playbackRate.value = s.rate
    const gain = ctx.createGain()
    const env = s.envelope
    gain.gain.setValueAtTime(env.length ? env[0].gain : 1, s.when)
    for (let i = 1; i < env.length; i++) gain.gain.linearRampToValueAtTime(env[i].gain, env[i].t)
    node.connect(gain)
    gain.connect(ctx.destination)
    node.start(s.when, s.offset)
    node.stop(s.when + s.duration)
    scheduled++
  }
  if (!scheduled) return { buffer: null, warnings }
  const buffer = await ctx.startRendering()
  return { buffer, warnings }
}

/** 16-bit PCM WAV from planar channels. */
export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const numCh = Math.max(1, channels.length)
  const frames = channels[0]?.length || 0
  const dataBytes = frames * numCh * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const v = new DataView(buf)
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  v.setUint32(4, 36 + dataBytes, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, numCh, true)
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * numCh * 2, true)
  v.setUint16(32, numCh * 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, dataBytes, true)
  let o = 44
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const x = Math.max(-1, Math.min(1, channels[ch] ? channels[ch][i] : 0))
      v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true)
      o += 2
    }
  }
  return buf
}

export function bufferChannels(buffer: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = []
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) out.push(buffer.getChannelData(ch))
  return out
}
