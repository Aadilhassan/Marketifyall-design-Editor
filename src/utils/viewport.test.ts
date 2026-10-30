import { clampPan } from './viewport'

const page = { left: 0, top: 0, width: 1000, height: 500 }
const stage = { width: 800, height: 600 }

it('leaves an in-range pan untouched', () => {
  expect(clampPan([0.5, 0, 0, 0.5, 100, 50], page, stage)).toEqual([0.5, 0, 0, 0.5, 100, 50])
})

it('keeps 80px of the page on screen when panned far right/down', () => {
  const v = clampPan([1, 0, 0, 1, 5000, 5000], page, stage)
  expect(v[4]).toBe(800 - 80)
  expect(v[5]).toBe(600 - 80)
})

it('keeps 80px of the page on screen when panned far left/up', () => {
  const v = clampPan([1, 0, 0, 1, -5000, -5000], page, stage)
  expect(v[4] + 1000).toBe(80)
  expect(v[5] + 500).toBe(80)
})

it('accounts for the page offset and zoom', () => {
  const v = clampPan([2, 0, 0, 2, -9999, 0], { ...page, left: -100 }, stage)
  // page right edge on screen = (-100 + 1000) * 2 + vpt4 must be >= 80
  expect((-100 + 1000) * 2 + v[4]).toBe(80)
})
