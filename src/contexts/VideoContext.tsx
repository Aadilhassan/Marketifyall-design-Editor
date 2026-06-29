import React, { createContext, useCallback, useContext, useMemo, useState, useRef } from 'react'

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
  src: string
  duration: number
  start: number
  end: number
  poster?: string
}

export type AudioClip = {
  id: string
  name: string
  src: string
  duration: number
  start: number
  volume: number
}

type VideoContextValue = {
  clips: VideoClip[]
  audioClips: AudioClip[]
  layers: TimelineLayer[]
  activeClipId: string | null
  selectedClipIds: string[] // For multi-select
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
  // Multi-select
  selectClip: (id: string, addToSelection?: boolean) => void
  clearSelection: () => void
  // Bulk-restore clips/audio from a persisted project (reopens the timeline).
  restoreState: (clips: VideoClip[], audioClips?: AudioClip[]) => void
  // Shared playback state for syncing timeline and canvas player.
  // NOTE: currentTime is intentionally NOT here — it updates ~60fps during
  // playback and lives in PlaybackTimeContext so it doesn't re-render every
  // VideoContext consumer. Read the clock via usePlaybackTime().
  isPlaying: boolean
  setCurrentTime: (time: number) => void
  play: () => void
  pause: () => void
  togglePlayback: () => void
  seek: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  registerVideoRef: (id: string, ref: HTMLVideoElement | null) => void
  getVideoRef: (id: string) => HTMLVideoElement | null
}

export const VideoContext = createContext<VideoContextValue>({
  clips: [],
  audioClips: [],
  layers: [],
  activeClipId: null,
  selectedClipIds: [],
  isTimelineOpen: false,
  setTimelineOpen: () => { },
  addClip: () => { },
  removeClip: () => { },
  setActiveClip: () => { },
  updateClip: () => { },
  reorderClips: () => { },
  addAudioClip: () => { },
  removeAudioClip: () => { },
  updateAudioClip: () => { },
  addLayer: () => { },
  removeLayer: () => { },
  updateLayer: () => { },
  selectClip: () => { },
  clearSelection: () => { },
  restoreState: () => { },
  // Shared playback defaults
  isPlaying: false,
  setCurrentTime: () => { },
  play: () => { },
  pause: () => { },
  togglePlayback: () => { },
  seek: () => { },
  setIsPlaying: () => { },
  registerVideoRef: () => { },
  getVideoRef: () => null,
})

// currentTime is split into its own context because it updates ~60fps during
// playback. Keeping it OUT of VideoContext means only components that actually
// read the clock (the animation driver, the canvas player, the timeline
// playhead) re-render each tick — not the entire editor (root, navbar, panels,
// toolbox). Read it via usePlaybackTime().
export const PlaybackTimeContext = createContext<{ currentTime: number }>({ currentTime: 0 })

