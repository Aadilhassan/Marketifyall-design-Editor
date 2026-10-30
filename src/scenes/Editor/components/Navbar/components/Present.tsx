import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor } from '@nkyo/scenify-sdk'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'
import { usePageActions } from '@/contexts/PageActionsContext'
import { getFabricCanvas } from '@/utils/magicResize'
import { color, font } from '@/theme/tokens'
import { log } from '@/lib/logger'

/** Render the page (frame area only) at roughly screen resolution. */
function renderPage(editor: any): string {
  const canvas = getFabricCanvas(editor)
  const frame = canvas?.getObjects?.().find((o: any) => o.type === 'Frame')
  if (!canvas || !frame) return ''
  const box = frame.getBoundingRect(true, true)
  const vpt = canvas.viewportTransform.slice()
  const active = canvas.getActiveObject?.()
  try {
    canvas.discardActiveObject()
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    const mult = Math.min(2, Math.max(window.innerWidth / box.width, window.innerHeight / box.height))
    return canvas.toDataURL({ format: 'png', left: box.left, top: box.top, width: box.width, height: box.height, multiplier: mult })
  } catch (err) {
    log.warn('present', 'could not render page for presentation', err)
    return ''
  } finally {
    canvas.setViewportTransform(vpt)
    if (active) canvas.setActiveObject(active)
    canvas.requestRenderAll()
  }
}

const navBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  border: '1px solid rgba(243,239,228,0.25)',
  background: 'rgba(24,20,16,0.6)',
  color: '#f3efe4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

export default function Present() {
  const editor = useEditor() as any
  const pages = usePageActions()
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const count = Math.max(1, pages?.pageCount || 1)
  const index = pages?.activePage || 0

  const capture = useCallback(() => setSrc(renderPage(editor)), [editor])

  // Page switches load asynchronously; re-render once the new page has painted.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(capture, 650)
    return () => clearTimeout(t)
  }, [open, index, capture])

  const go = useCallback(
    (delta: number) => {
      const next = index + delta
      if (next < 0 || next >= count) return
      pages?.goToPage(next)
    },
    [index, count, pages],
  )

  const close = useCallback(() => {
    setOpen(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(err => log.warn('present', 'exit fullscreen failed', err))
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) go(1)
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) go(-1)
      else if (e.key === 'Escape') close()
      else return
      // Stop the editor's own arrow-nudge / delete handlers while presenting.
      e.preventDefault()
      e.stopPropagation()
    }
    const onFs = () => {
      if (!document.fullscreenElement) setOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [open, go, close])

  const start = () => {
    setSrc(renderPage(editor))
    setOpen(true)
    requestAnimationFrame(() => {
      rootRef.current?.requestFullscreen?.().catch(err => log.warn('present', 'fullscreen refused; presenting in-window', err))
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        title="Present (full screen)"
        style={{ height: 36, padding: '0 12px', borderRadius: 6, border: 'none', background: 'transparent', color: color.ink2, fontFamily: font.sans, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Play size={15} />
        Present
      </button>
      {open &&
        createPortal(
          <div
            ref={rootRef}
            role="dialog"
            aria-label="Presentation"
            style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#0d0b09', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => go(1)}
          >
            {src && <img src={src} alt={`Page ${index + 1}`} style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain', boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }} />}
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12, color: '#f3efe4', fontFamily: font.mono, fontSize: 12 }}
            >
              <button type="button" style={navBtn} onClick={() => go(-1)} disabled={index === 0} aria-label="Previous page">
                <ChevronLeft size={20} />
              </button>
              <span aria-live="polite">
                {index + 1} / {count}
              </span>
              <button type="button" style={navBtn} onClick={() => go(1)} disabled={index >= count - 1} aria-label="Next page">
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Exit presentation"
              onClick={e => {
                e.stopPropagation()
                close()
              }}
              style={{ ...navBtn, position: 'absolute', top: 18, right: 18 }}
            >
              <X size={18} />
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
