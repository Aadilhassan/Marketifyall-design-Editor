import React, { useState, useEffect, useRef, useMemo } from 'react'
import { styled } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import useVideoContext from '@/hooks/useVideoContext'
import { useVideoProjectOptional } from '@/video/VideoProjectContext'
import { clipEnd } from '@/video/model'
import { pageRect } from '@/video/apply'
import {
  Capabilities,
  ExportPhase,
  ExportUnsupportedError,
  FPS_OPTIONS,
  GIF_MAX_WIDTH,
  QUALITIES,
  QualityId,
  RESOLUTIONS,
  ResolutionId,
  TimeRange,
  capabilities as probeCapabilities,
  clampRange,
  currentDuration,
  downloadBlob,
  estimateBytes,
  formatBytes,
  formatDuration,
  gifFps,
  gifSize,
  hasAudio as pageHasAudio,
  isAbort,
  outputSize,
  runExport,
} from '@/video/export'
import { color, font, radius, shadow, overline } from '@/theme/tokens'
import { notify } from '@/lib/notify'
import { hasActiveAnimation, getObjectAnimation } from '@/utils/animation'
import { marketifyallApi } from '@/services/marketifyall-api'
import { ignoreError, log } from '@/lib/logger'
import { usePageActions } from '@/contexts/PageActionsContext'
import {
  parsePageRange,
  supportsMultiPage,
  supportsTransparency,
  pageFileName,
  readExportPrefs,
  writeExportPrefs,
  createPagedPdf,
} from '@/utils/pageExport'

/**
 * Re-encodes a captured PNG data URL into JPG/WebP using `canvas.toBlob`, which
 * is memory-safe for large canvases. Crucially it returns the ACTUAL produced
 * MIME type: browsers silently fall back to PNG when an encoder (e.g. WebP) is
 * unsupported, so the caller can verify it really got what it asked for instead
 * of shipping a PNG named `.webp`.
 */
function encodeRaster(
  sourceDataUrl: string,
  format: string,
  quality: number
): Promise<{ blob: Blob | null; type: string }> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth || img.width
      c.height = img.naturalHeight || img.height
      const ctx = c.getContext('2d')
      if (!ctx) return resolve({ blob: null, type: '' })
      // JPG has no alpha — flatten onto white so transparency doesn't go black.
      if (format === 'jpg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, c.width, c.height)
      }
      ctx.drawImage(img, 0, 0)
      const mime = format === 'jpg' ? 'image/jpeg' : `image/${format}`
      c.toBlob(
        b => resolve({ blob: b, type: b?.type || '' }),
        mime,
        Math.min(1, Math.max(0.1, quality / 100))
      )
    }
    img.onerror = () => resolve({ blob: null, type: '' })
    img.src = sourceDataUrl
  })
}

interface FrameShot {
  /** PNG data URL of the page area at `multiplier`. */
  dataUrl: string
  /** Page size in design pixels (1x). */
  width: number
  height: number
}

/**
 * Renders the page (frame) area of the live canvas to a PNG data URL. Viewport,
 * selection, guidelines and — when `transparent` — the page fills are changed
 * only for the duration of this synchronous call and restored in `finally`, so
 * nothing else (autosave, rendering) can observe the temporary state.
 */
function captureFrame(
  fabricCanvas: any,
  editor: any,
  frameSize: { width?: number; height?: number } | undefined,
  multiplier: number,
  transparent: boolean
): FrameShot {
  const canvasElement = fabricCanvas.getElement?.() || document.querySelector('canvas')
  if (!canvasElement) throw new Error('Canvas element not found')

  // Detect design area (same logic as video export). Copy before sorting:
  // getObjects() is fabric's live stacking array.
  const fabricObjects: any[] = fabricCanvas.getObjects?.() || []
  let designWidth = 0, designHeight = 0, designLeft = 0, designTop = 0
  const frameObject = fabricObjects.find((obj: any) =>
    obj.name === 'clip' ||
    obj.id === 'frame' ||
    obj.metadata?.role === 'canvas' ||
    obj.metadata?.id === 'frame'
  ) || [...fabricObjects].sort((a: any, b: any) => (b.width * b.scaleX * b.height * b.scaleY) - (a.width * a.scaleX * a.height * a.scaleY))[0]

  if (frameObject) {
    designWidth = (frameObject.width || 100) * (frameObject.scaleX || 1)
    designHeight = (frameObject.height || 100) * (frameObject.scaleY || 1)
    designLeft = frameObject.left || 0
    designTop = frameObject.top || 0
    if (frameObject.originX === 'center') designLeft -= designWidth / 2
    if (frameObject.originY === 'center') designTop -= designHeight / 2
  } else if (frameSize?.width && frameSize?.height) {
    designWidth = frameSize.width
    designHeight = frameSize.height
    designLeft = (canvasElement.width / 2) - (designWidth / 2)
    designTop = (canvasElement.height / 2) - (designHeight / 2)
  } else {
    designWidth = canvasElement.width
    designHeight = canvasElement.height
  }

  // Save current canvas state
  const originalViewportTransform = [...(fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0])]
  const originalZoom = fabricCanvas.getZoom?.() || 1
  const originalSelection = fabricCanvas.selection
  const originalRenderTopLayer = fabricCanvas.renderTopLayer
  const guidelinesHandler = editor?.handlers?.guidelines || fabricCanvas.guidelines
  const originalGuidelinesEnabled = guidelinesHandler?.enabled
  const restorePaint: Array<() => void> = []

  try {
    // Temporarily disable selection and guidelines for clean export
    fabricCanvas.selection = false
    fabricCanvas.discardActiveObject?.()
    if (guidelinesHandler) guidelinesHandler.enabled = false

    // Patch renderTopLayer to prevent context errors
    fabricCanvas.renderTopLayer = function (ctx: CanvasRenderingContext2D) {
      if (!ctx || !this.contextTop) return this
      return originalRenderTopLayer.call(this, ctx)
    }

    if (transparent) {
      // Hide everything that paints the page itself. The Frame is also every
      // object's clipPath; fabric forces a black fill when clipping, so clearing
      // its fill (rather than hiding it) keeps clipping intact.
      fabricObjects.forEach((o: any) => {
        if (o.type === 'Background' || o.id === 'background') {
          const wasVisible = o.visible
          o.visible = false
          restorePaint.push(() => { o.visible = wasVisible })
        } else if (o.type === 'Frame' || o.id === 'frame') {
          const fill = o.fill
          o.set('fill', 'rgba(0,0,0,0)')
          restorePaint.push(() => o.set('fill', fill))
        }
      })
      const bgColor = fabricCanvas.backgroundColor
      const bgImage = fabricCanvas.backgroundImage
      fabricCanvas.backgroundColor = ''
      fabricCanvas.backgroundImage = null
      restorePaint.push(() => {
        fabricCanvas.backgroundColor = bgColor
        fabricCanvas.backgroundImage = bgImage
      })
    }

    // Reset viewport for export
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    fabricCanvas.setZoom?.(1)

    try {
      fabricCanvas.renderAll?.()
    } catch (renderError) {
      log.warn('export', 'pre-capture render failed — capture may be stale', renderError)
    }

    let dataUrl: string
    try {
      dataUrl = fabricCanvas.toDataURL({
        format: 'png',
        left: designLeft,
        top: designTop,
        width: designWidth,
        height: designHeight,
        multiplier,
      })
    } catch (e) {
      log.warn('export', 'cropped capture failed — falling back to the full canvas', e)
      dataUrl = canvasElement.toDataURL('image/png')
    }
    return { dataUrl, width: designWidth, height: designHeight }
  } finally {
    for (let i = restorePaint.length - 1; i >= 0; i--) {
      try {
        restorePaint[i]()
      } catch (err) {
        log.warn('export', 'failed to restore page background after transparent export', err)
      }
    }
    fabricCanvas.setViewportTransform(originalViewportTransform)
    fabricCanvas.setZoom?.(originalZoom)
    fabricCanvas.selection = originalSelection
    fabricCanvas.renderTopLayer = originalRenderTopLayer
    if (guidelinesHandler && originalGuidelinesEnabled !== undefined) {
      guidelinesHandler.enabled = originalGuidelinesEnabled
    }
    try {
      fabricCanvas.renderAll?.()
    } catch (renderError) {
      ignoreError(renderError, 'post-export view restore render')
    }
  }
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
  borderBottom: '1px solid #e6e0d2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

