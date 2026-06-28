import { useEffect, useState } from 'react'
import { DESIGN_FORMATS, FORMAT_GROUPS, DesignFormat } from './formats'

interface Props {
  onClose: () => void
  onCreate: (name: string, width: number, height: number) => void
}

const previewBox = (w: number, h: number) => {
  const max = 60
  const scale = max / Math.max(w, h)
  return { width: Math.max(10, Math.round(w * scale)), height: Math.max(10, Math.round(h * scale)) }
}

function CreateModal({ onClose, onCreate }: Props) {
  const [cw, setCw] = useState('1080')
  const [ch, setCh] = useState('1080')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pick = (f: DesignFormat) => onCreate(f.name, f.width, f.height)
  const createCustom = () => {
    const w = Math.round(Number(cw))
    const h = Math.round(Number(ch))
    if (w > 0 && h > 0) onCreate(`Custom ${w}×${h}`, w, h)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(24,20,16,0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '5vh 20px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 940,
          background: 'var(--paper)',
          border: '2px solid var(--ink)',
          color: 'var(--ink)',
          fontFamily: 'var(--sans)',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 26px',
            borderBottom: '2px solid var(--ink)',
          }}
        >
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 800, fontSize: 26 }}>
            Start a new design
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 26,
              lineHeight: 1,
              cursor: 'pointer',
              color: 'var(--ink)',
              fontFamily: 'var(--serif)',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '22px 26px 30px' }}>
          {/* custom size */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              paddingBottom: 22,
              marginBottom: 22,
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              Custom size
            </span>
            <input
              type="number"
              value={cw}
              onChange={e => setCw(e.target.value)}
              style={inputStyle}
              aria-label="Width"
            />
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>×</span>
            <input
              type="number"
              value={ch}
              onChange={e => setCh(e.target.value)}
              style={inputStyle}
              aria-label="Height"
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>px</span>
            <button onClick={createCustom} style={createBtnStyle}>
              Create →
            </button>
          </div>

          {/* grouped presets */}
          {FORMAT_GROUPS.map(group => (
            <div key={group} style={{ marginBottom: 26 }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 12,
                }}
              >
                {group}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                }}
              >
                {DESIGN_FORMATS.filter(f => f.group === group).map(f => {
                  const box = previewBox(f.width, f.height)
                  return (
                    <button key={f.id} onClick={() => pick(f)} style={cardStyle} className="fmt-card">
                      <div
                        style={{
                          height: 72,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ ...box, border: '2px solid var(--ink)', background: 'var(--paper2)' }} />
                      </div>
                      <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, lineHeight: 1.15 }}>
                        {f.name}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                        {f.width} × {f.height}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`.fmt-card:hover{border-color:var(--accent)!important;transform:translateY(-2px)}`}</style>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: 92,
  padding: '8px 10px',
  border: '2px solid var(--ink)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontFamily: 'var(--mono)',
  fontSize: 14,
  outline: 'none',
}

const createBtnStyle: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '9px 18px',
  background: 'var(--ink)',
  color: 'var(--paper)',
  border: '2px solid var(--ink)',
  fontFamily: 'var(--sans)',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
}

const cardStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 14px 16px',
  background: 'var(--paper)',
  border: '2px solid var(--ink)',
  cursor: 'pointer',
  transition: 'border-color .14s, transform .14s',
  color: 'var(--ink)',
}

export default CreateModal
