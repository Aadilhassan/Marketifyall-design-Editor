/**
 * AI Agent Service
 * Generates video scripts using OpenRouter (LangChain)
 * Enhanced: Now suggests stickers and accepts image descriptions
 */

import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { PropertyData } from './scraper'
import dotenv from 'dotenv'

dotenv.config()

// Hardcoded for now - move to .env later
const OPENROUTER_KEY = "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"

// Define the output structure with stickers and captions
const parser = StructuredOutputParser.fromZodSchema(
    z.object({
        script: z.string().describe('The voiceover script for the video (30-40 seconds when read aloud, high-energy TikTok/Reels style)'),
        captions: z.array(z.object({
            text: z.string().describe('Short punchy caption (max 4 words)'),
            imageIndex: z.number().describe('Which image this caption appears on (0-indexed)')
        })).describe('3-5 text captions to overlay on the video'),
        stickerSuggestions: z.array(z.object({
            keyword: z.string().describe('Search keyword for sticker (e.g., excited, wow, fire, home, love)'),
            timing: z.number().describe('When to show sticker in seconds from start'),
            position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).describe('Corner position for sticker')
        })).describe('2-3 animated stickers to add for engagement'),
        propertyHighlights: z.object({
            price: z.string().optional().describe('Property price if found'),
            address: z.string().optional().describe('Property address if found'),
            bedsBaths: z.string().optional().describe('Beds/baths summary if found')
        }).optional()
    })
)

export interface StickerSuggestion {
    keyword: string
    timing: number
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export interface ScriptResult {
    script: string
    captions: { text: string; imageIndex: number }[]
    stickerSuggestions?: StickerSuggestion[]
    propertyHighlights?: {
        price?: string
        address?: string
        bedsBaths?: string
    }
}

export async function generateScript(
    property: PropertyData,
    imageDescriptions?: string[]
): Promise<ScriptResult> {
    // Set env var for LangChain compatibility
    process.env.OPENAI_API_KEY = OPENROUTER_KEY

    const model = new ChatOpenAI({
        modelName: 'bytedance-seed/seed-1.6',
        configuration: {
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'MarketifyAll Video Generator',
            }
        },
        temperature: 0.7,
        maxTokens: 1200
    })

    // Build image context if available
    let imageContext = ''
    if (imageDescriptions && imageDescriptions.length > 0) {
        imageContext = imageDescriptions.map((desc, i) => `Image ${i + 1}: ${desc}`).join('\n')
    }

    const template = `You are a Viral Real Estate Scriptwriter for TikTok and Instagram Reels.

Write an EXCITING 30-second voiceover script that sounds like a real estate influencer.

Property Details:
{description}

Image Descriptions:
{imageContext}

SCRIPT STYLE:
- Start with a pattern interrupt: "STOP scrolling!" or "Wait, is this even real?"
- High energy, fast-paced, use "YOU" language
- Include FOMO: "This won't last" or "First time on market"
- End with CTA: "Comment HOME for details"
- Use power words: stunning, exclusive, dream, luxury, sanctuary

STICKER SUGGESTIONS:
- Add 2-3 animated stickers for engagement
- Use keywords like: excited, wow, fire, money, love, home, sparkle, celebration
- Place at key moments (start, highlight, CTA)

IMPORTANT: You MUST respond with valid JSON only. No markdown, no extra text.

{format_instructions}
`

    const prompt = new PromptTemplate({
        template,
        inputVariables: ['description', 'imageContext'],
        partialVariables: { format_instructions: parser.getFormatInstructions() }
    })

    const input = await prompt.format({
        description: property.description ? property.description.substring(0, 1500) : 'Beautiful property with amazing features.',
        imageContext: imageContext || 'No image descriptions available'
    })

    console.log('[Agent] Generating script via OpenRouter...')
    const response = await model.invoke(input)

    // Parse JSON
    try {
        const data = await parser.parse(response.content as string)
        console.log(`[Agent] Generated script: ${data.script.substring(0, 50)}...`)
        console.log(`[Agent] Captions: ${data.captions.length}`)
        console.log(`[Agent] Stickers: ${data.stickerSuggestions?.length || 0}`)
        return data as ScriptResult
    } catch (e) {
        console.error('[Agent] Failed to parse AI response, using fallback', e)

        return {
            script: "STOP scrolling right now! This stunning dream home is everything you've been waiting for. Imagine waking up to this gorgeous view every morning. This exclusive property won't last - comment HOME for the private tour!",
            captions: [
                { text: "STOP", imageIndex: 0 },
                { text: "Dream Home", imageIndex: 1 },
                { text: "Luxury Living", imageIndex: 2 },
                { text: "Comment HOME", imageIndex: 3 }
            ],
            stickerSuggestions: [
                { keyword: "excited", timing: 0, position: "top-right" },
                { keyword: "wow", timing: 10, position: "bottom-right" },
                { keyword: "fire", timing: 20, position: "top-right" }
            ]
        }
    }
}
