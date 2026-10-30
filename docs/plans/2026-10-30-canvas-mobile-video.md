# Plan — stable canvas, mobile editor, real video editor

Date: 2026-10-30 · Status: all phases implemented (2026-10-30) — see Results

## Why (what we measured)

**Canvas "resizes weirdly"**
- Opening the video timeline adds `paddingBottom: 300px` to the canvas area (`Editor.tsx:1084`, also `EmbedEditor.tsx:294`). The SDK's ResizeObserver re-centres, then `zoomToFit()` runs again at 300 ms and 600 ms (`Editor.tsx:428-433`) → **three visible jumps**; zoom fell 0.705 → 0.385 (page shrinks to half) in our test.
- The timeline shows for animation-only designs without the padding → it **covers** the canvas. Its `bottom` flips between 20px/0 depending on the active panel → it moves when you switch panels.
- Window resizes don't refit; at 1280×800 with the timeline the canvas is only **297 px** tall.
- Overlays (video DOM layers) only re-position on wheel/mouse-up, not on container resize → misplaced after any resize.

**Mobile** — no responsive layout at all: at 390 px wide the page renders 1183 px wide and the canvas gets **0 px**.

**Video editor**
- Preview ≠ export. Videos are DOM `<video>` overlays on top of the canvas (`VideoCanvasPlayer`), text is duplicated as DOM, and **four effects fight over `obj.opacity`** every frame with synchronous `renderAll()` → ghosting/flicker in preview.
- **Export flicker, ranked causes** (`utils/animation/exporter.ts`):
  1. Real-time MediaRecorder; videos are seeked on drift **without waiting for `seeked`**, so frames are drawn while the video has no frame → poster/blank frames.
  2. When a clip window is longer than the media, the ended video is `play()`-ed from 0 and seeked back every frame → first/last frame strobing (stock/template durations are wrong; the resize handle has no cap).
  3. Videos are always painted **above everything**, so text/logos over a video blink in and out with (1).
  4. Poster is cover-cropped, the video is stretched → framing jumps between frames.
  5. `captureStream` + overloaded main thread (new canvas allocated every frame) → dropped/duplicated frames, variable frame rate.
  6. GIF uses a palette per frame → colour shimmer.
- **Export is also wrong, not just flickery**: export never advances timeline time, so clips 2..n come out **blank**, text timing is ignored, **music/voice clips are not exported**, only the current page renders, MP4 silently falls back to WebM.
- Clip model has no in/out points, speed, fades or tracks; no split, snapping, undo; play always restarts from 0; uploaded videos are `blob:` URLs → **lost on reload**; uploaded videos can't be selected on the canvas.
- The server renderer (`video-processor/`) is not connected to editor export (localhost only, drops video audio, same layering bug).

## Principles

1. **One renderer.** What you see while scrubbing/playing is exactly what export writes: videos are drawn *inside* the fabric scene in their layer order; no DOM overlays.
2. **One clock, one writer.** A pure `evaluateTimeline(project, t)` decides each element's visibility/opacity/transform at time `t`; a single applier writes it. Preview runs it on a media clock; export runs it frame by frame.
3. **Frame-accurate export.** Render frame *n* at *t = n/fps*, wait until every video is decoded at that time, encode. Never real-time capture.
4. **Layout never fights zoom.** The canvas lives in a fixed grid cell; panels/timeline change the cell size once, and the view keeps the user's zoom (or "Fit") without extra jumps.

## Phase 1 — Stable canvas (≈2–3 days)

- Editor shell becomes a CSS grid: `topbar / rail | drawer | stage / timeline dock / pages`. The timeline is a **docked, resizable** row (drag handle, remembered height, collapse to a 40 px bar) — never an overlay, never `paddingBottom`.
- `useStageViewport`: one debounced (rAF) ResizeObserver on the stage. View modes: **Fit** (default, refits on resize) and **Manual** (user zoomed → keep zoom, keep the page centre stable). Remove the 300/600 ms re-fit timers and the drawer-toggle refit; refit only in Fit mode.
- Zoom control: Fit / 50 / 100 / 200 / custom, Ctrl+wheel and pinch zoom around the cursor, Space-drag / middle-drag pan, "Zoom to selection".
- Every overlay (rulers, comment pins, guides, eraser overlay) repositions from one `viewport:changed` event fired on resize, zoom and pan.
- Acceptance: toggling drawer/timeline/panels produces ≤1 view change and none in Manual mode; page never covered; 1280×800 with timeline ≥ 420 px stage height (timeline default 220 px, resizable).

