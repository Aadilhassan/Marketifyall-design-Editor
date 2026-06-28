import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import '../../styles/editorial.css'
import '../../styles/landing.css'
import Seo from '@/components/Seo'

const GITHUB = 'https://github.com/Aadilhassan/Marketifyall-design-Editor'

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
