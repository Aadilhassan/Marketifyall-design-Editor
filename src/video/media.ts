/**
 * Media layer: the <video>/<audio> elements behind the timeline and the one
 * AudioContext they play through.
 *
 * Video in the scene: a video clip's canvas object is a fabric image whose
 * element becomes its HTMLVideoElement (`objectCaching: false`). The object's
 * crop/size are converted from poster space to video space on bind (see
 * geometry.ts) so nothing moves; serialisation converts back, so saved JSON
 * always describes the poster. Until the video has a decodable frame the
 * object draws a frame canvas holding the poster (and, while seeking, the
 * last good frame) — it is never blank.
 *
 * Sync rules (one call per tick from the engine):
 *  - playing: element plays at the clip speed; re-seek only if it drifted
 *    more than PLAY_DRIFT; never runs past the media end.
 *  - paused / scrubbing: element paused; seek when off by > half a frame,
 *    coalesced while a seek is in flight; render after `seeked` (and the
 *    presented frame via requestVideoFrameCallback when available).
 *  - Audio: every element → MediaElementAudioSourceNode → GainNode
 *    (volume × fades × mute) → destination. The context is created on the
 *    first play (a user gesture); until then elements stay muted.
 */
import { ignoreError, log } from '@/lib/logger'
import { FrameState } from './evaluate'
import { Clip, VideoProject, findAsset } from './model'
import { ImageGeometry, Rect, posterRegion, posterToVideo, videoToPoster } from './geometry'
import { forgetObject, setLiveMedia, writeMetadata } from './apply'

type AnyObj = any

const PLAY_DRIFT = 0.25
const PRELOAD_AHEAD = 1

export type SyncMode = 'play' | 'pause' | 'scrub'

interface Target {
  mediaTime: number
  rate: number
  gain: number
}

// ---------------------------------------------------------------------------
// Audio graph
// ---------------------------------------------------------------------------

class AudioGraph {
  ctx: AudioContext | null = null
  private nodes = new Map<HTMLMediaElement, { source: MediaElementAudioSourceNode; gain: GainNode }>()
  private pending = new Set<HTMLMediaElement>()

  /** Create/resume the context. Call from a user gesture (play). */
  ensure(): void {
    if (!this.ctx) {
      const Ctor: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return
      try {
        this.ctx = new Ctor()
      } catch (err) {
        log.warn('video', 'audio context unavailable — media plays muted', err)
        return
      }
      this.pending.forEach(el => this.route(el))
      this.pending.clear()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(err => ignoreError(err, 'audio resume needs a gesture'))
  }

  /** Clock for the playback controller: only while the context is actually running. */
  clock(): number | null {
    return this.ctx && this.ctx.state === 'running' ? this.ctx.currentTime : null
  }

  attach(el: HTMLMediaElement): void {
    if (this.nodes.has(el)) return
    if (!this.ctx) {
      this.pending.add(el)
      return
    }
    this.route(el)
  }

  private route(el: HTMLMediaElement): void {
    if (!this.ctx || this.nodes.has(el)) return
    try {
      const source = this.ctx.createMediaElementSource(el)
      const gain = this.ctx.createGain()
      gain.gain.value = 0
      source.connect(gain).connect(this.ctx.destination)
      this.nodes.set(el, { source, gain })
      // Sound now flows only through the graph (gain 0 until a clip asks for it).
      el.muted = false
    } catch (err) {
      log.warn('video', 'could not route media through the audio graph', err)
    }
  }

  setGain(el: HTMLMediaElement, value: number): void {
    const n = this.nodes.get(el)
    if (!n || !this.ctx) return
    const v = Math.max(0, value)
    if (Math.abs(n.gain.gain.value - v) < 1e-3) return
    n.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.012)
  }

  detach(el: HTMLMediaElement): void {
    this.pending.delete(el)
    const n = this.nodes.get(el)
    if (!n) return
    try {
      n.source.disconnect()
      n.gain.disconnect()
    } catch (err) {
      ignoreError(err, 'audio node already disconnected')
    }
    this.nodes.delete(el)
  }

