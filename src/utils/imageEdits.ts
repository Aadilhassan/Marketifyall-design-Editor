/**
 * Non-destructive image editing helpers — crop, straighten/rotate, flip and
 * client-side background removal — for fabric.Image-derived objects.
 *
 * Crop is implemented with fabric's native `cropX/cropY/width/height` props so
 * it composes cleanly with the filter pipeline in `filters.ts` and survives
 * scenify's JSON serialisation. Background removal runs entirely in the browser
 * (no API / credits) via @imgly/background-removal, lazily imported so it never
 * bloats the main bundle.
 *
 * Every mutation fires `object:modified` + `requestRenderAll()` so auto-save,
 * history and frame-clipping in Editor.tsx stay in sync.
 */
import { Adjustments, applyAdjustments, readAdjustments } from './filters'

export interface CropInsets {
  left: number // 0..1 fraction of natural width trimmed from the left
  top: number
  right: number
  bottom: number
}

export const DEFAULT_CROP: CropInsets = { left: 0, top: 0, right: 0, bottom: 0 }

export interface ImageGeometry {
  rotate90: number // 0 | 90 | 180 | 270
  straighten: number // -45..45 fine angle
  flipX: boolean
  flipY: boolean
}

export const DEFAULT_GEOMETRY: ImageGeometry = { rotate90: 0, straighten: 0, flipX: false, flipY: false }

export function isImageObject(obj: any): boolean {
  return !!obj && typeof obj.applyFilters === 'function' && typeof obj.setSrc === 'function'
}

export function isVideoObject(obj: any): boolean {
  return !!obj && (obj.isVideo === true || !!obj.metadata?.videoSrc)
}

function naturalSize(obj: any): { w: number; h: number } {
  const el = (obj.getElement && obj.getElement()) || obj._originalElement || obj._element
  const w = (el && (el.naturalWidth || el.width)) || obj.width || 1
  const h = (el && (el.naturalHeight || el.height)) || obj.height || 1
  return { w, h }
}

function fire(canvas: any, obj: any) {
  try {
    obj.setCoords && obj.setCoords()
  } catch {
    /* ignore */
  }
  if (canvas) {
    try {
      canvas.fire && canvas.fire('object:modified', { target: obj })
    } catch {
      /* ignore */
    }
    canvas.requestRenderAll && canvas.requestRenderAll()
  }
}

/**
 * Anchor point representing where the *uncropped* image's top-left would sit on
 * the canvas. Captured once so repeated crops stay positionally stable.
 */
function cropOrigin(obj: any): { left: number; top: number } {
  if (!obj.metadata) obj.metadata = {}
  if (!obj.metadata.cropOrigin) {
    obj.metadata.cropOrigin = {
      left: (obj.left || 0) - (obj.cropX || 0) * (obj.scaleX || 1),
      top: (obj.top || 0) - (obj.cropY || 0) * (obj.scaleY || 1),
    }
  }
  return obj.metadata.cropOrigin
}

