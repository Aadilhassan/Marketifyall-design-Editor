import {
  Asset,
  Command,
  MAIN_TRACK_ID,
  MIN_CLIP,
  VideoProject,
  applyCommand,
  clipAt,
  clipDuration,
  clipEnd,
  emptyProject,
  findClip,
  fromLegacy,
  makeClip,
  mediaTimeAt,
  normalize,
  parseProject,
  projectDuration,
  snap,
  snapTargets,
  split,
  trim,
  withElementClips,
} from './model'

const asset = (id: string, duration: number, kind: Asset['kind'] = 'video'): Asset => ({
  id,
  kind,
  name: id,
  duration,
  src: { kind: 'url', url: `https://x/${id}.mp4` },
})

function withTracks(): VideoProject {
  const p = emptyProject()
  return {
    ...p,
    tracks: [
      { id: 'ov', kind: 'overlay', name: 'Overlay' },
      ...p.tracks,
      { id: 'au', kind: 'audio', name: 'Audio' },
    ],
    assets: [asset('a10', 10), asset('a4', 4), asset('m30', 30, 'audio')],
  }
}

function run(p: VideoProject, ...cmds: Command[]): VideoProject {
  return cmds.reduce((acc, c) => applyCommand(acc, c).project, p)
}

const v = (id: string, start: number, assetId = 'a10', extra: any = {}) =>
  makeClip({ id, trackId: MAIN_TRACK_ID, assetId, objectId: `obj-${id}`, start, inPoint: 0, outPoint: assetId === 'a4' ? 4 : 10, ...extra })

describe('clip math', () => {
  it('duration and media time honour speed and inPoint', () => {
    const c = makeClip({ id: 'c', trackId: 't', start: 2, inPoint: 3, outPoint: 9, speed: 2 })
    expect(clipDuration(c)).toBe(3)
    expect(clipEnd(c)).toBe(5)
    expect(mediaTimeAt(c, 2)).toBe(3)
    expect(mediaTimeAt(c, 3.5)).toBe(6)
    expect(mediaTimeAt(c, 100)).toBe(9) // clamped to outPoint
    expect(mediaTimeAt(c, 0)).toBe(3) // clamped to inPoint
  })

  it('clipAt is start-inclusive, end-exclusive', () => {
    const p = run(withTracks(), { type: 'addClip', clip: v('a', 0) }, { type: 'addClip', clip: v('b', 10) })
    expect(clipAt(p, MAIN_TRACK_ID, 0)?.id).toBe('a')
    expect(clipAt(p, MAIN_TRACK_ID, 9.999)?.id).toBe('a')
    expect(clipAt(p, MAIN_TRACK_ID, 10)?.id).toBe('b')
    expect(clipAt(p, MAIN_TRACK_ID, 20)).toBeUndefined()
    expect(projectDuration(p)).toBe(20)
  })
})

describe('split', () => {
  it('splits into two adjacent clips sharing the object', () => {
    const c = v('a', 2, 'a10', { fadeIn: 1, fadeOut: 1, transitionIn: { type: 'crossfade', duration: 0.5 } })
    const parts = split(c, 5, 'b')!
    expect(parts).not.toBeNull()
    const [l, r] = parts
    expect(l.outPoint).toBe(3)
    expect(r.inPoint).toBe(3)
    expect(r.start).toBe(5)
    expect(clipEnd(l)).toBe(r.start)
    expect(r.objectId).toBe(l.objectId)
    expect(l.fadeOut).toBe(0)
    expect(r.fadeIn).toBe(0)
    expect(l.transitionIn).toBeDefined()
    expect(r.transitionIn).toBeUndefined()
  })

  it('splits respect speed', () => {
    const c = makeClip({ id: 'a', trackId: 't', start: 0, inPoint: 0, outPoint: 10, speed: 2 })
    const [l, r] = split(c, 2, 'b')!
    expect(l.outPoint).toBe(4)
    expect(r.inPoint).toBe(4)
  })

  it('refuses cuts at or within a frame of the edges', () => {
    const c = v('a', 0)
    expect(split(c, 0, 'b')).toBeNull()
    expect(split(c, MIN_CLIP / 2, 'b')).toBeNull()
    expect(split(c, 10, 'b')).toBeNull()
    expect(split(c, 10 - MIN_CLIP / 2, 'b')).toBeNull()
    expect(split(c, 11, 'b')).toBeNull()
  })
})

