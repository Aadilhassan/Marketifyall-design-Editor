/** @jest-environment node */
jest.mock('./notify', () => ({ notify: jest.fn() }))
import { notify } from './notify'
import { log, fail, ignoreError, getRecentLogs, __resetLoggerForTests } from './logger'

const mockNotify = notify as jest.Mock

describe('logger', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern')
    jest.setSystemTime(1_000_000)
    __resetLoggerForTests()
    mockNotify.mockReset()
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.spyOn(console, 'info').mockImplementation(() => undefined)
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('records entries with scope, level and error detail', () => {
    log.warn('save', 'write failed', new Error('quota'))
    const logs = getRecentLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ level: 'warn', scope: 'save', message: 'write failed', detail: 'Error: quota' })
  })

  it('caps the ring buffer at 200 entries, dropping oldest', () => {
    for (let i = 0; i < 250; i++) log.info('x', `m${i}`)
    const logs = getRecentLogs()
    expect(logs).toHaveLength(200)
    expect(logs[0].message).toBe('m50')
    expect(logs[199].message).toBe('m249')
  })

  it('fail() records an error and toasts negatively', () => {
    fail('export', 'Export failed', new Error('boom'))
    expect(getRecentLogs()[0].level).toBe('error')
    expect(mockNotify).toHaveBeenCalledWith('Export failed', 'negative')
  })

  it('dedupes identical toasts within 30s but records every occurrence', () => {
    fail('export', 'Export failed')
    fail('export', 'Export failed')
    expect(mockNotify).toHaveBeenCalledTimes(1)
    expect(getRecentLogs()).toHaveLength(2)
    jest.setSystemTime(1_000_000 + 31_000)
    fail('export', 'Export failed')
    expect(mockNotify).toHaveBeenCalledTimes(2)
  })

  it('caps toasts at 3 per minute window', () => {
    fail('a', 'msg a')
    fail('b', 'msg b')
    fail('c', 'msg c')
    fail('d', 'msg d')
    expect(mockNotify).toHaveBeenCalledTimes(3)
    jest.setSystemTime(1_000_000 + 61_000)
    fail('e', 'msg e')
    expect(mockNotify).toHaveBeenCalledTimes(4)
    expect(getRecentLogs()).toHaveLength(5)
  })

  it('ignoreError records at debug level and never toasts', () => {
    ignoreError(new Error('benign'), 'best-effort cleanup')
    expect(mockNotify).not.toHaveBeenCalled()
    expect(getRecentLogs()[0]).toMatchObject({ level: 'debug', scope: 'ignored', message: 'best-effort cleanup', detail: 'Error: benign' })
  })

  it('fail() never throws even if the toaster throws (no ToasterContainer)', () => {
    mockNotify.mockImplementation(() => {
      throw new Error('no container')
    })
    expect(() => fail('x', 'msg x')).not.toThrow()
    expect(getRecentLogs()[0]).toMatchObject({ level: 'error', message: 'msg x' })
  })

  it('records unstringifiable and non-Error values without throwing', () => {
    expect(() => log.warn('x', 'weird', Object.create(null))).not.toThrow()
    expect(() => log.warn('x', 'str', 'thrown string')).not.toThrow()
    const logs = getRecentLogs()
    expect(logs[0].detail).toBe('[unstringifiable value]')
    expect(logs[1].detail).toBe('thrown string')
  })
})