export function readCrop(obj: any): CropInsets {
  if (!obj) return { ...DEFAULT_CROP }
  const { w, h } = naturalSize(obj)
  const left = (obj.cropX || 0) / w
  const top = (obj.cropY || 0) / h
  const right = 1 - ((obj.cropX || 0) + (obj.width || w)) / w
  const bottom = 1 - ((obj.cropY || 0) + (obj.height || h)) / h
  return {
    left: clamp01(left),
    top: clamp01(top),
    right: clamp01(right),
    bottom: clamp01(bottom),
  }
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

/** Apply crop insets (fractions of the natural image) keeping the crop centred. */
export function applyCrop(canvas: any, obj: any, insets: CropInsets): void {
  if (!isImageObject(obj)) return
  const { w, h } = naturalSize(obj)
  const origin = cropOrigin(obj)

  const l = clamp01(insets.left)
  const t = clamp01(insets.top)
  // never let opposite insets cross past a 2% minimum window
  const r = Math.min(clamp01(insets.right), 1 - l - 0.02)
  const b = Math.min(clamp01(insets.bottom), 1 - t - 0.02)

  const cropX = Math.round(l * w)
  const cropY = Math.round(t * h)
  const width = Math.max(1, Math.round((1 - l - r) * w))
  const height = Math.max(1, Math.round((1 - t - b) * h))

  obj.set({
    cropX,
    cropY,
    width,
    height,
    left: origin.left + cropX * (obj.scaleX || 1),
    top: origin.top + cropY * (obj.scaleY || 1),
  })
  fire(canvas, obj)
}

/** Centre-crop the image to a target aspect ratio (w/h). null = no aspect lock. */
export function cropToAspect(canvas: any, obj: any, ratio: number | null): void {
  if (!isImageObject(obj)) return
  if (ratio == null) {
    resetCrop(canvas, obj)
    return
  }
  const { w, h } = naturalSize(obj)
  let cropW = w
  let cropH = h
  if (w / h > ratio) {
    cropH = h
    cropW = h * ratio
  } else {
    cropW = w
    cropH = w / ratio
  }
  const insetX = (w - cropW) / 2 / w
  const insetY = (h - cropH) / 2 / h
  applyCrop(canvas, obj, { left: insetX, right: insetX, top: insetY, bottom: insetY })
}

export function resetCrop(canvas: any, obj: any): void {
  if (!isImageObject(obj)) return
  const { w, h } = naturalSize(obj)
  const origin = cropOrigin(obj)
  obj.set({ cropX: 0, cropY: 0, width: w, height: h, left: origin.left, top: origin.top })
  fire(canvas, obj)
}

/* ---------------------------------------------------------------- geometry */

export function readGeometry(obj: any): ImageGeometry {
  const g = obj && obj.metadata && obj.metadata.geometry
  return { ...DEFAULT_GEOMETRY, ...(g || {}), flipX: !!obj?.flipX, flipY: !!obj?.flipY }
}

function applyGeometry(canvas: any, obj: any, g: ImageGeometry) {
  if (!obj.metadata) obj.metadata = {}
  obj.metadata.geometry = { rotate90: g.rotate90, straighten: g.straighten, flipX: g.flipX, flipY: g.flipY }
  obj.set({ angle: ((g.rotate90 + g.straighten) % 360 + 360) % 360, flipX: g.flipX, flipY: g.flipY })
  fire(canvas, obj)
}

export function rotate90(canvas: any, obj: any, dir: 1 | -1): void {
  if (!isImageObject(obj)) return
  const g = readGeometry(obj)
  g.rotate90 = (((g.rotate90 + dir * 90) % 360) + 360) % 360
  applyGeometry(canvas, obj, g)
}

export function setStraighten(canvas: any, obj: any, deg: number): void {
  if (!isImageObject(obj)) return
  const g = readGeometry(obj)
  g.straighten = Math.max(-45, Math.min(45, deg))
  applyGeometry(canvas, obj, g)
}

export function flip(canvas: any, obj: any, axis: 'x' | 'y'): void {
  if (!isImageObject(obj)) return
  const g = readGeometry(obj)
  if (axis === 'x') g.flipX = !g.flipX
  else g.flipY = !g.flipY
  applyGeometry(canvas, obj, g)
}

export function resetGeometry(canvas: any, obj: any): void {
  if (!isImageObject(obj)) return
  applyGeometry(canvas, obj, { ...DEFAULT_GEOMETRY })
}

/* -------------------------------------------------- background removal */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image data'))
    reader.readAsDataURL(blob)
  })
}

