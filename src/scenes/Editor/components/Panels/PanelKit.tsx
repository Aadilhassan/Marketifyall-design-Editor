/**
 * Shared building blocks for left-drawer panels so new panels (Brand Kit,
 * Layers, Apps, Text Effects…) share one visual language.
 */
import { ReactNode } from 'react'
import { styled } from 'baseui'
import { color, font, overline, radius, shadow } from '@/theme/tokens'

export const PanelRoot = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  fontFamily: font.sans,
  color: color.ink,
})

export const PanelBody = styled('div', {
  flex: 1,
  overflowY: 'auto',
  padding: '4px 18px 24px',
})

const HeaderWrap = styled('div', {
  padding: '18px 18px 12px',
  borderBottom: `1px solid ${color.line}`,
  marginBottom: '12px',
})

const HeaderTitle = styled('h2', {
  margin: 0,
  fontFamily: font.serif,
  fontWeight: 600,
  fontSize: '22px',
  lineHeight: 1.15,
  letterSpacing: '-0.01em',
  color: color.ink,
})

const HeaderSub = styled('p', {
  margin: '4px 0 0',
  fontSize: '12.5px',
  lineHeight: 1.45,
  color: color.muted,
})

export function PanelHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <HeaderWrap>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <HeaderTitle>{title}</HeaderTitle>
        {action}
      </div>
      {subtitle && <HeaderSub>{subtitle}</HeaderSub>}
    </HeaderWrap>
  )
}

export const SectionLabel = styled('div', {
  ...overline,
  margin: '18px 0 10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

export const KitButton = styled('button', ({ $variant = 'secondary', $block }: { $variant?: 'primary' | 'secondary' | 'ghost'; $block?: boolean }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  width: $block ? '100%' : 'auto',
  height: '36px',
  padding: '0 14px',
  borderRadius: radius.md,
  fontFamily: font.sans,
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $variant === 'primary' ? color.ink : $variant === 'ghost' ? 'transparent' : color.line2,
  background: $variant === 'primary' ? color.ink : $variant === 'ghost' ? 'transparent' : color.white,
  color: $variant === 'primary' ? color.paper : color.ink,
  ':hover': {
    background: $variant === 'primary' ? color.accent : $variant === 'ghost' ? color.hover : color.white,
    borderColor: $variant === 'primary' ? color.accent : color.ink,
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'default',
  },
}))

/** Selectable tile used in preset grids (effects, chart types…). */
export const Tile = styled('button', ({ $active }: { $active?: boolean }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 6px',
  background: color.white,
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $active ? color.ink : color.line,
  boxShadow: $active ? shadow.hard : 'none',
  fontFamily: font.sans,
  fontSize: '11.5px',
  fontWeight: 500,
  color: color.ink2,
  cursor: 'pointer',
  ':hover': {
    borderColor: color.ink,
  },
}))

export const TextField = styled('input', {
  width: '100%',
  height: '36px',
  boxSizing: 'border-box',
  padding: '0 10px',
  borderRadius: radius.md,
  border: `1px solid ${color.line2}`,
  background: color.white,
  fontFamily: font.sans,
  fontSize: '13px',
  color: color.ink,
  outline: 'none',
  ':focus': {
    borderColor: color.ink,
  },
})

export const EmptyNote = styled('div', {
  padding: '18px 14px',
  border: `1px dashed ${color.line2}`,
  borderRadius: radius.md,
  fontSize: '12.5px',
  lineHeight: 1.5,
  color: color.muted,
  textAlign: 'center',
})
