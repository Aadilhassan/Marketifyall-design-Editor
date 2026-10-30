/**
 * Mounts the video/animation engine on the editor's fabric canvas. Renders
 * nothing. Replaces the old AnimationDriver + VideoCanvasPlayer pair: videos
 * now draw inside the scene, and this is the only thing driving time-based
 * object state.
 */
import React, { useEffect } from 'react'
import { useEditorContext } from '@nkyo/scenify-sdk'
import { useVideoProject } from './VideoProjectContext'
import { SceneEngine } from './engine'

const VideoEngine: React.FC = () => {
  const { canvas } = useEditorContext() as any
  const { getProject, getAssetUrl, dispatchSilently, controller, attachEngine } = useVideoProject()

  useEffect(() => {
    if (!canvas) return
    const engine = new SceneEngine(canvas, {
      getProject,
      assetUrl: getAssetUrl,
      dispatchSilently,
      requestRefresh: () => controller.refresh(),
    })
    const detach = attachEngine(engine)

    // Canvas content changed: rebind media, migrate/mirror element timing and
    // redraw the current frame. Coalesced to one pass per animation frame.
    let queued = 0
    const schedule = () => {
      if (!queued) {
        queued = requestAnimationFrame(() => {
          queued = 0
          engine.sync()
        })
      }
    }
    canvas.on('object:added', schedule)
    canvas.on('object:removed', schedule)
    canvas.on('object:modified', schedule)
    return () => {
      canvas.off('object:added', schedule)
      canvas.off('object:removed', schedule)
      canvas.off('object:modified', schedule)
      if (queued) cancelAnimationFrame(queued)
      detach()
      engine.dispose()
    }
  }, [canvas, getProject, getAssetUrl, dispatchSilently, controller, attachEngine])

  return null
}

export default VideoEngine
