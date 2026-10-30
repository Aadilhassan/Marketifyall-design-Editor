/**
 * Comments panel: pin a comment to a spot on the page, reply, resolve/reopen,
 * delete your own. Threads are stored per page in json.metadata.comments via
 * PageActions (see utils/comments.ts), so they ride along with the IndexedDB
 * autosave and the server save.
 */
import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { styled } from 'baseui'
import { Check, MessageSquarePlus, RotateCcw, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePageActions } from '@/contexts/PageActionsContext'
import { isDemoRequest } from '@/lib/workspaceContext'
import { color, font, overline, radius } from '@/theme/tokens'
import { relativeTime, exactTime } from '@/utils/versions'
import {
  addComment,
  addReply,
  CommentAuthor,
  CommentFilter,
  createComment,
  DesignComment,
  filterComments,
  isOwn,
  pinNumbers,
  Point,
  removeComment,
  removeReply,
  setResolved,
} from '@/utils/comments'
import CommentPins, { PlacedPoint } from '../../CommentPins'
import { EmptyNote, KitButton, PanelBody, PanelHeader, PanelRoot } from '../PanelKit'

const Tabs = styled('div', {
  display: 'flex',
  gap: '4px',
  padding: '3px',
  background: color.paper2,
  borderRadius: radius.md,
  marginBottom: '12px',
})

const Tab = styled('button', ({ $active }: { $active: boolean }) => ({
  flex: 1,
  height: '28px',
  border: 'none',
  borderRadius: radius.sm,
  background: $active ? color.white : 'transparent',
  color: $active ? color.ink : color.muted,
  fontFamily: font.sans,
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
}))

const Card = styled('div', ({ $active, $resolved }: { $active: boolean; $resolved: boolean }) => ({
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $active ? color.ink : color.line,
  borderRadius: radius.md,
  background: color.white,
  padding: '10px 12px',
  marginBottom: '10px',
  cursor: 'pointer',
  opacity: $resolved ? 0.75 : 1,
  ':hover': { borderColor: color.ink },
}))

const Badge = styled('span', ({ $resolved }: { $resolved: boolean }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '20px',
  height: '20px',
  padding: '0 5px',
  boxSizing: 'border-box',
  borderRadius: '999px',
  background: $resolved ? color.faint : color.accent,
  color: color.accentInk,
  fontFamily: font.mono,
  fontSize: '10.5px',
  fontWeight: 700,
}))

