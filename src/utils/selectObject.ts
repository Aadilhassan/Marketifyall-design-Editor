/**
 * Select a freshly-added object AND make Scenify's React context aware of it,
 * so the contextual toolbar (fill/stroke/adjust/animate/etc.) appears immediately.
 *
 * Why this is needed: `canvas.setActiveObject(obj)` only sets Fabric's internal
 * active object — it does NOT fire a selection event. Scenify updates its React
 * context `activeObject` exclusively inside `handleSelection`, which is bound to
 * `mouse:up` / `selection:updated` / `selection:cleared`. `handleSelection` reads
 * `canvas.getActiveObject()` (it ignores the event payload), so firing
 * `selection:updated` with any truthy arg makes Scenify pick up the new selection.
 *
 * Without this, newly-added elements have no toolbar until the user clicks them
 * on the canvas — a major UX gap versus Canva, where new elements are instantly
 * selected and editable.
 */
export function selectObject(canvas: any, obj: any): void {
  if (!canvas || !obj) return
  try {
    canvas.setActiveObject(obj)
    canvas.fire('selection:updated', { target: obj, selected: [obj] })
    canvas.requestRenderAll()
  } catch {
    /* defensive: never let selection wiring break an add */
  }
}
