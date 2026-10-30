import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { color, font, radius } from '@/theme/tokens'
import {
  dragHeight,
  releaseVelocity,
  resolveMenuDrag,
  resolveSnap,
  SheetSnap,
  snapHeight,
} from './sheetMath'

/**
 * Phone bottom sheet (portal to <body>).
 *  - variant "panel": snaps at ~45% (stage stays visible and usable above; not
 *    modal) and ~92% (modal: backdrop, tap it to close, focus is trapped).
 *  - variant "menu": content height up to 92%, always modal.
 * Drag the handle/header to resize; drag down (or flick) to dismiss. Esc
 * closes; focus moves into the sheet on open and back to the opener on close.
 */
export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  variant?: 'panel' | 'menu'
  children?: ReactNode
}

export const SHEET_Z = 1100

function useViewportHeight(): number {
  const read = () => Math.round(window.visualViewport?.height || window.innerHeight)
  const [h, setH] = useState(read)
  useEffect(() => {
    const update = () => setH(read())
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])
  return h
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

function Sheet({ onClose, title, variant = 'panel', children }: Omit<BottomSheetProps, 'open'>) {
  const vh = useViewportHeight()
  const isPanel = variant === 'panel'
  const [snap, setSnap] = useState<SheetSnap>('half')
  const [dy, setDy] = useState<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startHeight: number; samples: { y: number; t: number }[] } | null>(null)
  const dragged = useRef(false)
  const modal = !isPanel || snap === 'full'
  const titleId = useRef(`mfa-sheet-${Math.random().toString(36).slice(2, 8)}`).current

  // focus in on open, back to the opener on close
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    sheetRef.current?.focus({ preventScroll: true })
    return () => {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [])

  // Esc closes; Tab stays inside while modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const sheet = sheetRef.current
      if (!sheet) return
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !modal || !sheet.contains(document.activeElement)) return
      const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const lastItem = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal, onClose])

  const baseHeight = isPanel ? snapHeight(snap, vh) : sheetRef.current?.offsetHeight || 0

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-sheet-nodrag]')) return
    drag.current = { startY: e.clientY, startHeight: baseHeight, samples: [{ y: e.clientY, t: e.timeStamp }] }
    dragged.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const delta = e.clientY - d.startY
    if (Math.abs(delta) > 4) dragged.current = true
    d.samples.push({ y: e.clientY, t: e.timeStamp })
    if (d.samples.length > 12) d.samples.shift()
    setDy(delta)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const delta = e.clientY - d.startY
    const v = releaseVelocity(d.samples)
    setDy(null)
    if (!dragged.current) return
    if (isPanel) {
      const result = resolveSnap(dragHeight(d.startHeight, delta, vh), v, vh)
      if (result === 'dismiss') onClose()
      else setSnap(result)
    } else if (resolveMenuDrag(delta, d.startHeight, v) === 'dismiss') {
      onClose()
    }
  }

  const sheetStyle: CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: SHEET_Z + 1,
    display: 'flex',
    flexDirection: 'column',
    background: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTop: `1px solid ${color.line2}`,
    boxShadow: '0 -8px 30px rgba(24,20,16,0.18)',
    fontFamily: font.sans,
    color: color.ink,
    outline: 'none',
    paddingBottom: 'env(safe-area-inset-bottom)',
    transitionProperty: dy === null ? 'height, transform' : 'none',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease-out',
  }
  if (isPanel) {
    sheetStyle.height = dy === null ? baseHeight : dragHeight(baseHeight, dy, vh)
  } else {
    sheetStyle.maxHeight = snapHeight('full', vh)
    sheetStyle.transform = `translateY(${Math.max(0, dy || 0)}px)`
  }

  return (
    <div className="mfa-editor">
      {modal && (
        <div
          aria-hidden="true"
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: SHEET_Z, background: 'rgba(24,20,16,0.32)' }}
        />
      )}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal={modal}
        aria-labelledby={titleId}
        tabIndex={-1}
        className="mfa-sheet"
        style={sheetStyle}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ flex: 'none', touchAction: 'none', cursor: 'grab', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
            {isPanel ? (
              <button
                type="button"
                aria-label={snap === 'full' ? 'Collapse sheet' : 'Expand sheet'}
                onClick={() => {
                  if (!dragged.current) setSnap(s => (s === 'full' ? 'half' : 'full'))
                }}
                style={handleBtn}
              >
                <span style={handleBar} />
              </button>
            ) : (
              <span aria-hidden="true" style={{ ...handleBar, margin: '6px 0' }} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px 4px 16px', minHeight: 44 }}>
            <h2
              id={titleId}
              style={{ flex: 1, minWidth: 0, margin: 0, fontFamily: font.serif, fontWeight: 600, fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {title}
            </h2>
            <button type="button" data-sheet-nodrag aria-label="Close" onClick={onClose} style={closeBtn}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div
          className="mfa-sheet-body"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            overflowY: isPanel ? 'hidden' : 'auto',
            borderTop: `1px solid ${color.line}`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const handleBtn: CSSProperties = {
  width: 64,
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
}

const handleBar: CSSProperties = {
  display: 'block',
  width: 40,
  height: 4,
  borderRadius: 4,
  background: color.line2,
}

const closeBtn: CSSProperties = {
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  borderRadius: radius.md,
  color: color.ink2,
  cursor: 'pointer',
}

export default function BottomSheet({ open, ...rest }: BottomSheetProps) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(<Sheet {...rest} />, document.body)
}

/** A full-width row (≥ 52 px tap target) for menu sheets. */
export const sheetRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  width: '100%',
  minHeight: 52,
  padding: '0 18px',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${color.line}`,
  fontFamily: font.sans,
  fontSize: 15,
  fontWeight: 500,
  color: color.ink,
  textAlign: 'left',
  cursor: 'pointer',
}
