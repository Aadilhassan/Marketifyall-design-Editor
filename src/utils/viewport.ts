/**
 * Pan limits for the editor stage: however far you pan, at least `keep` px of
 * the page stays visible in each direction (or the whole page if it's smaller),
 * so it can't be lost off-screen.
 */
type Box = { left: number; top: number; width: number; height: number }

export function clampPan(vpt: number[], page: Box, stage: { width: number; height: number }, keep = 80): number[] {
  const z = vpt[0]
  const w = page.width * z
  const h = page.height * z
  const kx = Math.min(keep, w)
  const ky = Math.min(keep, h)
  // screen x of the page's left edge = page.left * z + vpt[4]
  const minX = kx - w - page.left * z
  const maxX = stage.width - kx - page.left * z
  const minY = ky - h - page.top * z
  const maxY = stage.height - ky - page.top * z
  const next = vpt.slice()
  next[4] = Math.min(maxX, Math.max(minX, vpt[4]))
  next[5] = Math.min(maxY, Math.max(minY, vpt[5]))
  return next
}
