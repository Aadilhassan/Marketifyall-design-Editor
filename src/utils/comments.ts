/**
 * Design comments (Canva-style pinned threads).
 *
 * Storage: each page's scenify json under `json.metadata.comments`. The SDK's
 * exportToJSON() rebuilds `metadata` from scratch on every call, so the editor
 * wraps it (installCommentExport) to re-inject the active page's comments —
 * that way the IndexedDB autosave, page switches and the server save (which
 * all go through exportToJSON) carry comments without any extra plumbing.
 *
 * Everything here is pure except installCommentExport (patches the editor).
 */
import { nanoid } from 'nanoid'

export interface CommentReply {
  id: string
  author: string
  authorId?: string
  text: string
  createdAt: number
}

export interface DesignComment {
  id: string
  pageId: string
  /** Page-relative design px (0,0 = top-left of the page frame). */
  x: number
  y: number
  objectId?: string
  author: string
  authorId?: string
  text: string
  createdAt: number
  resolved: boolean
  replies: CommentReply[]
}

export type CommentFilter = 'open' | 'resolved' | 'all'

export interface CommentAuthor {
  name: string
  id: string
}

const str = (v: unknown): v is string => typeof v === 'string'
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Validate untrusted stored data (json comes from IndexedDB / the server). */
export function normalizeComments(raw: unknown): DesignComment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((c: any) => c && str(c.id) && str(c.text) && num(c.x) && num(c.y))
    .map((c: any) => ({
      id: c.id,
      pageId: str(c.pageId) ? c.pageId : '',
      x: c.x,
      y: c.y,
      ...(str(c.objectId) ? { objectId: c.objectId } : {}),
      author: str(c.author) && c.author ? c.author : 'Someone',
      ...(str(c.authorId) ? { authorId: c.authorId } : {}),
      text: c.text,
      createdAt: num(c.createdAt) ? c.createdAt : 0,
      resolved: !!c.resolved,
      replies: Array.isArray(c.replies)
        ? c.replies
            .filter((r: any) => r && str(r.id) && str(r.text))
            .map((r: any) => ({
              id: r.id,
              author: str(r.author) && r.author ? r.author : 'Someone',
              ...(str(r.authorId) ? { authorId: r.authorId } : {}),
              text: r.text,
              createdAt: num(r.createdAt) ? r.createdAt : 0,
            }))
        : [],
    }))
}

export const readJsonComments = (json: any): DesignComment[] => normalizeComments(json?.metadata?.comments)

/**
 * The comments that belong to page `pageId`. A comment belongs to a page when
 * its pageId matches, or when its pageId matches no current page (page ids are
 * regenerated when a design is reloaded from the server, so orphans are
 * adopted). Comments whose pageId is ANOTHER live page are dropped: they were
 * copied along with the json (add page / duplicate page clone the metadata).
 */
export function commentsForPage(raw: unknown, pageId: string, allPageIds: string[]): DesignComment[] {
  const others = new Set(allPageIds.filter(id => id !== pageId))
  return normalizeComments(raw)
    .filter(c => c.pageId === pageId || !others.has(c.pageId))
    .map(c => (c.pageId === pageId ? c : { ...c, pageId }))
}

/** A copy of `json` with `metadata.comments` set (or removed when empty). Never mutates. */
export function withComments<T extends Record<string, any>>(json: T, comments: DesignComment[]): T {
  const metadata = { ...(json?.metadata || {}) }
  if (comments.length) metadata.comments = comments
  else delete metadata.comments
  return { ...json, metadata }
}

/* ---------------------------------------------------------------- reducers */

export function createComment(opts: {
  pageId: string
  x: number
  y: number
  text: string
  author: CommentAuthor
  objectId?: string
  now?: number
  id?: string
}): DesignComment {
  return {
    id: opts.id ?? nanoid(),
    pageId: opts.pageId,
    x: Math.round(opts.x * 10) / 10,
    y: Math.round(opts.y * 10) / 10,
    ...(opts.objectId ? { objectId: opts.objectId } : {}),
    author: opts.author.name,
    authorId: opts.author.id,
    text: opts.text.trim(),
    createdAt: opts.now ?? Date.now(),
    resolved: false,
    replies: [],
  }
}

