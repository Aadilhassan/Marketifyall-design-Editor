import { createTheme, lightThemePrimitives } from 'baseui'
import { color, font } from './tokens'

// baseui reads primary* for buttons/inputs/toggles and accent* for highlights,
// so mapping the brand here restyles every baseui control in one place.
export const editorTheme = createTheme(
  {
    ...lightThemePrimitives,
    primaryFontFamily: font.sans,
    primary: color.ink,
    primary50: color.surface,
    primary100: color.paper,
    primary200: color.paper2,
    primary700: color.ink2,
    accent: color.accent,
    accent50: color.accentSoft,
    accent100: color.accentSoft,
    accent700: color.accentHover,
  },
  {
    colors: {
      buttonPrimaryFill: color.ink,
      buttonPrimaryHover: color.accent,
      buttonPrimaryActive: color.accentHover,
      buttonSecondaryFill: color.paper,
      buttonSecondaryHover: color.paper2,
      inputFill: color.white,
      inputBorder: color.line2,
      borderFocus: color.accent,
      tickFillSelected: color.accent,
      toggleFillChecked: color.accent,
      sliderTrackFillActive: color.accent,
      backgroundPrimary: color.white,
      backgroundSecondary: color.surface,
      contentPrimary: color.ink,
      contentSecondary: color.muted,
    },
    borders: {
      radius100: '4px',
      radius200: '6px',
      radius300: '8px',
      radius400: '10px',
      buttonBorderRadius: '6px',
      inputBorderRadius: '6px',
      popoverBorderRadius: '10px',
      surfaceBorderRadius: '10px',
    },
  },
)
