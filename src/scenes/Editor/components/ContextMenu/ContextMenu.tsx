import React, { useEffect, useState, useCallback } from 'react'
import { styled } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import {
  Copy,
  Clipboard,
  Trash2,
  Lock,
  Unlock,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  FlipHorizontal,
  FlipVertical,
  Group,
  Ungroup,
} from 'lucide-react'

const MenuOverlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
})

const MenuContainer = styled('div', {
  position: 'fixed',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
  padding: '8px 0',
  minWidth: '200px',
  zIndex: 1001,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  overflow: 'hidden',
})

const MenuItem = styled('div', (props: { $disabled?: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '10px 16px',
  cursor: props.$disabled ? 'not-allowed' : 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  color: props.$disabled ? '#9ca3af' : '#374151',
  transition: 'all 0.15s ease',
  gap: '12px',
  ':hover': {
    backgroundColor: props.$disabled ? 'transparent' : '#f3f4f6',
    color: props.$disabled ? '#9ca3af' : '#7c3aed',
  },
}))

const MenuDivider = styled('div', {
  height: '1px',
  backgroundColor: '#e5e7eb',
  margin: '6px 0',
})

const Shortcut = styled('span', {
  marginLeft: 'auto',
  fontSize: '11px',
  color: '#9ca3af',
  fontWeight: '500',
  backgroundColor: '#f3f4f6',
  padding: '2px 6px',
  borderRadius: '4px',
})

