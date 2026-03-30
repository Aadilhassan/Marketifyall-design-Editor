/**
 * Marketifyall Webflow Extension - Entry Point
 *
 * Mounts the quick-actions widget inside the Webflow Designer sidebar panel.
 * Per spec Section 6.1.
 */

import { MarketifyallSDK } from '@marketifyall/cms-sdk'
import { QuickActions } from '@marketifyall/quick-actions'
import { pushAssetToWebflow, notifyWebflow } from './webflow-bridge'

// API key is stored in extension settings or hardcoded for development
// In production, this would come from the user's Webflow extension settings
const API_KEY = localStorage.getItem('mfa_api_key') || ''

function init(): void {
  const container = document.getElementById('app')
  if (!container) return

  // If no API key, show setup screen
  if (!API_KEY) {
    renderSetup(container)
    return
  }

  // Initialize the SDK
  const mfa = new MarketifyallSDK({
    apiKey: API_KEY,
    platform: 'webflow',
    onAssetReady: async (asset) => {
      const success = await pushAssetToWebflow(asset)
      if (success) {
        notifyWebflow('success', 'Design added to your page!')
      }
    },
  })

  // Mount the quick-actions widget
  QuickActions.mount(container, {
    sdk: mfa,
    mode: 'compact',
    features: ['generate', 'templates', 'bg-remove', 'enhance'],
    templateFilters: {
      cms_context: 'webflow',
    },
    onResult: async (asset) => {
      await pushAssetToWebflow(asset)
    },
  })
}

function renderSetup(container: HTMLElement): void {
  container.innerHTML = `
    <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">M</div>
        <h2 style="font-size: 18px; margin: 0 0 4px;">Marketifyall</h2>
        <p style="font-size: 13px; color: #6b7280; margin: 0;">AI-powered design editor for Webflow</p>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px;">API Key</label>
        <input
          id="mfa-api-key-input"
          type="text"
          placeholder="mfa_..."
          style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; box-sizing: border-box; outline: none;"
        />
        <p style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">
          Get your API key from <a href="https://dashboard.marketifyall.com/api-keys" target="_blank" style="color: #5A3FFF;">dashboard.marketifyall.com</a>
        </p>
      </div>

      <button
        id="mfa-save-key-btn"
        style="width: 100%; padding: 12px; border: none; border-radius: 8px; background: #5A3FFF; color: white; font-weight: 600; font-size: 14px; cursor: pointer;"
      >
        Connect
      </button>

      <div style="text-align: center; margin-top: 16px;">
        <a href="https://marketifyall.com/signup" target="_blank" style="font-size: 12px; color: #5A3FFF;">
          Don't have an account? Sign up free
        </a>
      </div>
    </div>
  `

  const btn = container.querySelector('#mfa-save-key-btn') as HTMLButtonElement
  const input = container.querySelector('#mfa-api-key-input') as HTMLInputElement

  btn?.addEventListener('click', () => {
    const key = input?.value?.trim()
    if (key && key.startsWith('mfa_')) {
      localStorage.setItem('mfa_api_key', key)
      window.location.reload()
    } else {
      input.style.borderColor = '#EF4444'
      input.placeholder = 'Enter a valid API key (starts with mfa_)'
    }
  })

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn?.click()
  })
}

// Boot
document.addEventListener('DOMContentLoaded', init)
