import Icons from '../../Icons'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'
import Common from './components/Common'
import Animate from './components/Animate'
import Adjust from './components/Adjust'
import Crop from './components/Crop'
import RemoveBg from './components/RemoveBg'
import Enhance from './components/Enhance'
import Upscale from './components/Upscale'

function Image() {
  const { setActiveSubMenu } = useAppContext()

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '0 1rem',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: 0,
          overflowX: 'auto',
        }}
      >
        <Button
          onClick={() => setActiveSubMenu(SubMenuType.COLOR)}
          size={SIZE.compact}
          kind={KIND.tertiary}
          shape={SHAPE.square}
        >
          <Icons.FillColor size={24} color="#000000" />
        </Button>
        <Adjust />
        <Crop />
        <Enhance />
        <Upscale />
        <RemoveBg />
        <div style={{ height: 24, width: 1, backgroundColor: '#e2e8f0', margin: '0 6px', flexShrink: 0 }} />
        <Animate />
      </div>
      <div style={{ flexShrink: 0 }}>
        <Common />
      </div>
    </div>
  )
}

export default Image
