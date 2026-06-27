/** @jest-environment node */
import { promiseWithTimeout } from './promiseWithTimeout'

describe('promiseWithTimeout', () => {
  it('rejects with the message when the inner promise hangs', async () => {
    const neverSettles = new Promise<void>(() => {})
    await expect(promiseWithTimeout(neverSettles, 20, 'too slow')).rejects.toThrow('too slow')
  })

  it('resolves when the inner promise resolves first', async () => {
    await expect(promiseWithTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })

  it('rejects when the inner promise rejects first', async () => {
    await expect(promiseWithTimeout(Promise.reject(new Error('inner')), 1000)).rejects.toThrow('inner')
  })
})
