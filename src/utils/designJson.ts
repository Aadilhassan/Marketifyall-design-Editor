/**
 * Normalises design JSON at the import/export boundary.
 *
 * Coordinates: scenify stores its own object types (StaticText, StaticImage…)
 * relative to the page frame and adds the frame offset back on load. Plain
 * fabric objects (everything added from panels: textbox, image, vectorGroup,
 * path…) went through the raw pass-through in absolute canvas coordinates —
 * but the frame is re-centred on every load at canvasSize/2 − frameSize/2, so
 * those objects drifted whenever a design reopened at a different window or
 * drawer size. Exports now store raw objects frame-relative and mark the JSON
 * `metadata.rawCoords = 'frame'`; imports add the upcoming frame offset back.
 * Legacy JSON (no marker) keeps its absolute coordinates, as before.
 *
 * Persistence: scenify's StaticText/StaticImage exporters keep a fixed field
 * list, dropping shadows, strokes-on-path, clip masks, filters and most
 * metadata. Converting them to the equivalent plain fabric objects on import
 * lets everything round-trip.
 */

type Json = Record<string, any>

const SCENIFY_TYPES = new Set([
  'StaticText',
  'DynamicText',
  'StaticImage',
  'DynamicImage',
  'StaticVector',
  'StaticPath',
  'Background',
  'Frame',
  'group',
])

export const isRawObject = (o: Json) => !!o && typeof o.type === 'string' && !SCENIFY_TYPES.has(o.type)

const BASE_KEYS = [
  'id', 'name', 'left', 'top', 'width', 'height', 'scaleX', 'scaleY', 'angle', 'opacity', 'originX', 'originY',
  'flipX', 'flipY', 'skewX', 'skewY', 'visible', 'stroke', 'strokeWidth', 'animation',
]

function base(o: Json): Json {
  const out: Json = {}
  BASE_KEYS.forEach(k => {
    if (o[k] !== undefined) out[k] = o[k]
  })
  out.originX = out.originX || 'left'
  out.originY = out.originY || 'top'
  return out
}

/** Scenify StaticText (frame-relative, props in metadata) → fabric textbox JSON. */
export function staticTextToTextbox(o: Json): Json {
  const m = o.metadata || {}
  const pick = (...vals: any[]) => vals.find(v => v !== undefined && v !== null)
  return {
    ...base(o),
    type: 'textbox',
    text: pick(o.text, m.text, m.template, ''),
    fontFamily: pick(o.fontFamily, m.fontFamily, 'Open Sans'),
    fontSize: pick(o.fontSize, m.fontSize, 32),
    fontWeight: pick(o.fontWeight, m.fontWeight, 400),
    fontStyle: pick(o.fontStyle, m.fontStyle, 'normal'),
    fill: pick(o.fill, m.fill, '#000000'),
    textAlign: pick(o.textAlign, m.textAlign, 'left'),
    lineHeight: pick(o.lineHeight, m.lineheight, m.lineHeight, 1.16),
    charSpacing: pick(o.charSpacing, m.charspacing, m.charSpacing, 0),
    underline: pick(o.underline, m.underline, false),
    metadata: { ...m },
  }
}

/** Scenify StaticImage (frame-relative, src in metadata) → fabric image JSON. */
export function staticImageToImage(o: Json): Json {
  const m = o.metadata || {}
  return {
    ...base(o),
    type: 'image',
    src: o.src || m.src,
    crossOrigin: 'anonymous',
    cropX: o.cropX ?? m.cropX ?? 0,
    cropY: o.cropY ?? m.cropY ?? 0,
    metadata: { ...m },
  }
}

/** Where the SDK will put the page frame: centred in the canvas element. */
export function predictedFrameOrigin(canvasSize: { width: number; height: number }, frame: { width: number; height: number }) {
  return { left: canvasSize.width / 2 - frame.width / 2, top: canvasSize.height / 2 - frame.height / 2 }
}

/**
 * Prepare JSON for `importFromJSON`. `canvasSize` is the fabric canvas element
 * size (getWidth/getHeight); returns a new object (input untouched).
 */
export function prepareImport(json: Json, canvasSize: { width: number; height: number } | null): Json {
  if (!json || !Array.isArray(json.objects)) return json
  const frame = json.frame && json.frame.width && json.frame.height ? json.frame : null
  const origin = frame && canvasSize ? predictedFrameOrigin(canvasSize, frame) : null
  const relative = json.metadata?.rawCoords === 'frame'

  const shift = (o: Json): Json =>
    origin ? { ...o, left: (o.left || 0) + origin.left, top: (o.top || 0) + origin.top } : o

  const objects = json.objects.map((o: Json, i: number) => withOrder(prepareObject(o), i))
  const meta = { ...(json.metadata || {}) }
  delete meta.rawCoords
  return { ...json, metadata: meta, objects }

  function prepareObject(o: Json): Json {
    if (!o) return o
    // Converted objects were frame-relative (scenify format) → place them like the SDK would.
    if (origin && o.type === 'StaticText') return shift(staticTextToTextbox(o))
    if (origin && o.type === 'StaticImage') return shift(staticImageToImage(o))
    if (relative && isRawObject(o)) return shift(o)
    return o
  }
}

/**
 * Saved stacking position. Raw objects load asynchronously (images wait for
 * their download), so they arrive out of order; `restoreOrder` sorts by this.
 * Not part of fabric's serialised props, so it never ends up in saved JSON.
 */
export const ORDER_KEY = '__importOrder'
const withOrder = (o: Json, i: number) => (o ? { ...o, [ORDER_KEY]: i } : o)

/** Stable sort of canvas objects into saved order; page objects stay at the bottom. */
export function orderedIndices(objects: Json[], isPage: (o: Json) => boolean, orderById: Map<string, number> = new Map()): Json[] {
  const page = objects.filter(isPage)
  const rest = objects.filter(o => !isPage(o))
  // Scenify-built objects drop unknown props, so fall back to their saved id position.
  const rank = (o: Json) =>
    typeof o[ORDER_KEY] === 'number' ? o[ORDER_KEY] : orderById.has(o.id) ? (orderById.get(o.id) as number) : Number.MAX_SAFE_INTEGER
  const ranked = rest
    .map((o, i) => ({ o, i, k: rank(o) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map(x => x.o)
  return [...page, ...ranked]
}

/** Post-process `exportToJSON` output: raw objects become frame-relative. */
export function finalizeExport(json: Json, frameOrigin: { left: number; top: number } | null): Json {
  if (!json || !Array.isArray(json.objects) || !frameOrigin) return json
  const objects = json.objects.map((o: Json) =>
    isRawObject(o) ? { ...o, left: (o.left || 0) - frameOrigin.left, top: (o.top || 0) - frameOrigin.top } : o,
  )
  return { ...json, objects, metadata: { ...(json.metadata || {}), rawCoords: 'frame' } }
}