/** Swap a fabric image's pixel source while preserving its on-canvas transform. */
export function replaceImageSource(canvas: any, obj: any, src: string): Promise<void> {
  return new Promise(resolve => {
    obj.setSrc(
      src,
      () => {
        if (!obj.metadata) obj.metadata = {}
        obj.metadata.src = src
        // dimensions reset to the new source — drop any stale crop anchor
        delete obj.metadata.cropOrigin
        try {
          obj.applyFilters && obj.applyFilters()
        } catch {
          /* ignore */
        }
        fire(canvas, obj)
        resolve()
      },
      { crossOrigin: 'anonymous' }
    )
  })
}

/** Get a clean (untainted) source for the model — prefers raw pixels. */
async function imageSourceFor(obj: any): Promise<Blob | string> {
  const el = (obj.getElement && obj.getElement()) || obj._originalElement || obj._element
  try {
    const w = el.naturalWidth || el.width
    const h = el.naturalHeight || el.height
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.drawImage(el, 0, 0, w, h)
    return await new Promise<Blob>((res, rej) =>
      c.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
    )
  } catch {
    // tainted canvas or no element — fall back to the URL and let the lib fetch it
    return (el && el.src) || obj.metadata?.src
  }
}

/* ------------------------------------------------------- enhance & upscale */

/** Draw the object's source element into a fresh 2D canvas at a target size. */
function drawToCanvas(obj: any, w: number, h: number): HTMLCanvasElement {
  const el = (obj.getElement && obj.getElement()) || obj._originalElement || obj._element
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.imageSmoothingEnabled = true
  ;(ctx as any).imageSmoothingQuality = 'high'
  ctx.drawImage(el, 0, 0, w, h)
  return c
}

/**
 * Analyse the image and apply a tasteful auto-enhancement (contrast stretch +
 * brightness balance + vibrance + light sharpen) through the adjustment
 * pipeline, so the result stays editable in the Adjust panel. Returns the new
 * adjustments. Runs entirely in-browser.
 */
export function autoEnhance(canvas: any, obj: any): Adjustments | null {
  if (!isImageObject(obj)) return null
  // Sample a small version for a fast histogram read.
  const { w, h } = naturalSize(obj)
  const scale = Math.min(1, 120 / Math.max(w, h))
  const sw = Math.max(1, Math.round(w * scale))
  const sh = Math.max(1, Math.round(h * scale))
  let lo = 0
  let hi = 255
  let mean = 128
  try {
    const c = drawToCanvas(obj, sw, sh)
    const data = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, sw, sh).data
    const hist = new Array(256).fill(0)
    let sum = 0
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      hist[lum]++
      sum += lum
      count++
    }
    mean = count ? sum / count : 128
    // 0.5% / 99.5% percentile clip to ignore outliers.
    const clip = count * 0.005
    let acc = 0
    for (let v = 0; v < 256; v++) {
      acc += hist[v]
      if (acc >= clip) {
        lo = v
        break
      }
    }
    acc = 0
    for (let v = 255; v >= 0; v--) {
      acc += hist[v]
      if (acc >= clip) {
        hi = v
        break
      }
    }
  } catch {
    // tainted canvas — fall back to a gentle generic boost
  }

  const range = Math.max(1, hi - lo)
  // Lower dynamic range => stronger contrast boost.
  const contrast = Math.round(Math.max(0, Math.min(40, (1 - range / 255) * 70)))
  const brightness = Math.round(Math.max(-22, Math.min(22, ((128 - mean) / 128) * 26)))

  const current = readAdjustments(obj)
  const next: Adjustments = {
    ...current,
    brightness,
    contrast,
    vibrance: Math.max(current.vibrance, 18),
    sharpen: Math.max(current.sharpen, 22),
  }
  applyAdjustments(canvas, obj, next)
  return next
}

/** Unfiltered source element, so filters re-apply cleanly after the swap. */
function sourceElement(obj: any): any {
  return obj._originalElement || (obj.getElement && obj.getElement()) || obj._element
}

