/**
 * Marketifyall API Client
 * Replaces direct OpenRouter calls with credit-metered backend proxy.
 * Per spec Section 5.1 and implementation plan Step 10.
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────

export interface CreditBalance {
  subscription_credits: number
  topup_credits: number
  total: number
  plan: string
  credits_reset_at: string | null
}

export interface CreditTransaction {
  id: string
  type: string
  amount: number
  balance_after: number
  ai_action: string | null
  ai_provider: string | null
  ai_model: string | null
  status: string
  created_at: string
  stripe_payment_id: string | null
}

export interface CreditHistory {
  transactions: CreditTransaction[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

export interface AIProxyResponse {
  choices?: Array<{ message: { content: string } }>
  _credits?: { cost: number; remaining: number }
  [key: string]: any
}

export interface InsufficientCreditsError {
  balance: number
  cost: number
  upgrade_url: string
}

export interface TemplateFilters {
  category?: string
  subcategory?: string
  cms?: string
  sort?: 'trending' | 'new'
  page?: number
  limit?: number
}

export interface MarketplaceTemplate {
  id: string
  author_id: string | null
  name: string
  description: string
  thumbnail_url: string
  canvas_data: any
  frame: { width: number; height: number }
  category: string
  subcategory: string
  cms_context: string[]
  tags: string[]
  source: string
  schema_version: number
  use_count: number
  created_at: string
}

// ─── Event Bus ───────────────────────────────────────────────

type EventCallback = (data: any) => void
const eventListeners: Record<string, EventCallback[]> = {}

function emit(event: string, data: any) {
  const listeners = eventListeners[event] || []
  listeners.forEach(cb => cb(data))
}

export function onApiEvent(event: string, callback: EventCallback) {
  if (!eventListeners[event]) eventListeners[event] = []
  eventListeners[event].push(callback)
  return () => {
    eventListeners[event] = eventListeners[event].filter(cb => cb !== callback)
  }
}

// ─── Credit Cost Lookup (mirrors backend) ────────────────────

export const CREDIT_COSTS: Record<string, number> = {
  ai_text_generation: 1,
  ai_design_suggestions: 2,
  ai_background_removal: 3,
  ai_image_enhance: 5,
  ai_image_generation: 8,
  ai_full_design: 10,
  ai_video_scene: 15,
}

export function getCreditCost(action: string): number {
  return CREDIT_COSTS[action] || 0
}

// ─── API Client ──────────────────────────────────────────────

const API_URL = process.env.REACT_APP_API_URL || 'https://api.marketifyall.com'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` }
  }
  return {}
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 70000, // 70s to allow for 60s AI timeout + overhead
    headers: { 'Content-Type': 'application/json' },
  })

  // Intercept 402 (insufficient credits) and 429 (rate limited)
  client.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
      if (error.response?.status === 402) {
        const data = error.response.data as InsufficientCreditsError
        emit('credits:insufficient', data)
      } else if (error.response?.status === 429) {
        emit('rate:limited', error.response.data)
      }
      return Promise.reject(error)
    }
  )

  return client
}

const client = createClient()

// ─── API Methods ─────────────────────────────────────────────

export const marketifyallApi = {
  // ── AI Proxy ──────────────────────────────────────────────

  async aiProxy(
    action: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    params: Record<string, any> = {}
  ): Promise<AIProxyResponse> {
    // Try backend proxy first
    try {
      const headers = await getAuthHeaders()
      const { data } = await client.post('/ai-proxy', {
        action,
        model,
        messages,
        ...params,
      }, { headers })

      if (data._credits) {
        emit('credits:updated', data._credits)
      }
      return data
    } catch (backendErr: any) {
      // If backend is unreachable (network error, not deployed yet),
      // fall back to direct OpenRouter call for local development
      const isNetworkError = !backendErr.response
      const openRouterKey = process.env.REACT_APP_OPENROUTER_API_KEY
      if (isNetworkError && openRouterKey) {
        console.warn('[marketifyall-api] Backend unreachable, falling back to direct OpenRouter call')
        const { data } = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          { model, messages, ...params },
          { headers: { Authorization: `Bearer ${openRouterKey}`, 'Content-Type': 'application/json' }, timeout: 90000 },
        )
        return data
      }
      // Backend responded with an error (402, 429, etc.) — re-throw as normal
      throw backendErr
    }
  },

  // ── Credits ───────────────────────────────────────────────

  async getCreditsBalance(): Promise<CreditBalance> {
    const headers = await getAuthHeaders()
    const { data } = await client.get('/credits-balance', { headers })
    return data
  },

  async getCreditsHistory(page = 1, limit = 20): Promise<CreditHistory> {
    const headers = await getAuthHeaders()
    const { data } = await client.get(`/credits-history?page=${page}&limit=${limit}`, { headers })
    return data
  },

  async createTopupCheckout(pack: 'starter' | 'growth' | 'power'): Promise<{ checkout_url: string }> {
    const headers = await getAuthHeaders()
    const { data } = await client.post('/credits-topup', { pack }, { headers })
    return data
  },

  async createSubscriptionCheckout(plan: 'creator' | 'pro'): Promise<{ checkout_url: string }> {
    const headers = await getAuthHeaders()
    const { data } = await client.post('/credits-topup', { action: 'subscribe', plan }, { headers })
    return data
  },

  // ── Templates ─────────────────────────────────────────────

  async browseTemplates(filters: TemplateFilters = {}): Promise<{ templates: MarketplaceTemplate[]; total: number }> {
    const params = new URLSearchParams()
    if (filters.category) params.set('category', filters.category)
    if (filters.cms) params.set('cms', filters.cms)
    if (filters.sort) params.set('sort', filters.sort)
    if (filters.page) params.set('page', String(filters.page))
    if (filters.limit) params.set('limit', String(filters.limit))

    const { data } = await client.get(`/templates-browse?${params.toString()}`)
    return data
  },

  async searchTemplates(query: string, cms?: string): Promise<{ templates: MarketplaceTemplate[] }> {
    const params = new URLSearchParams({ q: query })
    if (cms) params.set('cms', cms)
    const { data } = await client.get(`/templates-search?${params.toString()}`)
    return data
  },

  async submitTemplate(templateData: {
    name: string
    description: string
    category: string
    subcategory?: string
    cms_context?: string[]
    tags?: string[]
    canvas_data: any
    frame: { width: number; height: number }
    thumbnail_url?: string
  }): Promise<MarketplaceTemplate> {
    const headers = await getAuthHeaders()
    const { data } = await client.post('/templates-submit', templateData, { headers })
    return data
  },

  async updateTemplate(id: string, updates: Partial<MarketplaceTemplate>): Promise<void> {
    const headers = await getAuthHeaders()
    await client.patch(`/templates-manage?id=${id}`, updates, { headers })
  },

  async deleteTemplate(id: string): Promise<void> {
    const headers = await getAuthHeaders()
    await client.delete(`/templates-manage?id=${id}`, { headers })
  },
}

export default marketifyallApi
