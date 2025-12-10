import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { styled } from 'baseui'
import useVideoContext from '@/hooks/useVideoContext'
import { useEditorContext, useEditor } from '@nkyo/scenify-sdk'

const TimelineShell = styled('div', {
  position: 'absolute',
  left: '0',
  right: '0',
  top: '0', // Moved to top as requested
  height: '220px', // Slightly compacted
  zIndex: 12,
  display: 'flex',
  flexDirection: 'column',
  background: '#ffffff',
  borderBottom: '1px solid #e5e7eb',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
})

const Toolbar = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  background: '#fafafa',
  borderBottom: '1px solid #e5e7eb',
  minHeight: '52px',
})

const ToolbarLeft = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const ToolbarRight = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const PlayButton = styled('button', ({ $playing }: { $playing?: boolean }) => ({
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: $playing ? '#6366f1' : '#667eea',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  ':hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
}))

const TimeDisplay = styled('div', {
  fontFamily: 'monospace',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  minWidth: '80px',
})

const IconButton = styled('button', ({ $active }: { $active?: boolean }) => ({
  background: $active ? '#667eea' : 'transparent',
  border: '1px solid #d1d5db',
  color: $active ? '#ffffff' : '#6b7280',
  borderRadius: '8px',
  padding: '6px 12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '12px',
  fontWeight: 500,
  transition: 'all 0.15s ease',
  ':hover': {
    background: $active ? '#6366f1' : '#f3f4f6',
    borderColor: $active ? '#6366f1' : '#9ca3af',
  },
}))

const TimelineContent = styled('div', {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
})

const TrackLabels = styled('div', {
  width: '120px',
  background: '#fafafa',
  borderRight: '1px solid #e5e7eb',
  display: 'flex',
  flexDirection: 'column',
})

const TrackLabel = styled('div', {
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  borderBottom: '1px solid #e5e7eb',
})

const TracksContainer = styled('div', {
  flex: 1,
  position: 'relative',
  overflow: 'auto',
})

const TimeRuler = styled('div', {
  height: '32px',
  background: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  position: 'relative',
  userSelect: 'none',
})

const TimeMarker = styled('div', ({ $left }: { $left: number }) => ({
  position: 'absolute',
  left: `${$left}px`,
  top: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
}))

const TimeMarkerLine = styled('div', {
  width: '1px',
  height: '8px',
  background: '#d1d5db',
})

const TimeMarkerText = styled('span', {
  fontSize: '10px',
  color: '#9ca3af',
  marginTop: '2px',
  marginLeft: '4px',
})

const TracksArea = styled('div', {
  position: 'relative',
  minHeight: '200px',
})

const TrackRow = styled('div', {
  height: '48px',
  borderBottom: '1px solid #e5e7eb',
  position: 'relative',
  background: '#ffffff',
})

const TrackClip = styled('div', ({ $left, $width, $color, $active }: { $left: number; $width: number; $color: string; $active?: boolean }) => ({
  position: 'absolute',
  left: `${$left}px`,
  top: '6px',
  bottom: '6px',
  width: `${$width}px`,
  background: $active ? '#667eea' : $color,
  borderRadius: '6px',
  padding: '6px 10px',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  border: $active ? '2px solid #4f46e5' : '1px solid rgba(0,0,0,0.1)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  overflow: 'hidden',
  transition: 'all 0.15s ease',
  ':hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  },
}))

const Playhead = styled('div', ({ $left }: { $left: number }) => ({
  position: 'absolute',
  left: `${$left}px`,
  top: 0,
  bottom: 0,
  width: '2px',
  background: '#ef4444',
  zIndex: 10,
  pointerEvents: 'none',
  '::before': {
    content: '""',
    position: 'absolute',
    top: '-6px',
    left: '-5px',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '6px solid #ef4444',
  },
}))

const Overlay = styled('div', {
  position: 'absolute',
  borderRadius: '12px',
  overflow: 'visible',
  background: 'transparent',
  zIndex: 3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
})

const VideoWrapper = styled('div', ({ $isDragging }: { $isDragging?: boolean }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
  background: 'transparent',
  boxShadow: $isDragging ? '0 30px 100px rgba(0,0,0,0.5)' : '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
  cursor: $isDragging ? 'grabbing' : 'grab',
  transition: $isDragging ? 'none' : 'box-shadow 0.2s ease',
}))

const VideoControls = styled('div', {
  position: 'absolute',
  top: '-36px',
  left: '0',
  right: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'rgba(17, 24, 39, 0.95)',
  padding: '6px 10px',
  borderRadius: '6px',
  backdropFilter: 'blur(10px)',
  pointerEvents: 'auto',
})

