import React, { useCallback, useEffect, useRef, useState } from 'react'
import { styled } from 'baseui'
import useVideoContext from '@/hooks/useVideoContext'
import { useEditorContext } from '@nkyo/scenify-sdk'

const OverlayContainer = styled('div', {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 5, // Video overlay renders on top of canvas
})

// This container clips videos to the canvas boundaries
const CanvasClipContainer = styled('div', {
    position: 'absolute',
    overflow: 'hidden', // Clip any content that extends beyond canvas frame
    pointerEvents: 'none',
})

const VideoPlayerWrapper = styled('div', {
    position: 'absolute',
    pointerEvents: 'none',
    overflow: 'hidden', // Clip video to wrapper bounds
    maxWidth: '100%', // Ensure it doesn't exceed container
    maxHeight: '100%', // Ensure it doesn't exceed container
})

const VideoElement = styled('video', {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'fill', // Match exact canvas object dimensions (like Canva)
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

// Text overlay that renders on top of video during playback
const TextOverlayElement = styled('div', {
    position: 'absolute',
    pointerEvents: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    zIndex: 25, // Above video but below controls
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

interface TextOverlayInfo {
    id: string
    text: string
    left: number
    top: number
    width: number
    height: number
    fontSize: number
    fontFamily: string
    fill: string
    fontWeight: string | number
    textAlign: string
    opacity: number
}

const VideoCanvasPlayer: React.FC = () => {
    const {
        clips,
        activeClipId,
        isPlaying,
        currentTime,
        setCurrentTime,
        togglePlayback,
        registerVideoRef,
        setActiveClip
    } = useVideoContext()
    const { canvas } = useEditorContext()
    const [videoInfos, setVideoInfos] = useState<VideoInfo[]>([])
    const [canvasBounds, setCanvasBounds] = useState<CanvasBounds | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [textOverlays, setTextOverlays] = useState<TextOverlayInfo[]>([])
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

    // Play/pause handler - uses shared context
    const handlePlayPause = useCallback((videoId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        // Set this video as active if not already
        if (activeClipId !== videoId) {
            setActiveClip(videoId)
        }

        // Toggle playback using shared context
        togglePlayback()
    }, [activeClipId, setActiveClip, togglePlayback])

    // Handle video end
    const handleEnded = useCallback((videoId: string) => {
        const video = videoRefs.current[videoId]
        if (video) {
            video.currentTime = 0
            setCurrentTime(0)
        }
    }, [setCurrentTime])

    // Sync video playback with shared state
    useEffect(() => {
        const activeVideo = activeClipId ? videoRefs.current[activeClipId] : null
        if (!activeVideo) return

        if (isPlaying) {
            // Start video playback
            activeVideo.play().then(() => {
                // Unmute after play starts (needed for browser autoplay policies)
                activeVideo.muted = false
            }).catch(err => {
                if (err.name !== 'AbortError') {
                    console.error('Play failed:', err)
                }
            })
        } else {
            activeVideo.pause()
            activeVideo.muted = true // Mute when paused
        }
    }, [isPlaying, activeClipId])

    // Keep current time in sync with playing video
    useEffect(() => {
        const activeVideo = activeClipId ? videoRefs.current[activeClipId] : null
        if (!activeVideo || !isPlaying) return

        const updateTime = () => {
            setCurrentTime(activeVideo.currentTime)
        }

        activeVideo.addEventListener('timeupdate', updateTime)
        return () => activeVideo.removeEventListener('timeupdate', updateTime)
    }, [isPlaying, activeClipId, setCurrentTime])

    // Register video refs with context for external control
    useEffect(() => {
        Object.entries(videoRefs.current).forEach(([id, ref]) => {
            registerVideoRef(id, ref)
        })
    }, [videoInfos, registerVideoRef])

    // Make canvas video object transparent when playing so HTML video shows through
    // Also extract text elements that are above the video to render as HTML overlays
    useEffect(() => {
        if (!canvas || !overlayRef.current) return

        // @ts-ignore
        const objects = canvas.getObjects?.() || []
        // @ts-ignore
        const zoom = canvas.getZoom?.() || 1
        // @ts-ignore
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]

        const canvasEl = document.querySelector('.canvas-container canvas')
        if (!canvasEl) return

        const canvasRect = canvasEl.getBoundingClientRect()
        const overlayRect = overlayRef.current.getBoundingClientRect()

        // Find video objects and their indices
        let videoObjIndex = -1
        objects.forEach((obj: any, idx: number) => {
            if (obj && obj.metadata?.isVideo) {
                const isThisVideoPlaying = isPlaying && obj.metadata?.id === activeClipId
                obj.set('opacity', isThisVideoPlaying ? 0 : 1)
                obj.dirty = true
                if (isThisVideoPlaying) {
                    videoObjIndex = idx
                }
            }
        })

        // Extract ALL text elements when video is playing (not just those above video)
        const newTextOverlays: TextOverlayInfo[] = []

        if (isPlaying && videoObjIndex >= 0) {
            objects.forEach((obj: any, idx: number) => {
                // Process ALL text elements (both above and below video)
                if (obj && (obj.type === 'StaticText' || obj.type === 'DynamicText' ||
                    obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')) {

                    // Save original opacity if not already saved
                    if (!obj._wasHiddenForPlayback) {
                        obj._originalOpacity = obj.opacity ?? 1
                        obj._wasHiddenForPlayback = true
                    }

                    // Calculate screen position
                    const objLeft = (obj.left || 0) * zoom + vpt[4]
                    const objTop = (obj.top || 0) * zoom + vpt[5]
                    const objWidth = (obj.width || 100) * (obj.scaleX || 1) * zoom
                    const objHeight = (obj.height || 20) * (obj.scaleY || 1) * zoom

                    newTextOverlays.push({
                        id: obj.id || `text-${idx}`,
                        text: obj.text || '',
                        left: objLeft + (canvasRect.left - overlayRect.left),
                        top: objTop + (canvasRect.top - overlayRect.top),
                        width: objWidth,
                        height: objHeight,
                        fontSize: (obj.fontSize || 16) * (obj.scaleY || 1) * zoom,
                        fontFamily: obj.fontFamily || 'Arial',
                        fill: obj.fill || '#000000',
                        fontWeight: obj.fontWeight || 'normal',
                        textAlign: obj.textAlign || 'left',
                        opacity: obj._originalOpacity ?? 1,
                    })

                    // Hide the canvas text element (we'll render it as HTML overlay)
                    obj.set('opacity', 0)
                    obj.dirty = true
                }
            })
        } else {
            // Restore all text elements when not playing
            objects.forEach((obj: any) => {
                if (obj && (obj.type === 'StaticText' || obj.type === 'DynamicText' ||
                    obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')) {
                    // Restore if it was hidden for playback
                    if (obj._wasHiddenForPlayback) {
                        obj.set('opacity', obj._originalOpacity ?? 1)
                        obj.dirty = true
                        delete obj._wasHiddenForPlayback
                        delete obj._originalOpacity
                    }
                }
            })
        }

        setTextOverlays(newTextOverlays)

        // @ts-ignore
        canvas.requestRenderAll?.()
    }, [isPlaying, activeClipId, canvas, videoInfos])

    // Listen to canvas object changes to update text overlays in real-time
    useEffect(() => {
        if (!canvas) return

        const updateTextOverlays = () => {
            // Trigger the text extraction effect by forcing a re-render
            // We'll use a small delay to batch updates
            setTimeout(() => {
                if (!canvas || !overlayRef.current) return

                // @ts-ignore
                const objects = canvas.getObjects?.() || []
                // @ts-ignore
                const zoom = canvas.getZoom?.() || 1
                // @ts-ignore
                const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]

                const canvasEl = document.querySelector('.canvas-container canvas')
                if (!canvasEl) return

                const canvasRect = canvasEl.getBoundingClientRect()
                const overlayRect = overlayRef.current.getBoundingClientRect()

                // Find video objects
                let videoObjIndex = -1
                objects.forEach((obj: any, idx: number) => {
                    if (obj && obj.metadata?.isVideo) {
                        const isThisVideoPlaying = isPlaying && obj.metadata?.id === activeClipId
                        if (isThisVideoPlaying) {
                            videoObjIndex = idx
                        }
                    }
                })

                // Extract text elements if playing
                const newTextOverlays: TextOverlayInfo[] = []
                if (isPlaying && videoObjIndex >= 0) {
                    objects.forEach((obj: any, idx: number) => {
                        if (obj && (obj.type === 'StaticText' || obj.type === 'DynamicText' ||
                            obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')) {

                            // Save original opacity if not already saved
                            if (!obj._wasHiddenForPlayback) {
                                obj._originalOpacity = obj.opacity ?? 1
                                obj._wasHiddenForPlayback = true
                            }

                            // Calculate screen position
                            const objLeft = (obj.left || 0) * zoom + vpt[4]
                            const objTop = (obj.top || 0) * zoom + vpt[5]
                            const objWidth = (obj.width || 100) * (obj.scaleX || 1) * zoom
                            const objHeight = (obj.height || 20) * (obj.scaleY || 1) * zoom

                            newTextOverlays.push({
                                id: obj.id || `text-${idx}`,
                                text: obj.text || '',
                                left: objLeft + (canvasRect.left - overlayRect.left),
                                top: objTop + (canvasRect.top - overlayRect.top),
                                width: objWidth,
                                height: objHeight,
                                fontSize: (obj.fontSize || 16) * (obj.scaleY || 1) * zoom,
                                fontFamily: obj.fontFamily || 'Arial',
                                fill: obj.fill || '#000000',
                                fontWeight: obj.fontWeight || 'normal',
                                textAlign: obj.textAlign || 'left',
                                opacity: obj._originalOpacity ?? 1,
                            })

                            // Hide the canvas text element
                            obj.set('opacity', 0)
                            obj.dirty = true
                        }
                    })
                }

                setTextOverlays(newTextOverlays)
                // @ts-ignore
                canvas.requestRenderAll?.()
            }, 50)
        }

        // @ts-ignore
        canvas.on?.('object:added', updateTextOverlays)
        // @ts-ignore
        canvas.on?.('object:modified', updateTextOverlays)
        // @ts-ignore
        canvas.on?.('object:removed', updateTextOverlays)
        // @ts-ignore
        canvas.on?.('object:moving', updateTextOverlays)
        // @ts-ignore
        canvas.on?.('object:scaling', updateTextOverlays)

        return () => {
            // @ts-ignore
            canvas.off?.('object:added', updateTextOverlays)
            // @ts-ignore
            canvas.off?.('object:modified', updateTextOverlays)
            // @ts-ignore
            canvas.off?.('object:removed', updateTextOverlays)
            // @ts-ignore
            canvas.off?.('object:moving', updateTextOverlays)
            // @ts-ignore
            canvas.off?.('object:scaling', updateTextOverlays)
        }
    }, [canvas, isPlaying, activeClipId])

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
                    let relativeLeft = info.left - canvasBounds.left
                    let relativeTop = info.top - canvasBounds.top
                    let videoWidth = info.width
                    let videoHeight = info.height

                    // Constrain video to canvas frame boundaries (like Canva)
                    // If video extends beyond left edge, adjust position and width
                    if (relativeLeft < 0) {
                        videoWidth += relativeLeft // Reduce width by overflow amount
                        relativeLeft = 0
                    }
                    // If video extends beyond top edge, adjust position and height
                    if (relativeTop < 0) {
                        videoHeight += relativeTop // Reduce height by overflow amount
                        relativeTop = 0
                    }
                    // If video extends beyond right edge, reduce width
                    if (relativeLeft + videoWidth > canvasBounds.width) {
                        videoWidth = canvasBounds.width - relativeLeft
                    }
                    // If video extends beyond bottom edge, reduce height
                    if (relativeTop + videoHeight > canvasBounds.height) {
                        videoHeight = canvasBounds.height - relativeTop
                    }

                    // Ensure dimensions are positive
                    videoWidth = Math.max(0, videoWidth)
                    videoHeight = Math.max(0, videoHeight)

                    // Check if this specific video is playing using shared context state
                    const isVideoPlaying = isPlaying && activeClipId === info.id
                    const buttonSize = Math.max(36, Math.min(56, Math.min(videoWidth, videoHeight) * 0.18))

                    return (
                        <VideoPlayerWrapper
                            key={info.id}
                            style={{
                                left: relativeLeft,
                                top: relativeTop,
                                width: videoWidth,
                                height: videoHeight,
                            }}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <VideoElement
                                ref={el => { videoRefs.current[info.id] = el }}
                                src={info.src}
                                poster={info.poster}
                                muted={!isVideoPlaying}
                                playsInline
                                crossOrigin="anonymous"
                                onEnded={() => handleEnded(info.id)}
                                style={{ opacity: isVideoPlaying ? 1 : 0 }}
                            />

                            {!isVideoPlaying && (
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

                            {isVideoPlaying && (
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

            {/* Render text overlays on top of video during playback */}
            {isPlaying && textOverlays.map(overlay => (
                <TextOverlayElement
                    key={overlay.id}
                    style={{
                        left: overlay.left,
                        top: overlay.top,
                        width: overlay.width,
                        fontSize: overlay.fontSize,
                        fontFamily: overlay.fontFamily,
                        color: overlay.fill,
                        fontWeight: overlay.fontWeight,
                        textAlign: overlay.textAlign as any,
                        opacity: overlay.opacity,
                    }}
                >
                    {overlay.text}
                </TextOverlayElement>
            ))}
        </OverlayContainer>
    )
}

export default VideoCanvasPlayer