/** Native dynamic import hidden from webpack so CDN ESM loads at runtime. */
function cdnImport(url: string): Promise<any> {
  // eslint-disable-next-line no-new-func
  return new Function('u', 'return import(u)')(url)
}

/**
 * Real AI super-resolution in the browser via Transformers.js (onnxruntime-web
 * under the hood). The model is fetched from the Hugging Face hub on first use
 * and cached by the browser. Loaded from a CDN at runtime — onnxruntime can't be
 * bundled reliably through this project's webpack 4 toolchain.
 */
const TRANSFORMERS_CDN = 'https://esm.sh/@huggingface/transformers@3'
// Lightweight swin2SR x2 — a genuine super-resolution model that's much smaller
// and faster than the classical variant (far less likely to hang the tab).
const SR_MODEL = 'Xenova/swin2SR-lightweight-x2-64'

export interface SrResult {
  data: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  channels: number
}

/**
 * The model runs on the WASM backend inside a Web Worker. WASM (not WebGPU)
 * because onnxruntime's WebGPU backend is unstable for this model on many
 * machines (lost-device crashes); a Worker (not the main thread) so a slow CPU
 * run never freezes the tab. The worker imports Transformers.js from the CDN.
 */
const SR_WORKER_SRC = `
let pipe = null;
self.onmessage = async (e) => {
  const msg = e.data || {};
  try {
    if (msg.type === 'init') {
      const mod = await import(msg.cdn);
      const pipeline = mod.pipeline;
      if (mod.env) mod.env.allowLocalModels = false;
      pipe = await pipeline('image-to-image', msg.model, {
        device: 'wasm',
        progress_callback: (p) => {
          if (p && p.status === 'progress' && typeof p.progress === 'number') {
            self.postMessage({ type: 'progress', progress: p.progress });
          }
        },
      });
      self.postMessage({ type: 'ready' });
    } else if (msg.type === 'run') {
      const out = await pipe(msg.url);
      const data = out.data;
      self.postMessage(
        { type: 'result', id: msg.id, data: data, width: out.width, height: out.height, channels: out.channels },
        [data.buffer]
      );
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, message: String((err && err.message) || err) });
  }
};
`

let srWorker: Worker | null = null
let srWorkerReady: Promise<void> | null = null
let srRunId = 0

function ensureSrWorker(): Worker {
  if (!srWorker) {
    const blob = new Blob([SR_WORKER_SRC], { type: 'text/javascript' })
    srWorker = new Worker(URL.createObjectURL(blob), { type: 'module' })
  }
  return srWorker
}

function initSrWorker(onProgress?: (ratio: number, stage: string) => void): Promise<void> {
  if (!srWorkerReady) {
    const worker = ensureSrWorker()
    srWorkerReady = new Promise<void>((resolve, reject) => {
      const onMsg = (e: MessageEvent) => {
        const m = e.data || {}
        if (m.type === 'ready') {
          worker.removeEventListener('message', onMsg)
          resolve()
        } else if (m.type === 'progress') {
          if (onProgress) onProgress(m.progress / 100, 'Downloading AI model')
        } else if (m.type === 'error') {
          worker.removeEventListener('message', onMsg)
          srWorkerReady = null
          reject(new Error(m.message))
        }
      }
      worker.addEventListener('message', onMsg)
      worker.postMessage({ type: 'init', cdn: TRANSFORMERS_CDN, model: SR_MODEL })
    })
  }
  return srWorkerReady
}

function runSrInWorker(url: string): Promise<SrResult> {
  const worker = ensureSrWorker()
  const id = ++srRunId
  return new Promise<SrResult>((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      const m = e.data || {}
      if (m.id !== id) return
      if (m.type === 'result') {
        worker.removeEventListener('message', onMsg)
        resolve({ data: m.data, width: m.width, height: m.height, channels: m.channels })
      } else if (m.type === 'error') {
        worker.removeEventListener('message', onMsg)
        reject(new Error(m.message))
      }
    }
    worker.addEventListener('message', onMsg)
    worker.postMessage({ type: 'run', id, url })
  })
}

