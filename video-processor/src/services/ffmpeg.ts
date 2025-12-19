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

            // --- STEP 3: Add Video/Image Clip Inputs ---
            downloadedAssets.forEach((asset) => {
                command = command.input(asset.localPath)
                if (asset.clip.type === 'image') {
                    // Images must be looped to be visible for more than one frame.
                    // We'll trim them to the correct duration in the filter graph.
                    command = command.inputOptions(['-loop', '1'])
                }
            })

            // --- STEP 4: Create Overlay Graph for Clips ---
            downloadedAssets.forEach((asset, i) => {
                const clip = asset.clip as VideoClip | ImageClip
                // The ffmpeg input index for this clip
                const idx = inputIndex + i

                // Scale clip to target size
                const w = Math.round((clip.size?.width ?? 100) / 100 * timeline.width)
                const h = Math.round((clip.size?.height ?? 100) / 100 * timeline.height)

                // Overlay Position
                const x = Math.round((clip.position?.x ?? 0) / 100 * timeline.width)
                const y = Math.round((clip.position?.y ?? 0) / 100 * timeline.height)

                // Timing Logic (The Fix)
                const start = clip.start ?? 0
                const duration = clip.duration ?? timeline.duration

                // 1. Scale with aspect ratio preservation (COVER logic - fill and crop)
                // 2. Trim so it doesn't play forever (important for images too)
                // 3. Shift PTS (presentation timestamp) to start time
                // 4. Ensure square pixels (setsar=1)
                filters.push(
                    `[${idx}:v]` +
                    `scale=w=${w}:h=${h}:force_original_aspect_ratio=increase,` +
                    `crop=${w}:${h},` +
                    `setsar=1,` +
                    `trim=start=0:duration=${duration},` +
                    `setpts=PTS-STARTPTS+${start}/TB` +
                    `[clip_${i}]`
                )

                const outputName = `tmp_media_${i}`
                const end = start + duration

                // Overlay with enable to gate visibility safely
                // Reverting to 't' (global main input time) to fix 'Invalid argument' with 'T'
                filters.push(
                    `[${currentBase}][clip_${i}]overlay=${x}:${y}:enable='between(t,${start},${end})':eval=frame[${outputName}]`
                )

                currentBase = outputName
            })

            // --- STEP 5: Text Overlays ---
            // Helper to escape text for drawtext filter
            const escapeDrawtext = (text: string) => {
                return text
                    .replace(/\\/g, '\\\\')
                    .replace(/:/g, '\\:')
                    .replace(/'/g, "\\'")
                    .replace(/\n/g, '\\n')
            }

            const textClips = clips.filter(c => c.type === 'text') as TextClip[]
            textClips.forEach((clip, i) => {
                const x = Math.round((clip.position.x / 100) * timeline.width)
                const y = Math.round((clip.position.y / 100) * timeline.height)

                const start = clip.start ?? 0
                const end = start + (clip.duration ?? timeline.duration)

                const fontSize = Math.round((clip.style?.fontSize || 24))
                const fontColor = clip.style?.color || 'black'

                const outputName = `tmp_txt_${i}`
                // Use Global Time 't' for visibility gating
                filters.push(
                    `[${currentBase}]drawtext=` +
                    `text='${escapeDrawtext(clip.content)}':` +
                    `x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}:` +
                    `enable='between(t,${start},${end})'` +
                    `[${outputName}]`
                )

                currentBase = outputName
            })

            const finalOutput = currentBase

            console.log('Filter Graph:', filters.join(';'))

            // --- STEP 6: Apply Filter Graph ---
            if (filters.length > 0) {
                command = command.complexFilter(filters, finalOutput)
            }

            onProgress(40)

            // Output settings - professional quality
            const outputOptions = [
                '-c:v', 'libx264',
                '-preset', 'medium',     // Balance speed/quality
                '-crf', '20',            // Good quality
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-r', String(timeline.fps),
                '-shortest',             // Stop encoding when shortest input (base canvas) ends
                '-t', String(timeline.duration),
                '-an',                   // No audio for now (simpler)
                '-y',
            ]

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
