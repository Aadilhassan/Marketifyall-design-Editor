/**
 * SVG elements (icons, illustrations, QR codes, charts) are fabric groups of
 * raw fabric shapes (path/rect/line/text). Scenify's own `group` exporter drops
 * `metadata`, and its `group` importer only understands scenify-typed children:
 * raw children come back undefined, `new fabric.Group` throws, and the WHOLE
 * page import aborts — the page reloads empty.
 *
 * Giving these groups their own fabric type routes them through the patched
 * raw-object path (fabric.util.enlivenObjects), which round-trips them intact,
 * metadata included.
 */
import { fabric } from 'fabric'

export const VECTOR_GROUP = 'vectorGroup'

const f: any = fabric

if (!f.VectorGroup) {
  f.VectorGroup = f.util.createClass(f.Group, { type: VECTOR_GROUP })
  f.VectorGroup.fromObject = (object: any, callback: (g: any) => void) => {
    const options = f.util.object.clone(object, true)
    delete options.objects
    f.util.enlivenObjects(object.objects || [], (children: any[]) => {
      callback(new f.VectorGroup(children.filter(Boolean), options, true))
    }, '')
  }
  // Same namespace lookup fabric uses for every type (getKlass('vectorGroup')).
  if ((window as any).fabric && !(window as any).fabric.VectorGroup) (window as any).fabric.VectorGroup = f.VectorGroup
}

/** Retag an SVG group (from groupSVGElements) so it serialises as a vectorGroup. */
export function asVectorGroup<T extends { type?: string }>(obj: T): T {
  if (obj && obj.type === 'group') (obj as any).type = VECTOR_GROUP
  return obj
}

const SCENIFY_TYPES = /^(Static|Dynamic|Background|Frame|group$)/

/**
 * Migrate designs saved before the fix: a top-level `group` whose children are
 * raw fabric shapes becomes a `vectorGroup` so it can load. Scenify-authored
 * groups (children typed StaticText/StaticImage…) are left untouched.
 */
export function migrateVectorGroups<T>(json: T): T {
  const j: any = json
  if (!j || !Array.isArray(j.objects)) return json
  let changed = false
  const objects = j.objects.map((o: any) => {
    if (o?.type === 'group' && Array.isArray(o.objects) && o.objects.some((c: any) => c && !SCENIFY_TYPES.test(c.type || ''))) {
      changed = true
      return { ...o, type: VECTOR_GROUP }
    }
    return o
  })
  return changed ? { ...j, objects } : json
}
