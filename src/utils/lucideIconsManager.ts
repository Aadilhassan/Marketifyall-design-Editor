import React from 'react'
import ReactDOMServer from 'react-dom/server'
import * as LucideIcons from 'lucide-react'

/**
 * Lucide Icons Manager
 * Manages icon data and converts to SVG format
 */

export interface LucideIcon {
  name: string
  id: string
  category: string
  svg: string
  viewBox?: string
}

export interface IconCategory {
  name: string
  icons: LucideIcon[]
}

// Helper to convert kebab-case to PascalCase
const kebabToPascal = (str: string) => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

// Helper to convert PascalCase to kebab-case
const pascalToKebab = (str: string) => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

// Categories configuration
const ICONS_BY_CATEGORY: Record<string, string[]> = {
  shapes: [
    'square', 'circle', 'triangle', 'hexagon', 'pentagon', 'octagon',
    'star', 'heart', 'cloud', 'diamond', 'cylinder', 'cone', 'pyramid'
  ],
  communication: [
    'message-circle', 'message-square', 'mail', 'phone', 'send', 'reply',
    'reply-all', 'inbox', 'bell', 'megaphone', 'at-sign', 'hash', 'share'
  ],
  social: [
    'thumbs-up', 'thumbs-down', 'share-2', 'flag', 'bookmark', 'heart',
    'star', 'user', 'users', 'user-plus', 'user-check', 'user-x',
    'instagram', 'twitter', 'facebook', 'linkedin', 'youtube', 'github', 'twitch'
  ],
  arrows: [
    'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
    'arrow-up-right', 'arrow-down-right', 'arrow-down-left', 'arrow-up-left',
    'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right',
    'chevrons-up', 'chevrons-down', 'chevrons-left', 'chevrons-right',
    'refresh-cw', 'refresh-ccw', 'rotate-cw', 'rotate-ccw',
    'corner-up-left', 'corner-up-right', 'corner-down-left', 'corner-down-right',
    'move'
  ],
  media: [
    'image', 'video', 'music', 'volume-2', 'volume-x', 'play', 'pause',
    'stop-circle', 'mic', 'mic-off', 'camera', 'film', 'headphones',
    'maximize', 'minimize', 'cast', 'airplay', 'aperture', 'disc'
  ],
  navigation: [
    'home', 'menu', 'search', 'settings', 'map', 'map-pin', 'navigation',
    'compass', 'globe', 'anchor', 'more-horizontal', 'more-vertical',
    'arrow-left-circle', 'arrow-right-circle'
  ],
  business: [
    'briefcase', 'credit-card', 'dollar-sign', 'euro', 'pound-sterling',
    'pie-chart', 'bar-chart-2', 'trending-up', 'trending-down',
    'activity', 'archive', 'calendar', 'clipboard', 'file-text',
    'percent', 'target', 'award'
  ],
  office: [
    'folder', 'folder-plus', 'folder-minus', 'file', 'file-plus', 'file-minus',
    'save', 'printer', 'trash-2', 'scissors', 'paperclip', 'database',
    'hard-drive', 'server', 'archive', 'clipboard-list', 'copy'
  ],
  tech: [
    'cpu', 'laptop', 'monitor', 'smartphone', 'tablet', 'watch',
    'mouse', 'keyboard', 'wifi', 'bluetooth', 'battery', 'battery-charging',
    'power', 'plug', 'radio', 'tv'
  ],
  weather: [
    'sun', 'moon', 'cloud', 'cloud-rain', 'cloud-snow', 'cloud-lightning',
    'wind', 'thermometer', 'umbrella', 'sunrise', 'sunset'
  ],
  security: [
    'lock', 'unlock', 'key', 'shield', 'shield-check', 'shield-alert',
    'eye', 'eye-off', 'fingerprint', 'file-lock'
  ],
  editor: [
    'type', 'bold', 'italic', 'underline', 'strikethrough', 'align-left',
    'align-center', 'align-right', 'align-justify', 'list', 'list-ordered',
    'check', 'check-square', 'edit-2', 'edit-3'
  ]
}

// Cache for generated strings
const svgCache: Record<string, string> = {}

/**
 * Get SVG content for a specific icon
 * @param iconName - Icon name (e.g., 'heart', 'star', 'arrow-right')
 * @returns SVG string
 */
export const getLucideSVG = async (iconName: string): Promise<string> => {
  if (svgCache[iconName]) {
    return svgCache[iconName]
  }

  const pascalName = kebabToPascal(iconName)
  const IconComponent = (LucideIcons as any)[pascalName]

  if (!IconComponent) {
    console.warn(`Icon not found: ${iconName} (${pascalName})`)
    // Use Circle as fallback
    const Fallback = (LucideIcons as any).Circle || (LucideIcons as any).HelpCircle
    if (Fallback) {
      const fallbackSvg = ReactDOMServer.renderToStaticMarkup(React.createElement(Fallback, { size: 24 }))
      return fallbackSvg
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>'
  }

  try {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(IconComponent, { size: 24 }))
    svgCache[iconName] = svg
    return svg
  } catch (err) {
    console.error(`Error rendering icon ${iconName}:`, err)
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>'

  }
}

