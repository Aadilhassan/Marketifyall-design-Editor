/**
 * Canva-style rulers + draggable guides over the canvas area.
 *
 * - Shift+R (or `toggleRulers()` from a menu) shows/hides them; persisted in
 *   localStorage `mfa-rulers`.
 * - Rulers are <canvas> strips (DPR aware) with ticks in design px, 0 = page
 *   top-left. Page extent is shaded, the selection extent is an accent band.
 * - Drag from the top ruler for a horizontal guide, from the left ruler for a
 *   vertical one. Drag a guide back onto its ruler or double-click it to delete.
 * - Guides are DOM lines (crisp at any zoom; only a 7px hit strip takes pointer
 *   events, so fabric keeps working everywhere else).
 * - Guides are kept per page in a module-level map, mirrored to localStorage per
 *   design. The scenify template exporter keeps only the frame's width/height
 *   (and the Frame object is reused across pages), so frame metadata would not
 *   survive a save or a page switch.
 * - While visible, guides are published to smartGuides as snap targets.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor } from '@nkyo/scenify-sdk'
import useBreakpoint from '@/hooks/useBreakpoint'
import { color, font } from '@/theme/tokens'
import { getFabricCanvas } from '@/utils/magicResize'
import { usePageActions } from '@/contexts/PageActionsContext'
import { ignoreError } from '@/lib/logger'
import {
  addGuide,
  Axis,
  designToScreen,
  generateTicks,
  GuideSet,
  pickStep,
  removeGuide,
  sanitizeGuides,
  screenToDesign,
  setActiveGuides,
} from '@/utils/guides'

const RULER = 20
const HIT = 7
const VISIBLE_KEY = 'mfa-rulers'
const GUIDES_KEY_PREFIX = 'mfa-guides:'
export const TOGGLE_RULERS_EVENT = 'mfa:toggle-rulers'

// ---- Visibility (shared with menus) -----------------------------------------

export function isRulersVisible(): boolean {
  try {
    return localStorage.getItem(VISIBLE_KEY) === '1'
  } catch (err) {
    ignoreError(err, 'rulers: localStorage unavailable')
    return false
  }
}

/** Flip rulers on/off from anywhere (menus, shortcuts). Persists and notifies listeners. */
export function toggleRulers(): void {
  const next = !isRulersVisible()
  try {
    localStorage.setItem(VISIBLE_KEY, next ? '1' : '0')
  } catch (err) {
    ignoreError(err, 'rulers: could not persist visibility')
  }
  window.dispatchEvent(new CustomEvent(TOGGLE_RULERS_EVENT, { detail: { visible: next } }))
}

/** Current rulers visibility, kept in sync with `toggleRulers()` (e.g. for a menu checkmark). */
export function useRulersVisible(): boolean {
  const [visible, setVisible] = useState(isRulersVisible)
  useEffect(() => {
    const on = (e: Event) => setVisible(!!(e as CustomEvent).detail?.visible)
    window.addEventListener(TOGGLE_RULERS_EVENT, on)
    return () => window.removeEventListener(TOGGLE_RULERS_EVENT, on)
  }, [])
  return visible
}

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

// ---- Per-page guide storage -------------------------------------------------

const pageGuides = new Map<string, GuideSet>()

function loadGuides(design: string, page: number): GuideSet {
  const key = `${design}#${page}`
  const cached = pageGuides.get(key)
  if (cached) return cached
  let stored: GuideSet = { x: [], y: [] }
  try {
    const all = JSON.parse(localStorage.getItem(GUIDES_KEY_PREFIX + design) || '{}')
    stored = sanitizeGuides(all?.[page])
  } catch (err) {
    ignoreError(err, 'rulers: unreadable stored guides')
  }
  pageGuides.set(key, stored)
  return stored
}

