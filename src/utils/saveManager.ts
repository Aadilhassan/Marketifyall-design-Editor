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
  installUnloadHandlers: () => (() => void)
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
  let pending = false // an edit arrived while a save was in flight — re-run after it settles
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
    if (disposed) return
    // A persist is already in flight. Don't run concurrently — record that there's
    // newer content so we re-run once the in-flight save settles (else the last
    // edit made during a save is stranded, and — since state would read 'saved' —
    // the unload snapshot wouldn't catch it either: silent data loss).
    if (saving) { pending = true; return }
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
      if (pending) { pending = false; markDirty() } // edits arrived mid-save → capture them
    } catch (err) {
      saving = false
      pending = false // the backoff retry re-serializes the latest content anyway
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
    // Null the timer refs when they fire, so a timer that fires during an
    // in-flight save (and early-returns) can't leave a stale ref that makes
    // `if (!maxWaitTimer)` skip re-arming the cap — which would silently
    // disable the max-wait safety net for the rest of the session.
    debounceTimer = setTimeout(() => { debounceTimer = undefined; void run() }, debounceMs)
    if (!maxWaitTimer) maxWaitTimer = setTimeout(() => { maxWaitTimer = undefined; void run() }, maxWaitMs)
  }

  async function flushNow() { await run() }
  function retryNow() { if (backoffTimer) clearTimeout(backoffTimer); void run() }

  function installUnloadHandlers(): () => void {
    const onHide = () => {
      // Best-effort async flush (may not finish) + guaranteed sync snapshot.
      if (state.status !== 'saved') { void run(); writeRecoverySync(deps.projectId, deps.serialize) }
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.status === 'saved') return
      const wrote = writeRecoverySync(deps.projectId, deps.serialize)
      if (!wrote) { e.preventDefault(); e.returnValue = '' } // payload too big → native confirm
    }
    const onVisibility = () => { if (typeof document !== 'undefined' && document.visibilityState === 'hidden') onHide() }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
    }
  }

  return {
    markDirty,
    flushNow,
    retryNow,
    getState: () => state,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    writeRecoverySync: () => writeRecoverySync(deps.projectId, deps.serialize),
    installUnloadHandlers,
    dispose: () => { disposed = true; clearTimers(); if (backoffTimer) clearTimeout(backoffTimer); listeners.clear() },
  }
}

export const RECOVERY_LIMIT_BYTES = 4_000_000 // ~4MB, under the ~5MB localStorage ceiling
const RECOVERY_PREFIX = 'mfa-recovery:'

export interface RecoverySnapshot { payload: SavePayload; savedAt: number }

/** Synchronously write a recovery snapshot to localStorage (safe to call in
 *  pagehide/beforeunload, where async IndexedDB cannot be awaited). Returns false
 *  if serialization is unavailable, the payload is too large, or storage throws. */
export function writeRecoverySync(projectId: string, serialize: () => SerializeResult | null): boolean {
  try {
    if (typeof localStorage === 'undefined' || !projectId) return false
    const result = serialize()
    if (!result) return false
    const body = JSON.stringify({ payload: result.payload, savedAt: Date.now() })
    if (body.length > RECOVERY_LIMIT_BYTES) return false
    localStorage.setItem(RECOVERY_PREFIX + projectId, body)
    return true
  } catch (err) {
    // Best-effort; the beforeunload confirm dialog is the fallback. Not a user toast.
    return false
  }
}

export function readRecovery(projectId: string): RecoverySnapshot | null {
  try {
    if (typeof localStorage === 'undefined' || !projectId) return null
    const raw = localStorage.getItem(RECOVERY_PREFIX + projectId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.savedAt !== 'number' || !parsed.payload) return null
    return parsed as RecoverySnapshot
  } catch (err) {
    return null
  }
}

export function clearRecovery(projectId: string): void {
  try {
    if (typeof localStorage === 'undefined' || !projectId) return
    localStorage.removeItem(RECOVERY_PREFIX + projectId)
  } catch (err) {
    /* best-effort */ void err
  }
}
