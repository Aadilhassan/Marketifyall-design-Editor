import React, { useCallback, useEffect, useRef, useState } from 'react'
import { styled } from 'baseui'
import useVideoContext from '@/hooks/useVideoContext'
import { useEditorContext } from '@nkyo/scenify-sdk'

const Overlay = styled('div', {
    position: 'absolute',
    borderRadius: '12px',
    overflow: 'visible',
    background: 'transparent',
    zIndex: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
})

const VideoWrapper = styled('div', ({ $isDragging, $isSelected }: { $isDragging?: boolean; $isSelected?: boolean }) => ({
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'transparent',
    boxShadow: $isDragging
        ? '0 30px 100px rgba(0,0,0,0.5)'
        : $isSelected
            ? '0 0 0 2px #667eea, 0 24px 80px rgba(0,0,0,0.4)'
            : '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
    cursor: $isDragging ? 'grabbing' : 'grab',
    transition: $isDragging ? 'none' : 'box-shadow 0.2s ease',
}))

const OverlayVideo = styled('video', {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'contain',
    background: 'transparent',
    pointerEvents: 'none',
    borderRadius: '12px',
})

const PlayPauseButton = styled('button', {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.6)',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease, transform 0.15s ease',
    ':hover': {
        transform: 'translate(-50%, -50%) scale(1.1)',
        background: 'rgba(0, 0, 0, 0.8)',
    },
})

const VideoControls = styled('div', {
    position: 'absolute',
    top: '-36px',
    left: '0',
    right: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(17, 24, 39, 0.95)',
    padding: '6px 10px',
    borderRadius: '6px',
    backdropFilter: 'blur(10px)',
    pointerEvents: 'auto',
    opacity: 0,
    transition: 'opacity 0.2s ease',
})

const ControlLabel = styled('span', {
    color: '#f9fafb',
    fontSize: '11px',
    fontWeight: 600,
})

const ControlBtn = styled('button', {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#f9fafb',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    ':hover': {
        background: 'rgba(255,255,255,0.1)',
    },
})

const ResizeHandle = styled('div', ({ $position }: { $position: string }) => {
    const positions: Record<string, any> = {
        'nw': { top: '-6px', left: '-6px', cursor: 'nwse-resize' },
        'ne': { top: '-6px', right: '-6px', cursor: 'nesw-resize' },
        'sw': { bottom: '-6px', left: '-6px', cursor: 'nesw-resize' },
        'se': { bottom: '-6px', right: '-6px', cursor: 'nwse-resize' },
    }

    return {
        position: 'absolute',
        width: '12px',
        height: '12px',
        background: '#667eea',
        border: '2px solid #ffffff',
        borderRadius: '50%',
        zIndex: 12,
        opacity: 0,
        transition: 'opacity 0.2s ease',
        ...positions[$position],
    }
})

interface VideoOverlayState {
    x: number
    y: number
    width: number
    height: number
    isPlaying: boolean
    aspectRatio: number
    isPortrait: boolean
}

interface CanvasFrameBounds {
    left: number
    top: number
    width: number
    height: number
    containerLeft: number
    containerTop: number
}

