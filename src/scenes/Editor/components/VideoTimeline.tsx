import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { styled } from 'baseui'
import useVideoContext from '@/hooks/useVideoContext'
import { useEditorContext, useEditor } from '@nkyo/scenify-sdk'
import useAppContext from '@/hooks/useAppContext'

// ============ CANVA-STYLE TIMELINE STYLES ============

const TimelineShell = styled('div', ({ $isVideoPanelActive }: { $isVideoPanelActive: boolean }) => ({
  position: 'absolute',
  left: '0',
  right: '0',
  bottom: $isVideoPanelActive ? '20px' : '0', // Push up from bottom only when video panels are active
  height: '260px',
  zIndex: 12,
  display: 'flex',
  flexDirection: 'column',
  background: '#ffffff',
  borderTop: '1px solid #e5e7eb',
  borderRadius: $isVideoPanelActive ? '8px 8px 0 0' : '0', // Rounded top corners only when video panels are active
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  // Add box shadow only when video panels are active
  boxShadow: $isVideoPanelActive ? '0 -2px 12px rgba(0, 0, 0, 0.08)' : 'none',
}))

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
  // Prevent layout shifts
  contain: 'layout style',
  overflowY: 'auto',
  overflowX: 'hidden',
  // Smooth scrolling
  scrollBehavior: 'smooth',
  // Hide scrollbar but keep functionality
  '::-webkit-scrollbar': {
    width: '6px',
  },
  '::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '::-webkit-scrollbar-thumb': {
    background: '#d1d5db',
    borderRadius: '3px',
  },
  '::-webkit-scrollbar-thumb:hover': {
    background: '#9ca3af',
  },
})

const TrackLabelHeader = styled('div', {
  height: '32px',
  minHeight: '32px',
  maxHeight: '32px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  padding: '0 8px',
  fontSize: '10px',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  flexShrink: 0,
  // Prevent layout shifts
  contain: 'layout',
})

