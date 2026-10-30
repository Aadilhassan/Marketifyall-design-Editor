/**
 * Upload flows shared by the Video panel and the timeline: the file goes to
 * IndexedDB (assetStore), its real duration/poster are probed, a selectable
 * poster image is placed on the page and a clip is added through the
 * compatibility API (one undoable step).
 */
import type { AudioClip, VideoClip } from '@/contexts/VideoContext'
import { importMediaFile } from './assetStore'
import { makeId } from './model'

type AnyObj = any

export interface PlaceOptions {
  frame?: { width: number; height: number }
  /** Timeline start for the clip (defaults to the end of the main track). */
  start?: number
}

/** Fit `w×h` inside 80% × 60% of the page, centred. */
function placement(w: number, h: number, frame: { width: number; height: number }) {
  const k = Math.min(1, (frame.width * 0.8) / w, (frame.height * 0.6) / h)
  return { scale: k, left: (frame.width - w * k) / 2, top: (frame.height - h * k) / 2 }
}

export async function addVideoFile(
  editor: AnyObj,
  file: File,
  addClip: (clip: VideoClip) => void,
  opts: PlaceOptions = {},
): Promise<string> {
  const { asset, poster } = await importMediaFile(file)
  const frame = opts.frame || { width: 900, height: 1200 }
  const pw = poster?.posterWidth || asset.width || 1280
  const ph = poster?.posterHeight || asset.height || 720
  const { scale, left, top } = placement(pw, ph, frame)
  const clipId = makeId('video')
  await editor.add({
    type: 'StaticImage',
    metadata: { src: asset.poster, name: asset.name, duration: asset.duration, id: clipId, isVideo: true, assetId: asset.id },
    width: pw,
    height: ph,
    left,
    top,
    scaleX: scale,
    scaleY: scale,
    opacity: 1,
  })
  addClip({
    id: clipId,
    name: asset.name,
    src: '',
    duration: asset.duration,
    start: opts.start as number,
    end: (opts.start || 0) + asset.duration,
    poster: asset.poster,
    objectId: clipId,
    asset,
  })
  return clipId
}

export async function addAudioFile(file: File, addAudioClip: (clip: AudioClip) => void, start = 0): Promise<string> {
  const { asset } = await importMediaFile(file)
  const id = makeId('audio')
  addAudioClip({ id, name: asset.name, src: '', duration: asset.duration, start, volume: 1, asset })
  return id
}

/** Images become data URLs so they survive a reload (blob: URLs don't). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}
