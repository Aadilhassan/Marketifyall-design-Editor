import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Select } from 'baseui/select'
import { styled } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { marketifyallApi, CREDIT_COSTS } from '@/services/marketifyall-api'
import { improvePrompt } from '@/services/openrouter'
import { useCredits } from '@/contexts/CreditsContext'
import { searchPexelsImages } from '@/services/pexels'
import { getIconsByCategory, svgToBase64 } from '@/utils/lucideIconsManager'
import { searchIconify, fetchIconifySvg } from '@/services/illustrations'
import { fail, ignoreError } from '@/lib/logger'

// ─── Types ──────────────────────────────────────────────────

interface DesignAction {
  type: 'addText' | 'addImage' | 'addShape' | 'setBackground' | 'setFont' | 'addIcon' | 'addIllustration' | 'layout' | 'clearCanvas'
  params: Record<string, any>
  description: string
}

interface DesignPlan {
  concept: string
  layout: string
  palette: string[]
  fonts: { headline: string; body: string }
  imagery: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  plan?: DesignPlan
  actions?: DesignAction[]
  actionStatuses?: Record<number, 'pending' | 'running' | 'done' | 'error'>
  suggestions?: string[]
}

// ─── Constants ──────────────────────────────────────────────

const IMAGE_SIZES = [
  { label: 'Square (1024x1024)', id: '1024x1024' },
  { label: 'Portrait (768x1024)', id: '768x1024' },
  { label: 'Landscape (1024x768)', id: '1024x768' },
  { label: 'Small Square (512x512)', id: '512x512' },
]

const QUICK_PROMPTS = [
  'Social media post for summer sale',
  'Professional business card',
  'YouTube thumbnail for tech video',
  'Birthday party invitation',
  'Restaurant menu header',
  'Motivational quote poster',
  'Event flyer for music concert',
  'Product launch announcement',
]

