import { panelListItems } from '@/constants/app-options'
import useAppContext from '@/hooks/useAppContext'
import { styled } from 'baseui'
import { color } from '@/theme/tokens'
import PanelListItem from './PanelListItem'

const Container = styled('nav', {
  width: '76px',
  flex: 'none',
  backgroundColor: color.ink,
  display: 'flex',
  flexDirection: 'column',
  paddingTop: '6px',
  paddingBottom: '6px',
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarWidth: 'none',
})

function PanelsList() {
  const { activePanel } = useAppContext()
  return (
    <Container aria-label="Editor panels">
      {panelListItems.map(panelListItem => (
        <PanelListItem
          label={panelListItem.name}
          name={panelListItem.name}
          key={panelListItem.name}
          icon={panelListItem.name}
          activePanel={activePanel}
        />
      ))}
    </Container>
  )
}

export default PanelsList
