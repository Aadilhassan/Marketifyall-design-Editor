/**
 * PlaybackController — the one clock.
 *
 * The current time is the master. While playing it advances on
 * requestAnimationFrame, measured against the audio clock when an
 * AudioContext is running (so picture follows sound), else performance.now().
 * Every change — tick, seek, scrub, pause — is pushed to a single `onTick`
 * sink (the scene engine: evaluate → apply → sync media → one render) and then
 * to subscribers (playhead UI). Nothing else writes time.
 *
 * Play resumes from the playhead (from 0 when parked at the end); reaching the
 * end pauses there.
 *
 * Shuttle (J/K/L): `shuttle(rate)` with rate ≠ 0, 1 moves the playhead at
 * `rate`× (negative = backwards) on the wall clock and reports every step as a
 * scrub (media paused, exact seeks, silent) — the engine already renders
 * scrubs frame-accurately, so fast/reverse preview needs no media changes.
 * rate 1 is normal play, 0 is pause.
 */

export type TickCause = 'play' | 'tick' | 'pause' | 'seek' | 'scrub' | 'end' | 'refresh'

export interface PlaybackState {
  time: number
  playing: boolean
  /** True while the user drags the playhead (media stays paused). */
  scrubbing: boolean
}

export interface PlaybackOptions {
  getDuration: () => number
  onTick: (time: number, state: PlaybackState, cause: TickCause) => void
  /** Media clock in seconds (AudioContext.currentTime) or null when unavailable. */
  mediaClock?: () => number | null
  now?: () => number
  raf?: (cb: FrameRequestCallback) => number
  caf?: (id: number) => void
}

type Listener = (state: PlaybackState, cause: TickCause) => void

const END_EPS = 1e-3

export class PlaybackController {
  private _time = 0
  private _playing = false
  private _scrubbing = false
  private _shuttle = 0
  private shuttleClock = 0
  private rafId: number | null = null
  private anchorClock = 0
  private anchorTime = 0
  private anchorSource: 'media' | 'wall' = 'wall'
  private listeners = new Set<Listener>()
  private opts: PlaybackOptions
  private disposed = false

  constructor(opts: PlaybackOptions) {
    this.opts = opts
  }

  get time(): number {
    return this._time
  }

  get playing(): boolean {
    return this._playing
  }

  /** Current transport rate: 1 while playing, the shuttle rate while shuttling, else 0. */
  get rate(): number {
    return this._playing ? 1 : this._shuttle
  }

  get state(): PlaybackState {
    return { time: this._time, playing: this._playing, scrubbing: this._scrubbing }
  }

