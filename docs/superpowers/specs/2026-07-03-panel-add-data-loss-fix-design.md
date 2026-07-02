# Panel-Add Data-Loss Fix — Design Spec

**Date:** 2026-07-03
**Status:** Approved approach (owner chose "Patch the SDK") — pending spec review → implementation plan
**Severity:** 🔴 Critical — silent loss of user work on the most common action (adding an element), on reload.

---

## 1. Context & the bug

**Product:** Marketifyall Design Editor on `@nkyo/scenify-sdk` 0.3.4 (Fabric.js 4). Surfaced during Stability Phase 3 (the saveManager work) when a manual smoke test showed a freshly-added shape/text vanishing after reload. Isolated to a pre-existing defect independent of the autosave changes (reproduced on untouched code via `git stash`).

**Confirmed root cause (traced end-to-end in the SDK bundle):**
1. The quick-add helper `src/utils/editorHelpers.ts` (`addObjectToCanvas`, used by the **Text, Elements, Illustrations, Uploads, Pexels, Images, AIDesigner, AiStudio** panels) deliberately creates **raw Fabric objects** — `new fabric.Textbox(...)`, `new fabric.Rect(...)`, `new fabric.Circle(...)`, `new fabric.Triangle(...)`, `new fabric.Path(...)`, `new fabric.Image(...)`, groups — and adds them with `targetCanvas.add(...)`, **bypassing `editor.add()`** (header comment: *"bypasses the Scenify SDK's editor.add() which doesn't properly initialize object content"*). The objects render and are interactive.
2. Their Fabric top-level `.type` is `'textbox'` / `'rect'` / `'circle'` / `'image'` / etc. The developer set `metadata: { type: 'StaticText' }` intending to "tell the SDK," **but put it in `metadata.type`, not the top-level `.type`** the SDK actually reads (`editorHelpers.ts:93`).
3. On save, `editor.exportToJSON()` (`scenify-sdk.cjs.development.js:2851`) does `canvas.toJSON()` (which **includes** the raw objects), then for each calls `exportObject.run(item)` (`:2625`). That method `switch`es on `item.type` against scenify's `ObjectType` enum with **no `default` case** → returns `undefined` for a Fabric-typed object → `template.objects.concat(undefined)` inserts an **`undefined` hole** into the exported objects array.
4. Autosave persists the array-with-hole. On reload, `importFromJSON` (`:2886`) calls `objectToFabric.run(object)` — **also a `switch` with no default** — which returns `undefined` for the raw object; the import loop's `else` branch logs `UNABLE TO LOAD OBJECT` and **drops it** (`:2911-2913`). The restore-side defensive `filter(o => o && o.type)` also drops the hole. The now-genuinely-empty state is then re-saved, **locking in the loss.**

**Scope:** every object added in-session through `addObjectToCanvas` — i.e. text, shapes, illustrations, uploads, stock photos, AI images. (A few image/video paths use `editor.add()` and are unaffected.) This is the same "no default case" fragility class already documented for template loading in `PROBLEMS.md` #1.

**Why it renders but doesn't persist:** rendering reads the live Fabric canvas (objects are there); persistence reads `exportToJSON` (holes). The two diverge exactly for non-scenify-typed objects.

---

## 2. Goal & Non-Goals

**Goal:** Any object a user can add to the canvas **survives a save→reload round-trip** — no silent drops. Fix the *class* of bug (unrecognized objects), not just the specific panels, and without disturbing the working add/render behavior.

**Non-Goals (deferred):**
- Making quick-added basic shapes *first-class scenify objects* (scenify has no native rect/circle/triangle type; not required to stop data loss).
- **Cross-frame-size portability** of passthrough objects (they round-trip in canvas-space, which is identity-correct for autosave/reload; re-flowing them at a different frame size is a separate enhancement).
- Reworking `editor.add()` / the reason it was bypassed (the raw-Fabric render path works; we keep it).
- The broader Phase 3 save-mechanism work (chip, recovery) — paused, resumes after this lands.

---

## 3. Approach (owner-selected: Patch the SDK)

Make the SDK **round-trip any validly-serialized Fabric object** instead of dropping unrecognized ones, via `patch-package` (the same mechanism the stability spec already earmarked for the SDK's `onerror` fix — see that spec's D2; the app provably runs the **CJS** bundles).

