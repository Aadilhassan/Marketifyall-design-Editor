/**
 * Comment pins drawn over the canvas: numbered accent circles positioned from
 * page-relative design px through fabric's viewport transform, re-measured on
 * every `after:render` (zoom, pan, frame resize all trigger one).
 *
 * Rendered through a portal into the canvas area (`.mfa-editor
 * .canvas-container`, position: relative). Currently mounted by the Comments
 * panel, so pins show only while that panel is open.
 * TODO: mount from Editor.tsx so pins are always visible, like Canva.
 */
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor } from '@nkyo/scenify-sdk'
import { color, font, shadow } from '@/theme/tokens'
import { log } from '@/lib/logger'
import { DesignComment, designToScreen, insidePage, Point, screenToDesign } from '@/utils/comments'

type AnyObj = any

function getFabricCanvas(editor: AnyObj): AnyObj {
  return editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas || null
}

interface Geometry {
  /** Canvas element offset inside the container. */
  offset: Point
  frameTopLeft: Point
  frameSize: { width: number; height: number }
  vpt: number[]
}

function readGeometry(cv: AnyObj, container: HTMLElement): Geometry | null {
  const frame = cv?.getObjects?.().find((o: AnyObj) => o?.type === 'Frame')
  const el: HTMLElement | undefined = cv?.getElement?.() || cv?.lowerCanvasEl
  if (!frame || !el || !Array.isArray(cv.viewportTransform)) return null
  const tl = typeof frame.getPointByOrigin === 'function' ? frame.getPointByOrigin('left', 'top') : { x: frame.left || 0, y: frame.top || 0 }
  const elRect = el.getBoundingClientRect()
  const cRect = container.getBoundingClientRect()
  return {
    offset: { x: elRect.left - cRect.left, y: elRect.top - cRect.top },
    frameTopLeft: { x: tl.x, y: tl.y },
    frameSize: { width: (frame.width || 0) * (frame.scaleX || 1), height: (frame.height || 0) * (frame.scaleY || 1) },
    vpt: cv.viewportTransform.slice(),
  }
}

/** Topmost user object under a canvas-plane point (for comment → object anchoring). */
function objectIdAt(cv: AnyObj, canvasPoint: Point): string | undefined {
  const objs: AnyObj[] = cv?.getObjects?.() || []
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i]
    if (!o || o.type === 'Frame' || o.type === 'Background' || !o.visible) continue
    try {
      if (o.containsPoint?.(canvasPoint, null, true) && o.id) return String(o.id)
    } catch (err) {
      log.debug('comments', 'hit-test failed for object', err)
    }
  }
  return undefined
}

export interface PlacedPoint extends Point {
  objectId?: string
}

interface Props {
  comments: DesignComment[]
  numbers: Map<string, number>
  activeId: string | null
  onSelect: (id: string) => void
  /** Pin-drop mode: crosshair overlay; click places, Esc cancels. */
  placing: boolean
  onPlace: (p: PlacedPoint) => void
  onCancelPlacing: () => void
  /** Unsent comment location, shown as a hollow pin. */
  draft: Point | null
  /** Bumped by the panel to pan the active pin into view. */
  focusToken: number
}

const PIN = 26

