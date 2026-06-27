import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { useEffect, useState } from 'react'
import ToolboxItems from './ToolboxItems'
import Locked from './ToolboxItems/Locked'
import { getContextMenuType, resolveToolboxKey } from './toolboxMap'

const Container = styled('div', props => ({
  height: '60px',
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: '16px',
  paddingRight: '16px',
  gap: '8px',
}))

function EditorToolbox() {
  const [activeToolbox, setActiveToolbox] = useState('Default')
  const [locked, setLocked] = useState(false)
  const { activeObject } = useEditorContext()
  const editor = useEditor()

  useEffect(() => {
    if (activeObject) {
      setLocked((activeObject as any).locked)
      const activeObjectType = getContextMenuType(activeObject)
      setActiveToolbox(resolveToolboxKey(activeObjectType))
    } else {
      setLocked(false)
      setActiveToolbox(null)
    }
  }, [activeObject])

  useEffect(() => {
    const handleHistoryChange = () => {
      if (activeObject) {
        setLocked((activeObject as any).locked)
      } else {
        setLocked(false)
        // setActiveToolbox(null)
      }
    }
    if (editor) {
      editor.on('history:changed', handleHistoryChange)
    }
    return () => {
      if (editor) {
        editor.off('history:changed', handleHistoryChange)
      }
    }
  }, [editor, activeObject])

  if (!activeObject) {
    return (
      <Container>
        <ToolboxItems.Default />
      </Container>
    )
  }
  if (locked) {
    return (
      <Container>
        <Locked />
      </Container>
    )
  }

  const Toolbox = activeObject ? ToolboxItems[activeToolbox] : null
  return <Container>{Toolbox ? <Toolbox /> : <ToolboxItems.Default />}</Container>
}

export default EditorToolbox
