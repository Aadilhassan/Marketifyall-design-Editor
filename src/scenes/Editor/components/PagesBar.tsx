import { useState } from 'react'
import {
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  Presentation as PresentationIcon,
  Share2,
  Video as VideoIcon,
  Printer,
  FileText,
  PenTool,
  Table2,
  ChevronDown,
} from 'lucide-react'
import useBreakpoint from '@/hooks/useBreakpoint'
import BottomSheet from '@/scenes/Editor/mobile/BottomSheet'
import { color, font, radius, shadow } from '@/theme/tokens'

interface PageEntry {
  id: string
  json: any
  thumbnail?: string
}

interface Props {
  pages: PageEntry[]
  activePage: number
  onSelect: (index: number) => void
  onAdd: () => void
  onAddTyped: (width: number, height: number, starter?: string) => void
  onDuplicate: (index: number) => void
  onDelete: (index: number) => void
}

// Page types addable from the dropdown (Websites intentionally excluded).
const PAGE_TYPES: { id: string; label: string; Icon: any; color: string; w: number; h: number; starter?: string }[] = [
  { id: 'presentation', label: 'Presentation', Icon: PresentationIcon, color: '#f97316', w: 1920, h: 1080, starter: 'presentation' },
  { id: 'social', label: 'Social Media', Icon: Share2, color: '#ef4444', w: 1080, h: 1080, starter: 'social' },
  { id: 'video', label: 'Video', Icon: VideoIcon, color: '#d946ef', w: 1920, h: 1080 },
  { id: 'print', label: 'Print', Icon: Printer, color: '#8b5cf6', w: 2480, h: 3508, starter: 'poster' },
  { id: 'doc', label: 'Doc', Icon: FileText, color: '#06b6d4', w: 1240, h: 1754, starter: 'doc' },
  { id: 'whiteboard', label: 'Whiteboard', Icon: PenTool, color: '#10b981', w: 2560, h: 1440, starter: 'whiteboard' },
  { id: 'sheet', label: 'Sheet', Icon: Table2, color: '#3b82f6', w: 1600, h: 900 },
]

function PagesBar(props: Props) {
  const phone = useBreakpoint() === 'phone'
  if (!props.pages || props.pages.length === 0) return null
  return phone ? <PhonePages {...props} /> : <DesktopPagesBar {...props} />
}