const VideoCanvasOverlay: React.FC = () => {
    const { clips, activeClipId, setActiveClip } = useVideoContext()
    const { canvas } = useEditorContext()
    const [overlayStates, setOverlayStates] = useState<Record<string, VideoOverlayState>>({})
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [hoveredClipId, setHoveredClipId] = useState<string | null>(null)
    const [canvasFrameBounds, setCanvasFrameBounds] = useState<CanvasFrameBounds | null>(null)
    const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
    const containerRef = useRef<HTMLDivElement>(null)
    const initializedClipsRef = useRef<Set<string>>(new Set())

    // Get the actual canvas frame (white rectangle) bounds
    const getCanvasFrameBounds = useCallback((): CanvasFrameBounds | null => {
        if (!canvas || !containerRef.current) return null

        try {
            // Get the canvas container bounds
            const containerRect = containerRef.current.getBoundingClientRect()

            // Try to find the clip object in the canvas
            // @ts-ignore - canvas.getObjects is from fabric.js
            const objects = canvas.getObjects?.() || []
            // @ts-ignore
            const clipObject = objects.find((obj: any) => obj.name === 'clip' || obj.id === 'clip')

            if (clipObject) {
                // Get the clip object's bounding rect in screen coordinates
                // @ts-ignore
                const clipBoundingRect = clipObject.getBoundingRect?.(true, true)

                if (clipBoundingRect) {
                    // Get the canvas element's position
                    // @ts-ignore
                    const canvasEl = canvas.lowerCanvasEl || document.querySelector('.canvas-container canvas')
                    if (canvasEl) {
                        const canvasRect = canvasEl.getBoundingClientRect()

                        return {
                            left: clipBoundingRect.left + canvasRect.left - containerRect.left,
                            top: clipBoundingRect.top + canvasRect.top - containerRect.top,
                            width: clipBoundingRect.width,
                            height: clipBoundingRect.height,
                            containerLeft: containerRect.left,
                            containerTop: containerRect.top,
                        }
                    }
                }
            }

            // Fallback: Try to detect the white canvas area via DOM
            const canvasContainer = document.querySelector('.canvas-container')
            if (canvasContainer) {
                // Look for the actual canvas element
                const upperCanvas = canvasContainer.querySelector('.upper-canvas') as HTMLCanvasElement
                const lowerCanvas = canvasContainer.querySelector('.lower-canvas') as HTMLCanvasElement
                const canvasEl = upperCanvas || lowerCanvas

                if (canvasEl) {
                    const canvasRect = canvasEl.getBoundingClientRect()

                    // The frame is typically centered in the canvas
                    // Default frame size is 900x1200 based on Editor.tsx
                    const frameWidth = 900
                    const frameHeight = 1200

                    // Get the zoom level from canvas
                    // @ts-ignore
                    const zoom = canvas.getZoom?.() || 1

                    const scaledWidth = frameWidth * zoom
                    const scaledHeight = frameHeight * zoom

                    // Calculate the frame's position (centered in canvas)
                    const frameLeft = (canvasRect.width - scaledWidth) / 2
                    const frameTop = (canvasRect.height - scaledHeight) / 2

                    return {
                        left: frameLeft + canvasRect.left - containerRect.left,
                        top: frameTop + canvasRect.top - containerRect.top,
                        width: scaledWidth,
                        height: scaledHeight,
                        containerLeft: containerRect.left,
                        containerTop: containerRect.top,
                    }
                }
            }
        } catch (error) {
            console.error('Error getting canvas frame bounds:', error)
        }

        return null
    }, [canvas])

    // Update canvas frame bounds when canvas changes or window resizes
    useEffect(() => {
        const updateBounds = () => {
            const bounds = getCanvasFrameBounds()
            if (bounds) {
                setCanvasFrameBounds(bounds)
            }
        }

        // Initial update after a short delay to let canvas render
        const timeout = setTimeout(updateBounds, 500)

        // Update on window resize
        window.addEventListener('resize', updateBounds)

        // Update periodically to catch zoom changes
        const interval = setInterval(updateBounds, 1000)

        return () => {
            clearTimeout(timeout)
            clearInterval(interval)
            window.removeEventListener('resize', updateBounds)
        }
    }, [canvas, getCanvasFrameBounds])

    // Load video dimensions and initialize overlay with correct aspect ratio
    const loadVideoAndInitialize = useCallback((clip: { id: string; src: string }, index: number): Promise<VideoOverlayState> => {
        return new Promise((resolve) => {
            const video = document.createElement('video')
            video.src = clip.src
            video.crossOrigin = 'anonymous'
            video.preload = 'metadata'

            const handleLoad = () => {
                const videoWidth = video.videoWidth || 1920
                const videoHeight = video.videoHeight || 1080
                const aspectRatio = videoWidth / videoHeight
                const isPortrait = videoHeight > videoWidth

                console.log(`Video ${clip.id} dimensions: ${videoWidth}x${videoHeight}, isPortrait: ${isPortrait}`)

                // Get frame bounds
                const frameBounds = canvasFrameBounds || getCanvasFrameBounds()

                // Calculate proper dimensions based on video orientation
                let overlayWidth: number
                let overlayHeight: number

                if (frameBounds) {
                    // Size relative to canvas frame
                    if (isPortrait) {
                        overlayHeight = frameBounds.height * 0.5 // 50% of frame height
                        overlayWidth = overlayHeight * aspectRatio
                    } else {
                        overlayWidth = frameBounds.width * 0.5 // 50% of frame width
                        overlayHeight = overlayWidth / aspectRatio
                    }

                    // Center within canvas frame
                    const x = frameBounds.left + (frameBounds.width - overlayWidth) / 2 + (index * 20)
                    const y = frameBounds.top + (frameBounds.height - overlayHeight) / 2 + (index * 20)

                    video.src = ''
                    resolve({
                        x,
                        y,
                        width: overlayWidth,
                        height: overlayHeight,
                        isPlaying: false,
                        aspectRatio,
                        isPortrait,
                    })
                } else {
                    // Fallback if frame bounds not available
                    if (isPortrait) {
                        overlayHeight = 300
                        overlayWidth = overlayHeight * aspectRatio
                    } else {
                        overlayWidth = 300
                        overlayHeight = overlayWidth / aspectRatio
                    }

                    video.src = ''
                    resolve({
                        x: 100 + (index * 20),
                        y: 100 + (index * 20),
                        width: overlayWidth,
                        height: overlayHeight,
                        isPlaying: false,
                        aspectRatio,
                        isPortrait,
                    })
                }
            }

            video.onloadedmetadata = handleLoad

            video.onerror = () => {
                console.warn(`Failed to load video metadata for ${clip.id}`)
                video.src = ''
                resolve({
                    x: 100 + (index * 20),
                    y: 100 + (index * 20),
                    width: 200,
                    height: 112,
                    isPlaying: false,
                    aspectRatio: 16 / 9,
                    isPortrait: false,
                })
            }

            setTimeout(() => {
                if (video.videoWidth && video.videoHeight) {
                    handleLoad()
                }
            }, 2000)
        })
    }, [canvasFrameBounds, getCanvasFrameBounds])

    // Initialize overlay positions when clips change
    useEffect(() => {
        const initializeClips = async () => {
            const clipsToInitialize = clips.filter(clip => !initializedClipsRef.current.has(clip.id))

            if (clipsToInitialize.length === 0) return

            const newStates: Record<string, VideoOverlayState> = {}

            for (let i = 0; i < clipsToInitialize.length; i++) {
                const clip = clipsToInitialize[i]
                try {
                    const state = await loadVideoAndInitialize(clip, i)
                    newStates[clip.id] = state
                    initializedClipsRef.current.add(clip.id)
                } catch (error) {
                    console.error(`Failed to initialize clip ${clip.id}:`, error)
                }
            }

            if (Object.keys(newStates).length > 0) {
                setOverlayStates(prev => ({ ...prev, ...newStates }))
            }
        }

        if (clips.length > 0 && canvasFrameBounds) {
            initializeClips()
        }

        const currentClipIds = new Set(clips.map(c => c.id))
        initializedClipsRef.current.forEach(id => {
            if (!currentClipIds.has(id)) {
                initializedClipsRef.current.delete(id)
            }
        })
    }, [clips, loadVideoAndInitialize, canvasFrameBounds])

    // Constrain position within canvas frame bounds
    const constrainPosition = useCallback((x: number, y: number, width: number, height: number) => {
        if (!canvasFrameBounds) {
            return { x, y }
        }

        const minX = canvasFrameBounds.left
        const minY = canvasFrameBounds.top
        const maxX = canvasFrameBounds.left + canvasFrameBounds.width - width
        const maxY = canvasFrameBounds.top + canvasFrameBounds.height - height

        return {
            x: Math.max(minX, Math.min(x, maxX)),
            y: Math.max(minY, Math.min(y, maxY)),
        }
    }, [canvasFrameBounds])

    // Handle drag start
    const handleDragStart = useCallback((clipId: string, e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
        setActiveClip(clipId)

        const startX = e.clientX
        const startY = e.clientY
        const initialState = overlayStates[clipId]
        if (!initialState) return

        const handleDrag = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX
            const deltaY = moveEvent.clientY - startY

            const newPos = constrainPosition(
                initialState.x + deltaX,
                initialState.y + deltaY,
                initialState.width,
                initialState.height
            )

            setOverlayStates(prev => ({
                ...prev,
                [clipId]: {
                    ...prev[clipId],
                    x: newPos.x,
                    y: newPos.y,
                },
            }))
        }

        const handleDragEnd = () => {
            setIsDragging(false)
            document.removeEventListener('mousemove', handleDrag)
            document.removeEventListener('mouseup', handleDragEnd)
        }

        document.addEventListener('mousemove', handleDrag)
        document.addEventListener('mouseup', handleDragEnd)
    }, [overlayStates, setActiveClip, constrainPosition])

    // Handle resize
    const handleResizeStart = useCallback((clipId: string, corner: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)

        const startX = e.clientX
        const startY = e.clientY
        const initialState = overlayStates[clipId]
        if (!initialState) return

        const aspectRatio = initialState.aspectRatio || (16 / 9)
        const isPortrait = initialState.isPortrait || false

        const handleResize = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX
            const deltaY = moveEvent.clientY - startY

            let newWidth = initialState.width
            let newHeight = initialState.height
            let newX = initialState.x
            let newY = initialState.y

            const minWidth = isPortrait ? 60 : 100
            const minHeight = isPortrait ? 100 : 60

            if (corner === 'se') {
                newWidth = Math.max(minWidth, initialState.width + deltaX)
                newHeight = newWidth / aspectRatio
            } else if (corner === 'sw') {
                newWidth = Math.max(minWidth, initialState.width - deltaX)
                newHeight = newWidth / aspectRatio
                newX = initialState.x + (initialState.width - newWidth)
            } else if (corner === 'ne') {
                newWidth = Math.max(minWidth, initialState.width + deltaX)
                newHeight = newWidth / aspectRatio
                newY = initialState.y + (initialState.height - newHeight)
            } else if (corner === 'nw') {
                newWidth = Math.max(minWidth, initialState.width - deltaX)
                newHeight = newWidth / aspectRatio
                newX = initialState.x + (initialState.width - newWidth)
                newY = initialState.y + (initialState.height - newHeight)
            }

            if (newHeight < minHeight) {
                newHeight = minHeight
                newWidth = newHeight * aspectRatio
            }

            const constrained = constrainPosition(newX, newY, newWidth, newHeight)

            setOverlayStates(prev => ({
                ...prev,
                [clipId]: {
                    ...prev[clipId],
                    x: constrained.x,
                    y: constrained.y,
                    width: newWidth,
                    height: newHeight,
                },
            }))
        }

        const handleResizeEnd = () => {
            setIsResizing(false)
            document.removeEventListener('mousemove', handleResize)
            document.removeEventListener('mouseup', handleResizeEnd)
        }

        document.addEventListener('mousemove', handleResize)
        document.addEventListener('mouseup', handleResizeEnd)
    }, [overlayStates, constrainPosition])

    // Toggle play/pause
    const togglePlay = useCallback((clipId: string, e: React.MouseEvent) => {
        e.stopPropagation()

        const video = videoRefs.current[clipId]
        if (!video) return

        if (overlayStates[clipId]?.isPlaying) {
            video.pause()
        } else {
            video.play().catch(console.error)
        }

        setOverlayStates(prev => ({
            ...prev,
            [clipId]: {
                ...prev[clipId],
                isPlaying: !prev[clipId]?.isPlaying,
            },
        }))
    }, [overlayStates])

    // Handle video ended
    const handleVideoEnded = useCallback((clipId: string) => {
        const video = videoRefs.current[clipId]
        if (video) {
            video.currentTime = 0
        }
        setOverlayStates(prev => ({
            ...prev,
            [clipId]: {
                ...prev[clipId],
                isPlaying: false,
            },
        }))
    }, [])

    // Delete clip
    const handleDeleteClip = useCallback((clipId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setOverlayStates(prev => {
            const newState = { ...prev }
            delete newState[clipId]
            return newState
        })
        initializedClipsRef.current.delete(clipId)
    }, [])

    if (clips.length === 0) return null

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            {clips.map(clip => {
                const state = overlayStates[clip.id]
                if (!state) return null

                const isActive = activeClipId === clip.id
                const isHovered = hoveredClipId === clip.id
                const showControls = isActive || isHovered

                return (
                    <Overlay
                        key={clip.id}
                        style={{
                            left: `${state.x}px`,
                            top: `${state.y}px`,
                            width: `${state.width}px`,
                            height: `${state.height}px`,
                        }}
                        onMouseEnter={() => setHoveredClipId(clip.id)}
                        onMouseLeave={() => setHoveredClipId(null)}
                    >
                        <VideoWrapper
                            $isDragging={isDragging && isActive}
                            $isSelected={isActive}
                            onMouseDown={(e) => handleDragStart(clip.id, e)}
                        >
                            {/* Video Controls Bar */}
                            <VideoControls style={{ opacity: showControls ? 1 : 0 }}>
                                <ControlLabel>{clip.name}</ControlLabel>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <ControlBtn onClick={(e) => togglePlay(clip.id, e)}>
                                        {state.isPlaying ? '⏸' : '▶'}
                                    </ControlBtn>
                                    <ControlBtn onClick={(e) => handleDeleteClip(clip.id, e)}>
                                        ✕
                                    </ControlBtn>
                                </div>
                            </VideoControls>

                            {/* Video Element */}
                            <OverlayVideo
                                ref={(el) => { videoRefs.current[clip.id] = el }}
                                src={clip.src}
                                poster={clip.poster}
                                muted
                                playsInline
                                loop={false}
                                crossOrigin="anonymous"
                                onEnded={() => handleVideoEnded(clip.id)}
                            />

                            {/* Play/Pause Button */}
                            <PlayPauseButton
                                style={{ opacity: showControls && !isDragging && !isResizing ? 1 : 0 }}
                                onClick={(e) => togglePlay(clip.id, e)}
                            >
                                {state.isPlaying ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="6" y="4" width="4" height="16" />
                                        <rect x="14" y="4" width="4" height="16" />
                                    </svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="8 5 19 12 8 19 8 5" />
                                    </svg>
                                )}
                            </PlayPauseButton>

                            {/* Resize Handles */}
                            {showControls && (
                                <>
                                    <ResizeHandle
                                        $position="nw"
                                        style={{ opacity: 1 }}
                                        onMouseDown={(e) => handleResizeStart(clip.id, 'nw', e)}
                                    />
                                    <ResizeHandle
                                        $position="ne"
                                        style={{ opacity: 1 }}
                                        onMouseDown={(e) => handleResizeStart(clip.id, 'ne', e)}
                                    />
                                    <ResizeHandle
                                        $position="sw"
                                        style={{ opacity: 1 }}
                                        onMouseDown={(e) => handleResizeStart(clip.id, 'sw', e)}
                                    />
                                    <ResizeHandle
                                        $position="se"
                                        style={{ opacity: 1 }}
                                        onMouseDown={(e) => handleResizeStart(clip.id, 'se', e)}
                                    />
                                </>
                            )}
                        </VideoWrapper>
                    </Overlay>
                )
            })}
        </div>
    )
}

export default VideoCanvasOverlay
