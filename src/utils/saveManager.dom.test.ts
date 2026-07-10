import { createSaveManager, readRecovery } from './saveManager'

const serialize = () => ({
  payload: { pages: [], activePage: 0, json: { objects: [{ id: 'a' }] }, clips: [], audioClips: [] },
  changeKey: 'k1',
})

describe('unload handlers', () => {
  beforeEach(() => {
    ;(global as any).__store = {}
    ;(global as any).localStorage = {
      getItem: (k: string) => ((global as any).__store[k] ?? null),
      setItem: (k: string, v: string) => { (global as any).__store[k] = v },
      removeItem: (k: string) => { delete (global as any).__store[k] },
    }
  })
  afterEach(() => { delete (global as any).localStorage })

  it('writes a recovery snapshot on pagehide when dirty', () => {
    const m = createSaveManager({ serialize, persist: jest.fn().mockResolvedValue(undefined), projectId: 'pH' })
    const remove = m.installUnloadHandlers()
    m.markDirty()
    window.dispatchEvent(new Event('pagehide'))
    expect(readRecovery('pH')).not.toBeNull()
    remove()
  })

  it('removes its listeners when the returned disposer is called', () => {
    const m = createSaveManager({ serialize, persist: jest.fn().mockResolvedValue(undefined), projectId: 'pR' })
    const remove = m.installUnloadHandlers()
    remove()
    ;(global as any).__store = {}
    window.dispatchEvent(new Event('pagehide'))
    expect(readRecovery('pR')).toBeNull() // no handler wrote it after removal
  })
})
