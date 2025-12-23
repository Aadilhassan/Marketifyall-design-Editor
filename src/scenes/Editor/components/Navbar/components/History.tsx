import { styled } from 'baseui'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'

import { useEditor } from '@nkyo/scenify-sdk'
import Icons from '../../Icons'
import { useEffect, useState } from 'react'

const Container = styled('div', props => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
}))

const HistoryButton = styled('button', {
  background: 'transparent',
  border: 'none',
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#374151',
  padding: 0,
  ':hover': {
    background: '#f3f4f6',
    color: '#111827',
  },
})

function History() {
  const editor = useEditor()

  const [historyStatus, setHistoryStatus] = useState({ hasUndo: false, hasRedo: false })
  useEffect(() => {
    const handleHistoryChange = (data: any) => {
      setHistoryStatus({ ...historyStatus, hasUndo: data.hasUndo, hasRedo: data.hasRedo })
    }
    if (editor) {
      editor.on('history:changed', handleHistoryChange)
    }
    return () => {
      if (editor) {
        editor.off('history:changed', handleHistoryChange)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  return (
    <Container>
      <HistoryButton
        onClick={() => {
          editor.undo()
        }}
        title="Undo"
      >
        <Icons.Undo size={22} />
      </HistoryButton>
      <HistoryButton
        onClick={() => {
          editor.redo()
        }}
        title="Redo"
      >
        <Icons.Redo size={22} />
      </HistoryButton>
    </Container>
  )
}
export default History
