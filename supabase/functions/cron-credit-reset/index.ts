/**
 * Cron Credit Reset Edge Function
 * Invoked by pg_cron daily at midnight UTC
 * Resets subscription credits and handles past_due downgrades per spec Section 4.3
 *
 * Authenticates via service_role key in Authorization header
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getServiceClient } from '../_shared/auth.ts'
import { PLAN_CREDITS } from '../_shared/credits.ts'

/**
 * Verify the request is coming from an authorized service (pg_cron)
 * by checking the Authorization header matches the service_role key.
 */
function authenticateServiceRole(req: Request): void {
  const authHeader = req.headers.get('Authorization')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  }

  const token = authHeader?.replace('Bearer ', '')
  if (token !== serviceRoleKey) {
    throw new Error('Unauthorized')
  }
}

serve(async (req) => {
  try {
    // 1. Authenticate -- only service_role may invoke this function
    authenticateServiceRole(req)

    const db = getServiceClient()
    const now = new Date().toISOString()
    let resetCount = 0

    // 2. Query credit_balances due for reset
    const { data: dueBalances, error: fetchError } = await db
      .from('credit_balances')
      .select('user_id, credits_reset_at')
      .lte('credits_reset_at', now)

    if (fetchError) throw fetchError

    if (dueBalances && dueBalances.length > 0) {
      for (const balance of dueBalances) {
        // Look up user plan
        const { data: userProfile, error: userError } = await db
          .from('users')
          .select('plan')
          .eq('id', balance.user_id)
          .single()

        if (userError) {
          console.error(`Failed to fetch user ${balance.user_id}:`, userError.message)
          continue
        }

        const plan = userProfile?.plan || 'free'
        const creditAmount = PLAN_CREDITS[plan] ?? PLAN_CREDITS['free']

        // Calculate next reset date (current reset + 30 days)
        const currentResetAt = new Date(balance.credits_reset_at)
        const nextResetAt = new Date(currentResetAt.getTime() + 30 * 24 * 60 * 60 * 1000)

        // Reset subscription_credits and advance credits_reset_at
        const { error: updateError } = await db
          .from('credit_balances')
          .update({
            subscription_credits: creditAmount,
            credits_reset_at: nextResetAt.toISOString(),
          })
          .eq('user_id', balance.user_id)

        if (updateError) {
          console.error(`Failed to reset credits for user ${balance.user_id}:`, updateError.message)
          continue
        }

        // Log a subscription_grant credit_transaction
        const { error: txError } = await db
          .from('credit_transactions')
          .insert({
            user_id: balance.user_id,
            type: 'subscription_grant',
            amount: creditAmount,
            description: `Monthly credit reset for ${plan} plan`,
            created_at: now,
          })

        if (txError) {
          console.error(`Failed to log transaction for user ${balance.user_id}:`, txError.message)
          continue
        }

        resetCount++
      }
    }

    // 3. Handle past_due downgrades
    //    If stripe_status = 'past_due' for >7 days, downgrade to free
    let downgradeCount = 0
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: pastDueUsers, error: pastDueError } = await db
      .from('users')
      .select('id')
      .eq('stripe_status', 'past_due')
      .lte('stripe_status_updated_at', sevenDaysAgo)

    if (pastDueError) {
      console.error('Failed to query past_due users:', pastDueError.message)
    } else if (pastDueUsers && pastDueUsers.length > 0) {
      for (const user of pastDueUsers) {
        // Downgrade user plan to free
        const { error: downgradeError } = await db
          .from('users')
          .update({ plan: 'free', stripe_status: 'downgraded' })
          .eq('id', user.id)

        if (downgradeError) {
          console.error(`Failed to downgrade user ${user.id}:`, downgradeError.message)
          continue
        }

        // Reset their credits to the free tier amount
        const { error: creditError } = await db
          .from('credit_balances')
          .update({ subscription_credits: PLAN_CREDITS['free'] })
          .eq('user_id', user.id)

        if (creditError) {
          console.error(`Failed to reset credits for downgraded user ${user.id}:`, creditError.message)
        }

        downgradeCount++
      }
    }

    // 4. Return summary
    return new Response(JSON.stringify({
      success: true,
      credits_reset: resetCount,
      past_due_downgrades: downgradeCount,
      executed_at: now,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'

    if (message === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.error('Cron credit reset error:', message)

    return new Response(JSON.stringify({ error: 'Internal server error', message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
