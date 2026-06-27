/**
 * Animation evaluator: turns an ElementAnimation + a global time into a single
 * AnimTransform (deltas relative to the element's authored base). Pure and
 * synchronous so it can run from the preview rAF AND the export frame-stepper,
 * guaranteeing the download matches the editor.
 */
import { ease } from './easings'
import { ENTER_EXIT_MAP, EMPHASIS_MAP, PresetContext } from './presets'
import { AnimTransform, AnimProperty, ElementAnimation, IDENTITY_TRANSFORM, Keyframe, PropertyTrack } from './types'

function interpTrack(track: PropertyTrack, local: number): number {
  const kfs = track.keyframes
  if (!kfs || kfs.length === 0) return defaultFor(track.property)
  if (local <= kfs[0].t) return kfs[0].v
  const last = kfs[kfs.length - 1]
  if (local >= last.t) return last.v
  let a: Keyframe = kfs[0]
  let b: Keyframe = last
  for (let i = 0; i < kfs.length - 1; i++) {
    if (local >= kfs[i].t && local <= kfs[i + 1].t) {
      a = kfs[i]
      b = kfs[i + 1]
      break
    }
  }
  const span = b.t - a.t || 1
  const p = ease(b.easing, (local - a.t) / span)
  return a.v + (b.v - a.v) * p
}

function defaultFor(prop: AnimProperty): number {
  return prop === 'scale' || prop === 'opacity' ? 1 : 0
}

function applyTrack(t: AnimTransform, prop: AnimProperty, v: number): void {
  t[prop] = v
}

export function evaluateAnimation(
  anim: ElementAnimation,
  windowStart: number,
  windowDuration: number,
  globalTime: number,
  ctx: PresetContext
): AnimTransform {
  const local = Math.max(0, globalTime - windowStart)
  const dur = windowDuration > 0 ? windowDuration : 5

  const inDur = anim.in && anim.in.preset !== 'none' ? Math.min(anim.in.duration, dur) : 0
  const outDur = anim.out && anim.out.preset !== 'none' ? Math.min(anim.out.duration, dur) : 0

  const inPhase = inDur > 0 && local < inDur && local <= dur / 2
  const outPhase = outDur > 0 && local > dur - outDur && local > dur / 2

  let t: AnimTransform

  // Per-phase context: direction/intensity come from the active preset instance.
  const phaseCtx = (inst: { direction?: any; intensity?: number }): PresetContext => ({
    ...ctx,
    direction: inst.direction || ctx.direction,
    intensity: typeof inst.intensity === 'number' ? inst.intensity : ctx.intensity,
  })

  if (inPhase && anim.in) {
    const def = ENTER_EXIT_MAP[anim.in.preset]
    const p = ease(anim.in.easing, local / inDur)
    t = def ? def.build(p, phaseCtx(anim.in)) : { ...IDENTITY_TRANSFORM }
  } else if (outPhase && anim.out) {
    const def = ENTER_EXIT_MAP[anim.out.preset]
    // progress runs 1 (exit start) -> 0 (gone)
    const p = ease(anim.out.easing, (dur - local) / outDur)
    t = def ? def.build(p, phaseCtx(anim.out)) : { ...IDENTITY_TRANSFORM }
  } else if (anim.emphasis && anim.emphasis.preset !== 'none') {
    const def = EMPHASIS_MAP[anim.emphasis.preset]
    const cycle = anim.emphasis.duration > 0 ? anim.emphasis.duration : 1.2
    // start emphasis only after the entrance has finished for a natural feel
    const phase = (((local - inDur) % cycle) + cycle) % cycle / cycle
    t = def ? def.build(phase, phaseCtx(anim.emphasis)) : { ...IDENTITY_TRANSFORM }
  } else {
    t = { ...IDENTITY_TRANSFORM }
  }

  // Raw per-property keyframe tracks override (advanced / After-Effects style).
  if (anim.tracks && anim.tracks.length) {
    for (const track of anim.tracks) {
      if (track.keyframes && track.keyframes.length) {
        applyTrack(t, track.property, interpTrack(track, local))
      }
    }
  }

  return t
}

/** True when the element has any active animation worth driving. */
export function hasActiveAnimation(anim: ElementAnimation | undefined): boolean {
  if (!anim) return false
  const live = (p?: { preset: string }) => !!p && p.preset !== 'none'
  return (
    live(anim.in) ||
    live(anim.out) ||
    live(anim.emphasis) ||
    live(anim.text) ||
    !!(anim.tracks && anim.tracks.length)
  )
}

/**
 * Kinetic text reveal: returns the substring of `fullText` that should be
 * visible at `globalTime`, or `null` if there's no active text reveal.
 * Renders directly on the fabric text object, so it bakes into exports.
 */
export function computeTextReveal(
  anim: ElementAnimation,
  windowStart: number,
  windowDuration: number,
  globalTime: number,
  fullText: string
): string | null {
  const ta = anim.text
  if (!ta || ta.preset === 'none' || !fullText) return null
  const local = Math.max(0, globalTime - windowStart)
  const dur = Math.min(ta.duration > 0 ? ta.duration : windowDuration, windowDuration)
  const p = dur > 0 ? ease(ta.easing, local / dur) : 1
  if (p >= 1) return fullText

  if (ta.preset === 'word') {
    // Reveal whole words, preserving original whitespace.
    const tokens = fullText.split(/(\s+)/) // words and separators interleaved
    const wordIdx = tokens
      .map((tok, i) => (/\S/.test(tok) ? i : -1))
      .filter(i => i >= 0)
    const total = wordIdx.length
    if (total === 0) return fullText
    const revealCount = Math.max(0, Math.min(total, Math.round(p * total)))
    if (revealCount === 0) return ''
    const lastTokenIdx = wordIdx[revealCount - 1]
    return tokens.slice(0, lastTokenIdx + 1).join('')
  }

  // typewriter: reveal characters
  const n = Math.max(0, Math.min(fullText.length, Math.round(p * fullText.length)))
  return fullText.slice(0, n)
}
