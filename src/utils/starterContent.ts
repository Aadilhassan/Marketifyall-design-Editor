/**
 * Tailored starter content for "quick start" categories that benefit from a
 * pre-populated canvas (Doc, Whiteboard). Objects are added inside the design
 * frame via the shared addObjectToCanvas helper so they behave like any other
 * editable element and are picked up by auto-save.
 */
import { addObjectToCanvas } from './editorHelpers'

function frameBounds(canvas: any): { l: number; t: number; w: number; h: number } {
  const clip = canvas && canvas.clipPath
  if (clip) {
    return {
      l: clip.left || 0,
      t: clip.top || 0,
      w: (clip.width || 900) * (clip.scaleX || 1),
      h: (clip.height || 1200) * (clip.scaleY || 1),
    }
  }
  return { l: 0, t: 0, w: 900, h: 1200 }
}

export type StarterKind = 'doc' | 'whiteboard'

export function addStarterContent(editor: any, canvas: any, kind: StarterKind): void {
  if (!editor || !canvas) return
  const { l, t, w, h } = frameBounds(canvas)
  const pad = Math.round(w * 0.07)

  if (kind === 'doc') {
    const titleSize = Math.max(28, Math.round(w * 0.06))
    addObjectToCanvas(
      editor,
      {
        type: 'StaticText',
        left: l + pad,
        top: t + pad,
        width: w - pad * 2,
        metadata: {
          text: 'Document title',
          fontSize: titleSize,
          fontWeight: 700,
          fontFamily: 'Poppins',
          fill: '#111827',
          textAlign: 'left',
        },
      },
      w - pad * 2,
      canvas
    )
    addObjectToCanvas(
      editor,
      {
        type: 'StaticText',
        left: l + pad,
        top: t + pad + titleSize + 28,
        width: w - pad * 2,
        metadata: {
          text: 'Start writing your document here. Click any text to edit it, change the font and colour, and add your own content.',
          fontSize: Math.max(16, Math.round(w * 0.026)),
          fontWeight: 400,
          fontFamily: 'Arial',
          fill: '#374151',
          textAlign: 'left',
        },
      },
      w - pad * 2,
      canvas
    )
    return
  }

  if (kind === 'whiteboard') {
    addObjectToCanvas(
      editor,
      {
        type: 'StaticText',
        left: l + pad,
        top: t + pad,
        width: w - pad * 2,
        metadata: {
          text: 'Whiteboard',
          fontSize: Math.max(32, Math.round(h * 0.06)),
          fontWeight: 700,
          fontFamily: 'Poppins',
          fill: '#111827',
          textAlign: 'left',
        },
      },
      w - pad * 2,
      canvas
    )

    const notes = [
      { fill: '#FEF3C7', text: 'Idea' },
      { fill: '#DBEAFE', text: 'To do' },
      { fill: '#FCE7F3', text: 'Notes' },
    ]
    const size = Math.round(Math.min(w, h) * 0.22)
    const gap = Math.round(size * 0.28)
    const startTop = t + pad + Math.round(h * 0.14)
    notes.forEach((n, i) => {
      const nl = l + pad + i * (size + gap)
      addObjectToCanvas(
        editor,
        {
          type: 'StaticRect',
          left: nl,
          top: startTop,
          width: size,
          height: size,
          rx: 14,
          ry: 14,
          metadata: { fill: n.fill },
        },
        size,
        canvas
      )
      addObjectToCanvas(
        editor,
        {
          type: 'StaticText',
          left: nl + 18,
          top: startTop + 18,
          width: size - 36,
          metadata: {
            text: n.text,
            fontSize: Math.round(size * 0.12),
            fontWeight: 600,
            fontFamily: 'Poppins',
            fill: '#374151',
            textAlign: 'left',
          },
        },
        size - 36,
        canvas
      )
    })
  }
}
