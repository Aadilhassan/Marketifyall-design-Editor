import { useEffect, useState } from 'react'
import { useEditor } from '@nkyo/scenify-sdk'
import { getFabricCanvas } from '@/utils/magicResize'

type Size = { width: number; height: number }

const readSize = (editor: any): Size | null => {
  const frame = getFabricCanvas(editor)?.getObjects?.().find((o: any) => o.type === 'Frame')
  return frame ? { width: Math.round(frame.width * (frame.scaleX || 1)), height: Math.round(frame.height * (frame.scaleY || 1)) } : null
}

/** Live page size read from the Frame object (the SDK context's frameSize is never populated). */
export default function useFrameSize(): Size | null {
  const editor = useEditor() as any
  const [size, setSize] = useState<Size | null>(() => readSize(editor))

  useEffect(() => {
    const canvas = getFabricCanvas(editor)
    if (!canvas?.on) return
    const update = () =>
      setSize(prev => {
        const next = readSize(editor)
        return next && prev && next.width === prev.width && next.height === prev.height ? prev : next
      })
    update()
    // setSize() re-renders and re-zooms; after:render catches page switches and resizes alike.
    canvas.on('after:render', update)
    return () => canvas.off('after:render', update)
  }, [editor])

  return size
}
