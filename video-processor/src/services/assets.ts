/**
 * Asset Download Service
 * Downloads media files from URLs to temp folder for FFmpeg processing
 */

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const TEMP_DIR = path.join(__dirname, '../../temp')

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

/**
 * Download a file from URL to temp folder
 */
export async function downloadAsset(url: string, jobId: string): Promise<string> {
    const jobDir = path.join(TEMP_DIR, jobId)

    if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true })
    }

    // Handle Data Data URIs (Base64)
    if (url.startsWith('data:')) {
        // Extract media type and base64 data
        const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid input string')
        }

        const type = matches[1]
        const data = matches[2]

        // Determine extension
        let ext = '.png' // Default
        if (type.includes('jpeg') || type.includes('jpg')) ext = '.jpg'
        if (type.includes('webp')) ext = '.webp'
        if (type.includes('mp4')) ext = '.mp4'
        if (type.includes('gif')) ext = '.gif'

        const filename = `${uuidv4()}${ext}`
        const filepath = path.join(jobDir, filename)

        console.log(`Saving Data URI: ${type} -> ${filepath}`)
        fs.writeFileSync(filepath, Buffer.from(data, 'base64'))

        return filepath
    }

    // Handle HTTP URLs
    try {
        const urlObj = new URL(url)
        const ext = path.extname(urlObj.pathname) || '.mp4'
        const filename = `${uuidv4()}${ext}`
        const filepath = path.join(jobDir, filename)

        console.log(`Downloading: ${url} -> ${filepath}`)

        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
        })

        const writer = fs.createWriteStream(filepath)
        response.data.pipe(writer)

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filepath))
            writer.on('error', reject)
        })
    } catch (e) {
        console.error('Download specific error:', e)
        throw e
    }
}

/**
 * Clean up job temp files
 */
export function cleanupJob(jobId: string): void {
    const jobDir = path.join(TEMP_DIR, jobId)

    if (fs.existsSync(jobDir)) {
        fs.rmSync(jobDir, { recursive: true, force: true })
        console.log(`Cleaned up job: ${jobId}`)
    }
}

/**
 * Get output path for a job
 */
export function getOutputPath(jobId: string): string {
    const jobDir = path.join(TEMP_DIR, jobId)

    if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true })
    }

    return path.join(jobDir, 'output.mp4')
}
