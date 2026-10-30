/**
 * Encoders.
 *
 * `Mp4Writer` — WebCodecs: H.264 `VideoEncoder` (+ AAC, or Opus where AAC
 * can't be encoded, via `AudioEncoder`) muxed by mp4-muxer with the moov box
 * up front (`fastStart: 'in-memory'`). Frames are encoded as they come with a
 * keyframe every 2 s; `addFrame` waits while the encoder queue is deep so
 * memory stays bounded. Also writes audio-only M4A.
 *
 * `RealtimeRecorder` — fallback without WebCodecs (or for WebM, which has no
 * muxer here): frames from the same deterministic loop are buffered in small
 * batches while the recorder is paused, then presented on a captured canvas
 * (`captureStream(0)` + `requestFrame()`) at exactly 1/fps intervals measured
 * on the audio clock, with the offline-mixed soundtrack playing through a
 * MediaStreamDestination. Slower than WebCodecs, but frames are in order and
 * none are skipped.
 *
 * WebCodecs types aren't in this TypeScript's DOM lib, hence the loose typing.
 */
import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { ignoreError } from '@/lib/logger'
import { throwIfAborted } from './frames'
import { avcCandidates } from './settings'

type AnyObj = any

const g = (): AnyObj => (typeof window !== 'undefined' ? window : globalThis)

export const hasWebCodecs = (): boolean => typeof g().VideoEncoder === 'function' && typeof g().VideoFrame === 'function'
export const hasAudioEncoder = (): boolean => typeof g().AudioEncoder === 'function' && typeof g().AudioData === 'function'

const MAX_QUEUE = 8

export interface VideoTrackConfig {
  codec: string
  width: number
  height: number
  fps: number
  bitrate: number
}

export interface AudioTrackConfig {
  codec: 'aac' | 'opus'
  sampleRate: number
  channels: number
  bitrate: number
}

/** First H.264 codec string the browser can encode at this size/rate, or null. */
export async function pickVideoCodec(width: number, height: number, fps: number, bitrate: number): Promise<string | null> {
  if (!hasWebCodecs()) return null
  for (const codec of avcCandidates({ width, height }, fps, bitrate)) {
    try {
      const r = await g().VideoEncoder.isConfigSupported({ codec, width, height, bitrate, framerate: fps, avc: { format: 'avc' } })
      if (r?.supported) return codec
    } catch (err) {
      ignoreError(err, `codec probe ${codec}`)
    }
  }
  return null
}

const AUDIO_CODEC_STRING: Record<AudioTrackConfig['codec'], string> = { aac: 'mp4a.40.2', opus: 'opus' }

/** AAC if the browser can encode it, else Opus (also valid in MP4), else null. */
export async function pickAudioCodec(sampleRate: number, channels: number, bitrate: number): Promise<AudioTrackConfig['codec'] | null> {
  if (!hasAudioEncoder()) return null
  for (const codec of ['aac', 'opus'] as const) {
    try {
      const r = await g().AudioEncoder.isConfigSupported({ codec: AUDIO_CODEC_STRING[codec], sampleRate, numberOfChannels: channels, bitrate })
      if (r?.supported) return codec
    } catch (err) {
      ignoreError(err, `audio codec probe ${codec}`)
    }
  }
  return null
}

/** Wait until the encoder's queue is at most `max` deep. */
async function drain(encoder: AnyObj, max: number, signal?: AbortSignal): Promise<void> {
  while (encoder.encodeQueueSize > max) {
    throwIfAborted(signal)
    await new Promise<void>(resolve => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        encoder.removeEventListener?.('dequeue', finish)
        resolve()
      }
      encoder.addEventListener?.('dequeue', finish)
      setTimeout(finish, 15)
    })
  }
}

export class Mp4Writer {
  private muxer: AnyObj
  private video: AnyObj = null
  private audio: AnyObj = null
  private error: Error | null = null
  private fps = 30
  private closed = false
  readonly hasVideo: boolean
  readonly hasAudio: boolean

