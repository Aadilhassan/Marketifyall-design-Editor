/**
 * Magic Eraser inpainting — pure entry points. All functions take an RGBA
 * image `{ data, width, height }` and a mask (non-zero = remove) and return a
 * new RGBA Uint8ClampedArray with the masked pixels filled.
 */
import { inpaintCore } from './core'
import type { InpaintOptions } from './core'

export type { InpaintMethod, InpaintOptions } from './core'
export { inpaintCore } from './core'

export interface InpaintImage {
  data: Uint8ClampedArray | Uint8Array
  width: number
  height: number
}

/** Picks exemplar fill, or diffusion for very thin / tiny masks. */
export function inpaint(img: InpaintImage, mask: Uint8Array, opts: InpaintOptions = {}): Uint8ClampedArray {
  return inpaintCore(img.data, img.width, img.height, mask, opts, null)
}

/** Criminisi-style exemplar fill (+ seam blend). */
export function inpaintExemplar(img: InpaintImage, mask: Uint8Array, opts: InpaintOptions = {}): Uint8ClampedArray {
  return inpaintCore(img.data, img.width, img.height, mask, Object.assign({}, opts, { method: 'exemplar' }), null)
}

/** Fast onion-peel + Laplace diffusion fill. */
export function inpaintDiffusion(img: InpaintImage, mask: Uint8Array, opts: InpaintOptions = {}): Uint8ClampedArray {
  return inpaintCore(img.data, img.width, img.height, mask, Object.assign({}, opts, { method: 'diffusion' }), null)
}
