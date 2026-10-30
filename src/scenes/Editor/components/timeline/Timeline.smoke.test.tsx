/**
 * Render smoke test for the docked timeline in jsdom: mounts the real
 * providers with a 3-track project and drives selection, split, delete,
 * undo routing and Space-tap — catching runtime errors the type checker can't.
 */
import React, { Profiler, useEffect } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { VideoProvider } from '@/contexts/VideoContext'
import { useVideoProject, VideoProjectApi } from '@/video/VideoProjectContext'
import { MAIN_TRACK_ID, VideoProject, clipEnd, emptyProject, findClip, makeClip } from '@/video/model'
import VideoTimeline from '../VideoTimeline'
import { SPACE_TAP_EVENT } from './keys'

const mockCanvas = {
  objects: [] as any[],
  on: jest.fn(),
  off: jest.fn(),
  getObjects() {
    return this.objects
  },
  getActiveObject: () => null,
  setActiveObject: jest.fn(),
  requestRenderAll: jest.fn(),
  remove: jest.fn(),
  discardActiveObject: jest.fn(),
}
const mockHistory = { undos: [1], redos: [] as any[], save: jest.fn() }
const mockEditor: any = { handlers: { historyHandler: mockHistory }, undo: jest.fn(), redo: jest.fn(), __stageViewport: true }

jest.mock('@nkyo/scenify-sdk', () => ({
  useEditor: () => mockEditor,
  useEditorContext: () => ({ canvas: mockCanvas }),
}))
jest.mock('baseui/toast', () => ({ toaster: { info: jest.fn(), positive: jest.fn(), negative: jest.fn(), warning: jest.fn() } }))

// jsdom has no PointerEvent: a MouseEvent carrying pointerId is enough here.
class PointerEventPolyfill extends MouseEvent {
  pointerId: number
  constructor(type: string, init: any = {}) {
    super(type, { bubbles: true, cancelable: true, ...init })
    this.pointerId = init.pointerId ?? 1
  }
}
;(window as any).PointerEvent = PointerEventPolyfill

class RO {
  observe() {}
  disconnect() {}
}
;(window as any).ResizeObserver = RO
;(window as any).fetch = () => Promise.reject(new Error('offline'))
;(window as any).CSS = { escape: (s: string) => s }
HTMLCanvasElement.prototype.getContext = (() => null) as any
;(Element.prototype as any).setPointerCapture = () => undefined
;(Element.prototype as any).hasPointerCapture = () => true
;(Element.prototype as any).releasePointerCapture = () => undefined
document.elementFromPoint = () => null

function project(): VideoProject {
  const p = emptyProject()
  return {
    ...p,
    tracks: [{ id: 'ov', kind: 'overlay', name: 'Titles' }, ...p.tracks, { id: 'au', kind: 'audio', name: 'Music' }],
    assets: [
      { id: 'v', kind: 'video', name: 'Beach', duration: 10, src: { kind: 'url', url: 'blob:dead' } },
      { id: 'm', kind: 'audio', name: 'Song', duration: 30, src: { kind: 'url', url: 'blob:dead2' } },
    ],
    clips: [
      makeClip({ id: 'c1', trackId: MAIN_TRACK_ID, assetId: 'v', objectId: 'o1', start: 0, inPoint: 0, outPoint: 4 }),
      makeClip({ id: 'c2', trackId: MAIN_TRACK_ID, assetId: 'v', objectId: 'o2', start: 4, inPoint: 2, outPoint: 8 }),
      makeClip({ id: 't1', trackId: 'ov', objectId: 'title', start: 1, duration: 2 }),
      makeClip({ id: 'mu', trackId: 'au', assetId: 'm', start: 0, inPoint: 0, outPoint: 8 }),
    ],
  }
}

let api: VideoProjectApi
let commits = 0
function Harness() {
  api = useVideoProject()
  const { restore } = api
  useEffect(() => restore(project()), [restore])
  return (
    <Profiler id="timeline" onRender={() => commits++}>
      <VideoTimeline />
    </Profiler>
  )
}

function setup() {
  const utils = render(
    <VideoProvider>
      <Harness />
    </VideoProvider>,
  )
  return utils
}

const clipEl = (c: HTMLElement, id: string) => c.querySelector(`[data-clip-id="${id}"]`) as HTMLElement