const ModalTitle = styled('h2', {
  fontSize: '18px',
  fontWeight: 600,
  color: '#181410',
  margin: 0,
})

const CloseButton = styled('button', {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: '#736d5c',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f3efe4',
    color: '#3a352b',
  },
})

const ModalBody = styled('div', {
  padding: '20px 24px',
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
})

const SectionTitle = styled('h3', {
  fontSize: '12px',
  fontWeight: 600,
  color: '#736d5c',
  marginTop: 0,
  marginBottom: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const FormatGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginBottom: '20px',
})

const FormatOption = styled('button', ({ $active }: { $active?: boolean }) => ({
  padding: '12px 8px',
  borderRadius: '10px',
  border: $active ? '1px solid #d8401c' : '1px solid #e6e0d2',
  background: $active ? '#f3f4ff' : '#ffffff',
  boxShadow: $active ? '0 0 0 1px #d8401c' : 'none',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  transition: 'border-color 0.15s, background 0.15s',
  ':hover': {
    borderColor: '#d8401c',
    background: '#fafaff',
  },
}))

const FormatIcon = styled('div', ({ $color }: { $color: string }) => ({
  width: '34px',
  height: '34px',
  borderRadius: '8px',
  background: $color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.2px',
}))

const FormatName = styled('span', {
  fontSize: '12px',
  fontWeight: 600,
  color: '#3a352b',
})

const FormatDesc = styled('span', {
  fontSize: '10px',
  color: '#a39d8c',
})

const QualitySection = styled('div', {
  marginBottom: '18px',
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
  background: '#e6e0d2',
  outline: 'none',
  '::-webkit-slider-thumb': {
    appearance: 'none',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#d8401c',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
})

const QualityValue = styled('span', {
  fontSize: '14px',
  fontWeight: 600,
  color: '#3a352b',
  minWidth: '40px',
})

const SizeSection = styled('div', {
  marginBottom: '4px',
})

const SizeOptions = styled('div', {
  display: 'flex',
  gap: '8px',
})

const SizeOption = styled('button', ({ $active }: { $active?: boolean }) => ({
  padding: '10px 16px',
  borderRadius: '8px',
  border: $active ? '2px solid #d8401c' : '1px solid #e6e0d2',
  background: $active ? '#f0f0ff' : '#ffffff',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  color: $active ? '#d8401c' : '#3a352b',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#d8401c',
  },
  ':disabled': {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
}))

const OptionSection = styled('div', {
  marginBottom: '18px',
})

const Hint = styled('div', ({ $error }: { $error?: boolean }) => ({
  marginTop: '8px',
  fontSize: '12px',
  lineHeight: 1.4,
  color: $error ? '#c2261a' : '#736d5c',
}))

const RangeInput = styled('input', ({ $error }: { $error?: boolean }) => ({
  marginTop: '8px',
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  borderRadius: '8px',
  border: $error ? '1px solid #c2261a' : '1px solid #d6cfbf',
  fontSize: '13px',
  color: '#181410',
  outline: 'none',
  ':focus': {
    boxShadow: '0 0 0 2px rgba(216, 64, 28, 0.25)',
  },
}))

const ToggleRow = styled('label', ({ $disabled }: { $disabled?: boolean }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  cursor: $disabled ? 'not-allowed' : 'pointer',
  opacity: $disabled ? 0.55 : 1,
}))

const ModalFooter = styled('div', {
  padding: '16px 24px',
  borderTop: '1px solid #e6e0d2',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
})

const CancelButton = styled('button', {
  padding: '10px 20px',
  borderRadius: '8px',
  border: '1px solid #e6e0d2',
  background: '#ffffff',
  color: '#3a352b',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: '#fbf9f4',
  },
})

