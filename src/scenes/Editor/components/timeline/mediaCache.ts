/**
 * Filmstrip thumbnails and audio waveforms, computed once per asset.
 *
 *  - Filmstrip: an offscreen <video> seeks to a handful of evenly spaced
 *    times and each frame is drawn into a small canvas (≤ 16 frames, 2× row
 *    height). One asset is processed at a time so a long project doesn't spin
 *    up a decoder per clip.
 *  - Waveform: the file is fetched once, `decodeAudioData` runs on an
 *    OfflineAudioContext and peaks are reduced to 100 per second.
 *
 * Both are cached in memory by `assetId + url`, requested lazily by visible
 * clips, and never block the UI: until ready, the clip shows its poster /
 * a flat line.
 */
import { useEffect, useState } from 'react'
import { ignoreError, log } from '@/lib/logger'

export interface FilmstripFrame {
  /** Seconds in the source. */
  t: number
  image: HTMLCanvasElement
}

export interface Filmstrip {
  frames: FilmstripFrame[]
  /** width / height of the source. */
  aspect: number
}

export interface Peaks {
  /** Peak buckets per second of source. */
  rate: number
  /** 0..1 absolute peak per bucket. */
  data: Float32Array
}

const FRAME_HEIGHT = 96
const MAX_FRAMES = 16
const PEAKS_PER_SECOND = 100

const strips = new Map<string, Promise<Filmstrip | null>>()
const stripsReady = new Map<string, Filmstrip | null>()
const peaks = new Map<string, Promise<Peaks | null>>()
const peaksReady = new Map<string, Peaks | null>()

let queue: Promise<unknown> = Promise.resolve()
/** Run media jobs one at a time. */
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.catch(err => ignoreError(err, 'media cache job failed (already reported)'))
  return run
}

function once(el: HTMLMediaElement, ok: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => {
      el.removeEventListener(ok, onOk)
      el.removeEventListener('error', onErr)
      clearTimeout(timer)
      fn()
    }
    const onOk = () => done(resolve)
    const onErr = () => done(() => reject(new Error(`media ${ok} failed`)))
    const timer = setTimeout(() => done(() => reject(new Error(`media ${ok} timed out`))), timeoutMs)
    el.addEventListener(ok, onOk)
    el.addEventListener('error', onErr)
  })
}