  dispose(): void {
    Array.from(this.nodes.keys()).forEach(el => this.detach(el))
    this.pending.clear()
    this.ctx?.close().catch(err => ignoreError(err, 'audio context close'))
    this.ctx = null
  }
}

// ---------------------------------------------------------------------------
// Element sync shared by video bindings and audio clips
// ---------------------------------------------------------------------------

abstract class MediaBinding {
  el: HTMLMediaElement
  url: string
  private pendingSeek: number | null = null
  private playPending = false
  private listeners: Array<[string, EventListener]> = []
  protected fps: number
  protected onRender: () => void
  protected graph: AudioGraph
  broken = false

  constructor(el: HTMLMediaElement, url: string, graph: AudioGraph, fps: number, onRender: () => void) {
    this.el = el
    this.url = url
    this.graph = graph
    this.fps = fps
    this.onRender = onRender
    this.on('seeked', () => this.onSeeked())
    this.on('error', () => {
      this.broken = true
      log.warn('video', `media failed to load: ${url.slice(0, 80)}`)
    })
    graph.attach(el)
  }

  protected on(event: string, fn: EventListener): void {
    this.el.addEventListener(event, fn)
    this.listeners.push([event, fn])
  }

  private onSeeked(): void {
    if (this.pendingSeek !== null && Math.abs(this.el.currentTime - this.pendingSeek) > 0.5 / this.fps) {
      const next = this.pendingSeek
      this.pendingSeek = null
      this.seekNow(next)
      return
    }
    this.pendingSeek = null
    this.frameReady()
  }

  /** A new frame is (about to be) presentable — repaint once. */
  protected frameReady(): void {
    const v = this.el as any
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(() => this.onRender())
    this.onRender()
  }

  private seekNow(t: number): void {
    try {
      this.el.currentTime = t
    } catch (err) {
      ignoreError(err, 'seek before metadata')
    }
  }

  /** Coalesced seek: while one is in flight only the latest target is kept. */
  seek(t: number): void {
    if (this.el.seeking) {
      this.pendingSeek = t
      return
    }
    this.seekNow(t)
  }

  private mediaEnd(): number {
    const d = this.el.duration
    return Number.isFinite(d) && d > 0 ? d : Infinity
  }

  sync(target: Target | null, mode: SyncMode): void {
    const el = this.el
    if (!target) {
      if (!el.paused) el.pause()
      this.graph.setGain(el, 0)
      return
    }
    const frame = 1 / this.fps
    const end = this.mediaEnd()
    const t = Math.min(target.mediaTime, end - frame / 2)
    if (Math.abs(el.playbackRate - target.rate) > 1e-3) el.playbackRate = target.rate
    if (mode === 'play') {
      this.graph.setGain(el, target.gain)
      if (target.mediaTime >= end - frame) {
        // Held past the media end: freeze on the last frame instead of looping.
        if (!el.paused) el.pause()
        if (Math.abs(el.currentTime - t) > frame) this.seek(t)
        return
      }
      if (Math.abs(el.currentTime - t) > PLAY_DRIFT || el.ended) this.seek(t)
      if (el.paused && !this.playPending && el.readyState >= 1) this.play()
      return
    }
    this.graph.setGain(el, 0)
    if (!el.paused) el.pause()
    if (Math.abs(el.currentTime - t) > frame / 2 || (this.pendingSeek !== null && Math.abs(this.pendingSeek - t) > frame / 2)) this.seek(t)
  }

  /** Paused pre-roll so an upcoming clip's first frame is decoded before its cut. */
  preroll(mediaTime: number): void {
    if (!this.el.paused || this.el.seeking) return
    if (Math.abs(this.el.currentTime - mediaTime) > 1 / this.fps) this.seek(mediaTime)
  }

