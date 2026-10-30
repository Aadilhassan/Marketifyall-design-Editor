/**
 * Compatibility layer: the pre-v1 `useVideoContext()` API (flat `clips` /
 * `audioClips` lists, addClip/updateClip…, play/pause/seek) implemented on
 * top of the video project model (src/video). Existing panels, the export
 * modal and the current timeline UI keep working while new code uses
 * `useVideoProject()` / `usePlayback()` / `usePlayhead()` directly.
 *
 * Every mutation becomes an undoable project command; playback goes to the
 * single PlaybackController.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { VideoProjectProvider, mainTrackEnd, useVideoProject } from '@/video/VideoProjectContext'
import {
  Asset,
  AssetSource,
  Clip,
  Command,
  MAIN_TRACK_ID,
  VideoProject,
  clipDuration,
  clipEnd,
  findAsset,
  findClip,
  fromLegacy,
  makeClip,
  makeId,
} from '@/video/model'

/** @deprecated no longer populated — the timeline derives element rows from the canvas. */
export type TimelineLayer = {
  id: string
  name: string
  type: 'video' | 'text' | 'image' | 'shape' | 'audio'
  start: number
  duration: number
  color: string
  metadata?: any
}

export type VideoClip = {
  id: string
  name: string
  /** Playable URL ('' while resolving or when the media is missing). */
  src: string
  duration: number
  start: number
  end: number
  poster?: string
  /** Canvas object showing this clip (defaults to `id`, matched against obj.id or metadata.id). */
  objectId?: string
  assetId?: string
  /** Describe the media when adding: an IndexedDB upload or a URL with a probed duration. */
  asset?: Partial<Asset> & { src?: AssetSource }
  /** The media isn't available on this device (relink needed). */
  missing?: boolean
}

export type AudioClip = {
  id: string
  name: string
  src: string
  duration: number
  start: number
  volume: number
  assetId?: string
  asset?: Partial<Asset> & { src?: AssetSource }
  missing?: boolean
}

type VideoContextValue = {
  clips: VideoClip[]
  audioClips: AudioClip[]
  layers: TimelineLayer[]
  activeClipId: string | null
  selectedClipIds: string[]
  isTimelineOpen: boolean
  setTimelineOpen: (open: boolean) => void
  addClip: (clip: VideoClip) => void
  removeClip: (id: string) => void
  setActiveClip: (id: string | null) => void
  updateClip: (id: string, patch: Partial<VideoClip>) => void
  reorderClips: (newOrder: VideoClip[]) => void
  addAudioClip: (clip: AudioClip) => void
  removeAudioClip: (id: string) => void
  updateAudioClip: (id: string, patch: Partial<AudioClip>) => void
  addLayer: (layer: TimelineLayer) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, patch: Partial<TimelineLayer>) => void
  selectClip: (id: string, addToSelection?: boolean) => void
  clearSelection: () => void
  /** Replace the project from a pre-v1 save (reopens the timeline). */
  restoreState: (clips: VideoClip[], audioClips?: AudioClip[]) => void
  isPlaying: boolean
  setCurrentTime: (time: number) => void
  play: () => void
  pause: () => void
  togglePlayback: () => void
  seek: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  /** @deprecated videos are owned by the engine; kept as a no-op. */
  registerVideoRef: (id: string, ref: HTMLVideoElement | null) => void
  /** The live <video> behind a clip's canvas object (null when not on this page). */
  getVideoRef: (id: string) => HTMLVideoElement | null
}

const noop = () => undefined

