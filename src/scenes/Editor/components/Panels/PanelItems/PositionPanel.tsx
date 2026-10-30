import { ReactNode, useEffect, useState } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { fabric } from 'fabric'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  ArrowDown,
  ArrowUp,
  BringToFront,
  Link2,
  Link2Off,
  SendToBack,
  X,
} from 'lucide-react'
import useAppContext from '@/hooks/useAppContext'
import { color, font, radius } from '@/theme/tokens'
import { log } from '@/lib/logger'
import { sendBackwardsSafe, sendToBackSafe } from '@/utils/layering'
import { AlignMode, Axis, Box, Delta, alignBoxes, distributeBoxes, unionBox } from '@/utils/arrange'
import { EmptyNote, KitButton, PanelBody, PanelHeader, PanelRoot, SectionLabel, TextField, Tile } from '../PanelKit'

const LIVE_EVENTS = ['object:moving', 'object:scaling', 'object:rotating', 'object:modified']

const Grid = styled('div', ({ $cols }: { $cols: number }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${$cols}, 1fr)`,
  gap: '8px',
}))

const FieldLabel = styled('label', {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '11.5px',
  color: color.muted,
})

const LockButton = styled('button', ({ $on }: { $on: boolean }) => ({
  alignSelf: 'end',
  height: '36px',
  width: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $on ? color.ink : color.line2,
  background: $on ? color.paper : color.white,
  color: color.ink,
  cursor: 'pointer',
}))

const ALIGN: { mode: AlignMode; label: string; icon: ReactNode }[] = [
  { mode: 'top', label: 'Top', icon: <AlignStartHorizontal size={16} /> },
  { mode: 'middle', label: 'Middle', icon: <AlignCenterHorizontal size={16} /> },
  { mode: 'bottom', label: 'Bottom', icon: <AlignEndHorizontal size={16} /> },
  { mode: 'left', label: 'Left', icon: <AlignStartVertical size={16} /> },
  { mode: 'center', label: 'Center', icon: <AlignCenterVertical size={16} /> },
  { mode: 'right', label: 'Right', icon: <AlignEndVertical size={16} /> },
]

const isPageObj = (o: any) =>
  !!o && (o.type === 'Frame' || o.type === 'Background' || o.type === 'StaticFrame' || o.name === 'clip' || o.id === 'clip')

const sceneBox = (o: any): Box => {
  o.setCoords()
  const r = o.getBoundingRect(true, true)
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

const isSelection = (o: any) => o?.type === 'activeSelection' && typeof o.getObjects === 'function'
const isTextbox = (o: any) => !!o && !isSelection(o) && o instanceof fabric.Textbox

/** Normalise degrees to -180..180. */
const normAngle = (a: number) => {
  const n = ((((a + 180) % 360) + 360) % 360) - 180
  return n === -180 ? 180 : n
}

/** Numeric input that edits a local draft and commits on blur / Enter. */
function NumField({
  label,
  value,
  onCommit,
  disabled,
  suffix,
}: {
  label: string
  value: number
  onCommit: (n: number) => void
  disabled?: boolean
  suffix?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(Math.round(value))
  const commit = () => {
    if (draft === null) return
    const n = Number(draft)
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(n) && n !== Math.round(value)) onCommit(n)
  }
  return (
    <FieldLabel>
      {label}
      <div style={{ position: 'relative' }}>
        <TextField
          type="number"
          inputMode="decimal"
          value={shown}
          disabled={disabled}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setDraft(null)
          }}
          style={{ fontFamily: font.mono, opacity: disabled ? 0.5 : 1, paddingRight: suffix ? 22 : 10 }}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 8, top: 10, fontSize: 11, color: color.muted, pointerEvents: 'none' }}>{suffix}</span>
        )}
      </div>
    </FieldLabel>
  )
}

function PositionPanel() {
  const editor = useEditor() as any
  const { activeObject } = useEditorContext() as any
  const { setActiveSubMenu } = useAppContext()
  const [, setTick] = useState(0)
  const [aspectLocked, setAspectLocked] = useState(true)

  const canvas = editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas
  const target = activeObject && !isPageObj(activeObject) ? activeObject : null
  const members: any[] = target ? (isSelection(target) ? target.getObjects() : [target]) : []
  const multi = members.length > 1

  // Re-read geometry while the object is dragged / scaled / rotated on canvas.
  useEffect(() => {
    if (!canvas?.on) return
    const bump = () => setTick(t => t + 1)
    LIVE_EVENTS.forEach(ev => canvas.on(ev, bump))
    return () => LIVE_EVENTS.forEach(ev => canvas.off(ev, bump))
  }, [canvas])

  const frame = canvas?.getObjects?.().find((o: any) => o.type === 'Frame')
  const pageBox: Box | null = frame ? sceneBox(frame) : null

  const finish = (modified: any) => {
    modified?.setCoords?.()
    canvas.requestRenderAll()
    canvas.fire('object:modified', { target: modified })
    setTick(t => t + 1)
  }

  /**
   * Move members by deltas in scene space, then restore the selection. Locked
   * items still count as an alignment reference (like Canva) but never move.
   */
  const moveMembers = (objs: any[], deltas: Delta[]) => {
    objs.forEach((o, i) => {
      if (o.locked || o.lockMovementX || o.lockMovementY) return
      o.set({ left: o.left + deltas[i].dx, top: o.top + deltas[i].dy })
      o.setCoords()
    })
  }

  /**
   * Run `fn` on the members with coordinates in scene space. For a multi
   * selection the active selection is dissolved first (children of an
   * ActiveSelection are stored relative to it) and rebuilt afterwards.
   */
  const withMembers = (fn: (objs: any[]) => void) => {
    if (!canvas || !target) return
    try {
      if (!multi) {
        fn([target])
        finish(target)
        return
      }
      const objs = [...members]
      canvas.discardActiveObject()
      fn(objs)
      const sel = new fabric.ActiveSelection(objs, { canvas })
      canvas.setActiveObject(sel)
      canvas.fire('selection:updated', { target: sel, selected: objs })
      finish(sel)
    } catch (err) {
      log.warn('position', 'failed to arrange selection', err)
    }
  }

  const align = (mode: AlignMode) =>
    withMembers(objs => {
      const boxes = objs.map(sceneBox)
      const ref = multi ? unionBox(boxes) : pageBox
      if (!ref) return
      moveMembers(objs, alignBoxes(boxes, mode, ref))
    })

  const distribute = (axis: Axis) => withMembers(objs => moveMembers(objs, distributeBoxes(objs.map(sceneBox), axis)))

  const layer = (action: 'forward' | 'front' | 'backward' | 'back') => {
    if (!canvas || !target) return
    try {
      if (action === 'forward') editor.bringForward()
      else if (action === 'front') editor.bringToFront()
      else {
        const all = canvas.getObjects()
        // Selection members live in canvas._objects. Back: move the top-most first so
        // the group's internal order survives; backward: bottom-most first.
        const ordered = [...members].sort((a, b) => all.indexOf(a) - all.indexOf(b))
        if (action === 'back') ordered.reverse().forEach(o => sendToBackSafe(canvas, o))
        else
          ordered.forEach(o => {
            const objs = canvas.getObjects()
            const below = objs[objs.indexOf(o) - 1]
            if (!members.includes(below)) sendBackwardsSafe(canvas, o)
          })
      }
      finish(target)
    } catch (err) {
      log.warn('position', 'failed to change layer order', err)
    }
  }

  // --- Advanced geometry -------------------------------------------------
  const box = target ? sceneBox(target) : null
  const width = target ? target.getScaledWidth() : 0
  const height = target ? target.getScaledHeight() : 0
  const x = box && pageBox ? box.left - pageBox.left : box?.left || 0
  const y = box && pageBox ? box.top - pageBox.top : box?.top || 0
  const angle = target ? normAngle(target.angle || 0) : 0
  const textbox = isTextbox(target)

  const edit = (fn: (o: any) => void) => {
    if (!canvas || !target) return
    try {
      fn(target)
      finish(target)
    } catch (err) {
      log.warn('position', 'failed to update geometry', err)
    }
  }

  const setWidth = (w: number) =>
    edit(o => {
      if (w <= 0 || !width) return
      if (textbox) {
        // Textboxes reflow: change the intrinsic width rather than stretching glyphs.
        o.set('width', w / (o.scaleX || 1))
        o.initDimensions?.()
        return
      }
      const ratio = w / width
      o.set({ scaleX: o.scaleX * ratio, ...(aspectLocked ? { scaleY: o.scaleY * ratio } : {}) })
    })

  const setHeight = (h: number) =>
    edit(o => {
      if (h <= 0 || !height) return
      const ratio = h / height
      o.set({ scaleY: o.scaleY * ratio, ...(aspectLocked ? { scaleX: o.scaleX * ratio } : {}) })
    })

  const setX = (v: number) => edit(o => o.set('left', o.left + (v - x)))
  const setY = (v: number) => edit(o => o.set('top', o.top + (v - y)))
  const setAngle = (v: number) => edit(o => o.rotate(normAngle(Math.max(-180, Math.min(180, v)))))

  return (
    <PanelRoot>
      <PanelHeader
        title="Position"
        action={
          <button
            type="button"
            aria-label="Close position"
            onClick={() => setActiveSubMenu(null as any)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: color.muted, padding: 4 }}
          >
            <X size={18} />
          </button>
        }
      />
      <PanelBody>
        {!target ? (
          <EmptyNote>Select an element to arrange, align or position it.</EmptyNote>
        ) : (
          <>
            <SectionLabel>Arrange</SectionLabel>
            <Grid $cols={2}>
              <KitButton type="button" onClick={() => layer('forward')}>
                <ArrowUp size={16} /> Forward
              </KitButton>
              <KitButton type="button" onClick={() => layer('backward')}>
                <ArrowDown size={16} /> Backward
              </KitButton>
              <KitButton type="button" onClick={() => layer('front')}>
                <BringToFront size={16} /> To front
              </KitButton>
              <KitButton type="button" onClick={() => layer('back')}>
                <SendToBack size={16} /> To back
              </KitButton>
            </Grid>

            <SectionLabel>{multi ? 'Align' : 'Align to page'}</SectionLabel>
            <Grid $cols={3}>
              {ALIGN.map(a => (
                <Tile key={a.mode} type="button" onClick={() => align(a.mode)} disabled={!multi && !pageBox}>
                  {a.icon}
                  {a.label}
                </Tile>
              ))}
            </Grid>

            {members.length >= 3 && (
              <>
                <SectionLabel>Distribute</SectionLabel>
                <Grid $cols={2}>
                  <KitButton type="button" onClick={() => distribute('horizontal')}>
                    <AlignHorizontalSpaceBetween size={16} /> Horizontally
                  </KitButton>
                  <KitButton type="button" onClick={() => distribute('vertical')}>
                    <AlignVerticalSpaceBetween size={16} /> Vertically
                  </KitButton>
                </Grid>
              </>
            )}

            <SectionLabel>Advanced</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: '8px', marginBottom: '10px' }}>
              <NumField label="Width" value={width} onCommit={setWidth} suffix="px" />
              <NumField label="Height" value={height} onCommit={setHeight} disabled={textbox} suffix="px" />
              <LockButton
                type="button"
                $on={aspectLocked}
                aria-pressed={aspectLocked}
                aria-label={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                title={aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                onClick={() => setAspectLocked(v => !v)}
              >
                {aspectLocked ? <Link2 size={16} /> : <Link2Off size={16} />}
              </LockButton>
            </div>
            <Grid $cols={3}>
              <NumField label="X" value={x} onCommit={setX} suffix="px" />
              <NumField label="Y" value={y} onCommit={setY} suffix="px" />
              <NumField label="Rotate" value={angle} onCommit={setAngle} suffix="°" />
            </Grid>
          </>
        )}
      </PanelBody>
    </PanelRoot>
  )
}

export default PositionPanel