function saveGuides(design: string, page: number, guides: GuideSet): void {
  pageGuides.set(`${design}#${page}`, guides)
  try {
    const storeKey = GUIDES_KEY_PREFIX + design
    let all: Record<string, GuideSet> = {}
    try {
      all = JSON.parse(localStorage.getItem(storeKey) || '{}') || {}
    } catch (parseErr) {
      ignoreError(parseErr, 'rulers: resetting corrupt stored guides')
    }
    if (guides.x.length || guides.y.length) all[page] = guides
    else delete all[page]
    if (Object.keys(all).length) localStorage.setItem(storeKey, JSON.stringify(all))
    else localStorage.removeItem(storeKey)
  } catch (err) {
    ignoreError(err, 'rulers: could not persist guides')
  }
}

// ---- View measurement -------------------------------------------------------

type Rect = { left: number; top: number; width: number; height: number }
type View = {
  /** Visible canvas-element box in root coords (rulers sit on its top/left edges). */
  box: Rect
  /** Canvas element's top-left in root coords (screen coords are relative to this). */
  offX: number
  offY: number
  vpt: number[]
  origin: { x: number; y: number }
  page: { w: number; h: number } | null
  sel: Rect | null
}

const sameView = (a: View | null, b: View) => !!a && JSON.stringify(a) === JSON.stringify(b)

function measure(canvas: any, root: HTMLElement): View | null {
  const el: HTMLElement | undefined = canvas?.upperCanvasEl || canvas?.lowerCanvasEl
  const vpt: number[] | undefined = canvas?.viewportTransform
  if (!el || !vpt) return null
  const r = el.getBoundingClientRect()
  const rr = root.getBoundingClientRect()
  const offX = r.left - rr.left
  const offY = r.top - rr.top
  const left = Math.max(0, offX)
  const top = Math.max(0, offY)
  const right = Math.min(rr.width, offX + r.width)
  const bottom = Math.min(rr.height, offY + r.height)
  if (right - left <= RULER || bottom - top <= RULER) return null

  const frame = canvas.getObjects?.().find((o: any) => o.type === 'Frame')
  const fr = frame ? frame.getBoundingRect(true, true) : null
  const origin = fr ? { x: fr.left, y: fr.top } : { x: 0, y: 0 }

  let sel: Rect | null = null
  const active = canvas.getActiveObject?.()
  if (active && active.type !== 'Frame') {
    const b = active.getBoundingRect(true, true)
    sel = { left: b.left - origin.x, top: b.top - origin.y, width: b.width, height: b.height }
  }
  return {
    box: { left, top, width: right - left, height: bottom - top },
    offX,
    offY,
    vpt: Array.from(vpt).slice(0, 6),
    origin,
    page: fr ? { w: fr.width, h: fr.height } : null,
    sel,
  }
}

// ---- Ruler drawing -----------------------------------------------------------

