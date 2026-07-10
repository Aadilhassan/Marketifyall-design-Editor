import { supabase, APP_URL } from './supabase'

export interface EditorSession {
  userId: string
  workspaceId: string
  isDemo: boolean
}

/**
 * Resolve the signed-in user and active workspace. workspace_id comes from
 * the embed query param; standalone visits fall back to the user's first
 * active membership. No session → redirect to the app login.
 */
export async function resolveEditorSession(): Promise<EditorSession | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    window.location.assign(`${APP_URL}/auth/login`)
    return null
  }
  const params = new URLSearchParams(window.location.search)
  let workspaceId = params.get('workspace_id') ?? ''
  if (!workspaceId) {
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    workspaceId = data?.workspace_id ?? ''
  }
  return { userId: user.id, workspaceId, isDemo: params.get('demo') === 'true' }
}