**Two symmetric default cases:**
- **Export** — `exportObject.run` (`:2625`): add `default: object = item; break;`. `item` is the full Fabric `toObject()` JSON (all geometry/style captured by `canvas.toJSON()`), so passing it through emits a complete, self-describing object instead of `undefined`. No hole.
- **Import** — `objectToFabric.run` (`:977`, and the drop site in `importFromJSON`'s loop `:2909-2913`): for an unrecognized `item.type`, reconstruct the object with **`fabric.util.enlivenObjects([item], cb)`** (Fabric's native deserializer, which recreates `rect`/`textbox`/`path`/`image`/… from their JSON) and add it, instead of logging `UNABLE TO LOAD OBJECT` and dropping.

**Coordinate space:** passthrough objects are stored in **canvas-space** (as `toJSON` captured them), whereas recognized scenify objects are stored design-space and transformed back on import. For a save→reload of the same design at the same frame size this is **identity-correct** — every object returns to its exact place. (Mixing at a *different* frame size is the deferred portability item.)

**Key risk & fallback (the plan's first task is a spike to resolve this):** the import path is `regeneratorRuntime`-transformed **and minified** in the production bundle (`scenify-sdk.cjs.production.min.js`), and `enlivenObjects` is callback-async. Patching that reliably in both bundles is the main unknown.
- **Primary:** patch both CJS bundles (dev + prod.min) — export default case (trivial in both) and an import enliven at the cleanest interception point (`objectToFabric.run` default, or the `importFromJSON` else-branch).
- **Documented fallback if the minified async import patch proves infeasible:** keep the trivial SDK **export** patch (stops the save-time hole in both bundles), and do the **import reconstruction app-side** — after `editor.importFromJSON(...)`, detect passthrough objects (non-scenify `type`) in the payload, `enlivenObjects` them, and `canvas.add` them. This is a small, well-contained app helper (`src/utils/enlivenPassthrough.ts`) and keeps the fix working even if the prod regenerator can't be edited. (The owner picked "patch the SDK"; this fallback is only for the import half and only if the bundle patch is technically blocked — it will be flagged for confirmation if reached.)

**`postinstall: patch-package`** already runs (added in the stability Phase 0 work), so the patch auto-applies on install and fails loudly if the SDK version drifts.

---

## 4. Testing strategy (honest about the canvas constraint)

The SDK needs a real Fabric canvas, and this repo's Jest harness **cannot** load the native `canvas` module (documented Node-ABI issue) — so the round-trip cannot be a headless unit test. Therefore:
- **Pure-logic unit tests** (node-env, per repo convention) for any app-side helper: the "is this a scenify type vs a passthrough type" predicate, and (if the fallback is used) the enliven-wrapper's object-selection logic with a mocked `fabric.util`.
- **Patch-integrity checks in CI:** `patch-package` application is verified by `yarn install --frozen-lockfile` (postinstall); a grep asserts the default case exists in the patched bundle(s).
- **The authoritative verification is a manual in-browser round-trip drill** (port 3005), run for **each add path**: add a text box, a heading, each basic shape (rect/circle/triangle), an illustration, an upload, a stock photo → reload → **every element is still present and correctly positioned**. Run against a **production build** too (the prod bundle is separately patched). This drill is also exactly Phase 3's acceptance drill, so it re-unblocks that work.

---

## 5. Success criteria (Definition of Done)

1. Adding each object type via its panel, then reloading, preserves the object (manual drill, dev **and** prod build).
2. `exportToJSON()` on a design containing quick-added objects contains **no `undefined` holes** (inspectable in the drill via devtools / a logged export).
3. The patch applies cleanly on a fresh `yarn install`; CI's frozen install + a bundle-grep assert it; version drift fails loudly.
4. No regression to recognized scenify objects (templates still load; existing designs still round-trip).
5. No change to add/render behavior (objects appear exactly as before when added).

## 6. File / module impact

- **New:** `patches/@nkyo+scenify-sdk+0.3.4.patch` (export default case in both CJS bundles; import enliven — bundle patch or, per the fallback, minimal). Possibly `src/utils/enlivenPassthrough.ts` (+test) only if the import-side fallback is used.
- **Modified:** none in the app's add paths (the render path is intentionally left alone). CI workflow gains a bundle-grep assertion step.
- **Coordination:** shares `patches/@nkyo+scenify-sdk+0.3.4.patch` with the stability spec's future `onerror` patch — whichever lands first creates the file; the other adds its hunk. This plan must not clobber that.

## 7. Out of scope / future

First-class scenify shapes · cross-frame-size portability of passthrough objects · reworking `editor.add()` · the deferred `onerror` SDK patch (stability Phases 4–5) · resuming Phase 3 (chip/recovery) after this ships.
