# Video/Animation Core — Phase 0 (Foundation) + Phase 1 (Critical Fixes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the already-built video/animation features from "look broken" into "work and fail loudly" — fix the handful of bugs that block stock-video add, image Adjust/Animate controls, and GIF/PDF export, on top of a new error-surfacing foundation.

**Architecture:** A single BaseUI-toast `notify()` layer surfaces every user-facing failure. Export gains a real GIF encoder (`gifenc`) and PDF exporter (`jsPDF`), both dynamically imported so they cost zero initial bundle. The per-frame compositor in `exporter.ts` is extracted so video and GIF share one renderer (DRY). The Toolbox object-type map and the stock-video add path get the small fixes that unblock them, with pure logic pulled into testable modules.

**Tech Stack:** React 17, TypeScript 4, `@nkyo/scenify-sdk` (Fabric.js 4), BaseUI 10 (`baseui/toast`), CRA 4 via CRACO, Jest (react-scripts), Redux. New deps: `gifenc`, `jspdf`.

**Scope note:** This is the first of several phase-plans for the approved spec (`docs/superpowers/specs/2026-06-27-video-animation-core-canva-plus-one-design.md`). It covers spec **Phase 0** and **Phase 1**. Phases 2 (audio + shape styling), 3 (timeline polish + animation-on-timeline), and 4 (hardening) get their own plans after this ships.

---

## Conventions (read once, applies to every task)

**Branch:** Work on `feat/video-animation-canva-plus-one` (already checked out).

**Test environment — IMPORTANT.** The Jest/jsdom harness can't load this repo's `canvas` native module (built for the wrong Node ABI; `npm rebuild canvas` fails on Node 26). Therefore:
- All unit tests in this plan are **pure-logic** tests that start with the docblock `/** @jest-environment node */` to run in Node (no jsdom, no `canvas`). This is verified working.
- Test files use **relative imports** (e.g. `./notify`), never `@/` aliases — CRACO strips tsconfig `paths` during `craco test`.
- DOM/canvas/encoder *wiring* (things that need a real browser canvas) is verified with the explicit **Manual verification** steps in each task, not a unit test. This is intentional, not a shortcut.

**Run a test:**
```bash
CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test <path-to-test> --watchAll=false
```
Expected on success: `PASS <path>` and `Tests: N passed`.

**Typecheck (run after edits that change types):**
```bash
NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json
```
Expected: no output, exit 0.

**Run the app for manual verification** (port 3000 is taken by another server; use 3005):
```bash
BROWSER=none PORT=3005 NODE_OPTIONS=--openssl-legacy-provider npx craco start
```
Then open `http://localhost:3005`.

**Install a dependency** (`.npmrc` already sets `legacy-peer-deps=true`):
```bash
npm install <pkg>
```
If the install errors while rebuilding the pre-existing `canvas` native module, re-run with `--ignore-scripts` (the new deps `gifenc`/`jspdf` are pure JS with no build step).

---

## Task 1: Checkpoint-commit the in-progress work

Commit the existing uncommitted video/animation work as a clean baseline so every later task is a reviewable diff on top of it.

**Files:** none created/modified (git only).

- [ ] **Step 1: Confirm the working tree is the expected in-progress set**

Run: `git status --short`
Expected: the modified `src/...` files (constants/editor.ts, Editor.tsx, ExportModal.tsx, Animations.tsx, PanelItems/index.tsx, Image.tsx, VideoCanvasPlayer.tsx, VideoTimeline.tsx) plus untracked `AnimationDriver.tsx`, `Adjustments.tsx`, `Adjust.tsx`, `src/utils/animation/`, `src/utils/filters.ts`. (The spec doc is already committed and will NOT appear.)

- [ ] **Step 2: Verify it still typechecks before committing**

Run: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 3: Commit the baseline**

