/** @jest-environment node */
import { mp4FallbackMessage, computeGifPlan } from './exportHelpers'

describe('mp4FallbackMessage', () => {
  it('warns when mp4 was requested but webm was produced', () => {
    expect(mp4FallbackMessage('mp4', 'webm')).toMatch(/WebM/)
  })
  it('is silent when mp4 succeeded', () => {
    expect(mp4FallbackMessage('mp4', 'mp4')).toBeNull()
  })
  it('is silent for non-mp4 requests', () => {
    expect(mp4FallbackMessage('webm', 'webm')).toBeNull()
  })
})

describe('computeGifPlan', () => {
  it('caps frame count to maxFrames', () => {
    const p = computeGifPlan({ durationSec: 100, srcWidth: 100, srcHeight: 100, maxFps: 12, maxFrames: 150 })
    expect(p.frameCount).toBe(150)
  })
  it('downscales when over maxDimension but never upscales', () => {
    const big = computeGifPlan({ durationSec: 1, srcWidth: 1920, srcHeight: 1080, maxDimension: 640 })
    expect(Math.max(big.width, big.height)).toBe(640)
    const small = computeGifPlan({ durationSec: 1, srcWidth: 320, srcHeight: 240, maxDimension: 640 })
    expect(small.width).toBe(320)
    expect(small.height).toBe(240)
  })
  it('produces a positive per-frame delay', () => {
    const p = computeGifPlan({ durationSec: 2, srcWidth: 100, srcHeight: 100, maxFps: 10 })
    expect(p.frameCount).toBe(20)
    expect(p.delayMs).toBeGreaterThan(0)
  })
})
