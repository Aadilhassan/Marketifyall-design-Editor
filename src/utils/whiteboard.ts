/**
 * Whiteboard surface: a clearly-dotted page.
 *
 * NOTE (verified in-browser): the scenify/fabric canvas clips all rendering to
 * the design frame, so the dotted grid can only cover the PAGE — the surrounding
 * workspace is owned by the SDK and can't be filled. We therefore make the page
 * itself the dotted surface (fabric.Frame / fabric.Background fill + the canvas
 * background) and keep the page large so it fills the view.
 */
import { fabric } from 'fabric'
import { ignoreError } from '@/lib/logger'

let dotPattern: any = null

function getDotPattern(): any {
  if (dotPattern) return dotPattern
  const S = 26
  const tile = document.createElement('canvas')
  tile.width = S
  tile.height = S
  const ctx = tile.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, S, S)
  ctx.fillStyle = '#b3bcc9'
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, 2.2, 0, Math.PI * 2)
  ctx.fill()
  dotPattern = new (fabric as any).Pattern({ source: tile, repeat: 'repeat' })
  return dotPattern
}

export function applyWhiteboardBackground(canvas: any): void {
  if (!canvas) return
  const p = getDotPattern()
  if (!p) return
  try {
    let changed = false
    const objs = (canvas.getObjects && canvas.getObjects()) || []
    objs.forEach((o: any) => {
      const isPage = o && (o.id === 'frame' || o.id === 'background' || o.type === 'Frame' || o.type === 'Background')
      if (isPage && o.fill !== p) {
        o.set('fill', p)
        o.dirty = true
        changed = true
      }
    })
    if (canvas.backgroundColor !== p) {
      canvas.setBackgroundColor(p, () => canvas.requestRenderAll && canvas.requestRenderAll())
      changed = true
    }
    if (changed && canvas.requestRenderAll) canvas.requestRenderAll()
  } catch (err) {
    ignoreError(err, 'whiteboard surface repaint')
  }
}
