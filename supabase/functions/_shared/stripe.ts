/**
 * Stripe client initialization and helpers
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = Deno.env.get('STRIPE_SECRET_KEY')
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
    _stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' })
  }
  return _stripe
}

export const TOPUP_PACKS: Record<string, { credits: number; priceEnvKey: string }> = {
  starter: { credits: 100, priceEnvKey: 'STRIPE_PRICE_STARTER' },
  growth: { credits: 500, priceEnvKey: 'STRIPE_PRICE_GROWTH' },
  power: { credits: 2000, priceEnvKey: 'STRIPE_PRICE_POWER' },
}

export const SUBSCRIPTION_PLANS: Record<string, { priceEnvKey: string }> = {
  creator: { priceEnvKey: 'STRIPE_PRICE_CREATOR' },
  pro: { priceEnvKey: 'STRIPE_PRICE_PRO' },
}

export function getWebhookSecret(): string {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured')
  return secret
}
