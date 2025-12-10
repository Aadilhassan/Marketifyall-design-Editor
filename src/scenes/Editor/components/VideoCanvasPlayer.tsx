import React, { useCallback, useEffect, useRef, useState } from 'react'
import { styled } from 'baseui'
import useVideoContext from '@/hooks/useVideoContext'
import { useEditorContext } from '@nkyo/scenify-sdk'

const OverlayContainer = styled('div', {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 5,
})

const VideoPlayerWrapper = styled('div', {
    position: 'absolute',
    pointerEvents: 'none',
    overflow: 'hidden',
})

const VideoElement = styled('video', {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
})

const PlayButtonStyled = styled('button', {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.75)',
    border: '3px solid rgba(255, 255, 255, 0.95)',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    zIndex: 20,
    ':hover': {
        transform: 'translate(-50%, -50%) scale(1.15)',
        background: 'rgba(0, 0, 0, 0.9)',
    },
})

interface VideoInfo {
    id: string
    left: number
    top: number
    width: number
    height: number
    src: string
    poster?: string
}

const VideoCanvasPlayer: React.FC = () => {
    const { clips, setActiveClip } = useVideoContext()
    const { canvas } = useEditorContext()
    const [videoInfos, setVideoInfos] = useState<VideoInfo[]>([])
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
    const overlayRef = useRef<HTMLDivElement>(null)

    // Find video objects and calculate positions
    const updateVideoPositions = useCallback(() => {
        if (!canvas) return

        try {
            // @ts-ignore - getObjects is fabric.js method
            const objects = canvas.getObjects?.() || []

            // Find actual canvas element for positioning
            // @ts-ignore
            const canvasEl = canvas.lowerCanvasEl as HTMLCanvasElement
            if (!canvasEl || !overlayRef.current) return

            const canvasRect = canvasEl.getBoundingClientRect()
            const overlayRect = overlayRef.current.getBoundingClientRect()

            // @ts-ignore
            const zoom = canvas.getZoom?.() || 1
            // @ts-ignore  
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]

            const newVideoInfos: VideoInfo[] = []

            objects.forEach((obj: any) => {
                // Check for video objects
                if (!obj.metadata?.isVideo && !obj.metadata?.videoSrc) return

                const videoSrc = obj.metadata?.videoSrc || obj.metadata?.src
                if (!videoSrc) return

                const clipId = obj.metadata?.id || `video-obj-${newVideoInfos.length}`

                // Get clip info if available
                const clip = clips.find(c => c.id === clipId)

                // Calculate position
                const objLeft = obj.left || 0
                const objTop = obj.top || 0
                const objWidth = (obj.width || 100) * (obj.scaleX || 1)
                const objHeight = (obj.height || 100) * (obj.scaleY || 1)

                // Apply zoom and viewport transform
                const screenX = objLeft * zoom + vpt[4]
                const screenY = objTop * zoom + vpt[5]

                // Offset from overlay container
                const left = screenX + (canvasRect.left - overlayRect.left)
                const top = screenY + (canvasRect.top - overlayRect.top)

                newVideoInfos.push({
                    id: clipId,
                    left,
                    top,
                    width: objWidth * zoom,
                    height: objHeight * zoom,
                    src: clip?.src || videoSrc,
                    poster: clip?.poster || obj.metadata?.src,
                })
            })

            setVideoInfos(newVideoInfos)
        } catch (err) {
            console.error('VideoCanvasPlayer error:', err)
        }
    }, [canvas, clips])

    // Update positions continuously
    useEffect(() => {
        if (!canvas) return

        let animId: number
        let running = true

        const loop = () => {
            if (!running) return
            updateVideoPositions()
            animId = requestAnimationFrame(loop)
        }

        // Start after a short delay
        const timer = setTimeout(() => {
            loop()
        }, 200)

        return () => {
            running = false
            clearTimeout(timer)
            cancelAnimationFrame(animId)
        }
    }, [canvas, updateVideoPositions])

    // Play/pause handler
    const handlePlayPause = useCallback((videoId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        const video = videoRefs.current[videoId]
        if (!video) return

        if (playingId === videoId) {
            // Pause
            video.pause()
            setPlayingId(null)
        } else {
            // Pause any other playing video
            Object.values(videoRefs.current).forEach(v => v?.pause())

            // Play this one
            video.play()
                .then(() => setPlayingId(videoId))
                .catch(err => {
                    console.error('Play failed:', err)
                    setPlayingId(null)
                })

            setActiveClip(videoId)
        }
    }, [playingId, setActiveClip])

    // Handle video end
    const handleEnded = useCallback((videoId: string) => {
        if (playingId === videoId) {
            setPlayingId(null)
        }
        const video = videoRefs.current[videoId]
        if (video) {
            video.currentTime = 0
        }
    }, [playingId])

    // Show nothing if no videos found
    if (videoInfos.length === 0) {
        return <OverlayContainer ref={overlayRef} />
    }

    return (
        <OverlayContainer ref={overlayRef}>
            {videoInfos.map(info => {
                const isPlaying = playingId === info.id
                const buttonSize = Math.max(36, Math.min(56, Math.min(info.width, info.height) * 0.18))

                return (
                    <VideoPlayerWrapper
                        key={info.id}
                        style={{
                            left: info.left,
                            top: info.top,
                            width: info.width,
                            height: info.height,
                        }}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {/* Hidden video that plays on top */}
                        <VideoElement
                            ref={el => { videoRefs.current[info.id] = el }}
                            src={info.src}
                            poster={info.poster}
                            muted
                            playsInline
                            crossOrigin="anonymous"
                            onEnded={() => handleEnded(info.id)}
                            style={{
                                opacity: isPlaying ? 1 : 0,
                            }}
                        />

                        {/* Play button - always visible when not playing */}
                        {!isPlaying && (
                            <PlayButtonStyled
                                onClick={(e) => handlePlayPause(info.id, e)}
                                style={{ width: buttonSize, height: buttonSize }}
                            >
                                <svg
                                    width={buttonSize * 0.45}
                                    height={buttonSize * 0.45}
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <polygon points="8 5 19 12 8 19 8 5" />
                                </svg>
                            </PlayButtonStyled>
                        )}

                        {/* Click overlay when playing to pause */}
                        {isPlaying && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    cursor: 'pointer',
                                    pointerEvents: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onClick={(e) => handlePlayPause(info.id, e)}
                            >
                                {isHovered && (
                                    <div
                                        style={{
                                            width: buttonSize,
                                            height: buttonSize,
                                            borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.7)',
                                            border: '3px solid rgba(255,255,255,0.9)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                        }}
                                    >
                                        <svg
                                            width={buttonSize * 0.4}
                                            height={buttonSize * 0.4}
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <rect x="6" y="4" width="4" height="16" />
                                            <rect x="14" y="4" width="4" height="16" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        )}
                    </VideoPlayerWrapper>
                )
            })}
        </OverlayContainer>
    )
}

export default VideoCanvasPlayer
