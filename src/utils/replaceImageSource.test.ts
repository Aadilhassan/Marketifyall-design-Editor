import { replaceImageSource } from './imageEdits'

// Minimal stand-in for fabric.Image: setSrc swaps the element and, like fabric
// 4.6, resets width/height to the new image's full size but keeps cropX/cropY.
function fakeImage(natural: number, crop: { cropX: number; cropY: number; width: number; height: number }, scale = 0.5) {
  const obj: any = {
    ...crop,
    scaleX: scale,
    scaleY: scale,
    metadata: {},
    _el: { naturalWidth: natural, naturalHeight: natural },
    getElement() {
      return this._el
    },
    set(props: any) {
      Object.assign(this, props)
    },
    setCoords() {},
    setSrc(_src: string, cb: () => void) {
      this._el = { naturalWidth: this.__nextNatural, naturalHeight: this.__nextNatural }
      this.width = this.__nextNatural
      this.height = this.__nextNatural
      cb()
    },
  }
  return obj
}
const canvas = { fire() {}, requestRenderAll() {} }

it('keeps the crop window and on-page size when the new source is the same size (Remove BG / Magic Eraser)', async () => {
  const obj = fakeImage(1000, { cropX: 100, cropY: 50, width: 600, height: 400 })
  obj.__nextNatural = 1000
  await replaceImageSource(canvas, obj, 'data:new')
  expect(obj).toMatchObject({ cropX: 100, cropY: 50, width: 600, height: 400, scaleX: 0.5, scaleY: 0.5 })
  expect(obj.metadata.src).toBe('data:new')
})

it('rescales the crop for an upscaled source and compensates scale so the photo keeps its size', async () => {
  const obj = fakeImage(1000, { cropX: 100, cropY: 50, width: 600, height: 400 })
  obj.__nextNatural = 2000
  await replaceImageSource(canvas, obj, 'data:big')
  expect(obj).toMatchObject({ cropX: 200, cropY: 100, width: 1200, height: 800, scaleX: 0.25, scaleY: 0.25 })
  expect(obj.width * obj.scaleX).toBe(300)
})
