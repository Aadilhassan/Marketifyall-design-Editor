import { useCallback, useState, useEffect } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import api from '@/services/api'

interface Image {
  id: string
  url: string
  preview?: string
}

function Images() {
  const [search, setSearch] = useState('')
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(false)
  const [queryImageUrl, setQueryImageUrl] = useState<string | null>(null)
  const [hasAutoAddedQueryImage, setHasAutoAddedQueryImage] = useState(false)

  const editor = useEditor()
  const { frameSize } = useEditorContext() as any

  useEffect(() => {
    loadImages()
  }, [])

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const url = new URL(window.location.href)
      // Expecting a query parameter like ?image=https://example.com/image.png
      const paramUrl = url.searchParams.get('image')
      if (paramUrl) {
        setQueryImageUrl(paramUrl)
      }
    } catch (error) {
      console.error('Failed to read imageUrl from query params:', error)
    }
  }, [])

  const addImageToCanvasWithSizing = useCallback((imageUrl: string) => {
    if (!editor) return

    // Load image to get dimensions first
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const naturalWidth = img.naturalWidth
      const naturalHeight = img.naturalHeight
      const aspectRatio = naturalWidth / naturalHeight
      
      // Get canvas dimensions
      const frameWidth = frameSize?.width || 900
      const frameHeight = frameSize?.height || 1200
      
      // Check if image is landscape (width > height)
      const isLandscape = naturalWidth > naturalHeight
      
      let targetWidth = naturalWidth
      let targetHeight = naturalHeight
      
      // For landscape images, ensure minimum height if the image is small
      const minHeight = 400
      if (isLandscape && targetHeight < minHeight) {
        targetHeight = minHeight
        targetWidth = targetHeight * aspectRatio
      }
      
      // Scale down if image is too large for canvas (with some padding)
      const maxWidth = frameWidth * 0.9
      const maxHeight = frameHeight * 0.9
      
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const widthRatio = maxWidth / targetWidth
        const heightRatio = maxHeight / targetHeight
        const scaleRatio = Math.min(widthRatio, heightRatio)
        
        targetWidth = targetWidth * scaleRatio
        targetHeight = targetHeight * scaleRatio
      }
      
      // Calculate scale factors based on natural dimensions
      const scaleX = targetWidth / naturalWidth
      const scaleY = targetHeight / naturalHeight
      
      // Center the image on canvas
      const left = (frameWidth - targetWidth) / 2
      const top = (frameHeight - targetHeight) / 2
      
      // Add image with natural dimensions and scale
      const options = {
        type: 'StaticImage',
        metadata: { src: imageUrl },
        width: naturalWidth,
        height: naturalHeight,
        left,
        top,
        scaleX,
        scaleY,
      }
      
      editor.add(options)
    }
    img.onerror = () => {
      // Fallback to default behavior if image fails to load
      const options = {
        type: 'StaticImage',
        metadata: { src: imageUrl },
      }
      editor.add(options)
    }
    img.src = imageUrl
  }, [editor, frameSize])

  useEffect(() => {
    if (!editor) return
    if (!queryImageUrl) return
    if (hasAutoAddedQueryImage) return

    addImageToCanvasWithSizing(queryImageUrl)
    setHasAutoAddedQueryImage(true)
  }, [editor, queryImageUrl, hasAutoAddedQueryImage, addImageToCanvasWithSizing])

  const loadImages = async () => {
    setLoading(true)
    try {
      const data = await api.getImages()
      setImages(data)
    } catch (error) {
      console.error('Failed to load images:', error)
    } finally {
      setLoading(false)
    }
  }

  const addDynamicImage = useCallback(() => {
    if (editor) {
      const objectOptions = {
        width: 100,
        height: 100,
        backgroundColor: '#bdc3c7',
        type: 'DynamicImage',

        metadata: {
          keyValues: [{ key: '{{image}}', value: '' }],
        },
      }
      editor.add(objectOptions)
    }
  }, [editor])

  const addImageToCanvas = (imageUrl: string) => {
    addImageToCanvasWithSizing(imageUrl)
  }

  const filteredImages = images.filter((image: any) =>
    search ? image.alt?.toLowerCase().includes(search.toLowerCase()) || 
             image.tags?.toLowerCase().includes(search.toLowerCase()) : true
  )

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div style={{ padding: '2rem 2rem' }}>
        <Input
          startEnhancer={() => <Icons.Search size={18} />}
          value={search}
          onChange={e => setSearch((e.target as any).value)}
          placeholder="Search images"
          clearOnEscape
        />
      </div>
      <div style={{ flex: 1 }}>
        <Scrollbars>
          <div style={{ display: 'grid', gap: '0.5rem', padding: '0 2rem 2rem' }}>
            <div
              style={{
                display: 'flex',
                paddingLeft: '1rem',
                fontSize: '1rem',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.045)',
                cursor: 'pointer',
                height: '50px',
              }}
              onClick={addDynamicImage}
            >
              Add dynamic image
            </div>

            {queryImageUrl && (
              <div
                style={{
                  paddingLeft: '1rem',
                  fontSize: '0.85rem',
                  color: '#666666',
                  display: 'flex',
                  alignItems: 'center',
                  height: '40px',
                }}
              >
                {/* Image from "image" URL parameter will be added automatically. */}
              </div>
            )}

            {loading && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                Loading images...
              </div>
            )}
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '0.5rem',
              marginTop: '1rem' 
            }}>
              {filteredImages.map((image: any) => (
                <div
                  key={image.id}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e1e1e1',
                  }}
                  onClick={() => addImageToCanvas(image.url || image.src)}
                >
                  <img
                    src={image.preview || image.url || image.src}
                    alt={image.alt || 'Image'}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

export default Images
