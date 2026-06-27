import { useActiveObject } from '@nkyo/scenify-sdk'
import { shapeControlsFor } from '../toolboxMap'
import Common from './components/Common'
import StrokeWidth from './components/StrokeWidth'
import CornerRadius from './components/CornerRadius'
import ColorControl from './components/ColorControl'

function Shape() {
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
        {controls.fill && <ColorControl property="fill" />}
        {controls.stroke && <ColorControl property="stroke" />}
        {controls.strokeWidth && <StrokeWidth />}
        {controls.cornerRadius && <CornerRadius />}
      </div>
      <Common />
    </div>
  )
}

export default Shape