const buildSystemPrompt = (w: number, h: number) => {
  const m = Math.round(Math.min(w, h) * 0.07)        // safe margin (~7%)
  const cx = Math.round(w / 2), cy = Math.round(h / 2)
  const headMin = Math.round(w * 0.07), headMax = Math.round(w * 0.1)
  const subMin = Math.round(w * 0.024), subMax = Math.round(w * 0.034)
  // worked-example bands (proportional → always valid for this canvas)
  const exHeroH = Math.round(h * 0.46)
  const exHeadTop = Math.round(h * 0.54), exHeadFs = Math.round(w * 0.09)
  const exSubTop = Math.round(h * 0.68), exSubFs = Math.round(w * 0.03)
  const exCtaTop = Math.round(h * 0.8)
  return `You are an elite graphic designer AI working inside a professional ${w}x${h}px canvas editor. You produce clean, balanced, magazine-quality layouts by placing every element at precise coordinates — and you NEVER overlap content elements.

## COORDINATE SYSTEM (read carefully)
- Origin (0,0) is the TOP-LEFT corner. x grows right, y grows down. Canvas is ${w} wide x ${h} tall.
- For EVERY element, "left" and "top" are the TOP-LEFT corner of its bounding box (NOT the center).
- An element occupies the rectangle from (left, top) to (left+width, top+height).
- Safe area: keep content within left ∈ [${m}, ${w - m}] and top ∈ [${m}, ${h - m}] (≈${m}px margin).

## NO-OVERLAP RULE — the most important rule
Lay the design out as vertical bands stacked top→bottom. Each CONTENT element occupies its own band; the next element starts BELOW the previous one's bottom edge:
    next.top ≥ previous.top + previous.height + gap        (gap ≈ 24–48px)
Estimate each element's height BEFORE you place the next one:
- Text height ≈ fontSize × 1.3 × (number of lines). A ≤4-word headline at its width is ~1–2 lines.
- Image / shape height = the height you specify.
ONLY two kinds of element may sit behind others: (a) a full-bleed background image/shape covering the whole canvas, or (b) a deliberate semi-transparent overlay shape placed to boost text contrast. Every other element must occupy empty space — no accidental overlaps, ever.

## CENTERING MATH (compute, don't guess)
- Horizontally center an element of width ew:  left = round((${w} − ew) / 2).
- Centered text: set textAlign:"center", pick width (e.g. ${w - 2 * m}), then left = round((${w} − width) / 2).
- Canvas center is (left=${cx}, top=${cy}).

## RESPONSE — JSON ONLY (no prose outside the JSON)
{
  "plan": { "concept": "one sentence", "layout": "name each vertical band and its top→bottom y-range", "palette": ["#hex","#hex","#hex"], "fonts": {"headline":"Google Font","body":"Google Font"}, "imagery": "what photos/illustrations" },
  "message": "friendly 1–2 sentence summary",
  "actions": [ { "type": "...", "params": { ... }, "description": "..." } ],
  "suggestions": ["refinement 1","refinement 2"]
}

## ACTIONS — run in layer order: clearCanvas → background → hero image/overlay → shapes → text → icons
Each action MUST be { "type": "...", "params": { ... }, "description": "..." } (the "params" key is REQUIRED).
- clearCanvas: {} — FIRST action whenever CURRENT CANVAS has elements and the user wants a NEW design.
- setBackground: { color:"#hex" } — almost always first (after clearCanvas). Avoid plain white unless asked.
- addImage: { query:"specific Pexels search", left, top, width, height } — hero/full-bleed = left:0, top:0, width:${w}, height:${h} (or a top band).
- addShape: { shape:"rectangle"|"circle"|"triangle", fill:"#hex", left, top, width, height, rx? } — use as a band or contrast overlay behind text.
- addText: { text, fontFamily, fontSize, fill:"#hex", fontWeight, textAlign, left, top, width } — width controls wrapping; pick a fill that contrasts whatever is directly behind it.
(Compose with backgrounds, images, shapes and text — these are the most reliable, magazine-quality building blocks. Do not use icon or illustration actions.)

## DESIGN QUALITY
- Strong hierarchy: ONE dominant headline (fontSize ${headMin}–${headMax}, bold, ≤4 words), a smaller subhead (fontSize ${subMin}–${subMax}), optional caption.
- Max 2 fonts (a display/headline + a clean body). 3–5 color palette, 60-30-10 balance, generous whitespace.
- Align elements to a shared left edge OR a shared center — be consistent.
- Readability: dark text on light areas, light text on dark areas/overlays.
- 5–8 actions total.

## CURRENT CANVAS
The next message contains a "CURRENT CANVAS" snapshot (size, background, and every existing element with its design-coordinate position/size). Use it:
- Empty → design from scratch.
- Has elements + user wants a NEW design → first action is clearCanvas, then rebuild.
- User wants to tweak/extend → do NOT clear; only add or adjust, and place new elements in empty bands so nothing overlaps what's already there.

## FONTS
Display: Bebas Neue, Anton, Oswald, Abril Fatface, Playfair Display, Archivo Black, Righteous
Sans: Poppins, Montserrat, Inter, Raleway, DM Sans, Lato
Serif: Merriweather, Lora, DM Serif Display
Script: Dancing Script, Pacifico, Great Vibes

## WORKED EXAMPLE — imitate this band spacing (every band starts below the previous bottom)
bg #faf7f2 → hero image (left:0, top:0, ${w}x${exHeroH}) → headline (top:${exHeadTop}, fontSize ${exHeadFs}, centered) → subhead (top:${exSubTop}, fontSize ${exSubFs}, centered) → CTA pill shape + CTA text (top:${exCtaTop}). No two content elements share vertical space.

Be bold, balanced, and precise. JSON only.`
}

// ─── Styled Components (shared) ─────────────────────────────

const Container = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#ffffff',
})

const Header = styled('div', {
  padding: '12px 16px',
  borderBottom: '1px solid #e8e8e8',
})

const HeaderTitle = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
})

const HeaderIcon = styled('div', {
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: '14px',
})

const Title = styled('span', {
  fontSize: '15px',
  fontWeight: 600,
  color: '#1a1a1a',
})

const TabBar = styled('div', {
  display: 'flex',
  gap: '4px',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '3px',
})

const Tab = styled('button', ({ $active }: { $active: boolean }) => ({
  flex: 1,
  padding: '7px 12px',
  borderRadius: '6px',
  border: 'none',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: $active ? '#ffffff' : 'transparent',
  color: $active ? '#1a1a1a' : '#6b7280',
  boxShadow: $active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  ':hover': {
    color: $active ? '#1a1a1a' : '#374151',
  },
}))

// ─── Generate Image styled ──────────────────────────────────

const FormSection = styled('div', {
  padding: '20px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
})

const SectionContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

