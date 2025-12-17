import React, { useState, useCallback } from 'react'
import { styled } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import useVideoContext from '@/hooks/useVideoContext'
import { exportVideoWithRecorder, exportAsGif, downloadBlob, VideoExportOptions } from '@/utils/videoExporter'

const Overlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
})

const Modal = styled('div', {
  background: '#ffffff',
  borderRadius: '16px',
  width: '480px',
  maxWidth: '90vw',
  maxHeight: '90vh',

  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
})

const ModalHeader = styled('div', {
  padding: '20px 24px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

const ModalTitle = styled('h2', {
  fontSize: '18px',
  fontWeight: 600,
  color: '#1f2937',
  margin: 0,
})

const CloseButton = styled('button', {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: '#6b7280',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f3f4f6',
    color: '#374151',
  },
})

const ModalBody = styled('div', {
  padding: '24px',
  flex: 1,
  overflowY: 'auto',
})

const SectionTitle = styled('h3', {
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const FormatGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
  marginBottom: '24px',
})

const FormatOption = styled('button', ({ $active }: { $active?: boolean }) => ({
  padding: '16px',
  borderRadius: '12px',
  border: $active ? '2px solid #667eea' : '2px solid #e5e7eb',
  background: $active ? '#f0f0ff' : '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#667eea',
    background: '#f9f9ff',
  },
}))

const FormatIcon = styled('div', ({ $color }: { $color: string }) => ({
  width: '48px',
  height: '48px',
  borderRadius: '10px',
  background: $color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 700,
}))

const FormatName = styled('span', {
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
})

const FormatDesc = styled('span', {
  fontSize: '11px',
  color: '#9ca3af',
})

const QualitySection = styled('div', {
  marginBottom: '24px',
})

const QualitySlider = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
})

const SliderInput = styled('input', {
  flex: 1,
  height: '6px',
  borderRadius: '3px',
  appearance: 'none',
  background: '#e5e7eb',
  outline: 'none',
  '::-webkit-slider-thumb': {
    appearance: 'none',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#667eea',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
})

const QualityValue = styled('span', {
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
  minWidth: '40px',
})

const SizeSection = styled('div', {
  marginBottom: '24px',
})

const SizeOptions = styled('div', {
  display: 'flex',
  gap: '8px',
})

const SizeOption = styled('button', ({ $active }: { $active?: boolean }) => ({
  padding: '10px 16px',
  borderRadius: '8px',
  border: $active ? '2px solid #667eea' : '1px solid #e5e7eb',
  background: $active ? '#f0f0ff' : '#ffffff',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  color: $active ? '#667eea' : '#374151',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#667eea',
  },
}))

const ModalFooter = styled('div', {
  padding: '16px 24px',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
})

const CancelButton = styled('button', {
  padding: '10px 20px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  background: '#ffffff',
  color: '#374151',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f9fafb',
  },
})

const ExportButton = styled('button', {
  padding: '10px 24px',
  borderRadius: '8px',
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s',
  ':hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none',
  },
})

const LoadingSpinner = styled('div', {
  width: '16px',
  height: '16px',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderTopColor: '#ffffff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
})

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  designName: string
}

type ExportFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'json' | 'mp4' | 'webm' | 'gif'
type ExportSize = '1x' | '2x' | '3x' | '4x'
type VideoResolution = '4k' | '1080p' | '720p' | '480p' | 'custom'
type QualityPreset = 'low' | 'medium' | 'high' | 'maximum'

const RESOLUTION_PRESETS: { id: VideoResolution; name: string; width: number; height: number; desc: string }[] = [
  { id: '4k', name: '4K UHD', width: 3840, height: 2160, desc: 'Ultra HD' },
  { id: '1080p', name: '1080p', width: 1920, height: 1080, desc: 'Full HD' },
  { id: '720p', name: '720p', width: 1280, height: 720, desc: 'HD' },
  { id: '480p', name: '480p', width: 854, height: 480, desc: 'SD' },
  { id: 'custom', name: 'Original', width: 0, height: 0, desc: 'Canvas Size' },
]

