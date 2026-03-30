/**
 * Text-to-Speech Service using Gemini 2.5 Flash TTS
 * Natural, human-like voice generation
 */

import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'

// Hardcoded for now - move to .env later
const GEMINI_API_KEY = "AIzaSyDGDTfdfEd9SOTn31egSYgZ0jN8CxAU9Kg"

interface WavConversionOptions {
    numChannels: number
    sampleRate: number
    bitsPerSample: number
}

/**
 * Parse mime type to extract audio format options
 */
function parseMimeType(mimeType: string): WavConversionOptions {
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim())
    const [_, format] = fileType.split('/')

    const options: Partial<WavConversionOptions> = {
        numChannels: 1,
        sampleRate: 24000,
        bitsPerSample: 16
    }

    if (format && format.startsWith('L')) {
        const bits = parseInt(format.slice(1), 10)
        if (!isNaN(bits)) {
            options.bitsPerSample = bits
        }
    }

    for (const param of params) {
        const [key, value] = param.split('=').map(s => s.trim())
        if (key === 'rate') {
            options.sampleRate = parseInt(value, 10)
        }
    }

    return options as WavConversionOptions
}

/**
 * Create WAV header for raw audio data
 */
function createWavHeader(dataLength: number, options: WavConversionOptions): Buffer {
    const { numChannels, sampleRate, bitsPerSample } = options

    const byteRate = sampleRate * numChannels * bitsPerSample / 8
    const blockAlign = numChannels * bitsPerSample / 8
    const buffer = Buffer.alloc(44)

    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(36 + dataLength, 4)
    buffer.write('WAVE', 8)
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16)
    buffer.writeUInt16LE(1, 20)
    buffer.writeUInt16LE(numChannels, 22)
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(byteRate, 28)
    buffer.writeUInt16LE(blockAlign, 32)
    buffer.writeUInt16LE(bitsPerSample, 34)
    buffer.write('data', 36)
    buffer.writeUInt32LE(dataLength, 40)

    return buffer
}

/**
 * Convert raw audio data to WAV format
 */
function convertToWav(rawData: string, mimeType: string): Buffer {
    const options = parseMimeType(mimeType)
    const buffer = Buffer.from(rawData, 'base64')
    const wavHeader = createWavHeader(buffer.length, options)
    return Buffer.concat([wavHeader, buffer])
}

/**
 * Generate speech from text using Gemini 2.5 Flash TTS
 * Returns path to the generated audio file
 */
export async function generateSpeech(text: string, jobId: string): Promise<string> {
    const outputDir = path.join(__dirname, '../../temp', jobId)
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, 'voiceover.wav')

    // Limit text length for TTS
    const maxChars = 2000
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text

    console.log(`[TTS] Generating speech with Gemini 2.5 Flash...`)
    console.log(`[TTS] Text length: ${truncatedText.length} chars`)

    try {
        const ai = new GoogleGenAI({
            apiKey: GEMINI_API_KEY,
        })

        const config = {
            temperature: 1,
            responseModalities: ['audio'] as const,
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: 'Zephyr', // Natural, engaging voice
                    }
                }
            },
        }

        const model = 'gemini-2.5-flash-preview-tts'

        // Prepend speaking style instruction to the text
        const styledText = `[Read this in an exciting, energetic real estate influencer voice, like promoting a property on TikTok or Instagram Reels]\n\n${truncatedText}`

        const contents = [
            {
                role: 'user' as const,
                parts: [
                    {
                        text: styledText,
                    },
                ],
            },
        ]

        const response = await ai.models.generateContentStream({
            model,
            config: config as any,
            contents,
        })

        const audioChunks: Buffer[] = []

        for await (const chunk of response) {
            if (!chunk.candidates || !chunk.candidates[0]?.content?.parts) {
                continue
            }

            const part = chunk.candidates[0].content.parts[0]
            if (part && 'inlineData' in part && part.inlineData) {
                const inlineData = part.inlineData
                const rawData = inlineData.data || ''
                const mimeType = inlineData.mimeType || ''

                // Always convert to WAV for consistency
                const wavBuffer = convertToWav(rawData, mimeType)
                audioChunks.push(wavBuffer)
            }
        }

        if (audioChunks.length > 0) {
            // Combine all audio chunks
            const fullAudio = Buffer.concat(audioChunks)
            fs.writeFileSync(outputPath, fullAudio)
            console.log(`[TTS] Generated audio: ${outputPath} (${fullAudio.length} bytes)`)
            return outputPath
        } else {
            console.warn('[TTS] No audio chunks received from Gemini')
            return ''
        }

    } catch (error: any) {
        console.error('[TTS] Gemini TTS error:', error.message)

        // Fallback: return empty string (video will be silent)
        console.warn('[TTS] Continuing without audio')
        return ''
    }
}