describe('VideoTimeline (jsdom smoke)', () => {
  it('renders tracks and clips, selects, splits, deletes with ripple, and routes undo', () => {
    const { container, getByLabelText, queryByLabelText } = setup()
    act(() => undefined)
    expect(container.querySelector('[aria-label="Video timeline"]')).toBeTruthy()
    for (const id of ['c1', 'c2', 't1', 'mu']) expect(clipEl(container, id)).toBeTruthy()
    expect(container.textContent).toContain('MAIN · MAGNETIC')

    // click-select → inspector
    act(() => {
      fireEvent.pointerDown(clipEl(container, 'c2'), { button: 0, pointerId: 1, clientX: 10, clientY: 10 })
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 })
    })
    expect(getByLabelText('Clip properties')).toBeTruthy()

    // keyboard split at the playhead (timeline focused by the pointer-down)
    act(() => api.controller.seek(6))
    act(() => {
      fireEvent.pointerDown(clipEl(container, 'c2'), { button: 0, pointerId: 2 })
      fireEvent.pointerUp(window, { pointerId: 2 })
    })
    act(() => {
      fireEvent.keyDown(window, { key: 's' })
    })
    const parts = api.getProject().clips.filter(c => c.trackId === MAIN_TRACK_ID)
    expect(parts.length).toBe(3)

    // the right-hand part is selected; Delete ripples the main track
    act(() => {
      fireEvent.keyDown(window, { key: 'Delete' })
    })
    const main = api.getProject().clips.filter(c => c.trackId === MAIN_TRACK_ID).sort((a, b) => a.start - b.start)
    expect(main.length).toBe(2)
    expect(main[1].start).toBeCloseTo(clipEnd(main[0]))

    // undo goes to the timeline (last action) through editor.undo
    act(() => {
      mockEditor.undo()
    })
    expect(api.getProject().clips.filter(c => c.trackId === MAIN_TRACK_ID).length).toBe(3)

    // Space tap from the stage toggles playback
    act(() => {
      window.dispatchEvent(new CustomEvent(SPACE_TAP_EVENT))
    })
    expect(api.controller.playing).toBe(true)
    act(() => api.controller.pause())

    // J/K/L shuttle
    act(() => {
      fireEvent.keyDown(window, { key: 'l' })
      fireEvent.keyDown(window, { key: 'l' })
    })
    expect(api.controller.rate).toBe(2)
    act(() => {
      fireEvent.keyDown(window, { key: 'k' })
    })
    expect(api.controller.rate).toBe(0)

    // collapse
    act(() => {
      fireEvent.click(getByLabelText('Collapse timeline'))
    })
    expect(queryByLabelText('Video timeline')).toBeNull()
    expect(getByLabelText('Show timeline')).toBeTruthy()
    expect(findClip(api.getProject(), 't1')).toBeTruthy()
  })

  it('playhead ticks never re-render the timeline (DOM writes only)', async () => {
    const { container } = setup()
    // let media URL resolution (async, re-renders once) settle first
    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })
    const before = commits
    const ctl = api.controller
    // React may render a component once more before bailing out of an identical
    // setState (usePlayback's flags); after that, ticks cost no renders at all.
    for (let i = 1; i <= 60; i++) act(() => ctl.seek(i / 10))
    expect(commits - before).toBeLessThanOrEqual(1)
    const settled = commits
    for (let i = 1; i <= 60; i++) act(() => ctl.seek(i / 7))
    expect(commits).toBe(settled)
    // A scrub gesture flips the `scrubbing` flag once on and once off — never per tick.
    act(() => api.controller.scrub(0.2))
    const afterStart = commits
    for (let i = 2; i <= 60; i++) act(() => ctl.scrub(i / 5))
    expect(commits - afterStart).toBeLessThanOrEqual(1)
    act(() => api.controller.endScrub())
    // 59 scrub ticks + start/end: a handful of renders at most, all from the flag flips
    expect(commits - settled).toBeLessThanOrEqual(4)
    const ph = container.querySelector('.mfa-timeline [aria-hidden][style*="will-change"]') as HTMLElement
    expect(ph.style.transform).toMatch(/translateX\(\d+(\.\d+)?px\)/)
  })

  it('opens the clip menu and detaches audio', () => {
    const { container, getByRole } = setup()
    act(() => undefined)
    act(() => {
      fireEvent.contextMenu(clipEl(container, 'c1'), { clientX: 50, clientY: 50 })
    })
    act(() => {
      fireEvent.click(getByRole('menuitem', { name: 'Detach audio' }))
    })
    const p = api.getProject()
    expect(findClip(p, 'c1')!.muted).toBe(true)
    expect(p.clips.some(c => c.name && c.name.endsWith('(audio)'))).toBe(true)
  })
})
