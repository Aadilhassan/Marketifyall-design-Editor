/**
 * React bindings for the video engine.
 *
 *  - `VideoProjectProvider` owns the project, its undo/redo stack, asset URL
 *    resolution/probing and the PlaybackController. The scene side
 *    (`<VideoEngine/>`, mounted next to the fabric canvas) attaches a
 *    SceneEngine that receives every clock tick.
 *  - `useVideoProject()` — project + dispatch(cmd) + undo/redo + helpers.
 *  - `usePlayback()`     — play/pause/seek/scrub; re-renders only when play state flips.
 *  - `usePlayhead()`     — current time; subscribe only where the time is shown.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ignoreError, log } from '@/lib/logger'
import {
  Asset,
  Clip,
  Command,
  MAIN_TRACK_ID,
  VideoProject,
  applyCommand,
  clipEnd,
  emptyProject,
  findTrack,
  isElementClip,
  isNoopPatch,
  makeClip,
  projectDuration,
} from './model'
import { PlaybackController, PlaybackState } from './playback'
import { probeMedia, relinkAssetFile, resolveAssetUrl, revokeAllObjectUrls } from './assetStore'
import type { SceneEngine } from './engine'

const HISTORY_LIMIT = 100

export interface VideoProjectApi {
  project: VideoProject
  /** Undoable edit. */
  dispatch: (cmd: Command) => void
  /** Edit that doesn't enter the undo history (migration, probing). */
  dispatchSilently: (cmd: Command) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** Replace the whole project (loading a design); clears history and rewinds. */
  restore: (project: VideoProject | null) => void
  /** Latest project, synchronously (for serialisers and event handlers). */
  getProject: () => VideoProject
  controller: PlaybackController
  /** Playable URL per asset id: string, null = missing on this device, undefined = resolving. */
  assetUrls: Record<string, string | null>
  getAssetUrl: (assetId: string) => string | null | undefined
  missingAssets: Asset[]
  relinkAsset: (assetId: string, file: File) => Promise<void>
  /** Time a canvas element (creates/moves its element clip). */
  setElementTiming: (objectId: string, start: number, duration: number) => void
  elementClip: (objectId: string) => Clip | undefined
  attachEngine: (engine: SceneEngine) => () => void
  getEngine: () => SceneEngine | null
  /** Duration of what's playable on the current page. */
  getDuration: () => number
  /** Live undo/redo availability (refs, not render state) for event handlers. */
  getHistory: () => { canUndo: boolean; canRedo: boolean }
  /**
   * Notified after every undoable edit ('do') and every undo/redo. Used to
   * interleave timeline and canvas undo (see timeline/undoJournal).
   */
  subscribeHistory: (fn: (event: HistoryEvent) => void) => () => void
}

export type HistoryEvent = 'do' | 'undo' | 'redo'

const Ctx = createContext<VideoProjectApi | null>(null)

