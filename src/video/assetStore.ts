/**
 * Browser-only media storage + probing.
 *
 * Uploaded video/audio blobs live in IndexedDB (`mfa-media`, store `blobs`)
 * and are referenced from the project as `{ kind: 'idb', key }`, so they
 * survive reloads (blob: URLs don't). Object URLs are created lazily, cached
 * per key and revoked on delete / `revokeAllObjectUrls()`.
 *
 * Probing reads the real duration and size from a media element
 * (`loadedmetadata`) — API/template durations are never trusted. Posters are
 * captured by seeking to ~0.1 s and drawing the frame (optionally cover-cropped
 * to an aspect) into a JPEG data URL.
 */
import { Asset, AssetKind, makeId } from './model'
import { ignoreError, log } from '@/lib/logger'

const DB_NAME = 'mfa-media'
const STORE = 'blobs'
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export interface StoredMedia {
  blob: Blob
  name: string
  type: string
  createdAt: number
}

/** Store a blob; returns its key. */
export async function putBlob(blob: Blob, name = '', key: string = makeId('media')): Promise<string> {
  const rec: StoredMedia = { blob, name, type: blob.type, createdAt: Date.now() }
  await tx('readwrite', s => s.put(rec, key))
  return key
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const rec = (await tx<StoredMedia | undefined>('readonly', s => s.get(key))) as StoredMedia | undefined
  return rec?.blob
}

export async function deleteBlob(key: string): Promise<void> {
  revokeObjectUrl(key)
  await tx('readwrite', s => s.delete(key))
}

export async function listKeys(): Promise<string[]> {
  const keys = await tx<IDBValidKey[]>('readonly', s => s.getAllKeys())
  return keys.map(String)
}

const urlCache = new Map<string, Promise<string | null>>()

/** Cached object URL for a stored blob; null when the key isn't on this device. */
export function getObjectUrl(key: string): Promise<string | null> {
  let p = urlCache.get(key)
  if (!p) {
    p = getBlob(key)
      .then(blob => (blob ? URL.createObjectURL(blob) : null))
      .catch(err => {
        log.warn('media', 'could not read stored media', err)
        return null
      })
    urlCache.set(key, p)
    // A miss isn't cached forever: the media may be relinked later.
    p.then(url => {
      if (!url) urlCache.delete(key)
    })
  }
  return p
}

function revokeObjectUrl(key: string): void {
  const p = urlCache.get(key)
  urlCache.delete(key)
  p?.then(url => url && URL.revokeObjectURL(url))
}

export function revokeAllObjectUrls(): void {
  Array.from(urlCache.keys()).forEach(revokeObjectUrl)
}

/** Playable URL for an asset, or null when its media is missing (other device / dead blob: URL). */
export async function resolveAssetUrl(asset: Pick<Asset, 'src'>): Promise<string | null> {
  if (asset.src.kind === 'idb') return getObjectUrl(asset.src.key)
  const url = asset.src.url
  if (!url) return null
  // blob: URLs die with the page that made them (legacy saves).
  if (url.startsWith('blob:')) return (await urlAlive(url)) ? url : null
  return url
}

async function urlAlive(url: string): Promise<boolean> {
  try {
    // blob: URLs only answer GET; the body is cancelled unread.
    const res = await fetch(url)
    res.body?.cancel().catch(err => ignoreError(err, 'probe body cancel'))
    return res.ok
  } catch (err) {
    ignoreError(err, 'dead blob: URL from a previous session')
    return false
  }
}

// ---------------------------------------------------------------------------
// Probing
// ---------------------------------------------------------------------------

export interface MediaInfo {
  duration: number
  width?: number
  height?: number
}

const PROBE_TIMEOUT = 20000

function makeMediaEl(kind: 'video' | 'audio', url: string): HTMLMediaElement {
  const el = document.createElement(kind)
  if (!url.startsWith('blob:') && !url.startsWith('data:')) el.crossOrigin = 'anonymous'
  el.preload = 'auto'
  el.muted = true
  if (kind === 'video') (el as HTMLVideoElement).playsInline = true
  el.src = url
  return el
}

function disposeMediaEl(el: HTMLMediaElement): void {
  try {
    el.pause()
    el.removeAttribute('src')
    el.load()
  } catch (err) {
    ignoreError(err, 'media element teardown')
  }
}

function waitFor(el: HTMLMediaElement, event: string, timeout = PROBE_TIMEOUT): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => {
      el.removeEventListener(event, onOk)
      el.removeEventListener('error', onErr)
      clearTimeout(timer)
      fn()
    }
    const onOk = () => done(resolve)
    const onErr = () => done(() => reject(el.error || new Error(`media error waiting for ${event}`)))
    const timer = setTimeout(() => done(() => reject(new Error(`timed out waiting for ${event}`))), timeout)
    el.addEventListener(event, onOk)
    el.addEventListener('error', onErr)
  })
}

