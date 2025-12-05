import axios from 'axios'

const pixabayClient = axios.create({
  baseURL: 'https://pixabay.com/api/',
  timeout: 10000, // 10 second timeout
})

const PIXABAY_KEY = process.env.REACT_APP_PIXABAY_KEY

export interface PixabayImage {
  id: string
  webformatURL: string
  previewURL: string
  largeImageURL?: string
  tags?: string
}

export function getPixabayImages(query: string): Promise<PixabayImage[]> {
  // Check if API key is configured
  if (!PIXABAY_KEY || PIXABAY_KEY.trim() === '') {
    console.warn('Pixabay API key is not configured')
    return Promise.resolve([])
  }

  const encodedWord = query.replace(/\s+/g, '+').toLowerCase()
  
  return new Promise((resolve, reject) => {
    pixabayClient
      .get(`?key=${PIXABAY_KEY}&q=${encodedWord}&image_type=photo&per_page=30&safesearch=true`)
      .then(response => {
        if (response.data && response.data.hits) {
          resolve(response.data.hits)
        } else {
          resolve([])
        }
      })
      .catch(err => {
        console.error('Pixabay API error:', err.message)
        // Return empty array instead of rejecting to prevent UI freeze
        resolve([])
      })
  })
}
