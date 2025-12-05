import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { Scrollbars } from 'react-custom-scrollbars'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useEditor } from '@nkyo/scenify-sdk'
import { useSelector } from 'react-redux'
import { selectElements } from '@/store/slices/elements/selectors'
import { styled } from 'baseui'
import { 
  getIconsByCategory, 
  getAllCategories,
  svgToBase64,
  searchIcons,
} from '@/utils/lucideIconsManager'
import type { LucideIcon } from '@/utils/lucideIconsManager'
import { useDebounce } from 'use-debounce'

type TabType = 'icons' | 'shapes' | 'lines'

const SearchContainer = styled('div', {
  padding: '16px 20px',
  borderBottom: '1px solid #e8e8e8',
})

const TabsContainer = styled('div', {
  display: 'flex',
  gap: '0',
  borderBottom: '1px solid #e8e8e8',
  backgroundColor: '#fafafa',
})

const TabButton = styled('button', ({ $active }: { $active: boolean }) => ({
  flex: 1,
  background: $active ? '#fff' : 'transparent',
  border: 'none',
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: $active ? 600 : 500,
  color: $active ? '#5A3FFF' : '#666',
  cursor: 'pointer',
  borderBottom: $active ? '2px solid #5A3FFF' : '2px solid transparent',
  transition: 'all 0.2s ease',
  ':hover': {
    color: '#5A3FFF',
    background: '#f8f7ff',
  },
}))

const CategoryScroller = styled('div', {
  padding: '12px 20px',
  display: 'flex',
  gap: '8px',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollBehavior: 'smooth',
  '::-webkit-scrollbar': {
    height: '4px',
  },
  '::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '::-webkit-scrollbar-thumb': {
    background: '#d0d0d0',
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
  transition: 'all 0.2s ease',
  background: $active ? '#5A3FFF' : '#f0f0f0',
  color: $active ? '#fff' : '#555',
  ':hover': {
    background: $active ? '#4a2fef' : '#e5e5e5',
  },
}))

const ContentContainer = styled('div', {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
})

const IconGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '8px',
  padding: '16px 20px',
})

const IconItem = styled('div', ({ $loading }: { $loading?: boolean }) => ({
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border: '1px solid #e8e8e8',
  cursor: $loading ? 'wait' : 'pointer',
  transition: 'all 0.15s ease',
  backgroundColor: '#fff',
  opacity: $loading ? 0.6 : 1,
  ':hover': {
    borderColor: '#5A3FFF',
    backgroundColor: '#f8f7ff',
    transform: 'scale(1.05)',
  },
}))

const ShapeItem = styled('div', {
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border: '1px solid #e8e8e8',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  backgroundColor: '#fff',
  ':hover': {
    borderColor: '#5A3FFF',
    backgroundColor: '#f8f7ff',
    transform: 'scale(1.05)',
  },
})

const LoadingSpinner = styled('div', {
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
  fontSize: '14px',
  textAlign: 'center',
  gap: '8px',
})

const SectionHeader = styled('div', {
  fontSize: '11px',
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  padding: '16px 20px 8px',
})

