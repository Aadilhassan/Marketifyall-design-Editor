export interface SDKConfig {
  apiKey: string
  platform: 'webflow' | 'shopify' | 'wordpress' | 'custom'
  apiUrl?: string  // defaults to https://api.marketifyall.com
  editorUrl?: string  // defaults to https://marketifyall.com/embed
  onAssetReady?: (asset: ExportedAsset) => void
}

export interface ExportedAsset {
  url: string
  blob: Blob | null
  width: number
  height: number
  format: string
  name: string
}

export interface CreditBalance {
  subscription_credits: number
  topup_credits: number
  total: number
  plan: string
  credits_reset_at: string | null
}

export interface MarketplaceTemplate {
  id: string
  name: string
  description: string
  thumbnail_url: string
  canvas_data: unknown
  frame: { width: number; height: number }
  category: string
  subcategory: string
  cms_context: string[]
  tags: string[]
  use_count: number
}

export interface TemplateFilters {
  category?: string
  cms?: string
  sort?: 'trending' | 'new'
  page?: number
  limit?: number
}

export type SDKEvent =
  | 'credits:low'
  | 'credits:exhausted'
  | 'credits:updated'
  | 'export:complete'
  | 'editor:opened'
  | 'editor:closed'
  | 'error'
