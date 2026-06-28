/**
 * Layering helpers that keep elements ABOVE the canvas frame/background.
 *
 * The SDK's sendToBack() / sendBackwards() move an object toward index 0 — i.e.
 * BEHIND the Frame/Background objects that make up the white canvas — so the
 * element disappears off the back of the design. These helpers send an element
 * to the back of the USER content but never below the frame/background.
 */
type AnyObj = any

const isBackgroundObj = (o: AnyObj): boolean =>
  !!o &&
  (o.name === 'clip' ||
    o.id === 'clip' ||
    o.type === 'Frame' ||
    o.type === 'StaticFrame' ||
    o.type === 'Background')

/** The fabric canvas behind the scenify editor wrapper. */
export const getFabricCanvas = (editor: AnyObj): AnyObj =>
  (editor && (editor.canvas?.canvas || editor.canvas)) || null

/** Send to the back of the USER content — just above the frame/background. */
export const sendToBackSafe = (canvas: AnyObj, obj: AnyObj): void => {
  if (!canvas) return
  obj = obj || canvas.getActiveObject?.()
  if (!obj || isBackgroundObj(obj)) return
  try {
    const objects = canvas.getObjects?.() || []
    const floor = objects.filter(isBackgroundObj).length // frame/bg sit at the bottom
    if (typeof canvas.moveTo === 'function') canvas.moveTo(obj, floor)
    else canvas.sendToBack?.(obj)
    canvas.requestRenderAll?.()
  } catch {
    /* ignore */
  }
}

/** Move back one layer, but never below the frame/background. */
export const sendBackwardsSafe = (canvas: AnyObj, obj: AnyObj): void => {
  if (!canvas) return
  obj = obj || canvas.getActiveObject?.()
  if (!obj || isBackgroundObj(obj)) return
  try {
    const objects = canvas.getObjects?.() || []
    const floor = objects.filter(isBackgroundObj).length
    const idx = objects.indexOf(obj)
    if (idx > floor && typeof canvas.moveTo === 'function') canvas.moveTo(obj, idx - 1)
    canvas.requestRenderAll?.()
  } catch {
    /* ignore */
  }
}
