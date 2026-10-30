import Icons from '../../Icons'
import { Button, SHAPE, KIND, SIZE } from 'baseui/button'
import { ChevronDown } from 'baseui/icon'
import { useStyletron } from 'baseui'
import useAppContext from '@/hooks/useAppContext'
import { SubMenuType } from '@/constants/editor'
import { useEffect, useState } from 'react'
import { useActiveObject, useEditor } from '@nkyo/scenify-sdk'
import Spacing from './components/Spacing'
import { commonItems } from './components/Common'
import OverflowBar, { OverflowDivider, OverflowSpacer } from '../OverflowBar'
import Animate from './components/Animate'
import { Sparkles, CaseUpper, List, ListOrdered } from 'lucide-react'
import { applyList, detectList, nextListMode, toggleUpper } from '@/utils/textFormat'

interface TextOptions {
  fontFamily: string
  fontSize: number
  fontWeight: string | number
  opacity: number[]
  italic: string
  textAligh: string
  underline: string
  fill: string
}

const defaultOptions = {
  fontFamily: 'Open Sans',
  fontWeight: 'normal',
  fontSize: 12,
  opacity: [1],
  italic: 'true',
  textAligh: 'center',
  underline: 'true',
  fill: '#000000',
}

function Text() {
  const { setActiveSubMenu } = useAppContext()
  const activeObject = useActiveObject<fabric.TextOptions>()
  const [css] = useStyletron()
  const [options, setOptions] = useState<TextOptions>(defaultOptions)
  const editor = useEditor()
  useEffect(() => {
    updateOptions(activeObject)
  }, [activeObject])

  useEffect(() => {
    const handleChanges = () => {
      updateOptions(activeObject)
    }
    editor.on('history:changed', handleChanges)
    return () => {
      editor.off('history:changed', handleChanges)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const updateOptions = (object: fabric.TextOptions) => {
    const textOptions = {
      fontFamily: object.fontFamily,
      fontSize: object.fontSize,
      fontWeight: object.fontWeight,
      opacity: [object.opacity * 100],
      italic: object.fontStyle,
      textAligh: object.textAlign,
      underline: object.underline,
      fill: object.fill,
    } as unknown as TextOptions
    setOptions(textOptions)
  }

  const checkBold = (value: string | number) => {
    return value === 'bold' || value === 700
  }

  const toggleBold = () => {
    const isBold = checkBold(options.fontWeight)
    editor.update({ fontWeight: isBold ? 400 : 700 })
  }

  const toggleUnderline = () => {
    editor.update({ underline: activeObject.underline ? false : true })
  }

  const checkIsItalic = (value: string) => {
    const isItalic = value === 'italic'
    return isItalic
  }

  const toggleItalic = () => {
    const isItalic = checkIsItalic(activeObject.fontStyle)
    editor.update({ fontStyle: isItalic ? 'normal' : 'italic' })
  }

  const getNextTextAlign = (current: string) => {
    const positions = ['left', 'center', 'right', 'left']
    const currentIndex = positions.findIndex(v => v === current)
    const nextAlign = positions[currentIndex + 1]
    return nextAlign
  }

  const toggleTextAlign = () => {
    const currentValue = activeObject.textAlign
    const nextTextAlign = getNextTextAlign(currentValue)
    editor.update({ textAlign: nextTextAlign })
  }

  const getTextAlignIcon = () => {
    const currentValue = activeObject.textAlign
    const Icon =
      currentValue === 'left'
        ? Icons.TextAlignLeft
        : currentValue === 'center'
        ? Icons.TextAlignCenter
        : currentValue === 'right'
        ? Icons.TextAlignRight
        : Icons.TextAlignJustify
    return Icon
  }

  const updateFontSize = (value: number) => {
    editor.update({ fontSize: value })
  }

  const TextAlignIcon = getTextAlignIcon()

  // Case & lists rewrite the text itself (fabric has no text-transform/lists).
  const setText = (next: string, metadata?: Record<string, unknown>) => {
    const obj: any = activeObject
    const canvas: any = (editor as any)?.handlers?.canvas
    if (!obj || !canvas) return
    obj.set('text', next)
    if (metadata) obj.set('metadata', { ...(obj.metadata || {}), ...metadata })
    obj.initDimensions?.()
    obj.setCoords()
    canvas.requestRenderAll()
    canvas.fire('object:modified', { target: obj })
  }
  const isUpper = (activeObject as any)?.metadata?.caseOriginal != null
  const listMode = detectList(((activeObject as any)?.text as string) || '')
  const toggleCase = () => {
    const obj: any = activeObject
    const r = toggleUpper(obj?.text || '', obj?.metadata?.caseOriginal)
    setText(r.text, { caseOriginal: r.original })
  }
  const cycleList = () => setText(applyList((activeObject as any)?.text || '', nextListMode(listMode)))
  const ListIcon = listMode === 'number' ? ListOrdered : List

  const buttonStyles = css({
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0 8px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    ':hover': {
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
  })

  const inputStyles = css({
    width: '50px',
    border: 'none',
    textAlign: 'center',
    outline: 'none',
    fontSize: '14px',
    ':focus': {
      outline: 'none',
    },
  })

  return (
    <OverflowBar>
      <Button
        onClick={() => setActiveSubMenu(SubMenuType.FONT_FAMILY)}
        overrides={{
          BaseButton: {
            style: {
              borderBottomColor: 'rgba(0,0,0,0.2)',
              borderBottomStyle: 'solid',
              borderBottomWidth: '1px',
              borderTopColor: 'rgba(0,0,0,0.2)',
              borderTopStyle: 'solid',
              borderTopWidth: '1px',
              borderRightColor: 'rgba(0,0,0,0.2)',
              borderRightStyle: 'solid',
              borderRightWidth: '1px',
              borderLeftColor: 'rgba(0,0,0,0.2)',
              borderLeftStyle: 'solid',
              borderLeftWidth: '1px',
              fontSize: '14px',
            },
          },
        }}
        kind={KIND.tertiary}
        size={SIZE.mini}
        endEnhancer={() => <ChevronDown size={24} />}
      >
        {options.fontFamily}
      </Button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid rgba(0,0,0,0.2)',
          borderRadius: '4px',
          height: '32px',
          width: '100px',
          overflow: 'hidden',
          marginLeft: '12px',
          marginRight: '12px',
        }}
      >
        <button
          onClick={() => updateFontSize(Math.max(1, Math.floor(activeObject.fontSize) - 1))}
          className={buttonStyles}
        >
          -
        </button>
        <input
          type="number"
          value={Math.round(activeObject.fontSize * 10) / 10}
          onChange={e => {
            const value = parseFloat(e.target.value)
            if (!isNaN(value) && value > 0) {
              updateFontSize(value)
            }
          }}
          className={inputStyles}
          min="1"
          step="0.1"
        />
        <button
          onClick={() => updateFontSize(Math.floor(activeObject.fontSize) + 1)}
          className={buttonStyles}
        >
          +
        </button>
      </div>

      <Button
        onClick={() => setActiveSubMenu(SubMenuType.COLOR)}
        size={SIZE.compact}
        kind={KIND.tertiary}
        shape={SHAPE.square}
      >
        <Icons.TextColor color={options.fill} size={24} />
      </Button>
      <Button
        onClick={toggleBold}
        overrides={{
          BaseButton: { style: { color: checkBold(options.fontWeight) ? '#000000' : '#afafaf' } },
        }}
        size={SIZE.compact}
        kind={KIND.tertiary}
        shape={SHAPE.square}
      >
        <Icons.Bold size={24} />
      </Button>
      <Button
        overrides={{
          BaseButton: { style: { color: checkIsItalic(activeObject.fontStyle) ? '#000000' : '#afafaf' } },
        }}
        onClick={toggleItalic}
        size={SIZE.compact}
        kind={KIND.tertiary}
        shape={SHAPE.square}
      >
        <Icons.Italic size={24} />
      </Button>
      <Button
        overrides={{
          BaseButton: { style: { color: activeObject.underline ? '#000000' : '#afafaf' } },
        }}
        onClick={toggleUnderline}
        size={SIZE.compact}
        kind={KIND.tertiary}
        shape={SHAPE.square}
      >
        <Icons.Underline size={24} />
      </Button>
      <OverflowDivider />
      <Button onClick={toggleTextAlign} size={SIZE.compact} kind={KIND.tertiary} shape={SHAPE.square}>
        <TextAlignIcon size={24} />
      </Button>
      <Button
        onClick={cycleList}
        size={SIZE.compact}
        kind={KIND.tertiary}
        shape={SHAPE.square}
        aria-label="List style"
        overrides={{
          BaseButton: {
            props: {
              title:
                listMode === 'none'
                  ? 'Bulleted list'
                  : listMode === 'bullet'
                  ? 'Numbered list'
                  : 'Remove list',
            },
            style: listMode !== 'none' ? { backgroundColor: '#fbe8e0', color: '#d8401c' } : {},
          },
        }}
      >
        <ListIcon size={20} />
      </Button>
      <Button
        onClick={toggleCase}
        size={SIZE.compact}
        kind={KIND.tertiary}
        shape={SHAPE.square}
        aria-label="Uppercase"
        overrides={{
          BaseButton: {
            props: { title: isUpper ? 'Back to original case' : 'UPPERCASE', 'aria-pressed': isUpper },
            style: isUpper ? { backgroundColor: '#fbe8e0', color: '#d8401c' } : {},
          },
        }}
      >
        <CaseUpper size={20} />
      </Button>
      <OverflowDivider />
      <Spacing />
      <Button
        onClick={() => setActiveSubMenu(SubMenuType.TEXT_EFFECTS)}
        size={SIZE.compact}
        kind={KIND.tertiary}
        startEnhancer={() => <Sparkles size={18} />}
      >
        Effects
      </Button>
      <Animate />
      <OverflowSpacer />
      {commonItems()}
    </OverflowBar>
  )
}

export default Text
