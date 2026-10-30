/**
 * The scene an export renders from.
 *
 * Snapshot (preferred): the current page is serialised (authored state — the
 * engine wraps `toJSON`) and loaded into an off-screen `fabric.StaticCanvas`
 * with its own MediaManager, so every video gets a private <video> element.
 * The editor's canvas, viewport, selection and media are never touched, and
 * the user can keep editing: the export renders what the page looked like
 * when it started.
 *
 * Live (fallback, if the page can't be cloned): renders the editor canvas
 * itself through the same functions; the caller must block editing until it
 * finishes, and `dispose` puts every object back to its authored state.
 *
 * Both go through render.ts → evaluateTimeline + applyFrame, exactly what
 * preview runs, so the exported frame is the previewed frame.
 */
import { fabric } from 'fabric'
import { log, ignoreError } from '@/lib/logger'
import { hasActiveAnimation } from '@/utils/animation/engine'
import { CanvasEntry, collectObjects, forgetObject, legacyWindow, pageRect, restoreAuthored } from '../apply'
import { objectWindow } from '../evaluate'
import { MediaManager } from '../media'
import { VideoProject, findAsset, projectDuration } from '../model'
import { FrameBox, isBrokenMedia, prepareFrameReport, renderSceneToContext } from '../render'
import { FrameScene, PreparedFrame, throwIfAborted } from './frames'

type AnyObj = any

/** Props the applier writes per frame; snapshot objects get them reset to authored before each frame. */
const FRAME_PROPS = ['left', 'top', 'scaleX', 'scaleY', 'angle', 'opacity', 'clipPath'] as const
const TEXT_TYPES = ['textbox', 'text', 'i-text', 'StaticText', 'DynamicText']
const SERIALISED_PROPS = ['id', 'name', 'metadata']
const CLONE_TIMEOUT = 20000
const MEDIA_TIMEOUT = 15000

export interface SceneSource {
  /** The editor's fabric canvas. */
  canvas: AnyObj
  project: VideoProject
  assetUrl: (assetId: string) => string | null | undefined
  /** The live engine (videoFor, entries) — used by the live fallback. */
  engine?: { entries(project?: VideoProject): CanvasEntry[]; videoFor(id: string): HTMLVideoElement | null } | null
}

export interface ExportScene extends FrameScene {
  mode: 'snapshot' | 'live'
  page: FrameBox
  /** Playable length of this page (clips + animation windows), seconds. */
  duration: number
  /** Things the user should know about (missing/unloadable media). */
  warnings: string[]
  /** Canvas objects of the exported page in layer order. */
  objects: CanvasEntry[]
  dispose(): void
}

/** Same rule as SceneEngine.duration: clips whose objects are here + animation windows. */
export function sceneDuration(project: VideoProject, entries: CanvasEntry[]): number {
  let end = projectDuration(project, new Set(entries.map(e => e.id)))
  for (const e of entries) {
    if (!hasActiveAnimation(e.obj?.metadata?.anim)) continue
    const w = objectWindow(project, e.id, legacyWindow(e.obj))
    end = Math.max(end, w.start + w.duration)
  }
  return end
}

class FabricScene implements ExportScene {
  readonly mode: 'snapshot' | 'live'
  readonly page: FrameBox
  readonly duration: number
  readonly warnings: string[]
  private canvas: AnyObj
  private keepAlive: AnyObj
  private project: VideoProject
  private entries: CanvasEntry[]
  private videoFor: (id: string) => HTMLVideoElement | null
  private background: string | undefined
  private authored: Map<AnyObj, Record<string, any>> | null
  private lastGood = new Map<string, HTMLCanvasElement>()
  private byId: Map<string, AnyObj>
  private onDispose: () => void

  get objects(): CanvasEntry[] {
    return this.entries
  }

  constructor(opts: {
    mode: 'snapshot' | 'live'
    canvas: AnyObj
    keepAlive?: AnyObj
    project: VideoProject
    entries: CanvasEntry[]
    videoFor: (id: string) => HTMLVideoElement | null
    background?: string
    warnings: string[]
    onDispose: () => void
  }) {
    this.mode = opts.mode
    this.canvas = opts.canvas
    this.keepAlive = opts.keepAlive
    this.project = opts.project
    this.entries = opts.entries
    this.videoFor = opts.videoFor
    this.background = opts.background
    this.warnings = opts.warnings
    this.onDispose = opts.onDispose
    this.page = pageRect(opts.canvas)
    this.duration = sceneDuration(opts.project, opts.entries)
    this.byId = new Map(opts.entries.map(e => [e.id, e.obj]))
    this.authored = opts.mode === 'snapshot' ? captureAuthored(opts.entries) : null
  }

