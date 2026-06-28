import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Project, listProjects, createProject, deleteProject, duplicateProject, patchProject } from '@/utils/projectStore'
import CreateModal from './CreateModal'
import '../../styles/editorial.css'

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

  const handleCreate = async (name: string, width: number, height: number) => {
    if (creatingRef.current) return
    creatingRef.current = true
    try {
      const p = await createProject(name, { width, height })
      history.push(`/design/${p.id}/edit`)
    } catch {
      creatingRef.current = false
    }
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

      <main className="wrap" style={{ paddingTop: 32 }}>
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
