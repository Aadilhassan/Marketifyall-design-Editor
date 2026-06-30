import { Button, KIND, SIZE } from 'baseui/button'
import { Wand2 } from 'lucide-react'
import { useActiveObject, useEditorContext } from '@nkyo/scenify-sdk'
import { autoEnhance, isImageObject } from '@/utils/imageEdits'
import { notify } from '@/lib/notify'

function Enhance() {
  const hookActive = useActiveObject<any>()
  const { canvas, activeObject: ctxActive } = useEditorContext() as any
  const activeObject = hookActive || ctxActive || (canvas && canvas.getActiveObject && canvas.getActiveObject()) || null

  if (!isImageObject(activeObject)) return null

  const run = () => {
    if (!activeObject) return
    try {
      const result = autoEnhance(canvas, activeObject)
      notify(result ? 'Auto-enhanced' : 'Nothing to enhance', result ? 'positive' : 'info')
    } catch (e: any) {
      notify('Enhance failed', 'negative')
    }
  }

  return (
    <Button onClick={run} size={SIZE.compact} kind={KIND.tertiary} startEnhancer={() => <Wand2 size={16} />}>
      Enhance
    </Button>
  )
}

export default Enhance
