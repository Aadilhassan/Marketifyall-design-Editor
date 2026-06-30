/**
 * Google Fonts catalog (family + category), bundled so the font picker works
 * with zero configuration — no Google Fonts Developer API key. Fonts are fetched
 * on demand via fontLoader (the public CSS endpoint).
 *
 * The full list lives in the auto-generated googleFontsData.ts (≈1,900 families,
 * sorted by popularity); this module re-exports it under GOOGLE_FONTS.
 */
export interface StaticFont {
  family: string
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace'
}

export { GOOGLE_FONTS_FULL as GOOGLE_FONTS } from './googleFontsData'
