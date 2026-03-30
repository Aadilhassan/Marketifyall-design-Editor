/**
 * Templates Search Edge Function
 * Full-text search against marketplace templates
 *
 * GET /api/templates/search
 * Query params: q (search query, required), cms (optional array contains filter)
 * No auth required
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/auth.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    })
  }

  try {
    const url = new URL(req.url)
    const query = url.searchParams.get('q')
    const cms = url.searchParams.get('cms')

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required query parameter: q' }), {
        status: 400,
        headers,
      })
    }

    const db = getServiceClient()

    // Use PostgreSQL full-text search via textSearch filter
    let dbQuery = db
      .from('marketplace_templates')
      .select('*')
      .eq('status', 'published')
      .textSearch('fts_document', query, { type: 'plain', config: 'english' })

    if (cms) {
      dbQuery = dbQuery.contains('cms_context', [cms])
    }

    dbQuery = dbQuery.order('created_at', { ascending: false })

    const { data, error } = await dbQuery

    if (error) throw error

    return new Response(JSON.stringify({
      templates: data || [],
    }), { status: 200, headers })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    return new Response(JSON.stringify({ error: 'Internal server error', message }), {
      status: 500,
      headers,
    })
  }
})
