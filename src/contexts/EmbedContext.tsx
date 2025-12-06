import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface EmbedConfig {
  isEmbedMode: boolean
  callbackEnabled: boolean
  parentOrigin: string | null
  showBranding: boolean
  initialImage: string | null
  theme: 'light' | 'dark'
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
}

const EmbedContext = createContext<EmbedContextType>({
  config: defaultConfig,
  sendImageToParent: () => {},
  sendEventToParent: () => {},
  notifyReady: () => {},
  notifyCancel: () => {},
})

export const useEmbedMode = () => useContext(EmbedContext)

interface EmbedProviderProps {
  children: React.ReactNode
}

export const EmbedProvider: React.FC<EmbedProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<EmbedConfig>(defaultConfig)

  useEffect(() => {
    // Check if running in iframe
    const isInIframe = window.self !== window.top

    // Parse URL parameters for embed configuration
    const urlParams = new URLSearchParams(window.location.search)
    const embedParam = urlParams.get('embed')
    const callbackParam = urlParams.get('callback')
    const originParam = urlParams.get('origin')
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
        console.warn('Failed to decode initial image URL')
      }
    }

    setConfig({
      isEmbedMode,
      callbackEnabled,
      parentOrigin: originParam || '*',
      showBranding,
      initialImage,
      theme,
    })

    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (!isEmbedMode) return

      const { type, data } = event.data || {}

      switch (type) {
        case 'marketifyall:load-image':
          // Parent wants to load a new image
          if (data?.imageUrl) {
            window.dispatchEvent(
              new CustomEvent('embed:load-image', { detail: { imageUrl: data.imageUrl } })
            )
          }
          break

        case 'marketifyall:set-config':
          // Parent wants to update config
          if (data) {
            setConfig((prev) => ({ ...prev, ...data }))
          }
          break

        case 'marketifyall:export':
          // Parent requests export
          window.dispatchEvent(new CustomEvent('embed:request-export'))
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

      try {
        window.parent.postMessage(
          {
            type: `marketifyall:${eventType}`,
            data,
            timestamp: Date.now(),
          },
          config.parentOrigin || '*'
        )
      } catch (error) {
        console.error('Failed to send message to parent:', error)
      }
    },
    [config.isEmbedMode, config.parentOrigin]
  )

  const sendImageToParent = useCallback(
    (imageDataUrl: string, metadata?: Record<string, any>) => {
      sendEventToParent('design-complete', {
        image: imageDataUrl,
        format: imageDataUrl.startsWith('data:image/png') ? 'png' : 'jpeg',
        ...metadata,
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
    sendEventToParent('cancelled')
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