const QUALITY_PRESETS: { id: QualityPreset; name: string; bitrate: number; desc: string }[] = [
  { id: 'maximum', name: 'Maximum', bitrate: 50, desc: 'Largest file' },
  { id: 'high', name: 'High', bitrate: 25, desc: 'Recommended' },
  { id: 'medium', name: 'Medium', bitrate: 10, desc: 'Balanced' },
  { id: 'low', name: 'Low', bitrate: 5, desc: 'Smaller file' },
]

const IMAGE_FORMATS: { id: ExportFormat; name: string; desc: string; color: string }[] = [
  { id: 'png', name: 'PNG', desc: 'Transparent', color: '#10b981' },
  { id: 'jpg', name: 'JPG', desc: 'Compressed', color: '#f59e0b' },
  { id: 'webp', name: 'WebP', desc: 'Modern', color: '#8b5cf6' },
  { id: 'svg', name: 'SVG', desc: 'Vector', color: '#ec4899' },
  { id: 'pdf', name: 'PDF', desc: 'Print Ready', color: '#ef4444' },
  { id: 'json', name: 'JSON', desc: 'Editable', color: '#6366f1' },
]

const VIDEO_FORMATS: { id: ExportFormat; name: string; desc: string; color: string }[] = [
  { id: 'mp4', name: 'MP4', desc: 'Universal', color: '#3b82f6' },
  { id: 'webm', name: 'WebM', desc: 'Web Ready', color: '#14b8a6' },
  { id: 'gif', name: 'GIF', desc: 'Animated', color: '#f97316' },
]

