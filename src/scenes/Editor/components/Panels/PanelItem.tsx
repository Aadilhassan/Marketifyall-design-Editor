import { SubMenuType } from '@/constants/editor'
import useAppContext from '@/hooks/useAppContext'
import { useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { color, shadow } from '@/theme/tokens'
import { useCallback, useEffect, useRef } from 'react'
import useBreakpoint from '@/hooks/useBreakpoint'
import BottomSheet from '@/scenes/Editor/mobile/BottomSheet'
import { panelTitle } from '@/scenes/Editor/mobile/tabs'
import PanelItems from './PanelItems'

const RAIL_WIDTH = '76px'

// Desktop: a column next to the rail that pushes the stage. Tablet ($overlay):
// floats over the stage instead, so opening it never squeezes/refits the page.
const Container = styled('div', ({ $overlay }: { $overlay?: boolean }) =>
  $overlay
    ? {
        background: color.surface,
        width: '340px',
        maxWidth: `calc(100vw - ${RAIL_WIDTH} - 48px)`,
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: RAIL_WIDTH,
        zIndex: 30,
        borderRight: `1px solid ${color.line2}`,
        boxShadow: shadow.pop,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }
    : {
        background: color.surface,
        width: '340px',
        flex: 'none',
        borderRight: `1px solid ${color.line}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }
)

function PanelsList() {
  const { activePanel, activeSubMenu, setActiveSubMenu, isPanelOpen, setIsPanelOpen } = useAppContext()
  const { activeObject } = useEditorContext()

  // Only reset the contextual sub-menu (Adjust / Animate / Color) when a
  // DIFFERENT object becomes selected. Previously this fired on every
  // activeObject change — including the transient null + same-object
  // re-selection Scenify emits whenever you click/drag/resize the selected
  // object — which slammed the panel back to the default and made those
  // contextual panels effectively unusable.
  const prevObjId = useRef<string | null>(null)
  useEffect(() => {
    const id = (activeObject as any)?.id ?? (activeObject as any)?.metadata?.id ?? null
    if (id === prevObjId.current) return
    if (activeObject) {
      setActiveSubMenu(null)
      prevObjId.current = id
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeObject])


  useEffect(() => {
    if (activeSubMenu) setIsPanelOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubMenu])

  const bp = useBreakpoint()
  // Dismissing also drops the sub-menu, so tapping the same toolbar button
  // (Effects, Position…) later re-opens it.
  const close = useCallback(() => {
    setIsPanelOpen(false)
    setActiveSubMenu(null as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tablet overlay: a tap on the stage closes it. Only the stage counts as
  // "outside" — popovers/modals opened from the panel are portalled to <body>.
  useEffect(() => {
    if (bp !== 'tablet' || !isPanelOpen) return
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('.canvas-container')) close()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [bp, isPanelOpen, close])

  const showSub = (activeObject && activeSubMenu) || (!activeObject && activeSubMenu === SubMenuType.COLOR)
  const Component = showSub ? PanelItems[activeSubMenu] : PanelItems[activePanel]
  const name = (showSub ? activeSubMenu : activePanel) as string

  if (bp === 'phone') {
    return (
      <BottomSheet open={isPanelOpen} onClose={close} title={panelTitle(name)} variant="panel">
        <div key={name} className="mfa-panel-enter" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {Component && <Component />}
        </div>
      </BottomSheet>
    )
  }

  if (!isPanelOpen) return null
  return (
    <Container key={activeSubMenu || activePanel} className="mfa-panel-enter" $overlay={bp === 'tablet'}>
      {Component && <Component />}
    </Container>
  )
}

export default PanelsList
