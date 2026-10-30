import { useEffect, useMemo, useState, useCallback } from 'react'
import useAppContext from '@/hooks/useAppContext'
import { useLocation } from 'react-router'
import { getElements } from '@store/slices/elements/actions'
import { getFonts } from '@store/slices/fonts/actions'
import { useAppDispatch } from '@store/store'
import ContextMenu from '@scenes/Editor/components/ContextMenu'
import VideoTimeline from '@scenes/Editor/components/VideoTimeline'
import VideoEngine from '@/video/VideoEngine'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal'
import { useCredits } from '@/contexts/CreditsContext'
import EmbedNavbar from './EmbedNavbar'
import Editor, { useEditor } from '@nkyo/scenify-sdk'
import { fabric } from 'fabric'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { log } from '@/lib/logger'
import useCanvasEnhancements from '@/hooks/useCanvasEnhancements'
import Rulers from '@scenes/Editor/components/Rulers'
import { color } from '@/theme/tokens'
import ResponsiveEditorLayout from '@scenes/Editor/mobile/ResponsiveEditorLayout'
import '@/styles/editor-theme.css'

interface CanvasObject {
  name?: string
  id?: string
  type?: string
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  fill?: string
  originX?: string
  originY?: string
  getBoundingRect: () => { left: number; top: number; width: number; height: number }
  set: (props: Record<string, unknown>) => void
  setCoords: () => void
}

interface CanvasWithExtras {
  canvas?: CanvasWithExtras
  clipPath?: CanvasObject | null
  getObjects?: () => CanvasObject[]
  getActiveObject?: () => CanvasObject | null
  requestRenderAll?: () => void
  controlsAboveOverlay?: boolean
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  off?: (event: string, handler: (...args: unknown[]) => void) => void
}

interface EditorWithCanvas {
  canvas?: CanvasWithExtras
  importFromJSON: (data: unknown) => void
  add: (options: unknown) => void
  update: (options: unknown) => void
}

function getCanvas(editor: EditorWithCanvas): CanvasWithExtras | null {
  const raw = editor.canvas as CanvasWithExtras | undefined
  return raw?.canvas || raw || null
}

