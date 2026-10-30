import { commonItems } from './components/Common'
import OverflowBar, { OverflowSpacer } from '../OverflowBar'

function MultiElement() {
  return (
    <OverflowBar>
      <div key="label">Multi</div>
      <OverflowSpacer key="spacer" />
      {commonItems()}
    </OverflowBar>
  )
}

export default MultiElement
