import { useActiveObject } from '@nkyo/scenify-sdk'
import { Button, KIND, SIZE } from 'baseui/button'
import { Sparkles } from 'lucide-react'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'
import { shapeControlsFor } from '../toolboxMap'
import { commonItems } from './components/Common'
import OverflowBar, { OverflowSpacer } from '../OverflowBar'
import StrokeWidth from './components/StrokeWidth'
import CornerRadius from './components/CornerRadius'
import ColorControl from './components/ColorControl'
import Animate from './components/Animate'

function Shape() {
  const { setActiveSubMenu } = useAppContext()
  const activeObject = useActiveObject() as any
  const controls = shapeControlsFor(activeObject?.type ?? 'rect')

  return (
    <OverflowBar>
      {controls.fill && <ColorControl key="fill" property="fill" />}
      {controls.stroke && <ColorControl key="stroke" property="stroke" />}
      {controls.strokeWidth && <StrokeWidth key="stroke-width" />}
      {controls.cornerRadius && <CornerRadius key="corner-radius" />}
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

export default Shape
