/**
 * Brand Kit panel (Canva Pro "Brand Kit"): brand colors, heading/subheading/body
 * fonts and logos, persisted locally in `mfa-brand-kit`.
 */
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { styled } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { Check, Copy, Plus, Upload, WandSparkles, X } from 'lucide-react'
import { color, font, overline, radius, shadow } from '@/theme/tokens'
import { ignoreError, log } from '@/lib/logger'
import { notify } from '@/lib/notify'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { injectGoogleFont, loadGoogleFont } from '@/utils/fontLoader'
import { GOOGLE_FONTS } from '@/constants/googleFonts'
import { EmptyNote, KitButton, PanelBody, PanelHeader, PanelRoot, SectionLabel, TextField } from '../PanelKit'

type AnyObj = any
type FontRole = 'heading' | 'subheading' | 'body'

interface BrandLogo {
  id: string
  src: string
  name: string
}

interface BrandKitData {
  colors: string[]
  fonts: Record<FontRole, string>
  logos: BrandLogo[]
}

const STORAGE_KEY = 'mfa-brand-kit'
const MAX_LOGO_BYTES = 1.5 * 1024 * 1024
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

const DEFAULT_KIT: BrandKitData = {
  colors: [color.ink, color.accent, color.paper],
  fonts: { heading: 'Fraunces', subheading: 'Space Grotesk', body: 'Space Grotesk' },
  logos: [],
}

const ROLES: { role: FontRole; label: string; size: number; weight: number; preview: number; sample: string; width: number }[] = [
  { role: 'heading', label: 'Heading', size: 72, weight: 700, preview: 26, sample: 'Add a heading', width: 640 },
  { role: 'subheading', label: 'Subheading', size: 40, weight: 600, preview: 19, sample: 'Add a subheading', width: 520 },
  { role: 'body', label: 'Body', size: 24, weight: 400, preview: 14, sample: 'Add a little bit of body text', width: 420 },
]

const TEXT_TYPES = new Set(['StaticText', 'DynamicText', 'textbox', 'text', 'i-text'])
const isText = (o: AnyObj) => !!o && (TEXT_TYPES.has(o.type) || typeof o.text === 'string')

const FONT_FAMILIES: string[] = GOOGLE_FONTS.map((f: AnyObj) => f.family)
const FONT_SET = new Set(FONT_FAMILIES.map(f => f.toLowerCase()))
const FONT_LIST_ID = 'mfa-brand-font-list'

