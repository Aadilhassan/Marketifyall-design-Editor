import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { log } from '@/lib/logger'

interface EmbedConfig {
  isEmbedMode: boolean
  callbackEnabled: boolean
  parentOrigin: string | null
  showBranding: boolean
  initialImage: string | null
  theme: 'light' | 'dark'
  nonce: string | null
  embedToken: string | null
  loadTemplateId: string | null
  loadImageUrl: string | null
}

interface EmbedContextType {
  config: EmbedConfig
  sendImageToParent: (imageDataUrl: string, metadata?: Record<string, any>) => void
  sendEventToParent: (eventType: string, data?: Record<string, any>) => void
  notifyReady: () => void
  notifyCancel: () => void
}

const defaultConfig: EmbedConfig = {
  isEmbedMode: false,
  callbackEnabled: false,
  parentOrigin: null,
  showBranding: true,
  initialImage: null,
  theme: 'light',
  nonce: null,
  embedToken: null,
  loadTemplateId: null,
  loadImageUrl: null,
}

const EmbedContext = createContext<EmbedContextType>({
  config: defaultConfig,
  sendImageToParent: () => {},
  sendEventToParent: () => {},
  notifyReady: () => {},
  notifyCancel: () => {},
})

export const useEmbedMode = () => useContext(EmbedContext)

const isDev = process.env.REACT_APP_ENVIRONMENT === 'development'

/**
 * Validate that an origin is in the allowed whitelist.
 * Allowed: *.marketifyall.com, and localhost (dev only).
 */
function isOriginAllowed(origin: string): boolean {
  try {
    const url = new URL(origin)
    const hostname = url.hostname

    // Allow *.marketifyall.com
    if (hostname === 'marketifyall.com' || hostname.endsWith('.marketifyall.com')) {
      return true
    }

    // Allow localhost in development
    if (isDev && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return true
    }

    return false
  } catch {
    return false
  }
}

interface EmbedProviderProps {
  children: React.ReactNode
}

export const EmbedProvider: React.FC<EmbedProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<EmbedConfig>(defaultConfig)
  const nonceRef = useRef<string | null>(null)
  const validatedOriginRef = useRef<string | null>(null)

  useEffect(() => {
    // Check if running in iframe
    const isInIframe = window.self !== window.top

    // Parse URL parameters for embed configuration
    const urlParams = new URLSearchParams(window.location.search)
    const embedParam = urlParams.get('embed')
    const callbackParam = urlParams.get('callback')
    const brandingParam = urlParams.get('branding')
    const imageParam = urlParams.get('image')
    const themeParam = urlParams.get('theme')

    const isEmbedMode = isInIframe || embedParam === 'true'
    const callbackEnabled = callbackParam === 'true'
    const showBranding = brandingParam !== 'false'
    const theme = themeParam === 'dark' ? 'dark' : 'light'

    // Decode initial image if provided
    let initialImage: string | null = null
    if (imageParam) {
      try {
        initialImage = decodeURIComponent(imageParam)
      } catch (e) {
        log.warn('embed', 'failed to parse initial image URL parameter', e)
      }
    }

    setConfig((prev) => ({
      ...prev,
      isEmbedMode,
      callbackEnabled,
      parentOrigin: null,
      showBranding,
      initialImage,
      theme,
    }))

    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (!isEmbedMode) return

      // Validate origin
      if (!isOriginAllowed(event.origin)) {
        return
      }

      const { type, data, nonce: msgNonce } = event.data || {}

      // Handle init message -- establishes the nonce and validated origin
      if (type === 'mfa:init') {
        const initNonce = data?.nonce || msgNonce
        const initToken = data?.token || null

        if (!initNonce) {
          // Reject init without nonce
          return
        }

        nonceRef.current = initNonce
        validatedOriginRef.current = event.origin

        setConfig((prev) => ({
          ...prev,
          parentOrigin: event.origin,
          nonce: initNonce,
          embedToken: initToken,
        }))
        return
      }

      // All messages after init must include matching nonce
      if (!nonceRef.current) {
        // No init received yet, reject
        return
      }

      const incomingNonce = data?.nonce || msgNonce
      if (incomingNonce !== nonceRef.current) {
        // Nonce mismatch, reject
        return
      }

      switch (type) {
        case 'mfa:load-template':
          if (data?.templateId) {
            setConfig((prev) => ({ ...prev, loadTemplateId: data.templateId }))
          }
          break

        case 'mfa:load-image':
          if (data?.imageUrl) {
            setConfig((prev) => ({ ...prev, loadImageUrl: data.imageUrl }))
            window.dispatchEvent(
              new CustomEvent('embed:load-image', { detail: { imageUrl: data.imageUrl } })
            )
          }
          break

        case 'mfa:set-config':
          if (data) {
            const { nonce: _n, ...configData } = data
            setConfig((prev) => ({ ...prev, ...configData }))
          }
          break

        case 'mfa:export':
          window.dispatchEvent(new CustomEvent('embed:request-export'))
          break

        case 'mfa:close':
          // Parent requests close -- treated as cancel
          // notifyCancel is called via the ref-based approach below
          if (validatedOriginRef.current) {
            window.parent.postMessage(
              {
                type: 'mfa:closed',
                nonce: nonceRef.current,
                timestamp: Date.now(),
              },
              validatedOriginRef.current
            )
          }
          break

        default:
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const sendEventToParent = useCallback(
    (eventType: string, data?: Record<string, any>) => {
      if (!config.isEmbedMode) return

      const targetOrigin = validatedOriginRef.current
      if (!targetOrigin) {
        // No validated origin yet -- cannot send in production
        if (isDev) {
          // In dev, allow fallback to '*' only if explicitly no origin set
          // But prefer not to -- just skip
        }
        return
      }

      try {
        window.parent.postMessage(
          {
            type: `mfa:${eventType}`,
            data,
            nonce: nonceRef.current,
            timestamp: Date.now(),
          },
          targetOrigin
        )
      } catch (error) {
        log.warn('embed', 'failed to dispatch message to parent frame', error)
      }
    },
    [config.isEmbedMode]
  )

  const sendImageToParent = useCallback(
    (imageDataUrl: string, metadata?: Record<string, any>) => {
      sendEventToParent('export', {
        asset: {
          url: imageDataUrl,
          blob: null,
          width: metadata?.width || null,
          height: metadata?.height || null,
          format: imageDataUrl.startsWith('data:image/png') ? 'png' : 'jpeg',
          name: metadata?.name || 'design',
        },
      })
    },
    [sendEventToParent]
  )

  const notifyReady = useCallback(() => {
    sendEventToParent('ready', {
      version: '1.0.0',
      features: ['image-edit', 'templates', 'ai-design', 'video'],
    })
  }, [sendEventToParent])

  const notifyCancel = useCallback(() => {
    sendEventToParent('closed')
  }, [sendEventToParent])

  // Notify parent when embed is ready
  useEffect(() => {
    if (config.isEmbedMode) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(notifyReady, 500)
      return () => clearTimeout(timer)
    }
  }, [config.isEmbedMode, notifyReady])

  return (
    <EmbedContext.Provider
      value={{
        config,
        sendImageToParent,
        sendEventToParent,
        notifyReady,
        notifyCancel,
      }}
    >
      {children}
    </EmbedContext.Provider>
  )
}

export default EmbedContext