export const VideoContext = createContext<VideoContextValue>({
  clips: [],
  audioClips: [],
  layers: [],
  activeClipId: null,
  selectedClipIds: [],
  isTimelineOpen: false,
  setTimelineOpen: noop,
  addClip: noop,
  removeClip: noop,
  setActiveClip: noop,
  updateClip: noop,
  reorderClips: noop,
  addAudioClip: noop,
  removeAudioClip: noop,
  updateAudioClip: noop,
  addLayer: noop,
  removeLayer: noop,
  updateLayer: noop,
  selectClip: noop,
  clearSelection: noop,
  restoreState: noop,
  isPlaying: false,
  setCurrentTime: noop,
  play: noop,
  pause: noop,
  togglePlayback: noop,
  seek: noop,
  setIsPlaying: noop,
  registerVideoRef: noop,
  getVideoRef: () => null,
})

// The playhead lives in its own context so a 60 fps tick only re-renders the
// components that read it (via usePlaybackTime), not every VideoContext consumer.
export const PlaybackTimeContext = createContext<{ currentTime: number }>({ currentTime: 0 })

/** Flat views of the project in the old shapes. */
export function legacyViews(p: VideoProject, urls: Record<string, string | null>): { clips: VideoClip[]; audioClips: AudioClip[] } {
  const clips: VideoClip[] = []
  const audioClips: AudioClip[] = []
  for (const c of p.clips) {
    const a = findAsset(p, c.assetId)
    if (!a) continue
    const url = urls[a.id]
    const base = { id: c.id, name: c.name || a.name, src: url || '', duration: clipDuration(c), start: c.start, assetId: a.id, missing: url === null }
    if (a.kind === 'video') clips.push({ ...base, end: clipEnd(c), poster: a.poster, objectId: c.objectId })
    else if (a.kind === 'audio') audioClips.push({ ...base, volume: c.volume })
  }
  clips.sort((x, y) => x.start - y.start)
  return { clips, audioClips }
}

function assetFor(kind: 'video' | 'audio', clip: { id: string; name?: string; src: string; duration: number; poster?: string; asset?: VideoClip['asset'] }): Asset {
  const given = clip.asset || {}
  return {
    id: given.id || `asset-${clip.id}`,
    kind,
    name: given.name || clip.name || (kind === 'video' ? 'Video' : 'Audio'),
    duration: given.duration ?? clip.duration,
    src: given.src || { kind: 'url', url: clip.src },
    ...(given.width ? { width: given.width } : {}),
    ...(given.height ? { height: given.height } : {}),
    ...((given.poster || clip.poster) ? { poster: given.poster || clip.poster } : {}),
    // Durations passed without a probed asset are untrusted (API metadata).
    ...(given.needsProbe === false || (given.duration !== undefined && given.src) ? {} : { needsProbe: true }),
  }
}

