import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import '../../styles/editorial.css'
import '../../styles/landing.css'
import '../../styles/home.css'
import Seo from '@/components/Seo'

const GITHUB = 'https://github.com/Aadilhassan/Marketifyall-design-Editor'
const DISCORD = 'https://discord.gg/mzqYc69hxP'
/** The editor without signing in (demo session). */
const TRY = '/design?demo=true'

const TICKER = [
  'Magic Resize',
  'Brand Kit',
  'Curved text',
  'Magic Eraser',
  'Photo frames',
  'QR codes',
  'Charts',
  'Multi-track video',
  'MP4 export',
  'Version history',
  'Comments',
  'Rulers & guides',
  'Draw',
  'Present mode',
  '128 templates',
  'Transparent PNG',
]

const INDEX: { desk: string; items: [string, string][] }[] = [
  {
    desk: 'Design',
    items: [
      ['Templates', '128'],
      ['Magic Resize', 'any size'],
      ['Brand Kit', 'colours · fonts'],
      ['Text effects & curves', '8 styles'],
      ['Position & align', 'exact px'],
      ['Rulers & guides', 'Shift R'],
      ['Draw', 'pen · marker'],
    ],
  },
  {
    desk: 'Photos',
    items: [
      ['Stock photos & video', 'Pexels'],
      ['Frames & shadows', 'heart · arch…'],
      ['Magic Eraser', 'on-device'],
      ['Remove background', 'on-device'],
      ['Adjust & crop', 'filters'],
      ['QR codes', 'vector'],
      ['Charts', '5 types'],
    ],
  },
  {
    desk: 'Video',
    items: [
      ['Multi-track timeline', 'magnetic'],
      ['Split · trim · snap', 'S'],
      ['Transitions', '5 kinds'],
      ['Speed & fades', '0.25–4×'],
      ['Music & voice', 'mixed'],
      ['Animations', 'presets'],
      ['Shortcuts', 'J K L'],
    ],
  },
  {
    desk: 'Finish',
    items: [
      ['Pages & Present', 'full screen'],
      ['PDF', 'multi-page'],
      ['PNG · JPG · SVG', 'up to 4×'],
      ['MP4 · WebM · GIF', 'up to 4K'],
      ['Version history', 'auto'],
      ['Comments', 'pinned'],
      ['Embed', 'iframe'],
    ],
  },
]