// Pre-defined shapes for quick access
const BASIC_SHAPES = [
  { id: 'rect', name: 'Rectangle', svg: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#5A3FFF"/></svg>' },
  { id: 'circle', name: 'Circle', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#5A3FFF"/></svg>' },
  { id: 'triangle', name: 'Triangle', svg: '<svg viewBox="0 0 24 24"><path d="M12 3L22 21H2L12 3Z" fill="#5A3FFF"/></svg>' },
  { id: 'star', name: 'Star', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#5A3FFF"/></svg>' },
  { id: 'heart', name: 'Heart', svg: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#FF4D8D"/></svg>' },
  { id: 'hexagon', name: 'Hexagon', svg: '<svg viewBox="0 0 24 24"><path d="M12 2l6.5 3.77v7.46L12 22l-6.5-3.77V5.77L12 2z" fill="#5A3FFF"/></svg>' },
  { id: 'diamond', name: 'Diamond', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L22 12L12 22L2 12L12 2Z" fill="#00C9A7"/></svg>' },
  { id: 'rounded-rect', name: 'Rounded', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="6" fill="#FF6B6B"/></svg>' },
]

const BASIC_LINES = [
  { id: 'line', name: 'Line', svg: '<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'arrow-line', name: 'Arrow', svg: '<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="20" y2="12" stroke="#333" stroke-width="2"/><polyline points="16 8 20 12 16 16" stroke="#333" stroke-width="2" fill="none"/></svg>' },
  { id: 'double-arrow', name: 'Double Arrow', svg: '<svg viewBox="0 0 24 24"><line x1="6" y1="12" x2="18" y2="12" stroke="#333" stroke-width="2"/><polyline points="4 8 8 12 4 16" stroke="#333" stroke-width="2" fill="none"/><polyline points="20 8 16 12 20 16" stroke="#333" stroke-width="2" fill="none"/></svg>' },
  { id: 'dashed-line', name: 'Dashed', svg: '<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12" stroke="#333" stroke-width="2" stroke-dasharray="4 2"/></svg>' },
]

// Icon cache for performance
const iconCache = new Map<string, LucideIcon[]>()

function Panel() {
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch] = useDebounce(searchValue, 300)
  const [activeTab, setActiveTab] = useState<TabType>('icons')
  const [activeCategory, setActiveCategory] = useState<string>('shapes')
  const [icons, setIcons] = useState<LucideIcon[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [addingIcon, setAddingIcon] = useState<string | null>(null)
  
  const elements = useSelector(selectElements)
  const editor = useEditor()
  const scrollRef = useRef<Scrollbars>(null)

  // Load categories on mount
  useEffect(() => {
    const cats = getAllCategories()
    setCategories(cats)
    if (cats.length > 0 && !cats.includes(activeCategory)) {
      setActiveCategory(cats[0])
    }
  }, [])

  // Load icons for active category with caching
  useEffect(() => {
    if (activeTab !== 'icons') return

    const loadIcons = async () => {
      // Check cache first
      if (iconCache.has(activeCategory)) {
        setIcons(iconCache.get(activeCategory)!)
        return
      }

      setLoading(true)
      try {
        const loadedIcons = await getIconsByCategory(activeCategory)
        iconCache.set(activeCategory, loadedIcons)
        setIcons(loadedIcons)
      } catch (err) {
        console.error('Error loading icons:', err)
        setIcons([])
      } finally {
        setLoading(false)
      }
    }

    loadIcons()
  }, [activeCategory, activeTab])

  // Search functionality with debounce
  useEffect(() => {
    if (!debouncedSearch.trim()) return

    const performSearch = async () => {
      setLoading(true)
      try {
        const results = await searchIcons(debouncedSearch)
        setIcons(results)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedSearch])

  // Reset to category icons when search is cleared
  useEffect(() => {
    if (!debouncedSearch.trim() && activeTab === 'icons') {
      if (iconCache.has(activeCategory)) {
        setIcons(iconCache.get(activeCategory)!)
      } else {
        getIconsByCategory(activeCategory).then(setIcons)
      }
    }
  }, [debouncedSearch, activeCategory, activeTab])

  // Handle adding icon to canvas
  const handleAddIcon = useCallback(async (icon: LucideIcon) => {
    if (addingIcon) return
    setAddingIcon(icon.id)
    
    try {
      const imageUrl = svgToBase64(icon.svg)
      editor.add({
        type: 'StaticImage',
        metadata: {
          src: imageUrl,
          name: icon.name,
        },
      })
    } catch (error) {
      console.error('Error adding icon:', error)
    } finally {
      setAddingIcon(null)
    }
  }, [editor, addingIcon])

  // Handle adding shape to canvas
  const handleAddShape = useCallback((shape: typeof BASIC_SHAPES[0]) => {
    const imageUrl = svgToBase64(shape.svg)
    editor.add({
      type: 'StaticImage',
      metadata: {
        src: imageUrl,
        name: shape.name,
      },
    })
  }, [editor])

  // Handle category change
  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category)
    setSearchValue('')
    scrollRef.current?.scrollToTop()
  }, [])

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      {/* Search Bar */}
      <SearchContainer>
        <Input
          startEnhancer={() => <Icons.Search size={16} />}
          value={searchValue}
          onChange={e => setSearchValue((e.target as any).value)}
          placeholder="Search elements..."
          clearOnEscape
          overrides={{
            Root: {
              style: {
                borderRadius: '8px',
              },
            },
            Input: {
              style: {
                fontSize: '13px',
              },
            },
          }}
        />
      </SearchContainer>

      {/* Tabs */}
      <TabsContainer>
        <TabButton $active={activeTab === 'icons'} onClick={() => setActiveTab('icons')}>
          Icons
        </TabButton>
        <TabButton $active={activeTab === 'shapes'} onClick={() => setActiveTab('shapes')}>
          Shapes
        </TabButton>
        <TabButton $active={activeTab === 'lines'} onClick={() => setActiveTab('lines')}>
          Lines
        </TabButton>
      </TabsContainer>

      {/* Content */}
      <ContentContainer>
        <Scrollbars ref={scrollRef} autoHide>
          {activeTab === 'icons' && (
            <>
              {/* Category selector */}
              {!searchValue && categories.length > 0 && (
                <CategoryScroller>
                  {categories.map(category => (
                    <CategoryChip
                      key={category}
                      $active={activeCategory === category}
                      onClick={() => handleCategoryChange(category)}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </CategoryChip>
                  ))}
                </CategoryScroller>
              )}

              {/* Icons grid */}
              {loading ? (
                <LoadingSpinner>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="#5A3FFF" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" />
                  </svg>
                  Loading icons...
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </LoadingSpinner>
              ) : icons.length === 0 ? (
                <EmptyState>
                  <span style={{ fontSize: '24px' }}>🔍</span>
                  {searchValue ? 'No icons found' : 'No icons in this category'}
                </EmptyState>
              ) : (
                <IconGrid>
                  {icons.map(icon => (
                    <IconItem
                      key={icon.id}
                      onClick={() => handleAddIcon(icon)}
                      title={icon.name}
                      $loading={addingIcon === icon.id}
                    >
                      <div
                        dangerouslySetInnerHTML={{ __html: icon.svg }}
                        style={{ width: '24px', height: '24px', color: '#333' }}
                      />
                    </IconItem>
                  ))}
                </IconGrid>
              )}
            </>
          )}

          {activeTab === 'shapes' && (
            <>
              <SectionHeader>Basic Shapes</SectionHeader>
              <IconGrid>
                {BASIC_SHAPES.map(shape => (
                  <ShapeItem
                    key={shape.id}
                    onClick={() => handleAddShape(shape)}
                    title={shape.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: shape.svg }}
                      style={{ width: '28px', height: '28px' }}
                    />
                  </ShapeItem>
                ))}
              </IconGrid>
            </>
          )}

          {activeTab === 'lines' && (
            <>
              <SectionHeader>Lines & Arrows</SectionHeader>
              <IconGrid>
                {BASIC_LINES.map(line => (
                  <ShapeItem
                    key={line.id}
                    onClick={() => handleAddShape(line)}
                    title={line.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: line.svg }}
                      style={{ width: '28px', height: '28px' }}
                    />
                  </ShapeItem>
                ))}
              </IconGrid>
            </>
          )}
        </Scrollbars>
      </ContentContainer>
    </div>
  )
}

export default Panel
