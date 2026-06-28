import { useHistory } from 'react-router-dom'
import EditorialShell from '@/components/EditorialShell'

const CORE = [
  ['01', 'Design Editor', 'A fast, infinite canvas for graphics, social posts and video — no install.'],
  ['02', 'Templates', 'Hundreds of ready-made designs for every format, ready to remix.'],
  ['03', 'AI Design Generation', 'Generate original images straight onto the canvas from a text prompt.'],
  ['04', 'Stock Photos', 'Millions of free, high-resolution photos searchable inside the editor.'],
  ['05', 'Stock Videos', 'Free stock footage you can drop in, trim and animate.'],
  ['06', 'Video Editor', 'A real multi-track timeline for clips, audio and animated layers.'],
  ['07', 'Text & Fonts', 'Editable type with a deep font library, styles, spacing and effects.'],
  ['08', 'Elements', 'Shapes, icons, stickers, lines and frames — drag-and-drop.'],
  ['09', 'Illustrations', 'A library of vector art that stays sharp at any size.'],
]

const ADVANCED = [
  ['10', 'Export — No Watermark', 'Download PNG, JPG, SVG, JSON or a looping WebM/GIF, clean.'],
  ['11', 'Custom Dimensions', 'Any size or aspect ratio — start from a preset or resize in a click.'],
  ['12', 'Animations', 'Preset entrance, exit and emphasis motion for any element.'],
  ['13', 'Filters & Adjust', 'Brightness, contrast, saturation, blur and one-tap filter looks.'],
  ['14', 'Auto-save & Storage', 'Projects are saved on your device and listed on your dashboard.'],
  ['15', 'Team Collaboration', 'Share work and build designs together.'],
  ['16', 'Open Source', 'Free forever and open on GitHub — inspect it, fork it, ship it.'],
]

function Features() {
  const history = useHistory()
  const go = () => history.push('/dashboard')

  const row = ([num, name, desc]: string[]) => (
    <div className="ix" key={num}>
      <span className="num">{num}</span>
      <span className="nm">
        {name}
        <span className="desc">{desc}</span>
      </span>
      <span className="sys">Editor</span>
    </div>
  )

  return (
    <EditorialShell folio="FEATURES · FREE & OPEN-SOURCE">
      <main className="wrap">
        <div className="shead reveal">
          <span className="no">№ 01</span>
          <h2>Features</h2>
          <span className="meta">Everything included</span>
        </div>
        <p className="standfirst reveal">
          A complete, free, open-source design studio in your browser — a Canva alternative with no paywall, no watermark
          and nothing to install.
        </p>

        <div className="dept reveal">
          <div className="dept-head"><span className="rn">I</span><h3>Core</h3><span className="ln" /><span className="cnt">09</span></div>
          {CORE.map(row)}
        </div>

        <div className="dept reveal" style={{ marginBottom: 40 }}>
          <div className="dept-head"><span className="rn">II</span><h3>Advanced</h3><span className="ln" /><span className="cnt">07</span></div>
          {ADVANCED.map(row)}
        </div>
      </main>

      <section className="backcover">
        <span className="ghost" aria-hidden="true">M</span>
        <div className="wrap inner reveal">
          <p className="ov">Pricing · Free forever</p>
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
