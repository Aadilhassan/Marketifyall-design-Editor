# Video & Animation Core → Canva +1 — Design Spec

**Date:** 2026-06-27
**Status:** Approved design — pending spec review → implementation plan
**Scope:** One comprehensive, internally-phased plan that takes the editor's video + animation half from "~70% built, looks broken" to "works end-to-end, then exceeds Canva on the core editing loop."

---

## 1. Context & Goal

**Product:** Marketifyall Design Editor — an open-source Canva alternative built on `@nkyo/scenify-sdk` (Fabric.js 4), React 17 / CRA 4 / BaseUI / Redux / Supabase, extended with AI Studio, a video timeline, an animation engine, and image filters.

**The problem:** A large body of in-progress (uncommitted) work already implements most of the video/animation feature set, but a handful of small bugs and pervasive *silent failures* make built features look broken. The README already advertises a multi-track timeline, MP4/WebM/GIF export, smart alignment guides, and six named animation effects — so the floor for "done" is *delivering what's on the box*, and "Canva +1" means exceeding it on the editing loop.

**Goal of this spec:** Make every advertised video/animation feature genuinely work, fail loudly when it can't, and add the editing polish (snapping, shortcuts, undo, audio, shape styling, animation-on-timeline) that puts the product at Canva parity or better.

**"Canva +1" definition (for this spec):** Parity on the core create→arrange→animate→export loop, *plus* the differentiators already in the codebase (AI text-to-design, an observable/agentic action model) — which only become usable once failures are surfaced. Error-surfacing is therefore a feature, not cleanup.

---

## 2. Current state (verified by source walk-through)

| Subsystem | Built | Verdict | Key gaps |
|---|---|---|---|
| **Animation engine** (`src/utils/animation/*`) | ~70% | Architecturally excellent. Delta-based model on `obj.metadata.anim`; one shared evaluator (`engine.ts`) used by both preview (`driver.ts`) and export (`exporter.ts`); 11 entrance/exit + 7 emphasis presets, 8 easings, kinetic text. Wired via the "Animate" toolbox button; `AnimationDriver` mounted in `Editor.tsx`. Export auto-detects animation and computes duration. | No timeline UI for animation timing/keyframes; no stagger/delay; hard-coded text-reveal duration; errors swallowed. |
| **Video timeline** (`VideoTimeline.tsx`, 2,985 ln; `VideoContext.tsx`) | ~65% | Mounted and user-reachable (auto-opens on first clip; "Show Timeline" button; closeable). Works: sequential playback, playhead scrub, clip add/drag/trim, zoom, color-coded tracks, clean canvas+animation sync. | **Audio never plays** (`audioRefsMap` created but never populated); no split; no snapping; no timeline undo/redo; Delete key unwired; multi-select has state but no UI. |
| **Export** (`ExportModal.tsx`; `src/utils/animation/exporter.ts`) | ~65% | Image (PNG/JPG/WebP/SVG/JSON) works. **MP4/WebM genuinely work** — `recordAnimatedVideo` renders animations *and* video-clip overlays frame-by-frame via MediaRecorder. | **GIF is broken** — `pickMime('gif')` falls through and emits `video/webm` with a `.webm` file. **PDF is a dead button** — listed in UI, no handler. MP4 silently falls back to WebM when h264 is unsupported. |
| **Stock-video add** (`StockVideos.tsx` / `Video.tsx`) | broken | Single missing `await` + a hanging SDK loader. | `editor.add(...)` is not awaited (spinner clears before the object lands); the SDK's `loadImageFromURL` has **no `onerror`** (promise hangs forever on a failed image); the surrounding `catch` is silent. |
| **Shape / image styling** (`filters.ts`, `Adjustments.tsx`, `Adjust.tsx`) | image ~70% / shape ~10% | Image adjustments + 10 presets work (brightness/contrast/saturation/temperature/blur via Fabric filters; metadata round-trip; live preview). | `Toolbox.tsx` is **missing the `image → StaticImage` mapping**, so dynamically-created `fabric.Image` (`.type === 'image'`) falls back to `Default.tsx` and the **Adjust/Animate buttons never appear**. Shapes have **no** fill/stroke/width/opacity/corner-radius UI. |

