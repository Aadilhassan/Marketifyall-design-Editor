/**
 * AnimationDriver — bridges the shared timeline clock (VideoContext) to the
 * keyframe engine. On every currentTime/isPlaying change it evaluates each
 * animated fabric object and applies the resulting transform, so the canvas
 * (and the DOM overlays that mirror it) animate in lock-step with the playhead.
 *
 * Renders nothing.
 */
import React, { useEffect, useRef } from 'react'
import { useEditorContext } from '@nkyo/scenify-sdk'
import useVideoContext from '@/hooks/useVideoContext'
import { usePlaybackTime } from '@/contexts/VideoContext'
import { applyAnimationsToCanvas, invalidateBase, restoreAllBases } from '@/utils/animation'

const REST_EPS = 0.015

const AnimationDriver: React.FC = () => {
  const { canvas } = useEditorContext()
  const { isPlaying } = useVideoContext()
  const { currentTime } = usePlaybackTime()
  const stateRef = useRef({ currentTime, isPlaying })
  stateRef.current = { currentTime, isPlaying }

  // Drive the animation whenever the clock advances or play state flips.
  useEffect(() => {
    if (!canvas) return
    applyAnimationsToCanvas(canvas as any, currentTime, isPlaying)
  }, [canvas, currentTime, isPlaying])

  // When a user manually edits an animated object while the playhead is at rest,
  // forget the cached base so the engine re-captures the new authored transform
  // (otherwise the next rest frame would snap the object back to the old spot).
  useEffect(() => {
    if (!canvas) return
    const c = canvas as any
    const onModified = (e: any) => {
      const { currentTime: t, isPlaying: playing } = stateRef.current
      const atRest = !playing && t <= REST_EPS
      if (atRest && e && e.target) invalidateBase(e.target)
    }
    c.on?.('object:modified', onModified)
    return () => {
      c.off?.('object:modified', onModified)
    }
  }, [canvas])

  // Restore authored transforms when unmounting.
  useEffect(() => {
    return () => {
      if (canvas) restoreAllBases(canvas as any)
    }
  }, [canvas])

  return null
}

export default AnimationDriver
