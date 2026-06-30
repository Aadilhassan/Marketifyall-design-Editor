import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import {
  LayoutTemplate,
  Sparkles,
  Presentation as PresentationIcon,
  Share2,
  Video as VideoIcon,
  Printer,
  FileText,
  PenTool,
  Table2,
  Ruler,
  Upload as UploadIcon,
  MoreHorizontal,
} from 'lucide-react'
import { Project, listProjects, createProject, deleteProject, duplicateProject, patchProject } from '@/utils/projectStore'
import CreateModal from './CreateModal'
import '../../styles/editorial.css'

interface QuickCategory {
  id: string
  label: string
  Icon: React.ComponentType<any>
  color: string
  w?: number
  h?: number
  panel?: string // open the editor focused on this tool panel
  modal?: boolean // open the full format picker instead of creating directly
  upload?: boolean // pick an image and start a design with it
}

// Canva-style quick-start categories (Website intentionally excluded). Each one
// is functional: it either opens the format picker, creates a correctly-sized
// design focused on the relevant tool, or runs the image-upload flow.
const QUICK_CATEGORIES: QuickCategory[] = [
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate, color: '#6366f1', w: 1080, h: 1080, panel: 'Templates' },
  { id: 'magic', label: 'Magic Layers', Icon: Sparkles, color: '#a855f7', w: 1080, h: 1080, panel: 'AI Studio' },
  { id: 'presentation', label: 'Presentation', Icon: PresentationIcon, color: '#f97316', w: 1920, h: 1080, panel: 'Templates' },
  { id: 'social', label: 'Social media', Icon: Share2, color: '#ef4444', w: 1080, h: 1080, panel: 'Templates' },
  { id: 'video', label: 'Video', Icon: VideoIcon, color: '#d946ef', w: 1920, h: 1080, panel: 'Video' },
  { id: 'print', label: 'Print Shop', Icon: Printer, color: '#8b5cf6', w: 2480, h: 3508, panel: 'Templates' },
  { id: 'doc', label: 'Doc', Icon: FileText, color: '#06b6d4', w: 816, h: 1056, panel: 'Text' },
  { id: 'whiteboard', label: 'Whiteboard', Icon: PenTool, color: '#10b981', w: 1920, h: 1080, panel: 'Elements' },
  { id: 'sheet', label: 'Sheet', Icon: Table2, color: '#3b82f6', w: 1600, h: 900, panel: 'Elements' },
  { id: 'custom', label: 'Custom size', Icon: Ruler, color: '#6b7280', modal: true },
  { id: 'upload', label: 'Upload', Icon: UploadIcon, color: '#0ea5e9', upload: true },
  { id: 'more', label: 'More', Icon: MoreHorizontal, color: '#6b7280', modal: true },
]

