/**
 * Framework-free autosave engine. Owns change-detection (content hash, not
 * byte-length), a saved|dirty|saving|error state machine, debounced+capped
 * scheduling, exponential-backoff retry, unload protection, and a per-project
 * localStorage recovery snapshot. All editor-specific serialization is injected
 * (see SaveManagerDeps.serialize), so this module imports no React/fabric and is
 * fully unit-testable.
 */

/** 32-bit FNV-1a hash → 8-char hex. Detects content changes the old
 *  `JSON.stringify(objs).length` signature missed (same length, different bytes). */
export function fnv1a(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error'
export interface SaveState { status: SaveStatus; lastError?: string; lastSavedAt?: number }

export interface SavePayload {
  pages: any[]
  activePage: number
  json: any
  clips: any[]
  audioClips: any[]
  thumbnail?: string
}
export interface SerializeResult {
  payload: SavePayload
  /** Content string hashed to detect real changes (e.g. objects JSON + clip/audio sig). */
  changeKey: string
}
export interface SaveManagerDeps {
  serialize: () => SerializeResult | null
  persist: (payload: SavePayload) => Promise<void>
  projectId: string
  debounceMs?: number
  maxWaitMs?: number
  now?: () => number
  onEscalate?: (message: string) => void // called ONCE when retries are exhausted (single toast)
}

const MAX_BACKOFF_MS = 30_000
const MAX_RETRIES_BEFORE_ESCALATE = 4

export interface SaveManager {
  markDirty: () => void
  flushNow: () => Promise<void>
  retryNow: () => void
  getState: () => SaveState
  subscribe: (fn: (s: SaveState) => void) => () => void
  writeRecoverySync: () => boolean
  dispose: () => void
}

export function createSaveManager(deps: SaveManagerDeps): SaveManager {
  const debounceMs = deps.debounceMs ?? 600
  const maxWaitMs = deps.maxWaitMs ?? 3000
  const now = deps.now ?? (() => Date.now())

  let state: SaveState = { status: 'saved' }
  const listeners = new Set<(s: SaveState) => void>()
  let lastHash = ''
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let maxWaitTimer: ReturnType<typeof setTimeout> | undefined
  let backoffTimer: ReturnType<typeof setTimeout> | undefined
  let retries = 0
  let saving = false
  let disposed = false

  function set(next: Partial<SaveState>) {
    state = { ...state, ...next }
    listeners.forEach(fn => fn(state))
  }
  function clearTimers() {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (maxWaitTimer) clearTimeout(maxWaitTimer)
    debounceTimer = maxWaitTimer = undefined
  }

  async function run() {
    if (disposed || saving) return
    clearTimers()
    const result = deps.serialize()
    if (!result) return
    const hash = fnv1a(result.changeKey)
    if (hash === lastHash) {
      // Content is byte-identical to the last successful save — nothing to
      // persist. markDirty() flips status to 'dirty' before run(), so a
      // no-op edit (e.g. an object:modified that didn't change serialized
      // content) lands here; settle the chip back to 'saved'.
      if (state.status !== 'saved') set({ status: 'saved' })
      return
    }
    saving = true
    set({ status: 'saving' })
    try {
      await deps.persist(result.payload)
      lastHash = hash
      retries = 0
      saving = false
      set({ status: 'saved', lastError: undefined, lastSavedAt: now() })
      clearRecovery(deps.projectId)
    } catch (err) {
      saving = false
      set({ status: 'error', lastError: err instanceof Error ? err.message : String(err) })
      scheduleBackoff()
    }
  }

  function scheduleBackoff() {
    retries++
    if (retries === MAX_RETRIES_BEFORE_ESCALATE && deps.onEscalate) {
      deps.onEscalate('Your changes aren’t saving. Check your connection; we’ll keep retrying.')
    }
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, retries - 1))
    if (backoffTimer) clearTimeout(backoffTimer)
    backoffTimer = setTimeout(() => { void run() }, delay)
  }

  function markDirty() {
    if (disposed) return
    if (state.status === 'saved') set({ status: 'dirty' })
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { void run() }, debounceMs)
    if (!maxWaitTimer) maxWaitTimer = setTimeout(() => { void run() }, maxWaitMs)
  }

  async function flushNow() { await run() }
  function retryNow() { if (backoffTimer) clearTimeout(backoffTimer); void run() }

  return {
    markDirty,
    flushNow,
    retryNow,
    getState: () => state,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    writeRecoverySync: () => writeRecoverySync(deps.projectId, deps.serialize),
    dispose: () => { disposed = true; clearTimers(); if (backoffTimer) clearTimeout(backoffTimer); listeners.clear() },
  }
}

// TEMPORARY stubs — replaced with the real recovery-snapshot implementation in Task 3.
function clearRecovery(projectId: string): void { void projectId }
function writeRecoverySync(projectId: string, serialize: () => SerializeResult | null): boolean { void projectId; void serialize; return false }
