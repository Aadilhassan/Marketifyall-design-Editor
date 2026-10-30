import { useState } from 'react'
import { useEditorContext } from '@nkyo/scenify-sdk'
import { MoreHorizontal } from 'lucide-react'
import Icons from '@components/icons'
import useAppContext from '@/hooks/useAppContext'
import { panelListItems } from '@/constants/app-options'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import { color, font } from '@/theme/tokens'
import Toolbox from '../components/Toolbox'
import PanelItem from '../components/Panels/PanelItem'
import BottomSheet from './BottomSheet'
import { activeTab, morePanels, panelTitle, PHONE_TABS } from './tabs'

/**
 * Contextual toolbar on phones: a swipeable strip while something is selected.
 * It overlays the bottom edge of the stage (TimelineDock anchors it) instead of
 * taking a row, so selecting never resizes the stage / refits the page.
 */
export function PhoneSelectionStrip() {
  const { activeObject } = useEditorContext()
  if (!activeObject) return null
  return (
    <div
      className="mfa-phone-toolbar"
      role="toolbar"
      aria-label="Selection tools"
      style={{ position: 'absolute', left: 0, right: 0, bottom: '100%', zIndex: 7 }}
    >
      <ErrorBoundary fallback={null}>
        <Toolbox />
      </ErrorBoundary>
    </div>
  )
}

/**
 * Bottom of the phone editor, below the stage:
 *  - the tab bar (Design, Elements, Text, Uploads, Photos, More),
 *  - the panel bottom sheet (PanelItem renders as a sheet on phones),
 *  - the "More" sheet with every other rail panel.
 */
export default function PhoneChrome() {
  const { activePanel, setActivePanel, isPanelOpen, setIsPanelOpen, activeSubMenu, setActiveSubMenu } = useAppContext()
  const [moreOpen, setMoreOpen] = useState(false)
  const current = activeTab(activePanel, isPanelOpen, activeSubMenu, panelListItems)
  const extra = morePanels(panelListItems)

  const openPanel = (panel: string) => {
    setActiveSubMenu(null as any)
    // tapping the open tab again closes its sheet
    if (panel === activePanel && isPanelOpen && !activeSubMenu) {
      setIsPanelOpen(false)
      return
    }
    setActivePanel(panel as any)
    setIsPanelOpen(true)
  }

  return (
    <>
      <nav
        aria-label="Editor panels"
        style={{
          flex: 'none',
          display: 'flex',
          background: color.ink,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {PHONE_TABS.map(t => {
          const Icon = Icons[t.panel as keyof typeof Icons] as any
          return (
            <TabButton key={t.label} label={t.label} active={current === t.label} onClick={() => openPanel(t.panel)}>
              {Icon && <Icon size={20} />}
            </TabButton>
          )
        })}
        <TabButton label="More" active={current === 'More' || moreOpen} onClick={() => setMoreOpen(true)} hasPopup>
          <MoreHorizontal size={20} />
        </TabButton>
      </nav>

      <ErrorBoundary fallback={null}>
        <PanelItem />
      </ErrorBoundary>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More" variant="menu">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 4, padding: 12 }}>
          {extra.map(name => {
            const Icon = Icons[name as keyof typeof Icons] as any
            const on = activePanel === name && isPanelOpen && !activeSubMenu
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setMoreOpen(false)
                  openPanel(name)
                }}
                style={{
                  minHeight: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: `1px solid ${on ? color.ink : 'transparent'}`,
                  background: on ? color.accentSoft : 'transparent',
                  color: color.ink,
                  fontFamily: font.sans,
                  fontSize: 12.5,
                  fontWeight: 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                {Icon && <Icon size={22} />}
                {panelTitle(name)}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}

function TabButton({
  label,
  active,
  onClick,
  hasPopup,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  hasPopup?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={hasPopup ? undefined : active}
      aria-haspopup={hasPopup ? 'dialog' : undefined}
      style={{
        position: 'relative',
        flex: '1 1 0',
        minWidth: 0,
        height: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: active ? color.white : 'rgba(243, 239, 228, 0.62)',
        fontFamily: font.sans,
        fontSize: 10.5,
        fontWeight: 500,
        lineHeight: 1.1,
        cursor: 'pointer',
        boxShadow: active ? `inset 0 3px 0 ${color.accent}` : 'none',
      }}
    >
      {children}
      <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}
