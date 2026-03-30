/**
 * QuickActions Widget
 * Lightweight inline widget for CMS dashboards. Per spec Section 5.2.
 * Renders with vanilla DOM (no React) to keep bundle small.
 */

import type { MarketifyallSDK, ExportedAsset, MarketplaceTemplate } from '@marketifyall/cms-sdk'
import { injectStyles, CLS } from './styles'

export interface QuickActionsConfig {
  sdk: MarketifyallSDK
  mode?: 'compact' | 'full'
  features?: Array<'generate' | 'templates' | 'bg-remove' | 'resize' | 'enhance'>
  templateFilters?: { cms_context?: string; category?: string }
  theme?: { primary?: string; radius?: number }
  onResult?: (asset: ExportedAsset) => void
}

export class QuickActions {
  private container: HTMLElement
  private config: QuickActionsConfig
  private sdk: MarketifyallSDK
  private creditBalance = 0
  private templates: MarketplaceTemplate[] = []
  private isGenerating = false

  static mount(selector: string | HTMLElement, config: QuickActionsConfig): QuickActions {
    const el = typeof selector === 'string' ? document.querySelector(selector) as HTMLElement : selector
    if (!el) throw new Error(`[mfa] Container not found: ${selector}`)
    return new QuickActions(el, config)
  }

  private constructor(container: HTMLElement, config: QuickActionsConfig) {
    this.container = container
    this.config = {
      mode: 'compact',
      features: ['generate', 'templates', 'bg-remove', 'enhance'],
      ...config,
    }
    this.sdk = config.sdk

    injectStyles()
    this.render()
    this.loadInitialData()

    // Listen for export events
    this.sdk.editor.onExport((asset: ExportedAsset) => {
      this.config.onResult?.(asset)
    })
  }

  private async loadInitialData(): Promise<void> {
    try {
      const [balance, templateResult] = await Promise.all([
        this.sdk.credits.getBalance(),
        this.sdk.templates.browse({
          cms: this.config.templateFilters?.cms_context,
          category: this.config.templateFilters?.category,
          limit: 8,
          sort: 'trending',
        }),
      ])
      this.creditBalance = balance.total
      this.templates = templateResult.templates || []
      this.updateCreditsDisplay()
      this.updateTemplatesGrid()
    } catch (e) {
      console.warn('[mfa] Failed to load initial data:', e)
    }
  }

  private render(): void {
    const features = this.config.features || []
    const hasGenerate = features.includes('generate')
    const hasTemplates = features.includes('templates')
    const hasBgRemove = features.includes('bg-remove')
    const hasEnhance = features.includes('enhance')

    this.container.innerHTML = `
      <div class="${CLS}-root">
        <div class="${CLS}-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Marketifyall
        </div>

        ${hasGenerate ? `
          <div class="${CLS}-section">
            <div class="${CLS}-section-title">AI Generate</div>
            <div class="${CLS}-prompt-row">
              <input class="${CLS}-input" id="mfa-prompt" placeholder="Describe what you need..." />
              <button class="${CLS}-btn-primary" id="mfa-generate-btn">Generate</button>
            </div>
            <div class="${CLS}-credit-cost">10 credits per generation</div>
            <div id="mfa-generate-result"></div>
          </div>
        ` : ''}

        ${hasTemplates ? `
          <div class="${CLS}-section">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div class="${CLS}-section-title" style="margin-bottom:0">Templates</div>
              <button class="${CLS}-see-all" id="mfa-see-all-templates">See all</button>
            </div>
            <div class="${CLS}-templates-grid" id="mfa-templates-grid">
              <!-- populated dynamically -->
            </div>
          </div>
        ` : ''}

        <div class="${CLS}-section">
          <div class="${CLS}-section-title">Quick Actions</div>
          <div class="${CLS}-actions-row">
            ${hasBgRemove ? `<button class="${CLS}-action-btn" id="mfa-bg-remove">Remove BG (3)</button>` : ''}
            ${hasEnhance ? `<button class="${CLS}-action-btn" id="mfa-enhance">Enhance (5)</button>` : ''}
            <button class="${CLS}-action-btn" id="mfa-full-editor" style="grid-column:1/-1;color:#5A3FFF;border-color:#5A3FFF;">
              Open Full Editor
            </button>
          </div>
        </div>

        <div class="${CLS}-footer">
          <div class="${CLS}-credits-badge" id="mfa-credits-display">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span id="mfa-credits-count">-- credits</span>
          </div>
          <a class="${CLS}-upgrade-link" href="https://marketifyall.com/pricing" target="_blank">Get more</a>
        </div>
      </div>
    `

    this.bindEvents()
  }

