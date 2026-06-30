import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useVideoContext from '@/hooks/useVideoContext'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { GOOGLE_FONTS } from '@/constants/googleFonts'
import { injectGoogleFont, loadGoogleFont } from '@/utils/fontLoader'
import { Heading1, Heading2, Type as TypeIcon, Table as TableIcon } from 'lucide-react'

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
  const { canvas } = useEditorContext() as any
  const { clips } = useVideoContext()

  const defaultStaticPreset = TEXT_PRESETS.find(preset => preset.id === 'static-default')

  const hasSearchTerm = value.trim().length > 0

  // Full Google Fonts catalog (keyless). When searching, filter it; otherwise
  // the whole list is browsable below the default styles.
  const filteredFonts = useMemo(() => {
    if (!hasSearchTerm) return GOOGLE_FONTS
    const term = value.trim().toLowerCase()
    return GOOGLE_FONTS.filter(f => f.family.toLowerCase().includes(term))
  }, [hasSearchTerm, value])

  const [renderLimit, setRenderLimit] = useState(30)
  useEffect(() => {
    setRenderLimit(30)
  }, [value])
  const visibleFonts = useMemo(() => filteredFonts.slice(0, renderLimit), [filteredFonts, renderLimit])
  // Lazily inject each visible font's stylesheet so previews render correctly.
  useEffect(() => {
    visibleFonts.forEach(f => injectGoogleFont(f.family))
  }, [visibleFonts])
  const handleFontScroll = useCallback((values: any) => {
    const { scrollTop, clientHeight, scrollHeight } = values
    if (scrollHeight - (scrollTop + clientHeight) < 400) {
      setRenderLimit(prev => prev + 30)
    }
  }, [])

  // Add a text box in the chosen font (loads it keylessly first).
  const addFontText = useCallback(
    (family: string) => {
      if (!editor || !canvas) return
      loadGoogleFont(family)
      addObjectToCanvas(
        editor,
        {
          type: 'StaticText',
          width: 320,
          metadata: {
            text: family,
            fontSize: 32,
            fontWeight: 600,
            fontFamily: family,
            textAlign: 'center',
            fill: '#000000',
          },
        },
        320,
        canvas
      )
    },
    [editor, canvas]
  )

  // Quick text blocks (Canva "/" style): Heading, Subheading, Body.
  const addQuickText = useCallback(
    (text: string, fontSize: number, fontWeight: number) => {
      if (!editor || !canvas) return
      loadGoogleFont('Poppins')
      addObjectToCanvas(
        editor,
        {
          type: 'StaticText',
          width: 480,
          metadata: { text, fontSize, fontWeight, fontFamily: 'Poppins', textAlign: 'left', fill: '#111827' },
        },
        480,
        canvas
      )
    },
    [editor, canvas]
  )

  // Quick table: a 3×3 grid of bordered cells centred in the frame.
  const addTable = useCallback(() => {
    if (!editor || !canvas) return
    const clip = canvas.clipPath
    const fw = (clip?.width || 900) * (clip?.scaleX || 1)
    const fh = (clip?.height || 1200) * (clip?.scaleY || 1)
    const fl = clip?.left || 0
    const ft = clip?.top || 0
    const cols = 3
    const rows = 3
    const cellW = Math.round(Math.min(fw * 0.8, 900) / cols)
    const cellH = Math.round(cellW * 0.45)
    const startX = fl + (fw - cellW * cols) / 2
    const startY = ft + Math.round(fh * 0.28)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        addObjectToCanvas(
          editor,
          {
            type: 'StaticRect',
            left: startX + c * cellW,
            top: startY + r * cellH,
            width: cellW,
            height: cellH,
            fill: r === 0 ? '#f3f4f6' : '#ffffff',
            stroke: '#d1d5db',
            strokeWidth: 1,
          },
          cellW,
          canvas
        )
      }
    }
  }, [editor, canvas])

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
        return undefined
      } finally {
        setFontLoading(prev => ({ ...prev, [font.id]: false }))
      }
    },
    [fontLoading, fontSources],
  )

  const handleAddText = (preset: TextPreset) => {
    if (!editor || !canvas) {
      return
    }

    addObjectToCanvas(editor, {
      type: preset.type,
      width: 320,
      metadata: {
        text: preset.preview || 'Sample Text',
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
        fontFamily: preset.fontFamily,
        fontURL: preset.fontURL,
        textAlign: 'center',
        fill: '#000000',
      },
    }, 320, canvas)
  }

  const handleAddGoogleFont = useCallback(
    async (font: GoogleFontOption) => {
      if (!editor || !canvas) return

      await ensureFontAvailable(font)

      addObjectToCanvas(editor, {
        type: 'StaticText',
        width: 320,
        metadata: {
          text: font.preview,
          fontSize: font.fontSize,
          fontWeight: font.fontWeight,
          fontFamily: font.fontFamily,
          fontURL: fontSources[font.id],
          textAlign: 'center',
          fill: '#000000',
        },
      }, 320, canvas)
    },
    [editor, canvas, ensureFontAvailable],
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
      {!hasSearchTerm && (
        <div style={{ padding: '0 2rem 0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <QuickButton icon={<Heading1 size={16} />} label="Heading" onClick={() => addQuickText('Heading', 48, 700)} />
          <QuickButton icon={<Heading2 size={16} />} label="Subheading" onClick={() => addQuickText('Subheading', 30, 600)} />
          <QuickButton icon={<TypeIcon size={16} />} label="Body text" onClick={() => addQuickText('Body text', 18, 400)} />
          <QuickButton icon={<TableIcon size={16} />} label="Table" onClick={addTable} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <Scrollbars onScrollFrame={handleFontScroll}>
          <div
            style={{
              display: 'grid',
              padding: '0 2rem 2rem',
              gap: '0.5rem',
            }}
          >
            {hasSearchTerm ? (
              <>
                <div style={fontsLabelStyle}>Fonts</div>
                {visibleFonts.length ? (
                  visibleFonts.map(f => (
                    <FontRow key={f.family} family={f.family} onClick={() => addFontText(f.family)} />
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

                {/* Browsable full font catalog (keyless, infinite scroll) */}
                <div style={{ ...fontsLabelStyle, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '1.25rem 0 0.25rem' }}>
                  Fonts
                </div>
                {visibleFonts.map(f => (
                  <FontRow key={f.family} family={f.family} onClick={() => addFontText(f.family)} />
                ))}
              </>
            )}
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

const fontsLabelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#6b6b6b',
  margin: '0.75rem 0 0.25rem',
}

function QuickButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mfa-quick-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        background: '#fff',
        color: '#374151',
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'border-color .12s, background .12s',
      }}
    >
      <span style={{ color: '#6366f1', display: 'flex' }}>{icon}</span>
      {label}
      <style>{`.mfa-quick-btn:hover{border-color:#6366f1 !important;background:#f8fafc !important}`}</style>
    </button>
  )
}

function FontRow({ family, onClick }: { family: string; onClick: () => void }) {
  return (
    <div
      className="mfa-font-row"
      onClick={onClick}
      title={`Add text in ${family}`}
      style={{
        padding: '0.7rem 1rem',
        borderRadius: '10px',
        background: '#ffffff',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'box-shadow .12s',
      }}
    >
      <div style={{ fontFamily: `'${family}', 'Helvetica Neue', sans-serif`, fontSize: 22, lineHeight: 1.2, color: '#1f2937' }}>
        {family}
      </div>
      <style>{`.mfa-font-row:hover{box-shadow:0 0 0 1px #6366f1 !important}`}</style>
    </div>
  )
}

export default Panel
