/**
 * Stickers Service
 * Fetches transparent stickers from Giphy API
 * AI selects keywords, this service fetches and downloads assets
 */

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Giphy API key (user provided)
const GIPHY_API_KEY = '0revKRQ9pSSOL1fWayhA1U4FRT2EA4xk'

export interface StickerSuggestion {
    keyword: string      // Search term for Giphy
    timing: number       // When to show (seconds from start)
    duration?: number    // How long to show (default 3s)
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
}

export interface FetchedSticker {
    id: string
    keyword: string
    localPath: string
    timing: number
    duration: number
    position: { x: number; y: number }  // Percentage-based position
    size: { width: number; height: number }  // Percentage of video
}

/**
 * Convert position name to x,y percentages
 */
function positionToCoords(position: StickerSuggestion['position']): { x: number; y: number } {
    switch (position) {
        case 'top-left': return { x: 5, y: 5 }
        case 'top-right': return { x: 75, y: 5 }
        case 'bottom-left': return { x: 5, y: 75 }
        case 'bottom-right': return { x: 75, y: 75 }
        case 'center': return { x: 35, y: 35 }
        default: return { x: 75, y: 5 }
    }
}

/**
 * Search for transparent stickers on Giphy
 */
async function searchGiphyStickers(keyword: string): Promise<string | null> {
    try {
        // Add "transparent" to get sticker-style results
        const searchTerm = `transparent ${keyword}`
        const url = `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=5&rating=g`

        console.log(`[Stickers] Searching Giphy for: ${searchTerm}`)

        const response = await axios.get(url, { timeout: 10000 })
        const data = response.data

        if (data.data && data.data.length > 0) {
            // Get a random sticker from top 5 results
            const sticker = data.data[Math.floor(Math.random() * Math.min(5, data.data.length))]

            // Get the fixed-size GIF URL (better for overlays)
            const gifUrl = sticker.images?.fixed_height?.url ||
                sticker.images?.original?.url ||
                sticker.images?.downsized?.url

            console.log(`[Stickers] Found: ${sticker.title}`)
            return gifUrl || null
        }

        console.log(`[Stickers] No results for: ${keyword}`)
        return null
    } catch (error: any) {
        console.error(`[Stickers] Giphy search error:`, error.message)
        return null
    }
}

/**
 * Download a sticker to local temp directory
 */
async function downloadSticker(url: string, outputDir: string): Promise<string | null> {
    try {
        const filename = `sticker_${uuidv4()}.gif`
        const localPath = path.join(outputDir, filename)

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000
        })

        fs.writeFileSync(localPath, response.data)
        console.log(`[Stickers] Downloaded: ${filename}`)

        return localPath
    } catch (error: any) {
        console.error(`[Stickers] Download error:`, error.message)
        return null
    }
}

/**
 * Fetch all stickers for a video based on AI suggestions
 */
export async function fetchStickers(
    suggestions: StickerSuggestion[],
    outputDir: string
): Promise<FetchedSticker[]> {
    const stickers: FetchedSticker[] = []

    if (!suggestions || suggestions.length === 0) {
        console.log('[Stickers] No sticker suggestions provided')
        return stickers
    }

    console.log(`[Stickers] Fetching ${suggestions.length} stickers...`)

    for (const suggestion of suggestions) {
        // Search Giphy
        const gifUrl = await searchGiphyStickers(suggestion.keyword)
        if (!gifUrl) continue

        // Download
        const localPath = await downloadSticker(gifUrl, outputDir)
        if (!localPath) continue

        stickers.push({
            id: uuidv4(),
            keyword: suggestion.keyword,
            localPath,
            timing: suggestion.timing,
            duration: suggestion.duration || 3,
            position: positionToCoords(suggestion.position),
            size: { width: 20, height: 20 }  // 20% of video size
        })
    }

    console.log(`[Stickers] Fetched ${stickers.length}/${suggestions.length} stickers`)
    return stickers
}

/**
 * Get real estate themed sticker suggestions
 * These are default suggestions if AI doesn't provide any
 */
export function getDefaultStickerSuggestions(videoDuration: number): StickerSuggestion[] {
    return [
        { keyword: 'excited', timing: 0, position: 'top-right', duration: 2 },
        { keyword: 'wow', timing: Math.floor(videoDuration / 3), position: 'bottom-right', duration: 2 },
        { keyword: 'love home', timing: Math.floor(videoDuration * 2 / 3), position: 'top-right', duration: 2 }
    ]
}
