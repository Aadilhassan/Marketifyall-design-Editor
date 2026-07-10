import { supabase } from '../lib/supabase'
import { fnv1a } from '../utils/saveManager'

export interface DesignProjectRecord {
  id: string
  name: string
  design_json: Record<string, unknown>
  preview_url: string | null
}

/** Server-backed design ids are Postgres UUIDs (local IndexedDB ids are nanoids). */
export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/** Discriminates "the fetch failed" (transient/network/RLS error) from
 *  "the fetch worked and there is genuinely no such row". Callers must NOT
 *  treat ok:false as "no row" — saving over an unconfirmed id can overwrite
 *  or fake-succeed. */
export type FetchDesignResult = { ok: true; record: DesignProjectRecord | null } | { ok: false }

export async function fetchDesignProject(id: string): Promise<FetchDesignResult> {
  const { data, error } = await supabase
    .from('design_projects')
    .select('id, name, design_json, preview_url')
    .eq('id', id)
    .maybeSingle()
  if (error) return { ok: false }
  return { ok: true, record: (data as DesignProjectRecord | null) ?? null }
}

// Design ids confirmed to exist on the server this session (fetched ok with a
// record). Save handlers only UPDATE ids in this set (or ids returned by their
// own insert); anything else INSERTs a new row. This is what prevents a
// transient load error from being silently overwritten by a blank canvas, and
// a deleted row from producing a fake-success save.
const serverLoadedIds = new Set<string>()

export function markLoadedFromServer(id: string): void {
  serverLoadedIds.add(id)
}

export function wasLoadedFromServer(id: string): boolean {
  return serverLoadedIds.has(id)
}

// Content hash of what the server last saw for a design id, in exportToJSON
// space (captured after import settles, and again on every successful save).
// The embed navbar's Back button compares against this to warn about unsaved
// changes. Hash both sides with contentHashOf so the comparison is apples to
// apples.
const serverBaselines = new Map<string, string>()

export function contentHashOf(designJson: unknown): string {
  return fnv1a(JSON.stringify(designJson ?? null))
}

export function setServerBaseline(id: string, contentHash: string): void {
  serverBaselines.set(id, contentHash)
}

export function getServerBaseline(id: string): string | null {
  return serverBaselines.get(id) ?? null
}

export async function saveDesignProject(opts: {
  id: string | null
  workspaceId: string
  userId: string
  name: string
  designJson: Record<string, unknown>
  previewUrl: string | null
}): Promise<string | null> {
  if (opts.id) {
    // .select('id') makes a 0-row update (row deleted / not visible) detectable
    // instead of a silent fake success. Callers only pass ids confirmed via
    // fetch or a prior insert, so 0 rows here should be near-impossible — but
    // when it happens the null return surfaces the save-failed toast.
    const { data: rows, error } = await supabase
      .from('design_projects')
      .update({
        name: opts.name,
        design_json: opts.designJson,
        ...(opts.previewUrl ? { preview_url: opts.previewUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', opts.id)
      .select('id')
    return error || !rows || rows.length === 0 ? null : opts.id
  }
  const { data, error } = await supabase
    .from('design_projects')
    .insert({
      workspace_id: opts.workspaceId,
      created_by: opts.userId,
      name: opts.name,
      design_json: opts.designJson,
      preview_url: opts.previewUrl,
    })
    .select('id')
    .single()
  return error ? null : data.id
}

/** Upload a file through the app's media API (cookie credentials). Returns the public URL. */
export async function uploadMediaFile(appUrl: string, workspaceId: string, file: File): Promise<string | null> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('workspaceId', workspaceId)
    const res = await fetch(`${appUrl}/api/media/upload`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    })
    if (!res.ok) return null
    const uploaded = await res.json()
    return uploaded?.url || uploaded?.file?.url || uploaded?.path || null
  } catch {
    return null
  }
}

/** Upload the preview PNG through the app's media API (cookie credentials). */
export async function uploadPreview(appUrl: string, workspaceId: string, dataUrl: string, name: string): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], `${name || 'design'}.png`, { type: 'image/png' })
    return await uploadMediaFile(appUrl, workspaceId, file)
  } catch {
    return null // preview is best-effort; never fail the save on it
  }
}
