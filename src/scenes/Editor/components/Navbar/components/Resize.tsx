import { useEffect, useMemo, useState } from 'react'
import { styled } from 'baseui'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { useEditor } from '@nkyo/scenify-sdk'
import useFrameSize from '@/hooks/useFrameSize'
import { Link2, Link2Off, Maximize2, Search } from 'lucide-react'
import formatSizes from '@/constants/format-sizes'
import { resizeDesign } from '@/utils/magicResize'
import { usePageActions } from '@/contexts/PageActionsContext'
import { color, font, overline, shadow } from '@/theme/tokens'

type Size = { width: number; height: number }

const Container = styled('div', {
  background: color.white,
  color: color.ink,
  width: '340px',
  fontFamily: font.sans,
  border: `1px solid ${color.ink}`,
  borderRadius: '10px',
  boxShadow: shadow.hard,
  overflow: 'hidden',
})

const NavButton = styled('button', {
  background: 'transparent',
  border: 'none',
  height: '36px',
  padding: '0 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: font.sans,
  fontSize: '13.5px',
  fontWeight: 500,
  color: color.ink2,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  ':hover': {
    background: color.hover,
    color: color.ink,
  },
})

const Label = styled('div', { ...overline, margin: '0 0 8px' })

const SearchBox = styled('label', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  height: '34px',
  padding: '0 10px',
  border: `1px solid ${color.line2}`,
  borderRadius: '6px',
  color: color.muted,
})

const PresetRow = styled('button', ({ $active }: { $active: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '7px 8px',
  borderWidth: 0,
  borderRadius: '6px',
  background: $active ? color.accentSoft : 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: font.sans,
  color: color.ink,
  ':hover': { background: $active ? color.accentSoft : color.hover },
}))

const NumInput = styled('input', {
  width: '100%',
  height: '34px',
  boxSizing: 'border-box',
  border: `1px solid ${color.line2}`,
  borderRadius: '6px',
  padding: '0 8px 0 26px',
  fontFamily: font.mono,
  fontSize: '12.5px',
  color: color.ink,
  outline: 'none',
  ':focus': { borderColor: color.ink },
})

const Btn = styled('button', ({ $primary }: { $primary?: boolean }) => ({
  flex: 1,
  height: '36px',
  borderRadius: '6px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: $primary ? color.ink : color.line2,
  background: $primary ? color.ink : color.white,
  color: $primary ? color.paper : color.ink,
  fontFamily: font.sans,
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  ':hover': { background: $primary ? color.accent : color.white, borderColor: $primary ? color.accent : color.ink },
  ':disabled': { opacity: 0.45, cursor: 'default' },
}))

/** Aspect-ratio glyph so presets are scannable at a glance. */
function Ratio({ w, h }: { w: number; h: number }) {
  const max = 22
  const k = max / Math.max(w, h)
  return (
    <span style={{ width: max, height: max, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <span style={{ width: Math.max(4, w * k), height: Math.max(4, h * k), border: `1.5px solid ${color.ink2}`, borderRadius: 2 }} />
    </span>
  )
}

export default function Resize() {
  const frameSize = useFrameSize()
  const editor = useEditor() as any
  const pageActions = usePageActions()
  const [query, setQuery] = useState('')
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [lockRatio, setLockRatio] = useState(false)
  const [scaleContent, setScaleContent] = useState(true)

  useEffect(() => {
    if (frameSize) setSize({ width: frameSize.width, height: frameSize.height })
  }, [frameSize])

  const presets = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? formatSizes.filter((f: any) => `${f.name} ${f.description}`.toLowerCase().includes(q)) : formatSizes
  }, [query])

  const valid = size.width >= 16 && size.height >= 16 && size.width <= 10000 && size.height <= 10000
  const unchanged = frameSize && size.width === frameSize.width && size.height === frameSize.height

  const setDim = (key: 'width' | 'height', raw: string) => {
    const v = Math.round(Number(raw) || 0)
    if (lockRatio && frameSize?.width && frameSize?.height) {
      const r = frameSize.width / frameSize.height
      setSize(key === 'width' ? { width: v, height: Math.round(v / r) } : { width: Math.round(v * r), height: v })
    } else {
      setSize(s => ({ ...s, [key]: v }))
    }
  }

  return (
    <StatefulPopover
      focusLock
      placement={PLACEMENT.bottomLeft}
      overrides={{ Body: { style: { zIndex: 1000, backgroundColor: 'transparent', boxShadow: 'none' } }, Inner: { style: { backgroundColor: 'transparent' } } }}
      content={({ close }) => (
        <Container>
          <div style={{ padding: '16px 16px 10px' }}>
            <div style={{ fontFamily: font.serif, fontWeight: 600, fontSize: 20, marginBottom: 2 }}>Magic Resize</div>
            <div style={{ fontSize: 12, color: color.muted, marginBottom: 12 }}>Change the format — your content re-flows to fit.</div>
            <SearchBox>
              <Search size={15} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Instagram story, A4, banner…"
                aria-label="Search sizes"
                style={{ border: 'none', outline: 'none', flex: 1, fontFamily: font.sans, fontSize: 13, background: 'transparent', color: color.ink }}
              />
            </SearchBox>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', padding: '0 8px' }}>
            {presets.map((f: any) => (
              <PresetRow
                key={f.id}
                type="button"
                $active={size.width === f.size.width && size.height === f.size.height}
                onClick={() => setSize({ ...f.size })}
              >
                <Ratio w={f.size.width} h={f.size.height} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{f.name}</span>
                <span style={{ fontFamily: font.mono, fontSize: 11, color: color.muted }}>{f.description}</span>
              </PresetRow>
            ))}
            {presets.length === 0 && <div style={{ padding: 12, fontSize: 12.5, color: color.muted }}>No preset matches — use a custom size below.</div>}
          </div>
          <div style={{ padding: 16, borderTop: `1px solid ${color.line}`, marginTop: 8 }}>
            <Label>Custom size (px)</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(['width', 'height'] as const).map(k => (
                <label key={k} style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 9, top: 9, fontFamily: font.mono, fontSize: 11, color: color.muted }}>{k[0].toUpperCase()}</span>
                  <NumInput type="number" min={16} max={10000} value={size[k] || ''} onChange={e => setDim(k, e.target.value)} aria-label={k} />
                </label>
              ))}
              <button
                type="button"
                onClick={() => setLockRatio(v => !v)}
                aria-pressed={lockRatio}
                aria-label="Lock aspect ratio"
                title="Lock aspect ratio"
                style={{ border: 'none', background: lockRatio ? color.accentSoft : 'transparent', color: lockRatio ? color.accent : color.muted, borderRadius: 6, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {lockRatio ? <Link2 size={16} /> : <Link2Off size={16} />}
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={scaleContent} onChange={e => setScaleContent(e.target.checked)} style={{ accentColor: color.accent, width: 15, height: 15 }} />
              Resize content with the page
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn
                type="button"
                disabled={!valid || !pageActions}
                onClick={() => {
                  pageActions?.copyAndResize(size)
                  close()
                }}
                title="Keep this page and add a resized copy after it"
              >
                Copy &amp; resize
              </Btn>
              <Btn
                type="button"
                $primary
                disabled={!valid || unchanged}
                onClick={() => {
                  resizeDesign(editor, size, scaleContent)
                  close()
                }}
              >
                Resize
              </Btn>
            </div>
          </div>
        </Container>
      )}
    >
      <NavButton type="button">
        <Maximize2 size={15} />
        Resize
      </NavButton>
    </StatefulPopover>
  )
}