describe('trim bounds', () => {
  it('end trim never passes the source length', () => {
    const c = v('a', 0, 'a10', { outPoint: 6 })
    expect(trim(c, 'end', 50, 10).outPoint).toBe(10)
    expect(trim(c, 'end', 8, 10).outPoint).toBe(8)
  })

  it('start trim never reveals before the source start', () => {
    const c = v('a', 5, 'a10', { inPoint: 2, outPoint: 10 })
    const t = trim(c, 'start', 0, 10)
    expect(t.inPoint).toBe(0)
    expect(t.start).toBe(3) // end stays at 13
    expect(clipEnd(t)).toBe(clipEnd(c))
  })

  it('never shorter than one frame', () => {
    const c = v('a', 0)
    expect(clipDuration(trim(c, 'end', -5, 10))).toBeCloseTo(MIN_CLIP)
    expect(clipDuration(trim(c, 'start', 50, 10))).toBeCloseTo(MIN_CLIP)
  })

  it('element clips stretch freely', () => {
    const e = makeClip({ id: 'e', trackId: 'ov', objectId: 'text', start: 2, duration: 3 })
    expect(clipDuration(trim(e, 'end', 40))).toBe(38)
    const s = trim(e, 'start', 0)
    expect(s.start).toBe(0)
    expect(clipEnd(s)).toBe(5)
  })

  it('trim command uses the asset duration', () => {
    const p = run(withTracks(), { type: 'addClip', clip: v('a', 0, 'a4') })
    const out = run(p, { type: 'trimClip', clipId: 'a', edge: 'end', time: 60 })
    expect(clipEnd(findClip(out, 'a')!)).toBe(4)
  })
})

describe('overlap rules', () => {
  it('main track is magnetic: inserting inside a clip pushes the rest right', () => {
    let p = run(withTracks(), { type: 'addClip', clip: v('a', 0) }, { type: 'addClip', clip: v('b', 10) })
    // drop c (4s) at t=2 → snaps to a's start (nearer edge), a and b move right
    p = run(p, { type: 'addClip', clip: v('c', 2, 'a4') })
    expect(findClip(p, 'c')!.start).toBe(0)
    expect(findClip(p, 'a')!.start).toBe(4)
    expect(findClip(p, 'b')!.start).toBe(14)
    // drop d at 12 → nearer edge is a's end (14)
    p = run(p, { type: 'addClip', clip: v('d', 12, 'a4') })
    expect(findClip(p, 'd')!.start).toBe(14)
    expect(findClip(p, 'b')!.start).toBe(18)
  })

  it('main track keeps gaps that nothing collides with', () => {
    const p = run(withTracks(), { type: 'addClip', clip: v('a', 0) }, { type: 'addClip', clip: v('b', 15) })
    expect(findClip(p, 'b')!.start).toBe(15)
  })

  it('lengthening a main-track clip ripples followers; ripple delete closes the gap', () => {
    let p = run(withTracks(), { type: 'addClip', clip: v('a', 0, 'a10', { outPoint: 5 }) }, { type: 'addClip', clip: v('b', 5) })
    p = run(p, { type: 'trimClip', clipId: 'a', edge: 'end', time: 8 })
    expect(findClip(p, 'b')!.start).toBe(8)
    p = run(p, { type: 'removeClip', clipId: 'a', ripple: true })
    expect(findClip(p, 'b')!.start).toBe(0)
  })

  it('speed change on the main track pushes the next clip', () => {
    let p = run(withTracks(), { type: 'addClip', clip: v('a', 0) }, { type: 'addClip', clip: v('b', 10) })
    p = run(p, { type: 'setClipProps', clipId: 'a', patch: { speed: 0.5 } })
    expect(clipEnd(findClip(p, 'a')!)).toBe(20)
    expect(findClip(p, 'b')!.start).toBe(20)
  })

  it('overlay/audio tracks never overlap: a colliding move lands in the nearest gap', () => {
    const e = (id: string, start: number, duration: number) => makeClip({ id, trackId: 'ov', objectId: id, start, duration })
    let p = run(withTracks(), { type: 'addClip', clip: e('x', 0, 4) }, { type: 'addClip', clip: e('y', 10, 4) })
    p = run(p, { type: 'moveClip', clipId: 'y', start: 3 })
    expect(findClip(p, 'y')!.start).toBe(4) // after x, nearest to 3
    p = run(p, { type: 'moveClip', clipId: 'y', start: 20 })
    expect(findClip(p, 'y')!.start).toBe(20)
    // Trim can't run into a neighbour on a free track.
    p = run(p, { type: 'trimClip', clipId: 'x', edge: 'end', time: 30 })
    expect(clipEnd(findClip(p, 'x')!)).toBe(20)
  })

  it('duplicate goes right after the source clip', () => {
    let p = run(withTracks(), { type: 'addClip', clip: v('a', 0) }, { type: 'addClip', clip: v('b', 10) })
    p = run(p, { type: 'duplicateClip', clipId: 'a', newId: 'a2' })
    expect(findClip(p, 'a2')!.start).toBe(10)
    expect(findClip(p, 'b')!.start).toBe(20)
  })
})

