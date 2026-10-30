/**
 * Layers panel (Canva "Position → Layers"): every user object on the page,
 * topmost first, with select / show-hide / lock / delete / reorder.
 */
import { DragEvent, useCallback, useEffect, useRef, useState } from 'react'
import { styled } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import {
  Boxes,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Film,
  GripVertical,
  Image as ImageGlyph,
  Lock,
  LockOpen,
  Shapes,
  Trash2,
  Type,
} from 'lucide-react'
import { color, font, radius } from '@/theme/tokens'
import { ignoreError, log } from '@/lib/logger'
import { selectObject } from '@/utils/selectObject'
import { EmptyNote, PanelBody, PanelHeader, PanelRoot } from '../PanelKit'

type AnyObj = any

const THUMB_PX = 40
const TEXT_TYPES = new Set(['StaticText', 'DynamicText', 'textbox', 'text', 'i-text'])

/** Same predicate as src/utils/layering.ts (not exported there): the page frame/background. */
const isPageObject = (o: AnyObj): boolean =>
  !!o &&
  (o.name === 'clip' ||
    o.id === 'clip' ||
    o.id === 'frame' ||
    o.id === 'background' ||
    o.type === 'Frame' ||
    o.type === 'StaticFrame' ||
    o.type === 'Background')

const isText = (o: AnyObj) => TEXT_TYPES.has(o?.type) || typeof o?.text === 'string'
const isVideo = (o: AnyObj) => !!(o?.isVideo || o?.metadata?.isVideo || o?.metadata?.videoSrc)
const isImage = (o: AnyObj) => /image/i.test(o?.type || '')
const isGroup = (o: AnyObj) => Array.isArray(o?._objects) && o._objects.length > 0

function labelFor(o: AnyObj): string {
  if (isText(o)) {
    const t = String(o.text || '').replace(/\s+/g, ' ').trim()
    if (!t) return 'Text'
    return t.length > 28 ? `${t.slice(0, 28)}…` : t
  }
  if (isVideo(o)) return 'Video'
  if (isImage(o)) return 'Image'
  if (/vector|svg/i.test(o?.type || '')) return 'Graphic'
  if (isGroup(o)) return 'Group'
  return 'Shape'
}

function FallbackIcon({ o }: { o: AnyObj }) {
  const size = 18
  if (isText(o)) return <Type size={size} />
  if (isVideo(o)) return <Film size={size} />
  if (isImage(o)) return <ImageGlyph size={size} />
  if (isGroup(o)) return <Boxes size={size} />
  return <Shapes size={size} />
}

/** Thumbnails are cached per object and dropped when that object is modified. */
const thumbCache = new WeakMap<AnyObj, string | null>()

function thumbnailFor(o: AnyObj): string | null {
  if (thumbCache.has(o)) return thumbCache.get(o) ?? null
  let url: string | null = null
  if (!isVideo(o) && typeof o?.toDataURL === 'function') {
    // Render with the frame clip off and forced visible, so the thumbnail shows
    // the object itself (the absolutely-positioned frame clip would otherwise
    // blank it once toDataURL re-centres the object on its temp canvas).
    const prevClip = o.clipPath
    const prevVisible = o.visible
    try {
      const w = o.getScaledWidth?.() || o.width || THUMB_PX
      const h = o.getScaledHeight?.() || o.height || THUMB_PX
      const multiplier = Math.min(1, (THUMB_PX * 2) / Math.max(w, h, 1))
      o.clipPath = undefined
      o.visible = true
      url = o.toDataURL({ multiplier, format: 'png' })
    } catch (err) {
      ignoreError(err, 'layer thumbnail unavailable (tainted or unrenderable object)')
      url = null
    } finally {
      o.clipPath = prevClip
      o.visible = prevVisible
    }
  }
  thumbCache.set(o, url)
  return url
}

/** Stable React keys per fabric object (ids aren't guaranteed unique). */
const layerKeys = new WeakMap<AnyObj, string>()
let keySeq = 0
function keyFor(o: AnyObj): string {
  let k = layerKeys.get(o)
  if (!k) {
    keySeq += 1
    k = `layer-${keySeq}`
    layerKeys.set(o, k)
  }
  return k
}

function getCanvas(editor: AnyObj): AnyObj {
  return editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas || null
}

const Row = styled('div', ({ $active, $dropAbove, $dropBelow }: { $active: boolean; $dropAbove: boolean; $dropBelow: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px',
  marginBottom: '4px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $active ? color.ink : color.line,
  background: $active ? color.accentSoft : color.white,
  boxShadow: $dropAbove
    ? `inset 0 2px 0 ${color.accent}`
    : $dropBelow
      ? `inset 0 -2px 0 ${color.accent}`
      : 'none',
  ':hover': {
    borderColor: color.ink,
  },
}))

