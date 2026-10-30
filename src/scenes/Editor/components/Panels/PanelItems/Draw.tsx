import { useEffect, useState } from 'react'
import { useEditor } from '@nkyo/scenify-sdk'
import { fabric } from 'fabric'
import { Highlighter, PenLine, Brush } from 'lucide-react'
import useAppContext from '@/hooks/useAppContext'
import { color, font } from '@/theme/tokens'
import { log } from '@/lib/logger'
import { hexToRgba } from '@/utils/textEffects'
import { PanelBody, PanelHeader, PanelRoot, SectionLabel, Tile, KitButton } from '../PanelKit'

type BrushType = 'pen' | 'marker' | 'highlighter'

const TOOLS: { type: BrushType; label: string; Icon: typeof PenLine }[] = [
  { type: 'pen', label: 'Pen', Icon: PenLine },
  { type: 'marker', label: 'Marker', Icon: Brush },
  { type: 'highlighter', label: 'Highlighter', Icon: Highlighter },
]

const SWATCHES = ['#181410', '#d8401c', '#e8a33d', '#2f7d4f', '#3b6ea8', '#ffffff']

const getCanvas = (editor: any) => editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas

function Draw() {
  const editor = useEditor() as any
  const { setIsPanelOpen } = useAppContext()
  const [tool, setTool] = useState<BrushType>('pen')
  const [ink, setInk] = useState('#181410')
  const [size, setSize] = useState(6)

  // Drawing mode lives exactly as long as this panel is open.
  useEffect(() => {
    const canvas = getCanvas(editor)
    if (!canvas) return
    canvas.discardActiveObject?.()
    canvas.isDrawingMode = true
    // Each stroke is its own undo step and triggers autosave.
    const onPath = (e: any) => {
      if (e?.path) e.path.set('metadata', { ...(e.path.metadata || {}), category: 'drawing' })
      canvas.fire('object:modified', { target: e?.path })
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPanelOpen(false)
    }
    canvas.on('path:created', onPath)
    document.addEventListener('keydown', onKey)
    return () => {
      canvas.isDrawingMode = false
      canvas.off('path:created', onPath)
      document.removeEventListener('keydown', onKey)
      canvas.requestRenderAll()
    }
  }, [editor, setIsPanelOpen])

  useEffect(() => {
    const canvas = getCanvas(editor)
    if (!canvas) return
    try {
      const brush = new (fabric as any).PencilBrush(canvas)
      brush.decimate = 2
      if (tool === 'highlighter') {
        brush.color = hexToRgba(ink, 0.35)
        brush.width = size * 3
        brush.strokeLineCap = 'square'
      } else {
        brush.color = ink
        brush.width = tool === 'marker' ? size * 2 : size
      }
      canvas.freeDrawingBrush = brush
    } catch (err) {
      log.warn('draw', 'could not configure brush', err)
    }
  }, [editor, tool, ink, size])

  return (
    <PanelRoot>
      <PanelHeader title="Draw" subtitle="Sketch straight onto the page. Each stroke is its own editable element." />
      <PanelBody>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {TOOLS.map(({ type, label, Icon }) => (
            <Tile key={type} type="button" $active={tool === type} aria-pressed={tool === type} onClick={() => setTool(type)}>
              <Icon size={22} />
              {label}
            </Tile>
          ))}
        </div>

        <SectionLabel>Colour</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {SWATCHES.map(c => (
            <button
              key={c}
              type="button"
              aria-label={`Ink ${c}`}
              aria-pressed={ink === c}
              onClick={() => setInk(c)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: c,
                cursor: 'pointer',
                border: `1px solid ${color.line2}`,
                boxShadow: ink === c ? `0 0 0 2px ${color.white}, 0 0 0 4px ${color.ink}` : 'none',
              }}
            />
          ))}
          <input type="color" aria-label="Custom ink colour" value={ink} onChange={e => setInk(e.target.value)} style={{ width: 34, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }} />
        </div>

        <SectionLabel>
          Size <span style={{ fontFamily: font.mono }}>{size}</span>
        </SectionLabel>
        <input type="range" min={1} max={40} value={size} onChange={e => setSize(Number(e.target.value))} aria-label="Brush size" style={{ width: '100%', accentColor: color.accent }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 70, marginTop: 10, background: color.white, border: `1px solid ${color.line}`, borderRadius: 6 }}>
          <svg width="220" height="50" aria-hidden="true">
            <path
              d="M10 32 C 50 5, 90 50, 130 25 S 200 20, 210 30"
              fill="none"
              stroke={tool === 'highlighter' ? hexToRgba(ink, 0.35) : ink}
              strokeWidth={tool === 'highlighter' ? size * 3 : tool === 'marker' ? size * 2 : size}
              strokeLinecap={tool === 'highlighter' ? 'square' : 'round'}
            />
          </svg>
        </div>

        <div style={{ marginTop: 18 }}>
          <KitButton type="button" $variant="primary" $block onClick={() => setIsPanelOpen(false)}>
            Done drawing
          </KitButton>
          <p style={{ fontSize: 12, color: color.muted, marginTop: 8, textAlign: 'center' }}>Press Esc to stop drawing.</p>
        </div>
      </PanelBody>
    </PanelRoot>
  )
}

export default Draw