describe('undo inverse', () => {
  const cases: Array<[string, Command]> = [
    ['addClip', { type: 'addClip', clip: v('n', 3, 'a4') }],
    ['removeClip ripple', { type: 'removeClip', clipId: 'a', ripple: true }],
    ['moveClip', { type: 'moveClip', clipId: 'b', start: 0 }],
    ['trimClip', { type: 'trimClip', clipId: 'a', edge: 'end', time: 3 }],
    ['splitClip', { type: 'splitClip', clipId: 'a', time: 4, newId: 'a-r' }],
    ['duplicateClip', { type: 'duplicateClip', clipId: 'b', newId: 'b2' }],
    ['setClipProps', { type: 'setClipProps', clipId: 'a', patch: { speed: 2, fadeIn: 1, transitionIn: { type: 'dip', duration: 1 } } }],
    ['addTrack', { type: 'addTrack', track: { id: 'au2', kind: 'audio', name: 'A2' }, index: 0 }],
    ['removeTrack', { type: 'removeTrack', trackId: 'au' }],
    ['updateTrack', { type: 'updateTrack', trackId: 'au', patch: { muted: true } }],
    ['removeAsset', { type: 'removeAsset', assetId: 'm30' }],
    ['batch', { type: 'batch', commands: [{ type: 'removeClip', clipId: 'a' }, { type: 'addTrack', track: { id: 'o2', kind: 'overlay', name: 'O2' } }] }],
  ]
  const seed = () =>
    run(
      withTracks(),
      { type: 'addClip', clip: v('a', 0) },
      { type: 'addClip', clip: v('b', 10, 'a4') },
      { type: 'addClip', clip: makeClip({ id: 'm', trackId: 'au', assetId: 'm30', start: 1, duration: 12 }) },
    )

  it.each(cases)('%s round-trips through its inverse (and redo)', (_name, cmd) => {
    const before = seed()
    const { project: after, inverse } = applyCommand(before, cmd)
    expect(normalize(after)).not.toEqual(normalize(before))
    const { project: undone, inverse: redo } = applyCommand(after, inverse)
    expect(normalize(undone)).toEqual(normalize(before))
    expect(undone.tracks.map(t => t.id)).toEqual(before.tracks.map(t => t.id))
    expect(normalize(applyCommand(undone, redo).project)).toEqual(normalize(after))
  })
})

describe('snapping', () => {
  it('collects 0, playhead and clip edges', () => {
    const p = run(withTracks(), { type: 'addClip', clip: v('a', 0) }, { type: 'addClip', clip: v('b', 10, 'a4') })
    expect(snapTargets(p, { playhead: 7.5 })).toEqual([0, 7.5, 10, 14])
    expect(snapTargets(p, { exclude: 'b' })).toEqual([0, 10])
    expect(snap(9.9, [0, 10], 0.2)).toBe(10)
    expect(snap(9.5, [0, 10], 0.2)).toBe(9.5)
  })
})

