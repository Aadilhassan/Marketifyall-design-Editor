# Panel-Add Data-Loss Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any object a user adds via a panel survives save→reload. Fix the SDK's two "no default case" switches (`exportObject.run`, and the import drop site) via `patch-package` so unrecognized (raw Fabric) objects round-trip instead of being silently dropped.

**Architecture:** A single `patches/@nkyo+scenify-sdk+0.3.4.patch` edits both CJS bundles (dev + `production.min`) and the ESM bundle: (1) export emits the raw object instead of `undefined` for unknown types; (2) the import loop, where it currently logs `UNABLE TO LOAD OBJECT` and drops, instead reconstructs the object with `fabric.util.enlivenObjects` and adds it. No app-code change; the working add/render path is untouched. `postinstall: patch-package` (already present) applies it and fails loudly on SDK version drift.

**Tech Stack:** `@nkyo/scenify-sdk` 0.3.4 (Fabric.js 4) compiled bundles, `patch-package` 8, yarn v1, CRA 4/CRACO, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-03-panel-add-data-loss-fix-design.md`. Branch: `fix/panel-add-data-loss` (off `feat/stability-phase-0-2`, which has the patch-package infra + CI; this fix is independent of the paused Phase 3 saveManager work).

---

## Conventions

- yarn v1 only (never `npm install`). Reinstall to test the patch: `yarn install --frozen-lockfile --ignore-optional` (runs `postinstall` → `patch-package`).
- The three SDK bundles under `node_modules/@nkyo/scenify-sdk/dist/`:
  - `scenify-sdk.cjs.development.js` — **readable**; used when `NODE_ENV !== production` (dev server / `craco start`).
  - `scenify-sdk.cjs.production.min.js` — **minified**; used in the production build (`craco build`). Patch by locating the anchor string, applying the same logical change.
  - `scenify-sdk.esm.js` — the `module` entry is dangling (unused by the CRA build) but patch it too so the fix is bundler-agnostic.
- Generate/refresh the patch: `npx patch-package @nkyo/scenify-sdk` (writes `patches/@nkyo+scenify-sdk+0.3.4.patch`).
- Anchors (verified present): export uses `template.objects.concat(exportedObject)` (dev) / a `concat(...)` (prod); the import drop site is the sole `UNABLE TO LOAD OBJECT` occurrence in each bundle; `exportObject.run` switch ends at `case ObjectType.GROUP: … break; }` before `return object;`.
- App commands: typecheck `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`; build `CI=false NODE_OPTIONS=--openssl-legacy-provider npx craco build`; run `BROWSER=none PORT=3005 NODE_OPTIONS=--openssl-legacy-provider npx craco start`.

> **Patch-authoring caution:** these are compiled bundles. Make the *minimal* logical edit at each anchor; never reformat. After each edit, re-grep the anchor to confirm the change is present and the file still parses (`node -e "require('./node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js')"` must not throw). If an anchor can't be located unambiguously in the minified bundle, STOP and report — do not guess at a minified edit.

---

## Task 1: Export patch — emit the raw object instead of a hole (dev bundle)

Make `exportToJSON` emit unrecognized objects instead of `undefined`. Two equivalent edit points; use **the `exportObject.run` default case** (most localized).

**File:** `node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js`

- [ ] **Step 1: Baseline the bug is reproducible in export.** In a scratch node script (not committed), confirm the failure shape is understood: `exportObject.run` returns `undefined` for `{type:'rect'}`. (Documentation step — no code.)

- [ ] **Step 2: Add the default case.** Find `exportObject`'s `run` (the `switch (item.type)` with cases `STATIC_IMAGE…GROUP`, ending `case ObjectType.GROUP: object = this[ObjectType.GROUP](item, options, inGroup); break; }`). Add a default **inside the switch**, before the closing `}`:
```js
      default:
        // Non-scenify (raw Fabric) object — pass its full toJSON through so it
        // isn't dropped as an undefined hole. Round-trips via the import enliven.
        object = item;
        break;
