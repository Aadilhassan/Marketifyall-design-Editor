import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticate, getServiceClient } from '../_shared/auth.ts'
import { getStripe, TOPUP_PACKS, SUBSCRIPTION_PLANS } from '../_shared/stripe.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const user = await authenticate(req)
    const body = await req.json()
    const { action, pack, plan } = body
    const stripe = getStripe()
    const db = getServiceClient()

    // Get or create Stripe customer
    const { data: profile } = await db
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await db.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const successUrl = `https://marketifyall.com/billing/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = 'https://marketifyall.com/billing/cancel'

    if (action === 'subscribe' && plan) {
      // Subscription checkout
      const planConfig = SUBSCRIPTION_PLANS[plan]
      if (!planConfig) {
        return new Response(JSON.stringify({ error: `Invalid plan: ${plan}` }), { status: 400, headers })
      }
      const priceId = Deno.env.get(planConfig.priceEnvKey)
      if (!priceId) {
        return new Response(JSON.stringify({ error: 'Plan not configured' }), { status: 500, headers })
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { user_id: user.id, plan },
      })

      return new Response(JSON.stringify({ checkout_url: session.url }), { status: 200, headers })
    }

    if (pack) {
      // Top-up pack checkout
      const packConfig = TOPUP_PACKS[pack]
      if (!packConfig) {
        return new Response(JSON.stringify({ error: `Invalid pack: ${pack}` }), { status: 400, headers })
      }
      const priceId = Deno.env.get(packConfig.priceEnvKey)
      if (!priceId) {
        return new Response(JSON.stringify({ error: 'Pack not configured' }), { status: 500, headers })
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { user_id: user.id, pack, credits: String(packConfig.credits) },
      })

      return new Response(JSON.stringify({ checkout_url: session.url }), { status: 200, headers })
    }

    return new Response(JSON.stringify({ error: 'Specify action=subscribe with plan, or pack' }), { status: 400, headers })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error'
    if (msg === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers })
  }
})
