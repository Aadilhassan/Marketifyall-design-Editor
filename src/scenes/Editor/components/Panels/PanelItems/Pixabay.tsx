import { useEffect, useState, useCallback, useRef } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { getPixabayImages, PixabayImage } from '@/services/pixabay'
import { useDebounce } from 'use-debounce'
import { styled } from 'baseui'
import { addObjectToCanvas } from '@/utils/editorHelpers'

const Container = styled('div', {
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
})

const SearchSection = styled('div', {
  padding: '16px 20px',
  borderBottom: '1px solid #e8e8e8',
})

const ImageGrid = styled('div', {
  display: 'grid',
  gap: '8px',
  padding: '16px 20px',
  gridTemplateColumns: 'repeat(2, 1fr)',
})

const ImageItem = styled('div', ({ $loading }: { $loading?: boolean }) => ({
  position: 'relative',
  borderRadius: '8px',
  overflow: 'hidden',
  cursor: $loading ? 'wait' : 'pointer',
  aspectRatio: '1',
  backgroundColor: '#f5f5f5',
  transition: 'transform 0.15s, box-shadow 0.15s',
  opacity: $loading ? 0.6 : 1,
  ':hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}))

const ImageThumb = styled('img', {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
})

const LoadingState = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px',
  color: '#999',
  fontSize: '13px',
  gap: '8px',
})

const EmptyState = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 24px',
  color: '#999',
  textAlign: 'center',
  gap: '8px',
})

const PixabayBadge = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '8px 16px',
  fontSize: '11px',
  color: '#888',
  borderTop: '1px solid #e8e8e8',
})

function Pixabay() {
  const [search, setSearch] = useState('nature')
  const [images, setImages] = useState<PixabayImage[]>([])
  const [loading, setLoading] = useState(false)
  const [addingImage, setAddingImage] = useState<string | null>(null)
  const [debouncedSearch] = useDebounce(search, 500)

  const editor = useEditor()
  const { canvas, frameSize } = useEditorContext() as any
  const scrollRef = useRef<Scrollbars>(null)

  const loadImages = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const data = await getPixabayImages(query)
      setImages(data)
    } catch (error) {
      console.error('Failed to load Pixabay images:', error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedSearch.trim()) {
      loadImages(debouncedSearch)
    }
  }, [debouncedSearch, loadImages])

  const addImageToCanvas = useCallback(async (image: PixabayImage) => {
    if (addingImage || !editor) return
    setAddingImage(image.id)

    try {
      const imageUrl = image.largeImageURL || image.webformatURL

      // Calculate scale to fit
      const frameWidth = frameSize?.width || 900
      const frameHeight = frameSize?.height || 1200
      const maxWidth = frameWidth * 0.7
      const maxHeight = frameHeight * 0.7

      // We don't have dimensions easily in the service without preloading
      // But we can let addObjectToCanvas handle it if we don't pass them,
      // or we can preload here if we want specific scaling.

      const img = new Image()
      img.onload = () => {
        const imgWidth = img.naturalWidth || 800
        const imgHeight = img.naturalHeight || 600

        let scaleX = 1
        let scaleY = 1

        if (imgWidth > maxWidth || imgHeight > maxHeight) {
          const widthRatio = maxWidth / imgWidth
          const heightRatio = maxHeight / imgHeight
          scaleX = scaleY = Math.min(widthRatio, heightRatio)
        }

        addObjectToCanvas(editor, {
          type: 'StaticImage',
          metadata: {
            src: imageUrl,
            tags: image.tags,
          },
          width: imgWidth,
          height: imgHeight,
          scaleX,
          scaleY,
        }, imgWidth, canvas)
        setAddingImage(null)
      }
      img.src = imageUrl
    } catch (error) {
      console.error('Failed to add image:', error)
      setAddingImage(null)
    }
  }, [editor, addingImage, frameSize, canvas])

  return (
    <Container>
      <SearchSection>
        <Input
          startEnhancer={() => <Icons.Search size={16} />}
          value={search}
          onChange={e => setSearch((e.target as any).value)}
          placeholder="Search Pixabay..."
          clearOnEscape
          overrides={{
            Root: { style: { borderRadius: '8px' } },
            Input: { style: { fontSize: '13px' } },
          }}
        />
      </SearchSection>

      <div style={{ flex: 1 }}>
        <Scrollbars ref={scrollRef} autoHide>
          {loading ? (
            <LoadingState>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="#05A081" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" />
              </svg>
              Loading photos...
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </LoadingState>
          ) : images.length === 0 ? (
            <EmptyState>
              <span style={{ fontSize: '24px' }}>📷</span>
              <span>No photos found</span>
            </EmptyState>
          ) : (
            <ImageGrid>
              {images.map(img => (
                <ImageItem
                  key={img.id}
                  onClick={() => addImageToCanvas(img)}
                  $loading={addingImage === img.id}
                >
                  <ImageThumb
                    src={img.webformatURL}
                    alt={img.tags || 'Pixabay photo'}
                    loading="lazy"
                  />
                </ImageItem>
              ))}
            </ImageGrid>
          )}
        </Scrollbars>
      </div>

      <PixabayBadge>
        Photos provided by
        <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" style={{ color: '#05A081', fontWeight: 600 }}>
          Pixabay
        </a>
      </PixabayBadge>
    </Container>
  )
}

export default Pixabay
