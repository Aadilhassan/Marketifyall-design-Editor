import {
  boundaryTime,
  clampPps,
  fitPps,
  followScroll,
  formatTimecode,
  frameStep,
  insertOrder,
  magneticInsertIndex,
  MAX_PPS,
  MIN_PPS,
  ppsToSlider,
  pxToTime,
  quantizedRange,
  resolveSnap,
  rulerTicks,
  scrollForZoom,
  sliderToPps,
  timeToPx,
  visibleRange,
} from './math'
import { decideSpaceRelease, nextShuttleRate, resolveTimelineKey, SPACE_TAP_MS } from './keys'
import { UndoJournal, installUndoBridge } from './undoJournal'
import { canPlace, propsCommand, deleteCommand, detachAudioCommand, duplicateCommand, moveCommand, splitCommand, trimCommand } from './actions'
import { Asset, Command, MAIN_TRACK_ID, VideoProject, applyCommand, clipEnd, emptyProject, findClip, makeClip } from '@/video/model'
import { evaluateTimeline } from '@/video/evaluate'

// ---------------------------------------------------------------------------
// math
// ---------------------------------------------------------------------------

describe('time ↔ px', () => {
  it('round-trips at any zoom', () => {
    for (const pps of [MIN_PPS, 37, 60, MAX_PPS]) {
      expect(pxToTime(timeToPx(12.34, pps), pps)).toBeCloseTo(12.34, 9)
    }
    expect(pxToTime(100, 0)).toBe(0)
  })

  it('zoom slider is logarithmic and clamped', () => {
    expect(sliderToPps(0)).toBeCloseTo(MIN_PPS)
    expect(sliderToPps(1)).toBeCloseTo(MAX_PPS)
    expect(ppsToSlider(sliderToPps(0.37))).toBeCloseTo(0.37)
    expect(clampPps(1e9)).toBe(MAX_PPS)
    expect(clampPps(NaN)).toBeGreaterThanOrEqual(MIN_PPS)
  })

  it('fit shows the whole duration', () => {
    const pps = fitPps(30, 1048, 48)
    expect(30 * pps).toBeCloseTo(1000)
  })

  it('zooming keeps the time under the cursor in place', () => {
    const s = scrollForZoom(500, 200, 50, 100)
    // time under cursor before: (500+200)/50 = 14 s → after: 14*100 - 200
    expect(s).toBe(1200)
    expect(pxToTime(s + 200, 100)).toBeCloseTo(14)
  })
})