  async prepare(t: number, timeoutMs: number): Promise<PreparedFrame> {
    // The live engine's applier forgets objects that aren't on the editor
    // canvas; start each snapshot frame from the authored pose so a lost base
    // can never be re-captured from a mid-animation frame.
    if (this.authored) this.resetAuthored()
    const r = await prepareFrameReport(this.project, t, this.entries, {
      canvas: this.canvas,
      keepAlive: this.keepAlive,
      videoFor: this.videoFor,
      timeoutMs,
    })
    return { dip: r.frame.dip, videos: r.videos, late: r.late }
  }

  holdLastGood(ids: string[]): () => void {
    const undo: Array<() => void> = []
    ids.forEach(id => {
      const obj = this.byId.get(id)
      const keep = this.lastGood.get(id)
      if (!obj || !keep || obj._element === keep) return
      const prev = obj._element
      obj._element = keep
      undo.push(() => {
        obj._element = prev
      })
    })
    return () => undo.forEach(fn => fn())
  }

  keepGood(ids: string[]): void {
    ids.forEach(id => {
      const obj = this.byId.get(id)
      const el = this.videoFor(id)
      // Only a video the object actually draws (not the poster/held frame of an unconverted binding).
      if (!obj || !el || obj._element !== el || el.readyState < 2 || !el.videoWidth) return
      let c = this.lastGood.get(id)
      if (!c) {
        c = document.createElement('canvas')
        this.lastGood.set(id, c)
      }
      if (c.width !== el.videoWidth || c.height !== el.videoHeight) {
        c.width = el.videoWidth
        c.height = el.videoHeight
      }
      try {
        c.getContext('2d')?.drawImage(el, 0, 0)
      } catch (err) {
        ignoreError(err, 'last-good frame copy (keeps the previous one)')
      }
    })
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, dip: number): void {
    if (this.background) {
      // Fill the whole output: even-size rounding can leave a sub-pixel edge outside the page box.
      ctx.fillStyle = this.background
      ctx.fillRect(0, 0, width, height)
    }
    renderSceneToContext(this.canvas, ctx, this.page, width / Math.max(1, this.page.width), { dip, background: this.background })
  }

  private resetAuthored(): void {
    this.authored?.forEach((props, obj) => {
      try {
        forgetObject(obj)
        const patch: Record<string, any> = {}
        Object.keys(props).forEach(k => {
          if (obj[k] !== props[k]) patch[k] = props[k]
        })
        if (Object.keys(patch).length) {
          obj.set(patch)
          obj.setCoords?.()
        }
      } catch (err) {
        ignoreError(err, 'snapshot object reset')
      }
    })
  }

  dispose(): void {
    this.lastGood.forEach(c => {
      c.width = 0
      c.height = 0
    })
    this.lastGood.clear()
    try {
      this.onDispose()
    } catch (err) {
      log.warn('export', 'export scene cleanup failed', err)
    }
  }
}

function captureAuthored(entries: CanvasEntry[]): Map<AnyObj, Record<string, any>> {
  const out = new Map<AnyObj, Record<string, any>>()
  entries.forEach(({ obj }) => {
    const props: Record<string, any> = {}
    FRAME_PROPS.forEach(k => {
      props[k] = obj[k]
    })
    if (TEXT_TYPES.includes(obj.type) || /text/i.test(obj.type || '')) props.text = obj.text
    out.set(obj, props)
  })
  return out
}

function waitForVideoData(el: HTMLVideoElement, timeoutMs: number, signal?: AbortSignal): Promise<void> {
  if (el.readyState >= 2 || isBrokenMedia(el)) return Promise.resolve()
  return new Promise(resolve => {
    const done = () => {
      window.clearTimeout(timer)
      el.removeEventListener('loadeddata', done)
      el.removeEventListener('error', done)
      signal?.removeEventListener('abort', done)
      resolve()
    }
    const timer = window.setTimeout(done, timeoutMs)
    el.addEventListener('loadeddata', done)
    el.addEventListener('error', done)
    signal?.addEventListener('abort', done)
  })
}

function cloneCanvas(live: AnyObj, timeoutMs: number): Promise<AnyObj> {
  const json = live.toJSON(SERIALISED_PROPS)
  const expected = (json?.objects || []).length
  const sc = new (fabric as AnyObj).StaticCanvas(null, {
    width: live.getWidth?.() || live.width || 1,
    height: live.getHeight?.() || live.height || 1,
    renderOnAddRemove: false,
    enableRetinaScaling: false,
    skipOffscreen: false,
  })
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      disposeStatic(sc)
      reject(new Error('page copy timed out'))
    }, timeoutMs)
    try {
      sc.loadFromJSON(json, () => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        const got = sc.getObjects().filter(Boolean).length
        if (got < expected) {
          disposeStatic(sc)
          reject(new Error(`page copy lost ${expected - got} element(s)`))
          return
        }
        resolve(sc)
      })
    } catch (err) {
      settled = true
      window.clearTimeout(timer)
      disposeStatic(sc)
      reject(err)
    }
  })
}

