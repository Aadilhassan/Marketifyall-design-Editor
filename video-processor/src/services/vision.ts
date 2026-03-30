/**
 * AI Vision Service
 * Describes images using OpenRouter vision models
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'

// Hardcoded for now - move to .env later
const OPENROUTER_KEY = "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"

export interface ImageDescription {
    url: string
    description: string
}

/**
 * Describe multiple images using AI vision
 */
export async function describeImages(imageUrls: string[]): Promise<ImageDescription[]> {
    console.log(`[Vision] Describing ${imageUrls.length} images...`)

    // Set env var for LangChain compatibility
    process.env.OPENAI_API_KEY = OPENROUTER_KEY

    const model = new ChatOpenAI({
        modelName: 'openai/gpt-4o-mini', // Vision-capable model
        configuration: {
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'MarketifyAll Video Generator',
            }
        },
        temperature: 0.3,
        maxTokens: 150
    })

    const results: ImageDescription[] = []

    for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i]
        try {
            console.log(`[Vision] Analyzing image ${i + 1}/${imageUrls.length}...`)

            const message = new HumanMessage({
                content: [
                    {
                        type: "text",
                        text: "Describe this real estate property image in 1-2 sentences. Focus on key features like room type, design elements, outdoor spaces, or architectural details. Be specific and engaging."
                    },
                    {
                        type: "image_url",
                        image_url: { url }
                    }
                ]
            })

            const response = await model.invoke([message])
            const description = response.content as string

            results.push({
                url,
                description: description.trim()
            })

            console.log(`[Vision] Image ${i + 1}: ${description.substring(0, 60)}...`)

        } catch (error: any) {
            console.error(`[Vision] Failed to describe image ${i + 1}:`, error.message)
            results.push({
                url,
                description: `Property image ${i + 1}`
            })
        }
    }

    return results
}

/**
 * Format image descriptions for the script agent
 */
export function formatDescriptionsForPrompt(descriptions: ImageDescription[]): string {
    return descriptions.map((d, i) =>
        `Image ${i + 1}: ${d.description}`
    ).join('\n')
}
