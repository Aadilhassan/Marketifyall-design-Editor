import { useEffect, useMemo, useState } from 'react'
import useAppContext from '@/hooks/useAppContext'
import { useLocation } from 'react-router'
import { getElements } from '@store/slices/elements/actions'
import { getFonts } from '@store/slices/fonts/actions'
import { useAppDispatch } from '@store/store'
import Navbar from './components/Navbar'
import Panels from './components/Panels'
import Toolbox from './components/Toolbox'
import Footer from './components/Footer'
import ContextMenu from './components/ContextMenu'
import Editor, { useEditor } from '@nkyo/scenify-sdk'

function App() {
  const { setCurrentTemplate } = useAppContext()
  const editor = useEditor()
  const location = useLocation()
  const dispath = useAppDispatch()
  const [hasInitialized, setHasInitialized] = useState(false)
  
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
      // Don't load blank canvas by default - let the editor handle it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Navbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Panels />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <Toolbox />
          <div 
            style={{ 
              flex: 1, 
              display: 'flex', 
              background: '#e5e7eb',
              position: 'relative',
            }}
            className="canvas-container"
          >
            <Editor
              config={editorConfig}
            />
          </div>
          <Footer />
        </div>
      </div>
      <ContextMenu />
    </div>
  )
}

export default App
