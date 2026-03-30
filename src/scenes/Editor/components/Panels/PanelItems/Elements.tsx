import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { Scrollbars } from 'react-custom-scrollbars'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import {
  ELEMENT_LIBRARY,
  searchElements,
  getPopularElements,
  getTotalElementCount,
} from '@/constants/elementLibrary'
import type { ElementItem } from '@/constants/elementLibrary'
import { searchIcons } from '@/utils/lucideIconsManager'
import type { LucideIcon } from '@/utils/lucideIconsManager'
import { useDebounce } from 'use-debounce'
import {
  searchIconify,
  getIconSVG,
  getCollectionIconsWithSVG,
} from '@/utils/iconifyManager'
import type { IconifyIcon } from '@/utils/iconifyManager'

// ─────────────────────────────────────────────────────────────
// Iconify category definitions (appear as nav tabs alongside elements)
// ─────────────────────────────────────────────────────────────

const ICONIFY_CATEGORIES: {
  id: string
  name: string
  icon: string
  collections: { prefix: string; name: string }[]
}[] = [
  {
    id: 'iconify:icons',
    name: 'Icons',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    collections: [
      { prefix: 'mdi', name: 'Material Design' },
      { prefix: 'ph', name: 'Phosphor' },
      { prefix: 'lucide', name: 'Lucide' },
      { prefix: 'tabler', name: 'Tabler' },
      { prefix: 'heroicons', name: 'Heroicons' },
      { prefix: 'ri', name: 'Remix' },
    ],
  },
  {
    id: 'iconify:emoji',
    name: 'Emoji',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    collections: [
      { prefix: 'noto', name: 'Noto' },
      { prefix: 'twemoji', name: 'Twitter' },
      { prefix: 'fluent-emoji', name: 'Fluent' },
      { prefix: 'openmoji', name: 'OpenMoji' },
      { prefix: 'emojione', name: 'EmojiOne' },
      { prefix: 'fxemoji', name: 'FxEmoji' },
    ],
  },
  {
    id: 'iconify:logos',
    name: 'Logos',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    collections: [
      { prefix: 'logos', name: 'SVG Logos' },
      { prefix: 'simple-icons', name: 'Simple Icons' },
      { prefix: 'devicon', name: 'Devicon' },
      { prefix: 'skill-icons', name: 'Skill Icons' },
      { prefix: 'vscode-icons', name: 'VS Code' },
      { prefix: 'fa6-brands', name: 'FA Brands' },
    ],
  },
  {
    id: 'iconify:solid',
    name: 'Solid',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
    collections: [
      { prefix: 'ic', name: 'Google' },
      { prefix: 'ion', name: 'Ionicons' },
      { prefix: 'bi', name: 'Bootstrap' },
      { prefix: 'fa6-solid', name: 'Font Awesome' },
      { prefix: 'carbon', name: 'Carbon' },
      { prefix: 'flat-color-icons', name: 'Flat Color' },
    ],
  },
  {
    id: 'iconify:flags',
    name: 'Flags',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    collections: [
      { prefix: 'circle-flags', name: 'Circle Flags' },
      { prefix: 'flagpack', name: 'Flagpack' },
      { prefix: 'flag', name: 'Flag Icons' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// Recently Used (localStorage)
// ─────────────────────────────────────────────────────────────

const RECENT_KEY = 'mfa-recent-elements'
const MAX_RECENT = 16

function getRecentElements(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function addRecentElement(id: string) {
  const recent = getRecentElements().filter(r => r !== id)
  recent.unshift(id)
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
}

// ─────────────────────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────────────────────

const PanelRoot = styled('div', {
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
  backgroundColor: '#fff',
})

const SearchArea = styled('div', {
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
})

const CountBadge = styled('span', {
  fontSize: '11px',
  color: '#999',
  fontWeight: 400,
  marginTop: '4px',
  display: 'block',
})

const CategoryNav = styled('div', {
  display: 'flex',
  overflowX: 'auto',
  gap: '0',
  borderBottom: '1px solid #e8e8e8',
  backgroundColor: '#fafafa',
  scrollBehavior: 'smooth',
  alignItems: 'stretch',
  '::-webkit-scrollbar': {
    height: '0',
  },
})

const CategoryNavItem = styled('button', ({ $active }: { $active: boolean }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '3px',
  padding: '8px 10px 6px',
  border: 'none',
  background: $active ? '#fff' : 'transparent',
  cursor: 'pointer',
  fontSize: '10px',
  fontWeight: $active ? 600 : 500,
  color: $active ? '#5A3FFF' : '#888',
  whiteSpace: 'nowrap',
  borderBottom: $active ? '2px solid #5A3FFF' : '2px solid transparent',
  transition: 'all 0.15s ease',
  minWidth: '48px',
  flexShrink: 0,
  lineHeight: '1.2',
  ':hover': {
    color: '#5A3FFF',
    background: $active ? '#fff' : '#f8f7ff',
  },
}))

const NavIcon = styled('div', {
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const ContentArea = styled('div', {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
})

const SectionHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px 6px',
})

const SectionTitle = styled('span', {
  fontSize: '12px',
  fontWeight: 600,
  color: '#555',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
})

const SeeAllBtn = styled('button', {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  color: '#5A3FFF',
  padding: '2px 6px',
  borderRadius: '4px',
  ':hover': {
    background: '#f0eeff',
  },
})

const Grid = styled('div', ({ $cols }: { $cols?: number }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${$cols || 4}, 1fr)`,
  gap: '8px',
  padding: '6px 16px 12px',
}))

const ElementCard = styled('div', ({ $loading }: { $loading?: boolean }) => ({
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border: '1px solid #eee',
  cursor: $loading ? 'wait' : 'pointer',
  transition: 'all 0.15s ease',
  backgroundColor: '#fafafa',
  opacity: $loading ? 0.5 : 1,
  overflow: 'hidden',
  position: 'relative',
  ':hover': {
    borderColor: '#5A3FFF',
    backgroundColor: '#f8f7ff',
    transform: 'scale(1.04)',
    boxShadow: '0 2px 8px rgba(90,63,255,0.12)',
  },
}))

const ElementPreview = styled('div', {
  width: '70%',
  height: '70%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
})

const SubcatChips = styled('div', {
  display: 'flex',
  gap: '6px',
  padding: '8px 16px',
  overflowX: 'auto',
  scrollBehavior: 'smooth',
  '::-webkit-scrollbar': {
    height: '3px',
  },
  '::-webkit-scrollbar-thumb': {
    background: '#ddd',
    borderRadius: '2px',
  },
})

const Chip = styled('button', ({ $active }: { $active: boolean }) => ({
  padding: '5px 12px',
  borderRadius: '14px',
  border: 'none',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
  background: $active ? '#5A3FFF' : '#f0f0f0',
  color: $active ? '#fff' : '#666',
  ':hover': {
    background: $active ? '#4a2fef' : '#e5e5e5',
  },
}))

const LoadingBox = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px',
  color: '#aaa',
  fontSize: '13px',
  gap: '8px',
})

const EmptyBox = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 24px',
  color: '#bbb',
  fontSize: '13px',
  textAlign: 'center',
  gap: '8px',
})

const BackButton = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  color: '#5A3FFF',
  ':hover': {
    color: '#4a2fef',
  },
})

// ─────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="#5A3FFF" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" />
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </svg>
)

// ─────────────────────────────────────────────────────────────
// Main Panel Component
// ─────────────────────────────────────────────────────────────

type ViewMode = 'browse' | 'category'

function Panel() {
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch] = useDebounce(searchValue, 300)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('browse')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [recentIds, setRecentIds] = useState<string[]>(getRecentElements)

  // Iconify state
  const [iconifyIcons, setIconifyIcons] = useState<IconifyIcon[]>([])
  const [activePrefix, setActivePrefix] = useState('mdi')
  const [loadingIconify, setLoadingIconify] = useState(false)

  const editor = useEditor()
  const { canvas } = useEditorContext() as any
  const scrollRef = useRef<Scrollbars>(null)

  const totalCount = useMemo(() => getTotalElementCount(), [])
  const popularElements = useMemo(() => getPopularElements(), [])

  const allElementsFlat = useMemo(() => {
    const flat: Record<string, ElementItem> = {}
    for (const cat of ELEMENT_LIBRARY) {
      for (const sub of cat.subcategories) {
        for (const el of sub.elements) {
          flat[el.id] = el
        }
      }
    }
    return flat
  }, [])

  const recentElements = useMemo(() => {
    return recentIds.map(id => allElementsFlat[id]).filter(Boolean).slice(0, 8)
  }, [recentIds, allElementsFlat])

  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return []
    return searchElements(debouncedSearch)
  }, [debouncedSearch])

  const currentCategory = useMemo(() => {
    return ELEMENT_LIBRARY.find(c => c.id === activeCategory)
  }, [activeCategory])

  const currentIconifyCategory = useMemo(() => {
    return ICONIFY_CATEGORIES.find(c => c.id === activeCategory)
  }, [activeCategory])

  const isIconifyCategory = activeCategory.startsWith('iconify:')

  // Load Iconify icons when browsing an iconify category
  useEffect(() => {
    if (!isIconifyCategory) return
    let cancelled = false
    setLoadingIconify(true)
    getCollectionIconsWithSVG(activePrefix, 80).then(icons => {
      if (!cancelled) setIconifyIcons(icons)
    }).catch(() => {
      if (!cancelled) setIconifyIcons([])
    }).finally(() => {
      if (!cancelled) setLoadingIconify(false)
    })
    return () => { cancelled = true }
  }, [activePrefix, isIconifyCategory])

  // Unified search: elements + lucide + iconify all merged
  const [unifiedSearchResults, setUnifiedSearchResults] = useState<
    { type: 'element'; data: ElementItem }[] |
    { type: 'lucide'; data: LucideIcon }[] |
    { type: 'iconify'; data: IconifyIcon }[] |
    any[]
  >([])
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setUnifiedSearchResults([])
      return
    }
    let cancelled = false
    setSearchLoading(true)

    const results: any[] = []

    // Add element library results immediately
    const elementResults = searchElements(debouncedSearch)
    for (const el of elementResults) {
      results.push({ type: 'element', data: el })
    }

    // Fetch lucide + iconify in parallel
    Promise.all([
      searchIcons(debouncedSearch).then(icons => icons.slice(0, 12)),
      searchIconify(debouncedSearch, 48).then(async icons => {
        const withSvg = await Promise.all(
          icons.slice(0, 48).map(async icon => {
            const svg = await getIconSVG(icon.id)
            return { ...icon, svg }
          })
        )
        return withSvg.filter(i => i.svg)
      }).catch(() => [] as IconifyIcon[]),
    ]).then(([lucideResults, iconifyResults]) => {
      if (cancelled) return

      const merged: any[] = [...results]
      for (const icon of lucideResults) {
        merged.push({ type: 'lucide', data: icon })
      }
      for (const icon of iconifyResults) {
        merged.push({ type: 'iconify', data: icon })
      }
      setUnifiedSearchResults(merged)
      setSearchLoading(false)
    })

    // Show element results right away while icons load
    if (results.length > 0) {
      setUnifiedSearchResults(results)
    }

    return () => { cancelled = true }
  }, [debouncedSearch])

  // ─── Add SVG to canvas (shared logic) ─────────────────────

  const addSvgToCanvas = useCallback((svgContent: string, id: string, name: string, meta?: Record<string, any>) => {
    if (!canvas) return

    if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgContent = svgContent.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    }

    const fabric = (window as any).fabric
    if (!fabric || !fabric.loadSVGFromString) { setAddingId(null); return }

    const clipPath = canvas.clipPath
    const frameWidth = clipPath?.width || 900
    const frameHeight = clipPath?.height || 1200
    const frameLeft = clipPath?.left || 175.5
    const frameTop = clipPath?.top || -286.5

    const vbMatch = svgContent.match(/viewBox="([^"]+)"/)
    let targetW = 150, targetH = 150
    if (vbMatch) {
      const parts = vbMatch[1].split(/\s+/).map(Number)
      const vbW = parts[2], vbH = parts[3]
      if (vbW && vbH) {
        const aspect = vbW / vbH
        if (aspect > 1.5) { targetW = 250; targetH = Math.round(250 / aspect) }
        else if (aspect < 0.67) { targetH = 250; targetW = Math.round(250 * aspect) }
        else { targetW = 150; targetH = Math.round(150 / aspect) }
      }
    }

    if (!svgContent.includes('width=')) {
      const vb = svgContent.match(/viewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/)
      if (vb) {
        svgContent = svgContent.replace('<svg ', `<svg width="${vb[3]}" height="${vb[4]}" `)
      } else {
        svgContent = svgContent.replace('<svg ', '<svg width="48" height="48" ')
      }
    }

    const left = frameLeft + (frameWidth - targetW) / 2
    const top = frameTop + (frameHeight - targetH) / 2

    fabric.loadSVGFromString(svgContent, (objects: any[], options: any) => {
      if (objects && objects.length > 0) {
        const svgGroup = fabric.util.groupSVGElements(objects, options)
        const svgW = svgGroup.width || 48
        const svgH = svgGroup.height || 48
        svgGroup.set({
          left, top,
          scaleX: targetW / svgW,
          scaleY: targetH / svgH,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          metadata: { category: 'elements', id, name, ...meta },
        })
        canvas.add(svgGroup)
        canvas.setActiveObject(svgGroup)
        canvas.requestRenderAll()
      }
      setAddingId(null)
    })
  }, [canvas])

  const handleAddElement = useCallback((element: ElementItem) => {
    if (addingId || !canvas) return
    setAddingId(element.id)
    addRecentElement(element.id)
    setRecentIds(getRecentElements())
    addSvgToCanvas(element.svg, element.id, element.name)
  }, [canvas, addingId, addSvgToCanvas])

  const handleAddLucideIcon = useCallback((icon: LucideIcon) => {
    if (addingId || !canvas) return
    setAddingId(icon.id)
    addSvgToCanvas(icon.svg, icon.id, icon.name)
  }, [canvas, addingId, addSvgToCanvas])

  const handleAddIconifyIcon = useCallback(async (icon: IconifyIcon) => {
    if (addingId || !canvas) return
    setAddingId(icon.id)
    let svg = icon.svg
    if (!svg) svg = await getIconSVG(icon.id)
    if (!svg) { setAddingId(null); return }
    addSvgToCanvas(svg, icon.id, icon.name, { prefix: icon.prefix })
  }, [canvas, addingId, addSvgToCanvas])

  // ─── Navigation ───────────────────────────────────────────

  const goToCategory = useCallback((catId: string) => {
    setActiveCategory(catId)
    setActiveSubcategory(null)
    setSearchValue('')
    if (catId === 'all') {
      setViewMode('browse')
    } else {
      setViewMode('category')
      // Set default prefix for iconify categories
      const iconifyCat = ICONIFY_CATEGORIES.find(c => c.id === catId)
      if (iconifyCat) {
        setActivePrefix(iconifyCat.collections[0].prefix)
      }
    }
    scrollRef.current?.scrollToTop()
  }, [])

  const goToSubcategory = useCallback((subId: string) => {
    setActiveSubcategory(subId)
    scrollRef.current?.scrollToTop()
  }, [])

  const goBack = useCallback(() => {
    if (activeSubcategory) {
      setActiveSubcategory(null)
    } else {
      setActiveCategory('all')
      setViewMode('browse')
    }
    scrollRef.current?.scrollToTop()
  }, [activeSubcategory])

  const isSearching = debouncedSearch.trim().length > 0

  // ─── Render helpers ───────────────────────────────────────

  const renderElementGrid = (elements: ElementItem[], cols = 4) => (
    <Grid $cols={cols}>
      {elements.map(el => (
        <ElementCard key={el.id} $loading={addingId === el.id} onClick={() => handleAddElement(el)} title={el.name}>
          <ElementPreview dangerouslySetInnerHTML={{ __html: el.svg }} />
        </ElementCard>
      ))}
    </Grid>
  )

  const renderIconifyGrid = (icons: IconifyIcon[]) => (
    <Grid $cols={4}>
      {icons.map(icon => (
        <ElementCard key={icon.id} $loading={addingId === icon.id} onClick={() => handleAddIconifyIcon(icon)} title={icon.name}>
          <ElementPreview dangerouslySetInnerHTML={{ __html: icon.svg }} />
        </ElementCard>
      ))}
    </Grid>
  )

  const renderUnifiedSearchGrid = () => (
    <Grid $cols={4}>
      {unifiedSearchResults.map((item: any) => {
        if (item.type === 'element') {
          const el: ElementItem = item.data
          return (
            <ElementCard key={el.id} $loading={addingId === el.id} onClick={() => handleAddElement(el)} title={el.name}>
              <ElementPreview dangerouslySetInnerHTML={{ __html: el.svg }} />
            </ElementCard>
          )
        }
        if (item.type === 'lucide') {
          const icon: LucideIcon = item.data
          return (
            <ElementCard key={`l-${icon.id}`} $loading={addingId === icon.id} onClick={() => handleAddLucideIcon(icon)} title={icon.name}>
              <ElementPreview dangerouslySetInnerHTML={{ __html: icon.svg }} />
            </ElementCard>
          )
        }
        if (item.type === 'iconify') {
          const icon: IconifyIcon = item.data
          return (
            <ElementCard key={icon.id} $loading={addingId === icon.id} onClick={() => handleAddIconifyIcon(icon)} title={icon.name}>
              <ElementPreview dangerouslySetInnerHTML={{ __html: icon.svg }} />
            </ElementCard>
          )
        }
        return null
      })}
    </Grid>
  )

  const renderSection = (title: string, elements: ElementItem[], seeAllAction?: () => void, limit?: number) => {
    const display = limit ? elements.slice(0, limit) : elements
    if (display.length === 0) return null
    return (
      <div key={title}>
        <SectionHeader>
          <SectionTitle>{title}</SectionTitle>
          {seeAllAction && elements.length > (limit || 0) && (
            <SeeAllBtn onClick={seeAllAction}>See all {elements.length}</SeeAllBtn>
          )}
        </SectionHeader>
        {renderElementGrid(display)}
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <PanelRoot>
      <SearchArea>
        <Input
          startEnhancer={() => <Icons.Search size={16} />}
          value={searchValue}
          onChange={e => setSearchValue((e.target as any).value)}
          placeholder="Search elements, icons, emoji..."
          clearOnEscape
          overrides={{
            Root: { style: { borderRadius: '8px' } },
            Input: { style: { fontSize: '13px' } },
          }}
        />
      </SearchArea>

      {/* Category Navigation */}
      {!isSearching && (
        <CategoryNav>
          <CategoryNavItem $active={activeCategory === 'all'} onClick={() => goToCategory('all')}>
            <NavIcon>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </NavIcon>
            All
          </CategoryNavItem>

          {ELEMENT_LIBRARY.map(cat => (
            <CategoryNavItem key={cat.id} $active={activeCategory === cat.id} onClick={() => goToCategory(cat.id)}>
              <NavIcon dangerouslySetInnerHTML={{ __html: cat.icon }} />
              {cat.name}
            </CategoryNavItem>
          ))}

          {ICONIFY_CATEGORIES.map(cat => (
            <CategoryNavItem key={cat.id} $active={activeCategory === cat.id} onClick={() => goToCategory(cat.id)}>
              <NavIcon dangerouslySetInnerHTML={{ __html: cat.icon }} />
              {cat.name}
            </CategoryNavItem>
          ))}
        </CategoryNav>
      )}

      <ContentArea>
        <Scrollbars ref={scrollRef} autoHide>

          {/* SEARCH — unified grid */}
          {isSearching && (
            <>
              {unifiedSearchResults.length > 0 ? (
                renderUnifiedSearchGrid()
              ) : searchLoading ? (
                <LoadingBox><Spinner /> Searching...</LoadingBox>
              ) : (
                <EmptyBox>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  No elements found for "{debouncedSearch}"
                </EmptyBox>
              )}
            </>
          )}

          {/* BROWSE ALL */}
          {!isSearching && viewMode === 'browse' && (
            <>
              {recentElements.length > 0 && renderSection('Recently Used', recentElements)}
              {renderSection('Popular', popularElements)}

              {ELEMENT_LIBRARY.map(cat => {
                const preview = cat.subcategories.flatMap(s => s.elements).slice(0, 8)
                return renderSection(cat.name, preview, () => goToCategory(cat.id), 8)
              })}

              {ICONIFY_CATEGORIES.map(cat => (
                <SectionHeader key={cat.id}>
                  <SectionTitle>{cat.name}</SectionTitle>
                  <SeeAllBtn onClick={() => goToCategory(cat.id)}>Browse</SeeAllBtn>
                </SectionHeader>
              ))}
            </>
          )}

          {/* ELEMENT LIBRARY CATEGORY */}
          {!isSearching && viewMode === 'category' && currentCategory && (
            <>
              <BackButton onClick={goBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </BackButton>

              {currentCategory.subcategories.length > 1 && (
                <SubcatChips>
                  <Chip $active={activeSubcategory === null} onClick={() => { setActiveSubcategory(null); scrollRef.current?.scrollToTop() }}>
                    All
                  </Chip>
                  {currentCategory.subcategories.map(sub => (
                    <Chip key={sub.id} $active={activeSubcategory === sub.id} onClick={() => goToSubcategory(sub.id)}>
                      {sub.name} ({sub.elements.length})
                    </Chip>
                  ))}
                </SubcatChips>
              )}

              {activeSubcategory ? (
                (() => {
                  const sub = currentCategory.subcategories.find(s => s.id === activeSubcategory)
                  return sub ? (
                    <div>
                      <SectionHeader><SectionTitle>{sub.name}</SectionTitle></SectionHeader>
                      {renderElementGrid(sub.elements)}
                    </div>
                  ) : null
                })()
              ) : (
                currentCategory.subcategories.map(sub => (
                  renderSection(
                    sub.name,
                    sub.elements,
                    sub.elements.length > 8 ? () => goToSubcategory(sub.id) : undefined,
                    sub.elements.length > 12 ? 8 : undefined
                  )
                ))
              )}
            </>
          )}

          {/* ICONIFY CATEGORY (Icons, Emoji, Logos, Solid, Flags) */}
          {!isSearching && viewMode === 'category' && currentIconifyCategory && (
            <>
              <BackButton onClick={goBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </BackButton>

              <SubcatChips>
                {currentIconifyCategory.collections.map(col => (
                  <Chip
                    key={col.prefix}
                    $active={activePrefix === col.prefix}
                    onClick={() => { setActivePrefix(col.prefix); scrollRef.current?.scrollToTop() }}
                  >
                    {col.name}
                  </Chip>
                ))}
              </SubcatChips>

              {loadingIconify ? (
                <LoadingBox><Spinner /> Loading...</LoadingBox>
              ) : iconifyIcons.length === 0 ? (
                <EmptyBox>No elements found</EmptyBox>
              ) : (
                renderIconifyGrid(iconifyIcons)
              )}
            </>
          )}

        </Scrollbars>
      </ContentArea>
    </PanelRoot>
  )
}

export default Panel
