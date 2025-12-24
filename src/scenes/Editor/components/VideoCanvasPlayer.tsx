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

// A mask that covers the grey workspace but has a hole for the design area
const WorkspaceMask = styled('div', {
    position: 'absolute',
    pointerEvents: 'none',
    boxShadow: '0 0 0 5000px #f0f1f1ff', // Massive grey border covers leakage on Fabric canvas
    zIndex: 1, // Below the overlays but above Fabric content
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
    objectFit: 'cover', // Fill the container (matches how posters are generated)
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

const GenericOverlayElement = styled('img', {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 25,
})

interface VideoInfo {
    id: string
    left: number
    top: number
    width: number
    height: number
    angle: number
    originX: string
    originY: string
    src: string
    poster?: string
    videoCrop?: {
        sourceX: number
        sourceY: number
        sourceWidth: number
        sourceHeight: number
        videoWidth: number
        videoHeight: number
    }
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
    originX?: string
    originY?: string
    fontStyle?: string
    textDecoration?: string
    lineHeight?: number
    charSpacing?: number
    timelineStart?: number
    timelineDuration?: number
}

interface GenericOverlayInfo {
    id: string
    src: string
    left: number
    top: number
    width: number
    height: number
    angle: number
    opacity: number
    originX: string
    originY: string
    timelineStart?: number
    timelineDuration?: number
}

type OverlayItem =
    | { type: 'video'; data: VideoInfo; index: number }
    | { type: 'text'; data: TextOverlayInfo; index: number }
    | { type: 'generic'; data: GenericOverlayInfo; index: number }

const VideoCanvasPlayer: React.FC = () => {
    const {
        clips,
        activeClipId,
        isPlaying,
        currentTime,
        setCurrentTime,
        togglePlayback,
        registerVideoRef,
        setActiveClip,
        setIsPlaying
    } = useVideoContext()
    const { canvas } = useEditorContext()
    const [canvasBounds, setCanvasBounds] = useState<CanvasBounds | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [overlayItems, setOverlayItems] = useState<OverlayItem[]>([])
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

            const clipObj = objects.find((obj: any) =>
                obj.id === 'clip' ||
                obj.name === 'clip' ||
                obj.type === 'Frame' ||
                (obj.type === 'Rect' && obj.fill === '#ffffff' && (obj.width || 0) >= 500)
            )

            const canvasRect = canvasEl.getBoundingClientRect()
            const overlayRect = overlayRef.current.getBoundingClientRect()
            // @ts-ignore
            const zoom = canvas.getZoom?.() || 1
            // @ts-ignore
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]

            if (!clipObj) {
                const fallbackClip = objects.find((obj: any) =>
                    obj.fill === '#ffffff' && (obj.width || 0) > 400 && (obj.height || 0) > 400
                )
                if (!fallbackClip) return null

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

            const frameWidth = (clipObj.width || 900) * (clipObj.scaleX || 1)
            const frameHeight = (clipObj.height || 1200) * (clipObj.scaleY || 1)
            let l = clipObj.left || 0
            let t = clipObj.top || 0

            if (clipObj.originX === 'center') l -= frameWidth / 2
            if (clipObj.originY === 'center') t -= frameHeight / 2

            const screenX = l * zoom + vpt[4]
            const screenY = t * zoom + vpt[5]

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

    // Find video objects and extract all overlays on top
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

            const frameBounds = getCanvasFrameBounds()
            setCanvasBounds(frameBounds)

            const newOverlayItems: OverlayItem[] = []
            const videoIndices: number[] = []

            // First pass: find all video object indices
            objects.forEach((obj: any, idx: number) => {
                if (obj.metadata?.isVideo || obj.metadata?.videoSrc) {
                    videoIndices.push(idx)
                }
            })

            // If no video, we don't need overlays here
            if (videoIndices.length === 0) {
                setOverlayItems([])
                return
            }

            const firstVideoIndex = Math.min(...videoIndices)
            const lastVideoIndex = Math.max(...videoIndices)

            // Second pass: extract all videos and objects that are on or above any video layer
            // This ensures objects moved above videos are included
            objects.forEach((obj: any, idx: number) => {
                const isVideo = !!(obj.metadata?.isVideo || obj.metadata?.videoSrc)
                if (obj.id === 'clip' || obj.name === 'clip' || obj.type === 'Frame') return

                // Include videos and all objects from the first video onwards
                // This way objects moved above videos (higher index) are included
                if (idx < firstVideoIndex && !isVideo) return

                const objWidth = (obj.width || 100) * (obj.scaleX || 1)
                const objHeight = (obj.height || 100) * (obj.scaleY || 1)
                const l = obj.left || 0
                const t = obj.top || 0
                const screenX = l * zoom + vpt[4]
                const screenY = t * zoom + vpt[5]
                const left = screenX + (canvasRect.left - overlayRect.left)
                const top = screenY + (canvasRect.top - overlayRect.top)

                const actualOpacity = obj._originalOpacity ?? obj.opacity ?? 1

                if (isVideo) {
                    const videoSrc = obj.metadata?.videoSrc || obj.metadata?.src
                    const clipId = obj.metadata?.id || obj.id || `video-obj-${idx}`
                    let clip = clips.find(c => c.id === clipId)
                    if (!clip && videoSrc) clip = clips.find(c => c.src === videoSrc)

                    newOverlayItems.push({
                        type: 'video',
                        index: idx,
                        data: {
                            id: clip?.id || clipId,
                            left, top, width: objWidth * zoom, height: objHeight * zoom,
                            angle: obj.angle || 0, originX: obj.originX || 'left', originY: obj.originY || 'top',
                            src: clip?.src || videoSrc || '', poster: clip?.poster || obj.metadata?.src,
                            videoCrop: obj.metadata?.videoCrop,
                        }
                    })
                } else {
                    const isText = (obj.type === 'StaticText' || obj.type === 'DynamicText' ||
                        obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')
                    if (isText) {
                        newOverlayItems.push({
                            type: 'text',
                            index: idx,
                            data: {
                                id: obj.id || `text-${idx}`,
                                text: obj.text || obj.metadata?.text || '',
                                left, top, width: objWidth * zoom, height: objHeight * zoom,
                                fontSize: (obj.fontSize || 16) * (obj.scaleY || 1) * zoom,
                                fontFamily: obj.fontFamily || 'Arial', fill: obj.fill || '#000000',
                                fontWeight: obj.fontWeight || 'normal', textAlign: obj.textAlign || 'left',
                                fontStyle: obj.fontStyle || 'normal', textDecoration: obj.underline ? 'underline' : 'none',
                                lineHeight: obj.lineHeight || 1.16, charSpacing: obj.charSpacing || 0,
                                opacity: actualOpacity,
                                originX: obj.originX || 'left', originY: obj.originY || 'top',
                                timelineStart: obj.metadata?.timelineStart,
                                timelineDuration: obj.metadata?.timelineDuration,
                            }
                        })
                    } else {
                        let src = obj.metadata?.src
                        // If no src, try to generate it, but MUST restore opacity first to avoid capturing a transparent image
                        if (!src && obj.toDataURL) {
                            const currentOpacity = obj.opacity
                            obj.set('opacity', actualOpacity)
                            try {
                                src = obj.toDataURL()
                            } catch (e) {
                                console.warn('Failed to get data URL for object', e)
                            }
                            obj.set('opacity', currentOpacity)
                        }

                        if (src) {
                            newOverlayItems.push({
                                type: 'generic',
                                index: idx,
                                data: {
                                    id: obj.id || `obj-${idx}`,
                                    src: src, left, top, width: objWidth * zoom, height: objHeight * zoom,
                                    angle: obj.angle || 0, opacity: actualOpacity,
                                    originX: obj.originX || 'left', originY: obj.originY || 'top',
                                    timelineStart: obj.metadata?.timelineStart,
                                    timelineDuration: obj.metadata?.timelineDuration,
                                }
                            })
                        }
                    }
                }
            })
            // Sort overlay items by their canvas index to maintain layer order
            newOverlayItems.sort((a, b) => a.index - b.index)
            setOverlayItems(newOverlayItems)
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

    const handlePlayPause = useCallback((videoId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (activeClipId !== videoId) setActiveClip(videoId)
        togglePlayback()
    }, [activeClipId, setActiveClip, togglePlayback])

    useEffect(() => {
        const activeVideo = activeClipId ? videoRefs.current[activeClipId] : null
        if (!activeVideo) return
        const activeClip = clips.find(c => c.id === activeClipId)
        if (!activeClip) return
        const clipStart = activeClip.start || 0
        const videoTime = Math.max(0, currentTime - clipStart)
        if (isPlaying) {
            if (Math.abs(activeVideo.currentTime - videoTime) > 0.1) {
                activeVideo.currentTime = Math.min(videoTime, activeVideo.duration || activeClip.duration)
            }
            activeVideo.play().then(() => { activeVideo.muted = false }).catch(err => {
                if (err.name !== 'AbortError') console.error('Play failed:', err)
            })
        } else {
            activeVideo.pause()
            activeVideo.muted = true
            if (videoTime < (activeVideo.duration || activeClip.duration)) activeVideo.currentTime = videoTime
        }
    }, [isPlaying, activeClipId, currentTime, clips])

    useEffect(() => {
        const activeVideo = activeClipId ? videoRefs.current[activeClipId] : null
        if (!activeVideo) return
        const handleEnded = () => {
            const sortedClips = [...clips].sort((a, b) => (a.start || 0) - (b.start || 0))
            const currentIndex = sortedClips.findIndex(c => c.id === activeClipId)
            const nextIndex = currentIndex + 1
            if (nextIndex < sortedClips.length) {
                const nextClip = sortedClips[nextIndex]
                setActiveClip(nextClip.id)
                setCurrentTime(nextClip.start || 0)
            } else {
                setIsPlaying(false)
            }
        }
        activeVideo.addEventListener('ended', handleEnded)
        return () => activeVideo.removeEventListener('ended', handleEnded)
    }, [activeClipId, clips, setActiveClip, setCurrentTime, setIsPlaying, isPlaying])

    useEffect(() => {
        overlayItems.forEach(item => {
            if (item.type === 'video' && videoRefs.current[item.data.id]) {
                registerVideoRef(item.data.id, videoRefs.current[item.data.id])
            }
        })
    }, [overlayItems, registerVideoRef])

    useEffect(() => {
        if (!canvas || !overlayRef.current) return
        // @ts-ignore
        const objects = canvas.getObjects?.() || []

        objects.forEach((obj: any, idx: number) => {
            const item = overlayItems.find(it => it.index === idx || it.data.id === (obj.id || obj.metadata?.id))

            // Check timeline visibility for ALL objects (canvas and overlay)
            const hasTimeline = obj.metadata?.timelineStart !== undefined || (item?.type === 'video' && clips.find(c => c.id === item.data.id))
            let isWithinTimeRange = true

            if (obj.metadata?.timelineStart !== undefined) {
                const start = obj.metadata.timelineStart || 0
                const duration = obj.metadata.timelineDuration || 5
                isWithinTimeRange = currentTime >= start && currentTime < (start + duration)
            } else if (item?.type === 'video') {
                const clip = clips.find(c => c.id === item.data.id)
                if (clip) {
                    isWithinTimeRange = currentTime >= (clip.start || 0) && currentTime < ((clip.start || 0) + (clip.duration || 0))
                }
            }

            // Store original opacity if not already stored
            if (!obj._wasHiddenForPlayback) {
                obj._originalOpacity = obj.opacity ?? 1
                obj._wasHiddenForPlayback = true
            }

            let targetOpacity = obj._originalOpacity ?? 1 // Default to visible

            if (!isWithinTimeRange) {
                // Hide everything outside its time range
                targetOpacity = 0
            } else if (item) {
                // If it's in overlay, determine if it should be hidden on canvas
                if (item.type === 'video') {
                    const isThisVideoPlaying = isPlaying && item.data.id === activeClipId
                    // Hide video object on canvas when it's playing (overlay shows it instead)
                    if (isThisVideoPlaying) {
                        targetOpacity = 0
                    } else {
                        // Show video object when in time range but not playing
                        targetOpacity = 1
                    }
                } else {
                    // For text and images: if they're in the overlay, they're above videos
                    // Always hide them on canvas and show in overlay to maintain proper layer order
                    targetOpacity = 0
                }
            }

            if (obj.opacity !== targetOpacity) {
                obj.set('opacity', targetOpacity)
                obj.dirty = true
            }
        })
        // @ts-ignore
        canvas.requestRenderAll?.()
    }, [isPlaying, activeClipId, canvas, overlayItems, currentTime, clips])

    useEffect(() => {
        if (!canvas) return
        const updateOverlays = () => setTimeout(() => updateVideoPositions(), 50)
        // @ts-ignore
        canvas.on?.('object:added', updateOverlays)
        // @ts-ignore
        canvas.on?.('object:modified', updateOverlays)
        // @ts-ignore
        canvas.on?.('object:removed', updateOverlays)
        // @ts-ignore
        canvas.on?.('object:moving', updateOverlays)
        // @ts-ignore
        canvas.on?.('object:scaling', updateOverlays)
        return () => {
            // @ts-ignore
            canvas.off?.('object:added', updateOverlays)
            // @ts-ignore
            canvas.off?.('object:modified', updateOverlays)
            // @ts-ignore
            canvas.off?.('object:removed', updateOverlays)
            // @ts-ignore
            canvas.off?.('object:moving', updateOverlays)
            // @ts-ignore
            canvas.off?.('object:scaling', updateOverlays)
        }
    }, [canvas, updateVideoPositions])

    if (isModalOpen) return <OverlayContainer ref={overlayRef} style={{ display: 'none' }} />
    if (!canvasBounds) return <OverlayContainer ref={overlayRef} />

    return (
        <OverlayContainer ref={overlayRef}>
            {/* The Workspace Mask provides the Canva-style clipping for the Fabric canvas below */}
            <WorkspaceMask
                style={{
                    left: canvasBounds.left,
                    top: canvasBounds.top,
                    width: canvasBounds.width,
                    height: canvasBounds.height,
                }}
            />
            <CanvasClipContainer
                style={{
                    left: canvasBounds.left, top: canvasBounds.top,
                    width: canvasBounds.width, height: canvasBounds.height,
                    overflow: 'hidden', position: 'absolute',
                }}
            >
                {overlayItems.map((item, overlayIndex) => {
                    const { data: info, type } = item
                    const relativeLeft = info.left - canvasBounds.left
                    const relativeTop = info.top - canvasBounds.top
                    // Use overlayIndex for z-index to maintain layer order
                    const zIndexValue = overlayIndex + 1

                    if (type === 'video') {
                        const videoData = info as VideoInfo
                        const clip = clips.find(c => c.id === videoData.id)
                        const isWithinRange = clip && currentTime >= (clip.start || 0) && currentTime < ((clip.start || 0) + (clip.duration || 0))

                        if (!isWithinRange) return null

                        const isVideoPlaying = isPlaying && activeClipId === videoData.id
                        return (
                            <VideoPlayerWrapper
                                key={videoData.id}
                                style={{
                                    left: relativeLeft, top: relativeTop,
                                    width: videoData.width, height: videoData.height,
                                    transform: `translate(${videoData.originX === 'center' ? '-50%' : '0'}, ${videoData.originY === 'center' ? '-50%' : '0'}) rotate(${videoData.angle}deg)`,
                                    transformOrigin: 'top left', display: 'block', visibility: 'visible',
                                    zIndex: zIndexValue,
                                }}
                            >
                                <VideoElement
                                    ref={el => {
                                        if (el) {
                                            videoRefs.current[videoData.id] = el
                                            if (el.src !== videoData.src) { el.src = videoData.src; el.load() }
                                            if (isVideoPlaying) el.removeAttribute('poster')
                                            else if (videoData.poster) el.poster = videoData.poster
                                        }
                                    }}
                                    src={videoData.src}
                                    poster={isVideoPlaying ? '' : (videoData.poster || '')}
                                    muted={!isVideoPlaying} playsInline crossOrigin="anonymous" controls={false}
                                    style={{ opacity: 1, pointerEvents: isVideoPlaying ? 'auto' : 'none', objectFit: 'cover', objectPosition: 'center' }}
                                />
                                {isVideoPlaying && (
                                    <div
                                        style={{ position: 'absolute', inset: 0, cursor: 'pointer', pointerEvents: 'auto', zIndex: 5, background: 'transparent' }}
                                        onClick={(e) => handlePlayPause(videoData.id, e)}
                                    />
                                )}
                            </VideoPlayerWrapper>
                        )
                    } else if (type === 'text') {
                        const textData = info as TextOverlayInfo
                        const isWithinTimeline = currentTime >= (textData.timelineStart || 0) &&
                            currentTime < ((textData.timelineStart || 0) + (textData.timelineDuration || 99999))

                        if (!isWithinTimeline) return null

                        // Always show text overlay if it's in the overlay (meaning it's above videos)
                        // Canvas object is hidden, so overlay must show it to maintain layer order
                        return (
                            <TextOverlayElement
                                key={textData.id}
                                style={{
                                    left: relativeLeft, top: relativeTop, width: textData.width,
                                    fontSize: textData.fontSize, fontFamily: textData.fontFamily,
                                    color: textData.fill, fontWeight: textData.fontWeight,
                                    textAlign: textData.textAlign as any, fontStyle: textData.fontStyle,
                                    textDecoration: textData.textDecoration, lineHeight: textData.lineHeight,
                                    letterSpacing: `${(textData.charSpacing || 0) / 1000}em`,
                                    opacity: textData.opacity,
                                    position: 'absolute',
                                    transform: `translate(${textData.originX === 'center' ? '-50%' : '0'}, ${textData.originY === 'center' ? '-50%' : '0'})`,
                                    transformOrigin: 'top left',
                                    pointerEvents: 'none',
                                    zIndex: zIndexValue,
                                }}
                            >
                                {textData.text}
                            </TextOverlayElement>
                        )
                    } else if (type === 'generic') {
                        const genericData = info as GenericOverlayInfo
                        const isWithinTimeline = currentTime >= (genericData.timelineStart || 0) &&
                            currentTime < ((genericData.timelineStart || 0) + (genericData.timelineDuration || 99999))

                        if (!isWithinTimeline) return null

                        // Always show image overlay if it's in the overlay (meaning it's above videos)
                        // Canvas object is hidden, so overlay must show it to maintain layer order
                        return (
                            <GenericOverlayElement
                                key={genericData.id}
                                src={genericData.src}
                                style={{
                                    left: relativeLeft, top: relativeTop,
                                    width: genericData.width, height: genericData.height,
                                    opacity: genericData.opacity,
                                    transform: `translate(${genericData.originX === 'center' ? '-50%' : '0'}, ${genericData.originY === 'center' ? '-50%' : '0'}) rotate(${genericData.angle}deg)`,
                                    transformOrigin: 'top left', position: 'absolute',
                                    pointerEvents: 'none',
                                    zIndex: zIndexValue,
                                }}
                            />
                        )
                    }
                    return null
                })}
            </CanvasClipContainer>
        </OverlayContainer>
    )
}

export default VideoCanvasPlayer
