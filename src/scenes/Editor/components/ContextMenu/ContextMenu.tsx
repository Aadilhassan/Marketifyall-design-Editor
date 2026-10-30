import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { styled } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { selectObject } from '@/utils/selectObject'
import { sendToBackSafe, sendBackwardsSafe } from '@/utils/layering'
import { isRawObject } from '@/utils/designJson'
import { fabric as fabricLib } from 'fabric'
import { getFabricCanvas } from '@/utils/magicResize'
import { fail, log } from '@/lib/logger'
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
  // long-pressed near the bottom of a phone: scroll instead of running off-screen
  maxHeight: 'calc(100vh - 16px)',
  zIndex: 1001,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  overflowX: 'hidden',
  overflowY: 'auto',
})

const MenuItem = styled('div', (props: { $disabled?: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '10px 16px',
  cursor: props.$disabled ? 'not-allowed' : 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  color: props.$disabled ? '#a39d8c' : '#3a352b',
  transition: 'all 0.15s ease',
  gap: '12px',
  ':hover': {
    backgroundColor: props.$disabled ? 'transparent' : '#f3efe4',
    color: props.$disabled ? '#a39d8c' : '#d8401c',
  },
  '@media (pointer: coarse)': {
    minHeight: '44px',
    fontSize: '14px',
  },
}))

const MenuDivider = styled('div', {
  height: '1px',
  backgroundColor: '#e6e0d2',
  margin: '6px 0',
})

const Shortcut = styled('span', {
  marginLeft: 'auto',
  fontSize: '11px',
  color: '#a39d8c',
  fontWeight: '500',
  backgroundColor: '#f3efe4',
  padding: '2px 6px',
  borderRadius: '4px',
  // no keyboard on touch devices: hide the shortcut hints
  '@media (pointer: coarse)': {
    display: 'none',
  },
})

