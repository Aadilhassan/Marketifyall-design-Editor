import { useState } from 'react'
import { fabric } from 'fabric'
import {
  MousePointer2,
  Pencil,
  Brush,
  Highlighter,
  StickyNote,
  Square,
  Circle as CircleIcon,
  Minus,
  Type as TypeIcon,
  Table as TableIcon,
} from 'lucide-react'
import { addObjectToCanvas } from '@/utils/editorHelpers'

// The interactive fabric canvas is editor.handlers.canvas (same resolver the
// editor uses). layering's getFabricCanvas returns a different wrapper that
// doesn't drive drawing/events, so resolve it directly here.
const getFabricCanvas = (editor: any): any =>
  editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas || null

/**
 * Canva-style whiteboard tool rail: select, free-draw pen (with a brush flyout —
 * pen / marker / highlighter, colour & size), sticky note, shapes, line, text
 * and table. Operates on the fabric canvas / via addObjectToCanvas.
 */
type BrushType = 'pen' | 'marker' | 'highlighter'

const BRUSH_COLORS = ['#1f2937', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7']

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function WhiteboardToolbar({ editor }: { editor: any }) {
  const [active, setActive] = useState<string>('select')
  const [showBrush, setShowBrush] = useState(false)
  const [brushType, setBrushType] = useState<BrushType>('pen')
  const [brushColor, setBrushColor] = useState('#1f2937')
  const [brushSize, setBrushSize] = useState(4)

  const frame = () => {
    const canvas = getFabricCanvas(editor)
    const clip = canvas?.clipPath
    const w = (clip?.width || 1920) * (clip?.scaleX || 1)
    const h = (clip?.height || 1080) * (clip?.scaleY || 1)
    const l = clip?.left || 0
    const t = clip?.top || 0
    return { canvas, l, t, w, h, cx: l + w / 2, cy: t + h / 2 }
  }

  const stopDraw = () => {
    const canvas = getFabricCanvas(editor)
    if (canvas) canvas.isDrawingMode = false
    setShowBrush(false)
  }

  const applyBrush = (type: BrushType, color: string, size: number) => {
    const canvas = getFabricCanvas(editor)
    if (!canvas) return
    canvas.isDrawingMode = true
    try {
      const brush = new (fabric as any).PencilBrush(canvas)
      if (type === 'highlighter') {
        brush.color = hexToRgba(color, 0.35)
        brush.width = size * 4
      } else if (type === 'marker') {
        brush.color = color
        brush.width = size * 2.2
      } else {
        brush.color = color
        brush.width = size
      }
      canvas.freeDrawingBrush = brush
    } catch {
      /* ignore */
    }
  }

  const select = () => {
    stopDraw()
    setActive('select')
  }

  const draw = () => {
    setActive('draw')
    setShowBrush(true)
    applyBrush(brushType, brushColor, brushSize)
  }

  const pickBrushType = (t: BrushType) => {
    setBrushType(t)
    applyBrush(t, brushColor, brushSize)
  }
  const pickColor = (c: string) => {
    setBrushColor(c)
    applyBrush(brushType, c, brushSize)
  }
  const pickSize = (s: number) => {
    setBrushSize(s)
    applyBrush(brushType, brushColor, s)
  }

  const addSticky = () => {
    stopDraw()
    setActive('select')
    const { canvas, cx, cy } = frame()
    const size = 240
    addObjectToCanvas(editor, { type: 'StaticRect', left: cx - size / 2, top: cy - size / 2, width: size, height: size, rx: 10, ry: 10, metadata: { fill: '#FEF08A' } }, size, canvas)
    addObjectToCanvas(editor, { type: 'StaticText', left: cx - size / 2 + 18, top: cy - size / 2 + 18, width: size - 36, metadata: { text: 'Note', fontSize: 26, fontWeight: 600, fontFamily: 'Poppins', fill: '#374151', textAlign: 'left' } }, size - 36, canvas)
  }

  const addRect = () => {
    stopDraw()
    setActive('select')
    const { canvas, cx, cy } = frame()
    addObjectToCanvas(editor, { type: 'StaticRect', left: cx - 130, top: cy - 90, width: 260, height: 180, rx: 8, ry: 8, metadata: { fill: '#DBEAFE' } }, 260, canvas)
  }

  const addEllipse = () => {
    stopDraw()
    setActive('select')
    const { canvas, cx, cy } = frame()
    addObjectToCanvas(editor, { type: 'StaticCircle', left: cx - 100, top: cy - 100, radius: 100, metadata: { fill: '#DCFCE7' } }, 200, canvas)
  }

  const addLine = () => {
    stopDraw()
    setActive('select')
    const { canvas, cx, cy } = frame()
    if (!canvas) return
    try {
      const line = new fabric.Line([cx - 150, cy, cx + 150, cy], { stroke: '#111827', strokeWidth: 4, selectable: true, hasControls: true })
      canvas.add(line)
      canvas.setActiveObject(line)
      try {
        canvas.fire('object:modified', { target: line })
      } catch {
        /* ignore */
      }
      canvas.requestRenderAll()
    } catch {
      /* ignore */
    }
  }

  const addText = () => {
    stopDraw()
    setActive('select')
    const { canvas } = frame()
    addObjectToCanvas(editor, { type: 'StaticText', width: 280, metadata: { text: 'Text', fontSize: 30, fontWeight: 500, fontFamily: 'Poppins', fill: '#111827', textAlign: 'left' } }, 280, canvas)
  }

  const addTable = () => {
    stopDraw()
    setActive('select')
    const { canvas, l, t, w, h } = frame()
    const cols = 3
    const rows = 3
    const cellW = Math.round(Math.min(w * 0.5, 600) / cols)
    const cellH = Math.round(cellW * 0.5)
    const startX = l + (w - cellW * cols) / 2
    const startY = t + Math.round(h * 0.3)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        addObjectToCanvas(editor, { type: 'StaticRect', left: startX + c * cellW, top: startY + r * cellH, width: cellW, height: cellH, fill: r === 0 ? '#f3f4f6' : '#ffffff', stroke: '#d1d5db', strokeWidth: 1 }, cellW, canvas)
      }
    }
  }

  const tools: { id: string; label: string; icon: any; onClick: () => void; color?: string }[] = [
    { id: 'select', label: 'Select', icon: MousePointer2, onClick: select },
    { id: 'draw', label: 'Draw', icon: Pencil, onClick: draw, color: '#ef4444' },
    { id: 'sticky', label: 'Sticky note', icon: StickyNote, onClick: addSticky, color: '#eab308' },
    { id: 'rect', label: 'Rectangle', icon: Square, onClick: addRect },
    { id: 'ellipse', label: 'Ellipse', icon: CircleIcon, onClick: addEllipse },
    { id: 'line', label: 'Line', icon: Minus, onClick: addLine, color: '#3b82f6' },
    { id: 'text', label: 'Text', icon: TypeIcon, onClick: addText, color: '#7c3aed' },
    { id: 'table', label: 'Table', icon: TableIcon, onClick: addTable },
  ]

  const brushTypes: { id: BrushType; label: string; icon: any }[] = [
    { id: 'pen', label: 'Pen', icon: Pencil },
    { id: 'marker', label: 'Marker', icon: Brush },
    { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 6,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
          border: '1px solid #eef2f7',
        }}
      >
        {tools.map(tool => {
          const Icon = tool.icon
          const isActive = active === tool.id
          return (
            <button
              key={tool.id}
              onClick={tool.onClick}
              title={tool.label}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? '#eef2ff' : 'transparent',
                color: tool.color || (isActive ? '#4338ca' : '#374151'),
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              <Icon size={20} />
            </button>
          )
        })}
      </div>

      {/* brush flyout */}
      {showBrush && (
        <div
          style={{
            marginTop: 44,
            width: 184,
            padding: 12,
            background: '#ffffff',
            borderRadius: 14,
            boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
            border: '1px solid #eef2f7',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            {brushTypes.map(b => {
              const Icon = b.icon
              const sel = brushType === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => pickBrushType(b.id)}
                  title={b.label}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: '1px solid ' + (sel ? '#6366f1' : '#e5e7eb'),
                    background: sel ? '#eef2ff' : '#fff',
                    color: sel ? '#4338ca' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} />
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {BRUSH_COLORS.map(c => (
              <button
                key={c}
                onClick={() => pickColor(c)}
                title={c}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: c,
                  border: brushColor === c ? '2px solid #111827' : '2px solid #fff',
                  boxShadow: '0 0 0 1px #e5e7eb',
                }}
              />
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Size {brushSize}</div>
            <input
              type="range"
              min={1}
              max={24}
              value={brushSize}
              onChange={e => pickSize(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#6366f1' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default WhiteboardToolbar