function ExportModal({ isOpen, onClose, designName }: ExportModalProps) {
  const editor = useEditor()
  const { canvas, frameSize } = useEditorContext() as any
  const { clips, play, pause, seek, isPlaying } = useVideoContext()
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(90)
  const [size, setSize] = useState<ExportSize>('1x')
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(30)
  const [videoFPS, setVideoFPS] = useState(30)
  // Default to "custom" (Original) to use exact canvas dimensions
  const [videoResolution, setVideoResolution] = useState<VideoResolution>('custom')
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('high')

  const hasVideo = clips.length > 0
  const FORMATS = hasVideo ? [...VIDEO_FORMATS, ...IMAGE_FORMATS] : IMAGE_FORMATS

  const handleExport = async () => {
    if (!editor) return

    setIsExporting(true)
    setExportProgress(0)

    try {
      // Video export using canvas capture
      if (format === 'mp4' || format === 'webm' || format === 'gif') {
        const canvasElement = canvas?.getElement?.() || document.querySelector('canvas')
        if (!canvasElement) {
          alert('Canvas not found. Please try again.')
          setIsExporting(false)
          return
        }

        // Find video element from timeline
        const videoElement = document.querySelector('.canvas-container video') as HTMLVideoElement
        if (!videoElement && clips.length > 0) {
          alert('Video element not found. Make sure video is playing in the timeline.')
          setIsExporting(false)
          return
        }

        // Calculate quality/bitrate from preset
        const qualityConfig = QUALITY_PRESETS.find(q => q.id === qualityPreset) || QUALITY_PRESETS[1]
        const exportBitrate = qualityConfig.bitrate * 1000000 // Convert to bps

        // BACKEND VIDEO EXPORT - Send timeline data to video-processor server
        try {
          setExportProgress(5)

          // @ts-ignore - canvas.getObjects is from fabric.js
          const fabricObjects = canvas?.getObjects?.() || []

          // DETECT WORKAREA / DESIGN FRAME (The white paper)
          // Strategy 1: Find valid object by name/id
          let clipObject = fabricObjects.find((obj: any) =>
            obj.name === 'clip' || obj.id === 'clip' ||
            obj.name === 'workarea' || obj.id === 'workarea'
          )

          // Strategy 2: If no explicit clip, find object matching frameSize (if available)
          if (!clipObject && frameSize?.width && frameSize?.height) {
            clipObject = fabricObjects.find((obj: any) => {
              const w = (obj.width || 0) * (obj.scaleX || 1)
              const h = (obj.height || 0) * (obj.scaleY || 1)
              // tolerance of 1 pixel
              return Math.abs(w - frameSize.width) < 1 && Math.abs(h - frameSize.height) < 1
            })
            if (clipObject) console.log('Found Workarea by dimension match')
          }

          let canvasFrameWidth = 0
          let canvasFrameHeight = 0

          console.log('🔍 Canvas dimension detection:', {
            hasClipObject: !!clipObject,
            frameSize,
            canvasElement: { width: canvasElement?.width, height: canvasElement?.height }
          })

          // PRIORITY 1: FrameSize from Context (Most reliable for exact canvas dimensions)
          if (frameSize?.width && frameSize?.height) {
            canvasFrameWidth = frameSize.width
            canvasFrameHeight = frameSize.height
            console.log('✅ Using frameSize from context (exact canvas):', canvasFrameWidth, 'x', canvasFrameHeight)
          }
          // PRIORITY 2: Object Dimensions (Source of Truth for World Space)
          else if (clipObject) {
            canvasFrameWidth = (clipObject.width || 100) * (clipObject.scaleX || 1)
            canvasFrameHeight = (clipObject.height || 100) * (clipObject.scaleY || 1)
            console.log('Using Workarea object dimensions:', canvasFrameWidth, 'x', canvasFrameHeight)
          }
          // PRIORITY 3: Canvas element dimensions
          else if (canvasElement?.width && canvasElement?.height) {
            canvasFrameWidth = canvasElement.width
            canvasFrameHeight = canvasElement.height
            console.log('Using canvas element dimensions:', canvasFrameWidth, 'x', canvasFrameHeight)
          }
          // PRIORITY 4: Default
          else {
            canvasFrameWidth = 1920
            canvasFrameHeight = 1080
            console.warn('⚠️ Using default dimensions (1920x1080) - canvas size not detected')
          }

          // Calculate final export dimensions based on resolution preset
          const resolutionPreset = RESOLUTION_PRESETS.find(r => r.id === videoResolution) || RESOLUTION_PRESETS[1]
          let finalExportWidth: number
          let finalExportHeight: number

          if (videoResolution === 'custom') {
            // For "custom" (Original), use EXACT canvas frame dimensions to preserve aspect ratio
            // This ensures the exported video matches exactly what you see on the canvas
            finalExportWidth = canvasFrameWidth
            finalExportHeight = canvasFrameHeight
            console.log('✅ Using EXACT canvas dimensions (custom):', finalExportWidth, 'x', finalExportHeight)
            console.log('📐 Aspect ratio:', (finalExportWidth / finalExportHeight).toFixed(4))
          } else {
            // For preset resolutions, use the preset dimensions
            finalExportWidth = resolutionPreset.width
            finalExportHeight = resolutionPreset.height
            console.log('Using preset dimensions:', finalExportWidth, 'x', finalExportHeight)
          }

          // Store original dimensions before rounding (for logging)
          const originalWidth = finalExportWidth
          const originalHeight = finalExportHeight

          // Force even dimensions for video export (required for libx264)
          // This only adjusts by 1 pixel if needed, preserving the aspect ratio
          finalExportWidth = Math.round(finalExportWidth) + (Math.round(finalExportWidth) % 2)
          finalExportHeight = Math.round(finalExportHeight) + (Math.round(finalExportHeight) % 2)

          console.log('📊 Final Export Resolution:', finalExportWidth, 'x', finalExportHeight)
          if (finalExportWidth !== originalWidth || finalExportHeight !== originalHeight) {
            console.log('⚠️ Dimensions adjusted for codec (even numbers):', {
              original: `${originalWidth}x${originalHeight}`,
              final: `${finalExportWidth}x${finalExportHeight}`,
              aspectRatioChange: Math.abs((originalWidth / originalHeight) - (finalExportWidth / finalExportHeight)) < 0.001 ? 'preserved' : 'changed'
            })
          }

          // Create export options with final dimensions
          const exportOptions: VideoExportOptions = {
            format: format as 'mp4' | 'webm' | 'gif',
            fps: format === 'gif' ? 10 : videoFPS,
            quality: qualityConfig.bitrate / 50, // Normalize to 0-1 range
            duration: videoDuration,
            width: finalExportWidth,
            height: finalExportHeight,
            bitrate: exportBitrate,
            onProgress: (progress) => setExportProgress(progress),
          }

          // Define the logical design rect for normalization and background capture
          // IMPORTANT: Use finalExportWidth/Height to match the export dimensions exactly
          // If we found a clipObject, use its position (it might be offset/centered)
          // If not, assume 0,0 (top-left) which is correct if no workarea object exists
          let designLogicalRect = {
            left: clipObject?.left || 0,
            top: clipObject?.top || 0,
            width: finalExportWidth, // Use the finalized export width (exact canvas dimensions)
            height: finalExportHeight // Use the finalized export height (exact canvas dimensions)
          }

          console.log('📐 Design Logical Rect (Workarea) - EXACT EXPORT DIMENSIONS:', designLogicalRect)
          console.log('🎯 Export will match canvas exactly:', {
            exportWidth: finalExportWidth,
            exportHeight: finalExportHeight,
            canvasFrameWidth,
            canvasFrameHeight,
            frameSize,
            matches: finalExportWidth === canvasFrameWidth && finalExportHeight === canvasFrameHeight
          })

          const videoClipsWithPositions = clips.map((clip) => {
            // Find the canvas object for this video clip by matching ID
            const canvasObj = fabricObjects.find((obj: any) => {
              const metadata = obj.metadata || {}
              return (
                metadata.isVideo &&
                (metadata.id === clip.id || obj.id === clip.id)
              )
            })

            let position = { x: 0, y: 0 }
            let size = { width: 100, height: 100 }

            if (canvasObj) {
              const left = canvasObj.left || 0
              const top = canvasObj.top || 0
              const width = (canvasObj.width || 100) * (canvasObj.scaleX || 1)
              const height = (canvasObj.height || 100) * (canvasObj.scaleY || 1)

              // Normalize coordinates relative to DESIGN RECT (Workarea)
              // Subtract the Workarea offset (designLogicalRect.left/top)
              const relativeLeft = (left - designLogicalRect.left)
              const relativeTop = (top - designLogicalRect.top)

              position = {
                x: (relativeLeft / designLogicalRect.width) * 100,
                y: (relativeTop / designLogicalRect.height) * 100,
              }
              size = {
                width: (width / designLogicalRect.width) * 100,
                height: (height / designLogicalRect.height) * 100,
              }

              console.log(`Video ${clip.id}: pos=(${position.x.toFixed(1)}%, ${position.y.toFixed(1)}%), size=(${size.width.toFixed(1)}%x${size.height.toFixed(1)}%)`)
            } else {
              console.warn(`Canvas object not found for video clip: ${clip.id}`)
            }

            return {
              id: clip.id,
              type: 'video' as const,
              src: clip.src,
              start: clip.start || 0,
              duration: clip.duration || videoDuration,
              position,
              size,
            }
          })



          // Helper to convert blob/url to constant base64 for backend
          const toBase64 = async (url: string): Promise<string> => {
            try {
              const response = await fetch(url)
              const blob = await response.blob()
              return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            } catch (e) {
              console.error('Failed to convert to base64:', url, e)
              return url
            }
          }

          const canvasObjectsProms = fabricObjects.map(async (obj: any) => {
            // Skip clip/background objects
            if (obj.name === 'clip' || obj.id === 'clip') return null

            // Skip video poster images (objects with isVideo or videoSrc in metadata)
            const metadata = obj.metadata || {}
            if (metadata.isVideo || metadata.videoSrc) return null

            const objType = obj.type?.toLowerCase() || ''

            // For Fabric objects, use LOGICAL coordinates relative to the clip
            const relativeLeft = (obj.left || 0) - designLogicalRect.left
            const relativeTop = (obj.top || 0) - designLogicalRect.top
            const objWidth = (obj.width || 100) * (obj.scaleX || 1)
            const objHeight = (obj.height || 100) * (obj.scaleY || 1)

            // Convert to percentage of design frame
            const position = {
              x: (relativeLeft / designLogicalRect.width) * 100,
              y: (relativeTop / designLogicalRect.height) * 100,
            }
            const size = {
              width: (objWidth / designLogicalRect.width) * 100,
              height: (objHeight / designLogicalRect.height) * 100,
            }

            // Get timeline properties if available
            // Check metadata first (where custom properties often live in Fabric)
            // Note: 'metadata' is already defined in earlier scope logic

            // Format: timelineStart in seconds
            const timelineStart =
              (typeof metadata.timelineStart === 'number') ? metadata.timelineStart :
                (typeof obj.timelineStart === 'number') ? obj.timelineStart : 0

            // Format: duration in seconds
            const timelineDuration =
              (typeof metadata.duration === 'number') ? metadata.duration :
                (typeof obj.duration === 'number') ? obj.duration : videoDuration

            if (objType === 'image' || objType === 'staticimage') {
              // Get image source
              let src = obj.src || obj._element?.src || obj.getSrc?.() || ''

              // If blob URL, convert to base64
              if (src && src.startsWith('blob:')) {
                src = await toBase64(src)
              }

              if (src) {
                return {
                  id: obj.id || `img_${Math.random().toString(36).substr(2, 9)}`,
                  type: 'image' as const,
                  src,
                  start: timelineStart,
                  duration: timelineDuration,
                  position,
                  size,
                }
              }
            } else if (objType === 'textbox' || objType === 'i-text' || objType === 'text' || objType === 'statictext') {
              return {
                id: obj.id || `text_${Math.random().toString(36).substr(2, 9)}`,
                type: 'text' as const,
                content: obj.text || '',
                start: timelineStart,
                duration: timelineDuration,
                position,
                style: {
                  fontSize: Math.round((obj.fontSize || 24) * (obj.scaleX || 1)),
                  fontFamily: obj.fontFamily || 'Arial',
                  color: obj.fill || '#000000',
                },
              }
            }
            return null
          })

          const canvasObjects = (await Promise.all(canvasObjectsProms)).filter(Boolean)

          console.log('Canvas objects found:', canvasObjects.length)
          console.log('Video clips found:', videoClipsWithPositions.length)


          // PHASE 1: Export canvas as background image
          let backgroundImage: string | undefined

          try {
            // Get fabric.js canvas
            // @ts-ignore
            const allObjects = canvas?.getObjects?.() || []

            // Store visibility of ALL overlay objects (Videos + Extracted Canvas Objects)
            const objectsToHide: any[] = []

            allObjects.forEach((obj: any) => {
              // Check if this object is a video
              const metadata = obj.metadata || {}
              const isVideo = metadata.isVideo || metadata.videoSrc

              // Check if this object was extracted as an overlay (Image or Text)
              // Simple check by ID match in canvasObjects
              const isOverlay = canvasObjects.find((co: any) => co.id === obj.id)

              if (isVideo || isOverlay) {
                objectsToHide.push({ obj, visible: obj.visible, opacity: obj.opacity })
                obj.set('visible', false)
              }
            })

            // Re-render canvas with only background/shapes visible
            canvas?.renderAll?.()

            // EXPORT BACKGROUND
            // Use Fabric's built-in cropping which handles coordinate translation (Zoom/Pan) correctly
            // This isolates the Workarea (white paper) from the Viewport
            if (canvas && typeof canvas.toDataURL === 'function') {
              try {
                backgroundImage = canvas.toDataURL({
                  format: 'png',
                  left: designLogicalRect.left,
                  top: designLogicalRect.top,
                  width: designLogicalRect.width,
                  height: designLogicalRect.height,
                  multiplier: 1
                })
                console.log('Background exported using Fabric crop:', backgroundImage.length)
              } catch (e) {
                console.warn('Fabric toDataURL failed', e)
                // Fallback
                // @ts-ignore
                const fabricCanvas = canvas?.lowerCanvasEl || canvas?.getElement?.()
                if (fabricCanvas) backgroundImage = fabricCanvas.toDataURL('image/png')
              }
            } else {
              // Fallback
              // @ts-ignore
              const pngData = await editor?.toPNG?.({ multiplier: 1 })
              if (pngData && typeof pngData === 'string') {
                backgroundImage = pngData
              }
            }

            // Restore visibility
            objectsToHide.forEach(({ obj, visible, opacity }) => {
              obj.set('visible', visible !== false)
              obj.set('opacity', opacity ?? 1)
            })
            canvas?.renderAll?.()

          } catch (err) {
            console.error('Failed to export canvas background:', err)
          }

          console.log('Background image ready:', !!backgroundImage, 'Export size:', finalExportWidth, 'x', finalExportHeight)

          // Build timeline data for backend
          // IMPORTANT: Use finalExportWidth/Height to ensure exact canvas dimensions
          const timelineData = {
            timeline: {
              duration: videoDuration,
              fps: videoFPS,
              width: finalExportWidth,  // EXACT canvas width
              height: finalExportHeight, // EXACT canvas height
              backgroundColor: 'white',
              backgroundImage, // Include canvas background
            },
            clips: [...videoClipsWithPositions, ...canvasObjects],
          }

          console.log('🎬 Timeline data for export:', {
            width: timelineData.timeline.width,
            height: timelineData.timeline.height,
            aspectRatio: (timelineData.timeline.width / timelineData.timeline.height).toFixed(4),
            canvasFrame: { width: canvasFrameWidth, height: canvasFrameHeight },
            frameSize: frameSize,
            matchesCanvas: timelineData.timeline.width === canvasFrameWidth && timelineData.timeline.height === canvasFrameHeight
          })

          setExportProgress(10)

          // Call backend API
          const VIDEO_PROCESSOR_URL = 'http://localhost:3001'

          // First, check if server is reachable
          try {
            const healthCheck = await fetch(`${VIDEO_PROCESSOR_URL}/health`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000), // 5 second timeout
            })
            if (!healthCheck.ok) {
              throw new Error(`Server health check failed: ${healthCheck.status}`)
            }
          } catch (healthError) {
            throw new Error(`Cannot connect to video-processor server at ${VIDEO_PROCESSOR_URL}. Make sure it's running on port 3001. Error: ${healthError instanceof Error ? healthError.message : 'Unknown error'}`)
          }

          // Start render job
          const startResponse = await fetch(`${VIDEO_PROCESSOR_URL}/api/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(timelineData),
            signal: AbortSignal.timeout(30000), // 30 second timeout for render start
          })

          if (!startResponse.ok) {
            throw new Error('Failed to start render job')
          }

          const { id: jobId } = await startResponse.json()
          console.log('Render job started:', jobId)

          setExportProgress(15)

          // Poll for status
          let status = 'processing'
          while (status === 'processing' || status === 'queued') {
            await new Promise(resolve => setTimeout(resolve, 1000))

            const statusResponse = await fetch(`${VIDEO_PROCESSOR_URL}/api/render/${jobId}/status`)
            const statusData = await statusResponse.json()

            status = statusData.status
            setExportProgress(Math.max(15, Math.min(statusData.progress || 15, 95)))

            if (statusData.error) {
              throw new Error(statusData.error)
            }
          }

          if (status !== 'done') {
            throw new Error('Render failed')
          }

          setExportProgress(95)

          // Download the video
          const downloadUrl = `${VIDEO_PROCESSOR_URL}/api/render/${jobId}/download`
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = `${designName}.mp4`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          setExportProgress(100)

          setTimeout(() => {
            onClose()
            setExportProgress(0)
          }, 500)

          setIsExporting(false)
        } catch (error) {
          console.error('Export error:', error)
          let errorMessage = 'Unknown error'
          if (error instanceof Error) {
            errorMessage = error.message
            // Check for specific fetch errors
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
              errorMessage = `Cannot connect to video-processor server. Make sure it's running on port 3001 at http://localhost:3001`
            }
          }
          alert(`Export failed: ${errorMessage}. Make sure the video-processor server is running on port 3001.`)
          setIsExporting(false)
        }
        return
      }

      if (format === 'json') {
        // Export as JSON
        const exportedTemplate = editor.exportToJSON()
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportedTemplate, null, 2))
        downloadFile(dataStr, `${designName}.json`)
      } else if (format === 'svg') {
        // Export as SVG - use PNG as fallback since SVG export may not be available
        try {
          // @ts-ignore
          const image = await editor.toPNG({})
          downloadFile(image, `${designName}.png`)
        } catch {
          const exportedTemplate = editor.exportToJSON()
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportedTemplate, null, 2))
          downloadFile(dataStr, `${designName}.json`)
        }
      } else if (format === 'pdf') {
        // Export as PNG for PDF (would need jsPDF for proper PDF)
        // @ts-ignore
        const image = await editor.toPNG({})
        downloadFile(image, `${designName}.png`)
      } else {
        // Export as image (PNG, JPG, WebP)
        // The SDK primarily supports PNG export
        // @ts-ignore
        const image = await editor.toPNG({})

        if (format === 'png') {
          downloadFile(image, `${designName}.png`)
        } else {
          // Convert PNG to other formats using canvas
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')

            if (ctx) {
              // For JPG, fill with white background first
              if (format === 'jpg') {
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
              }

              ctx.drawImage(img, 0, 0)

              const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`
              const dataURL = canvas.toDataURL(mimeType, quality / 100)
              downloadFile(dataURL, `${designName}.${format}`)
            }
          }
          img.src = image
        }
      }

      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Export {hasVideo ? 'Video' : 'Design'}</ModalTitle>
          <CloseButton onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <SectionTitle>File Format</SectionTitle>
          <FormatGrid>
            {FORMATS.map((f) => (
              <FormatOption
                key={f.id}
                $active={format === f.id}
                onClick={() => setFormat(f.id)}
              >
                <FormatIcon $color={f.color}>{f.name}</FormatIcon>
                <FormatName>{f.name}</FormatName>
                <FormatDesc>{f.desc}</FormatDesc>
              </FormatOption>
            ))}
          </FormatGrid>

          {(format === 'mp4' || format === 'webm' || format === 'gif') && (
            <>
              <SectionTitle style={{ marginTop: '20px' }}>Video Settings</SectionTitle>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(parseInt(e.target.value) || 10)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                    }}
                  />
                </div>
                {format !== 'gif' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                      FPS
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={60}
                      value={videoFPS}
                      onChange={(e) => setVideoFPS(parseInt(e.target.value) || 30)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Resolution Selection */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                  Resolution
                </label>
                {videoResolution === 'custom' && frameSize?.width && frameSize?.height && (
                  <div style={{
                    marginBottom: '8px',
                    padding: '8px 12px',
                    background: '#f0f0ff',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#667eea',
                    fontWeight: 500
                  }}>
                    📐 Canvas: {Math.round(frameSize.width)} × {Math.round(frameSize.height)} (Exact dimensions will be used)
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {RESOLUTION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setVideoResolution(preset.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: videoResolution === preset.id ? '2px solid #667eea' : '1px solid #e5e7eb',
                        background: videoResolution === preset.id ? '#f0f0ff' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: videoResolution === preset.id ? '#667eea' : '#374151',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div>{preset.name}</div>
                      <div style={{ fontSize: '10px', fontWeight: 400, color: '#9ca3af' }}>
                        {preset.id === 'custom' && frameSize?.width && frameSize?.height
                          ? `${Math.round(frameSize.width)}×${Math.round(frameSize.height)}`
                          : preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Preset Selection */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                  Quality
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {QUALITY_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setQualityPreset(preset.id)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: qualityPreset === preset.id ? '2px solid #667eea' : '1px solid #e5e7eb',
                        background: qualityPreset === preset.id ? '#f0f0ff' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: qualityPreset === preset.id ? '#667eea' : '#374151',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div>{preset.name}</div>
                      <div style={{ fontSize: '10px', fontWeight: 400, color: '#9ca3af' }}>{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {isExporting && exportProgress > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Exporting...</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#667eea' }}>{Math.round(exportProgress)}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${exportProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {(format === 'jpg' || format === 'webp') && (
            <QualitySection>
              <SectionTitle>Quality</SectionTitle>
              <QualitySlider>
                <SliderInput
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                />
                <QualityValue>{quality}%</QualityValue>
              </QualitySlider>
            </QualitySection>
          )}

          {format !== 'svg' && format !== 'json' && (
            <SizeSection>
              <SectionTitle>Size</SectionTitle>
              <SizeOptions>
                {(['1x', '2x', '3x', '4x'] as ExportSize[]).map((s) => (
                  <SizeOption
                    key={s}
                    $active={size === s}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </SizeOption>
                ))}
              </SizeOptions>
            </SizeSection>
          )}
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <ExportButton onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <LoadingSpinner />
                Exporting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export {format.toUpperCase()}
              </>
            )}
          </ExportButton>
        </ModalFooter>
      </Modal>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Overlay>
  )
}

export default ExportModal
