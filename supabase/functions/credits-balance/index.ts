import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticate, getServiceClient } from '../_shared/auth.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }

  try {
    const user = await authenticate(req)
    const db = getServiceClient()

    const { data, error } = await db
      .from('credit_balances')
      .select('subscription_credits, topup_credits, credits_reset_at')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return new Response(JSON.stringify({
        subscription_credits: 0,
        topup_credits: 0,
        total: 0,
        plan: user.plan || 'free',
        credits_reset_at: null,
      }), { status: 200, headers })
    }

    return new Response(JSON.stringify({
      subscription_credits: data.subscription_credits,
      topup_credits: data.topup_credits,
      total: data.subscription_credits + data.topup_credits,
      plan: user.plan || 'free',
      credits_reset_at: data.credits_reset_at,
    }), { status: 200, headers })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error'
    if (msg === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers })
  }
})
