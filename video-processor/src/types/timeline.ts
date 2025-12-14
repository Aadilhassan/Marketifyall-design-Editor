/**
 * Timeline Types for Video Processing
 */

export interface Position {
    x: number  // Percentage (0-100)
    y: number  // Percentage (0-100)
}

export interface Size {
    width: number   // Percentage (0-100)
    height: number  // Percentage (0-100)
}

export interface VideoClip {
    id: string
    type: 'video'
    src: string
    start: number      // Start time in seconds
    duration: number   // Duration in seconds
    position: Position
    size: Size
}

export interface ImageClip {
    id: string
    type: 'image'
    src: string
    start: number
    duration: number
    position: Position
    size: Size
}

export interface TextClip {
    id: string
    type: 'text'
    content: string
    start: number
    duration: number
    position: Position
    style: {
        fontSize: number
        fontFamily?: string
        color: string
        backgroundColor?: string
    }
}

export type TimelineClip = VideoClip | ImageClip | TextClip

export interface RenderRequest {
    timeline: {
        duration: number
        fps: number
        width: number
        height: number
        backgroundColor?: string
        backgroundImage?: string  // Base64 PNG of canvas (without videos)
    }
    clips: TimelineClip[]
}

export interface RenderJob {
    id: string
    status: 'queued' | 'processing' | 'done' | 'error'
    progress: number
    outputPath?: string
    error?: string
    createdAt: Date
}
