/**
 * Local project persistence via IndexedDB.
 *
 * Each design is stored as a "project" so work survives reloads and powers the
 * dashboard. IndexedDB is used (not the deprecated Web SQL): it's the standard,
 * well-supported browser database with ample capacity for design JSON + thumbnails.
 */
import { nanoid } from 'nanoid'

export interface Project {
  id: string
  name: string
  json: any | null // fabric canvas.toJSON() payload
  thumbnail?: string // small data-URL preview for the dashboard
  frame?: { width: number; height: number } // chosen format size (applied on first open)
  createdAt: number
  updatedAt: number
}

const DB_NAME = 'marketifyall-editor'
const STORE = 'projects'
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt')
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (err) {
      reject(err)
    }
  })
  return dbPromise
}

function store(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE)
}

export const genProjectId = (): string => nanoid()

export async function listProjects(): Promise<Project[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'readonly').getAll()
    req.onsuccess = () => {
      const items = ((req.result as Project[]) || []).slice()
      items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      resolve(items)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getProject(id: string): Promise<Project | undefined> {
  if (!id) return undefined
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'readonly').get(id)
    req.onsuccess = () => resolve(req.result as Project | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'readwrite').put(project)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'readwrite').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function createProject(
  name = 'Untitled design',
  frame?: { width: number; height: number },
): Promise<Project> {
  const now = Date.now()
  const project: Project = { id: genProjectId(), name, json: null, frame, createdAt: now, updatedAt: now }
  await saveProject(project)
  return project
}

/** Merge a partial update into an existing project (or create it), bumping updatedAt. */
export async function patchProject(id: string, patch: Partial<Project>): Promise<Project> {
  const existing = await getProject(id)
  const now = Date.now()
  const base: Project = existing || { id, name: 'Untitled design', json: null, createdAt: now, updatedAt: now }
  const updated: Project = { ...base, ...patch, id, updatedAt: now }
  await saveProject(updated)
  return updated
}

/** Duplicate a project under a new id. Returns the new project (or undefined). */
export async function duplicateProject(id: string): Promise<Project | undefined> {
  const src = await getProject(id)
  if (!src) return undefined
  const now = Date.now()
  const copy: Project = { ...src, id: genProjectId(), name: `${src.name} (copy)`, createdAt: now, updatedAt: now }
  await saveProject(copy)
  return copy
}
