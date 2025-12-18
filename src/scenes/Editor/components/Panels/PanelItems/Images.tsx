import { useCallback, useState, useEffect } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import api from '@/services/api'
import { addObjectToCanvas } from '@/utils/editorHelpers'

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
  const [displayedImages, setDisplayedImages] = useState<Image[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [addingImageId, setAddingImageId] = useState<string | null>(null)
  const IMAGES_PER_PAGE = 20 // Limit initial load to prevent resource exhaustion

  const editor = useEditor()
  const { frameSize, canvas } = useEditorContext() as any

  useEffect(() => {
    loadImages()
  }, [])

  // Paginate images to prevent loading too many at once
  useEffect(() => {
    const filtered = images.filter((image: any) =>
      search ? image.alt?.toLowerCase().includes(search.toLowerCase()) ||
        image.tags?.toLowerCase().includes(search.toLowerCase()) : true
    )

    const endIndex = page * IMAGES_PER_PAGE
    setDisplayedImages(filtered.slice(0, endIndex))
    setHasMore(endIndex < filtered.length)
  }, [images, search, page])

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
    if (!editor) {
      console.error('Editor is not available')
      alert('Editor is not available. Please wait for the editor to load.')
      return
    }

    if (!canvas) {
      console.error('Canvas is not available')
      alert('Canvas is not available. Please wait for the editor to load.')
      return
    }

    if (!imageUrl || imageUrl.trim() === '') {
      console.error('Invalid image URL:', imageUrl)
      alert('Invalid image URL')
      return
    }

    console.log('=== ADDING IMAGE TO CANVAS ===')
    console.log('Image URL:', imageUrl)

    // Preload to get dimensions for better scaling
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const imgWidth = img.naturalWidth || 400
      const imgHeight = img.naturalHeight || 300

      // Get frame dimensions
      const clipPath = canvas.clipPath
      const frameWidth = clipPath?.width || 900
      const frameHeight = clipPath?.height || 1200

      // Calculate scale to fit
      const maxWidth = frameWidth * 0.6
      const maxHeight = frameHeight * 0.5
      let scaleX = 1
      let scaleY = 1

      if (imgWidth > maxWidth || imgHeight > maxHeight) {
        const widthRatio = maxWidth / imgWidth
        const heightRatio = maxHeight / imgHeight
        scaleX = scaleY = Math.min(widthRatio, heightRatio)
      }

      addObjectToCanvas(editor, {
        type: 'StaticImage',
        metadata: { src: imageUrl },
        width: imgWidth,
        height: imgHeight,
        scaleX,
        scaleY,
      }, imgWidth, canvas)
    }
    img.src = imageUrl
  }, [editor, canvas])

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
      console.log('Loading images from API...')
      const data = await api.getImages()
      console.log('Images loaded:', data?.length || 0, 'images')

      // Limit total images to prevent resource exhaustion
      const limitedData = (data || []).slice(0, 100) // Max 100 images total
      setImages(limitedData)

      if (limitedData.length < (data?.length || 0)) {
        console.warn(`Limited images to ${limitedData.length} to prevent resource exhaustion`)
      }
    } catch (error) {
      console.error('Failed to load images:', error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const loadMoreImages = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1)
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

  const addImageToCanvas = useCallback((imageUrl: string, imageId?: string) => {
    if (!editor) {
      console.error('Editor is not available')
      return
    }

    if (!imageUrl) {
      console.error('No image URL provided')
      return
    }

    if (imageId) {
      setAddingImageId(imageId)
    }

    console.log('addImageToCanvas called with URL:', imageUrl)

    // Use the sizing function
    addImageToCanvasWithSizing(imageUrl)

    // Clear loading state after a delay
    if (imageId) {
      setTimeout(() => {
        setAddingImageId(null)
      }, 2000)
    }
  }, [editor, addImageToCanvasWithSizing])

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

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

            {!loading && displayedImages.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                No images found. {images.length === 0 ? 'Failed to load images from server.' : 'Try a different search term.'}
              </div>
            )}

            {!loading && displayedImages.length > 0 && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}>
                  {displayedImages.map((image: any) => {
                    const imageUrl = image.url || image.src
                    return (
                      <div
                        key={image.id}
                        style={{
                          cursor: addingImageId === image.id ? 'wait' : 'pointer',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: addingImageId === image.id ? '2px solid #5A3FFF' : '1px solid #e1e1e1',
                          transition: 'all 0.2s ease',
                          opacity: addingImageId === image.id ? 0.7 : 1,
                          position: 'relative',
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (addingImageId === image.id) {
                            console.log('Image is already being added, skipping...')
                            return
                          }
                          if (imageUrl) {
                            console.log('Image clicked:', imageUrl)
                            console.log('Full image object:', image)
                            addImageToCanvas(imageUrl, image.id)
                          } else {
                            console.error('No image URL found for image:', image)
                            alert('Image URL is missing. Check console for details.')
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#5A3FFF'
                          e.currentTarget.style.transform = 'scale(1.02)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e1e1e1'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                      >
                        <img
                          src={image.preview || image.url || image.src}
                          alt={image.alt || 'Image'}
                          loading="lazy"
                          decoding="async"
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            display: 'block',
                            pointerEvents: 'none',
                          }}
                          onError={(e) => {
                            // Fallback to a placeholder if image fails to load
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            console.warn('Failed to load image thumbnail:', image.preview || image.url)
                          }}
                        />
                        {addingImageId === image.id && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(90, 63, 255, 0.9)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            zIndex: 10,
                          }}>
                            Adding...
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {hasMore && (
                  <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={loadMoreImages}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #5A3FFF',
                        background: '#fff',
                        color: '#5A3FFF',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      {loading ? 'Loading...' : 'Load More Images'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

export default Images