const ExportButton = styled('button', {
  padding: '10px 22px',
  borderRadius: '8px',
  border: 'none',
  background: '#d8401c',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'background 0.15s, filter 0.15s',
  ':hover': {
    filter: 'brightness(1.05)',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
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

// ---- Video export (editorial tokens; longhand borders/paddings only) ----

const VOptions = styled('div', {
  marginTop: '4px',
  marginBottom: '18px',
})

const VRow = styled('div', {
  marginBottom: '14px',
})

const VLabel = styled('div', {
  ...overline,
  marginBottom: '7px',
})

const ChipRow = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
})

const Chip = styled('button', ({ $active }: { $active?: boolean }) => ({
  paddingTop: '7px',
  paddingBottom: '7px',
  paddingLeft: '12px',
  paddingRight: '12px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $active ? color.ink : color.line2,
  backgroundColor: $active ? color.ink : color.white,
  color: $active ? color.white : color.ink2,
  fontFamily: font.sans,
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  ':hover': {
    borderColor: color.ink,
  },
  ':disabled': {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
}))

const ChipSub = styled('span', {
  marginLeft: '6px',
  fontFamily: font.mono,
  fontSize: '10px',
  fontWeight: 400,
  opacity: 0.7,
})

const TimeInput = styled('input', {
  width: '84px',
  paddingTop: '6px',
  paddingBottom: '6px',
  paddingLeft: '8px',
  paddingRight: '8px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line2,
  fontFamily: font.mono,
  fontSize: '12px',
  color: color.ink,
})

const Meta = styled('div', {
  fontFamily: font.mono,
  fontSize: '11px',
  color: color.muted,
  marginTop: '6px',
})

const Notice = styled('div', ({ $tone }: { $tone?: 'info' | 'error' }) => ({
  marginTop: '10px',
  paddingTop: '10px',
  paddingBottom: '10px',
  paddingLeft: '12px',
  paddingRight: '12px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $tone === 'error' ? color.danger : color.line,
  backgroundColor: $tone === 'error' ? color.accentSoft : color.surface,
  color: $tone === 'error' ? color.danger : color.ink2,
  fontFamily: font.sans,
  fontSize: '12px',
  lineHeight: 1.45,
}))

const LinkButton = styled('button', {
  marginTop: '8px',
  paddingTop: '6px',
  paddingBottom: '6px',
  paddingLeft: '10px',
  paddingRight: '10px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.ink,
  backgroundColor: color.white,
  color: color.ink,
  fontFamily: font.sans,
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
})

const JobBox = styled('div', {
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  marginTop: '14px',
  paddingTop: '12px',
  paddingBottom: '12px',
  paddingLeft: '12px',
  paddingRight: '12px',
  borderRadius: radius.lg,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line,
  backgroundColor: color.surface,
})

const Thumb = styled('canvas', {
  width: '96px',
  height: '54px',
  flexShrink: 0,
  borderRadius: radius.sm,
  backgroundColor: color.paper2,
  objectFit: 'contain',
})

const Track = styled('div', {
  height: '6px',
  marginTop: '8px',
  borderRadius: '3px',
  backgroundColor: color.paper2,
  overflow: 'hidden',
})

const Fill = styled('div', {
  height: '100%',
  backgroundColor: color.accent,
  transitionProperty: 'width',
  transitionDuration: '0.2s',
})

const Pill = styled('div', {
  position: 'fixed',
  right: '20px',
  bottom: '20px',
  zIndex: 1000,
  width: '300px',
  paddingTop: '12px',
  paddingBottom: '12px',
  paddingLeft: '14px',
  paddingRight: '14px',
  borderRadius: radius.lg,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line2,
  backgroundColor: color.white,
  boxShadow: shadow.pop,
  fontFamily: font.sans,
})

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  designName: string
}

type ExportFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'json' | 'mp4' | 'webm' | 'gif' | 'audio'
type ExportSize = '1x' | '2x' | '3x' | '4x'
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
  { id: 'audio', name: 'Audio', desc: 'Sound only', color: '#64748b' },
]

const MOTION_FORMATS: ExportFormat[] = ['mp4', 'webm', 'gif', 'audio']
const GIF_FPS_OPTIONS = [10, 12, 15]

const PHASE_LABEL: Record<ExportPhase, string> = {
  preparing: 'Copying the page…',
  audio: 'Mixing audio…',
  palette: 'Building the colour palette…',
  frames: 'Rendering',
  finalizing: 'Finishing the file…',
}

interface VideoJob {
  phase: ExportPhase
  done: number
  total: number
  startedAt: number
  mode?: 'snapshot' | 'live'
}

/** While the live editor canvas is being rendered, keyboard shortcuts must not edit it. */
function blockEditorKeys(): () => void {
  const block = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (t && t.closest && t.closest('[data-export-dialog]')) return
    e.stopPropagation()
    e.preventDefault()
  }
  window.addEventListener('keydown', block, true)
  return () => window.removeEventListener('keydown', block, true)
}

