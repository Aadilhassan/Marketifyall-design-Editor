jest.mock('./logger', () => ({
  fail: jest.fn(),
  log: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))
import { fail, log } from './logger'
import { installGlobalErrorHandlers } from './globalErrors'

const mockFail = fail as jest.Mock
const mockDebug = log.debug as jest.Mock

describe('globalErrors', () => {
  beforeAll(() => {
    installGlobalErrorHandlers()
  })
  beforeEach(() => {
    mockFail.mockClear()
    mockDebug.mockClear()
  })

  it('routes window error events to fail()', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
    expect(mockFail).toHaveBeenCalledTimes(1)
    expect(mockFail.mock.calls[0][0]).toBe('global')
  })

  it('routes unhandled promise rejections to fail()', () => {
    const ev = Object.assign(new Event('unhandledrejection'), { reason: new Error('rejected') })
    window.dispatchEvent(ev)
    expect(mockFail).toHaveBeenCalledTimes(1)
  })

  it('filters benign browser noise to debug, no toast path', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'ResizeObserver loop limit exceeded' }))
    expect(mockFail).not.toHaveBeenCalled()
    expect(mockDebug).toHaveBeenCalled()
  })

  it('is idempotent — installing twice does not double-handle', () => {
    installGlobalErrorHandlers()
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom2', error: new Error('boom2') }))
    expect(mockFail).toHaveBeenCalledTimes(1)
  })

  it('filters benign rejections to debug, not fail()', () => {
    const ev = Object.assign(new Event('unhandledrejection'), {
      reason: new Error('ResizeObserver loop completed with undelivered notifications.'),
    })
    window.dispatchEvent(ev)
    expect(mockFail).not.toHaveBeenCalled()
    expect(mockDebug).toHaveBeenCalled()
  })

  it('survives an unstringifiable rejection reason and still routes to fail()', () => {
    const ev = Object.assign(new Event('unhandledrejection'), { reason: Object.create(null) })
    expect(() => window.dispatchEvent(ev)).not.toThrow()
    expect(mockFail).toHaveBeenCalledTimes(1)
    expect(mockFail.mock.calls[0][0]).toBe('global')
  })

  it('passes the message string as detail when event.error is null', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom no-error', error: null }))
    expect(mockFail).toHaveBeenCalledTimes(1)
    expect(mockFail.mock.calls[0][2]).toBe('boom no-error')
  })

  it('filters cross-origin "Script error." to debug', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))
    expect(mockFail).not.toHaveBeenCalled()
    expect(mockDebug).toHaveBeenCalled()
  })
})
