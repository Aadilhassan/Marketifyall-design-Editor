import Delete from './Delete'
import Duplicate from './Duplicate'
import Opacity from './Opacity'
import Position from './Position'
import Lock from './Lock'
import CopyStyle from './CopyStyle'
import Group from './Group'

function Common() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Group />
      <Position />
      <div
        style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 8px' }}
      />
      <CopyStyle />
      <Opacity />
      <div
        style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 8px' }}
      />
      <Lock />
      <Duplicate />
      <Delete />
    </div>
  )
}

export default Common
