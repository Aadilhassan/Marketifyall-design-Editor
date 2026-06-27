import { useEffect, useMemo, useState, useCallback } from 'react'
import useAppContext from '@/hooks/useAppContext'
import { useLocation } from 'react-router'
import { getElements } from '@store/slices/elements/actions'
import { getFonts } from '@store/slices/fonts/actions'
import { getTemplates } from '@store/slices/templates/actions'
import { useAppDispatch } from '@store/store'
import useVideoContext from '@/hooks/useVideoContext'
import Navbar from './components/Navbar'
import Panels from './components/Panels'
import Toolbox from './components/Toolbox'
import Footer from './components/Footer'
import ContextMenu from './components/ContextMenu'
import VideoTimeline from './components/VideoTimeline'
import VideoCanvasPlayer from './components/VideoCanvasPlayer'
import AnimationDriver from './components/AnimationDriver'
import { ToasterContainer, PLACEMENT } from 'baseui/toast'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal'
import { useCredits } from '@/contexts/CreditsContext'
import Editor, { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { fabric } from 'fabric'
import { addObjectToCanvas } from '@/utils/editorHelpers'

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

function App() {
  const { setCurrentTemplate } = useAppContext()
  const editor = useEditor() as unknown as EditorWithCanvas | null
  const location = useLocation()
  const dispatch = useAppDispatch()
  const [hasInitialized, setHasInitialized] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { clips, audioClips, isTimelineOpen } = useVideoContext()
  const { showUpgradeModal, upgradeModalData, dismissUpgradeModal } = useCredits()

  const hasTimelineContent = clips.length > 0 || audioClips.length > 0
  const shouldShowTimeline = hasTimelineContent && isTimelineOpen

  const searchParams = new URLSearchParams(location.search)
  const imgUrl = searchParams.get('img_url')
  const prebuiltJsonUrl = searchParams.get('prebuilt_json_url')

  useEffect(() => {
    dispatch(getElements())
    dispatch(getFonts())
    dispatch(getTemplates())
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

    const getFrameBounds = () => {
      const clipPath = canvas.clipPath
      if (clipPath) {
        const frameLeft = clipPath.left || 175.5
        const frameTop = clipPath.top || -286.5
        const frameWidth = clipPath.width || 900
        const frameHeight = clipPath.height || 1200
        return { frameLeft, frameTop, frameRight: frameLeft + frameWidth, frameBottom: frameTop + frameHeight }
      }

      const objects = canvas.getObjects?.() || []
      const clipObj = objects.find((o: CanvasObject) => o.name === 'clip' || o.id === 'clip')
      if (!clipObj) return null

      const frameLeft = clipObj.left || 175.5
      const frameTop = clipObj.top || -286.5
      const frameWidth = (clipObj.width || 900) * (clipObj.scaleX || 1)
      const frameHeight = (clipObj.height || 1200) * (clipObj.scaleY || 1)
      return { frameLeft, frameTop, frameRight: frameLeft + frameWidth, frameBottom: frameTop + frameHeight }
    }

    const constrainObject = (obj: CanvasObject) => {
      if (!obj || obj.name === 'clip' || obj.id === 'clip') return

      try {
        const bounds = getFrameBounds()
        if (!bounds) return

        const { frameLeft, frameTop, frameRight, frameBottom } = bounds
        const boundingRect = obj.getBoundingRect()

        let deltaX = 0
        let deltaY = 0

        if (boundingRect.left < frameLeft) {
          deltaX = frameLeft - boundingRect.left
        } else if (boundingRect.left + boundingRect.width > frameRight) {
          deltaX = frameRight - (boundingRect.left + boundingRect.width)
        }

        if (boundingRect.top < frameTop) {
          deltaY = frameTop - boundingRect.top
        } else if (boundingRect.top + boundingRect.height > frameBottom) {
          deltaY = frameBottom - (boundingRect.top + boundingRect.height)
        }

        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          const currentLeft = (obj.left || 0) as number
          const currentTop = (obj.top || 0) as number
          obj.set({ left: currentLeft + deltaX, top: currentTop + deltaY })
          obj.setCoords()
          canvas.requestRenderAll?.()
        }
      } catch {
        // Canvas not ready or object invalid
      }
    }

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

        if (clipObj) {
          const w = (clipObj.width || 0) * (clipObj.scaleX || 1)
          const h = (clipObj.height || 0) * (clipObj.scaleY || 1)
          let l = clipObj.left || 0
          let t = clipObj.top || 0

          if (clipObj.originX === 'center') l -= w / 2
          if (clipObj.originY === 'center') t -= h / 2

          const clipPath = new fabric.Rect({
            left: l,
            top: t,
            width: w,
            height: h,
            absolutePositioned: true,
            selectable: false,
            evented: false,
            fill: 'transparent',
          })

          ;(canvas as any).clipPath = clipPath
          ;(canvas as any).controlsAboveOverlay = true
          canvas.requestRenderAll?.()
        }
      } catch {
        // Clipping setup failed
      }
    }

    const onMoving = () => {
      const activeObj = canvas.getActiveObject?.()
      if (activeObj) constrainObject(activeObj as CanvasObject)
      setupClipping()
    }

    canvas.on?.('object:moving', onMoving)
    canvas.on?.('object:modified', setupClipping)
    canvas.on?.('object:scaling', setupClipping)
    canvas.on?.('after:render', setupClipping)
    canvas.on?.('object:added', setupClipping)
    canvas.on?.('object:removed', setupClipping)

    setupClipping()

    return () => {
      canvas.off?.('object:moving', onMoving)
      canvas.off?.('object:modified', setupClipping)
      canvas.off?.('object:scaling', setupClipping)
      canvas.off?.('after:render', setupClipping)
      canvas.off?.('object:added', setupClipping)
      canvas.off?.('object:removed', setupClipping)
    }
  }, [editor])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ position: 'relative', zIndex: 100 }}>
        <Navbar />
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ErrorBoundary fallback={<div style={{ padding: 20, color: '#ef4444' }}>Panel failed to load</div>}>
          <Panels />
        </ErrorBoundary>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <ErrorBoundary fallback={<div style={{ padding: 10, color: '#ef4444' }}>Toolbar error</div>}>
            <Toolbox />
          </ErrorBoundary>
          <div
            style={{
              flex: 1,
              display: 'flex',
              background: '#f1f2f6',
              position: 'relative',
              overflow: 'hidden',
              paddingBottom: shouldShowTimeline ? '300px' : '0',
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
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
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
            <ToasterContainer placement={PLACEMENT.bottomRight} autoHideDuration={4500} />
            <AnimationDriver />
            <VideoCanvasPlayer />
            <ErrorBoundary fallback={null}>
              <VideoTimeline />
            </ErrorBoundary>
          </div>
          <Footer />
        </div>
      </div>
      <ContextMenu />
      <InsufficientCreditsModal
        isOpen={showUpgradeModal}
        onClose={dismissUpgradeModal}
        balance={upgradeModalData?.balance || 0}
        cost={upgradeModalData?.cost || 0}
      />
    </div>
  )
}

export default App
