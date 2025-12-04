import { useEditor } from '@nkyo/scenify-sdk'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'

type TextPresetType = 'StaticText' | 'DynamicText'

type TextPresetCategory = 'default' | 'body' | 'dynamic'

interface TextPreset {
  id: string
  label: string
  type: TextPresetType
  preview: string
  fontFamily: string
  fontURL?: string
  fontSize: number
  fontWeight: number
  category: TextPresetCategory
}

const TEXT_PRESETS: TextPreset[] = [
  {
    id: 'static-default',
    label: 'Add static text',
    type: 'StaticText',
    preview: 'Add static text',
    fontFamily: 'Amiko',
    fontURL: 'https://fonts.gstatic.com/s/amiko/v5/WwkQxPq1DFK04tqlc17MMZgJ.ttf',
    fontSize: 32,
    fontWeight: 500,
    category: 'default',
  },
  {
    id: 'dynamic-default',
    label: 'Add dynamic text',
    type: 'DynamicText',
    preview: 'Add dynamic text',
    fontFamily: 'Lexend',
    fontSize: 32,
    fontWeight: 500,
    category: 'dynamic',
  },
  // Google Fonts examples
  {
    id: 'heading-poppins',
    label: 'Heading – Poppins',
    type: 'StaticText',
    preview: 'Big bold heading',
    fontFamily: 'Poppins',
    fontURL:
      'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLPTed3FBGPaTSQ.ttf',
    fontSize: 42,
    fontWeight: 700,
    category: 'default',
  },
  {
    id: 'subheading-roboto',
    label: 'Subheading – Roboto',
    type: 'StaticText',
    preview: 'Subheading text',
    fontFamily: 'Roboto',
    fontURL:
      'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.ttf',
    fontSize: 28,
    fontWeight: 500,
    category: 'default',
  },
  {
    id: 'body-open-sans',
    label: 'Body – Open Sans',
    type: 'StaticText',
    preview: 'Body text paragraph',
    fontFamily: 'Open Sans',
    fontURL:
      'https://fonts.gstatic.com/s/opensans/v34/mem8YaGs126MiZpBA-U1UpcaXcl0Aw.ttf',
    fontSize: 20,
    fontWeight: 400,
    category: 'body',
  },
]

interface GoogleFontOption {
  id: string
  name: string
  cssUrl: string
  fontFamily: string
  preview: string
  fontWeight: number
  fontSize: number
}

const GOOGLE_FONT_LIBRARY: GoogleFontOption[] = [
  {
    id: 'alex-brush',
    name: 'Alex Brush',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap',
    fontFamily: 'Alex Brush',
    preview: 'Alex Brush',
    fontWeight: 400,
    fontSize: 36,
  },
  {
    id: 'alexandria',
    name: 'Alexandria',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600&display=swap',
    fontFamily: 'Alexandria',
    preview: 'Alexandria',
    fontWeight: 600,
    fontSize: 34,
  },
  {
    id: 'bebas-neue',
    name: 'Bebas Neue',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
    fontFamily: 'Bebas Neue',
    preview: 'Bebas Neue',
    fontWeight: 400,
    fontSize: 40,
  },
  {
    id: 'dancing-script',
    name: 'Dancing Script',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600&display=swap',
    fontFamily: 'Dancing Script',
    preview: 'Dancing Script',
    fontWeight: 600,
    fontSize: 36,
  },
  {
    id: 'lobster',
    name: 'Lobster',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Lobster&display=swap',
    fontFamily: 'Lobster',
    preview: 'Lobster',
    fontWeight: 400,
    fontSize: 34,
  },
  {
    id: 'playfair-display',
    name: 'Playfair Display',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap',
    fontFamily: 'Playfair Display',
    preview: 'Playfair Display',
    fontWeight: 600,
    fontSize: 36,
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
    fontFamily: 'Montserrat',
    preview: 'Montserrat',
    fontWeight: 600,
    fontSize: 34,
  },
  {
    id: 'raleway',
    name: 'Raleway',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600&display=swap',
    fontFamily: 'Raleway',
    preview: 'Raleway',
    fontWeight: 600,
    fontSize: 32,
  },
  {
    id: 'roboto-slab',
    name: 'Roboto Slab',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;600&display=swap',
    fontFamily: 'Roboto Slab',
    preview: 'Roboto Slab',
    fontWeight: 600,
    fontSize: 32,
  },
  {
    id: 'league-spartan',
    name: 'League Spartan',
    cssUrl: 'https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;600&display=swap',
    fontFamily: 'League Spartan',
    preview: 'League Spartan',
    fontWeight: 600,
    fontSize: 34,
  },
  {
    id: 'pacifico',
    name: 'Pacifico',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap',
    fontFamily: 'Pacifico',
    preview: 'Pacifico',
    fontWeight: 400,
    fontSize: 34,
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
    fontFamily: 'Merriweather',
    preview: 'Merriweather',
    fontWeight: 700,
    fontSize: 32,
  },
  {
    id: 'lato',
    name: 'Lato',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
    fontFamily: 'Lato',
    preview: 'Lato',
    fontWeight: 700,
    fontSize: 32,
  },
  {
    id: 'kalam',
    name: 'Kalam',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap',
    fontFamily: 'Kalam',
    preview: 'Kalam',
    fontWeight: 700,
    fontSize: 34,
  },
]

