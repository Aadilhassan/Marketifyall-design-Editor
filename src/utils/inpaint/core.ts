/**
 * On-device image inpainting kernels for the Magic Eraser.
 *
 * - Exemplar-based fill (Criminisi, Pérez & Toyama 2004): repeatedly pick the
 *   fill-front pixel with the highest priority (confidence x data term), find
 *   the best-matching fully-known source patch by SSD over the target patch's
 *   known pixels, copy it in and propagate confidence. Speed-ups: candidate
 *   search limited to a strided window around the target plus a refinement
 *   pass, random global samples and "coherence" candidates taken from the
 *   neighbours' chosen sources; SSD accumulation stops early once it exceeds
 *   the best score so far. Finished with a light gradient-domain (Poisson) seam
 *   blend restricted to the filled pixels.
 * - Diffusion fallback (Telea-like onion peel + Laplace relaxation) for very
 *   thin or tiny masks, or when no complete source patch exists.
 *
 * IMPORTANT: `inpaintCore` is serialised with Function.prototype.toString() and
 * evaluated inside a Blob Web Worker (see inpaint.worker.ts). It must stay fully
 * self-contained: no imports, no module-level references, and no syntax that
 * Babel lowers to shared helpers (array/object spread, array destructuring,
 * for..of, classes, async/await, `typeof`). The test suite checks this.
 */

export type InpaintMethod = 'auto' | 'exemplar' | 'diffusion'

export interface InpaintOptions {
  method?: InpaintMethod
  /** Odd patch side in px (default 9). */
  patchSize?: number
  /** Half-size of the local search window around the target (default 64). */
  searchRadius?: number
  /** Extra random source candidates per patch (default 120). */
  randomSamples?: number
  /** PRNG seed, for reproducible output. */
  seed?: number
  /** SOR iterations of the seam blend after the exemplar pass (default 80, 0 = off). */
  blendIterations?: number
}

/**
 * Fill `mask`ed pixels (mask[i] !== 0) of an RGBA buffer. Returns a new RGBA
 * buffer; unmasked pixels are copied through untouched.
 */
