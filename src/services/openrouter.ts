import { marketifyallApi } from './marketifyall-api'
import { log } from '@/lib/logger'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface DesignAction {
  type: 'addText' | 'addImage' | 'addShape' | 'setBackground' | 'updateText' | 'searchImage' | 'setFont' | 'addIcon' | 'layout'
  params: Record<string, any>
  description: string
}

export interface AIDesignResponse {
  message: string
  actions: DesignAction[]
  suggestions?: string[]
}

const SYSTEM_PROMPT = `You are an expert graphic designer AI assistant integrated into a professional design editor. You help users create stunning visuals by generating design actions.

Available capabilities:
1. Add text elements with specific fonts (Google Fonts available), colors, sizes, and positions
2. Search and add images from Pexels library
3. Add shapes and icons (Lucide icons: shapes, arrows, social, media, navigation, business categories)
4. Set background colors or gradients
5. Create layouts and compositions

When the user asks you to design something, respond with a JSON object containing:
- message: A friendly response explaining what you're creating
- actions: An array of design actions to execute
- suggestions: Optional array of follow-up suggestions

Action types and their params:
- addText: { text: string, fontFamily?: string, fontSize?: number, fill?: string, top?: number, left?: number, fontWeight?: string }
- addImage: { query: string, top?: number, left?: number, width?: number, height?: number }
- addShape: { shape: "rectangle" | "circle" | "triangle", fill?: string, stroke?: string, width?: number, height?: number, top?: number, left?: number }
- addIcon: { iconName: string, category?: string, size?: number, color?: string, top?: number, left?: number }
- setBackground: { color: string } or { gradient: { colors: string[], direction: string } }
- setFont: { fontFamily: string }
- layout: { type: "centered" | "grid" | "sidebar" | "hero" }

Popular Google Fonts you can use: Roboto, Open Sans, Lato, Montserrat, Oswald, Raleway, Poppins, Playfair Display, Merriweather, Bebas Neue, Dancing Script, Pacifico, Lobster, Abril Fatface, Comfortaa

Icon categories: shapes, communication, social, arrows, media, navigation, business

Example response for "Create a social media post about coffee":
{
  "message": "I'll create a warm, inviting coffee-themed social media post for you!",
  "actions": [
    { "type": "setBackground", "params": { "color": "#4A3728" }, "description": "Setting a rich coffee brown background" },
    { "type": "addImage", "params": { "query": "coffee cup latte art", "top": 100, "left": 50, "width": 300 }, "description": "Adding a beautiful coffee image" },
    { "type": "addText", "params": { "text": "COFFEE TIME", "fontFamily": "Bebas Neue", "fontSize": 48, "fill": "#F5E6D3", "top": 50, "left": 100 }, "description": "Adding the main headline" },
    { "type": "addText", "params": { "text": "Start your morning right", "fontFamily": "Lato", "fontSize": 18, "fill": "#D4C4B0", "top": 420, "left": 100 }, "description": "Adding a tagline" }
  ],
  "suggestions": ["Add a logo", "Change the color scheme", "Add social media icons"]
}

Always respond with valid JSON only. Be creative with colors, fonts, and compositions. Consider visual hierarchy and balance.`

export async function sendDesignRequest(
  messages: ChatMessage[],
  model: string = 'anthropic/claude-3.5-sonnet'
): Promise<AIDesignResponse> {
  try {
    const allMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages,
    ]

    const response = await marketifyallApi.aiProxy(
      'ai_full_design',
      model,
      allMessages,
      { temperature: 0.7, max_tokens: 2000 }
    )

    const content = response.choices?.[0]?.message?.content || ''

    // Parse the JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          message: parsed.message || 'Design created!',
          actions: parsed.actions || [],
          suggestions: parsed.suggestions,
        }
      }
    } catch (parseError) {
      log.warn('ai', 'openrouter response parse fallback', parseError)
    }

    return {
      message: content,
      actions: [],
      suggestions: [],
    }
  } catch (error: any) {
    throw new Error(error.response?.data?.error?.message || error.message || 'Failed to get AI response')
  }
}

export async function improvePrompt(prompt: string): Promise<string> {
  try {
    const response = await marketifyallApi.aiProxy(
      'ai_text_generation',
      'anthropic/claude-3.5-sonnet',
      [
        {
          role: 'system',
          content: 'You are a prompt improvement assistant. Take the user\'s design request and enhance it with more specific details about colors, fonts, layout, and visual elements. Keep it concise but descriptive. Only return the improved prompt, nothing else.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, max_tokens: 500 }
    )

    return response.choices?.[0]?.message?.content || prompt
  } catch (error) {
    return prompt
  }
}

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
]