**Cross-cutting themes**
1. **Tiny bugs block whole features** — the missing `await`, the missing `'image'` toolbox key, the GIF mime fall-through. Highest ROI in the codebase.
2. **Silent failures everywhere** — swallowed catches, missing `onerror`, no user feedback. Also the blocker for the "agentic-ready" direction.
3. **Audio playback** is the single biggest functional hole.
4. **Dead/duplicate code** — `VideoCanvasOverlay.tsx` (679 ln) and `src/utils/videoExporter.ts` are both confirmed unimported.

---

## 3. Goals & Non-Goals

**Goals (this spec delivers):**
- Stock-video add works or fails visibly; no infinite spinners.
- Contextual toolbars (Adjust/Animate/styling) appear for every object type they apply to.
- Export produces correct MP4/WebM, **real GIF**, and **real PDF**; honest file naming/feedback.
- Timeline **audio plays** in sync with volume/mute.
- **Shapes get a full styling toolbar** (fill, stroke, width, opacity, corner radius).
- Timeline editing polish: snapping + guides, split, duplicate, ripple-delete, keyboard shortcuts, multi-select UI, **unified undo/redo**.
- **Animation on the timeline**: draggable entrance/emphasis/exit bars, click-to-preview, stagger/delay.
- A consistent **error-surfacing layer**; no silent failures in video/anim paths.
- Tests for pure logic + a manual in-browser verification pass.

**Non-Goals (deferred — see §13):**
- Full After-Effects keyframe editor (engine already supports property tracks; UI later).
- Server-side / `video-processor` rendering for export.
- Audio waveforms, mixing/ducking, per-clip speed, transitions/crossfades, motion blur, bezier-curve easing editor.
- Real-time collaboration; background removal; filter set beyond the existing 10 presets.

---

## 4. Key design decisions

- **D1 — GIF & PDF are client-side and lazy-loaded.** Use `gif.js` (GIF) and `jsPDF` (PDF) via dynamic `import()` so they cost **zero** initial-bundle weight until first use. No new server infra; stays Vercel-friendly. (The `video-processor/` ffmpeg backend stays as-is for its URL-to-Video feature; not in the export path.)
- **D2 — Animation on the timeline = visual bars, not a keyframe editor.** Parity-first: colored entrance/emphasis/exit bars you drag to retime + click-to-preview + stagger. The full keyframe editor (engine already supports it) is a future "+1."
- **D3 — Audio = playback + volume/mute now.** Sync `HTMLAudioElement`s to the timeline clock. Waveform rendering is deferred.
- **D4 — Unified undo/redo.** A single undo manager spans canvas edits (scenify history) and timeline/animation edits (a `VideoContext` snapshot/command stack) so Ctrl/Cmd+Z behaves like one history. If unification proves risky mid-implementation, ship timeline-local undo first and bridge after.
- **D5 — Delete confirmed-dead code** (`VideoCanvasOverlay.tsx`, `src/utils/videoExporter.ts`).
- **D6 — Checkpoint-commit the current uncommitted work first**, as its own baseline commit, separate from this spec, before any new edits.
- **D7 — One error-surfacing layer.** A BaseUI `Snackbar`-based `notify()` helper; every user-facing catch routes through it (`console.error` for diagnostics + a friendly toast). External asset loads always get `onerror` + timeout; never trust SDK loaders.

---

## 5. Architecture & data flow