describe('legacy migration', () => {
  it('maps clips, audio and element windows', () => {
    const p = fromLegacy(
      [
        { id: 'v1', name: 'Clip', src: 'https://x/a.mp4', duration: 30, start: 0, end: 30, poster: 'data:p', canvasObjectId: 'obj1' },
        { id: 'v2', src: 'blob:http://x/dead', duration: 5, start: 30 },
      ],
      [
        { id: 'm1', name: 'Song', src: 'https://x/s.mp3', duration: 20, start: 0, volume: 0.5 },
        { id: 'm2', src: 'https://x/t.mp3', duration: 10, start: 5 },
      ],
      [
        { id: 't1', metadata: { timelineStart: 2, timelineDuration: 3 } },
        { id: 't2', metadata: { timelineStart: 0 } }, // no window → stays untimed
        { id: 'obj1', metadata: { isVideo: true, timelineStart: 0, timelineDuration: 9 } },
      ],
    )
    expect(p.version).toBe(1)
    const v1 = findClip(p, 'v1')!
    expect(v1).toMatchObject({ trackId: MAIN_TRACK_ID, objectId: 'obj1', start: 0, inPoint: 0, outPoint: 30, speed: 1 })
    expect(findClip(p, 'v2')!.objectId).toBe('v2')
    const a1 = p.assets.find(a => a.id === v1.assetId)!
    expect(a1).toMatchObject({ kind: 'video', duration: 30, needsProbe: true, poster: 'data:p', src: { kind: 'url', url: 'https://x/a.mp4' } })
    // Overlapping audio lands on two tracks.
    const m1 = findClip(p, 'm1')!
    const m2 = findClip(p, 'm2')!
    expect(m1.volume).toBe(0.5)
    expect(m1.trackId).not.toBe(m2.trackId)
    expect(p.tracks.filter(t => t.kind === 'audio')).toHaveLength(2)
    const t1 = p.clips.find(c => c.objectId === 't1')!
    expect(t1).toMatchObject({ start: 2, inPoint: 0, outPoint: 3 })
    expect(p.tracks.find(t => t.id === t1.trackId)!.kind).toBe('overlay')
    expect(p.clips.some(c => c.objectId === 't2')).toBe(false)
    expect(p.clips.filter(c => c.objectId === 'obj1')).toHaveLength(1)
  })

  it('withElementClips only adds objects that have no clip yet', () => {
    const p = fromLegacy([], [], [{ id: 't1', metadata: { timelineDuration: 3 } }])
    const again = withElementClips(p, [{ id: 't1', metadata: { timelineDuration: 8 } }, { id: 't3', metadata: { timelineDuration: 2, timelineStart: 1 } }])
    expect(again.clips.filter(c => c.objectId === 't1')).toHaveLength(1)
    expect(again.clips.find(c => c.objectId === 't3')).toMatchObject({ start: 1, outPoint: 2 })
  })

  it('parseProject round-trips and rejects junk', () => {
    const p = fromLegacy([{ id: 'v1', src: 'u', duration: 3, start: 0 }])
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p)
    expect(parseProject(null)).toBeNull()
    expect(parseProject({ version: 2, clips: [] })).toBeNull()
  })
})

describe('placeElement', () => {
  it('puts an element clip at its exact time on a free overlay track, adding one if needed', () => {
    const e = (id: string, start: number, duration: number) => makeClip({ id, trackId: '', objectId: id, start, duration })
    let p = applyCommand(emptyProject(), { type: 'placeElement', clip: e('a', 0, 5) }).project
    expect(p.tracks[0].kind).toBe('overlay')
    p = applyCommand(p, { type: 'placeElement', clip: e('b', 2, 5) }).project
    expect(p.tracks.filter(t => t.kind === 'overlay')).toHaveLength(2)
    expect(findClip(p, 'b')!.start).toBe(2)
    // re-timing a clip keeps its id and lands on a track with room
    p = applyCommand(p, { type: 'placeElement', clip: { ...findClip(p, 'b')!, start: 6 }, preferTrackId: findClip(p, 'a')!.trackId }).project
    expect(findClip(p, 'b')!.trackId).toBe(findClip(p, 'a')!.trackId)
    expect(p.clips.filter(c => c.id === 'b')).toHaveLength(1)
  })
})