const Label = styled('label', {
  fontSize: '12px',
  fontWeight: 600,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const GenTextArea = styled('textarea', {
  width: '100%',
  padding: '12px 12px 32px 12px',
  backgroundColor: '#f8f8f8',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  color: '#1a1a1a',
  fontSize: '13px',
  fontFamily: 'inherit',
  lineHeight: '1.5',
  minHeight: '100px',
  resize: 'vertical',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
  ':focus': {
    outline: 'none',
    borderColor: '#667eea',
    backgroundColor: '#fff',
    boxShadow: '0 0 0 3px rgba(102,126,234,0.1)',
  },
})

const GenImproveBtn = styled('button', {
  position: 'absolute',
  bottom: '6px',
  right: '6px',
  background: '#fff',
  border: '1px solid #e0e0e0',
  color: '#666',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 500,
  padding: '3px 8px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '3px',
  ':hover': { borderColor: '#667eea', color: '#667eea' },
})

const GenRow = styled('div', {
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-end',
})

const GenBtn = styled('button', {
  minWidth: '100px',
  minHeight: '40px',
  padding: '8px 16px',
  backgroundColor: '#1a1a1a',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': { backgroundColor: '#333' },
  ':disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
})

const Preview = styled('div', {
  backgroundColor: '#f8f8f8',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  color: '#b0b0b0',
  fontSize: '13px',
  border: '1.5px dashed #e0e0e0',
  overflow: 'hidden',
})

const ActionRow = styled('div', {
  display: 'flex',
  gap: '8px',
  justifyContent: 'flex-end',
  padding: '12px 16px',
  borderTop: '1px solid #e5e7eb',
})

const ActionBtn = styled('button', ({ $variant }: { $variant?: string }) => ({
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  backgroundColor: $variant === 'danger' ? '#ef4444' : '#374151',
  color: '#fff',
  ':hover': { opacity: 0.9 },
}))

// ─── Auto Design styled ────────────────────────────────────

const ChatArea = styled('div', {
  flex: 1,
  overflow: 'hidden',
})

const MessagesWrap = styled('div', {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
})

const Bubble = styled('div', ({ $isUser }: { $isUser: boolean }) => ({
  maxWidth: '90%',
  padding: '10px 14px',
  borderRadius: $isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
  backgroundColor: $isUser ? '#667eea' : '#f3f4f6',
  color: $isUser ? '#fff' : '#1a1a1a',
  alignSelf: $isUser ? 'flex-end' : 'flex-start',
  fontSize: '13px',
  lineHeight: '1.5',
  wordBreak: 'break-word',
}))

const PlanCard = styled('div', {
  margin: '8px 0',
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#faf9ff',
  alignSelf: 'flex-start',
  maxWidth: '90%',
  fontSize: '12px',
  lineHeight: '1.5',
})

const PlanLabel = styled('div', {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#667eea',
  marginBottom: '8px',
})

const PlanRow = styled('div', {
  display: 'flex',
  gap: '6px',
  marginBottom: '6px',
  alignItems: 'flex-start',
})

const PlanKey = styled('span', {
  fontWeight: 600,
  color: '#374151',
  minWidth: '60px',
  flexShrink: 0,
})

const PlanVal = styled('span', {
  color: '#6b7280',
})

const SwatchRow = styled('div', {
  display: 'flex',
  gap: '4px',
  flexWrap: 'wrap',
})

const Swatch = styled('div', ({ $color }: { $color: string }) => ({
  width: '20px',
  height: '20px',
  borderRadius: '4px',
  backgroundColor: $color,
  border: '1px solid rgba(0,0,0,0.1)',
}))

const ActionItemRow = styled('div', ({ $status }: { $status: string }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  backgroundColor:
    $status === 'done' ? '#ecfdf5' :
    $status === 'error' ? '#fef2f2' :
    $status === 'running' ? '#fffbeb' : '#f9fafb',
  color:
    $status === 'done' ? '#065f46' :
    $status === 'error' ? '#991b1b' :
    $status === 'running' ? '#92400e' : '#6b7280',
}))

const StatusDot = styled('div', ({ $status }: { $status: string }) => ({
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '9px',
  flexShrink: 0,
  backgroundColor:
    $status === 'done' ? '#10b981' :
    $status === 'error' ? '#ef4444' :
    $status === 'running' ? '#f59e0b' : '#d1d5db',
  color: '#fff',
}))

const SuggestionChips = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '8px',
  alignSelf: 'flex-start',
})

const Chip = styled('button', {
  padding: '5px 10px',
  borderRadius: '14px',
  border: '1px solid #667eea',
  backgroundColor: 'transparent',
  color: '#667eea',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': { backgroundColor: '#667eea', color: '#fff' },
})

const WelcomeWrap = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: '24px',
  textAlign: 'center',
})

const WelcomeIcon = styled('div', {
  width: '52px',
  height: '52px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '16px',
  fontSize: '24px',
  color: '#fff',
})

const PromptsGrid = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '16px',
  justifyContent: 'center',
})

const PromptBtn = styled('button', {
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#fff',
  color: '#374151',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': { borderColor: '#667eea', color: '#667eea', backgroundColor: '#f8f7ff' },
})

const InputArea = styled('div', {
  padding: '12px 16px',
  borderTop: '1px solid #e8e8e8',
  backgroundColor: '#fafafa',
})

const InputRow = styled('div', {
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-end',
})