function Landing() {
  const history = useHistory()
  const go = (path: string) => () => history.push(path)
  // In-app links keep a real href (crawlers, middle-click) but route client-side.
  const nav = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    history.push(path)
  }
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
    <div className="ed-page home">
      <Seo
        title="Marketifyall Design Editor — free, open-source design & video studio"
        description="Design and video, made in the browser. Templates, Magic Resize, Brand Kit, text effects, a multi-track video timeline and flicker-free MP4 export. Free, open source (MIT), no watermark, and embeddable."
        path="/"
      />
      <div className="topbar" aria-hidden="true" />

      {/* MASTHEAD */}
      <header className="masthead">
        <div className="wrap row">
          <a className="logo" href="/" onClick={nav('/')}>
            Marketify<i>all</i>
          </a>
          <nav aria-label="Main">
            <a href="#design">Design</a>
            <a href="#video">Video</a>
            <a href="#index">Everything</a>
            <a href="/developers" onClick={nav('/developers')}>
              Developers
            </a>
            <a href={GITHUB} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
          <span className="folio">Free · Open source · {year}</span>
          <a className="cta" href={TRY} onClick={nav(TRY)}>
            Try it now <span className="ar">↗</span>
          </a>
        </div>
      </header>

      <div className="dateline">
        <div className="wrap">
          <span>
            <b>The Studio Edition</b> · design &amp; video in one tab
          </span>
          <span className="hide-sm">MIT licence · No watermark · No paywalled tools</span>
        </div>
      </div>

      <main>
        {/* FRONT PAGE */}
        <section className="front">
          <div className="wrap">
            <div className="front-head reveal">
              <h1>
                Design and video, <em>made in the browser.</em>
              </h1>
              <div>
                <p className="standfirst">
                  A complete studio in a tab: templates, photos, type, a real video timeline and clean exports.{' '}
                  <b>Free, open source and yours to embed</b>, with every tool included.
                </p>
                <div className="acts">
                  <a className="btn btn-lg" href={TRY} onClick={nav(TRY)}>
                    Try the editor <span className="ar">↗</span>
                  </a>
                  <button type="button" className="btn-ghost" onClick={go('/dashboard')}>
                    Your projects
                  </button>
                </div>
                <p className="note">No sign-up to try · No watermark on exports</p>
              </div>
            </div>

            <figure className="plate reveal">
              <div className="frame">
                <img
                  src="/landing/hero-editor.webp"
                  width={2000}
                  height={1250}
                  alt="The Marketifyall editor with a travel template open, the template library on the left and the page in the middle."
                  {...{ fetchpriority: 'high' }}
                />
              </div>
              <div className="ann" style={{ left: '1.2%', top: '24%' }} aria-hidden="true">
                <span className="dot" />
                <i />
                <span>14 panels</span>
              </div>
              <div className="ann l" style={{ right: '35%', top: '46%' }} aria-hidden="true">
                <span className="dot" />
                <i />
                <span>Your page</span>
              </div>
              <div className="ann l" style={{ right: '4.6%', top: '4.4%' }} aria-hidden="true">
                <span className="dot" />
                <i />
                <span>One-click download</span>
              </div>
              <figcaption className="figline">
                <span>
                  <b>Fig. 1</b> — The editor, with a template open.
                </span>
                <span>Actual screenshot, not a mock-up.</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* TICKER */}
        <div className="ticker" aria-label="What's inside">
          <div className="track">
            {[0, 1].map(copy => (
              <ul key={copy} aria-hidden={copy === 1}>
                {TICKER.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* DESIGN DESK */}
        <section className="desk" id="design">
          <div className="wrap">
            <div className="desk-head reveal">
              <div className="no">
                № 01<b>The design desk</b>
              </div>
              <div>
                <h2>
                  Layouts that look <em>finished.</em>
                </h2>
                <p className="lede">
                  Start from a template or a blank page and shape it with tools that usually sit behind a paywall. Every
                  style stays editable, so you can change the words at the last minute.
                </p>
              </div>
            </div>
            <div className="split reveal">
              <div className="copy">
                <ul className="points">
                  <li>
                    <span className="n">01</span>
                    <div>
                      <b>Magic Resize</b>Turn one design into every format. Content re-flows to the new page instead of
                      sitting in a corner.
                    </div>
                  </li>
                  <li>
                    <span className="n">02</span>
                    <div>
                      <b>Text that has a voice</b>Shadow, lift, hollow, splice, echo, outline, neon and curved text.
                    </div>
                  </li>
                  <li>
                    <span className="n">03</span>
                    <div>
                      <b>Your brand, one click away</b>Keep your colours, fonts and logos in a Brand Kit and apply them to
                      any design.
                    </div>
                  </li>
                  <li>
                    <span className="n">04</span>
                    <div>
                      <b>Precise when you need it</b>Smart guides, rulers, align and distribute, exact sizes in pixels.
                    </div>
                  </li>
                </ul>
                <div className="chips" aria-label="Popular formats">
                  <span>Instagram 1080×1080</span>
                  <span>Story 1080×1920</span>
                  <span>YouTube 1280×720</span>
                  <span>A4 poster</span>
                  <span>Custom</span>
                </div>
              </div>
              <figure className="shot">
                <img
                  src="/landing/effects.webp"
                  width={2000}
                  height={1250}
                  loading="lazy"
                  alt="The Effects panel applying a curved, spliced text style to the words Open studio."
                />
              </figure>
            </div>
          </div>
        </section>

        {/* CUTTING ROOM */}
        <section className="desk" id="video">
          <div className="wrap">
            <div className="desk-head reveal">
              <div className="no">
                № 02<b>The cutting room</b>
              </div>
              <div>
                <h2>
                  A timeline you can <em>actually</em> edit on.
                </h2>
                <p className="lede">
                  Drop clips on a magnetic track, split with S, trim to the frame, add music and transitions. What plays in
                  the preview is exactly what you export.
                </p>
              </div>
            </div>
            <figure className="shot wide reveal">
              <img
                src="/landing/video-timeline.webp"
                width={2000}
                height={1250}
                loading="lazy"
                alt="The video editor: a seal video with the title Made in the browser, and a timeline with two clips, filmstrip thumbnails and clip settings."
              />
            </figure>
            <div className="stats reveal">
              <div>
                <div className="k">Every frame</div>
                <div className="v">Rendered one by one and checked before it's encoded, so exports don't flicker.</div>
              </div>
              <div>
                <div className="k">Real MP4</div>
                <div className="v">H.264 video up to 4K, plus WebM, GIF and audio-only, where your browser supports it.</div>
              </div>
              <div>
                <div className="k">Sound mixed</div>
                <div className="v">Music, voice and video audio with volume, fades and speed, mixed into the file.</div>
              </div>
              <div>
                <div className="k">On your device</div>
                <div className="v">Encoding happens in your browser. Nothing is uploaded to render your video.</div>
              </div>
            </div>
          </div>
        </section>

        {/* POCKET EDITION */}
        <section className="desk" id="mobile">
          <div className="wrap">
            <div className="desk-head reveal">
              <div className="no">
                № 03<b>The pocket edition</b>
              </div>
              <div>
                <h2>
                  The same studio, <em>on your phone.</em>
                </h2>
              </div>
            </div>
            <div className="pocket reveal">
              <div className="side">
                <h3>Made for thumbs</h3>
                Panels open as sheets you can drag, the toolbar scrolls sideways, and pinch zooms the page. Long-press any
                element for its menu.
              </div>
              <div className="phone">
                <img
                  src="/landing/phone.webp"
                  width={780}
                  height={1688}
                  loading="lazy"
                  alt="The editor on a phone, with a travel poster and the bottom tab bar."
                />
              </div>
              <div className="side">
                <h3>Pick up where you left off</h3>
                Tablets get the full toolbar with a drawer that slides over the page. Video edits have a simplified
                timeline on small screens.
              </div>
            </div>
          </div>
        </section>

        {/* INDEX */}
        <section className="desk" id="index">
          <div className="wrap">
            <div className="desk-head reveal">
              <div className="no">
                № 04<b>The index</b>
              </div>
              <div>
                <h2>
                  Everything is <em>included.</em>
                </h2>
                <p className="lede">No premium tier, no locked tools, no watermark on what you make.</p>
              </div>
            </div>
            <div className="index reveal">
              {INDEX.map(group => (
                <section key={group.desk} aria-label={group.desk}>
                  <h3>{group.desk}</h3>
                  <ul>
                    {group.items.map(([name, meta]) => (
                      <li key={name}>
                        {name}
                        <span>{meta}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </section>

        {/* EDITOR'S NOTE + DEVELOPERS */}
        <section className="desk" id="open">
          <div className="wrap">
            <div className="desk-head reveal">
              <div className="no">
                № 05<b>Editor's note</b>
              </div>
              <div>
                <h2>
                  A studio you <em>own.</em>
                </h2>
              </div>
            </div>
            <div className="note-grid">
              <div className="letter reveal">
                <p>
                  Good design tools shouldn't be rented by the month. Marketifyall is a full design and video studio that
                  anyone can open in a browser tab, and the whole thing is open source.
                </p>
                <p>
                  The code is MIT-licensed on GitHub. Video and audio you add stay in your browser, your exports carry no
                  watermark, and if you build a product of your own you can put this editor inside it.
                </p>
                <p className="sig">— The Marketifyall team</p>
              </div>
              <div className="reveal">
                <div className="facts">
                  <div>
                    <span>Price</span>
                    <span>Free</span>
                  </div>
                  <div>
                    <span>Licence</span>
                    <span>MIT</span>
                  </div>
                  <div>
                    <span>Watermark</span>
                    <span>Never</span>
                  </div>
                  <div>
                    <span>Video &amp; audio uploads</span>
                    <span>Stay in your browser</span>
                  </div>
                  <div>
                    <span>Embed</span>
                    <span>One iframe</span>
                  </div>
                </div>
                <div className="embed">
                  <pre aria-label="Embed code">
                    <span className="c">{'<!-- Put the editor in your product -->'}</span>
                    {'\n'}
                    <span className="k">{'<iframe'}</span>
                    {'\n  src='}
                    <span className="s">{'"https://design.marketifyall.com/embed"'}</span>
                    {'\n  width='}
                    <span className="s">{'"100%"'}</span>
                    {' height='}
                    <span className="s">{'"640"'}</span>
                    <span className="k">{'>'}</span>
                    <span className="k">{'</iframe>'}</span>
                  </pre>
                  <div className="links">
                    <a href="/developers" onClick={nav('/developers')}>
                      Embed docs →
                    </a>
                    <a href={GITHUB} target="_blank" rel="noreferrer">
                      Source on GitHub →
                    </a>
                    <a href={DISCORD} target="_blank" rel="noreferrer">
                      Discord →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CLOSING */}
        <section className="closing">
          <div className="wrap">
            <h2>
              Go <em>make</em> something.
            </h2>
            <p>Open the editor and turn an idea into a finished design or video, in the time it takes to read this page.</p>
            <div className="acts">
              <a className="btn btn-lg" href={TRY} onClick={nav(TRY)}>
                Try the editor <span className="ar">↗</span>
              </a>
              <a className="btn-ghost" href={GITHUB} target="_blank" rel="noreferrer">
                ★ Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="big">Marketifyall</div>
              <p className="blurb">
                A free, open-source design and video studio that runs in your browser and embeds in any site. Built by
                QuickShift Labs.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <a href={TRY} onClick={nav(TRY)}>
                Try the editor
              </a>
              <a href="/dashboard" onClick={nav('/dashboard')}>
                Your projects
              </a>
              <a href="#design">Design</a>
              <a href="#video">Video</a>
            </div>
            <div>
              <h4>Developers</h4>
              <a href="/developers" onClick={nav('/developers')}>
                Embed docs
              </a>
              <a href="/embed" onClick={nav('/embed')}>
                Live embed
              </a>
              <a href={GITHUB} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="/about" onClick={nav('/about')}>
                About
              </a>
              <a href="/contact" onClick={nav('/contact')}>
                Contact
              </a>
              <a href={DISCORD} target="_blank" rel="noreferrer">
                Discord
              </a>
            </div>
            <div className="end">
              <span>© {year} Marketifyall · Design Editor</span>
              <span>Free · Open source · MIT</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
