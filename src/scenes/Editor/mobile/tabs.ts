/**
 * Phone bottom-tab model. Five fixed tabs map onto existing rail panels; every
 * other rail panel (plus page Background, which has no other phone entry
 * point) is listed in the "More" sheet.
 */
export interface PhoneTab {
  label: string
  panel: string
}

export const PHONE_TABS: PhoneTab[] = [
  { label: 'Design', panel: 'Templates' },
  { label: 'Elements', panel: 'Elements' },
  { label: 'Text', panel: 'Text' },
  { label: 'Uploads', panel: 'Uploads' },
  { label: 'Photos', panel: 'Stock Photos' },
]

const EXTRA_MORE_PANELS = ['Background']

export function morePanels(railPanels: { name: string }[]): string[] {
  const tabbed = new Set(PHONE_TABS.map(t => t.panel))
  const out = railPanels.map(p => p.name).filter(n => !tabbed.has(n))
  EXTRA_MORE_PANELS.forEach(n => {
    if (!out.includes(n)) out.push(n)
  })
  return out
}

/** Readable sheet titles for panels and contextual sub-menus. */
const TITLES: Record<string, string> = {
  Templates: 'Design',
  'Stock Photos': 'Photos',
  FontFamily: 'Font',
  TextEffects: 'Effects',
  ElementEffects: 'Effects',
  Animations: 'Animate',
  Adjust: 'Adjust',
  MagicEraser: 'Magic eraser',
  Position: 'Position',
  Color: 'Color',
  Crop: 'Crop',
  Background: 'Background',
}

export const panelTitle = (name: string | null | undefined): string => (name ? TITLES[name] || name : '')

/** Which bottom tab is highlighted: one of the five, 'More', or none. */
export function activeTab(
  activePanel: string,
  isPanelOpen: boolean,
  activeSubMenu: string | null,
  railPanels: { name: string }[]
): string | null {
  if (!isPanelOpen || activeSubMenu) return null
  const tab = PHONE_TABS.find(t => t.panel === activePanel)
  if (tab) return tab.label
  return morePanels(railPanels).includes(activePanel) ? 'More' : null
}
