/**
 * Subtitle Generation Service
 * Converts script to SRT/VTT format with timestamps
 */

import fs from 'fs'
import path from 'path'

export interface SubtitleSegment {
    index: number
    startTime: number  // seconds
    endTime: number    // seconds
    text: string
}

/**
 * Generate subtitle segments from a script
 * Splits script into chunks and assigns timing based on total duration
 */
export function generateSubtitleSegments(
    script: string,
    totalDuration: number,
    wordsPerSegment: number = 2  // Changed to 2 for word-by-word TikTok style
): SubtitleSegment[] {
    const words = script.split(/\s+/).filter(w => w.length > 0)
    const segments: SubtitleSegment[] = []

    // Calculate timing
    const totalWords = words.length
    const wordsPerSecond = totalWords / totalDuration

    let currentIndex = 0
    let wordIndex = 0

    while (wordIndex < words.length) {
        const segmentWords = words.slice(wordIndex, wordIndex + wordsPerSegment)
        const text = segmentWords.join(' ')

        const startTime = wordIndex / wordsPerSecond
        const endTime = Math.min((wordIndex + segmentWords.length) / wordsPerSecond, totalDuration)

        segments.push({
            index: currentIndex + 1,
            startTime,
            endTime,
            text
        })

        currentIndex++
        wordIndex += wordsPerSegment
    }

    return segments
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const millis = Math.floor((seconds % 1) * 1000)

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`
}

/**
 * Format time for VTT (HH:MM:SS.mmm)
 */
function formatVttTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const millis = Math.floor((seconds % 1) * 1000)

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

/**
 * Generate SRT content from segments
 */
export function generateSrt(segments: SubtitleSegment[]): string {
    return segments.map(seg =>
        `${seg.index}\n${formatSrtTime(seg.startTime)} --> ${formatSrtTime(seg.endTime)}\n${seg.text}\n`
    ).join('\n')
}

/**
 * Generate VTT content from segments
 */
export function generateVtt(segments: SubtitleSegment[]): string {
    const header = 'WEBVTT\n\n'
    const body = segments.map(seg =>
        `${formatVttTime(seg.startTime)} --> ${formatVttTime(seg.endTime)}\n${seg.text}\n`
    ).join('\n')
    return header + body
}

/**
 * Save subtitles to files
 */
export function saveSubtitles(
    script: string,
    totalDuration: number,
    outputDir: string,
    baseName: string = 'subtitles'
): { srtPath: string, vttPath: string, segments: SubtitleSegment[] } {
    const segments = generateSubtitleSegments(script, totalDuration)

    const srtContent = generateSrt(segments)
    const vttContent = generateVtt(segments)

    const srtPath = path.join(outputDir, `${baseName}.srt`)
    const vttPath = path.join(outputDir, `${baseName}.vtt`)

    fs.writeFileSync(srtPath, srtContent)
    fs.writeFileSync(vttPath, vttContent)

    console.log(`[Subtitles] Saved ${segments.length} segments to SRT and VTT`)

    return { srtPath, vttPath, segments }
}
