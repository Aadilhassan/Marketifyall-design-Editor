import { useState } from 'react'
import { Button, KIND, SIZE } from 'baseui/button'
import { Scissors } from 'lucide-react'
import { useActiveObject, useEditorContext } from '@nkyo/scenify-sdk'
import { isImageObject, isVideoObject, removeImageBackground } from '@/utils/imageEdits'
import { showImageProcessingOverlay } from '@/utils/progressOverlay'
import { notify } from '@/lib/notify'

function RemoveBg() {
  const hookActive = useActiveObject<any>()
  const { canvas, activeObject: ctxActive } = useEditorContext() as any
  const activeObject = hookActive || ctxActive || (canvas && canvas.getActiveObject && canvas.getActiveObject()) || null
  const [busy, setBusy] = useState(false)

  // Background removal only makes sense for still images, not video posters.
  if (!isImageObject(activeObject) || isVideoObject(activeObject)) return null

  const run = async () => {
    if (busy || !activeObject) return
    setBusy(true)
    const overlay = showImageProcessingOverlay(canvas, activeObject, 'Removing background')
    try {
      await removeImageBackground(canvas, activeObject, (ratio, stage) => overlay.update(ratio, stage))
      notify('Background removed', 'positive')
    } catch (e: any) {
      notify(e?.message ? `Background removal failed: ${e.message}` : 'Background removal failed', 'negative')
    } finally {
      overlay.close()
      setBusy(false)
    }
  }

  return (
    <Button
      onClick={run}
      disabled={busy}
      isLoading={busy}
      size={SIZE.compact}
      kind={KIND.tertiary}
      startEnhancer={() => <Scissors size={16} />}
    >
      {busy ? 'Removing…' : 'Remove BG'}
    </Button>
  )
}

export default RemoveBg
