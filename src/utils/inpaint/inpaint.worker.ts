/**
 * Runs `inpaintCore` off the main thread.
 *
 * CRA 4 ships webpack 4, which does not understand
 * `new Worker(new URL('./x.ts', import.meta.url))` (that is webpack 5 syntax)
 * and has no worker-loader configured. Instead the worker is a Blob URL whose
 * source is the self-contained `inpaintCore` function serialised with
 * `Function.prototype.toString()` plus a tiny message handler. This survives
 * Babel + Terser because the kernel references nothing outside its own body
 * (verified by inpaint.test.ts, which evaluates the serialised source).
 *
 * If a worker can't be created (CSP blocking blob: workers, very old browser)
 * or dies with a script error, the kernel runs on the main thread after a
 * yield so the progress overlay can paint first.
 */
import { inpaintCore } from './core'
import type { InpaintOptions } from './core'
import { log } from '../../lib/logger'

export type InpaintProgress = (ratio: number) => void

const HANDLER_SRC = [
  'self.onmessage = function (e) {',
  '  var m = e.data || {};',
  '  try {',
  '    var res = inpaintCore(m.data, m.width, m.height, m.mask, m.options, function (r) {',
  "      self.postMessage({ type: 'progress', ratio: r });",
  '    });',
  "    self.postMessage({ type: 'result', data: res }, [res.buffer]);",
  '  } catch (err) {',
  "    self.postMessage({ type: 'error', message: String((err && err.message) || err) });",
  '  }',
  '};',
].join('\n')

/** Full worker script; exported for tests. */
export function inpaintWorkerSource(): string {
  return 'var inpaintCore = ' + inpaintCore.toString() + ';\n' + HANDLER_SRC
}

let workerUrl: string | null = null
let workersBroken = false

function createWorker(): Worker | null {
  if (workersBroken || typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return null
  try {
    if (!workerUrl) workerUrl = URL.createObjectURL(new Blob([inpaintWorkerSource()], { type: 'text/javascript' }))
    return new Worker(workerUrl)
  } catch (err) {
    log.warn('inpaint', 'Web Worker unavailable, running on the main thread', err)
    workersBroken = true
    return null
  }
}

function abortError(): Error {
  const e = new Error('Aborted')
  e.name = 'AbortError'
  return e
}

async function runOnMainThread(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mask: Uint8Array,
  options: InpaintOptions,
  onProgress?: InpaintProgress,
  signal?: AbortSignal
): Promise<Uint8ClampedArray> {
  await new Promise(r => setTimeout(r, 50))
  if (signal && signal.aborted) throw abortError()
  return inpaintCore(data, width, height, mask, options, onProgress || null)
}

/**
 * Inpaint RGBA `data` where `mask` is non-zero. Input buffers are copied, so
 * the caller keeps ownership. Rejects with an AbortError when `signal` fires.
 */
export function runInpaint(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mask: Uint8Array,
  options: InpaintOptions = {},
  onProgress?: InpaintProgress,
  signal?: AbortSignal
): Promise<Uint8ClampedArray> {
  if (signal && signal.aborted) return Promise.reject(abortError())
  const worker = createWorker()
  if (!worker) return runOnMainThread(data, width, height, mask, options, onProgress, signal)

  return new Promise<Uint8ClampedArray>((resolve, reject) => {
    let settled = false
    const finish = () => {
      settled = true
      worker.terminate()
      if (signal) signal.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      if (settled) return
      finish()
      reject(abortError())
    }
    if (signal) signal.addEventListener('abort', onAbort)

    worker.onmessage = (e: MessageEvent) => {
      const m = e.data || {}
      if (settled) return
      if (m.type === 'progress') {
        if (onProgress) onProgress(m.ratio)
      } else if (m.type === 'result') {
        finish()
        resolve(m.data as Uint8ClampedArray)
      } else if (m.type === 'error') {
        finish()
        reject(new Error(m.message || 'Inpainting failed'))
      }
    }
    worker.onerror = (ev: ErrorEvent) => {
      if (settled) return
      ev.preventDefault()
      finish()
      // Script/CSP failure inside the worker: remember it and use the main thread.
      log.warn('inpaint', 'inpaint worker failed to start, falling back to the main thread', ev.message)
      workersBroken = true
      runOnMainThread(data, width, height, mask, options, onProgress, signal).then(resolve, reject)
    }

    const dataCopy = new Uint8ClampedArray(data)
    const maskCopy = new Uint8Array(mask)
    worker.postMessage({ data: dataCopy, width, height, mask: maskCopy, options }, [dataCopy.buffer, maskCopy.buffer])
  })
}
