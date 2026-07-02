/** @jest-environment node */
import { fnv1a } from './saveManager'

describe('fnv1a', () => {
  it('is deterministic', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'))
  })
  it('differs for different content of the SAME length (the length-detection bug)', () => {
    // 'abcd' and 'abce' are both length 4 — the old `.length` signature missed this.
    expect(fnv1a('abcd')).not.toBe(fnv1a('abce'))
  })
  it('returns a stable hex string', () => {
    expect(fnv1a('marketifyall')).toMatch(/^[0-9a-f]{8}$/)
  })
  it('handles empty string', () => {
    expect(fnv1a('')).toMatch(/^[0-9a-f]{8}$/)
  })
})

import { createSaveManager } from './saveManager'
import type { SerializeResult } from './saveManager'

function makeDeps(overrides: Partial<Parameters<typeof createSaveManager>[0]> = {}) {
  const persist = jest.fn().mockResolvedValue(undefined)
  let n = 1
  const serialize = jest.fn<SerializeResult | null, []>(() => ({
    payload: { pages: [], activePage: 0, json: { objects: [] }, clips: [], audioClips: [] },
    changeKey: `content-${n}`,
  }))
  return {
    serialize,
    persist,
    projectId: 'p1',
    debounceMs: 600,
    maxWaitMs: 3000,
    ...overrides,
    _bump: () => { n++ },
  }
}

// This repo's Babel applies the regenerator transform to async/await
// unconditionally, so each `await` in the module under test costs several
// microtask hops to settle. Flush a generous number of microtask ticks (not a
// fixed 1–2) after advancing fake timers, so assertions see the settled state.
// Timer-faked (setTimeout/backoff) still advance via jest.advanceTimersByTime;
// this only drains the microtask queue the resolved timers/persist enqueue.
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

describe('createSaveManager scheduling + change detection', () => {
  beforeEach(() => jest.useFakeTimers('modern'))
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers() })

  it('debounces: rapid markDirty → one save after the debounce window', async () => {
    const d = makeDeps()
    const m = createSaveManager(d)
    m.markDirty(); m.markDirty(); m.markDirty()
    expect(d.persist).not.toHaveBeenCalled()
    jest.advanceTimersByTime(600)
    await flush()
    expect(d.persist).toHaveBeenCalledTimes(1)
  })

  it('max-wait: continuous edits still force a save by maxWaitMs', async () => {
    const d = makeDeps()
    const m = createSaveManager(d)
    for (let i = 0; i < 10; i++) { m.markDirty(); jest.advanceTimersByTime(500) } // never idle 600ms
    await flush()
    expect(d.persist).toHaveBeenCalled() // forced by the 3000ms cap
  })

  it('skips persist when content hash is unchanged (same changeKey)', async () => {
    const d = makeDeps() // serialize returns the SAME changeKey until _bump()
    const m = createSaveManager(d)
    m.markDirty(); jest.advanceTimersByTime(600); await flush()
    expect(d.persist).toHaveBeenCalledTimes(1)
    m.markDirty(); jest.advanceTimersByTime(600); await flush()
    expect(d.persist).toHaveBeenCalledTimes(1) // unchanged → no second write
  })

  it('persists again when content actually changes', async () => {
    const d = makeDeps()
    const m = createSaveManager(d)
    m.markDirty(); jest.advanceTimersByTime(600); await flush()
    d._bump() // content changes
    m.markDirty(); jest.advanceTimersByTime(600); await flush()
    expect(d.persist).toHaveBeenCalledTimes(2)
  })

  it('transitions saved→saving→saved and notifies subscribers', async () => {
    const d = makeDeps()
    const m = createSaveManager(d)
    const states: string[] = []
    m.subscribe(s => states.push(s.status))
    m.markDirty(); jest.advanceTimersByTime(600); await flush()
    expect(states).toContain('saving')
    expect(m.getState().status).toBe('saved')
  })
})

describe('createSaveManager retry/backoff', () => {
  beforeEach(() => jest.useFakeTimers('modern'))
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers() })

  it('on persist failure → state error, then retries with backoff and recovers', async () => {
    const persist = jest.fn()
      .mockRejectedValueOnce(new Error('idb blocked'))
      .mockResolvedValueOnce(undefined)
    const d = makeDeps({ persist })
    const m = createSaveManager(d)
    m.markDirty(); jest.advanceTimersByTime(600)
    await flush()
    expect(m.getState().status).toBe('error')
    jest.advanceTimersByTime(1000) // first backoff
    await flush()
    expect(persist).toHaveBeenCalledTimes(2)
    expect(m.getState().status).toBe('saved')
  })

  it('retryNow() forces an immediate retry from error state', async () => {
    const persist = jest.fn()
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce(undefined)
    const d = makeDeps({ persist })
    const m = createSaveManager(d)
    m.markDirty(); jest.advanceTimersByTime(600); await flush()
    expect(m.getState().status).toBe('error')
    m.retryNow(); await flush()
    expect(m.getState().status).toBe('saved')
  })
})

import { readRecovery, clearRecovery, RECOVERY_LIMIT_BYTES } from './saveManager'

describe('recovery snapshot', () => {
  let storeMap: Record<string, string>
  beforeEach(() => {
    storeMap = {}
    ;(global as any).localStorage = {
      getItem: (k: string) => (k in storeMap ? storeMap[k] : null),
      setItem: (k: string, v: string) => { storeMap[k] = v },
      removeItem: (k: string) => { delete storeMap[k] },
    }
  })
  afterEach(() => { delete (global as any).localStorage })

  it('writes a snapshot the size guard accepts, and reads it back', () => {
    const d = makeDeps()
    const m = createSaveManager({ ...d, projectId: 'pX' })
    const ok = m.writeRecoverySync()
    expect(ok).toBe(true)
    const snap = readRecovery('pX')
    expect(snap).not.toBeNull()
    expect(snap!.payload.json).toEqual({ objects: [] })
    expect(typeof snap!.savedAt).toBe('number')
  })

  it('skips (returns false) when the serialized payload exceeds the size limit', () => {
    const big = 'x'.repeat(RECOVERY_LIMIT_BYTES + 10)
    const serialize = () => ({ payload: { pages: [], activePage: 0, json: big, clips: [], audioClips: [] }, changeKey: 'k' })
    const m = createSaveManager({ ...makeDeps(), serialize, projectId: 'pBig' })
    expect(m.writeRecoverySync()).toBe(false)
    expect(readRecovery('pBig')).toBeNull()
  })

  it('clearRecovery removes the snapshot', () => {
    const m = createSaveManager({ ...makeDeps(), projectId: 'pC' })
    m.writeRecoverySync()
    expect(readRecovery('pC')).not.toBeNull()
    clearRecovery('pC')
    expect(readRecovery('pC')).toBeNull()
  })

  it('readRecovery returns null for corrupt JSON without throwing', () => {
    ;(global as any).localStorage.setItem('mfa-recovery:pBad', '{not json')
    expect(readRecovery('pBad')).toBeNull()
  })
})
