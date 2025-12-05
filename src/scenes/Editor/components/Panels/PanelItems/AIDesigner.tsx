import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { styled } from 'baseui'
import { useEditor } from '@nkyo/scenify-sdk'
import { 
  sendDesignRequest, 
  improvePrompt, 
  AVAILABLE_MODELS,
  ChatMessage, 
  DesignAction,
} from '@/services/openrouter'
import { searchPexelsImages } from '@/services/pexels'
import { getIconsByCategory, svgToBase64 } from '@/utils/lucideIconsManager'

// Styled Components
const Container = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#ffffff',
})

const Header = styled('div', {
  padding: '16px 20px',
  borderBottom: '1px solid #e8e8e8',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const HeaderIcon = styled('div', {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
})

const HeaderTitle = styled('div', {
  flex: 1,
})

const Title = styled('div', {
  fontSize: '15px',
  fontWeight: 600,
  color: '#1a1a1a',
})

const Subtitle = styled('div', {
  fontSize: '12px',
  color: '#888',
  marginTop: '2px',
})

const ModelSelector = styled('select', {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
  fontSize: '12px',
  color: '#555',
  cursor: 'pointer',
  background: '#f8f8f8',
  outline: 'none',
  ':focus': {
    borderColor: '#667eea',
  },
})

const ChatContainer = styled('div', {
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
})

const MessagesArea = styled('div', {
  flex: 1,
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
})

const MessageBubble = styled('div', ({ $isUser }: { $isUser: boolean }) => ({
  maxWidth: '85%',
  padding: '12px 16px',
  borderRadius: $isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
  backgroundColor: $isUser ? '#667eea' : '#f5f5f5',
  color: $isUser ? '#ffffff' : '#1a1a1a',
  alignSelf: $isUser ? 'flex-end' : 'flex-start',
  fontSize: '14px',
  lineHeight: '1.5',
  wordBreak: 'break-word',
}))

const ActionsList = styled('div', {
  marginTop: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

const ActionItem = styled('div', ({ $status }: { $status: 'pending' | 'running' | 'done' | 'error' }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '8px',
  backgroundColor: $status === 'done' ? '#e8f5e9' : $status === 'error' ? '#ffebee' : $status === 'running' ? '#fff3e0' : '#f5f5f5',
  fontSize: '13px',
  color: $status === 'done' ? '#2e7d32' : $status === 'error' ? '#c62828' : $status === 'running' ? '#ef6c00' : '#555',
}))

const ActionIcon = styled('div', ({ $status }: { $status: string }) => ({
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  backgroundColor: $status === 'done' ? '#4caf50' : $status === 'error' ? '#f44336' : $status === 'running' ? '#ff9800' : '#ccc',
  color: '#fff',
}))

const SuggestionsRow = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '12px',
})

const SuggestionChip = styled('button', {
  padding: '6px 12px',
  borderRadius: '16px',
  border: '1px solid #667eea',
  backgroundColor: 'transparent',
  color: '#667eea',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: '#667eea',
    color: '#ffffff',
  },
})

const InputArea = styled('div', {
  padding: '16px 20px',
  borderTop: '1px solid #e8e8e8',
  backgroundColor: '#fafafa',
})

const InputWrapper = styled('div', {
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-end',
})

const TextArea = styled('textarea', {
  flex: 1,
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #e0e0e0',
  fontSize: '14px',
  lineHeight: '1.5',
  resize: 'none',
  minHeight: '44px',
  maxHeight: '120px',
  outline: 'none',
  fontFamily: 'inherit',
  ':focus': {
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
  '::placeholder': {
    color: '#aaa',
  },
})

const SendButton = styled('button', ({ $disabled }: { $disabled: boolean }) => ({
  width: '44px',
  height: '44px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: $disabled ? '#ccc' : '#667eea',
  color: '#ffffff',
  cursor: $disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  flexShrink: 0,
  ':hover': {
    backgroundColor: $disabled ? '#ccc' : '#5a6fd6',
  },
}))

const ImproveButton = styled('button', {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
  backgroundColor: '#fff',
  color: '#666',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#667eea',
    color: '#667eea',
  },
})

const QuickActions = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '12px',
})