const ControlLabel = styled('span', {
  color: '#f9fafb',
  fontSize: '11px',
  fontWeight: 600,
})

const ControlBtn = styled('button', {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#f9fafb',
  borderRadius: '4px',
  padding: '3px 8px',
  fontSize: '10px',
  cursor: 'pointer',
  ':hover': {
    background: 'rgba(255,255,255,0.1)',
  },
})

const ResizeHandle = styled('div', ({ $position }: { $position: string }) => {
  const positions: Record<string, any> = {
    'nw': { top: '-4px', left: '-4px', cursor: 'nwse-resize' },
    'ne': { top: '-4px', right: '-4px', cursor: 'nesw-resize' },
    'sw': { bottom: '-4px', left: '-4px', cursor: 'nesw-resize' },
    'se': { bottom: '-4px', right: '-4px', cursor: 'nwse-resize' },
  }

  return {
    position: 'absolute',
    width: '12px',
    height: '12px',
    background: '#667eea',
    border: '2px solid #ffffff',
    borderRadius: '50%',
    zIndex: 12,
    ...positions[$position],
  }
})

const OverlayVideo = styled('video', {
  width: '100%',
  height: '100%',
  display: 'block',
  objectFit: 'cover',
  background: 'transparent',
  pointerEvents: 'none',
  borderRadius: '12px',
})

