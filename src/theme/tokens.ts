/**
 * Editor design tokens. Mirrors the editorial brand system in
 * src/styles/editorial.css (paper / ink / vermilion, Space Grotesk + Mono) so the
 * editor chrome and the marketing pages read as one product.
 */
export const color = {
  ink: '#181410',
  ink2: '#3a352b',
  muted: '#736d5c',
  faint: '#a39d8c',
  paper: '#f3efe4',
  paper2: '#ebe4d4',
  surface: '#fbf9f4',
  white: '#ffffff',
  line: 'rgba(24, 20, 16, 0.12)',
  line2: 'rgba(24, 20, 16, 0.24)',
  hover: 'rgba(24, 20, 16, 0.06)',
  accent: '#d8401c',
  accentHover: '#b8340f',
  accentSoft: '#fbe8e0',
  accentInk: '#ffffff',
  danger: '#c2261a',
  success: '#2f7d4f',
  canvasBg: '#e9e4d8',
}

export const font = {
  sans: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'Space Mono', ui-monospace, monospace",
  serif: "'Fraunces', Georgia, serif",
}

export const radius = {
  sm: '4px',
  md: '6px',
  lg: '10px',
}

export const shadow = {
  pop: '0 1px 0 rgba(24,20,16,0.04), 0 8px 24px rgba(24,20,16,0.12)',
  hard: '3px 3px 0 #181410',
}

/** Small uppercase mono label used for section headings across panels. */
export const overline = {
  fontFamily: font.mono,
  fontSize: '10px',
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  color: color.muted,
}
