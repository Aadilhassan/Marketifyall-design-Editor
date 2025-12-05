import { useStyletron } from 'baseui'
import Icons from '@components/icons'
import useAppContext from '@/hooks/useAppContext'
import { useEditor } from '@nkyo/scenify-sdk'

function PanelListItem({ label, icon, activePanel }: any) {
  const { setActivePanel } = useAppContext()
  const editor = useEditor()
  const [css] = useStyletron()
  const Icon = Icons[icon]
  const isActive = label === activePanel
  
  return (
    <div
      onClick={() => {
        editor.deselect()
        setActivePanel(label)
      }}
      className={css({
        width: '80px',
        height: '72px',
        backgroundColor: isActive ? '#f3f4f6' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        fontSize: '10px',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        gap: '6px',
        color: isActive ? '#7c3aed' : '#6b7280',
        borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
        cursor: 'pointer',
        ':hover': {
          backgroundColor: '#f9fafb',
          color: '#7c3aed',
        },
      })}
    >
      <Icon size={22} />
      <div style={{ letterSpacing: '0.3px' }}>{label}</div>
    </div>
  )
}

export default PanelListItem