```bash
git add -A
git commit -m "feat: video/animation in-progress baseline (animation engine, timeline, filters, export)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Verify**

Run: `git status --short` → expected: empty. Run: `git log --oneline -2` → expected: the baseline commit on top of the spec commit.

---

## Task 2: Add the `notify()` toast layer

A single notification entry point so failures are surfaced, not swallowed.

**Files:**
- Create: `src/lib/notify.ts`
- Create (test): `src/lib/notify.test.ts`
- Modify: `src/scenes/Editor/Editor.tsx` (mount `<ToasterContainer/>`)

- [ ] **Step 1: Write the failing test**

Create `src/lib/notify.test.ts`:
```ts
/** @jest-environment node */
jest.mock('baseui/toast', () => ({
  toaster: {
    positive: jest.fn(),
    negative: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}))

import { notify } from './notify'
import { toaster } from 'baseui/toast'

describe('notify', () => {
  beforeEach(() => jest.clearAllMocks())

  it('routes negative to toaster.negative', () => {
    notify('boom', 'negative')
    expect((toaster as any).negative).toHaveBeenCalledWith('boom', {})
  })

  it('routes positive to toaster.positive', () => {
    notify('yay', 'positive')
    expect((toaster as any).positive).toHaveBeenCalledWith('yay', {})
  })

  it('defaults to info', () => {
    notify('hello')
    expect((toaster as any).info).toHaveBeenCalledWith('hello', {})
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/lib/notify.test.ts --watchAll=false`
Expected: FAIL — cannot find module `./notify`.

- [ ] **Step 3: Implement `notify`**

Create `src/lib/notify.ts`:
```ts
import { toaster } from 'baseui/toast'

export type NotifyKind = 'info' | 'positive' | 'negative' | 'warning'

/**
 * Single entry point for user-facing notifications.
 * Requires <ToasterContainer/> mounted once in the tree (see Editor.tsx).
 */
export function notify(message: string, kind: NotifyKind = 'info') {
  switch (kind) {
    case 'positive':
      return toaster.positive(message, {})
    case 'negative':
      return toaster.negative(message, {})
    case 'warning':
      return toaster.warning(message, {})
    case 'info':
    default:
      return toaster.info(message, {})
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/lib/notify.test.ts --watchAll=false`
Expected: `PASS src/lib/notify.test.ts`, 3 passed.

- [ ] **Step 5: Mount `<ToasterContainer/>` in `Editor.tsx`**

In `src/scenes/Editor/Editor.tsx`, add the import near the other top imports:
```ts
import { ToasterContainer, PLACEMENT } from 'baseui/toast'
```
Then find this block (added in the baseline):
```tsx
            <AnimationDriver />
            <VideoCanvasPlayer />
```
and change it to:
```tsx
            <ToasterContainer placement={PLACEMENT.bottomRight} autoHideDuration={4500} />
            <AnimationDriver />
            <VideoCanvasPlayer />
```

- [ ] **Step 6: Typecheck**

Run: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notify.ts src/lib/notify.test.ts src/scenes/Editor/Editor.tsx
git commit -m "feat(editor): add notify() toast layer + mount ToasterContainer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Delete confirmed-dead code

`VideoCanvasOverlay.tsx` and the old `videoExporter.ts` are unimported (verified: `VideoCanvasOverlay` appears only in a comment inside `videoExporter.ts`; `videoExporter` has zero importers).

**Files:**
- Delete: `src/scenes/Editor/components/VideoCanvasOverlay.tsx`
- Delete: `src/utils/videoExporter.ts`

- [ ] **Step 1: Re-confirm there are no importers**

Run:
```bash
grep -rn "VideoCanvasOverlay\|videoExporter" src --include=*.ts --include=*.tsx | grep -v "VideoCanvasOverlay.tsx:" | grep -v "videoExporter.ts:"
```
Expected: no output (no real importers). If anything prints other than the files' own internals, STOP and investigate before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/scenes/Editor/components/VideoCanvasOverlay.tsx src/utils/videoExporter.ts
```

- [ ] **Step 3: Typecheck (proves nothing referenced them)**

Run: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(editor): remove dead VideoCanvasOverlay + old videoExporter

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Pure export helpers (`exportHelpers.ts`)

Two pure functions used by export: an honest MP4-fallback message and a GIF encoding plan (caps fps + resolution so GIFs don't balloon).

**Files:**
- Create: `src/utils/animation/exportHelpers.ts`
- Create (test): `src/utils/animation/exportHelpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/animation/exportHelpers.test.ts`:
```ts
/** @jest-environment node */
import { mp4FallbackMessage, computeGifPlan } from './exportHelpers'

describe('mp4FallbackMessage', () => {
  it('warns when mp4 was requested but webm was produced', () => {
    expect(mp4FallbackMessage('mp4', 'webm')).toMatch(/WebM/)
  })
  it('is silent when mp4 succeeded', () => {
    expect(mp4FallbackMessage('mp4', 'mp4')).toBeNull()
  })
  it('is silent for non-mp4 requests', () => {
    expect(mp4FallbackMessage('webm', 'webm')).toBeNull()
  })
})

describe('computeGifPlan', () => {
  it('caps frame count to maxFrames', () => {
    const p = computeGifPlan({ durationSec: 100, srcWidth: 100, srcHeight: 100, maxFps: 12, maxFrames: 150 })
    expect(p.frameCount).toBe(150)
  })
  it('downscales when over maxDimension but never upscales', () => {
    const big = computeGifPlan({ durationSec: 1, srcWidth: 1920, srcHeight: 1080, maxDimension: 640 })
    expect(Math.max(big.width, big.height)).toBe(640)
    const small = computeGifPlan({ durationSec: 1, srcWidth: 320, srcHeight: 240, maxDimension: 640 })
    expect(small.width).toBe(320)
    expect(small.height).toBe(240)
  })
  it('produces a positive per-frame delay', () => {
    const p = computeGifPlan({ durationSec: 2, srcWidth: 100, srcHeight: 100, maxFps: 10 })
    expect(p.frameCount).toBe(20)
    expect(p.delayMs).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/utils/animation/exportHelpers.test.ts --watchAll=false`
Expected: FAIL — cannot find module `./exportHelpers`.

- [ ] **Step 3: Implement the helpers**

Create `src/utils/animation/exportHelpers.ts`:
```ts
/** Returns a user-facing warning when MP4 was requested but the browser
 *  could only record WebM. Null when no notice is needed. */
export function mp4FallbackMessage(requestedFormat: string, actualExt: string): string | null {
  if (requestedFormat === 'mp4' && actualExt !== 'mp4') {
    return 'Your browser can’t record MP4 — exported as WebM instead.'
  }
  return null
}

export interface GifPlan {
  frameCount: number
  delayMs: number
  width: number
  height: number
}

/** GIFs balloon fast, so cap fps and resolution. Returns an encoding plan
 *  (frame count, per-frame delay, and output dimensions). Never upscales. */
export function computeGifPlan(opts: {
  durationSec: number
  srcWidth: number
  srcHeight: number
  maxFps?: number
  maxDimension?: number
  maxFrames?: number
}): GifPlan {
  const maxFps = opts.maxFps ?? 12
  const maxDimension = opts.maxDimension ?? 640
  const maxFrames = opts.maxFrames ?? 150
  const dur = Math.max(0.1, opts.durationSec || 0.1)
  const frameCount = Math.max(1, Math.min(maxFrames, Math.round(dur * maxFps)))
  const effectiveFps = frameCount / dur
  const delayMs = Math.max(1, Math.round(1000 / effectiveFps))
  const scale = Math.min(1, maxDimension / Math.max(opts.srcWidth, opts.srcHeight))
  const width = Math.max(2, Math.round(opts.srcWidth * scale))
  const height = Math.max(2, Math.round(opts.srcHeight * scale))
  return { frameCount, delayMs, width, height }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/utils/animation/exportHelpers.test.ts --watchAll=false`
Expected: `PASS`, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/animation/exportHelpers.ts src/utils/animation/exportHelpers.test.ts
git commit -m "feat(export): pure helpers for mp4 fallback notice + gif plan

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Real GIF export (`gifenc`) + share the frame renderer + MP4 notice

Replace the broken GIF path (it emitted a `.webm`) with a real GIF encoder, reusing the exact per-frame compositor from `exporter.ts`.

**Files:**
- Modify: `src/utils/animation/exporter.ts` (extract `renderDesignFrame`)
- Create: `src/utils/animation/gifEncoder.ts`
- Modify: `src/scenes/Editor/components/Navbar/components/ExportModal.tsx` (route `gif` to the new encoder; add MP4 notice)
- Dependency: `gifenc`

- [ ] **Step 1: Install gifenc**

Run: `npm install gifenc`
Expected: adds `gifenc` to `package.json` dependencies. (If it errors on `canvas`, re-run `npm install gifenc --ignore-scripts`.)

- [ ] **Step 2: Extract `renderDesignFrame` in `exporter.ts`**

In `src/utils/animation/exporter.ts`, add this exported interface + function at module scope (place it directly **above** `export async function recordAnimatedVideo`):
```ts
export interface FrameRenderParams {
  ctx: CanvasRenderingContext2D
  exportCanvas: HTMLCanvasElement
  fabricCanvas: any
  designRect: DesignRect
  outWidth: number
  outHeight: number
  backgroundColor: string
  videoTargets: VideoTarget[]
  mult: number
  t: number
}

/** Renders ONE composited frame (animations + design crop + live video
 *  overlays) into the given 2D context. Shared by the video recorder and the
 *  GIF encoder so both produce identical output. */
export function renderDesignFrame(p: FrameRenderParams): void {
  const { ctx, exportCanvas, fabricCanvas, designRect, outWidth, outHeight, backgroundColor, videoTargets, mult, t } = p
  try {
    applyAnimationsToCanvas(fabricCanvas, t, true)
    fabricCanvas.renderAll()
  } catch {
    /* ignore a bad animation frame */
  }
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
  try {
    const cropped = fabricCanvas.toCanvasElement(mult, {
      left: designRect.left,
      top: designRect.top,
      width: designRect.width,
      height: designRect.height,
    })
    if (cropped) ctx.drawImage(cropped, 0, 0, exportCanvas.width, exportCanvas.height)
  } catch {
    /* ignore a bad crop frame */
  }
  for (const v of videoTargets) {
    if (t < v.start || t >= v.start + v.duration) continue
    if (v.el.readyState < 2) continue
    let rect = v.rect
    let opacity = 1
    let angle = 0
    if (v.obj) {
      const o = v.obj
      const w0 = (o.width || rect.width) * (o.scaleX || 1)
      const h0 = (o.height || rect.height) * (o.scaleY || 1)
      let l0 = o.left != null ? o.left : rect.left
      let tp0 = o.top != null ? o.top : rect.top
      if (o.originX === 'center') l0 -= w0 / 2
      if (o.originY === 'center') tp0 -= h0 / 2
      rect = { left: l0, top: tp0, width: w0, height: h0 }
      opacity = getAnimOpacity(o) ?? (o.opacity == null ? 1 : o.opacity)
      angle = o.angle || 0
    }
    if (opacity <= 0.001) continue
    const x = ((rect.left - designRect.left) / designRect.width) * outWidth
    const y = ((rect.top - designRect.top) / designRect.height) * outHeight
    const w = (rect.width / designRect.width) * outWidth
    const h = (rect.height / designRect.height) * outHeight
    try {
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity))
      if (angle) {
        ctx.translate(x + w / 2, y + h / 2)
        ctx.rotate((angle * Math.PI) / 180)
        ctx.drawImage(v.el, -w / 2, -h / 2, w, h)
      } else {
        ctx.drawImage(v.el, x, y, w, h)
      }
      ctx.restore()
    } catch {
      ctx.restore()
    }
  }
}
```

- [ ] **Step 3: Make `recordAnimatedVideo`'s `renderAt` delegate to it**

In `src/utils/animation/exporter.ts`, replace the entire existing `const renderAt = (t: number) => { ... }` block (it spans roughly the `applyAnimationsToCanvas`-to-`captureTrack.requestFrame()` body) with:
```ts
    const renderAt = (t: number) => {
      renderDesignFrame({
        ctx,
        exportCanvas,
        fabricCanvas,
        designRect,
        outWidth,
        outHeight,
        backgroundColor,
        videoTargets,
        mult,
        t,
      })
      if (captureTrack) {
        try {
          captureTrack.requestFrame()
        } catch {
          /* ignore */
        }
      }
    }
```

- [ ] **Step 4: Typecheck the refactor (no behavior change expected)**

Run: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 5: Create the GIF encoder**

Create `src/utils/animation/gifEncoder.ts`:
```ts
import { restoreAllBases } from './driver'
import { renderDesignFrame, DesignRect, VideoTarget } from './exporter'
import { computeGifPlan } from './exportHelpers'

export interface GifRecordOptions {
  fabricCanvas: any
  designRect: DesignRect
  outWidth: number
  outHeight: number
  durationSec: number
  backgroundColor?: string
  videoTargets?: VideoTarget[]
  onProgress?: (p: number, phase?: string) => void
}

export interface GifResult {
  blob: Blob
  ext: 'gif'
  mime: 'image/gif'
}

/** Renders the animated design frame-by-frame and encodes a real GIF.
 *  gifenc is dynamically imported so it never weighs down the initial bundle. */
export async function recordAnimatedGif(opts: GifRecordOptions): Promise<GifResult> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')

  const plan = computeGifPlan({
    durationSec: opts.durationSec,
    srcWidth: opts.outWidth,
    srcHeight: opts.outHeight,
  })

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = plan.width
  exportCanvas.height = plan.height
  const ctx = exportCanvas.getContext('2d')!
  const mult = plan.width / Math.max(1, opts.designRect.width)
  const gif = GIFEncoder()

  try {
    for (let i = 0; i < plan.frameCount; i++) {
      const t = (i / plan.frameCount) * opts.durationSec
      renderDesignFrame({
        ctx,
        exportCanvas,
        fabricCanvas: opts.fabricCanvas,
        designRect: opts.designRect,
        outWidth: plan.width,
        outHeight: plan.height,
        backgroundColor: opts.backgroundColor || '#ffffff',
        videoTargets: opts.videoTargets || [],
        mult,
        t,
      })
      const { data } = ctx.getImageData(0, 0, plan.width, plan.height)
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      gif.writeFrame(index, plan.width, plan.height, { palette, delay: plan.delayMs })
      opts.onProgress?.(Math.min(99, (i / plan.frameCount) * 100), 'Encoding GIF…')
      // Yield to the event loop so the progress UI can paint.
      await new Promise(r => setTimeout(r, 0))
    }
    gif.finish()
    const bytes = gif.bytes()
    return { blob: new Blob([bytes], { type: 'image/gif' }), ext: 'gif', mime: 'image/gif' }
  } finally {
    try {
      restoreAllBases(opts.fabricCanvas)
    } catch {
      /* ignore */
    }
    try {
      opts.fabricCanvas?.renderAll?.()
    } catch {
      /* ignore */
    }
    try {
      exportCanvas.remove()
    } catch {
      /* ignore */
    }
  }
}
```

- [ ] **Step 6: Wire `ExportModal.tsx` — route GIF to the encoder + add MP4 notice**

In `src/scenes/Editor/components/Navbar/components/ExportModal.tsx`, add imports near the other export imports:
```ts
import { recordAnimatedGif } from '@/utils/animation/gifEncoder'
import { mp4FallbackMessage } from '@/utils/animation/exportHelpers'
import { notify } from '@/lib/notify'
```
Then find this block (around lines 451–465 — the single `recordAnimatedVideo` call followed by the download):
```ts
        const result = await recordAnimatedVideo({
          fabricCanvas: canvas,
          designRect: { left: designLeft, top: designTop, width: designWidth, height: designHeight },
          outWidth: finalExportWidth,
          outHeight: finalExportHeight,
          fps: videoFPS,
          durationSec: videoDuration,
          bitrate: qualityConfigVid.bitrate * 1000000,
          format: format as 'mp4' | 'webm' | 'gif',
          backgroundColor: '#ffffff',
          videoTargets,
          onProgress: (p: number) => setExportProgress(Math.max(2, Math.min(100, p))),
        })

        downloadVideoBlob(result.blob, `${designName}.${result.ext}`)
```
and replace it with:
```ts
        let result
        if (format === 'gif') {
          result = await recordAnimatedGif({
            fabricCanvas: canvas,
            designRect: { left: designLeft, top: designTop, width: designWidth, height: designHeight },
            outWidth: finalExportWidth,
            outHeight: finalExportHeight,
            durationSec: videoDuration,
            backgroundColor: '#ffffff',
            videoTargets,
            onProgress: (p: number) => setExportProgress(Math.max(2, Math.min(100, p))),
          })
        } else {
          result = await recordAnimatedVideo({
            fabricCanvas: canvas,
            designRect: { left: designLeft, top: designTop, width: designWidth, height: designHeight },
            outWidth: finalExportWidth,
            outHeight: finalExportHeight,
            fps: videoFPS,
            durationSec: videoDuration,
            bitrate: qualityConfigVid.bitrate * 1000000,
            format: format as 'mp4' | 'webm',
            backgroundColor: '#ffffff',
            videoTargets,
            onProgress: (p: number) => setExportProgress(Math.max(2, Math.min(100, p))),
          })
          const fallback = mp4FallbackMessage(format, result.ext)
          if (fallback) notify(fallback, 'warning')
        }

        downloadVideoBlob(result.blob, `${designName}.${result.ext}`)
```

- [ ] **Step 7: Typecheck**

Run: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 8: Manual verification** (canvas/encoder wiring — no unit test possible in the broken jsdom harness)

1. Start the app: `BROWSER=none PORT=3005 NODE_OPTIONS=--openssl-legacy-provider npx craco start`, open `http://localhost:3005`, open the editor.
2. Add a text element, click **Animate**, pick any entrance preset (e.g. "rise").
3. Open **Export** → a video/GIF section should appear (because an animated object exists). Choose **GIF**, export.
4. Expected: a file `*.gif` downloads (NOT `.webm`); opening it shows the animation looping. Watch the progress bar advance ("Encoding GIF…").
5. Choose **MP4** and export. On a browser without MP4 recording (most Chromium builds), expect a bottom-right toast: "Your browser can’t record MP4 — exported as WebM instead." and a `.webm` file.

- [ ] **Step 9: Commit**

```bash
git add src/utils/animation/exporter.ts src/utils/animation/gifEncoder.ts src/scenes/Editor/components/Navbar/components/ExportModal.tsx package.json package-lock.json
git commit -m "feat(export): real GIF encoding via gifenc; share frame renderer; honest MP4 notice

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: PDF export (`jsPDF`)

The PDF button currently does nothing. Implement a single-page PDF sized to the design, with `jsPDF` dynamically imported.

**Files:**
- Create: `src/utils/pdfExport.ts`
- Create (test): `src/utils/pdfExport.test.ts`
- Modify: `src/scenes/Editor/components/Navbar/components/ExportModal.tsx` (add the `pdf` branch)
- Dependency: `jspdf`

- [ ] **Step 1: Install jsPDF**

Run: `npm install jspdf`
Expected: adds `jspdf` to dependencies. (If it errors on `canvas`, re-run with `--ignore-scripts`.)

- [ ] **Step 2: Write the failing test**

Create `src/utils/pdfExport.test.ts`:
```ts
/** @jest-environment node */
const addImage = jest.fn()
const save = jest.fn()
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({ addImage, save })),
}))

import { exportCanvasToPdf } from './pdfExport'
import { jsPDF } from 'jspdf'

describe('exportCanvasToPdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a landscape page when wider than tall and saves with the filename', async () => {
    await exportCanvasToPdf({ dataUrl: 'data:image/png;base64,AAA', widthPx: 200, heightPx: 100, filename: 'd.pdf' })
    expect(jsPDF).toHaveBeenCalledWith({ orientation: 'landscape', unit: 'px', format: [200, 100] })
    expect(addImage).toHaveBeenCalledWith('data:image/png;base64,AAA', 'PNG', 0, 0, 200, 100)
    expect(save).toHaveBeenCalledWith('d.pdf')
  })

  it('creates a portrait page when taller than wide', async () => {
    await exportCanvasToPdf({ dataUrl: 'data:image/png;base64,BBB', widthPx: 100, heightPx: 200, filename: 'p.pdf' })
    expect(jsPDF).toHaveBeenCalledWith({ orientation: 'portrait', unit: 'px', format: [100, 200] })
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/utils/pdfExport.test.ts --watchAll=false`
Expected: FAIL — cannot find module `./pdfExport`.

- [ ] **Step 4: Implement `exportCanvasToPdf`**

Create `src/utils/pdfExport.ts`:
```ts
/** Export a PNG data URL as a single-page PDF sized exactly to the design.
 *  jsPDF is dynamically imported so it never weighs down the initial bundle. */
export async function exportCanvasToPdf(opts: {
  dataUrl: string
  widthPx: number
  heightPx: number
  filename: string
}): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const orientation = opts.widthPx >= opts.heightPx ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [opts.widthPx, opts.heightPx] })
  pdf.addImage(opts.dataUrl, 'PNG', 0, 0, opts.widthPx, opts.heightPx)
  pdf.save(opts.filename)
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/utils/pdfExport.test.ts --watchAll=false`
Expected: `PASS`, 2 passed.

- [ ] **Step 6: Wire the PDF branch into `ExportModal.tsx`**

Add the import near the other export imports:
```ts
import { exportCanvasToPdf } from '@/utils/pdfExport'
```
In `handleExport`, inside the `else` (static image) branch, find the JSON handler that ends like this (around lines 478–491):
```ts
        if (format === 'json') {
          // ... existing JSON export ...
          return
        }
```
Immediately **after** that closing `}` of the JSON block, insert:
```ts
        if (format === 'pdf') {
          const fabricCanvas = canvas || (editor as any)?.canvas
          const multiplier = parseInt(size, 10) || 1
          const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier })
          const w = (frameSize?.width || fabricCanvas.width || 0) * multiplier
          const h = (frameSize?.height || fabricCanvas.height || 0) * multiplier
          await exportCanvasToPdf({ dataUrl, widthPx: w, heightPx: h, filename: `${designName}.pdf` })
          setTimeout(() => { onClose(); setExportProgress(0) }, 500)
          return
        }
```

- [ ] **Step 7: Typecheck**

Run: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 8: Manual verification**

1. Start the app (`PORT=3005 …`), open the editor, add a couple of elements.
2. Export → choose **PDF** → export.
3. Expected: a `*.pdf` downloads and opens to a single page matching the design (orientation matches aspect ratio). No console error; the modal closes.

- [ ] **Step 9: Commit**

```bash
git add src/utils/pdfExport.ts src/utils/pdfExport.test.ts src/scenes/Editor/components/Navbar/components/ExportModal.tsx package.json package-lock.json
git commit -m "feat(export): real PDF export via jsPDF (dynamic import)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Fix the Toolbox object-type mapping (Adjust/Animate for images)

Dynamically-created `fabric.Image` objects have `.type === 'image'`, which isn't in `toolboxOptions`, so they fall back to `Default` and never show the Adjust/Animate buttons. Add the mapping and pull the pure logic into a testable module.

**Files:**
- Create: `src/scenes/Editor/components/Toolbox/toolboxMap.ts`
- Create (test): `src/scenes/Editor/components/Toolbox/toolboxMap.test.ts`
- Modify: `src/scenes/Editor/components/Toolbox/Toolbox.tsx` (use the new module)

- [ ] **Step 1: Write the failing test**

Create `src/scenes/Editor/components/Toolbox/toolboxMap.test.ts`:
```ts
/** @jest-environment node */
import { resolveToolboxKey, getContextMenuType } from './toolboxMap'

describe('resolveToolboxKey', () => {
  it('maps native fabric image type to the StaticImage toolbox', () => {
    expect(resolveToolboxKey('image')).toBe('StaticImage')
  })
  it('keeps scenify StaticText mapping', () => {
    expect(resolveToolboxKey('StaticText')).toBe('StaticText')
  })
  it('returns MultiElement for an array of types', () => {
    expect(resolveToolboxKey(['StaticText', 'image'])).toBe('MultiElement')
  })
  it('falls back to Default for unknown types instead of undefined', () => {
    expect(resolveToolboxKey('totally-unknown')).toBe('Default')
  })
})

describe('getContextMenuType', () => {
  it('returns Default for Background', () => {
    expect(getContextMenuType({ type: 'Background' })).toBe('Default')
  })
  it('returns the single selected type', () => {
    expect(getContextMenuType({ type: 'image' })).toBe('image')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/scenes/Editor/components/Toolbox/toolboxMap.test.ts --watchAll=false`
Expected: FAIL — cannot find module `./toolboxMap`.

- [ ] **Step 3: Create `toolboxMap.ts`**

Create `src/scenes/Editor/components/Toolbox/toolboxMap.ts` (note the added `image` and `Video` keys):
```ts
export const toolboxOptions: Record<string, string> = {
  Default: 'Default',
  StaticText: 'StaticText',
  DynamicText: 'DynamicText',
  StaticPath: 'StaticPath',
  StaticVector: 'StaticVector',
  StaticImage: 'StaticImage',
  MultiElement: 'MultiElement',
  DynamicImage: 'DynamicImage',
  // fabric.js internal types that map to our toolbox items
  textbox: 'StaticText',
  'i-text': 'StaticText',
  text: 'StaticText',
  image: 'StaticImage',
  Video: 'StaticImage',
}

export const getContextMenuType = (selection: any): string | string[] => {
  const types = new Set<string>()
  if (!selection) {
    return 'Default'
  }
  if (selection._objects) {
    for (const object of selection._objects) {
      types.add(object.type)
    }
  } else {
    types.add(selection.type)
  }

  const typesArray = Array.from(types)

  if (typesArray.length === 1) {
    if (typesArray[0] === 'Background') {
      return 'Default'
    }
    return typesArray[0]
  }
  return typesArray
}

/** Resolve which toolbox item to show for the active selection's type.
 *  Falls back to 'Default' for unknown types (was previously undefined → blank). */
export function resolveToolboxKey(activeObjectType: string | string[]): string {
  if (Array.isArray(activeObjectType)) {
    return toolboxOptions['MultiElement']
  }
  return toolboxOptions[activeObjectType] || toolboxOptions['Default']
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/scenes/Editor/components/Toolbox/toolboxMap.test.ts --watchAll=false`
Expected: `PASS`, all green.

- [ ] **Step 5: Rewire `Toolbox.tsx` to use the module**

In `src/scenes/Editor/components/Toolbox/Toolbox.tsx`:

(a) Add the import after the existing imports:
```ts
import { getContextMenuType, resolveToolboxKey } from './toolboxMap'
```

(b) Delete the in-file `export const getContextMenuType = (selection: any) => { ... }` definition (lines ~19–43) and the in-file `const toolboxOptions = { ... }` definition (lines ~45–58) — they now live in `toolboxMap.ts`.

(c) Replace the type-resolution block inside the `useEffect`:
```ts
      const activeObjectType = getContextMenuType(activeObject)
      if (isArray(activeObjectType)) {
        setActiveToolbox(toolboxOptions['MultiElement'])
      } else {
        setActiveToolbox((toolboxOptions as any)[activeObjectType as any])
      }
```
with:
```ts
      const activeObjectType = getContextMenuType(activeObject)
      setActiveToolbox(resolveToolboxKey(activeObjectType))
```

(d) Remove the now-unused `isArray` import (`import isArray from 'lodash/isArray'`) if nothing else uses it. Verify with: `grep -n "isArray" src/scenes/Editor/components/Toolbox/Toolbox.tsx` — if the only hit was the removed line, delete the import.

- [ ] **Step 6: Typecheck**

Run: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 7: Manual verification**

1. Start the app (`PORT=3005 …`), open the editor.
2. Add an image from **Stock Photos** (Pexels) so a `fabric.Image` lands on the canvas; select it.
3. Expected: the contextual toolbar now shows the **Adjust** and **Animate** buttons (previously only a bare Fill Color button appeared). Click **Adjust** → the Adjustments panel opens with working sliders.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/Editor/components/Toolbox/toolboxMap.ts src/scenes/Editor/components/Toolbox/toolboxMap.test.ts src/scenes/Editor/components/Toolbox/Toolbox.tsx
git commit -m "fix(toolbox): map fabric 'image' type so Adjust/Animate show for images

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Fix the stock-video add hang

`StockVideos.tsx` never awaits `editor.add`, the seek promise can hang forever (no timeout/error), and the `catch` is silent. Add a reusable timeout guard, await the add, and surface failures.

**Files:**
- Create: `src/utils/promiseWithTimeout.ts`
- Create (test): `src/utils/promiseWithTimeout.test.ts`
- Modify: `src/scenes/Editor/components/Panels/PanelItems/StockVideos.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/utils/promiseWithTimeout.test.ts`:
```ts
/** @jest-environment node */
import { promiseWithTimeout } from './promiseWithTimeout'

describe('promiseWithTimeout', () => {
  it('rejects with the message when the inner promise hangs', async () => {
    const neverSettles = new Promise<void>(() => {})
    await expect(promiseWithTimeout(neverSettles, 20, 'too slow')).rejects.toThrow('too slow')
  })

  it('resolves when the inner promise resolves first', async () => {
    await expect(promiseWithTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })

  it('rejects when the inner promise rejects first', async () => {
    await expect(promiseWithTimeout(Promise.reject(new Error('inner')), 1000)).rejects.toThrow('inner')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/utils/promiseWithTimeout.test.ts --watchAll=false`
Expected: FAIL — cannot find module `./promiseWithTimeout`.

- [ ] **Step 3: Implement `promiseWithTimeout`**

Create `src/utils/promiseWithTimeout.ts`:
```ts
/** Wraps a promise so it rejects after `ms` instead of hanging forever.
 *  Guards media-load promises — the scenify image loader has no onerror and
 *  can hang indefinitely on a failed/blocked asset. */
export function promiseWithTimeout<T>(p: Promise<T>, ms: number, message = 'Operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    p.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      err => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/utils/promiseWithTimeout.test.ts --watchAll=false`
Expected: `PASS`, 3 passed.

- [ ] **Step 5: Fix `addVideoToCanvas` in `StockVideos.tsx`**

Add imports near the top of `src/scenes/Editor/components/Panels/PanelItems/StockVideos.tsx`:
```ts
import { promiseWithTimeout } from '@/utils/promiseWithTimeout'
import { notify } from '@/lib/notify'
```

(a) Replace the metadata-load wait:
```ts
            await new Promise<void>((resolve, reject) => {
                videoElement.onloadedmetadata = () => {
                    videoElement.currentTime = 0.1 // Seek to get a frame
                    resolve()
                }
                videoElement.onerror = reject
            })
```
with:
```ts
            await promiseWithTimeout(
                new Promise<void>((resolve, reject) => {
                    videoElement.onloadedmetadata = () => {
                        videoElement.currentTime = 0.1 // Seek to get a frame
                        resolve()
                    }
                    videoElement.onerror = () => reject(new Error('Video failed to load'))
                }),
                15000,
                'Video metadata timed out'
            )
```

(b) Replace the seek wait (which currently has no timeout/error path):
```ts
            // Wait for video to seek to frame
            await new Promise<void>((resolve) => {
                videoElement.onseeked = () => resolve()
            })
```
with:
```ts
            // Wait for video to seek to frame (guarded so a stuck seek can't hang forever)
            await promiseWithTimeout(
                new Promise<void>((resolve, reject) => {
                    videoElement.onseeked = () => resolve()
                    videoElement.onerror = () => reject(new Error('Video failed to seek'))
                }),
                15000,
                'Video seek timed out'
            )
```

(c) Await the canvas add — change:
```ts
            editor.add({
```
to:
```ts
            await editor.add({
```
(This is the `editor.add({ type: 'StaticImage', ... })` call. Leave its object body unchanged.)

(d) Replace the silent catch:
```ts
        } catch (error) {
            // silently handled
        } finally {
```
with:
```ts
        } catch (error) {
            console.error('Failed to add stock video:', error)
            notify('Could not add that video. Please try another clip.', 'negative')
        } finally {
```

- [ ] **Step 6: Typecheck**

Run: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 7: Manual verification**

1. Ensure a Pexels key is set so stock video search returns results (`REACT_APP_*` in `.env`); if missing, the panel shows an "API key missing" state — note that and skip the live add.
2. Start the app (`PORT=3005 …`), open the editor → **Stock Videos** panel.
3. Click a stock video.
4. Expected (success): the spinner clears within a few seconds and the video's poster frame lands on the canvas; it also appears as a clip on the timeline.
5. Expected (failure path): if a clip fails to load, the spinner clears (no infinite spin) and a bottom-right toast says "Could not add that video…". Verify by temporarily throttling network or picking a clip that 404s.

- [ ] **Step 8: Commit**

```bash
git add src/utils/promiseWithTimeout.ts src/utils/promiseWithTimeout.test.ts src/scenes/Editor/components/Panels/PanelItems/StockVideos.tsx
git commit -m "fix(video): stock-video add no longer hangs (await add + timeout guards + toast)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] **Run the full unit-test suite for the new pure modules:**
```bash
CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/lib/notify.test.ts src/utils/animation/exportHelpers.test.ts src/utils/pdfExport.test.ts src/scenes/Editor/components/Toolbox/toolboxMap.test.ts src/utils/promiseWithTimeout.test.ts --watchAll=false
```
Expected: all suites PASS.

- [ ] **Typecheck the whole project:** `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json` → exit 0.

- [ ] **Production build smoke test** (catches lazy-import/webpack issues with gifenc/jspdf):
```bash
CI=false NODE_OPTIONS=--openssl-legacy-provider npx craco build
```
Expected: "Compiled" (warnings OK), `build/` produced.

- [ ] **End-to-end manual walkthrough** on `http://localhost:3005`: add image (Adjust/Animate show) → add stock video (lands or toasts, no hang) → animate an element → Export GIF (real `.gif`), PDF (real `.pdf`), MP4 (toast if unsupported). No infinite spinners; failures show toasts.

## Definition of done (this plan)

- Stock-video add works or shows a toast — never an infinite spinner.
- Image objects show Adjust/Animate; the Adjust panel opens.
- GIF export produces a real animated `.gif`; PDF export produces a real `.pdf`; MP4 tells the user when it falls back to WebM.
- All new pure logic is unit-tested (node-env); DOM/canvas wiring is manually verified.
- Dead code removed; `notify()` layer in place; typecheck + build clean.
