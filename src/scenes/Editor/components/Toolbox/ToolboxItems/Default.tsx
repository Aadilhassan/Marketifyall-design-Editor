// Nothing selected → page-level controls (background, size) instead of an
// empty strip, like Canva's page toolbar.
import useFrameSize from '@/hooks/useFrameSize'
import { Palette, Layers as LayersIcon } from 'lucide-react'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'
import { color, font } from '@/theme/tokens'

const btn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  height: 34,
  padding: '0 12px',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  fontFamily: font.sans,
  fontSize: 13,
  fontWeight: 500,
  color: color.ink2,
  cursor: 'pointer',
}

function Default() {
  const frameSize = useFrameSize()
  const { setActiveSubMenu, setActivePanel, setIsPanelOpen } = useAppContext()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
      <button type="button" style={btn} className="mfa-tb-btn" onClick={() => setActiveSubMenu(SubMenuType.COLOR)}>
        <Palette size={16} />
        Background
      </button>
      <button
        type="button"
        style={btn}
        className="mfa-tb-btn"
        onClick={() => {
          setActivePanel('Layers' as any)
          setIsPanelOpen(true)
        }}
      >
        <LayersIcon size={16} />
        Layers
      </button>
      {frameSize?.width ? (
        <span style={{ marginLeft: 'auto', fontFamily: font.mono, fontSize: 11, color: color.muted, letterSpacing: '0.04em' }}>
          {Math.round(frameSize.width)} × {Math.round(frameSize.height)} px
        </span>
      ) : null}
      <style>{`.mfa-tb-btn:hover{background:${color.hover}!important;color:${color.ink}!important}`}</style>
    </div>
  )
}

export default Default
