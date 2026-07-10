import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { useDebounce } from 'use-debounce'
import {
  getFeaturedIllustrations,
  searchIconify,
  fetchIconifySvg,
  IconifyResult,
  LocalIllustration,
} from '@/services/illustrations'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { fail } from '@/lib/logger'
import { styled } from 'baseui'

// ── Styled Components ─────────────────────────────────

const Container = styled('div', {
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
})

const SearchSection = styled('div', {
  padding: '16px 20px',
  borderBottom: '1px solid #e8e8e8',
})

const SuggestionBar = styled('div', {
  display: 'flex',
  gap: '6px',
  padding: '10px 20px',
  overflowX: 'auto',
  flexWrap: 'nowrap',
  borderBottom: '1px solid #f0f0f0',
  '::-webkit-scrollbar': { height: '0px' },
})

const SuggestionChip = styled('button', {
  padding: '4px 12px',
  fontSize: '12px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontWeight: 400,
  backgroundColor: '#F3F4F6',
  color: '#6B7280',
  transition: 'all 0.15s',
  ':hover': {
    backgroundColor: '#E5E7EB',
    color: '#374151',
  },
})

const Grid = styled('div', {
  display: 'grid',
  gap: '10px',
  padding: '16px 20px',
  gridTemplateColumns: 'repeat(3, 1fr)',
})

const GridItem = styled('div', ({ $adding }: { $adding?: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: $adding ? 'wait' : 'pointer',
  borderRadius: '8px',
  backgroundColor: '#FAFAFA',
  border: '1px solid #F0F0F0',
  padding: '10px',
  aspectRatio: '1',
  opacity: $adding ? 0.5 : 1,
  transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
  ':hover': {
    transform: 'scale(1.04)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    borderColor: '#D1D5DB',
  },
}))

const ItemLabel = styled('div', {
  fontSize: '10px',
  color: '#9CA3AF',
  textAlign: 'center',
  marginTop: '4px',
  lineHeight: '1.2',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const SectionTitle = styled('div', {
  padding: '12px 20px 4px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#9CA3AF',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const StatusBar = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
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

const PoweredBy = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  padding: '6px 16px',
  fontSize: '10px',
  color: '#B0B0B0',
  borderTop: '1px solid #f0f0f0',
})

// ── Suggestions ───────────────────────────────────────

const SUGGESTIONS = [
  'arrow', 'people', 'business', 'social', 'weather', 'food',
  'animal', 'sport', 'music', 'travel', 'medical', 'education',
  'technology', 'finance', 'nature', 'shopping', 'home', 'love',
]

// ── Component ─────────────────────────────────────────

function Illustrations() {
  const [search, setSearch] = useState('')
  const [iconifyResults, setIconifyResults] = useState<IconifyResult[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [debouncedSearch] = useDebounce(search, 500)

  const editor = useEditor()
  const { canvas } = useEditorContext() as any
  const scrollRef = useRef<Scrollbars>(null)

  const featured = useMemo(() => getFeaturedIllustrations(), [])

  // Search Iconify when query changes
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setIconifyResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)
    searchIconify(debouncedSearch)
      .then(results => setIconifyResults(results))
      .catch(() => setIconifyResults([]))
      .finally(() => setLoading(false))
  }, [debouncedSearch])

  // Add a featured (local) illustration
  const addFeatured = useCallback((ill: LocalIllustration) => {
    if (addingId || !editor) return
    setAddingId(ill.id)

    addObjectToCanvas(editor, {
      type: 'StaticVector',
      metadata: { svg: ill.svg },
    }, undefined, canvas)

    setTimeout(() => setAddingId(null), 400)
  }, [editor, canvas, addingId])

  // Add an Iconify result
  const addIconify = useCallback(async (item: IconifyResult) => {
    if (addingId || !editor) return
    setAddingId(item.id)

    try {
      const svg = await fetchIconifySvg(item.prefix, item.name)
      addObjectToCanvas(editor, {
        type: 'StaticVector',
        metadata: { svg },
      }, undefined, canvas)
    } catch (err) {
      fail('elements', 'Could not add the illustration', err)
    }

    setTimeout(() => setAddingId(null), 500)
  }, [editor, canvas, addingId])

  const handleSuggestion = (term: string) => {
    setSearch(term)
    scrollRef.current?.scrollToTop()
  }

  const showingSearch = hasSearched || debouncedSearch.trim().length > 0

  return (
    <Container>
      <SearchSection>
        <Input
          startEnhancer={() => <Icons.Search size={16} />}
          value={search}
          onChange={e => setSearch((e.target as any).value)}
          placeholder="Search 300,000+ illustrations..."
          clearOnEscape
          overrides={{
            Root: { style: { borderRadius: '8px' } },
            Input: { style: { fontSize: '13px' } },
          }}
        />
      </SearchSection>

      {!showingSearch && (
        <SuggestionBar>
          {SUGGESTIONS.map(s => (
            <SuggestionChip key={s} onClick={() => handleSuggestion(s)}>
              {s}
            </SuggestionChip>
          ))}
        </SuggestionBar>
      )}

      <div style={{ flex: 1 }}>
        <Scrollbars ref={scrollRef} autoHide>
          {showingSearch ? (
            /* ── Search Results ── */
            loading ? (
              <StatusBar>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="#4F46E5" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" />
                </svg>
                Searching...
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </StatusBar>
            ) : iconifyResults.length === 0 ? (
              <EmptyState>
                <span style={{ fontSize: '20px', opacity: 0.5 }}>No results found</span>
                <span style={{ fontSize: '12px' }}>Try a different keyword</span>
              </EmptyState>
            ) : (
              <>
                <SectionTitle>{iconifyResults.length} results</SectionTitle>
                <Grid>
                  {iconifyResults.map(item => (
                    <div key={item.id}>
                      <GridItem
                        $adding={addingId === item.id}
                        onClick={() => addIconify(item)}
                      >
                        <img
                          src={item.thumbUrl}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          loading="lazy"
                        />
                      </GridItem>
                      <ItemLabel title={item.name}>
                        {item.name.replace(/-/g, ' ')}
                      </ItemLabel>
                    </div>
                  ))}
                </Grid>
              </>
            )
          ) : (
            /* ── Default: Featured Illustrations ── */
            <>
              <SectionTitle>Featured</SectionTitle>
              <Grid style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {featured.map(ill => (
                  <div key={ill.id}>
                    <GridItem
                      $adding={addingId === ill.id}
                      onClick={() => addFeatured(ill)}
                    >
                      <div
                        style={{ width: '100%', height: '100%' }}
                        dangerouslySetInnerHTML={{ __html: ill.svg }}
                      />
                    </GridItem>
                    <ItemLabel>{ill.name}</ItemLabel>
                  </div>
                ))}
              </Grid>
            </>
          )}
        </Scrollbars>
      </div>

      <PoweredBy>
        Search powered by
        <a
          href="https://iconify.design"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#4F46E5', fontWeight: 600 }}
        >
          Iconify
        </a>
      </PoweredBy>
    </Container>
  )
}

export default Illustrations
