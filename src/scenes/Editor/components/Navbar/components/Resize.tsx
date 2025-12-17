import { Button, KIND } from 'baseui/button'
import { styled, ThemeProvider, LightTheme } from 'baseui'
import { Select, Value } from 'baseui/select'
import { Input } from 'baseui/input'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { useEffect, useState } from 'react'
import formatSizes from '@/constants/format-sizes'
import { useEditorContext, useEditor } from '@nkyo/scenify-sdk'

const getLabel = ({ option }: any) => {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <div>{option.name}</div>
      <div style={{ color: '#AFAFAF' }}>{option.description}</div>
    </div>
  )
}

const Container = styled('div', props => ({
  background: props.$theme.colors.background,
  color: props.$theme.colors.primary,
  width: '320px',
  fontFamily: 'Poppins',
  padding: '2rem 2rem',
}))

export default function Resize() {
  const [value, setValue] = useState<Value>([])
  const [customSize, setCustomSize] = useState({ width: 0, height: 0 })
  const { frameSize } = useEditorContext() as any

  const editor = useEditor()
  const updateFormatSize = value => {
    setValue(value)
    const [frame] = value
    editor.frame.setSize(frame.size)
  }
  const applyCustomSize = () => {
    const width = Number(customSize.width)
    const height = Number(customSize.height)
    if (width > 0 && height > 0) {
      editor.frame.update({ width, height })
    }
  }
  useEffect(() => {
    if (frameSize) {
      setCustomSize(frameSize)
    }
  }, [frameSize])

  return (
    <StatefulPopover
      focusLock
      placement={PLACEMENT.bottomLeft}
      content={({ close }) => (
        <ThemeProvider theme={LightTheme}>
          <Container>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>Size templates</div>
              <Select
                options={formatSizes}
                labelKey="name"
                valueKey="id"
                onChange={({ value }) => updateFormatSize(value)}
                value={value}
                getValueLabel={getLabel}
                getOptionLabel={getLabel}
                clearable={false}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>Custom size</div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Input
                  type="number"
                  value={customSize.width || ''}
                  onChange={e => {
                    const val = (e.target as HTMLInputElement).value
                    setCustomSize({ ...customSize, width: val ? Number(val) : 0 })
                  }}
                  startEnhancer="W"
                  placeholder="width"
                />
                <Input
                  type="number"
                  value={customSize.height || ''}
                  onChange={e => {
                    const val = (e.target as HTMLInputElement).value
                    setCustomSize({ ...customSize, height: val ? Number(val) : 0 })
                  }}
                  startEnhancer="H"
                  placeholder="height"
                />
              </div>
              <Button onClick={() => applyCustomSize()}>Apply</Button>
            </div>
          </Container>
        </ThemeProvider>
      )}
    >
      <Button kind={KIND.tertiary}>Resize</Button>
    </StatefulPopover>
  )
}
