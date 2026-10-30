import { Button, KIND, SIZE } from 'baseui/button'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { useStyletron } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { fabric } from 'fabric'
import { FlipHorizontal2, FlipVertical2 } from 'lucide-react'
import { log } from '@/lib/logger'
import { color, font } from '@/theme/tokens'

type FlipAxis = 'x' | 'y'

/**
 * Mirror the active object. A single object just toggles flipX/flipY. For a
 * multi-selection each member is mirrored around the selection centre: its
 * centre is reflected, its flip toggled and its angle negated (a mirror turns
 * a clockwise rotation into a counter-clockwise one).
 */
function flipActive(canvas: any, active: any, axis: FlipAxis) {
  if (!canvas || !active) return
  const prop = axis === 'x' ? 'flipX' : 'flipY'
  if (active.type !== 'activeSelection') {
    active.set(prop, !active[prop])
    active.setCoords()
    canvas.requestRenderAll()
    canvas.fire('object:modified', { target: active })
    return
  }
  const objs: any[] = [...active.getObjects()]
  const c = active.getCenterPoint()
  canvas.discardActiveObject()
  objs.forEach(o => {
    const p = o.getCenterPoint()
    const next = axis === 'x' ? new fabric.Point(2 * c.x - p.x, p.y) : new fabric.Point(p.x, 2 * c.y - p.y)
    o.set({ [prop]: !o[prop], angle: -(o.angle || 0) })
    o.setPositionByOrigin(next, 'center', 'center')
    o.setCoords()
  })
  const sel = new fabric.ActiveSelection(objs, { canvas })
  canvas.setActiveObject(sel)
  canvas.fire('selection:updated', { target: sel, selected: objs })
  canvas.requestRenderAll()
  canvas.fire('object:modified', { target: sel })
}

function Flip() {
  const editor = useEditor() as any
  const { activeObject } = useEditorContext() as any
  const [css] = useStyletron()
  const canvas = editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas

  const flip = (axis: FlipAxis) => {
    try {
      flipActive(canvas, canvas?.getActiveObject?.() || activeObject, axis)
    } catch (err) {
      log.warn('flip', 'failed to flip selection', err)
    }
  }

  const item = css({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderWidth: 0,
    borderRadius: '4px',
    background: 'transparent',
    fontFamily: font.sans,
    fontSize: '13px',
    color: color.ink,
    cursor: 'pointer',
    textAlign: 'left',
    ':hover': { background: color.hover },
  })

  return (
    <StatefulPopover
      placement={PLACEMENT.bottom}
      content={({ close }) => (
        <div style={{ width: '200px', padding: '6px', background: color.white }}>
          <button
            type="button"
            className={item}
            onClick={() => {
              flip('x')
              close()
            }}
          >
            <FlipHorizontal2 size={16} /> Flip horizontal
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              flip('y')
              close()
            }}
          >
            <FlipVertical2 size={16} /> Flip vertical
          </button>
        </div>
      )}
    >
      <Button size={SIZE.compact} kind={KIND.tertiary}>
        Flip
      </Button>
    </StatefulPopover>
  )
}

export default Flip