**The clock.** `VideoContext` (`currentTime`, `isPlaying`, `play/pause/seek`) is the single timeline clock. Three subscribers read it:
- `AnimationDriver` → `applyAnimationsToCanvas(canvas, currentTime, isPlaying)` (preview).
- `VideoCanvasPlayer` → video/text/image overlay visibility + video element sync.
- **New** `AudioPlayer` → `HTMLAudioElement` sync (this spec).

**Animations.** Stored as deltas on `obj.metadata.anim`. `engine.ts` evaluates `(anim, t) → transform`; `driver.ts` applies for preview; `exporter.ts` applies the *same* evaluator frame-by-frame for export. This single-source-of-truth is preserved — new work (timeline bars, stagger) mutates `metadata.anim` via `authoring.ts`; it does **not** fork the evaluator.

**Timeline ↔ canvas.** Clip timing lives in `VideoContext` (`clips`, `audioClips`) and on canvas objects (`metadata.timelineStart` / `timelineDuration`). `VideoTimeline.tsx` is the editing UI; `VideoCanvasPlayer` is the render/overlay. Pure timeline math (split, snap, ripple) is extracted into a testable module (`src/utils/timeline/`) rather than living inline in the 2,985-line component.

**Toolbox routing.** `Toolbox.tsx` maps `activeObjectType → ToolboxItem` (`toolboxOptions`, line 45). Fix coverage: `image`, video, and shape (`rect`/`circle`/…) types route to the correct contextual component (`Image.tsx`, new `Shape.tsx`).

**Export pipeline (client-side).** Images → `canvas.toDataURL`. Video → MediaRecorder (`recordAnimatedVideo`). GIF → frames → `gif.js`. PDF → snapshot → `jsPDF`. `pickMime` is corrected so format ⇒ encoder ⇒ extension are consistent.

**Notifications.** `SnackbarProvider` mounted at app root; `notify(message, kind)` helper in `src/lib/notify.ts`. Every catch in a user action routes here.

---

## 6. Phased plan

Each phase ends in a working, verifiable increment.

### Phase 0 — Checkpoint & foundation
- **0.1** Commit the current uncommitted work as a baseline (`feat: video/animation in-progress baseline`), separate from the spec commit.
- **0.2** Add the notification layer: `SnackbarProvider` at app root + `src/lib/notify.ts` `notify()` helper.
- **0.3** Delete dead code: `src/scenes/Editor/components/VideoCanvasOverlay.tsx` and `src/utils/videoExporter.ts` (both verified unimported).
- **Acceptance:** builds & runs; a test `notify()` shows a toast; no broken imports; 0 TS errors.

