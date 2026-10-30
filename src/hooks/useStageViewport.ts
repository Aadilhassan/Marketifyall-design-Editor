import { useEffect } from 'react'
import { getFabricCanvas } from '@/utils/magicResize'
import { log } from '@/lib/logger'
import { fabric } from 'fabric'
import { clampPan } from '@/utils/viewport'
import { applyTouchControlSizing, attachTouchGestures } from '@/scenes/Editor/mobile/touchGestures'
import { isCoarsePointer } from './useBreakpoint'
import { decideSpaceRelease, SPACE_TAP_EVENT } from '@/scenes/Editor/components/timeline/keys'

/**
 * One owner for the stage view (zoom + pan), so layout changes never make the
 * page jump around:
 *  - "fit" mode (default): the page re-fits once, on the next frame, whenever
 *    the stage changes size (drawer, timeline dock, window, rotation);
 *  - "manual" mode (after any user zoom): size changes keep the zoom and the
 *    SDK's own resize keeps the view centred — no re-fit.
 * Every zoom path (toolbar, Ctrl+0/+/-, wheel) goes through the SDK's
 * zoomHandler, so wrapping it is what tracks the mode.
 *
 * Also replaces the SDK's wheel handling: Ctrl/⌘+wheel and trackpad pinch zoom
 * around the cursor; plain wheel / Shift+wheel pan; Space+drag or middle-drag
 * pan. Panning is clamped so part of the page always stays on screen.
 *
 * Space: a short tap (no pan in between) fires `SPACE_TAP_EVENT` on window —
 * the timeline turns that into play/pause when the design has one; holding
 * Space and dragging pans and never toggles playback (decideSpaceRelease).
 *
 * Touch: two-finger pinch/pan and long-press → context menu (see
 * mobile/touchGestures), and finger-sized handles on coarse pointers.
 */
export type ViewMode = 'fit' | 'manual'

export const getViewMode = (editor: any): ViewMode => (editor?.__viewMode as ViewMode) || 'fit'