async function buildFilmstrip(url: string, fallbackDuration: number): Promise<Filmstrip | null> {
  if (typeof document === 'undefined') return null
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'auto'
  video.playsInline = true
  // No crossOrigin: frames are only displayed, never read back, so a tainted canvas is fine.
  video.src = url
  try {
    await once(video, 'loadeddata', 15000)
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : fallbackDuration
    const aspect = video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 16 / 9
    const n = Math.max(2, Math.min(MAX_FRAMES, Math.ceil(duration / 1.5)))
    const h = FRAME_HEIGHT
    const w = Math.max(16, Math.round(h * aspect))
    const frames: FilmstripFrame[] = []
    for (let i = 0; i < n; i++) {
      const t = Math.min(Math.max(0, duration - 0.05), ((i + 0.5) * duration) / n)
      video.currentTime = t
      await once(video, 'seeked', 5000)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d')?.drawImage(video, 0, 0, w, h)
      frames.push({ t, image: c })
    }
    return { frames, aspect }
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}

/** Filmstrip for an asset (null when it can't be decoded); cached. */
export function loadFilmstrip(assetId: string, url: string, duration: number): Promise<Filmstrip | null> {
  const key = `${assetId}|${url}`
  let p = strips.get(key)
  if (!p) {
    p = enqueue(() => buildFilmstrip(url, duration)).catch(err => {
      log.warn('timeline', 'filmstrip unavailable — showing the poster', err)
      return null
    })
    strips.set(key, p)
    p.then(s => stripsReady.set(key, s))
  }
  return p
}

async function buildPeaks(url: string): Promise<Peaks | null> {
  const w = window as any
  const Offline = w.OfflineAudioContext || w.webkitOfflineAudioContext
  if (!Offline) return null
  const res = await fetch(url)
  if (!res.ok) throw new Error(`audio fetch ${res.status}`)
  const buf = await res.arrayBuffer()
  const ctx = new Offline(1, 1, 44100)
  const audio: AudioBuffer = await new Promise((resolve, reject) => {
    const r = ctx.decodeAudioData(buf, resolve, reject)
    if (r && typeof r.then === 'function') r.then(resolve, reject)
  })
  const per = Math.max(1, Math.floor(audio.sampleRate / PEAKS_PER_SECOND))
  const buckets = Math.ceil(audio.length / per)
  const data = new Float32Array(buckets)
  for (let ch = 0; ch < Math.min(2, audio.numberOfChannels); ch++) {
    const samples = audio.getChannelData(ch)
    for (let b = 0; b < buckets; b++) {
      let m = data[b]
      const end = Math.min(samples.length, (b + 1) * per)
      for (let i = b * per; i < end; i++) {
        const v = samples[i] < 0 ? -samples[i] : samples[i]
        if (v > m) m = v
      }
      data[b] = m
    }
  }
  return { rate: audio.sampleRate / per, data }
}

/** Waveform peaks for an asset (null when it can't be fetched/decoded); cached. */
export function loadPeaks(assetId: string, url: string): Promise<Peaks | null> {
  const key = `${assetId}|${url}`
  let p = peaks.get(key)
  if (!p) {
    p = enqueue(() => buildPeaks(url)).catch(err => {
      log.warn('timeline', 'waveform unavailable — showing a flat line', err)
      return null
    })
    peaks.set(key, p)
    p.then(v => peaksReady.set(key, v))
  }
  return p
}

/** Filmstrip once ready (undefined while loading / no url). */
export function useFilmstrip(assetId: string | undefined, url: string | null | undefined, duration: number): Filmstrip | null | undefined {
  const key = assetId && url ? `${assetId}|${url}` : ''
  const [value, setValue] = useState<Filmstrip | null | undefined>(() => (key ? stripsReady.get(key) : undefined))
  useEffect(() => {
    if (!key || !assetId || !url) return
    if (stripsReady.has(key)) {
      setValue(stripsReady.get(key))
      return
    }
    let live = true
    loadFilmstrip(assetId, url, duration).then(s => live && setValue(s))
    return () => {
      live = false
    }
    // duration only matters for the first build
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return value
}

export function usePeaks(assetId: string | undefined, url: string | null | undefined): Peaks | null | undefined {
  const key = assetId && url ? `${assetId}|${url}` : ''
  const [value, setValue] = useState<Peaks | null | undefined>(() => (key ? peaksReady.get(key) : undefined))
  useEffect(() => {
    if (!key || !assetId || !url) return
    if (peaksReady.has(key)) {
      setValue(peaksReady.get(key))
      return
    }
    let live = true
    loadPeaks(assetId, url).then(v => live && setValue(v))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return value
}

/** Max peak between two source times (seconds). */
export function peakBetween(p: Peaks, t0: number, t1: number): number {
  const a = Math.max(0, Math.floor(t0 * p.rate))
  const b = Math.min(p.data.length - 1, Math.max(a, Math.ceil(t1 * p.rate)))
  let m = 0
  for (let i = a; i <= b; i++) if (p.data[i] > m) m = p.data[i]
  return m
}

/** Nearest filmstrip frame to source time `t`. */
export function frameAt(s: Filmstrip, t: number): FilmstripFrame | undefined {
  let best: FilmstripFrame | undefined
  let bestD = Infinity
  for (const f of s.frames) {
    const d = Math.abs(f.t - t)
    if (d < bestD) {
      bestD = d
      best = f
    }
  }
  return best
}