function drawRuler(cnv: HTMLCanvasElement | null, axis: Axis, v: View) {
  if (!cnv) return
  const horizontal = axis === 'x'
  const len = Math.max(0, (horizontal ? v.box.width : v.box.height) - RULER)
  const cssW = horizontal ? len : RULER
  const cssH = horizontal ? RULER : len
  const dpr = window.devicePixelRatio || 1
  const pw = Math.round(cssW * dpr)
  const ph = Math.round(cssH * dpr)
  if (cnv.width !== pw) cnv.width = pw
  if (cnv.height !== ph) cnv.height = ph
  cnv.style.width = `${cssW}px`
  cnv.style.height = `${cssH}px`
  const ctx = cnv.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // Ruler-local coordinate u <-> canvas-element screen coordinate.
  const shift = horizontal ? v.box.left + RULER - v.offX : v.box.top + RULER - v.offY
  const toU = (d: number) => designToScreen(d, axis, v.vpt, v.origin) - shift
  const zoom = (horizontal ? v.vpt[0] : v.vpt[3]) || 1

  ctx.fillStyle = color.paper
  ctx.fillRect(0, 0, cssW, cssH)

  // Page extent (slightly lighter) and selection band.
  const band = (a: number, b: number, fill: string) => {
    const u0 = Math.max(0, Math.min(toU(a), toU(b)))
    const u1 = Math.min(len, Math.max(toU(a), toU(b)))
    if (u1 <= u0) return
    ctx.fillStyle = fill
    if (horizontal) ctx.fillRect(u0, 0, u1 - u0, RULER)
    else ctx.fillRect(0, u0, RULER, u1 - u0)
  }
  if (v.page) band(0, horizontal ? v.page.w : v.page.h, color.surface)
  if (v.sel) {
    const a = horizontal ? v.sel.left : v.sel.top
    const b = a + (horizontal ? v.sel.width : v.sel.height)
    band(a, b, 'rgba(216, 64, 28, 0.16)')
    ctx.fillStyle = color.accent
    for (const d of [a, b]) {
      const u = Math.round(toU(d))
      if (u < 0 || u > len) continue
      if (horizontal) ctx.fillRect(u, 0, 1, RULER)
      else ctx.fillRect(0, u, RULER, 1)
    }
  }

  // Ticks + labels.
  const step = pickStep(zoom)
  const d0 = screenToDesign(shift, axis, v.vpt, v.origin)
  const d1 = screenToDesign(shift + len, axis, v.vpt, v.origin)
  const { major, minor } = generateTicks(d0, d1, step, zoom)
  ctx.fillStyle = color.line2
  for (const d of minor) {
    const u = Math.round(toU(d))
    if (horizontal) ctx.fillRect(u, RULER - 5, 1, 5)
    else ctx.fillRect(RULER - 5, u, 5, 1)
  }
  ctx.font = `9px ${font.mono}`
  for (const { pos, label } of major) {
    const u = Math.round(toU(pos))
    ctx.fillStyle = color.faint
    if (horizontal) ctx.fillRect(u, 0, 1, RULER)
    else ctx.fillRect(0, u, RULER, 1)
    ctx.fillStyle = color.muted
    if (horizontal) {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(label, u + 3, 2)
    } else {
      ctx.save()
      ctx.translate(11, u + 3)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(label, 0, 0)
      ctx.restore()
    }
  }

  // Edge toward the canvas.
  ctx.fillStyle = color.line2
  if (horizontal) ctx.fillRect(0, RULER - 1, cssW, 1)
  else ctx.fillRect(RULER - 1, 0, 1, cssH)
}

// ---- Component ---------------------------------------------------------------

type Drag = { axis: Axis; pos: number; from: number | null; overRuler: boolean; clientX: number; clientY: number }

