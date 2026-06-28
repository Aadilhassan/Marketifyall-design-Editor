import { SubMenuType } from '@/constants/editor'
import useAppContext from '@/hooks/useAppContext'
import { useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { useEffect, useRef } from 'react'
import PanelItems from './PanelItems'

const Container = styled('div', {
  background: '#ffffff',
  width: '340px',
  flex: 'none',
  borderRight: '1px solid #e5e7eb',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
})

function PanelsList() {
  const { activePanel, activeSubMenu, setActiveSubMenu } = useAppContext()
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

  const Component =
    (activeObject && activeSubMenu) || (!activeObject && activeSubMenu === SubMenuType.COLOR)
      ? PanelItems[activeSubMenu]
      : PanelItems[activePanel]

  return <Container>{Component && <Component />}</Container>
}

export default PanelsList