function ExportModal({ isOpen, onClose, designName }: ExportModalProps) {
  const editor = useEditor()
  const { canvas, frameSize } = useEditorContext() as any
  const { clips, audioClips, pause, isPlaying, selectedClipIds } = useVideoContext()
  const videoProject = useVideoProjectOptional()
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(90)
  const [size, setSize] = useState<ExportSize>('1x')
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  // Video / GIF / audio export
  const [resolution, setResolution] = useState<ResolutionId>('1080p')
  const [videoFps, setVideoFps] = useState<number>(30)
  const [gifRate, setGifRate] = useState<number>(12)
  const [videoQuality, setVideoQuality] = useState<QualityId>('high')
  const [rangeMode, setRangeMode] = useState<'all' | 'selection' | 'custom'>('all')
  const [rangeStart, setRangeStart] = useState(0)
  const [rangeEnd, setRangeEnd] = useState(0)
  const [caps, setCaps] = useState<Capabilities | null>(null)
  const [job, setJob] = useState<VideoJob | null>(null)
  const [videoError, setVideoError] = useState<{ message: string; suggestion?: ExportFormat } | null>(null)
  const [minimized, setMinimized] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const thumbRef = useRef<HTMLCanvasElement | null>(null)
  const lastUiRef = useRef(0)

  // Multi-page + transparency
  const pageActions = usePageActions()
  const [pageMode, setPageMode] = useState<'current' | 'all' | 'custom'>('current')
  const [customRange, setCustomRange] = useState('')
  const [transparent, setTransparent] = useState(false)
  const [pageStatus, setPageStatus] = useState<string | null>(null)
  // Page switches during a multi-page export change what's on the canvas
  // (and therefore `hasMotion`); don't let the open-effect reset the form then.
  const exportingRef = useRef(false)

  // Submit as Template state
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateName, setTemplateName] = useState(designName || 'Untitled Template')
  const [templateDesc, setTemplateDesc] = useState('')
  const [templateCategory, setTemplateCategory] = useState('general')
  const [templateCmsContext, setTemplateCmsContext] = useState<string[]>([])
  const [templateTags, setTemplateTags] = useState('')
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false)
  const [templateSubmitResult, setTemplateSubmitResult] = useState<string | null>(null)

  // Animated design elements (not just video clips) should also offer video export.
  const hasAnimatedObjects = (() => {
    try {
      const objs = (canvas as any)?.getObjects?.() || []
      return objs.some((o: any) => hasActiveAnimation(getObjectAnimation(o)))
    } catch {
      return false
    }
  })()
  const hasVideo = clips.length > 0 || audioClips.length > 0
  const hasMotion = hasVideo || hasAnimatedObjects
  const isMotionFormat = MOTION_FORMATS.includes(format)
  const FORMATS = hasMotion ? [...VIDEO_FORMATS, ...IMAGE_FORMATS] : IMAGE_FORMATS

  // When the design has motion, default the selected format to MP4 so the primary
  // "Export" button produces a VIDEO — not a single PNG frame. Previously it always
  // defaulted to PNG, so users with a video on the timeline clicked "Export PNG"
  // and got a still image. Re-runs when the modal opens; a manual choice sticks.
  // The last-used format/size/transparency (mfa-export-prefs) wins when it fits.
  useEffect(() => {
    if (!isOpen || exportingRef.current) return
    const prefs = readExportPrefs()
    const saved = prefs.format
    if (hasMotion) setFormat(saved && VIDEO_FORMATS.some(f => f.id === saved) ? (saved as ExportFormat) : 'mp4')
    else setFormat(saved && IMAGE_FORMATS.some(f => f.id === saved) ? (saved as ExportFormat) : 'png')
    if (prefs.size) setSize(prefs.size as ExportSize)
    if (prefs.transparent !== undefined) setTransparent(prefs.transparent)
    setPageMode('current')
  }, [isOpen, hasMotion])

  const pageCount = Math.max(1, pageActions?.pageCount || 1)
  const activeIndex = Math.min(pageActions?.activePage || 0, pageCount - 1)
  const formatIsMultiPage = supportsMultiPage(format)
  const effectivePageMode = formatIsMultiPage ? pageMode : 'current'
  const customParsed = effectivePageMode === 'custom' ? parsePageRange(customRange, pageCount) : null
  const selectedPages: number[] | null =
    effectivePageMode === 'current'
      ? [activeIndex]
      : effectivePageMode === 'all'
        ? Array.from({ length: pageCount }, (_, i) => i)
        : customParsed && customParsed.ok
          ? customParsed.pages
          : null
  const canTransparent = supportsTransparency(format)
  const showTransparentToggle = ['png', 'jpg', 'webp', 'pdf'].includes(format)
  const rasterExt = format === 'jpg' ? 'jpg' : format === 'webp' ? 'webp' : 'png'

  // ---- video export derived state ------------------------------------------------
  const exportDuration = useMemo(() => {
    if (!isOpen || !canvas || !videoProject) return 0
    try {
      return currentDuration(canvas, videoProject.getProject())
    } catch (err) {
      log.warn('export', 'could not measure the video length', err)
      return 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canvas, videoProject?.project])

  const pageHasSound = useMemo(() => {
    if (!isOpen || !canvas || !videoProject) return false
    try {
      return pageHasAudio(canvas, videoProject.getProject())
    } catch (err) {
      ignoreError(err, 'audio presence check for the size estimate')
      return false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canvas, videoProject?.project])

  const selectionRange = useMemo<TimeRange | null>(() => {
    if (!videoProject || !selectedClipIds.length) return null
    const ids = new Set(selectedClipIds)
    const sel = videoProject.project.clips.filter(c => ids.has(c.id))
    if (!sel.length) return null
    return { start: Math.min(...sel.map(c => c.start)), end: Math.max(...sel.map(clipEnd)) }
  }, [videoProject, selectedClipIds])

  useEffect(() => {
    if (!isOpen || exportingRef.current) return
    setRangeMode('all')
    setRangeStart(0)
    setRangeEnd(Math.round(exportDuration * 100) / 100)
    setVideoError(null)
  }, [isOpen, exportDuration])

  const requestedRange: TimeRange | null =
    rangeMode === 'selection' && selectionRange
      ? selectionRange
      : rangeMode === 'custom'
        ? { start: rangeStart, end: rangeEnd }
        : null
  const effectiveRange = clampRange(requestedRange, exportDuration)
  const rangeLength = Math.max(0, effectiveRange.end - effectiveRange.start)
  const page = canvas ? pageRect(canvas) : { width: 1080, height: 1080 }
  const pageSize = { width: page.width || 1080, height: page.height || 1080 }
  const outSize = format === 'gif' ? gifSize(pageSize, GIF_MAX_WIDTH) : outputSize(pageSize, resolution)
  const outFps = format === 'gif' ? gifFps(gifRate) : videoFps
  const estimate = estimateBytes({
    format: format === 'gif' ? 'gif' : format === 'audio' ? 'audio' : 'mp4',
    duration: rangeLength,
    size: outSize,
    fps: outFps,
    quality: videoQuality,
    withAudio: pageHasSound && !(format === 'mp4' && caps && !caps.audioCodec),
  })
  const realtime = format === 'webm' || (format === 'mp4' && caps?.mp4 === 'recorder')
  const formatBlocked =
    (format === 'mp4' && caps !== null && caps.mp4 === null) ||
    (format === 'webm' && caps !== null && !caps.webm) ||
    (format === 'audio' && !pageHasSound)

  // What this browser can encode (MP4 path, resolutions, audio codec).
  useEffect(() => {
    if (!isOpen || !isMotionFormat || !canvas) return
    let live = true
    probeCapabilities(canvas, videoFps, videoQuality)
      .then(c => {
        if (!live) return
        setCaps(c)
        // Keep the choice if it works here, else the largest that does.
        setResolution(prev => {
          if (c.resolutions[prev]) return prev
          const ok = RESOLUTIONS.filter(r => c.resolutions[r.id])
          return ok.length ? ok[ok.length - 1].id : prev
        })
      })
      .catch(err => log.warn('export', 'could not probe video encoders', err))
    return () => {
      live = false
    }
  }, [isOpen, isMotionFormat, canvas, videoFps, videoQuality])

  // An export in flight is cancelled if the dialog goes away entirely.
  useEffect(() => () => abortRef.current?.abort(), [])

  const drawThumb = (src: HTMLCanvasElement) => {
    const c = thumbRef.current
    if (!c || !src.width || !src.height) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const w = 192
    const h = Math.max(1, Math.round((w * src.height) / src.width))
    if (c.width !== w || c.height !== h) {
      c.width = w
      c.height = h
    }
    ctx.drawImage(src, 0, 0, w, h)
  }

  const runVideoExport = async (fmt: ExportFormat) => {
    if (!canvas || !videoProject) {
      notify('The video engine is not ready yet. Try again in a moment.', 'warning')
      return
    }
    if (isPlaying) pause()
    const ac = new AbortController()
    abortRef.current = ac
    exportingRef.current = true
    setIsExporting(true)
    setVideoError(null)
    setJob({ phase: 'preparing', done: 0, total: 1, startedAt: Date.now() })
    writeExportPrefs({ format: fmt, size, transparent })
    let unblock: (() => void) | null = null
    try {
      const result = await runExport(
        {
          canvas,
          project: videoProject.getProject(),
          assetUrl: videoProject.getAssetUrl,
          engine: videoProject.getEngine(),
          clock: videoProject.controller,
        },
        {
          format: fmt === 'gif' ? 'gif' : fmt === 'webm' ? 'webm' : fmt === 'audio' ? 'audio' : 'mp4',
          resolution,
          fps: fmt === 'gif' ? gifRate : videoFps,
          quality: videoQuality,
          range: requestedRange,
        },
        {
          signal: ac.signal,
          onScene: scene => {
            setJob(j => (j ? { ...j, mode: scene.mode } : j))
            if (scene.mode === 'live') {
              setMinimized(false)
              unblock = blockEditorKeys()
            }
          },
          onProgress: p => {
            const now = Date.now()
            if (p.preview && now - lastUiRef.current > 150) drawThumb(p.preview)
            // ~8 UI updates a second is plenty; phase changes always show.
            setJob(j => {
              if (!j) return j
              if (j.phase === p.phase && now - lastUiRef.current < 120 && p.done < p.total) return j
              lastUiRef.current = now
              return { ...j, phase: p.phase, done: p.done, total: p.total }
            })
          },
        },
      )
      downloadBlob(result.blob, `${designName}.${result.ext}`)
      result.warnings.forEach(w => notify(w, 'warning'))
      notify(`Exported ${result.ext.toUpperCase()} (${formatBytes(result.blob.size)}).`, 'positive')
      setMinimized(false)
      setTimeout(onClose, 300)
    } catch (err) {
      setMinimized(false)
      if (isAbort(err)) {
        notify('Export cancelled.', 'info')
      } else if (err instanceof ExportUnsupportedError) {
        setVideoError({ message: err.message, suggestion: err.suggestion as ExportFormat | undefined })
      } else {
        log.error('export', 'video export failed', err)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setVideoError({
          message: /secur|taint|cross-origin/i.test(msg)
            ? "A video or image on this page comes from a host that doesn't allow exporting it. Re-upload it from your device and try again."
            : `Export failed: ${msg}`,
        })
      }
    } finally {
      unblock?.()
      abortRef.current = null
      exportingRef.current = false
      setIsExporting(false)
      setJob(null)
    }
  }

  const cancelVideoExport = () => abortRef.current?.abort()
  const liveJob = !!job && job.mode === 'live'
  const requestClose = () => {
    if (!job) return onClose()
    // Snapshot exports keep running in the corner; live ones need the editor untouched.
    if (!liveJob) setMinimized(true)
  }

  const handleExport = async () => {
    if (isMotionFormat) {
      await runVideoExport(format)
      return
    }
    if (!editor || !selectedPages) return

    exportingRef.current = true
    setIsExporting(true)
    setExportProgress(0)
    setPageStatus(null)
    writeExportPrefs({ format, size, transparent })

    try {
      // Pause playback if it's playing to avoid canvas render conflicts
      if (isPlaying) {
        pause()
      }

      {
        // STATIC IMAGE EXPORT
        // @ts-ignore -- Scenify SDK internal canvas access
        const fabricCanvas = canvas || editor?.canvas
        
        // Handle JSON export separately (uses editor.exportToJSON)
        if (format === 'json') {
          try {
            const jsonData = (editor as any).exportToJSON()
            const jsonString = JSON.stringify(jsonData, null, 2)
            const blob = new Blob([jsonString], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            downloadFile(url, `${designName}.json`)
            URL.revokeObjectURL(url)
            setTimeout(() => { onClose(); setExportProgress(0) }, 500)
          } catch (error) {
            throw new Error('Failed to export JSON: ' + (error instanceof Error ? error.message : 'Unknown error'))
          }
          return
        }

        // Handle SVG export (requires special handling)
        if (format === 'svg') {
          try {
            const svgData = (fabricCanvas as any)?.toSVG?.()
            if (!svgData) {
              throw new Error('SVG export not supported')
            }
            const blob = new Blob([svgData], { type: 'image/svg+xml' })
            const url = URL.createObjectURL(blob)
            downloadFile(url, `${designName}.svg`)
            URL.revokeObjectURL(url)
            setTimeout(() => { onClose(); setExportProgress(0) }, 500)
          } catch (error) {
            throw new Error('Failed to export SVG: ' + (error instanceof Error ? error.message : 'Unknown error'))
          }
          return
        }
        
        // For raster image formats (PNG, JPG, WebP) and PDF, capture the page area
        // with canvas.toDataURL() directly — this bypasses SDK's object conversion
        // that causes errors.
        if (!fabricCanvas) {
          throw new Error('Canvas not available for export')
        }

        const multiplier = parseInt(size) || 1
        const transparentOn = transparent && supportsTransparency(format)
        const pagesToRender = selectedPages
        const total = pagesToRender.length
        // Name files per page unless this is a plain "current page" export.
        const perPageNames = total > 1 || pagesToRender[0] !== activeIndex
        const pdf = format === 'pdf' ? await createPagedPdf() : null
        let webpFallbackWarned = false

        const renderOne = async (index: number, position: number) => {
          if (total > 1) {
            setPageStatus(`Rendering page ${position + 1} of ${total}…`)
            setExportProgress(Math.max(1, Math.round((position / total) * 100)))
          }
          const shot = captureFrame(fabricCanvas, editor, frameSize, multiplier, transparentOn)

          if (pdf) {
            await pdf.addPage(shot.dataUrl, shot.width * multiplier, shot.height * multiplier)
            return
          }
          const nameFor = (ext: string) => (perPageNames ? pageFileName(designName, index, ext) : `${designName}.${ext}`)
          if (format === 'png') {
            downloadFile(shot.dataUrl, nameFor('png'))
          } else {
            // JPG / WebP: re-encode the captured PNG into the requested format and
            // VERIFY the encoder honored it. Browsers silently return PNG when a
            // format (esp. WebP) is unsupported — that's why "Export WebP" handed
            // back a PNG named .webp. If the fallback happens we name the file for
            // what it ACTUALLY is and tell the user, instead of shipping a lie.
            const { blob, type } = await encodeRaster(shot.dataUrl, format, quality)
            if (!blob) throw new Error(`Failed to encode page ${index + 1}`)
            const wantedType = format === 'jpg' ? 'image/jpeg' : 'image/webp'
            let ext: string = format
            if (type && type !== wantedType) {
              ext = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png'
              if (format === 'webp' && !webpFallbackWarned) {
                webpFallbackWarned = true
                notify("Your browser can't encode WebP — exported as PNG instead.", 'warning')
              }
            }
            const url = URL.createObjectURL(blob)
            downloadFile(url, nameFor(ext))
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          }
          // Space out sequential downloads so the browser doesn't drop any.
          if (total > 1) await wait(300)
        }

        const onlyLivePage = total === 1 && pagesToRender[0] === activeIndex
        if (onlyLivePage || !pageActions) {
          await renderOne(activeIndex, 0)
        } else {
          await pageActions.renderPages(pagesToRender, renderOne)
        }

        if (pdf) {
          setPageStatus(total > 1 ? 'Building PDF…' : null)
          pdf.save(`${designName}.pdf`)
        }
        setExportProgress(100)
        if (total > 1) {
          notify(
            pdf ? `Exported ${total} pages to one PDF.` : `Downloaded ${total} files.`,
            'positive'
          )
        }
      }

      setTimeout(() => { onClose(); setExportProgress(0) }, 500)
    } catch (error) {
      notify(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'negative')
    } finally {
      exportingRef.current = false
      setPageStatus(null)
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

  const jobFraction = job ? (job.phase === 'frames' && job.total ? job.done / job.total : job.phase === 'finalizing' ? 1 : 0) : 0
  const jobLabel = job
    ? job.phase === 'frames'
      ? `${PHASE_LABEL.frames} frame ${job.done} of ${job.total}`
      : PHASE_LABEL[job.phase]
    : ''
  const jobEta = (() => {
    if (!job || job.phase !== 'frames' || job.done < 5 || !job.total) return ''
    const elapsed = (Date.now() - job.startedAt) / 1000
    const left = (elapsed / job.done) * (job.total - job.done)
    return `about ${formatDuration(left)} left`
  })()

  if (job && (minimized || !isOpen)) {
    return (
      <Pill role="status" aria-live="polite" data-export-dialog>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: color.ink }}>Exporting {format.toUpperCase()}</span>
          <span style={{ fontFamily: font.mono, fontSize: '11px', color: color.muted }}>{Math.round(jobFraction * 100)}%</span>
        </div>
        <Track>
          <Fill style={{ width: `${Math.round(jobFraction * 100)}%` }} />
        </Track>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '11px', color: color.muted }}>{jobLabel}</span>
          <span style={{ display: 'flex', gap: '6px' }}>
            <Chip onClick={() => setMinimized(false)}>Show</Chip>
            <Chip onClick={cancelVideoExport}>Cancel</Chip>
          </span>
        </div>
      </Pill>
    )
  }

  if (!isOpen) return null

  return (
    <Overlay onClick={requestClose}>
      <Modal onClick={(e) => e.stopPropagation()} data-export-dialog>
        <ModalHeader>
          <ModalTitle>Export {hasMotion ? 'Video' : 'Design'}</ModalTitle>
          <CloseButton onClick={requestClose} disabled={liveJob} aria-label={job ? 'Hide export dialog' : 'Close'}>
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
                disabled={isExporting}
                onClick={() => {
                  setFormat(f.id)
                  setVideoError(null)
                }}
              >
                <FormatIcon $color={f.color}>{f.name}</FormatIcon>
                <FormatName>{f.name}</FormatName>
                <FormatDesc>{f.desc}</FormatDesc>
              </FormatOption>
            ))}
          </FormatGrid>

          {isMotionFormat && (
            <VOptions>
              {format !== 'audio' && format !== 'gif' && (
                <VRow>
                  <VLabel>Resolution</VLabel>
                  <ChipRow role="radiogroup" aria-label="Resolution">
                    {RESOLUTIONS.map(r => {
                      const supported = !caps || caps.resolutions[r.id]
                      const sz = outputSize(pageSize, r.id)
                      return (
                        <Chip
                          key={r.id}
                          role="radio"
                          aria-checked={resolution === r.id}
                          $active={resolution === r.id}
                          disabled={isExporting || !supported}
                          title={supported ? `${sz.width}×${sz.height}` : 'Not supported by this browser'}
                          onClick={() => setResolution(r.id)}
                        >
                          {r.label}
                          <ChipSub>{sz.width}×{sz.height}</ChipSub>
                        </Chip>
                      )
                    })}
                  </ChipRow>
                </VRow>
              )}

              {format !== 'audio' && (
                <VRow>
                  <VLabel>Frame rate</VLabel>
                  <ChipRow role="radiogroup" aria-label="Frame rate">
                    {(format === 'gif' ? GIF_FPS_OPTIONS : (FPS_OPTIONS as readonly number[])).map(f => {
                      const active = (format === 'gif' ? gifRate : videoFps) === f
                      return (
                        <Chip
                          key={f}
                          role="radio"
                          aria-checked={active}
                          $active={active}
                          disabled={isExporting}
                          onClick={() => (format === 'gif' ? setGifRate(f) : setVideoFps(f))}
                        >
                          {f} fps
                        </Chip>
                      )
                    })}
                  </ChipRow>
                  {format === 'gif' && <Meta>GIF: up to {GIF_MAX_WIDTH} px wide, one shared colour palette.</Meta>}
                </VRow>
              )}

              {format !== 'gif' && (
                <VRow>
                  <VLabel>Quality</VLabel>
                  <ChipRow role="radiogroup" aria-label="Quality">
                    {QUALITIES.map(q => (
                      <Chip
                        key={q.id}
                        role="radio"
                        aria-checked={videoQuality === q.id}
                        $active={videoQuality === q.id}
                        disabled={isExporting}
                        onClick={() => setVideoQuality(q.id)}
                      >
                        {q.label}
                      </Chip>
                    ))}
                  </ChipRow>
                </VRow>
              )}

              <VRow>
                <VLabel>Range</VLabel>
                <ChipRow role="radiogroup" aria-label="Range">
                  <Chip role="radio" aria-checked={rangeMode === 'all'} $active={rangeMode === 'all'} disabled={isExporting} onClick={() => setRangeMode('all')}>
                    Whole video
                  </Chip>
                  {selectionRange && (
                    <Chip
                      role="radio"
                      aria-checked={rangeMode === 'selection'}
                      $active={rangeMode === 'selection'}
                      disabled={isExporting}
                      onClick={() => setRangeMode('selection')}
                    >
                      Selected clips
                      <ChipSub>
                        {formatDuration(selectionRange.start)}–{formatDuration(selectionRange.end)}
                      </ChipSub>
                    </Chip>
                  )}
                  <Chip role="radio" aria-checked={rangeMode === 'custom'} $active={rangeMode === 'custom'} disabled={isExporting} onClick={() => setRangeMode('custom')}>
                    Custom
                  </Chip>
                </ChipRow>
                {rangeMode === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <TimeInput
                      type="number"
                      min={0}
                      step={0.1}
                      aria-label="Start, seconds"
                      value={rangeStart}
                      disabled={isExporting}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRangeStart(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                    <span style={{ fontSize: '12px', color: color.muted }}>to</span>
                    <TimeInput
                      type="number"
                      min={0}
                      step={0.1}
                      aria-label="End, seconds"
                      value={rangeEnd}
                      disabled={isExporting}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRangeEnd(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                    <span style={{ fontSize: '12px', color: color.muted }}>seconds</span>
                  </div>
                )}
              </VRow>

              <Meta>
                {rangeLength > 0
                  ? `${formatDuration(rangeLength)} · ${format === 'audio' ? (caps?.audioCodec === 'aac' ? 'M4A (AAC)' : 'WAV') : `${outSize.width}×${outSize.height} · ${outFps} fps`} · ≈ ${formatBytes(estimate)}`
                  : 'Nothing on the timeline yet.'}
                {realtime && rangeLength > 0 ? ` · records in real time (≈ ${formatDuration(rangeLength)})` : ''}
              </Meta>

              {format === 'mp4' && caps && caps.mp4 === null && (
                <Notice $tone="error">
                  This browser can't produce MP4 files.
                  {caps.webm && (
                    <div>
                      <LinkButton onClick={() => setFormat('webm')}>Export WebM instead</LinkButton>
                    </div>
                  )}
                </Notice>
              )}
              {format === 'webm' && caps && !caps.webm && <Notice $tone="error">This browser can't record WebM. Choose MP4.</Notice>}
              {format === 'audio' && !pageHasSound && rangeLength > 0 && <Notice>This page has no sound to export.</Notice>}
              {format === 'mp4' && caps && caps.mp4 && pageHasSound && !caps.audioCodec && (
                <Notice>This browser can't encode sound into MP4 — the file will be silent. Export WebM to keep the sound.</Notice>
              )}
              {realtime && !job && (
                <Notice>This browser exports {format === 'webm' ? 'WebM' : 'MP4'} in real time. Keep this tab visible until it finishes.</Notice>
              )}
              {videoError && (
                <Notice $tone="error" role="alert">
                  {videoError.message}
                  {videoError.suggestion && (
                    <div>
                      <LinkButton
                        onClick={() => {
                          const next = videoError.suggestion as ExportFormat
                          setFormat(next)
                          runVideoExport(next)
                        }}
                      >
                        Export {videoError.suggestion.toUpperCase()} instead
                      </LinkButton>
                    </div>
                  )}
                </Notice>
              )}

              {job && (
                <JobBox aria-live="polite">
                  {format !== 'audio' && <Thumb ref={thumbRef} aria-hidden />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: color.ink }}>{jobLabel}</span>
                      <span style={{ fontFamily: font.mono, fontSize: '11px', color: color.accent }}>{Math.round(jobFraction * 100)}%</span>
                    </div>
                    <Track>
                      <Fill style={{ width: `${Math.round(jobFraction * 100)}%` }} />
                    </Track>
                    <Meta>
                      {job.mode === 'live'
                        ? 'Editing is paused while the export renders this page.'
                        : job.mode === 'snapshot'
                          ? 'You can keep editing — the export renders a snapshot of this page.'
                          : ' '}
                      {jobEta ? ` ${jobEta}.` : ''}
                    </Meta>
                  </div>
                </JobBox>
              )}
            </VOptions>
          )}

          {pageCount > 1 && (
            <OptionSection>
              <SectionTitle>Pages</SectionTitle>
              <SizeOptions role="radiogroup" aria-label="Pages to export">
                <SizeOption
                  role="radio"
                  aria-checked={effectivePageMode === 'current'}
                  $active={effectivePageMode === 'current'}
                  onClick={() => setPageMode('current')}
                  disabled={isExporting}
                >
                  Current page ({activeIndex + 1})
                </SizeOption>
                <SizeOption
                  role="radio"
                  aria-checked={effectivePageMode === 'all'}
                  $active={effectivePageMode === 'all'}
                  onClick={() => setPageMode('all')}
                  disabled={isExporting || !formatIsMultiPage}
                >
                  All pages ({pageCount})
                </SizeOption>
                <SizeOption
                  role="radio"
                  aria-checked={effectivePageMode === 'custom'}
                  $active={effectivePageMode === 'custom'}
                  onClick={() => setPageMode('custom')}
                  disabled={isExporting || !formatIsMultiPage}
                >
                  Custom
                </SizeOption>
              </SizeOptions>
              {effectivePageMode === 'custom' && (
                <RangeInput
                  type="text"
                  aria-label="Pages, for example 1-3, 5"
                  aria-invalid={customParsed ? !customParsed.ok : false}
                  placeholder={`e.g. 1-${Math.min(3, pageCount)}${pageCount > 3 ? `, ${pageCount}` : ''}`}
                  value={customRange}
                  disabled={isExporting}
                  autoFocus
                  $error={!!customRange.trim() && !!customParsed && !customParsed.ok}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomRange(e.target.value)}
                />
              )}
              {!formatIsMultiPage ? (
                <Hint>{format.toUpperCase()} exports the current page only.</Hint>
              ) : customParsed && !customParsed.ok ? (
                <Hint $error={!!customRange.trim()}>{customParsed.error}</Hint>
              ) : selectedPages && selectedPages.length > 1 ? (
                <Hint>
                  {format === 'pdf'
                    ? `One PDF with ${selectedPages.length} pages.`
                    : `Downloads ${selectedPages.length} files (${pageFileName(designName, selectedPages[0], rasterExt)}, …). Your browser may ask to allow multiple downloads.`}
                </Hint>
              ) : null}
            </OptionSection>
          )}

          {!isMotionFormat && isExporting && exportProgress > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span aria-live="polite" style={{ fontSize: '13px', fontWeight: 600, color: '#3a352b' }}>{pageStatus || 'Exporting...'}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#d8401c' }}>{Math.round(exportProgress)}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e6e0d2', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${exportProgress}%`,
                  height: '100%',
                  background: '#d8401c',
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

          {format !== 'svg' && format !== 'json' && !isMotionFormat && (
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

          {showTransparentToggle && (
            <OptionSection style={{ marginTop: '18px' }}>
              <ToggleRow $disabled={!canTransparent}>
                <input
                  type="checkbox"
                  checked={canTransparent && transparent}
                  disabled={!canTransparent || isExporting}
                  onChange={e => setTransparent(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: '#d8401c', cursor: 'inherit' }}
                />
                <span>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3a352b' }}>
                    Transparent background
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: '#736d5c', marginTop: '2px' }}>
                    {canTransparent
                      ? 'Removes the page background so only your elements are exported.'
                      : `${format.toUpperCase()} can't be transparent. Choose PNG or WebP.`}
                  </span>
                </span>
              </ToggleRow>
            </OptionSection>
          )}

          {/* ── Share with Community (scrolls with the body) ── */}
          <div style={{ borderTop: '1px solid #e6e0d2', marginTop: '20px', paddingTop: '16px' }}>
          {!showTemplateForm ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#3a352b' }}>Share with Community</div>
                <div style={{ fontSize: '12px', color: '#a39d8c', marginTop: '2px' }}>Submit this design as a free template for others</div>
              </div>
              <button
                onClick={() => { setShowTemplateForm(true); setTemplateName(designName || 'Untitled Template') }}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #d8401c',
                  background: '#fff', color: '#d8401c', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Submit as Template
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#3a352b' }}>Submit as Template</div>
              {templateSubmitResult && (
                <div style={{
                  padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                  background: templateSubmitResult.startsWith('Error') ? '#FEF2F2' : '#F0FDF4',
                  color: templateSubmitResult.startsWith('Error') ? '#DC2626' : '#16A34A',
                }}>
                  {templateSubmitResult}
                </div>
              )}
              <input
                type="text" placeholder="Template name" value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e6e0d2', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
              />
              <textarea
                placeholder="Description (optional)" value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e6e0d2', fontSize: '13px', minHeight: '60px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
              />
              <select
                value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e6e0d2', fontSize: '13px' }}
              >
                <option value="general">General</option>
                <option value="social">Social Media</option>
                <option value="ecommerce">E-commerce</option>
                <option value="blog">Blog / Content</option>
                <option value="marketing">Marketing</option>
                <option value="presentation">Presentation</option>
                <option value="print">Print</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['webflow', 'shopify', 'wordpress'].map(cms => (
                  <label key={cms} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={templateCmsContext.includes(cms)}
                      onChange={(e) => {
                        if (e.target.checked) setTemplateCmsContext([...templateCmsContext, cms])
                        else setTemplateCmsContext(templateCmsContext.filter(c => c !== cms))
                      }}
                    />
                    {cms.charAt(0).toUpperCase() + cms.slice(1)}
                  </label>
                ))}
              </div>
              <input
                type="text" placeholder="Tags (comma separated)" value={templateTags}
                onChange={(e) => setTemplateTags(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e6e0d2', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowTemplateForm(false); setTemplateSubmitResult(null) }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e6e0d2', background: '#fff', color: '#736d5c', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingTemplate || !templateName.trim()}
                  onClick={async () => {
                    if (!canvas || !templateName.trim()) return
                    setIsSubmittingTemplate(true)
                    setTemplateSubmitResult(null)
                    try {
                      const canvasJSON = canvas.toJSON()
                      const thumbnail = canvas.toDataURL({ format: 'png', quality: 0.6, multiplier: 0.3 })
                      const frame = frameSize || { width: canvas.getWidth(), height: canvas.getHeight() }
                      await marketifyallApi.submitTemplate({
                        name: templateName.trim(),
                        description: templateDesc,
                        category: templateCategory,
                        cms_context: templateCmsContext,
                        tags: templateTags.split(',').map(t => t.trim()).filter(Boolean),
                        canvas_data: canvasJSON,
                        frame,
                        thumbnail_url: thumbnail,
                      })
                      setTemplateSubmitResult('Template submitted for review!')
                      setTimeout(() => setShowTemplateForm(false), 2000)
                    } catch (err: any) {
                      setTemplateSubmitResult(`Error: ${err.message || 'Submission failed'}`)
                    } finally {
                      setIsSubmittingTemplate(false)
                    }
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                    background: isSubmittingTemplate ? '#a39d8c' : '#d8401c', color: '#fff',
                    fontSize: '13px', fontWeight: 600, cursor: isSubmittingTemplate ? 'wait' : 'pointer',
                  }}
                >
                  {isSubmittingTemplate ? 'Submitting...' : 'Submit Template'}
                </button>
              </div>
            </div>
          )}
          </div>
        </ModalBody>

        <ModalFooter>
          {job ? (
            <>
              {!liveJob && <CancelButton onClick={() => setMinimized(true)}>Keep editing</CancelButton>}
              <CancelButton onClick={cancelVideoExport}>Cancel export</CancelButton>
            </>
          ) : (
            <CancelButton onClick={onClose}>Cancel</CancelButton>
          )}
          <ExportButton
            onClick={handleExport}
            disabled={isExporting || (isMotionFormat ? formatBlocked || rangeLength <= 0 : !selectedPages)}
          >
            {isExporting ? (
              <>
                <LoadingSpinner />
                {pageStatus || 'Exporting...'}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export {format === 'audio' ? 'audio' : format.toUpperCase()}
                {!isMotionFormat && selectedPages && selectedPages.length > 1 ? ` · ${selectedPages.length} pages` : ''}
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
