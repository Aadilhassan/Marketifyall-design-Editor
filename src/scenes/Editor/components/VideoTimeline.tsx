import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { styled } from 'baseui'
import useVideoContext from '@/hooks/useVideoContext'
import { useEditorContext, useEditor } from '@nkyo/scenify-sdk'

// ============ CANVA-STYLE TIMELINE STYLES ============

const TimelineShell = styled('div', {
  position: 'absolute',
  left: '0',
  right: '0',
  bottom: '0',
  height: '260px',
  zIndex: 12,
  display: 'flex',
  flexDirection: 'column',
  background: '#ffffff',
  borderTop: '1px solid #e5e7eb',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
})

const TimelineHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  background: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  minHeight: '44px',
})

const HeaderLeft = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const HeaderCenter = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
})

const HeaderRight = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const TimeDisplay = styled('div', {
  fontFamily: "'SF Mono', 'Fira Code', monospace",
  fontSize: '14px',
  fontWeight: 600,
  color: '#111827',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const PlayButton = styled('button', ({ $playing }: { $playing?: boolean }) => ({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: $playing
    ? '#ef4444'
    : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  ':hover': {
    transform: 'scale(1.08)',
  },
  ':active': {
    transform: 'scale(0.95)',
  },
}))

const ControlBtn = styled('button', {
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  background: 'transparent',
  border: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  ':hover': {
    background: '#f3f4f6',
    color: '#111827',
  },
})

const ZoomControl = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  background: '#f3f4f6',
  padding: '4px 8px',
  borderRadius: '6px',
})

const ZoomSlider = styled('input', {
  width: '60px',
  height: '3px',
  appearance: 'none',
  background: '#d1d5db',
  borderRadius: '2px',
  outline: 'none',
  '::-webkit-slider-thumb': {
    appearance: 'none',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#8b5cf6',
    cursor: 'pointer',
  },
})

const CloseButton = styled('button', {
  background: 'transparent',
  border: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  ':hover': {
    background: '#f3f4f6',
    color: '#111827',
  },
})

const TimelineBody = styled('div', {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
})

const TrackLabelsPanel = styled('div', {
  width: '90px',
  background: '#f9fafb',
  borderRight: '1px solid #e5e7eb',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
})

const TrackLabelHeader = styled('div', {
  height: '32px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  padding: '0 8px',
  fontSize: '10px',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const TrackLabel = styled('div', ({ $type }: { $type?: string }) => {
  const getColor = () => {
    switch ($type) {
      case 'video': return '#8b5cf6'
      case 'text': return '#10b981'
      case 'image': return '#f59e0b'
      case 'audio': return '#3b82f6'
      default: return '#6b7280'
    }
  }
  return {
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 8px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    ':hover': {
      background: '#f3f4f6',
    },
    '::before': {
      content: '""',
      width: '3px',
      height: '24px',
      background: getColor(),
      borderRadius: '2px',
    },
  }
})

const AddAudioButton = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 10px',
  margin: '8px',
  background: 'transparent',
  border: '1px dashed #d1d5db',
  borderRadius: '6px',
  color: '#6b7280',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  ':hover': {
    background: '#f3f4f6',
    borderColor: '#3b82f6',
    color: '#3b82f6',
  },
})

const TracksScrollContainer = styled('div', {
  flex: 1,
  overflow: 'auto',
  position: 'relative',
})

const TimeRuler = styled('div', {
  height: '32px',
  background: '#ffffff',
  borderBottom: '1px solid #e5e7eb',
  position: 'sticky',
  top: 0,
  zIndex: 5,
  cursor: 'pointer',
})

const TimeMarker = styled('div', ({ $left }: { $left: number }) => ({
  position: 'absolute',
  left: `${$left}px`,
  top: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}))

const TimeMarkerLine = styled('div', ({ $isMajor }: { $isMajor?: boolean }) => ({
  width: '1px',
  height: $isMajor ? '12px' : '6px',
  background: $isMajor ? '#9ca3af' : '#d1d5db',
  marginTop: 'auto',
}))

