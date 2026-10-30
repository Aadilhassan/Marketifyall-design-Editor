/**
 * Video export — entry point used by the export dialog.
 *
 *   capabilities()  what this browser can produce (MP4 via WebCodecs or
 *                   MediaRecorder, WebM, AAC/Opus) and which resolutions work
 *   runExport()     pause the live clock → build the export scene (off-screen
 *                   snapshot of the page, or the live canvas as a fallback) →
 *                   mix audio offline → deterministic frame loop → encoder →
 *                   restore the playhead
 *
 * Paths:
 *   MP4   WebCodecs H.264 + AAC (Opus if no AAC encoder) → mp4-muxer
 *         no WebCodecs: MediaRecorder MP4 if the browser records it
 *         neither: ExportUnsupportedError('mp4-unavailable') → offer WebM
 *   WebM  MediaRecorder fed by the frame loop (real-time pacing)
 *   GIF   frame loop → global palette → gifenc
 *   Audio M4A (AAC via AudioEncoder + mp4-muxer) or WAV
 */
import { CanvasEntry, collectObjects, pageRect } from '../apply'
import { VideoProject } from '../model'
import { bufferChannels, encodeWav, EXPORT_CHANNELS, EXPORT_SAMPLE_RATE, mixAudio, planAudio } from './audio'
import { Mp4Writer, RealtimeRecorder, hasAudioEncoder, hasWebCodecs, pickAudioCodec, pickVideoCodec, recorderMime } from './encode'
import { FrameStats, PausableClock, renderFrames, throwIfAborted, withPausedClock } from './frames'
import { writeGif } from './gif'
import { ExportScene, SceneSource, createExportScene, sceneDuration } from './scene'
import {
  ExportFormat,
  QualityId,
  RESOLUTIONS,
  ResolutionId,
  Size,
  TimeRange,
  audioBitrate,
  clampRange,
  gifFps,
  gifSize,
  outputSize,
  videoBitrate,
} from './settings'

export * from './settings'
export { isAbort, ExportAbortedError } from './frames'
export type { ExportScene } from './scene'

export interface ExportEnv {
  canvas: any
  project: VideoProject
  assetUrl: (assetId: string) => string | null | undefined
  engine?: SceneSource['engine']
  clock?: PausableClock | null
}

export interface ExportRequest {
  format: ExportFormat
  resolution: ResolutionId
  fps: number
  quality: QualityId
  /** Null/undefined = the whole video. */
  range?: TimeRange | null
}

export type ExportPhase = 'preparing' | 'audio' | 'palette' | 'frames' | 'finalizing'

export interface ExportProgress {
  phase: ExportPhase
  done: number
  total: number
  /** The output canvas right after a frame was drawn (for a thumbnail). */
  preview?: HTMLCanvasElement
}

export interface ExportResult {
  blob: Blob
  ext: 'mp4' | 'webm' | 'gif' | 'm4a' | 'wav'
  warnings: string[]
  mode: 'snapshot' | 'live'
  stats?: FrameStats
  size?: Size
}

export class ExportUnsupportedError extends Error {
  readonly code: 'mp4-unavailable' | 'webm-unavailable'
  readonly suggestion?: ExportFormat
  constructor(code: ExportUnsupportedError['code'], message: string, suggestion?: ExportFormat) {
    super(message)
    this.name = 'ExportUnsupportedError'
    this.code = code
    this.suggestion = suggestion
  }
}

export interface Capabilities {
  /** How MP4 would be produced here, or null if it can't. */
  mp4: 'webcodecs' | 'recorder' | null
  webm: boolean
  /** Audio codec for MP4/M4A (null → MP4 has no sound, audio export is WAV). */
  audioCodec: 'aac' | 'opus' | null
  /** Resolutions MP4 can be encoded at (all true when MP4 goes through MediaRecorder). */
  resolutions: Record<ResolutionId, boolean>
}

const pageSize = (canvas: any): Size => {
  const r = pageRect(canvas)
  return { width: r.width || 1080, height: r.height || 1080 }
}

export async function capabilities(canvas: any, fps: number, quality: QualityId): Promise<Capabilities> {
  const page = pageSize(canvas)
  const resolutions = {} as Record<ResolutionId, boolean>
  let anyWebCodecs = false
  for (const r of RESOLUTIONS) {
    const size = outputSize(page, r.id)
    const ok = hasWebCodecs() ? !!(await pickVideoCodec(size.width, size.height, fps, videoBitrate(size, fps, quality))) : false
    resolutions[r.id] = ok
    anyWebCodecs = anyWebCodecs || ok
  }
  const recMp4 = !!recorderMime('mp4')
  if (!anyWebCodecs && recMp4) RESOLUTIONS.forEach(r => (resolutions[r.id] = true))
  return {
    mp4: anyWebCodecs ? 'webcodecs' : recMp4 ? 'recorder' : null,
    webm: !!recorderMime('webm'),
    audioCodec: await pickAudioCodec(EXPORT_SAMPLE_RATE, EXPORT_CHANNELS, audioBitrate(quality)),
    resolutions,
  }
}