## Phase 2 — Mobile & tablet (≈4–5 days)

- Breakpoints: **phone < 768**, **tablet 768–1199**, desktop ≥ 1200.
- Phone layout: compact top bar (back · title · undo/redo · Download); full-bleed stage; **bottom tab bar** (Design, Elements, Text, Uploads, Photos, More); panels open as **bottom sheets** (snap 45% / 92%, drag to dismiss); the contextual toolbar becomes a horizontally scrollable strip above the tabs while something is selected; sub-panels (Effects, Position…) open as sheets too.
- Touch: pinch-zoom + two-finger pan on the stage, larger handles (`touchCornerSize`), long-press = context menu, no hover-only actions (page actions, swatch ×, layer buttons get visible tap targets ≥ 44 px), safe-area insets, `100dvh`.
- Tablet: icon rail + drawer as an overlay sheet (doesn't squeeze the stage).
- Video on phone: single combined track strip with trim handles and split; full timeline on tablet+.
- Acceptance: every panel usable at 390×844 and 768×1024 in portrait/landscape; no horizontal page scroll; Lighthouse mobile a11y ≥ 90 on the editor route.

## Phase 3 — Video engine (≈5–7 days)

- **Project model** (`video/model.ts`): `tracks[]` (video, overlay, text, audio), `clips{ id, trackId, assetId, start, inPoint, outPoint, speed, volume, fadeIn, fadeOut, transitionIn }`, assets with true duration probed from the media (never trust API durations). Migration from today's `clips/audioClips` + `metadata.timelineStart/Duration`.
- **Video in the scene**: each video clip is a fabric image whose source is its `<video>` element (`objectCaching:false`), keeping the clip's crop (`cropX/Y`) so poster and frames match. Layer order = canvas order → overlays stay on top correctly.
- **Media clock**: a single `PlaybackController` (rAF + `requestVideoFrameCallback`) drives time; play resumes from the playhead; scrubbing pauses media and seeks with `seeked` awaited; audio through one `AudioContext` graph (per-clip gain for volume/fades).
- Delete `VideoCanvasPlayer` overlays, the dead master `<video>`, the duplicate opacity writers and `_originalOpacity` bookkeeping.
- **Assets persist**: uploaded video/audio are stored in IndexedDB (`mfa-media`) and referenced by asset id instead of `blob:` URLs; object URLs are recreated on load. Missing media (other device) shows a relink placeholder.
- Timeline edits go through one undoable command stack (shared with canvas undo where possible).

## Phase 4 — Timeline UX, Clipchamp-style (≈5–7 days)

- Docked timeline: media library → drag onto timeline or "+" to append; magnetic main track (no gaps unless you add one), free overlay tracks above, audio tracks below.
- Clips: filmstrip thumbnails, audio waveforms, trim handles that stop at the source length, **split at playhead (S)**, duplicate, delete / ripple delete, detach audio, speed (0.25–4×), volume + fade in/out handles, transitions between adjacent clips (crossfade, dip to black, slide, wipe, zoom).
- Snapping to playhead, clip edges, markers; zoom (Ctrl+wheel, slider, fit timeline); playhead follow; keyboard: Space, J/K/L, ←/→ frame step, Shift+←/→ 1 s, Home/End, S, Delete, Ctrl+Z/Y, +/−.
- Text & elements: drag their timing bars like clips; "Show for whole video" toggle; animation presets on in/out.
- Aspect presets for video (16:9, 9:16, 1:1, 4:5) using Magic Resize.
- Acceptance: build a 3-clip 9:16 video with music, titles and transitions using only the mouse or only the keyboard; preview at 30 fps without dropped frames on a mid laptop (720p, 3 tracks).

## Phase 5 — Export that doesn't flicker (≈4–5 days)

- **Engine**: frame-by-frame render with the same `evaluateTimeline` + scene renderer into an offscreen canvas, `VideoFrame` → **WebCodecs `VideoEncoder` (H.264/AVC)**, audio mixed offline (`OfflineAudioContext`) → `AudioEncoder` (AAC), muxed to real **MP4** (new dependency: `mp4-muxer`, MIT, ~20 KB) or WebM where MP4 isn't supported. Seeks await `seeked`/`requestVideoFrameCallback` before each frame → no blank frames by construction. Runs faster than real time where the device allows; the editor view is never touched (renders off-screen).
- Fallback for browsers without WebCodecs: same deterministic frame loop feeding MediaRecorder at a fixed rate (slower, still correct).
- **Export dialog**: format (MP4, WebM, GIF, MP3 audio only), resolution (480p / 720p / 1080p / 4K where supported), frame rate (24/30/60), quality (Standard / High / Max bitrate), range (whole video / selection), estimated size & time, progress with preview thumbnail, cancel, "keep editing while exporting".
- GIF: global palette + light dithering, frame-accurate, size estimate.
- Optional later: server render through `video-processor` for very long/4K exports (needs deployment + auth).
- Acceptance: automated test renders a fixture (2 videos + overlay text + music, transitions) and checks every frame has the expected pixels at clip boundaries (no blank/poster frames), duration within 1 frame, audio present; manual check on Chrome, Edge, Safari 17+, Firefox 130+.

## Order & checkpoints

**Recommended 1 → 3 → 5 → 4 → 2**, with a demo after each phase: it fixes the canvas first, then makes export correct as early as possible, then polishes the timeline. Phase 2 (mobile) can run in parallel with 3–5 once Phase 1's grid shell lands, since it mostly touches layout and panels.

## Decisions (2026-10-30)

1. **Export engine**: in the browser — WebCodecs + `mp4-muxer`; server rendering out of scope for now.
2. **Media storage**: browser only — uploaded video/audio stored in IndexedDB (`mfa-media`), referenced by asset id; designs opened on another device show a "media missing — relink" placeholder.
3. **Scope**: all phases, order 1 → 3 → 5 → 4, with 2 (mobile) in parallel after 1.

## Results (2026-10-30)

Verified in headless Chrome against the running app, plus 413 unit tests (36 suites), typecheck, lint (0 errors) and a production build.

- **Phase 1** — timeline docked (no overlay / no paddingBottom); one `useStageViewport` owner (fit vs manual mode); zoom around cursor, wheel/Space/middle-drag pan with clamp; re-centre after every fit. Opening a video: zoom 0.705→0.522 in one step (was →0.385 in three jumps).
- **Phase 2** — phone (bottom tabs, bottom sheets, swipe toolbar, pinch/pan, long-press menu), tablet (overlay drawer, compact navbar). No horizontal overflow at 390×844 / 768×1024.
- **Phase 3** — `src/video/*` engine: videos drawn inside the fabric scene, single clock/applier, IndexedDB media, undoable model.
- **Phase 4** — new timeline (`components/timeline/*`): magnetic main track, filmstrips, waveforms, split/trim/snap, transitions, speed/volume/fades, J/K/L & shortcuts, drag-in media, phone strip.
- **Phase 5** — frame-by-frame export (`src/video/export/*`): WebCodecs H.264 + mp4-muxer, offline audio mix, GIF with global palette, MediaRecorder fallback.
  - Fixed during QA: videos were discarded as "broken" right after creation (`isBrokenMedia` treated the initial NETWORK_NO_SOURCE state as an error → poster frozen for the whole export); exports waited on `requestVideoFrameCallback` for off-screen videos, which never fires (~2 s/frame).
  - Test export (stock clip + text overlay + 5 s 440 Hz tone, 720p30): 220/220 frames, 7.33 s, motion matches the source, overlay in every frame, 0 blank/flash frames, audio 440 Hz for 0–5 s then silent, 37 s to export in headless software encoding.

### Known limits
- Video export covers the current page only.
- Without an AAC encoder (e.g. this headless Chrome, Firefox) MP4 audio is Opus — plays in browsers/VLC, not all players.
- Remote media without CORS can't be read for export/filmstrips/waveforms (stays on its still image, with a warning).
- Uploaded media lives in this browser (IndexedDB); other devices see "relink".
