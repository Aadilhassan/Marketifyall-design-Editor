import { finalizeExport, predictedFrameOrigin, prepareImport, staticImageToImage, staticTextToTextbox } from './designJson'

const frame = { width: 1280, height: 720 }

describe('page-relative coordinates', () => {
  it('predicts the SDK frame origin (centred in the canvas element)', () => {
    expect(predictedFrameOrigin({ width: 1023, height: 697 }, frame)).toEqual({ left: -128.5, top: -11.5 })
  })

  it('round-trips raw objects across different canvas sizes', () => {
    // Saved while the frame sat at (-128.5, 35)…
    const saved = finalizeExport({ frame, objects: [{ type: 'textbox', left: 351.5, top: 249 }] }, { left: -128.5, top: 35 })
    expect(saved.metadata.rawCoords).toBe('frame')
    expect(saved.objects[0]).toMatchObject({ left: 480, top: 214 })
    // …reopened in a narrower window: same position relative to the page.
    const size = { width: 683, height: 600 }
    const loaded = prepareImport(saved, size)
    const origin = predictedFrameOrigin(size, frame)
    expect(loaded.objects[0].left - origin.left).toBe(480)
    expect(loaded.objects[0].top - origin.top).toBe(214)
    expect(loaded.metadata.rawCoords).toBeUndefined()
  })

  it('leaves scenify-typed objects to the SDK and legacy absolute JSON untouched', () => {
    const legacy = { frame, objects: [{ type: 'textbox', left: 10, top: 20 }, { type: 'StaticVector', left: 5, top: 5 }] }
    const loaded = prepareImport(legacy, { width: 1000, height: 800 })
    expect(loaded.objects.map(({ __importOrder, ...o }: any) => o)).toEqual(legacy.objects)
    const exported = finalizeExport({ objects: [{ type: 'StaticVector', left: 5, top: 5 }] }, { left: 100, top: 100 })
    expect(exported.objects[0]).toMatchObject({ left: 5, top: 5 })
  })

  it('does not mutate its input', () => {
    const json = { frame, metadata: { rawCoords: 'frame' }, objects: [{ type: 'image', left: 1, top: 2 }] }
    const snapshot = JSON.stringify(json)
    prepareImport(json, { width: 900, height: 900 })
    finalizeExport(json, { left: 3, top: 4 })
    expect(JSON.stringify(json)).toBe(snapshot)
  })
})

describe('template objects become plain fabric objects', () => {
  const staticText = {
    type: 'StaticText',
    left: 100,
    top: 50,
    width: 400,
    angle: 5,
    metadata: { text: 'Hello', fontFamily: 'Lobster', fontSize: 64, fill: '#d8401c', textAlign: 'center', lineheight: 1.2, charspacing: 50, fontURL: 'x.ttf' },
  }

  it('maps StaticText metadata onto textbox properties, keeping metadata', () => {
    const t = staticTextToTextbox(staticText)
    expect(t).toMatchObject({ type: 'textbox', text: 'Hello', fontFamily: 'Lobster', fontSize: 64, fill: '#d8401c', textAlign: 'center', lineHeight: 1.2, charSpacing: 50, angle: 5, width: 400 })
    expect(t.metadata.fontURL).toBe('x.ttf')
  })

  it('maps StaticImage onto an image with its src and crop', () => {
    const i = staticImageToImage({ type: 'StaticImage', left: 0, top: 0, width: 300, height: 200, metadata: { src: 'a.jpg', cropX: 4, cropY: 6 } })
    expect(i).toMatchObject({ type: 'image', src: 'a.jpg', cropX: 4, cropY: 6, crossOrigin: 'anonymous', width: 300 })
  })

  it('places converted template objects the way the SDK would (frame offset added)', () => {
    const size = { width: 1000, height: 800 }
    const origin = predictedFrameOrigin(size, frame)
    const loaded = prepareImport({ frame, objects: [staticText] }, size)
    expect(loaded.objects[0].type).toBe('textbox')
    expect(loaded.objects[0].left).toBe(100 + origin.left)
    expect(loaded.objects[0].top).toBe(50 + origin.top)
  })
})

describe('stacking order after async loads', () => {
  const { orderedIndices, ORDER_KEY } = require('./designJson')
  const isPage = (o: any) => o.type === 'Frame' || o.type === 'Background'

  it('restores saved order, using ids for objects that lost the order tag', () => {
    const arrived = [
      { type: 'Frame' },
      { type: 'Background' },
      { type: 'textbox', id: 't', [ORDER_KEY]: 2 },
      { type: 'StaticVector', id: 'v' }, // scenify-built: no tag, saved at index 1
      { type: 'image', id: 'i', [ORDER_KEY]: 0 },
    ]
    const out = orderedIndices(arrived, isPage, new Map([['v', 1]]))
    expect(out.map((o: any) => o.type)).toEqual(['Frame', 'Background', 'image', 'StaticVector', 'textbox'])
  })

  it('keeps objects added after the import (no order info) on top, in arrival order', () => {
    const arrived = [{ type: 'Frame' }, { type: 'textbox', id: 'new1' }, { type: 'image', [ORDER_KEY]: 0 }, { type: 'path', id: 'new2' }]
    expect(orderedIndices(arrived, isPage).map((o: any) => o.id || o.type)).toEqual(['Frame', 'image', 'new1', 'new2'])
  })
})
