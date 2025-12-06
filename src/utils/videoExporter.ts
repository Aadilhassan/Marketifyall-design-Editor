/**
 * Video Exporter Utility
 * Handles exporting canvas + video content to multiple video formats
 */

export interface VideoExportOptions {
  format: 'mp4' | 'webm' | 'gif'
  fps?: number
  quality?: number
  duration?: number
  width?: number
  height?: number
  onProgress?: (progress: number) => void
}

/**
 * Export video using MediaRecorder API (WebM/MP4)
 */
export async function exportVideoWithRecorder(
  canvasElement: HTMLCanvasElement,
  videoElement: HTMLVideoElement,
  options: VideoExportOptions
): Promise<Blob> {
  const {
    format = 'webm',
    fps = 30,
    quality = 0.9,
    duration = 10,
    onProgress,
  } = options

  return new Promise((resolve, reject) => {
    // Create a stream from canvas
    const stream = canvasElement.captureStream(fps)
    
    // Add video audio if available
    if (videoElement && !videoElement.muted) {
      try {
        // @ts-ignore - captureStream may not be in types
        const videoStream = videoElement.captureStream?.()
        if (videoStream) {
          const audioTracks = videoStream.getAudioTracks()
          audioTracks.forEach(track => stream.addTrack(track))
        }
      } catch (e) {
        console.warn('Could not capture audio from video:', e)
      }
    }

    const mimeType = format === 'webm' 
      ? 'video/webm;codecs=vp9'
      : 'video/webm' // MediaRecorder doesn't support MP4 directly

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      reject(new Error(`${format} format not supported by browser`))
      return
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: quality * 2500000, // Scale quality to bitrate
    })

    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      resolve(blob)
    }

    recorder.onerror = (e) => {
      reject(e)
    }

    // Start recording
    recorder.start()

    // Track progress
    let elapsed = 0
    const progressInterval = setInterval(() => {
      elapsed += 100
      const progress = Math.min((elapsed / (duration * 1000)) * 100, 100)
      onProgress?.(progress)

      if (elapsed >= duration * 1000) {
        clearInterval(progressInterval)
        recorder.stop()
        stream.getTracks().forEach(track => track.stop())
      }
    }, 100)
  })
}

/**
 * Export as animated GIF
 */
export async function exportAsGif(
  canvasElement: HTMLCanvasElement,
  videoElement: HTMLVideoElement,
  options: VideoExportOptions
): Promise<Blob> {
  const {
    fps = 10,
    duration = 5,
    width = 480,
    height = 270,
    onProgress,
  } = options

  // We'll use a simple approach: capture frames and create GIF
  // For production, you'd want to use a library like gif.js
  
  const frames: ImageData[] = []
  const frameCount = Math.floor(duration * fps)
  const frameDuration = 1000 / fps

  // Create a temporary canvas for resizing
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')!

  // Capture frames
  for (let i = 0; i < frameCount; i++) {
    const time = (i / frameCount) * duration
    
    // Seek video to current time
    if (videoElement) {
      videoElement.currentTime = time
      await new Promise(resolve => {
        videoElement.onseeked = resolve
        setTimeout(resolve, 100) // Fallback
      })
    }

    // Draw current state
    tempCtx.clearRect(0, 0, width, height)
    tempCtx.drawImage(canvasElement, 0, 0, width, height)
    
    // Capture frame
    const imageData = tempCtx.getImageData(0, 0, width, height)
    frames.push(imageData)

    onProgress?.(((i + 1) / frameCount) * 100)
  }

  // Convert frames to GIF
  // This is a simplified version - for real implementation use gif.js library
  const blob = await createGifFromFrames(frames, frameDuration, width, height)
  
  return blob
}

/**
 * Simple GIF encoder (placeholder - use gif.js in production)
 */
async function createGifFromFrames(
  frames: ImageData[],
  delay: number,
  width: number,
  height: number
): Promise<Blob> {
  // This is a placeholder that creates a simple animated PNG (APNG)
  // For actual GIF creation, integrate gif.js library
  
  // For now, return first frame as static image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  
  if (frames.length > 0) {
    ctx.putImageData(frames[0], 0, 0)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob())
    }, 'image/png')
  })
}

/**
 * Render video frame by frame on canvas
 */
export async function renderVideoFrames(
  canvasElement: HTMLCanvasElement,
  videoElement: HTMLVideoElement,
  duration: number,
  fps: number,
  onFrame?: (time: number, frameIndex: number) => void
): Promise<void> {
  const ctx = canvasElement.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  const frameCount = Math.floor(duration * fps)
  
  for (let i = 0; i < frameCount; i++) {
    const time = (i / frameCount) * duration
    
    // Seek video
    videoElement.currentTime = time
    await new Promise<void>((resolve) => {
      videoElement.onseeked = () => resolve()
      setTimeout(resolve, 100) // Fallback
    })

    // Let canvas render
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    onFrame?.(time, i)
  }
}

/**
 * Convert WebM to MP4 (requires server-side or WASM FFmpeg)
 */
export async function convertWebMToMP4(webmBlob: Blob): Promise<Blob> {
  // This would require FFmpeg.wasm or server-side conversion
  // For now, return the WebM blob as-is
  console.warn('MP4 conversion requires FFmpeg - returning WebM')
  return webmBlob
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
