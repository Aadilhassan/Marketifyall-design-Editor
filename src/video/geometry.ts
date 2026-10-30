/**
 * Geometry mapping between a video object's poster image and its live
 * <video> element, so swapping one for the other never moves or rescales the
 * object on the page.
 *
 * A poster depicts `posterRect` (a region of the video, in video pixels) at
 * `posterSize` pixels. Fabric draws `cropX/cropY/width/height` of its element
 * at `scaleX/scaleY`; converting between the two spaces keeps
 * `width × scaleX` (the on-page size) and the visible region identical.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface ImageGeometry {
  cropX: number
  cropY: number
  width: number
  height: number
  scaleX: number
  scaleY: number
}

/** Centred region of a `w×h` source covering the aspect ratio `aspect` (object-fit: cover). */
export function coverRect(w: number, h: number, aspect: number): Rect {
  if (!(w > 0) || !(h > 0) || !(aspect > 0)) return { x: 0, y: 0, w: Math.max(0, w), h: Math.max(0, h) }
  if (w / h > aspect) {
    const cw = h * aspect
    return { x: (w - cw) / 2, y: 0, w: cw, h }
  }
  const ch = w / aspect
  return { x: 0, y: (h - ch) / 2, w, h: ch }
}

/**
 * Region of the video the poster shows: the explicit crop recorded when the
 * poster was made (stock videos), else a centred cover crop to the poster's
 * aspect (a full-frame poster yields the whole frame).
 */
export function posterRegion(
  video: { width: number; height: number },
  posterSize: { width: number; height: number },
  videoCrop?: { sourceX: number; sourceY: number; sourceWidth: number; sourceHeight: number } | null,
): Rect {
  if (videoCrop && videoCrop.sourceWidth > 0 && videoCrop.sourceHeight > 0) {
    return { x: videoCrop.sourceX || 0, y: videoCrop.sourceY || 0, w: videoCrop.sourceWidth, h: videoCrop.sourceHeight }
  }
  return coverRect(video.width, video.height, posterSize.width / Math.max(1e-9, posterSize.height))
}

/** Poster-space geometry → equivalent geometry on the video element. */
export function posterToVideo(g: ImageGeometry, region: Rect, posterSize: { width: number; height: number }): ImageGeometry {
  const kx = posterSize.width / region.w
  const ky = posterSize.height / region.h
  return {
    cropX: region.x + g.cropX / kx,
    cropY: region.y + g.cropY / ky,
    width: g.width / kx,
    height: g.height / ky,
    scaleX: g.scaleX * kx,
    scaleY: g.scaleY * ky,
  }
}

/** Video-space geometry → poster space (what gets saved, so a reload shows the poster right). */
export function videoToPoster(g: ImageGeometry, region: Rect, posterSize: { width: number; height: number }): ImageGeometry {
  const kx = posterSize.width / region.w
  const ky = posterSize.height / region.h
  const cropX = Math.max(0, (g.cropX - region.x) * kx)
  const cropY = Math.max(0, (g.cropY - region.y) * ky)
  return {
    cropX,
    cropY,
    width: Math.min(posterSize.width - cropX, g.width * kx),
    height: Math.min(posterSize.height - cropY, g.height * ky),
    scaleX: g.scaleX / kx,
    scaleY: g.scaleY / ky,
  }
}
