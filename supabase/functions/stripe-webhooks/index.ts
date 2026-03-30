/**
 * Stripe Webhook Handler per spec Section 12.3
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getStripe, getWebhookSecret, TOPUP_PACKS, SUBSCRIPTION_PLANS } from '../_shared/stripe.ts'
import { getServiceClient } from '../_shared/auth.ts'
import { PLAN_CREDITS } from '../_shared/credits.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const stripe = getStripe()
  const webhookSecret = getWebhookSecret()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const body = await req.text()
  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 })
  }

  const db = getServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        if (!userId) break

        if (session.mode === 'payment') {
          // Top-up pack purchase
          const pack = session.metadata?.pack
          const credits = parseInt(session.metadata?.credits || '0')
          if (credits > 0) {
            await db.rpc('add_topup_credits', { p_user_id: userId, p_credits: credits })

            // If the RPC doesn't exist, do it manually
            const { data: balance } = await db
              .from('credit_balances')
              .select('topup_credits, subscription_credits')
              .eq('user_id', userId)
              .single()

            if (balance) {
              const newTopup = balance.topup_credits + credits
              await db.from('credit_balances')
                .update({ topup_credits: newTopup })
                .eq('user_id', userId)

              await db.from('credit_transactions').insert({
                user_id: userId,
                type: 'topup_purchase',
                amount: credits,
                balance_after: balance.subscription_credits + newTopup,
                status: 'confirmed',
                stripe_payment_id: session.payment_intent,
                metadata: { pack },
              })
            }
          }
        } else if (session.mode === 'subscription') {
          // Subscription activation
          const plan = session.metadata?.plan
          if (plan && ['creator', 'pro', 'team'].includes(plan)) {
            const planCredits = PLAN_CREDITS[plan] || 50

            await db.from('users').update({
              plan,
              plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              stripe_status: 'active',
            }).eq('id', userId)

            await db.from('credit_balances').update({
              subscription_credits: planCredits,
              credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }).eq('user_id', userId)

            const { data: balance } = await db
              .from('credit_balances')
              .select('subscription_credits, topup_credits')
              .eq('user_id', userId)
              .single()

            await db.from('credit_transactions').insert({
              user_id: userId,
              type: 'subscription_grant',
              amount: planCredits,
              balance_after: (balance?.subscription_credits || planCredits) + (balance?.topup_credits || 0),
              status: 'confirmed',
              metadata: { plan, event: 'checkout.session.completed' },
            })
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object
        const customerId = invoice.customer
        const { data: userRow } = await db
          .from('users')
          .select('id, plan')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userRow && userRow.plan !== 'free') {
          const planCredits = PLAN_CREDITS[userRow.plan] || 50
          await db.from('credit_balances').update({
            subscription_credits: planCredits,
            credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('user_id', userRow.id)

          await db.from('users').update({ stripe_status: 'active' }).eq('id', userRow.id)

          const { data: balance } = await db
            .from('credit_balances')
            .select('subscription_credits, topup_credits')
            .eq('user_id', userRow.id)
            .single()

          await db.from('credit_transactions').insert({
            user_id: userRow.id,
            type: 'subscription_grant',
            amount: planCredits,
            balance_after: (balance?.subscription_credits || planCredits) + (balance?.topup_credits || 0),
            status: 'confirmed',
            metadata: { plan: userRow.plan, event: 'invoice.paid' },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer
        await db.from('users').update({ stripe_status: 'past_due' }).eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer
        await db.from('users').update({
          plan: 'free',
          plan_expires_at: null,
          stripe_status: null,
        }).eq('stripe_customer_id', customerId)
        // Top-up credits preserved. Subscription credits revert at next reset.
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object
        const paymentIntent = dispute.payment_intent
        // Find user by payment and flag
        const { data: txn } = await db
          .from('credit_transactions')
          .select('user_id')
          .eq('stripe_payment_id', paymentIntent)
          .limit(1)
          .single()

        if (txn) {
          await db.from('users').update({ flagged_at: new Date().toISOString() }).eq('id', txn.user_id)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), { status: 500 })
  }
})
