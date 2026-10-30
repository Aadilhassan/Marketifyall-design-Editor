/**
 * Magic Eraser pipeline (browser only):
 *  1. rasterise the photo's unfiltered source element at natural resolution;
 *  2. pick a working region around the brushed area (plus context margin,
 *     clipped to the visible crop) and downscale it to <= 1024 px;
 *  3. rasterise the strokes into a dilated mask in working space and inpaint
 *     it in a Web Worker;
 *  4. upscale the result and composite it back into the full-res image only
 *     under a feathered version of the mask (everything else stays bit-exact);
 *  5. swap the image source via replaceImageSource(), which re-applies filters
 *     and fires `object:modified`, so history/undo and auto-save pick it up.
 */
import { isImageObject, isVideoObject, replaceImageSource } from '../imageEdits'
import { runInpaint } from './inpaint.worker'
import { compositeWithAlpha, coverageToMask, intersectRect, planRegion, rasterizeStrokes, strokesBounds } from './region'
import type { Stroke } from './region'

export type EraseProgress = (ratio: number, stage: string) => void

const MAX_WORK_SIDE = 1024
/** Mask dilation in working px (covers anti-aliased object edges / shadows). */
const WORK_DILATE = 3

function sourceElement(obj: any): any {
  return obj._originalElement || (obj.getElement && obj.getElement()) || obj._element
}

function abortError(): Error {
  const e = new Error('Aborted')
  e.name = 'AbortError'
  return e
}

function canvas2d(w: number, h: number): { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  ctx.imageSmoothingEnabled = true
  ;(ctx as any).imageSmoothingQuality = 'high'
  return { el, ctx }
}

function looksLikeJpeg(el: any, obj: any): boolean {
  const src = String((el && (el.currentSrc || el.src)) || (obj.metadata && obj.metadata.src) || '')
  return /^data:image\/jpe?g/i.test(src) || /\.jpe?g(\?|#|$)/i.test(src)
}

/**
 * fabric 4's setSrc() resets width/height to the new element's natural size,
 * which would undo a crop. Shadow `_setWidthHeight` on the instance while the
 * source is swapped so the crop window survives, then remove the shadow.
 */
async function replaceKeepingCrop(canvas: any, obj: any, src: string, naturalW: number, naturalH: number): Promise<void> {
  const keepW = obj.width
  const keepH = obj.height
  const cropped = (obj.cropX || 0) !== 0 || (obj.cropY || 0) !== 0 || keepW !== naturalW || keepH !== naturalH
  if (cropped) {
    obj._setWidthHeight = function (this: any) {
      this.width = keepW
      this.height = keepH
    }
  }
  try {
    await replaceImageSource(canvas, obj, src)
  } finally {
    if (cropped) delete obj._setWidthHeight
  }
}

/**
 * Erase the brushed areas of an image object. `strokes` are in the object's
 * visible (post-crop) pixel space, as produced by the paint overlay.
 */
export async function magicErase(canvas: any, obj: any, strokes: Stroke[], onProgress?: EraseProgress, signal?: AbortSignal): Promise<void> {
  const progress = (r: number, stage: string) => onProgress && onProgress(r, stage)
  if (!isImageObject(obj) || isVideoObject(obj)) throw new Error('Select a photo first')
  if (!strokes.length) throw new Error('Brush over something to remove first')

  const el = sourceElement(obj)
  const nw = (el && (el.naturalWidth || el.width)) || 0
  const nh = (el && (el.naturalHeight || el.height)) || 0
  if (!nw || !nh) throw new Error('Could not read the image')

  const cropX = obj.cropX || 0
  const cropY = obj.cropY || 0
  const crop = intersectRect({ x: cropX, y: cropY, w: obj.width || nw, h: obj.height || nh }, { x: 0, y: 0, w: nw, h: nh })
  const nat: Stroke[] = strokes.map(s => ({ radius: s.radius, points: s.points.map((v, i) => v + (i % 2 ? cropY : cropX)) }))
  const bounds = strokesBounds(nat)
  if (!bounds) throw new Error('Brush over something to remove first')

  const region = planRegion(bounds, crop, MAX_WORK_SIDE)
  if (region.w < 2 || region.h < 2) throw new Error('Brush over the photo itself')
  const s = region.scale
  const dilFull = WORK_DILATE / s
  progress(0, 'Preparing')

  // 1-2. full-res raster + downscaled working region
  const full = canvas2d(nw, nh)
  full.ctx.drawImage(el, 0, 0, nw, nh)
  const work = canvas2d(region.ww, region.wh)
  work.ctx.drawImage(full.el, region.x, region.y, region.w, region.h, 0, 0, region.ww, region.wh)
  let workData: ImageData
  try {
    workData = work.ctx.getImageData(0, 0, region.ww, region.wh)
  } catch (err) {
    throw new Error('This image is cross-origin protected and can’t be edited')
  }

  // 3. mask + inpaint
  const mask = coverageToMask(rasterizeStrokes(nat, region, s, WORK_DILATE, WORK_DILATE))
  let any = false
  for (let i = 0; i < mask.length && !any; i++) any = mask[i] === 1
  if (!any) throw new Error('Brush over the photo itself')

  progress(0.01, 'Erasing')
  const filled = await runInpaint(workData.data, region.ww, region.wh, mask, {}, r => progress(0.01 + r * 0.89, 'Erasing'), signal)
  if (signal && signal.aborted) throw abortError()

  // 4. upscale + feathered composite, only around the strokes
  progress(0.92, 'Blending')
  work.ctx.putImageData(new ImageData(filled, region.ww, region.wh), 0, 0)
  const pad = dilFull + 2
  const area = intersectRect({ x: bounds.x - pad, y: bounds.y - pad, w: bounds.w + 2 * pad, h: bounds.h + 2 * pad }, region)
  if (area.w > 0 && area.h > 0) {
    const up = canvas2d(area.w, area.h)
    up.ctx.drawImage(work.el, (area.x - region.x) * s, (area.y - region.y) * s, area.w * s, area.h * s, 0, 0, area.w, area.h)
    const fillPx = up.ctx.getImageData(0, 0, area.w, area.h).data
    const base = full.ctx.getImageData(area.x, area.y, area.w, area.h)
    const alpha = rasterizeStrokes(nat, area, 1, dilFull * 0.35, dilFull * 0.9)
    compositeWithAlpha(base.data, fillPx, alpha)
    full.ctx.putImageData(base, area.x, area.y)
  }

  // 5. encode + swap source (fires object:modified => history entry)
  progress(0.96, 'Applying')
  await new Promise(r => setTimeout(r, 0))
  const dataUrl = looksLikeJpeg(el, obj) ? full.el.toDataURL('image/jpeg', 0.95) : full.el.toDataURL('image/png')
  if (signal && signal.aborted) throw abortError()
  await replaceKeepingCrop(canvas, obj, dataUrl, nw, nh)
  progress(1, 'Done')
}
