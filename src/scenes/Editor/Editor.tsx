import { useEffect, useMemo, useState } from 'react'
import useAppContext from '@/hooks/useAppContext'
import { useLocation } from 'react-router'
import { getElements } from '@store/slices/elements/actions'
import { getFonts } from '@store/slices/fonts/actions'
import { useAppDispatch } from '@store/store'
import useVideoContext from '@/hooks/useVideoContext'
import Navbar from './components/Navbar'
import Panels from './components/Panels'
import Toolbox from './components/Toolbox'
import Footer from './components/Footer'
import ContextMenu from './components/ContextMenu'
import VideoTimeline from './components/VideoTimeline'
import VideoCanvasPlayer from './components/VideoCanvasPlayer'
import Editor, { useEditor } from '@nkyo/scenify-sdk'

function App() {
  const { setCurrentTemplate, activePanel } = useAppContext()
  const editor = useEditor()
  const location = useLocation()
  const dispath = useAppDispatch()
  const [hasInitialized, setHasInitialized] = useState(false)
  const { clips, audioClips, isTimelineOpen } = useVideoContext()

  // Check if timeline should be visible (has video/animation content)
  const hasTimelineContent = clips.length > 0 || audioClips.length > 0
  const shouldShowTimeline = hasTimelineContent && isTimelineOpen

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search)
  const imgUrl = searchParams.get('img_url')
  const userId = searchParams.get('user_id') // Used for context/tracking
  const prebuiltJsonUrl = searchParams.get('prebuilt_json_url')

  useEffect(() => {
    dispath(getElements())
    dispath(getFonts())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const editorConfig = useMemo(() => ({ clipToFrame: true, scrollLimit: 0 }), [])

  useEffect(() => {
    if (editor && !hasInitialized) {
      setHasInitialized(true)
      console.log('Editor initialized')

      // Wait a bit for editor to be fully ready
      setTimeout(() => {
        try {
          // @ts-ignore
          const canvas = editor.canvas?.canvas || editor.canvas
          if (canvas) {
            console.log('Canvas is available')
            // @ts-ignore
            const objects = canvas.getObjects?.() || []
            console.log('Initial canvas objects:', objects.length)
          }
        } catch (e) {
          console.warn('Could not check canvas on init:', e)
        }

        // Load template from prebuilt_json_url if provided
        if (prebuiltJsonUrl) {
          fetch(prebuiltJsonUrl)
            .then(res => res.json())
            .then(template => {
              setCurrentTemplate(template)
              handleLoadTemplate(template)
            })
            .catch(err => console.error('Error loading template from URL:', err))
        }
        // If img_url is provided, preload image on canvas
        else if (imgUrl) {
          handleLoadImageTemplate(imgUrl)
        }
        // Editor should handle blank canvas initialization automatically
      }, 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Constrain objects (images, text, etc.) to stay within canvas bounds
  useEffect(() => {
    if (!editor) return

    // @ts-ignore
    const canvas = editor.canvas?.canvas || editor.canvas
    if (!canvas) return

    const constrainObjectToCanvas = (e: any) => {
      const obj = e.target
      if (!obj || obj.name === 'clip' || obj.id === 'clip') return // Don't constrain the clip object itself

      try {
        // Get canvas frame (clipPath) bounds
        const clipPath = canvas.clipPath
        if (!clipPath) {
          // Fallback: try to find the clip object
          // @ts-ignore
          const objects = canvas.getObjects?.() || []
          const clipObj = objects.find((o: any) => o.name === 'clip' || o.id === 'clip')
          if (!clipObj) return

          const frameLeft = clipObj.left || 175.5
          const frameTop = clipObj.top || -286.5
          const frameWidth = (clipObj.width || 900) * (clipObj.scaleX || 1)
          const frameHeight = (clipObj.height || 1200) * (clipObj.scaleY || 1)
          const frameRight = frameLeft + frameWidth
          const frameBottom = frameTop + frameHeight

          // Get object bounding box (accounting for rotation and scale)
          const boundingRect = obj.getBoundingRect()
          const boundingLeft = boundingRect.left
          const boundingTop = boundingRect.top
          const boundingRight = boundingLeft + boundingRect.width
          const boundingBottom = boundingTop + boundingRect.height

          // Calculate how much the object needs to move to stay within bounds
          let deltaX = 0
          let deltaY = 0

          if (boundingLeft < frameLeft) {
            deltaX = frameLeft - boundingLeft
          } else if (boundingRight > frameRight) {
            deltaX = frameRight - boundingRight
          }

          if (boundingTop < frameTop) {
            deltaY = frameTop - boundingTop
          } else if (boundingBottom > frameBottom) {
            deltaY = frameBottom - boundingBottom
          }

          // Update object position if constraint is needed
          if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
            // Get current position
            const currentLeft = obj.left || 0
            const currentTop = obj.top || 0

            // Calculate new position
            const newLeft = currentLeft + deltaX
            const newTop = currentTop + deltaY

            obj.set({
              left: newLeft,
              top: newTop,
            })
            obj.setCoords()
            canvas.requestRenderAll()
          }
          return
        }

        const frameLeft = clipPath.left || 175.5
        const frameTop = clipPath.top || -286.5
        const frameWidth = clipPath.width || 900
        const frameHeight = clipPath.height || 1200
        const frameRight = frameLeft + frameWidth
        const frameBottom = frameTop + frameHeight

        // Get object bounding box (accounting for rotation and scale)
        const boundingRect = obj.getBoundingRect()
        const boundingLeft = boundingRect.left
        const boundingTop = boundingRect.top
        const boundingRight = boundingLeft + boundingRect.width
        const boundingBottom = boundingTop + boundingRect.height

        // Calculate how much the object needs to move to stay within bounds
        let deltaX = 0
        let deltaY = 0

        if (boundingLeft < frameLeft) {
          deltaX = frameLeft - boundingLeft
        } else if (boundingRight > frameRight) {
          deltaX = frameRight - boundingRight
        }

        if (boundingTop < frameTop) {
          deltaY = frameTop - boundingTop
        } else if (boundingBottom > frameBottom) {
          deltaY = frameBottom - boundingBottom
        }

        // Update object position if constraint is needed
        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          // Get current position
          const currentLeft = obj.left || 0
          const currentTop = obj.top || 0

          // Calculate new position
          const newLeft = currentLeft + deltaX
          const newTop = currentTop + deltaY

          obj.set({
            left: newLeft,
            top: newTop,
          })
          obj.setCoords()
          canvas.requestRenderAll()
        }
      } catch (error) {
        console.warn('Error constraining object:', error)
      }
    }

    // Also constrain on object modification (resizing, etc.)
    const constrainObjectOnModify = (e: any) => {
      const obj = e.target
      if (!obj || obj.name === 'clip' || obj.id === 'clip') return

      try {
        // Get canvas frame (clipPath) bounds
        const clipPath = canvas.clipPath
        if (!clipPath) {
          // Fallback: try to find the clip object
          // @ts-ignore
          const objects = canvas.getObjects?.() || []
          const clipObj = objects.find((o: any) => o.name === 'clip' || o.id === 'clip')
          if (!clipObj) return

          const frameLeft = clipObj.left || 175.5
          const frameTop = clipObj.top || -286.5
          const frameWidth = (clipObj.width || 900) * (clipObj.scaleX || 1)
          const frameHeight = (clipObj.height || 1200) * (clipObj.scaleY || 1)
          const frameRight = frameLeft + frameWidth
          const frameBottom = frameTop + frameHeight

          // Get object bounding box (accounting for rotation and scale)
          const boundingRect = obj.getBoundingRect()
          const boundingLeft = boundingRect.left
          const boundingTop = boundingRect.top
          const boundingRight = boundingLeft + boundingRect.width
          const boundingBottom = boundingTop + boundingRect.height

          // Calculate how much the object needs to move to stay within bounds
          let deltaX = 0
          let deltaY = 0

          if (boundingLeft < frameLeft) {
            deltaX = frameLeft - boundingLeft
          } else if (boundingRight > frameRight) {
            deltaX = frameRight - boundingRight
          }

          if (boundingTop < frameTop) {
            deltaY = frameTop - boundingTop
          } else if (boundingBottom > frameBottom) {
            deltaY = frameBottom - boundingBottom
          }

          // Update if needed
          if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
            // Get current position
            const currentLeft = obj.left || 0
            const currentTop = obj.top || 0

            // Calculate new position
            const newLeft = currentLeft + deltaX
            const newTop = currentTop + deltaY

            obj.set({
              left: newLeft,
              top: newTop,
            })
            obj.setCoords()
            canvas.requestRenderAll()
          }
          return
        }

        const frameLeft = clipPath.left || 175.5
        const frameTop = clipPath.top || -286.5
        const frameWidth = clipPath.width || 900
        const frameHeight = clipPath.height || 1200
        const frameRight = frameLeft + frameWidth
        const frameBottom = frameTop + frameHeight

        // Get object bounding box (accounting for rotation and scale)
        const boundingRect = obj.getBoundingRect()
        const boundingLeft = boundingRect.left
        const boundingTop = boundingRect.top
        const boundingRight = boundingLeft + boundingRect.width
        const boundingBottom = boundingTop + boundingRect.height

        // Calculate how much the object needs to move to stay within bounds
        let deltaX = 0
        let deltaY = 0

        if (boundingLeft < frameLeft) {
          deltaX = frameLeft - boundingLeft
        } else if (boundingRight > frameRight) {
          deltaX = frameRight - boundingRight
        }

        if (boundingTop < frameTop) {
          deltaY = frameTop - boundingTop
        } else if (boundingBottom > frameBottom) {
          deltaY = frameBottom - boundingBottom
        }

        // Update if needed
        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          // Get current position
          const currentLeft = obj.left || 0
          const currentTop = obj.top || 0

          // Calculate new position
          const newLeft = currentLeft + deltaX
          const newTop = currentTop + deltaY

          obj.set({
            left: newLeft,
            top: newTop,
          })
          obj.setCoords()
          canvas.requestRenderAll()
        }
      } catch (error) {
        console.warn('Error constraining object on modify:', error)
      }
    }

    // Set up canvas clipping path (Secondary safety layer)
    const setupClipping = () => {
      try {
        // @ts-ignore
        const objects = canvas.getObjects?.() || []
        // Smarter search for the design frame
        const clipObj = objects.find((obj: any) =>
          obj.id === 'clip' ||
          obj.name === 'clip' ||
          obj.type === 'Frame' ||
          (obj.type === 'Rect' && (obj.fill === '#ffffff' || obj.fill === 'white') && (obj.width || 0) >= 400)
        )

        if (clipObj) {
          const w = (clipObj.width || 0) * (clipObj.scaleX || 1)
          const h = (clipObj.height || 0) * (clipObj.scaleY || 1)
          let l = clipObj.left || 0
          let t = clipObj.top || 0

          if (clipObj.originX === 'center') l -= w / 2
          if (clipObj.originY === 'center') t -= h / 2

          // Use a dedicated Rect for clipping to ensure absolute positioning and avoid origin conflicts
          // @ts-ignore
          const clipPath = new fabric.Rect({
            left: l,
            top: t,
            width: w,
            height: h,
            absolutePositioned: true,
            selectable: false,
            evented: false,
            fill: 'transparent'
          })

          // @ts-ignore
          canvas.clipPath = clipPath
          // @ts-ignore
          canvas.controlsAboveOverlay = true // Selection box stays visible, but content is clipped
          // @ts-ignore
          canvas.requestRenderAll?.()
        }
      } catch (err) {
        console.warn('Error setting up clipping:', err)
      }
    }

    // Listen to all interaction events to keep clipping perfectly synced
    canvas.on?.('object:moving', () => {
      constrainObjectToCanvas({ target: canvas.getActiveObject() })
      setupClipping()
    })
    canvas.on?.('object:modified', setupClipping)
    canvas.on?.('object:scaling', setupClipping)
    canvas.on?.('after:render', setupClipping)

    // Listen for object additions to ensure clipping is active
    canvas.on?.('object:added', setupClipping)
    canvas.on?.('object:removed', setupClipping)

    // Initial setup
    setupClipping()

    return () => {
      canvas.off?.('object:moving', setupClipping)
      canvas.off?.('object:modified', setupClipping)
      canvas.off?.('object:scaling', setupClipping)
      canvas.off?.('after:render', setupClipping)
      canvas.off?.('object:added', setupClipping)
      canvas.off?.('object:removed', setupClipping)
    }
  }, [editor])

  // Auto-save feature with debounced saves
  // Let the package handle autosave and change/save callbacks

  const handleLoadTemplate = async template => {
    const fonts = []
    template.objects.forEach(object => {
      if (object.type === 'StaticText' || object.type === 'DynamicText') {
        fonts.push({
          name: object.metadata.fontFamily,
          url: object.metadata.fontURL,
          options: { style: 'normal', weight: 400 },
        })
      }
    })

    const filteredFonts = fonts.filter(f => !!f.url)
    if (filteredFonts.length > 0) {
      await loadFonts(filteredFonts)
    }

    editor.importFromJSON(template)
  }

  const handleLoadBlankCanvas = () => {
    // Load an empty canvas with default white background
    const blankTemplate = {
      version: '5.3.0',
      objects: [
        {
          type: 'rect',
          version: '5.3.0',
          originX: 'left',
          originY: 'top',
          left: 175.5,
          top: -286.5,
          width: 900,
          height: 1200,
          fill: 'white',
          stroke: null,
          strokeWidth: 1,
          opacity: 1,
          visible: true,
          selectable: false,
          hasControls: false,
          name: 'clip'
        }
      ],
      clipPath: {
        type: 'rect',
        version: '5.3.0',
        originX: 'left',
        originY: 'top',
        left: 175.5,
        top: -286.5,
        width: 900,
        height: 1200,
        fill: 'white'
      }
    }
    editor.importFromJSON(blankTemplate)
  }

  const handleLoadImageTemplate = async (imageUrl: string) => {
    try {
      console.log('Starting to load image:', imageUrl)

      // Add the image using the editor's add method
      setTimeout(() => {
        try {
          if (editor) {
            const imageOptions = {
              type: 'StaticImage',
              metadata: { src: imageUrl },
            }
            editor.add(imageOptions)
            console.log('Image added to canvas successfully')
          }
        } catch (err) {
          console.error('Error adding image to canvas:', err)
        }
      }, 500)
    } catch (err) {
      console.error('Error in handleLoadImageTemplate:', err)
    }
  }

  const loadFonts = fonts => {
    const promisesList = fonts.map(font => {
      // @ts-ignore
      return new FontFace(font.name, `url(${font.url})`, font.options).load().catch(err => err)
    })
    return new Promise((resolve, reject) => {
      Promise.all(promisesList)
        .then(res => {
          res.forEach(uniqueFont => {
            // @ts-ignore
            if (uniqueFont && uniqueFont.family) {
              // @ts-ignore
              document.fonts.add(uniqueFont)
              resolve(true)
            }
          })
        })
        .catch(err => reject(err))
    })
  }
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
      <div style={{ zIndex: 60 }}><Navbar /></div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ zIndex: 50, display: 'flex' }}><Panels /></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ zIndex: 40 }}><Toolbox /></div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              background: '#f1f2f6',
              position: 'relative',
              overflow: 'hidden', // Contain the workspace mask shadow
              // Add padding when timeline is open and visible
              paddingBottom: shouldShowTimeline ? '300px' : '0', // Timeline height (260px) + bottom offset (20px) + extra spacing (20px)
            }}
            className="canvas-container"
          >
            <Editor
              config={editorConfig}
            />
            <VideoCanvasPlayer />
            <VideoTimeline />
          </div>
          <div style={{ zIndex: 40 }}><Footer /></div>
        </div>
      </div>
      <ContextMenu />
    </div>
  )
}

export default App
