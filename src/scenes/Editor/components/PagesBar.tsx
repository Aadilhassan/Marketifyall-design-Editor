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
} from 'lucide-react'

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

function PagesBar({ pages, activePage, onSelect, onAdd, onAddTyped, onDuplicate, onDelete }: Props) {
  const [showTypes, setShowTypes] = useState(false)
  if (!pages || pages.length === 0) return null

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '10px 14px',
        background: '#f1f2f6',
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
              title={`Page ${i + 1}`}
              style={{
                position: 'relative',
                flex: '0 0 auto',
                width: 92,
                height: 62,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#ffffff',
                cursor: 'pointer',
                border: '2px solid ' + (active ? '#7c3aed' : '#e5e7eb'),
                boxShadow: active ? '0 0 0 2px rgba(124,58,237,0.25)' : '0 1px 2px rgba(0,0,0,0.06)',
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
                  fontSize: 11,
                  fontWeight: 700,
                  color: active ? '#7c3aed' : '#9ca3af',
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
        <div style={{ display: 'flex', alignItems: 'stretch', height: 62, borderRadius: 8, overflow: 'hidden', background: '#e5e7eb' }}>
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
                borderRadius: 14,
                boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
                border: '1px solid #eef2f7',
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
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#374151', textAlign: 'center', lineHeight: 1.1 }}>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        .mfa-page-card:hover .mfa-page-actions{display:flex!important}
        .mfa-type-tile:hover{border-color:#c7d2fe!important;background:#f8fafc!important}
      `}</style>
    </div>
  )
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
  color: '#4b5563',
  cursor: 'pointer',
}

export default PagesBar