```
So `object` is the raw Fabric JSON (complete: geometry, style — everything `canvas.toJSON()` captured). No hole in `template.objects`.

- [ ] **Step 3: Verify.** `node -e "const s=require('./node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js'); console.log('loaded ok')"` → prints, no throw. Re-grep to confirm the `default:` sits inside `exportObject`'s run (not another switch).

- [ ] **Step 4:** (No commit yet — the patch file is generated once in Task 3 after all bundle edits.)

---

## Task 2: Import patch — enliven the raw object instead of dropping it (dev bundle)

**File:** `node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js`

- [ ] **Step 1: Locate the drop site** — the sole `console.log('UNABLE TO LOAD OBJECT: ', object);` inside `importFromJSON`'s loop `else` branch (the `if (element) { … this.canvas.add(element); } else { … }`).

- [ ] **Step 2: Replace the drop with an enliven-and-add.** Change the `else` body to:
```js
            } else {
              // Non-scenify (raw Fabric) object exported as passthrough — rebuild
              // it with Fabric's own deserializer instead of dropping it.
              (function (raw, canvas) {
                try {
                  fabric.fabric.util.enlivenObjects([raw], function (objs) {
                    var el = objs && objs[0];
                    if (el) canvas.add(el);
                  }, '');
                } catch (e) {
                  console.log('UNABLE TO LOAD OBJECT: ', raw);
                }
              })(object, this.canvas);
            }
