# Stability & Trust — Phase 3 (Data Integrity: saveManager + status chip + recovery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make design data loss structurally hard. Replace the inline autosave loop with a `saveManager` that (1) detects *content* changes via a hash instead of byte-length, (2) surfaces `saved / saving / error` as a Navbar status chip with click-to-retry instead of a swallowed `.catch`, and (3) protects the last edits on tab-close via a three-layer unload strategy with a localStorage recovery snapshot that is offered back on reopen.

**Architecture:** A framework-free `src/utils/saveManager.ts` owns scheduling (debounce + max-wait), an FNV-1a content hash, a `saved|dirty|saving|error` state machine with a subscription, exponential-backoff retry, unload handlers, and per-project recovery-snapshot read/write/clear. All editor-specific serialization (scenify `exportToJSON`, clip tagging, page write-back, thumbnail) stays in `Editor.tsx` behind an injected `serialize()` callback, so the manager imports no canvas/fabric code and is fully node-unit-testable. A `SaveStatusChip` subscribes to the manager for the Navbar UI. On project open, a recovery snapshot newer than the stored project is offered for restore; it clears after the next successful IndexedDB write.

**Tech Stack:** React 17, TypeScript 4.1, CRA 4 / CRACO, BaseUI, Jest 26 (`craco test`), `@/utils/projectStore` (IndexedDB), `@/lib/logger` (from Phase 0–2). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-02-stability-and-trust-design.md` — this plan implements spec **Phase 3** and decisions **D5** (save = state not toasts; FNV-1a content hash) and **D6** (three-layer unload + recovery snapshot; `canva_clone_*` key migration). Builds on the shipped Phase 0–2 branch (PR #1).

---

## Conventions (read once, applies to every task)

**Branch:** create and work on `feat/stability-phase-3-data-integrity` off `main` **after PR #1 merges**; if PR #1 is not yet merged, branch off `feat/stability-phase-0-2` (the logger + CI this plan depends on live there) and note it in the PR.

**Package manager is yarn v1.** Never `npm install`.

**Commands:**
- One test: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test <path> --watchAll=false` → expect `PASS`
- All tests: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test --watchAll=false` → baseline **8 suites / 53 tests** at branch start
- Base typecheck: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json` → exit 0
- Strict typecheck (MUST pass — this plan adds `src/utils/saveManager.ts`, and the ratchet should widen to cover it): `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.strict.json`
- Lint (the silent-catch gate is now an ERROR — every new catch must route through `fail`/`log.warn`/`ignoreError`): `npx eslint src --ext .ts,.tsx --max-warnings 9999` → 0 errors
- Run app (port 3000 taken): `BROWSER=none PORT=3005 NODE_OPTIONS=--openssl-legacy-provider npx craco start`

**Test environment:** pure-logic tests start with `/** @jest-environment node */` and use RELATIVE imports (`./saveManager`), never `@/`. Tests needing `window`/`localStorage` DOM (unload handlers) omit the node docblock (jsdom default) and must not import fabric/scenify/canvas. App code uses the `@/` alias.

**Error taxonomy (from Phase 0–2, enforced by lint):** `fail(scope, staticMsg, err)` = user-facing toast; `log.warn(scope, msg, err)` = logged fallback, no toast; `ignoreError(err, reason)` = benign. **Autosave failures do NOT toast on every tick** — they set the chip to `error` (D5). A *single* escalation toast is allowed only after retries are exhausted.

**Strict ratchet update (do this in Task 1):** add `"src/utils/saveManager.ts"` (and its deps) into `tsconfig.strict.json`'s `include`, so the new module is strict from day one. Do NOT add all of `src/utils` (it has pre-existing loose code).

---

## File structure