const TrackLabel = styled('div', ({ $type }: { $type?: string }) => {
  const getColor = () => {
    switch ($type) {
      case 'video': return '#8b5cf6'
      case 'text': return '#10b981'
      case 'image': return '#f59e0b'
      case 'shape': return '#ec4899'
      case 'audio': return '#3b82f6'
      default: return '#6b7280'
    }
  }
  // Video tracks are taller to show thumbnails better (Canva-style)
  const trackHeight = $type === 'video' ? '88px' : '52px'
  return {
    height: trackHeight,
    minHeight: trackHeight,
    maxHeight: trackHeight,
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
    flexShrink: 0,
    flexGrow: 0,
    ':hover': {
      background: '#f3f4f6',
    },
    '::before': {
      content: '""',
      width: '3px',
      height: $type === 'video' ? '40px' : '24px',
      background: getColor(),
      borderRadius: '2px',
      flexShrink: 0,
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

const AddMediaButton = styled('button', {
  position: 'absolute',
  left: '8px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  color: '#6b7280',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  zIndex: 10,
  ':hover': {
    background: '#f3f4f6',
    borderColor: '#8b5cf6',
    color: '#8b5cf6',
    transform: 'translateY(-50%) scale(1.1)',
  },
  'svg': {
    width: '18px',
    height: '18px',
  },
})

const MediaMenu = styled('div', ({ $visible, $top }: { $visible: boolean; $top: number }) => ({
  position: 'absolute',
  left: '48px',
  top: `${$top}px`,
  background: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
  border: '1px solid #e5e7eb',
  padding: '4px',
  zIndex: 1000,
  minWidth: '180px',
  opacity: $visible ? 1 : 0,
  visibility: $visible ? 'visible' : 'hidden',
  transform: $visible ? 'translateX(0)' : 'translateX(-8px)',
  transition: 'all 0.15s ease',
  pointerEvents: $visible ? 'auto' : 'none',
}))

const MenuItem = styled('button', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 12px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: '#374151',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textAlign: 'left',
  ':hover': {
    background: '#f3f4f6',
  },
})

const MenuIcon = styled('div', ({ $color }: { $color: string }) => ({
  width: '24px',
  height: '24px',
  borderRadius: '4px',
  background: $color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  'svg': {
    width: '14px',
    height: '14px',
    color: '#ffffff',
  },
}))

const EmptyTrackMessage = styled('div', {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#9ca3af',
  fontSize: '11px',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
})

const TracksScrollContainer = styled('div', {
  flex: 1,
  overflow: 'auto',
  position: 'relative',
  // Prevent layout shifts
  contain: 'layout style paint',
  willChange: 'scroll-position',
})

const TimeRuler = styled('div', {
  height: '32px',
  minHeight: '32px',
  maxHeight: '32px',
  background: '#ffffff',
  borderBottom: '1px solid #e5e7eb',
  position: 'sticky',
  top: 0,
  zIndex: 5,
  cursor: 'pointer',
  flexShrink: 0,
  // Prevent layout shifts
  contain: 'layout',
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
  // Prevent layout shifts
  contain: 'layout',
})

const TrackRow = styled('div', ({ $type }: { $type?: string }) => ({
  // Video tracks are taller to show thumbnails better (Canva-style)
  height: $type === 'video' ? '88px' : '52px',
  minHeight: $type === 'video' ? '88px' : '52px',
  maxHeight: $type === 'video' ? '88px' : '52px',
  borderBottom: '1px solid #e5e7eb',
  position: 'relative',
  background: '#ffffff',
  flexShrink: 0,
  flexGrow: 0,
}))

const TrackClip = styled('div', ({ $left, $width, $color, $active, $selected, $poster }: {
  $left: number; $width: number; $color: string; $active?: boolean; $selected?: boolean; $poster?: string
}) => ({
  position: 'absolute',
  left: `${$left}px`,
  top: '6px', // Reduced top margin for better thumbnail visibility
  bottom: '6px', // Reduced bottom margin for better thumbnail visibility
  width: `${$width}px`,
  minWidth: '30px',
  background: $poster
    ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${$poster})`
    : $color,
  backgroundSize: $poster ? 'cover' : 'auto',
  backgroundPosition: $poster ? 'center' : 'auto',
  backgroundRepeat: $poster ? 'no-repeat' : 'repeat',
  borderRadius: '6px',
  padding: $poster ? '0' : '0 8px', // No padding when showing thumbnail
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'grab',
  display: 'flex',
  alignItems: $poster ? 'flex-end' : 'center', // Align text to bottom when showing thumbnail
  gap: '6px',
  overflow: 'hidden', // Changed to hidden to clip video thumbnail
  border: $selected ? '2px solid #ffffff' : ($active ? '2px solid rgba(255,255,255,0.7)' : 'none'),
  boxShadow: $selected ? '0 0 0 2px rgba(139, 92, 246, 0.3)' : 'none',
  transition: 'box-shadow 0.15s ease, border 0.1s ease',
  userSelect: 'none',
  ':hover': {
    filter: 'brightness(1.05)',
    '.audio-delete-btn': {
      opacity: '1 !important',
    },
    '.clip-add-btn': {
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

// Add segment button at end of clips
const ClipAddButton = styled('div', {
  position: 'absolute',
  right: '-14px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: 'rgba(99, 102, 241, 0.9)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity 0.15s ease, transform 0.15s ease',
  zIndex: 10,
  fontSize: '14px',
  fontWeight: 'bold',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  ':hover': {
    opacity: 1,
    transform: 'translateY(-50%) scale(1.1)',
    background: 'rgba(99, 102, 241, 1)',
  },
})

// Context menu for timeline clips
const ContextMenuOverlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2000,
})

const ContextMenuContainer = styled('div', ({ $visible, $top, $left }: { $visible: boolean; $top: number; $left: number }) => ({
  position: 'fixed',
  top: `${$top}px`,
  left: `${$left}px`,
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)',
  padding: '2px',
  minWidth: '100px',
  zIndex: 2001,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  opacity: $visible ? 1 : 0,
  visibility: $visible ? 'visible' : 'hidden',
  pointerEvents: $visible ? 'auto' : 'none',
  transform: $visible ? 'scale(1)' : 'scale(0.95)',
  transition: 'opacity 0.1s ease, transform 0.1s ease',
}))

const ContextMenuItem = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 10px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  transition: 'all 0.1s ease',
  ':hover': {
    backgroundColor: '#f3f4f6',
    color: '#ef4444',
  },
  'svg': {
    width: '14px',
    height: '14px',
    flexShrink: 0,
  },
})

const Playhead = styled('div', ({ $left }: { $left: number }) => ({
  position: 'absolute',
  left: `${$left}px`,
  top: 0,
  bottom: 0,
  width: '12px',
  marginLeft: '-6px',
  background: 'transparent',
  zIndex: 50,
  cursor: 'grab',
  // The visible playhead line
  '::after': {
    content: '""',
    position: 'absolute',
    left: '5px',
    top: 0,
    bottom: 0,
    width: '2px',
    background: '#ef4444',
    pointerEvents: 'none',
  },
  // The playhead handle at top
  '::before': {
    content: '""',
    position: 'absolute',
    top: '0',
    left: '0',
    width: '12px',
    height: '14px',
    background: '#ef4444',
    borderRadius: '2px 2px 4px 4px',
    cursor: 'grab',
  },
  ':active': {
    cursor: 'grabbing',
  },
  ':hover::before': {
    background: '#dc2626',
    transform: 'scale(1.1)',
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
type TrackType = 'video' | 'text' | 'image' | 'shape' | 'audio'

interface TimelineClip {
  id: string
  name: string
  start: number
  duration: number
  color: string
  type: TrackType
  thumbnail?: string
  poster?: string
  videoSrc?: string
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
    addClip,
    removeClip,
    updateClip,
    reorderClips,
    isPlaying,
    currentTime,
    setCurrentTime,
    togglePlayback,
    seek,
    pause,
    setIsPlaying,
  } = useVideoContext()

  const { canvas } = useEditorContext()
  const editor = useEditor()
  const { setActivePanel, activePanel } = useAppContext()

  // Check if video-related panels are active
  // activePanel can be a string or PanelType enum, so we compare as strings
  const activePanelStr = String(activePanel)
  const isVideoPanelActive = activePanelStr === 'Video' || activePanelStr === 'Stock Videos'

  const [zoom, setZoom] = useState(80)
  const timelineRef = useRef<HTMLDivElement>(null)
  const tracksAreaRef = useRef<HTMLDivElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null)
  const trackLabelsScrollRef = useRef<HTMLDivElement>(null)
  const tracksScrollRef = useRef<HTMLDivElement>(null)
  // Local state for drag/resize preview (doesn't affect main tracks calculation)
  const [dragPreview, setDragPreview] = useState<Record<string, { start?: number; duration?: number }>>({})
  // Refs for timeline video elements (mini players in clips)
  const timelineVideoRefs = useRef<Record<string, HTMLVideoElement>>({})
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<number>(0)
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Master video element for sequential playback (Canva-style)
  const masterVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Context menu state for right-click on clips
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    clipId: string | null
    trackId: string | null
    x: number
    y: number
  }>({
    visible: false,
    clipId: null,
    trackId: null,
    x: 0,
    y: 0,
  })

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

  // Track canvas object changes to force timeline updates
  const [canvasObjectVersion, setCanvasObjectVersion] = useState(0)

  // Listen to canvas object changes to update timeline
  useEffect(() => {
    if (!canvas) return

    const updateVersion = () => {
      setCanvasObjectVersion(prev => prev + 1)
    }

    // Initialize timeline metadata for newly added objects
    const onObjectAdded = (e: any) => {
      const obj = e.target
      if (!obj) return

      // Skip video objects (handled separately)
      if (obj.metadata?.isVideo || obj.metadata?.videoSrc) return
      // Skip clip placeholder
      if (obj.name === 'clip') return

      // Check if this is a timeline-enabled object type
      const isTimelineObject =
        obj.type === 'StaticText' ||
        obj.type === 'DynamicText' ||
        obj.type === 'textbox' ||
        obj.type === 'text' ||
        obj.type === 'i-text' ||
        obj.type === 'StaticImage' ||
        obj.type === 'image' ||
        obj.type === 'rect' ||
        obj.type === 'circle' ||
        obj.type === 'triangle' ||
        obj.type === 'polygon' ||
        obj.type === 'path'

      if (isTimelineObject) {
        // Generate a stable ID for the object if it doesn't have one
        // This is CRITICAL for drag/resize handlers to find the object
        if (!obj.id) {
          obj.id = `timeline-obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }

        // Also store ID in metadata for fallback matching
        if (!obj.metadata) obj.metadata = {}
        if (!obj.metadata.id) {
          obj.metadata.id = obj.id
        }

        // Initialize timeline metadata if not already set
        if (obj.metadata.timelineStart === undefined) {
          obj.metadata.timelineStart = 0
        }
        if (obj.metadata.timelineDuration === undefined) {
          obj.metadata.timelineDuration = 5 // Default 5 seconds for new elements
        }
      }

      updateVersion()
    }

    // @ts-ignore
    canvas.on?.('object:added', onObjectAdded)
    // @ts-ignore
    canvas.on?.('object:removed', updateVersion)
    // @ts-ignore
    canvas.on?.('object:modified', updateVersion)

    return () => {
      // @ts-ignore
      canvas.off?.('object:added', onObjectAdded)
      // @ts-ignore
      canvas.off?.('object:removed', updateVersion)
      // @ts-ignore
      canvas.off?.('object:modified', updateVersion)
    }
  }, [canvas])

  // Calculate total duration based on all clips/elements (videos, audio, text, images, shapes)
  // Timeline length = last element's end time + small padding
  const calculateTotalDuration = useMemo(() => {
    // Start with video clips
    let maxEndTime = 0
    clips.forEach(clip => {
      const clipEnd = (clip.start || 0) + (clip.duration || 0)
      if (clipEnd > maxEndTime) maxEndTime = clipEnd
    })

    // Also check audio clips
    audioClips.forEach(clip => {
      const clipEnd = (clip.start || 0) + (clip.duration || 0)
      if (clipEnd > maxEndTime) maxEndTime = clipEnd
    })

    // Check canvas objects for text/image/shape timeline end times
    if (canvas) {
      // @ts-ignore
      const objects = canvas.getObjects?.() || []
      objects.forEach((obj: any) => {
        if (obj.metadata?.timelineStart !== undefined) {
          const objEnd = (obj.metadata.timelineStart || 0) + (obj.metadata.timelineDuration || 5)
          if (objEnd > maxEndTime) maxEndTime = objEnd
        }
      })
    }

    // Add 5 seconds padding for breathing room, minimum 15 seconds for usability
    return Math.max(15, maxEndTime + 5)
  }, [clips, audioClips, canvas, canvasObjectVersion])

  const totalDuration = calculateTotalDuration
  const timelineWidth = totalDuration * pixelsPerSecond

  // Helper function to calculate next available start time (end of last video clip)
  // This ensures videos are placed sequentially without overlapping
  const getNextVideoStartTime = useCallback(() => {
    if (clips.length === 0) {
      return 0 // Start at beginning if no clips exist
    }

    // Sort clips by start time to find the last one
    const sortedClips = [...clips].sort((a, b) => (a.start || 0) - (b.start || 0))
    const lastClip = sortedClips[sortedClips.length - 1]

    // Calculate end time of the last clip
    const lastClipEnd = (lastClip.start || 0) + (lastClip.duration || 0)

    return lastClipEnd
  }, [clips])

  // Build tracks from canvas objects - memoized to prevent unnecessary recalculations
  const tracks = useMemo(() => {
    if (!canvas) return []

    const newTracks: TimelineTrack[] = []

    // Video track - always show even if empty
    const videoClips: TimelineClip[] = clips.map((clip) => ({
      id: clip.id,
      name: clip.name || 'Video',
      start: clip.start || 0,
      duration: clip.duration || 60,
      color: '#8b5cf6',
      type: 'video' as TrackType,
      poster: clip.poster, // Include poster for video thumbnail
      videoSrc: clip.src, // Include video source for playback
    }))

    // Always show video track (even if empty) to maintain consistent layout
    newTracks.push({
      id: 'track-video',
      name: 'Video',
      type: 'video',
      clips: videoClips,
    })

    // Get canvas objects
    // @ts-ignore
    const objects = canvas.getObjects?.() || []

    const textClips: TimelineClip[] = []
    const imageClips: TimelineClip[] = []
    const shapeClips: TimelineClip[] = []

    objects.forEach((obj: any, idx: number) => {
      if (!obj || obj.name === 'clip') return

      // Ensure object has a stable ID for drag/resize handlers
      // This is critical for existing objects that may not have gone through onObjectAdded
      if (!obj.id) {
        obj.id = `timeline-obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        if (!obj.metadata) obj.metadata = {}
        obj.metadata.id = obj.id
      }

      const clipId = obj.id
      const clipName = obj.name || obj.text?.substring(0, 15) || obj.type || 'Element'

      if (obj.type === 'StaticText' || obj.type === 'DynamicText' ||
        obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
        // Use timeline metadata if available, otherwise default to full duration
        const timelineStart = obj.metadata?.timelineStart ?? 0
        const timelineDuration = obj.metadata?.timelineDuration ?? totalDuration

        // Use different colors for different text elements (Canva-style)
        const textColors = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b']
        const colorIndex = textClips.length % textColors.length

        textClips.push({
          id: clipId,
          name: clipName,
          start: timelineStart,
          duration: timelineDuration,
          color: textColors[colorIndex],
          type: 'text',
          canvasObjectId: clipId,
        })
      } else if ((obj.type === 'StaticImage' || obj.type === 'image') && !obj.metadata?.isVideo) {
        // Use timeline metadata if available, otherwise default to full duration
        const timelineStart = obj.metadata?.timelineStart ?? 0
        const timelineDuration = obj.metadata?.timelineDuration ?? totalDuration

        // Use different colors for different image elements
        const imageColors = ['#f59e0b', '#ea580c', '#d97706', '#b45309', '#92400e']
        const colorIndex = imageClips.length % imageColors.length

        imageClips.push({
          id: clipId,
          name: clipName,
          start: timelineStart,
          duration: timelineDuration,
          color: imageColors[colorIndex],
          type: 'image',
          canvasObjectId: clipId,
        })
      } else if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle' ||
        obj.type === 'polygon' || obj.type === 'path' || obj.type === 'ellipse' ||
        obj.type === 'line' || obj.type === 'polyline' || obj.type === 'group' ||
        obj.type === 'Frame' || obj.type === 'StaticFrame' || obj.type === 'StaticPath' ||
        obj.type === 'StaticVector' || obj.type?.toLowerCase().includes('shape')) {
        // Shape objects - add to shapes array
        const timelineStart = obj.metadata?.timelineStart ?? 0
        const timelineDuration = obj.metadata?.timelineDuration ?? totalDuration

        // Use pink/purple colors for shapes
        const shapeColors = ['#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#7c3aed']
        const colorIndex = shapeClips.length % shapeColors.length

        shapeClips.push({
          id: clipId,
          name: clipName || obj.type,
          start: timelineStart,
          duration: timelineDuration,
          color: shapeColors[colorIndex],
          type: 'shape' as TrackType,
          canvasObjectId: clipId,
        })
      }
    })

    // Text tracks - each text element gets its own track for better visibility (Canva-style)
    // Different colors for visual distinction
    const textColors = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b']

    if (textClips.length > 0) {
      textClips.forEach((clip, idx) => {
        const color = textColors[idx % textColors.length]
        newTracks.push({
          id: `track-text-${clip.id}`,
          name: idx === 0 ? 'Text' : `Text ${idx + 1}`,
          type: 'text',
          clips: [clip],
        })
      })
    }

    // Image tracks - each image element gets its own track for individual control (Clipchamp-style)
    if (imageClips.length > 0) {
      imageClips.forEach((clip, idx) => {
        newTracks.push({
          id: `track-image-${clip.id}`,
          name: idx === 0 ? 'Image' : `Image ${idx + 1}`,
          type: 'image',
          clips: [clip],
        })
      })
    }

    // Shapes tracks - each shape gets its own track for individual control
    if (shapeClips.length > 0) {
      shapeClips.forEach((clip, idx) => {
        newTracks.push({
          id: `track-shape-${clip.id}`,
          name: idx === 0 ? 'Shape' : `Shape ${idx + 1}`,
          type: 'shape',
          clips: [clip],
        })
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
      // Show empty audio track placeholder to maintain consistent layout
      newTracks.push({
        id: 'track-audio',
        name: 'Audio',
        type: 'audio',
        clips: [],
      })
    }

    return newTracks
  }, [canvas, clips, audioClips, totalDuration, canvasObjectVersion])

  // Synchronize scrolling between track labels and tracks area
  useEffect(() => {
    const tracksScroll = tracksScrollRef.current
    const labelsScroll = trackLabelsScrollRef.current

    if (!tracksScroll || !labelsScroll) return

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement
      if (target === tracksScroll) {
        // Sync labels panel scroll with tracks scroll
        labelsScroll.scrollTop = tracksScroll.scrollTop
      } else if (target === labelsScroll) {
        // Sync tracks scroll with labels panel scroll
        tracksScroll.scrollTop = labelsScroll.scrollTop
      }
    }

    tracksScroll.addEventListener('scroll', handleScroll, { passive: true })
    labelsScroll.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      tracksScroll.removeEventListener('scroll', handleScroll)
      labelsScroll.removeEventListener('scroll', handleScroll)
    }
  }, [tracks.length])

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

  // ============ CANVA-STYLE SEQUENTIAL VIDEO PLAYBACK ============

  // Create master video element for sequential playback
  useEffect(() => {
    if (!masterVideoRef.current) {
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = false
      masterVideoRef.current = video
    }
    return () => {
      if (masterVideoRef.current) {
        masterVideoRef.current.pause()
        masterVideoRef.current.src = ''
        masterVideoRef.current = null
      }
    }
  }, [])

  // Get active clip based on currentTime - memoized for performance
  // If multiple clips overlap, prioritize the first one (lowest start time)
  const activeClip = useMemo(() => {
    if (clips.length === 0) return null

    // Find all clips that contain currentTime
    const activeClips = clips.filter(clip => {
      const clipStart = clip.start || 0
      const clipEnd = clipStart + (clip.duration || 0)
      return currentTime >= clipStart && currentTime < clipEnd
    })

    if (activeClips.length === 0) return null

    // If multiple clips overlap, return the one with the lowest start time (first added)
    const sortedActiveClips = activeClips.sort((a, b) => (a.start || 0) - (b.start || 0))
    return sortedActiveClips[0]
  }, [clips, currentTime])

  // Keep getActiveClip for backward compatibility but use memoized value
  const getActiveClip = useCallback(() => activeClip, [activeClip])

  // Update master video when active clip changes
  useEffect(() => {
    const activeClip = getActiveClip()
    const masterVideo = masterVideoRef.current

    if (!masterVideo || !activeClip) {
      // Just pause the video when no active clip, don't clear source
      // This prevents the start/stop loop issue
      if (masterVideo && !masterVideo.paused) {
        masterVideo.pause()
      }
      return
    }

    // Only update if clip changed
    if (masterVideo.src !== activeClip.src) {
      setIsTransitioning(true)

      // Fade out canvas
      if (canvas) {
        // @ts-ignore
        const upperCanvas = canvas.upperCanvasEl
        if (upperCanvas) {
          upperCanvas.style.transition = 'opacity 0.25s ease'
          upperCanvas.style.opacity = '0'
        }
      }

      // Switch video after fade out
      setTimeout(() => {
        masterVideo.src = activeClip.src
        masterVideo.load()

        // Calculate video time relative to clip start
        const clipStart = activeClip.start || 0
        const videoTime = Math.max(0, currentTime - clipStart)

        masterVideo.onloadeddata = () => {
          masterVideo.currentTime = Math.min(videoTime, masterVideo.duration || activeClip.duration)

          if (isPlaying) {
            masterVideo.play().catch(err => {
              if (err.name !== 'AbortError') {
                console.error('Video play error:', err)
              }
            })
          }
        }

        // Fade in canvas
        setTimeout(() => {
          if (canvas) {
            // @ts-ignore
            const upperCanvas = canvas.upperCanvasEl
            if (upperCanvas) {
              upperCanvas.style.opacity = '1'
            }
          }
          setIsTransitioning(false)
        }, 50)
      }, 250)
    } else if (isPlaying && masterVideo.paused) {
      // Resume if already loaded
      const clipStart = activeClip.start || 0
      const videoTime = Math.max(0, currentTime - clipStart)
      masterVideo.currentTime = Math.min(videoTime, masterVideo.duration || activeClip.duration)
      masterVideo.play().catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Video play error:', err)
        }
      })
    }
  }, [getActiveClip, isPlaying, currentTime, canvas])

  // Handle video ended - switch to next clip automatically
  useEffect(() => {
    const masterVideo = masterVideoRef.current
    if (!masterVideo) return

    const handleEnded = () => {
      const activeClip = getActiveClip()
      if (!activeClip) {
        // If no active clip, try to start from first clip
        if (clips.length > 0 && isPlaying) {
          const sortedClips = [...clips].sort((a, b) => (a.start || 0) - (b.start || 0))
          const firstClip = sortedClips[0]
          setActiveClip(firstClip.id)
          setCurrentTime(firstClip.start || 0)
        }
        return
      }

      // Sort clips by start time to find the next one
      const sortedClips = [...clips].sort((a, b) => (a.start || 0) - (b.start || 0))
      const currentIndex = sortedClips.findIndex(c => c.id === activeClip.id)
      const nextIndex = currentIndex + 1

      if (nextIndex < sortedClips.length) {
        // Switch to next clip (by start time order) and continue playing
        const nextClip = sortedClips[nextIndex]
        setActiveClip(nextClip.id)
        setCurrentTime(nextClip.start || 0)
        // Continue playing automatically - the video will start via the activeClip change effect
      } else {
        // All clips finished
        setIsPlaying(false)
        setCurrentTime(totalDuration)
      }
    }

    masterVideo.addEventListener('ended', handleEnded)
    return () => {
      masterVideo.removeEventListener('ended', handleEnded)
    }
  }, [clips, getActiveClip, setActiveClip, setCurrentTime, totalDuration, setIsPlaying, isPlaying])

  // Sync master video playback with timeline - optimized with requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      // When paused, sync once
      const masterVideo = masterVideoRef.current
      if (masterVideo && activeClip) {
        const clipStart = activeClip.start || 0
        const videoTime = Math.max(0, currentTime - clipStart)
        const videoDuration = masterVideo.duration || activeClip.duration
        if (videoTime < videoDuration) {
          masterVideo.currentTime = videoTime
        }
        if (!masterVideo.paused) {
          masterVideo.pause()
        }
      }
      return
    }

    // If there's no active clip, don't run the sync loop - just pause and exit
    // This prevents CPU usage when video shouldn't be playing
    if (!activeClip) {
      const masterVideo = masterVideoRef.current
      if (masterVideo && !masterVideo.paused) {
        masterVideo.pause()
      }
      return // Don't start animation loop when no video to play
    }

    // Use requestAnimationFrame for smooth updates during playback
    let animationId: number
    let lastSyncTime = 0
    const SYNC_INTERVAL = 83 // Sync every 83ms (~12fps) for better performance balance

    const syncVideos = () => {
      const now = performance.now()
      const masterVideo = masterVideoRef.current

      if (!masterVideo || !activeClip) {
        // Stop the loop if no active clip anymore
        return
      }

      const clipStart = activeClip.start || 0
      const videoTime = Math.max(0, currentTimeRef.current - clipStart)
      const videoDuration = masterVideo.duration || activeClip.duration

      // Check if we're still within the active clip's time range
      const clipEnd = clipStart + (activeClip.duration || 0)
      if (currentTimeRef.current < clipStart || currentTimeRef.current >= clipEnd) {
        // Outside clip range, pause and stop
        if (!masterVideo.paused) {
          masterVideo.pause()
        }
        return
      }

      // Sync master video time if drifted (throttled)
      if (now - lastSyncTime > SYNC_INTERVAL) {
        if (Math.abs(masterVideo.currentTime - videoTime) > 0.15 && videoTime < videoDuration) {
          masterVideo.currentTime = videoTime
        }

        if (masterVideo.paused) {
          masterVideo.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Video play error:', err)
            }
          })
        }
        lastSyncTime = now
      }

      // Only sync the active timeline mini video player (optimized)
      if (activeClip && timelineVideoRefs.current[activeClip.id]) {
        const videoEl = timelineVideoRefs.current[activeClip.id]
        const expectedTime = Math.max(0, currentTimeRef.current - clipStart)

        if (expectedTime >= 0 && expectedTime <= activeClip.duration) {
          // Only update if significantly drifted (reduce updates)
          if (Math.abs(videoEl.currentTime - expectedTime) > 0.2) {
            videoEl.currentTime = expectedTime
          }
          if (videoEl.paused) {
            videoEl.play().catch(() => { }) // Ignore errors
          }
        }
      }

      // Pause inactive clips (only check occasionally)
      if (now - lastSyncTime > SYNC_INTERVAL) {
        Object.entries(timelineVideoRefs.current).forEach(([clipId, videoEl]) => {
          if (clipId !== activeClip?.id && !videoEl.paused) {
            videoEl.pause()
            videoEl.currentTime = 0
          }
        })
      }

      animationId = requestAnimationFrame(syncVideos)
    }

    animationId = requestAnimationFrame(syncVideos)
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isPlaying, activeClip])

  // Update canvas to show/hide video objects based on timeline currentTime
  // Videos appear/disappear based on their clip start and duration
  // This runs both during playback AND when scrubbing/seeking to sync visibility
  const lastActiveClipIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!canvas) return

    // @ts-ignore
    const objects = canvas.getObjects?.() || []
    let needsRender = false

    objects.forEach((obj: any) => {
      if (obj.metadata?.isVideo || obj.metadata?.videoSrc) {
        // Find the corresponding video clip using multiple ID matching strategies
        const objId = obj.metadata?.id || obj.id
        const objSrc = obj.metadata?.videoSrc || obj.metadata?.src

        // Try to find clip by ID first, then by source URL
        let clip = clips.find(c => c.id === objId)
        if (!clip && objSrc) {
          clip = clips.find(c => c.src === objSrc)
        }

        // Store original opacity if not stored
        if (obj._originalOpacity === undefined) {
          obj._originalOpacity = obj.opacity ?? 1
        }

        // If no matching clip found, hide the video entirely
        if (!clip) {
          if (obj.opacity !== 0) {
            obj.set('opacity', 0)
            obj.dirty = true
            needsRender = true
          }
          return
        }

        const clipStart = clip.start || 0
        const clipEnd = clipStart + (clip.duration || 0)

        // Check if video should be visible at current time (no fade during scrubbing, instant show/hide)
        let targetOpacity = 0

        if (currentTime >= clipStart && currentTime < clipEnd) {
          targetOpacity = obj._originalOpacity
        } else {
          targetOpacity = 0
        }

        const currentOpacity = obj.opacity ?? 1
        if (Math.abs(currentOpacity - targetOpacity) > 0.01) {
          obj.set('opacity', targetOpacity)
          obj.dirty = true
          needsRender = true
        }

        // Update active clip based on current time (for video playback)
        if (currentTime >= clipStart && currentTime < clipEnd) {
          if (lastActiveClipIdRef.current !== clip.id) {
            lastActiveClipIdRef.current = clip.id
            setActiveClip(clip.id)
          }
        }
      }
    })

    // Only render if something changed
    if (needsRender) {
      canvas.renderAll()
    }
  }, [canvas, clips, currentTime, setActiveClip])

  // ============ TIME-BASED CANVAS OBJECT VISIBILITY (CLIPCHAMP STYLE) ============
  // Sync canvas object visibility with timeline currentTime
  // Objects appear/disappear based on their timelineStart and timelineDuration metadata
  // This runs both during playback AND when scrubbing for consistent visibility sync
  const FADE_DURATION = 0.2 // 200ms fade in/out for smooth transitions

  useEffect(() => {
    if (!canvas) return

    // @ts-ignore
    const objects = canvas.getObjects?.() || []
    let needsRender = false

    objects.forEach((obj: any) => {
      // Skip video objects (they have separate visibility logic)
      if (obj.metadata?.isVideo || obj.metadata?.videoSrc) return
      // Skip clip placeholder
      if (obj.name === 'clip') return

      // Check if this is a timeline-enabled object (text, image, shape)
      const isTimelineObject =
        obj.type === 'StaticText' ||
        obj.type === 'DynamicText' ||
        obj.type === 'textbox' ||
        obj.type === 'text' ||
        obj.type === 'i-text' ||
        obj.type === 'StaticImage' ||
        obj.type === 'image' ||
        obj.type === 'rect' ||
        obj.type === 'circle' ||
        obj.type === 'triangle' ||
        obj.type === 'polygon' ||
        obj.type === 'path' ||
        obj.type === 'ellipse' ||
        obj.type === 'line' ||
        obj.type === 'polyline' ||
        obj.type === 'group' ||
        obj.type === 'Frame' ||
        obj.type === 'StaticFrame' ||
        obj.type === 'StaticPath' ||
        obj.type === 'StaticVector' ||
        obj.type?.toLowerCase().includes('shape')

      if (!isTimelineObject) return

      // Store original opacity if not already stored (for restore when playback stops)
      if (obj._originalOpacity === undefined) {
        obj._originalOpacity = obj.opacity ?? 1
      }

      // Get timeline metadata (default to full timeline if not set)
      const timelineStart = obj.metadata?.timelineStart ?? 0
      const timelineDuration = obj.metadata?.timelineDuration ?? totalDuration
      const timelineEnd = timelineStart + timelineDuration

      // Calculate target opacity with fade transitions
      let targetOpacity = 0

      // Fade timing boundaries
      const fadeInStart = timelineStart
      const fadeInEnd = timelineStart + FADE_DURATION
      const fadeOutStart = timelineEnd - FADE_DURATION
      const fadeOutEnd = timelineEnd

      if (currentTime < fadeInStart || currentTime >= fadeOutEnd) {
        // Completely outside the visible range
        targetOpacity = 0
      } else if (currentTime >= fadeInEnd && currentTime < fadeOutStart) {
        // Fully visible (between fade in and fade out)
        targetOpacity = obj._originalOpacity
      } else if (currentTime >= fadeInStart && currentTime < fadeInEnd) {
        // Fading in
        const fadeProgress = Math.min(1, (currentTime - fadeInStart) / FADE_DURATION)
        targetOpacity = fadeProgress * obj._originalOpacity
      } else if (currentTime >= fadeOutStart && currentTime < fadeOutEnd) {
        // Fading out
        const fadeProgress = Math.max(0, (fadeOutEnd - currentTime) / FADE_DURATION)
        targetOpacity = fadeProgress * obj._originalOpacity
      }

      // Only update if opacity changed significantly (optimization)
      const currentOpacity = obj.opacity ?? 1
      if (Math.abs(currentOpacity - targetOpacity) > 0.01) {
        obj.set('opacity', targetOpacity)
        obj.dirty = true
        needsRender = true
      }
    })

    // Only render if something changed
    if (needsRender) {
      canvas.renderAll()
    }
  }, [canvas, currentTime, totalDuration])

  // NOTE: We intentionally do NOT restore opacity when paused
  // Visibility is ALWAYS based on currentTime, even when scrubbing while paused
  // This gives a Clipchamp-like preview where you can see what's at the current playhead position

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

  // Handle toggle play - ALWAYS start from the beginning of timeline (0 seconds)
  // This allows videos to appear/disappear based on their timeline position
  const handleTogglePlay = useCallback(() => {
    if (!isPlaying) {
      // Always start from the beginning of the timeline
      setCurrentTime(0)

      // Clear active clip - it will be set based on currentTime during playback
      // The video visibility effect will handle showing the right video
    }
    togglePlayback()
  }, [togglePlayback, isPlaying, setCurrentTime])

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
    // Close context menu if open
    if (contextMenu.visible) {
      setContextMenu({ visible: false, clipId: null, trackId: null, x: 0, y: 0 })
    }

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

  // Handle right-click on clip to show context menu
  const handleClipContextMenu = (clipId: string, trackId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Calculate position, adjusting if near screen edges
    const menuWidth = 100
    const menuHeight = 36
    let x = e.clientX
    let y = e.clientY

    // Adjust if too close to right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }

    // Adjust if too close to bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }

    setContextMenu({
      visible: true,
      clipId,
      trackId,
      x,
      y,
    })
  }

  // Handle context menu delete action
  const handleContextMenuDelete = () => {
    if (!contextMenu.clipId || !contextMenu.trackId) return

    const track = tracks.find(t => t.id === contextMenu.trackId)
    const clip = track?.clips.find(c => c.id === contextMenu.clipId)

    if (!clip) return

    if (clip.type === 'audio') {
      removeAudioClip(clip.id)
    } else if (clip.type === 'video') {
      removeClip(clip.id)
      // Also remove from canvas if it exists
      if (canvas) {
        // @ts-ignore
        const objects = canvas.getObjects?.() || []
        const obj = objects.find((o: any) => o.id === clip.id || o.metadata?.id === clip.id)
        if (obj) {
          // @ts-ignore
          canvas.remove?.(obj)
          // @ts-ignore
          canvas.requestRenderAll?.()
        }
      }
    } else if (clip.canvasObjectId && canvas) {
      // Remove canvas object (image/text)
      // @ts-ignore
      const objects = canvas.getObjects?.() || []
      const obj = objects.find((o: any) => o.id === clip.canvasObjectId)
      if (obj) {
        // @ts-ignore
        canvas.remove?.(obj)
        // @ts-ignore
        canvas.requestRenderAll?.()
      }
    }

    clearSelection()
    setContextMenu({ visible: false, clipId: null, trackId: null, x: 0, y: 0 })
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-context-menu]')) {
        setContextMenu({ visible: false, clipId: null, trackId: null, x: 0, y: 0 })
      }
    }

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu.visible])

  // Close context menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu.visible) {
        setContextMenu({ visible: false, clipId: null, trackId: null, x: 0, y: 0 })
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [contextMenu.visible])

  // Track if we're dragging to prevent click events
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null)
  const hasDraggedRef = useRef(false)

  // Drag handlers
  const handleDragStart = (clipId: string, trackId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const track = tracks.find(t => t.id === trackId)
    const clip = track?.clips.find(c => c.id === clipId)
    if (!clip) return

    // Store initial mouse position to detect if user actually dragged
    dragStartPositionRef.current = { x: e.clientX, y: e.clientY }
    hasDraggedRef.current = false

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

    // Store drag preview for visual feedback
    setDragPreview({ [dragging.clipId]: { start: newStart } })
  }, [dragging, pixelsPerSecond])

  const handleDragEnd = useCallback(() => {
    if (dragging) {
      // Get the preview position
      const preview = dragPreview[dragging.clipId]
      const newStart = preview?.start ?? dragging.originalStart

      // Sync clip position change back to context
      const track = tracks.find(t => t.id === dragging.trackId)
      const clip = track?.clips.find(c => c.id === dragging.clipId)

      if (clip) {
        if (track?.type === 'audio') {
          updateAudioClip(clip.id, { start: newStart })
        } else if (track?.type === 'video') {
          // Update video clip position in context
          updateClip(clip.id, { start: newStart, end: newStart + clip.duration })
        } else if (track?.type === 'text' && clip.canvasObjectId && canvas) {
          // Update text track position in canvas metadata
          // @ts-ignore
          const objects = canvas.getObjects?.() || []
          const obj = objects.find((o: any) => o.id === clip.canvasObjectId || o.metadata?.id === clip.canvasObjectId) as any
          if (obj && obj.metadata) {
            obj.metadata.timelineStart = newStart
            obj.dirty = true
            // @ts-ignore
            canvas.requestRenderAll?.()
            // Trigger object:modified event to force tracks recalculation
            // @ts-ignore
            canvas.fire?.('object:modified', { target: obj })
          }
        } else if (track?.type === 'image' && clip.canvasObjectId && canvas) {
          // Update image track position in canvas metadata
          // @ts-ignore
          const objects = canvas.getObjects?.() || []
          const obj = objects.find((o: any) => o.id === clip.canvasObjectId || o.metadata?.id === clip.canvasObjectId) as any
          if (obj) {
            // Initialize metadata if not exists
            if (!obj.metadata) obj.metadata = {}
            obj.metadata.timelineStart = newStart
            // Also ensure duration is set
            if (obj.metadata.timelineDuration === undefined) {
              obj.metadata.timelineDuration = clip.duration
            }
            obj.dirty = true
            // @ts-ignore
            canvas.requestRenderAll?.()
            // @ts-ignore
            canvas.fire?.('object:modified', { target: obj })
          }
        } else if (track?.type === 'shape' && clip.canvasObjectId && canvas) {
          // Update shape track position in canvas metadata
          // @ts-ignore
          const objects = canvas.getObjects?.() || []
          const obj = objects.find((o: any) => o.id === clip.canvasObjectId || o.metadata?.id === clip.canvasObjectId) as any
          if (obj) {
            // Initialize metadata if not exists
            if (!obj.metadata) obj.metadata = {}
            obj.metadata.timelineStart = newStart
            // Also ensure duration is set
            if (obj.metadata.timelineDuration === undefined) {
              obj.metadata.timelineDuration = clip.duration
            }
            obj.dirty = true
            // @ts-ignore
            canvas.requestRenderAll?.()
            // @ts-ignore
            canvas.fire?.('object:modified', { target: obj })
          }
        }
      }
    }
    setDragging(null)
    setDragPreview({}) // Clear preview
    if (dragStartPositionRef.current) {
      dragStartPositionRef.current = null
    }
    hasDraggedRef.current = false
  }, [dragging, tracks, dragPreview, updateAudioClip, updateClip, canvas])

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

    // Store resize preview for visual feedback
    if (resizing.handle === 'left') {
      const newStart = Math.max(0, resizing.originalStart + deltaTime)
      const newDuration = Math.max(1, resizing.originalDuration - deltaTime)
      setDragPreview({ [resizing.clipId]: { start: newStart, duration: newDuration } })
    } else {
      const newDuration = Math.max(1, resizing.originalDuration + deltaTime)
      setDragPreview({ [resizing.clipId]: { duration: newDuration } })
    }
  }, [resizing, pixelsPerSecond])

  const handleResizeEnd = useCallback(() => {
    if (resizing) {
      // Get the preview values
      const preview = dragPreview[resizing.clipId]
      const newStart = preview?.start ?? resizing.originalStart
      const newDuration = preview?.duration ?? resizing.originalDuration

      // Sync clip changes back to context
      const track = tracks.find(t => t.id === resizing.trackId)
      const clip = track?.clips.find(c => c.id === resizing.clipId)

      if (clip) {
        if (track?.type === 'audio') {
          updateAudioClip(clip.id, { start: newStart, duration: newDuration })
        } else if (track?.type === 'video') {
          // Update video clip duration in context
          updateClip(clip.id, { start: newStart, duration: newDuration, end: newStart + newDuration })
        } else if (track?.type === 'text' && clip.canvasObjectId && canvas) {
          // Update text track duration in canvas metadata
          // @ts-ignore
          const objects = canvas.getObjects?.() || []
          const obj = objects.find((o: any) => o.id === clip.canvasObjectId) as any
          if (obj && obj.metadata) {
            obj.metadata.timelineStart = newStart
            obj.metadata.timelineDuration = newDuration
            obj.dirty = true
            // @ts-ignore
            canvas.requestRenderAll?.()
            // Trigger object:modified event to force tracks recalculation
            // @ts-ignore
            canvas.fire?.('object:modified', { target: obj })
          }
        } else if (track?.type === 'image' && clip.canvasObjectId && canvas) {
          // Update image track duration in canvas metadata
          // @ts-ignore
          const objects = canvas.getObjects?.() || []
          const obj = objects.find((o: any) => o.id === clip.canvasObjectId || o.metadata?.id === clip.canvasObjectId) as any
          if (obj) {
            // Initialize metadata if not exists
            if (!obj.metadata) obj.metadata = {}
            obj.metadata.timelineStart = newStart
            obj.metadata.timelineDuration = newDuration
            obj.dirty = true
            // @ts-ignore
            canvas.requestRenderAll?.()
            // @ts-ignore
            canvas.fire?.('object:modified', { target: obj })
          }
        } else if (track?.type === 'shape' && clip.canvasObjectId && canvas) {
          // Update shape track duration in canvas metadata
          // @ts-ignore
          const objects = canvas.getObjects?.() || []
          const obj = objects.find((o: any) => o.id === clip.canvasObjectId || o.metadata?.id === clip.canvasObjectId) as any
          if (obj) {
            // Initialize metadata if not exists
            if (!obj.metadata) obj.metadata = {}
            obj.metadata.timelineStart = newStart
            obj.metadata.timelineDuration = newDuration
            obj.dirty = true
            // @ts-ignore
            canvas.requestRenderAll?.()
            // @ts-ignore
            canvas.fire?.('object:modified', { target: obj })
          }
        }
      }
    }
    setResizing(null)
    setDragPreview({}) // Clear preview
  }, [resizing, tracks, dragPreview, updateAudioClip, updateClip, canvas])

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

  // Handle media file upload (images/videos)
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    const url = URL.createObjectURL(file)

    if (file.type.startsWith('video/')) {
      // Handle video upload
      const video = document.createElement('video')
      video.src = url
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        const videoWidth = video.videoWidth || 1920
        const videoHeight = video.videoHeight || 1080
        const clipDuration = video.duration || 1
        const clipId = `video-${Date.now()}`

        // Seek to get a poster frame
        video.currentTime = 0.1
        video.onseeked = () => {
          const canvas = document.createElement('canvas')
          canvas.width = videoWidth
          canvas.height = videoHeight
          const ctx = canvas.getContext('2d')
          let posterUrl = ''
          if (ctx) {
            ctx.drawImage(video, 0, 0)
            posterUrl = canvas.toDataURL('image/png')
          }

          // Calculate proper sizing for canvas
          const frameWidth = 900
          const frameHeight = 1200
          let targetWidth = videoWidth
          let targetHeight = videoHeight
          let scaleX = 1
          let scaleY = 1

          const maxWidth = frameWidth * 0.8
          const maxHeight = frameHeight * 0.6

          if (targetWidth > maxWidth || targetHeight > maxHeight) {
            const widthRatio = maxWidth / targetWidth
            const heightRatio = maxHeight / targetHeight
            const scaleRatio = Math.min(widthRatio, heightRatio)
            scaleX = scaleRatio
            scaleY = scaleRatio
            targetWidth = videoWidth * scaleX
            targetHeight = videoHeight * scaleY
          }

          const left = (frameWidth - targetWidth) / 2
          const top = (frameHeight - targetHeight) / 2

          editor.add({
            type: 'StaticImage',
            metadata: {
              src: posterUrl || url,
              videoSrc: url,
              name: file.name,
              duration: clipDuration,
              id: clipId,
              isVideo: true,
            },
            width: videoWidth,
            height: videoHeight,
            left,
            top,
            scaleX,
            scaleY,
            opacity: 1,
          })

          // Calculate start time to place video sequentially after existing videos
          const startTime = getNextVideoStartTime()

          addClip({
            id: clipId,
            name: file.name,
            src: url,
            duration: clipDuration,
            start: startTime,
            end: startTime + clipDuration,
            poster: posterUrl,
          })

          setActiveClip(clipId)
        }
      }
    } else if (file.type.startsWith('image/')) {
      // Handle image upload
      const img = new Image()
      img.src = url
      img.onload = () => {
        const clipId = `image-${Date.now()}`
        const frameWidth = 900
        const frameHeight = 1200
        let targetWidth = img.width
        let targetHeight = img.height
        let scaleX = 1
        let scaleY = 1

        const maxWidth = frameWidth * 0.8
        const maxHeight = frameHeight * 0.6

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const widthRatio = maxWidth / targetWidth
          const heightRatio = maxHeight / targetHeight
          const scaleRatio = Math.min(widthRatio, heightRatio)
          scaleX = scaleRatio
          scaleY = scaleRatio
          targetWidth = img.width * scaleX
          targetHeight = img.height * scaleY
        }

        const left = (frameWidth - targetWidth) / 2
        const top = (frameHeight - targetHeight) / 2

        editor.add({
          type: 'StaticImage',
          metadata: {
            src: url,
            name: file.name,
            id: clipId,
          },
          width: img.width,
          height: img.height,
          left,
          top,
          scaleX,
          scaleY,
          opacity: 1,
        })
      }
    }

    // Reset input
    if (mediaInputRef.current) {
      mediaInputRef.current.value = ''
    }
    setOpenMenuTrackId(null)
  }

  // Handle plus icon click
  const handlePlusClick = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const button = e.currentTarget as HTMLElement
    const rect = button.getBoundingClientRect()
    const trackRow = button.closest('[data-track-row]') as HTMLElement
    if (trackRow) {
      const trackRect = trackRow.getBoundingClientRect()
      const relativeTop = rect.top - trackRect.top
      setMenuPosition(relativeTop - 8)
    }
    setOpenMenuTrackId(openMenuTrackId === trackId ? null : trackId)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-media-menu]') && !target.closest('[data-plus-button]')) {
        setOpenMenuTrackId(null)
      }
    }

    if (openMenuTrackId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuTrackId])

  // Handle menu item clicks
  const handleMenuClick = (action: 'uploads' | 'stock-videos' | 'stock-photos') => {
    if (action === 'uploads') {
      mediaInputRef.current?.click()
    } else if (action === 'stock-videos') {
      // Open stock videos panel (Canva-style)
      setActivePanel('Stock Videos' as any)
      setOpenMenuTrackId(null)
    } else if (action === 'stock-photos') {
      // Open stock photos panel (Canva-style)
      setActivePanel('Stock Photos' as any)
      setOpenMenuTrackId(null)
    } else if (action === 'blank') {
      // Add blank canvas element
      if (editor) {
        const clipId = `blank-${Date.now()}`
        editor.add({
          type: 'rect',
          fill: '#ffffff',
          width: 200,
          height: 200,
          left: 350,
          top: 500,
          opacity: 1,
        })
      }
      setOpenMenuTrackId(null)
    }
  }

  // Handle drag and drop for media files
  const handleDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTrackId(trackId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTrackId(null)
  }

  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTrackId(null)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    const url = URL.createObjectURL(file)

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.src = url
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        const videoWidth = video.videoWidth || 1920
        const videoHeight = video.videoHeight || 1080
        const clipDuration = video.duration || 1
        const clipId = `video-${Date.now()}`

        video.currentTime = 0.1
        video.onseeked = () => {
          const canvas = document.createElement('canvas')
          canvas.width = videoWidth
          canvas.height = videoHeight
          const ctx = canvas.getContext('2d')
          let posterUrl = ''
          if (ctx) {
            ctx.drawImage(video, 0, 0)
            posterUrl = canvas.toDataURL('image/png')
          }

          const frameWidth = 900
          const frameHeight = 1200
          let targetWidth = videoWidth
          let targetHeight = videoHeight
          let scaleX = 1
          let scaleY = 1

          const maxWidth = frameWidth * 0.8
          const maxHeight = frameHeight * 0.6

          if (targetWidth > maxWidth || targetHeight > maxHeight) {
            const widthRatio = maxWidth / targetWidth
            const heightRatio = maxHeight / targetHeight
            const scaleRatio = Math.min(widthRatio, heightRatio)
            scaleX = scaleRatio
            scaleY = scaleRatio
            targetWidth = videoWidth * scaleX
            targetHeight = videoHeight * scaleY
          }

          const left = (frameWidth - targetWidth) / 2
          const top = (frameHeight - targetHeight) / 2

          if (editor) {
            editor.add({
              type: 'StaticImage',
              metadata: {
                src: posterUrl || url,
                videoSrc: url,
                name: file.name,
                duration: clipDuration,
                id: clipId,
                isVideo: true,
              },
              width: videoWidth,
              height: videoHeight,
              left,
              top,
              scaleX,
              scaleY,
              opacity: 1,
            })

            // Calculate start time to place video sequentially after existing videos
            const startTime = getNextVideoStartTime()

            addClip({
              id: clipId,
              name: file.name,
              src: url,
              duration: clipDuration,
              start: startTime,
              end: startTime + clipDuration,
              poster: posterUrl,
            })

            setActiveClip(clipId)
          }
        }
      }
    } else if (file.type.startsWith('image/')) {
      const img = new Image()
      img.src = url
      img.onload = () => {
        if (editor) {
          const clipId = `image-${Date.now()}`
          const frameWidth = 900
          const frameHeight = 1200
          let targetWidth = img.width
          let targetHeight = img.height
          let scaleX = 1
          let scaleY = 1

          const maxWidth = frameWidth * 0.8
          const maxHeight = frameHeight * 0.6

          if (targetWidth > maxWidth || targetHeight > maxHeight) {
            const widthRatio = maxWidth / targetWidth
            const heightRatio = maxHeight / targetHeight
            const scaleRatio = Math.min(widthRatio, heightRatio)
            scaleX = scaleRatio
            scaleY = scaleRatio
            targetWidth = img.width * scaleX
            targetHeight = img.height * scaleY
          }

          const left = (frameWidth - targetWidth) / 2
          const top = (frameHeight - targetHeight) / 2

          editor.add({
            type: 'StaticImage',
            metadata: {
              src: url,
              name: file.name,
              id: clipId,
            },
            width: img.width,
            height: img.height,
            left,
            top,
            scaleX,
            scaleY,
            opacity: 1,
          })
        }
      }
    } else if (file.type.startsWith('audio/')) {
      const audio = new Audio(url)
      audio.addEventListener('loadedmetadata', () => {
        addAudioClip({
          id: `audio-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          src: url,
          duration: audio.duration,
          start: currentTime,
          volume: 1,
        })
      })
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

        // Delete all selected clips (audio, video, image, text)
        selectedClipIds.forEach(clipId => {
          // Check if it's an audio clip
          const isAudioClip = audioClips.some(ac => ac.id === clipId)
          if (isAudioClip) {
            removeAudioClip(clipId)
          } else {
            // Check if it's a video clip
            const isVideoClip = clips.some(c => c.id === clipId)
            if (isVideoClip) {
              removeClip(clipId)
              // Also remove from canvas if it exists
              if (canvas) {
                // @ts-ignore
                const objects = canvas.getObjects?.() || []
                const obj = objects.find((o: any) => o.id === clipId || o.metadata?.id === clipId)
                if (obj) {
                  // @ts-ignore
                  canvas.remove?.(obj)
                  // @ts-ignore
                  canvas.requestRenderAll?.()
                }
              }
            } else {
              // Check if it's a canvas object (image/text)
              if (canvas) {
                // @ts-ignore
                const objects = canvas.getObjects?.() || []
                const obj = objects.find((o: any) => o.id === clipId)
                if (obj) {
                  // @ts-ignore
                  canvas.remove?.(obj)
                  // @ts-ignore
                  canvas.requestRenderAll?.()
                }
              }
            }
          }
        })

        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTimelineOpen, selectedClipIds, audioClips, clips, removeAudioClip, removeClip, clearSelection, canvas])

  // Check if there's any video/animation content on canvas
  const hasVideoContent = clips.length > 0 || audioClips.length > 0

  // Also check canvas for video objects (in case clips aren't synced)
  const hasCanvasVideoContent = useMemo(() => {
    if (!canvas) return false
    // @ts-ignore
    const objects = canvas.getObjects?.() || []
    return objects.some((obj: any) =>
      obj.metadata?.isVideo ||
      obj.metadata?.videoSrc ||
      (obj.metadata?.animation && obj.metadata.animation !== 'none')
    )
  }, [canvas, clips.length]) // Re-check when clips change

  // Only show timeline if there's video/animation content
  const shouldShowTimeline = hasVideoContent || hasCanvasVideoContent

  if (!shouldShowTimeline) {
    return null
  }

  if (!isTimelineOpen) {

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
    <TimelineShell $isVideoPanelActive={isVideoPanelActive}>
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
        <TrackLabelsPanel ref={trackLabelsScrollRef}>
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
          <HiddenInput
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaUpload}
          />
          <HiddenInput
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleMediaUpload}
          />
        </TrackLabelsPanel>

        <TracksScrollContainer ref={tracksScrollRef}>
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
            <Playhead
              $left={playheadPosition}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const timelineEl = timelineRef.current
                if (!timelineEl) return

                const timelineRect = timelineEl.getBoundingClientRect()

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const x = moveEvent.clientX - timelineRect.left
                  const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration))
                  handleSeek(time)
                }

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }

                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}
            />
          </TimeRuler>

          <TracksArea
            ref={tracksAreaRef}
            onClick={handleTimelineClick}
            style={{ width: `${timelineWidth}px`, minHeight: `${tracks.length * 52}px` }}
          >
            {tracks.map(track => (
              <TrackRow
                key={track.id}
                $type={track.type}
                data-track-row
                onDragOver={(e) => handleDragOver(e, track.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, track.id)}
                style={{
                  background: dragOverTrackId === track.id ? '#f0f9ff' : undefined,
                  borderColor: dragOverTrackId === track.id ? '#3b82f6' : undefined,
                }}
              >
                {/* Plus icon button - completely removed from audio tracks */}
                {track.type !== 'audio' && (
                  <AddMediaButton
                    data-plus-button
                    onClick={(e) => handlePlusClick(track.id, e)}
                    title="Add media"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </AddMediaButton>
                )}

                {/* Media menu popup */}
                {openMenuTrackId === track.id && (
                  <MediaMenu $visible={true} $top={menuPosition} data-media-menu>
                    <MenuItem onClick={() => handleMenuClick('uploads')}>
                      <MenuIcon $color="#f97316">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </MenuIcon>
                      <span>Uploads</span>
                    </MenuItem>
                    <MenuItem onClick={() => handleMenuClick('stock-videos')}>
                      <MenuIcon $color="#14b8a6">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </MenuIcon>
                      <span>Stock videos</span>
                    </MenuItem>
                    <MenuItem onClick={() => handleMenuClick('stock-photos')}>
                      <MenuIcon $color="#3b82f6">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </MenuIcon>
                      <span>Stock photos</span>
                    </MenuItem>

                  </MediaMenu>
                )}

                {track.clips.map(clip => {
                  // Use drag preview values if available for visual feedback
                  const preview = dragPreview[clip.id]
                  const displayStart = preview?.start ?? clip.start
                  const displayDuration = preview?.duration ?? clip.duration

                  // Check if this clip is currently playing
                  const isClipPlaying = isPlaying && clip.id === activeClipId && clip.type === 'video'

                  return (
                    <TrackClip
                      key={clip.id}
                      $left={displayStart * pixelsPerSecond}
                      $width={displayDuration * pixelsPerSecond}
                      $color={clip.color}
                      $active={clip.id === activeClipId}
                      $selected={selectedClipIds.includes(clip.id)}
                      $poster={clip.type === 'video' ? (clip.poster || undefined) : undefined}
                      onClick={(e) => handleClipClick(clip.id, track.id, e)}
                      onContextMenu={(e) => handleClipContextMenu(clip.id, track.id, e)}
                      onMouseDown={(e) => handleDragStart(clip.id, track.id, e)}
                      onMouseEnter={() => setHoveredClipId(clip.id)}
                      onMouseLeave={() => setHoveredClipId(null)}
                    >
                      {/* Show video thumbnail/poster for video clips - with mini video player when playing */}
                      {clip.type === 'video' && clip.poster ? (
                        <ClipThumbnail style={{
                          width: '100%',
                          height: '100%',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          borderRadius: '6px',
                          overflow: 'hidden',
                          pointerEvents: 'none',
                        }}>
                          {/* Show actual video when playing, poster when paused */}
                          {isClipPlaying && clip.videoSrc ? (
                            <video
                              ref={(el) => {
                                if (el) {
                                  timelineVideoRefs.current[clip.id] = el
                                  // Initial sync only - ongoing sync handled by requestAnimationFrame
                                  if (isClipPlaying) {
                                    const clipStart = clip.start || 0
                                    const expectedTime = currentTime - clipStart
                                    if (expectedTime >= 0 && expectedTime <= clip.duration) {
                                      el.currentTime = expectedTime
                                    }
                                  }
                                } else {
                                  // Cleanup ref when element unmounts
                                  delete timelineVideoRefs.current[clip.id]
                                }
                              }}
                              src={clip.videoSrc}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                pointerEvents: 'none',
                              }}
                              muted
                              playsInline
                              autoPlay
                              loop={false}
                            />
                          ) : (
                            <img
                              src={clip.poster}
                              alt={clip.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          )}
                          {/* Overlay for text readability */}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            zIndex: 1,
                          }}>
                            <ClipThumbnail style={{
                              width: '20px',
                              height: '20px',
                              background: 'rgba(255,255,255,0.2)',
                              flexShrink: 0,
                            }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            </ClipThumbnail>
                            <ClipName style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: '#ffffff',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            }}>{clip.name}</ClipName>
                          </div>
                        </ClipThumbnail>
                      ) : (
                        <>
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
                            {clip.type === 'shape' && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="4" y="4" width="16" height="16" rx="2" />
                              </svg>
                            )}
                          </ClipThumbnail>
                          <ClipName>{clip.name}</ClipName>
                        </>
                      )}

                      <ClipHandle
                        $position="left"
                        onMouseDown={(e) => handleResizeStart(clip.id, track.id, 'left', e)}
                      />
                      <ClipHandle
                        $position="right"
                        onMouseDown={(e) => handleResizeStart(clip.id, track.id, 'right', e)}
                      />

                      {/* + Button to extend/duplicate segment */}
                      <ClipAddButton
                        className="clip-add-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Extend duration by 5 seconds for text/image/shape
                          if ((track.type === 'text' || track.type === 'image' || track.type === 'shape') && clip.canvasObjectId && canvas) {
                            // @ts-ignore
                            const objects = canvas.getObjects?.() || []
                            const obj = objects.find((o: any) => o.id === clip.canvasObjectId || o.metadata?.id === clip.canvasObjectId) as any
                            if (obj && obj.metadata) {
                              const currentDuration = obj.metadata.timelineDuration || 5
                              obj.metadata.timelineDuration = currentDuration + 5
                              obj.dirty = true
                              // @ts-ignore
                              canvas.requestRenderAll?.()
                              // @ts-ignore
                              canvas.fire?.('object:modified', { target: obj })
                            }
                          } else if (track.type === 'audio') {
                            // For audio, extend by duration (loop)
                            const currentDuration = clip.duration || 5
                            updateAudioClip(clip.id, { duration: currentDuration + 5 })
                          }
                        }}
                        title="Extend by 5 seconds"
                      >
                        +
                      </ClipAddButton>
                    </TrackClip>
                  )
                })}

                {track.clips.length === 0 && (
                  <EmptyTrackMessage>
                    <span>or drag and drop media</span>
                  </EmptyTrackMessage>
                )}
              </TrackRow>
            ))}

            <Playhead
              $left={playheadPosition}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const timelineEl = timelineRef.current
                if (!timelineEl) return

                const timelineRect = timelineEl.getBoundingClientRect()

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const x = moveEvent.clientX - timelineRect.left
                  const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration))
                  handleSeek(time)
                }

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }

                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}
            />
          </TracksArea>
        </TracksScrollContainer>
      </TimelineBody>

      {/* Context Menu for Timeline Clips */}
      {contextMenu.visible && (
        <>
          <ContextMenuOverlay onClick={() => setContextMenu({ visible: false, clipId: null, trackId: null, x: 0, y: 0 })} />
          <ContextMenuContainer
            data-context-menu
            $visible={contextMenu.visible}
            $top={contextMenu.y}
            $left={contextMenu.x}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuItem onClick={handleContextMenuDelete}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>Delete</span>
            </ContextMenuItem>
          </ContextMenuContainer>
        </>
      )}
    </TimelineShell>
  )
}

export default VideoTimeline
