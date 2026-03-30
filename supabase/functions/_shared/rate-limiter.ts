/**
 * Sliding window rate limiter using PostgreSQL
 * Per spec Section 11.4
 */

import { RATE_LIMITS } from './credits.ts'
import { getServiceClient } from './auth.ts'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number
}

export async function checkRateLimit(
  userId: string,
  plan: string,
  endpointGroup: string
): Promise<RateLimitResult> {
  const limits = RATE_LIMITS[endpointGroup]
  if (!limits) return { allowed: true, remaining: 999 }

  const limit = limits[plan] || limits.free
  const isHourly = endpointGroup === 'template_submit'
  const windowMs = isHourly ? 3600000 : 60000
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString()

  const db = getServiceClient()

  // Upsert the rate limit entry
  const { data, error } = await db.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_endpoint_group: endpointGroup,
    p_window_start: windowStart,
  })

  // If the RPC doesn't exist yet, fall back to direct query
  if (error) {
    const { data: entry } = await db
      .from('rate_limit_entries')
      .upsert(
        { user_id: userId, endpoint_group: endpointGroup, window_start: windowStart, request_count: 1 },
        { onConflict: 'user_id,endpoint_group,window_start', ignoreDuplicates: false }
      )
      .select('request_count')
      .single()

    if (!entry) return { allowed: true, remaining: limit }

    // If we can't upsert+increment atomically, do a select+update
    const { data: current } = await db
      .from('rate_limit_entries')
      .select('request_count')
      .eq('user_id', userId)
      .eq('endpoint_group', endpointGroup)
      .eq('window_start', windowStart)
      .single()

    const count = current?.request_count || 0
    if (count >= limit) {
      const windowEnd = new Date(new Date(windowStart).getTime() + windowMs)
      const retryAfter = Math.ceil((windowEnd.getTime() - Date.now()) / 1000)
      return { allowed: false, remaining: 0, retryAfter }
    }

    await db
      .from('rate_limit_entries')
      .update({ request_count: count + 1 })
      .eq('user_id', userId)
      .eq('endpoint_group', endpointGroup)
      .eq('window_start', windowStart)

    return { allowed: true, remaining: limit - count - 1 }
  }

  const count = typeof data === 'number' ? data : 0
  if (count > limit) {
    const windowEnd = new Date(new Date(windowStart).getTime() + windowMs)
    const retryAfter = Math.ceil((windowEnd.getTime() - Date.now()) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  return { allowed: true, remaining: limit - count }
}
