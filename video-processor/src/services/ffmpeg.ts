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

/**
 * Render a video from timeline data
 */
export async function renderVideo(
    jobId: string,
    request: RenderRequest,
    onProgress: (progress: number) => void
): Promise<string> {
    const { timeline, clips } = request
    const outputPath = getOutputPath(jobId)

    console.log(`Starting render job ${jobId}`)
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

    // Download video assets
    const downloadedAssets: DownloadedAsset[] = []
    const videoClips = clips.filter(c => c.type === 'video')

    for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i]
        if (clip.type === 'video') {
            try {
                const localPath = await downloadAsset(clip.src, jobId)
                downloadedAssets.push({ clip, localPath })
                console.log(`Downloaded video ${i + 1}/${videoClips.length}`)
            } catch (error) {
                console.error(`Failed to download: ${clip.src}`, error)
                throw new Error(`Failed to download video`)
            }
        }
        onProgress(5 + ((i + 1) / videoClips.length) * 25)
    }

    onProgress(30)

    // Build FFmpeg command
    return new Promise((resolve, reject) => {
        try {
            let command = ffmpeg()
            let inputCount = 0

            // Input 0: Background image (loop for duration)
            if (backgroundPath && fs.existsSync(backgroundPath)) {
                const stats = fs.statSync(backgroundPath)
                console.log(`Using canvas background as base layer (${stats.size} bytes)`)
                command = command
                    .input(backgroundPath)
                    .inputOptions(['-loop', '1', '-t', String(timeline.duration)])
                inputCount++
            } else {
                console.log('No background image available, using first video as base')
            }

            // Add video inputs
            downloadedAssets.forEach((asset) => {
                command = command.input(asset.localPath)
                if (asset.clip.type === 'video') {
                    command = command.inputOptions(['-stream_loop', '-1'])
                }
                inputCount++
            })

            // Build filter graph
            const filters: string[] = []
            let currentBase = ''

<<<<<<< HEAD
            // 1. Generate background using filter source (avoids -f lavfi input issue)
            filters.push(`color=c=${timeline.backgroundColor || 'white'}:s=${timeline.width}x${timeline.height}[base]`)

            // 2. Scale each video to its target size
            videoClips.forEach((asset, index) => {
                const clip = asset.clip as VideoClip | ImageClip
                // Ensure min size 1x1 to avoid scale errors
                const w = Math.max(1, Math.round((clip.size.width / 100) * timeline.width))
                const h = Math.max(1, Math.round((clip.size.height / 100) * timeline.height))

                // Map input [index] to [v_index] (Inputs correspond directly to video array now)
                filters.push(`[${index}:v]scale=${w}:${h},setpts=PTS-STARTPTS[v${index}]`)
            })

            let currentBase = 'base'

            // 3. Overlay all scaled videos onto the base
            videoClips.forEach((asset, index) => {
                const clip = asset.clip as VideoClip | ImageClip
                const x = Math.round((clip.position.x / 100) * timeline.width)
                const y = Math.round((clip.position.y / 100) * timeline.height)

                const outputName = index === videoClips.length - 1 ? 'outv' : `tmp${index}`

                filters.push(`[${currentBase}][v${index}]overlay=${x}:${y}:eof_action=pass[${outputName}]`)
                currentBase = outputName
            })

            // Add text overlays
            const textClips = downloadedAssets.filter(a => a.clip.type === 'text')
            let textBase = 'outv'

            textClips.forEach((asset, index) => {
                const clip = asset.clip as TextClip
                const x = Math.round((clip.position.x / 100) * timeline.width)
                const y = Math.round((clip.position.y / 100) * timeline.height)

                const escapedText = clip.content
                    .replace(/'/g, "'\\''")
                    .replace(/:/g, '\\:')

                const enableExpr = `between(t,${clip.start},${clip.start + clip.duration})`
                const outputName = index === textClips.length - 1 ? 'final' : `txt${index}`

                filters.push(
                    `[${textBase}]drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${clip.style.fontSize}:fontcolor=${clip.style.color}:enable='${enableExpr}'[${outputName}]`
                )
                textBase = outputName
            })

            const finalOutput = textClips.length > 0 ? 'final' : 'outv'

            // Apply complex filter
=======
            if (backgroundPath && fs.existsSync(backgroundPath)) {
                // Scale background to output size
                filters.push(`[0:v]scale=${timeline.width}:${timeline.height}[base]`)
                currentBase = 'base'

                // Overlay each video at its position
                downloadedAssets.forEach((asset, index) => {
                    const clip = asset.clip as VideoClip
                    const inputIdx = index + 1 // +1 because background is input 0

                    // Calculate pixel positions from percentages
                    const x = Math.round((clip.position.x / 100) * timeline.width)
                    const y = Math.round((clip.position.y / 100) * timeline.height)
                    const w = Math.round((clip.size.width / 100) * timeline.width)
                    const h = Math.round((clip.size.height / 100) * timeline.height)

                    const scaledName = `scaled${index}`
                    const outputName = index === downloadedAssets.length - 1 ? 'outv' : `tmp${index}`

                    // Scale video to target size
                    filters.push(`[${inputIdx}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black@0[${scaledName}]`)

                    // Overlay on base
                    filters.push(`[${currentBase}][${scaledName}]overlay=${x}:${y}:shortest=1[${outputName}]`)
                    currentBase = outputName
                })
            } else {
                // No background - use first video as base
                if (downloadedAssets.length > 0) {
                    filters.push(
                        `[0:v]scale=${timeline.width}:${timeline.height}:force_original_aspect_ratio=decrease,` +
                        `pad=${timeline.width}:${timeline.height}:(ow-iw)/2:(oh-ih)/2:white[outv]`
                    )
                }
                currentBase = 'outv'
            }

            // Apply filter graph
            const finalOutput = currentBase || 'outv'
>>>>>>> 283c56e27cb9718083940ce5b2760dee67c0fee4
            console.log('Filter graph:', filters.join('; '))

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