const ChatInput = styled('textarea', {
  flex: 1,
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid #e0e0e0',
  fontSize: '13px',
  lineHeight: '1.4',
  resize: 'none',
  minHeight: '40px',
  maxHeight: '100px',
  outline: 'none',
  fontFamily: 'inherit',
  ':focus': { borderColor: '#667eea', boxShadow: '0 0 0 3px rgba(102,126,234,0.1)' },
})

const SendBtn = styled('button', ({ $disabled }: { $disabled: boolean }) => ({
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: $disabled ? '#d1d5db' : '#667eea',
  color: '#fff',
  cursor: $disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'all 0.2s',
  ':hover': { backgroundColor: $disabled ? '#d1d5db' : '#5a6fd6' },
}))

const CostHint = styled('div', {
  fontSize: '10px',
  color: '#9ca3af',
  marginTop: '4px',
  textAlign: 'right',
})

const LoadingDots = styled('div', {
  display: 'flex',
  gap: '4px',
  padding: '8px',
})

// ─── Component ──────────────────────────────────────────────

function AiStudio() {
  const [mode, setMode] = useState<'generate' | 'autopilot'>('autopilot')

  // Shared
  const editor = useEditor()
  const { canvas, frameSize } = useEditorContext() as any
  const { canAfford, refresh } = useCredits()

  // ── Generate Image state ──
  const [genPrompt, setGenPrompt] = useState('')
  const [genSize, setGenSize] = useState([IMAGE_SIZES[0]])
  const [genImage, setGenImage] = useState<string | null>(null)
  const [genLoading, setGenLoading] = useState(false)

  // ── Auto Design state ──
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [designing, setDesigning] = useState(false)
  const scrollRef = useRef<Scrollbars>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Canvas helpers ──

  const getRawCanvas = useCallback(() => {
    const candidates = [canvas, (canvas as any)?.canvas, (editor as any)?.canvas?.canvas, (editor as any)?.canvas]
    return candidates.find((c: any) => c && typeof c.add === 'function') || null
  }, [editor, canvas])

  // Design dimensions (what the AI works with)
  const getDesignSize = useCallback(() => {
    const w = frameSize?.width || 1080
    const h = frameSize?.height || 1080
    return { width: Math.round(w), height: Math.round(h) }
  }, [frameSize])

  // Transform: maps AI design coordinates → FabricJS canvas coordinates
  const getTransform = useCallback(() => {
    const c = getRawCanvas()
    const clip = c?.clipPath
    const ds = getDesignSize()
    if (clip && clip.getBoundingRect) {
      const b = clip.getBoundingRect()
      return { ox: b.left, oy: b.top, sx: b.width / ds.width, sy: b.height / ds.height }
    }
    return { ox: 0, oy: 0, sx: 1, sy: 1 }
  }, [getRawCanvas, getDesignSize])

  const getCanvasBounds = getDesignSize

  // Describe the live canvas to the LLM in DESIGN coordinates so it can place
  // new elements without overlapping, or edit/extend the current design.
  const buildCanvasContext = useCallback(() => {
    const c = getRawCanvas()
    const ds = getDesignSize()
    const t = getTransform()
    const bg = c?.backgroundColor
    const header = `CURRENT CANVAS (${ds.width}x${ds.height})${bg ? `, background ${bg}` : ''}:`
    const objs = (c?.getObjects?.() || []).filter((o: any) => o && o.type !== 'Frame')
    if (!objs.length) return `${header} empty — design from scratch.`

    const lines = objs.map((o: any, i: number) => {
      const r = o.getBoundingRect ? o.getBoundingRect() : { left: o.left, top: o.top, width: o.width, height: o.height }
      const left = Math.round((r.left - t.ox) / t.sx)
      const top = Math.round((r.top - t.oy) / t.sy)
      const width = Math.round(r.width / t.sx)
      const height = Math.round(r.height / t.sy)
      const at = `at (${left},${top}) size ${width}x${height}`
      const ty = String(o.type || '').toLowerCase()
      if (ty.includes('text')) {
        const txt = String(o.text || '').replace(/\s+/g, ' ').trim().slice(0, 40)
        return `[${i}] text "${txt}" ${at}, fontSize ${Math.round((o.fontSize || 0) / t.sx)}, color ${o.fill || '?'}`
      }
      if (ty.includes('image')) return `[${i}] image ${at}`
      return `[${i}] shape ${ty || 'rect'} ${at}, fill ${o.fill || '?'}`
    })
    return `${header}\n${lines.join('\n')}`
  }, [getRawCanvas, getDesignSize, getTransform])

  // ── Execute single canvas action ──

  // Load a Google Font and wait for it
  const loadFont = useCallback(async (fontFamily: string) => {
    const fmtName = fontFamily.replace(/ /g, '+')
    const linkId = `font-ai-${fmtName}`
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${fmtName}:wght@400;500;600;700;800;900&display=swap`
      document.head.appendChild(link)
      await new Promise(r => setTimeout(r, 400))
    }
  }, [])

  // Load image onto canvas with exact position and size
  const placeImage = useCallback((src: string, left: number, top: number, w: number, h: number): Promise<boolean> => {
    const fabric = (window as any).fabric
    const c = getRawCanvas()
    if (!fabric || !c) return Promise.resolve(false)
    return new Promise(resolve => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const scale = Math.min(w / img.width, h / img.height)
        c.add(new fabric.Image(img, {
          left, top, scaleX: scale, scaleY: scale,
          selectable: true, hasControls: true,
        }))
        c.requestRenderAll()
        resolve(true)
      }
      img.onerror = () => resolve(false)
      img.src = src
    })
  }, [getRawCanvas])

  const executeAction = useCallback(async (action: DesignAction): Promise<boolean> => {
    if (!editor) return false
    const fabric = (window as any).fabric
    const c = getRawCanvas()
    if (!fabric || !c) return false

    const p: Record<string, any> = action.params || action
    const ds = getDesignSize()
    const t = getTransform()

    // Convert AI design coords → canvas coords
    const cx = (v: number) => t.ox + v * t.sx
    const cy = (v: number) => t.oy + v * t.sy
    const cw = (v: number) => v * t.sx
    const ch = (v: number) => v * t.sy

    try {
      switch (action.type) {
        case 'clearCanvas': {
          // Remove all design objects (clipPath/frame live outside getObjects, so
          // the canvas frame is preserved) to start a fresh design.
          const existing = c.getObjects ? [...c.getObjects()] : []
          existing.forEach((o: any) => { if (o && o.type !== 'Frame') c.remove(o) })
          c.requestRenderAll()
          return true
        }

        case 'setBackground': {
          const color = p.gradient?.colors?.[0] || p.color || '#ffffff'
          try { editor.background.setBackgroundColor(color) } catch (err) { ignoreError(err, 'background color set failed') }
          return true
        }

        case 'addText': {
          const font = p.fontFamily || 'Open Sans'
          await loadFont(font)
          const fontSize = cw(p.fontSize || 28)
          const width = cw(p.width || ds.width * 0.8)
          const textbox = new fabric.Textbox(p.text || 'Text', {
            left: cx(p.left ?? 40),
            top: cy(p.top ?? ds.height / 2),
            width,
            fontSize,
            fontFamily: font,
            fontWeight: p.fontWeight || 'normal',
            fill: p.fill || '#000000',
            textAlign: p.textAlign || 'left',
            selectable: true, hasControls: true, editable: true,
          })
          c.add(textbox)
          c.requestRenderAll()
          return true
        }

        case 'addShape': {
          const sw = cw(p.width || 150)
          const sh = ch(p.height || 150)
          const sl = cx(p.left ?? (ds.width - (p.width || 150)) / 2)
          const st = cy(p.top ?? (ds.height - (p.height || 150)) / 2)
          let obj: any
          if (p.shape === 'circle') {
            const r = Math.min(sw, sh) / 2
            obj = new fabric.Circle({ left: sl, top: st, radius: r, fill: p.fill || '#5A3FFF' })
          } else if (p.shape === 'triangle') {
            obj = new fabric.Triangle({ left: sl, top: st, width: sw, height: sh, fill: p.fill || '#5A3FFF' })
          } else {
            obj = new fabric.Rect({ left: sl, top: st, width: sw, height: sh, fill: p.fill || '#5A3FFF', rx: cw(p.rx || 0), ry: ch(p.ry || 0) })
          }
          obj.set({ selectable: true, hasControls: true })
          c.add(obj)
          c.requestRenderAll()
          return true
        }

        case 'addImage': {
          const query = p.query || p.search || 'abstract'
          const images = await searchPexelsImages(query, 5).catch(() => null)
          if (!images?.length) return false
          const iw = p.width || ds.width * 0.6
          const ih = p.height || ds.height * 0.6
          return placeImage(
            images[0].src.large,
            cx(p.left ?? (ds.width - iw) / 2),
            cy(p.top ?? (ds.height - ih) / 2),
            cw(iw), ch(ih),
          )
        }

        // NOTE: addIllustration/addIcon are intentionally disabled. The lucide icon
        // renderer (`react-dom/server` in lucideIconsManager) and the iconify loader
        // reference a bare `process` global from a lazily-eval'd vendor scope the app's
        // process polyfill can't reach, throwing "process is not defined" and crashing
        // the panel (ErrorBoundary → "Panel failed to load"). Skip them safely until the
        // icon-rendering path is fixed; designs compose fine with image/shape/text.
        case 'addIllustration':
        case 'addIcon':
          return false

        case 'setFont': {
          await loadFont(p.fontFamily || p.font || 'Open Sans')
          return true
        }

        default: return false
      }
    } catch (err) {
      console.error('[AI Studio] Action failed:', action.type, err)
      return false
    }
  }, [getDesignSize, getTransform, getRawCanvas, editor, loadFont, placeImage])

  // ── Execute action sequence ──

  const executeActions = useCallback(async (actions: DesignAction[], msgId: string) => {
    if (!editor || !actions?.length) return

    const statuses: Record<number, 'pending' | 'running' | 'done' | 'error'> = {}
    actions.forEach((_, i) => { statuses[i] = 'pending' })
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatuses: { ...statuses } } : m))

    for (let i = 0; i < actions.length; i++) {
      statuses[i] = 'running'
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatuses: { ...statuses } } : m))
      await new Promise(r => setTimeout(r, 50))

      const ok = await executeAction(actions[i])
      statuses[i] = ok ? 'done' : 'error'
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatuses: { ...statuses } } : m))
      await new Promise(r => setTimeout(r, 200))
    }
  }, [editor, executeAction])

  // ── Auto-scroll chat ──
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToBottom(), 100)
    return () => clearTimeout(t)
  }, [messages.length])

  // ═══════════════════════════════════════════════════════════
  // ── Generate Image handlers ──
  // ═══════════════════════════════════════════════════════════

  const handleGenerate = useCallback(async () => {
    if (!genPrompt.trim() || genLoading) return
    if (!canAfford('ai_image_generation')) return

    setGenLoading(true)
    try {
      const res = await marketifyallApi.aiProxy(
        'ai_image_generation', 'openai/dall-e-3',
        [{ role: 'user', content: genPrompt }],
        { size: genSize[0].id },
      )
      const content = res.choices?.[0]?.message?.content
      if (content) {
        const urlMatch = content.match(/https?:\/\/[^\s"')]+/)
        setGenImage(urlMatch ? urlMatch[0] : content)
      }
      await refresh()
    } catch (err: any) {
      if (err.response?.status !== 402) alert('Error generating image. Please try again.')
    } finally {
      setGenLoading(false)
    }
  }, [genPrompt, genLoading, genSize, canAfford, refresh])

  const handleGenImprove = useCallback(async () => {
    if (!genPrompt.trim() || genLoading) return
    if (!canAfford('ai_text_generation')) return
    setGenLoading(true)
    try {
      const improved = await improvePrompt(genPrompt)
      setGenPrompt(improved)
      await refresh()
    } catch (err: any) {
      // 402 (out of credits) is surfaced by the credits modal upstream; only
      // network/server failures need their own signal (mirrors handleGenImage).
      if (err?.response?.status !== 402) fail('aiStudio', 'Could not improve the prompt — please try again', err)
    } finally { setGenLoading(false) }
  }, [genPrompt, genLoading, canAfford, refresh])

  const handleGenSave = useCallback(() => {
    if (!genImage) return
    addObjectToCanvas(editor, { type: 'StaticImage', metadata: { src: genImage } }, 400, canvas)
    setGenImage(null)
    setGenPrompt('')
  }, [genImage, editor, canvas])

  // ═══════════════════════════════════════════════════════════
  // ── Auto Design handlers ──
  // ═══════════════════════════════════════════════════════════

  const handleSend = useCallback(async () => {
    if (!chatInput.trim() || designing) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
    }
    setMessages(prev => [...prev, userMsg])
    setChatInput('')
    setDesigning(true)
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const { width: cw, height: ch } = getCanvasBounds()
      const canvasContext = buildCanvasContext()
      console.log('[AI Studio] Canvas dimensions sent to AI:', cw, 'x', ch)
      console.log('[AI Studio] Canvas context:', canvasContext)
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }))
      chatHistory.push({ role: 'user', content: userMsg.content })

      const aiMessages = [
        { role: 'system', content: buildSystemPrompt(cw, ch) },
        // Live canvas state so the model places elements without overlap and
        // can edit/extend the existing design instead of guessing blindly.
        { role: 'system', content: canvasContext },
        ...chatHistory,
      ]
      // Call the AI, retrying transient upstream rate-limits/provider errors
      // (OpenRouter 429/503 — "retry shortly"); allow_fallbacks lets OpenRouter try
      // multiple free providers for this model.
      const callAi = async (attempt = 0): Promise<any> => {
        try {
          return await marketifyallApi.aiProxy(
            'ai_full_design',
            // Primary: free open-source MoE (80B total / ~3B active, <120B), strong at
            // structured JSON / layout. `models` is an OpenRouter fallback chain — if the
            // primary is rate-limited/unavailable it auto-routes to the next free,
            // open-source, <120B model, so a single provider's rate limit never hard-fails.
            'qwen/qwen3-next-80b-a3b-instruct:free',
            aiMessages,
            {
              temperature: 0.7,
              max_tokens: 4000,
              // OpenRouter caps the fallback array at 3 entries. Ordered best→most-available,
              // all free / open-source / <120B. NOTE: openai/gpt-oss-20b:free is excluded —
              // as a reasoning model its response handling triggers a vendor "process is not
              // defined" crash here; the non-reasoning instruct models below are reliable.
              models: [
                'qwen/qwen3-next-80b-a3b-instruct:free',
                'meta-llama/llama-3.3-70b-instruct:free',
                'google/gemma-4-31b-it:free',
              ],
              provider: { allow_fallbacks: true },
            },
          )
        } catch (e: any) {
          const status = e?.response?.status
          if ((status === 503 || status === 429) && attempt < 2) {
            await new Promise(r => setTimeout(r, 3000 * (attempt + 1)))
            return callAi(attempt + 1)
          }
          throw e
        }
      }
      const res = await Promise.race([
        callAi(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Request timed out')), 90000)),
      ])

      // Strip reasoning model <think> tags, then extract JSON
      let raw = res.choices?.[0]?.message?.content || ''
      raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
      let parsed: any = {}
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      } catch (err) { ignoreError(err, 'AI response JSON parse failed — using defaults') }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: parsed.message || raw,
        plan: parsed.plan,
        actions: parsed.actions || [],
        actionStatuses: (parsed.actions || []).reduce((a: any, _: any, i: number) => ({ ...a, [i]: 'pending' as const }), {}),
        suggestions: parsed.suggestions,
      }

      setMessages(prev => [...prev, aiMsg])
      setDesigning(false)
      refresh()

      if (aiMsg.actions && aiMsg.actions.length > 0) {
        setTimeout(() => { executeActions(aiMsg.actions!, aiMsg.id) }, 150)
      }
    } catch (err: any) {
      const status = err?.response?.status
      const friendly = (status === 503 || status === 429)
        ? 'The AI provider is busy right now (rate-limited). Please try again in a few seconds.'
        : status === 402
          ? "You're out of credits for AI designs."
          : `Sorry, something went wrong: ${err.message || 'Unknown error'}`
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: friendly,
      }])
      setDesigning(false)
    }
  }, [chatInput, designing, messages, refresh, getCanvasBounds, buildCanvasContext, executeActions])

  const handleChatKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
  }, [])

  // ═══════════════════════════════════════════════════════════
  // ── Render ──
  // ═══════════════════════════════════════════════════════════

  return (
    <Container>
      {/* Keyframes */}
      <style>{`@keyframes ai-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>

      {/* Header + Tabs */}
      <Header>
        <HeaderTitle>
          <HeaderIcon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </HeaderIcon>
          <Title>AI Studio</Title>
        </HeaderTitle>
        <TabBar>
          <Tab $active={mode === 'autopilot'} onClick={() => setMode('autopilot')}>Auto Design</Tab>
          <Tab $active={mode === 'generate'} onClick={() => setMode('generate')}>Generate Image</Tab>
        </TabBar>
      </Header>

      {/* ═══ MODE: GENERATE IMAGE ═══ */}
      {mode === 'generate' && (
        <>
          <Scrollbars style={{ flex: 1 }}>
            <FormSection>
              <SectionContainer>
                <Label>Preview</Label>
                <Preview>
                  {genImage ? (
                    <img src={genImage} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                  ) : 'AI-generated image preview'}
                </Preview>
              </SectionContainer>

              <SectionContainer>
                <Label>Describe the image</Label>
                <div style={{ position: 'relative' }}>
                  <GenTextArea
                    placeholder="e.g., Minimal flat illustration of a rocket launching, pastel colors"
                    value={genPrompt}
                    onChange={e => setGenPrompt(e.target.value)}
                  />
                  <GenImproveBtn onClick={handleGenImprove}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                    Improve
                  </GenImproveBtn>
                </div>
              </SectionContainer>

              <SectionContainer>
                <Label>Size</Label>
                <GenRow>
                  <div style={{ flex: 1 }}>
                    <Select
                      options={IMAGE_SIZES}
                      value={genSize}
                      onChange={(p: any) => setGenSize(p.value)}
                      clearable={false}
                      searchable={false}
                      overrides={{
                        ControlContainer: { style: { borderRadius: '8px', borderColor: '#e5e7eb', backgroundColor: '#f8f8f8' } },
                      }}
                    />
                  </div>
                  <GenBtn onClick={handleGenerate} disabled={genLoading}>
                    {genLoading ? 'Generating...' : `Generate (${CREDIT_COSTS.ai_image_generation} cr)`}
                  </GenBtn>
                </GenRow>
              </SectionContainer>
            </FormSection>
          </Scrollbars>

          {genImage && (
            <ActionRow>
              <ActionBtn $variant="danger" onClick={() => setGenImage(null)}>Discard</ActionBtn>
              <ActionBtn onClick={handleGenSave}>Add to Canvas</ActionBtn>
            </ActionRow>
          )}
        </>
      )}

      {/* ═══ MODE: AUTO DESIGN ═══ */}
      {mode === 'autopilot' && (
        <>
          <ChatArea>
            <Scrollbars ref={scrollRef} autoHide>
              <MessagesWrap>
                {messages.length === 0 ? (
                  <WelcomeWrap>
                    <WelcomeIcon>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    </WelcomeIcon>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' }}>Auto Design</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', maxWidth: '260px', lineHeight: '1.5', marginBottom: '16px' }}>
                      Describe what you want and I'll plan and build an editable design on your canvas using real fonts, stock photos, illustrations, and shapes.
                    </div>
                    <PromptsGrid>
                      {QUICK_PROMPTS.map((p, i) => (
                        <PromptBtn key={i} onClick={() => setChatInput(p)}>{p}</PromptBtn>
                      ))}
                    </PromptsGrid>
                  </WelcomeWrap>
                ) : (
                  messages.map(msg => (
                    <React.Fragment key={msg.id}>
                      <Bubble $isUser={msg.role === 'user'}>{msg.content}</Bubble>

                      {/* Design Plan */}
                      {msg.plan && (
                        <PlanCard>
                          <PlanLabel>Design Plan</PlanLabel>
                          <PlanRow><PlanKey>Concept</PlanKey><PlanVal>{msg.plan.concept}</PlanVal></PlanRow>
                          <PlanRow><PlanKey>Layout</PlanKey><PlanVal>{msg.plan.layout}</PlanVal></PlanRow>
                          {msg.plan.palette?.length > 0 && (
                            <PlanRow>
                              <PlanKey>Palette</PlanKey>
                              <SwatchRow>{msg.plan.palette.map((c, i) => <Swatch key={i} $color={c} title={c} />)}</SwatchRow>
                            </PlanRow>
                          )}
                          {msg.plan.fonts && (
                            <PlanRow><PlanKey>Fonts</PlanKey><PlanVal>{msg.plan.fonts.headline} + {msg.plan.fonts.body}</PlanVal></PlanRow>
                          )}
                          {msg.plan.imagery && (
                            <PlanRow><PlanKey>Imagery</PlanKey><PlanVal>{msg.plan.imagery}</PlanVal></PlanRow>
                          )}
                        </PlanCard>
                      )}

                      {/* Action Progress */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', alignSelf: 'flex-start', maxWidth: '90%' }}>
                          {msg.actions.map((act, i) => (
                            <ActionItemRow key={i} $status={msg.actionStatuses?.[i] || 'pending'}>
                              <StatusDot $status={msg.actionStatuses?.[i] || 'pending'}>
                                {msg.actionStatuses?.[i] === 'done' ? '\u2713' :
                                  msg.actionStatuses?.[i] === 'error' ? '\u2715' :
                                  msg.actionStatuses?.[i] === 'running' ? '\u21BB' : '\u25CB'}
                              </StatusDot>
                              {act.description}
                            </ActionItemRow>
                          ))}
                        </div>
                      )}

                      {/* Suggestions */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <SuggestionChips>
                          {msg.suggestions.map((s, i) => (
                            <Chip key={i} onClick={() => setChatInput(s)}>{s}</Chip>
                          ))}
                        </SuggestionChips>
                      )}
                    </React.Fragment>
                  ))
                )}

                {/* Loading indicator */}
                {designing && (
                  <Bubble $isUser={false}>
                    <LoadingDots>
                      {[0, 0.16, 0.32].map((d, i) => (
                        <div key={i} style={{
                          width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#667eea',
                          animation: `ai-bounce 1.4s infinite ease-in-out ${d}s`,
                        }} />
                      ))}
                    </LoadingDots>
                  </Bubble>
                )}
              </MessagesWrap>
            </Scrollbars>
          </ChatArea>

          <InputArea>
            <InputRow>
              <ChatInput
                ref={inputRef}
                value={chatInput}
                onChange={handleInputChange}
                onKeyDown={handleChatKey}
                placeholder="Describe the design you want..."
                rows={1}
              />
              <SendBtn $disabled={designing || !chatInput.trim()} onClick={handleSend}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </SendBtn>
            </InputRow>
            <CostHint>{CREDIT_COSTS.ai_full_design} credits per design</CostHint>
          </InputArea>
        </>
      )}
    </Container>
  )
}

export default AiStudio
