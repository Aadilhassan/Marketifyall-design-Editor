import { useEditor } from '@nkyo/scenify-sdk'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import Icons from '../../../Icons'
import { selectObject } from '@/utils/selectObject'
import { fail } from '@/lib/logger'

function Duplicate() {
  const editor = useEditor()
  return (
    <Button
      onClick={() => {
        editor.clone()
        // clone() is async (fabric clone callback); once it settles, record the
        // copy in history (so Ctrl+Z removes it) and sync the React selection so
        // the toolbar follows the new copy instead of the original.
        setTimeout(() => {
          try {
            const canvas = (editor as any)?.canvas?.canvas || (editor as any)?.canvas
            const obj = canvas?.getActiveObject?.()
            if (canvas && obj) {
              canvas.fire('object:modified', { target: obj })
              selectObject(canvas, obj)
            }
          } catch (err) {
            fail('edit', 'Duplicate failed', err)
          }
        }, 80)
      }}
      size={SIZE.default}
      kind={KIND.tertiary}
      shape={SHAPE.square}
    >
      <Icons.Duplicate size={24} />
    </Button>
  )
}

export default Duplicate
