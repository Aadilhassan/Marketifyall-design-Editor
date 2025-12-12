import { useEffect, useState, useCallback, useRef } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useEditor } from '@nkyo/scenify-sdk'
import { searchPexelsVideos, getPopularVideos, isApiKeyConfigured, PexelsVideo, getBestVideoFile } from '@/services/pexels'
import { useDebounce } from 'use-debounce'
import { styled } from 'baseui'
import useVideoContext from '@/hooks/useVideoContext'

const Container = styled('div', {
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
})

const SearchSection = styled('div', {
    padding: '16px 20px',
    borderBottom: '1px solid #e8e8e8',
})

const CategoryScroller = styled('div', {
    padding: '12px 20px',
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    borderBottom: '1px solid #e8e8e8',
    '::-webkit-scrollbar': {
        height: '4px',
    },
    '::-webkit-scrollbar-thumb': {
        background: '#ccc',
        borderRadius: '2px',
    },
})

const CategoryChip = styled('button', ({ $active }: { $active: boolean }) => ({
    padding: '6px 14px',
    borderRadius: '16px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    background: $active ? '#667eea' : '#f0f0f0',
    color: $active ? '#fff' : '#555',
    ':hover': {
        background: $active ? '#5a6fd6' : '#e5e5e5',
    },
}))

const VideoGrid = styled('div', {
    display: 'grid',
    gap: '12px',
    padding: '16px 20px',
    gridTemplateColumns: 'repeat(2, 1fr)',
})

const VideoItem = styled('div', ({ $loading }: { $loading?: boolean }) => ({
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: $loading ? 'wait' : 'pointer',
    aspectRatio: '16/9',
    backgroundColor: '#1a1a1a',
    transition: 'transform 0.15s, box-shadow 0.15s',
    opacity: $loading ? 0.6 : 1,
    ':hover': {
        transform: 'scale(1.02)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    },
}))

const VideoThumb = styled('img', {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
})

const VideoOverlay = styled('div', {
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
    ':hover': {
        opacity: 1,
    },
})

const PlayIcon = styled('div', {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1a1a1a',
})

const DurationBadge = styled('div', {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    padding: '2px 6px',
    borderRadius: '4px',
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 500,
})

const VideographerCredit = styled('div', {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '4px 8px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
    color: '#fff',
    fontSize: '10px',
    opacity: 0,
    transition: 'opacity 0.2s',
})

const LoadingState = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    color: '#999',
    fontSize: '13px',
    gap: '8px',
})

const EmptyState = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    color: '#999',
    textAlign: 'center',
    gap: '8px',
})

const WarningBox = styled('div', {
    margin: '16px 20px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    color: '#856404',
    fontSize: '13px',
    lineHeight: '1.5',
})

const PexelsBadge = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '11px',
    color: '#888',
    borderTop: '1px solid #e8e8e8',
})

const CATEGORIES = [
    { id: 'popular', label: '🔥 Popular', query: '' },
    { id: 'nature', label: 'Nature', query: 'nature landscape' },
    { id: 'business', label: 'Business', query: 'business corporate' },
    { id: 'technology', label: 'Tech', query: 'technology digital' },
    { id: 'city', label: 'City', query: 'city urban' },
    { id: 'people', label: 'People', query: 'people lifestyle' },
    { id: 'abstract', label: 'Abstract', query: 'abstract motion' },
    { id: 'food', label: 'Food', query: 'food cooking' },
]

// Video cache for better performance
const videoCache = new Map<string, PexelsVideo[]>()

// Format duration in seconds to MM:SS
function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

