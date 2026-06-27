import { Button, KIND, SIZE } from 'baseui/button'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'

function Adjust() {
  const { setActiveSubMenu } = useAppContext()

  return (
    <Button
      onClick={() => setActiveSubMenu(SubMenuType.ADJUST)}
      size={SIZE.compact}
      kind={KIND.tertiary}
    >
      Adjust
    </Button>
  )
}

export default Adjust
