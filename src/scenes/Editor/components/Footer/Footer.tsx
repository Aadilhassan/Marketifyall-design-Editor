import { Button, KIND, SHAPE, SIZE } from 'baseui/button'
import { styled } from 'baseui'
import { Plus, CheckIndeterminate } from 'baseui/icon'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { Scrollbars } from 'react-custom-scrollbars'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'

const Container = styled('div', props => ({
  backgroundColor: '#ffffff',
  display: 'flex',
  position: 'absolute',
  bottom: '24px',
  right: '24px',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
  padding: '4px',
  border: '1px solid rgba(0, 0, 0, 0.06)',
}))

const zoomValues = [0.27, 0.5, 0.75, 0.92, 1, 1.25, 1.5, 1.75, 2, 3, 4, 5]

const ZoomItemContainer = styled('div', () => ({
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.875rem',
  fontWeight: '500',
  paddingLeft: '1rem',
  paddingRight: '1rem',
  color: '#374151',
  transition: 'all 0.15s ease',
  ':hover': {
    backgroundColor: '#f3f4f6',
    color: '#7c3aed',
    cursor: 'pointer',
  },
}))
function Footer() {
  const editor = useEditor()
  const { zoomRatio } = useEditorContext()
  return (
    <Container>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <Button 
          onClick={() => editor.zoomOut()} 
          size={SIZE.compact} 
          kind={KIND.tertiary}
          overrides={{
            BaseButton: {
              style: {
                borderRadius: '8px',
                transition: 'all 0.15s ease',
                ':hover': {
                  backgroundColor: '#f3f4f6',
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
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
              },
            },
          }}
          content={({ close }) => (
            <div
              style={{
                backgroundColor: '#ffffff',
                width: '140px',
                fontFamily: 'system-ui',
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
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  minWidth: '52px',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease',
                  ':hover': {
                    backgroundColor: '#f3f4f6',
                    color: '#7c3aed',
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
                borderRadius: '8px',
                transition: 'all 0.15s ease',
                ':hover': {
                  backgroundColor: '#f3f4f6',
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
