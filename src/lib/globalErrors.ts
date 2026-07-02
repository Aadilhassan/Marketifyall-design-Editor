import { fail, log } from './logger'

const GENERIC_MESSAGE = 'Something went wrong — the last action may not have completed.'

const BENIGN_PATTERNS = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i, // opaque cross-origin errors carry no information
]

function isBenign(message: string): boolean {
  return BENIGN_PATTERNS.some(re => re.test(message))
}

let installed = false

/** Install once at boot (src/index.tsx). Uncaught errors and unhandled promise
 *  rejections are logged with full detail; the user sees one deduped generic toast
 *  (dedupe/rate-cap lives in logger.fail). */
export function installGlobalErrorHandlers(): void {
  if (installed) return
  installed = true

  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || 'Unknown error'
    if (isBenign(message)) {
      log.debug('global', `benign: ${message}`)
      return
    }
    fail('global', GENERIC_MESSAGE, event.error !== undefined && event.error !== null ? event.error : message)
  })

  window.addEventListener('unhandledrejection', (event: Event) => {
    const reason: unknown = (event as PromiseRejectionEvent).reason
    let message = ''
    if (reason instanceof Error) message = reason.message
    else {
      try {
        message = String(reason)
      } catch (coerceErr) {
        void coerceErr
        message = ''
      }
    }
    if (isBenign(message)) {
      log.debug('global', `benign rejection: ${message}`)
      return
    }
    fail('global', GENERIC_MESSAGE, reason)
  })
}