/** Playable length of the page currently on the editor canvas. */
export function currentDuration(canvas: any, project: VideoProject): number {
  return sceneDuration(project, collectObjects(canvas, project))
}

/** Does the page have anything audible? (for the size estimate) */
export function hasAudio(canvas: any, project: VideoProject): boolean {
  const objects = collectObjects(canvas, project)
  const d = sceneDuration(project, objects)
  return d > 0 && planAudio(project, { start: 0, end: d }, objects, 0.25).length > 0
}

export interface RunOptions {
  signal?: AbortSignal
  onProgress?: (p: ExportProgress) => void
  /** Called once the scene exists — `live` means the editor canvas is being rendered: block edits. */
  onScene?: (scene: ExportScene) => void
}

async function mix(env: ExportEnv, range: TimeRange, objects: CanvasEntry[], opts: RunOptions) {
  opts.onProgress?.({ phase: 'audio', done: 0, total: 1 })
  const sources = planAudio(env.project, range, objects)
  const r = await mixAudio(env.project, sources, range.end - range.start, env.assetUrl, opts.signal)
  opts.onProgress?.({ phase: 'audio', done: 1, total: 1 })
  return r
}

async function exportAudioOnly(env: ExportEnv, req: ExportRequest, opts: RunOptions): Promise<ExportResult> {
  const objects = collectObjects(env.canvas, env.project)
  const range = clampRange(req.range, sceneDuration(env.project, objects))
  if (!(range.end > range.start)) throw new Error('Nothing to export — the timeline is empty.')
  const { buffer, warnings } = await mix(env, range, objects, opts)
  if (!buffer) throw new Error('This video has no sound to export.')
  throwIfAborted(opts.signal)
  opts.onProgress?.({ phase: 'finalizing', done: 0, total: 1 })
  const codec = hasAudioEncoder() ? await pickAudioCodec(buffer.sampleRate, buffer.numberOfChannels, audioBitrate(req.quality)) : null
  if (codec === 'aac') {
    const writer = new Mp4Writer({ audio: { codec, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels, bitrate: audioBitrate(req.quality) } })
    try {
      await writer.addAudio(buffer, opts.signal)
      return { blob: await writer.finish(), ext: 'm4a', warnings, mode: 'snapshot' }
    } finally {
      writer.close()
    }
  }
  const wav = encodeWav(bufferChannels(buffer), buffer.sampleRate)
  return { blob: new Blob([wav], { type: 'audio/wav' }), ext: 'wav', warnings, mode: 'snapshot' }
}

type VideoPath = { kind: 'webcodecs'; codec: string } | { kind: 'recorder'; mime: string; container: 'mp4' | 'webm' }

async function chooseVideoPath(req: ExportRequest, size: Size, fps: number): Promise<VideoPath> {
  if (req.format === 'webm') {
    const mime = recorderMime('webm')
    if (!mime) throw new ExportUnsupportedError('webm-unavailable', "This browser can't record WebM. Export MP4 instead.", 'mp4')
    return { kind: 'recorder', mime, container: 'webm' }
  }
  const codec = await pickVideoCodec(size.width, size.height, fps, videoBitrate(size, fps, req.quality))
  if (codec) return { kind: 'webcodecs', codec }
  const mp4 = recorderMime('mp4')
  if (mp4) return { kind: 'recorder', mime: mp4, container: 'mp4' }
  const webm = !!recorderMime('webm')
  throw new ExportUnsupportedError(
    'mp4-unavailable',
    hasWebCodecs()
      ? `This browser can't encode MP4 at ${size.width}×${size.height}.${webm ? ' Try a lower resolution or export WebM.' : ' Try a lower resolution.'}`
      : `This browser can't produce MP4.${webm ? ' Export WebM instead.' : ''}`,
    webm ? 'webm' : undefined,
  )
}

