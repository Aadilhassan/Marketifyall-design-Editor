# Video/Animation — Phase 2 (Shape Styling + Timeline Audio) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give shapes a real styling toolbar (fill / stroke / stroke-width / corner-radius / opacity) and make timeline audio usable (a way to add audio + per-clip volume/mute) — the two functional gaps in spec Phase 2.

**Architecture:** Shapes route through the existing Toolbox registry to a new `Shape` toolbar that reuses the `Color` submenu + `Common` + `Opacity` and adds two new popover-slider controls; props are written via the scenify `editor.update({...})` API (same pattern as `Color.tsx`). Audio reuses the existing `handleAudioUpload`/`addAudioClip`/`updateAudioClip` plumbing in `VideoTimeline.tsx` (sync already works there) — we add the missing add-button and volume/mute UI.

**Tech Stack:** React 17, TS, `@nkyo/scenify-sdk` (Fabric.js 4), BaseUI (`baseui/slider`, `baseui/popover`), CRA4/CRACO, Jest.

**Branch:** create and work on `feat/video-animation-phase-2` (off `main`).

**Scope note:** Spec Phase 2 also listed "extend adjustments to video." Investigation shows video-poster objects are `StaticImage` with `applyFilters`, so Phase 1's `image → StaticImage` toolbox mapping already gives them the Adjust panel — this is a verify step (in Final Verification), not a task. Out of scope (deferred to Phase 3): audio waveforms, extracting audio sync into a standalone `AudioPlayer` (current in-`VideoTimeline` sync works whenever the timeline is mounted, which is whenever audio exists).

---

## Conventions (apply to every task)

**Test env:** the Jest/jsdom harness can't load this repo's native `canvas` (Node ABI). So unit tests start with `/** @jest-environment node */` and use RELATIVE imports. Pure logic gets unit tests; DOM/canvas/UI wiring is checked via the explicit **Manual verification** steps (this matches Phase 0/1).

**Commands:**
- Test: `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test <path> --watchAll=false` (expect `PASS`).
- Typecheck: `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json` (expect exit 0).
- Build (run for UI tasks): `CI=false NODE_OPTIONS=--openssl-legacy-provider npx craco build 2>&1 | tail -8` (expect "Compiled", warnings OK).
- Run app for manual checks: `BROWSER=none PORT=3005 NODE_OPTIONS=--openssl-legacy-provider npx craco start` (port 3000 is taken).

**Editor write pattern** (from `Color.tsx`): to change the selected object, call `editor.update({ <props> })` then `canvas.requestRenderAll()`. `editor`/`canvas`/`activeObject` come from `useEditor()` / `useEditorContext()`.

---

## Task 1: Shape routing + `shapeControlsFor` helper (pure, TDD) + safe Shape toolbar skeleton

Land shape→toolbar routing safely: tested mapping + a minimal `Shape.tsx` that at least shows `Common`, so selecting a shape is an improvement (never a blank/broken toolbar).

**Files:**
- Modify: `src/scenes/Editor/components/Toolbox/toolboxMap.ts`
- Modify (test): `src/scenes/Editor/components/Toolbox/toolboxMap.test.ts`
- Create: `src/scenes/Editor/components/Toolbox/ToolboxItems/Shape.tsx`
- Modify: `src/scenes/Editor/components/Toolbox/ToolboxItems/index.ts`

- [ ] **Step 1: Write the failing tests** — append to `toolboxMap.test.ts`:
```ts
describe('shape routing', () => {
  it('routes fabric shape types to the Shape toolbar', () => {
    for (const t of ['rect', 'circle', 'triangle', 'ellipse', 'line', 'polygon']) {
      expect(resolveToolboxKey(t)).toBe('Shape')
    }
  })
})

describe('shapeControlsFor', () => {
  it('rect gets a corner-radius control', () => {
    expect(shapeControlsFor('rect').cornerRadius).toBe(true)
  })
  it('circle/ellipse/triangle have no corner radius', () => {
    expect(shapeControlsFor('circle').cornerRadius).toBe(false)
    expect(shapeControlsFor('ellipse').cornerRadius).toBe(false)
  })
  it('lines have no fill but do have stroke', () => {
    expect(shapeControlsFor('line').fill).toBe(false)
    expect(shapeControlsFor('line').stroke).toBe(true)
  })
  it('all shapes expose stroke width', () => {
    expect(shapeControlsFor('triangle').strokeWidth).toBe(true)
  })
})
```
Update the import at the top of the test to also pull `shapeControlsFor`:
```ts
import { resolveToolboxKey, getContextMenuType, shapeControlsFor } from './toolboxMap'
```

