/**
 * AI Proxy Edge Function
 * Routes all AI calls through credit metering per spec Sections 4.4 and 12.1
 *
 * POST /api/ai/proxy
 * Body: { action, model, messages, ...params }
 * Auth: JWT or API key
 *
 * Flow: authenticate -> rate limit -> deduct credits (hold) -> proxy to provider -> confirm or refund
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticate, getServiceClient } from '../_shared/auth.ts'
import { getCreditCost } from '../_shared/credits.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || ''
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

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
    // 1. Authenticate
    const user = await authenticate(req)

    // 2. Parse body
    const body = await req.json()
    const { action, model, messages, ...params } = body

    if (!action || !messages) {
      return new Response(JSON.stringify({ error: 'Missing required fields: action, messages' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // 3. Rate limit check
    const rateResult = await checkRateLimit(user.id, user.plan || 'free', 'ai_actions')
    if (!rateResult.allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited', retry_after: rateResult.retryAfter }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': String(rateResult.retryAfter || 60) },
      })
    }

    // 4. Get credit cost
    let cost: number
    try {
      cost = getCreditCost(action)
    } catch {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // 5. Deduct credits (hold phase)
    const db = getServiceClient()
    const { data: deductResult, error: deductError } = await db.rpc('deduct_credits', {
      p_user_id: user.id,
      p_cost: cost,
      p_action: action,
      p_provider: 'openrouter',
      p_model: model || 'default',
    })

    if (deductError) {
      if (deductError.message?.includes('insufficient_credits')) {
        const parts = deductError.message.split(':')
        const balance = parseInt(parts[1]) || 0
        return new Response(JSON.stringify({
          error: 'insufficient_credits',
          balance,
          cost,
          upgrade_url: 'https://marketifyall.com/pricing',
        }), {
          status: 402,
          headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }
      throw deductError
    }

    const transactionId = deductResult?.[0]?.transaction_id
    const remainingCredits = deductResult?.[0]?.remaining_credits ?? 0

    // 6. Proxy to OpenRouter
    let aiResponse: Response
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout

      aiResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://marketifyall.com',
          'X-Title': 'Marketifyall Design Editor',
        },
        body: JSON.stringify({
          model: model || 'anthropic/claude-3.5-sonnet',
          messages,
          ...params,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)
    } catch (fetchError) {
      // 7b. Provider failed -- refund credits
      if (transactionId) {
        await db.rpc('refund_credit_transaction', { p_transaction_id: transactionId })
      }
      return new Response(JSON.stringify({
        error: 'ai_provider_error',
        message: 'AI generation failed. Your credits have been refunded.',
        credits_remaining: remainingCredits + cost,
      }), {
        status: 503,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // Check if provider returned an error
    if (!aiResponse.ok) {
      // Refund on provider error
      if (transactionId) {
        await db.rpc('refund_credit_transaction', { p_transaction_id: transactionId })
      }
      const errorBody = await aiResponse.text().catch(() => 'Unknown error')
      return new Response(JSON.stringify({
        error: 'ai_provider_error',
        message: 'AI generation failed. Your credits have been refunded.',
        details: errorBody,
        credits_remaining: remainingCredits + cost,
      }), {
        status: 503,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // 7a. Success -- confirm transaction
    if (transactionId) {
      await db.rpc('confirm_credit_transaction', { p_transaction_id: transactionId })
    }

    // 8. Return AI response with credit info
    const aiData = await aiResponse.json()

    return new Response(JSON.stringify({
      ...aiData,
      _credits: {
        cost,
        remaining: remainingCredits,
      },
    }), {
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
