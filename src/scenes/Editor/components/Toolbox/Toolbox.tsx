import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { styled } from 'baseui'
import { useEffect, useState } from 'react'
import ToolboxItems from './ToolboxItems'
import Locked from './ToolboxItems/Locked'
import isArray from 'lodash/isArray'

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

export const getContextMenuType = (selection: any) => {
  const types = new Set()
  if (!selection) {
    return 'Default'
  }
  if (selection._objects) {
    for (const object of selection._objects) {
      types.add(object.type)
    }
  } else {
    types.add(selection.type)
  }

  const typesArray = Array.from(types)

  if (typesArray.length === 1) {
    if (typesArray[0] === 'Background') {
      return 'Default'
    } else {
      return typesArray[0]
    }
  } else {
    return typesArray
  }
}

const toolboxOptions = {
  Default: 'Default',
  StaticText: 'StaticText',
  StaticPath: 'StaticPath',
  StaticImage: 'StaticImage',
  MultiElement: 'MultiElement',
  DynamicText: 'DynamicText',
  DynamicImage: 'DynamicImage',
}

function EditorToolbox() {
  const [activeToolbox, setActiveToolbox] = useState('Default')
  const [locked, setLocked] = useState(false)
  const { activeObject } = useEditorContext()
  const editor = useEditor()

  useEffect(() => {
    if (activeObject) {
      // @ts-ignore
      setLocked(activeObject.locked)
      const activeObjectType = getContextMenuType(activeObject)
      if (isArray(activeObjectType)) {
        // @ts-ignore
        setActiveToolbox(toolboxOptions['MultiElement'])
      } else {
        // @ts-ignore
        setActiveToolbox(toolboxOptions[activeObjectType])
      }
    } else {
      setLocked(false)
      setActiveToolbox(null)
    }
  }, [activeObject])

  useEffect(() => {
    const handleHistoryChange = () => {
      if (activeObject) {
        // @ts-ignore
        setLocked(activeObject.locked)
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