const TimeMarkerText = styled('span', {
  fontSize: '10px',
  color: '#6b7280',
  position: 'absolute',
  top: '4px',
  fontFamily: "'SF Mono', monospace",
})

const TracksArea = styled('div', {
  position: 'relative',
  minWidth: '100%',
})

const TrackRow = styled('div', {
  height: '52px',
  borderBottom: '1px solid #e5e7eb',
  position: 'relative',
  background: '#ffffff',
})

const TrackClip = styled('div', ({ $left, $width, $color, $active, $selected }: {
  $left: number; $width: number; $color: string; $active?: boolean; $selected?: boolean
}) => ({
  position: 'absolute',
  left: `${$left}px`,
  top: '8px',
  bottom: '8px',
  width: `${$width}px`,
  minWidth: '30px',
  background: $color,
  borderRadius: '6px',
  padding: '0 8px',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'grab',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  overflow: 'visible', // Changed to visible so delete button can show
  border: $selected ? '2px solid #ffffff' : ($active ? '2px solid rgba(255,255,255,0.7)' : 'none'),
  boxShadow: $selected ? '0 0 0 2px rgba(139, 92, 246, 0.3)' : 'none',
  transition: 'box-shadow 0.15s ease, border 0.1s ease',
  userSelect: 'none',
  ':hover': {
    filter: 'brightness(1.05)',
    '.audio-delete-btn': {
      opacity: '1 !important',
    },
  },
  ':active': {
    cursor: 'grabbing',
  },
}))

const ClipThumbnail = styled('div', {
  width: '28px',
  height: '28px',
  borderRadius: '3px',
  background: 'rgba(255,255,255,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  overflow: 'hidden',
})

const ClipName = styled('span', {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
})

const ClipHandle = styled('div', ({ $position }: { $position: 'left' | 'right' }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: '8px',
  background: 'rgba(255,255,255,0.5)',
  cursor: 'ew-resize',
  opacity: 0,
  transition: 'opacity 0.15s ease',
  left: $position === 'left' ? 0 : 'auto',
  right: $position === 'right' ? 0 : 'auto',
  borderRadius: $position === 'left' ? '6px 0 0 6px' : '0 6px 6px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ':hover': {
    opacity: 1,
    background: 'rgba(255,255,255,0.8)',
  },
}))

const DeleteButton = styled('button', {
  position: 'absolute',
  top: '4px',
  right: '4px',
  width: '20px',
  height: '20px',
  borderRadius: '4px',
  background: 'rgba(0, 0, 0, 0.7)',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  transition: 'all 0.2s ease',
  padding: 0,
  zIndex: 100,
  pointerEvents: 'auto',
  ':hover': {
    background: '#ef4444',
    opacity: 1,
    transform: 'scale(1.15)',
  },
  'svg': {
    width: '14px',
    height: '14px',
  },
})

const Playhead = styled('div', ({ $left }: { $left: number }) => ({
  position: 'absolute',
  left: `${$left}px`,
  top: 0,
  bottom: 0,
  width: '2px',
  background: '#ef4444',
  zIndex: 20,
  pointerEvents: 'none',
  '::before': {
    content: '""',
    position: 'absolute',
    top: '0',
    left: '-5px',
    width: '0',
    height: '0',
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '10px solid #ef4444',
  },
}))

const ShowTimelineButton = styled('button', {
  position: 'absolute',
  bottom: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 20px',
  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '24px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
  transition: 'all 0.2s ease',
  zIndex: 15,
  ':hover': {
    transform: 'translateX(-50%) translateY(-2px)',
    boxShadow: '0 6px 24px rgba(139, 92, 246, 0.5)',
  },
})

// Hidden file input for audio upload
const HiddenInput = styled('input', {
  display: 'none',
})