function EmbedEditorApp() {
  const { setCurrentTemplate } = useAppContext()
  const editor = useEditor() as unknown as EditorWithCanvas | null
  useCanvasEnhancements(editor)
  const location = useLocation()
  const dispatch = useAppDispatch()
  const [hasInitialized, setHasInitialized] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { showUpgradeModal, upgradeModalData, dismissUpgradeModal } = useCredits()


  const searchParams = new URLSearchParams(location.search)
  const imgUrl = searchParams.get('img_url')
  const prebuiltJsonUrl = searchParams.get('prebuilt_json_url')

  useEffect(() => {
    dispatch(getElements())
    dispatch(getFonts())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editorConfig = useMemo(() => ({ clipToFrame: true, scrollLimit: 0 }), [])

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const imageUrl = e.dataTransfer.getData('image-url')
    if (!imageUrl || !editor) return
    const canvas = (editor as any).canvas?.canvas || (editor as any).canvas
    if (!canvas) return
    addObjectToCanvas(editor, {
      type: 'StaticImage',
      metadata: { src: imageUrl },
    }, 400, canvas)
  }, [editor])

  const loadFonts = useCallback((fonts: Array<{ name: string; url: string; options: FontFaceDescriptors }>) => {
    const promisesList = fonts.map(font => {
      return new FontFace(font.name, `url(${font.url})`, font.options).load().catch(() => null)
    })
    return Promise.all(promisesList).then(res => {
      res.forEach(uniqueFont => {
        if (uniqueFont && uniqueFont.family) {
          document.fonts.add(uniqueFont)
        }
      })
    })
  }, [])

  const handleLoadTemplate = useCallback(
    async (template: { objects: Array<{ type: string; metadata: { fontFamily: string; fontURL: string } }> }) => {
      const fonts: Array<{ name: string; url: string; options: FontFaceDescriptors }> = []
      template.objects.forEach(object => {
        if (object.type === 'StaticText' || object.type === 'DynamicText') {
          fonts.push({
            name: object.metadata.fontFamily,
            url: object.metadata.fontURL,
            options: { style: 'normal', weight: '400' } as FontFaceDescriptors,
          })
        }
      })

      const filteredFonts = fonts.filter(f => !!f.url)
      if (filteredFonts.length > 0) {
        await loadFonts(filteredFonts)
      }

      editor?.importFromJSON(template)
    },
    [editor, loadFonts],
  )

  const handleLoadImageTemplate = useCallback(
    (imageUrl: string) => {
      if (!editor) return
      try {
        const imageOptions = {
          type: 'StaticImage',
          metadata: { src: imageUrl },
        }
        editor.add(imageOptions)
      } catch (err) {
        setLoadError('Failed to load image onto canvas')
      }
    },
    [editor],
  )

  useEffect(() => {
    if (!editor || hasInitialized) return
    setHasInitialized(true)

    const canvas = getCanvas(editor)
    if (!canvas) return

    if (prebuiltJsonUrl) {
      fetch(prebuiltJsonUrl)
        .then(res => res.json())
        .then(template => {
          setCurrentTemplate(template)
          handleLoadTemplate(template)
        })
        .catch(() => {
          setLoadError('Failed to load template from URL')
        })
    } else if (imgUrl) {
      handleLoadImageTemplate(imgUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Constrain objects to stay within canvas bounds
  useEffect(() => {
    if (!editor) return

    const canvas = getCanvas(editor)
    if (!canvas) return

    const setupClipping = () => {
      try {
        const objects = canvas.getObjects?.() || []
        const clipObj = objects.find(
          (obj: CanvasObject) =>
            obj.id === 'clip' ||
            obj.name === 'clip' ||
            obj.type === 'Frame' ||
            (obj.type === 'Rect' && (obj.fill === '#ffffff' || obj.fill === 'white') && (obj.width || 0) >= 400),
        )

        if (!clipObj) return

        const w = (clipObj.width || 0) * (clipObj.scaleX || 1)
        const h = (clipObj.height || 0) * (clipObj.scaleY || 1)
        let l = clipObj.left || 0
        let t = clipObj.top || 0
        if (clipObj.originX === 'center') l -= w / 2
        if (clipObj.originY === 'center') t -= h / 2

        // Reuse the existing clip rect and bail when frame geometry is unchanged
        // (and the after:render render loop is removed below). See Editor.tsx.
        const existing = (canvas as any).clipPath as fabric.Rect | undefined
        if (
          existing &&
          Math.abs((existing.left || 0) - l) < 0.5 &&
          Math.abs((existing.top || 0) - t) < 0.5 &&
          Math.abs((existing.width || 0) - w) < 0.5 &&
          Math.abs((existing.height || 0) - h) < 0.5
        ) {
          return
        }

        if (existing && typeof existing.set === 'function') {
          existing.set({ left: l, top: t, width: w, height: h })
          existing.setCoords?.()
        } else {
          ;(canvas as any).clipPath = new fabric.Rect({
            left: l,
            top: t,
            width: w,
            height: h,
            absolutePositioned: true,
            selectable: false,
            evented: false,
            fill: 'transparent',
          })
        }
        ;(canvas as any).controlsAboveOverlay = true
        canvas.requestRenderAll?.()
      } catch (err) {
        log.warn('embed', 'frame clipping setup failed', err)
      }
    }

    // Objects may hang off the page; the frame clip hides the overflow.
    const onMoving = () => {
      setupClipping()
    }

    canvas.on?.('object:moving', onMoving)
    canvas.on?.('object:modified', setupClipping)
    canvas.on?.('object:scaling', setupClipping)
    canvas.on?.('object:added', setupClipping)
    canvas.on?.('object:removed', setupClipping)

    setupClipping()

    return () => {
      canvas.off?.('object:moving', onMoving)
      canvas.off?.('object:modified', setupClipping)
      canvas.off?.('object:scaling', setupClipping)
      canvas.off?.('object:added', setupClipping)
      canvas.off?.('object:removed', setupClipping)
    }
  }, [editor])

  // Same responsive shell as the standalone editor (desktop / tablet / phone).
  const stage = (
    <div
      style={{
        flex: 1,
        display: 'flex',
        background: color.canvasBg,
        position: 'relative',
        overflow: 'hidden',
      }}
      className="canvas-container"
      onDrop={handleCanvasDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {loadError ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: '#ef4444',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <p>{loadError}</p>
          <button
            onClick={() => setLoadError(null)}
            style={{
              padding: '8px 16px',
              background: '#f3efe4',
              border: '1px solid #e6e0d2',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <Editor config={editorConfig} />
      )}
      <ErrorBoundary fallback={null}>
        <Rulers />
      </ErrorBoundary>
      <VideoEngine />
    </div>
  )

  return (
    <ResponsiveEditorLayout
      topbar={<EmbedNavbar />}
      topbarClassName="mfa-topbar--embed"
      stage={stage}
      timeline={
        <ErrorBoundary fallback={null}>
          <VideoTimeline />
        </ErrorBoundary>
      }
      after={
        <>
          <ContextMenu />
          <InsufficientCreditsModal
            isOpen={showUpgradeModal}
            onClose={dismissUpgradeModal}
            balance={upgradeModalData?.balance || 0}
            cost={upgradeModalData?.cost || 0}
          />
        </>
      }
    />
  )
}

export default EmbedEditorApp