function Panel() {
  const [value, setValue] = useState('')
  const [fontSources, setFontSources] = useState<Record<string, string>>({})
  const [fontLoading, setFontLoading] = useState<Record<string, boolean>>({})

  const editor = useEditor()

  const defaultStaticPreset = TEXT_PRESETS.find(preset => preset.id === 'static-default')

  const hasSearchTerm = value.trim().length > 0

  const searchedFonts = useMemo(() => {
    if (!hasSearchTerm) return []
    const term = value.trim().toLowerCase()
    return GOOGLE_FONT_LIBRARY.filter(font =>
      font.name.toLowerCase().includes(term),
    ).slice(0, 30)
  }, [hasSearchTerm, value])

  const extractFontUrlFromCss = (cssText: string) => {
    const match = cssText.match(/src:\s*url\(([^)]+)\)/)
    if (!match || !match[1]) return undefined
    return match[1].replace(/['"]/g, '')
  }

  const ensureFontAvailable = useCallback(
    async (font: GoogleFontOption) => {
      if (fontSources[font.id]) {
        return fontSources[font.id]
      }
      if (typeof window === 'undefined' || typeof FontFace === 'undefined') return undefined
      if (fontLoading[font.id]) return undefined

      setFontLoading(prev => ({ ...prev, [font.id]: true }))
      try {
        const cssResponse = await fetch(font.cssUrl)
        const cssText = await cssResponse.text()
        const fontUrl = extractFontUrlFromCss(cssText)
        if (!fontUrl) return undefined
        const fontFace = new FontFace(font.fontFamily, `url(${fontUrl})`, {
          weight: font.fontWeight.toString(),
          style: 'normal',
        })
        const loadedFont = await fontFace.load()
        document.fonts.add(loadedFont)
        setFontSources(prev => ({ ...prev, [font.id]: fontUrl }))
        return fontUrl
      } catch (error) {
        console.error('Failed to load Google font:', font.fontFamily, error)
        return undefined
      } finally {
        setFontLoading(prev => ({ ...prev, [font.id]: false }))
      }
    },
    [fontLoading, fontSources],
  )

  useEffect(() => {
    if (!searchedFonts.length) return
    searchedFonts.slice(0, 5).forEach(font => {
      ensureFontAvailable(font)
    })
  }, [searchedFonts, ensureFontAvailable])

  const handleAddText = (preset: TextPreset) => {
    if (!editor) return

    const options = {
      type: preset.type,
      width: 320,
      metadata: {
        text: preset.preview,
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
        fontFamily: preset.fontFamily,
        textAlign: 'center',
        ...(preset.fontURL ? { fontURL: preset.fontURL } : {}),
      },
    }

    editor.add(options)
  }

  const handleAddGoogleFont = useCallback(
    async (font: GoogleFontOption) => {
      if (!editor) return

      const fontUrl = await ensureFontAvailable(font)

      const metadata: Record<string, any> = {
        text: font.preview,
        fontSize: font.fontSize,
        fontWeight: font.fontWeight,
        fontFamily: font.fontFamily,
        textAlign: 'center',
      }

      if (fontUrl) {
        metadata.fontURL = fontUrl
      }

      editor.add({
        type: 'StaticText',
        width: 320,
        metadata,
      })
    },
    [editor, ensureFontAvailable],
  )

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem 2rem 1rem' }}>
        <Input
          startEnhancer={() => <Icons.Search size={18} />}
          value={value}
          onChange={e => setValue((e.target as any).value)}
          placeholder="Search fonts and combinations"
          clearOnEscape
        />
      </div>
      <div style={{ padding: '0 2rem 1rem' }}>
        <div
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '6px',
            background:
              'linear-gradient(135deg, #5A3FFF 0%, #8A5BFF 40%, #C55BFF 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: defaultStaticPreset ? 'pointer' : 'not-allowed',
          }}
          onClick={() => {
            if (defaultStaticPreset) {
              handleAddText(defaultStaticPreset)
            }
          }}
        >
          <span style={{ marginRight: '0.5rem' }}>T</span>
          <span>Add a text box</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <Scrollbars>
          <div
            style={{
              display: 'grid',
              padding: '0 2rem 2rem',
              gap: '0.5rem',
            }}
          >
            {hasSearchTerm ? (
              <>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#6b6b6b',
                    margin: '0.25rem 0 0.35rem',
                  }}
                >
                  Fonts
                </div>
                {searchedFonts.length ? (
                  searchedFonts.map(font => (
                    <div
                      key={font.id}
                      style={{
                        padding: '0.9rem 1rem',
                        borderRadius: '12px',
                        background: '#ffffff',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
                        cursor: fontLoading[font.id] ? 'wait' : 'pointer',
                      }}
                      onClick={() => !fontLoading[font.id] && handleAddGoogleFont(font)}
                    >
                      <div
                        style={{
                          fontFamily: `'${font.fontFamily}', 'Helvetica Neue', sans-serif`,
                          fontSize: `${font.fontSize}px`,
                          lineHeight: 1.1,
                        }}
                      >
                        {font.preview}
                      </div>
                      <div
                        style={{
                          marginTop: '0.35rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#2f2f2f',
                        }}
                      >
                        {font.name}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: '#fafafa',
                      color: '#6b6b6b',
                      fontSize: '0.85rem',
                    }}
                  >
                    No fonts found for “{value.trim()}”.
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#6b6b6b',
                    margin: '0.75rem 0 0.25rem',
                  }}
                >
                  Default text styles
                </div>
                {TEXT_PRESETS.filter(preset => preset.category === 'default' || preset.category === 'body').map(
                  preset => (
                    <div
                      key={preset.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        minHeight: '72px',
                      }}
                      onClick={() => handleAddText(preset)}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              preset.category === 'default' && preset.fontSize >= 40
                                ? '1.3rem'
                                : '1rem',
                            fontWeight: 600,
                            marginBottom: '0.2rem',
                          }}
                        >
                          {preset.category === 'body'
                            ? 'Add a little bit of body text'
                            : preset.id === 'subheading-roboto'
                            ? 'Add a subheading'
                            : 'Add a heading'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#666666',
                          }}
                        >
                          {preset.fontFamily}
                        </div>
                      </div>
                    </div>
                  ),
                )}

                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#6b6b6b',
                    margin: '1.25rem 0 0.25rem',
                  }}
                >
                  Dynamic text
                </div>
                {TEXT_PRESETS.filter(preset => preset.category === 'dynamic').map(
                  preset => (
                    <div
                      key={preset.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        minHeight: '72px',
                      }}
                      onClick={() => handleAddText(preset)}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            marginBottom: '0.2rem',
                          }}
                        >
                          {preset.label}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#666666',
                          }}
                        >
                          {preset.fontFamily}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </>
            )}
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

export default Panel