// Main-thread fallback for environments where module/blob workers are blocked.
let mainPipeline: Promise<any> | null = null
function getMainThreadPipeline(onProgress?: (ratio: number, stage: string) => void): Promise<any> {
  if (!mainPipeline) {
    mainPipeline = cdnImport(TRANSFORMERS_CDN)
      .then(async (tf: any) => {
        if (tf.env) tf.env.allowLocalModels = false
        return tf.pipeline('image-to-image', SR_MODEL, {
          device: 'wasm',
          progress_callback: (p: any) => {
            if (onProgress && p && p.status === 'progress' && typeof p.progress === 'number') {
              onProgress(p.progress / 100, 'Downloading AI model')
            }
          },
        })
      })
      .catch((e: any) => {
        mainPipeline = null
        throw new Error('Could not load the AI upscaler (check your connection)')
      })
  }
  return mainPipeline
}

/** Run SR in the worker; fall back to the main thread if the worker can't run. */
async function runSuperResolution(url: string, onProgress?: (ratio: number, stage: string) => void): Promise<SrResult> {
  if (typeof Worker !== 'undefined') {
    try {
      await initSrWorker(onProgress)
      if (onProgress) onProgress(0, 'Upscaling')
      return await runSrInWorker(url)
    } catch (e) {
      // Worker blocked (CSP) or unsupported — fall through to main thread.
      srWorker = null
      srWorkerReady = null
    }
  }
  const pipe = await getMainThreadPipeline(onProgress)
  if (onProgress) onProgress(0, 'Upscaling')
  await new Promise(r => setTimeout(r, 60))
  const out = await pipe(url)
  return { data: out.data, width: out.width, height: out.height, channels: out.channels }
}

/** Transformers.js RawImage → canvas (handles 1/3/4-channel output). */
function rawImageToCanvas(raw: any): HTMLCanvasElement {
  const { data, width, height, channels } = raw
  const out = new Uint8ClampedArray(width * height * 4)
  for (let i = 0, j = 0, k = 0; i < width * height; i++, j += channels, k += 4) {
    out[k] = data[j]
    out[k + 1] = data[channels > 1 ? j + 1 : j]
    out[k + 2] = data[channels > 2 ? j + 2 : j]
    out[k + 3] = channels > 3 ? data[j + 3] : 255
  }
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  ;(c.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(out, width, height), 0, 0)
  return c
}

function resampleCanvas(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  ctx.imageSmoothingEnabled = true
  ;(ctx as any).imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, w, h)
  return c
}

/**
 * AI-upscale the image by `factor` (2/3/4) with a real super-resolution model,
 * then size the result to the requested factor. The on-canvas footprint stays
 * the same — the image just becomes genuinely higher-resolution (sharper when
 * enlarged, printed or exported), unlike a plain resample. Browser-only.
 */
