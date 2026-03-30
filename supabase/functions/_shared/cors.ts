/**
 * CORS helper for Supabase Edge Functions
 * Dynamic origin validation per spec Section 11.3
 */

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/([a-z0-9-]+\.)?marketifyall\.com$/,
]

const DEV_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
]

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false

  const isDev = Deno.env.get('ENVIRONMENT') === 'development'
  const patterns = isDev
    ? [...ALLOWED_ORIGIN_PATTERNS, ...DEV_ORIGINS]
    : ALLOWED_ORIGIN_PATTERNS

  return patterns.some(p => p.test(origin))
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const allowed = isAllowedOrigin(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin : '',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key, x-client-info, apikey',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  return null
}
