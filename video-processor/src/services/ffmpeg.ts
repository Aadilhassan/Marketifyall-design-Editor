/**
 * FFmpeg Video Composition Service
 * Builds FFmpeg commands to compose videos with canvas background
 */

import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import { RenderRequest, VideoClip, ImageClip, TextClip, TimelineClip } from '../types/timeline'
import { downloadAsset, getOutputPath, cleanupJob } from './assets'

interface DownloadedAsset {
    clip: TimelineClip
    localPath: string
}

/**
 * Save base64 image to file
 */
async function saveBase64Image(base64Data: string, jobId: string, filename: string): Promise<string> {
    const tempDir = path.join(__dirname, '../../temp', jobId)
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }

    const filePath = path.join(tempDir, filename)

    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Clean, 'base64')

    fs.writeFileSync(filePath, buffer)
    console.log(`Saved background image: ${filePath}`)

    return filePath
}

export async function renderVideo(
    jobId: string,
    request: RenderRequest,
    onProgress: (progress: number) => void
): Promise<string> {
    const { timeline, clips } = request
    const outputPath = getOutputPath(jobId)

    console.log(`Starting render job ${jobId} (v2 - precise timeline)`)
    console.log(`Output: ${timeline.width}x${timeline.height} @ ${timeline.fps}fps, ${timeline.duration}s`)
    console.log(`Has background image: ${!!timeline.backgroundImage}`)
    console.log(`Clips:`, clips.filter(c => c.type === 'video').length, 'videos')

    onProgress(5)

    // Save background image if provided
    let backgroundPath: string | null = null
    if (timeline.backgroundImage) {
        try {
            backgroundPath = await saveBase64Image(timeline.backgroundImage, jobId, 'background.png')
        } catch (err) {
            console.error('Failed to save background image:', err)
        }
    }

    // Download video and image assets
    const downloadedAssets: DownloadedAsset[] = []
    const mediaClips = clips.filter(c => c.type === 'video' || c.type === 'image')

    for (let i = 0; i < mediaClips.length; i++) {
        const clip = mediaClips[i]
        try {
            if (clip.src && (clip.src.startsWith('http') || clip.src.startsWith('data:'))) {
                const localPath = await downloadAsset(clip.src, jobId)
                downloadedAssets.push({ clip, localPath })
                console.log(`Downloaded asset (${clip.type}) ${i + 1}/${mediaClips.length}`)
            } else {
                console.warn(`Skipping invalid asset src: ${clip.src}`)
            }
        } catch (error) {
            console.error(`Failed to download: ${clip.src}`, error)
            throw new Error(`Failed to download asset: ${clip.src}`)
        }
        onProgress(10 + ((i + 1) / mediaClips.length) * 20)
    }

    onProgress(30)

    onProgress(30)

    // Build FFmpeg command
    return new Promise((resolve, reject) => {
        try {
            let command = ffmpeg()
            const filters: string[] = []

            // --- STEP 1: Make color the real base input (Input 0) ---
            // This ensures a consistent timeline base
            // --- STEP 1: Generate Base Color Canvas (Internal Source) ---
            // Used directly in filter graph to avoid 'lavfi' input format error
            // (Note: 'T' in overlay will still refer to this base stream's timestamp)
            filters.push(`color=c=${timeline.backgroundColor || 'white'}:s=${timeline.width}x${timeline.height}:r=${timeline.fps}:d=${timeline.duration}[base_v]`)

            let currentBase = 'base_v'
            let inputIndex = 0

            // --- STEP 2: Handle Background Image (Input 1 if present) ---
            if (backgroundPath && fs.existsSync(backgroundPath)) {
                command = command.input(backgroundPath)
                command = command.inputOptions(['-loop', '1', '-t', String(timeline.duration)])

                // Scale and overlay background
                filters.push(`[${inputIndex}:v]scale=${timeline.width}:${timeline.height}[bg_scaled]`)
                filters.push(`[${currentBase}][bg_scaled]overlay=0:0[tmp_bg]`)

                currentBase = 'tmp_bg'
                inputIndex++
            }

            // --- STEP 2.5: Handle Audio (Input 2 if present, or next index) ---
            let audioInputIndex = -1
            if (timeline.audioPath && fs.existsSync(timeline.audioPath)) {
                command = command.input(timeline.audioPath)
                audioInputIndex = inputIndex
                inputIndex++
            }

            // --- STEP 3: Add Video/Image Clip Inputs ---
            downloadedAssets.forEach((asset) => {
                command = command.input(asset.localPath)
                if (asset.clip.type === 'image') {
                    // Images must be looped to be visible for more than one frame.
                    // We'll trim them to the correct duration in the filter graph.
                    command = command.inputOptions(['-loop', '1'])
                }
            })

            // --- STEP 4: Create Overlay Graph for Clips with Fade Transitions ---
            downloadedAssets.forEach((asset, i) => {
                const clip = asset.clip as VideoClip | ImageClip
                // The ffmpeg input index for this clip
                const idx = inputIndex + i

                // Check if this is a sticker (smaller overlay, likely GIF)
                const isSticker = clip.id?.startsWith('sticker-') ||
                    asset.localPath.endsWith('.gif') ||
                    (clip.size?.width || 100) < 50

                // Scale clip to target size
                const w = Math.round((clip.size?.width ?? 100) / 100 * timeline.width)
                const h = Math.round((clip.size?.height ?? 100) / 100 * timeline.height)

                // Overlay Position
                const x = Math.round((clip.position?.x ?? 0) / 100 * timeline.width)
                const y = Math.round((clip.position?.y ?? 0) / 100 * timeline.height)

                // Timing Logic
                const start = clip.start ?? 0
                const duration = clip.duration ?? timeline.duration
                const end = start + duration

                // Fade duration (0.5 sec fade in/out for images, none for stickers)
                const fadeDuration = isSticker ? 0 : 0.5

                if (isSticker) {
                    // GIF stickers: scale with alpha channel preservation, fifo to stabilize
                    filters.push(
                        `[${idx}:v]` +
                        `scale=w=${w}:h=${h}:flags=lanczos,` +
                        `format=rgba,` +
                        `fifo,` +
                        `setpts=PTS-STARTPTS+${start}/TB` +
                        `[clip_${i}]`
                    )
                } else {
                    // Regular images: scale, crop, add fade transitions
                    const fadeIn = fadeDuration > 0 ? `fade=t=in:st=0:d=${fadeDuration},` : ''
                    const fadeOut = fadeDuration > 0 ? `fade=t=out:st=${Math.max(0, duration - fadeDuration)}:d=${fadeDuration},` : ''

                    filters.push(
                        `[${idx}:v]` +
                        `scale=w=${w}:h=${h}:force_original_aspect_ratio=increase,` +
                        `crop=${w}:${h},` +
                        `setsar=1,` +
                        `${fadeIn}${fadeOut}` +
                        `trim=start=0:duration=${duration},` +
                        `setpts=PTS-STARTPTS+${start}/TB` +
                        `[clip_${i}]`
                    )
                }

                const outputName = `tmp_media_${i}`

                // Overlay with enable to gate visibility
                // Use 'shortest=0' for stickers to allow alpha
                filters.push(
                    `[${currentBase}][clip_${i}]overlay=${x}:${y}:enable='between(t,${start},${end})':eval=frame[${outputName}]`
                )

                currentBase = outputName
            })

            // --- STEP 5: Text Overlays (TikTok-style captions) ---
            // Helper to escape text for drawtext filter - remove ALL problematic chars
            const escapeDrawtext = (text: string) => {
                return text
                    .replace(/['''`]/g, '')     // ALL apostrophe variants
                    .replace(/["""]/g, '')      // ALL quote variants
                    .replace(/[—–-]/g, ' ')     // ALL dash variants to space
                    .replace(/:/g, ' ')
                    .replace(/[[\]()]/g, '')
                    .replace(/[,!$@#%^&*]/g, '') // Remove special chars
                    .replace(/\\/g, '')
                    .replace(/\./g, ' ')
                    .replace(/\s+/g, ' ')        // Collapse multiple spaces
                    .trim()
                    .substring(0, 40)            // Limit to 40 chars
            }

            // Safe margins: 10% from edges
            const safeMarginX = Math.round(timeline.width * 0.1)
            const safeMarginY = Math.round(timeline.height * 0.05)

            // Responsive font size: 3% of video width for portrait, 4% for landscape
            const baseFontSize = Math.round(timeline.width * (timeline.height > timeline.width ? 0.04 : 0.035))

            const textClips = clips.filter(c => c.type === 'text') as TextClip[]
            textClips.forEach((clip, i) => {
                const start = clip.start ?? 0
                const end = start + (clip.duration ?? timeline.duration)

                // Use clip font size or responsive default
                const fontSize = clip.style?.fontSize || baseFontSize

                // Simple color handling - use color names or simple hex
                let fontColor = clip.style?.color || 'white'
                if (fontColor.startsWith('#')) fontColor = fontColor // keep as-is, FFmpeg handles #RRGGBB

                // For box, use simple black@opacity format
                const bgColor = 'black@0.7'

                // Position: center horizontally, use clip.position.y for vertical (with safe margin)
                const yPos = Math.min(
                    Math.round((clip.position.y / 100) * timeline.height),
                    timeline.height - safeMarginY - fontSize * 2
                )

                const outputName = `tmp_txt_${i}`

                // Clean, escaped text
                const cleanText = escapeDrawtext(clip.content)

                if (!cleanText || cleanText.length < 2) {
                    // Skip empty or too-short captions
                    return
                }

                // TikTok-style: centered, with box background for readability
                filters.push(
                    `[${currentBase}]drawtext=` +
                    `text='${cleanText}':` +
                    `fontsize=${fontSize}:fontcolor=${fontColor}:` +
                    `x=(w-text_w)/2:y=${yPos}:` +
                    `box=1:boxcolor=${bgColor}:boxborderw=15:` +
                    `enable='between(t,${start},${end})'` +
                    `[${outputName}]`
                )

                currentBase = outputName
            })

            const finalOutput = currentBase

            // --- STEP 6: Apply Filter Graph ---
            // When audio is present, the final video stream must be named [v] for explicit mapping
            if (filters.length > 0) {
                if (audioInputIndex !== -1) {
                    // Rename the final filter output from [tmp_media_X] to [v]
                    const lastFilter = filters[filters.length - 1]
                    filters[filters.length - 1] = lastFilter.replace(`[${finalOutput}]`, '[v]')
                    console.log('Modified last filter for [v] output')
                    command = command.complexFilter(filters)
                } else {
                    command = command.complexFilter(filters, finalOutput)
                }
            }

            onProgress(40)

            // Output settings - professional quality
            const outputOptions: string[] = []

            // If audio exists, we need explicit stream mapping (maps MUST come first)
            if (audioInputIndex !== -1) {
                outputOptions.push('-map', '[v]')  // Video from filter graph
                outputOptions.push('-map', `${audioInputIndex}:a`)  // Audio from input
            }

            outputOptions.push(
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                '-r', String(timeline.fps),
                '-t', String(timeline.duration)
            )

            if (audioInputIndex === -1) {
                outputOptions.push('-an') // No audio
            } else {
                outputOptions.push('-c:a', 'aac', '-b:a', '128k')
            }

            outputOptions.push('-y')

            console.log('Output Options:', outputOptions.join(' '))
            console.log('Output Path:', outputPath)
            console.log('Audio Input Index:', audioInputIndex)

            command = command
                .outputOptions(outputOptions)
                .output(outputPath)

            command.on('progress', (progress) => {
                const ffmpegProgress = progress.percent || 0
                onProgress(40 + (ffmpegProgress * 0.55))
            })

            command.on('end', () => {
                console.log(`Render complete: ${outputPath}`)
                onProgress(100)
                resolve(outputPath)
            })

            command.on('error', (err) => {
                console.error('FFmpeg error:', err)
                cleanupJob(jobId)
                reject(err)
            })

            console.log('Running FFmpeg...')
            command.run()

        } catch (error) {
            console.error('Error building FFmpeg command:', error)
            cleanupJob(jobId)
            reject(error)
        }
    })
}
