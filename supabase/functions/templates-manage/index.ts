/**
 * Templates Manage Edge Function
 * Authenticated endpoints for updating and deleting own templates
 *
 * PATCH /api/templates/manage?id=<template_id>  — update own template (draft/rejected/pending_review only)
 * DELETE /api/templates/manage?id=<template_id> — delete own template
 * Auth: JWT or API key
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticate, getServiceClient } from '../_shared/auth.ts'

const EDITABLE_STATUSES = ['draft', 'rejected', 'pending_review']

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }

  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    })
  }

  try {
    // 1. Authenticate
    const user = await authenticate(req)

    // 2. Get template ID from query params
    const url = new URL(req.url)
    const templateId = url.searchParams.get('id')

    if (!templateId) {
      return new Response(JSON.stringify({ error: 'Missing required query parameter: id' }), {
        status: 400,
        headers,
      })
    }

    const db = getServiceClient()

    // 3. Verify ownership
    const { data: template, error: fetchError } = await db
      .from('marketplace_templates')
      .select('id, author_id, status')
      .eq('id', templateId)
      .single()

    if (fetchError || !template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers,
      })
    }

    if (template.author_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: you do not own this template' }), {
        status: 403,
        headers,
      })
    }

    // 4. Handle PATCH (update)
    if (req.method === 'PATCH') {
      if (!EDITABLE_STATUSES.includes(template.status)) {
        return new Response(JSON.stringify({
          error: 'Cannot edit template with status: ' + template.status,
          editable_statuses: EDITABLE_STATUSES,
        }), {
          status: 409,
          headers,
        })
      }

      const body = await req.json()
      const allowedFields = ['name', 'description', 'category', 'subcategory', 'cms_context', 'tags', 'canvas_data', 'frame', 'thumbnail_url']
      const updates: Record<string, unknown> = {}

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
          status: 400,
          headers,
        })
      }

      const { data, error } = await db
        .from('marketplace_templates')
        .update(updates)
        .eq('id', templateId)
        .eq('author_id', user.id)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(data), { status: 200, headers })
    }

    // 5. Handle DELETE
    if (req.method === 'DELETE') {
      const { error } = await db
        .from('marketplace_templates')
        .delete()
        .eq('id', templateId)
        .eq('author_id', user.id)

      if (error) throw error

      return new Response(JSON.stringify({ deleted: true, id: templateId }), { status: 200, headers })
    }

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
