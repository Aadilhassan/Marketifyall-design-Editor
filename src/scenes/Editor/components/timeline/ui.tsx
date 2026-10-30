/**
 * Timeline look: the editor's paper / ink / vermilion tokens, Space Grotesk
 * for UI, Space Mono for time, Fraunces for the inspector title, hard offset
 * shadows on selection. Static styles live in styled() objects; anything that
 * changes per clip (position, width, colour) goes through inline `style` with
 * longhand properties only — never a shorthand next to its longhands.
 */
import React from 'react'
import { styled } from 'baseui'
import { color, font, radius } from '@/theme/tokens'
import type { ClipKind } from './actions'

export const TL = {
  headerW: 168,
  rulerH: 28,
  barH: 48,
  inspectorW: 260,
  row: { overlay: 36, video: 64, audio: 48, loose: 28, placeholder: 32 },
}

export const clipColors: Record<ClipKind | 'text', { bg: string; fg: string; edge: string }> = {
  video: { bg: '#2b2620', fg: color.paper, edge: color.ink },
  image: { bg: '#3a352b', fg: color.paper, edge: color.ink },
  audio: { bg: '#e2ece4', fg: '#1d4630', edge: '#2f7d4f' },
  text: { bg: color.accentSoft, fg: color.ink, edge: color.accent },
  element: { bg: color.paper2, fg: color.ink, edge: color.ink2 },
}

export const focusRing = {
  ':focus-visible': {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: color.accent,
    outlineOffset: '1px',
  },
}

export const IconBtn = styled('button', ({ $active, $size }: { $active?: boolean; $size?: number }) => ({
  width: `${$size || 32}px`,
  height: `${$size || 32}px`,
  flex: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $active ? color.ink : 'transparent',
  borderRadius: radius.md,
  backgroundColor: $active ? color.paper : 'transparent',
  color: $active ? color.ink : color.ink2,
  cursor: 'pointer',
  padding: 0,
  ':hover': { backgroundColor: color.hover, color: color.ink },
  ':disabled': { opacity: 0.4, cursor: 'default' },
  ...focusRing,
}))

export const TextBtn = styled('button', ({ $primary }: { $primary?: boolean }) => ({
  height: '30px',
  flex: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: '10px',
  paddingRight: '10px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $primary ? color.ink : color.line2,
  borderRadius: radius.md,
  backgroundColor: $primary ? color.ink : color.white,
  color: $primary ? color.paper : color.ink,
  fontFamily: font.sans,
  fontSize: '12px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  ':hover': { borderColor: color.ink, backgroundColor: $primary ? color.ink2 : color.paper },
  ':disabled': { opacity: 0.45, cursor: 'default' },
  ...focusRing,
}))

export const Divider = () => <span aria-hidden style={{ width: 1, height: 22, backgroundColor: color.line, flex: 'none' }} />

export const Overline = styled('div', {
  fontFamily: font.mono,
  fontSize: '10px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: color.muted,
})

/** Popover / menu surface with the hard offset shadow. */
export const Surface = styled('div', {
  position: 'fixed',
  zIndex: 1000,
  backgroundColor: color.white,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.ink,
  borderRadius: radius.md,
  boxShadow: '3px 3px 0 #181410',
  fontFamily: font.sans,
  fontSize: '13px',
  color: color.ink,
  paddingTop: '4px',
  paddingBottom: '4px',
  minWidth: '200px',
})

export const MenuItem = styled('button', {
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  borderWidth: 0,
  backgroundColor: 'transparent',
  color: color.ink,
  textAlign: 'left',
  fontFamily: font.sans,
  fontSize: '13px',
  paddingTop: '7px',
  paddingBottom: '7px',
  paddingLeft: '12px',
  paddingRight: '12px',
  cursor: 'pointer',
  ':hover': { backgroundColor: color.paper },
  ':focus': { backgroundColor: color.paper, outlineStyle: 'none' },
  ':disabled': { opacity: 0.4, cursor: 'default' },
})

export const Kbd = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontFamily: font.mono, fontSize: 10, color: color.muted }}>{children}</span>
)

// ---------------------------------------------------------------------------
// Icons (24-unit viewBox, currentColor)
// ---------------------------------------------------------------------------

const Svg = ({ children, size = 16, fill }: { children: React.ReactNode; size?: number; fill?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable="false"
  >
    {children}
  </svg>
)

export const Icon = {
  Play: (p: { size?: number }) => (
    <Svg {...p} fill>
      <path d="M7 4.5v15l12.5-7.5z" />
    </Svg>
  ),
  Pause: (p: { size?: number }) => (
    <Svg {...p} fill>
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </Svg>
  ),
  StepBack: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M18 6l-8 6 8 6zM6 6v12" />
    </Svg>
  ),
  StepFwd: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M6 6l8 6-8 6zM18 6v12" />
    </Svg>
  ),
  Split: (p: { size?: number }) => (
    <Svg {...p}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />
    </Svg>
  ),
  Trash: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Svg>
  ),
  Undo: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
    </Svg>
  ),
  Redo: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 000 11H13" />
    </Svg>
  ),
  Magnet: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M6 3v8a6 6 0 0012 0V3M6 7h4M14 7h4M10 3v8a2 2 0 004 0V3" />
    </Svg>
  ),
  ZoomIn: (p: { size?: number }) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
    </Svg>
  ),
  ZoomOut: (p: { size?: number }) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6" />
    </Svg>
  ),
  Fit: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
    </Svg>
  ),
  Chevron: (p: { size?: number; dir?: 'up' | 'down' | 'right' }) => (
    <Svg size={p.size}>
      <path d={p.dir === 'up' ? 'M6 15l6-6 6 6' : p.dir === 'right' ? 'M9 6l6 6-6 6' : 'M6 9l6 6 6-6'} />
    </Svg>
  ),
  Eye: (p: { size?: number; off?: boolean }) => (
    <Svg size={p.size}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {p.off && <path d="M3 3l18 18" />}
    </Svg>
  ),
  Speaker: (p: { size?: number; off?: boolean }) => (
    <Svg size={p.size}>
      <path d="M11 5L6 9H3v6h3l5 4z" />
      {p.off ? <path d="M22 9l-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />}
    </Svg>
  ),
  Lock: (p: { size?: number; open?: boolean }) => (
    <Svg size={p.size}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d={p.open ? 'M8 11V7a4 4 0 017.5-2' : 'M8 11V7a4 4 0 018 0v4'} />
    </Svg>
  ),
  Text: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M5 6V4h14v2M12 4v16M9 20h6" />
    </Svg>
  ),
  Image: (p: { size?: number }) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 17l-5-5-9 8" />
    </Svg>
  ),
  Shape: (p: { size?: number }) => (
    <Svg {...p}>
      <circle cx="8" cy="9" r="5" />
      <rect x="11" y="11" width="10" height="10" rx="1" />
    </Svg>
  ),
  Film: (p: { size?: number }) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </Svg>
  ),
  Music: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  ),
  Plus: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  Close: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  Marker: (p: { size?: number }) => (
    <Svg {...p}>
      <path d="M6 3h12v12l-6 6-6-6z" />
    </Svg>
  ),
}

export function kindIcon(kind: ClipKind | 'text' | 'shape', size = 13) {
  switch (kind) {
    case 'video':
      return <Icon.Film size={size} />
    case 'audio':
      return <Icon.Music size={size} />
    case 'image':
      return <Icon.Image size={size} />
    case 'text':
      return <Icon.Text size={size} />
    default:
      return <Icon.Shape size={size} />
  }
}
