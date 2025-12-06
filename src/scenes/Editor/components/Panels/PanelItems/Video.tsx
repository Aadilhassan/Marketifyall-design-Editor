import React, { useState, useRef, useCallback, useEffect } from 'react'
import { styled } from 'baseui'
import { useEditor } from '@nkyo/scenify-sdk'
import useVideoContext from '@/hooks/useVideoContext'
import { Scrollbars } from 'react-custom-scrollbars'

const Container = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#ffffff',
})

const Header = styled('div', {
  padding: '20px',
  borderBottom: '1px solid #e5e7eb',
})

const Title = styled('h2', {
  fontSize: '18px',
  fontWeight: 600,
  color: '#1f2937',
  margin: 0,
  marginBottom: '4px',
})

const Subtitle = styled('p', {
  fontSize: '13px',
  color: '#6b7280',
  margin: 0,
})

const Content = styled('div', {
  flex: 1,
  padding: '20px',
})

const UploadArea = styled('div', {
  border: '2px dashed #e5e7eb',
  borderRadius: '12px',
  padding: '40px 20px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  marginBottom: '24px',
  ':hover': {
    borderColor: '#667eea',
    background: '#f9f9ff',
  },
})

const UploadIcon = styled('div', {
  width: '64px',
  height: '64px',
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
  color: '#ffffff',
})

const UploadText = styled('p', {
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
  margin: '0 0 8px',
})

const UploadHint = styled('p', {
  fontSize: '12px',
  color: '#9ca3af',
  margin: 0,
})

const HiddenInput = styled('input', {
  display: 'none',
})

const SectionTitle = styled('h3', {
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const VideoGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '12px',
  marginBottom: '24px',
})

const VideoCard = styled('div', {
  position: 'relative',
  borderRadius: '8px',
  overflow: 'hidden',
  cursor: 'pointer',
  border: '2px solid transparent',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#667eea',
    transform: 'scale(1.02)',
  },
})

const VideoThumbnail = styled('div', ({ $bg }: { $bg: string }) => ({
  width: '100%',
  paddingBottom: '56.25%',
  background: $bg,
  position: 'relative',
}))

const PlayButton = styled('div', {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
})

const VideoDuration = styled('div', {
  position: 'absolute',
  bottom: '8px',
  right: '8px',
  background: 'rgba(0, 0, 0, 0.7)',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 500,
  padding: '2px 6px',
  borderRadius: '4px',
})

const VideoLabel = styled('div', {
  padding: '8px',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  background: '#f9fafb',
})

const ToolsSection = styled('div', {
  marginTop: '24px',
})

const ToolButton = styled('button', ({ $active }: { $active?: boolean }) => ({
  width: '100%',
  padding: '14px 16px',
  borderRadius: '10px',
  border: $active ? '2px solid #667eea' : '1px solid #e5e7eb',
  background: $active ? '#f9f9ff' : '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '10px',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#667eea',
    background: '#f9f9ff',
  },
}))

const ToolIcon = styled('div', ({ $color }: { $color: string }) => ({
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  background: $color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
}))

const ToolInfo = styled('div', {
  flex: 1,
  textAlign: 'left',
})

const ToolName = styled('div', {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1f2937',
  marginBottom: '2px',
})

const ToolDesc = styled('div', {
  fontSize: '12px',
  color: '#6b7280',
})

const UploadedVideoContainer = styled('div', {
  marginBottom: '24px',
})

const UploadedVideo = styled('div', {
  position: 'relative',
  borderRadius: '12px',
  overflow: 'hidden',
  border: '2px solid #e5e7eb',
  marginBottom: '12px',
})

const VideoElement = styled('video', {
  width: '100%',
  display: 'block',
})

const VideoControls = styled('div', {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
  flexWrap: 'wrap',
})

