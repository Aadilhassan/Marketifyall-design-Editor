import { FrameInfo, FrameScene, PreparedFrame, isAbort, renderFrames, withPausedClock } from './frames'

/** A canvas stand-in: jsdom has no 2D context. Frames are "drawn" into `pixels`. */
function fakeCanvas() {
  const state = { pixels: '' }
  const ctx: any = {
    setTransform: () => undefined,
    clearRect: () => {
      state.pixels = ''
    },
  }
  const canvas: any = { width: 0, height: 0, getContext: () => ctx }
  return { canvas, ctx, state }
}

/**
 * One video ("v") visible over the whole range. Its element shows frame
 * `round(t * fps)` once a seek succeeds; seeks for the frames in `stall`
 * never complete (both attempts). An element still seeking draws nothing.
 */
class FakeScene implements FrameScene {
  calls: Array<{ t: number; timeoutMs: number }> = []
  element = 'poster'
  seeking = false
  lastGood: string | null = null
  drawn = ''
  constructor(private fps: number, private stall: Set<number>, private draws: (p: string) => void) {}

  async prepare(t: number, timeoutMs: number): Promise<PreparedFrame> {
    this.calls.push({ t, timeoutMs })
    const n = Math.round(t * this.fps)
    await Promise.resolve()
    if (this.stall.has(n)) {
      this.seeking = true
      return { dip: 0, videos: ['v'], late: ['v'] }
    }
    this.seeking = false
    this.element = `video@${n}`
    return { dip: 0, videos: ['v'], late: [] }
  }

  holdLastGood(ids: string[]): () => void {
    const prev = this.seeking
    if (ids.includes('v') && this.lastGood) this.seeking = false
    const prevEl = this.element
    if (this.lastGood) this.element = this.lastGood
    return () => {
      this.seeking = prev
      this.element = prevEl
    }
  }

  keepGood(ids: string[]): void {
    if (ids.includes('v')) this.lastGood = this.element
  }

  draw(): void {
    this.draws(this.seeking ? 'BLANK' : this.element)
  }
}

describe('renderFrames', () => {
  it('emits exactly N frames in order with the right times and timestamps', async () => {
    const { canvas } = fakeCanvas()
    const scene = new FakeScene(10, new Set(), () => undefined)
    const seen: FrameInfo[] = []
    const stats = await renderFrames(scene, {
      range: { start: 1, end: 2 },
      fps: 10,
      width: 64,
      height: 36,
      canvas,
      onFrame: (_c, info) => {
        seen.push(info)
      },
    })
    expect(stats.frames).toBe(10)
    expect(seen.map(f => f.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    seen.forEach((f, i) => {
      expect(f.time).toBeCloseTo(1 + i / 10, 10)
      expect(f.timestampUs).toBe(i * 100000)
      expect(f.durationUs).toBe(100000)
    })
    expect(canvas.width).toBe(64)
    expect(canvas.height).toBe(36)
    expect(stats.heldFrames).toBe(0)
  })

  it('retries a late frame, then reuses the last good frame instead of a blank one', async () => {
    const { canvas } = fakeCanvas()
    const drawn: string[] = []
    const scene = new FakeScene(10, new Set([3]), p => drawn.push(p))
    const infos: FrameInfo[] = []
    const stats = await renderFrames(scene, {
      range: { start: 0, end: 0.6 },
      fps: 10,
      width: 10,
      height: 10,
      canvas,
      timeoutMs: 100,
      retryTimeoutMs: 300,
      onFrame: (_c, info) => {
        infos.push(info)
      },
    })
    expect(drawn).toEqual(['video@0', 'video@1', 'video@2', 'video@2', 'video@4', 'video@5'])
    expect(drawn).not.toContain('BLANK')
    expect(drawn).not.toContain('poster')
    // Frame 3 was attempted twice, the second time with the longer timeout.
    const at3 = scene.calls.filter(c => Math.round(c.t * 10) === 3)
    expect(at3.map(c => c.timeoutMs)).toEqual([100, 300])
    expect(infos[3].held).toEqual(['v'])
    expect(stats.heldFrames).toBe(1)
    expect(stats.heldVideos).toEqual(['v'])
    expect(infos).toHaveLength(6)
  })

  it('stops retrying after repeated misses but still never draws a blank frame', async () => {
    const { canvas } = fakeCanvas()
    const drawn: string[] = []
    const scene = new FakeScene(10, new Set([2, 3, 4, 5, 6]), p => drawn.push(p))
    await renderFrames(scene, { range: { start: 0, end: 0.8 }, fps: 10, width: 4, height: 4, canvas, timeoutMs: 100, onFrame: () => undefined })
    expect(drawn).toEqual(['video@0', 'video@1', 'video@1', 'video@1', 'video@1', 'video@1', 'video@1', 'video@7'])
    // After 3 consecutive misses the loop uses one short attempt per frame.
    const at5 = scene.calls.filter(c => Math.round(c.t * 10) === 5)
    expect(at5).toHaveLength(1)
    expect(at5[0].timeoutMs).toBeLessThanOrEqual(100)
  })

  it('stops cleanly when aborted', async () => {
    const { canvas } = fakeCanvas()
    const scene = new FakeScene(30, new Set(), () => undefined)
    const ac = new AbortController()
    const got: number[] = []
    const run = renderFrames(scene, {
      range: { start: 0, end: 10 },
      fps: 30,
      width: 4,
      height: 4,
      canvas,
      signal: ac.signal,
      onFrame: (_c, info) => {
        got.push(info.index)
        if (info.index === 2) ac.abort()
      },
    })
    let error: unknown
    try {
      await run
    } catch (err) {
      error = err
    }
    expect(isAbort(error)).toBe(true)
    expect(got).toEqual([0, 1, 2])
    expect(scene.calls).toHaveLength(3)
  })

  it('renders only the requested frames (palette sampling)', async () => {
    const { canvas } = fakeCanvas()
    const drawn: string[] = []
    const scene = new FakeScene(10, new Set(), p => drawn.push(p))
    const stats = await renderFrames(scene, { range: { start: 0, end: 1 }, fps: 10, width: 4, height: 4, canvas, only: [0, 5, 9, 42], onFrame: () => undefined })
    expect(drawn).toEqual(['video@0', 'video@5', 'video@9'])
    expect(stats.frames).toBe(3)
  })
})

describe('withPausedClock', () => {
  function clock(time: number, playing: boolean) {
    const c = {
      time,
      playing,
      seeks: [] as number[],
      pause() {
        c.playing = false
      },
      seek(t: number) {
        c.seeks.push(t)
        c.time = t
      },
    }
    return c
  }

  it('pauses the live clock and puts the playhead back afterwards', async () => {
    const c = clock(4.2, true)
    const result = await withPausedClock(c, async () => {
      expect(c.playing).toBe(false)
      c.time = 0 // something moved it during export
      return 'done'
    })
    expect(result).toBe('done')
    expect(c.time).toBe(4.2)
    expect(c.seeks).toEqual([4.2])
  })

  it('restores the playhead when the export fails or is cancelled', async () => {
    const c = clock(1.5, false)
    await expect(
      withPausedClock(c, async () => {
        c.time = 9
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(c.time).toBe(1.5)
  })

  it('leaves playback alone if the user started playing meanwhile', async () => {
    const c = clock(2, false)
    await withPausedClock(c, async () => {
      c.playing = true
      c.time = 3
    })
    expect(c.seeks).toEqual([])
  })

  it('works without a clock', async () => {
    await expect(withPausedClock(null, async () => 7)).resolves.toBe(7)
  })
})