describe('phase 4 additions', () => {
  it('arrangeTrack packs the listed order end to end from 0 and drops the first transition', () => {
    const p0 = run(
      withTracks(),
      { type: 'addClip', clip: v('a', 0, 'a4') },
      { type: 'addClip', clip: v('b', 6, 'a4', { transitionIn: { type: 'crossfade', duration: 1 } }) },
      { type: 'addClip', clip: v('c', 12, 'a4') },
    )
    const p = run(p0, { type: 'arrangeTrack', trackId: MAIN_TRACK_ID, order: ['b', 'a', 'c'] })
    expect(findClip(p, 'b')!.start).toBe(0)
    expect(findClip(p, 'b')!.transitionIn).toBeUndefined()
    expect(findClip(p, 'a')!.start).toBe(4)
    expect(findClip(p, 'c')!.start).toBe(8)
    // omitted order = current order by start; gaps close
    const packed = run(p0, { type: 'arrangeTrack', trackId: MAIN_TRACK_ID })
    expect(['a', 'b', 'c'].map(id => findClip(packed, id)!.start)).toEqual([0, 4, 8])
    expect(findClip(packed, 'b')!.transitionIn).toEqual({ type: 'crossfade', duration: 1 })
  })

  it('arrangeTrack moves listed clips onto the track and is undoable', () => {
    const p0 = run(withTracks(), { type: 'addClip', clip: v('a', 0, 'a4') }, { type: 'addClip', clip: { ...v('pip', 1, 'a4'), trackId: 'ov' } })
    const { project, inverse } = applyCommand(p0, { type: 'arrangeTrack', trackId: MAIN_TRACK_ID, order: ['pip', 'a'] })
    expect(findClip(project, 'pip')!.trackId).toBe(MAIN_TRACK_ID)
    expect(findClip(project, 'a')!.start).toBe(4)
    expect(normalize(applyCommand(project, inverse).project)).toEqual(normalize(p0))
  })

  it('markers: add/remove, snap targets, undo, persistence', () => {
    const p0 = withTracks()
    const { project, inverse } = applyCommand(p0, { type: 'addMarker', marker: { id: 'm1', time: 3.5, label: 'Beat' } })
    expect(project.markers).toEqual([{ id: 'm1', time: 3.5, label: 'Beat' }])
    expect(snapTargets(project)).toContain(3.5)
    const back = applyCommand(project, inverse).project
    expect(back.markers).toBeUndefined()
    expect(normalize(back)).toEqual(normalize(p0))
    expect(parseProject(JSON.parse(JSON.stringify(project)))!.markers).toEqual([{ id: 'm1', time: 3.5, label: 'Beat' }])
    expect(run(project, { type: 'removeMarker', markerId: 'm1' }).markers).toBeUndefined()
  })

  it('snapTargets can exclude several clips', () => {
    const p = run(withTracks(), { type: 'addClip', clip: v('a', 0, 'a4') }, { type: 'addClip', clip: v('b', 4, 'a4') })
    expect(snapTargets(p, { exclude: ['a', 'b'] })).toEqual([0])
  })

  it('clip mute is a prop that survives parse and clears with false', () => {
    const p = run(withTracks(), { type: 'addClip', clip: v('a', 0) }, { type: 'setClipProps', clipId: 'a', patch: { muted: true } })
    expect(findClip(p, 'a')!.muted).toBe(true)
    expect(findClip(parseProject(JSON.parse(JSON.stringify(p)))!, 'a')!.muted).toBe(true)
    expect('muted' in findClip(run(p, { type: 'setClipProps', clipId: 'a', patch: { muted: false } }), 'a')!).toBe(false)
  })
})