function Rulers() {
  const editor = useEditor()
  const canvas = getFabricCanvas(editor)
  const { id: routeId } = useParams<{ id?: string }>()
  const pageActions = usePageActions()
  const design = routeId || 'local'
  const page = pageActions?.activePage ?? 0

  const [visible, setVisible] = useState(isRulersVisible)
  // Rulers need precise pointer work and screen space; not shown on phones.
  const isPhone = useBreakpoint() === 'phone'
  const [view, setView] = useState<View | null>(null)
  const [guides, setGuides] = useState<GuideSet>(() => loadGuides(design, page))
  const [drag, setDrag] = useState<Drag | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLCanvasElement>(null)
  const leftRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef<View | null>(null)
  const guidesRef = useRef(guides)
  guidesRef.current = guides
  const dragCleanupRef = useRef<(() => void) | null>(null)

  // Toggle: Shift+R and the `mfa:toggle-rulers` event.
  useEffect(() => {
    const onToggle = (e: Event) => setVisible(!!(e as CustomEvent).detail?.visible)
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.code === 'KeyR' && !isTyping(e.target)) {
        e.preventDefault()
        toggleRulers()
      }
    }
    window.addEventListener(TOGGLE_RULERS_EVENT, onToggle)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(TOGGLE_RULERS_EVENT, onToggle)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Load the guides of the current page.
  useEffect(() => {
    setGuides(loadGuides(design, page))
  }, [design, page])

  // Publish guides to smart snapping only while visible.
  useEffect(() => {
    if (!canvas) return
    setActiveGuides(canvas, visible ? guides : null)
    return () => setActiveGuides(canvas, null)
  }, [canvas, visible, guides])

  const redraw = useCallback(() => {
    const v = viewRef.current
    if (!v) return
    drawRuler(topRef.current, 'x', v)
    drawRuler(leftRef.current, 'y', v)
  }, [])

  // Track zoom/pan/page/selection changes and the container size.
  useEffect(() => {
    if (!canvas || !visible) return
    let raf = 0
    const update = () => {
      raf = 0
      const root = rootRef.current
      if (!root) return
      const next = measure(canvas, root)
      if (!next) {
        if (viewRef.current) {
          viewRef.current = null
          setView(null)
        }
        return
      }
      if (sameView(viewRef.current, next)) return
      viewRef.current = next
      setView(next)
      redraw()
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const events = ['after:render', 'selection:created', 'selection:updated', 'selection:cleared', 'object:moving', 'object:scaling']
    events.forEach(ev => canvas.on?.(ev, schedule))
    window.addEventListener('resize', schedule)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    if (ro && rootRef.current) ro.observe(rootRef.current)
    schedule()
    return () => {
      events.forEach(ev => canvas.off?.(ev, schedule))
      window.removeEventListener('resize', schedule)
      ro?.disconnect()
      if (raf) cancelAnimationFrame(raf)
      viewRef.current = null
    }
  }, [canvas, visible, redraw])

  // Canvases are (re)mounted when `view` first becomes non-null: draw them.
  useLayoutEffect(() => {
    if (view) redraw()
  }, [view, redraw])

  // Abort any in-flight drag on unmount.
  useEffect(() => () => dragCleanupRef.current?.(), [])

  const commit = useCallback(
    (next: GuideSet) => {
      setGuides(next)
      saveGuides(design, page, next)
    },
    [design, page]
  )

  const startDrag = useCallback(
    (axis: Axis, from: number | null, e: ReactPointerEvent) => {
      if (e.button !== 0 || !viewRef.current || !rootRef.current) return
      e.preventDefault()
      e.stopPropagation()
      dragCleanupRef.current?.()

      const root = rootRef.current
      const before = guidesRef.current
      const startX = e.clientX
      const startY = e.clientY
      // Existing guides only detach once the pointer really moves, so a plain
      // click (or the two clicks of a double-click) leaves the DOM untouched.
      let moved = from === null

      const posAt = (clientX: number, clientY: number): Drag => {
        const v = viewRef.current as View
        const rr = root.getBoundingClientRect()
        const local = axis === 'x' ? clientX - rr.left : clientY - rr.top
        const screen = local - (axis === 'x' ? v.offX : v.offY)
        const pos = Math.round(screenToDesign(screen, axis, v.vpt, v.origin))
        const overRuler = axis === 'x' ? local < v.box.left + RULER : local < v.box.top + RULER
        return { axis, pos, from, overRuler, clientX: clientX - rr.left, clientY: clientY - rr.top }
      }

      let current = posAt(startX, startY)
      if (moved) setDrag(current)

      const onMove = (ev: PointerEvent) => {
        if (!moved) {
          if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 3) return
          moved = true
          setGuides({ ...before, [axis]: removeGuide(before[axis], from as number) })
        }
        current = posAt(ev.clientX, ev.clientY)
        setDrag(current)
      }
      const finish = (apply: boolean) => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        dragCleanupRef.current = null
        setDrag(null)
        if (!apply || !moved) {
          setGuides(before)
          return
        }
        const base = from !== null ? removeGuide(before[axis], from) : before[axis]
        const list = current.overRuler ? base : addGuide(base, current.pos)
        const next = { ...before, [axis]: list }
        if (JSON.stringify(next) === JSON.stringify(before)) setGuides(before)
        else commit(next)
      }
      const onUp = () => finish(true)
      const onCancel = () => finish(false)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      dragCleanupRef.current = () => finish(false)
    },
    [commit]
  )

  const deleteGuide = useCallback(
    (axis: Axis, pos: number) => {
      const cur = guidesRef.current
      commit({ ...cur, [axis]: removeGuide(cur[axis], pos) })
    },
    [commit]
  )

  if (!visible || !canvas || isPhone) return null

  const rootStyle: CSSProperties = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none', zIndex: 4, overflow: 'hidden' }
  if (!view) return <div ref={rootRef} style={rootStyle} />

  const { box } = view
  const toRoot = (axis: Axis, d: number) =>
    Math.round(designToScreen(d, axis, view.vpt, view.origin) + (axis === 'x' ? view.offX : view.offY))

  const renderGuide = (axis: Axis, pos: number, key: string, dragging: boolean, faded = false) => {
    const at = toRoot(axis, pos)
    const vertical = axis === 'x'
    if (vertical ? at < box.left || at > box.left + box.width : at < box.top || at > box.top + box.height) return null
    const hit: CSSProperties = vertical
      ? { position: 'absolute', left: at - (HIT >> 1), top: box.top, width: HIT, height: box.height, cursor: 'ew-resize' }
      : { position: 'absolute', top: at - (HIT >> 1), left: box.left, height: HIT, width: box.width, cursor: 'ns-resize' }
    const line: CSSProperties = vertical
      ? { position: 'absolute', left: HIT >> 1, top: 0, width: 1, height: '100%', background: color.accent }
      : { position: 'absolute', top: HIT >> 1, left: 0, height: 1, width: '100%', background: color.accent }
    return (
      <div
        key={key}
        style={{ ...hit, pointerEvents: dragging ? 'none' : 'auto', opacity: faded ? 0.35 : 1 }}
        onPointerDown={dragging ? undefined : e => startDrag(axis, pos, e)}
        onDoubleClick={dragging ? undefined : () => deleteGuide(axis, pos)}
        title={dragging ? undefined : 'Drag to move · double-click to delete'}
      >
        <div style={{ ...line, pointerEvents: 'none' }} />
      </div>
    )
  }

  const label: CSSProperties | null = drag
    ? {
        position: 'absolute',
        left: drag.clientX + 10,
        top: drag.clientY + 10,
        padding: '2px 5px',
        borderRadius: 3,
        background: color.ink,
        color: color.paper,
        fontFamily: font.mono,
        fontSize: 10,
        lineHeight: '14px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }
    : null

  const rulerBase: CSSProperties = { position: 'absolute', display: 'block', pointerEvents: 'auto' }

  return (
    <div ref={rootRef} style={rootStyle} aria-hidden>
      {guides.x.map(p => renderGuide('x', p, `x${p}`, false))}
      {guides.y.map(p => renderGuide('y', p, `y${p}`, false))}
      {drag && renderGuide(drag.axis, drag.pos, 'drag', true, drag.overRuler)}

      <canvas
        ref={topRef}
        style={{ ...rulerBase, left: box.left + RULER, top: box.top, cursor: 'ns-resize' }}
        onPointerDown={e => startDrag('y', null, e)}
      />
      <canvas
        ref={leftRef}
        style={{ ...rulerBase, left: box.left, top: box.top + RULER, cursor: 'ew-resize' }}
        onPointerDown={e => startDrag('x', null, e)}
      />
      <div
        style={{
          ...rulerBase,
          left: box.left,
          top: box.top,
          width: RULER,
          height: RULER,
          background: color.paper,
          borderRight: `1px solid ${color.line2}`,
          borderBottom: `1px solid ${color.line2}`,
          boxSizing: 'border-box',
        }}
      />
      {drag && label && !drag.overRuler && <div style={label}>{drag.pos}</div>}
    </div>
  )
}

export default Rulers