const CompatProvider: React.FC = ({ children }) => {
  const api = useVideoProject()
  const { project, assetUrls, dispatch, controller } = api
  const [activeClipId, setActiveClip] = useState<string | null>(null)
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([])
  const [isTimelineOpen, setTimelineOpen] = useState(false)
  const [isPlaying, setPlaying] = useState(controller.playing)
  const [currentTime, setCurrentTimeState] = useState(controller.time)

  useEffect(
    () =>
      controller.subscribe(s => {
        setPlaying(s.playing)
        setCurrentTimeState(s.time)
      }),
    [controller],
  )

  const { clips, audioClips } = useMemo(() => legacyViews(project, assetUrls), [project, assetUrls])

  const addClip = useCallback(
    (clip: VideoClip) => {
      const p = api.getProject()
      const asset = clip.assetId && findAsset(p, clip.assetId) ? findAsset(p, clip.assetId)! : assetFor('video', clip)
      const cmds: Command[] = []
      if (!findAsset(p, asset.id)) cmds.push({ type: 'addAsset', asset })
      const duration = Math.min(clip.duration || asset.duration, asset.duration || clip.duration)
      cmds.push({
        type: 'addClip',
        clip: makeClip({
          id: clip.id,
          trackId: MAIN_TRACK_ID,
          assetId: asset.id,
          objectId: clip.objectId || clip.id,
          name: clip.name,
          start: clip.start ?? mainTrackEnd(p),
          inPoint: 0,
          outPoint: duration,
        }),
      })
      dispatch({ type: 'batch', commands: cmds })
      setActiveClip(clip.id)
      setSelectedClipIds([clip.id])
      setTimelineOpen(true)
    },
    [api, dispatch],
  )

  const removeClip = useCallback(
    (id: string) => {
      dispatch({ type: 'removeClip', clipId: id })
      setActiveClip(prev => (prev === id ? null : prev))
      setSelectedClipIds(prev => prev.filter(cid => cid !== id))
    },
    [dispatch],
  )

  /** start/duration edits from the old timeline → move + trim commands (one undo step). */
  const retime = useCallback(
    (id: string, patch: { start?: number; duration?: number }) => {
      const c = findClip(api.getProject(), id)
      if (!c) return
      const cmds: Command[] = []
      const oldEnd = clipEnd(c)
      const start = patch.start ?? c.start
      const duration = patch.duration ?? clipDuration(c)
      if (patch.start !== undefined && patch.duration !== undefined && Math.abs(start + duration - oldEnd) < 1e-6) {
        cmds.push({ type: 'trimClip', clipId: id, edge: 'start', time: start })
      } else {
        if (patch.start !== undefined && Math.abs(start - c.start) > 1e-6) cmds.push({ type: 'moveClip', clipId: id, start })
        if (patch.duration !== undefined && Math.abs(duration - clipDuration(c)) > 1e-6) {
          cmds.push({ type: 'trimClip', clipId: id, edge: 'end', time: start + duration })
        }
      }
      if (cmds.length) dispatch({ type: 'batch', commands: cmds })
    },
    [api, dispatch],
  )

  const updateClip = useCallback(
    (id: string, patch: Partial<VideoClip>) => {
      const dur = patch.duration ?? (patch.end !== undefined && patch.start !== undefined ? patch.end - patch.start : undefined)
      retime(id, { start: patch.start, duration: dur })
      if (patch.name !== undefined) dispatch({ type: 'setClipProps', clipId: id, patch: { name: patch.name } })
    },
    [retime, dispatch],
  )

  const reorderClips = useCallback(
    (newOrder: VideoClip[]) => {
      let t = 0
      const cmds: Command[] = []
      newOrder.forEach(c => {
        const clip = findClip(api.getProject(), c.id)
        if (!clip) return
        cmds.push({ type: 'moveClip', clipId: c.id, start: t })
        t += clipDuration(clip)
      })
      if (cmds.length) dispatch({ type: 'batch', commands: cmds })
    },
    [api, dispatch],
  )

  const addAudioClip = useCallback(
    (clip: AudioClip) => {
      const p = api.getProject()
      const asset = clip.assetId && findAsset(p, clip.assetId) ? findAsset(p, clip.assetId)! : assetFor('audio', clip)
      const cmds: Command[] = []
      if (!findAsset(p, asset.id)) cmds.push({ type: 'addAsset', asset })
      const c = makeClip({
        id: clip.id,
        trackId: '',
        assetId: asset.id,
        name: clip.name,
        start: clip.start || 0,
        inPoint: 0,
        outPoint: Math.min(clip.duration || asset.duration, asset.duration || clip.duration),
        volume: clip.volume ?? 1,
      })
      // First audio track with room at that time, else a new one.
      const free = p.tracks.find(
        t => t.kind === 'audio' && !p.clips.some(o => o.trackId === t.id && o.start < clipEnd(c) && c.start < clipEnd(o)),
      )
      if (free) cmds.push({ type: 'addClip', clip: { ...c, trackId: free.id } })
      else {
        const n = p.tracks.filter(t => t.kind === 'audio').length + 1
        const trackId = makeId('track-audio')
        cmds.push({ type: 'addTrack', track: { id: trackId, kind: 'audio', name: n > 1 ? `Audio ${n}` : 'Audio' } })
        cmds.push({ type: 'addClip', clip: { ...c, trackId } })
      }
      dispatch({ type: 'batch', commands: cmds })
      setSelectedClipIds([clip.id])
      setTimelineOpen(true)
    },
    [api, dispatch],
  )

  const updateAudioClip = useCallback(
    (id: string, patch: Partial<AudioClip>) => {
      if (patch.volume !== undefined) dispatch({ type: 'setClipProps', clipId: id, patch: { volume: patch.volume } })
      if (patch.start !== undefined || patch.duration !== undefined) retime(id, { start: patch.start, duration: patch.duration })
    },
    [dispatch, retime],
  )

  const selectClip = useCallback((id: string, addToSelection = false) => {
    setSelectedClipIds(prev => (addToSelection ? (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) : [id]))
    setActiveClip(id)
  }, [])

  const clearSelection = useCallback(() => setSelectedClipIds([]), [])

  const restoreState = useCallback(
    (restoredClips: VideoClip[] = [], restoredAudio: AudioClip[] = []) => {
      api.restore(fromLegacy(restoredClips as any, restoredAudio as any))
      setActiveClip(restoredClips[0]?.id ?? null)
      setSelectedClipIds([])
      if (restoredClips.length || restoredAudio.length) setTimelineOpen(true)
    },
    [api],
  )

  // Reopen the timeline whenever a design with media is loaded.
  const hasMedia = clips.length > 0 || audioClips.length > 0
  useEffect(() => {
    if (hasMedia) setTimelineOpen(true)
  }, [hasMedia])

  const play = useCallback(() => controller.play(), [controller])
  const pause = useCallback(() => controller.pause(), [controller])
  const togglePlayback = useCallback(() => controller.toggle(), [controller])
  const seek = useCallback((t: number) => controller.seek(t), [controller])
  const setIsPlayingCompat = useCallback((p: boolean) => (p ? controller.play() : controller.pause()), [controller])
  const getVideoRef = useCallback(
    (id: string) => {
      const c = findClip(api.getProject(), id)
      return api.getEngine()?.videoFor(c?.objectId || id) || null
    },
    [api],
  )

  const value = useMemo<VideoContextValue>(
    () => ({
      clips,
      audioClips,
      layers: [],
      activeClipId,
      selectedClipIds,
      isTimelineOpen,
      setTimelineOpen,
      addClip,
      removeClip,
      setActiveClip,
      updateClip,
      reorderClips,
      addAudioClip,
      removeAudioClip: removeClip,
      updateAudioClip,
      addLayer: noop,
      removeLayer: noop,
      updateLayer: noop,
      selectClip,
      clearSelection,
      restoreState,
      isPlaying,
      setCurrentTime: seek,
      play,
      pause,
      togglePlayback,
      seek,
      setIsPlaying: setIsPlayingCompat,
      registerVideoRef: noop,
      getVideoRef,
    }),
    [clips, audioClips, activeClipId, selectedClipIds, isTimelineOpen, addClip, removeClip, updateClip, reorderClips, addAudioClip, updateAudioClip, selectClip, clearSelection, restoreState, isPlaying, play, pause, togglePlayback, seek, setIsPlayingCompat, getVideoRef],
  )

  const playbackValue = useMemo(() => ({ currentTime }), [currentTime])

  return (
    <VideoContext.Provider value={value}>
      <PlaybackTimeContext.Provider value={playbackValue}>{children}</PlaybackTimeContext.Provider>
    </VideoContext.Provider>
  )
}

/** App-level provider: the video project + the compatibility context. */
export const VideoProvider: React.FC = ({ children }) => (
  <VideoProjectProvider>
    <CompatProvider>{children}</CompatProvider>
  </VideoProjectProvider>
)

/** Read the high-frequency playback clock (re-renders every tick). */
export const usePlaybackTime = () => useContext(PlaybackTimeContext)

export type { Clip }
