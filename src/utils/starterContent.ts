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

export type StarterKind = 'doc' | 'whiteboard' | 'presentation' | 'social' | 'poster'

function addText(
  editor: any,
  canvas: any,
  text: string,
  left: number,
  top: number,
  width: number,
  fontSize: number,
  fontWeight: number,
  fill: string,
  textAlign: 'left' | 'center' | 'right',
  fontFamily = 'Poppins'
) {
  addObjectToCanvas(
    editor,
    {
      type: 'StaticText',
      left,
      top,
      width,
      metadata: { text, fontSize, fontWeight, fontFamily, fill, textAlign },
    },
    width,
    canvas
  )
}

export function addStarterContent(editor: any, canvas: any, kind: StarterKind): void {
  if (!editor || !canvas) return
  const { l, t, w, h } = frameBounds(canvas)
  const pad = Math.round(w * 0.07)

  if (kind === 'presentation') {
    const cw = w - pad * 2
    addText(editor, canvas, 'Presentation title', l + pad, t + Math.round(h * 0.36), cw, Math.max(40, Math.round(w * 0.05)), 800, '#111827', 'center')
    addText(editor, canvas, 'Add your subtitle — click to edit', l + pad, t + Math.round(h * 0.36) + Math.round(w * 0.05) + 24, cw, Math.max(18, Math.round(w * 0.022)), 400, '#6b7280', 'center', 'Arial')
    return
  }

  if (kind === 'social') {
    const cw = w - pad * 2
    // accent bar
    addObjectToCanvas(
      editor,
      { type: 'StaticRect', left: l + pad, top: t + Math.round(h * 0.3), width: Math.round(w * 0.16), height: Math.max(8, Math.round(h * 0.012)), rx: 6, ry: 6, metadata: { fill: '#6366f1' } },
      Math.round(w * 0.16),
      canvas
    )
    addText(editor, canvas, 'Your headline here', l + pad, t + Math.round(h * 0.36), cw, Math.max(40, Math.round(w * 0.08)), 800, '#111827', 'left')
    addText(editor, canvas, 'Add a short supporting line.', l + pad, t + Math.round(h * 0.36) + Math.round(w * 0.08) + 18, cw, Math.max(16, Math.round(w * 0.03)), 400, '#6b7280', 'left', 'Arial')
    return
  }

  if (kind === 'poster') {
    const cw = w - pad * 2
    addText(editor, canvas, 'POSTER TITLE', l + pad, t + Math.round(h * 0.16), cw, Math.max(60, Math.round(w * 0.1)), 800, '#111827', 'center')
    addText(editor, canvas, 'Subtitle or tagline goes here', l + pad, t + Math.round(h * 0.16) + Math.round(w * 0.1) + 30, cw, Math.max(24, Math.round(w * 0.04)), 500, '#374151', 'center', 'Arial')
    addText(editor, canvas, 'Date · Time · Location', l + pad, t + Math.round(h * 0.82), cw, Math.max(20, Math.round(w * 0.032)), 400, '#6b7280', 'center', 'Arial')
    return
  }

  if (kind === 'doc') {
    // Canva-Docs-style empty document: a single large serif prompt block at the
    // top, left-aligned, that the user types over.
    const cw = w - pad * 2
    addText(
      editor,
      canvas,
      'Start typing…',
      l + pad,
      t + pad,
      cw,
      Math.max(30, Math.round(w * 0.04)),
      500,
      '#9aa0a6',
      'left',
      'Lora'
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