| File | Responsibility |
|---|---|
| `src/utils/saveManager.ts` (new) | Framework-free save engine: `fnv1a` hash, `createSaveManager(deps)` factory (state machine, debounce+maxWait scheduling, retry backoff, `markDirty`/`flushNow`/`getState`/`subscribe`), unload handlers, and module-level recovery-snapshot helpers (`readRecovery`/`clearRecovery`/`writeRecoverySync`). No React, no fabric. |
| `src/utils/saveManager.test.ts` (new) | Node-env pure tests: hash, change-detection, scheduling, state transitions, retry backoff, recovery size-guard. |
| `src/utils/saveManager.dom.test.ts` (new) | jsdom tests: unload-handler wiring writes a recovery snapshot; beforeunload-while-dirty path. |
| `src/components/SaveStatusChip.tsx` (new) | Presentational chip subscribed to a save manager: `Saved` / `Saving…` / `Save failed — retry`. Click retries. |
| `src/scenes/Editor/Editor.tsx` (modify) | Replace the inline autosave `useEffect` (`657–730`) with a `saveManager` wired via a `serialize()` callback holding the current serialization verbatim; `markDirty()` on the same canvas events; install unload handlers; offer recovery on open. |
| `src/scenes/Editor/components/Navbar/Navbar.tsx` (modify) | Render `<SaveStatusChip/>` in the main (non-embed) layout beside `<History/>`. |
| `src/scenes/Editor/components/Navbar/components/PreviewTemplate.tsx` (modify) | Migrate `canva_clone_*` localStorage keys to the `mfa-` namespace; drop the orphaned `canva_clone_autosave` read. |

---

## Task 1: `fnv1a` content hash (pure, TDD) + strict-ratchet widening

**Files:** Create `src/utils/saveManager.ts` (start it), `src/utils/saveManager.test.ts`; Modify `tsconfig.strict.json`.

- [ ] **Step 1: Widen the strict ratchet**

In `tsconfig.strict.json`, change the `include` to add the new module (keep `src/lib`):
```json
  "include": ["src/lib", "src/utils/saveManager.ts"]
```

- [ ] **Step 2: Write the failing test** — create `src/utils/saveManager.test.ts`:
```ts
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
```

- [ ] **Step 3: Run it, verify it fails** with `Cannot find module './saveManager'`.

- [ ] **Step 4: Implement** — create `src/utils/saveManager.ts` with:
```ts
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
```

- [ ] **Step 5: Run test → PASS (4 tests).** Then strict typecheck → exit 0.

- [ ] **Step 6: Commit**
```bash
git add src/utils/saveManager.ts src/utils/saveManager.test.ts tsconfig.strict.json
git commit -m "feat(save): fnv1a content hash + strict-ratchet saveManager"
```

---

## Task 2: Save state machine — scheduling, change-detection, retry (pure, TDD)

The core engine. Injected clock + timers make it deterministic. `serialize()` returns the payload to persist plus a `changeKey` string to hash; `persist()` writes it (wraps `patchProject`).

**Files:** Modify `src/utils/saveManager.ts`, `src/utils/saveManager.test.ts`.

