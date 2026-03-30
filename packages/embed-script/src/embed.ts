/**
 * Marketifyall Universal Embed Script
 * One-line integration for any website.
 *
 * Usage:
 *   <div id="marketifyall"></div>
 *   <script src="https://cdn.marketifyall.com/sdk/v1/embed.js"></script>
 *   <script>
 *     Marketifyall.init({
 *       container: '#marketifyall',
 *       apiKey: 'mfa_...',
 *       mode: 'quick-actions',
 *       onExport: function(asset) { console.log(asset.url) }
 *     })
 *   </script>
 */

import { MarketifyallSDK, ExportedAsset } from '@marketifyall/cms-sdk'
import { QuickActions } from '@marketifyall/quick-actions'

interface EmbedConfig {
  container: string | HTMLElement
  apiKey: string
  mode?: 'quick-actions' | 'full-editor'
  platform?: 'webflow' | 'shopify' | 'wordpress' | 'custom'
  templateFilters?: { cms_context?: string; category?: string }
  onExport?: (asset: ExportedAsset) => void
}

let _sdk: MarketifyallSDK | null = null

export function init(config: EmbedConfig): void {
  const el = typeof config.container === 'string'
    ? document.querySelector(config.container) as HTMLElement
    : config.container

  if (!el) {
    console.error('[Marketifyall] Container not found:', config.container)
    return
  }

  _sdk = new MarketifyallSDK({
    apiKey: config.apiKey,
    platform: config.platform || 'custom',
    onAssetReady: config.onExport,
  })

  if (config.mode === 'full-editor') {
    // Just open the editor modal immediately
    _sdk.editor.openModal()
  } else {
    // Mount quick-actions widget
    QuickActions.mount(el, {
      sdk: _sdk,
      mode: 'compact',
      features: ['generate', 'templates', 'bg-remove', 'enhance'],
      templateFilters: config.templateFilters,
      onResult: config.onExport,
    })
  }
}

export function openEditor(options?: { templateId?: string; imageUrl?: string }): void {
  _sdk?.editor.openModal(options)
}

export function destroy(): void {
  _sdk?.destroy()
  _sdk = null
}