```
Notes: the SDK exposes Fabric as `fabric.fabric` (see existing `new fabric.fabric.StaticText(...)` in the bundle) — use `fabric.fabric.util.enlivenObjects`. Confirm the exact accessor by grepping the bundle for `fabric.fabric.util` or `fabric.util`; use whichever the bundle already uses in scope here. `enlivenObjects(objects, callback, namespace, reviver)` — pass `''` namespace. The `this.canvas` is the fabric canvas (same object `this.canvas.add(element)` uses above). Keep the original `console.log` as the catch fallback so a genuinely-unrebuildable object still logs rather than throwing.

- [ ] **Step 3: Verify** the module still loads (`node -e require(...)`), and the enliven accessor matches what's in scope (grep confirms `fabric.fabric.util` usage nearby).

Order/async note (document, don't fix): `enlivenObjects` is async for images (sync for shapes/text), so a passthrough **image** may attach just after the synchronous objects — a possible minor z-order shift for raw images, acceptable for the data-loss fix and noted in the PR.

---

## Task 3: Apply the same edits to the prod.min + esm bundles, generate the patch

**Files:** `scenify-sdk.cjs.production.min.js`, `scenify-sdk.esm.js`, then `patches/@nkyo+scenify-sdk+0.3.4.patch`.

- [ ] **Step 1: prod.min export.** In `scenify-sdk.cjs.production.min.js`, locate the minified `exportObject` run switch (search the `concat(` sites and the minified `ObjectType` case chain). Add the equivalent `default:` assigning the loop item to the result var. If the switch is a minified `switch(x.type){case ...}`, insert `default:RESULT=x;break;` using the minified variable names actually present. Re-grep to confirm.

- [ ] **Step 2: prod.min import.** Locate the sole `UNABLE TO LOAD OBJECT` in prod.min; wrap/replace its `else` with the same enliven-and-add using the minified var names (the canvas var and the loop item var as they appear). Confirm `enliven` accessor name in the minified scope.

- [ ] **Step 3: esm bundle.** Apply both edits to `scenify-sdk.esm.js` (readable, same shape as the dev CJS bundle).

- [ ] **Step 4: Load-check all three.** `node -e "require('./node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.production.min.js'); require('./node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js'); console.log('cjs ok')"` (the esm one can't be `require`d; visually confirm balanced braces + a syntax check via `node --check` if it parses as a module, else skip).

- [ ] **Step 5: Generate the patch.**
```bash
npx patch-package @nkyo/scenify-sdk
```
Expected: creates `patches/@nkyo+scenify-sdk+0.3.4.patch` containing the three bundles' hunks. Read the patch file — confirm it contains ONLY the intended default-case + enliven edits (no accidental whitespace churn).

- [ ] **Step 6: Prove it re-applies from clean.**
```bash
rm -rf node_modules/@nkyo/scenify-sdk && yarn install --frozen-lockfile --ignore-optional
```
Expected: postinstall runs patch-package and prints it applied `@nkyo/scenify-sdk@0.3.4`. Re-grep the reinstalled bundles for the `default:` / enliven edits → present (proves the patch, not a manual edit, delivers the fix).

- [ ] **Step 7: Commit.**
```bash
git add patches/@nkyo+scenify-sdk+0.3.4.patch
git commit -m "fix(sdk): patch scenify export/import to round-trip raw fabric objects (panel-add data loss)

exportObject.run + the importFromJSON drop site had no default case, so
panel-added raw fabric objects (rect/textbox/image/…) were dropped on save
and load -> lost on reload. Patch both CJS bundles + ESM: export passes the
raw object through; import re-enlivens it via fabric.util.enlivenObjects.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 4: CI guard — assert the patch content survives

**File:** `.github/workflows/ci.yml`

- [ ] **Step 1:** After the Install step (which already runs patch-package), add a guard step that fails if the fix isn't present in the installed bundles:
```yaml
      - name: Assert scenify round-trip patch applied
        run: |
          grep -q "UNABLE TO LOAD OBJECT" node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js
          grep -q "enlivenObjects" node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js
          node -e "require('./node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.development.js'); require('./node_modules/@nkyo/scenify-sdk/dist/scenify-sdk.cjs.production.min.js'); console.log('scenify bundles load OK')"
```
(The `enlivenObjects` grep is the signal our import edit is present; the require proves both CJS bundles still parse after patching.)

- [ ] **Step 2: Commit.**
```bash
git add .github/workflows/ci.yml
git commit -m "ci: assert the scenify round-trip patch applied and bundles still load"
```

---

## Task 5: Manual round-trip drill (the authoritative verification)

No headless test can exercise the real canvas (repo's `canvas` native module won't load), so verify in a browser — **dev and a production build**.

- [ ] **Step 1: Dev drill.** `BROWSER=none PORT=3005 … craco start`. Open/create a design. Add, one at a time: a **text box**, a **heading** (Text panel), a **rectangle**, a **circle**, a **triangle** (Elements), an **illustration** (Illustrations), an **upload** (or a **stock photo** from Photos). After each, wait ~1s (autosave), then **reload** → the element is still present and in the same position. Test a mix on one design too (several objects, reload, all survive).

- [ ] **Step 2: Inspect the export has no hole.** In devtools console on the running editor: `JSON.stringify((window).__editor?.exportToJSON?.().objects?.map(o=>o&&o.type))` — or add a one-off `console.log` — confirm **no `null`/`undefined`** entries with quick-added objects present. (If `__editor` isn't exposed, rely on the reload-survives result, which is the real DoD.)

- [ ] **Step 3: Prod drill.** `CI=false … craco build` then serve `build/` (`npx serve -s build -l 3006` or similar) and repeat Step 1 against the production bundle (this exercises `scenify-sdk.cjs.production.min.js` — the separately-patched file). Every element must survive reload.

- [ ] **Step 4: No-regression check.** Load a **template** (Templates panel) → renders correctly (recognized scenify objects still import). Open a **pre-existing saved design** → still restores. Confirm add/render behavior is visually unchanged.

- [ ] **Step 5:** Record all drill results (per object type, dev + prod, template regression) for the PR body. If any element still drops, STOP — the patch didn't cover that type's path; re-inspect that object's exported `type` and the enliven result before proceeding.

---

## Task 6: Push + PR

- [ ] **Step 1:** Full local CI parity: `yarn install --frozen-lockfile --ignore-optional`, base tsc, strict tsc, lint, tests, build, and the new bundle-assert step — all green.
- [ ] **Step 2:** Update the spec status (mark implemented) and `PROBLEMS.md` (this is the same "no default case" class as #1; note it's now patched for the export/import round-trip).
- [ ] **Step 3: Push + PR** to `main` (base `main`; note in the PR that it sits on the phase-0-2 branch's patch-package infra, so it should merge after or with PR #1 — or rebase onto main once PR #1 lands). PR body: the confirmed root cause, the two-bundle patch, and the full Task-5 drill matrix.
- [ ] **Step 4:** `gh run watch` → CI green (install+patch, bundle-assert, tsc, lint, tests, build).

---

## Self-review notes (plan time)

- **Spec coverage:** export passthrough (spec §3) → Tasks 1, 3; import enliven (§3) → Tasks 2, 3; patch-package + drift-loud (§3) → Task 3 Steps 5–6; CI assertion (§4) → Task 4; the manual round-trip drill for every add path, dev+prod (§4/§5) → Task 5; DoD items → Task 5/6.
- **The spec's "fallback" (app-side import) is NOT needed:** feasibility check confirmed the import patch point is the single `UNABLE TO LOAD OBJECT` anchor (tractable in the minified bundle), and `enlivenObjects` is available — so the plan commits to the pure SDK patch. If Task 3 Step 2 finds the minified import anchor genuinely unpatchable, THEN fall back to the spec's app-side `enlivenPassthrough` after `importFromJSON` (flag it and re-plan that task).
- **Coordinate space:** passthrough objects round-trip in canvas-space → identity-correct for same-frame reload (the DoD). Cross-frame portability is explicitly out of scope (spec §7).
- **Risk isolation:** the delicate work is the minified prod-bundle edits (Task 3 Steps 1–2), each gated by "locate anchor → minimal edit → re-grep → load-check," with a hard STOP if an anchor is ambiguous.
- **No app-code churn:** add/render paths untouched; the entire fix is in the patch + one CI step, so blast radius is the SDK boundary only.
- **Testing honesty:** no unit test can drive the canvas; the authoritative verification is the manual dev+prod drill (Task 5). CI asserts patch *presence* + bundle *parseability*, not runtime behavior.
