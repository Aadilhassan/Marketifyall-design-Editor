import { Input } from 'baseui/input'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { Slider } from 'baseui/slider'
import { useActiveObject, useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { useEffect, useState } from 'react'

function StrokeWidth() {
  const [value, setValue] = useState([0])
  const activeObject = useActiveObject()
  const editor = useEditor()
  const { canvas } = useEditorContext() as any

  useEffect(() => {
    updateOptions(activeObject)
  }, [activeObject])

  useEffect(() => {
    const handleChanges = () => {
      updateOptions(activeObject)
    }
    editor.on('history:changed', handleChanges)
    return () => {
      editor.off('history:changed', handleChanges)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const updateOptions = (object: any) => {
    setValue([object?.strokeWidth ?? 0])
  }

  const applyStrokeWidth = (val: number[]) => {
    editor.update({ strokeWidth: val[0], strokeUniform: true })
    if (canvas) canvas.requestRenderAll()
    setValue(val)
  }

  return (
    <StatefulPopover
      focusLock
      placement={PLACEMENT.bottomRight}
      content={() => (
        <div
          style={{
            width: '380px',
            background: '#ffffff',
            fontFamily: 'Poppins',
            padding: '1.5rem',
            fontSize: '14px',
          }}
        >
          <div
            style={{
              display: 'grid',
              alignItems: 'center',
              gridTemplateColumns: '100px 1fr 52px',
            }}
          >
            <div>Stroke Width</div>
            <Slider
              overrides={{
                InnerThumb: () => null,
                ThumbValue: () => null,
                TickBar: () => null,
                Thumb: {
                  style: {
                    height: '12px',
                    width: '12px',
                  },
                },
              }}
              min={0}
              max={30}
              step={1}
              marks={false}
              value={value}
              onChange={({ value }) => applyStrokeWidth(value)}
            />
            <div>
              <Input
                overrides={{
                  Input: {
                    style: {
                      backgroundColor: '#ffffff',
                      textAlign: 'center',
                    },
                  },
                  Root: {
                    style: {
                      borderBottomColor: 'rgba(0,0,0,0.45)',
                      borderTopColor: 'rgba(0,0,0,0.45)',
                      borderRightColor: 'rgba(0,0,0,0.45)',
                      borderLeftColor: 'rgba(0,0,0,0.45)',
                      borderTopWidth: '1px',
                      borderBottomWidth: '1px',
                      borderRightWidth: '1px',
                      borderLeftWidth: '1px',
                    },
                  },
                  InputContainer: {},
                }}
                size={SIZE.mini}
                onChange={() => {}}
                value={Math.round(value[0])}
              />
            </div>
          </div>
        </div>
      )}
    >
      <Button size={SIZE.default} kind={KIND.tertiary} shape={SHAPE.square}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="8" width="20" height="2" fill="currentColor" />
          <rect x="2" y="13" width="20" height="4" fill="currentColor" />
        </svg>
      </Button>
    </StatefulPopover>
  )
}

export default StrokeWidth