- [ ] **Step 1: Append the failing tests** to `saveManager.test.ts`. (Transcription note: the `flush()` helper below replaces the old `await Promise.resolve()` idiom — in every test in this file's two `createSaveManager` describe blocks, each settle point after `jest.advanceTimersByTime(...)` uses `await flush()`, not one or two `await Promise.resolve()`. The full corrected file is what shipped; the blocks below already reflect the first test.)
```ts
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

// IMPORTANT (this repo's toolchain): babel-preset-react-app applies the
// regenerator transform to async/await UNCONDITIONALLY, so each `await` in the
// module under test costs several microtask hops to settle — more than a fixed
// 1–2 `await Promise.resolve()`. Drain a generous number of microtask ticks
// after advancing fake timers. Fake timers still advance via advanceTimersByTime;
// flush() only drains the microtask queue the resolved timers/persist enqueue.
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
    await Promise.resolve()
    expect(d.persist).toHaveBeenCalled() // forced by the 3000ms cap
  })

  it('skips persist when content hash is unchanged (same changeKey)', async () => {
    const d = makeDeps() // serialize returns the SAME changeKey until _bump()
    const m = createSaveManager(d)
    m.markDirty(); jest.advanceTimersByTime(600); await Promise.resolve()
    expect(d.persist).toHaveBeenCalledTimes(1)
    m.markDirty(); jest.advanceTimersByTime(600); await Promise.resolve()
    expect(d.persist).toHaveBeenCalledTimes(1) // unchanged → no second write
  })

  it('persists again when content actually changes', async () => {
    const d = makeDeps()
    const m = createSaveManager(d)
    m.markDirty(); jest.advanceTimersByTime(600); await Promise.resolve()
    d._bump() // content changes
    m.markDirty(); jest.advanceTimersByTime(600); await Promise.resolve()
    expect(d.persist).toHaveBeenCalledTimes(2)
  })

  it('transitions saved→saving→saved and notifies subscribers', async () => {
    const d = makeDeps()
    const m = createSaveManager(d)
    const states: string[] = []
    m.subscribe(s => states.push(s.status))
    m.markDirty(); jest.advanceTimersByTime(600); await Promise.resolve(); await Promise.resolve()
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
    await Promise.resolve(); await Promise.resolve()
    expect(m.getState().status).toBe('error')
    jest.advanceTimersByTime(1000) // first backoff
    await Promise.resolve(); await Promise.resolve()
    expect(persist).toHaveBeenCalledTimes(2)
    expect(m.getState().status).toBe('saved')
  })

  it('retryNow() forces an immediate retry from error state', async () => {
    const persist = jest.fn()
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce(undefined)
    const d = makeDeps({ persist })
    const m = createSaveManager(d)
    m.markDirty(); jest.advanceTimersByTime(600); await Promise.resolve(); await Promise.resolve()
    expect(m.getState().status).toBe('error')
    m.retryNow(); await Promise.resolve(); await Promise.resolve()
    expect(m.getState().status).toBe('saved')
  })
})
```

- [ ] **Step 2: Run → verify failures** (`createSaveManager` undefined).

- [ ] **Step 3: Implement** — append to `src/utils/saveManager.ts`:
```ts
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
      // persist. markDirty() flips status to 'dirty' before run(), so a no-op
      // edit lands here; settle the chip back to 'saved'.
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
```
(The `writeRecoverySync`/`clearRecovery` referenced here are implemented in Task 3; add temporary stubs at the bottom now so this compiles, and replace them in Task 3 — use non-empty bodies so no lint rule trips: `function clearRecovery(projectId: string): void { void projectId }` and `function writeRecoverySync(projectId: string, serialize: () => SerializeResult | null): boolean { void projectId; void serialize; return false }`.)

- [ ] **Step 4: Run → PASS.** Strict typecheck → 0. Full suite → green.

- [ ] **Step 5: Commit**
```bash
git add src/utils/saveManager.ts src/utils/saveManager.test.ts
git commit -m "feat(save): saveManager core — debounce+maxWait, hash change-detection, backoff retry, state machine"
```

---

## Task 3: Recovery snapshot — write/read/clear with size guard (pure, TDD)

**Files:** Modify `src/utils/saveManager.ts`, `src/utils/saveManager.test.ts`.

- [ ] **Step 1: Append failing tests:**
```ts
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
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Replace the Task-2 stubs** at the bottom of `saveManager.ts` with the real implementation:
```ts
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
```
Note: the two `catch` blocks that `return false`/`return null` are non-empty (they have a return), so they pass the silent-catch lint rule. The `clearRecovery` catch uses `void err` to stay non-empty. Do NOT route these through `log.warn` — recovery is best-effort infrastructure and must never cascade; the returns are the intended handling.

- [ ] **Step 4: Run → PASS.** Strict typecheck → 0. Full suite → green.

- [ ] **Step 5: Commit**
```bash
git add src/utils/saveManager.ts src/utils/saveManager.test.ts
git commit -m "feat(save): recovery snapshot write/read/clear with 4MB size guard"
```

---

## Task 4: Unload handlers (jsdom TDD) — flush + recovery on hide/pagehide/beforeunload

**Files:** Modify `src/utils/saveManager.ts`; Create `src/utils/saveManager.dom.test.ts`.

- [ ] **Step 1: Write the jsdom test** (no node docblock) — `src/utils/saveManager.dom.test.ts`:
```ts
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
```

- [ ] **Step 2: Run → fail** (`installUnloadHandlers` undefined).

- [ ] **Step 3: Add `installUnloadHandlers` to the manager** (inside `createSaveManager`, before the `return`, and expose it on the returned object + the `SaveManager` interface):
```ts
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
```
Add `installUnloadHandlers: () => (() => void)` to the `SaveManager` interface and `installUnloadHandlers,` to the returned object.

- [ ] **Step 4: Run → PASS.** Strict typecheck → 0. Full suite → green.

- [ ] **Step 5: Commit**
```bash
git add src/utils/saveManager.ts src/utils/saveManager.dom.test.ts
git commit -m "feat(save): unload handlers — flush + sync recovery snapshot on hide/pagehide/beforeunload"
```

---

## Task 5: `SaveStatusChip` component

**Files:** Create `src/components/SaveStatusChip.tsx`.

- [ ] **Step 1: Implement** (presentational; takes the live state + a retry callback so it needs no test harness — behavior is covered by the manager tests + manual verification):
```tsx
import { useEffect, useState } from 'react'
import { styled } from 'baseui'
import type { SaveManager, SaveState } from '@/utils/saveManager'

const Chip = styled('button', ({ $tone }: { $tone: string }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '28px',
  padding: '0 10px',
  borderRadius: '14px',
  border: 'none',
  fontSize: '12px',
  fontWeight: 600,
  cursor: $tone === 'error' ? 'pointer' : 'default',
  background: $tone === 'error' ? '#fee2e2' : $tone === 'saving' ? '#eef2ff' : '#ecfdf5',
  color: $tone === 'error' ? '#b91c1c' : $tone === 'saving' ? '#4338ca' : '#047857',
}))

