import Icons from '../../Icons'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'
import { commonItems } from './components/Common'
import OverflowBar, { OverflowSpacer } from '../OverflowBar'
import Animate from './components/Animate'
import { useActiveObject } from '@nkyo/scenify-sdk'
import { Sparkles } from 'lucide-react'

function Path() {
  const { setActiveSubMenu } = useAppContext()
  const activeObject = useActiveObject()
  const fill = activeObject ? (activeObject as any).fill || '#000000' : '#000000'

  return (
    <OverflowBar>
      <Button
        key="color"
        onClick={() => setActiveSubMenu(SubMenuType.COLOR)}
        size={SIZE.compact}
        kind={KIND.tertiary}
        shape={SHAPE.square}
      >
        <Icons.FillColor size={24} color={fill} />
      </Button>
      <Button
        key="effects"
        onClick={() => setActiveSubMenu(SubMenuType.ELEMENT_EFFECTS)}
        size={SIZE.compact}
        kind={KIND.tertiary}
        startEnhancer={() => <Sparkles size={18} />}
      >
        Effects
      </Button>
      <Animate key="animate" />
      <OverflowSpacer key="spacer" />
      {commonItems()}
    </OverflowBar>
  )
}

export default Path
