import {
  buildVersion,
  dayLabel,
  groupByDay,
  guardThumbnails,
  isEmptySnapshot,
  MAX_THUMBNAIL_CHARS,
  relativeTime,
  selectPrunable,
  shouldAutoVersion,
  snapshotHash,
  versionProjectKey,
  DesignSnapshot,
} from './versions'

const page = (id: string, objects: unknown[] = [{ type: 'StaticText' }], thumbnail?: string) => ({
  id,
  json: { frame: { width: 100, height: 100 }, objects },
  ...(thumbnail ? { thumbnail } : {}),
})

const snap = (pages = [page('a')], activePage = 0): DesignSnapshot => ({ pages, activePage })

describe('snapshotHash', () => {
  it('ignores thumbnails but tracks content and page order', () => {
    const base = snapshotHash(snap([page('a'), page('b')]))
    expect(snapshotHash(snap([page('a', undefined, 'data:x'), page('b')]))).toBe(base)
    expect(snapshotHash(snap([page('b'), page('a')]))).not.toBe(base)
    expect(snapshotHash(snap([page('a', [{ type: 'StaticImage' }]), page('b')]))).not.toBe(base)
  })
})

describe('shouldAutoVersion', () => {
  it('skips empty designs', () => {
    expect(isEmptySnapshot(snap([page('a', [])]))).toBe(true)
    expect(shouldAutoVersion(snap([page('a', [])]), null)).toBe(false)
  })

  it('saves when content differs from the newest stored version', () => {
    const s = snap()
    expect(shouldAutoVersion(s, null)).toBe(true)
    expect(shouldAutoVersion(s, snapshotHash(s))).toBe(false)
    expect(shouldAutoVersion(s, 'other')).toBe(true)
  })
})

describe('guardThumbnails / buildVersion', () => {
  it('drops thumbnails over the size guard', () => {
    const big = 'x'.repeat(MAX_THUMBNAIL_CHARS + 1)
    const out = guardThumbnails([page('a', [], big), page('b', [], 'small')])
    expect(out[0].thumbnail).toBeUndefined()
    expect(out[1].thumbnail).toBe('small')
  })

  it('builds a version with trimmed label, clamped active page and hash', () => {
    const s = snap([page('a')], 5)
    const v = buildVersion({ projectId: 'p', snapshot: s, auto: false, label: '  Draft  ', now: 10, id: 'v1' })
    expect(v).toMatchObject({ id: 'v1', projectId: 'p', createdAt: 10, label: 'Draft', auto: false, activePage: 0 })
    expect(v.hash).toBe(snapshotHash(s))
    expect(buildVersion({ projectId: 'p', snapshot: s, auto: true, label: '  ' })).not.toHaveProperty('label')
  })

  it('uses "local" when there is no project id', () => {
    expect(versionProjectKey(undefined)).toBe('local')
    expect(versionProjectKey('abc')).toBe('abc')
  })
})

describe('selectPrunable', () => {
  it('prunes the oldest auto versions beyond the cap and keeps named ones', () => {
    const versions = [
      { id: 'n1', auto: false, createdAt: 1 },
      { id: 'a1', auto: true, createdAt: 2 },
      { id: 'a2', auto: true, createdAt: 3 },
      { id: 'a3', auto: true, createdAt: 4 },
      { id: 'n2', auto: false, createdAt: 0 },
    ]
    expect(selectPrunable(versions, 2)).toEqual(['a1'])
    expect(selectPrunable(versions, 5)).toEqual([])
  })
})

describe('grouping and formatting', () => {
  const now = new Date(2026, 9, 30, 15, 0, 0).getTime()

  it('labels today and yesterday', () => {
    expect(dayLabel(new Date(2026, 9, 30, 1).getTime(), now)).toBe('Today')
    expect(dayLabel(new Date(2026, 9, 29, 23).getTime(), now)).toBe('Yesterday')
  })

  it('groups by day, newest first', () => {
    const items = [
      { id: 'y', createdAt: new Date(2026, 9, 29, 10).getTime() },
      { id: 't1', createdAt: new Date(2026, 9, 30, 9).getTime() },
      { id: 't2', createdAt: new Date(2026, 9, 30, 14).getTime() },
      { id: 'old', createdAt: new Date(2026, 9, 20, 14).getTime() },
    ]
    const groups = groupByDay(items, now)
    expect(groups.map(g => g.label).slice(0, 2)).toEqual(['Today', 'Yesterday'])
    expect(groups[0].items.map(i => i.id)).toEqual(['t2', 't1'])
    expect(groups).toHaveLength(3)
  })

  it('formats relative times', () => {
    expect(relativeTime(now - 10_000, now)).toBe('Just now')
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3 hr ago')
    expect(relativeTime(now - 2 * 86_400_000, now)).toBe('2 days ago')
  })
})