function normalizeHex(v: string): string | null {
  let s = v.trim()
  if (!s.startsWith('#')) s = `#${s}`
  if (!HEX_RE.test(s)) return null
  if (s.length === 4) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`
  return s.toLowerCase()
}

function loadKit(): BrandKitData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_KIT
    const parsed = JSON.parse(raw)
    const colors = Array.isArray(parsed?.colors) ? parsed.colors.filter((c: unknown) => typeof c === 'string' && normalizeHex(c)) : DEFAULT_KIT.colors
    const f = parsed?.fonts || {}
    const fonts = {
      heading: typeof f.heading === 'string' && f.heading ? f.heading : DEFAULT_KIT.fonts.heading,
      subheading: typeof f.subheading === 'string' && f.subheading ? f.subheading : DEFAULT_KIT.fonts.subheading,
      body: typeof f.body === 'string' && f.body ? f.body : DEFAULT_KIT.fonts.body,
    }
    const logos = Array.isArray(parsed?.logos)
      ? parsed.logos.filter((l: AnyObj) => l && typeof l.src === 'string' && typeof l.id === 'string')
      : []
    return { colors, fonts, logos }
  } catch (err) {
    log.warn('brand-kit', 'stored brand kit unreadable — using defaults', err)
    return DEFAULT_KIT
  }
}

/** Returns false (and tells the user) when localStorage refuses the write, e.g. the ~5MB quota. */
function persistKit(kit: BrandKitData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kit))
    return true
  } catch (err) {
    log.warn('brand-kit', 'brand kit save failed', err)
    notify('Brand kit storage is full. Remove a logo or two and try again.', 'negative')
    return false
  }
}

function getCanvas(editor: AnyObj): AnyObj {
  return editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas || null
}

/** The objects a style action should touch: the active object, or the members of a multi-selection. */
function selectionTargets(active: AnyObj): AnyObj[] {
  if (!active) return []
  if (active.type === 'activeSelection' && Array.isArray(active._objects)) return active._objects
  return [active]
}

function refreshText(o: AnyObj) {
  try {
    o.initDimensions?.()
    o.setCoords?.()
    o.dirty = true
  } catch (err) {
    ignoreError(err, 'text re-measure is best-effort')
  }
}

function clearFontCache(family: string) {
  try {
    ;(window as AnyObj).fabric?.util?.clearFabricFontCache?.(family)
  } catch (err) {
    ignoreError(err, 'fabric font cache clear is best-effort')
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/* ---------- styles ---------- */

const SwatchGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)',
  gap: '8px',
})

const SwatchWrap = styled('div', {
  position: 'relative',
  aspectRatio: '1 / 1',
})

const SwatchButton = styled('button', {
  width: '100%',
  height: '100%',
  padding: 0,
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line2,
  cursor: 'pointer',
  ':hover': {
    borderColor: color.ink,
    boxShadow: shadow.hard,
  },
})

const SwatchAction = styled('button', ({ $visible, $corner }: { $visible: boolean; $corner: 'tr' | 'bl' }) => ({
  position: 'absolute',
  top: $corner === 'tr' ? '-6px' : 'auto',
  right: $corner === 'tr' ? '-6px' : 'auto',
  bottom: $corner === 'bl' ? '-6px' : 'auto',
  left: $corner === 'bl' ? '-6px' : 'auto',
  width: '18px',
  height: '18px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  borderRadius: '50%',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line2,
  background: color.white,
  color: color.ink,
  cursor: 'pointer',
  opacity: $visible ? 1 : 0,
  ':focus': {
    opacity: 1,
  },
  ':hover': {
    borderColor: color.ink,
  },
  // No hover on touch: always show remove/copy, bigger, with a 44 px hit area.
  '@media (hover: none)': {
    opacity: 1,
    width: '26px',
    height: '26px',
    '::after': {
      content: '""',
      position: 'absolute',
      top: '-9px',
      right: '-9px',
      bottom: '-9px',
      left: '-9px',
    },
  },
}))

const AddRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginTop: '12px',
})

const ColorInput = styled('input', {
  width: '36px',
  height: '36px',
  flexShrink: 0,
  padding: '2px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line2,
  background: color.white,
  cursor: 'pointer',
})

const FontCard = styled('div', {
  marginBottom: '10px',
  padding: '10px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line,
  background: color.white,
})

const FontPreview = styled('button', {
  display: 'block',
  width: '100%',
  marginBottom: '8px',
  padding: '6px 4px',
  background: 'transparent',
  borderWidth: 0,
  borderStyle: 'none',
  borderRadius: radius.sm,
  textAlign: 'left',
  color: color.ink,
  cursor: 'pointer',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  ':hover': {
    background: color.hover,
  },
})

const RoleLine = styled('div', {
  ...overline,
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '4px',
})

const LogoGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginBottom: '10px',
})

const LogoTile = styled('button', {
  width: '100%',
  aspectRatio: '1 / 1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: color.line,
  background: color.paper,
  cursor: 'pointer',
  ':hover': {
    borderColor: color.ink,
  },
})

const Hint = styled('p', {
  margin: '6px 0 0',
  fontSize: '11.5px',
  lineHeight: 1.45,
  color: color.muted,
  fontFamily: font.sans,
})

/* ---------- font row ---------- */

function FontRow({
  label,
  family,
  weight,
  previewSize,
  sample,
  canApply,
  onUse,
  onChangeFamily,
}: {
  label: string
  family: string
  weight: number
  previewSize: number
  sample: string
  canApply: boolean
  onUse: () => void
  onChangeFamily: (family: string) => void
}) {
  const [draft, setDraft] = useState(family)
  useEffect(() => setDraft(family), [family])
  useEffect(() => injectGoogleFont(family), [family])

  const commit = (value: string) => {
    const v = value.trim()
    const match = FONT_FAMILIES.find(f => f.toLowerCase() === v.toLowerCase())
    if (match && match !== family) onChangeFamily(match)
    else if (!match) setDraft(family)
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setDraft(v)
    // Picking from the datalist sets the full name at once — commit it right away.
    if (FONT_SET.has(v.trim().toLowerCase())) commit(v)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit(draft)
    if (e.key === 'Escape') setDraft(family)
  }

  return (
    <FontCard>
      <RoleLine>
        <span>{label}</span>
        <span>{canApply ? 'Click to apply' : 'Click to add'}</span>
      </RoleLine>
      <FontPreview
        type="button"
        onClick={onUse}
        aria-label={canApply ? `Apply ${label.toLowerCase()} font ${family} to selection` : `Add ${label.toLowerCase()} text in ${family}`}
        style={{ fontFamily: `'${family}', ${font.sans}`, fontSize: `${previewSize}px`, fontWeight: weight }}
      >
        {sample}
      </FontPreview>
      <TextField
        list={FONT_LIST_ID}
        value={draft}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        aria-label={`${label} font`}
        placeholder="Search fonts"
        spellCheck={false}
      />
    </FontCard>
  )
}

/* ---------- panel ---------- */

function BrandKit() {
  const editor = useEditor() as AnyObj
  const { activeObject } = useEditorContext() as AnyObj
  const [kit, setKit] = useState<BrandKitData>(loadKit)
  const [hexDraft, setHexDraft] = useState<string>(color.accent)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const selectedTexts = useMemo(() => selectionTargets(activeObject).filter(isText), [activeObject])

  const update = (next: BrandKitData) => {
    if (persistKit(next)) setKit(next)
  }

  const commitCanvas = (canvas: AnyObj, target?: AnyObj) => {
    canvas.requestRenderAll?.()
    canvas.fire?.('object:modified', { target })
  }

  /* colors */

  const addColor = () => {
    const hex = normalizeHex(hexDraft)
    if (!hex) {
      notify('Enter a hex color like #d8401c', 'warning')
      return
    }
    if (kit.colors.includes(hex)) {
      notify('That color is already in your brand kit', 'info')
      return
    }
    update({ ...kit, colors: [...kit.colors, hex] })
  }

  const removeColor = (hex: string) => {
    update({ ...kit, colors: kit.colors.filter(c => c !== hex) })
    setHoverIdx(null)
  }

  const copyHex = async (hex: string, i: number) => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopiedIdx(i)
      window.setTimeout(() => setCopiedIdx(cur => (cur === i ? null : cur)), 1200)
    } catch (err) {
      log.warn('brand-kit', 'clipboard write failed', err)
      notify(`Couldn't copy — the color is ${hex}`, 'warning')
    }
  }

  const applyColor = (hex: string) => {
    const canvas = getCanvas(editor)
    if (!canvas) return
    const active = canvas.getActiveObject?.()
    if (!active) {
      // Same call the Background panel uses.
      try {
        editor.background.setBackgroundColor(hex)
        const bg = (canvas.getObjects?.() || []).find((o: AnyObj) => o.type === 'Background')
        commitCanvas(canvas, bg)
      } catch (err) {
        log.error('brand-kit', 'could not set page background', err)
      }
      return
    }
    let changed = 0
    selectionTargets(active).forEach((o: AnyObj) => {
      if (isText(o)) {
        o.set('fill', hex)
        if (o.metadata) o.metadata = { ...o.metadata, fill: hex }
        changed += 1
      } else if (Array.isArray(o._objects) && o._objects.length) {
        o._objects.forEach((child: AnyObj) => {
          if (typeof child.fill === 'string' && child.fill && child.fill !== 'none' && child.fill !== 'transparent') {
            child.set('fill', hex)
            changed += 1
          }
        })
        o.dirty = true
      } else if (!/image/i.test(o.type || '')) {
        o.set('fill', hex)
        changed += 1
      }
    })
    if (!changed) {
      notify('Brand colors apply to text, shapes and graphics — not photos', 'info')
      return
    }
    commitCanvas(canvas, active)
  }

  /* fonts */

  const setFont = (role: FontRole, family: string) => {
    update({ ...kit, fonts: { ...kit.fonts, [role]: family } })
  }

  const applyFontRole = async (role: FontRole) => {
    const canvas = getCanvas(editor)
    const spec = ROLES.find(r => r.role === role)
    if (!canvas || !spec) return
    const family = kit.fonts[role]
    setBusy(true)
    try {
      await loadGoogleFont(family)
      clearFontCache(family)
      const active = canvas.getActiveObject?.()
      const texts = selectionTargets(active).filter(isText)
      if (texts.length) {
        texts.forEach((o: AnyObj) => {
          o.set('fontFamily', family)
          if (o.metadata) o.metadata = { ...o.metadata, fontFamily: family }
          refreshText(o)
        })
        commitCanvas(canvas, active)
      } else {
        addObjectToCanvas(
          editor,
          {
            type: 'StaticText',
            metadata: { text: spec.sample, fontSize: spec.size, fontFamily: family, fontWeight: spec.weight, fill: color.ink },
          },
          spec.width,
          canvas,
        )
      }
    } catch (err) {
      log.error('brand-kit', 'brand font action failed', err)
      notify('Could not use that font. Try again.', 'negative')
    } finally {
      setBusy(false)
    }
  }

  const applyBrandToDesign = async () => {
    const canvas = getCanvas(editor)
    if (!canvas) return
    const texts: AnyObj[] = (canvas.getObjects?.() || []).filter(isText)
    if (!texts.length) {
      notify('No text on this page to restyle yet', 'info')
      return
    }
    setBusy(true)
    try {
      const { heading, body } = kit.fonts
      await Promise.all([loadGoogleFont(heading), loadGoogleFont(body)])
      clearFontCache(heading)
      clearFontCache(body)
      const sizeOf = (o: AnyObj) => (Number(o.fontSize) || 0) * Math.abs(Number(o.scaleY) || 1)
      const largest = Math.max(...texts.map(sizeOf))
      texts.forEach(o => {
        const family = sizeOf(o) >= largest ? heading : body
        o.set('fontFamily', family)
        if (o.metadata) o.metadata = { ...o.metadata, fontFamily: family }
        refreshText(o)
      })
      commitCanvas(canvas, texts.length === 1 ? texts[0] : undefined)
      notify(`Applied brand fonts to ${texts.length} text layer${texts.length === 1 ? '' : 's'}`, 'positive')
    } catch (err) {
      log.error('brand-kit', 'apply brand failed', err)
      notify('Could not apply the brand fonts. Try again.', 'negative')
    } finally {
      setBusy(false)
    }
  }

  /* logos */

  const onLogoFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const added: BrandLogo[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        notify(`${file.name} isn't an image`, 'warning')
        continue
      }
      if (file.size > MAX_LOGO_BYTES) {
        notify(`${file.name} is over 1.5 MB — use a smaller file`, 'warning')
        continue
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        const src = await readAsDataURL(file)
        added.push({ id: `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, src, name: file.name })
      } catch (err) {
        log.warn('brand-kit', 'logo read failed', err)
        notify(`Couldn't read ${file.name}`, 'negative')
      }
    }
    if (added.length) update({ ...kit, logos: [...kit.logos, ...added] })
  }

  const addLogo = (logo: BrandLogo) => {
    const canvas = getCanvas(editor)
    const ok = addObjectToCanvas(editor, { type: 'StaticImage', metadata: { src: logo.src, name: logo.name } }, undefined, canvas || undefined)
    if (ok === false) notify('Could not add the logo to the page', 'negative')
  }

  const removeLogo = (id: string) => update({ ...kit, logos: kit.logos.filter(l => l.id !== id) })

  return (
    <PanelRoot>
      <PanelHeader
        title="Brand Kit"
        subtitle="Your colors, fonts and logos, one click away."
        action={
          <KitButton type="button" $variant="secondary" onClick={applyBrandToDesign} disabled={busy} title="Set every text on this page to your brand fonts">
            <WandSparkles size={15} />
            Apply fonts
          </KitButton>
        }
      />
      <PanelBody>
        <SectionLabel style={{ marginTop: 4 }}>Brand colors</SectionLabel>
        {kit.colors.length === 0 ? (
          <EmptyNote>No brand colors yet. Add one below.</EmptyNote>
        ) : (
          <SwatchGrid>
            {kit.colors.map((hex, i) => (
              <SwatchWrap key={hex} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(cur => (cur === i ? null : cur))}>
                <SwatchButton
                  type="button"
                  style={{ background: hex }}
                  onClick={() => applyColor(hex)}
                  onFocus={() => setHoverIdx(i)}
                  aria-label={`Apply brand color ${hex}`}
                  title={`${hex} — apply to selection, or the page if nothing is selected`}
                />
                <SwatchAction type="button" $corner="tr" $visible={hoverIdx === i} onClick={() => removeColor(hex)} aria-label={`Remove ${hex}`} title="Remove">
                  <X size={11} />
                </SwatchAction>
                <SwatchAction type="button" $corner="bl" $visible={hoverIdx === i || copiedIdx === i} onClick={() => copyHex(hex, i)} aria-label={`Copy ${hex}`} title="Copy hex">
                  {copiedIdx === i ? <Check size={11} /> : <Copy size={10} />}
                </SwatchAction>
              </SwatchWrap>
            ))}
          </SwatchGrid>
        )}
        <AddRow>
          <ColorInput
            type="color"
            value={normalizeHex(hexDraft) || color.accent}
            onChange={e => setHexDraft(e.target.value)}
            aria-label="Pick a color"
          />
          <TextField
            value={hexDraft}
            onChange={e => setHexDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addColor()
            }}
            aria-label="Hex color"
            placeholder="#d8401c"
            spellCheck={false}
            style={{ fontFamily: font.mono }}
          />
          <KitButton type="button" onClick={addColor} aria-label="Add color to brand kit" style={{ flexShrink: 0, padding: '0 10px' }}>
            <Plus size={15} />
          </KitButton>
        </AddRow>
        <Hint>Click a swatch to color the selected text or shape. With nothing selected it sets the page background.</Hint>

        <SectionLabel>Brand fonts</SectionLabel>
        <datalist id={FONT_LIST_ID}>
          {FONT_FAMILIES.map(f => (
            <option key={f} value={f} />
          ))}
        </datalist>
        {ROLES.map(r => (
          <FontRow
            key={r.role}
            label={r.label}
            family={kit.fonts[r.role]}
            weight={r.weight}
            previewSize={r.preview}
            sample={r.sample}
            canApply={selectedTexts.length > 0}
            onUse={() => {
              if (!busy) applyFontRole(r.role)
            }}
            onChangeFamily={f => setFont(r.role, f)}
          />
        ))}

        <SectionLabel>Logos</SectionLabel>
        {kit.logos.length === 0 ? (
          <EmptyNote style={{ marginBottom: 10 }}>Upload your logo to drop it into any design.</EmptyNote>
        ) : (
          <LogoGrid>
            {kit.logos.map(logo => (
              <SwatchWrap key={logo.id} onMouseEnter={() => setHoverIdx(-1 - kit.logos.indexOf(logo))} onMouseLeave={() => setHoverIdx(null)}>
                <LogoTile type="button" onClick={() => addLogo(logo)} aria-label={`Add logo ${logo.name}`} title={logo.name}>
                  <img src={logo.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </LogoTile>
                <SwatchAction
                  type="button"
                  $corner="tr"
                  $visible={hoverIdx === -1 - kit.logos.indexOf(logo)}
                  onClick={() => removeLogo(logo.id)}
                  aria-label={`Remove logo ${logo.name}`}
                  title="Remove"
                >
                  <X size={11} />
                </SwatchAction>
              </SwatchWrap>
            ))}
          </LogoGrid>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onLogoFiles} />
        <KitButton type="button" $block onClick={() => fileRef.current?.click()}>
          <Upload size={15} />
          Upload logo
        </KitButton>
        <Hint>PNG or SVG with a transparent background works best. Max 1.5 MB each.</Hint>
      </PanelBody>
    </PanelRoot>
  )
}

export default BrandKit
