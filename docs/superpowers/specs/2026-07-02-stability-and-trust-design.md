# Stability & Trust — Design Spec

**Date:** 2026-07-02
**Status:** Approved approach — pending spec review → implementation plan
**Program context:** Sub-project 1 of the "utmost stable + Canva-parity and beyond" program. Order agreed with the owner: **1) Stability & Trust** → 2) Core editor parity → 3) Timeline Pro (existing spec Phase 3) → 4) Cloud & sync → 5) Differentiators (Magic Resize, Brand Kit, AI panels).

---

## 1. Context & Goal

**Product:** Marketifyall Design Editor — open-source Canva alternative on `@nkyo/scenify-sdk` 0.3.4 (Fabric.js 4), React 17 / CRA 4 (CRACO) / BaseUI / Redux / Supabase, deployed at design.marketifyall.com.

**The problem (audited 2026-07-02):** The app is engineered to fail invisibly. 117 catch sites swallow errors (108 comment-only catches, 6 empty promise `.catch()`s, 3 console-only — authoritative classifier inventory in the Phase 0–2 plan); autosave failure is hidden behind `.catch(() => {})` with no unload flush and length-based change detection; one dead image URL hangs design/template restore forever (the SDK's `loadImageFromURL` has no `onerror`); 8 sites inject remote SVG unsanitized; a paid OpenRouter key can ship in the client bundle; there is no CI; deleted clips leak blob URLs; the timeline re-renders wholesale at 60fps.

**Goal:** Make failure impossible to miss and data loss structurally hard: every error is logged and (when user-facing) surfaced; every media load is bounded; saves are verified, visible, and recoverable; the two SDK root-cause bugs are fixed at the source; CI enforces all of it so it cannot rot.

**Owner decisions already made:**
- Stability first, before feature parity work.
- Harden **within CRA** — no Vite/build-chain migration this round.
- **Approach C**: thin safety layer + `patch-package` fix for the SDK root cause (not a site-by-site sweep alone, not layer-only).

---

## 2. Current state (verified, with locations)

| Area | State | Evidence |
|---|---|---|
| Silent failures | 117 sites: 108 comment-only catches, 6 naked `.catch(() => {})`, 3 console-only (classifier count; the earlier audit's 61 undercounted); only 19 `notify()` calls app-wide | `Editor.tsx:173,191,196,244,296,335,543,640,706`; `WhiteboardToolbar.tsx:80,143,147`; `VideoTimeline.tsx:1899`; `.catch(() => {})` at `Editor.tsx:154,363,704`, `VideoTimeline.tsx:1636`, `exporter.ts:257,362` |
| Autosave | Debounce 600ms + 2s interval → IndexedDB (`projectStore.ts`); failures swallowed (`Editor.tsx:704-707`); change signature = `objs.length + ':' + JSON.stringify(objs).length` (`Editor.tsx:688`) → same-size edits skipped; no unload flush | `Editor.tsx:656-729` |
| SDK loader | `loadImageFromURL` resolves only in `onload`; **no `onerror`** → promise hangs forever on dead/CORS-blocked URLs. Consumed via `main` → `dist/index.js`, which requires `scenify-sdk.cjs.development.js` (dev) / `scenify-sdk.cjs.production.min.js` (prod). The `module` field points at a non-existent file, so the CJS bundles are what run (confirmed: the "UNABLE TO LOAD OBJECT" string appears in `build/static/js/2.*.chunk.js`) | `node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js:955-963` |
| Unknown object types | `objectToFabric` has no default case → unknown types are skipped with only a `console.log('UNABLE TO LOAD OBJECT')`; the user sees a partial design with no warning | dev bundle `:2913,3725,3914` |
| Timeout guard | `promiseWithTimeout.ts` exists + tested but wired into only `StockVideos.tsx:298,311`; template load, restore, uploads, `editorHelpers.ts`, `Video.tsx` call unguarded loaders | `src/utils/promiseWithTimeout.ts` |
| Security | 8 raw `dangerouslySetInnerHTML` with remote SVG, no sanitization (dompurify installed, never imported): `Elements.tsx:605,615,628,636,644,701,708`, `Illustrations.tsx:294`. `REACT_APP_OPENROUTER_API_KEY` used in a dev fallback (`marketifyall-api.ts:181-189`) — if set at build time it ships in the bundle. `REACT_APP_ICONSCOUT_SECRET` sent as a client header (`iconscout.ts:7`) | |
| Leaks | 12 `createObjectURL` vs 5 `revokeObjectURL`; `removeClip`/`removeAudioClip` never revoke (`VideoContext.tsx:135-139,166-169`); ~16 temp `video`/`Audio`/`Image` elements created for thumbnails/duration and abandoned with `src` set | `VideoTimeline.tsx` (9 sites), `Video.tsx` (7 sites) |
| Error boundaries | Mounted at root + around Panels/Toolbox/VideoTimeline/PagesBar, but boundaries don't catch async/event/rAF errors — where canvas/media failures actually happen | `Editor.tsx:892-950`, `index.tsx:10` |
| Gates | **No CI**; `tsc` clean only because `strict: false`; 6 test suites / 37 tests, all pure utils; 28 `exhaustive-deps` suppressions; no `engines`/`.nvmrc` (local Node: v26.1.0) | `tsconfig.json:8-15` |
| Console noise | Styletron shorthand/longhand warning flood persists (e.g. `PagesBar.tsx:75-79,147-149,169-170`) | |
| Perf | `VideoTimeline.tsx:898` reads `usePlaybackTime()` at component top level → the 3,262-line component re-renders every playback frame | |
| Legacy keys | `PreviewTemplate.tsx:34,132,133` still uses `canva_clone_temp_state` / `canva_clone_autosave` localStorage keys | |

---

## 3. Goals & Non-Goals

**Goals:**
- Zero silent catches: every failure is logged; user-facing failures are surfaced (toast or save chip).
- A dead media URL can never hang the editor; unknown object types are reported to the user, not silently dropped.
- Autosave failures are visible within one debounce cycle; forced-quit loses at most the last debounce cycle; recovery snapshot restores dirty work.
- No unsanitized remote SVG; no secret-shaped env values in the shipped bundle.
- Deleted clips release their blobs; temp media elements are torn down.
- CI (typecheck + tests + safety lint rules + build + bundle secret-grep) green on every push/PR; Node pinned.
- Timeline no longer re-renders wholesale per playback frame; dev console clean of styletron warnings in a normal session.

**Non-Goals (deferred):**
- CRA→Vite migration (explicitly decided against this round) · full TS `strict` flip (ratchet only) · `VideoTimeline.tsx` file split (Timeline Pro) · version history / cloud saves (Cloud & sync sub-project) · external telemetry service (logger stays pluggable) · any new editor features · fixing all 28 `exhaustive-deps` suppressions (only ones touched en route).

---

## 4. Key design decisions

- **D1 — Safety layer over discipline.** Four primitives make the safe path the default: `logger`, `saveManager`, `loadMedia`, `SafeSvg`. Call sites migrate onto them; ESLint + CI then ban the unsafe patterns so they can't return.
- **D2 — SDK patch is surgical: `onerror` only.** `patch-package` adds an `onerror` rejection to `loadImageFromURL` in **both** CJS bundles (dev + production.min; the dangling `module` field means the ESM bundle is unused, but patch it too for safety since the hunk is identical). The unknown-object-type problem is **not** patched — the SDK already skips-and-logs; user-visible surfacing is done app-side by comparing object counts before/after import (more robust than editing three minified switch sites). `postinstall: patch-package` makes install fail loudly if the dependency ever drifts from 0.3.4.
- **D3 — Local-first observability.** `logger` = scoped console output + in-memory ring buffer (~200 entries). Optional remote sink only if `REACT_APP_ERROR_ENDPOINT` is set; no Sentry/vendor dependency. `fail(scope, userMessage, err)` = `log.error` + deduped `notify()` in one call so the sweep is mechanical.
- **D4 — An error taxonomy, not toast-spam.** Three legal catch outcomes: `fail(...)` (a user action failed — user must know), `log.warn/error(...)` (internal fallback worth recording), `ignoreError(err, reason)` (rare, genuinely ignorable, greppable). Bare `catch {}` becomes illegal. Global `window.onerror`/`unhandledrejection` handlers log everything and toast deduped (same message ≤1/30s, ≤3 toasts/min globally).
- **D5 — Save failures show as state, not toasts.** `saveManager` exposes `saved / dirty / saving / error` to a Navbar chip ("Saved · Saving… · Save failed — click to retry"). One escalation toast if failure persists; retries back off exponentially. Change detection becomes a content hash (FNV-1a over the serialized payload) instead of JSON length.
- **D6 — Three-layer unload protection** (IndexedDB can't be awaited in `beforeunload`): (1) flush immediately on `visibilitychange`→hidden / `pagehide`; (2) if still dirty at `beforeunload`, write a **synchronous localStorage recovery snapshot** (`mfa-recovery:<projectId>`, size-guarded ≈4MB); (3) if the payload exceeds the guard, fall back to the native unsaved-changes confirm dialog. On editor open, a snapshot newer than the stored project offers "Restore unsaved changes?"; snapshots clear after a successful IndexedDB save. The orphaned `canva_clone_*` keys in `PreviewTemplate.tsx` migrate to this scheme.
- **D7 — Secrets never ship.** The direct-OpenRouter dev fallback in `marketifyall-api.ts` is wrapped in a `NODE_ENV === 'development'` guard so the key literal is dead-code-eliminated from production builds; the Iconscout client-secret path is removed (the feature is unconfigured/dead already — it becomes an explicit "not configured" failure). CI greps the **built bundle** for secret-shaped strings (`sk-or-`, the env names) as a backstop. Ops note: unset `REACT_APP_OPENROUTER_API_KEY` in Vercel.
- **D8 — Strictness as a ratchet.** New `tsconfig.strict.json` (`strict: true`) covering `src/lib/**` + all new modules, run in CI alongside the base typecheck. Coverage grows directory-by-directory in later sub-projects; no big-bang flip.
- **D9 — Enforcement lives in CI, rules flip to error only after the sweep.** ESLint additions: `no-empty` (`allowEmptyCatch: false`), `no-restricted-syntax` matching empty-body `.catch()` callbacks, `react/no-danger` (exempted inside `SafeSvg.tsx` only). Added as warnings with the primitives, flipped to errors in the same phase the sweep completes.

---

## 5. Architecture

**New modules (all strict-TS from day one):**

| Module | Responsibility |
|---|---|
| `src/lib/logger.ts` | `log.error/warn/info/debug(scope, msg, err?, meta?)`; ring buffer + `getRecentLogs()`; toast dedupe/rate-limit state; `fail(scope, userMsg, err)`; `ignoreError(err, reason)`; optional remote sink. |
| `src/lib/globalErrors.ts` | `window.onerror` + `unhandledrejection` handlers → logger; benign-noise filter (e.g. ResizeObserver loop); imported once in `src/index.tsx`. |
| `src/utils/saveManager.ts` | Owns the autosave loop currently inline in `Editor.tsx:656-729`. `markDirty()` from canvas/page/timeline events; debounce 600ms + max-wait 3s (replaces the 2s polling interval); FNV-1a content hash; state machine + subscription for the chip; retry w/ backoff; unload layers per D6; recovery-snapshot read/offer/clear. |
| `src/components/SaveStatusChip.tsx` | Navbar chip bound to `saveManager` state; click-to-retry; failure detail popover. |
| `src/lib/loadMedia.ts` | `loadImage/loadVideo/loadAudio(url, {timeoutMs})` — element creation, `onload`/`onerror`, timeout via existing `promiseWithTimeout`, guaranteed handler cleanup + element teardown; `withTempVideo(url, fn)` for extract-and-discard uses; typed `MediaLoadError`. |
| `src/components/SafeSvg.tsx` | Renders remote SVG through `DOMPurify.sanitize(svg, {USE_PROFILES: {svg: true, svgFilters: true}})`, memoized; the only file allowed `dangerouslySetInnerHTML`. |
| `patches/@nkyo+scenify-sdk+0.3.4.patch` | `loadImageFromURL`: promise gains `reject`; `image.onerror = () => reject(new Error('Failed to load image: ' + src))`. Applied to `scenify-sdk.cjs.development.js`, `scenify-sdk.cjs.production.min.js`, `scenify-sdk.esm.js`. |
| `.github/workflows/ci.yml` | Node from `.nvmrc` (26) → `yarn install --frozen-lockfile` (runs postinstall/patch-package) → `tsc` (base) → `tsc -p tsconfig.strict.json` → `craco test --watchAll=false` → ESLint safety rules → `craco build` → bundle secret-grep. |

**Data flow (save path):** canvas/page/timeline events → `saveManager.markDirty()` → debounced serialize + hash → changed? → `patchProject()` → state `saved` | `error` → chip renders state; `error` → backoff retry; hidden/pagehide → immediate flush; beforeunload+dirty → sync snapshot or confirm dialog.

**Data flow (import path):** template/restore JSON → count objects in payload → outside-in `promiseWithTimeout(importFromJSON, 60s)` → count objects on canvas → shortfall > 0 → `fail('import', 'N element(s) could not be loaded', …)`. The SDK patch converts per-image hangs into rejections that this wrapper reports.

**Migration map (call sites → primitives):**
- All 117 inventoried silent-failure sites → `fail` / `log.warn` / `ignoreError` per D4 taxonomy (file-by-file commits; the flipped lint rules catch any stragglers, e.g. multiline empty `.catch()` bodies).
- ~16 temp media element sites in `Video.tsx` / `VideoTimeline.tsx` → `loadMedia` / `withTempVideo`.
- 8 SVG injection sites in `Elements.tsx` / `Illustrations.tsx` → `<SafeSvg svg={…}/>`.
- `VideoContext.removeClip/removeAudioClip` + editor unmount → revoke `blob:` URLs (safe today: timeline has no undo; noted as an interaction point for the future unified undo in Timeline Pro).
- `VideoTimeline.tsx` playhead/time-readout → child components subscribing to `usePlaybackTime()` themselves (parent stops re-rendering per frame).

---

## 6. Phased plan

Each phase lands independently green.

### Phase 0 — Gates & pins
CI workflow running what exists today (base tsc, tests, build), `.nvmrc` (26) + `engines`, `patch-package` dependency + `postinstall` wired (empty patch dir).
**Accept:** CI green on a no-op PR; `yarn install --frozen-lockfile` runs `patch-package` in postinstall without error (no-op while the patch dir is empty — the fail-loudly-on-drift behavior is exercised in Phase 4 when the patch lands).

### Phase 1 — Observability core
`logger.ts` (+ dedupe/rate-limit), `fail()`, `ignoreError()`, `globalErrors.ts` in `index.tsx`, `tsconfig.strict.json` covering `src/lib/**` added to CI. ESLint safety rules added as **warnings**.
**Accept:** thrown async error + unhandled rejection each produce one log entry + one toast; a 100-error storm produces ≤3 toasts/min; unit tests for dedupe + ring buffer pass.

### Phase 2 — The sweep
All 117 inventoried sites migrated per D4 taxonomy. ESLint rules flip to **error** in CI (the AST selectors also catch comment-only bodies, which `no-empty` alone would miss).
**Accept:** `grep` finds zero bare/comment-only catches in `src/`; CI fails on a deliberately-introduced `catch {}`; every migrated user-facing path shows a toast when its failure is induced.

### Phase 3 — Data integrity ✅ IMPLEMENTED (2026-07-03)
`saveManager.ts` extraction, content-hash change detection, `SaveStatusChip` in Navbar, three-layer unload protection, recovery-snapshot offer on open, `canva_clone_*` key migration.
**Accept:** same-length edit now saves (hash test); blocked IndexedDB → chip shows "Save failed" within one cycle + retry works; kill-tab-while-dirty → reopen offers restore and restores; snapshot clears after next successful save.
> Shipped on `feat/stability-phase-3-data-integrity` (own plan: `docs/superpowers/plans/2026-07-03-...-savemanager.md`). Engine is unit-tested (72 tests incl. a concurrency-stranded-save regression found in review); the four **Accept** drills are browser-based and remain a manual pre-merge confirmation (no canvas in the node test env). During implementation a separate critical data-loss bug (panel-adds dropped on reload) was found and fixed — see `2026-07-03-panel-add-data-loss-fix-design.md`.

### Phase 4 — Media safety
SDK `onerror` patch (all three bundles); `loadMedia.ts`; migrate the ~16 temp-element sites and remaining unguarded loader calls; outside-in import timeout + object-count surfacing.
**Accept:** template containing a dead image URL loads with a visible "N elements could not be loaded" toast and a live editor (no hang) — in both dev and a production build; stock-video path still works; unit tests for loadMedia timeout/cleanup pass.

### Phase 5 — Security & resource lifecycle
`SafeSvg` + migrate 8 sites; dev-gate the OpenRouter fallback; remove the Iconscout client-secret path; bundle secret-grep in CI; blob revocation in `removeClip`/`removeAudioClip`/unmount; `withTempVideo` everywhere.
**Accept:** an SVG containing `<script>`/`onload=` renders inert (test); production bundle grep finds no `sk-or-`/key names (CI step); add-then-delete 10 clips → blob count returns to baseline (manual devtools check).

### Phase 6 — Polish & final verification
Playhead re-render isolation; styletron shorthand/longhand fixes until a normal session logs zero styletron warnings; induced-failure drill matrix (below); README stability notes; DoD audit against §10.
**Accept:** React DevTools shows timeline body not re-rendering during playback; drill matrix passes; clean console.

---

## 7. Error-handling taxonomy (reference for the sweep)

| Situation | Pattern | User sees |
|---|---|---|
| User-initiated action fails (add element, load template, export, upload) | `fail(scope, friendlyMsg, err)` | Toast |
| Autosave/write failure | `saveManager` → state `error` | Chip (+ one escalation toast if persistent) |
| Internal fallback taken (thumbnail failed, optional enhancement skipped) | `log.warn(scope, msg, err)` | Nothing |
| Genuinely ignorable (e.g. benign browser quirk, best-effort cleanup) | `ignoreError(err, 'why')` | Nothing |
| Uncaught / unhandled rejection | `globalErrors` → `log.error` + deduped toast | Generic toast, once |

---

## 8. Testing strategy

**Unit (node-env, relative imports — repo convention):** logger dedupe/rate-limit + ring buffer; saveManager state machine, hashing (same-length-different-content case), retry/backoff, snapshot size guard (fake timers, mocked `patchProject`); loadMedia timeout + cleanup (jsdom elements, manually dispatched events); SafeSvg sanitization (script/onload stripped, benign SVG preserved); blob-registry revocation (mocked `URL`).

**CI-level:** bundle secret-grep; ESLint safety rules; strict-tsconfig typecheck; patch application (implicit — the frozen yarn install fails if the patch drifts).

**Induced-failure drill matrix (manual, port 3005, both dev and prod build):**
1. Template with a dead image URL → toast + live editor (the old behavior was an infinite hang).
2. IndexedDB blocked (devtools) → chip "Save failed", click-retry works.
3. Kill tab with dirty state → reopen → restore offer → content intact.
4. Offline mode → element/SVG/stock loads fail with toasts, no hangs.
5. Add/delete 10 video clips → blob count baseline, no leaked `<video>` decoders.
6. 30-minute normal session → zero styletron warnings, zero uncaught errors.

---

## 9. Risks & mitigations

- **Patching a minified bundle** (production.min.js) is fiddly → the hunk is one function with a distinctive shape; verify per-bundle with a grep assertion after patching; drill #1 runs against the production build to prove it.
- **Patch drift** if the SDK is ever updated → `postinstall` fails the install loudly; version is pinned by the patch filename; SDK is unmaintained so churn is unlikely.
- **`beforeunload` unreliability** → three layers (D6); the sync-localStorage snapshot is the guarantee, the hidden-flush is the optimization, the confirm dialog is the oversized-payload fallback.
- **Toast fatigue / error storms** → dedupe + global rate cap in the logger (D4); save errors deliberately routed to the chip, not toasts (D5).
- **Sweep breadth (117 sites) regression risk** → file-by-file commits, each independently revertable; CI runs the full suite on every one; no behavior changes beyond surfacing.
- **Recovery snapshot vs. large designs** (data-URL images can exceed localStorage) → size guard + confirm-dialog fallback; snapshot stores the same serialized payload autosave writes, no new format.
- **saveManager extraction destabilizing autosave** → keep the exact serialize/relink logic (clips tagging, page write-back) verbatim; only the scheduling/state wrapper changes; drill #2/#3 verify.

---

## 10. Success criteria (Definition of Done)

1. `grep` proves zero comment-only/bare catches and zero empty `.catch()` callbacks in `src/`; CI enforces it.
2. Dead-URL template drill passes in dev **and** prod builds: visible error, editor alive.
3. Autosave: hash-based change detection (same-length edit saves); failure visible ≤1 cycle; forced-quit loses ≤ the last debounce cycle; recovery restore verified.
4. Zero raw `dangerouslySetInnerHTML` outside `SafeSvg.tsx`; hostile-SVG test passes.
5. Built-bundle grep: no secret-shaped strings; OpenRouter fallback absent from prod chunks.
6. Blob/element lifecycle drill passes.
7. CI green: base tsc + strict-subset tsc + 37 existing tests + new unit tests + safety lint + build + secret-grep; Node pinned.
8. Timeline body does not re-render per playback frame; normal-session console is styletron-clean.

## 11. File / module impact

- **New:** `src/lib/logger.ts` (+test), `src/lib/globalErrors.ts`, `src/utils/saveManager.ts` (+test), `src/components/SaveStatusChip.tsx`, `src/lib/loadMedia.ts` (+test), `src/components/SafeSvg.tsx` (+test), `patches/@nkyo+scenify-sdk+0.3.4.patch`, `.github/workflows/ci.yml`, `tsconfig.strict.json`, `.nvmrc`.
- **Modified:** `Editor.tsx` (autosave extraction, catch sweep), `VideoTimeline.tsx` (playhead isolation, temp-element migration, catches), `Video.tsx`, `VideoContext.tsx` (blob revocation), `Elements.tsx`, `Illustrations.tsx` (SafeSvg), `marketifyall-api.ts` (dev-gate), `iconscout.ts` (secret removal), `PreviewTemplate.tsx` (key migration), `Navbar` (chip), `package.json` (postinstall, engines), `.eslintrc`/`eslintConfig` (safety rules), `.env.example` (document server-side-only keys), plus every file in the 61-site sweep.
- **Deleted:** client-side Iconscout secret usage.

## 12. Out of scope / future

CRA→Vite · full strict flip · `VideoTimeline.tsx` split · version history & cloud saves · realtime collab · external telemetry vendor · new editor features (Layers panel, align/distribute, text effects come next, in Core Editor Parity).