const MainButton = styled('button', {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '2px',
  background: 'transparent',
  borderWidth: 0,
  borderStyle: 'none',
  borderRadius: radius.sm,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: font.sans,
  fontSize: '12.5px',
  fontWeight: 500,
  color: color.ink,
})

const Thumb = styled('div', {
  width: `${THUMB_PX}px`,
  height: `${THUMB_PX}px`,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.sm,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line,
  background: color.paper,
  color: color.muted,
  overflow: 'hidden',
})

const Name = styled('span', ({ $dim }: { $dim: boolean }) => ({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  opacity: $dim ? 0.45 : 1,
}))

const IconBtn = styled('button', ({ $on }: { $on?: boolean }) => ({
  width: '26px',
  height: '26px',
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  borderWidth: 0,
  borderStyle: 'none',
  borderRadius: radius.sm,
  background: 'transparent',
  color: $on ? color.accent : color.muted,
  cursor: 'pointer',
  ':hover': {
    background: color.hover,
    color: color.ink,
  },
  ':disabled': {
    opacity: 0.3,
    cursor: 'default',
  },
  // finger-sized on touch screens
  '@media (pointer: coarse)': {
    width: '44px',
    height: '44px',
  },
}))

const Grip = styled('span', {
  display: 'inline-flex',
  color: color.faint,
  cursor: 'grab',
})

