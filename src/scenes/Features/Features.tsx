import { useHistory } from 'react-router-dom'
import EditorialShell from '@/components/EditorialShell'
import '../../styles/landing.css'

const GITHUB = 'https://github.com/Aadilhassan/Marketifyall-design-Editor'

const CORE = [
  ['❏', 'Templates', 'Hundreds of ready-made designs for every format — start from a great-looking base.'],
  ['◇', 'Elements', 'Shapes, icons, stickers, lines and frames — drag-and-drop any layout.'],
  ['T', 'Text & fonts', 'Editable type with a deep font library, styles, spacing and effects.'],
  ['✦', 'Illustrations', 'A library of vector art and graphics that stays sharp at any size.'],
  ['▣', 'Stock photos', 'Millions of free, high-resolution photos searchable inside the editor.'],
  ['▷', 'Stock videos', 'Free stock footage you can drop in, trim and animate.'],
]

const ADVANCED = [
  ['◷', 'Video & timeline', 'A real multi-track timeline for clips, audio and animated layers.'],
  ['✲', 'Animations', 'Preset entrance, exit and emphasis motion for any element.'],
  ['◐', 'Adjust & filters', 'Brightness, contrast, saturation, blur and one-tap filter looks.'],
  ['⤢', 'Resize', 'Switch formats and aspect ratios in a click — repurpose any design.'],
  ['↓', 'Export', 'PNG, JPG, SVG, JSON or a looping WebM/GIF — clean, no watermark.'],
  ['{ }', 'Open & embeddable', 'Open-source on GitHub, and droppable into any site via one iframe.'],
]

function Features() {
  const history = useHistory()
  const go = () => history.push('/dashboard')
  const card = ([ic, t, d]: string[]) => (
    <div className="feat" key={t}>
      <div className="ic">{ic}</div>
      <h3>{t}</h3>
      <p>{d}</p>
    </div>
  )

  return (
    <EditorialShell folio="FEATURES · FREE & OPEN-SOURCE">
      <main className="wrap">
        <section className="sec" style={{ borderTop: 'none' }}>
          <div className="reveal">
            <div className="kq">Features</div>
            <h2>
              Everything you need to <em>design.</em>
            </h2>
            <p className="lead">
              A complete, free, open-source design studio in your browser — a Canva alternative with no paywall, no
              watermark and nothing to install.
            </p>
            <div className="doc-acts">
              <span className="btn" onClick={go}>
                Start designing <span className="ar">↗</span>
              </span>
              <a className="ghbtn" href={GITHUB} target="_blank" rel="noreferrer">
                ★ GitHub
              </a>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="reveal">
            <div className="kq">№ 01 · Core</div>
            <h2>The essentials.</h2>
            <div className="feats" style={{ marginTop: 30 }}>{CORE.map(card)}</div>
          </div>
        </section>

        <section className="sec">
          <div className="reveal">
            <div className="kq">№ 02 · Advanced</div>
            <h2>
              Go <em>further.</em>
            </h2>
            <div className="feats" style={{ marginTop: 30 }}>{ADVANCED.map(card)}</div>
          </div>
        </section>
      </main>

      <section className="ctaband">
        <div className="wrap">
          <h2>
            Try it <em>free.</em>
          </h2>
          <p>Every feature unlocked, no watermark, no account required. Open-source on GitHub.</p>
          <span className="btn btn-lg" onClick={go}>
            Open the editor <span className="ar">↗</span>
          </span>
        </div>
      </section>
    </EditorialShell>
  )
}

export default Features
