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

// Video API types
export interface PexelsVideoFile {
  id: number
  quality: string
  file_type: string
  width: number
  height: number
  link: string
}

export interface PexelsVideo {
  id: number
  width: number
  height: number
  url: string
  image: string // Thumbnail image
  duration: number
  user: {
    id: number
    name: string
    url: string
  }
  video_files: PexelsVideoFile[]
}

export interface PexelsVideoResponse {
  total_results: number
  page: number
  per_page: number
  videos: PexelsVideo[]
  next_page?: string
}

// Create a separate client for videos endpoint
const pexelsVideoClient = axios.create({
  baseURL: 'https://api.pexels.com/videos/',
  timeout: 10000,
  headers: {
    Authorization: PEXELS_API_KEY,
  },
})

export async function searchPexelsVideos(query: string, perPage: number = 20): Promise<PexelsVideo[]> {
  if (!PEXELS_API_KEY || PEXELS_API_KEY.trim() === '') {
    console.warn('Pexels API key is not configured')
    return []
  }

  try {
    const response = await pexelsVideoClient.get<PexelsVideoResponse>('search', {
      params: {
        query,
        per_page: perPage,
        orientation: 'landscape',
      },
    })

    return response.data.videos || []
  } catch (error: any) {
    console.error('Pexels Video API error:', error.message)
    return []
  }
}

export async function getPopularVideos(perPage: number = 20): Promise<PexelsVideo[]> {
  if (!PEXELS_API_KEY || PEXELS_API_KEY.trim() === '') {
    console.warn('Pexels API key is not configured')
    return []
  }

  try {
    const response = await pexelsVideoClient.get<PexelsVideoResponse>('popular', {
      params: {
        per_page: perPage,
      },
    })

    return response.data.videos || []
  } catch (error: any) {
    console.error('Pexels Video API error:', error.message)
    return []
  }
}

// Helper to get the best quality video file
export function getBestVideoFile(video: PexelsVideo): PexelsVideoFile | null {
  if (!video.video_files || video.video_files.length === 0) return null

  // Prefer HD quality
  const hdFile = video.video_files.find(f => f.quality === 'hd' && f.file_type === 'video/mp4')
  if (hdFile) return hdFile

  // Fallback to SD
  const sdFile = video.video_files.find(f => f.quality === 'sd' && f.file_type === 'video/mp4')
  if (sdFile) return sdFile

  // Fallback to any MP4
  const mp4File = video.video_files.find(f => f.file_type === 'video/mp4')
  if (mp4File) return mp4File

  return video.video_files[0]
}
