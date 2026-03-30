/**
 * Auto-Generation Route
 * URL -> Scrape -> AI -> TTS -> Video
 */

import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { scrapeZillow } from '../services/scraper'
import { generateScript } from '../services/agent'
import { generateSpeech } from '../services/tts'
import { renderVideo } from '../services/ffmpeg'
import { RenderJob, RenderRequest, TimelineClip } from '../types/timeline'

const router = Router()
const jobs: Map<string, RenderJob> = new Map()

// Shared job store (dumb in-memory sharing with render.ts for now, ideally elevate to index.ts)
// For prototype, we'll just keep a local map and maybe expose status here too
// OR we can import the map from a shared module. For speed, I'll copy the status logic.

router.post('/', async (req: Request, res: Response) => {
    try {
        const { url } = req.body
        if (!url) return res.status(400).json({ error: 'URL is required' })

        const jobId = uuidv4()
        const job: RenderJob = {
            id: jobId,
            status: 'queued',
            progress: 0,
            createdAt: new Date()
        }
        jobs.set(jobId, job);

        // Async Process
        (async () => {
            try {
                job.status = 'processing'
                job.progress = 5

                // 1. Scrape
                console.log('Starting scrape for:', url)
                const property = await scrapeZillow(url)
                if (!property.images || property.images.length === 0) {
                    throw new Error('No images found on page')
                }
                job.progress = 20

                // 2. AI Script
                console.log('Generating AI script...')
                const aiData = await generateScript(property)
                job.progress = 30

                // 3. TTS
                console.log('Generating Audio...')
                const audioPath = await generateSpeech(aiData.script, jobId)
                job.progress = 40

                // 4. Build Timeline
                // Distribute images evenly across 30 seconds (or audio duration)
                // If we have audio, use audio duration. Since we don't know duration without probing, 
                // we'll assume approx duration from char count or just set 30s.
                // Google TTS info usually doesn't give duration directly without probing file.
                // We'll stick to a fixed 30s video for now.

                const totalDuration = 30
                const imageDuration = totalDuration / Math.min(property.images.length, 10)

                const clips: TimelineClip[] = property.images.slice(0, 10).map((img, i) => ({
                    type: 'image',
                    id: `img-${i}`,
                    src: img,
                    start: i * imageDuration,
                    duration: imageDuration,
                    position: { x: 0, y: 0 },
                    size: { width: 100, height: 100 } // Cover
                }))

                // 5. Render
                const renderReq: RenderRequest = {
                    timeline: {
                        width: 1280,
                        height: 720,
                        fps: 30,
                        duration: totalDuration,
                        backgroundColor: 'black'
                    },
                    clips: clips
                }

                // Inject Audio if enabled in ffmpeg (we didn't add audio input support in renderVideo yet easily)
                // We will handle audio in renderVideo update next.
                // For now, let's just render the video visuals.

                job.progress = 50
                const outputPath = await renderVideo(jobId, renderReq, (p) => {
                    // Map render progress 50-100 to job progress 50-100
                    job.progress = 50 + (p * 0.5)
                })

                job.status = 'done'
                job.progress = 100
                job.outputPath = outputPath

            } catch (err: any) {
                console.error('Job failed:', err)
                job.status = 'error'
                job.error = err.message
            }
        })()

        res.json({ id: jobId, status: 'queued' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Failed to start generation' })
    }
})

router.get('/:id/status', (req, res) => {
    const job = jobs.get(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    res.json(job)
})

router.get('/:id/download', (req, res) => {
    const job = jobs.get(req.params.id)
    if (job && job.status === 'done' && job.outputPath) {
        res.download(job.outputPath)
    } else {
        res.status(404).json({ error: 'Not ready' })
    }
})

/**
 * Manual Input Mode - Enhanced with Vision, Subtitles, Multi-Format
 */
router.post('/manual', async (req: Request, res: Response) => {
    try {
        const { propertyText, images, format = 'landscape', captionStyle } = req.body
        if (!propertyText || !images || images.length === 0) {
            return res.status(400).json({ error: 'propertyText and images are required' })
        }

        // Caption style defaults
        const captionConfig = {
            fontSize: captionStyle?.fontSize || 36,
            color: captionStyle?.color || 'white',
            bgColor: captionStyle?.bgColor || 'black@0.7',
            position: captionStyle?.position || 'bottom'
        }

        // Format dimensions
        const formats: Record<string, { width: number; height: number }> = {
            landscape: { width: 1280, height: 720 },
            portrait: { width: 1080, height: 1920 },
            square: { width: 1080, height: 1080 }
        }
        const resolution = formats[format] || formats.landscape

        const jobId = uuidv4()
        const job: RenderJob = {
            id: jobId,
            status: 'queued',
            progress: 0,
            createdAt: new Date()
        }
        jobs.set(jobId, job);

        // Async Process
        (async () => {
            try {
                job.status = 'processing'
                job.progress = 5

                // Initialize usage tracking
                const {
                    createUsageLog, logVisionUsage, logScriptUsage,
                    logTTSUsage, logGiphyUsage, logRenderUsage, saveUsageLog, getCostSummary
                } = await import('../services/usage')
                const usageLog = createUsageLog(jobId)

                console.log('========== ENHANCED GENERATION START ==========')
                console.log(`Images: ${images.length}`)
                console.log(`Format: ${format} (${resolution.width}x${resolution.height})`)
                console.log(`Property Text Length: ${propertyText.length} chars`)

                // 1. AI Vision - Describe images
                console.log('[INFO] Describing images with AI Vision...')
                job.progress = 10
                const { describeImages, formatDescriptionsForPrompt } = await import('../services/vision')
                const imageDescriptions = await describeImages(images.slice(0, 5)) // Limit to 5 for speed
                const imageContext = imageDescriptions.map(d => d.description)
                logVisionUsage(usageLog, imageDescriptions.length)
                job.progress = 25

                // 2. AI Script - With image context
                console.log('[INFO] Generating AI script with image context...')
                const aiData = await generateScript({
                    url: '',
                    address: '',
                    price: '',
                    description: propertyText,
                    specs: '',
                    images: images
                }, imageContext)
                logScriptUsage(usageLog, aiData.script.length)
                job.progress = 40

                // 3. TTS
                console.log('[INFO] Generating Audio...')
                const audioPath = await generateSpeech(aiData.script, jobId)
                job.progress = 50

                // 3.5. Fetch Stickers from Giphy
                console.log('[INFO] Fetching stickers from Giphy...')
                const tempDir = path.join(__dirname, '../../temp', jobId)
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

                const { fetchStickers, getDefaultStickerSuggestions } = await import('../services/stickers')
                const stickerSuggestions = aiData.stickerSuggestions || getDefaultStickerSuggestions(30)
                const stickers = await fetchStickers(stickerSuggestions as any, tempDir)
                logGiphyUsage(usageLog, stickers.length)
                job.progress = 55

                // 4. Generate Subtitles and get audio duration
                console.log('[INFO] Generating Subtitles...')
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

                // Get audio duration from file size (approximate: WAV at 24kHz mono 16-bit = 48000 bytes/sec)
                let totalDuration = 30 // default
                if (audioPath && fs.existsSync(audioPath)) {
                    const audioStats = fs.statSync(audioPath)
                    // WAV header is 44 bytes, rest is audio data at 48000 bytes/sec
                    const audioDataSize = audioStats.size - 44
                    totalDuration = Math.max(10, Math.min(60, audioDataSize / 48000))
                    console.log(`[INFO] Audio duration: ${totalDuration.toFixed(1)}s (from ${audioStats.size} bytes)`)
                    logTTSUsage(usageLog, aiData.script.length, totalDuration)
                }

                const { saveSubtitles } = await import('../services/subtitles')
                const { srtPath, segments } = saveSubtitles(aiData.script, totalDuration, tempDir)
                job.progress = 55

                // 5. Build Timeline with Text Overlays
                const imageDuration = totalDuration / Math.min(images.length, 10)

                // Image clips
                const clips: TimelineClip[] = images.slice(0, 10).map((img: string, i: number) => ({
                    type: 'image' as const,
                    id: `img-${i}`,
                    src: img,
                    start: i * imageDuration,
                    duration: imageDuration,
                    position: { x: 0, y: 0 },
                    size: { width: 100, height: 100 }
                }))

                // Add TikTok-style word captions from subtitles
                // Calculate position based on captionConfig.position
                const captionY = captionConfig.position === 'top' ? 10 :
                    captionConfig.position === 'center' ? 45 :
                        (format === 'portrait' ? 80 : 85)

                const textClips: TimelineClip[] = segments.map((seg, i) => ({
                    type: 'text' as const,
                    id: `caption-${i}`,
                    content: seg.text.toUpperCase(),
                    start: seg.startTime,
                    duration: seg.endTime - seg.startTime,
                    position: { x: 50, y: captionY },
                    size: { width: 90, height: 15 },
                    style: {
                        fontSize: captionConfig.fontSize,
                        color: captionConfig.color,
                        backgroundColor: captionConfig.bgColor
                    }
                }))

                // Add property highlights overlay (if available)
                if (aiData.propertyHighlights?.price) {
                    textClips.push({
                        type: 'text' as const,
                        id: 'price-overlay',
                        content: aiData.propertyHighlights.price,
                        start: 0,
                        duration: totalDuration,
                        position: { x: 5, y: 5 },
                        size: { width: 30, height: 8 },
                        style: {
                            fontSize: format === 'portrait' ? 36 : 28,
                            color: 'white',
                            backgroundColor: 'rgba(224,11,32,0.9)'
                        }
                    })
                }

                // Add sticker overlays (from Giphy)
                const stickerClips: TimelineClip[] = stickers.map((sticker, i) => ({
                    type: 'image' as const,
                    id: `sticker-${i}`,
                    src: sticker.localPath,  // Local path to downloaded GIF
                    start: sticker.timing,
                    duration: sticker.duration,
                    position: sticker.position,
                    size: sticker.size
                }))
                console.log(`[INFO] Added ${stickerClips.length} sticker overlays`)

                // 6. Render
                const renderReq: RenderRequest = {
                    timeline: {
                        width: resolution.width,
                        height: resolution.height,
                        fps: 30,
                        duration: totalDuration,
                        backgroundColor: 'black',
                        audioPath: audioPath || undefined
                    },
                    clips: [...clips, ...textClips, ...stickerClips]
                }

                job.progress = 60
                logRenderUsage(usageLog, totalDuration, format)
                const outputPath = await renderVideo(jobId, renderReq, (p) => {
                    job.progress = 60 + (p * 0.4)
                })

                job.status = 'done'
                job.progress = 100
                job.outputPath = outputPath

                // Save usage log
                saveUsageLog(usageLog, tempDir, 'completed')
                console.log(getCostSummary(usageLog))
                console.log('========== ENHANCED GENERATION COMPLETE ==========')

            } catch (err: any) {
                console.error('Job failed:', err)
                job.status = 'error'
                job.error = err.message
                // Try to save usage log even on failure
                try {
                    const tempDir = path.join(__dirname, '../../temp', jobId)
                    if (fs.existsSync(tempDir)) {
                        const { saveUsageLog, createUsageLog } = await import('../services/usage')
                        const failedLog = createUsageLog(jobId)
                        saveUsageLog(failedLog, tempDir, 'failed')
                    }
                } catch { }
            }
        })()

        res.json({ id: jobId, status: 'queued', format })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Failed to start generation' })
    }
})

export default router


