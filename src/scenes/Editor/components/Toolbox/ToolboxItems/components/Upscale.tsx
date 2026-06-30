import { useState } from 'react'
import { Button, KIND, SIZE } from 'baseui/button'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { Maximize2 } from 'lucide-react'
import { useActiveObject, useEditorContext } from '@nkyo/scenify-sdk'
import { isImageObject, isVideoObject, upscaleImage } from '@/utils/imageEdits'
import { showImageProcessingOverlay } from '@/utils/progressOverlay'
import { notify } from '@/lib/notify'

const FACTORS = [2, 3, 4]

function Upscale() {
  const hookActive = useActiveObject<any>()
  const { canvas, activeObject: ctxActive } = useEditorContext() as any
  const activeObject = hookActive || ctxActive || (canvas && canvas.getActiveObject && canvas.getActiveObject()) || null
  const [busy, setBusy] = useState(false)

  // Resampling a video poster would desync the clip — images only.
  if (!isImageObject(activeObject) || isVideoObject(activeObject)) return null

  const run = async (factor: number, close: () => void) => {
    close()
    if (busy || !activeObject) return
    setBusy(true)
    const overlay = showImageProcessingOverlay(canvas, activeObject, 'Preparing…')
    try {
      const { to } = await upscaleImage(canvas, activeObject, factor, (ratio, stage) => overlay.update(ratio, stage))
      notify(`Upscaled ${factor}× — now ${to}px`, 'positive')
    } catch (e: any) {
      notify(e?.message ? e.message : 'Upscale failed', 'negative')
    } finally {
      overlay.close()
      setBusy(false)
    }
  }

  return (
    <StatefulPopover
      placement={PLACEMENT.bottom}
      content={({ close }) => (
        <div
          style={{
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 160,
            background: '#ffffff',
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4, padding: '4px 8px' }}>
            Upscale amount
          </div>
          {FACTORS.map(f => (
            <button
              key={f}
              onClick={() => run(f, close)}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {f}× resolution
            </button>
          ))}
        </div>
      )}
    >
      <Button
        disabled={busy}
        isLoading={busy}
        size={SIZE.compact}
        kind={KIND.tertiary}
        startEnhancer={() => <Maximize2 size={16} />}
      >
        {busy ? 'Upscaling…' : 'Upscale'}
      </Button>
    </StatefulPopover>
  )
}

export default Upscale
