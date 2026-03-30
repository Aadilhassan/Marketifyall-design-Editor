/**
 * Templates Submit Edge Function
 * Authenticated endpoint for community template submissions
 *
 * POST /api/templates/submit
 * Body: { name, description, category, subcategory, cms_context[], tags[], canvas_data, frame, thumbnail_url }
 * Auth: JWT or API key
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticate, getServiceClient } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    })
  }

  try {
    // 1. Authenticate
    const user = await authenticate(req)

    // 2. Rate limit check
    const rateResult = await checkRateLimit(user.id, user.plan || 'free', 'template_submit')
    if (!rateResult.allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited', retry_after: rateResult.retryAfter }), {
        status: 429,
        headers: { ...headers, 'Retry-After': String(rateResult.retryAfter || 60) },
      })
    }

    // 3. Parse and validate body
    const body = await req.json()
    const { name, description, category, subcategory, cms_context, tags, canvas_data, frame, thumbnail_url } = body

    if (!name || !category || !canvas_data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, category, canvas_data' }), {
        status: 400,
        headers,
      })
    }

    // 4. Insert template
    const db = getServiceClient()

    const { data, error } = await db
      .from('marketplace_templates')
      .insert({
        name,
        description: description || null,
        category,
        subcategory: subcategory || null,
        cms_context: cms_context || [],
        tags: tags || [],
        canvas_data,
        frame: frame || null,
        thumbnail_url: thumbnail_url || null,
        source: 'community',
        status: 'pending_review',
        author_id: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(data), { status: 201, headers })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'

    if (message === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    }

    return new Response(JSON.stringify({ error: 'Internal server error', message }), {
      status: 500,
      headers,
    })
  }
})