  setOnTick(onTick: PlaybackOptions['onTick']): void {
    this.opts = { ...this.opts, onTick }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  play(): void {
    if (this.disposed || this._playing) return
    const duration = this.opts.getDuration()
    if (!(duration > 0)) return
    this.clearShuttle()
    if (this._time >= duration - END_EPS) this._time = 0
    this._playing = true
    this._scrubbing = false
    this.anchor()
    this.emit('play')
    this.loop()
  }

  pause(): void {
    if (this._shuttle) {
      this.clearShuttle()
      this._scrubbing = false
      this.emit('pause')
      return
    }
    if (!this._playing) return
    this.sample()
    this._playing = false
    this.stopLoop()
    this.emit('pause')
  }

  toggle(): void {
    if (this._playing || this._shuttle) this.pause()
    else this.play()
  }

  /** Jump to `t` (keeps playing if playing). */
  seek(t: number): void {
    this.clearShuttle()
    this._time = this.clamp(t)
    this._scrubbing = false
    if (this._playing) this.anchor()
    this.emit('seek')
  }

  /** Playhead drag: pauses playback, media seeks exactly and waits for `seeked`. Call `endScrub` on release. */
  scrub(t: number): void {
    this.clearShuttle()
    if (this._playing) {
      this._playing = false
      this.stopLoop()
    }
    this._scrubbing = true
    this._time = this.clamp(t)
    this.emit('scrub')
  }

  endScrub(): void {
    if (!this._scrubbing) return
    this._scrubbing = false
    this.emit('seek')
  }

  /**
   * J/K/L transport. 1 = play, 0 = pause, anything else moves the playhead at
   * that rate as a silent scrub until it hits either end (then pauses there).
   */
  shuttle(rate: number): void {
    if (this.disposed) return
    if (!Number.isFinite(rate) || rate === 0) {
      this.pause()
      return
    }
    if (rate === 1) {
      if (this._shuttle) {
        this.clearShuttle()
        this._scrubbing = false
      }
      this.play()
      return
    }
    const duration = this.opts.getDuration()
    if (!(duration > 0)) return
    if (this._playing) {
      this.sample()
      this._playing = false
      this.stopLoop()
    }
    // Forward from the very end / backward from 0 restarts from the other end.
    if (rate > 0 && this._time >= duration - END_EPS) this._time = 0
    if (rate < 0 && this._time <= END_EPS) this._time = duration
    const wasShuttling = this._shuttle !== 0
    this._shuttle = rate
    this._scrubbing = true
    this.shuttleClock = this.wallNow()
    this.emit('scrub')
    if (!wasShuttling) this.shuttleLoop()
  }

  /** Re-run the frame at the current time (project or canvas changed). */
  refresh(): void {
    this.emit('refresh')
  }

  dispose(): void {
    this.disposed = true
    this.stopLoop()
    this.listeners.clear()
  }

  // -------------------------------------------------------------------------

  private clamp(t: number): number {
    const d = this.opts.getDuration()
    const v = Number.isFinite(t) ? Math.max(0, t) : 0
    return d > 0 ? Math.min(v, d) : v
  }

  private wallNow(): number {
    return this.opts.now ? this.opts.now() : performance.now() / 1000
  }

  private clearShuttle(): void {
    if (!this._shuttle) return
    this._shuttle = 0
    this.stopLoop()
  }

  private shuttleLoop = (): void => {
    const raf = this.opts.raf || ((cb: FrameRequestCallback) => requestAnimationFrame(cb))
    this.rafId = raf(() => {
      this.rafId = null
      if (!this._shuttle || this.disposed) return
      const now = this.wallNow()
      const dt = now - this.shuttleClock
      this.shuttleClock = now
      const duration = this.opts.getDuration()
      const next = this._time + dt * this._shuttle
      if (next <= 0 || next >= duration) {
        this._time = next <= 0 ? 0 : Math.max(0, duration)
        this._shuttle = 0
        this._scrubbing = false
        this.emit('pause')
        return
      }
      this._time = next
      this.emit('scrub')
      this.shuttleLoop()
    })
  }

  private clockNow(): { value: number; source: 'media' | 'wall' } {
    const media = this.opts.mediaClock?.()
    if (typeof media === 'number' && Number.isFinite(media)) return { value: media, source: 'media' }
    const now = this.opts.now ? this.opts.now() : performance.now() / 1000
    return { value: now, source: 'wall' }
  }

  private anchor(): void {
    const c = this.clockNow()
    this.anchorClock = c.value
    this.anchorSource = c.source
    this.anchorTime = this._time
  }

  /** Advance `_time` from the clock. */
  private sample(): void {
    const c = this.clockNow()
    if (c.source !== this.anchorSource) {
      // The audio clock just came up (or went away): re-anchor without a jump.
      this.anchorClock = c.value
      this.anchorSource = c.source
      this.anchorTime = this._time
      return
    }
    this._time = Math.max(0, this.anchorTime + (c.value - this.anchorClock))
  }

  private loop = (): void => {
    const raf = this.opts.raf || ((cb: FrameRequestCallback) => requestAnimationFrame(cb))
    this.rafId = raf(() => {
      this.rafId = null
      if (!this._playing || this.disposed) return
      this.sample()
      const duration = this.opts.getDuration()
      if (this._time >= duration) {
        this._time = Math.max(0, duration)
        this._playing = false
        this.emit('end')
        return
      }
      this.emit('tick')
      this.loop()
    })
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      const caf = this.opts.caf || ((id: number) => cancelAnimationFrame(id))
      caf(this.rafId)
      this.rafId = null
    }
  }

  private emit(cause: TickCause): void {
    const state = this.state
    this.opts.onTick(this._time, state, cause)
    this.listeners.forEach(fn => fn(state, cause))
  }
}