const Dot = styled('span', ({ $tone }: { $tone: string }) => ({
  width: '7px', height: '7px', borderRadius: '50%',
  background: $tone === 'error' ? '#dc2626' : $tone === 'saving' ? '#6366f1' : '#10b981',
}))

function label(s: SaveState): string {
  if (s.status === 'error') return 'Save failed — retry'
  if (s.status === 'saving') return 'Saving…'
  if (s.status === 'dirty') return 'Unsaved changes'
  return 'All changes saved'
}

/** Navbar chip bound to a SaveManager. Click retries when in the error state. */
export default function SaveStatusChip({ manager }: { manager: SaveManager | null }) {
  const [state, setState] = useState<SaveState>(manager ? manager.getState() : { status: 'saved' })
  useEffect(() => {
    if (!manager) return
    setState(manager.getState())
    return manager.subscribe(setState)
  }, [manager])
  if (!manager) return null
  const tone = state.status === 'error' ? 'error' : state.status === 'saving' ? 'saving' : 'saved'
  return (
    <Chip $tone={tone} type="button" onClick={() => { if (state.status === 'error') manager.retryNow() }}
      title={state.lastError ? `Save failed: ${state.lastError}` : label(state)}>
      <Dot $tone={tone} />
      {label(state)}
    </Chip>
  )
}
```

- [ ] **Step 2: Verify** — base + strict typecheck (SaveStatusChip is not in the strict include, base is enough) → 0; build not required yet.

- [ ] **Step 3: Commit**
```bash
git add src/components/SaveStatusChip.tsx
git commit -m "feat(save): SaveStatusChip — Saved/Saving/Failed with click-to-retry"
```

---

## Task 6: Wire saveManager into Editor.tsx (replace the inline loop)

The delicate task. Replace the inline autosave `useEffect` (`Editor.tsx:657–730`) with a manager whose `serialize()` holds the **exact current serialization** and whose `markDirty()` fires on the **same** canvas events. Preserve `frameReadyRef` gating and clip/page write-back verbatim.

**Files:** Modify `src/scenes/Editor/Editor.tsx`.

- [ ] **Step 1: Add imports** near the other `@/utils` imports:
```ts
import { createSaveManager, readRecovery } from '@/utils/saveManager'
import type { SaveManager } from '@/utils/saveManager'
import { fail } from '@/lib/logger'
```
(`fail` may already be imported — if so, don't duplicate.)

- [ ] **Step 2: Hold the manager in a ref** (near the other refs, ~line 142):
```ts
  const saveManagerRef = useRef<SaveManager | null>(null)
