import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import { useEditor, useActiveObject } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { useSelector } from 'react-redux'
import { selectFonts } from '@/store/slices/fonts/selectors'
import { IFontFamily } from '@/interfaces/editor'
import Icons from '@components/icons'

type Category = string

interface GoogleFont {
  family: string
  category: string
  variants: string[]
  files: Record<string, string>
}

// Global cache for loaded font stylesheets
const loadedFontStylesheets = new Set<string>()
const loadedFontFaces = new Set<string>()

// Batch font loading queue
let fontLoadQueue: GoogleFont[] = []
let fontLoadTimeout: NodeJS.Timeout | null = null
const BATCH_SIZE = 5
const BATCH_DELAY = 100

function FontFamily() {
  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab] = useState<'font' | 'textStyles'>('font')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [allGoogleFonts, setAllGoogleFonts] = useState<GoogleFont[]>([])
  const [loadingFonts, setLoadingFonts] = useState(false)
  const [documentFonts, setDocumentFonts] = useState<string[]>([])
  const [activeFontFamily, setActiveFontFamily] = useState('Open Sans')
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })
  const scrollRef = useRef<Scrollbars>(null)
  
  const apiKey = process.env.REACT_APP_GOOGLE_FONTS_API_KEY || ''
  const editorFonts = useSelector(selectFonts)
  const editor = useEditor()
  const activeObject = useActiveObject()

  // Initialize and fetch all Google Fonts (metadata only, no loading)
  useEffect(() => {
    if (!apiKey) return

    const cached = localStorage.getItem('googleFonts')
    if (cached) {
      try {
        const fonts = JSON.parse(cached)
        setAllGoogleFonts(fonts)
        setLoadingFonts(false)
        return
      } catch (e) {
        localStorage.removeItem('googleFonts')
      }
    }
    
    setLoadingFonts(true)
    fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`)
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          localStorage.setItem('googleFonts', JSON.stringify(data.items))
          setAllGoogleFonts(data.items)
        }
        setLoadingFonts(false)
      })
      .catch(err => {
        console.error('Failed to load Google Fonts:', err)
        setLoadingFonts(false)
      })
  }, [apiKey])

  // Track document fonts (fonts used in current canvas)
  useEffect(() => {
    if (!editor) return

    // @ts-ignore - accessing internal canvas
    const canvas = editor.canvas?.canvas || editor.canvas
    if (!canvas) return

    const updateDocumentFonts = () => {
      const fonts = new Set<string>()
      try {
        const objects = canvas.getObjects() || []
        objects.forEach((obj: any) => {
          if (obj.type === 'StaticText' || obj.type === 'DynamicText') {
            const fontFamily = obj.fontFamily || obj.metadata?.fontFamily
            if (fontFamily) {
              fonts.add(fontFamily)
            }
          }
        })
        setDocumentFonts(Array.from(fonts))
      } catch (err) {
        // Silently fail if canvas not ready
      }
    }

    updateDocumentFonts()
    canvas.on?.('object:added', updateDocumentFonts)
    canvas.on?.('object:modified', updateDocumentFonts)

    return () => {
      canvas.off?.('object:added', updateDocumentFonts)
      canvas.off?.('object:modified', updateDocumentFonts)
    }
  }, [editor])

  // Update active font from selected object
  useEffect(() => {
    if (!activeObject) return
    const obj = activeObject as any
    if (obj.type === 'StaticText' || obj.type === 'DynamicText') {
      const fontFamily = obj.fontFamily || obj.metadata?.fontFamily
      if (fontFamily) {
        setActiveFontFamily(fontFamily)
      }
    }
  }, [activeObject])

  const isGoogleFont = (font: any): font is GoogleFont => {
    return font && typeof font.family === 'string' && font.files
  }

  const getGoogleFontUrl = useCallback((font: GoogleFont): string | undefined => {
    return font.files.regular || font.files['400'] || Object.values(font.files)[0]
  }, [])

  // Load font stylesheet lazily (only when needed for preview)
  const ensureGoogleFontStylesheet = useCallback((font: GoogleFont) => {
    if (loadedFontStylesheets.has(font.family)) return
    
    const formattedName = font.family.replace(/ /g, '+')
    const linkId = `font-preview-${formattedName}`
    
    if (document.getElementById(linkId)) {
      loadedFontStylesheets.add(font.family)
      return
    }
    
    const link = document.createElement('link')
    link.id = linkId
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400&display=swap`
    document.head.appendChild(link)
    loadedFontStylesheets.add(font.family)
  }, [])

  // Batch load fonts in queue
  const processFontQueue = useCallback(() => {
    if (fontLoadQueue.length === 0) return
    
    const batch = fontLoadQueue.splice(0, BATCH_SIZE)
    batch.forEach(font => {
      ensureGoogleFontStylesheet(font)
    })
    
    // Continue processing if more fonts in queue
    if (fontLoadQueue.length > 0) {
      fontLoadTimeout = setTimeout(processFontQueue, BATCH_DELAY)
    }
  }, [ensureGoogleFontStylesheet])

  // Queue fonts for lazy loading
  const queueFontLoad = useCallback((fonts: GoogleFont[]) => {
    const newFonts = fonts.filter(f => !loadedFontStylesheets.has(f.family))
    if (newFonts.length === 0) return
    
    fontLoadQueue.push(...newFonts)
    
    if (!fontLoadTimeout) {
      fontLoadTimeout = setTimeout(processFontQueue, BATCH_DELAY)
    }
  }, [processFontQueue])

  // Load font face for actual use (when clicking)
  const loadFontFace = useCallback(
    async (fontFamily: string, fontUrl?: string) => {
      if (!fontUrl) return false
      if (loadedFontFaces.has(fontFamily)) return true
      
      try {
        const fontFace = new FontFace(fontFamily, `url(${fontUrl})`, {
          weight: '400',
          style: 'normal',
        })
        const loaded = await fontFace.load()
        document.fonts.add(loaded)
        loadedFontFaces.add(fontFamily)
        return true
      } catch (error) {
        console.error('Failed to load font face:', error)
        return false
      }
    },
    [],
  )

  // Font preview wrapper - just renders children, font loading happens via scroll detection
  const FontPreviewWrapper = useCallback(({ children }: { children: React.ReactNode }) => {
    return <>{children}</>
  }, [])

  const handleFontChange = useCallback(
    async (font: GoogleFont | IFontFamily) => {
      if (!editor) return

      let fontFamily: string
      let fontUrl: string | undefined

      if (isGoogleFont(font)) {
        // Google Font
        fontFamily = font.family
        fontUrl = getGoogleFontUrl(font)
        setActiveFontFamily(fontFamily)
        ensureGoogleFontStylesheet(font)
      } else {
        // Editor font
        const editorFont = font as unknown as IFontFamily
        fontFamily = editorFont.family
        const files = editorFont.files as any
        fontUrl = typeof files === 'string' ? files : files?.['regular'] || files?.[0]
      }

      if (!fontUrl) return

      try {
        await loadFontFace(fontFamily, fontUrl)
        editor.update({
          fontFamily,
          metadata: {
            fontURL: fontUrl,
          },
        })
      } catch (err) {
        console.error('Failed to load font:', err)
      }
    },
    [editor, getGoogleFontUrl, loadFontFace, ensureGoogleFontStylesheet],
  )

  // Filter fonts by search and category
  const filteredFonts = useMemo(() => {
    let fonts = allGoogleFonts

    // Filter by category
    if (selectedCategory !== 'all') {
      fonts = fonts.filter(font => font.category === selectedCategory)
    }

    // Filter by search
    if (searchValue.trim()) {
      const term = searchValue.toLowerCase()
      fonts = fonts.filter(font => font.family.toLowerCase().includes(term))
    }

    return fonts
  }, [allGoogleFonts, selectedCategory, searchValue])

  // Recommended fonts (popular ones)
  const recommendedFonts = useMemo(() => {
    return allGoogleFonts.slice(0, 10)
  }, [allGoogleFonts])

  // Only preload fonts that are currently visible (lazy loading)
  useEffect(() => {
    // Only load the first 10 recommended fonts on initial render
    if (recommendedFonts.length > 0) {
      queueFontLoad(recommendedFonts.slice(0, 10))
    }
  }, [recommendedFonts, queueFontLoad])

  // Load fonts as user scrolls - intersection observer style
  useEffect(() => {
    const visibleFonts = filteredFonts.slice(visibleRange.start, visibleRange.end)
    if (visibleFonts.length > 0) {
      queueFontLoad(visibleFonts)
    }
  }, [filteredFonts, visibleRange, queueFontLoad])

  // Handle scroll to update visible range
  const handleScroll = useCallback((values: any) => {
    const { scrollTop, clientHeight } = values
    const itemHeight = 40 // Approximate height of each font item
    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(clientHeight / itemHeight) + 5 // Buffer
    setVisibleRange({ start: Math.max(0, start - 5), end: start + visibleCount })
  }, [])

  // Load document fonts (fonts used in current canvas) - these are priority
  useEffect(() => {
    if (documentFonts.length === 0 || allGoogleFonts.length === 0) return
    
    documentFonts.forEach(name => {
      const font = allGoogleFonts.find(f => f.family === name)
      if (font) {
        ensureGoogleFontStylesheet(font)
        // Also load font face for document fonts since they're in use
        const url = getGoogleFontUrl(font)
        if (url) loadFontFace(font.family, url)
      }
    })
  }, [documentFonts, allGoogleFonts, getGoogleFontUrl, loadFontFace, ensureGoogleFontStylesheet])

  const categories: Array<{ label: string; value: Category | 'all' }> = [
    { label: 'All', value: 'all' },
    { label: 'Handwriting', value: 'handwriting' },
    { label: 'Corporate', value: 'sans-serif' },
    { label: 'Display', value: 'display' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', background: '#ffffff' }}>
      {/* Header with Tabs */}
      <div style={{ padding: '1rem 1.5rem 0' }}>
        <div
          style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#2d2d2d',
            marginBottom: '0.75rem',
          }}
        >
          Font
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e5e5e5' }}>
          <TabButton
            active={activeTab === 'font'}
            onClick={() => setActiveTab('font')}
          >
            Font
          </TabButton>
          <TabButton
            active={activeTab === 'textStyles'}
            onClick={() => setActiveTab('textStyles')}
          >
            Text styles
          </TabButton>
        </div>
      </div>

      {activeTab === 'font' && (
        <>
          {/* Search Bar */}
          <div style={{ padding: '1rem 1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Input
                startEnhancer={() => <Icons.Search size={18} />}
                value={searchValue}
                onChange={e => setSearchValue((e.target as any).value)}
                placeholder="Try 'Calligraphy' or 'Open Sans'"
                overrides={{
                  Root: {
                    style: {
                      borderRadius: '8px',
                      border: '1px solid #e5e5e5',
                    },
                  },
                  Input: {
                    style: {
                      fontSize: '0.9rem',
                    },
                  },
                }}
                clearOnEscape
              />
              <div
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 8h12M8 2v12"
                    stroke="#6b6b6b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <CategoryButton
                key={cat.value}
                active={selectedCategory === cat.value}
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </CategoryButton>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Scrollbars ref={scrollRef} onScrollFrame={handleScroll}>
              <div style={{ padding: '0 1.5rem 2rem' }}>
                {/* Document Fonts */}
                {documentFonts.length > 0 && (
                  <Section>
                    <SectionHeader>Document fonts</SectionHeader>
                    {documentFonts.map(fontName => {
                      const font = allGoogleFonts.find(f => f.family === fontName)
                      if (!font) return null
                      return (
                        <FontListItem
                          key={fontName}
                          onClick={() => handleFontChange(font)}
                          active={activeFontFamily === fontName}
                        >
                          <span
                            style={{
                              flex: 1,
                              fontFamily: `'${font.family}', sans-serif`,
                              fontSize: '0.95rem',
                            }}
                          >
                            {fontName}
                          </span>
                          {activeFontFamily === fontName && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M13 4L6 11L3 8"
                                stroke="#5A3FFF"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </FontListItem>
                      )
                    })}
                  </Section>
                )}

                {/* Recommended Fonts */}
                {recommendedFonts.length > 0 && (
                  <Section>
                    <SectionHeader>
                      Recommended fonts
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto' }}>
                        <circle cx="8" cy="8" r="1.5" fill="#6b6b6b" />
                        <circle cx="3" cy="8" r="1.5" fill="#6b6b6b" />
                        <circle cx="13" cy="8" r="1.5" fill="#6b6b6b" />
                      </svg>
                    </SectionHeader>
                    {recommendedFonts.map(font => (
                      <FontListItem
                        key={font.family}
                        onClick={() => handleFontChange(font)}
                        active={activeFontFamily === font.family}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontFamily: `'${font.family}', sans-serif`,
                            fontSize: '0.95rem',
                          }}
                        >
                          {font.family}
                        </span>
                        {activeFontFamily === font.family && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M13 4L6 11L3 8"
                              stroke="#5A3FFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </FontListItem>
                    ))}
                  </Section>
                )}

                {/* All Fonts */}
                {loadingFonts ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b6b6b' }}>
                    Loading fonts...
                  </div>
                ) : filteredFonts.length > 0 ? (
                  <Section>
                    {!searchValue && selectedCategory === 'all' && (
                      <SectionHeader>All fonts</SectionHeader>
                    )}
                    {filteredFonts.map(font => (
                      <FontListItem
                        key={font.family}
                        onClick={() => handleFontChange(font)}
                        active={activeFontFamily === font.family}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontFamily: `'${font.family}', sans-serif`,
                            fontSize: '0.95rem',
                          }}
                        >
                          {font.family}
                        </span>
                        {activeFontFamily === font.family && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M13 4L6 11L3 8"
                              stroke="#5A3FFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </FontListItem>
                    ))}
                  </Section>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b6b6b' }}>
                    No fonts found
                  </div>
                )}

                {/* Editor Fonts */}
                {editorFonts.length > 0 && (
                  <Section>
                    <SectionHeader>Editor fonts</SectionHeader>
                    {editorFonts.map(font => (
                      <FontListItem
                        key={font.id}
                        onClick={() => handleFontChange(font)}
                        active={activeFontFamily === font.family}
                      >
                        <span style={{ flex: 1 }}>{font.family}</span>
                        {activeFontFamily === font.family && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M13 4L6 11L3 8"
                              stroke="#5A3FFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </FontListItem>
                    ))}
                  </Section>
                )}

                {/* Upload Font Button */}
                {/* <div style={{ padding: '1rem 0', borderTop: '1px solid #e5e5e5', marginTop: '1rem' }}>
                  <UploadButton>
                    Upload a font
                  </UploadButton>
                  <a
                    href="#"
                    style={{
                      fontSize: '0.85rem',
                      color: '#6b6b6b',
                      textDecoration: 'none',
                      marginLeft: '0.5rem',
                    }}
                  >
                    Learn more
                  </a>
                </div> */}
              </div>
            </Scrollbars>
          </div>
        </>
      )}

      {activeTab === 'textStyles' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6b6b' }}>
          Text styles coming soon...
        </div>
      )}
    </div>
  )
}

