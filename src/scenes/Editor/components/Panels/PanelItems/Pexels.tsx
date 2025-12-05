import { useEffect, useState, useCallback, useRef } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useEditor } from '@nkyo/scenify-sdk'
import { searchPexelsImages, getCuratedImages, isApiKeyConfigured, PexelsImage } from '@/services/pexels'
import { useDebounce } from 'use-debounce'
import { styled } from 'baseui'

const Container = styled('div', {
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
})

const SearchSection = styled('div', {
  padding: '16px 20px',
  borderBottom: '1px solid #e8e8e8',
})

const CategoryScroller = styled('div', {
  padding: '12px 20px',
  display: 'flex',
  gap: '8px',
  overflowX: 'auto',
  borderBottom: '1px solid #e8e8e8',
  '::-webkit-scrollbar': {
    height: '4px',
  },
  '::-webkit-scrollbar-thumb': {
    background: '#ccc',
    borderRadius: '2px',
  },
})

const CategoryChip = styled('button', ({ $active }: { $active: boolean }) => ({
  padding: '6px 14px',
  borderRadius: '16px',
  border: 'none',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s',
  background: $active ? '#05A081' : '#f0f0f0',
  color: $active ? '#fff' : '#555',
  ':hover': {
    background: $active ? '#048a6e' : '#e5e5e5',
  },
}))

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

const PhotographerCredit = styled('div', {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '4px 8px',
  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
  color: '#fff',
  fontSize: '10px',
  opacity: 0,
  transition: 'opacity 0.2s',
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

const WarningBox = styled('div', {
  margin: '16px 20px',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  color: '#856404',
  fontSize: '13px',
  lineHeight: '1.5',
})

const PexelsBadge = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '8px 16px',
  fontSize: '11px',
  color: '#888',
  borderTop: '1px solid #e8e8e8',
})

const CATEGORIES = [
  { id: 'curated', label: '✨ Curated', query: '' },
  { id: 'business', label: 'Business', query: 'business office' },
  { id: 'nature', label: 'Nature', query: 'nature landscape' },
  { id: 'people', label: 'People', query: 'people portrait' },
  { id: 'food', label: 'Food', query: 'food restaurant' },
  { id: 'technology', label: 'Tech', query: 'technology computer' },
  { id: 'abstract', label: 'Abstract', query: 'abstract minimal' },
  { id: 'travel', label: 'Travel', query: 'travel adventure' },
]

// Image cache for better performance
const imageCache = new Map<string, PexelsImage[]>()

function Pexels() {
  const [search, setSearch] = useState('')
  const [images, setImages] = useState<PexelsImage[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState('curated')
  const [addingImage, setAddingImage] = useState<number | null>(null)
  const [debouncedSearch] = useDebounce(search, 500)
  const [apiKeyMissing] = useState(!isApiKeyConfigured())
  
  const editor = useEditor()
  const scrollRef = useRef<Scrollbars>(null)

  // Load images for category
  const loadImages = useCallback(async (query: string, cacheKey: string, isCurated: boolean = false) => {
    // Check cache first
    if (imageCache.has(cacheKey)) {
      setImages(imageCache.get(cacheKey)!)
      return
    }

    setLoading(true)
    try {
      const data = isCurated ? await getCuratedImages(30) : await searchPexelsImages(query, 30)
      imageCache.set(cacheKey, data)
      setImages(data)
    } catch (error) {
      console.error('Failed to load images:', error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load initial images
  useEffect(() => {
    if (apiKeyMissing) return
    
    const category = CATEGORIES.find(c => c.id === activeCategory)
    if (category) {
      const isCurated = category.id === 'curated'
      loadImages(category.query, `category-${category.id}`, isCurated)
    }
  }, [activeCategory, loadImages, apiKeyMissing])

  // Search effect
  useEffect(() => {
    if (apiKeyMissing) return
    
    if (debouncedSearch.trim()) {
      loadImages(debouncedSearch, `search-${debouncedSearch}`)
    } else {
      // Reload category images
      const category = CATEGORIES.find(c => c.id === activeCategory)
      if (category) {
        const isCurated = category.id === 'curated'
        loadImages(category.query, `category-${category.id}`, isCurated)
      }
    }
  }, [debouncedSearch, activeCategory, loadImages, apiKeyMissing])

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId)
    setSearch('')
    scrollRef.current?.scrollToTop()
  }, [])

  const addImageToCanvas = useCallback(async (image: PexelsImage) => {
    if (addingImage) return
    setAddingImage(image.id)
    
    try {
      editor.add({
        type: 'StaticImage',
        metadata: { 
          src: image.src.large,
          photographer: image.photographer,
        },
      })
    } catch (error) {
      console.error('Failed to add image:', error)
    } finally {
      setAddingImage(null)
    }
  }, [editor, addingImage])

  return (
    <Container>
      <SearchSection>
        <Input
          startEnhancer={() => <Icons.Search size={16} />}
          value={search}
          onChange={e => setSearch((e.target as any).value)}
          placeholder="Search free photos..."
          clearOnEscape
          overrides={{
            Root: { style: { borderRadius: '8px' } },
            Input: { style: { fontSize: '13px' } },
          }}
        />
      </SearchSection>

      {!search && (
        <CategoryScroller>
          {CATEGORIES.map(cat => (
            <CategoryChip
              key={cat.id}
              $active={activeCategory === cat.id}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.label}
            </CategoryChip>
          ))}
        </CategoryScroller>
      )}

      <div style={{ flex: 1 }}>
        <Scrollbars ref={scrollRef} autoHide>
          {apiKeyMissing ? (
            <WarningBox>
              <strong>⚠️ Pexels API Key Missing</strong>
              <br />
              Add your Pexels API key to the .env file:
              <br />
              <code style={{ fontSize: '11px' }}>REACT_APP_PIXELS_KEY=your_key_here</code>
              <br /><br />
              Get a free key at <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: '#856404' }}>pexels.com/api</a>
            </WarningBox>
          ) : loading ? (
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
              <span style={{ fontSize: '12px', color: '#aaa' }}>Try a different search term</span>
            </EmptyState>
          ) : (
            <ImageGrid>
              {images.map(img => (
                <ImageItem
                  key={img.id}
                  onClick={() => addImageToCanvas(img)}
                  $loading={addingImage === img.id}
                  style={{ ':hover .credit': { opacity: 1 } } as any}
                >
                  <ImageThumb
                    src={img.src.medium}
                    alt={img.alt || 'Pexels photo'}
                    loading="lazy"
                  />
                </ImageItem>
              ))}
            </ImageGrid>
          )}
        </Scrollbars>
      </div>
      
      <PexelsBadge>
        Photos provided by
        <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" style={{ color: '#05A081', fontWeight: 600 }}>
          Pexels
        </a>
      </PexelsBadge>
    </Container>
  )
}

export default Pexels
