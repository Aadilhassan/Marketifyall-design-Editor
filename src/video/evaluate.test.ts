import { evaluateTimeline, objectWindow } from './evaluate'
import { MAIN_TRACK_ID, VideoProject, emptyProject, makeClip } from './model'

const project = (): VideoProject => ({
  ...emptyProject(),
  tracks: [
    { id: 'ov', kind: 'overlay', name: 'Overlay' },
    { id: MAIN_TRACK_ID, kind: 'video', name: 'Video' },
    { id: 'au', kind: 'audio', name: 'Audio' },
  ],
  assets: [
    { id: 'va', kind: 'video', name: 'A', duration: 20, src: { kind: 'url', url: 'a' } },
    { id: 'vb', kind: 'video', name: 'B', duration: 20, src: { kind: 'url', url: 'b' } },
    { id: 'm', kind: 'audio', name: 'M', duration: 60, src: { kind: 'url', url: 'm' } },
  ],
})

const objs = (...ids: string[]) => ids.map(id => ({ id }))

describe('evaluateTimeline', () => {
  it('untimed objects are always visible; timed ones only inside their clip', () => {
    const p = { ...project(), clips: [makeClip({ id: 't', trackId: 'ov', objectId: 'title', start: 2, duration: 3 })] }
    const at = (t: number) => evaluateTimeline(p, t, objs('bg', 'title')).objects
    expect(at(0).bg).toEqual({ visible: true, opacity: 1 })
    expect(at(1).title.visible).toBe(false)
    expect(at(2).title.visible).toBe(true)
    expect(at(4.99).title.visible).toBe(true)
    // the last frame of the project stays visible when parked at the end
    expect(at(5).title.visible).toBe(true)
    expect(at(6).title.visible).toBe(false)
  })

  it('media time follows inPoint and speed', () => {
    const p = {
      ...project(),
      clips: [makeClip({ id: 'c', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'A', start: 4, inPoint: 2, outPoint: 10, speed: 2 })],
    }
    const s = evaluateTimeline(p, 5, objs('A')).objects.A
    expect(s.mediaTime).toBe(4)
    expect(s.rate).toBe(2)
    const audio = evaluateTimeline(p, 5, objs('A')).activeAudio
    expect(audio).toEqual([{ clipId: 'c', assetId: 'va', objectId: 'A', mediaTime: 4, gain: 1, rate: 2 }])
  })

  it('fades scale opacity and gain linearly', () => {
    const p = {
      ...project(),
      clips: [makeClip({ id: 'c', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'A', start: 0, inPoint: 0, outPoint: 10, fadeIn: 2, fadeOut: 4, volume: 0.5 })],
    }
    const at = (t: number) => evaluateTimeline(p, t, objs('A'))
    expect(at(1).objects.A.opacity).toBeCloseTo(0.5)
    expect(at(1).activeAudio[0].gain).toBeCloseTo(0.25)
    expect(at(5).objects.A.opacity).toBe(1)
    expect(at(9).objects.A.opacity).toBeCloseTo(0.25)
    expect(at(0).objects.A.visible).toBe(false) // fully faded = invisible
  })

  it('crossfade: incoming clip above fades in over the held outgoing clip', () => {
    const p = {
      ...project(),
      clips: [
        makeClip({ id: 'a', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'A', start: 0, inPoint: 0, outPoint: 5 }),
        makeClip({ id: 'b', trackId: MAIN_TRACK_ID, assetId: 'vb', objectId: 'B', start: 5, inPoint: 0, outPoint: 5, transitionIn: { type: 'crossfade', duration: 2 } }),
      ],
    }
    // B above A in layer order
    const f = evaluateTimeline(p, 5.5, objs('A', 'B'))
    expect(f.objects.B.opacity).toBeCloseTo(0.25)
    expect(f.objects.A).toMatchObject({ visible: true, opacity: 1 })
    // A keeps playing past its out point (handle) during the hold
    expect(f.objects.A.mediaTime).toBeCloseTo(5.5)
    const gains = Object.fromEntries(f.activeAudio.map(a => [a.clipId, a.gain]))
    expect(gains.a).toBeCloseTo(0.75)
    expect(gains.b).toBeCloseTo(0.25)
    // A above B: A carries the alpha instead
    const g = evaluateTimeline(p, 5.5, objs('B', 'A'))
    expect(g.objects.A.opacity).toBeCloseTo(0.75)
    expect(g.objects.B.opacity).toBe(1)
    // after the transition A is gone
    expect(evaluateTimeline(p, 7.5, objs('A', 'B')).objects.A.visible).toBe(false)
  })

  it('held clip freezes at the source end when it has no handle', () => {
    const p = {
      ...project(),
      clips: [
        makeClip({ id: 'a', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'A', start: 0, inPoint: 15, outPoint: 20 }),
        makeClip({ id: 'b', trackId: MAIN_TRACK_ID, assetId: 'vb', objectId: 'B', start: 5, inPoint: 0, outPoint: 5, transitionIn: { type: 'slide', duration: 1 } }),
      ],
    }
    const f = evaluateTimeline(p, 5.5, objs('A', 'B'))
    expect(f.objects.A.mediaTime).toBeLessThan(20)
    expect(f.objects.A.mediaTime).toBeGreaterThan(19.9)
    expect(f.objects.B.transform).toEqual({ tx: 0.5, ty: 0, scale: 1 })
    expect(f.objects.A.transform).toEqual({ tx: -0.5, ty: 0, scale: 1 })
  })

  it('dip to black peaks at the cut', () => {
    const p = {
      ...project(),
      clips: [
        makeClip({ id: 'a', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'A', start: 0, inPoint: 0, outPoint: 5 }),
        makeClip({ id: 'b', trackId: MAIN_TRACK_ID, assetId: 'vb', objectId: 'B', start: 5, inPoint: 0, outPoint: 5, transitionIn: { type: 'dip', duration: 2 } }),
      ],
    }
    expect(evaluateTimeline(p, 3.9, objs('A', 'B')).dip).toBe(0)
    expect(evaluateTimeline(p, 4.5, objs('A', 'B')).dip).toBeCloseTo(0.5)
    expect(evaluateTimeline(p, 5, objs('A', 'B')).dip).toBeCloseTo(1)
    expect(evaluateTimeline(p, 5.5, objs('A', 'B')).dip).toBeCloseTo(0.5)
    const mid = evaluateTimeline(p, 4.5, objs('A', 'B'))
    expect(mid.activeAudio.find(a => a.clipId === 'a')!.gain).toBeCloseTo(0.5)
  })

  it('wipe and zoom produce renderer parameters', () => {
    const mk = (type: 'wipe' | 'zoom') => ({
      ...project(),
      clips: [makeClip({ id: 'b', trackId: MAIN_TRACK_ID, assetId: 'vb', objectId: 'B', start: 0, inPoint: 0, outPoint: 5, transitionIn: { type, duration: 2 } })],
    })
    expect(evaluateTimeline(mk('wipe'), 0.5, objs('B')).objects.B.transform).toEqual({ tx: 0, ty: 0, scale: 1, reveal: 0.25 })
    const z = evaluateTimeline(mk('zoom'), 1, objs('B')).objects.B
    expect(z.transform!.scale).toBeCloseTo(0.8)
    expect(z.opacity).toBeCloseTo(0.5)
  })

  it('split clips of one object pick the playing part', () => {
    const p = {
      ...project(),
      clips: [
        makeClip({ id: 'l', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'A', start: 0, inPoint: 0, outPoint: 3 }),
        makeClip({ id: 'r', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'A', start: 3, inPoint: 3, outPoint: 8 }),
      ],
    }
    expect(evaluateTimeline(p, 2, objs('A')).objects.A).toMatchObject({ clipId: 'l', mediaTime: 2 })
    expect(evaluateTimeline(p, 4, objs('A')).objects.A).toMatchObject({ clipId: 'r', mediaTime: 4 })
    expect(evaluateTimeline(p, 4, objs('A')).activeAudio).toHaveLength(1)
  })

  it('muted and hidden tracks; absent objects are ignored', () => {
    const p = {
      ...project(),
      tracks: project().tracks.map(t => (t.id === 'au' ? { ...t, muted: true } : t.id === 'ov' ? { ...t, hidden: true } : t)),
      clips: [
        makeClip({ id: 'm', trackId: 'au', assetId: 'm', start: 0, duration: 10 }),
        makeClip({ id: 't', trackId: 'ov', objectId: 'title', start: 0, duration: 10 }),
        makeClip({ id: 'gone', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'other-page', start: 0, inPoint: 0, outPoint: 20 }),
      ],
    }
    const f = evaluateTimeline(p, 1, objs('title'))
    expect(f.activeAudio).toEqual([{ clipId: 'm', assetId: 'm', mediaTime: 1, gain: 0, rate: 1 }])
    expect(f.objects.title.visible).toBe(false)
    expect(f.duration).toBe(10) // the off-page video doesn't stretch the project
  })

  it('objectWindow prefers the clip over metadata', () => {
    const p = { ...project(), clips: [makeClip({ id: 't', trackId: 'ov', objectId: 'title', start: 2, duration: 3 })] }
    expect(objectWindow(p, 'title', { start: 0, duration: 5 })).toEqual({ start: 2, duration: 3 })
    expect(objectWindow(p, 'nope', { start: 0, duration: 5 })).toEqual({ start: 0, duration: 5 })
  })
})

describe('clip mute', () => {
  it('a muted clip is silent but still visible', () => {
    const p = {
      ...project(),
      clips: [makeClip({ id: 'c', trackId: MAIN_TRACK_ID, assetId: 'va', objectId: 'A', start: 0, inPoint: 0, outPoint: 5, muted: true })],
    }
    const f = evaluateTimeline(p, 1, objs('A'))
    expect(f.objects.A.visible).toBe(true)
    expect(f.activeAudio[0].gain).toBe(0)
  })
})
