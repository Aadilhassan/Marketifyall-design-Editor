import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { DESIGN_FORMATS, FORMAT_GROUPS, DesignFormat } from './formats'

interface Props {
  onClose: () => void
  onCreate: (name: string, width: number, height: number) => void
}

const previewBox = (w: number, h: number) => {
  const max = 56
  const scale = max / Math.max(w, h)
  return { width: Math.max(10, Math.round(w * scale)), height: Math.max(10, Math.round(h * scale)) }
}

function CreateModal({ onClose, onCreate }: Props) {
  const [cw, setCw] = useState('1080')
  const [ch, setCh] = useState('1080')
  const [filter, setFilter] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pick = (f: DesignFormat) => onCreate(f.name, f.width, f.height)
  const w = Math.round(Number(cw))
  const h = Math.round(Number(ch))
  const customValid = w > 0 && h > 0 && w <= 8000 && h <= 8000
  const createCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (customValid) onCreate(`Custom ${w}×${h}`, w, h)
  }

  const term = filter.trim().toLowerCase()
  const formats = term ? DESIGN_FORMATS.filter(f => `${f.name} ${f.group}`.toLowerCase().includes(term)) : DESIGN_FORMATS

  return (
    <div className="dash-scrim dash-cm-scrim" onClick={onClose}>
      <div className="dash-cm" role="dialog" aria-modal="true" aria-labelledby="dash-cm-title" onClick={e => e.stopPropagation()}>
        <div className="dash-cm-head">
          <h2 id="dash-cm-title">Create a design</h2>
          <button className="dash-cm-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="dash-cm-body">
          <label className="dash-cm-search">
            <Search size={17} aria-hidden="true" />
            <input
              ref={searchRef}
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="What would you like to create?"
              aria-label="Search sizes"
            />
          </label>

          <form className="dash-cm-custom" onSubmit={createCustom}>
            <span className="dash-cm-label">Custom size</span>
            <input type="number" min={1} max={8000} value={cw} onChange={e => setCw(e.target.value)} aria-label="Width in pixels" />
            <span className="dash-cm-x">×</span>
            <input type="number" min={1} max={8000} value={ch} onChange={e => setCh(e.target.value)} aria-label="Height in pixels" />
            <span className="dash-cm-unit">px</span>
            <button type="submit" className="dash-btn" disabled={!customValid}>
              Create
            </button>
          </form>

          {FORMAT_GROUPS.map(group => {
            const items = formats.filter(f => f.group === group)
            if (!items.length) return null
            return (
              <div key={group} className="dash-cm-group">
                <div className="dash-cm-label">{group}</div>
                <div className="dash-cm-grid">
                  {items.map(f => (
                    <button key={f.id} onClick={() => pick(f)} className="dash-cm-fmt">
                      <span className="dash-cm-shape">
                        <span style={previewBox(f.width, f.height)} />
                      </span>
                      <span className="dash-cm-name">{f.name}</span>
                      <span className="dash-cm-dim">
                        {f.width} × {f.height} px
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          {!formats.length && <p className="dash-none">No preset matches “{filter}”. Use a custom size above.</p>}
        </div>
      </div>
    </div>
  )
}

export default CreateModal
