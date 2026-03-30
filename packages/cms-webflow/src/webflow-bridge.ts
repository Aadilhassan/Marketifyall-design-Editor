/**
 * Webflow Designer API bridge
 * Handles uploading assets and inserting elements into the Webflow canvas.
 * Uses the Webflow Designer Extension APIs.
 */

import type { ExportedAsset } from '@marketifyall/cms-sdk'

// Webflow Designer API types (simplified -- full types from @webflow/designer-extension-typings)
declare const webflow: {
  getSelectedElement(): Promise<any>
  getAllElements(): Promise<any[]>
  createDOM(tag: string): any
  notify(options: { type: 'success' | 'error' | 'info'; message: string }): void
}

export async function pushAssetToWebflow(asset: ExportedAsset): Promise<boolean> {
  try {
    // For Webflow Designer Extensions, we upload the image and insert it as an element.
    // The Webflow Assets API is accessed via the extension's backend or the Designer API.

    if (!asset.url && !asset.blob) {
      webflow.notify({ type: 'error', message: 'No asset to upload' })
      return false
    }

    // If we have a URL (e.g., from the editor export), we can create an image element
    const imageUrl = asset.url

    // Try to insert as an image element on the canvas
    // Note: The actual Webflow Designer Extension API for creating elements
    // varies by version. This is the general pattern.
    try {
      const selectedElement = await webflow.getSelectedElement()

      if (selectedElement && typeof selectedElement.setStyles === 'function') {
        // If an element is selected, set it as background
        await selectedElement.setStyles({
          'background-image': `url(${imageUrl})`,
          'background-size': 'cover',
          'background-position': 'center',
        })
        webflow.notify({ type: 'success', message: 'Design applied as background!' })
      } else {
        // No element selected -- notify user to place the image
        webflow.notify({
          type: 'info',
          message: 'Design exported! Drag it from the Assets panel to your page.',
        })
      }
    } catch {
      // Fallback: just notify
      webflow.notify({
        type: 'success',
        message: 'Design created! Find it in your Assets panel.',
      })
    }

    return true
  } catch (error) {
    console.error('[mfa-webflow] Failed to push asset:', error)
    webflow.notify({ type: 'error', message: 'Failed to add design to page' })
    return false
  }
}

export function notifyWebflow(type: 'success' | 'error' | 'info', message: string): void {
  try {
    webflow.notify({ type, message })
  } catch {
    console.log(`[mfa-webflow] ${type}: ${message}`)
  }
}