```

- [ ] **Step 3: Replace the autosave `useEffect`** (currently `657–730`, the block starting `// Auto-save the design so reloads never lose work:` through its closing `}, [editor, routeId])`) with:
```ts
  // Auto-save via saveManager: content-hash change detection, a status chip,
  // retry/backoff, and unload-time recovery snapshots (replaces the old inline
  // length-signature loop). All editor-specific serialization stays here.
  useEffect(() => {
    if (!editor || !routeId) return
    const buildSerialize = () => {
      if (!frameReadyRef.current) return null
      const ed = editor as any
      const json = typeof ed.exportToJSON === 'function' ? ed.exportToJSON() : null
      if (!json) return null
      const objs = json.objects || []
      const cv = getFabricCanvas(editor)
      const liveObjs: any[] = cv?.getObjects?.() || []
      const clipsToSave = clipsRef.current.map(c => {
        const obj = liveObjs.find(o => o.metadata?.id === c.id || o.id === c.id)
        return { ...c, canvasObjectId: obj?.id || (c as any).canvasObjectId }
      })
      const audioToSave = audioClipsRef.current
      const clipSig = clipsToSave.map(c => `${c.id}:${c.start}:${c.duration}:${c.canvasObjectId || ''}`).join(',')
      const audioSig = audioToSave.map((a: any) => `${a.id}:${a.start}:${a.duration}:${a.volume}`).join(',')
      // changeKey hashes CONTENT (objects JSON), not byte-length — catches
      // same-length edits the old signature skipped.
      const changeKey = JSON.stringify(objs) + '|' + clipSig + '|' + audioSig
      const thumb = cv ? makeThumbnail(cv) : undefined
      if (pagesRef.current.length === 0) pagesRef.current = [{ id: genProjectId(), json: null }]
      const idx = Math.min(activePageRef.current, pagesRef.current.length - 1)
      pagesRef.current[idx] = { ...pagesRef.current[idx], json, thumbnail: thumb }
      return {
        payload: { pages: pagesRef.current, activePage: idx, json, clips: clipsToSave, audioClips: audioToSave, thumbnail: thumb },
        changeKey,
      }
    }

    let escalated = false
    const manager = createSaveManager({
      serialize: buildSerialize,
      persist: (payload) => patchProject(routeId, payload).then(() => undefined),
      projectId: routeId,
      onEscalate: (msg) => { if (!escalated) { escalated = true; fail('autosave', msg) } },
    })
    saveManagerRef.current = manager
    const removeUnload = manager.installUnloadHandlers()

    const cv = getFabricCanvas(editor)
    const onChange = () => manager.markDirty()
    cv?.on?.('object:added', onChange)
    cv?.on?.('object:modified', onChange)
    cv?.on?.('object:removed', onChange)

    return () => {
      removeUnload()
      cv?.off?.('object:added', onChange)
      cv?.off?.('object:modified', onChange)
      cv?.off?.('object:removed', onChange)
      manager.dispose()
      saveManagerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, routeId])
```

- [ ] **Step 4: Make page navigation mark dirty.** The old `persistPages` (`~147–156`) directly `patchProject`s pages on nav. Keep it (it persists page structure immediately), but ALSO call `saveManagerRef.current?.markDirty()` at the end of `persistPages` so the chip reflects the change. Add as the last line inside `persistPages`'s body:
```ts
    saveManagerRef.current?.markDirty()
```

- [ ] **Step 5: Verify** — base typecheck → 0; strict typecheck → 0 (saveManager only); full suite → green (no test imports Editor). Then a **manual smoke** on port 3005: open a design, add a shape, watch the chip go Saving…→All changes saved; reload → the shape persists (unchanged behavior).

- [ ] **Step 6: Commit**
```bash
git add src/scenes/Editor/Editor.tsx
git commit -m "refactor(save): Editor autosave now driven by saveManager (hash detection, chip, unload snapshot)"
```

---

## Task 7: Render the chip in the Navbar

The chip needs the manager. Expose it via a lightweight context (the Navbar is a sibling under the editor tree). Simplest: a React context holding the current `SaveManager | null`, provided in `Editor.tsx` and consumed by the Navbar.

**Files:** Create `src/contexts/SaveManagerContext.tsx`; Modify `src/scenes/Editor/Editor.tsx`, `src/scenes/Editor/components/Navbar/Navbar.tsx`.

- [ ] **Step 1: Create the context** — `src/contexts/SaveManagerContext.tsx`:
```tsx
import { createContext, useContext } from 'react'
import type { SaveManager } from '@/utils/saveManager'

export const SaveManagerContext = createContext<SaveManager | null>(null)
export const useSaveManager = () => useContext(SaveManagerContext)
```

- [ ] **Step 2: Provide it in Editor.tsx.** Because the manager is created in an effect, hold it in state (not just the ref) so the provider re-renders when it's ready. Add near the other `useState`s:
```ts
  const [saveManager, setSaveManager] = useState<SaveManager | null>(null)
```
In the Task-6 effect, after `saveManagerRef.current = manager`, add `setSaveManager(manager)`, and in the cleanup add `setSaveManager(null)`. Then wrap the editor's rendered subtree (which includes `<Navbar/>`) with `<SaveManagerContext.Provider value={saveManager}>…</SaveManagerContext.Provider>`. Import both `SaveManagerContext` and `useState` as needed.

