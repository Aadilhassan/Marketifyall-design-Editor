/** @jest-environment node */
jest.mock('baseui/toast', () => ({
  toaster: {
    positive: jest.fn(),
    negative: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}))

import { notify } from './notify'
import { toaster } from 'baseui/toast'

describe('notify', () => {
  beforeEach(() => jest.clearAllMocks())

  it('routes negative to toaster.negative', () => {
    notify('boom', 'negative')
    expect((toaster as any).negative).toHaveBeenCalledWith('boom', {})
  })

  it('routes positive to toaster.positive', () => {
    notify('yay', 'positive')
    expect((toaster as any).positive).toHaveBeenCalledWith('yay', {})
  })

  it('defaults to info', () => {
    notify('hello')
    expect((toaster as any).info).toHaveBeenCalledWith('hello', {})
  })
})
