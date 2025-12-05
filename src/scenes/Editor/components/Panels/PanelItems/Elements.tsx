import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { Scrollbars } from 'react-custom-scrollbars'
import { useState, useEffect, useMemo } from 'react'
import { useEditor } from '@nkyo/scenify-sdk'
import { useSelector } from 'react-redux'
import { selectElements } from '@/store/slices/elements/selectors'
import { styled } from 'baseui'
import { 
  getIconsByCategory, 
  getAllCategories,
  svgToBase64,
} from '@/utils/lucideIconsManager'
import type { LucideIcon } from '@/utils/lucideIconsManager'

type TabType = 'icons' | 'elements'

const SearchContainer = styled('div', {
  padding: '1.5rem',
  borderBottom: '1px solid #e0e0e0',
})

const TabsContainer = styled('div', {
  display: 'flex',
  gap: '0.5rem',
  padding: '1rem 1.5rem 0',
  borderBottom: '1px solid #e0e0e0',
  overflowX: 'auto',
})

const TabButton = styled('button', ({ $active }: { $active: boolean }) => ({
  background: 'none',
  border: 'none',
  padding: '0.75rem 1rem',
  fontSize: '0.9rem',
  fontWeight: $active ? 600 : 500,
  color: $active ? '#2d2d2d' : '#999999',
  cursor: 'pointer',
  borderBottom: $active ? '2px solid #2d2d2d' : '2px solid transparent',
  marginBottom: '-1px',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  ':hover': {
    color: '#2d2d2d',
  },
}))

const CategoryButton = styled('button', ({ $active }: { $active: boolean }) => ({
  background: $active ? '#5A3FFF' : '#f5f5f5',
  color: $active ? '#ffffff' : '#2d2d2d',
  border: 'none',
  borderRadius: '6px',
  padding: '0.5rem 1rem',
  fontSize: '0.85rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flexShrink: 0,
  whiteSpace: 'nowrap',
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

const SectionTitle = styled('div', {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#2d2d2d',
  padding: '1.5rem 1.5rem 0.5rem',
  marginTop: '1rem',
  marginBottom: '0.5rem',
})

const CategorySelector = styled('div', {
  padding: '0 1.5rem 1rem',
  display: 'flex',
  gap: '0.5rem',
  whiteSpace: 'nowrap',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollBehavior: 'smooth',
  '::-webkit-scrollbar': {
    height: '6px',
  },
  '::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '::-webkit-scrollbar-thumb': {
    background: '#d0d0d0',
    borderRadius: '3px',
  },
  '::-webkit-scrollbar-thumb:hover': {
    background: '#999999',
  },
})

const IconGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem',
  padding: '1.5rem',
})

const IconItem = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: '#fafafa',
  ':hover': {
    backgroundColor: '#f0f0f0',
    borderColor: '#5A3FFF',
    transform: 'translateY(-2px)',
    boxShadow: '0 2px 8px rgba(90, 63, 255, 0.2)',
  },
})

const IconPreview = styled('div', {
  width: '64px',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#2d2d2d',
  fontSize: '1.5rem',
})

const IconName = styled('div', {
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#2d2d2d',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '100%',
})

const ElementGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem',
  padding: '1.5rem',
})

const ElementItem = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: '#fafafa',
  ':hover': {
    backgroundColor: '#f0f0f0',
    borderColor: '#5A3FFF',
    transform: 'translateY(-2px)',
    boxShadow: '0 2px 8px rgba(90, 63, 255, 0.2)',
  },
})

const ElementPreview = styled('div', {
  width: '100%',
  height: '64px',
  borderRadius: '6px',
  backgroundColor: '#fff',
  border: '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
})

const ElementName = styled('div', {
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#2d2d2d',
  textAlign: 'center',
})

const LoadingSpinner = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  color: '#999999',
})

const EmptyState = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#999999',
  fontSize: '0.9rem',
  padding: '2rem',
  textAlign: 'center',
})

