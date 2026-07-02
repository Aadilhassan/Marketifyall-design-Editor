import { useState, useMemo } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useEditor } from '@nkyo/scenify-sdk'
import { useSelector } from 'react-redux'
import { selectTemplates } from '@/store/slices/templates/selectors'
import { fail } from '@/lib/logger'

const CATEGORIES = [
  'All',
  'Social Media',
  'Business',
  'Food',
  'Fitness',
  'Fashion',
  'Technology',
  'Travel',
  'Real Estate',
  'Education',
  'Events',
  'Motivation',
  'Celebration',
  'YouTube',
  'Seasonal',
  'Minimalist',
  'Branding',
]

function Templates() {
  const templates = useSelector(selectTemplates)
  const [value, setValue] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const editor = useEditor()

  const filteredTemplates = useMemo(() => {
    let filtered = templates
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((t: any) => t.category === selectedCategory)
    }
    if (value.trim()) {
      const term = value.trim().toLowerCase()
      filtered = filtered.filter((t: any) => t.name?.toLowerCase().includes(term))
    }
    return filtered
  }, [templates, selectedCategory, value])

  // Derive available categories from actual data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    templates.forEach((t: any) => {
      if (t.category) cats.add(t.category)
    })
    return CATEGORIES.filter(c => c === 'All' || cats.has(c))
  }, [templates])

  const handleLoadTemplate = async (template: any) => {
    const fonts: any[] = []
    template.objects.forEach((object: any) => {
      if (object.type === 'StaticText' || object.type === 'DynamicText') {
        fonts.push({
          name: object.metadata?.fontFamily || object.fontFamily,
          url: object.metadata?.fontURL || object.fontURL,
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

  const loadFonts = (fonts: any[]) => {
    const promisesList = fonts.map(font => {
      return new FontFace(font.name, `url(${font.url})`, font.options).load().catch(err => err)
    })
    // Always resolve once ALL fonts settle (loaded OR failed), adding the ones
    // that loaded. Previously resolve() was only called when a font SUCCEEDED, so
    // a template whose font URLs fail to load (offline / CORS / bad URL) hung
    // here forever and the design never imported.
    return Promise.all(promisesList).then(res => {
      res.forEach(uniqueFont => {
        if (uniqueFont && (uniqueFont as FontFace).family) {
          try {
            document.fonts.add(uniqueFont as FontFace)
          } catch (err) {
            fail('templates', 'Could not load this template', err)
          }
        }
      })
    })
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: '0.75rem' }}>
          Templates
        </div>
        <Input
          startEnhancer={() => <Icons.Search size={18} />}
          value={value}
          onChange={e => setValue((e.target as any).value)}
          placeholder="Search templates"
          clearOnEscape
          overrides={{
            Root: { style: { borderRadius: '8px', border: '1px solid #e5e5e5' } },
            Input: { style: { fontSize: '0.9rem' } },
          }}
        />
      </div>

      {/* Category filters */}
      <div style={{ padding: '0 1.5rem 0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {availableCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              background: selectedCategory === cat ? '#5A3FFF' : '#f5f5f5',
              color: selectedCategory === cat ? '#ffffff' : '#2d2d2d',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ padding: '0 1.5rem 0.5rem', fontSize: '0.8rem', color: '#6b6b6b' }}>
        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
      </div>

      <div style={{ flex: 1 }}>
        <Scrollbars>
          <div
            style={{
              display: 'grid',
              gap: '0.5rem',
              padding: '0 1.5rem 2rem',
              gridTemplateColumns: '1fr 1fr',
            }}
          >
            {filteredTemplates.map((template: any) => {
              const previewSrc = template.preview || template.thumbnailUrl
              const isDataUrl = previewSrc?.startsWith('data:')
              return (
                <div
                  key={template.id}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.08)',
                    transition: 'all 0.2s',
                    background: '#fafafa',
                  }}
                  onClick={() => handleLoadTemplate(template)}
                >
                  <img
                    width="100%"
                    src={isDataUrl ? previewSrc : `${previewSrc}?tr=w-320`}
                    alt={template.name || 'template'}
                    style={{ display: 'block', minHeight: '60px', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div
                    style={{
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.72rem',
                      color: '#555',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={template.name}
                  >
                    {template.name}
                  </div>
                </div>
              )
            })}
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

export default Templates
