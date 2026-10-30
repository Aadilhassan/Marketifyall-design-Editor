/** @jest-environment node */
import { panelListItems } from '@/constants/app-options'
import { activeTab, morePanels, panelTitle, PHONE_TABS } from './tabs'

describe('morePanels', () => {
  it('lists every rail panel that has no tab, plus Background', () => {
    expect(morePanels(panelListItems)).toEqual([
      'Draw',
      'Brand',
      'Stock Videos',
      'Illustrations',
      'Apps',
      'Layers',
      'Comments',
      'Version history',
      'Video',
      'Background',
    ])
  })
  it('every tab panel exists on the rail', () => {
    const names = panelListItems.map(p => p.name)
    PHONE_TABS.forEach(t => expect(names).toContain(t.panel))
  })
})

describe('activeTab', () => {
  it('highlights the tab of the open panel', () => {
    expect(activeTab('Stock Photos', true, null, panelListItems)).toBe('Photos')
  })
  it('highlights More for a panel that lives in the More sheet', () => {
    expect(activeTab('Layers', true, null, panelListItems)).toBe('More')
  })
  it('highlights nothing when closed or covered by a sub-menu', () => {
    expect(activeTab('Text', false, null, panelListItems)).toBeNull()
    expect(activeTab('Text', true, 'ElementEffects', panelListItems)).toBeNull()
  })
})

describe('panelTitle', () => {
  it('maps internal names to readable titles', () => {
    expect(panelTitle('ElementEffects')).toBe('Effects')
    expect(panelTitle('FontFamily')).toBe('Font')
    expect(panelTitle('Layers')).toBe('Layers')
    expect(panelTitle(null)).toBe('')
  })
})
