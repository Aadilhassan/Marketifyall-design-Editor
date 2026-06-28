import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import '../../styles/editorial.css'

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
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="ed-page">
      <div className="grain" aria-hidden="true" />
      <div className="topbar" aria-hidden="true" />

      {/* MASTHEAD */}
      <header className="masthead">
        <div className="wrap row">
          <span className="logo" style={{ cursor: 'pointer' }} onClick={() => history.push('/')}>
            Marketify<i>all</i>
          </span>
          <nav>
            <a href="#contents">Tools</a>
            <a href="#manifesto">Manifesto</a>
            <a href="#terms">Pricing</a>
          </nav>
          <span className="folio">DESIGN STUDIO № 01 · {year}</span>
          <span className="cta" onClick={go}>
            Open editor <span className="ar">↗</span>
          </span>
        </div>
      </header>

      {/* COVER */}
      <section className="cover" id="top">
        <span className="runhead" aria-hidden="true">Marketifyall · The Design Editor</span>
        <div className="wrap">
          <div className="cover-grid">
            <div className="cover-left">
              <p className="kick reveal">
                <span className="n">№ 01</span> · <b>The free design editor</b> for everything you publish
              </p>
              <h1 className="headline reveal">
                Design <em>anything,</em> in your browser.
              </h1>
              <p className="deck reveal">
                <span className="dropcap">A</span> full design studio with hundreds of templates, AI image generation,
                stock photos and video, real motion and animation, and one-click export — all free, with nothing to
                install.<sup>1</sup>
              </p>
              <div className="cover-actions reveal">
                <span className="btn" onClick={go}>
                  Start designing <span className="ar">↗</span>
                </span>
                <span className="tiny">Free · No account required<sup>2</sup></span>
              </div>
              <ol className="footnotes reveal">
                <li><b>1.</b> Runs entirely in the browser. Your work auto-saves to this device.</li>
                <li><b>2.</b> No paywall, no watermark, no trial timer.</li>
              </ol>
            </div>

            {/* RIGHT RAIL */}
            <aside className="cover-right reveal">
              <div className="seal-wrap">
                <svg className="seal spin" viewBox="0 0 160 160" role="img" aria-label="Marketifyall design studio seal">
                  <defs>
                    <path id="sealArc" d="M80,80 m-60,0 a60,60 0 1,1 120,0 a60,60 0 1,1 -120,0" />
                  </defs>
                  <circle className="ring" cx="80" cy="80" r="74" />
                  <circle className="ring" cx="80" cy="80" r="50" />
                  <text className="arc">
                    <textPath href="#sealArc" startOffset="0">
                      MARKETIFYALL · DESIGN STUDIO · EST. 2026 ·
                    </textPath>
                  </text>
                  <text className="mono-mark" x="80" y="92" textAnchor="middle">
                    M
                  </text>
                  <circle className="dot" cx="80" cy="30" r="2.6" />
                </svg>
              </div>
              <div className="inside">
                <h4>Inside this issue</h4>
                <ul>
                  <li data-n="P.01">Hundreds of <b>templates</b></li>
                  <li data-n="P.02"><b>AI Studio</b> — generate on canvas</li>
                  <li data-n="P.03">Video, timeline &amp; <b>animation</b></li>
                  <li data-n="P.04">Export anywhere — free</li>
                </ul>
              </div>
              <div className="epigraph">
                <q>Open a tab. Make something worth publishing.</q>
                <span className="by">— The thesis</span>
              </div>
              <div className="cover-foot">
                <div className="issue">Issue 01 — {year} · Price: Free</div>
                <svg className="barcode" viewBox="0 0 170 46" role="img" aria-label="barcode">
                  <g>
                    {[2, 4, 7, 12, 15, 19, 22, 26, 31, 35, 38, 42, 47, 50, 53, 57, 62, 65, 69, 72, 77, 80, 84, 87, 91, 96, 99, 102, 107, 111, 114, 118, 121, 126, 129, 133, 138, 141, 145, 148].map((x, i) => (
                      <rect key={i} x={x} y="0" width={(i % 3) + 1} height="36" />
                    ))}
                  </g>
                  <text className="lbl" x="0" y="45">M A R K E T I F Y A L L · 0 1</text>
                </svg>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="track">
          Templates<span>✳</span>AI generation<span>✳</span>Video &amp; animation<span>✳</span>Export anywhere<span>✳</span>Free
          forever<span>✳</span>Templates<span>✳</span>AI generation<span>✳</span>Video &amp; animation<span>✳</span>Export
          anywhere<span>✳</span>Free forever<span>✳</span>
        </div>
      </div>

      <main className="wrap">
        {/* LEAD DISPATCH */}
        <article className="dispatch reveal">
          <p className="overline ov">№ 01 · The lead story &mdash; <b>AI Studio</b></p>
          <div className="top">
            <div className="lead-no">01</div>
            <h3>
              Describe it, and watch it appear on the <em>canvas.</em>
            </h3>
          </div>
          <div className="body">
            <p>
              Generate images from a prompt, drop in stock photos and video, set type, and arrange it all on an infinite,
              snappy canvas — no design degree required.
            </p>
            <p>
              Every element is editable: recolor, resize, layer, mask, filter and animate. The editor keeps up with you,
              auto-saving as you go so a refresh never costs you work.
            </p>
            <p>
              When it&rsquo;s ready, export a crisp PNG, a JPG, an SVG, or a looping WebM/GIF animation — in a click, with
              no watermark.
            </p>
          </div>
          <p className="pull">A studio that fits in a browser tab.</p>
        </article>

        <div className="asterism" aria-hidden="true">⁂</div>

        {/* CONTENTS */}
        <section id="contents">
          <div className="shead reveal">
            <span className="no">№ 02</span>
            <h2>The toolkit</h2>
            <span className="meta">Everything, included &amp; free</span>
          </div>
          <p className="standfirst reveal">
            One editor for posts, stories, reels, thumbnails, video and more — organised into the tools you reach for,
            each one included in full.
          </p>

          <div className="dept reveal">
            <div className="dept-head"><span className="rn">I</span><h3>Create</h3><span className="ln" /><span className="cnt">04</span></div>
            <div className="ix"><span className="num">01</span><span className="nm">Templates<span className="desc">Hundreds of ready-made designs for every format — start from a great-looking base.</span></span><span className="sys">Create</span></div>
            <div className="ix"><span className="num">02</span><span className="nm">Elements<span className="desc">Shapes, icons, stickers, lines and frames to build any layout, drag-and-drop.</span></span><span className="sys">Create</span></div>
            <div className="ix"><span className="num">03</span><span className="nm">Text &amp; Fonts<span className="desc">Editable type with a deep font library, styles, spacing and effects.</span></span><span className="sys">Create</span></div>
            <div className="ix"><span className="num">04</span><span className="nm">Illustrations<span className="desc">A library of vector art and graphics that stay sharp at any size.</span></span><span className="sys">Create</span></div>
          </div>

          <div className="dept reveal">
            <div className="dept-head"><span className="rn">II</span><h3>AI &amp; Media</h3><span className="ln" /><span className="cnt">04</span></div>
            <div className="ix"><span className="num">05</span><span className="nm">AI Studio<span className="desc">Generate original images straight onto the canvas from a text prompt.</span></span><span className="sys">AI</span></div>
            <div className="ix"><span className="num">06</span><span className="nm">Stock Photos<span className="desc">Millions of free, high-resolution photos searchable inside the editor.</span></span><span className="sys">Media</span></div>
            <div className="ix"><span className="num">07</span><span className="nm">Stock Videos<span className="desc">Drop in free stock footage and trim it to fit your design.</span></span><span className="sys">Media</span></div>
            <div className="ix"><span className="num">08</span><span className="nm">Uploads<span className="desc">Bring your own photos, logos and video — they live in your library.</span></span><span className="sys">Media</span></div>
          </div>

          <div className="dept reveal">
            <div className="dept-head"><span className="rn">III</span><h3>Motion</h3><span className="ln" /><span className="cnt">03</span></div>
            <div className="ix"><span className="num">09</span><span className="nm">Animations<span className="desc">Preset entrance, exit and emphasis animations for any element.</span></span><span className="sys">Motion</span></div>
            <div className="ix"><span className="num">10</span><span className="nm">Video Timeline<span className="desc">Sequence clips, audio and animated layers on a real multi-track timeline.</span></span><span className="sys">Motion</span></div>
            <div className="ix"><span className="num">11</span><span className="nm">Video Player<span className="desc">Scrub, preview and play your composition right on the canvas.</span></span><span className="sys">Motion</span></div>
          </div>

          <div className="dept reveal">
            <div className="dept-head"><span className="rn">IV</span><h3>Finish</h3><span className="ln" /><span className="cnt">04</span></div>
            <div className="ix"><span className="num">12</span><span className="nm">Adjust &amp; Filters<span className="desc">Brightness, contrast, saturation, blur and one-tap filter looks.</span></span><span className="sys">Finish</span></div>
            <div className="ix"><span className="num">13</span><span className="nm">Resize<span className="desc">Switch formats and aspect ratios in a click — repurpose any design.</span></span><span className="sys">Finish</span></div>
            <div className="ix"><span className="num">14</span><span className="nm">Export<span className="desc">Download PNG, JPG, SVG, JSON or a looping WebM/GIF — no watermark.</span></span><span className="sys">Finish</span></div>
            <div className="ix"><span className="num">15</span><span className="nm">Auto-save<span className="desc">Your projects are saved on this device and listed on your dashboard.</span></span><span className="sys">Finish</span></div>
          </div>
        </section>
      </main>

      {/* MANIFESTO */}
      <section className="manifesto" id="manifesto">
        <div className="wrap">
          <p className="overline ov reveal">№ 03 · Manifesto</p>
          <blockquote className="reveal">
            Good design shouldn&rsquo;t need a <em>subscription</em> — or a manual.
          </blockquote>
          <p className="src reveal">
            <b>So we built a full studio that runs in any browser</b> — templates, AI, video and animation, free, with
            your work saved automatically as you go.
          </p>
        </div>
      </section>

      {/* FIGURES */}
      <div className="figwrap reveal">
        <div className="wrap">
          <div className="figcap"><span className="l">Fig. 1 — By the numbers</span><span className="r">Source: the studio</span></div>
          <div className="figures">
            <div className="fig"><div className="n">100<em>s</em></div><div className="c">Templates included</div></div>
            <div className="fig"><div className="n"><em>6</em></div><div className="c">Export formats</div></div>
            <div className="fig"><div className="n">0<em>s</em></div><div className="c">To install</div></div>
            <div className="fig"><div className="n"><em>$0</em></div><div className="c">Forever</div></div>
          </div>
        </div>
      </div>

      {/* TERMS */}
      <section className="terms" id="terms">
        <div className="wrap">
          <div className="shead reveal"><span className="no">№ 04</span><h2>Pricing</h2><span className="meta">No catch</span></div>
          <div className="card reveal">
            <div className="left">
              <div className="price">$0<small>Everything · forever</small></div>
            </div>
            <div className="right">
              <ul>
                <li><span className="b">✳</span> Every template &amp; tool unlocked</li>
                <li><span className="b">✳</span> AI image generation</li>
                <li><span className="b">✳</span> Video, timeline &amp; animation</li>
                <li><span className="b">✳</span> Export with no watermark</li>
                <li style={{ borderBottom: 0 }}><span className="b">✳</span> No account required</li>
              </ul>
            </div>
            <div className="cta-row">
              <span className="btn btn-lg" onClick={go}>
                Start designing <span className="ar">↗</span>
              </span>
              <span className="mono" style={{ color: 'var(--muted)', fontSize: '12px' }}>
                Runs in your browser · Saved on this device
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* BACK COVER */}
      <section className="backcover">
        <span className="ghost" aria-hidden="true">M</span>
        <div className="wrap inner reveal">
          <p className="ov">№ 05 · Back cover</p>
          <h2>
            Go <em>make</em> something.
          </h2>
          <p>Open the editor and turn an idea into a finished design, post or video — in minutes, for free.</p>
          <span className="btn btn-lg" onClick={go}>
            Open the editor <span className="ar">↗</span>
          </span>
        </div>
      </section>

      {/* COLOPHON */}
      <footer className="colophon">
        <div className="wrap inner">
          <div className="c">
            <span className="big">Marketifyall</span>
            Design Studio № 01 · {year}. A free, browser-based design editor — templates, AI, video and animation, with
            your work saved automatically. Set in <b>Fraunces</b>, <b>Space Grotesk</b> &amp; <b>Space Mono</b>.
          </div>
          <nav>
            <a href="#contents">Tools</a>
            <a href="#manifesto">Manifesto</a>
            <a href="#terms">Pricing</a>
            <span style={{ cursor: 'pointer' }} onClick={go}>
              Open editor <span className="ar">↗</span>
            </span>
          </nav>
          <div className="end">
            <span>© {year} Marketifyall · Design Editor</span>
            <span>Free · No account required</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