### Phase 1 — Critical bug fixes (turn "built" into "works")
- **1.1 Stock-video add** — make the add handler `async`; **preload the poster image ourselves** with `onload`/`onerror`/timeout *before* calling `await editor.add(...)` (so we never depend on the SDK's no-`onerror` loader); clear the spinner in `finally`; `notify()` on failure. (`StockVideos.tsx` / `Video.tsx`, add path.)
- **1.2 Toolbox mapping** — add `image: 'StaticImage'` (and the video type) to `toolboxOptions` (`Toolbox.tsx:45`) so Adjust/Animate appear for `fabric.Image`.
- **1.3 GIF export** — new `src/utils/animation/gifEncoder.ts`: reuse the frame-stepping from `exporter.ts` to capture frames → `gif.js` (dynamic import) → real `.gif`. Fix `pickMime` (`exporter.ts:53-69`) and the ExportModal GIF branch.
- **1.4 PDF export** — dynamic-import `jsPDF`; snapshot canvas → single high-res page → save. Wire into the ExportModal branch that currently has no PDF handler.
- **1.5 MP4 honesty** — if h264/MP4 is unsupported, name the file by its real codec and `notify()` ("Exported as WebM — your browser can't record MP4"); never emit webm-bytes named `.mp4`.
- **1.6 Surface failures** — replace silent catches in these paths with `console.error` + `notify()`.
- **Acceptance:** stock video lands on canvas (or shows a toast); selecting an image shows Adjust; GIF export opens as an animated GIF; PDF export opens as a PDF; MP4 export is honest on a no-h264 browser.

### Phase 2 — Functional completeness (deliver what's advertised)
- **2.1 Timeline audio playback** — populate `audioRefsMap`; create one `HTMLAudioElement` per `audioClip`; on play/seek/pause set `audio.currentTime = currentTime - clip.start`, play/pause within `[start, start+duration]`, apply `volume`; add mute. (`VideoContext.tsx` state/refs; new `AudioPlayer` sync; `VideoTimeline.tsx` volume/mute UI.)
- **2.2 Shape styling** — new `src/scenes/Editor/components/Toolbox/ToolboxItems/Shape.tsx` mirroring `Image.tsx`; map vector/shape types (`rect`, `circle`, `triangle`, `polygon`, `path`, …) in `toolboxOptions`. Controls: fill color, stroke color, stroke width, opacity, corner radius (`rx`/`ry` for rect). Live-apply + `requestRenderAll` + history.
- **2.3 Adjustments on video** — apply image adjustments to the video poster object where `applyFilters` exists; guard cleanly otherwise (true per-frame video filtering is out of scope).
- **Acceptance:** an audio clip plays in sync with a working volume control; selecting a shape shows the full styling toolbar; fill/stroke/width/radius update live.

### Phase 3 — "Canva +1" editing polish
- **3.1 Snapping + guides** — snap clip edges to the playhead, adjacent clip edges, and t=0 within a px threshold; render a snap guide line. (Pure logic in `src/utils/timeline/snap.ts`.)
- **3.2 Clip operations** — `splitClip(id, t)` at the playhead, duplicate, ripple-delete option; context-menu entries + toolbar buttons.
- **3.3 Keyboard shortcuts** — Delete/Backspace (delete selection), Ctrl/Cmd+D (duplicate), Ctrl/Cmd+C/X/V (copy/cut/paste clip), Space (play/pause), arrows (nudge/seek); scoped to timeline focus so canvas shortcuts don't collide.
- **3.4 Multi-select UI** — shift-click + marquee selection; visible selected state; bulk operations over `selectedClipIds`.
- **3.5 Unified undo/redo** — undo manager spanning canvas (scenify history) + timeline/animation (`VideoContext` snapshot stack); Ctrl/Cmd+Z / Shift+Z.
- **3.6 Animation on the timeline** — render entrance/emphasis/exit as colored bars on each element's track; drag to retime (writes `metadata.anim` via `authoring.ts`); click timeline to preview at the playhead; stagger/delay control in the Animations panel.
- **3.7 Canvas insert cascade** — offset successive inserts so new objects don't stack dead-center (`PROBLEMS.md` #7).
- **Acceptance:** snapping shows a guide and clicks into place; split/duplicate/shortcuts/multi-select work; Ctrl+Z undoes both timeline and canvas edits in order; animation bars drag-retime and preview-scrub.

### Phase 4 — Hardening & verification
- **4.1 Error audit** — sweep the video/anim paths for empty/silent catches; route to `notify()`.
- **4.2 Tests** — extend `engine.test.ts`; add unit tests for `filters.ts`, `timeline/*` (split/snap/ripple), the audio-sync pure fn, and gif/pdf wiring (mocked).
- **4.3 In-browser verification** — run the app on an **alternate port** (port 3000 is occupied by another `next-server`) and walk add → timeline → audio → animate → export (MP4/GIF/PDF).
- **4.4 Performance** — memoize timeline tracks per-clip; throttle the rAF sync (update only past a delta threshold); cache frame-bounds; confirm gif.js/jsPDF/heavy panels are lazy. Optional: begin extracting `VideoTimeline.tsx` helpers into `src/utils/timeline/` to shrink the 2,985-line file.
- **Acceptance:** no swallowed failures; tests green; manual walkthrough passes; no perceptible timeline-interaction regression at ~30+ objects; initial bundle not regressed.

---

## 7. Error-handling strategy

- **No empty catches.** Every async user action: `try { … } catch (e) { console.error(e); notify(friendlyMessage, 'negative') }`.
- **External loads** (image/video/audio) always attach `onerror` + a timeout and reject; the app never waits on an SDK loader that can hang.
- **Object types** are validated before `editor.add` (the scenify `objectToFabric` switch has no default case — unknown types silently produce `undefined`); unsupported types `notify()` instead of failing silently.
- **Export** keeps the existing per-frame error isolation + watchdog; fatal errors surface via `notify()`.

## 8. Testing strategy

- **Unit (pure logic):** `engine.ts` (extend existing), `filters.ts`, `timeline/{split,snap,ripple}.ts`, audio-sync mapping fn.
- **Wiring (mocked):** `pickMime` correctness; gif/pdf encoders invoked with expected frames/mime.
- **Smoke:** add stock video → canvas object exists; export each format → non-empty blob of the correct MIME.
- **Manual:** per-phase in-browser walkthrough on the alternate port.

## 9. Performance

- Lazy-load `gif.js`, `jsPDF`, and heavy panels via dynamic `import()`.
- Memoize timeline track derivation; avoid full re-render on every clip change.
- Throttle the playback rAF sync; cache canvas frame-bounds for a short interval.
- (Separate "Performance" track — the 3.2 MB vendor bundle / code-splitting — is out of scope here; this spec only avoids *regressing* it.)

## 10. Risks & mitigations

- **SDK fragility** (no default case, no `onerror`) → preload/validate assets ourselves; wrap loaders.
- **2,985-line `VideoTimeline.tsx`** → extract pure helpers into `src/utils/timeline/` (testable, lower-risk edits); optional file split in Phase 4.
- **Undo/redo unification is the hardest item** → fallback to timeline-local undo first, bridge to canvas history after (D4).
- **Bundle growth** from gif.js/jsPDF → dynamic import (D1).
- **Regressing working export/animation** → keep the shared engine untouched; add tests before refactoring; phases are independently revertable.

## 11. Success criteria (Definition of Done)

- Every video/animation feature advertised in the README works: multi-track timeline **with audio**, MP4/WebM/**GIF**/**PDF** export, animations, **shape styling**, snapping/guides.
- No silent failures in any video/animation path.
- Tests green; build clean (0 TS errors; no new ESLint errors in touched files).
- Manual walkthrough passes; timeline stays smooth at ~30+ objects; initial bundle not regressed.

## 12. File / module impact (high level)

- **New:** `src/lib/notify.ts`; `src/utils/animation/gifEncoder.ts`; `src/utils/pdfExport.ts`; `src/utils/timeline/{split,snap,ripple}.ts`; `src/scenes/Editor/components/Toolbox/ToolboxItems/Shape.tsx`; `AudioPlayer` (component).
- **Modified:** `Toolbox.tsx` (type map), `StockVideos.tsx`/`Video.tsx` (await + errors), `ExportModal.tsx` + `exporter.ts` (GIF/PDF/MP4/pickMime), `VideoContext.tsx` (audio refs, split, history), `VideoTimeline.tsx` (snap/shortcuts/multi-select/anim bars), `VideoCanvasPlayer.tsx` (audio sync hook), `Animations.tsx` + `authoring.ts` (stagger/delay), app root (SnackbarProvider), editor-add path (insert cascade).
- **Deleted:** `VideoCanvasOverlay.tsx`, `src/utils/videoExporter.ts`.

## 13. Out of scope / future "+1"

Full keyframe editor UI · server-side export rendering · audio waveforms / mixing / ducking · per-clip speed · transitions & crossfades · motion blur · bezier easing editor · real-time collaboration · background removal · expanded filter library · the separate performance/bundle-splitting track.
