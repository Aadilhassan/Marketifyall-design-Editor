/**
 * Loading helpers for saved designs: pick the v1 `video` project, or migrate
 * the pre-v1 `clips/audioClips`, and re-attach video clips to their canvas
 * objects when an old save lost the link.
 */
import { objectKey } from './apply'
import { Command, VideoProject, findAsset, fromLegacy, parseProject } from './model'

type AnyObj = any

/** Project stored with a design record (local) and/or its JSON (server). */
export function videoProjectFromSave(record: AnyObj, json?: AnyObj): VideoProject | null {
  const saved = parseProject(record?.video) || parseProject(json?.video)
  if (saved) return saved
  const clips = Array.isArray(record?.clips) ? record.clips : []
  const audio = Array.isArray(record?.audioClips) ? record.audioClips : []
  return clips.length || audio.length ? fromLegacy(clips, audio) : null
}

/**
 * Old saves dropped video metadata from the canvas object; clips that can't
 * find their object by id are matched by poster image instead. Retries while
 * imported objects are still materialising. Returns a canceller.
 */
export function relinkVideoObjects(
  getCanvas: () => AnyObj,
  getProject: () => VideoProject,
  dispatchSilently: (cmd: Command) => void,
  opts: { tries?: number; interval?: number } = {},
): () => void {
  let tries = opts.tries ?? 40
  let timer: ReturnType<typeof setTimeout> | null = null
  const attempt = () => {
    timer = null
    const project = getProject()
    const objs: AnyObj[] = getCanvas()?.getObjects?.() || []
    const referenced = new Set(project.clips.map(c => c.objectId).filter(Boolean) as string[])
    const keys = new Map(objs.map(o => [objectKey(o, referenced), o]))
    const claimed = new Set<AnyObj>()
    const cmds: Command[] = []
    let unresolved = 0
    for (const c of project.clips) {
      const asset = findAsset(project, c.assetId)
      if (!asset || asset.kind !== 'video' || !c.objectId) continue
      if (keys.has(c.objectId)) continue
      const match = asset.poster
        ? objs.find(o => !claimed.has(o) && !referenced.has(objectKey(o)) && posterOf(o) === asset.poster)
        : undefined
      if (match) {
        claimed.add(match)
        cmds.push({ type: 'setClipProps', clipId: c.id, patch: { objectId: objectKey(match) } })
      } else unresolved++
    }
    if (cmds.length) dispatchSilently({ type: 'batch', commands: cmds })
    if (unresolved && tries-- > 0) timer = setTimeout(attempt, opts.interval ?? 150)
  }
  attempt()
  return () => {
    if (timer) clearTimeout(timer)
  }
}

function posterOf(o: AnyObj): string | undefined {
  if (o?.metadata?.src) return o.metadata.src
  const el = o?._originalElement || o?._element
  return el?.src || undefined
}
