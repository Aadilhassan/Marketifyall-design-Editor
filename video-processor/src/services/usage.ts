/**
 * Usage & Cost Tracking Service
 * Logs all API calls and estimated costs to JSON file
 */

import fs from 'fs'
import path from 'path'

// Approximate costs per service (USD)
const COST_RATES = {
    vision: 0.005,      // Per image description (OpenRouter GPT-4o-mini)
    script: 0.01,       // Per script generation (OpenRouter)
    tts: 0.006,         // Per 1000 characters (Gemini TTS)
    giphy: 0,           // Free tier
    render: 0,          // Local FFmpeg - no cost
}

export interface ServiceUsage {
    service: string
    operation: string
    units: number
    unitType: string
    cost: number
    timestamp: string
    details?: Record<string, any>
}

export interface UsageLog {
    jobId: string
    startTime: string
    endTime?: string
    status: 'in_progress' | 'completed' | 'failed'
    services: ServiceUsage[]
    totalCost: number
    summary: {
        imageCount: number
        scriptLength: number
        audioDuration: number
        stickerCount: number
        videoDuration: number
    }
}

/**
 * Create a new usage log for a job
 */
export function createUsageLog(jobId: string): UsageLog {
    return {
        jobId,
        startTime: new Date().toISOString(),
        status: 'in_progress',
        services: [],
        totalCost: 0,
        summary: {
            imageCount: 0,
            scriptLength: 0,
            audioDuration: 0,
            stickerCount: 0,
            videoDuration: 0
        }
    }
}

/**
 * Add a service usage entry
 */
export function logServiceUsage(
    log: UsageLog,
    service: keyof typeof COST_RATES,
    operation: string,
    units: number,
    unitType: string,
    details?: Record<string, any>
): void {
    const rate = COST_RATES[service] || 0
    const cost = units * rate

    log.services.push({
        service,
        operation,
        units,
        unitType,
        cost,
        timestamp: new Date().toISOString(),
        details
    })

    log.totalCost += cost
}

/**
 * Log Vision API usage
 */
export function logVisionUsage(log: UsageLog, imageCount: number): void {
    logServiceUsage(log, 'vision', 'Image Description', imageCount, 'images', {
        model: 'gpt-4o-mini',
        provider: 'OpenRouter'
    })
    log.summary.imageCount = imageCount
}

/**
 * Log Script Generation usage
 */
export function logScriptUsage(log: UsageLog, scriptLength: number): void {
    logServiceUsage(log, 'script', 'Script Generation', 1, 'request', {
        model: 'bytedance-seed/seed-1.6',
        provider: 'OpenRouter',
        scriptLength
    })
    log.summary.scriptLength = scriptLength
}

/**
 * Log TTS usage
 */
export function logTTSUsage(log: UsageLog, characterCount: number, audioDuration: number): void {
    const units = characterCount / 1000  // Cost is per 1000 chars
    logServiceUsage(log, 'tts', 'Text-to-Speech', units, 'k_chars', {
        model: 'gemini-2.5-flash-preview-tts',
        characterCount,
        audioDuration
    })
    log.summary.audioDuration = audioDuration
}

/**
 * Log Giphy usage
 */
export function logGiphyUsage(log: UsageLog, stickerCount: number): void {
    logServiceUsage(log, 'giphy', 'Sticker Search', stickerCount, 'stickers', {
        tier: 'free'
    })
    log.summary.stickerCount = stickerCount
}

/**
 * Log Render usage
 */
export function logRenderUsage(log: UsageLog, videoDuration: number, format: string): void {
    logServiceUsage(log, 'render', 'Video Render', videoDuration, 'seconds', {
        format,
        encoder: 'libx264'
    })
    log.summary.videoDuration = videoDuration
}

/**
 * Complete the usage log and save to file
 */
export function saveUsageLog(log: UsageLog, outputDir: string, status: 'completed' | 'failed' = 'completed'): string {
    log.endTime = new Date().toISOString()
    log.status = status

    // Calculate total cost
    log.totalCost = log.services.reduce((sum, s) => sum + s.cost, 0)

    // Save to JSON file
    const logPath = path.join(outputDir, 'usage_log.json')
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2))

    console.log(`[Usage] Saved usage log: $${log.totalCost.toFixed(4)} total`)
    console.log(`[Usage] Path: ${logPath}`)

    return logPath
}

/**
 * Get cost summary as string
 */
export function getCostSummary(log: UsageLog): string {
    const lines = [
        `📊 Usage Summary for Job: ${log.jobId}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ...log.services.map(s =>
            `${s.service.padEnd(10)} | ${s.operation.padEnd(20)} | ${s.units} ${s.unitType} | $${s.cost.toFixed(4)}`
        ),
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `💰 TOTAL COST: $${log.totalCost.toFixed(4)}`
    ]
    return lines.join('\n')
}
