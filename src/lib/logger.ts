import { notify } from './notify'

export interface LogEntry {
  time: number
  level: 'error' | 'warn' | 'info' | 'debug'
  scope: string
  message: string
  detail?: string
}

const RING_SIZE = 200
const DEDUPE_MS = 30_000
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 3

const entries: LogEntry[] = []
const lastToastAt = new Map<string, number>()
let rateWindowStart = 0
let rateCount = 0

function describeError(err: unknown): string | undefined {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  if (err === undefined || err === null) return undefined
  return String(err)
}

function record(level: LogEntry['level'], scope: string, message: string, err?: unknown): void {
  entries.push({ time: Date.now(), level, scope, message, detail: describeError(err) })
  if (entries.length > RING_SIZE) entries.shift()
  const line = `[${scope}] ${message}`
  if (level === 'error') console.error(line, err !== undefined ? err : '')
  else if (level === 'warn') console.warn(line, err !== undefined ? err : '')
  else if (level === 'info') console.info(line)
  else if (process.env.NODE_ENV === 'development') console.debug(line, err !== undefined ? err : '')
  const endpoint = process.env.REACT_APP_ERROR_ENDPOINT
  if (endpoint && level === 'error' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(endpoint, JSON.stringify(entries[entries.length - 1]))
    } catch (sinkErr) {
      void sinkErr // the sink must never throw or recurse into record()
    }
  }
}

function maybeToast(message: string): void {
  const now = Date.now()
  const last = lastToastAt.get(message)
  if (last !== undefined && now - last < DEDUPE_MS) return
  if (now - rateWindowStart > RATE_WINDOW_MS) {
    rateWindowStart = now
    rateCount = 0
  }
  if (rateCount >= RATE_MAX) return
  rateCount++
  lastToastAt.set(message, now)
  if (lastToastAt.size > 100) {
    const oldest = lastToastAt.keys().next().value
    if (oldest !== undefined) lastToastAt.delete(oldest)
  }
  notify(message, 'negative')
}

export const log = {
  error: (scope: string, message: string, err?: unknown): void => record('error', scope, message, err),
  warn: (scope: string, message: string, err?: unknown): void => record('warn', scope, message, err),
  info: (scope: string, message: string): void => record('info', scope, message),
  debug: (scope: string, message: string, err?: unknown): void => record('debug', scope, message, err),
}

/** A user-facing action failed: log it AND surface a (deduped, rate-capped) toast. */
export function fail(scope: string, userMessage: string, err?: unknown): void {
  record('error', scope, userMessage, err)
  maybeToast(userMessage)
}

/** Explicitly-ignorable failure (races, best-effort cleanup, feature detection).
 *  Recorded at debug level so it stays greppable and visible in the ring buffer. */
export function ignoreError(err: unknown, reason: string): void {
  record('debug', 'ignored', reason, err)
}

export function getRecentLogs(): ReadonlyArray<LogEntry> {
  return entries.slice()
}

export function __resetLoggerForTests(): void {
  entries.length = 0
  lastToastAt.clear()
  rateWindowStart = 0
  rateCount = 0
}
