import React, { useState, useCallback, useEffect } from 'react'
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

  // Automatically update video duration based on the latest clip's end time
  useEffect(() => {
    if (clips.length > 0) {
      const maxEnd = Math.max(...clips.map(c => (c.start || 0) + (c.duration || 0)))
      if (maxEnd > 0 && maxEnd !== videoDuration) {
        setVideoDuration(Math.ceil(maxEnd))
      }
    }
  }, [clips, videoDuration])

  const handleExport = async () => {
    if (!editor) return

    setIsExporting(true)
    setExportProgress(0)

    try {
      // Pause playback if it's playing to avoid canvas render conflicts
      if (isPlaying) {
        pause()
      }

      // 1. VIDEO EXPORT (MP4, WebM, GIF)
      if (format === 'mp4' || format === 'webm' || format === 'gif') {
        const canvasElement = canvas?.getElement?.() || document.querySelector('canvas')
        if (!canvasElement) {
          alert('Canvas not found. Please try again.')
          setIsExporting(false)
          return
        }

        // Calculate quality/bitrate from preset
        const qualityConfig = QUALITY_PRESETS.find(q => q.id === qualityPreset) || QUALITY_PRESETS[1]
        const exportBitrate = qualityConfig.bitrate * 1000000

        setExportProgress(5)

        // @ts-ignore
        const fabricObjects = canvas?.getObjects?.() || []

        // DETECT DESIGN AREA (The white background frame)
        let designWidth = 0, designHeight = 0, designLeft = 0, designTop = 0

        const frameObject = fabricObjects.find((obj: any) =>
          obj.name === 'clip' ||
          obj.id === 'frame' ||
          obj.metadata?.role === 'canvas' ||
          obj.metadata?.id === 'frame'
        ) || fabricObjects.sort((a, b) => (b.width * b.scaleX * b.height * b.scaleY) - (a.width * a.scaleX * a.height * a.scaleY))[0]

        if (frameObject) {
          designWidth = (frameObject.width || 100) * (frameObject.scaleX || 1)
          designHeight = (frameObject.height || 100) * (frameObject.scaleY || 1)
          designLeft = frameObject.left || 0
          designTop = frameObject.top || 0

          if (frameObject.originX === 'center') designLeft -= designWidth / 2
          if (frameObject.originY === 'center') designTop -= designHeight / 2
        } else if (frameSize?.width) {
          designWidth = frameSize.width
          designHeight = frameSize.height
          designLeft = (canvasElement.width / 2) - (designWidth / 2)
          designTop = (canvasElement.height / 2) - (designHeight / 2)
        } else {
          designWidth = canvasElement.width
          designHeight = canvasElement.height
          designLeft = 0; designTop = 0
        }

        // Resolve export dimensions
        const resolutionPreset = RESOLUTION_PRESETS.find(r => r.id === videoResolution) || RESOLUTION_PRESETS[1]
        let finalExportWidth = (videoResolution === 'custom') ? designWidth : (designWidth * (Math.max(resolutionPreset.width, resolutionPreset.height) / Math.max(designWidth, designHeight)))
        let finalExportHeight = (videoResolution === 'custom') ? designHeight : (designHeight * (Math.max(resolutionPreset.width, resolutionPreset.height) / Math.max(designWidth, designHeight)))

        // Force even dimensions for libx264
        finalExportWidth = Math.round(finalExportWidth) + (Math.round(finalExportWidth) % 2)
        finalExportHeight = Math.round(finalExportHeight) + (Math.round(finalExportHeight) % 2)

        const designLogicalRect = { left: designLeft, top: designTop, width: designWidth, height: designHeight }
        const captureMultiplier = finalExportWidth / designWidth

        // Helper for backend communication
        const toBase64 = async (url: string): Promise<string> => {
          try {
            const res = await fetch(url)
            const blob = await res.blob()
            return new Promise((resolve, reject) => {
              const r = new FileReader()
              r.onloadend = () => resolve(r.result as string)
              r.onerror = reject
              r.readAsDataURL(blob)
            })
          } catch (e) { return url }
        }

        // 2. EXTRACT DESIGN ELEMENTS (Videos, Images, Text)
        const videoClipsWithPositions = clips.map(clip => {
          const obj = fabricObjects.find((o: any) => o.metadata?.id === clip.id || o.id === clip.id || o.metadata?.videoSrc === clip.src)
          let position = { x: 0, y: 0 }, size = { width: 100, height: 100 }

          if (obj) {
            const w = (obj.width || 100) * (obj.scaleX || 1)
            const h = (obj.height || 100) * (obj.scaleY || 1)
            let l = obj.left || 0, t = obj.top || 0
            if (obj.originX === 'center') l -= w / 2
            if (obj.originY === 'center') t -= h / 2
            position = {
              x: Number(((l - designLeft) / designWidth * 100).toFixed(2)),
              y: Number(((t - designTop) / designHeight * 100).toFixed(2))
            }
            size = {
              width: Number((w / designWidth * 100).toFixed(2)),
              height: Number((h / designHeight * 100).toFixed(2))
            }
          }
          return {
            id: clip.id,
            type: 'video' as const,
            src: clip.src,
            start: clip.start || 0,
            duration: clip.duration || videoDuration,
            position,
            size,
            videoCrop: obj?.metadata?.videoCrop
          }
        })

        const canvasOverlays = await Promise.all(fabricObjects.map(async (obj: any) => {
          const meta = obj.metadata || {}
          if (obj === frameObject || meta.isVideo || meta.videoSrc) return null

          const w = (obj.width || 100) * (obj.scaleX || 1), h = (obj.height || 100) * (obj.scaleY || 1)
          let l = obj.left || 0, t = obj.top || 0
          if (obj.originX === 'center') l -= w / 2
          if (obj.originY === 'center') t -= h / 2

          const pos = {
            x: Number(((l - designLeft) / designWidth * 100).toFixed(2)),
            y: Number(((t - designTop) / designHeight * 100).toFixed(2))
          }
          const sz = {
            width: Number((w / designWidth * 100).toFixed(2)),
            height: Number((h / designHeight * 100).toFixed(2))
          }
          const start = Number(meta.timelineStart || 0)
          const dur = Number(meta.timelineDuration || meta.duration || videoDuration)

          if (obj.type?.toLowerCase().includes('image')) {
            let src = obj.src || obj._element?.src || obj.getSrc?.() || ''
            if (src.startsWith('blob:')) src = await toBase64(src)
            return src ? { id: obj.id || Math.random().toString(), type: 'image' as const, src, start, duration: dur, position: pos, size: sz } : null
          } else if (obj.type?.toLowerCase().includes('text')) {
            return {
              id: obj.id || Math.random().toString(),
              type: 'text' as const,
              content: obj.text || '',
              start,
              duration: dur,
              position: pos,
              style: {
                fontSize: Math.round((obj.fontSize || 24) * (obj.scaleX || 1)),
                fontFamily: obj.fontFamily || 'Arial',
                color: obj.fill || '#000000',
                fontWeight: obj.fontWeight || 400,
                textAlign: obj.textAlign || 'left',
                opacity: obj.opacity ?? 1
              }
            }
          }
          return null
        }))
        const overlays = canvasOverlays.filter(Boolean)

        // 3. CAPTURE BACKGROUND PNG
        let backgroundImage: string | undefined
        const objectsToHide: any[] = []

        const originalRenderTopLayer = canvas.renderTopLayer
        // @ts-ignore
        const guidelinesHandler = editor.handlers?.guidelines || canvas.guidelines
        const originalGuidelinesEnabled = guidelinesHandler?.enabled
        const originalVpt = [...(canvas.viewportTransform || [1, 0, 0, 1, 0, 0])]
        const originalZoom = canvas.getZoom()

        try {
          canvas.selection = false
          canvas.discardActiveObject()
          if (guidelinesHandler) guidelinesHandler.enabled = false

          // Defensive instance patch for null context crash
          canvas.renderTopLayer = function (ctx: CanvasRenderingContext2D) {
            if (!ctx || !this.contextTop) return this
            return originalRenderTopLayer.call(this, ctx)
          }

          fabricObjects.forEach((obj: any) => {
            if (obj.metadata?.isVideo || obj.metadata?.videoSrc || overlays.find((ov: any) => ov.id === obj.id)) {
              objectsToHide.push({ obj, visible: obj.visible })
              obj.set('visible', false)
            }
          })
          // TEMPORARILY RESET VIEWPORT FOR CAPTURE
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
          canvas.setZoom(1)

          try {
            canvas.renderAll()
          } catch (e) {
            console.warn('Pre-capture renderAll suppressed:', e)
          }

          backgroundImage = canvas.toDataURL({
            format: 'png',
            left: designLeft,
            top: designTop,
            width: designWidth,
            height: designHeight,
            multiplier: captureMultiplier
          })
        } finally {
          // RESTORE VIEWPORT
          canvas.setViewportTransform(originalVpt)
          canvas.setZoom(originalZoom)
          canvas.renderTopLayer = originalRenderTopLayer
          if (guidelinesHandler) guidelinesHandler.enabled = originalGuidelinesEnabled
          objectsToHide.forEach(({ obj, visible }) => obj.set('visible', visible))
          try {
            canvas.renderAll()
          } catch (e) {
            console.warn('Post-export renderAll suppressed:', e)
          }
        }

        // 4. CALL BACKEND
        const timelineData = {
          timeline: { duration: videoDuration, fps: videoFPS, width: finalExportWidth, height: finalExportHeight, backgroundColor: 'white', backgroundImage },
          clips: [...videoClipsWithPositions, ...overlays]
        }

        const VIDEO_PROCESSOR_URL = 'http://localhost:3001'
        const startRes = await fetch(`${VIDEO_PROCESSOR_URL}/api/render`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(timelineData) })
        if (!startRes.ok) throw new Error('Render failed to start')

        const { id: jobId } = await startRes.json()
        let status = 'processing'
        while (status === 'processing' || status === 'queued') {
          await new Promise(r => setTimeout(r, 1000))
          const stRes = await fetch(`${VIDEO_PROCESSOR_URL}/api/render/${jobId}/status`)
          const stData = await stRes.json()
          status = stData.status
          setExportProgress(Math.max(15, Math.min(stData.progress || 15, 95)))
          if (stData.error) throw new Error(stData.error)
        }

        if (status === 'done') {
          const downloadUrl = `${VIDEO_PROCESSOR_URL}/api/render/${jobId}/download`
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = `${designName}.mp4`
          link.click()
          setExportProgress(100)
        } else throw new Error('Export failed')

      } else {
        // STATIC IMAGE EXPORT
        // @ts-ignore
        const image = await editor.toPNG({ multiplier: parseInt(size) || 1 })
        if (format === 'png') {
          downloadFile(image, `${designName}.png`)
        } else {
          const img = new Image()
          img.onload = () => {
            const c = document.createElement('canvas')
            c.width = img.width; c.height = img.height
            const ctx = c.getContext('2d')
            if (ctx) {
              if (format === 'jpg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, c.width, c.height) }
              ctx.drawImage(img, 0, 0)
              downloadFile(c.toDataURL(`image/${format === 'jpg' ? 'jpeg' : format}`, quality / 100), `${designName}.${format}`)
            }
          }
          img.src = image
        }
      }

      setTimeout(() => { onClose(); setExportProgress(0) }, 500)
    } catch (error) {
      console.error('Export error:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