function CommentPins({ comments, numbers, activeId, onSelect, placing, onPlace, onCancelPlacing, draft, focusToken }: Props) {
  const editor = useEditor() as AnyObj
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [geo, setGeo] = useState<Geometry | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setContainer(document.querySelector('.mfa-editor .canvas-container') as HTMLElement | null)
  }, [])

  const measure = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const cv = getFabricCanvas(editor)
      if (container && cv) setGeo(readGeometry(cv, container))
    })
  }, [editor, container])

  useEffect(() => {
    const cv = getFabricCanvas(editor)
    if (!cv?.on || !container) return
    measure()
    cv.on('after:render', measure)
    window.addEventListener('resize', measure)
    return () => {
      cv.off?.('after:render', measure)
      window.removeEventListener('resize', measure)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [editor, container, measure])

  useEffect(() => {
    if (!placing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelPlacing()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placing, onCancelPlacing])

  // Pan the active pin into view when the panel asks (thread click).
  useEffect(() => {
    if (!focusToken || !activeId || !container) return
    const cv = getFabricCanvas(editor)
    const c = comments.find(x => x.id === activeId)
    const g = cv && container ? readGeometry(cv, container) : null
    if (!c || !g || !cv) return
    const s = designToScreen(c, g.frameTopLeft, g.vpt)
    const w = cv.getWidth?.() || 0
    const h = cv.getHeight?.() || 0
    const margin = 60
    if (s.x >= margin && s.y >= margin && s.x <= w - margin && s.y <= h - margin) return
    try {
      const vpt = cv.viewportTransform.slice()
      vpt[4] += w / 2 - s.x
      vpt[5] += h / 2 - s.y
      cv.setViewportTransform(vpt)
      cv.requestRenderAll?.()
    } catch (err) {
      log.warn('comments', 'could not pan to comment pin', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken])

  const handlePlace = (e: MouseEvent<HTMLDivElement>) => {
    const cv = getFabricCanvas(editor)
    const g = cv && container ? readGeometry(cv, container) : null
    if (!g || !container) return
    const cRect = container.getBoundingClientRect()
    const local = { x: e.clientX - cRect.left - g.offset.x, y: e.clientY - cRect.top - g.offset.y }
    const p = screenToDesign(local, g.frameTopLeft, g.vpt)
    if (!insidePage(p, g.frameSize)) return // only on the page itself
    onPlace({ ...p, objectId: objectIdAt(cv, { x: p.x + g.frameTopLeft.x, y: p.y + g.frameTopLeft.y }) })
  }

  if (!container) return null

  const toLocal = (p: Point) => {
    if (!geo) return null
    const s = designToScreen(p, geo.frameTopLeft, geo.vpt)
    return { left: s.x + geo.offset.x, top: s.y + geo.offset.y }
  }

  const pinStyle = (left: number, top: number, active: boolean, hollow = false): React.CSSProperties => ({
    position: 'absolute',
    left: left,
    top: top - PIN,
    width: PIN,
    height: PIN,
    borderRadius: '50% 50% 50% 2px',
    background: hollow ? color.white : active ? color.ink : color.accent,
    color: hollow ? color.accent : color.accentInk,
    border: `2px solid ${hollow ? color.accent : color.white}`,
    boxShadow: active ? shadow.hard : shadow.pop,
    fontFamily: font.mono,
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    pointerEvents: 'auto',
    padding: 0,
    transform: active ? 'scale(1.15)' : undefined,
    transformOrigin: 'bottom left',
    transition: 'transform 0.12s',
    zIndex: active ? 2 : 1,
  })

  return createPortal(
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'hidden' }}>
      {placing && (
        <div
          role="presentation"
          onClick={handlePlace}
          style={{ position: 'absolute', inset: 0, cursor: 'crosshair', pointerEvents: 'auto', background: 'rgba(24,20,16,0.04)' }}
        >
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: color.ink,
              color: color.paper,
              fontFamily: font.sans,
              fontSize: 12.5,
              padding: '6px 12px',
              borderRadius: 999,
              pointerEvents: 'none',
            }}
          >
            Click on the page to add a comment · Esc to cancel
          </div>
        </div>
      )}
      {comments.map(c => {
        const pos = toLocal(c)
        if (!pos) return null
        return (
          <button
            key={c.id}
            type="button"
            aria-label={`Comment ${numbers.get(c.id) ?? ''} by ${c.author}`}
            title={`${c.author}: ${c.text}`}
            onClick={() => onSelect(c.id)}
            style={{ ...pinStyle(pos.left, pos.top, c.id === activeId), opacity: c.resolved ? 0.55 : 1 }}
          >
            {numbers.get(c.id) ?? ''}
          </button>
        )
      })}
      {draft &&
        (() => {
          const pos = toLocal(draft)
          return pos ? <div style={pinStyle(pos.left, pos.top, true, true)}>+</div> : null
        })()}
    </div>,
    container,
  )
}

export default CommentPins
