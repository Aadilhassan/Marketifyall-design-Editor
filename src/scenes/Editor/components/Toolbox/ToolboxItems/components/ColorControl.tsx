import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { useActiveObject, useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

interface ColorControlProps {
  property: 'fill' | 'stroke'
  label?: string
}

const DEFAULT_COLORS: Record<'fill' | 'stroke', string> = {
  fill: '#cccccc',
  stroke: '#000000',
}

function ColorControl({ property, label }: ColorControlProps) {
  const defaultColor = DEFAULT_COLORS[property]
  const [color, setColor] = useState(defaultColor)
  const activeObject = useActiveObject() as any
  const editor = useEditor()
  const { canvas } = useEditorContext() as any

  const readColor = (obj: any): string => {
    if (!obj) return defaultColor
    const val = obj[property]
    if (typeof val === 'string' && val !== 'none' && val !== 'transparent' && val.startsWith('#')) {
      return val
    }
    return defaultColor
  }

  useEffect(() => {
    setColor(readColor(activeObject))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeObject])

  useEffect(() => {
    const handleChanges = () => {
      setColor(readColor(activeObject))
    }
    editor.on('history:changed', handleChanges)
    return () => {
      editor.off('history:changed', handleChanges)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const applyColor = (newColor: string) => {
    if (property === 'stroke') {
      const obj = canvas ? canvas.getActiveObject() : null
      const currentWidth: number | undefined = obj?.strokeWidth
      const strokeWidth = currentWidth != null && currentWidth > 0 ? currentWidth : 2
      editor.update({ stroke: newColor, strokeWidth, strokeUniform: true })
    } else {
      editor.update({ fill: newColor })
    }
    if (canvas) canvas.requestRenderAll()
    setColor(newColor)
  }

  return (
    <StatefulPopover
      focusLock
      placement={PLACEMENT.bottomRight}
      content={() => (
        <div
          style={{
            padding: '1rem',
            background: '#ffffff',
            fontFamily: 'Poppins',
          }}
        >
          {label && (
            <div style={{ fontSize: '12px', marginBottom: '0.5rem', color: '#666' }}>{label}</div>
          )}
          <HexColorPicker color={color} onChange={applyColor} />
        </div>
      )}
    >
      <Button size={SIZE.compact} kind={KIND.tertiary} shape={SHAPE.square}>
        <div
          style={{
            width: '20px',
            height: '20px',
            background: color,
            border: '1px solid rgba(0,0,0,0.2)',
            borderRadius: '2px',
          }}
        />
      </Button>
    </StatefulPopover>
  )
}

export default ColorControl