/**
 * Get multiple icons by category
 * @param categoryName - Category name (e.g., 'shapes', 'communication')
 * @returns Array of LucideIcon objects
 */
export const getIconsByCategory = async (categoryName: string): Promise<LucideIcon[]> => {
  try {
    const iconNames = ICONS_BY_CATEGORY[categoryName.toLowerCase()] || []
    const icons: LucideIcon[] = []

    for (const iconName of iconNames) {
      const svg = await getLucideSVG(iconName)
      // Check if user has specific brand icons that might fail or need fallback
      // The getLucideSVG handles fallback now.

      icons.push({
        name: iconName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        id: iconName,
        category: categoryName,
        svg: svg,
        viewBox: '0 0 24 24',
      })
    }

    return icons
  } catch (error) {
    console.error(`Error getting category ${categoryName}:`, error)
    return []
  }
}

/**
 * Convert Lucide SVG to image URL for canvas
 * @param svg - SVG string
 * @returns Data URL
 */
export const svgToDataUrl = (svg: string): string => {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  return URL.createObjectURL(blob)
}

/**
 * Convert Lucide SVG to Base64
 * @param svg - SVG string
 * @returns Base64 encoded string
 */
export const svgToBase64 = (svg: string): string => {
  const encoded = encodeURIComponent(svg)
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

/**
 * Get all available categories
 */
export const getAllCategories = (): string[] => {
  return Object.keys(ICONS_BY_CATEGORY)
}

/**
 * Create a canvas-compatible image from SVG
 * @param svg - SVG string
 * @param width - Image width (default: 100)
 * @param height - Image height (default: 100)
 * @returns Promise<HTMLImageElement>
 */
export const createImageFromSVG = (svg: string, width: number = 100, height: number = 100): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a data URL from SVG
      const dataUrl = svgToBase64(svg)

      // Create an image to verify it loads
      const img = new Image()
      img.onload = () => {
        resolve(dataUrl)
      }
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      img.src = dataUrl
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Search icons by name
 * @param query - Search query
 * @param category - Optional category filter
 * @returns Array of matching icons
 */
export const searchIcons = async (query: string, category?: string): Promise<LucideIcon[]> => {
  const normalizedQuery = query.toLowerCase()
  const results: LucideIcon[] = []

  // If searching globally, we can just search through ALL Lucide icons if we want,
  // but let's restrict to our categorized lists first to keep it curated, 
  // OR we can search the entire Lucide library exports.

  // Let's search through our configured categories first
  const searchingCategories = category ? [category] : Object.keys(ICONS_BY_CATEGORY)

  const foundIds = new Set<string>()

  for (const cat of searchingCategories) {
    const iconNames = ICONS_BY_CATEGORY[cat]
    for (const name of iconNames) {
      if ((name.toLowerCase().includes(normalizedQuery) ||
        name.replace(/-/g, ' ').includes(normalizedQuery)) && !foundIds.has(name)) {

        foundIds.add(name)
        const svg = await getLucideSVG(name)
        results.push({
          name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          id: name,
          category: cat,
          svg: svg,
          viewBox: '0 0 24 24',
        })
      }
    }
  }

  // If few results, maybe search all Lucide exports?
  // Let's add that feature for better user experience
  if (results.length < 5 && !category) {
    const allKeys = Object.keys(LucideIcons)
    for (const key of allKeys) {
      // Skip non-icon exports
      if (key === 'createLucideIcon' || key === 'default') continue

      const kebabName = pascalToKebab(key)
      if (!foundIds.has(kebabName) && kebabName.includes(normalizedQuery)) {
        foundIds.add(kebabName)
        const svg = await getLucideSVG(kebabName)
        results.push({
          name: kebabName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          id: kebabName,
          category: 'all',
          svg: svg,
          viewBox: '0 0 24 24',
        })
        if (results.length > 50) break; // Limit total results
      }
    }
  }

  return results
}

/**
 * Get icon as SVG string with custom color
 * @param iconName - Icon name
 * @param color - Hex color (e.g., '#FF0000')
 * @returns SVG string with color applied
 */
export const getColoredSVG = async (iconName: string, color: string = '#000000'): Promise<string> => {
  let svg = await getLucideSVG(iconName)
  // Replace stroke and fill with custom color
  // Note: Lucide icons usually use 'currentColor' for stroke/fill.
  // We can replacing 'currentColor' with our color.
  svg = svg.replace(/currentColor/g, color)

  // Also try to replace explicit stroke/fill if they exist (rare in lucide-react output for simple icons)
  // But our rendered strings might be different. 
  // ReactDOMServer rendering usually preserves 'currentColor' or default.
  // We can allow simple regex replacement.
  if (!svg.includes(color)) {
    if (svg.includes('stroke="')) {
      svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`)
    }
    if (svg.includes('fill="')) {
      // CAREFUL: Lucide icons are often fill="none". We don't want to fill the box.
      // Usually we only want to change stroke.
    }
  }

  return svg
}
