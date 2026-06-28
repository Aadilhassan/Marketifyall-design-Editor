import React, { useCallback, useEffect, useRef, useState } from 'react'
import { styled } from 'baseui'
import useVideoContext from '@/hooks/useVideoContext'
import { usePlaybackTime } from '@/contexts/VideoContext'
import { useEditorContext } from '@nkyo/scenify-sdk'
import { hasActiveAnimation, getObjectAnimation, getAnimOpacity } from '@/utils/animation'

const isAnimatedObject = (obj: any): boolean => hasActiveAnimation(getObjectAnimation(obj))

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
    opacity?: number
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
        setCurrentTime,
        togglePlayback,
        registerVideoRef,
        setActiveClip,
        setIsPlaying
    } = useVideoContext()
    const { currentTime } = usePlaybackTime()
    const { canvas } = useEditorContext()
    const [canvasBounds, setCanvasBounds] = useState<CanvasBounds | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [overlayItems, setOverlayItems] = useState<OverlayItem[]>([])
    const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
    const overlayRef = useRef<HTMLDivElement>(null)
    // Signatures of the last pushed bounds/overlay state, so we only call setState
    // (and re-render) when something visually changed — not on every frame/drag.
    const lastBoundsSig = useRef<string>('')
    const lastItemsSig = useRef<string>('')

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
            const objects = (canvas as any).getObjects?.() || []
            const canvasEl = (canvas as any).lowerCanvasEl as HTMLCanvasElement
            if (!canvasEl) return null

            const clipObj = objects.find((obj: any) =>
                obj.id === 'clip' ||
                obj.name === 'clip' ||
                obj.type === 'Frame' ||
                (obj.type === 'Rect' && obj.fill === '#ffffff' && (obj.width || 0) >= 500)
            )

            const canvasRect = canvasEl.getBoundingClientRect()
            const overlayRect = overlayRef.current.getBoundingClientRect()
            const zoom = (canvas as any).getZoom?.() || 1
            const vpt = (canvas as any).viewportTransform || [1, 0, 0, 1, 0, 0]

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
            return null
        }
    }, [canvas])

    // Find video objects and extract all overlays on top
    const updateVideoPositions = useCallback(() => {
        if (!canvas) return

        try {
            const objects = (canvas as any).getObjects?.() || []
            const canvasEl = (canvas as any).lowerCanvasEl as HTMLCanvasElement
            if (!canvasEl || !overlayRef.current) return

            const canvasRect = canvasEl.getBoundingClientRect()
            const overlayRect = overlayRef.current.getBoundingClientRect()
            const zoom = (canvas as any).getZoom?.() || 1
            const vpt = (canvas as any).viewportTransform || [1, 0, 0, 1, 0, 0]

            const frameBounds = getCanvasFrameBounds()
            const boundsSig = frameBounds
                ? `${Math.round(frameBounds.left)}:${Math.round(frameBounds.top)}:${Math.round(frameBounds.width)}:${Math.round(frameBounds.height)}`
                : 'null'
            if (boundsSig !== lastBoundsSig.current) {
                lastBoundsSig.current = boundsSig
                setCanvasBounds(frameBounds)
            }

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

                const actualOpacity = getAnimOpacity(obj) ?? obj._originalOpacity ?? obj.opacity ?? 1

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
                            opacity: isAnimatedObject(obj) ? (getAnimOpacity(obj) ?? 1) : 1,
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
                        // Rasterize shapes/vectors to a data URL ONCE and cache it on the
                        // object (rasterizing every frame during playback was a major CPU
                        // cost). Rasterize at full opacity — the overlay element applies the
                        // animated opacity via CSS. Cache is busted on object:modified.
                        if (!src) {
                            if (obj.__overlaySrc) {
                                src = obj.__overlaySrc
                            } else if (obj.toDataURL) {
                                const prevOpacity = obj.opacity
                                if (prevOpacity !== 1) obj.set('opacity', 1)
                                try {
                                    src = obj.toDataURL()
                                    obj.__overlaySrc = src
                                } catch (e) {
                                    // silently handled
                                }
                                if (prevOpacity !== 1) obj.set('opacity', prevOpacity)
                            }
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
            const itemsSig = newOverlayItems
                .map(it => {
                    const d: any = it.data
                    return `${it.type}:${d.id}:${Math.round(d.left || 0)}:${Math.round(d.top || 0)}:${Math.round(d.width || 0)}:${Math.round(d.height || 0)}:${d.opacity ?? 1}`
                })
                .join('|')
            if (itemsSig !== lastItemsSig.current) {
                lastItemsSig.current = itemsSig
                setOverlayItems(newOverlayItems)
            }
        } catch (err) {
            // silently handled
        }
    }, [canvas, clips, getCanvasFrameBounds])

    // Track overlay positions every frame ONLY during playback — that's when the
    // video and animated objects actually move. Running this rAF loop while
    // paused/idle (the previous behavior, gated only on clips.length) re-rendered
    // React ~60fps and made any video project feel sluggish even when nothing was
    // happening.
    useEffect(() => {
        if (!canvas || clips.length === 0 || !isPlaying) return
        let animId = 0
        let running = true
        const loop = () => {
            if (!running) return
            updateVideoPositions()
            animId = requestAnimationFrame(loop)
        }
        animId = requestAnimationFrame(loop)
        return () => {
            running = false
            cancelAnimationFrame(animId)
        }
    }, [canvas, clips.length, isPlaying, updateVideoPositions])

    // While paused, position the static overlay once — and again on scrub/seek or
    // when the design changes — instead of a permanent loop.
    useEffect(() => {
        if (!canvas || clips.length === 0 || isPlaying) return
        const id = requestAnimationFrame(() => updateVideoPositions())
        return () => cancelAnimationFrame(id)
    }, [canvas, clips.length, isPlaying, currentTime, updateVideoPositions])

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
                // silently handled (AbortError expected during seeking)
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
        const objects = (canvas as any).getObjects?.() || []
        let changed = false

        objects.forEach((obj: any, idx: number) => {
            const item = overlayItems.find(it => it.index === idx || it.data.id === (obj.id || obj.metadata?.id))

            // Keyframe-animated objects that aren't mirrored into the DOM overlay are
            // owned entirely by AnimationDriver (opacity + transform). Leave them alone.
            if (isAnimatedObject(obj) && !item) return

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
                    // Text/images are mirrored into the DOM overlay only so they can layer
                    // ABOVE a video that is playing in the overlay. Hide the canvas copy ONLY
                    // while a video is actually playing; otherwise keep it visible on the canvas
                    // so text/images never silently vanish while paused/editing (the overlay
                    // mirror can be empty or mispositioned, leaving an invisible-but-selectable
                    // object).
                    targetOpacity = isPlaying && activeClipId ? 0 : (obj._originalOpacity ?? 1)
                }
            }

            if (obj.opacity !== targetOpacity) {
                obj.set('opacity', targetOpacity)
                obj.dirty = true
                changed = true
            }
        })
        if (changed) (canvas as any).requestRenderAll?.()
    }, [isPlaying, activeClipId, canvas, overlayItems, currentTime, clips])

    useEffect(() => {
        if (!canvas) return
        const c = canvas as any
        let pending = 0
        const schedule = () => {
            if (pending) return
            pending = requestAnimationFrame(() => {
                pending = 0
                updateVideoPositions()
            })
        }
        // On edits, also bust the cached rasterization of the changed object.
        const onModified = (e: any) => {
            if (e && e.target) e.target.__overlaySrc = null
            schedule()
        }
        c.on?.('object:added', schedule)
        c.on?.('object:modified', onModified)
        c.on?.('object:removed', schedule)
        c.on?.('object:moving', schedule)
        c.on?.('object:scaling', onModified)
        // Reposition overlays on zoom (wheel) and pan (mouse:up). Discrete events,
        // so no render loop; the idempotent setState above prevents churn.
        c.on?.('mouse:wheel', schedule)
        c.on?.('mouse:up', schedule)
        return () => {
            if (pending) cancelAnimationFrame(pending)
            c.off?.('object:added', schedule)
            c.off?.('object:modified', onModified)
            c.off?.('object:removed', schedule)
            c.off?.('object:moving', schedule)
            c.off?.('object:scaling', onModified)
            c.off?.('mouse:wheel', schedule)
            c.off?.('mouse:up', schedule)
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
                                    opacity: videoData.opacity ?? 1,
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
                        // Only mirror text into the DOM overlay while a video is playing (the
                        // canvas copy is hidden then). When paused/editing the canvas renders it,
                        // so skip the overlay to avoid a duplicate or mispositioned copy.
                        if (!(isPlaying && activeClipId)) return null

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
                        // Only needed while a video is playing (see text overlay above); the
                        // canvas renders it otherwise.
                        if (!(isPlaying && activeClipId)) return null

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
