import axios from 'axios'

const PEXELS_API_KEY = process.env.REACT_APP_PIXELS_KEY || ''

const pexelsClient = axios.create({
  baseURL: 'https://api.pexels.com/v1/',
  timeout: 10000,
  headers: {
    Authorization: PEXELS_API_KEY,
  },
})

export interface PexelsImage {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  alt: string
}

export interface PexelsResponse {
  total_results: number
  page: number
  per_page: number
  photos: PexelsImage[]
  next_page?: string
}

export async function searchPexelsImages(query: string, perPage: number = 30): Promise<PexelsImage[]> {
  // Check if API key is configured
  if (!PEXELS_API_KEY || PEXELS_API_KEY.trim() === '') {
    console.warn('Pexels API key is not configured')
    return []
  }

  try {
    const response = await pexelsClient.get<PexelsResponse>('search', {
      params: {
        query,
        per_page: perPage,
        orientation: 'square',
      },
    })

    return response.data.photos || []
  } catch (error: any) {
    console.error('Pexels API error:', error.message)
    return []
  }
}

export async function getCuratedImages(perPage: number = 30): Promise<PexelsImage[]> {
  if (!PEXELS_API_KEY || PEXELS_API_KEY.trim() === '') {
    console.warn('Pexels API key is not configured')
    return []
  }

  try {
    const response = await pexelsClient.get<PexelsResponse>('curated', {
      params: {
        per_page: perPage,
      },
    })

    return response.data.photos || []
  } catch (error: any) {
    console.error('Pexels API error:', error.message)
    return []
  }
}

export function isApiKeyConfigured(): boolean {
  return !!(PEXELS_API_KEY && PEXELS_API_KEY.trim() !== '')
}