export async function upscaleImage(
  canvas: any,
  obj: any,
  factor = 2,
  onProgress?: (ratio: number, stage: string) => void
): Promise<{ factor: number; to: number }> {
  if (!isImageObject(obj)) throw new Error('Not an image')
  const MAX_DIM = 4096
  // Cap the SR input so inference stays fast and memory-safe. The model runs in
  // a worker (off the main thread), but keeping the input modest keeps the wait
  // short on CPU-only machines.
  const MAX_INPUT = 640
  const el = sourceElement(obj)
  const w = el.naturalWidth || el.width || obj.width
  const h = el.naturalHeight || el.height || obj.height
  if (!w || !h) throw new Error('Could not read image')

  const targetW = Math.min(MAX_DIM, Math.round(w * factor))
  const targetH = Math.min(MAX_DIM, Math.round(h * factor))

  // Build a clean, capped input image for the model.
  const inScale = Math.min(1, MAX_INPUT / Math.max(w, h))
  const inW = Math.max(1, Math.round(w * inScale))
  const inH = Math.max(1, Math.round(h * inScale))
  let inputUrl: string
  try {
    const inputCanvas = resampleCanvas(el, inW, inH)
    inputUrl = inputCanvas.toDataURL('image/png')
  } catch (e) {
    throw new Error('This image is cross-origin protected and can’t be upscaled')
  }

  if (onProgress) onProgress(0, 'Preparing')
  const output = await runSuperResolution(inputUrl, onProgress)
  const srCanvas = rawImageToCanvas(output)
  const finalCanvas = resampleCanvas(srCanvas, targetW, targetH)
  const dataUrl = finalCanvas.toDataURL('image/png')

  // Keep the visible footprint identical — this is a resolution increase.
  const displayedW = obj.getScaledWidth ? obj.getScaledWidth() : (obj.width || w) * (obj.scaleX || 1)
  const displayedH = obj.getScaledHeight ? obj.getScaledHeight() : (obj.height || h) * (obj.scaleY || 1)

  await new Promise<void>(resolve => {
    obj.setSrc(
      dataUrl,
      () => {
        if (!obj.metadata) obj.metadata = {}
        obj.metadata.src = dataUrl
        obj.metadata.upscaled = true
        delete obj.metadata.cropOrigin
        obj.set({ scaleX: displayedW / targetW, scaleY: displayedH / targetH })
        try {
          obj.applyFilters && obj.applyFilters()
        } catch {
          /* ignore */
        }
        fire(canvas, obj)
        resolve()
      },
      { crossOrigin: 'anonymous' }
    )
  })

  return { factor, to: Math.max(targetW, targetH) }
}

export type RemovalProgress = (ratio: number, stage: string) => void

/**
 * @imgly/background-removal pulls in onnxruntime-web, which can't be bundled
 * reliably through this project's webpack 4 / CRA 4 toolchain (it references
 * Node-style `exports`/`process` globals at runtime). Instead we load the
 * browser-ready ESM build straight from a CDN at runtime via a native dynamic
 * import. The `new Function` wrapper hides the import from webpack so it isn't
 * processed at build time. The library still fetches its model + wasm from the
 * imgly CDN, so this needs network access (the model download did anyway).
 */
const BG_REMOVAL_CDN = 'https://esm.sh/@imgly/background-removal@1.5.5'
let bgRemovalModule: Promise<any> | null = null

function loadBgRemoval(): Promise<any> {
  if (!bgRemovalModule) {
    // eslint-disable-next-line no-new-func
    bgRemovalModule = new Function('u', 'return import(u)')(BG_REMOVAL_CDN).catch((err: any) => {
      bgRemovalModule = null
      throw new Error('Could not load the background-removal engine (check your connection)')
    })
  }
  return bgRemovalModule
}

/**
 * Remove the background of an image object in-browser. Returns the resulting
 * transparent-PNG data URL (also applied to the object).
 */
export async function removeImageBackground(canvas: any, obj: any, onProgress?: RemovalProgress): Promise<string> {
  if (!isImageObject(obj)) throw new Error('Not an image')
  const source = await imageSourceFor(obj)
  const mod = await loadBgRemoval()
  const removeBackground = mod.removeBackground || (mod.default && mod.default.removeBackground)
  if (typeof removeBackground !== 'function') throw new Error('Background-removal engine unavailable')
  const resultBlob = await removeBackground(source as any, {
    output: { format: 'image/png' },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return
      const ratio = total ? current / total : 0
      const stage = key && key.startsWith('fetch') ? 'Downloading model' : 'Processing'
      onProgress(ratio, stage)
    },
  })
  const dataUrl = await blobToDataUrl(resultBlob)
  await replaceImageSource(canvas, obj, dataUrl)
  if (!obj.metadata) obj.metadata = {}
  obj.metadata.bgRemoved = true
  return dataUrl
}