function StockVideos() {
    const [search, setSearch] = useState('')
    const [videos, setVideos] = useState<PexelsVideo[]>([])
    const [loading, setLoading] = useState(false)
    const [activeCategory, setActiveCategory] = useState('popular')
    const [addingVideo, setAddingVideo] = useState<number | null>(null)
    const [debouncedSearch] = useDebounce(search, 500)
    const [apiKeyMissing] = useState(!isApiKeyConfigured())

    const editor = useEditor()
    const { addClip, setActiveClip, clips } = useVideoContext()
    const scrollRef = useRef<Scrollbars>(null)

    // Helper function to calculate next available start time (end of last video clip)
    const getNextVideoStartTime = useCallback(() => {
        if (clips.length === 0) {
            return 0 // Start at beginning if no clips exist
        }
        
        // Find the maximum end time of all existing video clips
        const maxEndTime = Math.max(...clips.map(clip => (clip.start || 0) + (clip.duration || 0)))
        return maxEndTime
    }, [clips])

    // Load videos for category
    const loadVideos = useCallback(async (query: string, cacheKey: string, isPopular: boolean = false) => {
        // Check cache first
        if (videoCache.has(cacheKey)) {
            setVideos(videoCache.get(cacheKey)!)
            return
        }

        setLoading(true)
        try {
            const data = isPopular ? await getPopularVideos(20) : await searchPexelsVideos(query, 20)
            videoCache.set(cacheKey, data)
            setVideos(data)
        } catch (error) {
            console.error('Failed to load videos:', error)
            setVideos([])
        } finally {
            setLoading(false)
        }
    }, [])

    // Load initial videos
    useEffect(() => {
        if (apiKeyMissing) return

        const category = CATEGORIES.find(c => c.id === activeCategory)
        if (category) {
            const isPopular = category.id === 'popular'
            loadVideos(category.query, `category-${category.id}`, isPopular)
        }
    }, [activeCategory, loadVideos, apiKeyMissing])

    // Search effect
    useEffect(() => {
        if (apiKeyMissing) return

        if (debouncedSearch.trim()) {
            loadVideos(debouncedSearch, `search-${debouncedSearch}`)
        } else {
            // Reload category videos
            const category = CATEGORIES.find(c => c.id === activeCategory)
            if (category) {
                const isPopular = category.id === 'popular'
                loadVideos(category.query, `category-${category.id}`, isPopular)
            }
        }
    }, [debouncedSearch, activeCategory, loadVideos, apiKeyMissing])

    const handleCategoryChange = useCallback((categoryId: string) => {
        setActiveCategory(categoryId)
        setSearch('')
        scrollRef.current?.scrollToTop()
    }, [])

    const addVideoToCanvas = useCallback(async (video: PexelsVideo) => {
        if (addingVideo || !editor) return
        setAddingVideo(video.id)

        try {
            const videoFile = getBestVideoFile(video)
            if (!videoFile) {
                console.error('No suitable video file found')
                return
            }

            const videoUrl = videoFile.link
            const clipId = `stock-${video.id}-${Date.now()}`

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
                videoElement.onerror = reject
            })

            // Wait for video to seek to frame
            await new Promise<void>((resolve) => {
                videoElement.onseeked = () => resolve()
            })

            // Get actual video dimensions
            const videoWidth = videoElement.videoWidth || videoFile.width || 1920
            const videoHeight = videoElement.videoHeight || videoFile.height || 1080

            // Canvas frame dimensions
            const frameWidth = 900
            const frameHeight = 1200

            // STANDARD SIZE for all videos (Canva-like behavior)
            // All videos will be normalized to this size regardless of aspect ratio
            // Using 16:9 aspect ratio as standard (720x405)
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

            // Center the video on canvas
            const left = (frameWidth - targetWidth) / 2
            const top = (frameHeight - targetHeight) / 2

            // Extract poster frame from video, cropped and scaled to standard size
            const posterCanvas = document.createElement('canvas')
            posterCanvas.width = targetWidth
            posterCanvas.height = targetHeight
            const ctx = posterCanvas.getContext('2d')

            let posterUrl = ''
            if (ctx) {
                // Draw video frame: crop from source and scale to standard size
                // This ensures all videos appear at the same size (cover mode)
                ctx.drawImage(
                    videoElement,
                    sourceX, sourceY, sourceWidth, sourceHeight, // Source crop
                    0, 0, targetWidth, targetHeight // Destination size
                )
                posterUrl = posterCanvas.toDataURL('image/png')
            }

            // Add to Canvas with standard dimensions
            // All videos use the same size (STANDARD_WIDTH x STANDARD_HEIGHT)
            editor.add({
                type: 'StaticImage',
                metadata: {
                    src: posterUrl || video.image, // Use extracted frame or fallback to thumbnail
                    videoSrc: videoUrl,
                    name: `Stock Video by ${video.user.name}`,
                    duration: video.duration,
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
            })

            // Calculate start time to place video sequentially after existing videos
            const startTime = getNextVideoStartTime()
            
            // Ensure duration is valid (fallback to 10 seconds if invalid)
            const videoDuration = video.duration && video.duration > 0 ? video.duration : 10
            
            // Validate clip data before adding
            const clipData = {
                id: clipId,
                name: `Stock Video by ${video.user.name}`,
                src: videoUrl,
                duration: videoDuration,
                start: startTime,
                end: startTime + videoDuration,
                poster: posterUrl || video.image, // Use extracted poster frame
            }
            
            // Verify all required fields are present
            if (!clipData.id || !clipData.src || !clipData.duration || clipData.duration <= 0) {
                console.error('Invalid clip data:', clipData)
                throw new Error('Invalid clip data')
            }
            
            // Add to Timeline - ensure this happens even if there are minor errors
            try {
                addClip(clipData)
                setActiveClip(clipId)
            } catch (clipError) {
                console.error('Failed to add clip to timeline:', clipError)
                // Still try to set active clip even if addClip failed
                try {
                    setActiveClip(clipId)
                } catch (e) {
                    console.error('Failed to set active clip:', e)
                }
            }
        } catch (error) {
            console.error('Failed to add video to canvas:', error)
            // Even if canvas addition failed, try to add to timeline if we have the data
            if (clipData && clipData.id && clipData.src) {
                try {
                    addClip(clipData)
                } catch (e) {
                    console.error('Failed to add clip after error:', e)
                }
            }
        } finally {
            setAddingVideo(null)
        }
    }, [editor, addClip, setActiveClip, addingVideo, getNextVideoStartTime, clips])

    return (
        <Container>
            <SearchSection>
                <Input
                    startEnhancer={() => <Icons.Search size={16} />}
                    value={search}
                    onChange={e => setSearch((e.target as any).value)}
                    placeholder="Search free stock videos..."
                    clearOnEscape
                    overrides={{
                        Root: { style: { borderRadius: '8px' } },
                        Input: { style: { fontSize: '13px' } },
                    }}
                />
            </SearchSection>

            {!search && (
                <CategoryScroller>
                    {CATEGORIES.map(cat => (
                        <CategoryChip
                            key={cat.id}
                            $active={activeCategory === cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                        >
                            {cat.label}
                        </CategoryChip>
                    ))}
                </CategoryScroller>
            )}

            <div style={{ flex: 1 }}>
                <Scrollbars ref={scrollRef} autoHide>
                    {apiKeyMissing ? (
                        <WarningBox>
                            <strong>⚠️ Pexels API Key Missing</strong>
                            <br />
                            Add your Pexels API key to the .env file:
                            <br />
                            <code style={{ fontSize: '11px' }}>REACT_APP_PIXELS_KEY=your_key_here</code>
                            <br /><br />
                            Get a free key at <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: '#856404' }}>pexels.com/api</a>
                        </WarningBox>
                    ) : loading ? (
                        <LoadingState>
                            <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="12" cy="12" r="10" stroke="#667eea" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" />
                            </svg>
                            Loading stock videos...
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </LoadingState>
                    ) : videos.length === 0 ? (
                        <EmptyState>
                            <span style={{ fontSize: '24px' }}>🎬</span>
                            <span>No videos found</span>
                            <span style={{ fontSize: '12px', color: '#aaa' }}>Try a different search term</span>
                        </EmptyState>
                    ) : (
                        <VideoGrid>
                            {videos.map(video => (
                                <VideoItem
                                    key={video.id}
                                    onClick={() => addVideoToCanvas(video)}
                                    $loading={addingVideo === video.id}
                                >
                                    <VideoThumb
                                        src={video.image}
                                        alt={`Stock video by ${video.user.name}`}
                                        loading="lazy"
                                    />
                                    <VideoOverlay>
                                        <PlayIcon>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="5 3 19 12 5 21 5 3" />
                                            </svg>
                                        </PlayIcon>
                                    </VideoOverlay>
                                    <DurationBadge>{formatDuration(video.duration)}</DurationBadge>
                                </VideoItem>
                            ))}
                        </VideoGrid>
                    )}
                </Scrollbars>
            </div>

            <PexelsBadge>
                Videos provided by
                <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', fontWeight: 600 }}>
                    Pexels
                </a>
            </PexelsBadge>
        </Container>
    )
}

export default StockVideos