  private play(): void {
    this.playPending = true
    const p = this.el.play()
    const done = () => {
      this.playPending = false
    }
    if (p && typeof p.then === 'function') {
      p.then(done).catch(err => {
        done()
        if (err?.name === 'NotAllowedError' && !this.el.muted) {
          // Autoplay policy: keep the picture moving, silently.
          this.el.muted = true
          this.el.play().catch(e => ignoreError(e, 'muted play() blocked too'))
        } else {
          ignoreError(err, 'play() interrupted by a seek/pause')
        }
      })
    } else done()
  }

  dispose(): void {
    this.listeners.forEach(([e, fn]) => this.el.removeEventListener(e, fn))
    this.listeners = []
    this.graph.detach(this.el)
    try {
      this.el.pause()
      this.el.removeAttribute('src')
      this.el.load()
    } catch (err) {
      ignoreError(err, 'media element teardown')
    }
  }
}

function createMedia(kind: 'video' | 'audio', url: string): HTMLMediaElement {
  const el = document.createElement(kind)
  if (!url.startsWith('blob:') && !url.startsWith('data:')) el.crossOrigin = 'anonymous'
  el.preload = 'auto'
  el.muted = true
  if (kind === 'video') {
    ;(el as HTMLVideoElement).playsInline = true
    el.setAttribute('playsinline', '')
  }
  el.src = url
  return el
}

class AudioBinding extends MediaBinding {
  constructor(url: string, graph: AudioGraph, fps: number, onRender: () => void) {
    super(createMedia('audio', url), url, graph, fps, onRender)
  }
}

// ---------------------------------------------------------------------------
// Video objects
// ---------------------------------------------------------------------------

export class VideoBinding extends MediaBinding {
  obj: AnyObj
  get video(): HTMLVideoElement {
    return this.el as HTMLVideoElement
  }
  private posterEl: AnyObj
  private posterSrc: string
  private posterSize = { width: 0, height: 0 }
  private region: Rect | null = null
  private frameCanvas: HTMLCanvasElement | null = null
  private converted = false
  private showing: 'poster' | 'frame' | 'video' = 'poster'
  private hadToObject: boolean
  private prevProps: Record<string, any>

  constructor(obj: AnyObj, url: string, graph: AudioGraph, fps: number, onRender: () => void) {
    super(createMedia('video', url), url, graph, fps, onRender)
    this.obj = obj
    this.posterEl = obj._originalElement || obj._element
    this.posterSrc = (typeof obj.getSrc === 'function' && safeSrc(obj)) || obj.metadata?.src || ''
    this.posterSize = {
      width: this.posterEl?.naturalWidth || this.posterEl?.width || obj.width || 1,
      height: this.posterEl?.naturalHeight || this.posterEl?.height || obj.height || 1,
    }
    this.hadToObject = Object.prototype.hasOwnProperty.call(obj, 'toObject')
    this.prevProps = { objectCaching: obj.objectCaching }
    // Uploaded videos used to be locked; a video is a regular, selectable element.
    obj.set({ selectable: true, evented: true, hasControls: true, hasBorders: true })
    if (!obj.metadata?.isVideo) writeMetadata(obj, { isVideo: true })
    this.installSerializer()
    this.on('loadedmetadata', () => this.convert())
    this.on('loadeddata', () => this.showVideo())
    this.on('seeking', () => this.holdFrame())
    // Registered after the base class's coalescing handler: if it started another
    // seek, `seeking` is true again and the held frame stays up.
    this.on('seeked', () => this.showVideo())
    this.on('playing', () => this.showVideo())
    if (this.video.readyState >= 1) this.convert()
  }

