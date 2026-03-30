/**
 * MarketifyallSDK -- the main entry point for CMS integrations.
 * Per spec Section 5.1.
 */

import { ApiClient } from './api'
import { EventBus } from './events'
import type { SDKConfig, ExportedAsset, CreditBalance, MarketplaceTemplate, TemplateFilters } from './types'

const DEFAULT_API_URL = 'https://api.marketifyall.com'
const DEFAULT_EDITOR_URL = 'https://marketifyall.com/embed'

export class MarketifyallSDK {
  private config: Required<SDKConfig>
  private api: ApiClient
  private modalIframe: HTMLIFrameElement | null = null
  private modalOverlay: HTMLDivElement | null = null
  private nonce: string
  readonly events: EventBus

  constructor(config: SDKConfig) {
    this.config = {
      apiUrl: DEFAULT_API_URL,
      editorUrl: DEFAULT_EDITOR_URL,
      onAssetReady: () => {},
      ...config,
    }
    this.api = new ApiClient(this.config.apiUrl, this.config.apiKey)
    this.events = new EventBus()
    this.nonce = this.generateNonce()

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage)
    }
  }

  // ── Auth ───────────────────────────────────────────────────

  readonly auth = {
    getUser: async () => {
      return this.api.get<{ id: string; email: string; plan: string }>('/credits-balance')
    },
  }

  // ── Credits ────────────────────────────────────────────────

  readonly credits = {
    getBalance: async (): Promise<CreditBalance> => {
      return this.api.get<CreditBalance>('/credits-balance')
    },

    canAfford: async (action: string): Promise<boolean> => {
      const costs: Record<string, number> = {
        ai_text_generation: 1, ai_design_suggestions: 2, ai_background_removal: 3,
        ai_image_enhance: 5, ai_image_generation: 8, ai_full_design: 10, ai_video_scene: 15,
      }
      try {
        const balance = await this.credits.getBalance()
        return balance.total >= (costs[action] || 0)
      } catch {
        return false
      }
    },

    onLow: (callback: (balance: CreditBalance) => void) => {
      return this.events.on('credits:low', callback as any)
    },
  }

  // ── Editor Modal ───────────────────────────────────────────

  readonly editor = {
    openModal: (options?: { templateId?: string; imageUrl?: string; width?: string; height?: string }) => {
      if (this.modalIframe) return  // already open

      this.nonce = this.generateNonce()

      // Create overlay
      this.modalOverlay = document.createElement('div')
      Object.assign(this.modalOverlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.6)', zIndex: '999999',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      })

      // Create iframe
      this.modalIframe = document.createElement('iframe')
      Object.assign(this.modalIframe.style, {
        width: options?.width || '95vw', height: options?.height || '90vh',
        border: 'none', borderRadius: '12px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      })
      this.modalIframe.src = `${this.config.editorUrl}?embed=true&platform=${this.config.platform}`
      this.modalIframe.allow = 'clipboard-write'

      // Close on overlay click
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) this.editor.closeModal()
      })

      // Close on Escape
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.editor.closeModal()
          document.removeEventListener('keydown', escHandler)
        }
      }
      document.addEventListener('keydown', escHandler)

      this.modalOverlay.appendChild(this.modalIframe)
      document.body.appendChild(this.modalOverlay)

      // Wait for iframe to load, then send init
      this.modalIframe.addEventListener('load', () => {
        this.sendToEditor('mfa:init', {
          nonce: this.nonce,
          platform: this.config.platform,
          theme: 'light',
          ...(options?.templateId ? { templateId: options.templateId } : {}),
          ...(options?.imageUrl ? { imageUrl: options.imageUrl } : {}),
        })
      })

      this.events.emit('editor:opened')
    },

    closeModal: () => {
      if (this.modalOverlay) {
        document.body.removeChild(this.modalOverlay)
        this.modalOverlay = null
        this.modalIframe = null
        this.events.emit('editor:closed')
      }
    },

    onExport: (callback: (asset: ExportedAsset) => void) => {
      return this.events.on('export:complete', callback as any)
    },
  }

  // ── Quick Actions (AI proxy) ──────────────────────────────

  readonly quickActions = {
    generate: async (prompt: string) => {
      return this.api.post<{ choices: any[]; _credits: any }>('/ai-proxy', {
        action: 'ai_full_design',
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
      })
    },

    removeBackground: async (imageUrl: string) => {
      return this.api.post<any>('/ai-proxy', {
        action: 'ai_background_removal',
        model: 'replicate/remove-bg',
        messages: [{ role: 'user', content: imageUrl }],
      })
    },

    resize: async (imageUrl: string, dimensions: { w: number; h: number }) => {
      return this.api.post<any>('/ai-proxy', {
        action: 'ai_image_enhance',
        model: 'default',
        messages: [{ role: 'user', content: JSON.stringify({ imageUrl, ...dimensions }) }],
      })
    },

    enhance: async (imageUrl: string) => {
      return this.api.post<any>('/ai-proxy', {
        action: 'ai_image_enhance',
        model: 'default',
        messages: [{ role: 'user', content: imageUrl }],
      })
    },
  }

  // ── Templates ──────────────────────────────────────────────

  readonly templates = {
    browse: async (filters?: TemplateFilters) => {
      const params = new URLSearchParams()
      if (filters?.category) params.set('category', filters.category)
      if (filters?.cms) params.set('cms', filters.cms)
      if (filters?.sort) params.set('sort', filters.sort)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.limit) params.set('limit', String(filters.limit))
      return this.api.get<{ templates: MarketplaceTemplate[]; total: number }>(
        `/templates-browse?${params.toString()}`
      )
    },

    search: async (query: string) => {
      return this.api.get<{ templates: MarketplaceTemplate[] }>(
        `/templates-search?q=${encodeURIComponent(query)}&cms=${this.config.platform}`
      )
    },
  }

  // ── Private ────────────────────────────────────────────────

  private generateNonce(): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private sendToEditor(type: string, data: Record<string, unknown> = {}): void {
    if (!this.modalIframe?.contentWindow) return
    this.modalIframe.contentWindow.postMessage(
      { type, nonce: this.nonce, ...data },
      this.config.editorUrl
    )
  }

  private handleMessage = (event: MessageEvent): void => {
    const { data } = event
    if (!data?.type?.startsWith('mfa:')) return
    if (data.nonce && data.nonce !== this.nonce) return

    switch (data.type) {
      case 'mfa:ready':
        break

      case 'mfa:export': {
        const asset: ExportedAsset = data.asset || {
          url: data.url || '',
          blob: null,
          width: data.width || 0,
          height: data.height || 0,
          format: data.format || 'png',
          name: data.name || 'design',
        }
        this.events.emit('export:complete', asset)
        this.config.onAssetReady(asset)
        this.editor.closeModal()
        break
      }

      case 'mfa:credits-low':
        this.events.emit('credits:low', data)
        break

      case 'mfa:closed':
        this.editor.closeModal()
        break

      case 'mfa:error':
        this.events.emit('error', data)
        break
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleMessage)
    }
    this.editor.closeModal()
    this.events.removeAll()
  }
}