const Meta = styled('div', { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: color.muted })
const Author = styled('span', { fontWeight: 600, color: color.ink, fontSize: '12.5px' })
const Body = styled('p', { margin: '6px 0 0', fontSize: '13px', lineHeight: 1.45, color: color.ink2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' })

const Reply = styled('div', {
  marginTop: '8px',
  paddingLeft: '10px',
  borderLeft: `2px solid ${color.line}`,
})

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

const TextArea = styled('textarea', {
  width: '100%',
  minHeight: '64px',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: radius.md,
  border: `1px solid ${color.line2}`,
  background: color.white,
  fontFamily: font.sans,
  fontSize: '13px',
  lineHeight: 1.4,
  color: color.ink,
  resize: 'vertical',
  outline: 'none',
  ':focus': { borderColor: color.ink },
})

const Label = styled('div', { ...overline, margin: '4px 0 8px' })

function useCommentAuthor(): CommentAuthor {
  const { user } = useAuth()
  return useMemo(() => {
    if (!user || isDemoRequest()) return { name: 'You', id: 'local' }
    const meta: any = user.user_metadata || {}
    return { name: meta.name || meta.full_name || user.email || 'You', id: user.id }
  }, [user])
}

function Comments() {
  const pageActions = usePageActions()
  if (!pageActions) {
    return (
      <PanelRoot>
        <PanelHeader title="Comments" />
        <PanelBody>
          <EmptyNote>Comments are available in the full editor.</EmptyNote>
        </PanelBody>
      </PanelRoot>
    )
  }
  return <CommentsPanel />
}

function CommentsPanel() {
  const pa = usePageActions()!
  const me = useCommentAuthor()
  const { activePage, pageCount, getComments, setComments } = pa
  const [comments, setLocal] = useState<DesignComment[]>(() => getComments(activePage))
  const [filter, setFilter] = useState<CommentFilter>('open')
  const [placing, setPlacing] = useState(false)
  const [draft, setDraft] = useState<PlacedPoint | null>(null)
  const [draftText, setDraftText] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [replyText, setReplyText] = useState<Record<string, string>>({})

  // Reload when the user switches / adds / deletes pages.
  useEffect(() => {
    setLocal(getComments(activePage))
    setDraft(null)
    setPlacing(false)
    setActiveId(null)
  }, [activePage, pageCount, getComments])

  const commit = useCallback(
    (next: DesignComment[]) => {
      setLocal(next)
      setComments(activePage, next)
    },
    [activePage, setComments],
  )

  const numbers = useMemo(() => pinNumbers(comments), [comments])
  const visible = useMemo(
    () => filterComments(comments, filter).slice().sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0)),
    [comments, filter, numbers],
  )
  const openCount = useMemo(() => filterComments(comments, 'open').length, [comments])

  const startPlacing = () => {
    setDraft(null)
    setDraftText('')
    setPlacing(true)
  }
  const cancelPlacing = useCallback(() => setPlacing(false), [])
  const place = useCallback((p: PlacedPoint) => {
    setPlacing(false)
    setDraft(p)
  }, [])

  const submitDraft = () => {
    if (!draft || !draftText.trim()) return
    // setComments stamps the real page id onto every comment it stores.
    const c = createComment({ pageId: '', x: draft.x, y: draft.y, objectId: draft.objectId, text: draftText, author: me })
    commit(addComment(comments, c))
    setDraft(null)
    setDraftText('')
    setActiveId(c.id)
    if (filter === 'resolved') setFilter('open')
  }

  const select = useCallback((id: string) => {
    setActiveId(id)
    setFocusToken(t => t + 1)
    const el = document.getElementById(`mfa-comment-${id}`)
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [])

  const selectFromPin = useCallback(
    (id: string) => {
      const c = comments.find(x => x.id === id)
      if (c && filter !== 'all' && (filter === 'resolved') !== c.resolved) setFilter('all')
      setActiveId(id)
      // Wait for the card to render under the new filter before scrolling.
      setTimeout(() => document.getElementById(`mfa-comment-${id}`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), 0)
    },
    [comments, filter],
  )

  const sendReply = (id: string) => {
    const text = replyText[id] || ''
    if (!text.trim()) return
    commit(addReply(comments, id, { text, author: me }))
    setReplyText(r => ({ ...r, [id]: '' }))
  }

  const onDraftKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitDraft()
    if (e.key === 'Escape') setDraft(null)
  }

  const draftPoint: Point | null = draft ? { x: draft.x, y: draft.y } : null

  return (
    <PanelRoot>
      <PanelHeader
        title="Comments"
        subtitle={`Page ${activePage + 1} · ${openCount} open`}
        action={
          <KitButton $variant="primary" onClick={startPlacing} disabled={placing} title="Add comment">
            <MessageSquarePlus size={15} />
            Add
          </KitButton>
        }
      />
      <PanelBody>
        {placing && <EmptyNote style={{ marginBottom: 12 }}>Click a spot on the page to pin your comment. Press Esc to cancel.</EmptyNote>}

        {draft && (
          <div style={{ marginBottom: 14 }}>
            <Label>New comment</Label>
            <TextArea
              autoFocus
              value={draftText}
              placeholder="Add a comment…"
              onChange={e => setDraftText((e.target as HTMLTextAreaElement).value)}
              onKeyDown={onDraftKey}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <KitButton $variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </KitButton>
              <KitButton $variant="primary" onClick={submitDraft} disabled={!draftText.trim()}>
                Comment
              </KitButton>
            </div>
          </div>
        )}

        <Tabs role="tablist">
          {(['open', 'resolved', 'all'] as CommentFilter[]).map(f => (
            <Tab key={f} role="tab" aria-selected={filter === f} $active={filter === f} onClick={() => setFilter(f)}>
              {f === 'open' ? 'Open' : f === 'resolved' ? 'Resolved' : 'All'}
            </Tab>
          ))}
        </Tabs>

        {visible.length === 0 && !draft && (
          <EmptyNote>
            {comments.length === 0
              ? 'No comments on this page yet. Click “Add” and then a spot on the page to start a thread.'
              : filter === 'open'
              ? 'All caught up — no open comments on this page.'
              : 'No resolved comments on this page.'}
          </EmptyNote>
        )}

        {visible.map(c => (
          <Card key={c.id} id={`mfa-comment-${c.id}`} $active={c.id === activeId} $resolved={c.resolved} onClick={() => select(c.id)}>
            <Meta>
              <Badge $resolved={c.resolved}>{numbers.get(c.id)}</Badge>
              <Author>{c.author}</Author>
              <span title={exactTime(c.createdAt)}>{relativeTime(c.createdAt)}</span>
              <span style={{ flex: 1 }} />
              <IconBtn
                title={c.resolved ? 'Reopen' : 'Resolve'}
                aria-label={c.resolved ? 'Reopen thread' : 'Resolve thread'}
                onClick={e => {
                  e.stopPropagation()
                  commit(setResolved(comments, c.id, !c.resolved))
                }}
              >
                {c.resolved ? <RotateCcw size={14} /> : <Check size={15} />}
              </IconBtn>
              {isOwn(c, me) && (
                <IconBtn
                  title="Delete thread"
                  aria-label="Delete thread"
                  onClick={e => {
                    e.stopPropagation()
                    if (window.confirm('Delete this comment thread?')) {
                      commit(removeComment(comments, c.id))
                      if (activeId === c.id) setActiveId(null)
                    }
                  }}
                >
                  <Trash2 size={14} />
                </IconBtn>
              )}
            </Meta>
            <Body>{c.text}</Body>

            {c.replies.map(r => (
              <Reply key={r.id}>
                <Meta>
                  <Author>{r.author}</Author>
                  <span title={exactTime(r.createdAt)}>{relativeTime(r.createdAt)}</span>
                  <span style={{ flex: 1 }} />
                  {isOwn(r, me) && (
                    <IconBtn
                      title="Delete reply"
                      aria-label="Delete reply"
                      onClick={e => {
                        e.stopPropagation()
                        commit(removeReply(comments, c.id, r.id))
                      }}
                    >
                      <Trash2 size={13} />
                    </IconBtn>
                  )}
                </Meta>
                <Body>{r.text}</Body>
              </Reply>
            ))}

            {c.id === activeId && !c.resolved && (
              <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()} role="presentation">
                <TextArea
                  style={{ minHeight: 44 }}
                  value={replyText[c.id] || ''}
                  placeholder="Reply…"
                  aria-label="Reply"
                  onChange={e => {
                    const v = (e.target as HTMLTextAreaElement).value
                    setReplyText(rt => ({ ...rt, [c.id]: v }))
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(c.id)
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <KitButton onClick={() => sendReply(c.id)} disabled={!(replyText[c.id] || '').trim()}>
                    Reply
                  </KitButton>
                </div>
              </div>
            )}
          </Card>
        ))}
      </PanelBody>

      <CommentPins
        comments={comments.filter(c => filter === 'all' || c.id === activeId || (filter === 'resolved') === c.resolved)}
        numbers={numbers}
        activeId={activeId}
        onSelect={selectFromPin}
        placing={placing}
        onPlace={place}
        onCancelPlacing={cancelPlacing}
        draft={draftPoint}
        focusToken={focusToken}
      />
    </PanelRoot>
  )
}

export default Comments
