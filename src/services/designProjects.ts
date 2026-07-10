import { supabase } from '../lib/supabase'

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

export async function fetchDesignProject(id: string): Promise<DesignProjectRecord | null> {
  const { data } = await supabase
    .from('design_projects')
    .select('id, name, design_json, preview_url')
    .eq('id', id)
    .maybeSingle()
  return (data as DesignProjectRecord | null) ?? null
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
    const { error } = await supabase
      .from('design_projects')
      .update({
        name: opts.name,
        design_json: opts.designJson,
        ...(opts.previewUrl ? { preview_url: opts.previewUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', opts.id)
    return error ? null : opts.id
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
