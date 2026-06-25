# Marketifyall Design & Video Editor — Problem Audit

**Date:** 2026-06-25
**Method:** Live walkthrough of the running editor (`localhost:3000`) via browser automation + console/network inspection + source verification of root causes.
**Goal of the product:** A professional, *agentic-ready* design **and video** editor.

This document lists every problem found, walking the UI top-to-bottom, with severity, evidence, location, and (where confirmed) root cause. Severity legend:

- 🔴 **Blocker** — core promised feature is broken/unusable.
- 🟠 **Major** — significant functional gap or bad UX for a "professional" tool.
- 🟡 **Minor** — polish, performance, or code-health issue.

---

## Executive summary

| # | Problem | Severity |
|---|---------|----------|
| 1 | 4 of 128 templates fail to load (raw Fabric.js schema the engine can't read) | ✅ FIXED |
| 2 | AI Studio uses a model slug the OpenRouter account doesn't serve → every generation fails | ✅ FIXED |
| 3 | Adding a Stock Video hangs on a spinner and never lands on the canvas | 🔴 Blocker |
| 4 | No video timeline / no clip-based editing — "video editor" is just a static canvas | 🔴 Blocker |
| 5 | Export has no video/MP4/GIF output (dead code exists for it) | 🟠 Major |
| 6 | No fill/stroke/opacity controls surfaced for shapes; properties UX is thin | 🟠 Major |
| 7 | New objects all stack dead-center, overlapping | 🟡 Minor |
| 8 | Very slow lazy-loading of thumbnails (templates, stock photos/videos) | 🟡 Minor |
| 9 | Console flooded with hundreds of CSS shorthand/longhand warnings | 🟡 Minor |
| 10 | Large volume of ESLint dead-code / hook-dependency warnings | 🟡 Minor |
| 11 | Left-panel tab bars overflow / clip labels ("Sticke…") | 🟡 Minor |
| 12 | Empty/unconfigured API keys in `.env` (Pixabay, Iconscout) | 🟡 Minor |

---

## ✅ Fixed & verified live

### 2. AI Studio — model slug not served by the OpenRouter account  ✅ FIXED
> Two corrections to the first-pass audit: (a) it does **not** hang forever — `handleSend` (`AiStudio.tsx:861`) races a **90s** timeout and guards re-entry with `if (designing) return`; (b) the endpoint path was **never wrong**. `REACT_APP_API_URL` already includes `/functions/v1`, so `client.post('/ai-proxy')` correctly hit `/functions/v1/ai-proxy`. My first patch (adding `/functions/v1` again) actually *broke* it into a doubled path → 404, and was reverted.
- **Verified root cause:** A live `curl` to the correct endpoint returned **HTTP 503** with body:
  `{"error":"ai_provider_error","details":"{\"error\":{\"message\":\"No endpoints found for anthropic/claude-3.5-sonnet.\",\"code\":404}}","credits_remaining":10}`.
  The function is deployed and working (auth ✓, credits ✓); it proxies the client's `model` to OpenRouter, and **this account's OpenRouter routing only serves specific models**. Probing the live endpoint (failed calls auto-refund credits):
  | model | result |
  |---|---|
  | `qwen/qwen3.5-plus-02-15` (original, hardcoded) | ❌ No endpoints found |
  | `anthropic/claude-3.5-sonnet`, `google/gemini-flash-1.5` | ❌ No endpoints found |
  | `openai/gpt-4o-mini`, `anthropic/claude-3-haiku` | ✅ 200 |
  | `meta-llama/llama-3.3-70b-instruct`, `qwen/qwen-2.5-72b-instruct` | ✅ 200 |
- **Fix applied:** `AiStudio.tsx` model → **`qwen/qwen3-next-80b-a3b-instruct:free`** (free, open-source MoE — 80B total / ~3B active, <120B, strong at structured JSON/layout). Verified live with `qwen/qwen-2.5-72b-instruct` (since swapped to the free model): a prompt produces a full design plan + executes actions + renders a real composition (clearCanvas → background → hero image → contrast overlay → headline → subhead → CTA pill + text).
- **Also improved (this round):**
  1. **Canvas context for the LLM** — `buildCanvasContext()` reads live canvas objects, inverse-maps them to design coordinates, and is sent as a system message every request, so the model places elements without overlap and can edit/extend the current design (not just generate blind).
  2. **Rewritten layout system prompt** — explicit coordinate semantics (top-left origin), a hard no-overlap rule (vertical bands + height estimation), centering math, and a proportional worked example. Output went from a floating rectangle to a properly layered poster.
  3. **`clearCanvas` action** — lets the model start fresh on a non-empty canvas (verified: ran as the first action on a re-design).
  4. **Resilience** — an OpenRouter `models[]` fallback chain (best→most-available, max 3), retry on transient 429/503, `provider.allow_fallbacks`, and friendly error messages ("provider busy", "out of credits") instead of raw status codes.
- **Final model chain (all free / open-source / <120B):** primary `qwen/qwen3-next-80b-a3b-instruct:free` → `meta-llama/llama-3.3-70b-instruct:free` → `google/gemma-4-31b-it:free`. Verified live end-to-end (fitness promo: clearCanvas → black bg → hero gym photo → headline → lime offer pill → centered offer text → sub-headline; clean banded layout, no overlap, no console errors).
- **Two stability fixes found during verification:**
  - **Excluded `openai/gpt-oss-20b:free`** from the chain — as a *reasoning* model its response handling reliably triggered a pre-existing vendor `ReferenceError: process is not defined` (from a lazily-eval'd module the app's `process` polyfill can't reach) that crashed the panel ("Panel failed to load"). Non-reasoning instruct models don't hit it.
  - **Disabled `addIcon`/`addIllustration` actions** — the lucide renderer (`react-dom/server` in `lucideIconsManager`) is browser-fragile; designs compose well with background/image/shape/text. (The `process`-polyfill / icon-rendering path is worth a proper fix later to re-enable icons + gpt-oss.)
- **Known caveat:** the shared OpenRouter key has a small free-tier rate budget; heavy bursts return upstream 429 ("retry shortly") — the retry + fallback chain smooth normal use. Real remedy for volume: attach a dedicated OpenRouter key (per OpenRouter's own message) — an ops/config step, not a code bug.
- **Remaining refinements (not model-related):** headline can slightly overlap the image (layout-precision in the action schema / `buildSystemPrompt`); the 90s wait shows only a `…` with no progress/cancel; logged-out users send no auth header (`getAuthHeaders` returns `{}`) so a real deploy needs sign-in/credits handling; the OpenRouter fallback only triggers on *network* errors, not backend 4xx/5xx. Image-gen (`AiStudio.tsx:801`, `openai/dall-e-3`) is untested and likely needs the same model-availability check.

### 1. Four templates failed to load (raw Fabric.js schema)  ✅ FIXED
> Correction to the first-pass audit: it was **not** "all 128 templates." I happened to click the only 4 broken ones first (they sit at the top of the list). A scenify-schema template (Wanderlust) renders perfectly.
- **Was:** **4 of 128** templates loaded to a blank canvas: **Travel, Flash Sale, Coming Soon, Car Sale**.
- **Root cause (verified):** Those 4 were stored as raw **Fabric.js** JSON (`rect`/`circle`/`textbox`/`image`) in `public/data/template.json`, but the engine's `objectToFabric.run()` switches on `item.type` against scenify's `ObjectType` enum (`StaticImage/StaticText/Background/…`, `scenify-sdk.esm.js:2622`) with **no default case** → unknown types return `undefined` → `UNABLE TO LOAD OBJECT` (`:2905`). They also had a broken coordinate space (background rect offset, elements off-canvas — exported mid-pan).
- **Fix applied:** A one-time migration normalized those 4 templates' objects into scenify schema (`rect`→`Background` or SVG-data-URL `StaticImage`, `circle`→SVG `StaticImage`, `textbox`→`StaticText`, `image`→`StaticImage`) and re-anchored the coordinate space to the background origin. Verified live: all 4 now render correctly and match their thumbnails; `UNABLE TO LOAD OBJECT` is gone from the console.

## 🔴 Remaining blockers

### 3. Adding a Stock Video hangs and never reaches the canvas
- **What happens:** Clicking a stock video shows a loading spinner on the thumbnail that never resolves (9s+). The clip never appears on the canvas.
- **Evidence:** Spinner persists; canvas unchanged after waiting.
- **Impact:** Stock video — a primary source for a video editor — can't be used.
- **Fix direction:** Trace the video-add path (download/blob → canvas object), add timeout + error handling; likely the same enliven/objectToFabric gap as templates for video object types.

### 4. No video timeline / clip editing
- **What happens:** There is no timeline, no track lanes, no playhead, no clip trimming/sequencing anywhere in the editor. The canvas is a single static art-board.
- **Impact:** For a product billed as a "video editor," the core editing surface (a timeline) is absent. You cannot sequence clips, trim, set durations, or keyframe.
- **Note:** Code references exist (`VideoContext`, `VideoCanvasPlayer`, `hasTimeline` — flagged as *unused* by ESLint), suggesting the timeline is partially scaffolded but not wired into the UI.
- **Fix direction:** This is a foundational architecture item, not a quick patch — design the timeline/track model before further video work.

---

## 🟠 Major

### 5. Export has no video output
- **What happens:** Export Design modal offers PNG / JPG / WebP / SVG / PDF / JSON at 1×–4×. There is **no MP4 / WebM / GIF** option.
- **Evidence:** `ExportModal.tsx` imports `exportVideoWithRecorder`, `exportAsGif`, `downloadBlob`, `VideoExportOptions` — all flagged **unused** by ESLint, i.e. the video-export pipeline is written but not surfaced.
- **Impact:** Even if you could build a video, you can't export one.
- **Fix direction:** Wire the existing video/GIF export helpers into the modal, gated on whether the design contains video/animation.

### 6. Thin object-properties UX (shapes)
- **What happens:** Selecting a **shape** shows resize/rotate handles but no contextual controls for fill color, stroke, opacity, corner radius, etc. (Text objects do get a rich toolbar: font, size, color, B/I/U, align, line-height, Animate, Position, layer, lock, duplicate, delete.)
- **Impact:** A professional editor needs per-object styling for shapes/images, not just text.
- **Fix direction:** Extend the contextual toolbar to expose fill/stroke/opacity/radius for non-text objects.

---

## 🟡 Minor / polish / code-health

### 7. New objects stack at exact center
Adding a shape then a heading drops both at the canvas center, overlapping. Offset successive inserts (cascade) so they don't pile up.

### 8. Slow thumbnail loading
Template thumbnails initially render blank and Stock Photos/Videos show grey/black skeletons for several seconds before images appear. Add proper lazy-load placeholders and prefetch; consider caching. (Not broken — just slow enough to look broken.)

### 9. Console flooded with CSS shorthand/longhand warnings
Hundreds of `Mixing shorthand and longhand properties ... unsupported with atomic rendering` warnings (Styletron/base-ui atomic CSS) on every render — e.g. mixing `borderRadius` with `borderTopLeftRadius`, `border` with `borderTopWidth`, `transition` with `transitionProperty`. Clean up the offending style objects; the noise hides real errors.

### 10. ESLint dead-code & hook-dependency warnings
Compilation succeeds but with a large warning list, e.g.:
- Unused vars across `Video.tsx` (8+ styled components), `ExportModal.tsx`, `History.tsx`, `Elements.tsx`, `PreviewTemplate.tsx`, `Container.tsx`.
- `react-hooks/exhaustive-deps` in `CreditsContext.tsx`, `AIDesigner.tsx`, `AiStudio.tsx`, `Color.tsx`, `StockVideos.tsx`, `Text.tsx` — these can cause stale-closure bugs.
Treat warnings as errors in CI and clean them up.

### 11. Left-panel tab labels overflow
The Elements sub-tab row clips the last label ("Sticke…" / "Stickers") with no scroll affordance. Make the tab strip horizontally scrollable or responsive.

### 12. Unconfigured API keys in `.env`
`REACT_APP_PIXABAY_KEY`, `REACT_APP_ICONSCOUT_SECRET`, `REACT_APP_ICONSCOUT_CLIENT_ID` are empty strings. Any feature depending on Pixabay/Iconscout will silently fail. Document required keys and fail loudly when missing.

---

## What works well (for balance)
- Adding shapes/icons/emoji from **Elements** → canvas works; "Recently used" updates.
- **Text**: insert + inline edit + full formatting toolbar works.
- **Stock Photos** (Pexels) and **Illustrations** (Iconify) load and are browsable.
- **Resize** dialog (size presets + custom W/H) works.
- **Export** modal UI (image/vector formats, 1×–4×) is well-built.
- Undo/redo, selection handles, and panel navigation are responsive.

---

## Recommended priority order
- ✅ **#2 AI Studio** — DONE (model → free `qwen/qwen3-next-80b-a3b-instruct:free`, + canvas context, stronger layout prompt, clearCanvas, retry/resilience).
- ✅ **#1 Templates** — DONE (4 broken templates normalized to scenify schema, verified live).
1. **#4 Video timeline** + **#3 stock-video add** + **#5 video export** — the entire "video editor" half of the product.
2. **#6 shape properties** — needed to call the design side "professional."
3. Code-health sweep (**#9, #10**) — required before the codebase is agentic-ready (clean signal, no silent failures).
4. **AI layout quality** — refine `buildSystemPrompt`/action schema so text doesn't overlap images; add progress/cancel UI for the up-to-90s generation.

> Note on "agentic-ready": several failures are *silent* (`console.log` instead of surfaced errors, no timeouts, swallowed network failures). An agent driving this editor needs deterministic, observable success/failure signals on every action — fixing the silent-failure pattern is a prerequisite, not a nice-to-have.