const ControlButton = styled('button', ({ $primary }: { $primary?: boolean }) => ({
  flex: 1,
  minWidth: '100px',
  padding: '10px 16px',
  borderRadius: '8px',
  border: $primary ? 'none' : '1px solid #e5e7eb',
  background: $primary ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ffffff',
  color: $primary ? '#ffffff' : '#374151',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.2s',
  ':hover': {
    transform: 'translateY(-1px)',
  },
}))

// Modal styles
const ModalOverlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
})

const ModalContent = styled('div', {
  background: '#ffffff',
  borderRadius: '16px',
  width: '90%',
  maxWidth: '600px',
  maxHeight: '80vh',
  overflow: 'auto',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
})

const ModalHeader = styled('div', {
  padding: '20px 24px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

const ModalTitle = styled('h3', {
  fontSize: '18px',
  fontWeight: 600,
  color: '#1f2937',
  margin: 0,
})

const CloseButton = styled('button', {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '8px',
  color: '#6b7280',
  ':hover': {
    background: '#f3f4f6',
  },
})

const ModalBody = styled('div', {
  padding: '24px',
})

// Animation styles
const AnimationGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
  marginBottom: '20px',
})

const AnimationCard = styled('div', ({ $selected }: { $selected?: boolean }) => ({
  padding: '16px',
  borderRadius: '12px',
  border: $selected ? '2px solid #667eea' : '2px solid #e5e7eb',
  background: $selected ? '#f9f9ff' : '#ffffff',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#667eea',
    transform: 'scale(1.02)',
  },
}))

const AnimationIcon = styled('div', {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 8px',
  color: '#ffffff',
  fontSize: '20px',
})

const AnimationName = styled('div', {
  fontSize: '13px',
  fontWeight: 500,
  color: '#374151',
})

// Timeline styles
const TimelineContainer = styled('div', {
  background: '#1f2937',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '16px',
})

const TimelineTrack = styled('div', {
  height: '60px',
  background: '#374151',
  borderRadius: '8px',
  position: 'relative',
  marginBottom: '12px',
  overflow: 'hidden',
})

const TimelineClip = styled('div', ({ $width, $left }: { $width: number; $left: number }) => ({
  position: 'absolute',
  height: '100%',
  width: `${$width}%`,
  left: `${$left}%`,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  cursor: 'move',
}))

const TimelineClipLabel = styled('span', {
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

const TimelineControls = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const TimelineButton = styled('button', {
  background: '#374151',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '12px',
  ':hover': {
    background: '#4b5563',
  },
})

const TimelineTime = styled('span', {
  color: '#9ca3af',
  fontSize: '12px',
  fontFamily: 'monospace',
})

// Screen Recording styles
const RecordingPreview = styled('div', {
  background: '#1f2937',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center',
})

const RecordingVideo = styled('video', {
  width: '100%',
  maxHeight: '300px',
  borderRadius: '8px',
  background: '#000',
})

const RecordingStatus = styled('div', ({ $recording }: { $recording?: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '16px',
  color: $recording ? '#ef4444' : '#9ca3af',
  fontSize: '14px',
  fontWeight: 500,
}))

const RecordingDot = styled('div', ({ $recording }: { $recording?: boolean }) => ({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  background: $recording ? '#ef4444' : '#9ca3af',
  animation: $recording ? 'pulse 1s infinite' : 'none',
}))

const RecordingButtons = styled('div', {
  display: 'flex',
  gap: '12px',
  marginTop: '16px',
  justifyContent: 'center',
  flexWrap: 'wrap',
})

const RecordButton = styled('button', ({ $recording }: { $recording?: boolean }) => ({
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  background: $recording ? '#ef4444' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  ':hover': {
    opacity: 0.9,
  },
}))

const FrameSlider = styled('div', {
  marginTop: '16px',
})

const SliderLabel = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
  fontSize: '12px',
  color: '#6b7280',
})

const Slider = styled('input', {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: '#e5e7eb',
  outline: 'none',
  appearance: 'none',
  '::-webkit-slider-thumb': {
    appearance: 'none',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#667eea',
    cursor: 'pointer',
  },
})