const SubMenuLabel = styled('div', {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  fontSize: '11px',
  fontWeight: '600',
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

interface ContextMenuProps {
  canvasRef?: React.RefObject<HTMLDivElement>
}

function ContextMenu({ canvasRef }: ContextMenuProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [clipboard, setClipboard] = useState<any>(null)
  const editor = useEditor()
  const { activeObject } = useEditorContext()

  const handleContextMenu = useCallback((e: MouseEvent) => {
    // Only show context menu on canvas area
    const target = e.target as HTMLElement
    const isCanvas = target.tagName === 'CANVAS' || target.closest('.canvas-container')
    
    if (isCanvas) {
      e.preventDefault()
      setPosition({ x: e.clientX, y: e.clientY })
      setVisible(true)
    }
  }, [])

  const handleClick = useCallback(() => {
    setVisible(false)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setVisible(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleContextMenu, handleClick, handleKeyDown])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if (!editor) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey

      // Copy
      if (ctrlKey && e.key === 'c' && activeObject) {
        e.preventDefault()
        // Copy logic handled by handleCopy
        const json = editor.exportToJSON()
        const selectedObjects = json.objects.filter((obj: any) => {
          return obj.id === (activeObject as any).id
        })
        setClipboard(selectedObjects.length > 0 ? selectedObjects[0] : (activeObject as any).toJSON?.() || activeObject)
      }
      // Paste
      if (ctrlKey && e.key === 'v' && clipboard) {
        e.preventDefault()
        try {
          const pastedObject = {
            ...clipboard,
            left: (clipboard.left || 0) + 20,
            top: (clipboard.top || 0) + 20,
          }
          editor.add(pastedObject)
        } catch (err) {
          console.error('Error pasting:', err)
        }
      }
      // Duplicate
      if (ctrlKey && e.key === 'd' && activeObject) {
        e.preventDefault()
        editor.clone()
      }
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeObject) {
        // Don't delete if user is typing in an input
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return
        }
        e.preventDefault()
        editor.delete()
      }
      // Undo
      if (ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        editor.undo()
      }
      // Redo
      if (ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        editor.redo()
      }
      // Bring Forward
      if (ctrlKey && e.key === ']' && activeObject) {
        e.preventDefault()
        editor.bringForward()
      }
      // Send Backward
      if (ctrlKey && e.key === '[' && activeObject) {
        e.preventDefault()
        editor.sendBackwards()
      }
      // Bring to Front
      if (ctrlKey && e.shiftKey && e.key === ']' && activeObject) {
        e.preventDefault()
        editor.bringToFront()
      }
      // Send to Back
      if (ctrlKey && e.shiftKey && e.key === '[' && activeObject) {
        e.preventDefault()
        editor.sendToBack()
      }
    }

    document.addEventListener('keydown', handleKeyboardShortcuts)
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [editor, activeObject, clipboard])

  const handleCopy = () => {
    if (activeObject && editor) {
      const json = editor.exportToJSON()
      const selectedObjects = json.objects.filter((obj: any) => {
        // Find the active object in the exported JSON
        return obj.id === (activeObject as any).id
      })
      setClipboard(selectedObjects.length > 0 ? selectedObjects[0] : activeObject.toJSON())
    }
    setVisible(false)
  }

  const handlePaste = () => {
    if (clipboard && editor) {
      try {
        const pastedObject = {
          ...clipboard,
          left: (clipboard.left || 0) + 20,
          top: (clipboard.top || 0) + 20,
        }
        editor.add(pastedObject)
      } catch (err) {
        console.error('Error pasting:', err)
      }
    }
    setVisible(false)
  }

  const handleDuplicate = () => {
    if (activeObject && editor) {
      editor.clone()
    }
    setVisible(false)
  }

  const handleDelete = () => {
    if (activeObject && editor) {
      editor.delete()
    }
    setVisible(false)
  }

  const handleLock = () => {
    if (activeObject && editor) {
      editor.lock()
    }
    setVisible(false)
  }

  const handleUnlock = () => {
    if (activeObject && editor) {
      editor.unlock()
    }
    setVisible(false)
  }

  const handleBringForward = () => {
    if (activeObject && editor) {
      try {
        editor.bringForward()
        // Force canvas re-render
        // @ts-ignore
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && canvas.requestRenderAll) {
          canvas.requestRenderAll()
        }
      } catch (error) {
        console.error('Error bringing forward:', error)
        // Fallback: use canvas directly
        // @ts-ignore
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && activeObject) {
          canvas.bringForward(activeObject)
          canvas.requestRenderAll()
        }
      }
    }
    setVisible(false)
  }

  const handleSendBackward = () => {
    if (activeObject && editor) {
      try {
        editor.sendBackwards()
        // Force canvas re-render
        // @ts-ignore
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && canvas.requestRenderAll) {
          canvas.requestRenderAll()
        }
      } catch (error) {
        console.error('Error sending backward:', error)
        // Fallback: use canvas directly
        // @ts-ignore
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && activeObject) {
          canvas.sendBackwards(activeObject)
          canvas.requestRenderAll()
        }
      }
    }
    setVisible(false)
  }

  const handleBringToFront = () => {
    if (activeObject && editor) {
      try {
        editor.bringToFront()
        // Force canvas re-render
        // @ts-ignore
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && canvas.requestRenderAll) {
          canvas.requestRenderAll()
        }
      } catch (error) {
        console.error('Error bringing to front:', error)
        // Fallback: use canvas directly
        // @ts-ignore
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && activeObject) {
          canvas.bringToFront(activeObject)
          canvas.requestRenderAll()
        }
      }
    }
    setVisible(false)
  }

  const handleSendToBack = () => {
    if (activeObject && editor) {
      try {
        editor.sendToBack()
        // Force canvas re-render
        // @ts-ignore
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && canvas.requestRenderAll) {
          canvas.requestRenderAll()
        }
      } catch (error) {
        console.error('Error sending to back:', error)
        // Fallback: use canvas directly
        // @ts-ignore
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && activeObject) {
          canvas.sendToBack(activeObject)
          canvas.requestRenderAll()
        }
      }
    }
    setVisible(false)
  }

  const handleFlipHorizontal = () => {
    if (activeObject && editor) {
      // @ts-ignore - flipX is a fabric.js property
      const currentFlipX = (activeObject as any).flipX || false
      editor.update({ flipX: !currentFlipX })
    }
    setVisible(false)
  }

  const handleFlipVertical = () => {
    if (activeObject && editor) {
      // @ts-ignore - flipY is a fabric.js property
      const currentFlipY = (activeObject as any).flipY || false
      editor.update({ flipY: !currentFlipY })
    }
    setVisible(false)
  }

  const handleGroup = () => {
    if (editor) {
      editor.group()
    }
    setVisible(false)
  }

  const handleUngroup = () => {
    if (editor) {
      editor.ungroup()
    }
    setVisible(false)
  }

  const isLocked = activeObject && (activeObject as any).locked

  if (!visible) return null

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const ctrlSymbol = isMac ? '⌘' : 'Ctrl'

  return (
    <>
      <MenuOverlay onClick={() => setVisible(false)} />
      <MenuContainer
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {activeObject ? (
          <>
            <SubMenuLabel>Edit</SubMenuLabel>
            <MenuItem onClick={handleCopy}>
              <Copy size={16} />
              Copy
              <Shortcut>{ctrlSymbol}+C</Shortcut>
            </MenuItem>
            <MenuItem onClick={handlePaste} $disabled={!clipboard}>
              <Clipboard size={16} />
              Paste
              <Shortcut>{ctrlSymbol}+V</Shortcut>
            </MenuItem>
            <MenuItem onClick={handleDuplicate}>
              <Copy size={16} />
              Duplicate
              <Shortcut>{ctrlSymbol}+D</Shortcut>
            </MenuItem>
            <MenuItem onClick={handleDelete}>
              <Trash2 size={16} />
              Delete
              <Shortcut>Del</Shortcut>
            </MenuItem>

            <MenuDivider />
            <SubMenuLabel>Arrange</SubMenuLabel>
            <MenuItem onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleBringToFront()
            }}>
              <ChevronsUp size={16} />
              Bring to Front
              <Shortcut>{ctrlSymbol}+Shift+]</Shortcut>
            </MenuItem>
            <MenuItem onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleBringForward()
            }}>
              <ArrowUp size={16} />
              Bring Forward
              <Shortcut>{ctrlSymbol}+]</Shortcut>
            </MenuItem>
            <MenuItem onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleSendBackward()
            }}>
              <ArrowDown size={16} />
              Send Backward
              <Shortcut>{ctrlSymbol}+[</Shortcut>
            </MenuItem>
            <MenuItem onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleSendToBack()
            }}>
              <ChevronsDown size={16} />
              Send to Back
              <Shortcut>{ctrlSymbol}+Shift+[</Shortcut>
            </MenuItem>

            <MenuDivider />
            <SubMenuLabel>Transform</SubMenuLabel>
            <MenuItem onClick={handleFlipHorizontal}>
              <FlipHorizontal size={16} />
              Flip Horizontal
            </MenuItem>
            <MenuItem onClick={handleFlipVertical}>
              <FlipVertical size={16} />
              Flip Vertical
            </MenuItem>

            <MenuDivider />
            <MenuItem onClick={isLocked ? handleUnlock : handleLock}>
              {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
              {isLocked ? 'Unlock' : 'Lock'}
            </MenuItem>
            <MenuItem onClick={handleGroup}>
              <Group size={16} />
              Group
              <Shortcut>{ctrlSymbol}+G</Shortcut>
            </MenuItem>
            <MenuItem onClick={handleUngroup}>
              <Ungroup size={16} />
              Ungroup
              <Shortcut>{ctrlSymbol}+Shift+G</Shortcut>
            </MenuItem>
          </>
        ) : (
          <>
            <MenuItem onClick={handlePaste} $disabled={!clipboard}>
              <Clipboard size={16} />
              Paste
              <Shortcut>{ctrlSymbol}+V</Shortcut>
            </MenuItem>
            <MenuDivider />
            <MenuItem onClick={() => { setVisible(false); }} $disabled>
              <Layers size={16} />
              Select All
              <Shortcut>{ctrlSymbol}+A</Shortcut>
            </MenuItem>
          </>
        )}
      </MenuContainer>
    </>
  )
}

export default ContextMenu