// ============ HELPER FUNCTIONS ============

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '0:00'
  const mins = Math.floor(value / 60)
  const secs = Math.floor(value % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Track type definitions
type TrackType = 'video' | 'text' | 'image' | 'audio'

interface TimelineClip {
  id: string
  name: string
  start: number
  duration: number
  color: string
  type: TrackType
  thumbnail?: string
  canvasObjectId?: string
}

interface TimelineTrack {
  id: string
  name: string
  type: TrackType
  clips: TimelineClip[]
  muted?: boolean
  locked?: boolean
}

// ============ MAIN COMPONENT ============

const VideoTimeline: React.FC = () => {
  const {
    clips,
    audioClips,
    layers,
    activeClipId,
    selectedClipIds,
    isTimelineOpen,
    setTimelineOpen,
    setActiveClip,
    selectClip,
    clearSelection,
    addAudioClip,
    removeAudioClip,
    updateAudioClip,
    updateClip,
    isPlaying,
    currentTime,
    setCurrentTime,
    togglePlayback,
    seek,
  } = useVideoContext()

  const { canvas } = useEditorContext()
  const editor = useEditor()

  const [zoom, setZoom] = useState(80)
  const timelineRef = useRef<HTMLDivElement>(null)
  const tracksAreaRef = useRef<HTMLDivElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const [tracks, setTracks] = useState<TimelineTrack[]>([])
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null)

  // Drag state
  const [dragging, setDragging] = useState<{
    clipId: string
    trackId: string
    startX: number
    originalStart: number
  } | null>(null)

  // Resize state
  const [resizing, setResizing] = useState<{
    clipId: string
    trackId: string
    handle: 'left' | 'right'
    startX: number
    originalStart: number
    originalDuration: number
  } | null>(null)

  const pixelsPerSecond = zoom
  const totalDuration = 60
  const timelineWidth = totalDuration * pixelsPerSecond

  // Build tracks from canvas objects
  useEffect(() => {
    if (!canvas) return

    const newTracks: TimelineTrack[] = []

    // Video track
    const videoClips: TimelineClip[] = clips.map((clip, idx) => ({
      id: clip.id,
      name: clip.name || 'Video',
      start: clip.start || 0,
      duration: clip.duration || 60,
      color: '#8b5cf6',
      type: 'video' as TrackType,
    }))

    if (videoClips.length > 0) {
      newTracks.push({
        id: 'track-video',
        name: 'Video',
        type: 'video',
        clips: videoClips,
      })
    }

    // Get canvas objects
    // @ts-ignore
    const objects = canvas.getObjects?.() || []

    const textClips: TimelineClip[] = []
    const imageClips: TimelineClip[] = []

    objects.forEach((obj: any, idx: number) => {
      if (!obj || obj.name === 'clip') return

      const clipId = obj.id || `obj-${idx}`
      const clipName = obj.name || obj.text?.substring(0, 15) || obj.type || 'Element'

      if (obj.type === 'StaticText' || obj.type === 'DynamicText' ||
        obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
        textClips.push({
          id: clipId,
          name: clipName,
          start: 0,
          duration: totalDuration,
          color: '#10b981',
          type: 'text',
          canvasObjectId: clipId,
        })
      } else if ((obj.type === 'StaticImage' || obj.type === 'image') && !obj.metadata?.isVideo) {
        imageClips.push({
          id: clipId,
          name: clipName,
          start: 0,
          duration: totalDuration,
          color: '#f59e0b',
          type: 'image',
          canvasObjectId: clipId,
        })
      }
    })

    if (textClips.length > 0) {
      newTracks.push({
        id: 'track-text',
        name: 'Text',
        type: 'text',
        clips: textClips,
      })
    }

    if (imageClips.length > 0) {
      newTracks.push({
        id: 'track-images',
        name: 'Images',
        type: 'image',
        clips: imageClips,
      })
    }

    // Audio tracks - each audio clip gets its own track for better visibility
    // Different colors for visual distinction
    const audioColors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6']

    if (audioClips.length > 0) {
      audioClips.forEach((clip, idx) => {
        const color = audioColors[idx % audioColors.length]
        newTracks.push({
          id: `track-audio-${clip.id}`,
          name: idx === 0 ? 'Audio' : `Audio ${idx + 1}`,
          type: 'audio',
          clips: [{
            id: clip.id,
            name: clip.name,
            start: clip.start,
            duration: clip.duration,
            color: color,
            type: 'audio' as TrackType,
          }],
        })
      })
    } else {
      // Show empty audio track placeholder
      newTracks.push({
        id: 'track-audio',
        name: 'Audio',
        type: 'audio',
        clips: [],
      })
    }

    setTracks(newTracks)
  }, [canvas, clips, audioClips])

  // Track which audio clips are ready to play
  const audioReadyRef = useRef<Record<string, boolean>>({})

  // Create/update audio elements for each audio clip
  useEffect(() => {
    // Create new audio elements for new clips
    audioClips.forEach(clip => {
      if (!audioRefs.current[clip.id]) {
        console.log(`Creating audio element for: ${clip.name} (${clip.id})`)

        const audio = new Audio()
        audio.preload = 'auto'
        audio.volume = clip.volume ?? 1

        // Track ready state
        audioReadyRef.current[clip.id] = false

        // Set up ready state tracking
        const onCanPlay = () => {
          audioReadyRef.current[clip.id] = true
          console.log(`Audio ready to play: ${clip.name} (${clip.id})`)
        }

        const onError = (e: Event) => {
          console.error(`Audio load error for ${clip.name}:`, e)
          audioReadyRef.current[clip.id] = false
        }

        audio.addEventListener('canplaythrough', onCanPlay)
        audio.addEventListener('error', onError)

          // Store cleanup handlers
          ; (audio as any)._cleanup = () => {
            audio.removeEventListener('canplaythrough', onCanPlay)
            audio.removeEventListener('error', onError)
          }

        // Set source after adding listeners
        audio.src = clip.src
        audio.load()

        audioRefs.current[clip.id] = audio
      } else {
        // Update volume if changed
        const existingAudio = audioRefs.current[clip.id]
        if (existingAudio && existingAudio.volume !== (clip.volume ?? 1)) {
          existingAudio.volume = clip.volume ?? 1
        }
      }
    })

    // Remove audio elements for removed clips
    const currentIds = audioClips.map(c => c.id)
    Object.keys(audioRefs.current).forEach(id => {
      if (!currentIds.includes(id)) {
        const audio = audioRefs.current[id]
        if (audio) {
          console.log(`Removing audio element: ${id}`)
            // Call cleanup handlers
            ; (audio as any)._cleanup?.()
          audio.pause()
          audio.src = ''
        }
        delete audioRefs.current[id]
        delete audioReadyRef.current[id]
      }
    })
  }, [audioClips])

  // Sync audio playback with timeline
  useEffect(() => {
    audioClips.forEach(clip => {
      const audio = audioRefs.current[clip.id]
      if (!audio) {
        return
      }

      const clipStart = clip.start || 0
      const clipEnd = clipStart + clip.duration
      const isClipActive = currentTime >= clipStart && currentTime < clipEnd

      if (isPlaying && isClipActive) {
        // Calculate audio time relative to clip start
        const audioTime = Math.max(0, currentTime - clipStart)

        // Ensure audio time is within valid range
        const audioDuration = audio.duration || clip.duration
        if (audioTime >= 0 && audioTime < audioDuration) {
          // Sync audio time if it's drifted by more than 0.15 seconds
          if (Math.abs(audio.currentTime - audioTime) > 0.15) {
            audio.currentTime = audioTime
          }

          // Play if not already playing
          if (audio.paused) {
            // Check if audio is ready (readyState >= 2 means HAVE_CURRENT_DATA)
            const isReady = audio.readyState >= 2 || audioReadyRef.current[clip.id]

            if (isReady) {
              const playPromise = audio.play()
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log(`Playing audio: ${clip.name}`)
                  })
                  .catch(err => {
                    // Ignore AbortError as it's expected when rapidly seeking
                    if (err.name !== 'AbortError') {
                      console.error(`Audio play error for ${clip.name}:`, err)
                    }
                  })
              }
            } else {
              // Audio not ready yet, will try again on next update
              console.log(`Audio not ready yet: ${clip.name}, readyState: ${audio.readyState}`)
            }
          }
        }
      } else {
        // Pause audio if timeline is paused or clip is not active
        if (!audio.paused) {
          audio.pause()
        }
      }
    })
  }, [isPlaying, currentTime, audioClips])

  // Handle seeking for audio - sync immediately when seeking
  const lastSeekTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // Only run if we're seeking (currentTime changed but not playing)
    if (lastSeekTimeRef.current !== null && Math.abs(currentTime - lastSeekTimeRef.current) > 0.5) {
      audioClips.forEach(clip => {
        const audio = audioRefs.current[clip.id]
        if (!audio) return

        const clipStart = clip.start || 0
        const audioTime = Math.max(0, currentTime - clipStart)

        if (audioTime >= 0 && audioTime < clip.duration) {
          audio.currentTime = audioTime
        }
      })
    }
    lastSeekTimeRef.current = currentTime
  }, [currentTime, audioClips])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause()
          audio.src = ''
        }
      })
      audioRefs.current = {}
    }
  }, [])

  // Timer to update currentTime when playing (drives audio and playhead)
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime

  useEffect(() => {
    if (!isPlaying) return

    let lastTime = performance.now()
    let animationId: number

    const updateTime = () => {
      const now = performance.now()
      const deltaSeconds = (now - lastTime) / 1000
      lastTime = now

      const newTime = currentTimeRef.current + deltaSeconds

      // Stop at end of timeline
      if (newTime >= totalDuration) {
        setCurrentTime(totalDuration)
        togglePlayback() // Pause at end
        return
      }

      setCurrentTime(newTime)
      animationId = requestAnimationFrame(updateTime)
    }

    animationId = requestAnimationFrame(updateTime)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isPlaying, setCurrentTime, totalDuration, togglePlayback])

  // Handle toggle play
  const handleTogglePlay = useCallback(() => {
    togglePlayback()
  }, [togglePlayback])

  // Handle seek
  const handleSeek = useCallback((time: number) => {
    seek(Math.max(0, Math.min(time, totalDuration)))
  }, [seek, totalDuration])

  // Handle timeline click for seeking
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging || resizing) return
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = x / pixelsPerSecond
    handleSeek(time)
  }

  // Handle clip click with multi-select support
  const handleClipClick = (clipId: string, trackId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const addToSelection = e.shiftKey || e.ctrlKey || e.metaKey
    selectClip(clipId, addToSelection)

    // Select on canvas if applicable
    const track = tracks.find(t => t.id === trackId)
    const clip = track?.clips.find(c => c.id === clipId)

    if (clip?.canvasObjectId && canvas) {
      // @ts-ignore
      const objects = canvas.getObjects?.() || []
      const obj = objects.find((o: any) => o.id === clip.canvasObjectId)
      if (obj) {
        // @ts-ignore
        canvas.setActiveObject?.(obj)
        // @ts-ignore
        canvas.requestRenderAll?.()
      }
    }
  }

  // Drag handlers
  const handleDragStart = (clipId: string, trackId: string, e: React.MouseEvent) => {
    e.preventDefault()
    const track = tracks.find(t => t.id === trackId)
    const clip = track?.clips.find(c => c.id === clipId)
    if (!clip) return

    setDragging({
      clipId,
      trackId,
      startX: e.clientX,
      originalStart: clip.start,
    })
  }

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragging) return

    const deltaX = e.clientX - dragging.startX
    const deltaTime = deltaX / pixelsPerSecond
    const newStart = Math.max(0, dragging.originalStart + deltaTime)

    setTracks(prev => prev.map(track => {
      if (track.id === dragging.trackId) {
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id === dragging.clipId ? { ...clip, start: newStart } : clip
          )
        }
      }
      return track
    }))
  }, [dragging, pixelsPerSecond])

  const handleDragEnd = useCallback(() => {
    if (dragging) {
      // Sync audio clip position change back to context
      const track = tracks.find(t => t.id === dragging.trackId)
      const clip = track?.clips.find(c => c.id === dragging.clipId)

      if (clip && track?.type === 'audio') {
        updateAudioClip(clip.id, { start: clip.start })
      }
    }
    setDragging(null)
  }, [dragging, tracks, updateAudioClip])

  // Resize handlers
  const handleResizeStart = (clipId: string, trackId: string, handle: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const track = tracks.find(t => t.id === trackId)
    const clip = track?.clips.find(c => c.id === clipId)
    if (!clip) return

    setResizing({
      clipId,
      trackId,
      handle,
      startX: e.clientX,
      originalStart: clip.start,
      originalDuration: clip.duration,
    })
  }

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return

    const deltaX = e.clientX - resizing.startX
    const deltaTime = deltaX / pixelsPerSecond

    setTracks(prev => prev.map(track => {
      if (track.id === resizing.trackId) {
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== resizing.clipId) return clip

            if (resizing.handle === 'left') {
              const newStart = Math.max(0, resizing.originalStart + deltaTime)
              const newDuration = Math.max(1, resizing.originalDuration - deltaTime)
              return { ...clip, start: newStart, duration: newDuration }
            } else {
              const newDuration = Math.max(1, resizing.originalDuration + deltaTime)
              return { ...clip, duration: newDuration }
            }
          })
        }
      }
      return track
    }))
  }, [resizing, pixelsPerSecond])

  const handleResizeEnd = useCallback(() => {
    if (resizing) {
      // Sync audio clip changes back to context
      const track = tracks.find(t => t.id === resizing.trackId)
      const clip = track?.clips.find(c => c.id === resizing.clipId)

      if (clip && track?.type === 'audio') {
        updateAudioClip(clip.id, { start: clip.start, duration: clip.duration })
      }
    }
    setResizing(null)
  }, [resizing, tracks, updateAudioClip])

  // Mouse move/up listeners for drag and resize
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [dragging, handleDragMove, handleDragEnd])

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [resizing, handleResizeMove, handleResizeEnd])

  // Handle audio file upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const audio = new Audio(url)

    audio.addEventListener('loadedmetadata', () => {
      addAudioClip({
        id: `audio-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        src: url,
        duration: audio.duration,
        start: 0,
        volume: 1,
      })
    })

    // Reset input
    if (audioInputRef.current) {
      audioInputRef.current.value = ''
    }
  }

  // Handle keyboard delete (like Canva)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if timeline is open and focused
      if (!isTimelineOpen) return
      
      // Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipIds.length > 0) {
        // Don't delete if user is typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }

        e.preventDefault()
        
        // Delete all selected audio clips
        selectedClipIds.forEach(clipId => {
          // Check if it's an audio clip
          const isAudioClip = audioClips.some(ac => ac.id === clipId)
          if (isAudioClip) {
            removeAudioClip(clipId)
          }
        })
        
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTimelineOpen, selectedClipIds, audioClips, removeAudioClip, clearSelection])

  // Show timeline button when closed
  if (!isTimelineOpen) {
    const hasContent = clips.length > 0 || audioClips.length > 0
    if (!hasContent) return null

    return (
      <ShowTimelineButton onClick={() => setTimelineOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 8h20M6 4v4M10 4v4M14 4v4M18 4v4" />
        </svg>
        Show Timeline
      </ShowTimelineButton>
    )
  }

  const playheadPosition = currentTime * pixelsPerSecond

  // Generate time markers
  const timeMarkers = []
  const markerInterval = zoom > 100 ? 5 : 10
  for (let i = 0; i <= totalDuration; i += markerInterval) {
    timeMarkers.push(i)
  }

  return (
    <TimelineShell>
      <TimelineHeader>
        <HeaderLeft>
          <ControlBtn onClick={() => handleSeek(0)} title="Go to start">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 5v14l-7-7 7-7zM5 5v14h2V5H5z" />
            </svg>
          </ControlBtn>

          <PlayButton $playing={isPlaying} onClick={handleTogglePlay}>
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v14l11-7-11-7z" />
              </svg>
            )}
          </PlayButton>

          <ControlBtn onClick={() => handleSeek(totalDuration)} title="Go to end">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 5v14l7-7-7-7zm12 0v14h2V5h-2z" />
            </svg>
          </ControlBtn>
        </HeaderLeft>

        <HeaderCenter>
          <TimeDisplay>
            <span style={{ color: '#111827' }}>{formatTime(currentTime)}</span>
            <span style={{ color: '#9ca3af' }}>/</span>
            <span style={{ color: '#9ca3af' }}>{formatTime(totalDuration)}</span>
          </TimeDisplay>
        </HeaderCenter>

        <HeaderRight>
          <ZoomControl>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <ZoomSlider
              type="range"
              min={40}
              max={200}
              value={zoom}
              onChange={e => setZoom(parseInt(e.target.value))}
            />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </ZoomControl>

          <CloseButton onClick={() => setTimelineOpen(false)}>
            ✕ Close
          </CloseButton>
        </HeaderRight>
      </TimelineHeader>

      <TimelineBody>
        <TrackLabelsPanel>
          <TrackLabelHeader>Tracks</TrackLabelHeader>
          {tracks.map(track => (
            <TrackLabel key={track.id} $type={track.type}>
              {track.name}
            </TrackLabel>
          ))}

          <AddAudioButton onClick={() => audioInputRef.current?.click()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Audio
          </AddAudioButton>
          <HiddenInput
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
          />
        </TrackLabelsPanel>

        <TracksScrollContainer>
          <TimeRuler
            ref={timelineRef}
            onClick={handleTimelineClick}
            style={{ width: `${timelineWidth}px` }}
          >
            {timeMarkers.map((time, idx) => (
              <TimeMarker key={time} $left={time * pixelsPerSecond}>
                <TimeMarkerText>{time}s</TimeMarkerText>
                <TimeMarkerLine $isMajor={idx % 2 === 0} />
              </TimeMarker>
            ))}
            <Playhead $left={playheadPosition} />
          </TimeRuler>

          <TracksArea
            ref={tracksAreaRef}
            onClick={handleTimelineClick}
            style={{ width: `${timelineWidth}px` }}
          >
            {tracks.map(track => (
              <TrackRow key={track.id}>
                {track.clips.map(clip => (
                  <TrackClip
                    key={clip.id}
                    $left={clip.start * pixelsPerSecond}
                    $width={clip.duration * pixelsPerSecond}
                    $color={clip.color}
                    $active={clip.id === activeClipId}
                    $selected={selectedClipIds.includes(clip.id)}
                    onClick={(e) => handleClipClick(clip.id, track.id, e)}
                    onMouseDown={(e) => handleDragStart(clip.id, track.id, e)}
                    onMouseEnter={() => setHoveredClipId(clip.id)}
                    onMouseLeave={() => setHoveredClipId(null)}
                  >
                    <ClipThumbnail>
                      {clip.type === 'video' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                      {clip.type === 'text' && (
                        <span style={{ fontSize: '12px', fontWeight: 700 }}>T</span>
                      )}
                      {clip.type === 'image' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21h14a2 2 0 002-2v-4z" />
                        </svg>
                      )}
                      {clip.type === 'audio' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      )}
                    </ClipThumbnail>
                    <ClipName>{clip.name}</ClipName>

                    {/* Delete button for audio clips (like Canva) */}
                    {clip.type === 'audio' && (
                      <DeleteButton
                        onClick={(e) => {
                          e.stopPropagation()
                          removeAudioClip(clip.id)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Delete audio"
                        style={{
                          opacity: (hoveredClipId === clip.id || selectedClipIds.includes(clip.id)) ? 1 : 0,
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </DeleteButton>
                    )}

                    <ClipHandle
                      $position="left"
                      onMouseDown={(e) => handleResizeStart(clip.id, track.id, 'left', e)}
                    />
                    <ClipHandle
                      $position="right"
                      onMouseDown={(e) => handleResizeStart(clip.id, track.id, 'right', e)}
                    />
                  </TrackClip>
                ))}

                {track.clips.length === 0 && track.type === 'audio' && (
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#9ca3af',
                    fontSize: '11px',
                    pointerEvents: 'none',
                  }}>
                    Drop audio files here
                  </div>
                )}
              </TrackRow>
            ))}

            <Playhead $left={playheadPosition} />
          </TracksArea>
        </TracksScrollContainer>
      </TimelineBody>
    </TimelineShell>
  )
}

export default VideoTimeline
