import { Button, KIND, SHAPE, SIZE } from 'baseui/button'
import { styled } from 'baseui'
import { Plus, CheckIndeterminate } from 'baseui/icon'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { Scrollbars } from 'react-custom-scrollbars'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { color, font, shadow } from '@/theme/tokens'
import ShortcutsSheet, { ShortcutsButton, useShortcutsSheet } from '../ShortcutsSheet'
import useBreakpoint from '@/hooks/useBreakpoint'

const Container = styled('div', () => ({
  backgroundColor: color.white,
  display: 'flex',
  position: 'absolute',
  bottom: '20px',
  right: '20px',
  borderRadius: '6px',
  boxShadow: shadow.hard,
  padding: '3px',
  border: `1px solid ${color.ink}`,
  zIndex: 5,
}))

const zoomValues = [0.27, 0.5, 0.75, 0.92, 1, 1.25, 1.5, 1.75, 2, 3, 4, 5]

const ZoomItemContainer = styled('div', () => ({
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  fontFamily: font.mono,
  fontSize: '12px',
  paddingLeft: '1rem',
  paddingRight: '1rem',
  color: color.ink2,
  ':hover': {
    backgroundColor: color.accentSoft,
    color: color.accent,
    cursor: 'pointer',
  },
}))
function Footer() {
  const editor = useEditor()
  const { zoomRatio } = useEditorContext() as any
  const shortcuts = useShortcutsSheet()
  // Phones zoom with a pinch and have no keyboard: no zoom pill, no shortcuts.
  const phone = useBreakpoint() === 'phone'
  if (phone) return null

  return (
    <Container>
      <ShortcutsSheet open={shortcuts.open} onClose={() => shortcuts.setOpen(false)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <ShortcutsButton onClick={() => shortcuts.setOpen(true)} />
        <div style={{ width: 1, height: 20, background: color.line, margin: '0 2px' }} />
        <Button 
          onClick={() => editor.zoomOut()} 
          size={SIZE.compact} 
          kind={KIND.tertiary}
          overrides={{
            BaseButton: {
              style: {
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                borderBottomLeftRadius: '6px',
                borderBottomRightRadius: '6px',
                ':hover': {
                  backgroundColor: color.hover,
                },
              },
            },
          }}
        >
          <CheckIndeterminate size={18} />
        </Button>
        <StatefulPopover
          focusLock
          placement={PLACEMENT.top}
          overrides={{
            Body: {
              style: {
                borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px',
                border: `1px solid ${color.ink}`,
                boxShadow: shadow.hard,
                overflow: 'hidden',
              },
            },
          }}
          content={({ close }) => (
            <div
              style={{
                backgroundColor: color.white,
                width: '140px',
                fontFamily: font.mono,
                height: '260px',
                padding: '0.5rem 0',
              }}
            >
              <Scrollbars>
                <ZoomItemContainer
                  onClick={() => {
                    editor.zoomToFit()
                    close()
                  }}
                >
                  Fit canvas
                </ZoomItemContainer>
                {zoomValues.map(zv => (
                  <ZoomItemContainer
                    onClick={() => {
                      editor.zoomToRatio(zv)
                      close()
                    }}
                    key={zv}
                  >
                    {Math.round(zv * 100) + '%'}
                  </ZoomItemContainer>
                ))}
              </Scrollbars>
            </div>
          )}
        >
          <Button
            overrides={{
              BaseButton: {
                style: {
                  fontFamily: font.mono,
                  fontSize: '12px',
                  fontWeight: '700',
                  color: color.ink,
                  minWidth: '52px',
                  borderTopLeftRadius: '6px',
                  borderTopRightRadius: '6px',
                  borderBottomLeftRadius: '6px',
                  borderBottomRightRadius: '6px',
                  ':hover': {
                    backgroundColor: color.hover,
                    color: '#d8401c',
                  },
                },
              },
            }}
            shape={SHAPE.default}
            size={SIZE.compact}
            kind={KIND.tertiary}
          >
            {Math.round(zoomRatio * 100) + '%'}
          </Button>
        </StatefulPopover>
        <Button 
          onClick={() => editor.zoomIn()} 
          size={SIZE.compact} 
          kind={KIND.tertiary}
          overrides={{
            BaseButton: {
              style: {
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                borderBottomLeftRadius: '6px',
                borderBottomRightRadius: '6px',
                ':hover': {
                  backgroundColor: color.hover,
                },
              },
            },
          }}
        >
          <Plus size={18} />
        </Button>
      </div>
    </Container>
  )
}

export default Footer
