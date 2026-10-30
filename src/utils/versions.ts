/**
 * Version history (Canva Pro "Version history").
 *
 * A version is a full multi-page snapshot of the design. Versions live in their
 * own IndexedDB database (`mfa-versions`) keyed by project id, separate from the
 * project store so a large history never slows down the autosave path.
 *
 * Pure logic (hashing, pruning, grouping, formatting) is exported for tests;
 * the IndexedDB I/O at the bottom is deliberately thin.
 */
import { nanoid } from 'nanoid'
import { fnv1a } from './saveManager'
import { log, ignoreError } from '../lib/logger'

export interface VersionPage {
  id: string
  json: any
  thumbnail?: string
}

export interface DesignSnapshot {
  pages: VersionPage[]
  activePage: number
}

export interface DesignVersion extends DesignSnapshot {
  id: string
  projectId: string
  createdAt: number
  label?: string
  auto: boolean
  /** Content hash of the pages' json (thumbnails excluded). */
  hash: string
}

export const MAX_AUTO_VERSIONS = 30
export const MAX_THUMBNAIL_CHARS = 200 * 1024
export const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000
export const LOCAL_PROJECT_KEY = 'local'

export const versionProjectKey = (routeId?: string | null): string => routeId || LOCAL_PROJECT_KEY

/** Cheap content hash of a snapshot: page order + json, ignoring thumbnails. */
export function snapshotHash(snapshot: DesignSnapshot): string {
  return fnv1a(JSON.stringify(snapshot.pages.map(p => [p.id, p.json ?? null])))
}

/** True when no page has any object — nothing worth versioning. */
export function isEmptySnapshot(snapshot: DesignSnapshot): boolean {
  return snapshot.pages.every(p => !p.json || !Array.isArray(p.json.objects) || p.json.objects.length === 0)
}

/** Drop data-URL thumbnails over the size guard so one huge page can't bloat history. */
export function guardThumbnails(pages: VersionPage[], maxChars = MAX_THUMBNAIL_CHARS): VersionPage[] {
  return pages.map(p => (p.thumbnail && p.thumbnail.length > maxChars ? { id: p.id, json: p.json } : p))
}

export function buildVersion(opts: {
  projectId: string
  snapshot: DesignSnapshot
  auto: boolean
  label?: string
  now?: number
  id?: string
}): DesignVersion {
  const label = opts.label?.trim()
  const pages = guardThumbnails(opts.snapshot.pages)
  return {
    id: opts.id ?? nanoid(),
    projectId: opts.projectId,
    createdAt: opts.now ?? Date.now(),
    ...(label ? { label } : {}),
    auto: opts.auto,
    pages,
    activePage: Math.min(Math.max(0, opts.snapshot.activePage), Math.max(0, pages.length - 1)),
    hash: snapshotHash(opts.snapshot),
  }
}

/** Ids of the oldest auto versions beyond `max`. Named (non-auto) versions are always kept. */
export function selectPrunable(versions: Pick<DesignVersion, 'id' | 'auto' | 'createdAt'>[], max = MAX_AUTO_VERSIONS): string[] {
  const autos = versions.filter(v => v.auto).sort((a, b) => b.createdAt - a.createdAt)
  return autos.slice(max).map(v => v.id)
}

/** Auto-save decision: only when there's content and it differs from the newest stored version. */
export function shouldAutoVersion(snapshot: DesignSnapshot, latestHash: string | null): boolean {
  if (isEmptySnapshot(snapshot)) return false
  return snapshotHash(snapshot) !== latestHash
}

export function sortNewestFirst<T extends { createdAt: number }>(versions: T[]): T[] {
  return versions.slice().sort((a, b) => b.createdAt - a.createdAt)
}

const startOfDay = (ts: number): number => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function dayLabel(ts: number, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  const d = new Date(ts)
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

export interface VersionGroup<T> {
  key: number
  label: string
  items: T[]
}

/** Group versions by calendar day (local time), newest day and newest item first. */
export function groupByDay<T extends { createdAt: number }>(versions: T[], now = Date.now()): VersionGroup<T>[] {
  const groups = new Map<number, T[]>()
  sortNewestFirst(versions).forEach(v => {
    const key = startOfDay(v.createdAt)
    const list = groups.get(key)
    if (list) list.push(v)
    else groups.set(key, [v])
  })
  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([key, items]) => ({ key, label: dayLabel(key, now), items }))
}

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 45) return 'Just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString()
}

export const exactTime = (ts: number): string => new Date(ts).toLocaleString()

/* ---------------------------------------------------------------- IndexedDB */

const DB_NAME = 'mfa-versions'
const STORE = 'versions'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('projectId', 'projectId')
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (err) {
      reject(err)
    }
  }).catch(err => {
    dbPromise = null // allow a retry on the next call
    throw err
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function listVersions(projectId: string): Promise<DesignVersion[]> {
  const items = await run<DesignVersion[]>('readonly', s => s.index('projectId').getAll(projectId))
  return sortNewestFirst(items || [])
}

export async function latestVersionHash(projectId: string): Promise<string | null> {
  const items = await listVersions(projectId)
  return items[0]?.hash ?? null
}

/** Store a version, then prune auto versions beyond the cap. */
export async function addVersion(version: DesignVersion): Promise<void> {
  await run('readwrite', s => s.put(version))
  try {
    const all = await listVersions(version.projectId)
    const prunable = selectPrunable(all)
    await Promise.all(prunable.map(id => run('readwrite', s => s.delete(id))))
  } catch (err) {
    log.warn('versions', 'pruning old auto versions failed', err)
  }
}

export async function saveVersion(opts: { projectId: string; snapshot: DesignSnapshot; auto: boolean; label?: string }): Promise<DesignVersion> {
  const version = buildVersion(opts)
  await addVersion(version)
  return version
}

export async function renameVersion(id: string, label: string): Promise<void> {
  const existing = await run<DesignVersion | undefined>('readonly', s => s.get(id))
  if (!existing) return
  const trimmed = label.trim()
  // Naming a version keeps it forever (pruning only touches unnamed auto versions).
  const next: DesignVersion = { ...existing, auto: trimmed ? false : existing.auto, label: trimmed || undefined }
  await run('readwrite', s => s.put(next))
}

export async function deleteVersion(id: string): Promise<void> {
  await run('readwrite', s => s.delete(id))
}

/**
 * Auto versions: every `intervalMs`, snapshot the design and store it when the
 * content changed since the newest stored version. Returns a stop function.
 */
export function startAutoVersions(
  projectId: string,
  snapshot: () => DesignSnapshot | null,
  intervalMs = AUTO_VERSION_INTERVAL_MS,
): () => void {
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      const snap = snapshot()
      if (!snap) return
      // Re-read every tick (cheap at a 10 min cadence) so versions saved from
      // the panel in the meantime count as the baseline.
      if (!shouldAutoVersion(snap, await latestVersionHash(projectId))) return
      await saveVersion({ projectId, snapshot: snap, auto: true })
    } catch (err) {
      log.warn('versions', 'auto version save failed', err)
    } finally {
      busy = false
    }
  }
  const timer = setInterval(() => {
    tick().catch(err => ignoreError(err, 'auto version tick already logged'))
  }, intervalMs)
  return () => clearInterval(timer)
}
