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

// This container clips videos to the canvas boundaries
const CanvasClipContainer = styled('div', {
    position: 'absolute',
    overflow: 'hidden',
    pointerEvents: 'none',
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

interface CanvasBounds {
    left: number
    top: number
    width: number
    height: number
}

const VideoCanvasPlayer: React.FC = () => {
    const { clips, setActiveClip } = useVideoContext()
    const { canvas } = useEditorContext()
    const [videoInfos, setVideoInfos] = useState<VideoInfo[]>([])
    const [canvasBounds, setCanvasBounds] = useState<CanvasBounds | null>(null)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
    const overlayRef = useRef<HTMLDivElement>(null)

    // Detect if any modal is open
    useEffect(() => {
        const checkForModal = () => {
            const modalBackdrop = document.querySelector('[data-baseweb="modal"]') ||
                document.querySelector('.modal-backdrop') ||
                document.querySelector('[role="dialog"]')
            setIsModalOpen(!!modalBackdrop)
        }

        checkForModal()
        const observer = new MutationObserver(checkForModal)
        observer.observe(document.body, { childList: true, subtree: true })
        return () => observer.disconnect()
    }, [])

    // Find the canvas frame (white design area) bounds
    const getCanvasFrameBounds = useCallback((): CanvasBounds | null => {
        if (!canvas || !overlayRef.current) return null

        try {
            // @ts-ignore
            const objects = canvas.getObjects?.() || []
            // @ts-ignore
            const canvasEl = canvas.lowerCanvasEl as HTMLCanvasElement
            if (!canvasEl) return null

            // Find the clip/frame object (the white canvas area)
            // Look for common identifiers
            const clipObj = objects.find((obj: any) =>
                obj.id === 'clip' ||
                obj.name === 'clip' ||
                obj.type === 'Frame' ||
                (obj.type === 'Rect' && obj.fill === '#ffffff' && (obj.width || 0) >= 500)
            )

            if (!clipObj) {
                // Fallback: use the first large white rectangle
                const fallbackClip = objects.find((obj: any) =>
                    obj.fill === '#ffffff' && (obj.width || 0) > 400 && (obj.height || 0) > 400
                )
                if (!fallbackClip) return null

                const canvasRect = canvasEl.getBoundingClientRect()
                const overlayRect = overlayRef.current.getBoundingClientRect()
                // @ts-ignore
                const zoom = canvas.getZoom?.() || 1
                // @ts-ignore
                const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]

                const frameWidth = (fallbackClip.width || 900) * (fallbackClip.scaleX || 1)
                const frameHeight = (fallbackClip.height || 1200) * (fallbackClip.scaleY || 1)
                const screenX = (fallbackClip.left || 0) * zoom + vpt[4]
                const screenY = (fallbackClip.top || 0) * zoom + vpt[5]

                return {
                    left: screenX + (canvasRect.left - overlayRect.left),
                    top: screenY + (canvasRect.top - overlayRect.top),
                    width: frameWidth * zoom,
                    height: frameHeight * zoom,
                }
            }

            const canvasRect = canvasEl.getBoundingClientRect()
            const overlayRect = overlayRef.current.getBoundingClientRect()

            // @ts-ignore
            const zoom = canvas.getZoom?.() || 1
            // @ts-ignore
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]

            const frameWidth = (clipObj.width || 900) * (clipObj.scaleX || 1)
            const frameHeight = (clipObj.height || 1200) * (clipObj.scaleY || 1)
            const frameCenterX = clipObj.left || 0
            const frameCenterY = clipObj.top || 0

            // Apply zoom and viewport transform
            const screenX = frameCenterX * zoom + vpt[4]
            const screenY = frameCenterY * zoom + vpt[5]

            return {
                left: screenX + (canvasRect.left - overlayRect.left),
                top: screenY + (canvasRect.top - overlayRect.top),
                width: frameWidth * zoom,
                height: frameHeight * zoom,
            }
        } catch (err) {
            console.error('Error getting canvas bounds:', err)
            return null
        }
    }, [canvas])

    // Find video objects and calculate positions
    const updateVideoPositions = useCallback(() => {
        if (!canvas) return

        try {
            // @ts-ignore
            const objects = canvas.getObjects?.() || []
            // @ts-ignore
            const canvasEl = canvas.lowerCanvasEl as HTMLCanvasElement
            if (!canvasEl || !overlayRef.current) return

            const canvasRect = canvasEl.getBoundingClientRect()
            const overlayRect = overlayRef.current.getBoundingClientRect()

            // @ts-ignore
            const zoom = canvas.getZoom?.() || 1
            // @ts-ignore
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]

            // Update canvas frame bounds
            const frameBounds = getCanvasFrameBounds()
            setCanvasBounds(frameBounds)

            const newVideoInfos: VideoInfo[] = []

            objects.forEach((obj: any) => {
                if (!obj.metadata?.isVideo && !obj.metadata?.videoSrc) return

                const videoSrc = obj.metadata?.videoSrc || obj.metadata?.src
                if (!videoSrc) return

                const clipId = obj.metadata?.id || `video-obj-${newVideoInfos.length}`
                const clip = clips.find(c => c.id === clipId)

                const objLeft = obj.left || 0
                const objTop = obj.top || 0
                const objWidth = (obj.width || 100) * (obj.scaleX || 1)
                const objHeight = (obj.height || 100) * (obj.scaleY || 1)

                const screenX = objLeft * zoom + vpt[4]
                const screenY = objTop * zoom + vpt[5]

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
    }, [canvas, clips, getCanvasFrameBounds])

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

        const timer = setTimeout(() => loop(), 200)
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
            video.pause()
            setPlayingId(null)
        } else {
            Object.values(videoRefs.current).forEach(v => v?.pause())
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

    // Show nothing if modal is open
    if (isModalOpen) {
        return <OverlayContainer ref={overlayRef} style={{ display: 'none' }} />
    }

    // Show overlay container for ref even if no videos
    if (videoInfos.length === 0 || !canvasBounds) {
        return <OverlayContainer ref={overlayRef} />
    }

    return (
        <OverlayContainer ref={overlayRef}>
            {/* Canvas clip container - all videos are clipped to this boundary */}
            <CanvasClipContainer
                style={{
                    left: canvasBounds.left,
                    top: canvasBounds.top,
                    width: canvasBounds.width,
                    height: canvasBounds.height,
                }}
            >
                {videoInfos.map(info => {
                    // Calculate position relative to the canvas frame
                    const relativeLeft = info.left - canvasBounds.left
                    const relativeTop = info.top - canvasBounds.top

                    const isPlaying = playingId === info.id
                    const buttonSize = Math.max(36, Math.min(56, Math.min(info.width, info.height) * 0.18))

                    return (
                        <VideoPlayerWrapper
                            key={info.id}
                            style={{
                                left: relativeLeft,
                                top: relativeTop,
                                width: info.width,
                                height: info.height,
                            }}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <VideoElement
                                ref={el => { videoRefs.current[info.id] = el }}
                                src={info.src}
                                poster={info.poster}
                                muted
                                playsInline
                                crossOrigin="anonymous"
                                onEnded={() => handleEnded(info.id)}
                                style={{ opacity: isPlaying ? 1 : 0 }}
                            />

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
            </CanvasClipContainer>
        </OverlayContainer>
    )
}

export default VideoCanvasPlayer