  constructor(opts: { video?: VideoTrackConfig | null; audio?: AudioTrackConfig | null }) {
    const { video, audio } = opts
    if (!video && !audio) throw new Error('nothing to encode')
    this.hasVideo = !!video
    this.hasAudio = !!audio
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      ...(video ? { video: { codec: 'avc' as const, width: video.width, height: video.height, frameRate: video.fps } } : {}),
      ...(audio ? { audio: { codec: audio.codec, numberOfChannels: audio.channels, sampleRate: audio.sampleRate } } : {}),
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    })
    const onError = (e: any) => {
      this.error = e instanceof Error ? e : new Error(String(e?.message || e))
    }
    if (video) {
      this.fps = video.fps
      this.video = new (g().VideoEncoder)({
        output: (chunk: AnyObj, meta: AnyObj) => this.mux(() => this.muxer.addVideoChunk(chunk, meta)),
        error: onError,
      })
      this.video.configure({
        codec: video.codec,
        width: video.width,
        height: video.height,
        bitrate: video.bitrate,
        framerate: video.fps,
        avc: { format: 'avc' },
        latencyMode: 'quality',
      })
    }
    if (audio) {
      this.audio = new (g().AudioEncoder)({
        output: (chunk: AnyObj, meta: AnyObj) => this.mux(() => this.muxer.addAudioChunk(chunk, meta)),
        error: onError,
      })
      this.audio.configure({
        codec: AUDIO_CODEC_STRING[audio.codec],
        sampleRate: audio.sampleRate,
        numberOfChannels: audio.channels,
        bitrate: audio.bitrate,
      })
    }
  }

  /** Encoder callbacks can't throw to us — park the error for the next call. */
  private mux(fn: () => void): void {
    try {
      fn()
    } catch (err) {
      this.error = this.error || (err instanceof Error ? err : new Error(String(err)))
    }
  }

  private check(): void {
    if (this.error) throw this.error
  }

  /** Encode the canvas as frame `index` (timestamps in µs). */
  async addFrame(canvas: HTMLCanvasElement, index: number, timestampUs: number, durationUs: number, signal?: AbortSignal): Promise<void> {
    this.check()
    const frame = new (g().VideoFrame)(canvas, { timestamp: timestampUs, duration: durationUs })
    try {
      this.video.encode(frame, { keyFrame: index % Math.max(1, Math.round(this.fps * 2)) === 0 })
    } finally {
      frame.close()
    }
    await drain(this.video, MAX_QUEUE, signal)
    this.check()
  }

  /** Encode samples [from, to) of an already mixed buffer, in chunks. Call with increasing ranges. */
  async addAudio(buffer: AudioBuffer, signal?: AbortSignal, from = 0, to = buffer.length): Promise<void> {
    this.check()
    const channels = buffer.numberOfChannels
    const chunk = 4096
    const end = Math.min(to, buffer.length)
    for (let off = from; off < end; off += chunk) {
      throwIfAborted(signal)
      const n = Math.min(chunk, end - off)
      const planar = new Float32Array(n * channels)
      for (let ch = 0; ch < channels; ch++) planar.set(buffer.getChannelData(ch).subarray(off, off + n), ch * n)
      const data = new (g().AudioData)({
        format: 'f32-planar',
        sampleRate: buffer.sampleRate,
        numberOfFrames: n,
        numberOfChannels: channels,
        timestamp: Math.round((off * 1e6) / buffer.sampleRate),
        data: planar,
      })
      try {
        this.audio.encode(data)
      } finally {
        data.close()
      }
      await drain(this.audio, MAX_QUEUE * 4, signal)
      this.check()
    }
  }

  async finish(): Promise<Blob> {
    if (this.video) await this.video.flush()
    if (this.audio) await this.audio.flush()
    this.check()
    this.muxer.finalize()
    const buf: ArrayBuffer = this.muxer.target.buffer
    this.close()
    return new Blob([buf], { type: this.hasVideo ? 'video/mp4' : 'audio/mp4' })
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    ;[this.video, this.audio].forEach(enc => {
      if (!enc || enc.state === 'closed') return
      try {
        enc.close()
      } catch (err) {
        ignoreError(err, 'encoder already closed')
      }
    })
  }
}

// ---------------------------------------------------------------------------
// MediaRecorder fallback
// ---------------------------------------------------------------------------

const RECORDER_TYPES: Record<'webm' | 'mp4', string[]> = {
  webm: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'],
  mp4: ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4'],
}

export function canRecord(): boolean {
  const MR = g().MediaRecorder
  return typeof MR === 'function' && typeof HTMLCanvasElement !== 'undefined' && typeof (HTMLCanvasElement.prototype as AnyObj).captureStream === 'function'
}

/** Best MediaRecorder mime type for the container, or null when it can't record it. */
export function recorderMime(container: 'webm' | 'mp4'): string | null {
  if (!canRecord()) return null
  const MR = g().MediaRecorder
  for (const type of RECORDER_TYPES[container]) {
    try {
      if (MR.isTypeSupported(type)) return type
    } catch (err) {
      ignoreError(err, 'isTypeSupported probe')
    }
  }
  return null
}

/** Frames buffered before each real-time presentation burst, bounded by ~160 MB of bitmaps. */
export function recorderBatchSize(width: number, height: number, fps: number): number {
  const perFrame = width * height * 4
  return Math.max(1, Math.min(Math.round(fps), Math.floor((160 * 1024 * 1024) / Math.max(1, perFrame))))
}

export class RealtimeRecorder {
  private display: HTMLCanvasElement
  private dctx: CanvasRenderingContext2D
  private track: AnyObj
  private stream: MediaStream
  private recorder: AnyObj
  private chunks: Blob[] = []
  private audioCtx: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private started = false
  private presented = 0
  private queue: AnyObj[] = []
  private batch: number
  private fps: number
  private wallAccum = 0
  private wallStart = 0
  private audioBase = 0
  private stopped: Promise<void>
  private failed: Error | null = null
  readonly mime: string