function Layers() {
  const editor = useEditor() as AnyObj
  const { activeObject } = useEditorContext() as AnyObj
  const canvas = getCanvas(editor)

  const [layers, setLayers] = useState<AnyObj[]>([])
  const [selected, setSelected] = useState<Set<AnyObj>>(new Set())
  const [, setTick] = useState(0)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const read = useCallback(() => {
    if (!canvas) return
    const objs: AnyObj[] = (canvas.getObjects?.() || []).filter((o: AnyObj) => !isPageObject(o))
    setLayers(objs.slice().reverse())
    const active = canvas.getActiveObject?.()
    const sel = new Set<AnyObj>()
    if (active) {
      if (active.type === 'activeSelection' && Array.isArray(active._objects)) active._objects.forEach((o: AnyObj) => sel.add(o))
      else sel.add(active)
    }
    setSelected(sel)
    setTick(t => t + 1) // names/visibility/lock live on the objects themselves
  }, [canvas])

  const schedule = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      read()
    })
  }, [read])

  useEffect(() => {
    if (!canvas?.on) return undefined
    read()
    const onModified = (e: AnyObj) => {
      const t = e?.target
      if (t) {
        thumbCache.delete(t)
        if (Array.isArray(t._objects)) t._objects.forEach((o: AnyObj) => thumbCache.delete(o))
      }
      schedule()
    }
    const events = ['object:added', 'object:removed', 'selection:created', 'selection:updated', 'selection:cleared', 'text:editing:exited']
    events.forEach(ev => canvas.on(ev, schedule))
    canvas.on('object:modified', onModified)
    return () => {
      events.forEach(ev => canvas.off?.(ev, schedule))
      canvas.off?.('object:modified', onModified)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [canvas, read, schedule])

  // Scenify's context activeObject changes on selection too — keep in step.
  useEffect(() => {
    schedule()
  }, [activeObject, schedule])

  const commit = (obj: AnyObj) => {
    canvas.requestRenderAll?.()
    canvas.fire?.('object:modified', { target: obj })
  }

  const select = (obj: AnyObj) => {
    if (!canvas || obj.visible === false) return
    selectObject(canvas, obj)
    schedule()
  }

  const toggleVisible = (obj: AnyObj) => {
    const next = obj.visible === false
    obj.set?.('visible', next)
    if (!next && selected.has(obj)) {
      canvas.discardActiveObject?.()
      canvas.fire?.('selection:cleared', {})
    }
    commit(obj)
  }

  /** Same properties the SDK's editor.lock()/unlock() set (Toolbox Lock button). */
  const toggleLock = (obj: AnyObj) => {
    const locked = !obj.locked
    const props = { hasControls: !locked, lockMovementX: locked, lockMovementY: locked, locked }
    if (Array.isArray(obj._objects)) obj._objects.forEach((child: AnyObj) => child.set?.(props))
    obj.set?.(props)
    commit(obj)
    if (selected.has(obj)) selectObject(canvas, canvas.getActiveObject?.() || obj)
  }

  const remove = (obj: AnyObj) => {
    try {
      if (selected.has(obj)) canvas.discardActiveObject?.()
      canvas.remove(obj)
      canvas.fire?.('selection:cleared', {})
      canvas.requestRenderAll?.()
      // No target: the object is gone; listeners only need to know something changed.
      canvas.fire?.('object:modified', {})
    } catch (err) {
      log.error('layers', 'could not delete layer', err)
    }
  }

  /** Move the layer at display index `from` to display index `to` (0 = top). */
  const move = (from: number, to: number) => {
    if (!canvas || from === to || to < 0 || to >= layers.length) return
    const obj = layers[from]
    const target = layers[to]
    const objects: AnyObj[] = canvas.getObjects?.() || []
    const targetIndex = objects.indexOf(target)
    if (targetIndex < 0) return
    try {
      // fabric moveTo removes then splices in, so taking the target's current
      // index lands the object exactly where the target was, in either
      // direction — and never below the frame/background.
      canvas.moveTo(obj, targetIndex)
      commit(obj)
      schedule()
    } catch (err) {
      log.error('layers', 'could not reorder layer', err)
    }
  }

  const onDragStart = (i: number) => (e: DragEvent) => {
    setDragIdx(i)
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setData('text/plain', String(i))
    } catch (err) {
      ignoreError(err, 'some browsers refuse setData during dragstart')
    }
  }
  const onDragOver = (i: number) => (e: DragEvent) => {
    if (dragIdx === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropIdx !== i) setDropIdx(i)
  }
  const onDrop = (i: number) => (e: DragEvent) => {
    e.preventDefault()
    if (dragIdx !== null) move(dragIdx, i)
    setDragIdx(null)
    setDropIdx(null)
  }
  const onDragEnd = () => {
    setDragIdx(null)
    setDropIdx(null)
  }

  return (
    <PanelRoot>
      <PanelHeader title="Layers" subtitle="Top of the list is the front of the design. Drag to reorder." />
      <PanelBody>
        {layers.length === 0 ? (
          <EmptyNote>No elements on this page yet. Add text, images or shapes and they will show up here.</EmptyNote>
        ) : (
          <div role="list" aria-label="Layers">
            {layers.map((obj, i) => {
              const thumb = thumbnailFor(obj)
              const name = labelFor(obj)
              const hidden = obj.visible === false
              const locked = !!obj.locked
              return (
                <Row
                  key={keyFor(obj)}
                  role="listitem"
                  draggable
                  onDragStart={onDragStart(i)}
                  onDragOver={onDragOver(i)}
                  onDrop={onDrop(i)}
                  onDragEnd={onDragEnd}
                  $active={selected.has(obj)}
                  $dropAbove={dropIdx === i && dragIdx !== null && dragIdx > i}
                  $dropBelow={dropIdx === i && dragIdx !== null && dragIdx < i}
                >
                  <Grip aria-hidden="true">
                    <GripVertical size={14} />
                  </Grip>
                  <MainButton
                    type="button"
                    onClick={() => select(obj)}
                    aria-label={`Select ${name}`}
                    aria-pressed={selected.has(obj)}
                    title={hidden ? 'Hidden — show it to select' : name}
                  >
                    <Thumb>{thumb ? <img src={thumb} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <FallbackIcon o={obj} />}</Thumb>
                    <Name $dim={hidden}>{name}</Name>
                  </MainButton>
                  <IconBtn type="button" aria-label={`Move ${name} up`} title="Bring forward" disabled={i === 0} onClick={() => move(i, i - 1)}>
                    <ChevronUp size={15} />
                  </IconBtn>
                  <IconBtn
                    type="button"
                    aria-label={`Move ${name} down`}
                    title="Send backward"
                    disabled={i === layers.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <ChevronDown size={15} />
                  </IconBtn>
                  <IconBtn type="button" aria-label={hidden ? `Show ${name}` : `Hide ${name}`} title={hidden ? 'Show' : 'Hide'} $on={hidden} onClick={() => toggleVisible(obj)}>
                    {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                  </IconBtn>
                  <IconBtn type="button" aria-label={locked ? `Unlock ${name}` : `Lock ${name}`} title={locked ? 'Unlock' : 'Lock'} $on={locked} onClick={() => toggleLock(obj)}>
                    {locked ? <Lock size={15} /> : <LockOpen size={15} />}
                  </IconBtn>
                  <IconBtn type="button" aria-label={`Delete ${name}`} title="Delete" onClick={() => remove(obj)}>
                    <Trash2 size={15} />
                  </IconBtn>
                </Row>
              )
            })}
          </div>
        )}
      </PanelBody>
    </PanelRoot>
  )
}

export default Layers
