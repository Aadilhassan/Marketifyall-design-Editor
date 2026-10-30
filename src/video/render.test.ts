import { isBrokenMedia, seekExact } from './render'

/** Minimal <video> stand-in: setting currentTime starts a seek that `finishSeek` completes. */
function fakeVideo(opts: { duration?: number; readyState?: number } = {}) {
  const target = new EventTarget()
  const el: any = {
    duration: opts.duration ?? 10,
    readyState: opts.readyState ?? 4,
    paused: true,
    seeking: false,
    error: null,
    networkState: 1,
    _t: 0,
    pause() {
      el.paused = true
    },
    get currentTime() {
      return el._t
    },
    set currentTime(t: number) {
      el._t = t
      el.seeking = true
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    finishSeek() {
      el.seeking = false
      target.dispatchEvent(new Event('seeked'))
    },
  }
  return el
}

describe('seekExact', () => {
  it('resolves true once the seek lands', async () => {
    const el = fakeVideo()
    const p = seekExact(el, 3.5, 1000)
    expect(el.currentTime).toBe(3.5)
    el.finishSeek()
    await expect(p).resolves.toBe(true)
  })

  it('resolves false when the seek times out', async () => {
    jest.useFakeTimers()
    try {
      const el = fakeVideo()
      const p = seekExact(el, 2, 500)
      jest.advanceTimersByTime(600)
      await expect(p).resolves.toBe(false)
    } finally {
      jest.useRealTimers()
    }
  })

  it('is immediate when already on the frame, and clamps past the end', async () => {
    const el = fakeVideo({ duration: 4 })
    el._t = 1
    await expect(seekExact(el, 1, 10)).resolves.toBe(true)
    const p = seekExact(el, 9, 1000)
    expect(el.currentTime).toBeLessThan(4)
    el.finishSeek()
    await expect(p).resolves.toBe(true)
  })

  it('flags media that can never show a frame', () => {
    expect(isBrokenMedia(fakeVideo())).toBe(false)
    expect(isBrokenMedia({ ...fakeVideo(), error: { code: 4 } })).toBe(true)
    // NETWORK_NO_SOURCE only means broken when there is no source at all
    expect(isBrokenMedia({ ...fakeVideo(), networkState: 3, currentSrc: '' })).toBe(true)
  })
})

describe('isBrokenMedia', () => {
  const { isBrokenMedia } = require('./render')
  const el = (props: Record<string, any>, src: string | null = 'https://example.com/a.mp4') =>
    ({ error: null, networkState: 0, currentSrc: '', getAttribute: (k: string) => (k === 'src' ? src : null), ...props } as any)

  it('is not broken while a new element is still selecting its source (NETWORK_NO_SOURCE with a src)', () => {
    expect(isBrokenMedia(el({ networkState: 3 }))).toBe(false)
  })
  it('is broken when there is genuinely no source', () => {
    expect(isBrokenMedia(el({ networkState: 3 }, null))).toBe(true)
  })
  it('is broken on a media error', () => {
    expect(isBrokenMedia(el({ error: { code: 4 } }))).toBe(true)
  })
})