  constructor(opts: { width: number; height: number; fps: number; mime: string; videoBitrate: number; audioBitrate: number; audio?: AudioBuffer | null }) {
    this.fps = opts.fps
    this.mime = opts.mime
    this.batch = recorderBatchSize(opts.width, opts.height, opts.fps)
    this.display = document.createElement('canvas')
    this.display.width = opts.width
    this.display.height = opts.height
    const ctx = this.display.getContext('2d')
    if (!ctx) throw new Error('Could not create a canvas for recording')
    this.dctx = ctx
    this.stream = (this.display as AnyObj).captureStream(0)
    this.track = this.stream.getVideoTracks()[0]
    if (opts.audio) {
      const Ctor = g().AudioContext || g().webkitAudioContext
      if (Ctor) {
        const ac: AudioContext = new Ctor({ sampleRate: opts.audio.sampleRate })
        const dest = ac.createMediaStreamDestination()
        const src = ac.createBufferSource()
        src.buffer = opts.audio
        src.connect(dest)
        dest.stream.getAudioTracks().forEach(t => this.stream.addTrack(t))
        this.audioCtx = ac
        this.source = src
        ac.suspend().catch(err => ignoreError(err, 'recorder audio suspend'))
      }
    }
    this.recorder = new (g().MediaRecorder)(this.stream, {
      mimeType: opts.mime,
      videoBitsPerSecond: opts.videoBitrate,
      audioBitsPerSecond: opts.audioBitrate,
    })
    this.recorder.ondataavailable = (e: AnyObj) => {
      if (e.data && e.data.size) this.chunks.push(e.data)
    }
    this.stopped = new Promise(resolve => {
      this.recorder.onstop = () => resolve()
    })
    this.recorder.onerror = (e: AnyObj) => {
      this.failed = new Error(e?.error?.message || 'recording failed')
    }
  }

  /** Media time presented so far: the audio clock when there's audio, else accumulated wall time. */
  private clock(): number {
    if (this.audioCtx) return this.audioCtx.currentTime - this.audioBase
    return this.wallAccum + (this.wallStart ? (performance.now() - this.wallStart) / 1000 : 0)
  }

  async push(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void> {
    if (this.failed) throw this.failed
    let copy: AnyObj
    if (typeof g().createImageBitmap === 'function') copy = await g().createImageBitmap(canvas)
    else {
      copy = document.createElement('canvas')
      copy.width = canvas.width
      copy.height = canvas.height
      copy.getContext('2d').drawImage(canvas, 0, 0)
    }
    ;this.queue.push(copy)
    if (this.queue.length >= this.batch) await this.flush(signal)
  }

  private async resume(): Promise<void> {
    if (!this.started) {
      this.started = true
      this.recorder.start(1000)
      if (this.audioCtx) {
        await this.audioCtx.resume()
        this.audioBase = this.audioCtx.currentTime
        this.source?.start(this.audioCtx.currentTime)
      } else this.wallStart = performance.now()
      return
    }
    this.recorder.resume()
    if (this.audioCtx) await this.audioCtx.resume()
    else this.wallStart = performance.now()
  }

  private async pause(): Promise<void> {
    if (this.audioCtx) await this.audioCtx.suspend()
    else {
      this.wallAccum += (performance.now() - this.wallStart) / 1000
      this.wallStart = 0
    }
    if (this.recorder.state === 'recording') this.recorder.pause()
  }

  private async waitUntil(mediaTime: number, signal?: AbortSignal): Promise<void> {
    for (;;) {
      throwIfAborted(signal)
      const left = mediaTime - this.clock()
      if (left <= 0) return
      await new Promise(r => setTimeout(r, Math.max(1, Math.min(left * 1000 - 1, 8))))
    }
  }

  /** Present the buffered frames in real time, 1/fps apart. */
  private async flush(signal?: AbortSignal): Promise<void> {
    if (!this.queue.length) return
    const frames = this.queue
    this.queue = []
    await this.resume()
    try {
      for (const f of frames) {
        await this.waitUntil(this.presented / this.fps, signal)
        this.dctx.drawImage(f, 0, 0)
        this.track.requestFrame?.()
        this.presented++
        f.close?.()
      }
      // The last frame stays up for its full duration.
      await this.waitUntil(this.presented / this.fps, signal)
    } finally {
      frames.forEach(f => f.close?.())
      await this.pause()
    }
  }

  async finish(signal?: AbortSignal): Promise<Blob> {
    await this.flush(signal)
    if (!this.started) throw new Error('nothing was recorded')
    // stop() is valid from the paused state and flushes the last data.
    if (this.recorder.state !== 'inactive') this.recorder.stop()
    await this.stopped
    if (this.failed) throw this.failed
    const type = this.mime.split(';')[0]
    const blob = new Blob(this.chunks, { type })
    this.close()
    return blob
  }

  close(): void {
    this.queue.forEach(f => f.close?.())
    this.queue = []
    try {
      if (this.recorder.state !== 'inactive') this.recorder.stop()
    } catch (err) {
      ignoreError(err, 'recorder already stopped')
    }
    try {
      this.source?.stop()
    } catch (err) {
      ignoreError(err, 'source not started')
    }
    this.stream.getTracks().forEach(t => t.stop())
    this.audioCtx?.close().catch(err => ignoreError(err, 'recorder audio close'))
    this.audioCtx = null
    this.display.width = 0
    this.display.height = 0
  }
}
