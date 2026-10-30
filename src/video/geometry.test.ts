import { coverRect, posterRegion, posterToVideo, videoToPoster } from './geometry'

describe('video geometry', () => {
  it('cover crop centres the region', () => {
    expect(coverRect(1920, 1080, 1)).toEqual({ x: 420, y: 0, w: 1080, h: 1080 })
    expect(coverRect(1080, 1920, 16 / 9)).toEqual({ x: 0, y: 960 - 303.75, w: 1080, h: 607.5 })
  })

  it('stock poster (720×405 of a cropped 4:3 source) maps without moving the object', () => {
    const video = { width: 1440, height: 1080 }
    const crop = { sourceX: 0, sourceY: 135, sourceWidth: 1440, sourceHeight: 810 }
    const region = posterRegion(video, { width: 720, height: 405 }, crop)
    const poster = { cropX: 0, cropY: 0, width: 720, height: 405, scaleX: 1.5, scaleY: 1.5 }
    const vid = posterToVideo(poster, region, { width: 720, height: 405 })
    expect(vid).toEqual({ cropX: 0, cropY: 135, width: 1440, height: 810, scaleX: 0.75, scaleY: 0.75 })
    expect(vid.width * vid.scaleX).toBeCloseTo(poster.width * poster.scaleX)
    expect(videoToPoster(vid, region, { width: 720, height: 405 })).toEqual(poster)
  })

  it('full-frame upload poster is the identity mapping', () => {
    const region = posterRegion({ width: 1280, height: 720 }, { width: 1280, height: 720 })
    const g = { cropX: 10, cropY: 0, width: 1200, height: 720, scaleX: 0.5, scaleY: 0.5 }
    expect(posterToVideo(g, region, { width: 1280, height: 720 })).toEqual(g)
  })
})
