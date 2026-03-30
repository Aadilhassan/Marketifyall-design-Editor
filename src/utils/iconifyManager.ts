/**
 * Iconify Icons Manager
 * Provides access to 200,000+ icons from 150+ icon sets via the Iconify API
 * Includes colored icons (emoji, logos, flags) and line/filled icons
 */

const API_BASE = 'https://api.iconify.design'

export interface IconifyIcon {
  id: string       // "mdi:home"
  name: string     // "Home"
  prefix: string   // "mdi"
  svg: string
  isColored: boolean
}

export interface IconifyCollection {
  prefix: string
  name: string
  total: number
  category?: string
  isColored: boolean
}

// Popular collections to feature, categorized
export const FEATURED_COLLECTIONS: { label: string; prefixes: { prefix: string; name: string }[] }[] = [
  {
    label: 'Popular',
    prefixes: [
      { prefix: 'mdi', name: 'Material Design' },
      { prefix: 'ph', name: 'Phosphor' },
      { prefix: 'lucide', name: 'Lucide' },
      { prefix: 'tabler', name: 'Tabler' },
      { prefix: 'heroicons', name: 'Heroicons' },
      { prefix: 'ri', name: 'Remix Icon' },
    ],
  },
  {
    label: 'Colored',
    prefixes: [
      { prefix: 'logos', name: 'SVG Logos' },
      { prefix: 'vscode-icons', name: 'VS Code Icons' },
      { prefix: 'noto', name: 'Noto Emoji' },
      { prefix: 'twemoji', name: 'Twitter Emoji' },
      { prefix: 'emojione', name: 'Emoji One' },
      { prefix: 'flat-color-icons', name: 'Flat Color' },
      { prefix: 'fluent-emoji', name: 'Fluent Emoji' },
      { prefix: 'openmoji', name: 'OpenMoji' },
      { prefix: 'skill-icons', name: 'Skill Icons' },
      { prefix: 'flagpack', name: 'Flagpack' },
      { prefix: 'circle-flags', name: 'Circle Flags' },
    ],
  },
  {
    label: 'Solid & Filled',
    prefixes: [
      { prefix: 'ic', name: 'Google Material' },
      { prefix: 'ion', name: 'Ionicons' },
      { prefix: 'bi', name: 'Bootstrap' },
      { prefix: 'fa6-solid', name: 'Font Awesome' },
      { prefix: 'carbon', name: 'Carbon' },
    ],
  },
  {
    label: 'Brands & Logos',
    prefixes: [
      { prefix: 'simple-icons', name: 'Simple Icons' },
      { prefix: 'fa6-brands', name: 'FA Brands' },
      { prefix: 'devicon', name: 'Devicon' },
      { prefix: 'cib', name: 'CoreUI Brands' },
    ],
  },
]

// Colored icon set prefixes (icons have inherent colors, not just stroke)
const COLORED_PREFIXES = new Set([
  'logos', 'vscode-icons', 'noto', 'twemoji', 'emojione', 'flat-color-icons',
  'fluent-emoji', 'fluent-emoji-flat', 'fluent-emoji-high-contrast', 'openmoji',
  'skill-icons', 'flagpack', 'circle-flags', 'flag', 'devicon', 'catppuccin',
  'fxemoji', 'emojione-monotone', 'emojione-v1', 'noto-v1',
])

// ---------- Caches ----------
const svgCache = new Map<string, string>()
const searchCache = new Map<string, IconifyIcon[]>()
const collectionIconsCache = new Map<string, string[]>()

// ---------- API helpers ----------

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, API_BASE)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Iconify API error: ${res.status}`)
  return res.json()
}

// ---------- Public API ----------

/**
 * Search icons across all collections
 */
export async function searchIconify(query: string, limit = 64, prefix?: string): Promise<IconifyIcon[]> {
  if (!query.trim()) return []

  const cacheKey = `${query}|${limit}|${prefix || ''}`
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!

  const params: Record<string, string> = { query, limit: String(limit) }
  if (prefix) params.prefix = prefix

  const data = await apiFetch<{ icons: string[] }>('/search', params)

  const icons: IconifyIcon[] = (data.icons || []).map(fullId => {
    const [pre, ...rest] = fullId.split(':')
    const name = rest.join(':')
    return {
      id: fullId,
      name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      prefix: pre,
      svg: '', // lazy-loaded
      isColored: COLORED_PREFIXES.has(pre),
    }
  })

  searchCache.set(cacheKey, icons)
  return icons
}

/**
 * Get SVG for an icon (e.g. "mdi:home")
 */
export async function getIconSVG(iconId: string): Promise<string> {
  if (svgCache.has(iconId)) return svgCache.get(iconId)!

  const [prefix, name] = iconId.split(':')
  if (!prefix || !name) return ''

  const res = await fetch(`${API_BASE}/${prefix}/${name}.svg`)
  if (!res.ok) return ''
  const svg = await res.text()
  svgCache.set(iconId, svg)
  return svg
}

/**
 * Get list of icon names in a collection
 */
export async function getCollectionIcons(prefix: string, limit = 100): Promise<string[]> {
  if (collectionIconsCache.has(prefix)) {
    return collectionIconsCache.get(prefix)!.slice(0, limit)
  }

  const data = await apiFetch<{ uncategorized?: string[]; categories?: Record<string, string[]> }>(
    '/collection', { prefix }
  )

  let allNames: string[] = []
  if (data.categories) {
    for (const names of Object.values(data.categories)) {
      allNames.push(...names)
    }
  }
  if (data.uncategorized) {
    allNames.push(...data.uncategorized)
  }

  // deduplicate
  allNames = allNames.filter((name, idx) => allNames.indexOf(name) === idx)
  collectionIconsCache.set(prefix, allNames)
  return allNames.slice(0, limit)
}

/**
 * Load icons with their SVGs for a collection
 */
export async function getCollectionIconsWithSVG(prefix: string, limit = 60): Promise<IconifyIcon[]> {
  const names = await getCollectionIcons(prefix, limit)
  const isColored = COLORED_PREFIXES.has(prefix)

  // Batch-fetch SVGs in parallel (groups of 10)
  const icons: IconifyIcon[] = []
  const batches: string[][] = []
  for (let i = 0; i < names.length; i += 10) {
    batches.push(names.slice(i, i + 10))
  }

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(async name => {
        const id = `${prefix}:${name}`
        const svg = await getIconSVG(id)
        return { id, name, svg, prefix, isColored } as IconifyIcon
      })
    )
    icons.push(...results.filter(i => i.svg))
  }

  return icons
}

/**
 * Check if a prefix is a colored icon set
 */
export function isColoredSet(prefix: string): boolean {
  return COLORED_PREFIXES.has(prefix)
}