export function inpaintCore(
  src: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  mask: Uint8Array,
  options?: InpaintOptions | null,
  onProgress?: ((ratio: number) => void) | null
): Uint8ClampedArray {
  const opts: InpaintOptions = options || {}
  const W = width | 0
  const H = height | 0
  const N = W * H
  if (W <= 0 || H <= 0) throw new Error('inpaint: empty image')
  if (src.length < N * 4) throw new Error('inpaint: pixel buffer is smaller than width*height*4')
  if (mask.length < N) throw new Error('inpaint: mask is smaller than width*height')

  const out = new Uint8ClampedArray(N * 4)
  out.set(src.length === N * 4 ? src : src.subarray(0, N * 4))

  const hole = new Uint8Array(N)
  let holeCount = 0
  for (let i = 0; i < N; i++) {
    if (mask[i]) {
      hole[i] = 1
      holeCount++
    }
  }
  // Nothing to fill, or nothing to sample from.
  if (holeCount === 0 || holeCount === N) return out

  const report = function (r: number) {
    if (onProgress) onProgress(r < 0 ? 0 : r > 1 ? 1 : r)
  }

  /** Max 4-connected distance (px) from the known region into the hole. */
  function holeDepth(): number {
    const dist = new Int32Array(N)
    const queue = new Int32Array(holeCount)
    let qh = 0
    let qt = 0
    for (let p = 0; p < N; p++) {
      if (!hole[p]) continue
      const x = p % W
      if ((x > 0 && !hole[p - 1]) || (x < W - 1 && !hole[p + 1]) || (p >= W && !hole[p - W]) || (p < N - W && !hole[p + W])) {
        dist[p] = 1
        queue[qt++] = p
      }
    }
    let maxD = 1
    while (qh < qt) {
      const p = queue[qh++]
      const d = dist[p] + 1
      const x = p % W
      if (x > 0 && hole[p - 1] && !dist[p - 1]) {
        dist[p - 1] = d
        queue[qt++] = p - 1
      }
      if (x < W - 1 && hole[p + 1] && !dist[p + 1]) {
        dist[p + 1] = d
        queue[qt++] = p + 1
      }
      if (p >= W && hole[p - W] && !dist[p - W]) {
        dist[p - W] = d
        queue[qt++] = p - W
      }
      if (p < N - W && hole[p + W] && !dist[p + W]) {
        dist[p + W] = d
        queue[qt++] = p + W
      }
      if (d - 1 > maxD) maxD = d - 1
    }
    return maxD
  }

  /**
   * Telea-style onion peel (each pixel = distance-weighted mean of already
   * known 8-neighbours, processed in BFS order from the boundary) followed by
   * Gauss-Seidel Laplace relaxation to remove the peel's directional streaks.
   */
  function diffuse(todo: Uint8Array, count: number) {
    const known = new Uint8Array(N)
    for (let i = 0; i < N; i++) known[i] = todo[i] ? 0 : 1
    const order = new Int32Array(count)
    const queued = new Uint8Array(N)
    let qh = 0
    let qt = 0
    for (let p = 0; p < N && qt < count; p++) {
      if (!todo[p]) continue
      const x = p % W
      const y = (p - x) / W
      let near = false
      for (let dy = -1; dy <= 1 && !near; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W) continue
          if (known[yy * W + xx]) {
            near = true
            break
          }
        }
      }
      if (near) {
        order[qt++] = p
        queued[p] = 1
      }
    }
    while (qh < qt) {
      const p = order[qh++]
      const x = p % W
      const y = (p - x) / W
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let ws = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W || (dx === 0 && dy === 0)) continue
          const q = yy * W + xx
          if (known[q]) {
            const w = dx !== 0 && dy !== 0 ? 0.7071 : 1
            const k = q * 4
            r += out[k] * w
            g += out[k + 1] * w
            b += out[k + 2] * w
            a += out[k + 3] * w
            ws += w
          } else if (todo[q] && !queued[q] && qt < count) {
            queued[q] = 1
            order[qt++] = q
          }
        }
      }
      if (ws > 0) {
        const k = p * 4
        out[k] = r / ws
        out[k + 1] = g / ws
        out[k + 2] = b / ws
        out[k + 3] = a / ws
      }
      known[p] = 1
    }

    // Laplace relaxation in float precision over the filled pixels.
    const n = qt
    const slot = new Int32Array(N)
    slot.fill(-1)
    const buf = new Float32Array(n * 4)
    for (let i = 0; i < n; i++) {
      const p = order[i]
      slot[p] = i
      buf[i * 4] = out[p * 4]
      buf[i * 4 + 1] = out[p * 4 + 1]
      buf[i * 4 + 2] = out[p * 4 + 2]
      buf[i * 4 + 3] = out[p * 4 + 3]
    }
    const iters = Math.min(200, 16 + 2 * Math.round(Math.sqrt(n)))
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < n; i++) {
        const p = order[i]
        const x = p % W
        let c = 0
        let s0 = 0
        let s1 = 0
        let s2 = 0
        let s3 = 0
        for (let j = 0; j < 4; j++) {
          let q = -1
          if (j === 0 && x > 0) q = p - 1
          else if (j === 1 && x < W - 1) q = p + 1
          else if (j === 2 && p >= W) q = p - W
          else if (j === 3 && p < N - W) q = p + W
          if (q < 0) continue
          const sq = slot[q]
          if (sq >= 0) {
            s0 += buf[sq * 4]
            s1 += buf[sq * 4 + 1]
            s2 += buf[sq * 4 + 2]
            s3 += buf[sq * 4 + 3]
          } else {
            s0 += out[q * 4]
            s1 += out[q * 4 + 1]
            s2 += out[q * 4 + 2]
            s3 += out[q * 4 + 3]
          }
          c++
        }
        if (c > 0) {
          buf[i * 4] = s0 / c
          buf[i * 4 + 1] = s1 / c
          buf[i * 4 + 2] = s2 / c
          buf[i * 4 + 3] = s3 / c
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const p = order[i]
      out[p * 4] = buf[i * 4]
      out[p * 4 + 1] = buf[i * 4 + 1]
      out[p * 4 + 2] = buf[i * 4 + 2]
      out[p * 4 + 3] = buf[i * 4 + 3]
    }
  }

  // Per-pixel source offset chosen by the exemplar pass (for the seam blend).
  const srcOff = new Int32Array(N)
  const hasOff = new Uint8Array(N)
  const srcDx = new Int32Array(N)

  /** Criminisi exemplar fill. Returns false when no complete source patch exists. */
  function exemplar(): boolean {
    let P = opts.patchSize ? opts.patchSize | 0 : 9
    if (P < 3) P = 3
    if (P % 2 === 0) P++
    const hp = (P - 1) >> 1
    const PP = P * P
    if (W < P || H < P) return false

    // Valid source centres: whole patch inside the image and originally known.
    const IW = W + 1
    const integ = new Int32Array(IW * (H + 1))
    for (let y = 0; y < H; y++) {
      let row = 0
      for (let x = 0; x < W; x++) {
        row += hole[y * W + x]
        integ[(y + 1) * IW + x + 1] = integ[y * IW + x + 1] + row
      }
    }
    const valid = new Uint8Array(N)
    let validCount = 0
    for (let y = hp; y < H - hp; y++) {
      for (let x = hp; x < W - hp; x++) {
        const s =
          integ[(y + hp + 1) * IW + x + hp + 1] -
          integ[(y - hp) * IW + x + hp + 1] -
          integ[(y + hp + 1) * IW + x - hp] +
          integ[(y - hp) * IW + x - hp]
        if (s === 0) {
          valid[y * W + x] = 1
          validCount++
        }
      }
    }
    if (validCount === 0) return false
    const validList = new Int32Array(validCount)
    for (let p = 0, k = 0; p < N; p++) if (valid[p]) validList[k++] = p

    const filled = new Uint8Array(N)
    const conf = new Float32Array(N)
    const lum = new Float32Array(N)
    for (let p = 0; p < N; p++) {
      if (!hole[p]) {
        filled[p] = 1
        conf[p] = 1
      }
      lum[p] = 0.299 * out[p * 4] + 0.587 * out[p * 4 + 1] + 0.114 * out[p * 4 + 2]
    }

    const R = opts.searchRadius && opts.searchRadius > 0 ? opts.searchRadius | 0 : 64
    const K = opts.randomSamples !== undefined && opts.randomSamples >= 0 ? opts.randomSamples | 0 : 120
    const stride = R >= 48 ? 3 : R >= 16 ? 2 : 1
    let seed = opts.seed ? opts.seed | 0 : 0x2545f491
    const rand = function (): number {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    const prio = new Float32Array(N)
    const inFront = new Uint8Array(N)
    const front: number[] = []
    let remaining = holeCount

    // Scratch for the current target patch's known pixels.
    const offIdx = new Int32Array(PP)
    const tv = new Int32Array(PP * 3)
    let nk = 0
    let bestD = 0
    let bestC = -1

    const isFrontPx = function (p: number): boolean {
      if (filled[p]) return false
      const x = p % W
      return (x > 0 && filled[p - 1] === 1) || (x < W - 1 && filled[p + 1] === 1) || (p >= W && filled[p - W] === 1) || (p < N - W && filled[p + W] === 1)
    }

    const filledAt = function (x: number, y: number): number {
      const cx = x < 0 ? 0 : x >= W ? W - 1 : x
      const cy = y < 0 ? 0 : y >= H ? H - 1 : y
      return filled[cy * W + cx]
    }

    const priority = function (p: number): number {
      const x = p % W
      const y = (p - x) / W
      let cs = 0
      let gmax = 0
      let gx = 0
      let gy = 0
      for (let dy = -hp; dy <= hp; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -hp; dx <= hp; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W) continue
          const q = yy * W + xx
          if (!filled[q]) continue
          cs += conf[q]
          if (xx > 0 && xx < W - 1 && yy > 0 && yy < H - 1 && filled[q - 1] && filled[q + 1] && filled[q - W] && filled[q + W]) {
            const ax = (lum[q + 1] - lum[q - 1]) * 0.5
            const ay = (lum[q + W] - lum[q - W]) * 0.5
            const m = ax * ax + ay * ay
            if (m > gmax) {
              gmax = m
              gx = ax
              gy = ay
            }
          }
        }
      }
      // Front normal: Sobel gradient of the known/unknown indicator.
      const nx =
        filledAt(x + 1, y - 1) + 2 * filledAt(x + 1, y) + filledAt(x + 1, y + 1) -
        (filledAt(x - 1, y - 1) + 2 * filledAt(x - 1, y) + filledAt(x - 1, y + 1))
      const ny =
        filledAt(x - 1, y + 1) + 2 * filledAt(x, y + 1) + filledAt(x + 1, y + 1) -
        (filledAt(x - 1, y - 1) + 2 * filledAt(x, y - 1) + filledAt(x + 1, y - 1))
      const nl = Math.sqrt(nx * nx + ny * ny)
      let D = 0
      if (nl > 0) {
        // isophote = gradient rotated 90deg; data term = |isophote . normal| / alpha
        const v = (-gy * nx + gx * ny) / nl
        D = (v < 0 ? -v : v) / 255
      }
      return (cs / PP) * (D + 0.01)
    }

    const tryCand = function (c: number) {
      if (c < 0 || c >= N || !valid[c]) return
      let d = 0
      for (let k = 0; k < nk; k++) {
        const s = (c + offIdx[k]) * 4
        const t = k * 3
        const dr = out[s] - tv[t]
        const dg = out[s + 1] - tv[t + 1]
        const db = out[s + 2] - tv[t + 2]
        d += dr * dr + dg * dg + db * db
        if (d >= bestD) return
      }
      bestD = d
      bestC = c
    }

    const fillAt = function (p: number): boolean {
      const x = p % W
      const y = (p - x) / W
      nk = 0
      let cs = 0
      for (let dy = -hp; dy <= hp; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -hp; dx <= hp; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W) continue
          const q = yy * W + xx
          if (!filled[q]) continue
          offIdx[nk] = dy * W + dx
          tv[nk * 3] = out[q * 4]
          tv[nk * 3 + 1] = out[q * 4 + 1]
          tv[nk * 3 + 2] = out[q * 4 + 2]
          nk++
          cs += conf[q]
        }
      }
      const Cp = cs / PP
      bestD = Infinity
      bestC = -1

      // 1) coherence: continue the sources already used by filled neighbours
      for (let dy = -hp; dy <= hp; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -hp; dx <= hp; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W) continue
          const q = yy * W + xx
          if (hasOff[q]) {
            const c = p + srcOff[q]
            // reject offsets that would wrap across a row
            if (c >= 0 && c < N && c % W === x + srcDx[q]) tryCand(c)
          }
        }
      }
      // 2) strided local window
      const y0 = Math.max(hp, y - R)
      const y1 = Math.min(H - hp - 1, y + R)
      const x0 = Math.max(hp, x - R)
      const x1 = Math.min(W - hp - 1, x + R)
      for (let sy = y0; sy <= y1; sy += stride) {
        const rowBase = sy * W
        for (let sx = x0; sx <= x1; sx += stride) tryCand(rowBase + sx)
      }
      // 3) random global samples
      for (let k = 0; k < K; k++) tryCand(validList[(rand() * validCount) | 0])
      // 4) refine around the best candidate at full resolution
      if (bestC >= 0 && stride > 1) {
        const bx = bestC % W
        const by = (bestC - bx) / W
        for (let sy = Math.max(hp, by - stride + 1); sy <= Math.min(H - hp - 1, by + stride - 1); sy++) {
          for (let sx = Math.max(hp, bx - stride + 1); sx <= Math.min(W - hp - 1, bx + stride - 1); sx++) tryCand(sy * W + sx)
        }
      }
      if (bestC < 0) return false

      const off = bestC - p
      const offX = (bestC % W) - x
      for (let dy = -hp; dy <= hp; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -hp; dx <= hp; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W) continue
          const q = yy * W + xx
          if (filled[q]) continue
          const s = q + off
          out[q * 4] = out[s * 4]
          out[q * 4 + 1] = out[s * 4 + 1]
          out[q * 4 + 2] = out[s * 4 + 2]
          out[q * 4 + 3] = out[s * 4 + 3]
          lum[q] = lum[s]
          conf[q] = Cp
          filled[q] = 1
          srcOff[q] = off
          srcDx[q] = offX
          hasOff[q] = 1
          remaining--
        }
      }
      // grow the front around the patch
      for (let yy = Math.max(0, y - hp - 1); yy <= Math.min(H - 1, y + hp + 1); yy++) {
        for (let xx = Math.max(0, x - hp - 1); xx <= Math.min(W - 1, x + hp + 1); xx++) {
          const q = yy * W + xx
          if (!inFront[q] && isFrontPx(q)) {
            inFront[q] = 1
            front.push(q)
          }
        }
      }
      // refresh priorities whose patch overlaps the change
      const reach = 2 * hp + 1
      for (let yy = Math.max(0, y - reach); yy <= Math.min(H - 1, y + reach); yy++) {
        for (let xx = Math.max(0, x - reach); xx <= Math.min(W - 1, x + reach); xx++) {
          const q = yy * W + xx
          if (inFront[q] && !filled[q]) prio[q] = priority(q)
        }
      }
      return true
    }

    for (let p = 0; p < N; p++) {
      if (hole[p] && isFrontPx(p)) {
        inFront[p] = 1
        front.push(p)
        prio[p] = priority(p)
      }
    }

    let iter = 0
    while (remaining > 0) {
      let best = -1
      let bestP = -1
      let w = 0
      for (let i = 0; i < front.length; i++) {
        const q = front[i]
        if (filled[q]) {
          inFront[q] = 0
          continue
        }
        front[w++] = q
        if (prio[q] > best) {
          best = prio[q]
          bestP = q
        }
      }
      front.length = w
      if (bestP < 0 || !fillAt(bestP)) break
      iter++
      if ((iter & 31) === 0) report((holeCount - remaining) / holeCount)
    }

    if (remaining > 0) {
      // Should not happen, but never leave holes behind.
      const todo = new Uint8Array(N)
      for (let p = 0; p < N; p++) if (hole[p] && !filled[p]) todo[p] = 1
      diffuse(todo, remaining)
    }
    return true
  }

  /**
   * Light gradient-domain seam blend over the filled pixels: solve for a smooth
   * correction field whose boundary values are the mismatch between each known
   * neighbour and the value the copied source patch "expected" there. Interior
   * gradients of the fill are preserved; only the low-frequency seam error is
   * spread out. Limited SOR iterations keep the correction near the seam.
   */
  function seamBlend(iters: number) {
    if (iters <= 0) return
    const list = new Int32Array(holeCount)
    const slot = new Int32Array(N)
    slot.fill(-1)
    for (let p = 0, k = 0; p < N; p++) {
      if (hole[p]) {
        slot[p] = k
        list[k++] = p
      }
    }
    const nb = new Int32Array(holeCount * 4)
    const cnt = new Uint8Array(holeCount)
    const bnd = new Float32Array(holeCount * 4)
    for (let i = 0; i < holeCount; i++) {
      const p = list[i]
      const x = p % W
      const s = hasOff[p] ? p + srcOff[p] : -1
      const sx = s >= 0 ? s % W : -1
      let c = 0
      for (let j = 0; j < 4; j++) {
        let q = -1
        let sq = -1
        if (j === 0 && x > 0) {
          q = p - 1
          if (s >= 0 && sx > 0) sq = s - 1
        } else if (j === 1 && x < W - 1) {
          q = p + 1
          if (s >= 0 && sx < W - 1) sq = s + 1
        } else if (j === 2 && p >= W) {
          q = p - W
          if (s >= W) sq = s - W
        } else if (j === 3 && p < N - W) {
          q = p + W
          if (s >= 0 && s < N - W) sq = s + W
        }
        nb[i * 4 + j] = -1
        if (q < 0) continue
        c++
        if (hole[q]) {
          nb[i * 4 + j] = slot[q]
          continue
        }
        // known neighbour: mismatch vs what the source patch had next to it
        const ref = sq >= 0 && !hole[sq] ? sq : p
        for (let ch = 0; ch < 4; ch++) bnd[i * 4 + ch] += out[q * 4 + ch] - out[ref * 4 + ch]
      }
      cnt[i] = c
    }
    const delta = new Float32Array(holeCount * 4)
    const omega = 1.6
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < holeCount; i++) {
        const c = cnt[i]
        if (!c) continue
        for (let ch = 0; ch < 4; ch++) {
          let sum = bnd[i * 4 + ch]
          for (let j = 0; j < 4; j++) {
            const o = nb[i * 4 + j]
            if (o >= 0) sum += delta[o * 4 + ch]
          }
          const k = i * 4 + ch
          delta[k] += omega * (sum / c - delta[k])
        }
      }
    }
    for (let i = 0; i < holeCount; i++) {
      const p = list[i]
      for (let ch = 0; ch < 4; ch++) out[p * 4 + ch] = out[p * 4 + ch] + delta[i * 4 + ch]
    }
  }

  let method = opts.method || 'auto'
  if (method === 'auto') {
    method = holeCount < 24 || holeDepth() <= 2 ? 'diffusion' : 'exemplar'
  }
  report(0)
  if (method === 'exemplar' && exemplar()) {
    seamBlend(opts.blendIterations !== undefined ? opts.blendIterations | 0 : 80)
  } else {
    diffuse(hole, holeCount)
  }
  report(1)
  return out
}