- [ ] **Step 3: Render the chip in the Navbar.** In `src/scenes/Editor/components/Navbar/Navbar.tsx`, import:
```ts
import SaveStatusChip from '@/components/SaveStatusChip'
import { useSaveManager } from '@/contexts/SaveManagerContext'
```
In `NavbarEditor`, add `const saveManager = useSaveManager()`. In the **main (non-embed) layout** — the return NOT under `if (config.isEmbedMode)`, near `<History />` (currently ~line 335) — render the chip right after `<History />`:
```tsx
        <History />
        <SaveStatusChip manager={saveManager} />
```
Do NOT add it to the embed-mode navbar (embed has its own host-save flow).

- [ ] **Step 4: Verify** — base typecheck → 0; build (`CI=false … craco build`) → Compiled; full suite → green. Manual: the chip appears beside undo/redo and updates as you edit.

- [ ] **Step 5: Commit**
```bash
git add src/contexts/SaveManagerContext.tsx src/scenes/Editor/Editor.tsx src/scenes/Editor/components/Navbar/Navbar.tsx
git commit -m "feat(save): render SaveStatusChip in the editor navbar via SaveManagerContext"
```

---

## Task 8: Offer recovery snapshot on project open

When opening a design, if a recovery snapshot exists that is newer than the stored project's `updatedAt`, offer to restore it before importing the saved json.

**Files:** Modify `src/scenes/Editor/Editor.tsx`.

