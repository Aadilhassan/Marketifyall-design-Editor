import Delete from './Delete'
import Duplicate from './Duplicate'
import Opacity from './Opacity'
import Position from './Position'
import Flip from './Flip'
import Lock from './Lock'
import CopyStyle from './CopyStyle'
import Group from './Group'
import { OverflowDivider, OverflowItem } from '../../OverflowBar'

/**
 * The shared right-hand tools as a flat list for <OverflowBar>. A plain
 * function (no hooks) so the bar sees each item, not one opaque component.
 * Lock / duplicate / delete (and their divider) are pinned: they stay in the
 * bar while everything else can move into the More menu.
 */
export function commonItems() {
  return [
    <Group key="common-group" />,
    <Flip key="common-flip" />,
    <Position key="common-position" />,
    <OverflowDivider key="common-div-1" />,
    <CopyStyle key="common-copy-style" />,
    <Opacity key="common-opacity" />,
    <OverflowDivider key="common-div-2" pinned />,
    <OverflowItem key="common-lock" pinned>
      <Lock />
    </OverflowItem>,
    <OverflowItem key="common-duplicate" pinned>
      <Duplicate />
    </OverflowItem>,
    <OverflowItem key="common-delete" pinned>
      <Delete />
    </OverflowItem>,
  ]
}

/** Stand-alone row of the shared tools (outside an OverflowBar). */
function Common() {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{commonItems()}</div>
}

export default Common