export default function useStageViewport(editor: any) {
  useEffect(() => {
    const ed = editor as any
    const zoom = ed?.handlers?.zoomHandler
    const canvas = getFabricCanvas(ed)
    if (!zoom || !canvas?.wrapperEl || ed.__stageViewport) return
    ed.__stageViewport = true
    ed.__viewMode = 'fit'

    const setMode = (mode: ViewMode) => {
      if (ed.__viewMode === mode) return
      ed.__viewMode = mode
      canvas.fire('viewport:mode', { mode })
    }
    // zoomToFit/zoomIn/… all call zoomToPoint internally: only the outermost
    // call decides the mode, otherwise every fit would flip back to manual.
    let depth = 0
    const wrap = (name: string, mode: ViewMode) => {
      const original = zoom[name]
      if (typeof original !== 'function') return
      zoom[name] = function (...args: any[]) {
        if (depth === 0) setMode(mode)
        depth += 1
        try {
          return original.apply(this, args)
        } finally {
          depth -= 1
          if (depth === 0) canvas.fire('viewport:changed')
        }
      }
    }
    wrap('zoomToFit', 'fit')
    // The SDK's zoomToFit only rescales around the canvas centre and assumes the
    // page is already centred — after a big resize (desktop → phone, rotation)
    // the page ends up off to one side. Re-centre it after every fit.
    const fitOriginal = zoom.zoomToFit
    zoom.zoomToFit = function (...args: any[]) {
      const r = fitOriginal.apply(this, args)
      const f = canvas.getObjects().find((o: any) => o.type === 'Frame')
      if (f) {
        const b = f.getBoundingRect(true, true)
        const vpt = canvas.viewportTransform.slice()
        vpt[4] = canvas.getWidth() / 2 - (b.left + b.width / 2) * vpt[0]
        vpt[5] = canvas.getHeight() / 2 - (b.top + b.height / 2) * vpt[3]
        canvas.setViewportTransform(vpt)
        canvas.requestRenderAll()
      }
      return r
    }
    ;['zoomIn', 'zoomOut', 'zoomToOne', 'zoomToRatio', 'zoomToPoint'].forEach(n => wrap(n, 'manual'))

    const frame = (): any => canvas.getObjects().find((o: any) => o.type === 'Frame')
    const applyPanClamp = () => {
      const f = frame()
      if (!f) return
      const vpt = canvas.viewportTransform
      const next = clampPan(vpt, f.getBoundingRect(true, true), { width: canvas.getWidth(), height: canvas.getHeight() })
      if (next[4] !== vpt[4] || next[5] !== vpt[5]) canvas.setViewportTransform(next)
    }

    // --- size changes: one re-fit per frame, only in fit mode -----------------
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        try {
          if (getViewMode(ed) === 'fit') zoom.zoomToFit()
          else applyPanClamp()
          canvas.fire('viewport:changed')
        } catch (err) {
          log.warn('viewport', 'stage resize handling failed', err)
        }
      })
    }
    const stage = canvas.wrapperEl.parentElement as HTMLElement
    const ro = new ResizeObserver(onResize)
    ro.observe(stage)

    // --- wheel: zoom around the cursor / pan (replaces the SDK handlers) ------
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation() // capture phase on the wrapper: fabric/SDK never see it
      const rect = canvas.upperCanvasEl.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        // trackpad pinch arrives as ctrl+wheel with small deltas
        const point = new fabric.Point(e.clientX - rect.left, e.clientY - rect.top)
        zoom.zoomToPoint(point, canvas.getZoom() * Math.exp(-e.deltaY * 0.0025))
      } else {
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY
        const vpt = canvas.viewportTransform.slice()
        vpt[4] -= dx
        vpt[5] -= dy
        canvas.setViewportTransform(vpt)
        applyPanClamp()
      }
      canvas.requestRenderAll()
      canvas.fire('viewport:changed')
    }
    canvas.wrapperEl.addEventListener('wheel', onWheel, { capture: true, passive: false })

    // --- Space+drag / middle-drag pan -------------------------------------------
    let spaceDown = false
    let spaceDownAt = 0
    let spacePanned = false
    let panning: { x: number; y: number } | null = null
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      // defaultPrevented: a focused control already used this Space (e.g. activating a panel item).
      if (e.code !== 'Space' || e.defaultPrevented || isTyping(e.target) || canvas.getActiveObject()?.isEditing) return
      if (!spaceDown) {
        spaceDown = true
        spaceDownAt = performance.now()
        spacePanned = false
        canvas.defaultCursor = 'grab'
        canvas.setCursor('grab')
      }
      e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (spaceDown && decideSpaceRelease({ heldMs: performance.now() - spaceDownAt, panned: spacePanned || !!panning }) === 'tap') {
        window.dispatchEvent(new CustomEvent(SPACE_TAP_EVENT))
      }
      spaceDown = false
      canvas.defaultCursor = 'default'
      canvas.setCursor('default')
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!(spaceDown || e.button === 1)) return
      if (spaceDown) spacePanned = true
      e.preventDefault()
      e.stopPropagation()
      panning = { x: e.clientX, y: e.clientY }
      canvas.setCursor('grabbing')
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!panning) return
      const vpt = canvas.viewportTransform.slice()
      vpt[4] += e.clientX - panning.x
      vpt[5] += e.clientY - panning.y
      panning = { x: e.clientX, y: e.clientY }
      canvas.setViewportTransform(vpt)
      applyPanClamp()
      canvas.requestRenderAll()
      canvas.fire('viewport:changed')
    }
    const onPointerUp = () => {
      if (!panning) return
      panning = null
      canvas.setCursor(spaceDown ? 'grab' : 'default')
    }
    canvas.wrapperEl.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    // --- touch: pinch / two-finger pan / long-press ---------------------------
    if (isCoarsePointer()) applyTouchControlSizing()
    const detachTouch = attachTouchGestures(canvas, zoom, { clampPan: applyPanClamp })

    return () => {
      detachTouch()
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.wrapperEl?.removeEventListener('wheel', onWheel, { capture: true } as any)
      canvas.wrapperEl?.removeEventListener('pointerdown', onPointerDown, { capture: true } as any)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      ed.__stageViewport = false
    }
  }, [editor])
}