/** Some recordings (MediaRecorder WebM) report Infinity until you seek far past the end. */
async function finiteDuration(el: HTMLMediaElement): Promise<number> {
  if (Number.isFinite(el.duration)) return el.duration
  const changed = waitFor(el, 'durationchange', 5000)
  el.currentTime = 1e101
  await changed.catch(err => ignoreError(err, 'duration never settled'))
  const d = el.duration
  el.currentTime = 0
  return Number.isFinite(d) ? d : 0
}

/** Read the real duration (and size for video) from the media itself. */
export async function probeMedia(url: string, kind: 'video' | 'audio'): Promise<MediaInfo> {
  const el = makeMediaEl(kind, url)
  el.preload = 'metadata'
  try {
    await waitFor(el, 'loadedmetadata')
    const duration = await finiteDuration(el)
    const v = el as HTMLVideoElement
    return kind === 'video' ? { duration, width: v.videoWidth, height: v.videoHeight } : { duration }
  } finally {
    disposeMediaEl(el)
  }
}

export interface Poster extends MediaInfo {
  dataUrl: string
  /** Poster pixel size (the drawn region scaled to fit `maxSize`). */
  posterWidth: number
  posterHeight: number
  /** The region of the video the poster depicts (video pixels). */
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
}

/**
 * Probe a video and capture a poster frame (seek to `at`, wait `seeked`, draw).
 * `aspect` cover-crops the frame (stock videos use a fixed 16:9 box).
 */
export async function capturePoster(url: string, opts: { at?: number; maxSize?: number; aspect?: number } = {}): Promise<Poster> {
  const el = makeMediaEl('video', url) as HTMLVideoElement
  try {
    await waitFor(el, 'loadeddata')
    const duration = await finiteDuration(el)
    const at = Math.min(opts.at ?? 0.1, Math.max(0, duration / 2))
    if (Math.abs(el.currentTime - at) > 1e-3) {
      const seeked = waitFor(el, 'seeked')
      el.currentTime = at
      await seeked
    }
    const vw = el.videoWidth || 1280
    const vh = el.videoHeight || 720
    let sx = 0
    let sy = 0
    let sw = vw
    let sh = vh
    if (opts.aspect && opts.aspect > 0) {
      if (vw / vh > opts.aspect) {
        sw = vh * opts.aspect
        sx = (vw - sw) / 2
      } else {
        sh = vw / opts.aspect
        sy = (vh - sh) / 2
      }
    }
    const max = opts.maxSize ?? 1280
    const k = Math.min(1, max / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sw * k))
    canvas.height = Math.max(1, Math.round(sh * k))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas unavailable')
    ctx.drawImage(el, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return {
      dataUrl,
      duration,
      width: vw,
      height: vh,
      posterWidth: canvas.width,
      posterHeight: canvas.height,
      sourceX: sx,
      sourceY: sy,
      sourceWidth: sw,
      sourceHeight: sh,
    }
  } finally {
    disposeMediaEl(el)
  }
}

export interface ImportedMedia {
  asset: Asset
  url: string
  poster?: Poster
}

/** Store an uploaded file in IndexedDB and describe it as an asset (true duration + poster). */
export async function importMediaFile(file: File): Promise<ImportedMedia> {
  const kind: AssetKind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image'
  if (kind === 'image') throw new Error('importMediaFile handles video and audio only')
  const key = await putBlob(file, file.name)
  const url = (await getObjectUrl(key)) as string
  const name = file.name.replace(/\.[^/.]+$/, '') || (kind === 'video' ? 'Video' : 'Audio')
  try {
    if (kind === 'video') {
      const poster = await capturePoster(url)
      return {
        url,
        poster,
        asset: { id: makeId('asset'), kind, name, duration: poster.duration, width: poster.width, height: poster.height, src: { kind: 'idb', key }, poster: poster.dataUrl },
      }
    }
    const info = await probeMedia(url, 'audio')
    return { url, asset: { id: makeId('asset'), kind, name, duration: info.duration, src: { kind: 'idb', key } } }
  } catch (err) {
    deleteBlob(key).catch(e => ignoreError(e, 'cleanup of an unreadable upload'))
    throw err
  }
}

/** Replace a missing asset's media with a new file (same asset id, so clips keep working). */
export async function relinkAssetFile(asset: Asset, file: File): Promise<Partial<Asset>> {
  const imported = await importMediaFile(file)
  const { id: _ignored, ...rest } = imported.asset
  void _ignored
  return { ...rest, name: asset.name || rest.name, needsProbe: false }
}
