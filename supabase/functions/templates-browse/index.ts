/**
 * Templates Browse Edge Function
 * Public endpoint for browsing marketplace templates with filtering and pagination
 *
 * GET /api/templates/browse
 * Query params: category, subcategory, cms (array contains), sort (trending|new), page, limit
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
    const category = url.searchParams.get('category')
    const subcategory = url.searchParams.get('subcategory')
    const cms = url.searchParams.get('cms')
    const sort = url.searchParams.get('sort') || 'trending'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    const db = getServiceClient()

    // Build query
    let query = db
      .from('marketplace_templates')
      .select('*', { count: 'exact' })
      .eq('status', 'published')

    if (category) {
      query = query.eq('category', category)
    }

    if (subcategory) {
      query = query.eq('subcategory', subcategory)
    }

    if (cms) {
      query = query.contains('cms_context', [cms])
    }

    // Sort
    if (sort === 'new') {
      query = query.order('created_at', { ascending: false })
    } else {
      // Default: trending (by use_count descending)
      query = query.order('use_count', { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    const total = count ?? 0

    return new Response(JSON.stringify({
      templates: data || [],
      total,
      page,
      limit,
      has_more: offset + limit < total,
    }), { status: 200, headers })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    return new Response(JSON.stringify({ error: 'Internal server error', message }), {
      status: 500,
      headers,
    })
  }
})
