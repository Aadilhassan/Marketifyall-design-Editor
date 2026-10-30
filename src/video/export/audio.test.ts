import { compressEnvelope, encodeWav, planAudio } from './audio'
import { Clip, MAIN_TRACK_ID, VideoProject, emptyProject, makeClip } from '../model'

const AUDIO_TRACK = 'track-audio'

function project(clips: Clip[], opts: { muted?: boolean } = {}): VideoProject {
  const p = emptyProject()
  return {
    ...p,
    tracks: [...p.tracks, { id: AUDIO_TRACK, kind: 'audio', name: 'Music', muted: opts.muted }],
    assets: [
      { id: 'song', kind: 'audio', name: 'Song', duration: 120, src: { kind: 'url', url: 'song.mp3' } },
      { id: 'clipA', kind: 'video', name: 'A', duration: 30, src: { kind: 'url', url: 'a.mp4' } },
    ],
    clips,
  }
}

const gainAt = (env: Array<{ t: number; gain: number }>, t: number) => {
  for (let i = 1; i < env.length; i++) {
    if (t <= env[i].t + 1e-9) {
      const a = env[i - 1]
      const b = env[i]
      return b.t === a.t ? b.gain : a.gain + ((b.gain - a.gain) * (t - a.t)) / (b.t - a.t)
    }
  }
  return env[env.length - 1].gain
}

describe('planAudio', () => {
  it('schedules a clip with its start, in point, length, volume and fades', () => {
    const c = makeClip({ id: 'm', trackId: AUDIO_TRACK, assetId: 'song', start: 2, inPoint: 5, duration: 4, volume: 0.5, fadeIn: 1, fadeOut: 1 })
    const [s, ...rest] = planAudio(project([c]), { start: 0, end: 10 }, [])
    expect(rest).toHaveLength(0)
    expect(s.when).toBe(2)
    expect(s.offset).toBe(5)
    expect(s.duration).toBeCloseTo(4, 6)
    expect(s.rate).toBe(1)
    expect(gainAt(s.envelope, 2)).toBeCloseTo(0, 3)
    expect(gainAt(s.envelope, 2.5)).toBeCloseTo(0.25, 2)
    expect(gainAt(s.envelope, 3)).toBeCloseTo(0.5, 3)
    expect(gainAt(s.envelope, 4.5)).toBeCloseTo(0.5, 3)
    expect(gainAt(s.envelope, 5.5)).toBeCloseTo(0.25, 2)
    expect(gainAt(s.envelope, 6)).toBeCloseTo(0, 2)
    // Linear runs are compressed to their corners.
    expect(s.envelope.length).toBeLessThan(10)
  })

  it('offsets media and output time when the range starts inside a clip, honouring speed', () => {
    const c = makeClip({ id: 'm', trackId: AUDIO_TRACK, assetId: 'song', start: 2, inPoint: 5, duration: 4, speed: 2 })
    const [s] = planAudio(project([c]), { start: 3, end: 5 }, [])
    expect(s.when).toBe(0)
    expect(s.offset).toBe(7) // 5 + (3 - 2) × 2
    expect(s.duration).toBeCloseTo(2, 6)
    expect(s.rate).toBe(2)
  })

  it('skips muted tracks, clips outside the range and clips of objects on other pages', () => {
    const music = makeClip({ id: 'm', trackId: AUDIO_TRACK, assetId: 'song', start: 0, duration: 3 })
    expect(planAudio(project([music], { muted: true }), { start: 0, end: 5 }, [])).toEqual([])
    expect(planAudio(project([music]), { start: 4, end: 5 }, [])).toEqual([])
    const video = makeClip({ id: 'v', trackId: MAIN_TRACK_ID, assetId: 'clipA', objectId: 'obj-a', start: 0, duration: 3 })
    expect(planAudio(project([video]), { start: 0, end: 5 }, [])).toEqual([])
    const [s] = planAudio(project([video]), { start: 0, end: 5 }, [{ id: 'obj-a' }])
    expect(s.clipId).toBe('v')
    expect(gainAt(s.envelope, 1)).toBeCloseTo(1, 3)
  })

  it('keeps the outgoing clip playing under a crossfade and fades it out', () => {
    const a = makeClip({ id: 'a', trackId: AUDIO_TRACK, assetId: 'song', start: 0, duration: 4 })
    const b = makeClip({ id: 'b', trackId: AUDIO_TRACK, assetId: 'song', start: 4, inPoint: 50, duration: 4, transitionIn: { type: 'crossfade', duration: 1 } })
    const plan = planAudio(project([a, b]), { start: 0, end: 8 }, [])
    const sa = plan.find(s => s.clipId === 'a')!
    const sb = plan.find(s => s.clipId === 'b')!
    expect(sa.duration).toBeCloseTo(5, 6)
    expect(gainAt(sa.envelope, 3.9)).toBeCloseTo(1, 2)
    expect(gainAt(sa.envelope, 4.5)).toBeCloseTo(0.5, 2)
    expect(gainAt(sb.envelope, 4.5)).toBeCloseTo(0.5, 2)
    expect(gainAt(sb.envelope, 6)).toBeCloseTo(1, 2)
  })
})

describe('compressEnvelope', () => {
  it('drops collinear points but keeps corners', () => {
    const pts = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map(t => ({ t, gain: Math.min(1, t * 4) }))
    expect(compressEnvelope(pts)).toEqual([
      { t: 0, gain: 0 },
      { t: 0.2, gain: 0.8 },
      { t: 0.3, gain: 1 },
      { t: 0.5, gain: 1 },
    ])
  })
})

describe('encodeWav', () => {
  it('writes a 16-bit PCM WAV header and interleaved samples', () => {
    const left = new Float32Array([0, 1, -1])
    const right = new Float32Array([0.5, -0.5, 2])
    const buf = encodeWav([left, right], 48000)
    const v = new DataView(buf)
    const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3))
    expect(tag(0)).toBe('RIFF')
    expect(tag(8)).toBe('WAVE')
    expect(tag(36)).toBe('data')
    expect(v.getUint16(22, true)).toBe(2)
    expect(v.getUint32(24, true)).toBe(48000)
    expect(v.getUint32(40, true)).toBe(3 * 2 * 2)
    expect(buf.byteLength).toBe(44 + 12)
    expect(v.getInt16(44, true)).toBe(0)
    expect(v.getInt16(46, true)).toBe(Math.trunc(0.5 * 0x7fff))
    expect(v.getInt16(48, true)).toBe(0x7fff)
    expect(v.getInt16(52, true)).toBe(-0x8000)
    expect(v.getInt16(54, true)).toBe(0x7fff) // clipped
  })
})