- [ ] **Step 2: Run, expect FAIL** — `CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test src/scenes/Editor/components/Toolbox/toolboxMap.test.ts --watchAll=false` → fails (`shapeControlsFor` undefined / mappings missing).

- [ ] **Step 3: Implement in `toolboxMap.ts`** — add the shape keys to `toolboxOptions` (alongside the existing entries):
```ts
  rect: 'Shape',
  circle: 'Shape',
  triangle: 'Shape',
  ellipse: 'Shape',
  line: 'Shape',
  polygon: 'Shape',
  polyline: 'Shape',
```
and add the exported helper:
```ts
export interface ShapeControls {
  fill: boolean
  stroke: boolean
  strokeWidth: boolean
  cornerRadius: boolean
}

/** Which styling controls apply to a given fabric shape type. */
export function shapeControlsFor(type: string): ShapeControls {
  const isLine = type === 'line' || type === 'polyline'
  return {
    fill: !isLine, // lines have no fill area
    stroke: true,
    strokeWidth: true,
    cornerRadius: type === 'rect', // only meaningful for rectangles
  }
}
```

- [ ] **Step 4: Run, expect PASS** — same test command → all green (existing + new).

- [ ] **Step 5: Create a minimal `Shape.tsx`** so the new `'Shape'` key resolves to a real component. Read `src/scenes/Editor/components/Toolbox/ToolboxItems/Image.tsx` and `.../Default.tsx` first to match imports/layout. Minimal version:
```tsx
import Common from './components/Common'

function Shape() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} />
      <Common />
    </div>
  )
}

export default Shape
```