/** Export the current page. Throws ExportAbortedError on cancel, ExportUnsupportedError when the format can't be made here. */
export async function runExport(env: ExportEnv, req: ExportRequest, opts: RunOptions = {}): Promise<ExportResult> {
  if (req.format === 'audio') return exportAudioOnly(env, req, opts)

  const page = pageSize(env.canvas)
  const isGif = req.format === 'gif'
  const fps = isGif ? gifFps(req.fps) : req.fps
  const size = isGif ? gifSize(page) : outputSize(page, req.resolution)
  // Decide the path before touching anything, so "can't do MP4" is immediate.
  const path = isGif ? null : await chooseVideoPath(req, size, fps)

  return withPausedClock(env.clock, async () => {
    opts.onProgress?.({ phase: 'preparing', done: 0, total: 1 })
    const scene = await createExportScene(
      { canvas: env.canvas, project: env.project, assetUrl: env.assetUrl, engine: env.engine },
      { background: '#ffffff', signal: opts.signal },
    )
    try {
      opts.onScene?.(scene)
      const range = clampRange(req.range, scene.duration)
      if (!(range.end > range.start)) throw new Error('Nothing to export — the timeline is empty.')
      const warnings = scene.warnings.slice()
      const frameProgress = (done: number, total: number, preview: HTMLCanvasElement) =>
        opts.onProgress?.({ phase: 'frames', done, total, preview })

      if (isGif) {
        const { blob, stats } = await writeGif(scene, {
          range,
          fps,
          size,
          signal: opts.signal,
          onProgress: (phase, done, total, preview) => opts.onProgress?.({ phase, done, total, preview }),
        })
        return { blob, ext: 'gif', warnings: withHeld(warnings, stats), mode: scene.mode, stats, size }
      }

      const mixed = await mix(env, range, scene.objects, opts)
      warnings.push(...mixed.warnings)
      throwIfAborted(opts.signal)

      if (path && path.kind === 'webcodecs') {
        const audio = mixed.buffer
        const aCodec = audio ? await pickAudioCodec(audio.sampleRate, audio.numberOfChannels, audioBitrate(req.quality)) : null
        if (audio && !aCodec) warnings.push("This browser can't encode sound for MP4, so the video has no sound. Export WebM to keep it.")
        if (aCodec === 'opus') warnings.push('The sound is Opus (this browser has no AAC encoder). A few players, such as QuickTime, may not play it.')
        const writer = new Mp4Writer({
          video: { codec: path.codec, width: size.width, height: size.height, fps, bitrate: videoBitrate(size, fps, req.quality) },
          audio: audio && aCodec ? { codec: aCodec, sampleRate: audio.sampleRate, channels: audio.numberOfChannels, bitrate: audioBitrate(req.quality) } : null,
        })
        try {
          let audioPos = 0
          const feedAudio = async (untilUs: number, last: boolean) => {
            if (!audio || !aCodec) return
            const to = last ? audio.length : Math.min(audio.length, Math.round((untilUs * audio.sampleRate) / 1e6))
            // Interleave in ~0.5 s slices so the file isn't all-audio-then-video.
            if (to - audioPos < audio.sampleRate / 2 && !last) return
            await writer.addAudio(audio, opts.signal, audioPos, to)
            audioPos = to
          }
          const stats = await renderFrames(scene, {
            range,
            fps,
            width: size.width,
            height: size.height,
            signal: opts.signal,
            onFrame: async (c, info) => {
              await writer.addFrame(c, info.index, info.timestampUs, info.durationUs, opts.signal)
              await feedAudio(info.timestampUs + info.durationUs, false)
              frameProgress(info.index + 1, info.count, c)
            },
          })
          await feedAudio(0, true)
          opts.onProgress?.({ phase: 'finalizing', done: 0, total: 1 })
          const blob = await writer.finish()
          return { blob, ext: 'mp4', warnings: withHeld(warnings, stats), mode: scene.mode, stats, size }
        } finally {
          writer.close()
        }
      }

      const rec = path as Extract<VideoPath, { kind: 'recorder' }>
      const recorder = new RealtimeRecorder({
        width: size.width,
        height: size.height,
        fps,
        mime: rec.mime,
        videoBitrate: videoBitrate(size, fps, req.quality),
        audioBitrate: audioBitrate(req.quality),
        audio: mixed.buffer,
      })
      try {
        const stats = await renderFrames(scene, {
          range,
          fps,
          width: size.width,
          height: size.height,
          signal: opts.signal,
          onFrame: async (c, info) => {
            await recorder.push(c, opts.signal)
            frameProgress(info.index + 1, info.count, c)
          },
        })
        opts.onProgress?.({ phase: 'finalizing', done: 0, total: 1 })
        const blob = await recorder.finish(opts.signal)
        return { blob, ext: rec.container, warnings: withHeld(warnings, stats), mode: scene.mode, stats, size }
      } finally {
        recorder.close()
      }
    } finally {
      scene.dispose()
    }
  })
}

function withHeld(warnings: string[], stats: FrameStats): string[] {
  if (!stats.heldFrames) return warnings
  return [
    ...warnings,
    `A video was slow to decode on ${stats.heldFrames} frame${stats.heldFrames > 1 ? 's' : ''}; its previous frame was repeated there.`,
  ]
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser time to start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
