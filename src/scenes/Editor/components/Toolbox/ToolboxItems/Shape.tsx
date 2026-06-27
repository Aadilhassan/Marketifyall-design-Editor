import Icons from '../../Icons'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'
import { useActiveObject } from '@nkyo/scenify-sdk'
import { shapeControlsFor } from '../toolboxMap'
import Common from './components/Common'
import StrokeWidth from './components/StrokeWidth'
import CornerRadius from './components/CornerRadius'

function Shape() {
  const { setActiveSubMenu } = useAppContext()
  const activeObject = useActiveObject() as any
  const controls = shapeControlsFor(activeObject?.type ?? 'rect')

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {controls.fill && (
          <Button
            onClick={() => setActiveSubMenu(SubMenuType.COLOR)}
            size={SIZE.compact}
            kind={KIND.tertiary}
            shape={SHAPE.square}
          >
            <Icons.FillColor size={24} color="#000000" />
          </Button>
        )}
        {controls.stroke && (
          <Button
            onClick={() => setActiveSubMenu(SubMenuType.COLOR)}
            size={SIZE.compact}
            kind={KIND.tertiary}
            shape={SHAPE.square}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </Button>
        )}
        {controls.strokeWidth && <StrokeWidth />}
        {controls.cornerRadius && <CornerRadius />}
      </div>
      <Common />
    </div>
  )
}

export default Shape
