/**
 * Render Routes
 * API endpoints for video rendering
 */

import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { RenderRequest, RenderJob } from '../types/timeline'
import { renderVideo } from '../services/ffmpeg'
import { cleanupJob, getOutputPath } from '../services/assets'
import path from 'path'
import fs from 'fs'

const router = Router()

// In-memory job store (use Redis/DB in production)
const jobs: Map<string, RenderJob> = new Map()

/**
 * POST /api/render
 * Start a new render job
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const request = req.body as RenderRequest

        // Validate request
        if (!request.timeline || !request.clips) {
            return res.status(400).json({ error: 'Invalid request: missing timeline or clips' })
        }

        // Create job
        const jobId = uuidv4()
        const job: RenderJob = {
            id: jobId,
            status: 'queued',
            progress: 0,
            createdAt: new Date(),
        }

        jobs.set(jobId, job)
        console.log(`Created render job: ${jobId}`)

        // Start render in background
        job.status = 'processing'

        renderVideo(
            jobId,
            request,
            (progress) => {
                const currentJob = jobs.get(jobId)
                if (currentJob) {
                    currentJob.progress = progress
                }
            }
        )
            .then((outputPath) => {
                const currentJob = jobs.get(jobId)
                if (currentJob) {
                    currentJob.status = 'done'
                    currentJob.progress = 100
                    currentJob.outputPath = outputPath
                }
            })
            .catch((error) => {
                const currentJob = jobs.get(jobId)
                if (currentJob) {
                    currentJob.status = 'error'
                    currentJob.error = error.message
                }
            })

        return res.json({
            id: jobId,
            status: 'queued',
        })
    } catch (error) {
        console.error('Error creating render job:', error)
        return res.status(500).json({ error: 'Failed to create render job' })
    }
})

/**
 * GET /api/render/:id/status
 * Get render job status
 */
router.get('/:id/status', (req: Request, res: Response) => {
    const { id } = req.params
    const job = jobs.get(id)

    if (!job) {
        return res.status(404).json({ error: 'Job not found' })
    }

    return res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        error: job.error,
    })
})

/**
 * GET /api/render/:id/download
 * Download completed video
 */
router.get('/:id/download', (req: Request, res: Response) => {
    const { id } = req.params
    const job = jobs.get(id)

    if (!job) {
        return res.status(404).json({ error: 'Job not found' })
    }

    if (job.status !== 'done' || !job.outputPath) {
        return res.status(400).json({ error: 'Video not ready for download' })
    }

    if (!fs.existsSync(job.outputPath)) {
        return res.status(404).json({ error: 'Output file not found' })
    }

    // Send file
    res.download(job.outputPath, 'video.mp4', (err) => {
        if (err) {
            console.error('Download error:', err)
        }

        // Cleanup after download (optional - comment out to keep files)
        // cleanupJob(id)
        // jobs.delete(id)
    })
})

/**
 * DELETE /api/render/:id
 * Cancel and cleanup job
 */
router.delete('/:id', (req: Request, res: Response) => {
    const { id } = req.params

    cleanupJob(id)
    jobs.delete(id)

    return res.json({ success: true })
})

export default router
