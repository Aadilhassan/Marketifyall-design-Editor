import {
  addComment,
  addReply,
  commentsForPage,
  createComment,
  designToScreen,
  filterComments,
  insidePage,
  installCommentExport,
  isOwn,
  normalizeComments,
  pinNumbers,
  readJsonComments,
  removeComment,
  removeReply,
  screenToDesign,
  setResolved,
  withComments,
  DesignComment,
} from './comments'

const me = { name: 'Ada', id: 'u1' }
const other = { name: 'Bob', id: 'u2' }

const make = (id: string, pageId = 'p1', now = 1): DesignComment =>
  createComment({ id, pageId, x: 10, y: 20, text: ` note ${id} `, author: me, now })

describe('reducers', () => {
  it('creates, replies, resolves and deletes threads immutably', () => {
    let list: DesignComment[] = []
    list = addComment(list, make('c1'))
    expect(list[0]).toMatchObject({ id: 'c1', text: 'note c1', resolved: false, replies: [], author: 'Ada', authorId: 'u1' })

    const before = list
    list = addReply(list, 'c1', { text: ' hi ', author: other, id: 'r1', now: 2 })
    expect(before[0].replies).toHaveLength(0)
    expect(list[0].replies).toEqual([{ id: 'r1', author: 'Bob', authorId: 'u2', text: 'hi', createdAt: 2 }])
    expect(addReply(list, 'c1', { text: '   ', author: me })).toBe(list)

    list = setResolved(list, 'c1', true)
    expect(list[0].resolved).toBe(true)
    expect(filterComments(list, 'open')).toHaveLength(0)
    expect(filterComments(list, 'resolved')).toHaveLength(1)
    expect(filterComments(list, 'all')).toHaveLength(1)

    list = removeReply(list, 'c1', 'r1')
    expect(list[0].replies).toHaveLength(0)
    expect(removeComment(list, 'c1')).toEqual([])
  })

  it('identifies own comments by id, falling back to name', () => {
    expect(isOwn({ authorId: 'u1', author: 'x' }, me)).toBe(true)
    expect(isOwn({ authorId: 'u2', author: 'Ada' }, me)).toBe(false)
    expect(isOwn({ author: 'Ada' }, me)).toBe(true)
  })

  it('numbers pins by creation order', () => {
    const nums = pinNumbers([make('b', 'p1', 5), make('a', 'p1', 1)])
    expect(nums.get('a')).toBe(1)
    expect(nums.get('b')).toBe(2)
  })
})

describe('storage helpers', () => {
  it('normalizes untrusted data', () => {
    const out = normalizeComments([null, { id: 'x' }, { id: 'ok', text: 't', x: 1, y: 2, replies: [{ id: 'r' }, { id: 'r2', text: 'y' }] }])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ id: 'ok', author: 'Someone', resolved: false, pageId: '' })
    expect(out[0].replies.map(r => r.id)).toEqual(['r2'])
    expect(normalizeComments('nope')).toEqual([])
  })

  it('writes and removes metadata.comments without mutating', () => {
    const json = { objects: [], metadata: { animated: false } }
    const next = withComments(json, [make('c1')])
    expect(json.metadata).toEqual({ animated: false })
    expect(readJsonComments(next).map(c => c.id)).toEqual(['c1'])
    expect(withComments(next, []).metadata).toEqual({ animated: false })
  })

  it('drops comments copied from another live page and adopts orphans', () => {
    const raw = [make('mine', 'p2'), make('copied', 'p1'), make('orphan', 'gone')]
    const out = commentsForPage(raw, 'p2', ['p1', 'p2'])
    expect(out.map(c => c.id)).toEqual(['mine', 'orphan'])
    expect(out.every(c => c.pageId === 'p2')).toBe(true)
  })
})

describe('geometry', () => {
  it('round-trips page-relative points through the viewport transform', () => {
    const vpt = [0.5, 0, 0, 0.5, 40, 30]
    const tl = { x: 100, y: 50 }
    const screen = designToScreen({ x: 20, y: 10 }, tl, vpt)
    expect(screen).toEqual({ x: 0.5 * 120 + 40, y: 0.5 * 60 + 30 })
    const back = screenToDesign(screen, tl, vpt)
    expect(back.x).toBeCloseTo(20)
    expect(back.y).toBeCloseTo(10)
    expect(insidePage(back, { width: 100, height: 100 })).toBe(true)
    expect(insidePage({ x: -1, y: 0 }, { width: 100, height: 100 })).toBe(false)
  })
})

describe('installCommentExport', () => {
  it('injects active comments into exports and uninstalls cleanly', () => {
    const original = jest.fn(() => ({ objects: [], metadata: { animated: false } }))
    const editor: any = { exportToJSON: original }
    let comments: DesignComment[] = []
    const uninstall = installCommentExport(editor, () => comments)

    expect(editor.exportToJSON()).toEqual({ objects: [], metadata: { animated: false } })
    comments = [make('c1')]
    expect(readJsonComments(editor.exportToJSON()).map(c => c.id)).toEqual(['c1'])
    // A second install is a no-op (no double wrapping).
    installCommentExport(editor, () => [])
    expect(readJsonComments(editor.exportToJSON())).toHaveLength(1)

    uninstall()
    expect(editor.exportToJSON).toBe(original)
  })
})
