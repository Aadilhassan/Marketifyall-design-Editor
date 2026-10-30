import { Button, KIND, SIZE } from 'baseui/button'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'

/** Opens the Position side panel (layer order, align, distribute, exact geometry). */
function Position() {
  const { activeSubMenu, setActiveSubMenu } = useAppContext()
  const open = activeSubMenu === SubMenuType.POSITION
  return (
    <Button
      size={SIZE.compact}
      kind={KIND.tertiary}
      isSelected={open}
      onClick={() => setActiveSubMenu(open ? (null as any) : SubMenuType.POSITION)}
    >
      Position
    </Button>
  )
}

export default Position
