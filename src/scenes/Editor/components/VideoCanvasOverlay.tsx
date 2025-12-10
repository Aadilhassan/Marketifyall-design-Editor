import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
    objectFit: 'cover',
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
}

const VideoCanvasOverlay: React.FC = () => {
    const { clips, activeClipId, setActiveClip } = useVideoContext()
    const { canvas } = useEditorContext()
    const [overlayStates, setOverlayStates] = useState<Record<string, VideoOverlayState>>({})
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [hoveredClipId, setHoveredClipId] = useState<string | null>(null)
    const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
    const containerRef = useRef<HTMLDivElement>(null)

    // Get canvas bounds for constraining video position
    const getCanvasBounds = useCallback(() => {
        if (!canvas) return null

        const canvasEl = (canvas as any).lowerCanvasEl || document.querySelector('.canvas-container canvas')
        if (!canvasEl) return null

        const rect = canvasEl.getBoundingClientRect()
        return rect
    }, [canvas])

    // Initialize overlay positions when clips change
    useEffect(() => {
        const newStates: Record<string, VideoOverlayState> = {}
        const canvasBounds = getCanvasBounds()

        clips.forEach((clip, index) => {
            if (!overlayStates[clip.id]) {
                // Calculate initial position - center in canvas area with slight offset for multiple videos
                const baseX = canvasBounds ? canvasBounds.width / 2 - 160 : 200
                const baseY = canvasBounds ? canvasBounds.height / 2 - 90 : 150

                newStates[clip.id] = {
                    x: baseX + (index * 30),
                    y: baseY + (index * 30),
                    width: 320,
                    height: 180,
                    isPlaying: false,
                }
            } else {
                newStates[clip.id] = overlayStates[clip.id]
            }
        })

        setOverlayStates(newStates)
    }, [clips, getCanvasBounds])

    // Constrain position within canvas bounds
    const constrainPosition = useCallback((x: number, y: number, width: number, height: number) => {
        const container = containerRef.current?.parentElement
        if (!container) return { x, y }

        const containerRect = container.getBoundingClientRect()
        const maxX = containerRect.width - width - 10
        const maxY = containerRect.height - height - 10

        return {
            x: Math.max(10, Math.min(x, maxX)),
            y: Math.max(10, Math.min(y, maxY)),
        }
    }, [])

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

        const handleResize = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX
            const deltaY = moveEvent.clientY - startY

            let newWidth = initialState.width
            let newHeight = initialState.height
            let newX = initialState.x
            let newY = initialState.y

            // Maintain aspect ratio (16:9)
            const aspectRatio = 16 / 9

            if (corner === 'se') {
                newWidth = Math.max(160, initialState.width + deltaX)
                newHeight = newWidth / aspectRatio
            } else if (corner === 'sw') {
                newWidth = Math.max(160, initialState.width - deltaX)
                newHeight = newWidth / aspectRatio
                newX = initialState.x + (initialState.width - newWidth)
            } else if (corner === 'ne') {
                newWidth = Math.max(160, initialState.width + deltaX)
                newHeight = newWidth / aspectRatio
                newY = initialState.y + (initialState.height - newHeight)
            } else if (corner === 'nw') {
                newWidth = Math.max(160, initialState.width - deltaX)
                newHeight = newWidth / aspectRatio
                newX = initialState.x + (initialState.width - newWidth)
                newY = initialState.y + (initialState.height - newHeight)
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
        // Remove from video context would go here
        // For now just remove from local state
        setOverlayStates(prev => {
            const newState = { ...prev }
            delete newState[clipId]
            return newState
        })
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