const ZoomControl = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const ZoomSlider = styled('input', {
  width: '80px',
  accentColor: '#667eea',
})

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '0:00'
  const mins = Math.floor(value / 60)
  const secs = Math.floor(value % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

type Track = {
  id: string
  name: string
  type: 'video' | 'text' | 'image' | 'shape' | 'audio'
  items: Array<{
    id: string
    name: string
    start: number
    duration: number
    color: string
  }>
}

const VideoTimeline: React.FC = () => {
  const { clips, layers, activeClipId, setActiveClip, isTimelineOpen, setTimelineOpen } = useVideoContext()
  const { canvas } = useEditorContext()
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoom, setZoom] = useState(100)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const playPromiseRef = useRef<Promise<void> | null>(null)

  const activeClip = useMemo(() => clips.find(c => c.id === activeClipId) || clips[0], [clips, activeClipId])

  const totalDuration = useMemo(() => {
    if (clips.length === 0) return 60
    return Math.max(60, Math.max(...clips.map(c => c.start + c.duration)))
  }, [clips])

  const pixelsPerSecond = useMemo(() => (zoom / 100) * 10, [zoom])
  const timelineWidth = useMemo(() => totalDuration * pixelsPerSecond, [totalDuration, pixelsPerSecond])

  // Group clips into tracks by type and merge with canvas objects
  const tracks = useMemo<Track[]>(() => {
    const videoTrack: Track = { id: 'video', name: 'Media', type: 'video', items: [] }
    const textTrack: Track = { id: 'text', name: 'Text', type: 'text', items: [] }
    const imageTrack: Track = { id: 'images', name: 'Images', type: 'image', items: [] }
    const shapeTrack: Track = { id: 'shapes', name: 'Shapes', type: 'shape', items: [] }

    // Add video clips
    clips.forEach(clip => {
      videoTrack.items.push({
        id: clip.id,
        name: clip.name,
        start: clip.start,
        duration: clip.duration,
        color: '#6366f1',
      })
    })

    // Add timeline layers
    layers.forEach(layer => {
      const item = {
        id: layer.id,
        name: layer.name,
        start: layer.start,
        duration: layer.duration,
        color: layer.color,
      }

      if (layer.type === 'text') {
        textTrack.items.push(item)
      } else if (layer.type === 'image') {
        imageTrack.items.push(item)
      } else if (layer.type === 'shape') {
        shapeTrack.items.push(item)
      }
    })

    // Add canvas objects as layers
    if (canvas) {
      // @ts-ignore
      const canvasObjects = canvas.getObjects?.() || []
      canvasObjects.forEach((obj: any, idx: number) => {
        if (!obj || obj.name === 'clip') return

        const layerId = `canvas-${obj.id || idx}`
        const item = {
          id: layerId,
          name: obj.name || obj.type || 'Element',
          start: 0,
          duration: 5,
          color: '#10b981',
        }

        if (obj.type === 'StaticText' || obj.type === 'DynamicText' || obj.type === 'textbox' || obj.type === 'text') {
          textTrack.items.push(item)
        } else if (obj.type === 'StaticImage' || obj.type === 'image') {
          imageTrack.items.push(item)
        } else if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'polygon' || obj.type === 'path') {
          shapeTrack.items.push(item)
        }
      })
    }

    return [videoTrack, textTrack, imageTrack, shapeTrack].filter(track => track.items.length > 0)
  }, [clips, layers, canvas])

  // Sync video src
  useEffect(() => {
    if (videoRef.current && activeClip) {
      if (videoRef.current.src !== activeClip.src) {
        videoRef.current.src = activeClip.src
        videoRef.current.currentTime = 0
      }
    }
  }, [activeClip])

  // Sync playback state - properly handles play() promise to prevent AbortError
  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current

    if (isPlaying) {
      // Store the play promise so we can wait for it if pause is called
      playPromiseRef.current = video.play()
      playPromiseRef.current
        .then(() => {
          playPromiseRef.current = null
        })
        .catch(err => {
          // Only log if it's not an abort error
          if (err.name !== 'AbortError') {
            console.error('Playback error:', err)
          }
          playPromiseRef.current = null
          setIsPlaying(false)
        })
    } else {
      // If there's a pending play promise, wait for it before pausing
      const pauseVideo = async () => {
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current
          } catch (error) {
            // Ignore abort errors
          }
          playPromiseRef.current = null
        }
        video.pause()
      }
      pauseVideo()
    }
  }, [isPlaying])

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  // Canvas Click to Play/Pause
  useEffect(() => {
    if (!canvas) return

    const handleCanvasMouseDown = (e: any) => {
      const target = e.target
      if (target && target.metadata?.isVideo && target.metadata?.id === activeClip?.id) {
        handleTogglePlay()
      }
    }

    canvas.on('mouse:down', handleCanvasMouseDown)
    return () => {
      canvas.off('mouse:down', handleCanvasMouseDown)
    }
  }, [canvas, activeClip, handleTogglePlay]) // Added handleTogglePlay to dependencies

  // Store reference to original poster for restoration
  const posterImageRef = useRef<HTMLImageElement | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)

  // Create a persistent video element for canvas use
  useEffect(() => {
    if (activeClip?.src && !videoElementRef.current) {
      const videoEl = document.createElement('video')
      videoEl.src = activeClip.src
      videoEl.crossOrigin = 'anonymous'
      videoEl.muted = true
      videoEl.playsInline = true
      videoEl.loop = false
      videoEl.preload = 'auto'
      videoElementRef.current = videoEl
    }

    return () => {
      if (videoElementRef.current) {
        videoElementRef.current.pause()
        videoElementRef.current.src = ''
        videoElementRef.current = null
      }
    }
  }, [activeClip?.src])

  // Sync canvas video element with main video ref
  useEffect(() => {
    if (videoElementRef.current && videoRef.current) {
      videoElementRef.current.currentTime = videoRef.current.currentTime
    }
  }, [currentTime])

  // Handle canvas object selection and movement - ensure video stays visible
  useEffect(() => {
    if (!canvas) return

    const handleObjectMoving = (e: any) => {
      const target = e.target
      if (target && target.metadata?.isVideo) {
        // Ensure the object remains visible during drag
        target.set('opacity', 1)
        target.set('visible', true)
        target.dirty = true
      }
    }

    const handleObjectModified = (e: any) => {
      const target = e.target
      if (target && target.metadata?.isVideo) {
        target.set('opacity', 1)
        target.set('visible', true)
        target.dirty = true
        // @ts-ignore
        canvas.requestRenderAll()
      }
    }

    const handleSelectionCreated = (e: any) => {
      const selected = e.selected?.[0]
      if (selected && selected.metadata?.isVideo) {
        selected.set('opacity', 1)
        selected.set('visible', true)
        selected.dirty = true
      }
    }

    canvas.on('object:moving', handleObjectMoving)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('selection:created', handleSelectionCreated)

    return () => {
      canvas.off('object:moving', handleObjectMoving)
      canvas.off('object:modified', handleObjectModified)
      canvas.off('selection:created', handleSelectionCreated)
    }
  }, [canvas])

  // Initialize video objects on canvas when activeClip changes
  useEffect(() => {
    if (!canvas || !activeClip) return

    // Small delay to ensure object is fully added to canvas
    const initTimeout = setTimeout(() => {
      // @ts-ignore
      const objects = canvas.getObjects?.() || []

      // Find video objects and ensure they're visible
      objects.forEach((obj: any) => {
        if (obj && obj.metadata?.isVideo) {
          // Ensure visibility and opacity
          if (obj.opacity !== 1) {
            obj.set('opacity', 1)
          }
          if (!obj.visible) {
            obj.set('visible', true)
          }

          // Disable object caching for video frames
          obj.set('objectCaching', false)

          // Mark as dirty to force re-render
          obj.dirty = true
        }
      })

      // Render all changes
      // @ts-ignore
      canvas.requestRenderAll?.()
    }, 100)

    return () => clearTimeout(initTimeout)
  }, [canvas, activeClip, clips])

  // Update current time during playback and sync video with canvas
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let animationFrame: number

    const updateCanvas = () => {
      if (video && canvas) {
        // Try to find the canvas object corresponding to the active clip
        // @ts-ignore
        const objects = canvas.getObjects()
        // @ts-ignore
        const videoObj = objects.find(obj => obj.metadata?.id === activeClip?.id)

        if (videoObj) {
          // Disable caching to support video playback
          videoObj.set('objectCaching', false)

          // ALWAYS ensure visibility - this is critical
          videoObj.set('opacity', 1)
          videoObj.set('visible', true)

          // Mark object as dirty so it redraws
          videoObj.dirty = true
          // @ts-ignore
          canvas.requestRenderAll()
        }

        if (isPlaying) {
          animationFrame = requestAnimationFrame(updateCanvas)
        }
      }
    }

    const handleTimeUpdate = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    if (isPlaying) {
      animationFrame = requestAnimationFrame(updateCanvas)
    } else {
      // When not playing, still update canvas once to ensure visibility
      updateCanvas()
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      cancelAnimationFrame(animationFrame)
    }
  }, [isPlaying, canvas, activeClip])

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / pixelsPerSecond)
    handleSeek(Math.max(0, Math.min(time, totalDuration)))
  }

  if (!isTimelineOpen) return null

  const playheadPosition = currentTime * pixelsPerSecond

  // Generate time markers every 10 seconds
  const timeMarkers = []
  for (let i = 0; i <= totalDuration; i += 10) {
    timeMarkers.push(i)
  }

  return (
    <>
      <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', overflow: 'hidden' }}>
        <video ref={videoRef} playsInline muted src={activeClip?.src} crossOrigin="anonymous" />
      </div>

      <TimelineShell>
        <Toolbar>
          <ToolbarLeft>
            <PlayButton $playing={isPlaying} onClick={handleTogglePlay} disabled={!activeClip}>
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="8 5 19 12 8 19 8 5" />
                </svg>
              )}
            </PlayButton>
            <TimeDisplay>
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </TimeDisplay>
          </ToolbarLeft>

          <ToolbarRight>
            <ZoomControl>
              <IconButton onClick={() => setZoom(Math.max(50, zoom - 25))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </IconButton>
              <ZoomSlider
                type="range"
                min={50}
                max={200}
                value={zoom}
                onChange={e => setZoom(parseInt(e.target.value))}
              />
              <IconButton onClick={() => setZoom(Math.min(200, zoom + 25))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                  <line x1="11" y1="11" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </IconButton>
            </ZoomControl>
            <IconButton onClick={() => setTimelineOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Hide
            </IconButton>
          </ToolbarRight>
        </Toolbar>

        <TimelineContent>
          <TrackLabels>
            {layers && layers.length > 0 ? (
              layers.map(layer => (
                <TrackLabel key={layer.id}>{layer.name}</TrackLabel>
              ))
            ) : (
              tracks.map(track => (
                <TrackLabel key={track.id}>{track.name}</TrackLabel>
              ))
            )}
          </TrackLabels>

          <TracksContainer>
            <TimeRuler style={{ width: `${timelineWidth}px` }}>
              {timeMarkers.map(time => (
                <TimeMarker key={time} $left={time * pixelsPerSecond}>
                  <TimeMarkerLine />
                  <TimeMarkerText>{time}s</TimeMarkerText>
                </TimeMarker>
              ))}
            </TimeRuler>

            <TracksArea ref={timelineRef} onClick={handleTimelineClick} style={{ width: `${timelineWidth}px` }}>
              {tracks.map(track => (
                <TrackRow key={track.id}>
                  {track.items.map(item => (
                    <TrackClip
                      key={item.id}
                      $left={item.start * pixelsPerSecond}
                      $width={item.duration * pixelsPerSecond}
                      $color={item.color}
                      $active={item.id === activeClipId}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveClip(item.id)
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    </TrackClip>
                  ))}
                </TrackRow>
              ))}
              <Playhead $left={playheadPosition} />
            </TracksArea>
          </TracksContainer>
        </TimelineContent>
      </TimelineShell>
    </>
  )
}

export default VideoTimeline