const SubMenuLabel = styled('div', {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  fontSize: '11px',
  fontWeight: '600',
  color: '#a39d8c',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

interface ContextMenuProps {
  canvasRef?: React.RefObject<HTMLDivElement>
}

/**
 * Clipboard payload for paste via editor.add(). Scenify-typed objects use the
 * exported (frame-relative) JSON the SDK expects; plain fabric objects use their
 * own absolute JSON, since exports now store those frame-relative.
 */
/**
 * Paste 20px down-right of the source. editor.add() only understands
 * scenify-typed objects (a plain fabric object makes it throw), so plain
 * objects are revived with fabric directly.
 */
function pasteClipboard(editor: any, clip: any): void {
  const data = { ...clip, left: (clip.left || 0) + 20, top: (clip.top || 0) + 20 }
  if (!isRawObject(data)) {
    editor.add(data)
    return
  }
  const canvas = getFabricCanvas(editor)
  delete data.id
  fabricLib.util.enlivenObjects([data], (objs: any[]) => {
    const obj = objs[0]
    if (!obj || !canvas) return
    canvas.add(obj)
    selectObject(canvas, obj)
    canvas.fire('object:modified', { target: obj })
  }, '')
}

function clipboardJsonOf(editor: any, obj: any): any {
  if (isRawObject(obj)) return obj.toJSON?.(['metadata', 'id', 'name']) || obj
  const json = editor.exportToJSON()
  const found = json.objects.find((o: any) => o.id === obj.id)
  return found || obj.toJSON?.() || obj
}

function ContextMenu({ canvasRef }: ContextMenuProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
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
  // Keyboard shortcuts. Registered in CAPTURE phase and stopPropagation()'d for
  // keys we handle, so the SDK's own wrapperEl keydown handler cannot ALSO fire
  // (that caused double paste / double undo-redo / a phantom delete-history entry,
  // and made shortcuts behave differently depending on focus). Bails entirely
  // while editing text or typing in an input so those keys reach the field.
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if (!editor) return

      const target = e.target as HTMLElement | null
      const isEditing =
        !!(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) ||
        !!(activeObject as any)?.isEditing
      if (isEditing) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey
      let handled = false

      if (ctrlKey && e.key === 'c' && activeObject) {
        setClipboard(clipboardJsonOf(editor, activeObject))
        handled = true
      } else if (ctrlKey && e.key === 'v' && clipboard) {
        try {
          pasteClipboard(editor, clipboard)
        } catch (err) {
          fail('edit', 'Paste failed — check clipboard permissions', err)
        }
        handled = true
      } else if (ctrlKey && e.key === 'd' && activeObject) {
        editor.clone()
        // Record the copy in history and sync React selection to it (see Duplicate.tsx).
        setTimeout(() => {
          try {
            const cv = (editor as any)?.canvas?.canvas || (editor as any)?.canvas
            const o = cv?.getActiveObject?.()
            if (cv && o) {
              cv.fire('object:modified', { target: o })
              selectObject(cv, o)
            }
          } catch (err) {
            fail('edit', 'Duplicate failed', err)
          }
        }, 80)
        handled = true
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && activeObject) {
        editor.delete()
        handled = true
      } else if (ctrlKey && e.key === 'z' && !e.shiftKey) {
        editor.undo()
        handled = true
      } else if (ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        editor.redo()
        handled = true
      } else if (ctrlKey && e.shiftKey && e.key === ']' && activeObject) {
        editor.bringToFront()
        handled = true
      } else if (ctrlKey && e.shiftKey && e.key === '[' && activeObject) {
        sendToBackSafe((editor as any)?.canvas?.canvas || (editor as any)?.canvas, activeObject)
        handled = true
      } else if (ctrlKey && e.key === ']' && activeObject) {
        editor.bringForward()
        handled = true
      } else if (ctrlKey && e.key === '[' && activeObject) {
        sendBackwardsSafe((editor as any)?.canvas?.canvas || (editor as any)?.canvas, activeObject)
        handled = true
      }

      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', handleKeyboardShortcuts, true)
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts, true)
  }, [editor, activeObject, clipboard])

  const handleCopy = () => {
    if (activeObject && editor) {
      setClipboard(clipboardJsonOf(editor, activeObject))
    }
    setVisible(false)
  }

  const handlePaste = () => {
    if (clipboard && editor) {
      try {
        pasteClipboard(editor, clipboard)
      } catch (err) {
        log.warn('edit', 'context-menu action failed', err)
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
        // @ts-expect-error -- Scenify SDK internal canvas access
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && canvas.requestRenderAll) {
          canvas.requestRenderAll()
        }
      } catch (error) {
        // Fallback: use canvas directly
        // @ts-expect-error -- Scenify SDK internal canvas access
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
      // @ts-expect-error -- Scenify SDK internal canvas access
      const canvas = editor.canvas?.canvas || editor.canvas
      sendBackwardsSafe(canvas, activeObject)
    }
    setVisible(false)
  }

  const handleBringToFront = () => {
    if (activeObject && editor) {
      try {
        editor.bringToFront()
        // Force canvas re-render
        // @ts-expect-error -- Scenify SDK internal canvas access
        const canvas = editor.canvas?.canvas || editor.canvas
        if (canvas && canvas.requestRenderAll) {
          canvas.requestRenderAll()
        }
      } catch (error) {
        // Fallback: use canvas directly
        // @ts-expect-error -- Scenify SDK internal canvas access
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
      // @ts-expect-error -- Scenify SDK internal canvas access
      const canvas = editor.canvas?.canvas || editor.canvas
      sendToBackSafe(canvas, activeObject)
    }
    setVisible(false)
  }

  const handleFlipHorizontal = () => {
    if (activeObject && editor) {
      const currentFlipX = (activeObject as any).flipX || false
      editor.update({ flipX: !currentFlipX })
    }
    setVisible(false)
  }

  const handleFlipVertical = () => {
    if (activeObject && editor) {
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

  // Keep the menu on screen (right/bottom edges, small phones).
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!visible || !el) return
    const r = el.getBoundingClientRect()
    const x = Math.max(8, Math.min(position.x, window.innerWidth - r.width - 8))
    const y = Math.max(8, Math.min(position.y, window.innerHeight - r.height - 8))
    if (x !== position.x || y !== position.y) setPosition({ x, y })
  }, [visible, position])

  const isLocked = activeObject && (activeObject as any).locked

  if (!visible) return null

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const ctrlSymbol = isMac ? '⌘' : 'Ctrl'

  return (
    <>
      <MenuOverlay onClick={() => setVisible(false)} />
      <MenuContainer
        ref={menuRef}
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
