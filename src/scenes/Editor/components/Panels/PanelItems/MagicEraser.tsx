import { useEffect, useRef, useState } from 'react'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { Eraser, Trash2, Undo2, X } from 'lucide-react'
import useAppContext from '@/hooks/useAppContext'
import { color, font } from '@/theme/tokens'
import { ignoreError, log } from '@/lib/logger'
import { notify } from '@/lib/notify'
import { isImageObject, isVideoObject } from '@/utils/imageEdits'
import { showImageProcessingOverlay } from '@/utils/progressOverlay'
import { createPaintOverlay, PaintOverlay } from '@/utils/inpaint/paintOverlay'
import { magicErase } from '@/utils/inpaint/magicErase'
import { EmptyNote, KitButton, PanelBody, PanelHeader, PanelRoot, SectionLabel } from '../PanelKit'

const BRUSH_MIN = 8
const BRUSH_MAX = 120
const BRUSH_DEFAULT = 40

const Row = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
  marginTop: '8px',
})

const Tip = styled('p', {
  margin: '14px 0 0',
  fontSize: '12px',
  lineHeight: 1.5,
  color: color.muted,
})

function MagicEraser() {
  const editor = useEditor() as any
  const { canvas: ctxCanvas, activeObject } = useEditorContext() as any
  const { setActiveSubMenu } = useAppContext()
  const canvas = ctxCanvas || editor?.handlers?.canvas || editor?.canvas?.canvas
  const target = activeObject && isImageObject(activeObject) && !isVideoObject(activeObject) ? activeObject : null

  const [brush, setBrush] = useState(BRUSH_DEFAULT)
  const [strokeCount, setStrokeCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const overlayRef = useRef<PaintOverlay | null>(null)
  const brushRef = useRef(brush)
  brushRef.current = brush
  const abortRef = useRef<AbortController | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // Paint overlay lives exactly as long as this panel has a photo selected.
  useEffect(() => {
    setStrokeCount(0)
    if (!canvas || !target) return undefined
    let overlay: PaintOverlay
    try {
      overlay = createPaintOverlay(canvas, target, {
        brushSize: brushRef.current,
        onChange: n => {
          if (mounted.current) setStrokeCount(n)
        },
      })
    } catch (err) {
      log.warn('magicEraser', 'could not attach the brush overlay', err)
      return undefined
    }
    overlayRef.current = overlay
    return () => {
      overlay.destroy()
      if (overlayRef.current === overlay) overlayRef.current = null
    }
  }, [canvas, target])

  useEffect(() => {
    if (overlayRef.current) overlayRef.current.setBrushSize(brush)
  }, [brush])

  const close = () => setActiveSubMenu(null as any)

  const erase = async () => {
    const overlay = overlayRef.current
    if (!overlay || !target || busy) return
    const strokes = overlay.getStrokes()
    if (!strokes.length) return
    setBusy(true)
    overlay.setBusy(true)
    const ac = new AbortController()
    abortRef.current = ac
    const progress = showImageProcessingOverlay(canvas, target, 'Erasing')
    try {
      await magicErase(canvas, target, strokes, (r, stage) => progress.update(r, stage), ac.signal)
      overlay.clear()
      notify('Erased. Use Undo to bring it back.', 'positive')
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        ignoreError(err, 'magic eraser cancelled because the panel closed')
      } else {
        log.error('magicEraser', 'erase failed', err)
        notify(err?.message ? `Magic Eraser failed: ${err.message}` : 'Magic Eraser failed', 'negative')
      }
    } finally {
      progress.close()
      if (abortRef.current === ac) abortRef.current = null
      overlay.setBusy(false)
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <PanelRoot>
      <PanelHeader
        title="Magic Eraser"
        subtitle="Brush over what you want to remove. Works best on small objects against simple or textured backgrounds."
        action={
          <button
            type="button"
            aria-label="Close Magic Eraser"
            onClick={close}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: color.muted, padding: 4 }}
          >
            <X size={18} />
          </button>
        }
      />
      <PanelBody>
        {!target ? (
          <EmptyNote>Select a photo to use Magic Eraser.</EmptyNote>
        ) : (
          <>
            <SectionLabel>
              Brush size
              <span style={{ fontFamily: font.mono, fontSize: 11, color: color.ink2 }}>{brush}px</span>
            </SectionLabel>
            <input
              type="range"
              aria-label="Brush size"
              min={BRUSH_MIN}
              max={BRUSH_MAX}
              value={brush}
              onChange={e => setBrush(Number(e.target.value))}
              style={{ width: '100%', accentColor: color.accent }}
            />

            <div style={{ marginTop: 18 }}>
              <KitButton type="button" $variant="primary" $block disabled={!strokeCount || busy} onClick={erase}>
                <Eraser size={16} />
                {busy ? 'Erasing…' : 'Erase'}
              </KitButton>
            </div>
            <Row>
              <KitButton type="button" disabled={!strokeCount || busy} onClick={() => overlayRef.current?.undo()}>
                <Undo2 size={15} />
                Undo stroke
              </KitButton>
              <KitButton type="button" disabled={!strokeCount || busy} onClick={() => overlayRef.current?.clear()}>
                <Trash2 size={15} />
                Clear
              </KitButton>
            </Row>
            <div style={{ marginTop: 8 }}>
              <KitButton type="button" $variant="ghost" $block disabled={busy} onClick={close}>
                Done
              </KitButton>
            </div>
            <Tip>Erasing runs on your device. Undo (Ctrl/Cmd+Z) restores the original photo.</Tip>
          </>
        )}
      </PanelBody>
    </PanelRoot>
  )
}

export default MagicEraser