describe('ruler', () => {
  it('labels land at least minLabelPx apart and subdivide', () => {
    const r = rulerTicks(60, 0, 10, 72)
    expect(r.major * 60).toBeGreaterThanOrEqual(72)
    expect(r.major).toBe(2)
    expect(r.ticks[0]).toEqual({ t: 0, major: true })
    expect(r.ticks.filter(t => t.major).map(t => t.t)).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('zoomed far in uses sub-second steps; only the visible window is generated', () => {
    const r = rulerTicks(480, 100, 101)
    expect(r.major).toBeLessThan(1)
    expect(r.ticks[0].t).toBeGreaterThanOrEqual(99.9)
    expect(r.ticks.length).toBeLessThan(200)
  })

  it('formats timecode', () => {
    expect(formatTimecode(3.12)).toBe('00:03.12')
    expect(formatTimecode(15)).toBe('00:15.00')
    expect(formatTimecode(61.999)).toBe('01:02.00')
    expect(formatTimecode(-1)).toBe('00:00.00')
  })
})

describe('snapping', () => {
  const targets = [0, 5, 10]
  it('snaps the closest edge within the pixel threshold', () => {
    // 60 px/s: 8 px ≈ 0.133 s
    const r = resolveSnap({ edges: [5.1, 7.1], targets, pps: 60, enabled: true })
    expect(r.at).toBe(5)
    expect(r.delta).toBeCloseTo(-0.1)
    expect(resolveSnap({ edges: [4.7, 6.7], targets, pps: 60, enabled: true })).toEqual({ delta: 0, at: null })
  })
  it('end edge can win', () => {
    const r = resolveSnap({ edges: [2.5, 9.95], targets, pps: 60, enabled: true })
    expect(r.at).toBe(10)
    expect(r.delta).toBeCloseTo(0.05)
  })
  it('Alt bypasses and the toggle disables', () => {
    expect(resolveSnap({ edges: [5.01], targets, pps: 60, enabled: true, bypass: true })).toEqual({ delta: 0, at: null })
    expect(resolveSnap({ edges: [5.01], targets, pps: 60, enabled: false })).toEqual({ delta: 0, at: null })
  })
  it('threshold scales with zoom', () => {
    expect(resolveSnap({ edges: [5.5], targets, pps: 10, enabled: true }).at).toBe(5)
    expect(resolveSnap({ edges: [5.5], targets, pps: 400, enabled: true }).at).toBeNull()
  })
})

describe('magnetic insert', () => {
  const others = [
    { id: 'a', start: 0, end: 4 },
    { id: 'b', start: 4, end: 10 },
    { id: 'c', start: 10, end: 12 },
  ]
  it('inserts before the first clip whose midpoint is right of the pointer', () => {
    expect(magneticInsertIndex(others, 0.5)).toBe(0)
    expect(magneticInsertIndex(others, 2.1)).toBe(1)
    expect(magneticInsertIndex(others, 6.9)).toBe(1)
    expect(magneticInsertIndex(others, 7.1)).toBe(2)
    expect(magneticInsertIndex(others, 99)).toBe(3)
    expect(magneticInsertIndex([], 3)).toBe(0)
  })
  it('builds the order and the boundary line', () => {
    expect(insertOrder(['a', 'b', 'c'], 'x', 1)).toEqual(['a', 'x', 'b', 'c'])
    expect(insertOrder(['a', 'b', 'c'], 'a', 3)).toEqual(['b', 'c', 'a'])
    expect(boundaryTime(others, 0)).toBe(0)
    expect(boundaryTime(others, 2)).toBe(10)
    expect(boundaryTime(others, 3)).toBe(12)
  })
})

describe('virtualization & follow', () => {
  it('visible range includes overscan; quantized range is stable for small scrolls', () => {
    expect(visibleRange(600, 1000, 100, 200)).toEqual([4, 18])
    expect(quantizedRange(600, 1000, 100)).toEqual(quantizedRange(610, 1000, 100))
  })
  it('frame steps on the frame grid', () => {
    expect(frameStep(1, 1, 30)).toBeCloseTo(1 + 1 / 30)
    expect(frameStep(1.01, -1, 30)).toBeCloseTo(29 / 30)
    expect(frameStep(0, -5, 30)).toBe(0)
  })
  it('page-flips when the playhead leaves the view', () => {
    expect(followScroll(500, 0, 1000)).toBeNull()
    expect(followScroll(990, 0, 1000)).toBe(890)
    expect(followScroll(100, 400, 1000)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// keys
// ---------------------------------------------------------------------------

describe('J/K/L', () => {
  it('L plays then doubles to 4×, J mirrors, K stops', () => {
    let r = 0
    r = nextShuttleRate(r, 'l')
    expect(r).toBe(1)
    r = nextShuttleRate(r, 'l')
    expect(r).toBe(2)
    r = nextShuttleRate(r, 'l')
    expect(r).toBe(4)
    r = nextShuttleRate(r, 'l')
    expect(r).toBe(4)
    r = nextShuttleRate(r, 'j')
    expect(r).toBe(-1)
    r = nextShuttleRate(r, 'j')
    expect(r).toBe(-2)
    r = nextShuttleRate(r, 'l')
    expect(r).toBe(1)
    expect(nextShuttleRate(4, 'k')).toBe(0)
  })
})

describe('key map', () => {
  const ctx = { timelineFocused: true, hasTimeline: true, typing: false, stageOwnsSpace: true }
  it('editing keys only when the timeline is focused', () => {
    expect(resolveTimelineKey({ key: 's' }, ctx)).toEqual({ type: 'split' })
    expect(resolveTimelineKey({ key: 's' }, { ...ctx, timelineFocused: false })).toBeNull()
    expect(resolveTimelineKey({ key: 'Delete', shiftKey: true }, ctx)).toEqual({ type: 'delete', ripple: true })
    expect(resolveTimelineKey({ key: 'Backspace' }, { ...ctx, timelineFocused: false })).toBeNull()
    expect(resolveTimelineKey({ key: 'D', ctrlKey: true }, ctx)).toEqual({ type: 'duplicate' })
    expect(resolveTimelineKey({ key: 'z', ctrlKey: true }, ctx)).toBeNull()
  })
  it('transport keys work editor-wide but never while typing', () => {
    const outside = { ...ctx, timelineFocused: false }
    expect(resolveTimelineKey({ key: 'L' }, outside)).toEqual({ type: 'shuttle', key: 'l' })
    expect(resolveTimelineKey({ key: 'Home' }, outside)).toEqual({ type: 'home' })
    expect(resolveTimelineKey({ key: 'l' }, { ...ctx, typing: true })).toBeNull()
    expect(resolveTimelineKey({ key: 'l' }, { ...ctx, hasTimeline: false })).toBeNull()
  })
  it('arrows step frames / seconds; Alt+arrows walk clips', () => {
    expect(resolveTimelineKey({ key: 'ArrowRight' }, ctx)).toEqual({ type: 'step', frames: 1 })
    expect(resolveTimelineKey({ key: 'ArrowLeft', shiftKey: true }, ctx)).toEqual({ type: 'stepSeconds', seconds: -1 })
    expect(resolveTimelineKey({ key: 'ArrowLeft', altKey: true }, ctx)).toEqual({ type: 'focusClip', dir: -1 })
  })
  it('Space belongs to the stage when it is installed, else to a focused timeline', () => {
    expect(resolveTimelineKey({ key: ' ' }, ctx)).toBeNull()
    expect(resolveTimelineKey({ key: ' ' }, { ...ctx, stageOwnsSpace: false })).toEqual({ type: 'togglePlay' })
    expect(resolveTimelineKey({ key: '+' }, ctx)).toEqual({ type: 'zoom', dir: 1 })
    expect(resolveTimelineKey({ key: '-' }, ctx)).toEqual({ type: 'zoom', dir: -1 })
  })
})

describe('Space tap vs drag', () => {
  it('short press without a pan is a tap', () => {
    expect(decideSpaceRelease({ heldMs: 120, panned: false })).toBe('tap')
    expect(decideSpaceRelease({ heldMs: SPACE_TAP_MS, panned: false })).toBe('tap')
  })
  it('any pan, or a long hold, never toggles playback', () => {
    expect(decideSpaceRelease({ heldMs: 80, panned: true })).toBe('none')
    expect(decideSpaceRelease({ heldMs: SPACE_TAP_MS + 1, panned: false })).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// undo journal
// ---------------------------------------------------------------------------

describe('undo journal', () => {
  const both = { canvas: true, timeline: true }
  it('undoes the most recent side first and redoes in reverse', () => {
    const j = new UndoJournal()
    j.record('canvas')
    j.record('timeline')
    expect(j.pickUndo(both)).toBe('timeline')
    j.didUndo('timeline')
    expect(j.pickUndo(both)).toBe('canvas')
    j.didUndo('canvas')
    expect(j.pickRedo(both)).toBe('canvas')
    j.didRedo('canvas')
    expect(j.pickRedo(both)).toBe('timeline')
    j.record('canvas')
    expect(j.pickRedo(both)).toBeNull()
  })
  it('falls back to whichever side can act', () => {
    const j = new UndoJournal()
    j.record('timeline')
    expect(j.pickUndo({ canvas: true, timeline: false })).toBe('canvas')
    expect(new UndoJournal().pickUndo({ canvas: false, timeline: true })).toBe('timeline')
    expect(new UndoJournal().pickUndo({ canvas: false, timeline: false })).toBeNull()
  })

  it('bridge routes editor.undo/redo and records canvas saves', () => {
    const calls: string[] = []
    const hh: any = { undos: [1], redos: [] as number[], save: (type: string) => hh.undos.push(type) }
    const editor: any = {
      handlers: { historyHandler: hh },
      undo: () => {
        calls.push('canvas-undo')
        hh.undos.pop()
        hh.redos.push(1)
      },
      redo: () => calls.push('canvas-redo'),
    }
    let listener: (e: any) => void = () => undefined
    let tlUndo = 0
    const timeline = () => ({
      undo: () => {
        calls.push('timeline-undo')
        tlUndo--
      },
      redo: () => calls.push('timeline-redo'),
      getHistory: () => ({ canUndo: tlUndo > 0, canRedo: false }),
      subscribeHistory: (fn: any) => {
        listener = fn
        return () => undefined
      },
    })
    const off = installUndoBridge(editor, timeline)
    hh.save('object:modified') // canvas edit
    tlUndo++
    listener('do') // timeline edit
    editor.undo()
    editor.undo()
    expect(calls).toEqual(['timeline-undo', 'canvas-undo'])
    off()
    expect(editor.__undoBridge).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------

const asset = (id: string, duration: number, kind: Asset['kind'] = 'video'): Asset => ({ id, kind, name: id, duration, src: { kind: 'url', url: id } })

function base(): VideoProject {
  return {
    ...emptyProject(),
    tracks: [{ id: 'ov', kind: 'overlay', name: 'Elements' }, ...emptyProject().tracks, { id: 'au', kind: 'audio', name: 'Audio' }],
    assets: [asset('v4', 4), asset('v10', 10), asset('m', 60, 'audio')],
    clips: [
      makeClip({ id: 'a', trackId: MAIN_TRACK_ID, assetId: 'v4', objectId: 'oa', start: 0, inPoint: 0, outPoint: 4 }),
      makeClip({ id: 'b', trackId: MAIN_TRACK_ID, assetId: 'v10', objectId: 'ob', start: 4, inPoint: 0, outPoint: 10 }),
      makeClip({ id: 'c', trackId: MAIN_TRACK_ID, assetId: 'v4', objectId: 'oc', start: 14, inPoint: 0, outPoint: 4 }),
      makeClip({ id: 't1', trackId: 'ov', objectId: 'title', start: 1, duration: 2 }),
      makeClip({ id: 't2', trackId: 'ov', objectId: 'sub', start: 5, duration: 2 }),
      makeClip({ id: 'mu', trackId: 'au', assetId: 'm', start: 0, inPoint: 0, outPoint: 20 }),
    ],
  }
}
const apply = (p: VideoProject, c: Command | null) => (c ? applyCommand(p, c).project : p)
const starts = (p: VideoProject, ids: string[]) => ids.map(id => findClip(p, id)?.start)

describe('ripple delete', () => {
  it('main track always closes the gap', () => {
    const p = apply(base(), deleteCommand(base(), ['b'], false))
    expect(findClip(p, 'b')).toBeUndefined()
    expect(starts(p, ['a', 'c'])).toEqual([0, 4])
  })
  it('free tracks: plain delete leaves the gap, Shift+Delete ripples later clips left', () => {
    expect(starts(apply(base(), deleteCommand(base(), ['t1'], false)), ['t2'])).toEqual([5])
    expect(starts(apply(base(), deleteCommand(base(), ['t1'], true)), ['t2'])).toEqual([3])
  })
  it('several clips on one free track ripple from their original positions', () => {
    const p0 = { ...base(), clips: [...base().clips, makeClip({ id: 't3', trackId: 'ov', objectId: 'x', start: 9, duration: 1 })] }
    const p = apply(p0, deleteCommand(p0, ['t1', 't2'], true))
    expect(starts(p, ['t3'])).toEqual([5])
  })
  it('locked tracks are untouched', () => {
    const p0 = { ...base(), tracks: base().tracks.map(t => (t.id === 'ov' ? { ...t, locked: true } : t)) }
    expect(deleteCommand(p0, ['t1'], true)).toBeNull()
  })
})

describe('split / duplicate / trim / move', () => {
  it('splits selected clips (or everything under the playhead)', () => {
    const r = splitCommand(base(), ['b'], 6, () => 'b2')!
    const p = apply(base(), r.command)
    expect(r.rightIds).toEqual(['b2'])
    expect(clipEnd(findClip(p, 'b')!)).toBe(6)
    expect(findClip(p, 'b2')!.start).toBe(6)
    let n = 0
    const all = splitCommand(base(), [], 1.5, () => `n${n++}`)!
    expect(all.rightIds.length).toBe(3) // a, t1, mu
    expect(splitCommand(base(), ['a'], 9)).toBeNull()
  })

  it('duplicate on the main track inserts right after and pushes followers', () => {
    const r = duplicateCommand(base(), ['a'], () => 'a2')!
    const p = apply(base(), r.command)
    expect(starts(p, ['a', 'a2', 'b', 'c'])).toEqual([0, 4, 8, 18])
  })

  it('main-track trims stay packed; trims stop at the source end', () => {
    const p = apply(base(), trimCommand(base(), 'b', 'end', 6))
    expect(starts(p, ['c'])).toEqual([6])
    const longer = apply(base(), trimCommand(base(), 'a', 'end', 99))
    expect(clipEnd(findClip(longer, 'a')!)).toBe(4)
    const head = apply(base(), trimCommand(base(), 'b', 'start', 7))
    expect(findClip(head, 'b')!.inPoint).toBe(3)
    expect(starts(head, ['a', 'b', 'c'])).toEqual([0, 4, 11])

    // dragging the head left reveals earlier media and pushes followers right
    const back = apply(head, trimCommand(head, 'b', 'start', 2))
    expect(findClip(back, 'b')!.inPoint).toBe(1)
    expect(starts(back, ['a', 'b', 'c'])).toEqual([0, 4, 13])
    // never before the source start
    const clamped = apply(head, trimCommand(head, 'b', 'start', -50))
    expect(findClip(clamped, 'b')!.inPoint).toBe(0)
    expect(starts(clamped, ['c'])).toEqual([14])
  })

  it('magnetic reorder by insert index', () => {
    const p = apply(base(), moveCommand(base(), { primaryId: 'c', ids: ['c'], delta: -14, targetTrackId: MAIN_TRACK_ID, insertIndex: 0 }))
    expect(starts(p, ['c', 'a', 'b'])).toEqual([0, 4, 8])
  })

  it('moving a clip off the main track closes the gap; kinds respect tracks', () => {
    const p = apply(base(), moveCommand(base(), { primaryId: 'b', ids: ['b'], delta: 0, targetTrackId: 'ov' }))
    expect(findClip(p, 'b')!.trackId).toBe('ov')
    expect(starts(p, ['c'])).toEqual([4])
    // audio can't go to the overlay track → stays on its own track
    const q = apply(base(), moveCommand(base(), { primaryId: 'mu', ids: ['mu'], delta: 2, targetTrackId: 'ov' }))
    expect(findClip(q, 'mu')!.trackId).toBe('au')
    expect(findClip(q, 'mu')!.start).toBe(2)
    expect(canPlace(base(), findClip(base(), 't1')!, base().tracks[1])).toBe(false)
  })

  it('multi-select moves free clips together', () => {
    const p = apply(base(), moveCommand(base(), { primaryId: 't1', ids: ['t1', 't2'], delta: 1, targetTrackId: 'ov' }))
    expect(starts(p, ['t1', 't2'])).toEqual([2, 6])
  })
})

describe('clip properties', () => {
  it('speeding up a main-track clip closes the gap it leaves', () => {
    const p = apply(base(), propsCommand(base(), 'b', { speed: 2 }))
    expect(starts(p, ['a', 'b', 'c'])).toEqual([0, 4, 9])
    // free tracks keep positions
    const q = apply(base(), propsCommand(base(), 'mu', { speed: 2 }))
    expect(clipEnd(findClip(q, 'mu')!)).toBe(10)
  })
})

describe('detach audio', () => {
  it('adds a muted video + an audio clip with the same timing that plays', () => {
    const r = detachAudioCommand(base(), 'b', { clipId: 'b-audio', trackId: 'au2' })!
    const p = apply(base(), r.command)
    expect(findClip(p, 'b')!.muted).toBe(true)
    const a = findClip(p, 'b-audio')!
    expect(a.start).toBe(4)
    expect(a.trackId).toBe('au2') // 'au' is busy at 4..14 with the music
    expect(p.assets.find(x => x.id === a.assetId)!.kind).toBe('audio')
    const f = evaluateTimeline(p, 5, [{ id: 'ob' }])
    expect(f.activeAudio.find(x => x.clipId === 'b')!.gain).toBe(0)
    expect(f.activeAudio.find(x => x.clipId === 'b-audio')!.gain).toBe(1)
    expect(detachAudioCommand(p, 'b')).toBeNull()
  })
})

describe('undo journal groups', () => {
  const both = { canvas: true, timeline: true }
  it('records a grouped action as one entry, undone newest-first and redone in order', () => {
    const j = new UndoJournal()
    j.record('canvas')
    j.group(() => {
      j.record('timeline')
      j.record('canvas')
    })
    const e = j.pickUndo(both)
    expect(e).toEqual(['timeline', 'canvas'])
    j.didUndo(e!)
    expect(j.pickUndo(both)).toBe('canvas')
    expect(j.pickRedo(both)).toEqual(['timeline', 'canvas'])
  })
  it('a group with a single step is a plain entry; an empty group records nothing', () => {
    const j = new UndoJournal()
    j.group(() => j.record('timeline'))
    expect(j.pickUndo(both)).toBe('timeline')
    const k = new UndoJournal()
    k.group(() => undefined)
    expect(k.pickRedo(both)).toBeNull()
    expect(k.snapshot.done).toEqual([])
  })
  it('bridge: one editor.undo reverts both sides of a grouped action', () => {
    const calls: string[] = []
    const hh: any = { undos: [1], redos: [] as number[], save: (type: string) => hh.undos.push(type) }
    const editor: any = { handlers: { historyHandler: hh }, undo: () => { calls.push('canvas-undo'); hh.undos.pop(); hh.redos.push(1) }, redo: () => calls.push('canvas-redo') }
    let listener: (e: any) => void = () => undefined
    let tl = 0
    const timeline = () => ({
      undo: () => { calls.push('timeline-undo'); tl-- },
      redo: () => calls.push('timeline-redo'),
      getHistory: () => ({ canUndo: tl > 0, canRedo: false }),
      subscribeHistory: (fn: any) => { listener = fn; return () => undefined },
    })
    installUndoBridge(editor, timeline)
    editor.__undoBridge.group(() => {
      tl++
      listener('do')
      hh.save('object:removed')
    })
    editor.undo()
    expect(calls).toEqual(['canvas-undo', 'timeline-undo'])
  })
})
