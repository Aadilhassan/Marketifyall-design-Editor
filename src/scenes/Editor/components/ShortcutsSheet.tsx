import { useEffect, useState } from 'react'
import { Modal, ModalBody, ROLE, SIZE } from 'baseui/modal'
import { Keyboard } from 'lucide-react'
import { color, font, overline } from '@/theme/tokens'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Edit',
    items: [
      [`${MOD} Z`, 'Undo'],
      [`${MOD} Shift Z`, 'Redo'],
      [`${MOD} C / V`, 'Copy / paste'],
      [`${MOD} D`, 'Duplicate'],
      ['Delete', 'Delete selection'],
      [`${MOD} A`, 'Select all'],
    ],
  },
  {
    title: 'Arrange',
    items: [
      ['← ↑ → ↓', 'Nudge selection'],
      [`${MOD} ]`, 'Bring forward'],
      [`${MOD} [`, 'Send backward'],
      [`${MOD} Shift ]`, 'Bring to front'],
      [`${MOD} Shift [`, 'Send to back'],
      ['Drag', 'Snap to page & objects'],
    ],
  },
  {
    title: 'View',
    items: [
      ['?', 'Show this sheet'],
      ['Present', 'Full-screen slideshow (→ ← to move, Esc to exit)'],
    ],
  },
]

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

export function useShortcutsSheet() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !isTyping(e.target) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return { open, setOpen }
}

function Kbd({ children }: { children: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {children.split(' ').map((k, i) => (
        <kbd
          key={i}
          style={{
            fontFamily: font.mono,
            fontSize: 11,
            padding: '2px 6px',
            border: `1px solid ${color.line2}`,
            borderBottomWidth: 2,
            borderRadius: 4,
            background: color.white,
            color: color.ink,
          }}
        >
          {k}
        </kbd>
      ))}
    </span>
  )
}

export function ShortcutsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts (?)"
      style={{ border: 'none', background: 'transparent', color: color.ink2, cursor: 'pointer', width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Keyboard size={17} />
    </button>
  )
}

export default function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size={SIZE.auto}
      role={ROLE.dialog}
      overrides={{
        Dialog: { style: { borderRadius: '10px', border: `1px solid ${color.ink}`, boxShadow: '4px 4px 0 #181410', backgroundColor: color.surface } },
      }}
    >
      <ModalBody>
        <div style={{ fontFamily: font.sans, color: color.ink, width: 'min(640px, 86vw)', padding: '8px 4px' }}>
          <h2 style={{ fontFamily: font.serif, fontWeight: 600, fontSize: 26, margin: '0 0 18px' }}>Keyboard shortcuts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px 32px' }}>
            {GROUPS.map(g => (
              <section key={g.title}>
                <div style={{ ...overline, margin: '8px 0 8px' }}>{g.title}</div>
                {g.items.map(([keys, label]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: `1px solid ${color.line}`, fontSize: 13 }}>
                    <span>{label}</span>
                    <Kbd>{keys}</Kbd>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}