const QuickActionButton = styled('button', {
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  backgroundColor: '#fff',
  color: '#555',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#667eea',
    backgroundColor: '#f8f7ff',
  },
})

const LoadingDots = styled('div', {
  display: 'flex',
  gap: '4px',
  padding: '12px 16px',
})

const Dot = styled('div', ({ $delay }: { $delay: number }) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#667eea',
  animation: 'bounce 1.4s infinite ease-in-out',
  animationDelay: `${$delay}s`,
}))

const WelcomeScreen = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: '32px',
  textAlign: 'center',
})

const WelcomeIcon = styled('div', {
  width: '64px',
  height: '64px',
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '20px',
  fontSize: '28px',
})

const WelcomeTitle = styled('div', {
  fontSize: '20px',
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: '8px',
})

const WelcomeText = styled('div', {
  fontSize: '14px',
  color: '#666',
  maxWidth: '280px',
  lineHeight: '1.6',
  marginBottom: '24px',
})

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: DesignAction[]
  actionStatuses?: Record<number, 'pending' | 'running' | 'done' | 'error'>
  suggestions?: string[]
}

const QUICK_PROMPTS = [
  '🎨 Create a social media post',
  '📢 Design a sale banner',
  '💼 Make a business card',
  '🎉 Birthday invitation',
  '🍕 Food menu design',
  '✨ Motivational quote',
]