- [ ] **Step 6: Register it** in `src/scenes/Editor/components/Toolbox/ToolboxItems/index.ts` — add `import Shape from './Shape'` and a `static Shape = Shape` entry (match the file's existing static-class style; read it first).

- [ ] **Step 7: Typecheck** — `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json` → exit 0.

- [ ] **Step 8: Commit**
```bash
git add src/scenes/Editor/components/Toolbox/toolboxMap.ts src/scenes/Editor/components/Toolbox/toolboxMap.test.ts src/scenes/Editor/components/Toolbox/ToolboxItems/Shape.tsx src/scenes/Editor/components/Toolbox/ToolboxItems/index.ts
git commit -m "feat(toolbox): route shapes to a Shape toolbar + shapeControlsFor helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Stroke-width + corner-radius controls; full Shape toolbar

Build the two new popover-slider controls and flesh out `Shape.tsx` into a real styling toolbar.

**Files:**
- Create: `src/scenes/Editor/components/Toolbox/ToolboxItems/components/StrokeWidth.tsx`
- Create: `src/scenes/Editor/components/Toolbox/ToolboxItems/components/CornerRadius.tsx`
- Modify: `src/scenes/Editor/components/Toolbox/ToolboxItems/Shape.tsx`

- [ ] **Step 1: Read the reference components** — `src/scenes/Editor/components/Toolbox/ToolboxItems/components/Opacity.tsx` (the popover + `baseui/slider` pattern + how it reads/writes via `editor.update`), `Color.tsx` (fill/stroke read/write), and `Image.tsx` (button-row layout). The two new controls mirror `Opacity.tsx` exactly except for the property and range.

- [ ] **Step 2: Create `StrokeWidth.tsx`** — a popover trigger button + a `baseui/slider` (range **0–30**, step 1) that reads the active object's `strokeWidth` and on change calls:
```ts
editor.update({ strokeWidth: value, strokeUniform: true })
canvas.requestRenderAll()
```
(`strokeUniform: true` keeps stroke from scaling with the object.) Mirror Opacity.tsx's structure for state init from `activeObject.strokeWidth ?? 0`, the popover, and overrides.

- [ ] **Step 3: Create `CornerRadius.tsx`** — same popover+slider pattern, range **0–100**, step 1, reading `activeObject.rx ?? 0`, on change:
```ts
editor.update({ rx: value, ry: value })
canvas.requestRenderAll()
```
If `editor.update` does not visibly apply `rx`/`ry` for a rect (verify in Step 6), fall back to:
```ts
const obj = canvas.getActiveObject()
if (obj) { obj.set({ rx: value, ry: value }); obj.dirty = true; canvas.requestRenderAll() }
```

- [ ] **Step 4: Flesh out `Shape.tsx`** — using `shapeControlsFor(activeObject.type)` from `toolboxMap` to decide which controls to render. Layout mirrors `Image.tsx`:
  - Left group:
    - **Fill color** button → `setActiveSubMenu(SubMenuType.COLOR)` (reuse), shown only when `controls.fill`.
    - **Stroke color** button → also opens the `COLOR` submenu (Color.tsx already updates stroke). Shown when `controls.stroke`.
    - `<StrokeWidth />` when `controls.strokeWidth`.
    - `<CornerRadius />` when `controls.cornerRadius` (rect only).
  - Right group: `<Common />` (opacity, lock, duplicate, delete — reuse as-is).
  Get `activeObject` from `useEditorContext()`; get `setActiveSubMenu` from `useAppContext()` (see how `Image.tsx` does both).

- [ ] **Step 5: Typecheck** — `NODE_OPTIONS=--openssl-legacy-provider npx tsc --noEmit -p tsconfig.json` → exit 0. Then **build**: `CI=false NODE_OPTIONS=--openssl-legacy-provider npx craco build 2>&1 | tail -8` → "Compiled".

- [ ] **Step 6: Manual verification** (run app on `:3005`):
  1. Add a rectangle from Elements; select it → the Shape toolbar shows Fill, Stroke, Stroke-width, Corner-radius, and the Common cluster.
  2. Change fill and stroke colors → canvas updates live.
  3. Drag stroke-width → border thickens; drag corner-radius → rectangle corners round.
  4. Select a **circle** → corner-radius control is hidden; select a **line** → fill is hidden, stroke shows.
  5. Opacity (in Common) still works.

- [ ] **Step 7: Commit**
```bash
git add src/scenes/Editor/components/Toolbox/ToolboxItems/components/StrokeWidth.tsx src/scenes/Editor/components/Toolbox/ToolboxItems/components/CornerRadius.tsx src/scenes/Editor/components/Toolbox/ToolboxItems/Shape.tsx
git commit -m "feat(toolbox): shape styling — stroke width, corner radius, fill/stroke for shapes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Audio — add-audio UI

`handleAudioUpload`, the hidden `<input ref={audioInputRef} accept="audio/*">`, and `addAudioClip` all already exist in `VideoTimeline.tsx`; there is just no control that triggers the upload. Add one.

**Files:**
- Modify: `src/scenes/Editor/components/VideoTimeline.tsx`

- [ ] **Step 1: Read the relevant `VideoTimeline.tsx` regions** — the timeline header / Tracks label area (~line 2640), the `+`-button menu logic that currently excludes audio (~line 2725: `track.type !== 'audio'`), `handleAudioUpload` (~2069–2091), and the hidden input (~2647–2652).

- [ ] **Step 2: Add an "Add audio" affordance.** Cleanest: a small **"+ Audio"** (music-note icon) button in the timeline header that calls `audioInputRef.current?.click()`. (Alternatively, stop excluding audio from the track `+` menu and add an "Upload audio" item that does the same.) Use an existing `Icons.*` music/audio glyph if present; otherwise a `lucide-react` music icon (the project already depends on `lucide-react`). Keep styling consistent with the existing header buttons.

- [ ] **Step 3: Surface load failures** — in `handleAudioUpload`, add an `audio.onerror = () => notify('Could not load that audio file.', 'negative')` (import `notify` from `@/lib/notify`) so a bad file fails loudly instead of silently.

- [ ] **Step 4: Typecheck + build** — `tsc` exit 0; `craco build` → "Compiled".

- [ ] **Step 5: Manual verification** (`:3005`): click the new Add-audio button → file picker → choose an audio file → an audio clip appears on the timeline; pressing Play plays the audio in sync; a bad/empty file shows a toast.

- [ ] **Step 6: Commit**
```bash
git add src/scenes/Editor/components/VideoTimeline.tsx
git commit -m "feat(timeline): add-audio button (wires existing upload handler) + load-error toast

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Audio — per-clip volume + mute UI

The `AudioClip.volume` field and `updateAudioClip(id, {volume})` exist, and the in-timeline sync already applies `clip.volume` each frame — but there is no UI to change it.

**Files:**
- Modify: `src/scenes/Editor/components/VideoTimeline.tsx`

- [ ] **Step 1: Read** the audio-clip rendering (~2864–2870) and the clip context-menu (~1787–1812, currently Delete-only), plus how `updateAudioClip` is obtained from `useVideoContext()`.

- [ ] **Step 2: Add a mute toggle** to the audio clip's context menu: a "Mute"/"Unmute" item that calls `updateAudioClip(clip.id, { volume: clip.volume === 0 ? 1 : 0 })`. (Read the existing context-menu item markup and match it.)

- [ ] **Step 3: Add a volume control.** Add a small speaker icon on audio clips that opens a `baseui/popover` containing a `baseui/slider` (0–100, mapping to volume 0–1) bound to `updateAudioClip(clip.id, { volume: v/100 })`. Mirror the popover+slider pattern from `ToolboxItems/components/Opacity.tsx`. Keep it compact so it fits the clip lane. (If inline space is too tight, place the speaker icon in the clip's hover controls next to the existing handles.)

- [ ] **Step 4: Confirm live application** — verify the existing audio sync reads `clip.volume` every frame (the grounding found it does around VideoTimeline ~1108–1109). If it only reads volume on clip change, also set `audioEl.volume = clip.volume` in the per-frame sync so changes apply immediately during playback. (Read that sync block before editing.)

- [ ] **Step 5: Typecheck + build** — `tsc` exit 0; `craco build` → "Compiled".

- [ ] **Step 6: Manual verification** (`:3005`): add audio, play it, drag the volume slider → loudness changes live; toggle Mute → silence; Unmute → restores. Volume persists while scrubbing.

- [ ] **Step 7: Commit**
```bash
git add src/scenes/Editor/components/VideoTimeline.tsx
git commit -m "feat(timeline): per-clip audio volume slider + mute toggle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final Verification (after all tasks)

- [ ] **Unit suite** (now includes the extended toolbox tests):
```bash
CI=true NODE_OPTIONS=--openssl-legacy-provider npx craco test \
  src/lib/notify.test.ts src/utils/animation/exportHelpers.test.ts src/utils/pdfExport.test.ts \
  src/scenes/Editor/components/Toolbox/toolboxMap.test.ts src/utils/promiseWithTimeout.test.ts \
  --watchAll=false
```
Expect all suites PASS.
- [ ] **Typecheck** exit 0; **production build** "Compiled".
- [ ] **Manual end-to-end** (`:3005`): shape styling (fill/stroke/width/radius/opacity, type-appropriate controls) + audio (add → play → volume → mute). Also confirm spec 2.3: select a **video poster** on canvas → the **Adjust** panel is available (inherited from Phase 1) and its sliders affect it.
- [ ] No silent failures (audio load errors toast; shape edits apply live).

## Definition of done (Phase 2)

- Selecting a shape shows a full styling toolbar (fill, stroke, stroke width, opacity, and corner radius for rects), applied live; type-inappropriate controls are hidden.
- Users can add audio from the timeline, and it plays in sync with working per-clip volume + mute.
- New pure logic (`shapeControlsFor`, shape routing) is unit-tested; UI is manually verified.
- Typecheck clean, production build succeeds, no regressions to existing toolbars/timeline.
