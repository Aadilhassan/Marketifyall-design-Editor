import React, { createContext, useCallback, useMemo, useState, useRef } from 'react'

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
  start: number // Computed from order - DO NOT set manually for videos
  end: number // Computed from start + duration
  poster?: string
  // Internal: order index (for Canva-style segment model)
  _order?: number
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
  reorderClips: (sourceIndex: number, targetIndex: number) => void
  // Computed segments with start times (Canva-style)
  computedClips: VideoClip[]
  addAudioClip: (clip: AudioClip) => void
  removeAudioClip: (id: string) => void
  updateAudioClip: (id: string, patch: Partial<AudioClip>) => void
  addLayer: (layer: TimelineLayer) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, patch: Partial<TimelineLayer>) => void
  // Multi-select
  selectClip: (id: string, addToSelection?: boolean) => void
  clearSelection: () => void
  // Shared playback state for syncing timeline and canvas player
  isPlaying: boolean
  currentTime: number
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
  computedClips: [],
  addAudioClip: () => { },
  removeAudioClip: () => { },
  updateAudioClip: () => { },
  addLayer: () => { },
  removeLayer: () => { },
  updateLayer: () => { },
  selectClip: () => { },
  clearSelection: () => { },
  // Shared playback defaults
  isPlaying: false,
  currentTime: 0,
  setCurrentTime: () => { },
  play: () => { },
  pause: () => { },
  togglePlayback: () => { },
  seek: () => { },
  setIsPlaying: () => { },
  registerVideoRef: () => { },
  getVideoRef: () => null,
})

// ============ CANVA-STYLE SEGMENT COMPUTATION ============
// Compute start times from ordered segments (Canva model)
function computeSegments(segments: VideoClip[]): VideoClip[] {
  let t = 0
  return segments.map((s, index) => {
    const start = t
    const end = t + s.duration
    t += s.duration
    return {
      ...s,
      start,
      end,
      _order: index,
    }
  })
}

export const VideoProvider: React.FC = ({ children }) => {
  // Store clips as ordered segments (Canva-style)
  // start/end are computed, not stored
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

  // Compute clips with start times (Canva-style: timeline is derived)
  const computedClips = useMemo(() => computeSegments(clips), [clips])

  const addClip = useCallback((clip: VideoClip) => {
    // Canva-style: Add to end of timeline (start will be computed)
    // Store clip without start/end - they'll be computed on read
    const { start, end, ...clipWithoutTime } = clip
    setClips(prev => [...prev, clipWithoutTime as VideoClip])
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
    setClips(prev => {
      // Canva-style: Only allow duration updates for videos (start is computed)
      // If duration changes, ripple edit happens automatically (start times recomputed)
      return prev.map(c => {
        if (c.id === id) {
          // Remove start/end from patch - they're computed
          const { start, end, ...cleanPatch } = patch
          return { ...c, ...cleanPatch }
        }
        return c
      })
    })
  }, [])

  // Canva-style: Reorder clips by index (dragging = reordering)
  const reorderClips = useCallback((sourceIndex: number, targetIndex: number) => {
    setClips(prev => {
      const newClips = [...prev]
      const [removed] = newClips.splice(sourceIndex, 1)
      newClips.splice(targetIndex, 0, removed)
      // Start times will be recomputed automatically via computedClips
      return newClips
    })
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

  // Play the active video
  const play = useCallback(() => {
    const activeVideo = activeClipId ? videoRefsMap.current[activeClipId] : null
    if (activeVideo) {
      playPromiseRef.current = activeVideo.play()
      playPromiseRef.current
        .then(() => {
          playPromiseRef.current = null
          setIsPlaying(true)
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Playback error:', err)
          }
          playPromiseRef.current = null
          setIsPlaying(false)
        })
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

  // Seek to a specific time
  const seek = useCallback((time: number) => {
    const activeVideo = activeClipId ? videoRefsMap.current[activeClipId] : null
    if (activeVideo) {
      activeVideo.currentTime = time
    }
    setCurrentTime(time)
  }, [activeClipId])

  const value = useMemo(
    () => ({
      clips: computedClips, // Expose computed clips (with start/end)
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
      // Shared playback state
      isPlaying,
      currentTime,
      setCurrentTime,
      play,
      pause,
      togglePlayback,
      seek,
      setIsPlaying,
      registerVideoRef,
      getVideoRef,
      // Canva-style computed segments
      computedClips,
    }),
    [computedClips, audioClips, layers, activeClipId, selectedClipIds, isTimelineOpen, addClip, removeClip, updateClip, reorderClips, addAudioClip, removeAudioClip, updateAudioClip, addLayer, removeLayer, updateLayer, selectClip, clearSelection, isPlaying, currentTime, play, pause, togglePlayback, seek, setIsPlaying, registerVideoRef, getVideoRef]
  )

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
}