  /** Swap geometry to video space and show the poster through a frame canvas. */
  private convert(): void {
    if (this.converted) return
    const v = this.video
    const vw = v.videoWidth
    const vh = v.videoHeight
    if (!vw || !vh || (this.obj.filters && this.obj.filters.length)) return
    this.region = posterRegion({ width: vw, height: vh }, this.posterSize, this.obj.metadata?.videoCrop)
    // Convert from the authored geometry, never from a mid-animation frame.
    forgetObject(this.obj)
    setLiveMedia(this.obj, true)
    const g = posterToVideo(currentGeometry(this.obj), this.region, this.posterSize)
    v.width = vw
    v.height = vh
    const fc = document.createElement('canvas')
    fc.width = vw
    fc.height = vh
    const ctx = fc.getContext('2d')
    if (ctx && this.posterEl) {
      try {
        ctx.drawImage(this.posterEl, this.region.x, this.region.y, this.region.w, this.region.h)
      } catch (err) {
        ignoreError(err, 'poster not drawable (still loading)')
      }
    }
    this.frameCanvas = fc
    this.obj.set(g)
    this.obj.objectCaching = false
    this.obj._element = fc
    this.showing = 'frame'
    this.converted = true
    this.obj.dirty = true
    this.obj.setCoords?.()
    if (v.readyState >= 2) this.showVideo()
    this.onRender()
  }

  private showVideo(): void {
    if (!this.converted) this.convert()
    if (!this.converted || this.video.readyState < 2 || this.video.seeking) return
    if (this.showing !== 'video') {
      this.obj._element = this.video
      this.showing = 'video'
    }
    this.obj.dirty = true
    this.frameReady()
  }

  /** Before a seek replaces the picture, keep the current frame on screen. */
  private holdFrame(): void {
    if (!this.converted || !this.frameCanvas) return
    if (this.showing === 'video' && this.video.readyState >= 2) {
      const ctx = this.frameCanvas.getContext('2d')
      try {
        ctx?.drawImage(this.video, 0, 0)
      } catch (err) {
        ignoreError(err, 'frame snapshot during seek')
      }
    }
    this.obj._element = this.frameCanvas
    this.showing = 'frame'
  }

  /** Saved JSON describes the poster (raw `image`, poster geometry, full metadata). */
  private installSerializer(): void {
    const binding = this
    const proto = Object.getPrototypeOf(this.obj)
    this.obj.toObject = function (props?: string[]) {
      const o = proto.toObject.call(this, props)
      if (binding.converted && binding.region) Object.assign(o, videoToPoster(currentGeometry(this), binding.region, binding.posterSize))
      o.type = 'image'
      o.src = binding.posterSrc || o.src
      o.metadata = { ...(this.metadata || {}), isVideo: true, src: binding.posterSrc || this.metadata?.src }
      return o
    }
  }

  /** Back to a plain poster image (clip removed / unmount). */
  dispose(): void {
    const obj = this.obj
    try {
      forgetObject(obj)
      setLiveMedia(obj, false)
      if (this.converted && this.region) obj.set(videoToPoster(currentGeometry(obj), this.region, this.posterSize))
      obj._element = this.posterEl
      obj._originalElement = this.posterEl
      obj.objectCaching = this.prevProps.objectCaching
      if (!this.hadToObject) delete obj.toObject
      obj.dirty = true
      obj.setCoords?.()
    } catch (err) {
      ignoreError(err, 'video object already gone')
    }
    this.frameCanvas = null
    super.dispose()
  }
}

function safeSrc(obj: AnyObj): string {
  try {
    const s = obj.getSrc()
    return typeof s === 'string' && !s.startsWith('blob:') ? s : ''
  } catch (err) {
    ignoreError(err, 'poster src unreadable')
    return ''
  }
}

