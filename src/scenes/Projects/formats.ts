export interface DesignFormat {
  id: string
  name: string
  group: string
  width: number
  height: number
}

/** Canva-like starting formats, grouped. Dimensions are the canvas frame size. */
export const DESIGN_FORMATS: DesignFormat[] = [
  // Social
  { id: 'ig-post', name: 'Instagram Post', group: 'Social', width: 1080, height: 1080 },
  { id: 'ig-story', name: 'Instagram Story', group: 'Social', width: 1080, height: 1920 },
  { id: 'fb-post', name: 'Facebook Post', group: 'Social', width: 1200, height: 1200 },
  { id: 'fb-cover', name: 'Facebook Cover', group: 'Social', width: 820, height: 312 },
  { id: 'x-post', name: 'X / Twitter Post', group: 'Social', width: 1600, height: 900 },
  { id: 'li-post', name: 'LinkedIn Post', group: 'Social', width: 1200, height: 627 },
  { id: 'pin', name: 'Pinterest Pin', group: 'Social', width: 1000, height: 1500 },
  // Video
  { id: 'reel', name: 'Reel / TikTok', group: 'Video', width: 1080, height: 1920 },
  { id: 'yt-thumb', name: 'YouTube Thumbnail', group: 'Video', width: 1280, height: 720 },
  { id: 'yt-video', name: 'YouTube Video', group: 'Video', width: 1920, height: 1080 },
  { id: 'presentation', name: 'Presentation', group: 'Video', width: 1920, height: 1080 },
  // Print & more
  { id: 'poster', name: 'Poster (A4)', group: 'Print & more', width: 2480, height: 3508 },
  { id: 'flyer', name: 'Flyer (A5)', group: 'Print & more', width: 1748, height: 2480 },
  { id: 'card', name: 'Business Card', group: 'Print & more', width: 1050, height: 600 },
  { id: 'logo', name: 'Logo', group: 'Print & more', width: 500, height: 500 },
]

export const FORMAT_GROUPS = ['Social', 'Video', 'Print & more']
