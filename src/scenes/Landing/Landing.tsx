import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import '../../styles/editorial.css'
import '../../styles/landing.css'
import Seo from '@/components/Seo'

const GITHUB = 'https://github.com/Aadilhassan/Marketifyall-design-Editor'
const DISCORD = 'https://discord.gg/mzqYc69hxP'

const FORMATS = [
  { name: 'Instagram Post', dims: '1080×1080', ratio: '1 / 1', bg: 'linear-gradient(150deg,#e85d75,#d8401c)' },
  { name: 'Story / Reel', dims: '1080×1920', ratio: '9 / 16', bg: 'linear-gradient(160deg,#6d5ae0,#2b2a6b)' },
  { name: 'YouTube Thumb', dims: '1280×720', ratio: '16 / 9', bg: 'linear-gradient(150deg,#1f9e87,#0c352c)' },
  { name: 'Poster', dims: '2480×3508', ratio: '5 / 7', bg: 'linear-gradient(160deg,#2b2622,#d8401c)' },
  { name: 'Logo', dims: '500×500', ratio: '1 / 1', bg: 'linear-gradient(150deg,#e8a13c,#7c1d0c)' },
]

const FEATURES = [
  ['Aa', 'Templates & elements', 'Hundreds of ready-made designs, shapes, icons and editable type for any format.'],
  ['▷', 'Video & animation', 'A real multi-track timeline plus preset animations — then export a looping clip.'],
  ['↓', 'Export anywhere', 'PNG, JPG, SVG, JSON or WebM/GIF — clean, no watermark, in one click.'],
  ['{ }', 'Open & embeddable', 'Open-source on GitHub, and droppable into any website with one iframe.'],
]

