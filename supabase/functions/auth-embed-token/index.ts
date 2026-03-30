/**
 * Auth Embed Token Edge Function
 * Generates short-lived JWTs for embed integrations per spec Section 11.1
 *
 * POST /api/auth/embed-token
 * Body: { platform: string }  (e.g. 'webflow', 'shopify', 'wordpress')
 * Auth: API key (X-API-Key header)
 *
 * Returns: { token, expires_at }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticate } from '../_shared/auth.ts'

const VALID_PLATFORMS = ['webflow', 'shopify', 'wordpress']
const TOKEN_LIFETIME_SECONDS = 30 * 60 // 30 minutes

/**
 * Encode bytes to base64url (no padding)
 */
function base64url(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Encode a string to base64url
 */
function base64urlEncode(str: string): string {
  return base64url(new TextEncoder().encode(str))
}

/**
 * Sign a JWT using HMAC-SHA256 via Web Crypto API
 */
async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }

  const encodedHeader = base64urlEncode(JSON.stringify(header))
  const encodedPayload = base64urlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const keyData = new TextEncoder().encode(secret)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )

  const encodedSignature = base64url(new Uint8Array(signature))

  return `${signingInput}.${encodedSignature}`
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const headers = corsHeaders(req)

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Authenticate (JWT or API key)
    const user = await authenticate(req)

    // 2. Parse and validate body
    const body = await req.json()
    const { platform } = body

    if (!platform || typeof platform !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing required field: platform' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (!VALID_PLATFORMS.includes(platform)) {
      return new Response(JSON.stringify({
        error: `Invalid platform: ${platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // 3. Generate short-lived JWT
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET not configured')
    }

    const now = Math.floor(Date.now() / 1000)
    const exp = now + TOKEN_LIFETIME_SECONDS

    const payload = {
      sub: user.id,
      scope: 'embed',
      platform,
      iat: now,
      exp,
    }

    const token = await signJWT(payload, jwtSecret)
    const expiresAt = new Date(exp * 1000).toISOString()

    // 4. Return token
    return new Response(JSON.stringify({ token, expires_at: expiresAt }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'

    if (message === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Internal server error', message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