  private bindEvents(): void {
    // Generate button
    const genBtn = this.container.querySelector('#mfa-generate-btn') as HTMLButtonElement
    const promptInput = this.container.querySelector('#mfa-prompt') as HTMLInputElement
    if (genBtn && promptInput) {
      genBtn.addEventListener('click', () => this.handleGenerate(promptInput.value))
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleGenerate(promptInput.value)
      })
    }

    // Full editor button
    const editorBtn = this.container.querySelector('#mfa-full-editor')
    editorBtn?.addEventListener('click', () => this.sdk.editor.openModal())

    // See all templates
    const seeAllBtn = this.container.querySelector('#mfa-see-all-templates')
    seeAllBtn?.addEventListener('click', () => this.sdk.editor.openModal())
  }

  private async handleGenerate(prompt: string): Promise<void> {
    if (!prompt.trim() || this.isGenerating) return
    this.isGenerating = true

    const btn = this.container.querySelector('#mfa-generate-btn') as HTMLButtonElement
    const resultDiv = this.container.querySelector('#mfa-generate-result') as HTMLDivElement
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...' }

    try {
      const result = await this.sdk.quickActions.generate(prompt)
      if (resultDiv) {
        resultDiv.innerHTML = `<div style="padding:8px 0;color:#16A34A;font-size:12px">Design generated! Opening editor...</div>`
      }
      // Open editor with the generated design
      this.sdk.editor.openModal()
      this.refreshCredits()
    } catch (err: any) {
      if (resultDiv) {
        const msg = err.body?.error === 'insufficient_credits'
          ? `Not enough credits. <a class="${CLS}-upgrade-link" href="https://marketifyall.com/pricing" target="_blank">Get more</a>`
          : (err.message || 'Generation failed')
        resultDiv.innerHTML = `<div class="${CLS}-error">${msg}</div>`
      }
    } finally {
      this.isGenerating = false
      if (btn) { btn.disabled = false; btn.textContent = 'Generate' }
    }
  }

  private updateCreditsDisplay(): void {
    const el = this.container.querySelector('#mfa-credits-count')
    if (el) el.textContent = `${this.creditBalance} credits`
  }

  private updateTemplatesGrid(): void {
    const grid = this.container.querySelector('#mfa-templates-grid')
    if (!grid) return

    if (this.templates.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#9CA3AF;font-size:12px;padding:16px">No templates yet</div>`
      return
    }

    grid.innerHTML = this.templates.map(t => `
      <div class="${CLS}-template-card" data-template-id="${t.id}" title="${t.name}">
        ${t.thumbnail_url
          ? `<img src="${t.thumbnail_url}" alt="${t.name}" loading="lazy" />`
          : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#9CA3AF">${t.name}</div>`
        }
      </div>
    `).join('')

    // Bind click events
    grid.querySelectorAll(`.${CLS}-template-card`).forEach(card => {
      card.addEventListener('click', () => {
        const templateId = (card as HTMLElement).dataset.templateId
        if (templateId) this.sdk.editor.openModal({ templateId })
      })
    })
  }

  private async refreshCredits(): Promise<void> {
    try {
      const balance = await this.sdk.credits.getBalance()
      this.creditBalance = balance.total
      this.updateCreditsDisplay()
    } catch { /* ignore */ }
  }

  destroy(): void {
    this.container.innerHTML = ''
  }
}
