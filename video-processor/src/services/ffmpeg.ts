/**
 * FFmpeg Video Composition Service
 * Builds FFmpeg commands to compose multiple videos with overlays
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
 * Create a solid color image for background
 */
async function createBackgroundImage(jobId: string, width: number, height: number, color: string): Promise<string> {
    const tempDir = path.join(__dirname, '../../temp', jobId)
    const bgPath = path.join(tempDir, 'background.png')

    // Create a simple 1x1 pixel PNG and let FFmpeg scale it
    // This avoids needing lavfi
    return new Promise((resolve, reject) => {
        // Use FFmpeg to create a solid color image
        ffmpeg()
            .input(`color=c=${color}:s=${width}x${height}:d=1`)
            .inputOptions(['-f', 'lavfi'])
            .outputOptions(['-frames:v', '1', '-y'])
            .output(bgPath)
            .on('end', () => resolve(bgPath))
            .on('error', (err) => {
                // If lavfi fails, create manually
                console.log('Creating background without lavfi...')
                resolve('')
            })
            .run()
    })
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
    console.log(`Clips:`, clips.map(c => ({ id: c.id, type: c.type, pos: c.position })))

    // Phase 1: Download all assets (0-30%)
    onProgress(5)
    const downloadedAssets: DownloadedAsset[] = []

    for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]

        if (clip.type === 'video' || clip.type === 'image') {
            try {
                const localPath = await downloadAsset(clip.src, jobId)
                downloadedAssets.push({ clip, localPath })
                console.log(`Downloaded asset ${i + 1}/${clips.length}: ${clip.type}`)
            } catch (error) {
                console.error(`Failed to download asset: ${clip.src}`, error)
                throw new Error(`Failed to download asset: ${clip.src}`)
            }
        } else if (clip.type === 'text') {
            downloadedAssets.push({ clip, localPath: '' })
        }

        const downloadProgress = 5 + ((i + 1) / clips.length) * 25
        onProgress(downloadProgress)
    }

    onProgress(30)

    const videoClips = downloadedAssets.filter(
        a => a.clip.type === 'video' || a.clip.type === 'image'
    )

    if (videoClips.length === 0) {
        throw new Error('No video clips to render')
    }

    // Phase 2: Build FFmpeg command (30-40%)
    return new Promise((resolve, reject) => {
        try {
            let command = ffmpeg()

            // Add all video inputs
            videoClips.forEach((asset, index) => {
                command = command.input(asset.localPath)
                if (asset.clip.type === 'video') {
                    command = command.inputOptions(['-stream_loop', '-1'])
                }
            })

            // Build filter for compositing multiple videos
            const filters: string[] = []

            // First, scale each video to its target size
            videoClips.forEach((asset, index) => {
                const clip = asset.clip as VideoClip | ImageClip
                const w = Math.round((clip.size.width / 100) * timeline.width)
                const h = Math.round((clip.size.height / 100) * timeline.height)

                filters.push(`[${index}:v]scale=${w}:${h},setpts=PTS-STARTPTS[v${index}]`)
            })

            // Create base canvas by scaling first video to full size with padding
            const firstClip = videoClips[0].clip as VideoClip | ImageClip
            const firstW = Math.round((firstClip.size.width / 100) * timeline.width)
            const firstH = Math.round((firstClip.size.height / 100) * timeline.height)
            const firstX = Math.round((firstClip.position.x / 100) * timeline.width)
            const firstY = Math.round((firstClip.position.y / 100) * timeline.height)

            // Create white background using pad filter
            filters.push(
                `[v0]scale=${timeline.width}:${timeline.height}:force_original_aspect_ratio=decrease,` +
                `pad=${timeline.width}:${timeline.height}:(ow-iw)/2:(oh-ih)/2:white[base]`
            )

            // Overlay additional videos
            let currentBase = 'base'
            for (let i = 1; i < videoClips.length; i++) {
                const clip = videoClips[i].clip as VideoClip | ImageClip
                const x = Math.round((clip.position.x / 100) * timeline.width)
                const y = Math.round((clip.position.y / 100) * timeline.height)

                const outputName = i === videoClips.length - 1 ? 'outv' : `tmp${i}`
                filters.push(`[${currentBase}][v${i}]overlay=${x}:${y}[${outputName}]`)
                currentBase = outputName
            }

            // If only one video, rename to outv
            if (videoClips.length === 1) {
                filters.pop() // Remove the base creation
                filters.push(
                    `[v0]scale=${timeline.width}:${timeline.height}:force_original_aspect_ratio=decrease,` +
                    `pad=${timeline.width}:${timeline.height}:(ow-iw)/2:(oh-ih)/2:white[outv]`
                )
            }

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
            console.log('Filter graph:', filters.join('; '))
            command = command.complexFilter(filters, finalOutput)

            onProgress(40)

            // Output settings
            command = command
                .outputOptions([
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '23',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    '-r', String(timeline.fps),
                    '-t', String(timeline.duration),
                    '-y',
                ])
                .output(outputPath)

            command.on('progress', (progress) => {
                const ffmpegProgress = progress.percent || 0
                const totalProgress = 40 + (ffmpegProgress * 0.55)
                onProgress(Math.min(totalProgress, 95))
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