function Landing() {
  const history = useHistory()
  const go = () => history.push('/dashboard')
  const year = new Date().getFullYear()

  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.ed-page .reveal'))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="ed-page">
      <Seo
        title="Marketifyall Design Editor — Free, Open-Source Canva Alternative"
        description="A free, open-source design editor in your browser: hundreds of templates, stock photos, video & animation and one-click export — no watermark, no account, and embeddable in any website."
        path="/"
      />
      <div className="topbar" aria-hidden="true" />

      {/* MASTHEAD */}
      <header className="masthead">
        <div className="wrap row">
          <span className="logo" style={{ cursor: 'pointer' }} onClick={() => history.push('/')}>
            Marketify<i>all</i>
          </span>
          <nav>
            <a href="#features">Features</a>
            <a href="#formats">Templates</a>
            <a style={{ cursor: 'pointer' }} onClick={() => history.push('/developers')}>Developers</a>
            <a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
            <a href={DISCORD} target="_blank" rel="noreferrer">Discord</a>
          </nav>
          <span className="folio">FREE · OPEN-SOURCE · {year}</span>
          <span className="cta" onClick={go}>
            Open editor <span className="ar">↗</span>
          </span>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="reveal">
            <span className="eyebrow">
              <b>Free</b> · Open-source · Embeddable
            </span>
            <h1>
              The design editor that lives in your <em>browser.</em>
            </h1>
            <p className="sub">
              Create social posts, stories, thumbnails, posters and short videos on a fast drag-and-drop canvas —
              hundreds of templates, your photos, real animation, and one-click export. A free, open-source Canva
              alternative you can also embed in any site.
            </p>
            <div className="acts">
              <span className="btn btn-lg" onClick={go}>
                Start designing <span className="ar">↗</span>
              </span>
              <a href={GITHUB} target="_blank" rel="noreferrer" className="ghbtn">
                ★ Star on GitHub
              </a>
              <a href={DISCORD} target="_blank" rel="noreferrer" className="discordbtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.598.349-1.22.645-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Join Discord community
              </a>
            </div>
            <p className="trust">No account · No watermark · Works offline</p>
          </div>

          {/* EDITOR MOCKUP */}
          <div className="reveal" aria-hidden="true">
            <div className="mock">
              <div className="mock-bar">
                <span className="lg">M</span>
                <span className="ti">Untitled design — 1080 × 1350</span>
                <span className="ex">Export</span>
              </div>
              <div className="mock-body">
                <div className="mock-rail">
                  <span className="tool on" />
                  <span className="tool" />
                  <span className="tool" />
                  <span className="tool" />
                  <span className="tool" />
                  <span className="tool" />
                </div>
                <div className="mock-canvas">
                  <div className="mock-design">
                    <span className="blob" />
                    <span className="ring" />
                    <span className="ey">Summer ’{String(year).slice(2)} · Lookbook</span>
                    <span className="hl">Made in the browser.</span>
                    <span className="h tl" />
                    <span className="h tr" />
                    <span className="h bl" />
                    <span className="h br" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORMATS */}
      <section className="sec" id="formats">
        <div className="wrap">
          <div className="reveal">
            <div className="kq">№ 01 · Templates</div>
            <h2>
              One editor. <em>Every</em> format.
            </h2>
            <p className="lead">
              Start from the right size for wherever you’re posting — or set a custom canvas. Pick a format and you’re
              designing in seconds.
            </p>
          </div>
          <div className="fmts reveal">
            {FORMATS.map(f => (
              <div className="fmt" key={f.name} onClick={go} style={{ cursor: 'pointer' }}>
                <div className="pv" style={{ height: 168, aspectRatio: f.ratio, background: f.bg }}>
                  <b>{f.name.split(' ')[0]}</b>
                </div>
                <div className="lbl">
                  <span>{f.name}</span>
                  <span className="d">{f.dims}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="sec" id="features">
        <div className="wrap">
          <div className="reveal">
            <div className="kq">№ 02 · Features</div>
            <h2>
              Everything you need to <em>design.</em>
            </h2>
            <p className="lead">A full studio — not a toy. Every tool included, nothing behind a paywall.</p>
          </div>
          <div className="feats reveal">
            {FEATURES.map(([ic, title, desc]) => (
              <div className="feat" key={title}>
                <div className="ic">{ic}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEVELOPERS / EMBED */}
      <section className="dev" id="developers">
        <div className="wrap">
          <div className="reveal">
            <div className="kq">№ 03 · Developers</div>
            <h2>
              Built for developers, <em>too.</em>
            </h2>
          </div>
          <div className="grid">
            <div className="reveal">
              <p>
                It’s open-source and embeddable. Drop the whole editor into your own product with a single iframe, or
                fork it and self-host — designs import and export as plain JSON.
              </p>
              <div className="links">
                <a onClick={() => history.push('/developers')}>Read the docs →</a>
                <a onClick={() => history.push('/embed')}>Try the embed →</a>
                <a href={GITHUB} target="_blank" rel="noreferrer">GitHub →</a>
              </div>
            </div>
            <pre className="code reveal">
              <span className="c">{'<!-- Embed the Marketifyall editor -->'}</span>
              {'\n'}
              <span className="k">{'<iframe'}</span>
              {'\n  src='}
              <span className="s">{'"https://design.marketifyall.com/embed"'}</span>
              {'\n  width='}
              <span className="s">{'"100%"'}</span>
              {' height='}
              <span className="s">{'"640"'}</span>
              {'\n  allow='}
              <span className="s">{'"clipboard-write; fullscreen"'}</span>
              <span className="k">{'>'}</span>
              {'\n'}
              <span className="k">{'</iframe>'}</span>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="ctaband">
        <div className="wrap">
          <h2>
            Go <em>make</em> something.
          </h2>
          <p>Open the editor and turn an idea into a finished design or video — in minutes, for free.</p>
          <span className="btn btn-lg" onClick={go}>
            Start designing <span className="ar">↗</span>
          </span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="big">Marketifyall</div>
              <p className="blurb">
                A free, open-source design editor — templates, video and animation — that runs in your browser and embeds
                in any site. Built by QuickShift Labs.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <a onClick={go}>Open editor</a>
              <a href="#formats">Templates</a>
              <a href="#features">Features</a>
              <a onClick={() => history.push('/dashboard')}>My projects</a>
            </div>
            <div>
              <h4>Developers</h4>
              <a onClick={() => history.push('/developers')}>Embed docs</a>
              <a onClick={() => history.push('/embed')}>Live embed</a>
              <a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
            </div>
            <div>
              <h4>Company</h4>
              <a onClick={() => history.push('/about')}>About</a>
              <a onClick={() => history.push('/contact')}>Contact</a>
              <a href={GITHUB} target="_blank" rel="noreferrer">Open source</a>
            </div>
            <div className="end">
              <span>© {year} Marketifyall · Design Editor</span>
              <span>Free · Open-source · No account required</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
