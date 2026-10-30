import Icons from '../../Icons'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'
import { commonItems } from './components/Common'
import OverflowBar, { OverflowDivider, OverflowSpacer } from '../OverflowBar'
import Animate from './components/Animate'
import Adjust from './components/Adjust'
import Crop from './components/Crop'
import RemoveBg from './components/RemoveBg'
import Enhance from './components/Enhance'
import Upscale from './components/Upscale'
import { Eraser, Sparkles } from 'lucide-react'

function Image() {
  const { setActiveSubMenu } = useAppContext()

  return (
    <OverflowBar>
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
      <Button
        onClick={() => setActiveSubMenu(SubMenuType.MAGIC_ERASER)}
        size={SIZE.compact}
        kind={KIND.tertiary}
        startEnhancer={() => <Eraser size={16} />}
      >
        Magic Eraser
      </Button>
      <Button
        onClick={() => setActiveSubMenu(SubMenuType.ELEMENT_EFFECTS)}
        size={SIZE.compact}
        kind={KIND.tertiary}
        startEnhancer={() => <Sparkles size={18} />}
      >
        Effects
      </Button>
      <OverflowDivider />
      <Animate />
      <OverflowSpacer />
      {commonItems()}
    </OverflowBar>
  )
}

export default Image
