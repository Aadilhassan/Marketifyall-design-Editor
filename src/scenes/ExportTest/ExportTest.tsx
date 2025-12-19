import { useEffect, useMemo, useState, useCallback } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import Editor from '@nkyo/scenify-sdk'
import ExportModal from '../Editor/components/Navbar/components/ExportModal'
import { getPopularVideos, isApiKeyConfigured, PexelsVideo, getBestVideoFile } from '@/services/pexels'
import useVideoContext from '@/hooks/useVideoContext'
import VideoTimeline from '../Editor/components/VideoTimeline'
import VideoCanvasPlayer from '../Editor/components/VideoCanvasPlayer'

function ExportTest() {
  const editor = useEditor()
  const { frameSize, canvas } = useEditorContext() as any
  const { addClip, setActiveClip, clips, audioClips, isTimelineOpen, setTimelineOpen } = useVideoContext()
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [pexelsVideo, setPexelsVideo] = useState<PexelsVideo | null>(null)
  const [loadingVideo, setLoadingVideo] = useState(false)
  const [addingVideo, setAddingVideo] = useState(false)
  const editorConfig = useMemo(() => ({ clipToFrame: true, scrollLimit: 0 }), [])

  // Check if timeline should be visible (has video/animation content)
  const hasTimelineContent = clips.length > 0 || audioClips.length > 0
  const shouldShowTimeline = hasTimelineContent && isTimelineOpen

  // Helper function to calculate next available start time (end of last video clip)
  const getNextVideoStartTime = useCallback(() => {
    if (clips.length === 0) {
      return 0 // Start at beginning if no clips exist
    }
    // Find the maximum end time of all existing video clips
    const maxEndTime = Math.max(...clips.map(clip => (clip.start || 0) + (clip.duration || 0)))
    return maxEndTime
  }, [clips])

  // Don't load a template - let the editor handle initialization
  // The editor will set up its own default frame and canvas

  // Load a single Pexels video on mount
  useEffect(() => {
    const loadPexelsVideo = async () => {
      if (!isApiKeyConfigured()) {
        console.warn('Pexels API key not configured')
        return
      }

      setLoadingVideo(true)
      try {
        const videos = await getPopularVideos(1)
        if (videos.length > 0) {
          setPexelsVideo(videos[0])
        }
      } catch (error) {
        console.error('Failed to load Pexels video:', error)
      } finally {
        setLoadingVideo(false)
      }
    }

    loadPexelsVideo()
  }, [])

  // Add video to canvas when clicked
  const handleVideoClick = useCallback(async () => {
    console.log('🎬 handleVideoClick called', { hasPexelsVideo: !!pexelsVideo, hasEditor: !!editor, addingVideo, frameSize })
    
    if (!pexelsVideo || !editor || addingVideo) {
      console.warn('⚠️ Early return:', { pexelsVideo: !!pexelsVideo, editor: !!editor, addingVideo })
            return
    }

    setAddingVideo(true)
    try {
      console.log('🔍 Getting video file from Pexels video:', pexelsVideo)
      const videoFile = getBestVideoFile(pexelsVideo)
      console.log('📹 Video file retrieved:', videoFile)
      
      if (!videoFile) {
        console.error('❌ No suitable video file found')
                setAddingVideo(false)
        return
      }

      const videoUrl = videoFile.link
      const clipId = `stock-${pexelsVideo.id}-${Date.now()}`
      
      // Load video to get actual dimensions and extract proper poster frame
      const videoElement = document.createElement('video')
      videoElement.src = videoUrl
      videoElement.crossOrigin = 'anonymous'
      videoElement.preload = 'metadata'

      
      await new Promise<void>((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
                    videoElement.currentTime = 0.1 // Seek to get a frame
          resolve()
        }
        videoElement.onerror = (err) => {
                    reject(err)
        }
      })

      // Wait for video to seek to frame
      await new Promise<void>((resolve) => {
        videoElement.onseeked = () => {
                    resolve()
        }
      })

      // Get actual video dimensions
      const videoWidth = videoElement.videoWidth || videoFile.width || 1920
      const videoHeight = videoElement.videoHeight || videoFile.height || 1080
      
      // Get canvas frame dimensions from editor context
      const frameWidth = frameSize?.width || 1920
      const frameHeight = frameSize?.height || 1080
      console.log('📐 Frame dimensions:', { frameSize, frameWidth, frameHeight })

      // STANDARD SIZE for all videos (Canva-like behavior)
      const STANDARD_WIDTH = 720
      const STANDARD_HEIGHT = 405
      const STANDARD_ASPECT_RATIO = STANDARD_WIDTH / STANDARD_HEIGHT // 16:9

      // Calculate how to fit/crop the video to standard size (cover mode)
      const videoAspectRatio = videoWidth / videoHeight
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = videoWidth
      let sourceHeight = videoHeight

      // If video is wider than standard (landscape), crop sides
      // If video is taller than standard (portrait), crop top/bottom
      if (videoAspectRatio > STANDARD_ASPECT_RATIO) {
        // Video is wider - crop left/right (fit to height, crop width)
        sourceHeight = videoHeight
        sourceWidth = videoHeight * STANDARD_ASPECT_RATIO
        sourceX = (videoWidth - sourceWidth) / 2
      } else {
        // Video is taller - crop top/bottom (fit to width, crop height)
        sourceWidth = videoWidth
        sourceHeight = videoWidth / STANDARD_ASPECT_RATIO
        sourceY = (videoHeight - sourceHeight) / 2
      }

      // Use standard dimensions for all videos
      const targetWidth = STANDARD_WIDTH
      const targetHeight = STANDARD_HEIGHT

      // Center the video on canvas frame
      const left = (frameWidth - targetWidth) / 2
      const top = (frameHeight - targetHeight) / 2
      
      // Extract poster frame from video, cropped and scaled to standard size
      const posterCanvas = document.createElement('canvas')
      posterCanvas.width = targetWidth
      posterCanvas.height = targetHeight
      const ctx = posterCanvas.getContext('2d')
      
      let posterUrl = ''
      if (ctx) {
        try {
          // Draw video frame: crop from source and scale to standard size
          ctx.drawImage(
            videoElement,
            sourceX, sourceY, sourceWidth, sourceHeight, // Source crop
            0, 0, targetWidth, targetHeight // Destination size
          )
          posterUrl = posterCanvas.toDataURL('image/png')
          console.log('🖼️ Poster extracted, length:', posterUrl.length)
                  } catch (drawError) {
          console.error('❌ Poster extraction failed:', drawError)
                  }
      } else {
        console.warn('⚠️ No canvas context for poster extraction, using fallback')
      }

      const addOptions = {
        type: 'StaticImage',
        metadata: {
          src: posterUrl || pexelsVideo.image, // Use extracted frame or fallback to thumbnail
          videoSrc: videoUrl,
          name: `Stock Video by ${pexelsVideo.user.name}`,
          duration: pexelsVideo.duration,
          id: clipId,
          isVideo: true,
          // Store crop info for video playback
          videoCrop: {
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            videoWidth,
            videoHeight,
          },
        },
        width: targetWidth, // Standard width (720)
        height: targetHeight, // Standard height (405)
        left,
        top,
        scaleX: 1, // No additional scaling
        scaleY: 1, // No additional scaling
        opacity: 1,
        visible: true,
      }
      console.log('📤 About to call editor.add() with options:', {
        type: addOptions.type,
        hasPosterUrl: !!posterUrl,
        posterUrlLength: posterUrl?.length || 0,
        fallbackImage: pexelsVideo.image,
        position: { left, top },
        dimensions: { width: targetWidth, height: targetHeight }
      })
      
      try {
        editor.add(addOptions)
        console.log('✅ editor.add() called successfully')
        
        // Deselect the object to remove blue border/selection handles
        setTimeout(() => {
          try {
            // Method 1: Use editor.deselect (preferred)
            if (editor && typeof editor.deselect === 'function') {
              editor.deselect()
              console.log('✅ Object deselected via editor.deselect()')
            }
            // Method 2: Use canvas methods as fallback
            if (canvas) {
              if (canvas.discardActiveObject) {
                canvas.discardActiveObject()
                canvas.renderAll()
                console.log('✅ Object deselected via canvas.discardActiveObject()')
              }
              if (canvas.deactivateAll) {
                canvas.deactivateAll()
                canvas.renderAll()
                console.log('✅ All objects deselected via canvas.deactivateAll()')
              }
              // Method 3: Click on canvas background to deselect
              const canvasElement = canvas.getElement?.() || canvas.lowerCanvasEl
              if (canvasElement) {
                // Simulate a click on the canvas background to deselect
                const clickEvent = new MouseEvent('mousedown', {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                  clientX: 10,
                  clientY: 10,
                })
                canvasElement.dispatchEvent(clickEvent)
                canvas.renderAll()
                console.log('✅ Simulated click to deselect')
              }
            }
          } catch (e) {
            console.warn('Could not deselect object:', e)
          }
        }, 200)
        
              } catch (addError) {
        console.error('❌ editor.add() threw error:', addError)
                throw addError
      }

      // Calculate start time to place video sequentially after existing videos
      const startTime = getNextVideoStartTime()

      // Ensure duration is valid (fallback to 10 seconds if invalid)
      const videoDuration = pexelsVideo.duration && pexelsVideo.duration > 0 ? pexelsVideo.duration : 10

      // Prepare clip data for timeline
      const clipData = {
        id: clipId,
        name: `Stock Video by ${pexelsVideo.user.name}`,
        src: videoUrl,
        duration: videoDuration,
        start: startTime,
        end: startTime + videoDuration,
        poster: posterUrl || pexelsVideo.image, // Use extracted poster frame
      }

      // Verify all required fields are present
      if (!clipData.id || !clipData.src || !clipData.duration || clipData.duration <= 0) {
        console.error('Invalid clip data:', clipData)
        throw new Error('Invalid clip data')
      }

      // Add to Timeline
      addClip(clipData)
      setActiveClip(clipId)
      // Open timeline automatically when video is added
      setTimelineOpen(true)
          } catch (error) {
      console.error('Failed to add video:', error)
          } finally {
      setAddingVideo(false)
          }
  }, [pexelsVideo, editor, addingVideo, frameSize, getNextVideoStartTime, addClip, setActiveClip, setTimelineOpen])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header with export button */}
      <div
        style={{
          padding: '16px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
          Canvas Export Test Page
        </h1>
        <button
          onClick={() => setIsExportModalOpen(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          Export Canvas
        </button>
      </div>

      {/* Video selection panel */}
      {pexelsVideo && (
        <div
          style={{
            padding: '16px 24px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              className="video-thumbnail-container"
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: addingVideo ? 'wait' : 'pointer',
                width: '200px',
                aspectRatio: '16/9',
                backgroundColor: '#1a1a1a',
                transition: 'transform 0.15s, box-shadow 0.15s',
                opacity: addingVideo ? 0.6 : 1,
              }}
              onClick={handleVideoClick}
              onMouseEnter={(e) => {
                if (!addingVideo) {
                  e.currentTarget.style.transform = 'scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
                  const overlay = e.currentTarget.querySelector('.video-overlay') as HTMLElement
                  if (overlay) overlay.style.opacity = '1'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
                const overlay = e.currentTarget.querySelector('.video-overlay') as HTMLElement
                if (overlay) overlay.style.opacity = '0'
              }}
            >
              <img
                src={pexelsVideo.image}
                alt={pexelsVideo.user.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div
                className="video-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  ▶
                </div>
              </div>
              {addingVideo && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.5)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Loading...
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                Click to Add Video to Canvas
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                Video by {pexelsVideo.user.name} • Duration: {Math.round(pexelsVideo.duration)}s
              </p>
              {addingVideo && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#667eea', fontWeight: 500 }}>
                  Adding video to canvas...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {loadingVideo && (
        <div
          style={{
            padding: '16px 24px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            textAlign: 'center',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          Loading video from Pexels...
        </div>
      )}

      {!isApiKeyConfigured() && !loadingVideo && (
        <div
          style={{
            padding: '16px 24px',
            background: '#fff3cd',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '13px',
            color: '#856404',
          }}
        >
          <strong>⚠️ Pexels API Key Missing</strong>
          <br />
          Add your Pexels API key to the .env file: <code>REACT_APP_PIXELS_KEY=your_key_here</code>
        </div>
      )}

      {/* Editor container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          background: '#e5e7eb',
          position: 'relative',
          // Add padding when timeline is open and visible
          paddingBottom: shouldShowTimeline ? '300px' : '0', // Timeline height (260px) + bottom offset (20px) + extra spacing (20px)
        }}
        className="canvas-container"
        onClick={(e) => {
          // Click on canvas background to deselect objects and remove blue border
          const target = e.target as HTMLElement
          if (target.tagName === 'CANVAS' || target.classList.contains('canvas-container')) {
            try {
              if (editor && typeof editor.deselect === 'function') {
                editor.deselect()
              } else if (canvas?.discardActiveObject) {
                canvas.discardActiveObject()
                canvas.renderAll()
              }
            } catch (err) {
              // Ignore errors
            }
          }
        }}
      >
        <Editor config={editorConfig} />
        <VideoCanvasPlayer />
        <VideoTimeline />
      </div>

      {/* Info panel */}
      <div
        style={{
          padding: '16px 24px',
          background: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          fontSize: '13px',
          color: '#6b7280',
        }}
      >
        <p style={{ margin: '0 0 8px 0' }}>
          This is an isolated test page for the canvas export feature. Click the video above to add it to the canvas,
          then click "Export Canvas" to test various export formats (PNG, JPG, WebP, SVG, PDF, JSON, MP4, WebM, GIF).
        </p>
        {frameSize?.width && frameSize?.height && (
          <p style={{ margin: 0, fontSize: '12px', color: '#667eea', fontWeight: 500 }}>
            📐 Current Canvas Dimensions: {Math.round(frameSize.width)} × {Math.round(frameSize.height)} 
            {' '}(Select "Original" in export to use these exact dimensions)
          </p>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        designName="test-export"
      />
    </div>
  )
}

export default ExportTest









