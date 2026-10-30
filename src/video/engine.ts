/**
 * SceneEngine — connects the playback clock to one fabric canvas.
 *
 * Per frame: evaluateTimeline → MediaManager.sync (elements to their media
 * time) → applyFrame (the single writer of object state) → one
 * requestRenderAll. Also keeps element timing mirrored into
 * `metadata.timelineStart/Duration` for code that still reads it (animation
 * authoring, the old exporter) and migrates such legacy windows into clips.
 */
import { ignoreError } from '@/lib/logger'
import { FrameState, evaluateTimeline, objectWindow } from './evaluate'
import { hasActiveAnimation } from '@/utils/animation/engine'
import { applyFrame, collectObjects, CanvasEntry, installDipOverlay, isPageObject, legacyWindow, pageRect, restoreAuthored, setDip, withAuthoredState, writeMetadata } from './apply'
import { MediaManager, SyncMode } from './media'
import { Clip, Command, VideoProject, clipDuration, elementClipsFor, isElementClip, projectDuration } from './model'
import { PlaybackState, TickCause } from './playback'

type AnyObj = any

export interface SceneEngineOptions {
  getProject: () => VideoProject
  assetUrl: (assetId: string) => string | null | undefined
  /** Non-undoable project edits made by the engine itself (legacy migration). */
  dispatchSilently: (cmd: Command) => void
  /** Ask the clock to re-run the current frame. */
  requestRefresh: () => void
}

export class SceneEngine {
  readonly canvas: AnyObj
  readonly media: MediaManager
  private opts: SceneEngineOptions
  private lastFrame: FrameState | null = null
  private lastState: PlaybackState = { time: 0, playing: false, scrubbing: false }
  private renderQueued = 0
  private uninstallDip: () => void
  private mirrored = new Map<string, string>()
  private ownToJSON: boolean

  constructor(canvas: AnyObj, opts: SceneEngineOptions) {
    this.canvas = canvas
    this.opts = opts
    this.media = new MediaManager({ assetUrl: opts.assetUrl, onRender: () => this.queueRender() })
    this.uninstallDip = installDipOverlay(canvas)
    // Every serialisation (scenify's undo history snapshots, exportToJSON) sees
    // authored values — never a hidden or mid-animation playback frame.
    this.ownToJSON = Object.prototype.hasOwnProperty.call(canvas, 'toJSON')
    const original = canvas.toJSON
    canvas.toJSON = function (...args: any[]) {
      return withAuthoredState(() => original.apply(this, args))
    }
    this.restoreToJSON = () => {
      if (this.ownToJSON) canvas.toJSON = original
      else delete canvas.toJSON
    }
  }

  private restoreToJSON: () => void

  entries(project = this.opts.getProject()): CanvasEntry[] {
    return collectObjects(this.canvas, project)
  }

  /**
   * Playable length on this page: clips whose objects are here, plus the
   * animation window of animated elements that have no clip yet.
   */
  duration(project = this.opts.getProject()): number {
    const entries = this.entries(project)
    let end = projectDuration(project, new Set(entries.map(e => e.id)))
    for (const e of entries) {
      if (!hasActiveAnimation(e.obj.metadata?.anim)) continue
      const w = objectWindow(project, e.id, legacyWindow(e.obj))
      end = Math.max(end, w.start + w.duration)
    }
    return end
  }

  /** The playback sink. */
  render(time: number, state: PlaybackState, cause: TickCause): void {
    this.lastState = state
    const project = this.opts.getProject()
    const entries = this.entries(project)
    const frame = evaluateTimeline(project, time, entries)
    this.lastFrame = frame
    const mode: SyncMode = state.playing ? 'play' : state.scrubbing ? 'scrub' : 'pause'
    try {
      if (cause !== 'tick') this.media.reconcile(project, entries)
      this.media.sync(project, frame, mode)
    } catch (err) {
      ignoreError(err, 'media sync must not stop the frame')
    }
    applyFrame(entries, frame, { project, playing: state.playing, page: pageRect(this.canvas) }, this.canvas)
    setDip(this.canvas, frame.dip)
    this.canvas.requestRenderAll?.()
  }

  get frame(): FrameState | null {
    return this.lastFrame
  }

  get state(): PlaybackState {
    return this.lastState
  }

  private queueRender(): void {
    if (this.renderQueued) return
    this.renderQueued = requestAnimationFrame(() => {
      this.renderQueued = 0
      this.canvas.requestRenderAll?.()
    })
  }

  /** Objects were added/removed/edited, or the project changed. */
  sync(): void {
    const project = this.opts.getProject()
    const entries = this.entries(project)
    this.migrateLegacyWindows(project, entries)
    this.mirrorElementTiming(this.opts.getProject(), entries)
    this.media.reconcile(this.opts.getProject(), entries)
    this.opts.requestRefresh()
  }

  /** Objects carrying an old `metadata.timelineDuration` window but no clip get one. */
  private migrateLegacyWindows(project: VideoProject, entries: CanvasEntry[]): void {
    const clips = elementClipsFor(project, entries)
    if (!clips.length) return
    this.opts.dispatchSilently({ type: 'batch', commands: clips.map(clip => ({ type: 'placeElement' as const, clip })) })
  }

  /** Keep `metadata.timelineStart/Duration` equal to each element's clip (or absent). */
  private mirrorElementTiming(project: VideoProject, entries: CanvasEntry[]): void {
    const byObject = new Map<string, Clip>()
    for (const c of project.clips) {
      if (!isElementClip(c)) continue
      const cur = byObject.get(c.objectId as string)
      if (!cur || c.start < cur.start) byObject.set(c.objectId as string, c)
    }
    for (const e of entries) {
      const c = byObject.get(e.id)
      const md = e.obj.metadata || {}
      if (c) {
        const start = c.start
        const duration = clipDuration(c)
        const sig = `${start}:${duration}`
        if (md.timelineStart !== start || md.timelineDuration !== duration) writeMetadata(e.obj, { timelineStart: start, timelineDuration: duration })
        this.mirrored.set(e.id, sig)
      } else if (this.mirrored.has(e.id)) {
        // Its clip was removed (delete / undo): the element is untimed again.
        this.mirrored.delete(e.id)
        if (typeof md.timelineDuration === 'number') writeMetadata(e.obj, { timelineDuration: undefined })
      }
    }
  }

  videoFor(objectId: string): HTMLVideoElement | null {
    return this.media.videoFor(objectId)
  }

  dispose(): void {
    if (this.renderQueued) cancelAnimationFrame(this.renderQueued)
    this.media.dispose()
    this.uninstallDip()
    this.restoreToJSON()
    restoreAuthored(this.canvas)
  }
}

export { isPageObject, writeMetadata }