- [ ] **Step 1: In the project-restore effect** (the `else if (routeId)` branch at `~516`, inside `getProject(routeId).then(project => {…})`), before applying `project`'s pages/json, check for a newer snapshot:
```ts
          const snap = readRecovery(routeId)
          const projectUpdatedAt = (project as any)?.updatedAt || 0
          const useSnapshot =
            !!snap && snap.savedAt > projectUpdatedAt &&
            // eslint-disable-next-line no-restricted-globals
            window.confirm('You have unsaved changes from your last session. Restore them?')
          const source: any = useSnapshot ? snap!.payload : project
```
Then use `source` where the code currently reads `project` for `pages`/`activePage`/`json`/`clips`/`audioClips` (the payload shape matches `Project`'s relevant fields by construction). If `useSnapshot` is false and a stale snapshot exists, clear it: `else if (snap) clearRecovery(routeId)`.

> Implementer note: read the current 30–40 lines of that `.then` and thread `source` through the existing pages/frame/clip restore logic **without changing control flow** — this is the one spot that needs care. If the restore logic is too entangled to thread cleanly, STOP and report; do not rewrite the restore flow.

- [ ] **Step 2: `window.confirm` is a blocking dialog** — acceptable here (it's a deliberate one-time restore prompt, not an editor-loop dialog). Add `readRecovery, clearRecovery` to the saveManager import.

- [ ] **Step 3: Verify** — typecheck → 0; full suite → green. Manual drill (the headline acceptance): open a design, make an edit, then **kill the tab** (close it) while the chip still says Saving…/Unsaved; reopen the same design → the confirm prompt appears → Accept → the edit is present. Then edit + let it save (chip: All changes saved) → reload → **no** prompt (snapshot was cleared after the successful save).

- [ ] **Step 4: Commit**
```bash
git add src/scenes/Editor/Editor.tsx
git commit -m "feat(save): offer recovery snapshot on open when newer than the stored project"
```

---

## Task 9: Migrate `canva_clone_*` localStorage keys

**Files:** Modify `src/scenes/Editor/components/Navbar/components/PreviewTemplate.tsx`.

- [ ] **Step 1:** Replace the write key (`~line 35`): `'canva_clone_temp_state'` → `'mfa-preview-template-state'`.

- [ ] **Step 2:** Replace the read (`~133–134`):
```ts
      const savedState = localStorage.getItem('mfa-preview-template-state') ||
        localStorage.getItem('canva_clone_temp_state') // fall back to the pre-migration key once
```
Drop the orphaned `localStorage.getItem('canva_clone_autosave')` entirely (it is never written anywhere — confirmed by grep). Keeping a one-release read of the old `canva_clone_temp_state` key means an in-progress preview from before the update still recovers; it can be removed in a later cleanup.

- [ ] **Step 3: Verify** — typecheck → 0; lint the file → 0; full suite → green.

- [ ] **Step 4: Commit**
```bash
git add src/scenes/Editor/components/Navbar/components/PreviewTemplate.tsx
git commit -m "chore(save): migrate canva_clone_* localStorage keys to the mfa- namespace"
```

---

## Task 10: Final verification (the D5/D6 acceptance drills) + push + PR

**Files:** none (verification + docs).

- [ ] **Step 1: Full local pipeline** (what CI runs): frozen install, base tsc, strict tsc, lint (0 errors), full tests (expect **9 suites** now — saveManager + saveManager.dom added), build. All green.

- [ ] **Step 2: Induced-failure drills** on port 3005 (spec §8), in a production build too where noted:
  1. **Same-length edit saves (D5 hash):** type a character then replace it with a different character (same length) → chip goes Saving…→saved (the old length signature would have skipped this). Confirm via reload that the change persisted.
  2. **Blocked IndexedDB (chip error + retry):** DevTools → Application → temporarily deny storage / or throw in `patchProject` via a breakpoint → make an edit → chip shows **Save failed — retry** within one debounce cycle; restore storage; click the chip → chip returns to saved.
  3. **Kill-tab-while-dirty → restore:** edit, then close the tab before it saves → reopen the design → confirm prompt → Accept → edit present.
  4. **Snapshot clears after save:** edit → wait for All changes saved → reload → **no** restore prompt.
  5. **No toast storm:** block saves for ~30s → at most ONE escalation toast (after retries), not one per tick.

- [ ] **Step 2b:** If any drill fails, fix and re-run before proceeding. Record the drill results in the PR body.

- [ ] **Step 3: Update the spec status** — in `docs/superpowers/specs/2026-07-02-stability-and-trust-design.md`, note Phase 3 as implemented (a one-line status marker near Phase 3 in §6).

- [ ] **Step 4: Push + PR**
```bash
git push -u origin feat/stability-phase-3-data-integrity
gh pr create --base main --title "Stability Phase 3 (Data Integrity): saveManager + status chip + recovery" --body-file <drill-results + summary>
gh run watch <run-id> --exit-status
```

- [ ] **Step 5:** Confirm CI green on the PR.

---

## Self-review notes (done at plan time)

- **Spec coverage:** D5 (state-not-toasts chip + FNV-1a content hash) → Tasks 1, 2, 5, 6, 7. D6 (three-layer unload + recovery snapshot + `canva_clone_*` migration) → Tasks 3, 4, 8, 9. Phase 3 acceptance criteria → Task 10 drills (each acceptance bullet maps to a numbered drill).
- **Control-flow risk is isolated to Task 6 and Task 8** (the Editor extraction and the recovery-source threading). Both carry an explicit "stop and report if entangled" instruction, and the serialization logic is copied verbatim (only the length→hash `changeKey` and the payload-return shape change). The old behavior (frameReadyRef gating, clip tagging, page write-back, same canvas events) is preserved.
- **The old length-signature bug is fixed** by hashing `JSON.stringify(objs)` (content) instead of measuring `.length`. `JSON.stringify(objs)` was already computed in the old code (for `.length`), so no new per-tick cost.
- **Autosave never toasts per failure** (D5): the manager sets `error` state → chip; a single escalation toast fires only after `MAX_RETRIES_BEFORE_ESCALATE`.
- **Type consistency:** `SaveManager`, `SaveState`, `SaveStatus`, `SavePayload`, `SerializeResult`, `RecoverySnapshot`, `createSaveManager`, `readRecovery`/`clearRecovery`/`writeRecoverySync`, `installUnloadHandlers`, `markDirty`/`flushNow`/`retryNow`/`getState`/`subscribe`/`dispose` — names are consistent across Tasks 1–8 and the two consumers.
- **Lint compliance:** the two recovery `catch` blocks return a value (non-empty body) so they pass the silent-catch error rule; `clearRecovery`'s catch uses `void err`. No bare catches introduced.
- **Deferred (spec §13 / later phases):** audio waveforms, version history, cloud/Supabase saves — NOT in this plan. This plan keeps IndexedDB as the single store and adds only the localStorage recovery snapshot.