export const VideoProjectProvider: React.FC = ({ children }) => {
  const [project, setProject] = useState<VideoProject>(emptyProject)
  const projectRef = useRef(project)
  const undoStack = useRef<Command[]>([])
  const redoStack = useRef<Command[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)
  const engineRef = useRef<SceneEngine | null>(null)
  const [assetUrls, setAssetUrls] = useState<Record<string, string | null>>({})
  const assetUrlsRef = useRef(assetUrls)
  assetUrlsRef.current = assetUrls

  const historyListeners = useRef(new Set<(e: HistoryEvent) => void>())
  const emitHistory = useCallback((e: HistoryEvent) => {
    historyListeners.current.forEach(fn => {
      try {
        fn(e)
      } catch (err) {
        log.warn('video', 'history listener failed', err)
      }
    })
  }, [])
  const subscribeHistory = useCallback((fn: (e: HistoryEvent) => void) => {
    historyListeners.current.add(fn)
    return () => {
      historyListeners.current.delete(fn)
    }
  }, [])
  const getHistory = useCallback(() => ({ canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 }), [])

  const resolving = useRef(new Map<string, string>())
  const probed = useRef(new Set<string>())

  const commit = useCallback((next: VideoProject) => {
    projectRef.current = next
    setProject(next)
  }, [])

  const getDuration = useCallback(() => {
    const e = engineRef.current
    return e ? e.duration(projectRef.current) : projectDuration(projectRef.current)
  }, [])

  const controllerRef = useRef<PlaybackController | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = new PlaybackController({
      getDuration,
      onTick: (t, state, cause) => engineRef.current?.render(t, state, cause),
      mediaClock: () => engineRef.current?.media.clock() ?? null,
    })
  }
  const controller = controllerRef.current

  const dispatchInternal = useCallback(
    (cmd: Command, undoable: boolean) => {
      const { project: next, inverse } = applyCommand(projectRef.current, cmd)
      if (next === projectRef.current || isNoopPatch(inverse)) return
      commit(next)
      if (undoable) {
        undoStack.current.push(inverse)
        if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
        redoStack.current = []
        setHistoryVersion(v => v + 1)
        emitHistory('do')
      }
    },
    [commit, emitHistory],
  )

  const dispatch = useCallback((cmd: Command) => dispatchInternal(cmd, true), [dispatchInternal])
  const dispatchSilently = useCallback((cmd: Command) => dispatchInternal(cmd, false), [dispatchInternal])

  const undo = useCallback(() => {
    const inv = undoStack.current.pop()
    if (!inv) return
    const { project: next, inverse } = applyCommand(projectRef.current, inv)
    commit(next)
    redoStack.current.push(inverse)
    setHistoryVersion(v => v + 1)
    emitHistory('undo')
  }, [commit, emitHistory])

  const redo = useCallback(() => {
    const cmd = redoStack.current.pop()
    if (!cmd) return
    const { project: next, inverse } = applyCommand(projectRef.current, cmd)
    commit(next)
    undoStack.current.push(inverse)
    setHistoryVersion(v => v + 1)
    emitHistory('redo')
  }, [commit, emitHistory])

  const restore = useCallback(
    (p: VideoProject | null) => {
      controller.pause()
      // A different design: drop the previous one's object URLs and probe state.
      revokeAllObjectUrls()
      resolving.current.clear()
      probed.current.clear()
      assetUrlsRef.current = {}
      setAssetUrls({})
      commit(p || emptyProject())
      undoStack.current = []
      redoStack.current = []
      setHistoryVersion(v => v + 1)
      controller.seek(0)
    },
    [commit, controller],
  )

  const getProject = useCallback(() => projectRef.current, [])

  // ---- asset URLs -------------------------------------------------------
  useEffect(() => {
    project.assets.forEach(a => {
      const sig = JSON.stringify(a.src)
      if (resolving.current.get(a.id) === sig) return
      resolving.current.set(a.id, sig)
      resolveAssetUrl(a)
        .then(url => {
          if (resolving.current.get(a.id) !== sig) return // superseded (relinked)
          setAssetUrls(prev => (prev[a.id] === url ? prev : { ...prev, [a.id]: url }))
          if (!url) log.warn('video', `media missing on this device: ${a.name}`)
        })
        .catch(err => {
          log.warn('video', 'could not resolve media', err)
          setAssetUrls(prev => ({ ...prev, [a.id]: null }))
        })
    })
  }, [project.assets])

  // ---- probe untrusted durations ----------------------------------------
  useEffect(() => {
    project.assets.forEach(a => {
      const url = assetUrls[a.id]
      if (!a.needsProbe || !url || probed.current.has(a.id) || (a.kind !== 'video' && a.kind !== 'audio')) return
      probed.current.add(a.id)
      probeMedia(url, a.kind)
        .then(info => {
          if (!(info.duration > 0)) return
          const p = projectRef.current
          const cmds: Command[] = [
            { type: 'updateAsset', assetId: a.id, patch: { duration: info.duration, width: info.width, height: info.height, needsProbe: false } },
          ]
          // Clips that claimed more media than exists stop at the real end.
          p.clips
            .filter(c => c.assetId === a.id && c.outPoint > info.duration + 1e-3)
            .forEach(c => {
              const end = c.start + (Math.max(c.inPoint + 1 / p.fps, info.duration) - c.inPoint) / c.speed
              cmds.push({ type: 'trimClip', clipId: c.id, edge: 'end', time: end, ripple: findTrack(p, c.trackId)?.kind === 'video' })
            })
          dispatchSilently({ type: 'batch', commands: cmds })
        })
        .catch(err => ignoreError(err, 'probe failed — keeping the saved duration'))
    })
  }, [project.assets, assetUrls, dispatchSilently])

  const getAssetUrl = useCallback((assetId: string) => assetUrlsRef.current[assetId], [])

  const missingAssets = useMemo(() => project.assets.filter(a => assetUrls[a.id] === null), [project.assets, assetUrls])

  const relinkAsset = useCallback(
    async (assetId: string, file: File) => {
      const asset = projectRef.current.assets.find(a => a.id === assetId)
      if (!asset) return
      const patch = await relinkAssetFile(asset, file)
      resolving.current.delete(assetId)
      probed.current.delete(assetId)
      dispatch({ type: 'updateAsset', assetId, patch })
    },
    [dispatch],
  )

  // ---- elements -----------------------------------------------------------
  const elementClip = useCallback((objectId: string) => {
    let best: Clip | undefined
    for (const c of projectRef.current.clips) if (c.objectId === objectId && isElementClip(c) && (!best || c.start < best.start)) best = c
    return best
  }, [])

  const setElementTiming = useCallback(
    (objectId: string, start: number, duration: number) => {
      const existing = elementClip(objectId)
      const clip = makeClip({
        ...(existing || {}),
        id: existing?.id || `el-${objectId}`,
        trackId: existing?.trackId || '',
        objectId,
        start: Math.max(0, start),
        inPoint: 0,
        outPoint: Math.max(1 / projectRef.current.fps, duration) * (existing?.speed || 1),
      })
      dispatch({ type: 'placeElement', clip, preferTrackId: existing?.trackId })
    },
    [dispatch, elementClip],
  )

  // ---- engine -------------------------------------------------------------
  const attachEngine = useCallback(
    (engine: SceneEngine) => {
      engineRef.current = engine
      engine.sync()
      return () => {
        if (engineRef.current === engine) {
          controller.pause()
          engineRef.current = null
        }
      }
    },
    [controller],
  )
  const getEngine = useCallback(() => engineRef.current, [])

  // Any project/media change re-syncs the scene (bindings, mirrored timing) and redraws.
  useEffect(() => {
    engineRef.current?.sync()
  }, [project, assetUrls])

  useEffect(
    () => () => {
      controller.dispose()
      revokeAllObjectUrls()
    },
    [controller],
  )

  const canUndo = undoStack.current.length > 0
  const canRedo = redoStack.current.length > 0

  const api = useMemo<VideoProjectApi>(
    () => ({
      project,
      dispatch,
      dispatchSilently,
      undo,
      redo,
      canUndo,
      canRedo,
      restore,
      getProject,
      controller,
      assetUrls,
      getAssetUrl,
      missingAssets,
      relinkAsset,
      setElementTiming,
      elementClip,
      attachEngine,
      getEngine,
      getDuration,
      getHistory,
      subscribeHistory,
    }),
    // historyVersion drives canUndo/canRedo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, assetUrls, missingAssets, historyVersion],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useVideoProject(): VideoProjectApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useVideoProject must be used inside <VideoProjectProvider>')
  return api
}

