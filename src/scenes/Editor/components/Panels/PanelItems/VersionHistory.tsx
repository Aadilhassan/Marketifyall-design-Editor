/**
 * Version history panel (Canva Pro): named + auto-saved snapshots of the whole
 * multi-page design, stored in IndexedDB (`mfa-versions`, see utils/versions).
 * Auto versions are taken by Editor.tsx every 10 minutes while the design
 * changes; this panel lists, previews, restores, renames and deletes them.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { styled } from 'baseui'
import { Modal, ModalBody, SIZE } from 'baseui/modal'
import { Eye, History, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { usePageActions } from '@/contexts/PageActionsContext'
import { fail, log } from '@/lib/logger'
import { notify } from '@/lib/notify'
import { color, font, overline, radius } from '@/theme/tokens'
import {
  deleteVersion,
  DesignVersion,
  exactTime,
  groupByDay,
  listVersions,
  relativeTime,
  renameVersion,
  saveVersion,
  versionProjectKey,
} from '@/utils/versions'
import { EmptyNote, KitButton, PanelBody, PanelHeader, PanelRoot, SectionLabel, TextField } from '../PanelKit'

const Row = styled('div', {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  padding: '8px',
  borderRadius: radius.md,
  border: `1px solid ${color.line}`,
  background: color.white,
  marginBottom: '8px',
  ':hover': { borderColor: color.ink },
})

const Thumb = styled('button', {
  flex: 'none',
  width: '64px',
  height: '48px',
  borderRadius: radius.sm,
  border: `1px solid ${color.line}`,
  background: color.paper,
  padding: 0,
  overflow: 'hidden',
  cursor: 'zoom-in',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: color.faint,
})

const Title = styled('div', {
  fontSize: '13px',
  fontWeight: 600,
  color: color.ink,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

const Sub = styled('div', { fontSize: '11.5px', color: color.muted, marginTop: '2px' })

const IconBtn = styled('button', {
  width: '26px',
  height: '26px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: radius.sm,
  background: 'transparent',
  color: color.muted,
  cursor: 'pointer',
  ':hover': { background: color.hover, color: color.ink },
})

const StripItem = styled('button', ({ $active }: { $active: boolean }) => ({
  flex: 'none',
  width: '96px',
  height: '72px',
  padding: 0,
  borderRadius: radius.sm,
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: $active ? color.accent : color.line,
  background: color.paper,
  overflow: 'hidden',
  cursor: 'pointer',
}))

const thumbOf = (v: DesignVersion) => v.pages[v.activePage]?.thumbnail || v.pages.find(p => p.thumbnail)?.thumbnail

function VersionHistory() {
  const pageActions = usePageActions()
  if (!pageActions) {
    return (
      <PanelRoot>
        <PanelHeader title="Version history" />
        <PanelBody>
          <EmptyNote>Version history is available in the full editor.</EmptyNote>
        </PanelBody>
      </PanelRoot>
    )
  }
  return <VersionHistoryPanel />
}

function VersionHistoryPanel() {
  const { snapshot, restoreSnapshot } = usePageActions()!
  const { id: routeId } = useParams<{ id?: string }>()
  const projectId = versionProjectKey(routeId)
  const [versions, setVersions] = useState<DesignVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [preview, setPreview] = useState<DesignVersion | null>(null)
  const [previewPage, setPreviewPage] = useState(0)
  const [now, setNow] = useState(Date.now())

  const reload = useCallback(() => {
    return listVersions(projectId)
      .then(setVersions)
      .catch(err => fail('versions', 'Could not load version history', err))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    reload()
    // Keep relative times fresh, and pick up auto versions saved in the background.
    const t = setInterval(() => {
      setNow(Date.now())
      reload()
    }, 60_000)
    return () => clearInterval(t)
  }, [reload])

  const groups = useMemo(() => groupByDay(versions, now), [versions, now])

  const handleSave = async () => {
    const snap = snapshot()
    if (!snap) {
      notify('The design is still loading — try again in a moment', 'warning')
      return
    }
    setSaving(true)
    try {
      await saveVersion({ projectId, snapshot: snap, auto: false, label: newName })
      setNewName('')
      notify('Version saved', 'positive')
      await reload()
    } catch (err) {
      fail('versions', 'Could not save this version', err)
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (v: DesignVersion) => {
    const current = snapshot()
    if (!current) {
      notify('The design is still loading — try again in a moment', 'warning')
      return
    }
    try {
      // Safety net: the state being replaced is itself kept as a version.
      await saveVersion({ projectId, snapshot: current, auto: true, label: 'Before restore' })
    } catch (err) {
      fail('versions', 'Could not back up the current design — restore cancelled', err)
      return
    }
    try {
      restoreSnapshot({ pages: v.pages, activePage: v.activePage })
      setPreview(null)
      notify(`Restored “${v.label || exactTime(v.createdAt)}”`, 'positive')
    } catch (err) {
      fail('versions', 'Could not restore this version', err)
    }
    await reload()
  }

  const commitRename = async (v: DesignVersion) => {
    setRenamingId(null)
    if (renameText.trim() === (v.label || '')) return
    try {
      await renameVersion(v.id, renameText)
      await reload()
    } catch (err) {
      fail('versions', 'Could not rename this version', err)
    }
  }

  const handleDelete = async (v: DesignVersion) => {
    if (!window.confirm(`Delete “${v.label || 'this version'}”? This can't be undone.`)) return
    try {
      await deleteVersion(v.id)
      await reload()
    } catch (err) {
      fail('versions', 'Could not delete this version', err)
    }
  }

  const openPreview = (v: DesignVersion) => {
    setPreview(v)
    setPreviewPage(Math.min(v.activePage, v.pages.length - 1))
  }

  return (
    <PanelRoot>
      <PanelHeader title="Version history" subtitle="Auto-saved every 10 minutes while you edit. Named versions are kept forever." />
      <PanelBody>
        <div style={{ display: 'flex', gap: 8 }}>
          <TextField
            value={newName}
            placeholder="Name this version (optional)"
            aria-label="Version name"
            maxLength={80}
            onChange={e => setNewName((e.target as HTMLInputElement).value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
            }}
          />
          <KitButton $variant="primary" onClick={handleSave} disabled={saving} style={{ flex: 'none' }}>
            {saving ? 'Saving…' : 'Save version'}
          </KitButton>
        </div>

        {!loading && versions.length === 0 && (
          <EmptyNote style={{ marginTop: 16 }}>
            <History size={20} style={{ display: 'block', margin: '0 auto 6px' }} />
            No versions yet. Save one now, or keep designing — a version is saved automatically every 10 minutes.
          </EmptyNote>
        )}

        {groups.map(g => (
          <div key={g.key}>
            <SectionLabel>{g.label}</SectionLabel>
            {g.items.map(v => (
              <Row key={v.id}>
                <Thumb onClick={() => openPreview(v)} aria-label="Preview version" title="Preview">
                  {thumbOf(v) ? (
                    <img src={thumbOf(v)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Eye size={16} />
                  )}
                </Thumb>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renamingId === v.id ? (
                    <TextField
                      autoFocus
                      value={renameText}
                      aria-label="Rename version"
                      maxLength={80}
                      style={{ height: 28 }}
                      onChange={e => setRenameText((e.target as HTMLInputElement).value)}
                      onBlur={() => commitRename(v)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename(v)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                    />
                  ) : (
                    <Title title={v.label || undefined}>{v.label || (v.auto ? 'Auto-saved' : 'Saved version')}</Title>
                  )}
                  <Sub>
                    <span title={exactTime(v.createdAt)}>{relativeTime(v.createdAt, now)}</span>
                    {' · '}
                    {v.pages.length} page{v.pages.length === 1 ? '' : 's'}
                  </Sub>
                </div>
                <div style={{ display: 'flex', flex: 'none' }}>
                  <IconBtn title="Preview" aria-label="Preview" onClick={() => openPreview(v)}>
                    <Eye size={14} />
                  </IconBtn>
                  <IconBtn title="Restore" aria-label="Restore" onClick={() => handleRestore(v)}>
                    <RotateCcw size={14} />
                  </IconBtn>
                  <IconBtn
                    title="Rename"
                    aria-label="Rename"
                    onClick={() => {
                      setRenamingId(v.id)
                      setRenameText(v.label || '')
                    }}
                  >
                    <Pencil size={13} />
                  </IconBtn>
                  <IconBtn title="Delete" aria-label="Delete" onClick={() => handleDelete(v)}>
                    <Trash2 size={13} />
                  </IconBtn>
                </div>
              </Row>
            ))}
          </div>
        ))}
      </PanelBody>

      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        size={SIZE.auto}
        overrides={{ Dialog: { style: { width: 'min(920px, 92vw)', borderRadius: radius.lg, backgroundColor: color.surface } } }}
      >
        {preview && (
          <ModalBody style={{ fontFamily: font.sans, color: color.ink, margin: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <div style={{ fontFamily: font.serif, fontSize: 22, fontWeight: 600 }}>{preview.label || (preview.auto ? 'Auto-saved' : 'Saved version')}</div>
              <div style={{ ...overline }}>{exactTime(preview.createdAt)}</div>
            </div>
            <div
              style={{
                height: '56vh',
                background: color.canvasBg,
                borderRadius: radius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {preview.pages[previewPage]?.thumbnail ? (
                <img
                  src={preview.pages[previewPage].thumbnail}
                  alt={`Page ${previewPage + 1} of this version`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 8px 24px rgba(24,20,16,0.18)' }}
                />
              ) : (
                <div style={{ color: color.muted, fontSize: 13 }}>No preview image for this page.</div>
              )}
            </div>
            {preview.pages.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 0 4px' }}>
                {preview.pages.map((p, i) => (
                  <StripItem key={p.id} $active={i === previewPage} onClick={() => setPreviewPage(i)} aria-label={`Show page ${i + 1}`}>
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 11, color: color.muted }}>Page {i + 1}</span>
                    )}
                  </StripItem>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <KitButton $variant="ghost" onClick={() => setPreview(null)}>
                Close
              </KitButton>
              <KitButton
                $variant="primary"
                onClick={() => {
                  handleRestore(preview).catch(err => log.warn('versions', 'restore from preview failed', err))
                }}
              >
                <RotateCcw size={14} />
                Restore this version
              </KitButton>
            </div>
          </ModalBody>
        )}
      </Modal>
    </PanelRoot>
  )
}

export default VersionHistory
