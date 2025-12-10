import { useState } from 'react'
import useAppContext from '@/hooks/useAppContext'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useActiveObject, useEditor } from '@nkyo/scenify-sdk'
import { HexColorPicker } from 'react-colorful'
import { Plus, ArrowLeft } from 'baseui/icon'
import throttle from 'lodash/throttle'
import { gradients } from '@/constants/editor'

const colors = [
  '#f19066',
  '#f5cd79',
  '#546de5',
  '#e15f41',
  '#c44569',
  '#574b90',
  '#f78fb3',
  '#3dc1d3',
  '#e66767',
  '#303952',
]
function Color() {
  const [color, setColor] = useState('#b32aa9')
  const [value, setValue] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [showGradientCreator, setShowGradientCreator] = useState(false)
  const [gradientColor1, setGradientColor1] = useState('#ff0080')
  const [gradientColor2, setGradientColor2] = useState('#ff8c00')
  const [gradientAngle, setGradientAngle] = useState(90)
  const editor = useEditor()
  const activeObject = useActiveObject()

  const { setActiveSubMenu } = useAppContext()

  const updateObjectFill = throttle((color: string) => {
    if (activeObject) {
      editor.update({ fill: color })
      // @ts-ignore
      if (activeObject._objects) {
        // @ts-ignore
        activeObject._objects.forEach((obj: any) => {
          if (obj.fill && obj.fill !== 'none') {
            obj.set({ fill: color })
          }
          if (obj.stroke && obj.stroke !== 'none') {
            obj.set({ stroke: color })
          }
        })
        // @ts-ignore
        activeObject.canvas?.requestRenderAll()
      }
    } else {
      editor.background.setBackgroundColor(color)
    }
    setColor(color)
  }, 100)

  const updateObjectGradient = throttle((gradient: any) => {
    if (activeObject) {
      editor.setGradient(gradient)
    } else {
      editor.background.setGradient(gradient)
    }
    setColor(color)
  }, 100)

  const applyCustomGradient = () => {
    const customGradient = {
      angle: gradientAngle,
      colors: [gradientColor1, gradientColor2]
    }
    updateObjectGradient(customGradient)
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div style={{ padding: '2rem 2rem' }}>
        {showGradientCreator ? (
          <div
            onClick={() => setShowGradientCreator(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: '#333',
            }}
          >
            <ArrowLeft size={24} />
            <span style={{ fontWeight: 500 }}>Back</span>
          </div>
        ) : showPicker ? (
          <div
            onClick={() => setShowPicker(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: '#333',
            }}
          >
            <ArrowLeft size={24} />
            <span style={{ fontWeight: 500 }}>Back</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              onClick={() => setActiveSubMenu(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                color: '#333',
              }}
            >
              <ArrowLeft size={24} />
              <span style={{ fontWeight: 500 }}>Back</span>
            </div>
            <Input
              startEnhancer={() => <Icons.Search size={18} />}
              value={value}
              onChange={e => setValue((e.target as any).value)}
              placeholder="Search color"
              clearOnEscape
            />
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <Scrollbars>
          {showGradientCreator ? (
            <div style={{ padding: '0 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '0.5rem 0', cursor: 'default', fontSize: '0.96rem', fontWeight: 500 }}>
                Create Gradient
              </div>
              
              {/* Gradient Preview */}
              <div
                style={{
                  height: '80px',
                  borderRadius: '8px',
                  background: `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`,
                  border: '1px solid #e5e5e5',
                }}
              />

              {/* Color 1 Picker */}
              <div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>Start Color</div>
                <HexColorPicker color={gradientColor1} onChange={setGradientColor1} style={{ width: '100%' }} />
                <div style={{ marginTop: '0.5rem' }}>
                  <Input
                    overrides={{ Input: { style: { textAlign: 'center' } } }}
                    value={gradientColor1}
                    onChange={e => setGradientColor1((e.target as any).value)}
                    placeholder="#ff0080"
                    clearOnEscape
                  />
                </div>
              </div>

              {/* Color 2 Picker */}
              <div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>End Color</div>
                <HexColorPicker color={gradientColor2} onChange={setGradientColor2} style={{ width: '100%' }} />
                <div style={{ marginTop: '0.5rem' }}>
                  <Input
                    overrides={{ Input: { style: { textAlign: 'center' } } }}
                    value={gradientColor2}
                    onChange={e => setGradientColor2((e.target as any).value)}
                    placeholder="#ff8c00"
                    clearOnEscape
                  />
                </div>
              </div>

              {/* Angle Slider */}
              <div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Angle: {gradientAngle}°
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '5px',
                    background: '#e5e5e5',
                    outline: 'none',
                    opacity: 0.7,
                    transition: 'opacity .2s',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Apply Button */}
              <button
                onClick={applyCustomGradient}
                style={{
                  padding: '12px',
                  background: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#6d28d9')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#7c3aed')}
              >
                Apply Gradient
              </button>
            </div>
          ) : showPicker ? (
            <div style={{ padding: '0 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '0.5rem 0', cursor: 'default', fontSize: '0.96rem', fontWeight: 500 }}>
                Pick a color
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <HexColorPicker color={color} onChange={updateObjectFill} style={{ width: '100%' }} />
              </div>
              <Input
                overrides={{ Input: { style: { textAlign: 'center' } } }}
                value={color}
                onChange={e => {
                  const newColor = (e.target as any).value
                  setColor(newColor)
                  if (newColor.startsWith('#') && newColor.length >= 7) {
                    updateObjectFill(newColor)
                  }
                }}
                placeholder="#000000"
                clearOnEscape
              />
              
              {/* Gradient Creator Button */}
              <button
                onClick={() => {
                  setShowPicker(false)
                  setShowGradientCreator(true)
                }}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(90deg, #ff0080, #ff8c00)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                🎨 Create Gradient
              </button>
            </div>
          ) : (
            <>
              <div style={{ padding: '0 2rem 2rem' }}>
                <div style={{ padding: '0.5rem 0', cursor: 'default', fontSize: '0.96rem' }}>Document colors</div>
                <div>
                  <div
                    onClick={() => setShowPicker(true)}
                    style={{
                      height: '40px',
                      width: '40px',
                      backgroundSize: '100% 100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundImage:
                        'url("https://static.canva.com/web/images/788ee7a68293bd0264fc31f22c31e62d.png")',
                    }}
                  >
                    <div
                      style={{
                        height: '32px',
                        width: '32px',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                      }}
                    >
                      <Plus size={24} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 2rem 0' }}>
                <div style={{ cursor: 'default', padding: '0.5rem 0', fontSize: '0.96rem' }}>Basic</div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '0.5rem',
                  padding: '0 2rem 2rem',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                }}
              >
                {colors.map(color => (
                  <div
                    onClick={() => updateObjectFill(color)}
                    key={color}
                    style={{ height: '42px', background: color, borderRadius: '4px', cursor: 'pointer' }}
                  ></div>
                ))}
              </div>

              <div style={{ padding: '0 2rem 0' }}>
                <div style={{ cursor: 'default', padding: '0.5rem 0', fontSize: '0.96rem' }}>Gradient</div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '0.5rem',
                  padding: '0 2rem 2rem',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                }}
              >
                {gradients.map((gradient, index) => (
                  <div
                    onClick={() => updateObjectGradient(gradient)}
                    key={index}
                    style={{
                      height: '42px',
                      background: `linear-gradient(to right, ${gradient.colors[0]}, ${gradient.colors[1]})`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  ></div>
                ))}
              </div>
            </>
          )}
        </Scrollbars>
      </div>
    </div>
  )
}
export default Color