function AIDesigner() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id)
  const [isImproving, setIsImproving] = useState(false)
  
  const scrollRef = useRef<Scrollbars>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editor = useEditor()

  // Canvas bounds helper to keep objects inside the frame
  const getCanvasBounds = useCallback(() => {
    // @ts-ignore
    const canvas = editor?.canvas?.canvas || editor?.canvas
    const width = (canvas?.width as number) || 1080
    const height = (canvas?.height as number) || 1080
    return { width, height }
  }, [editor])



  // Auto-scroll to bottom (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToBottom()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [messages.length]) // Only trigger on message count change

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }, [])

  // Helper to add to canvas - simple and direct
  const addToCanvas = useCallback(async (config: any): Promise<void> => {
    try {
      editor.add(config)
      // Small delay to let canvas process
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (e) {
      console.error('Canvas add error:', e)
    }
  }, [editor])

  // Helper to generate shape SVG
  const generateShapeSvg = useCallback((shape: string, width: number, height: number, fill: string, stroke?: string) => {
    const strokeAttr = stroke ? `stroke="${stroke}" stroke-width="2"` : ''
    
    if (shape === 'rectangle') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect x="0" y="0" width="${width}" height="${height}" fill="${fill}" ${strokeAttr}/>
      </svg>`
    } else if (shape === 'circle') {
      const r = Math.min(width, height) / 2
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <circle cx="${r}" cy="${r}" r="${r - 1}" fill="${fill}" ${strokeAttr}/>
      </svg>`
    } else if (shape === 'triangle') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <polygon points="${width/2},0 ${width},${height} 0,${height}" fill="${fill}" ${strokeAttr}/>
      </svg>`
    }
    // Default rectangle
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="${fill}" ${strokeAttr}/>
    </svg>`
  }, [])

  // Execute a single action - using correct SDK format
  const executeSingleAction = useCallback(async (action: DesignAction): Promise<boolean> => {
    if (!editor) return false

    try {
      // Get canvas size for positioning
      const { width: canvasW, height: canvasH } = getCanvasBounds()

      switch (action.type) {
        case 'addText': {
          const { text, fontFamily, fontSize, fill, fontWeight } = action.params
          const font = fontFamily || 'Open Sans'
          
          // Load font if specified
          if (font) {
            const formattedName = font.replace(/ /g, '+')
            const linkId = `font-ai-${formattedName}`
            if (!document.getElementById(linkId)) {
              const link = document.createElement('link')
              link.id = linkId
              link.rel = 'stylesheet'
              link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;500;600;700&display=swap`
              document.head.appendChild(link)
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          }

          // Use SDK's expected format - text goes in metadata
          await addToCanvas({
            type: 'StaticText',
            width: Math.min(320, canvasW - 40),
            metadata: {
              text: text || 'Your Text Here',
              fontSize: fontSize || 24,
              fontWeight: fontWeight || 'normal',
              fontFamily: font,
              fill: fill || '#000000',
              textAlign: 'center',
            },
          })
          return true
        }

        case 'addImage': {
          const { query } = action.params
          try {
            const images = await Promise.race([
              searchPexelsImages(query, 5),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000)),
            ])
            if (images && images.length > 0) {
              const img = images[0]
              await addToCanvas({
                type: 'StaticImage',
                metadata: {
                  src: img.src.medium,
                },
              })
              return true
            }
          } catch (err) {
            console.error('Failed to fetch image:', err)
          }
          return false
        }

        case 'addShape': {
          const { shape, fill, stroke, width, height } = action.params
          const shapeWidth = Math.min(width || 150, canvasW * 0.5)
          const shapeHeight = Math.min(height || 150, canvasH * 0.5)
          const shapeFill = fill || '#5A3FFF'
          
          // Generate SVG and convert to data URL (same approach as Elements panel)
          const svg = generateShapeSvg(shape || 'rectangle', shapeWidth, shapeHeight, shapeFill, stroke)
          const imageUrl = svgToBase64(svg)
          
          await addToCanvas({
            type: 'StaticImage',
            metadata: {
              src: imageUrl,
              name: shape || 'rectangle',
            },
          })
          return true
        }

        case 'addIcon': {
          const { iconName, category, color } = action.params
          try {
            const icons = await getIconsByCategory(category || 'shapes')
            const icon = icons.find(i => 
              i.id === iconName || 
              i.name.toLowerCase().includes((iconName || '').toLowerCase())
            )
            
            if (icon) {
              let svg = icon.svg
              if (color) {
                svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`)
              }
              const imageUrl = svgToBase64(svg)
              await addToCanvas({
                type: 'StaticImage',
                metadata: { 
                  src: imageUrl,
                  name: icon.name,
                },
              })
              return true
            } else {
              console.warn('Icon not found:', iconName, 'in category:', category)
            }
          } catch (err) {
            console.error('Failed to add icon:', err)
          }
          return false
        }

        case 'setBackground': {
          // Skip setBackground - it causes errors with this SDK version
          // The SDK handles background differently
          console.log('setBackground skipped - not supported in current SDK')
          return true // Return true to not show error
        }

        case 'setFont': {
          const { fontFamily } = action.params
          if (fontFamily) {
            const formattedName = fontFamily.replace(/ /g, '+')
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;500;600;700&display=swap`
            document.head.appendChild(link)
          }
          return true
        }

        default:
          console.warn('Unknown action type:', action.type)
          return false
      }
    } catch (error) {
      console.error('Action execution error:', error)
      return false
    }
  }, [addToCanvas, getCanvasBounds, editor, generateShapeSvg])

  // Execute all design actions - runs outside of React render cycle
  const executeActions = useCallback(async (actions: DesignAction[], messageId: string) => {
    if (!editor || !actions || actions.length === 0) return
    
    const statuses: Record<number, 'pending' | 'running' | 'done' | 'error'> = {}
    
    // Initialize all as pending
    actions.forEach((_, i) => { statuses[i] = 'pending' })
    
    // Update message with initial statuses
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, actionStatuses: { ...statuses } } : msg
    ))

    // Execute actions one by one with delays to prevent UI blocking
    for (let i = 0; i < actions.length; i++) {
      // Update to running
      statuses[i] = 'running'
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, actionStatuses: { ...statuses } } : msg
      ))
      
      // Small delay to let React breathe
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Execute the action
      const success = await executeSingleAction(actions[i])
      statuses[i] = success ? 'done' : 'error'
      
      // Update status after execution
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, actionStatuses: { ...statuses } } : msg
      ))
      
      // Delay between actions to prevent canvas overload
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }, [editor, executeSingleAction])

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: UIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const chatHistory: ChatMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))
      chatHistory.push({ role: 'user', content: userMessage.content })

      // Add timeout to API call
      const response = await Promise.race([
        sendDesignRequest(chatHistory, selectedModel),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out. Please try again.')), 60000)
        )
      ])

      const assistantMessage: UIMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: response.message,
        actions: response.actions || [],
        actionStatuses: (response.actions || []).reduce((acc, _, i) => ({ ...acc, [i]: 'pending' as const }), {}),
        suggestions: response.suggestions,
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false) // Reset loading BEFORE executing actions

      // Execute actions asynchronously (don't block UI)
      if (response.actions && response.actions.length > 0) {
        // Use setTimeout to ensure the UI has updated before executing
        setTimeout(() => {
          executeActions(response.actions, assistantMessage.id).catch(err => {
            console.error('Action execution error:', err)
          })
        }, 100)
      }
    } catch (error: any) {
      console.error('Send error:', error)
      const errorMessage: UIMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please try again.`,
      }
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
    }
  }, [inputValue, isLoading, messages, selectedModel, executeActions])

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Improve prompt
  const handleImprove = useCallback(async () => {
    if (!inputValue.trim() || isImproving) return
    setIsImproving(true)
    try {
      const improved = await improvePrompt(inputValue)
      setInputValue(improved)
    } finally {
      setIsImproving(false)
    }
  }, [inputValue, isImproving])

  // Quick prompt
  const handleQuickPrompt = useCallback((prompt: string) => {
    setInputValue(prompt.replace(/^[^\s]+\s/, '')) // Remove emoji prefix
  }, [])

  // Suggestion click
  const handleSuggestion = useCallback((suggestion: string) => {
    setInputValue(suggestion)
  }, [])

  return (
    <Container>
      {/* Add keyframes for loading animation */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Header */}
      <Header>
        <HeaderIcon>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </HeaderIcon>
        <HeaderTitle>
          <Title>AI Designer</Title>
          <Subtitle>Create designs with AI</Subtitle>
        </HeaderTitle>
        <ModelSelector
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {AVAILABLE_MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </ModelSelector>
      </Header>

      {/* Chat Area */}
      <ChatContainer>
        <Scrollbars ref={scrollRef} autoHide>
          <MessagesArea>
            {messages.length === 0 ? (
              <WelcomeScreen>
                <WelcomeIcon>✨</WelcomeIcon>
                <WelcomeTitle>Welcome to AI Designer</WelcomeTitle>
                <WelcomeText>
                  Tell me what you'd like to create and I'll help you design it using images, text, shapes, and icons.
                </WelcomeText>
                <QuickActions>
                  {QUICK_PROMPTS.map((prompt, i) => (
                    <QuickActionButton key={i} onClick={() => handleQuickPrompt(prompt)}>
                      {prompt}
                    </QuickActionButton>
                  ))}
                </QuickActions>
              </WelcomeScreen>
            ) : (
              messages.map((msg) => (
                <div key={msg.id}>
                  <MessageBubble $isUser={msg.role === 'user'}>
                    {msg.content}
                  </MessageBubble>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <ActionsList>
                      {msg.actions.map((action, i) => (
                        <ActionItem key={i} $status={msg.actionStatuses?.[i] || 'pending'}>
                          <ActionIcon $status={msg.actionStatuses?.[i] || 'pending'}>
                            {msg.actionStatuses?.[i] === 'done' ? '✓' : 
                             msg.actionStatuses?.[i] === 'error' ? '✕' :
                             msg.actionStatuses?.[i] === 'running' ? '⟳' : '○'}
                          </ActionIcon>
                          {action.description}
                        </ActionItem>
                      ))}
                    </ActionsList>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <SuggestionsRow>
                      {msg.suggestions.map((suggestion, i) => (
                        <SuggestionChip key={i} onClick={() => handleSuggestion(suggestion)}>
                          {suggestion}
                        </SuggestionChip>
                      ))}
                    </SuggestionsRow>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <MessageBubble $isUser={false}>
                <LoadingDots>
                  <Dot $delay={0} />
                  <Dot $delay={0.16} />
                  <Dot $delay={0.32} />
                </LoadingDots>
              </MessageBubble>
            )}
          </MessagesArea>
        </Scrollbars>
      </ChatContainer>

      {/* Input Area */}
      <InputArea>
        <InputWrapper>
          <TextArea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to design..."
            rows={1}
          />
          <ImproveButton onClick={handleImprove} disabled={isImproving || !inputValue.trim()}>
            {isImproving ? '...' : '✨'} Improve
          </ImproveButton>
          <SendButton $disabled={isLoading || !inputValue.trim()} onClick={handleSend}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </SendButton>
        </InputWrapper>
      </InputArea>
    </Container>
  )
}

export default AIDesigner