const TabButton = styled('button', ({ $active }: { $active: boolean }) => ({
  background: 'transparent',
  border: 'none',
  padding: '0.75rem 0',
  fontSize: '0.9rem',
  fontWeight: $active ? 600 : 400,
  color: $active ? '#2d2d2d' : '#6b6b6b',
  cursor: 'pointer',
  borderBottom: $active ? '2px solid #2d2d2d' : '2px solid transparent',
  marginBottom: '-1px',
  transition: 'all 0.2s',
}))

const CategoryButton = styled('button', ({ $active }: { $active: boolean }) => ({
  background: $active ? '#5A3FFF' : '#f5f5f5',
  color: $active ? '#ffffff' : '#2d2d2d',
  border: 'none',
  borderRadius: '6px',
  padding: '0.4rem 0.75rem',
  fontSize: '0.85rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: $active ? '#4a2fef' : '#e5e5e5',
  },
}))

const Section = styled('div', {
  marginBottom: '1.5rem',
})

const SectionHeader = styled('div', {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#2d2d2d',
  marginBottom: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
})

const FontListItem = styled('div', ({ $active }: { $active: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '0.6rem 0.75rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  color: '#2d2d2d',
  background: $active ? '#f0edff' : 'transparent',
  marginBottom: '0.25rem',
  transition: 'all 0.15s',
  ':hover': {
    background: $active ? '#f0edff' : '#f5f5f5',
  },
}))

export default FontFamily