export const VideoProvider: React.FC = ({ children }) => {
  const [clips, setClips] = useState<VideoClip[]>([])
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [layers, setLayers] = useState<TimelineLayer[]>([])
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([])
  const [isTimelineOpen, setTimelineOpen] = useState(false)

  // Shared playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const videoRefsMap = useRef<Record<string, HTMLVideoElement | null>>({})
  const audioRefsMap = useRef<Record<string, HTMLAudioElement | null>>({})
  const playPromiseRef = useRef<Promise<void> | null>(null)

  const addClip = useCallback((clip: VideoClip) => {
    setClips(prev => [...prev, clip])
    setActiveClipId(clip.id)
    setSelectedClipIds([clip.id])
    // Automatically open timeline when a video clip is added
    setTimelineOpen(true)
  }, [])

  const removeClip = useCallback((id: string) => {
    setClips(prev => prev.filter(c => c.id !== id))
    setActiveClipId(prev => (prev === id ? null : prev))
    setSelectedClipIds(prev => prev.filter(cid => cid !== id))
  }, [])

  const updateClip = useCallback((id: string, patch: Partial<VideoClip>) => {
    setClips(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...patch }
        // Auto-calculate end time if start or duration changed
        if (patch.start !== undefined || patch.duration !== undefined) {
          updated.end = updated.start + updated.duration
        }
        return updated
      }
      return c
    }))
  }, [])

  const reorderClips = useCallback((newOrder: VideoClip[]) => {
    setClips(newOrder)
  }, [])

  // Audio clip functions
  const addAudioClip = useCallback((clip: AudioClip) => {
    setAudioClips(prev => [...prev, clip])
    setSelectedClipIds([clip.id])
    setTimelineOpen(true)
  }, [])

  const removeAudioClip = useCallback((id: string) => {
    setAudioClips(prev => prev.filter(c => c.id !== id))
    setSelectedClipIds(prev => prev.filter(cid => cid !== id))
  }, [])

  const updateAudioClip = useCallback((id: string, patch: Partial<AudioClip>) => {
    setAudioClips(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  // Multi-select functions
  const selectClip = useCallback((id: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedClipIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(cid => cid !== id)
        }
        return [...prev, id]
      })
    } else {
      setSelectedClipIds([id])
    }
    setActiveClipId(id)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedClipIds([])
  }, [])

  // Restore clips/audio persisted with a project on reload. Replaces current
  // state (load happens once, on a fresh editor) and reopens the timeline so the
  // restored video doesn't silently come back as a static image.
  const restoreState = useCallback((restoredClips: VideoClip[] = [], restoredAudio: AudioClip[] = []) => {
    if (restoredClips.length) {
      setClips(restoredClips)
      setActiveClipId(restoredClips[0]?.id ?? null)
      setSelectedClipIds([])
    }
    if (restoredAudio.length) setAudioClips(restoredAudio)
    if (restoredClips.length || restoredAudio.length) setTimelineOpen(true)
  }, [])

  const addLayer = useCallback((layer: TimelineLayer) => {
    setLayers(prev => [...prev, layer])
  }, [])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id))
  }, [])

  const updateLayer = useCallback((id: string, patch: Partial<TimelineLayer>) => {
    setLayers(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))
  }, [])

  // Register a video element ref for playback control
  const registerVideoRef = useCallback((id: string, ref: HTMLVideoElement | null) => {
    videoRefsMap.current[id] = ref
  }, [])

  // Get a video element ref by id
  const getVideoRef = useCallback((id: string) => {
    return videoRefsMap.current[id] || null
  }, [])

  // Start timeline playback. We kick the active <video> off here (MUTED, so the
  // click gesture is always honoured — the canvas player unmutes it once it's
  // running), but timeline playback state must NEVER depend on whether that one
  // element managed to start. The old code set isPlaying(false) inside the
  // play() promise's .catch, so a routine AbortError (from the seek-to-0 that
  // fires on the same click) or a blocked autoplay would cancel the whole clock
  // — the intermittent "press play and nothing happens" bug.
  const play = useCallback(() => {
    const activeVideo = activeClipId ? videoRefsMap.current[activeClipId] : null
    if (activeVideo) {
      try {
        activeVideo.muted = true
        const p = activeVideo.play()
        playPromiseRef.current = p || null
        if (p && p.then) {
          p.then(() => { playPromiseRef.current = null }).catch(() => { playPromiseRef.current = null })
        }
      } catch {
        /* ignore — the canvas player will (re)start the element */
      }
    }
    setIsPlaying(true)
  }, [activeClipId])

  // Pause the active video
  const pause = useCallback(async () => {
    const activeVideo = activeClipId ? videoRefsMap.current[activeClipId] : null
    if (activeVideo) {
      // Wait for pending play promise before pausing
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current
        } catch (error) {
          // Ignore abort errors
        }
        playPromiseRef.current = null
      }
      activeVideo.pause()
    }
    setIsPlaying(false)
  }, [activeClipId])

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  // Seek to a specific time. The timeline clock is absolute, but a <video>'s
  // own currentTime is relative to where its clip starts — so subtract the clip
  // start, otherwise scrubbing jumps the video to the wrong frame.
  const seek = useCallback((time: number) => {
    const activeVideo = activeClipId ? videoRefsMap.current[activeClipId] : null
    if (activeVideo) {
      const clip = clips.find(c => c.id === activeClipId)
      activeVideo.currentTime = Math.max(0, time - (clip?.start || 0))
    }
    setCurrentTime(time)
  }, [activeClipId, clips])

  const value = useMemo(
    () => ({
      clips,
      audioClips,
      layers,
      activeClipId,
      selectedClipIds,
      isTimelineOpen,
      setTimelineOpen,
      addClip,
      removeClip,
      setActiveClip: setActiveClipId,
      updateClip,
      reorderClips,
      addAudioClip,
      removeAudioClip,
      updateAudioClip,
      addLayer,
      removeLayer,
      updateLayer,
      selectClip,
      clearSelection,
      restoreState,
      // Shared playback state (currentTime lives in PlaybackTimeContext)
      isPlaying,
      setCurrentTime,
      play,
      pause,
      togglePlayback,
      seek,
      setIsPlaying,
      registerVideoRef,
      getVideoRef,
    }),
    [clips, audioClips, layers, activeClipId, selectedClipIds, isTimelineOpen, addClip, removeClip, updateClip, reorderClips, addAudioClip, removeAudioClip, updateAudioClip, addLayer, removeLayer, updateLayer, selectClip, clearSelection, restoreState, isPlaying, play, pause, togglePlayback, seek, setIsPlaying, registerVideoRef, getVideoRef]
  )

  // Isolated so a 60fps clock tick only re-renders the few clock consumers.
  const playbackValue = useMemo(() => ({ currentTime }), [currentTime])

  return (
    <VideoContext.Provider value={value}>
      <PlaybackTimeContext.Provider value={playbackValue}>{children}</PlaybackTimeContext.Provider>
    </VideoContext.Provider>
  )
}

/** Read the high-frequency playback clock. Kept separate from useVideoContext so
 *  components that don't need the clock don't re-render ~60fps during playback. */
export const usePlaybackTime = () => useContext(PlaybackTimeContext)
