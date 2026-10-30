import { useStyletron } from 'baseui'
import Icons from '@components/icons'
import useAppContext from '@/hooks/useAppContext'
import { color, font } from '@/theme/tokens'
import { useCoarsePointer } from '@/hooks/useBreakpoint'

function PanelListItem({ label, icon, activePanel }: any) {
  const { setActivePanel, isPanelOpen, setIsPanelOpen, activeSubMenu, setActiveSubMenu } = useAppContext()
  const [css] = useStyletron()
  // The label is always visible; the hover tooltip only helps mouse users
  // (on touch it would linger after the tap).
  const coarse = useCoarsePointer()
  const Icon = Icons[icon]
  // A contextual sub-panel (Effects, Position…) can be covering the tab's own panel.
  const covered = !!activeSubMenu
  const isActive = label === activePanel && isPanelOpen && !covered

  const onClick = () => {
    // Keep the selection (so Brand colours / Apps act on it, like Canva) — just
    // drop any contextual sub-panel so the clicked tab actually shows.
    setActiveSubMenu(null as any)
    // Clicking the open tab again collapses the drawer to give the canvas room.
    if (label === activePanel && isPanelOpen && !covered) {
      setIsPanelOpen(false)
      return
    }
    setActivePanel(label)
    setIsPanelOpen(true)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={label}
      title={coarse ? undefined : label}
      className={css({
        position: 'relative',
        width: '100%',
        height: '64px',
        background: 'transparent',
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '6px',
        fontFamily: font.sans,
        fontWeight: 500,
        fontSize: '10.5px',
        lineHeight: 1.1,
        textAlign: 'center',
        padding: '0 4px',
        userSelect: 'none',
        cursor: 'pointer',
        color: isActive ? color.white : 'rgba(243, 239, 228, 0.62)',
        transitionProperty: 'color',
        transitionDuration: '0.15s',
        ':hover': { color: color.white },
        '::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '14px',
          bottom: '14px',
          width: '3px',
          background: isActive ? color.accent : 'transparent',
        },
      })}
    >
      <span
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '28px',
          borderRadius: '6px',
          background: isActive ? 'rgba(243, 239, 228, 0.12)' : 'transparent',
        })}
      >
        {Icon && <Icon size={20} />}
      </span>
      <span>{label}</span>
    </button>
  )
}

export default PanelListItem
