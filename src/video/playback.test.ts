import { PlaybackController, TickCause } from './playback'

function setup(duration = 10) {
  let now = 0
  let queued: FrameRequestCallback | null = null
  const ticks: Array<[number, boolean, TickCause]> = []
  const c = new PlaybackController({
    getDuration: () => duration,
    onTick: (t, s, cause) => ticks.push([t, s.playing, cause]),
    now: () => now,
    raf: cb => {
      queued = cb
      return 1
    },
    caf: () => {
      queued = null
    },
  })
  const advance = (dt: number) => {
    now += dt
    const cb = queued
    queued = null
    cb?.(now * 1000)
  }
  return { c, ticks, advance }
}

describe('PlaybackController', () => {
  it('resumes from the playhead and pauses there', () => {
    const { c, advance } = setup()
    c.seek(3)
    c.play()
    advance(1)
    expect(c.time).toBeCloseTo(4)
    c.pause()
    advance(1)
    expect(c.time).toBeCloseTo(4)
    c.play()
    advance(0.5)
    expect(c.time).toBeCloseTo(4.5)
  })

  it('stops at the end and restarts from 0 on the next play', () => {
    const { c, ticks, advance } = setup(2)
    c.play()
    advance(5)
    expect(c.time).toBe(2)
    expect(c.playing).toBe(false)
    expect(ticks[ticks.length - 1][2]).toBe('end')
    c.play()
    expect(c.time).toBe(0)
  })

  it('scrubbing pauses playback and clamps to the duration', () => {
    const { c } = setup(5)
    c.play()
    c.scrub(9)
    expect(c.playing).toBe(false)
    expect(c.state.scrubbing).toBe(true)
    expect(c.time).toBe(5)
    c.endScrub()
    expect(c.state.scrubbing).toBe(false)
  })

  it('does not start with nothing to play', () => {
    const { c } = setup(0)
    c.play()
    expect(c.playing).toBe(false)
  })
})

describe('shuttle (J/K/L)', () => {
  it('moves at the rate as silent scrubs, stops at the ends, and play/seek cancel it', () => {
    const { c, ticks, advance } = setup(10)
    c.seek(5)
    c.shuttle(2)
    expect(c.rate).toBe(2)
    expect(c.state.scrubbing).toBe(true)
    advance(1)
    expect(c.time).toBeCloseTo(7)
    expect(ticks[ticks.length - 1][2]).toBe('scrub')
    c.shuttle(-4)
    advance(1)
    expect(c.time).toBeCloseTo(3)
    advance(1)
    expect(c.time).toBe(0)
    expect(c.rate).toBe(0)
    expect(c.state.scrubbing).toBe(false)
    c.shuttle(2)
    c.seek(4)
    expect(c.rate).toBe(0)
    c.shuttle(-1)
    c.shuttle(1)
    expect(c.playing).toBe(true)
    expect(c.rate).toBe(1)
    c.shuttle(0)
    expect(c.playing).toBe(false)
  })

  it('toggle stops a shuttle', () => {
    const { c, advance } = setup(10)
    c.shuttle(2)
    advance(0.5)
    c.toggle()
    expect(c.rate).toBe(0)
    expect(c.playing).toBe(false)
  })
})