function DesktopPagesBar({ pages, activePage, onSelect, onAdd, onAddTyped, onDuplicate, onDelete }: Props) {
  const [showTypes, setShowTypes] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '10px 14px',
        background: '#e9e4d8',
        borderTop: '1px solid rgba(24, 20, 16, 0.12)',
        flex: 'none',
      }}
    >
      {/* page thumbnails */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: '70vw', overflowX: 'auto', padding: '2px 2px 4px' }}>
        {pages.map((p, i) => {
          const active = i === activePage
          return (
            <div
              key={p.id}
              className="mfa-page-card"
              onClick={() => onSelect(i)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i) } }}
              role="button"
              tabIndex={0}
              aria-label={`Page ${i + 1}`}
              aria-current={active ? 'page' : undefined}
              title={`Page ${i + 1}`}
              style={{
                position: 'relative',
                flex: '0 0 auto',
                width: 92,
                height: 62,
                borderRadius: 4,
                overflow: 'hidden',
                background: '#ffffff',
                cursor: 'pointer',
                border: '2px solid ' + (active ? '#d8401c' : 'transparent'),
                boxShadow: active ? '3px 3px 0 #181410' : '0 1px 2px rgba(24,20,16,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color .14s, box-shadow .14s',
              }}
            >
              {p.thumbnail ? (
                <img src={p.thumbnail} alt={`Page ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : null}
              {/* page number */}
              <span
                style={{
                  position: 'absolute',
                  left: 4,
                  bottom: 3,
                  fontFamily: "'Space Mono', ui-monospace, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: active ? '#d8401c' : '#736d5c',
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: 4,
                  padding: '0 4px',
                  lineHeight: '15px',
                }}
              >
                {i + 1}
              </span>
              {/* hover actions */}
              <div className="mfa-page-actions" style={{ position: 'absolute', top: 3, right: 3, display: 'none', gap: 3 }}>
                <button onClick={e => { e.stopPropagation(); onDuplicate(i) }} title="Duplicate page" style={actionBtn}>
                  <Copy size={12} />
                </button>
                {pages.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); onDelete(i) }} title="Delete page" style={actionBtn}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* add controls: + (blank) and ˅ (typed) — popup anchors to this group */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', height: 62, borderRadius: 4, overflow: 'hidden', background: '#fbf9f4', border: '1px dashed rgba(24, 20, 16, 0.34)' }}>
          <button onClick={() => { setShowTypes(false); onAdd() }} title="Add page" style={addBtn}>
            <Plus size={20} />
          </button>
          <div style={{ width: 1, background: 'rgba(0,0,0,0.08)' }} />
          <button onClick={() => setShowTypes(v => !v)} title="Add a page of a type" style={{ ...addBtn, width: 34 }}>
            <ChevronUp size={16} style={{ transform: showTypes ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
        </div>

        {/* type picker popup */}
        {showTypes && (
          <>
            <div onClick={() => setShowTypes(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 41,
                background: '#ffffff',
                borderRadius: 8,
                boxShadow: '3px 3px 0 #181410',
                border: '1px solid #181410',
                padding: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 72px)',
                gap: 6,
              }}
            >
              {PAGE_TYPES.map(t => {
                const Icon = t.Icon
                return (
                  <button
                    key={t.id}
                    onClick={() => { setShowTypes(false); onAddTyped(t.w, t.h, t.starter) }}
                    className="mfa-type-tile"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      padding: '9px 4px',
                      borderRadius: 10,
                      border: '1px solid transparent',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: `${t.color}1A`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={17} color={t.color} />
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#3a352b', textAlign: 'center', lineHeight: 1.1 }}>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        .mfa-page-card:hover .mfa-page-actions{display:flex!important}
        .mfa-type-tile:hover{border-color:#181410!important;background:#fbf9f4!important}
        .mfa-page-card:focus-visible .mfa-page-actions{display:flex!important}
        @media (hover: none){
          .mfa-page-card .mfa-page-actions{display:flex!important}
          .mfa-page-card .mfa-page-actions button{width:28px!important;height:28px!important}
        }
      `}</style>
    </div>
  )
}

/**
 * Phone: a small "Page 2/3" pill floating over the stage; it opens a sheet
 * with the page thumbnails (always-visible duplicate/delete), add page and
 * the typed page picker.
 */
function PhonePages({ pages, activePage, onSelect, onAdd, onAddTyped, onDuplicate, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const pick = (fn: () => void) => () => {
    fn()
    setOpen(false)
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Page ${activePage + 1} of ${pages.length}. Show pages`}
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 36,
          padding: '0 10px 0 12px',
          borderRadius: 999,
          border: `1px solid ${color.ink}`,
          background: color.white,
          boxShadow: shadow.hard,
          fontFamily: font.mono,
          fontSize: 12,
          fontWeight: 700,
          color: color.ink,
          cursor: 'pointer',
        }}
      >
        Page {activePage + 1}/{pages.length}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Pages" variant="menu">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, padding: 14 }}>
          {pages.map((p, i) => {
            const active = i === activePage
            return (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  type="button"
                  onClick={pick(() => onSelect(i))}
                  aria-label={`Page ${i + 1}`}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    height: 96,
                    padding: 0,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                    background: color.white,
                    border: `2px solid ${active ? color.accent : color.line}`,
                    boxShadow: active ? shadow.hard : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontFamily: font.mono, fontSize: 12, color: color.muted }}>{i + 1}</span>
                  )}
                </button>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1, fontFamily: font.mono, fontSize: 11, fontWeight: 700, color: active ? color.accent : color.muted }}>
                    {i + 1}
                  </span>
                  <button type="button" onClick={() => onDuplicate(i)} aria-label={`Duplicate page ${i + 1}`} style={sheetIconBtn}>
                    <Copy size={16} />
                  </button>
                  {pages.length > 1 && (
                    <button type="button" onClick={() => onDelete(i)} aria-label={`Delete page ${i + 1}`} style={sheetIconBtn}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={pick(onAdd)}
            style={{
              height: 96,
              borderRadius: radius.sm,
              border: `1px dashed ${color.line2}`,
              background: color.surface,
              color: color.ink2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontFamily: font.sans,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={20} />
            Add page
          </button>
        </div>
        <div style={{ padding: '4px 14px 16px' }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: color.muted, marginBottom: 8 }}>
            Add a page of a type
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6 }}>
            {PAGE_TYPES.map(t => {
              const Icon = t.Icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={pick(() => onAddTyped(t.w, t.h, t.starter))}
                  style={{
                    minHeight: 64,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    borderRadius: radius.md,
                    border: `1px solid ${color.line}`,
                    background: color.white,
                    fontFamily: font.sans,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: color.ink2,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={18} color={t.color} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  )
}

const sheetIconBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: color.ink2,
  cursor: 'pointer',
  padding: 0,
}

const actionBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: 4,
  border: 'none',
  background: 'rgba(17,24,39,0.78)',
  color: '#fff',
  cursor: 'pointer',
  padding: 0,
}

const addBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 54,
  border: 'none',
  background: 'transparent',
  color: '#3a352b',
  cursor: 'pointer',
}

export default PagesBar
