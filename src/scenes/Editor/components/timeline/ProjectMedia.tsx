/**
 * "In this project" media bin for the Video panel: every video/audio asset
 * the project already has. Click appends it (video → end of the main track,
 * audio → at the playhead); drag drops it onto a track at a time.
 */
import React from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import useVideoContext from '@/hooks/useVideoContext'
import { useVideoProject } from '@/video/VideoProjectContext'
import { Asset, makeId } from '@/video/model'
import { color, font, radius } from '@/theme/tokens'
import { fail } from '@/lib/logger'
import { beginMediaDrag, endMediaDrag } from './mediaDrag'
import { placeVideoAsset } from './canvasElements'
import { formatTimecode } from './math'
import { Icon, Overline } from './ui'

type AnyObj = any

export default function ProjectMedia() {
  const { project, controller, assetUrls } = useVideoProject()
  const { addClip, addAudioClip, setTimelineOpen } = useVideoContext()
  const editor = useEditor() as AnyObj
  const { canvas } = useEditorContext() as AnyObj
  // Detach-audio twins share their video's source; listing them would show the file twice.
  const assets = project.assets.filter(a => (a.kind === 'video' || a.kind === 'audio') && !a.id.endsWith('~audio'))
  if (!assets.length) return null

  const insert = async (a: Asset, start?: number): Promise<string | void> => {
    try {
      if (a.kind === 'video') {
        if (!editor) return
        const id = await placeVideoAsset(editor, canvas, a, addClip, start)
        setTimelineOpen(true)
        return id
      }
      const id = makeId('audio')
      addAudioClip({ id, name: a.name, src: '', duration: a.duration, start: start ?? controller.time, volume: 1, assetId: a.id })
      return id
    } catch (err) {
      fail('timeline', `Could not add “${a.name}”.`, err)
    }
  }

  return (
    <section aria-label="Media in this project" style={{ marginBottom: 20 }}>
      <Overline style={{ marginBottom: 8 }}>In this project</Overline>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {assets.map(a => {
          const missing = assetUrls[a.id] === null
          return (
            <button
              key={a.id}
              type="button"
              draggable={!missing}
              disabled={missing}
              title={missing ? 'Media missing on this device — relink it from the timeline' : 'Click to add · drag onto the timeline to place it'}
              aria-label={`Add ${a.kind} ${a.name} (${formatTimecode(a.duration)}) to the timeline`}
              onDragStart={e => beginMediaDrag(e, { kind: a.kind as 'video' | 'audio', label: a.name, duration: a.duration, insert: at => insert(a, at.start) })}
              onDragEnd={endMediaDrag}
              onClick={() => insert(a)}
              style={{
                position: 'relative',
                height: 72,
                padding: 0,
                overflow: 'hidden',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: color.ink,
                borderRadius: radius.md,
                backgroundColor: a.kind === 'audio' ? '#e2ece4' : '#2b2620',
                backgroundImage: a.poster ? `url("${a.poster}")` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: a.kind === 'audio' ? '#1d4630' : color.paper,
                cursor: missing ? 'not-allowed' : 'grab',
                opacity: missing ? 0.5 : 1,
                textAlign: 'left',
              }}
            >
              <span style={{ position: 'absolute', left: 6, top: 6, display: 'inline-flex' }}>{a.kind === 'audio' ? <Icon.Music size={14} /> : <Icon.Film size={14} />}</span>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingLeft: 6,
                  paddingRight: 6,
                  paddingTop: 3,
                  paddingBottom: 3,
                  backgroundColor: 'rgba(24,20,16,0.7)',
                  color: color.paper,
                  fontFamily: font.sans,
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                <span style={{ fontFamily: font.mono }}>{formatTimecode(a.duration).slice(0, 5)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
