/**
 * Video Exporter Utility
 * 
 * Uses MediaRecorder with timeline playback synchronization.
 * The timeline must be playing for this to capture animated content.
 */

export interface VideoExportOptions {
  format: 'mp4' | 'webm' | 'gif'
  fps?: number
  quality?: number
  duration?: number
  width?: number
  height?: number
  bitrate?: number
  onProgress?: (progress: number, phase?: string) => void
}

/**
 * Export video using MediaRecorder
 * 
 * IMPORTANT: The timeline must already be playing when this is called.
 * The ExportModal triggers play() before calling this function.
 */
export async function exportVideoWithRecorder(
  fabricCanvasElement: HTMLCanvasElement,
  _videoElement: HTMLVideoElement | null,
  options: VideoExportOptions
): Promise<Blob> {
  const {
    fps = 30,
    duration = 10,
    width = 1920,
    height = 1080,
    bitrate = 25000000,
    onProgress,
  } = options

  return new Promise((resolve, reject) => {
    try {
      onProgress?.(5, 'Preparing...')

      // Create export canvas at target resolution
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = width
      exportCanvas.height = height
      const ctx = exportCanvas.getContext('2d')!

      // Get the canvas container to find all videos
      const canvasContainer = document.querySelector('.canvas-container')

      // Calculate scale from source to export canvas
      const scaleX = width / fabricCanvasElement.width
      const scaleY = height / fabricCanvasElement.height

      onProgress?.(10, 'Recording...')

      // Create stream from export canvas
      const stream = exportCanvas.captureStream(fps)

      // Try to capture audio from any video in the canvas container
      if (canvasContainer) {
        const videos = canvasContainer.querySelectorAll('video') as NodeListOf<HTMLVideoElement>
        videos.forEach(video => {
          try {
            // @ts-ignore
            const videoStream = video.captureStream?.()
            if (videoStream) {
              const audioTracks = videoStream.getAudioTracks()
              audioTracks.forEach(track => stream.addTrack(track))
            }
          } catch (e) {
            // Ignore audio capture errors
          }
        })
      }

      // Choose best available codec
      let mimeType = 'video/webm;codecs=vp9'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
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

      // Animation loop - captures the fabric canvas + video overlays each frame
      const startTime = performance.now()
      const durationMs = duration * 1000

      const drawFrame = () => {
        const elapsed = performance.now() - startTime

        // Clear canvas with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        // Draw the fabric canvas (this is the main design canvas)
        // The fabric canvas updates automatically as the timeline plays
        ctx.drawImage(fabricCanvasElement, 0, 0, width, height)

        // Find and draw video overlays
        // The VideoCanvasOverlay renders videos as absolutely positioned elements
        if (canvasContainer) {
          // Get the canvas container's bounding rect for position calculations
          const containerRect = canvasContainer.getBoundingClientRect()
          const canvasRect = fabricCanvasElement.getBoundingClientRect()

          // Find all video elements within the parent container (including overlay)
          const parentEl = canvasContainer.parentElement
          if (parentEl) {
            const allVideos = parentEl.querySelectorAll('video') as NodeListOf<HTMLVideoElement>

            allVideos.forEach(video => {
              if (video.readyState >= 2) {
                // Get the video's parent container (Overlay styled div) for position
                const overlayDiv = video.closest('[style*="position: absolute"]') || video.parentElement?.parentElement

                if (overlayDiv) {
                  const overlayStyle = window.getComputedStyle(overlayDiv)

                  // Extract position from style
                  let left = parseFloat(overlayStyle.left) || 0
                  let top = parseFloat(overlayStyle.top) || 0
                  let vidWidth = parseFloat(overlayStyle.width) || video.videoWidth
                  let vidHeight = parseFloat(overlayStyle.height) || video.videoHeight

                  // Scale positions to export canvas size
                  // The overlay positions are relative to the canvas container
                  const relativeLeft = left / fabricCanvasElement.width
                  const relativeTop = top / fabricCanvasElement.height
                  const relativeWidth = vidWidth / fabricCanvasElement.width
                  const relativeHeight = vidHeight / fabricCanvasElement.height

                  ctx.drawImage(
                    video,
                    relativeLeft * width,
                    relativeTop * height,
                    relativeWidth * width,
                    relativeHeight * height
                  )
                }
              }
            })
          }
        }

        // Update progress
        const progress = 10 + Math.min((elapsed / durationMs) * 85, 85)
        onProgress?.(progress, 'Recording...')

        // Continue or stop
        if (elapsed < durationMs) {
          requestAnimationFrame(drawFrame)
        } else {
          onProgress?.(95, 'Finalizing...')

          setTimeout(() => {
            recorder.stop()
            stream.getTracks().forEach(track => track.stop())
            onProgress?.(100, 'Complete!')
          }, 100)
        }
      }

      // Start the animation loop
      requestAnimationFrame(drawFrame)

    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Export as GIF (uses MediaRecorder, outputs WebM)
 */
export async function exportAsGif(
  canvasElement: HTMLCanvasElement,
  videoElement: HTMLVideoElement | null,
  options: VideoExportOptions
): Promise<Blob> {
  return exportVideoWithRecorder(canvasElement, videoElement, {
    ...options,
    fps: 10,
    bitrate: 5000000,
  })
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