function currentGeometry(obj: AnyObj): ImageGeometry {
  return {
    cropX: obj.cropX || 0,
    cropY: obj.cropY || 0,
    width: obj.width || 1,
    height: obj.height || 1,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
  }
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export interface MediaManagerOptions {
  /** Playable URL for an asset: string, null (missing) or undefined (resolving). */
  assetUrl: (assetId: string) => string | null | undefined
  onRender: () => void
  fps?: number
}

const isVideoClip = (p: VideoProject, c: Clip) => !!c.objectId && findAsset(p, c.assetId)?.kind === 'video'

export class MediaManager {
  private videos = new Map<string, VideoBinding>()
  private audios = new Map<string, AudioBinding>()
  readonly graph = new AudioGraph()
  private opts: MediaManagerOptions

  constructor(opts: MediaManagerOptions) {
    this.opts = opts
  }

  /** Create/drop element bindings so they match the project and the objects on the canvas. */
  reconcile(project: VideoProject, objects: Array<{ id: string; obj: AnyObj }>): void {
    const fps = this.opts.fps || project.fps
    const byId = new Map(objects.map(o => [o.id, o.obj]))
    const wantVideo = new Map<string, string>()
    for (const c of project.clips) {
      if (!isVideoClip(project, c) || !byId.has(c.objectId as string) || wantVideo.has(c.objectId as string)) continue
      const url = this.opts.assetUrl(c.assetId as string)
      if (url) wantVideo.set(c.objectId as string, url)
    }
    this.videos.forEach((b, id) => {
      if (wantVideo.get(id) !== b.url || byId.get(id) !== b.obj) {
        b.dispose()
        this.videos.delete(id)
      }
    })
    wantVideo.forEach((url, id) => {
      if (!this.videos.has(id)) this.videos.set(id, new VideoBinding(byId.get(id), url, this.graph, fps, this.opts.onRender))
    })

    const wantAudio = new Map<string, string>()
    for (const c of project.clips) {
      const a = findAsset(project, c.assetId)
      if (!a || a.kind !== 'audio') continue
      const url = this.opts.assetUrl(a.id)
      if (url) wantAudio.set(c.id, url)
    }
    this.audios.forEach((b, id) => {
      if (wantAudio.get(id) !== b.url) {
        b.dispose()
        this.audios.delete(id)
      }
    })
    wantAudio.forEach((url, id) => {
      if (!this.audios.has(id)) this.audios.set(id, new AudioBinding(url, this.graph, fps, this.opts.onRender))
    })
  }

  /** Drive every element to the evaluated frame. */
  sync(project: VideoProject, frame: FrameState, mode: SyncMode): void {
    if (mode === 'play') this.graph.ensure()
    const audioByObject = new Map(frame.activeAudio.filter(a => a.objectId).map(a => [a.objectId as string, a]))
    this.videos.forEach((b, id) => {
      const s = frame.objects[id]
      if (s && s.visible && s.mediaTime !== undefined) {
        const a = audioByObject.get(id)
        b.sync({ mediaTime: s.mediaTime, rate: s.rate || 1, gain: a ? a.gain : 0 }, mode)
      } else {
        b.sync(null, mode)
        const next = upcoming(project, frame.time, c => c.objectId === id)
        if (next) b.preroll(next.inPoint)
      }
    })
    const audioByClip = new Map(frame.activeAudio.map(a => [a.clipId, a]))
    this.audios.forEach((b, clipId) => {
      const a = audioByClip.get(clipId)
      if (a) b.sync({ mediaTime: a.mediaTime, rate: a.rate, gain: a.gain }, mode)
      else {
        b.sync(null, mode)
        const next = upcoming(project, frame.time, c => c.id === clipId)
        if (next) b.preroll(next.inPoint)
      }
    })
  }

  clock(): number | null {
    return this.graph.clock()
  }

  videoFor(objectId: string): HTMLVideoElement | null {
    return this.videos.get(objectId)?.video || null
  }

  /** Everything that has a binding, for export (render.ts). */
  videoBindings(): Map<string, VideoBinding> {
    return this.videos
  }

  pauseAll(): void {
    this.videos.forEach(b => b.sync(null, 'pause'))
    this.audios.forEach(b => b.sync(null, 'pause'))
  }

  dispose(): void {
    this.videos.forEach(b => b.dispose())
    this.audios.forEach(b => b.dispose())
    this.videos.clear()
    this.audios.clear()
    this.graph.dispose()
  }
}

function upcoming(project: VideoProject, t: number, match: (c: Clip) => boolean): Clip | undefined {
  let best: Clip | undefined
  for (const c of project.clips) {
    if (!match(c) || c.start <= t || c.start - t > PRELOAD_AHEAD) continue
    if (!best || c.start < best.start) best = c
  }
  return best
}
