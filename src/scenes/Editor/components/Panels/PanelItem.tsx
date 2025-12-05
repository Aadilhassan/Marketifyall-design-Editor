import { SubMenuType } from '@/constants/editor'
import useAppContext from '@/hooks/useAppContext'
import { useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { useEffect } from 'react'
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

  useEffect(() => {
    setActiveSubMenu(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeObject])

  const Component =
    (activeObject && activeSubMenu) || (!activeObject && activeSubMenu === SubMenuType.COLOR)
      ? PanelItems[activeSubMenu]
      : PanelItems[activePanel]

  return <Container>{Component && <Component />}</Container>
}

export default PanelsList