function Panel() {
  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('icons')
  const [activeCategory, setActiveCategory] = useState<string>('shapes')
  const [icons, setIcons] = useState<LucideIcon[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const elements = useSelector(selectElements)
  const editor = useEditor()

  // Load categories on mount
  useEffect(() => {
    try {
      const cats = getAllCategories()
      setCategories(cats)
    } catch (err) {
      console.error('Error loading categories:', err)
      setError('Failed to load categories')
    }
  }, [])

  // Load icons for active category
  useEffect(() => {
    if (activeTab === 'icons') {
      loadIconsForCategory(activeCategory)
    }
  }, [activeCategory, activeTab])

  const loadIconsForCategory = async (category: string) => {
    try {
      setLoading(true)
      setError(null)
      const loadedIcons = await getIconsByCategory(category)
      setIcons(loadedIcons)
    } catch (err) {
      console.error('Error loading icons:', err)
      setError('Failed to load icons. Please try again.')
      setIcons([])
    } finally {
      setLoading(false)
    }
  }

  // Search functionality
  const filteredIcons = useMemo(() => {
    if (!searchValue.trim()) return icons
    return icons.filter(icon =>
      icon.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      icon.id.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [icons, searchValue])

  const filteredElements = useMemo(() => {
    return elements.filter(el =>
      el.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      el.id?.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [elements, searchValue])

  // Handle adding icon to canvas
  const handleAddIcon = async (icon: LucideIcon) => {
    try {
      // Convert SVG to data URL
      const imageUrl = svgToBase64(icon.svg)
      
      // Create image object for canvas - use StaticImage type like other images
      const canvasObject = {
        type: 'StaticImage',
        metadata: {
          src: imageUrl,
          name: icon.name,
        },
      }
      
      editor.add(canvasObject)
    } catch (error) {
      console.error('Error adding icon to canvas:', error)
    }
  }

  // Handle adding element to canvas
  const handleAddElement = (element: any) => {
    try {
      editor.add(element)
    } catch (error) {
      console.error('Error adding element:', error)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      {/* Search Bar */}
      <SearchContainer>
        <Input
          startEnhancer={() => <Icons.Search size={18} />}
          value={searchValue}
          onChange={e => setSearchValue((e.target as any).value)}
          placeholder={activeTab === 'icons' ? 'Search icons' : 'Search elements'}
          clearOnEscape
        />
      </SearchContainer>

      {/* Tabs */}
      <TabsContainer>
        <TabButton $active={activeTab === 'icons'} onClick={() => setActiveTab('icons')}>
          Icons
        </TabButton>
        <TabButton $active={activeTab === 'elements'} onClick={() => setActiveTab('elements')}>
          Elements
        </TabButton>
      </TabsContainer>

      {/* Content */}
      <ContentContainer>
        <Scrollbars>
          {activeTab === 'icons' ? (
            <>
              {/* Category selector */}
              {categories.length > 0 && (
                <>
                  <SectionTitle>Categories</SectionTitle>
                  <CategorySelector>
                    {categories.map(category => (
                      <CategoryButton
                        key={category}
                        $active={activeCategory === category}
                        onClick={() => setActiveCategory(category)}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </CategoryButton>
                    ))}
                  </CategorySelector>
                </>
              )}

              {/* Icons grid */}
              <SectionTitle>
                {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Icons
              </SectionTitle>

              {loading ? (
                <LoadingSpinner>Loading icons...</LoadingSpinner>
              ) : error ? (
                <EmptyState>
                  <div>❌</div>
                  <div>{error}</div>
                </EmptyState>
              ) : filteredIcons.length === 0 ? (
                <EmptyState>
                  <div>🔍</div>
                  <div>
                    {searchValue ? 'No icons found matching your search' : 'No icons available'}
                  </div>
                </EmptyState>
              ) : (
                <IconGrid>
                  {filteredIcons.map(icon => (
                    <IconItem
                      key={icon.id}
                      onClick={() => handleAddIcon(icon)}
                      title={icon.name}
                    >
                      <IconPreview>
                        <div
                          dangerouslySetInnerHTML={{ __html: icon.svg }}
                          style={{ width: '32px', height: '32px' }}
                        />
                      </IconPreview>
                      <IconName>{icon.name}</IconName>
                    </IconItem>
                  ))}
                </IconGrid>
              )}
            </>
          ) : (
            <>
              {/* Elements tab */}
              {filteredElements.length === 0 ? (
                <EmptyState>
                  <div>📦</div>
                  <div>
                    {searchValue ? 'No elements found matching your search' : 'No elements available'}
                  </div>
                </EmptyState>
              ) : (
                <ElementGrid>
                  {filteredElements.map(element => (
                    <ElementItem
                      key={element.id}
                      onClick={() => handleAddElement(element)}
                      title={element.name}
                    >
                      <ElementPreview>
                        {element.metadata?.preview ? (
                          <img
                            src={element.metadata.preview}
                            alt={element.name}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                            }}
                          />
                        ) : (
                          <div style={{ color: '#ccc' }}>No preview</div>
                        )}
                      </ElementPreview>
                      <ElementName>{element.name}</ElementName>
                    </ElementItem>
                  ))}
                </ElementGrid>
              )}
            </>
          )}
        </Scrollbars>
      </ContentContainer>
    </div>
  )
}

export default Panel
