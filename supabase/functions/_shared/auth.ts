/**
 * Authentication helper for Edge Functions
 * Supports JWT (Supabase Auth) and API key auth per spec Section 11.1
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sha256 } from './crypto.ts'

export interface AuthUser {
  id: string
  email?: string
  plan?: string
  scopes?: string[]
  authMethod: 'jwt' | 'api_key'
}

function getSupabaseClient(serviceRole = false) {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = serviceRole
    ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    : Deno.env.get('SUPABASE_ANON_KEY')!
  return createClient(url, key)
}

async function authenticateJWT(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // Get plan from users table
  const admin = getSupabaseClient(true)
  const { data: profile } = await admin
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email,
    plan: profile?.plan || 'free',
    authMethod: 'jwt',
  }
}

async function authenticateApiKey(req: Request): Promise<AuthUser | null> {
  const apiKey = req.headers.get('X-API-Key')
  if (!apiKey?.startsWith('mfa_')) return null

  const keyHash = await sha256(apiKey)
  const admin = getSupabaseClient(true)

  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id, scopes')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .or('expires_at.is.null,expires_at.gt.now()')
    .single()

  if (error || !data) return null

  // Update last_used_at
  await admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  // Get user plan
  const { data: profile } = await admin
    .from('users')
    .select('plan, email')
    .eq('id', data.user_id)
    .single()

  return {
    id: data.user_id,
    email: profile?.email,
    plan: profile?.plan || 'free',
    scopes: data.scopes,
    authMethod: 'api_key',
  }
}

export async function authenticate(req: Request): Promise<AuthUser> {
  // Try JWT first, then API key
  const jwtUser = await authenticateJWT(req)
  if (jwtUser) return jwtUser

  const apiKeyUser = await authenticateApiKey(req)
  if (apiKeyUser) return apiKeyUser

  throw new Error('Unauthorized')
}

export function getServiceClient() {
  return getSupabaseClient(true)
}
