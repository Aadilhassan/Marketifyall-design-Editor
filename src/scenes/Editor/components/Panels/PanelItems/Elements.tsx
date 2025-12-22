import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { Scrollbars } from 'react-custom-scrollbars'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
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
import { addObjectToCanvas } from '@/utils/editorHelpers'

type TabType = 'icons' | 'shapes' | 'lines' | 'frames' | 'decor'

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

const ShapeItem = styled('div', ({ $loading }: { $loading?: boolean }) => ({
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
  { id: 'pentagon', name: 'Pentagon', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L22 9L18 21H6L2 9L12 2Z" fill="#8B5CF6"/></svg>' },
  { id: 'octagon', name: 'Octagon', svg: '<svg viewBox="0 0 24 24"><path d="M7 2h10l5 5v10l-5 5H7l-5-5V7l5-5z" fill="#F59E0B"/></svg>' },
  { id: 'cross', name: 'Cross', svg: '<svg viewBox="0 0 24 24"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" fill="#10B981"/></svg>' },
  { id: 'arrow-shape', name: 'Arrow Shape', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L22 12H16V22H8V12H2L12 2Z" fill="#EC4899"/></svg>' },
  { id: 'badge', name: 'Badge', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L14.5 7H20L15.5 11L17.5 17L12 14L6.5 17L8.5 11L4 7H9.5L12 2Z" fill="#F97316"/></svg>' },
  { id: 'cloud', name: 'Cloud', svg: '<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#60A5FA"/></svg>' },
  { id: 'speech-bubble', name: 'Speech Bubble', svg: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="#A78BFA"/></svg>' },
  { id: 'ribbon', name: 'Ribbon', svg: '<svg viewBox="0 0 24 24"><path d="M4 4h16v4l-2 2 2 2v8l-8-4-8 4v-8l2-2-2-2V4z" fill="#F43F5E"/></svg>' },
]

const BASIC_LINES = [
  { id: 'line', name: 'Line', svg: '<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'arrow-line', name: 'Arrow', svg: '<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="20" y2="12" stroke="#333" stroke-width="2"/><polyline points="16 8 20 12 16 16" stroke="#333" stroke-width="2" fill="none"/></svg>' },
  { id: 'double-arrow', name: 'Double Arrow', svg: '<svg viewBox="0 0 24 24"><line x1="6" y1="12" x2="18" y2="12" stroke="#333" stroke-width="2"/><polyline points="4 8 8 12 4 16" stroke="#333" stroke-width="2" fill="none"/><polyline points="20 8 16 12 20 16" stroke="#333" stroke-width="2" fill="none"/></svg>' },
  { id: 'dashed-line', name: 'Dashed', svg: '<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12" stroke="#333" stroke-width="2" stroke-dasharray="4 2"/></svg>' },
  { id: 'dotted-line', name: 'Dotted', svg: '<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12" stroke="#333" stroke-width="2" stroke-dasharray="2 4"/></svg>' },
  { id: 'curved-line', name: 'Curved', svg: '<svg viewBox="0 0 24 24"><path d="M2 20 Q12 2 22 20" stroke="#333" stroke-width="2" fill="none"/></svg>' },
  { id: 'zigzag', name: 'Zigzag', svg: '<svg viewBox="0 0 24 24"><polyline points="2 12 6 8 10 16 14 8 18 16 22 12" stroke="#333" stroke-width="2" fill="none"/></svg>' },
  { id: 'wave', name: 'Wave', svg: '<svg viewBox="0 0 24 24"><path d="M2 12 Q5 6 8 12 T14 12 T20 12 T22 12" stroke="#333" stroke-width="2" fill="none"/></svg>' },
]

const FRAMES = [
  { id: 'frame-square', name: 'Square Frame', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="0" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'frame-rounded', name: 'Rounded Frame', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'frame-circle', name: 'Circle Frame', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'frame-double', name: 'Double Frame', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="0" fill="none" stroke="#333" stroke-width="1"/><rect x="4" y="4" width="16" height="16" rx="0" fill="none" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'frame-ornate', name: 'Ornate Frame', svg: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#333" stroke-width="1"/><circle cx="3" cy="3" r="2" fill="#333"/><circle cx="21" cy="3" r="2" fill="#333"/><circle cx="3" cy="21" r="2" fill="#333"/><circle cx="21" cy="21" r="2" fill="#333"/></svg>' },
  { id: 'frame-polaroid', name: 'Polaroid', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="1" fill="#fff" stroke="#333" stroke-width="1"/><rect x="4" y="4" width="16" height="12" fill="#e5e5e5"/></svg>' },
]

const ARROWS = [
  { id: 'arrow-right', name: 'Arrow Right', svg: '<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'arrow-left', name: 'Arrow Left', svg: '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'arrow-up', name: 'Arrow Up', svg: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'arrow-down', name: 'Arrow Down', svg: '<svg viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'arrow-curved', name: 'Curved Arrow', svg: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M3 3v9h9" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'arrow-corner', name: 'Corner Arrow', svg: '<svg viewBox="0 0 24 24"><path d="M4 12h12v8M16 12l4-4-4-4" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
]

const DIVIDERS = [
  { id: 'divider-simple', name: 'Simple Line', svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="6" x2="48" y2="6" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'divider-double', name: 'Double Line', svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="4" x2="48" y2="4" stroke="#333" stroke-width="1"/><line x1="0" y1="8" x2="48" y2="8" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'divider-dotted', name: 'Dotted', svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="6" x2="48" y2="6" stroke="#333" stroke-width="2" stroke-dasharray="2 4"/></svg>' },
  { id: 'divider-dashed', name: 'Dashed', svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="6" x2="48" y2="6" stroke="#333" stroke-width="2" stroke-dasharray="6 3"/></svg>' },
  { id: 'divider-ornament', name: 'Ornament', svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="6" x2="18" y2="6" stroke="#333" stroke-width="1"/><circle cx="24" cy="6" r="3" fill="#333"/><line x1="30" y1="6" x2="48" y2="6" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'divider-wave', name: 'Wave', svg: '<svg viewBox="0 0 48 12"><path d="M0 6 Q6 2 12 6 T24 6 T36 6 T48 6" stroke="#333" stroke-width="2" fill="none"/></svg>' },
]

const BADGES = [
  { id: 'badge-circle', name: 'Circle Badge', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#5A3FFF"/><circle cx="12" cy="12" r="7" fill="none" stroke="#fff" stroke-width="1"/></svg>' },
  { id: 'badge-star', name: 'Star Badge', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFD700" stroke="#333" stroke-width="0.5"/></svg>' },
  { id: 'badge-ribbon', name: 'Ribbon Badge', svg: '<svg viewBox="0 0 24 24"><path d="M4 4h16v12l-8 4-8-4V4z" fill="#FF6B6B"/><path d="M4 4h16v3H4z" fill="#CC5555"/></svg>' },
  { id: 'badge-banner', name: 'Banner', svg: '<svg viewBox="0 0 24 24"><path d="M2 6h20v12H2z" fill="#5A3FFF"/><path d="M0 6l2 2v8l-2 2z" fill="#4A2FEF"/><path d="M24 6l-2 2v8l2 2z" fill="#4A2FEF"/></svg>' },
  { id: 'badge-shield', name: 'Shield', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" fill="#10B981"/></svg>' },
  { id: 'badge-seal', name: 'Seal', svg: '<svg viewBox="0 0 24 24"><path d="M12 2l2 4 4-1-1 4 4 2-4 2 1 4-4-1-2 4-2-4-4 1 1-4-4-2 4-2-1-4 4 1 2-4z" fill="#F59E0B"/></svg>' },
]

const DECORATIONS = [
  { id: 'sparkle', name: 'Sparkle', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="#FFD700"/></svg>' },
  { id: 'burst', name: 'Burst', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L14 8L20 6L16 12L22 14L16 16L18 22L12 18L6 22L8 16L2 14L8 12L4 6L10 8L12 2Z" fill="#FF6B6B"/></svg>' },
  { id: 'blob-1', name: 'Blob', svg: '<svg viewBox="0 0 24 24"><path d="M12 2C16 2 20 6 20 10C22 14 20 18 16 20C12 22 8 20 6 16C4 12 6 6 12 2Z" fill="#A78BFA"/></svg>' },
  { id: 'scribble', name: 'Scribble', svg: '<svg viewBox="0 0 24 24"><path d="M3 12C5 8 9 6 12 8C15 10 17 6 21 8" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'confetti', name: 'Confetti', svg: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="3" height="3" fill="#FF6B6B" transform="rotate(15 5.5 5.5)"/><rect x="14" y="6" width="3" height="3" fill="#4ADE80" transform="rotate(-20 15.5 7.5)"/><rect x="8" y="14" width="3" height="3" fill="#60A5FA" transform="rotate(30 9.5 15.5)"/><rect x="16" y="16" width="3" height="3" fill="#FBBF24" transform="rotate(-10 17.5 17.5)"/></svg>' },
  { id: 'dots-pattern', name: 'Dots', svg: '<svg viewBox="0 0 24 24"><circle cx="4" cy="4" r="2" fill="#333"/><circle cx="12" cy="4" r="2" fill="#333"/><circle cx="20" cy="4" r="2" fill="#333"/><circle cx="4" cy="12" r="2" fill="#333"/><circle cx="12" cy="12" r="2" fill="#333"/><circle cx="20" cy="12" r="2" fill="#333"/><circle cx="4" cy="20" r="2" fill="#333"/><circle cx="12" cy="20" r="2" fill="#333"/><circle cx="20" cy="20" r="2" fill="#333"/></svg>' },
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
  const [addingShape, setAddingShape] = useState<string | null>(null)

  const elements = useSelector(selectElements)
  const editor = useEditor()
  const { canvas } = useEditorContext() as any
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
    if (!canvas) {
      console.error('Canvas not available')
      return
    }
    setAddingIcon(icon.id)

    try {
      // Ensure SVG has xmlns for proper parsing
      let svgContent = icon.svg
      if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgContent = svgContent.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      }

      // @ts-ignore
      const fabric = window.fabric

      if (fabric && fabric.loadSVGFromString) {
        // Get frame dimensions for positioning
        const clipPath = canvas.clipPath
        const frameWidth = clipPath?.width || 900
        const frameHeight = clipPath?.height || 1200
        const frameLeft = clipPath?.left || 175.5
        const frameTop = clipPath?.top || -286.5

        // Icons should be displayed at 100x100
        const iconSize = 100
        const left = frameLeft + (frameWidth - iconSize) / 2
        const top = frameTop + (frameHeight - iconSize) / 2

        // Use loadSVGFromString for proper SVG rendering
        fabric.loadSVGFromString(svgContent, (objects: any[], options: any) => {
          if (objects && objects.length > 0) {
            const svgGroup = fabric.util.groupSVGElements(objects, options)

            // Calculate scale to fit 100x100
            const svgWidth = svgGroup.width || 24
            const svgHeight = svgGroup.height || 24
            const scaleX = iconSize / svgWidth
            const scaleY = iconSize / svgHeight

            svgGroup.set({
              left,
              top,
              scaleX,
              scaleY,
              selectable: true,
              hasControls: true,
              hasBorders: true,
              // @ts-ignore
              metadata: {
                category: 'icons',
                id: icon.id,
                name: icon.name,
              }
            })

            canvas.add(svgGroup)
            canvas.setActiveObject(svgGroup)
            canvas.requestRenderAll()

            console.log('✅ Icon added successfully via loadSVGFromString!')
          }
          setAddingIcon(null)
        })
      } else {
        console.error('FabricJS loadSVGFromString not available')
        setAddingIcon(null)
      }
    } catch (error) {
      console.error('Error adding icon:', error)
      setAddingIcon(null)
    }
  }, [canvas, addingIcon])

  // Handle adding shape to canvas
  const handleAddShape = useCallback((shape: { id: string; name: string; svg: string }) => {
    if (addingShape) return
    if (!editor) {
      console.error('Editor is not available')
      return
    }

    setAddingShape(shape.id)

    // Ensure SVG has proper namespace and dimensions for data URI
    let svgContent = shape.svg
    if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgContent = svgContent.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    }

    // Extract viewBox to determine appropriate canvas dimensions
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/)
    let defaultWidth = 200
    let defaultHeight = 200
    let aspectRatio = 1

    if (viewBoxMatch) {
      const [, viewBox] = viewBoxMatch
      const [, , viewBoxWidth, viewBoxHeight] = viewBox.split(/\s+/).map(Number)
      aspectRatio = viewBoxWidth / viewBoxHeight

      // Determine appropriate canvas dimensions based on element type and aspect ratio
      if (shape.id.startsWith('divider')) {
        // Dividers: wide horizontal elements (aspect ratio ~4:1, viewBox typically 48x12)
        defaultWidth = 400
        defaultHeight = Math.round(400 / aspectRatio) || 100
      } else if (shape.id.startsWith('line') || shape.id.startsWith('arrow') || shape.id === 'dashed-line' || shape.id === 'dotted-line' || shape.id === 'curved-line' || shape.id === 'zigzag' || shape.id === 'wave') {
        // Lines and Arrows: should be wider than tall (viewBox typically 24x24 but rendered wider)
        defaultWidth = 300
        defaultHeight = Math.round(300 / aspectRatio) || 50
      } else if (shape.id.startsWith('frame')) {
        // Frames: typically square but can be rectangular
        defaultWidth = 250
        defaultHeight = aspectRatio > 1.2 ? Math.round(250 / aspectRatio) : (aspectRatio < 0.8 ? Math.round(250 * aspectRatio) : 250)
      } else if (shape.id.startsWith('badge') || shape.id === 'sparkle' || shape.id === 'burst' || shape.id === 'blob-1' || shape.id === 'scribble' || shape.id === 'confetti' || shape.id === 'dots-pattern') {
        // Badges and Decorations: typically square-ish
        defaultWidth = 200
        defaultHeight = aspectRatio > 1.5 ? Math.round(200 / aspectRatio) : (aspectRatio < 0.67 ? Math.round(200 * aspectRatio) : 200)
      } else {
        // Default: maintain aspect ratio but reasonable size
        if (aspectRatio > 1.5) {
          // Wide elements
          defaultWidth = 300
          defaultHeight = Math.round(300 / aspectRatio) || 200
        } else if (aspectRatio < 0.67) {
          // Tall elements
          defaultHeight = 300
          defaultWidth = Math.round(300 * aspectRatio) || 200
        } else {
          // Square-ish elements
          defaultWidth = 200
          defaultHeight = 200
        }
      }

      // Ensure SVG has width and height attributes for proper rendering
      if (!svgContent.includes('width=') && !svgContent.includes('height=')) {
        svgContent = svgContent.replace(
          '<svg',
          `<svg width="${viewBoxWidth}" height="${viewBoxHeight}"`
        )
      }
    } else {
      // Default to 24x24 if no viewBox
      if (!svgContent.includes('width=') && !svgContent.includes('height=')) {
        svgContent = svgContent.replace('<svg', '<svg width="24" height="24"')
      }
    }

    const imageUrl = svgToBase64(svgContent)
    console.log('🔵 [DEBUG] Adding shape to canvas:', shape.name, 'Default dimensions:', defaultWidth, 'x', defaultHeight)

    // Preload the image to ensure it's valid before adding to canvas
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // Use natural dimensions if available, otherwise use calculated defaults
        let canvasWidth = img.naturalWidth || defaultWidth
        let canvasHeight = img.naturalHeight || defaultHeight

        // If natural dimensions are very small (like 24x24 for viewBox), use our calculated defaults
        if (canvasWidth < 50 || canvasHeight < 50) {
          canvasWidth = defaultWidth
          canvasHeight = defaultHeight
        } else {
          // Scale up small natural dimensions proportionally
          const scale = Math.max(defaultWidth / canvasWidth, defaultHeight / canvasHeight)
          if (scale > 1.5) {
            canvasWidth = Math.round(canvasWidth * scale)
            canvasHeight = Math.round(canvasHeight * scale)
          }
        }

        console.log('🔵 [DEBUG] Adding shape with dimensions:', canvasWidth, 'x', canvasHeight)

        // Use FabricJS directly
        // @ts-ignore
        const fabric = window.fabric

        if (fabric && canvas) {
          // Get frame dimensions for positioning
          const clipPath = canvas.clipPath
          const frameWidth = clipPath?.width || 900
          const frameHeight = clipPath?.height || 1200
          const frameLeft = clipPath?.left || 175.5
          const frameTop = clipPath?.top || -286.5

          const left = frameLeft + (frameWidth - canvasWidth) / 2
          const top = frameTop + (frameHeight - canvasHeight) / 2

          // Use loadSVGFromString for proper SVG rendering (handles strokes, paths, etc.)
          fabric.loadSVGFromString(svgContent, (objects: any[], options: any) => {
            if (objects && objects.length > 0) {
              // Group SVG elements together
              const svgGroup = fabric.util.groupSVGElements(objects, options)

              // Calculate scale to fit desired size
              const svgWidth = svgGroup.width || 24
              const svgHeight = svgGroup.height || 24
              const scaleX = canvasWidth / svgWidth
              const scaleY = canvasHeight / svgHeight

              // Determine category for metadata
              const category = shape.id.includes('frame') ? 'frames' :
                (shape.id.includes('line') || shape.id.includes('arrow') || shape.id.includes('divider') || shape.id.includes('wave') || shape.id.includes('zigzag') || shape.id.includes('curved')) ? 'lines' :
                  (shape.id.includes('badge') || shape.id.includes('sparkle') || shape.id.includes('burst') || shape.id.includes('blob') || shape.id.includes('scribble') || shape.id.includes('confetti') || shape.id.includes('dots') || shape.id.includes('bubble') || shape.id.includes('pattern')) ? 'decor' : 'shapes';

              svgGroup.set({
                left,
                top,
                scaleX,
                scaleY,
                selectable: true,
                hasControls: true,
                hasBorders: true,
                // @ts-ignore
                metadata: {
                  category: category,
                  id: shape.id,
                  name: shape.name,
                }
              })

              canvas.add(svgGroup)
              canvas.setActiveObject(svgGroup)
              canvas.requestRenderAll()

              console.log('✅ Shape added successfully via loadSVGFromString!')
            } else {
              // Fallback to Image if SVG parsing fails
              console.log('SVG parsing returned no objects, trying Image fallback...')
              const fabricImage = new fabric.Image(img, {
                left,
                top,
                scaleX: canvasWidth / (img.naturalWidth || 24),
                scaleY: canvasHeight / (img.naturalHeight || 24),
                opacity: 1,
                selectable: true,
                hasControls: true,
                hasBorders: true,
              })
              canvas.add(fabricImage)
              canvas.setActiveObject(fabricImage)
              canvas.requestRenderAll()
            }
            setAddingShape(null)
          })
          return // Exit early since loadSVGFromString is async
        } else {
          // Fallback to addObjectToCanvas
          console.log('FabricJS not available, using fallback...')
          addObjectToCanvas(editor, {
            type: 'StaticImage',
            width: canvasWidth,
            height: canvasHeight,
            metadata: {
              src: imageUrl,
              name: shape.name,
            },
          }, canvasWidth, canvas)
        }
      } catch (error) {
        console.error('🔴 Error adding shape to canvas:', error)
      } finally {
        setAddingShape(null)
      }
    }

    img.onerror = (error) => {
      console.error('🔴 Failed to load shape image:', shape.name, error)
      // Fallback: try adding directly with calculated default dimensions
      try {
        console.log('🔵 [DEBUG] Trying fallback with default dimensions:', defaultWidth, 'x', defaultHeight)
        const objectType = shape.id.startsWith('line') || shape.id.startsWith('arrow') || shape.id.startsWith('divider')
          ? 'StaticVector'
          : 'StaticImage'
        addObjectToCanvas(editor, {
          type: objectType,
          width: defaultWidth,
          height: defaultHeight,
          metadata: {
            src: imageUrl,
            name: shape.name,
          },
        }, defaultWidth, canvas)
        console.log('✅ Shape added with fallback method', { type: objectType })
      } catch (err) {
        console.error('🔴 Error adding shape (fallback):', err)
      } finally {
        setAddingShape(null)
      }
    }

    img.src = imageUrl
  }, [editor, canvas, addingShape])

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
          placeholder="Search 1000+ icons..."
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
        <TabButton $active={activeTab === 'frames'} onClick={() => setActiveTab('frames')}>
          Frames
        </TabButton>
        <TabButton $active={activeTab === 'decor'} onClick={() => setActiveTab('decor')}>
          Decor
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
                    $loading={addingShape === shape.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddShape(shape)
                    }}
                    title={shape.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: shape.svg }}
                      style={{ width: '28px', height: '28px', pointerEvents: 'none' }}
                    />
                  </ShapeItem>
                ))}
              </IconGrid>
            </>
          )}

          {activeTab === 'lines' && (
            <>
              <SectionHeader>Lines</SectionHeader>
              <IconGrid>
                {BASIC_LINES.map(line => (
                  <ShapeItem
                    key={line.id}
                    $loading={addingShape === line.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddShape(line)
                    }}
                    title={line.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: line.svg }}
                      style={{ width: '28px', height: '28px', pointerEvents: 'none' }}
                    />
                  </ShapeItem>
                ))}
              </IconGrid>

              <SectionHeader>Arrows</SectionHeader>
              <IconGrid>
                {ARROWS.map(arrow => (
                  <ShapeItem
                    key={arrow.id}
                    $loading={addingShape === arrow.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddShape(arrow)
                    }}
                    title={arrow.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: arrow.svg }}
                      style={{ width: '28px', height: '28px', pointerEvents: 'none' }}
                    />
                  </ShapeItem>
                ))}
              </IconGrid>

              <SectionHeader>Dividers</SectionHeader>
              <IconGrid>
                {DIVIDERS.map(divider => (
                  <ShapeItem
                    key={divider.id}
                    $loading={addingShape === divider.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddShape(divider)
                    }}
                    title={divider.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: divider.svg }}
                      style={{ width: '40px', height: '20px', pointerEvents: 'none' }}
                    />
                  </ShapeItem>
                ))}
              </IconGrid>
            </>
          )}

          {activeTab === 'frames' && (
            <>
              <SectionHeader>Photo Frames</SectionHeader>
              <IconGrid>
                {FRAMES.map(frame => (
                  <ShapeItem
                    key={frame.id}
                    $loading={addingShape === frame.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddShape(frame)
                    }}
                    title={frame.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: frame.svg }}
                      style={{ width: '32px', height: '32px', pointerEvents: 'none' }}
                    />
                  </ShapeItem>
                ))}
              </IconGrid>
            </>
          )}

          {activeTab === 'decor' && (
            <>
              <SectionHeader>Badges & Labels</SectionHeader>
              <IconGrid>
                {BADGES.map(badge => (
                  <ShapeItem
                    key={badge.id}
                    $loading={addingShape === badge.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddShape(badge)
                    }}
                    title={badge.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: badge.svg }}
                      style={{ width: '32px', height: '32px', pointerEvents: 'none' }}
                    />
                  </ShapeItem>
                ))}
              </IconGrid>

              <SectionHeader>Decorations</SectionHeader>
              <IconGrid>
                {DECORATIONS.map(decor => (
                  <ShapeItem
                    key={decor.id}
                    $loading={addingShape === decor.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddShape(decor)
                    }}
                    title={decor.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: decor.svg }}
                      style={{ width: '32px', height: '32px', pointerEvents: 'none' }}
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
