import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Button } from 'baseui/button'
import { Plus } from 'baseui/icon'
import {
  Project,
  listProjects,
  createProject,
  deleteProject,
  duplicateProject,
  patchProject,
} from '@/utils/projectStore'

const formatWhen = (ts: number): string => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

const purpleButton = { BaseButton: { style: { borderRadius: '10px', background: '#7c3aed' } } }

function Projects() {
  const history = useHistory()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

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

  const creatingRef = useRef(false)
  const handleNew = async () => {
    if (creatingRef.current) return
    creatingRef.current = true
    try {
      const p = await createProject()
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
    <div style={{ minHeight: '100vh', background: '#f6f7f9', fontFamily: 'system-ui, sans-serif' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.1rem 2rem',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>My Projects</div>
        </div>
        <Button onClick={handleNew} startEnhancer={() => <Plus size={20} />} overrides={purpleButton}>
          New design
        </Button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        {loading ? (
          <div style={{ color: '#6b7280', padding: '4rem', textAlign: 'center' }}>Loading…</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#6b7280' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
              No projects yet
            </div>
            <div style={{ marginBottom: '1.5rem' }}>Create your first design — it’s saved here automatically.</div>
            <Button onClick={handleNew} startEnhancer={() => <Plus size={20} />} overrides={purpleButton}>
              New design
            </Button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => openProject(p.id)}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'box-shadow .15s ease',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <div
                  style={{
                    aspectRatio: '4 / 3',
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No preview</span>
                  )}
                </div>
                <div style={{ padding: '0.75rem' }}>
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
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        border: '1px solid #7c3aed',
                        borderRadius: 6,
                        padding: '2px 6px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>Edited {formatWhen(p.updatedAt)}</div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                    <SmallAction label="Rename" onClick={e => startRename(e, p)} />
                    <SmallAction label="Duplicate" onClick={e => handleDuplicate(e, p.id)} />
                    <SmallAction label="Delete" danger onClick={e => handleDelete(e, p.id, p.name)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
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
      fontSize: '0.72rem',
      padding: '3px 8px',
      borderRadius: 6,
      border: '1px solid #e5e7eb',
      background: '#fff',
      color: danger ? '#dc2626' : '#374151',
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
)

export default Projects
