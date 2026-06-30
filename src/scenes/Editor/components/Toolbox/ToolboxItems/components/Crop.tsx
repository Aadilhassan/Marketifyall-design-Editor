import { Button, KIND, SIZE } from 'baseui/button'
import { Crop as CropIcon } from 'lucide-react'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'

function Crop() {
  const { setActiveSubMenu } = useAppContext()

  return (
    <Button
      onClick={() => setActiveSubMenu(SubMenuType.CROP)}
      size={SIZE.compact}
      kind={KIND.tertiary}
      startEnhancer={() => <CropIcon size={16} />}
    >
      Crop
    </Button>
  )
}

export default Crop
