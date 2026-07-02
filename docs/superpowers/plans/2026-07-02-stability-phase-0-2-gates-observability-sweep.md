# Stability & Trust — Phase 0 (Gates & Pins) + Phase 1 (Observability Core) + Phase 2 (The Sweep) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After this plan, no failure in the editor is silent — every catch routes through a logger taxonomy (`fail` / `log.warn` / `ignoreError`), uncaught errors surface globally with toast dedupe, and a brand-new CI pipeline (typecheck + strict-ratchet + tests + safety lint rules + build) enforces it on every push so it cannot regress.

**Architecture:** A tiny `src/lib/logger.ts` (console + 200-entry ring buffer + toast dedupe/rate-cap) with `fail()` / `ignoreError()` conveniences; `src/lib/globalErrors.ts` installs `window.onerror`/`unhandledrejection` handlers at boot. All 117 inventoried silent-catch sites migrate onto the taxonomy, then two `no-restricted-syntax` ESLint selectors (which — unlike `no-empty` — also match comment-only bodies) flip to `error` and run in CI.

**Tech Stack:** React 17, TypeScript 4.1, CRA 4 via CRACO, BaseUI (`baseui/toast` behind the existing `src/lib/notify.ts`), Jest 26 (via `craco test`), ESLint 7.32 (`eslint-config-react-app` from package.json `eslintConfig`), **yarn v1** (the repo's active installer — `node_modules/.yarn-integrity` exists and `yarn.lock` is current), GitHub Actions, `patch-package` (scaffolded now, first real patch lands in the Phase 4 plan).

**Spec:** `docs/superpowers/specs/2026-07-02-stability-and-trust-design.md` (this plan covers spec Phases 0, 1, 2. Phases 3 / 4–5 / 6 get their own plans after this ships.)

---

## Conventions (read once, applies to every task)

**Branch:** create and work on `feat/stability-phase-0-2` (off `main`).

**Package manager is yarn v1** (`.yarnrc` sets `--ignore-optional true`). Do not use `npm install` — it would desync `yarn.lock`.

**Commands:**
- Install: `yarn install` (after changing package.json), `yarn install --frozen-lockfile --ignore-optional` (verification, must pass — CI uses it)
- Typecheck: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json` → expect exit 0, no output
- Strict ratchet: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.strict.json` → expect exit 0
- Run one test: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test <path> --watchAll=false` → expect `PASS`
- Run all tests: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test --watchAll=false` → baseline is **6 suites / 37 tests passing** before this plan
- Lint: `npx eslint src --ext .ts,.tsx --max-warnings 9999` (the `--max-warnings 9999` tolerates legacy warnings; **errors** still exit 1)
- Build: `CI=false NODE_OPTIONS=--openssl-legacy-provider npx craco build 2>&1 | tail -5` → expect `Compiled with warnings` (warnings OK, errors not)
- Run the app (port 3000 is taken by another server): `BROWSER=none PORT=3005 NODE_OPTIONS=--openssl-legacy-provider npx craco start`

**Test environment:** Pure-logic tests start with `/** @jest-environment node */`. Tests that need `window` (e.g. `globalErrors.test.ts`) omit the docblock (CRA's default jest env is jsdom) — that's fine as long as the test never imports fabric/scenify/canvas. All test imports are **relative** (`./logger`), never `@/` — CRACO strips tsconfig paths under `craco test`.

**App-code imports:** use the webpack alias, e.g. `import { fail, log, ignoreError } from '@/lib/logger'`. Import **only the names a file actually uses** (unused imports add lint warnings).

**Sweep ground rules (Tasks 7–12):**
1. **Never change control flow.** Only the catch/`.catch` body changes. If code continued after the catch, it still continues; if it returned a fallback, it still returns the fallback.
2. Taxonomy decision rule — when a table row below says "context rule", apply this: the enclosing code runs directly from a user interaction (click/submit/drag/drop) and its failure means the user's intent silently didn't happen → `fail(scope, userMessage, err)`. The code continues with a fallback / degraded path → `log.warn(scope, message, err)`. The failure is expected/benign (races, cleanup, feature-detection, "already removed") → `ignoreError(err, reason)`.
3. Catch clauses without a binding (`catch {`) gain one (`catch (err) {`) so the error can be forwarded.
4. **Do not toast from autosave paths** (`Editor.tsx` save loop) — spec D5 routes those to the Phase 3 status chip; until then they get `log.warn` only.
5. Line numbers in the tables were measured at plan time — verify with the quoted snippet, and search for the snippet if the file has drifted.
6. **`fail()` user messages are static strings** — no interpolated filenames/IDs/URLs (dynamic text defeats toast dedupe and churns the eviction map). Put the dynamic part in the `err` argument; it lands in the log entry's `detail`.

---

## Task 1: Branch, Node pin, engines, patch-package scaffold

**Files:**
- Create: `.nvmrc`
- Create: `patches/.gitkeep`
- Modify: `package.json` (engines, postinstall script, devDependency)

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/stability-phase-0-2
```

- [ ] **Step 2: Create `.nvmrc`**

File content (single line — the locally verified version is v26.1.0):

```
26
```

- [ ] **Step 3: Add `engines` and `postinstall` to package.json**

In `package.json`, add a top-level `engines` field (after `"private": true,`):

```json
  "engines": {
    "node": ">=18"
  },
```

And in `"scripts"`, add:

```json
    "postinstall": "patch-package"
```

- [ ] **Step 4: Install patch-package and create the patches dir**

```bash
yarn add -D patch-package
mkdir -p patches && touch patches/.gitkeep
```

Expected: install succeeds; postinstall prints `patch-package 8.x.x` and `No patch files found` (the scaffold is a no-op until the Phase 4 plan adds the SDK patch).

- [ ] **Step 5: Verify frozen install passes (what CI will run)**

```bash
yarn install --frozen-lockfile --ignore-optional
```

Expected: exit 0 (lockfile in sync), postinstall runs.

- [ ] **Step 6: Verify nothing broke**

Run typecheck and the full test suite (commands in Conventions). Expected: exit 0 / `6 passed, 37 tests`.

- [ ] **Step 7: Commit**

```bash
git add .nvmrc patches/.gitkeep package.json yarn.lock
git commit -m "chore(stability): pin Node (.nvmrc 26), engines field, patch-package scaffold"
```

---

## Task 2: CI workflow (first ever)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    env:
      # webpack 4 (CRA 4) needs the legacy OpenSSL provider on modern Node
      NODE_OPTIONS: --openssl-legacy-provider
      # react-snap's puppeteer is never run in CI — skip its chromium download
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true'
      PUPPETEER_SKIP_DOWNLOAD: 'true'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: yarn

      - name: Install (frozen lockfile; postinstall runs patch-package)
        run: yarn install --frozen-lockfile --ignore-optional

      - name: Typecheck
        run: npx tsc --noEmit -p tsconfig.json

      - name: Tests
        run: npx craco test --watchAll=false

      - name: Build
        env:
          CI: 'false'
        run: npx craco build
```

Notes baked into the file: the Build step calls `craco build` directly (not `yarn build`) so the `postbuild` react-snap prerender is skipped in CI; `CI: 'false'` on that step only, because CRA treats warnings as errors when `CI=true` and the legacy warning debt is out of scope here.

- [ ] **Step 2: Dry-run every CI command locally**

Run in order: the frozen install, typecheck, full tests, and build (Conventions). Expected: all pass — this is exactly what the runner will do.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions pipeline — typecheck, tests, build on every push/PR"
```

(The workflow proves itself on GitHub when this branch is pushed / PR'd at the end of the plan.)

---

## Task 3: TypeScript strict ratchet

**Files:**
- Create: `tsconfig.strict.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `tsconfig.strict.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true
  },
  "include": ["src/lib"]
}
```

The ratchet: `src/lib` (currently `notify.ts` + its test; every module this plan adds) is strict from day one. Later sub-projects widen `include` directory-by-directory.

- [ ] **Step 2: Run it**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.strict.json
```

Expected: exit 0. If `notify.ts`/`notify.test.ts` surface trivial strict errors (unlikely — they're small and typed), fix them minimally inside `src/lib` as part of this step.

- [ ] **Step 3: Add the CI step**

In `.github/workflows/ci.yml`, insert after the `Typecheck` step:

```yaml
      - name: Typecheck (strict ratchet — src/lib)
        run: npx tsc --noEmit -p tsconfig.strict.json
```

- [ ] **Step 4: Commit**

```bash
git add tsconfig.strict.json .github/workflows/ci.yml
git commit -m "chore(ts): strict-ratchet tsconfig covering src/lib, wired into CI"
```

---

## Task 4: `logger.ts` — the observability core (TDD)

**Files:**
- Create: `src/lib/logger.ts`
- Test: `src/lib/logger.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/logger.test.ts`:

```ts
/** @jest-environment node */
jest.mock('./notify', () => ({ notify: jest.fn() }))
import { notify } from './notify'
import { log, fail, ignoreError, getRecentLogs, __resetLoggerForTests } from './logger'

const mockNotify = notify as jest.Mock

describe('logger', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern')
    jest.setSystemTime(1_000_000)
    __resetLoggerForTests()
    mockNotify.mockClear()
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.spyOn(console, 'info').mockImplementation(() => undefined)
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('records entries with scope, level and error detail', () => {
    log.warn('save', 'write failed', new Error('quota'))
    const logs = getRecentLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ level: 'warn', scope: 'save', message: 'write failed', detail: 'Error: quota' })
  })

  it('caps the ring buffer at 200 entries, dropping oldest', () => {
    for (let i = 0; i < 250; i++) log.info('x', `m${i}`)
    const logs = getRecentLogs()
    expect(logs).toHaveLength(200)
    expect(logs[0].message).toBe('m50')
    expect(logs[199].message).toBe('m249')
  })

  it('fail() records an error and toasts negatively', () => {
    fail('export', 'Export failed', new Error('boom'))
    expect(getRecentLogs()[0].level).toBe('error')
    expect(mockNotify).toHaveBeenCalledWith('Export failed', 'negative')
  })

  it('dedupes identical toasts within 30s but records every occurrence', () => {
    fail('export', 'Export failed')
    fail('export', 'Export failed')
    expect(mockNotify).toHaveBeenCalledTimes(1)
    expect(getRecentLogs()).toHaveLength(2)
    jest.setSystemTime(1_000_000 + 31_000)
    fail('export', 'Export failed')
    expect(mockNotify).toHaveBeenCalledTimes(2)
  })

  it('caps toasts at 3 per rolling minute', () => {
    fail('a', 'msg a')
    fail('b', 'msg b')
    fail('c', 'msg c')
    fail('d', 'msg d')
    expect(mockNotify).toHaveBeenCalledTimes(3)
    jest.setSystemTime(1_000_000 + 61_000)
    fail('e', 'msg e')
    expect(mockNotify).toHaveBeenCalledTimes(4)
  })

  it('ignoreError records at debug level and never toasts', () => {
    ignoreError(new Error('benign'), 'best-effort cleanup')
    expect(mockNotify).not.toHaveBeenCalled()
    expect(getRecentLogs()[0]).toMatchObject({ level: 'debug', scope: 'ignored', message: 'best-effort cleanup', detail: 'Error: benign' })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/lib/logger.test.ts --watchAll=false
```

Expected: FAIL — `Cannot find module './logger'`.

- [ ] **Step 3: Implement `src/lib/logger.ts`**

```ts
import { notify } from './notify'

export interface LogEntry {
  time: number
  level: 'error' | 'warn' | 'info' | 'debug'
  scope: string
  message: string
  detail?: string
}

const RING_SIZE = 200
const DEDUPE_MS = 30_000
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 3

const entries: LogEntry[] = []
const lastToastAt = new Map<string, number>()
let rateWindowStart = 0
let rateCount = 0

function describeError(err: unknown): string | undefined {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  if (err === undefined || err === null) return undefined
  return String(err)
}

function record(level: LogEntry['level'], scope: string, message: string, err?: unknown): void {
  entries.push({ time: Date.now(), level, scope, message, detail: describeError(err) })
  if (entries.length > RING_SIZE) entries.shift()
  const line = `[${scope}] ${message}`
  if (level === 'error') console.error(line, err !== undefined ? err : '')
  else if (level === 'warn') console.warn(line, err !== undefined ? err : '')
  else if (level === 'info') console.info(line)
  else if (process.env.NODE_ENV === 'development') console.debug(line, err !== undefined ? err : '')
  const endpoint = process.env.REACT_APP_ERROR_ENDPOINT
  if (endpoint && level === 'error' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(endpoint, JSON.stringify(entries[entries.length - 1]))
    } catch (sinkErr) {
      void sinkErr // the sink must never throw or recurse into record()
    }
  }
}

function maybeToast(message: string): void {
  const now = Date.now()
  const last = lastToastAt.get(message)
  if (last !== undefined && now - last < DEDUPE_MS) return
  if (now - rateWindowStart > RATE_WINDOW_MS) {
    rateWindowStart = now
    rateCount = 0
  }
  if (rateCount >= RATE_MAX) return
  rateCount++
  lastToastAt.set(message, now)
  if (lastToastAt.size > 100) {
    const oldest = lastToastAt.keys().next().value
    if (oldest !== undefined) lastToastAt.delete(oldest)
  }
  notify(message, 'negative')
}

export const log = {
  error: (scope: string, message: string, err?: unknown): void => record('error', scope, message, err),
  warn: (scope: string, message: string, err?: unknown): void => record('warn', scope, message, err),
  info: (scope: string, message: string): void => record('info', scope, message),
  debug: (scope: string, message: string, err?: unknown): void => record('debug', scope, message, err),
}

/** A user-facing action failed: log it AND surface a (deduped, rate-capped) toast. */
export function fail(scope: string, userMessage: string, err?: unknown): void {
  record('error', scope, userMessage, err)
  maybeToast(userMessage)
}

/** Explicitly-ignorable failure (races, best-effort cleanup, feature detection).
 *  Recorded at debug level so it stays greppable and visible in the ring buffer. */
export function ignoreError(err: unknown, reason: string): void {
  record('debug', 'ignored', reason, err)
}

export function getRecentLogs(): ReadonlyArray<LogEntry> {
  return entries.slice()
}

export function __resetLoggerForTests(): void {
  entries.length = 0
  lastToastAt.clear()
  rateWindowStart = 0
  rateCount = 0
}
```

- [ ] **Step 4: Run the test to verify it passes**

Same command as Step 2. Expected: PASS, 6 tests.

- [ ] **Step 5: Verify strict ratchet + full suite still green**

Run the strict typecheck and the full test suite (Conventions). Expected: exit 0; `7 suites` passing now.

- [ ] **Step 6: Commit**

```bash
git add src/lib/logger.ts src/lib/logger.test.ts
git commit -m "feat(observability): logger core — ring buffer, fail()/ignoreError(), toast dedupe + rate cap"
```

> **Post-review hardening (landed as a follow-up commit):** the shipped `logger.ts` additionally guards the `notify()` call in a try/catch (BaseUI's toaster THROWS in dev when no `ToasterContainer` is mounted — i.e. every non-editor route), hardens `describeError` against unstringifiable values (`'[unstringifiable value]'`), wraps `record`'s entire output section (console + beacon) in a never-throw guard with the ring-buffer push outside it, LRU-refreshes the dedupe map (delete-before-set), and adds a dev-only swapped-args warning to `ignoreError`. Test suite grew to 8 (never-throws + exotic-values pinning tests; rate-cap test also asserts suppressed toasts still record). The blocks above show the pre-review core; the shipped files supersede them.

---

## Task 5: Global error handlers (TDD) + boot wiring

**Files:**
- Create: `src/lib/globalErrors.ts`
- Test: `src/lib/globalErrors.test.ts`
- Modify: `src/index.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/lib/globalErrors.test.ts` (needs `window` → default jsdom env, so **no** node docblock):

```ts
jest.mock('./logger', () => ({
  fail: jest.fn(),
  log: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))
import { fail, log } from './logger'
import { installGlobalErrorHandlers } from './globalErrors'

const mockFail = fail as jest.Mock
const mockDebug = log.debug as jest.Mock

describe('globalErrors', () => {
  beforeAll(() => {
    installGlobalErrorHandlers()
  })
  beforeEach(() => {
    mockFail.mockClear()
    mockDebug.mockClear()
  })

  it('routes window error events to fail()', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
    expect(mockFail).toHaveBeenCalledTimes(1)
    expect(mockFail.mock.calls[0][0]).toBe('global')
  })

  it('routes unhandled promise rejections to fail()', () => {
    const ev = Object.assign(new Event('unhandledrejection'), { reason: new Error('rejected') })
    window.dispatchEvent(ev)
    expect(mockFail).toHaveBeenCalledTimes(1)
  })

  it('filters benign browser noise to debug, no toast path', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'ResizeObserver loop limit exceeded' }))
    expect(mockFail).not.toHaveBeenCalled()
    expect(mockDebug).toHaveBeenCalled()
  })

  it('is idempotent — installing twice does not double-handle', () => {
    installGlobalErrorHandlers()
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom2', error: new Error('boom2') }))
    expect(mockFail).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/lib/globalErrors.test.ts --watchAll=false
```

Expected: FAIL — `Cannot find module './globalErrors'`.

- [ ] **Step 3: Implement `src/lib/globalErrors.ts`**

```ts
import { fail, log } from './logger'

const GENERIC_MESSAGE = 'Something went wrong — the last action may not have completed.'

const BENIGN_PATTERNS = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i, // opaque cross-origin errors carry no information
]

function isBenign(message: string): boolean {
  return BENIGN_PATTERNS.some(re => re.test(message))
}

let installed = false

/** Install once at boot (src/index.tsx). Uncaught errors and unhandled promise
 *  rejections are logged with full detail; the user sees one deduped generic toast
 *  (dedupe/rate-cap lives in logger.fail). */
export function installGlobalErrorHandlers(): void {
  if (installed) return
  installed = true

  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || 'Unknown error'
    if (isBenign(message)) {
      log.debug('global', `benign: ${message}`)
      return
    }
    fail('global', GENERIC_MESSAGE, event.error !== undefined && event.error !== null ? event.error : message)
  })

  window.addEventListener('unhandledrejection', (event: Event) => {
    const reason: unknown = (event as PromiseRejectionEvent).reason
    let message = ''
    if (reason instanceof Error) message = reason.message
    else {
      try {
        message = String(reason)
      } catch (coerceErr) {
        void coerceErr
        message = '' // exotic reason — benign filter simply won't match
      }
    }
    if (isBenign(message)) {
      log.debug('global', `benign rejection: ${message}`)
      return
    }
    fail('global', GENERIC_MESSAGE, reason)
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Same command as Step 2. Expected: PASS, 4 tests.

- [ ] **Step 5: Wire into boot**

In `src/index.tsx`, after the existing `import './polyfills'` line, add the import, and call it before rendering:

```ts
import './polyfills'
import { installGlobalErrorHandlers } from './lib/globalErrors'
```

and directly above `const app = (`:

```ts
installGlobalErrorHandlers()
```

Note: `ToasterContainer` is mounted in the Editor scene only — global-handler toasts outside the editor degrade to a console warning from baseui, which is acceptable (the logging still happens; spec scopes the toast UX to the editor).

- [ ] **Step 6: Verify strict + full suite + typecheck**

Run strict typecheck, base typecheck, full tests (Conventions). Expected: all green (8 suites now).

- [ ] **Step 7: Commit**

```bash
git add src/lib/globalErrors.ts src/lib/globalErrors.test.ts src/index.tsx
git commit -m "feat(observability): global onerror/unhandledrejection handlers wired at boot"
```

---

## Task 6: ESLint safety rules (as warnings, for the sweep's guidance)

**Files:**
- Modify: `package.json` (`eslintConfig`)

- [ ] **Step 1: Add the rules**

Replace the current `eslintConfig` block in `package.json` with:

```json
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ],
    "rules": {
      "no-restricted-syntax": [
        "warn",
        {
          "selector": "CatchClause > BlockStatement[body.length=0]",
          "message": "Silent catch. Route it: fail() for failed user actions, log.warn() for fallbacks, ignoreError(err, reason) for genuinely-benign cases (src/lib/logger)."
        },
        {
          "selector": "CallExpression[callee.property.name='catch'] > ArrowFunctionExpression[body.body.length=0]",
          "message": "Empty .catch(). Route through fail()/log.warn()/ignoreError() from src/lib/logger."
        },
        {
          "selector": "CallExpression[callee.property.name='catch'] > FunctionExpression[body.body.length=0]",
          "message": "Empty .catch(). Route through fail()/log.warn()/ignoreError() from src/lib/logger."
        }
      ]
    }
  },
```

Why `no-restricted-syntax` instead of `no-empty`: `no-empty` deliberately ignores blocks containing a comment, so `catch { /* ignore */ }` — 108 of our 117 sites — would pass it. The AST selectors match on statement count (`body.length=0`), which comment-only blocks still have.

- [ ] **Step 2: Run lint and record the baseline**

```bash
npx eslint src --ext .ts,.tsx --max-warnings 9999 2>&1 | grep -c "no-restricted-syntax"
```

Expected: **≈117–125** hits (the plan's classifier found 117 single-line sites; the AST rule also finds multiline empty `.catch()` bodies like `src/index.tsx:32`). Note the exact number — Tasks 7–12 drive it to zero.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(lint): no-restricted-syntax selectors flag silent catches (warn during the sweep)"
```

---

## Tasks 7–12: The sweep

Six cluster tasks. Identical step recipe for each (given after the tables). The tables are the authoritative inventory: `line` (plan-time), the current body (to locate the site), and the exact replacement call. Add `import { fail, log, ignoreError } from '@/lib/logger'` (only the names used) to each touched file.

### Task 7: Sweep S1 — `src/utils/animation/*` (16 sites)

These run inside render/export loops — almost all `ignoreError` (a bad frame must never break the loop; that intent is now recorded, not invisible).

| File:line | Current body | Replacement |
|---|---|---|
| `authoring.ts:27` | `/* give up silently */` | `log.warn('animation', 'could not write animation metadata', err)` |
| `driver.ts:95` | `/* frozen object — fabric will still render it each frame */` | `ignoreError(err, 'frozen object still renders each frame')` |
| `driver.ts:193` | `/* ignore */` | `ignoreError(err, 'per-frame apply must never break the render loop')` |
| `driver.ts:240` | `/* never let one object break the whole pass */` | `ignoreError(err, 'one object must not break the animation pass')` |
| `driver.ts:261` | `/* ignore */` | `ignoreError(err, 'per-frame cleanup')` |
| `exporter.ts:92` | `/* ignore a bad animation frame */` | `ignoreError(err, 'bad animation frame — skipped in export')` |
| `exporter.ts:105` | `/* ignore a bad crop frame */` | `ignoreError(err, 'bad crop frame — skipped in export')` |
| `exporter.ts:194` | `/* ignore */` | `ignoreError(err, 'export compositor best-effort step')` |
| `exporter.ts:219` | `/* ignore */` | `ignoreError(err, 'export compositor best-effort step')` |
| `exporter.ts:257` | `v.el.play().catch(() => {})` | `v.el.play().catch((err) => ignoreError(err, 'export: video play() interrupted'))` |
| `exporter.ts:310` | `/* ignore */` | `ignoreError(err, 'export cleanup')` |
| `exporter.ts:362` | `(pp as Promise<void>).catch(() => {})` | `(pp as Promise<void>).catch((err) => ignoreError(err, 'export: pause() race'))` |
| `exporter.ts:363` | `/* ignore */` | `ignoreError(err, 'export teardown')` |
| `exporter.ts:370` | `/* ignore */` | `ignoreError(err, 'export teardown')` |
| `exporter.ts:376` | `/* ignore */` | `ignoreError(err, 'export teardown')` |
| `gifEncoder.ts:44` | `/* ignore */` | `ignoreError(err, 'gif frame cleanup')` |

### Task 8: Sweep S2 — core utils (20 sites)

| File:line | Current body | Replacement |
|---|---|---|
| `editorHelpers.ts:102,192,238,284,405,454` | `/* ignore */` | `log.warn('editorHelpers', '<what the enclosing helper was doing> failed', err)` — e.g. at 102 the message names the helper's action; keep the existing fallback flow |
| `editorHelpers.ts:300` | `// silently handled` | `log.warn('editorHelpers', 'object add fallback taken', err)` |
| `filters.ts:240` | `// never let custom-filter registration break editor startup / project load` | `log.warn('filters', 'custom filter registration failed — continuing without it', err)` |
| `filters.ts:349` | `// fabric filter backend (webgl/2d) not ready — ignore` | `ignoreError(err, 'filter backend not ready')` |
| `fontLoader.ts:21` | `/* ignore */` | `log.warn('fonts', 'font stylesheet injection failed', err)` |
| `fontLoader.ts:49` | `/* ignore */` | `log.warn('fonts', 'font load failed', err)` |
| `imageEdits.ts:52,58,221,591` | `/* ignore */` | `ignoreError(err, 'image-edit best-effort cleanup')` |
| `imageEdits.ts:316` | `// tainted canvas — fall back to a gentle generic boost` | `log.warn('imageEdits', 'canvas tainted — using generic enhance fallback', err)` |
| `layering.ts:34,50` | `/* ignore */` | `ignoreError(err, 'layering guard — object not layerable right now')` |
| `lucideIconsManager.ts:123` | `/* ignore */` | `log.warn('icons', 'lucide icon render failed', err)` |
| `progressOverlay.ts:160` | `/* already removed */` | `ignoreError(err, 'overlay already removed')` |
| `selectObject.ts:22` | `/* defensive: never let selection wiring break an add */` | `ignoreError(err, 'selection wiring must never break an add')` |
| `whiteboard.ts:52` | `/* ignore */` | `ignoreError(err, 'whiteboard surface repaint')` |

### Task 9: Sweep S3 — `Editor.tsx`, Embed scenes, boot files (23 sites)

**Special rule here:** autosave sites get `log.warn` only (spec D5 — Phase 3's saveManager/chip owns the UX; a toast per failed 2s tick would spam).

| File:line | Current body | Replacement |
|---|---|---|
| `Editor.tsx:154` | `}).catch(() => {})` | `}).catch((err) => log.warn('editor', 'initial restore step failed', err))` |
| `Editor.tsx:172,190,195,243,296` | `/* ignore */` | `log.warn('editor', '<step being attempted, from surrounding code> failed', err)` |
| `Editor.tsx:334` | `/* ignore unknown panel */` | `ignoreError(err, 'unknown panel name in sessionStorage')` |
| `Editor.tsx:342` | `/* sessionStorage unavailable */` | `ignoreError(err, 'sessionStorage unavailable')` |
| `Editor.tsx:363` | `patchProject(routeId, { kind: 'whiteboard' }).catch(() => {})` | `.catch((err) => log.warn('autosave', 'could not persist whiteboard kind', err))` |
| `Editor.tsx:395,542,589,639` | `/* ignore */` | `log.warn('editor', '<contextual message>', err)` |
| `Editor.tsx:704` | `}).catch(() => {})` (autosave `patchProject`) | `}).catch((err) => log.warn('autosave', 'autosave write failed — will retry on next change', err)) // Phase 3: saveManager replaces this with the status chip` |
| `Editor.tsx:705` | `/* ignore save errors */` | `log.warn('autosave', 'autosave serialize failed', err) // Phase 3: saveManager replaces this` |
| `Editor.tsx:791` | `// Canvas not ready or object invalid` | `ignoreError(err, 'canvas not ready for constrain pass')` |
| `Editor.tsx:848` | `// Clipping setup failed` | `log.warn('editor', 'frame clipping setup failed', err)` |
| `EmbedEditor.tsx:234` | `// Canvas not ready or object invalid` | `ignoreError(err, 'canvas not ready for constrain pass')` |
| `EmbedEditor.tsx:289` | `// Clipping setup failed` | `log.warn('embed', 'frame clipping setup failed', err)` |
| `EmbedNavbar.tsx:136` | `// silently handled` | `fail('embed', 'Could not save the design', err)` (save button — user action) |
| `EmbedContext.tsx:105,240` | `// silently handled` | `log.warn('embed', 'host message handling failed', err)` |
| `index.tsx:32` | `.catch(() => { /* ignore registration failures */ })` | `.catch((err) => ignoreError(err, 'service worker registration unsupported'))` — import from `'./lib/logger'` (index.tsx has no alias guarantees at boot; relative is fine here) |
| `polyfills.ts:77` | `console.error('Fabric toDataURL internal crash caught:', e)` | **LEAVE AS-IS** — polyfills must stay dependency-free (it loads before everything); add the comment `// exception: polyfills stay dependency-free — raw console is intentional` |

### Task 10: Sweep S4 — video components, whiteboard toolbar, context menu (16 sites)

| File:line | Current body | Replacement |
|---|---|---|
| `VideoTimeline.tsx:1503` | `// silently handled` | `log.warn('timeline', 'thumbnail/duration extraction failed', err)` |
| `VideoTimeline.tsx:1636` | `videoEl.play().catch(() => { })` | `videoEl.play().catch((err) => ignoreError(err, 'play() interrupted — player will retry'))` |
| `VideoTimeline.tsx:1899,1900` | `/* ignore */` | `ignoreError(err, 'timeline media element cleanup')` |
| `VideoCanvasPlayer.tsx:355,391` | `// silently handled` | `ignoreError(err, 'player/canvas sync best-effort')` |
| `VideoContext.tsx:246` | `/* ignore — the canvas player will (re)start the element */` | `ignoreError(err, 'canvas player restarts the element')` |
| `VideoContext.tsx:261` | `// Ignore abort errors` | `ignoreError(err, 'abort during seek')` |
| `WhiteboardToolbar.tsx:79` | `/* ignore */` | `log.warn('whiteboard', 'tool switch failed', err)` |
| `WhiteboardToolbar.tsx:142,146` | `/* ignore */` | `fail('whiteboard', 'Could not add that to the board', err)` (insert actions — context rule) |
| `ContextMenu.tsx:160` | `// silently handled` | `fail('edit', 'Paste failed — check clipboard permissions', err)` |
| `ContextMenu.tsx:175` | `/* ignore */` | `ignoreError(err, 'clipboard probe unsupported')` |
| `ContextMenu.tsx:234` | `// silently handled` | `log.warn('edit', 'context-menu action failed', err)` |
| `Footer.tsx:51` | `/* ignore */` | `ignoreError(err, 'zoom guard')` |
| `Duplicate.tsx:23` | `/* ignore */` | `fail('edit', 'Duplicate failed', err)` |

### Task 11: Sweep S5 — panels, navbar, export (25 sites)

User-action-dense cluster — most sites become `fail()`.

| File:line | Current body | Replacement |
|---|---|---|
| `AIDesigner.tsx:370,459` | `// silently handled` | `fail('aiDesigner', 'The AI request failed — please try again', err)` |
| `AIDesigner.tsx:509` | `// silently handled` | `log.warn('aiDesigner', 'response post-processing failed', err)` |
| `AiStudio.tsx:693` | `/* skip */` | `ignoreError(err, 'unparseable stream chunk skipped')` |
| `AiStudio.tsx:838` | `/* 402 handled */` | `ignoreError(err, '402 surfaced via credits modal upstream')` |
| `AiStudio.tsx:930` | `/* skip */` | `ignoreError(err, 'optional enrichment skipped')` |
| `FontFamily.tsx:82` | `// Silently fail if canvas not ready` | `ignoreError(err, 'canvas not ready for font preview')` |
| `FontFamily.tsx:194,210` | `/* font change failed */` | `fail('fonts', 'Could not apply this font', err)` |
| `Illustrations.tsx:199` | `// silently handled` | `fail('elements', 'Could not add the illustration', err)` |
| `Images.tsx:55` | `// silently handled` | `fail('images', 'Image search failed', err)` |
| `Pexels.tsx:264` | `// silently handled` | `fail('photos', 'Could not add this photo', err)` |
| `Templates.tsx:87` | `/* ignore */` | `fail('templates', 'Could not load this template', err)` |
| `Uploads.tsx:35` | `/* ignore */` | `log.warn('uploads', 'stored uploads unreadable — starting empty', err)` |
| `Video.tsx:773,909` | `// silently handled` | `fail('video', 'Could not add the video', err)` (both are add/insert paths; verify with context rule) |
| `Video.tsx:1289` | bare `videoEl.play()` (play/pause toggle — rapid toggling rejects with AbortError, reaching the global handler as a false "Something went wrong" toast) | append `.catch((err) => ignoreError(err, 'play() interrupted by pause'))` |
| `Video.tsx:1124` | bare `video.play()` (webcam preview) | append `.catch((err) => ignoreError(err, 'preview play() interrupted'))` |
| `Navbar.tsx:250` | `// silently handled` | context rule — user-triggered (e.g. rename/save action) → `fail('navbar', '<action> failed', err)`; else `log.warn('navbar', …)` |
| `ExportModal.tsx:427,511,600` | `/* ignore */` | `ignoreError(err, 'export cleanup best-effort')` |
| `ExportModal.tsx:716,777` | `// silently handled` | `fail('export', 'Export failed', err)` (export steps — user must know) |
| `ExportModal.tsx:794` | `/* ignore */` | `ignoreError(err, 'export modal teardown')` |
| `PreviewTemplate.tsx:35,79` | `// silently handled` | `log.warn('preview', 'template preview state save failed', err)` |

### Task 12: Sweep S6 — services, store, remaining scenes (15 sites)

| File:line | Current body | Replacement |
|---|---|---|
| `InsufficientCreditsModal.tsx:236` | `console.error('Failed to create subscription checkout:', err)` | `fail('credits', 'Could not open the checkout page', err)` |
| `InsufficientCreditsModal.tsx:248` | `console.error('Failed to create topup checkout:', err)` | `fail('credits', 'Could not open the checkout page', err)` |
| `UrlToVideo.tsx:102` | `/* silently handled */` | `fail('urlToVideo', 'Could not process that URL', err)` |
| `openrouter.ts:91` | `// silently handled` | `log.warn('ai', 'openrouter response parse fallback', err)` |
| `store/slices/creations/actions.ts:14` | `// silently fail` | `log.warn('store', 'creations persistence failed', err)` |
| `store/slices/elements/actions.ts:13` | `// silently fail` | `log.warn('store', 'elements persistence failed', err)` |
| `store/slices/templates/actions.ts:13` | `// silently fail` | `log.warn('store', 'templates persistence failed', err)` |
| `store/slices/uploads/actions.ts:17` | `// silently fail` | `log.warn('store', 'uploads persistence failed', err)` |
| `Projects.tsx:139` | `/* keep original */` | `ignoreError(err, 'thumbnail regeneration — original kept')` |
| `Projects.tsx:144` | `/* image too large for sessionStorage — design still opens */` | `log.warn('projects', 'thumbnail too large for sessionStorage — design still opens', err)` |
| `ExportTest.tsx:51,161,229,265,494` | `// silently handled` / `// Ignore errors` | `log.warn('exportTest', 'test-harness step failed', err)` (dev playground route — no toasts) |

### Step recipe for each of Tasks 7–12

- [ ] **Step 1: Apply the table.** For every row: open the file at the quoted line (search for the quoted body if drifted), give the catch a binding if missing (`catch {` → `catch (err) {`), replace the body with the replacement call, keep all surrounding control flow identical. Add the logger import (only used names) at the top of the file. Where a row says "context rule" or `<contextual message>`, read the enclosing function and write a specific message per Conventions rule 2 — the classification (fail/warn/ignore) given in the table stands unless the context plainly contradicts it, in which case follow the context rule and note it in the commit body.
- [ ] **Step 2: Verify the cluster is clean.** Run `npx eslint <the files touched> --ext .ts,.tsx` — expect zero `no-restricted-syntax` warnings in these files.
- [ ] **Step 3: Typecheck + tests.** Base tsc + full suite (Conventions). Expected: green, no count regressions.
- [ ] **Step 4: Commit.**

```bash
git add <touched files>
git commit -m "refactor(observability): sweep <cluster> — route silent catches through fail/log/ignoreError"
```

(One commit per task, S1…S6.)

---

## Task 13: Flip lint rules to error + wire into CI

**Files:**
- Modify: `package.json` (`eslintConfig` — `"warn"` → `"error"`)
- Modify: `.github/workflows/ci.yml`
- Modify: `src/lib/globalErrors.test.ts` (four review-requested branch tests: benign-rejection path, exotic `Object.create(null)` reason, `error: null` + real-message fallback passing the string as err, and the `Script error.` pattern)

- [ ] **Step 1: Verify zero remaining hits**

```bash
npx eslint src --ext .ts,.tsx --max-warnings 9999 2>&1 | grep -c "no-restricted-syntax" || echo 0
```

Expected: `0`. If any stragglers remain (the AST rule sees more than the plan-time classifier — multiline `.catch()` bodies), sweep them with the same taxonomy now.

- [ ] **Step 2: Flip severity**

In `package.json` `eslintConfig`, change `"no-restricted-syntax": ["warn",` to `"no-restricted-syntax": ["error",`.

- [ ] **Step 3: Add the CI lint step**

In `.github/workflows/ci.yml`, insert after the strict-typecheck step:

```yaml
      - name: Lint (safety rules — silent catches are errors)
        run: npx eslint src --ext .ts,.tsx --max-warnings 9999
```

- [ ] **Step 4: Prove the gate bites**

Temporarily add `try { JSON.parse('x') } catch {}` to any src file → run the lint command → expect **exit 1** with the no-restricted-syntax error → **revert the temporary edit**.

- [ ] **Step 5: Full local pipeline + commit**

Run: frozen install, base tsc, strict tsc, full tests, lint, build (all from Conventions). Expected: all green.

```bash
git add package.json .github/workflows/ci.yml
git commit -m "chore(lint): silent-catch rules now errors, enforced in CI"
```

---

## Task 14: In-browser verification + ship the branch

- [ ] **Step 1: Smoke the failure surfacing**

Run the app (`PORT=3005`, Conventions). In the editor: open DevTools → Network → set **Offline**. Click a stock photo in the Photos panel. Expected: a red toast ("Could not add this photo" or the photo-search failure), a `[photos]` (or `[images]`) entry in the console — **no silent nothing-happened**. Set back online; add an element; confirm normal use unaffected and no toast storms.

- [ ] **Step 2: Confirm autosave stayed quiet-but-logged**

Still in the editor, make a few edits. Expected: no new toasts from the autosave path (D5 — chip comes in Phase 3); console clean of `[autosave]` warns under normal conditions.

- [ ] **Step 3: Push and verify CI runs green on GitHub**

```bash
git push -u origin feat/stability-phase-0-2
gh run watch || gh run list --branch feat/stability-phase-0-2 --limit 1
```

Expected: the `CI` workflow completes with all steps green (first-ever CI run for this repo).

- [ ] **Step 4: Merge/PR per owner preference**

Open a PR to `main` (or fast-forward if the owner prefers). PR description: link the spec, note the 117-site sweep, the new CI gate, and that Phase 3 (saveManager + chip) is the next plan.

---

## Self-review notes (done at plan time)

- **Spec coverage:** Phase 0 (gates/pins/patch-scaffold) → Tasks 1–3. Phase 1 (logger, globalErrors, strict ratchet, rules-as-warn) → Tasks 4–6. Phase 2 (sweep + flip to error) → Tasks 7–13. Phase-boundary acceptance criteria map to Task 6 Step 2 (baseline count), Task 13 (zero + gate bites), Task 14 (drills subset). Spec's Phase-2 acceptance "grep finds zero bare catches" is enforced stronger via ESLint AST selectors in CI.
- **Deliberately deferred:** `Editor.tsx:704/705` become `log.warn` here and are replaced by the saveManager + status chip in the Phase 3 plan (spec D5). `polyfills.ts:77` is a documented permanent exception.
- **Type consistency:** `fail(scope, userMessage, err?)`, `log.warn(scope, message, err?)`, `ignoreError(err, reason)` — table replacements all match these signatures; `notify(message, kind)` matches the existing `src/lib/notify.ts`.
