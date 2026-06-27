/**
 * Animation engine types.
 *
 * The animation model is stored additively on each fabric object under
 * `obj.metadata.anim` (an `ElementAnimation`). `metadata` is already part of
 * scenify's PROPERTIES_TO_INCLUDE, so this round-trips through save/load and
 * export for free, without touching the (frozen) scenify SDK.
 *
 * Everything is expressed as DELTAS relative to the object's authored
 * ("base") transform so that presets compose cleanly and a user can keep
 * editing position/scale on the canvas independently of the animation:
 *   left    = base.left  + tx
 *   top     = base.top   + ty
 *   scaleX  = base.scaleX * scale   (center-anchored, see engine)
 *   angle   = base.angle + rotate
 *   opacity = base.opacity * opacity
 */

export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'easeOutElastic'
  | 'easeOutBounce'

/** A single animation frame's worth of transform deltas. Identity = on-screen. */
export interface AnimTransform {
  tx: number // px translation X
  ty: number // px translation Y
  scale: number // uniform scale multiplier
  rotate: number // degrees added
  opacity: number // 0..1 multiplier
}

export const IDENTITY_TRANSFORM: AnimTransform = {
  tx: 0,
  ty: 0,
  scale: 1,
  rotate: 0,
  opacity: 1,
}

export type PresetCategory = 'in' | 'out' | 'emphasis'

export type PresetDirection = 'up' | 'down' | 'left' | 'right'

/** A configured preset instance stored on an element. */
export interface PresetInstance {
  preset: string
  duration: number // seconds
  easing: EasingName
  direction?: PresetDirection
  intensity?: number // 0..1, scales the effect strength (default 1)
}

/** Raw per-property keyframe track (After-Effects style — optional/advanced). */
export type AnimProperty = 'tx' | 'ty' | 'scale' | 'rotate' | 'opacity'

export interface Keyframe {
  t: number // seconds, relative to the element's timeline window start
  v: number
  easing?: EasingName
}

export interface PropertyTrack {
  property: AnimProperty
  keyframes: Keyframe[]
}

/** Kinetic text reveal (per-character / per-word), only valid on text elements. */
export type TextRevealPreset = 'none' | 'typewriter' | 'word'

export interface TextRevealInstance {
  preset: TextRevealPreset
  duration: number // seconds
  easing: EasingName
}

/** The complete animation description attached to a single element. */
export interface ElementAnimation {
  in?: PresetInstance
  out?: PresetInstance
  emphasis?: PresetInstance
  text?: TextRevealInstance
  tracks?: PropertyTrack[]
  version?: number
}

export const ANIM_VERSION = 1