const formatWhen = (ts: number): string => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function Projects() {
  const history = useHistory()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const creatingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    listProjects()
      .then(items => {
        setProjects(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openProject = (id: string) => history.push(`/design/${id}/edit`)

  const handleCreate = async (name: string, width: number, height: number, panel?: string) => {
    if (creatingRef.current) return
    creatingRef.current = true
    try {
      const p = await createProject(name, { width, height })
      const q = panel ? `?panel=${encodeURIComponent(panel)}` : ''
      history.push(`/design/${p.id}/edit${q}`)
    } catch {
      creatingRef.current = false
    }
  }

  const quickCreate = (c: QuickCategory) => {
    if (c.upload) {
      fileInputRef.current?.click()
      return
    }
    if (c.modal || !c.w || !c.h) {
      setShowCreate(true)
      return
    }
    handleCreate(c.label, c.w, c.h, c.panel)
  }

  // Upload flow: pick an image, downscale it, hand it to the editor (via
  // sessionStorage) and open a new design sized to the image.
  const onUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = '' // allow re-picking the same file later
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        const cap = 1600
        const scale = Math.min(1, cap / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
        const w = Math.max(1, Math.round((img.naturalWidth || 1080) * scale))
        const h = Math.max(1, Math.round((img.naturalHeight || 1080) * scale))
        let stored = dataUrl
        try {
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const ctx = c.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h)
            stored = c.toDataURL('image/png')
          }
        } catch {
          /* keep original */
        }
        try {
          sessionStorage.setItem('mfa:pendingUpload', stored)
        } catch {
          /* image too large for sessionStorage — design still opens */
        }
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'Uploaded image'
        handleCreate(baseName, w, h)
      }
      img.onerror = () => handleCreate('Uploaded image', 1080, 1080)
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    await deleteProject(id)
    refresh()
  }

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await duplicateProject(id)
    refresh()
  }

  const startRename = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation()
    setEditingId(p.id)
    setDraftName(p.name)
  }

  const commitRename = async (id: string) => {
    await patchProject(id, { name: draftName.trim() || 'Untitled design' })
    setEditingId(null)
    refresh()
  }

  return (
    <div className="ed-page" style={{ paddingBottom: 60 }}>
      <div className="grain" aria-hidden="true" />
      <div className="topbar" aria-hidden="true" />

      {/* masthead */}
      <header className="masthead">
        <div className="wrap row">
          <span className="logo" style={{ cursor: 'pointer' }} onClick={() => history.push('/')}>
            Marketify<i>all</i>
          </span>
          <span className="folio" style={{ marginLeft: 'auto' }}>
            MY PROJECTS · {projects.length} {projects.length === 1 ? 'DESIGN' : 'DESIGNS'}
          </span>
          <span className="cta" onClick={() => setShowCreate(true)}>
            New design <span className="ar">↗</span>
          </span>
        </div>
      </header>

      {/* quick-start categories */}
      <section className="wrap" style={{ paddingTop: 30 }}>
        <div className="shead" style={{ paddingBottom: 6 }}>
          <span className="no">№ 00</span>
          <h2>What will you design today?</h2>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            padding: '18px 2px 8px',
          }}
        >
          {QUICK_CATEGORIES.map(c => {
            const Icon = c.Icon
            return (
              <button
                key={c.id}
                onClick={() => quickCreate(c)}
                className="quick-cat"
                title={c.w && c.h ? `${c.label} · ${c.w}×${c.h}` : c.label}
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  width: 84,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                  fontFamily: 'var(--sans)',
                }}
              >
                <span
                  className="quick-cat-ic"
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    border: `1px solid ${c.color}33`,
                    background: `${c.color}1A`,
                    color: c.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border-color .14s, transform .14s, box-shadow .14s',
                  }}
                >
                  <Icon size={24} color={c.color} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{c.label}</span>
              </button>
            )
          })}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onUploadFile}
          style={{ display: 'none' }}
        />
        <style>{`.quick-cat:hover .quick-cat-ic{transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,0.10)}`}</style>
      </section>

      <main className="wrap" style={{ paddingTop: 24 }}>
        <div className="shead" style={{ paddingTop: 12 }}>
          <span className="no">№ 01</span>
          <h2>Your projects</h2>
          <span className="meta">Saved on this device</span>
        </div>

        {loading ? (
          <div style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', padding: '60px 0', textAlign: 'center' }}>
            Loading…
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 16px', borderTop: '1px solid var(--rule)', marginTop: 12 }}>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 700, fontSize: 28, marginBottom: 10 }}>
              Nothing here yet.
            </div>
            <div style={{ color: 'var(--ink2)', marginBottom: 24 }}>
              Start your first design — it&rsquo;s saved here automatically as you work.
            </div>
            <span className="btn" onClick={() => setShowCreate(true)}>
              New design <span className="ar">↗</span>
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 18,
              marginTop: 18,
            }}
          >
            {/* new design tile */}
            <button onClick={() => setShowCreate(true)} className="proj-new" style={newTileStyle}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--accent)' }}>+</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                New design
              </span>
            </button>

            {projects.map(p => (
              <div key={p.id} onClick={() => openProject(p.id)} className="proj-card" style={cardStyle}>
                <div style={thumbStyle}>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>No preview</span>
                  )}
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  {editingId === p.id ? (
                    <input
                      autoFocus
                      value={draftName}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setDraftName(e.target.value)}
                      onBlur={() => commitRename(p.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--serif)',
                        fontWeight: 600,
                        fontSize: 16,
                        border: '2px solid var(--accent)',
                        background: 'var(--paper)',
                        padding: '3px 6px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontFamily: 'var(--serif)',
                        fontWeight: 600,
                        fontSize: 17,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    {p.frame ? `${p.frame.width}×${p.frame.height} · ` : ''}Edited {formatWhen(p.updatedAt)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <SmallAction label="Rename" onClick={e => startRename(e, p)} />
                    <SmallAction label="Duplicate" onClick={e => handleDuplicate(e, p.id)} />
                    <SmallAction label="Delete" danger onClick={e => handleDelete(e, p.id, p.name)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

      <style>{`
        .proj-card:hover{border-color:var(--accent)!important}
        .proj-new:hover{border-color:var(--accent)!important;color:var(--accent)!important}
      `}</style>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--paper)',
  border: '2px solid var(--ink)',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'border-color .14s',
}

const thumbStyle: React.CSSProperties = {
  aspectRatio: '4 / 3',
  background: 'var(--paper2)',
  borderBottom: '2px solid var(--ink)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const newTileStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  minHeight: 200,
  background: 'var(--paper)',
  border: '2px dashed var(--ink)',
  color: 'var(--ink)',
  cursor: 'pointer',
  transition: 'border-color .14s, color .14s',
}

const SmallAction = ({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: (e: React.MouseEvent) => void
  danger?: boolean
}) => (
  <button
    onClick={onClick}
    style={{
      fontFamily: 'var(--mono)',
      fontSize: 11,
      letterSpacing: '.04em',
      textTransform: 'uppercase',
      padding: '4px 8px',
      border: '1px solid var(--rule2)',
      background: 'transparent',
      color: danger ? 'var(--accent)' : 'var(--ink2)',
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
)

export default Projects