/** Same, but null outside the provider (shared hooks used by several shells). */
export function useVideoProjectOptional(): VideoProjectApi | null {
  return useContext(Ctx)
}

export interface PlaybackApi {
  playing: boolean
  scrubbing: boolean
  /** 1 playing, 0 stopped, other = J/K/L shuttle rate. */
  rate: number
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (t: number) => void
  scrub: (t: number) => void
  endScrub: () => void
  shuttle: (rate: number) => void
}

/** Transport controls; re-renders only when play/scrub state changes. */
export function usePlayback(): PlaybackApi {
  const { controller } = useVideoProject()
  const [flags, setFlags] = useState(() => ({ playing: controller.playing, scrubbing: controller.state.scrubbing, rate: controller.rate }))
  useEffect(
    () =>
      controller.subscribe((s: PlaybackState) => {
        const rate = controller.rate
        setFlags(prev =>
          prev.playing === s.playing && prev.scrubbing === s.scrubbing && prev.rate === rate ? prev : { playing: s.playing, scrubbing: s.scrubbing, rate },
        )
      }),
    [controller],
  )
  return useMemo(
    () => ({
      ...flags,
      play: () => controller.play(),
      pause: () => controller.pause(),
      toggle: () => controller.toggle(),
      seek: (t: number) => controller.seek(t),
      scrub: (t: number) => controller.scrub(t),
      endScrub: () => controller.endScrub(),
      shuttle: (rate: number) => controller.shuttle(rate),
    }),
    [flags, controller],
  )
}

/** Current playhead time; the component re-renders on every tick. */
export function usePlayhead(): number {
  const { controller } = useVideoProject()
  const [time, setTime] = useState(controller.time)
  useEffect(() => controller.subscribe(s => setTime(s.time)), [controller])
  return time
}

/** Media that isn't available on this device, with a relink action. */
export function useMissingMedia(): { missing: Asset[]; relink: (assetId: string, file: File) => Promise<void> } {
  const { missingAssets, relinkAsset } = useVideoProject()
  return { missing: missingAssets, relink: relinkAsset }
}

/** Where the next main-track clip goes (end of the main track). */
export function mainTrackEnd(p: VideoProject): number {
  return p.clips.filter(c => c.trackId === MAIN_TRACK_ID).reduce((m, c) => Math.max(m, clipEnd(c)), 0)
}