// Sample video templates
const VIDEO_TEMPLATES = [
  { id: 1, name: 'Intro Animation', duration: '0:05', color: '#667eea' },
  { id: 2, name: 'Social Story', duration: '0:15', color: '#ec4899' },
  { id: 3, name: 'Product Showcase', duration: '0:30', color: '#10b981' },
  { id: 4, name: 'Promo Video', duration: '0:45', color: '#f59e0b' },
]

// Animation presets
const ANIMATIONS = [
  { id: 'fade-in', name: 'Fade In', icon: '◐' },
  { id: 'slide-left', name: 'Slide Left', icon: '←' },
  { id: 'slide-right', name: 'Slide Right', icon: '→' },
  { id: 'slide-up', name: 'Slide Up', icon: '↑' },
  { id: 'slide-down', name: 'Slide Down', icon: '↓' },
  { id: 'zoom-in', name: 'Zoom In', icon: '⊕' },
  { id: 'zoom-out', name: 'Zoom Out', icon: '⊖' },
  { id: 'rotate', name: 'Rotate', icon: '↻' },
  { id: 'bounce', name: 'Bounce', icon: '⤴' },
]

type ModalType = 'animate' | 'record' | 'timeline' | null

function Video() {
  const editor = useEditor()
  const { addClip, setActiveClip, setTimelineOpen } = useVideoContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedAnimation, setSelectedAnimation] = useState<string>('fade-in')
  const [animationDuration, setAnimationDuration] = useState(1)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameTime, setFrameTime] = useState(0)

  const extractFrame = useCallback(async (src: string, at: number) => {
    return new Promise<string | null>((resolve) => {
      const video = document.createElement('video')
      video.src = src
      video.crossOrigin = 'anonymous'
      video.currentTime = at
      video.onloadeddata = () => {
        video.currentTime = at
      }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1920
        canvas.height = video.videoHeight || 1080
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } else {
          resolve(null)
        }
      }
      video.onerror = () => resolve(null)
    })
  }, [])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      const url = URL.createObjectURL(file)
      setUploadedVideo(url)
    }
  }, [])

  // Add video as image frame to canvas
  const handleAddFrame = useCallback(async () => {
    if (!editor || !uploadedVideo) return

    try {
      const video = document.createElement('video')
      video.src = uploadedVideo
      video.crossOrigin = 'anonymous'
      video.currentTime = frameTime
      
      video.onloadeddata = () => {
        video.currentTime = frameTime
      }
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          const frameDataUrl = canvas.toDataURL('image/png')
          
          editor.add({
            type: 'StaticImage',
            metadata: {
              src: frameDataUrl,
              name: `Video Frame at ${frameTime.toFixed(1)}s`,
            },
          })
        }
      }
    } catch (error) {
      console.error('Error extracting frame:', error)
    }
  }, [editor, uploadedVideo, frameTime])

  // Add video to global timeline instead of flattening to an image
  const handleAddVideoToTimeline = useCallback(async () => {
    if (!uploadedVideo) return

    const clipId = `clip-${Date.now()}`
    const poster = await extractFrame(uploadedVideo, 0)
    const clipDuration = duration || videoRef.current?.duration || 1

    addClip({
      id: clipId,
      name: videoFile?.name || 'Video clip',
      src: uploadedVideo,
      duration: clipDuration,
      start: 0,
      end: clipDuration,
      poster: poster || undefined,
    })

    setActiveClip(clipId)
    setTimelineOpen(true)
  }, [uploadedVideo, extractFrame, duration, addClip, videoFile, setActiveClip, setTimelineOpen])

  const handleRemoveVideo = () => {
    if (uploadedVideo) {
      URL.revokeObjectURL(uploadedVideo)
    }
    setUploadedVideo(null)
    setVideoFile(null)
    setFrameTime(0)
  }

  // Animation functions
  const applyAnimationPreview = useCallback((animationType: string, dur: number) => {
    const canvasElement = document.querySelector('.canvas-container canvas') as HTMLElement
    if (!canvasElement) return

    const keyframes: Record<string, Keyframe[]> = {
      'fade-in': [{ opacity: 0 }, { opacity: 1 }],
      'slide-left': [{ transform: 'translateX(100px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
      'slide-right': [{ transform: 'translateX(-100px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
      'slide-up': [{ transform: 'translateY(100px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      'slide-down': [{ transform: 'translateY(-100px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      'zoom-in': [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      'zoom-out': [{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      'rotate': [{ transform: 'rotate(-180deg)', opacity: 0 }, { transform: 'rotate(0)', opacity: 1 }],
      'bounce': [
        { transform: 'translateY(-50px)', opacity: 0 },
        { transform: 'translateY(10px)', opacity: 1 },
        { transform: 'translateY(-5px)', opacity: 1 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
    }

    if (keyframes[animationType]) {
      canvasElement.animate(keyframes[animationType], {
        duration: dur * 1000,
        easing: 'ease-out',
      })
    }
  }, [])

  const handleApplyAnimation = useCallback(() => {
    if (!editor) return
    
    // Apply CSS animation preview
    applyAnimationPreview(selectedAnimation, animationDuration)
    
    setActiveModal(null)
    alert(`Animation "${selectedAnimation}" applied! Duration: ${animationDuration}s\n\nNote: Animation will play when exporting as video.`)
  }, [editor, selectedAnimation, animationDuration, applyAnimationPreview])

  // Screen Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      })

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream
        previewVideoRef.current.play()
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      })

      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setRecordedVideo(url)
        stream.getTracks().forEach(track => track.stop())
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = null
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not start screen recording. Please allow screen sharing.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleAddRecordingToCanvas = useCallback(() => {
    if (!editor || !recordedVideo) return

    // Extract first frame from recorded video
    const video = document.createElement('video')
    video.src = recordedVideo
    video.crossOrigin = 'anonymous'
    
    video.onloadeddata = () => {
      video.currentTime = 0
    }
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1920
      canvas.height = video.videoHeight || 1080
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const frameDataUrl = canvas.toDataURL('image/png')
        
        editor.add({
          type: 'StaticImage',
          metadata: {
            src: frameDataUrl,
            name: 'Screen Recording',
            videoSrc: recordedVideo,
            isVideo: true,
          },
        })
      }
    }

    setActiveModal(null)
  }, [editor, recordedVideo])

  const downloadRecording = () => {
    if (!recordedVideo) return
    
    const a = document.createElement('a')
    a.href = recordedVideo
    a.download = `screen-recording-${Date.now()}.webm`
    a.click()
  }

  // Timeline functions
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Update frame time when video time changes
  useEffect(() => {
    if (videoRef.current && uploadedVideo) {
      videoRef.current.currentTime = frameTime
    }
  }, [frameTime, uploadedVideo])

  return (
    <Container>
      <Header>
        <Title>Video Editor</Title>
        <Subtitle>Create and edit video content</Subtitle>
      </Header>

      <Scrollbars>
        <Content>
          {/* Upload Area */}
          <UploadArea onClick={handleUploadClick}>
            <UploadIcon>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </UploadIcon>
            <UploadText>Upload Video</UploadText>
            <UploadHint>MP4, WebM, MOV up to 100MB</UploadHint>
          </UploadArea>
          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
          />

          {/* Uploaded Video Preview */}
          {uploadedVideo && (
            <UploadedVideoContainer>
              <SectionTitle>Your Video</SectionTitle>
              <UploadedVideo>
                <VideoElement 
                  ref={videoRef}
                  src={uploadedVideo} 
                  controls
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoaded}
                />
              </UploadedVideo>
              
              {/* Frame Selector */}
              <FrameSlider>
                <SliderLabel>
                  <span>Select Frame</span>
                  <span>{formatTime(frameTime)}</span>
                </SliderLabel>
                <Slider
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={frameTime}
                  onChange={(e) => setFrameTime(parseFloat(e.target.value))}
                />
              </FrameSlider>
              
              <VideoControls>
                <ControlButton onClick={handleRemoveVideo}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Remove
                </ControlButton>
                <ControlButton onClick={handleAddFrame}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  Add Frame
                </ControlButton>
                <ControlButton $primary onClick={handleAddVideoToTimeline}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Add to Timeline
                </ControlButton>
              </VideoControls>
            </UploadedVideoContainer>
          )}

          {/* Video Templates */}
          <SectionTitle>Video Templates</SectionTitle>
          <VideoGrid>
            {VIDEO_TEMPLATES.map((template) => (
              <VideoCard key={template.id}>
                <VideoThumbnail $bg={template.color}>
                  <PlayButton>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </PlayButton>
                  <VideoDuration>{template.duration}</VideoDuration>
                </VideoThumbnail>
                <VideoLabel>{template.name}</VideoLabel>
              </VideoCard>
            ))}
          </VideoGrid>

          {/* Video Tools */}
          <ToolsSection>
            <SectionTitle>Video Tools</SectionTitle>
            
            <ToolButton onClick={() => setActiveModal('animate')} $active={activeModal === 'animate'}>
              <ToolIcon $color="#667eea">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
              </ToolIcon>
              <ToolInfo>
                <ToolName>Animate Design</ToolName>
                <ToolDesc>Add motion to your static designs</ToolDesc>
              </ToolInfo>
            </ToolButton>

            <ToolButton onClick={() => setActiveModal('record')} $active={activeModal === 'record'}>
              <ToolIcon $color="#10b981">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </ToolIcon>
              <ToolInfo>
                <ToolName>Screen Recording</ToolName>
                <ToolDesc>Record your screen and webcam</ToolDesc>
              </ToolInfo>
            </ToolButton>

            <ToolButton onClick={() => setActiveModal('timeline')} $active={activeModal === 'timeline'}>
              <ToolIcon $color="#ec4899">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="2" y1="7" x2="7" y2="7" />
                  <line x1="2" y1="17" x2="7" y2="17" />
                  <line x1="17" y1="17" x2="22" y2="17" />
                  <line x1="17" y1="7" x2="22" y2="7" />
                </svg>
              </ToolIcon>
              <ToolInfo>
                <ToolName>Video Timeline</ToolName>
                <ToolDesc>Edit video with timeline controls</ToolDesc>
              </ToolInfo>
            </ToolButton>
          </ToolsSection>
        </Content>
      </Scrollbars>

      {/* Animation Modal */}
      {activeModal === 'animate' && (
        <ModalOverlay onClick={() => setActiveModal(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Animate Design</ModalTitle>
              <CloseButton onClick={() => setActiveModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <SectionTitle>Choose Animation</SectionTitle>
              <AnimationGrid>
                {ANIMATIONS.map((anim) => (
                  <AnimationCard
                    key={anim.id}
                    $selected={selectedAnimation === anim.id}
                    onClick={() => setSelectedAnimation(anim.id)}
                  >
                    <AnimationIcon>{anim.icon}</AnimationIcon>
                    <AnimationName>{anim.name}</AnimationName>
                  </AnimationCard>
                ))}
              </AnimationGrid>

              <FrameSlider>
                <SliderLabel>
                  <span>Duration</span>
                  <span>{animationDuration}s</span>
                </SliderLabel>
                <Slider
                  type="range"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={animationDuration}
                  onChange={(e) => setAnimationDuration(parseFloat(e.target.value))}
                />
              </FrameSlider>

              <VideoControls style={{ marginTop: '20px' }}>
                <ControlButton onClick={() => applyAnimationPreview(selectedAnimation, animationDuration)}>
                  Preview
                </ControlButton>
                <ControlButton $primary onClick={handleApplyAnimation}>
                  Apply Animation
                </ControlButton>
              </VideoControls>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Screen Recording Modal */}
      {activeModal === 'record' && (
        <ModalOverlay onClick={() => setActiveModal(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Screen Recording</ModalTitle>
              <CloseButton onClick={() => setActiveModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <RecordingPreview>
                {recordedVideo ? (
                  <RecordingVideo src={recordedVideo} controls />
                ) : (
                  <RecordingVideo ref={previewVideoRef} autoPlay muted />
                )}
                
                <RecordingStatus $recording={isRecording}>
                  <RecordingDot $recording={isRecording} />
                  {isRecording ? 'Recording...' : recordedVideo ? 'Recording Complete' : 'Ready to Record'}
                </RecordingStatus>

                <RecordingButtons>
                  {!isRecording && !recordedVideo && (
                    <RecordButton onClick={startRecording}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      Start Recording
                    </RecordButton>
                  )}
                  
                  {isRecording && (
                    <RecordButton $recording onClick={stopRecording}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" />
                      </svg>
                      Stop Recording
                    </RecordButton>
                  )}

                  {recordedVideo && (
                    <>
                      <ControlButton onClick={() => setRecordedVideo(null)}>
                        Record Again
                      </ControlButton>
                      <ControlButton onClick={downloadRecording}>
                        Download
                      </ControlButton>
                      <ControlButton $primary onClick={handleAddRecordingToCanvas}>
                        Add to Canvas
                      </ControlButton>
                    </>
                  )}
                </RecordingButtons>
              </RecordingPreview>

              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Timeline Modal */}
      {activeModal === 'timeline' && (
        <ModalOverlay onClick={() => setActiveModal(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <ModalHeader>
              <ModalTitle>Video Timeline</ModalTitle>
              <CloseButton onClick={() => setActiveModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              {uploadedVideo ? (
                <>
                  <UploadedVideo>
                    <VideoElement 
                      ref={videoRef}
                      src={uploadedVideo} 
                      onTimeUpdate={handleVideoTimeUpdate}
                      onLoadedMetadata={handleVideoLoaded}
                    />
                  </UploadedVideo>

                  <TimelineContainer>
                    <TimelineTrack>
                      <TimelineClip $width={100} $left={0}>
                        <TimelineClipLabel>{videoFile?.name || 'Video Clip'}</TimelineClipLabel>
                      </TimelineClip>
                      {/* Playhead */}
                      <div style={{
                        position: 'absolute',
                        left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        background: '#ef4444',
                        zIndex: 10,
                      }} />
                    </TimelineTrack>

                    <TimelineControls>
                      <TimelineButton onClick={() => seekTo(0)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="19 20 9 12 19 4 19 20" />
                          <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </TimelineButton>
                      <TimelineButton onClick={togglePlayPause}>
                        {isPlaying ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </TimelineButton>
                      <TimelineButton onClick={() => seekTo(duration)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 4 15 12 5 20 5 4" />
                          <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </TimelineButton>
                      <TimelineTime>{formatTime(currentTime)} / {formatTime(duration)}</TimelineTime>
                    </TimelineControls>
                  </TimelineContainer>

                  <VideoControls style={{ marginTop: '16px' }}>
                    <ControlButton onClick={handleAddFrame}>
                      Extract Current Frame
                    </ControlButton>
                    <ControlButton $primary onClick={handleAddVideoToTimeline}>
                      Add to Timeline
                    </ControlButton>
                  </VideoControls>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <p>Upload a video first to use the timeline editor</p>
                  <ControlButton $primary onClick={() => { setActiveModal(null); handleUploadClick(); }} style={{ marginTop: '16px' }}>
                    Upload Video
                  </ControlButton>
                </div>
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  )
}

export default Video
