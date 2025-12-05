import { panelListItems } from '@/constants/app-options'
import useAppContext from '@/hooks/useAppContext'
import { styled } from 'baseui'
import PanelListItem from './PanelListItem'

const Container = styled('div', {
  width: '80px',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  paddingTop: '8px',
  borderRight: '1px solid #e5e7eb',
  boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
})

function PanelsList() {
  const { activePanel } = useAppContext()
  return (
    <Container>
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
