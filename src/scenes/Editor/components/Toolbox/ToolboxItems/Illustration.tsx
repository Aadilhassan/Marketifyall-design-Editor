import Icons from '../../Icons'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'
import Common from './components/Common'
import Animate from './components/Animate'
import { useActiveObject } from '@nkyo/scenify-sdk'

function Illustration() {
  const { setActiveSubMenu } = useAppContext()
  const activeObject = useActiveObject()
  // @ts-ignore
  const fill = activeObject ? activeObject.fill : '#000000'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
      }}
    >
      <div>
        <Button
          onClick={() => setActiveSubMenu(SubMenuType.COLOR)}
          size={SIZE.compact}
          kind={KIND.tertiary}
          shape={SHAPE.square}
        >
          <Icons.FillColor size={24} color={fill} />
        </Button>
        <Animate />
      </div>
      <Common />
    </div>
  )
}

export default Illustration