function disposeStatic(sc: AnyObj): void {
  try {
    sc.getObjects?.().forEach((o: AnyObj) => o && forgetObject(o))
    sc.dispose?.()
  } catch (err) {
    ignoreError(err, 'static export canvas dispose')
  }
}

function mediaWarnings(project: VideoProject, entries: CanvasEntry[], assetUrl: SceneSource['assetUrl'], videoFor: (id: string) => HTMLVideoElement | null): string[] {
  const out: string[] = []
  const present = new Set(entries.map(e => e.id))
  const seen = new Set<string>()
  for (const c of project.clips) {
    const a = findAsset(project, c.assetId)
    if (!a || a.kind === 'image' || seen.has(a.id)) continue
    if (c.objectId && !present.has(c.objectId)) continue
    seen.add(a.id)
    if (assetUrl(a.id) === null) {
      out.push(`"${a.name}" is missing on this device — relink it to include it.`)
      continue
    }
    if (a.kind === 'video' && c.objectId) {
      const el = videoFor(c.objectId)
      if (el && (isBrokenMedia(el) || el.readyState < 2 || !el.getAttribute?.('src'))) out.push(`"${a.name}" couldn't be loaded — its still image is used instead.`)
    }
  }
  return out
}

/** Off-screen copy of the current page with its own media elements. */
export async function createSnapshotScene(src: SceneSource, opts: { background?: string; signal?: AbortSignal } = {}): Promise<ExportScene> {
  const sc = await cloneCanvas(src.canvas, CLONE_TIMEOUT)
  const media = new MediaManager({ assetUrl: src.assetUrl, onRender: () => undefined, fps: src.project.fps })
  const cleanup = () => {
    media.dispose()
    disposeStatic(sc)
  }
  try {
    throwIfAborted(opts.signal)
    const entries = collectObjects(sc, src.project)
    media.reconcile(src.project, entries)
    const bindings = Array.from(media.videoBindings().entries())
    await Promise.all(bindings.map(([, b]) => waitForVideoData(b.video, MEDIA_TIMEOUT, opts.signal)))
    throwIfAborted(opts.signal)
    // A video that still has no frame stays on its still image for the whole
    // export: stop it loading so it can't swap geometry mid-export, and never wait on it.
    const dead = new Set<string>()
    bindings.forEach(([id, b]) => {
      if (b.video.readyState >= 2 && !isBrokenMedia(b.video)) return
      dead.add(id)
      try {
        b.video.removeAttribute('src')
        b.video.load()
      } catch (err) {
        ignoreError(err, 'stop loading an unusable export video')
      }
    })
    const videoFor = (id: string) => (dead.has(id) ? null : media.videoFor(id))
    if (!(pageRect(sc).width > 0)) throw new Error('page copy has no size')
    return new FabricScene({
      mode: 'snapshot',
      canvas: sc,
      keepAlive: src.canvas,
      project: src.project,
      entries,
      videoFor,
      background: opts.background,
      warnings: mediaWarnings(src.project, entries, src.assetUrl, id => media.videoFor(id)),
      onDispose: cleanup,
    })
  } catch (err) {
    cleanup()
    throw err
  }
}

/** Renders the editor canvas itself. The caller blocks editing while it's in use. */
export function createLiveScene(src: SceneSource, opts: { background?: string } = {}): ExportScene {
  const entries = src.engine ? src.engine.entries(src.project) : collectObjects(src.canvas, src.project)
  const videoFor = (id: string) => src.engine?.videoFor(id) || null
  return new FabricScene({
    mode: 'live',
    canvas: src.canvas,
    project: src.project,
    entries,
    videoFor,
    background: opts.background,
    warnings: mediaWarnings(src.project, entries, src.assetUrl, videoFor),
    onDispose: () => restoreAuthored(src.canvas),
  })
}

/** Snapshot if the page can be copied, else the live canvas. */
export async function createExportScene(
  src: SceneSource,
  opts: { background?: string; signal?: AbortSignal; allowLive?: boolean } = {},
): Promise<ExportScene> {
  try {
    return await createSnapshotScene(src, opts)
  } catch (err) {
    throwIfAborted(opts.signal)
    if (opts.allowLive === false) throw err
    log.warn('export', 'could not copy the page for export — rendering the editor canvas instead', err)
    return createLiveScene(src, opts)
  }
}
