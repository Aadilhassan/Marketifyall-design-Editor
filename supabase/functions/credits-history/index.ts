import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticate, getServiceClient } from '../_shared/auth.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }

  try {
    const user = await authenticate(req)
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    const db = getServiceClient()

    const { data, error, count } = await db
      .from('credit_transactions')
      .select('id, type, amount, balance_after, ai_action, ai_provider, ai_model, status, created_at, stripe_payment_id', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return new Response(JSON.stringify({
      transactions: data || [],
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    }), { status: 200, headers })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error'
    if (msg === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers })
  }
})
