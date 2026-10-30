import { toPdfImage } from './pdfExport'
/**
 * Helpers for the Download/Export dialog: page-range parsing, per-format
 * capabilities, file naming, saved preferences and a multi-page PDF builder.
 */

/** `pages` is empty and `error` is set when `ok` is false. */
export interface PageRangeResult {
  ok: boolean
  pages: number[]
  error?: string
}

const fail = (error: string): PageRangeResult => ({ ok: false, pages: [], error })

const EXAMPLE = 'e.g. 1-3, 5'

/**
 * Parse a human page list like "1-3, 5" into sorted, de-duplicated 0-based
 * page indices. Page numbers in the input are 1-based. Reversed ranges ("3-1")
 * are accepted and normalised.
 */
export function parsePageRange(input: string, pageCount: number): PageRangeResult {
  const text = (input || '').trim()
  if (!text) return fail(`Enter page numbers, ${EXAMPLE}`)
  const picked = new Set<number>()
  const tokens = text.split(/[,;]/).map(t => t.trim())
  for (const token of tokens) {
    if (!token) continue
    const m = token.match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/)
    if (!m) return fail(`"${token}" isn't a page or range (${EXAMPLE})`)
    let from = parseInt(m[1], 10)
    let to = m[2] !== undefined ? parseInt(m[2], 10) : from
    if (from > to) [from, to] = [to, from]
    if (from < 1) return fail('Page numbers start at 1')
    if (to > pageCount) {
      return fail(`Page ${to} doesn't exist (this design has ${pageCount} page${pageCount === 1 ? '' : 's'})`)
    }
    for (let p = from; p <= to; p++) picked.add(p - 1)
  }
  if (!picked.size) return fail(`Enter page numbers, ${EXAMPLE}`)
  return { ok: true, pages: Array.from(picked).sort((a, b) => a - b) }
}

/** Formats that can render more than one page (PDF merges, rasters download one file each). */
export function supportsMultiPage(format: string): boolean {
  return format === 'png' || format === 'jpg' || format === 'webp' || format === 'pdf'
}

/** Formats whose output keeps an alpha channel. */
export function supportsTransparency(format: string): boolean {
  return format === 'png' || format === 'webp'
}

/** `<design>-p<N>.<ext>` for page index `index` (0-based). */
export function pageFileName(designName: string, index: number, ext: string): string {
  return `${designName || 'design'}-p${index + 1}.${ext}`
}

export const EXPORT_PREFS_KEY = 'mfa-export-prefs'

export interface ExportPrefs {
  format?: string
  size?: string
  transparent?: boolean
}

const SIZES = ['1x', '2x', '3x', '4x']

/** Read saved export preferences, dropping anything malformed. */
export function readExportPrefs(storage: Pick<Storage, 'getItem'> | null = safeStorage()): ExportPrefs {
  if (!storage) return {}
  let raw: unknown
  try {
    raw = JSON.parse(storage.getItem(EXPORT_PREFS_KEY) || 'null')
  } catch (parseErr) {
    void parseErr // corrupt prefs are treated as "no prefs"
    return {}
  }
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  const out: ExportPrefs = {}
  if (typeof r.format === 'string') out.format = r.format
  if (typeof r.size === 'string' && SIZES.includes(r.size)) out.size = r.size
  if (typeof r.transparent === 'boolean') out.transparent = r.transparent
  return out
}

/** Persist export preferences; returns false when storage is unavailable/full. */
export function writeExportPrefs(
  prefs: ExportPrefs,
  storage: Pick<Storage, 'setItem'> | null = safeStorage()
): boolean {
  if (!storage) return false
  try {
    storage.setItem(EXPORT_PREFS_KEY, JSON.stringify(prefs))
    return true
  } catch (writeErr) {
    void writeErr // quota / private mode: preferences are a nicety, not required
    return false
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch (accessErr) {
    void accessErr // access can throw when storage is disabled
    return null
  }
}

/**
 * Incrementally builds a PDF with one page per rendered design page, each page
 * sized to that page's own pixel dimensions (pages can differ after Magic
 * Resize). Pages are added as they render so only one image is held at a time.
 */
export async function createPagedPdf() {
  const { jsPDF } = await import('jspdf')
  let pdf: any = null
  const orient = (w: number, h: number) => (w >= h ? 'landscape' : 'portrait')
  return {
    async addPage(dataUrl: string, widthPx: number, heightPx: number) {
      const img = await toPdfImage(dataUrl)
      if (!pdf) {
        pdf = new jsPDF({ orientation: orient(widthPx, heightPx), unit: 'px', format: [widthPx, heightPx] })
      } else {
        pdf.addPage([widthPx, heightPx], orient(widthPx, heightPx))
      }
      pdf.addImage(img.data, img.format, 0, 0, widthPx, heightPx)
    },
    save(filename: string) {
      if (!pdf) throw new Error('No pages were rendered')
      pdf.save(filename)
    },
  }
}