export const addComment = (list: DesignComment[], comment: DesignComment): DesignComment[] => [...list, comment]

export function addReply(
  list: DesignComment[],
  commentId: string,
  opts: { text: string; author: CommentAuthor; now?: number; id?: string },
): DesignComment[] {
  const text = opts.text.trim()
  if (!text) return list
  const reply: CommentReply = {
    id: opts.id ?? nanoid(),
    author: opts.author.name,
    authorId: opts.author.id,
    text,
    createdAt: opts.now ?? Date.now(),
  }
  return list.map(c => (c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c))
}

export const setResolved = (list: DesignComment[], commentId: string, resolved: boolean): DesignComment[] =>
  list.map(c => (c.id === commentId ? { ...c, resolved } : c))

export const removeComment = (list: DesignComment[], commentId: string): DesignComment[] => list.filter(c => c.id !== commentId)

export const removeReply = (list: DesignComment[], commentId: string, replyId: string): DesignComment[] =>
  list.map(c => (c.id === commentId ? { ...c, replies: c.replies.filter(r => r.id !== replyId) } : c))

/** Own = written by this author id. Legacy comments without an id fall back to the display name. */
export const isOwn = (item: { authorId?: string; author: string }, me: CommentAuthor): boolean =>
  item.authorId ? item.authorId === me.id : item.author === me.name

export function filterComments(list: DesignComment[], filter: CommentFilter): DesignComment[] {
  if (filter === 'all') return list
  return list.filter(c => (filter === 'resolved' ? c.resolved : !c.resolved))
}

/** Stable pin numbers: 1-based, by creation order across the page's threads. */
export function pinNumbers(list: DesignComment[]): Map<string, number> {
  const ordered = list.slice().sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  return new Map(ordered.map((c, i) => [c.id, i + 1]))
}

/* -------------------------------------------------------------- geometry */

/** fabric viewportTransform: [scaleX, skewY, skewX, scaleY, translateX, translateY]. */
export type Vpt = number[]

export interface Point {
  x: number
  y: number
}

/** Page-relative design px → screen px relative to the canvas element. */
export function designToScreen(p: Point, frameTopLeft: Point, vpt: Vpt): Point {
  const cx = p.x + frameTopLeft.x
  const cy = p.y + frameTopLeft.y
  return { x: vpt[0] * cx + vpt[2] * cy + vpt[4], y: vpt[1] * cx + vpt[3] * cy + vpt[5] }
}

/** Screen px relative to the canvas element → page-relative design px. */
export function screenToDesign(p: Point, frameTopLeft: Point, vpt: Vpt): Point {
  const [a, b, c, d, e, f] = vpt
  const det = a * d - b * c || 1
  const sx = p.x - e
  const sy = p.y - f
  return { x: (d * sx - c * sy) / det - frameTopLeft.x, y: (a * sy - b * sx) / det - frameTopLeft.y }
}

export const insidePage = (p: Point, size: { width: number; height: number }): boolean =>
  p.x >= 0 && p.y >= 0 && p.x <= size.width && p.y <= size.height

/* ------------------------------------------------------- editor plumbing */

const PATCH_FLAG = '__mfaCommentExport'

/**
 * Wrap editor.exportToJSON so its output carries the active page's comments.
 * Comments are only added when there are some, so designs without comments
 * export (and hash) exactly as before. Returns an uninstall function.
 */
export function installCommentExport(editor: any, getActiveComments: () => DesignComment[]): () => void {
  if (!editor || typeof editor.exportToJSON !== 'function' || editor[PATCH_FLAG]) return () => undefined
  const original = editor.exportToJSON
  const wrapped = function (this: unknown, ...args: unknown[]) {
    const json = original.apply(editor, args)
    if (!json || typeof json !== 'object') return json
    const comments = getActiveComments()
    return comments.length ? withComments(json, comments) : json
  }
  editor.exportToJSON = wrapped
  editor[PATCH_FLAG] = true
  return () => {
    if (editor.exportToJSON === wrapped) editor.exportToJSON = original
    delete editor[PATCH_FLAG]
  }
}
