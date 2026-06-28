import { useHistory } from 'react-router-dom'
import EditorialShell from '@/components/EditorialShell'

function About() {
  const history = useHistory()
  const go = () => history.push('/dashboard')

  return (
    <EditorialShell folio="ABOUT · THE DESIGN EDITOR">
      <main className="wrap">
        <article className="dispatch reveal" style={{ borderTop: 'none' }}>
          <p className="overline ov">№ 01 · About</p>
          <div className="top">
            <div className="lead-no">M</div>
            <h3>
              A free, open-source design editor — a <em>Canva alternative</em> that runs in your browser.
            </h3>
          </div>
          <div className="body">
            <p>
              Design Editor by Marketifyall is a complete design studio you can open in a tab: templates, AI image
              generation, stock photos and video, real motion and animation, and one-click export — with no paywall and
              no watermark.
            </p>
            <p>
              It&rsquo;s built and maintained by <b>QuickShift Labs</b> and is fully open-source. Your work auto-saves to
              your device, so a refresh never costs you progress, and nothing leaves the browser unless you export it.
            </p>
            <p>
              The goal is simple: make great design tools available to everyone, for free, without the subscription and
              the lock-in.
            </p>
          </div>
          <p className="pull">Great design tools, free for everyone.</p>
        </article>

        <div className="asterism" aria-hidden="true">⁂</div>

        <section>
          <div className="shead reveal"><span className="no">№ 02</span><h2>What makes us different</h2></div>
          <div className="dept reveal">
            <div className="ix"><span className="num">01</span><span className="nm">Free &amp; open-source<span className="desc">Every feature unlocked, no watermark, no account — and the source is on GitHub.</span></span><span className="sys">Ethos</span></div>
            <div className="ix"><span className="num">02</span><span className="nm">Runs in the browser<span className="desc">Nothing to install; your designs auto-save to this device.</span></span><span className="sys">Ethos</span></div>
            <div className="ix"><span className="num">03</span><span className="nm">Built for creators<span className="desc">Made by people who design every day — fast, focused and honest.</span></span><span className="sys">Ethos</span></div>
            <div className="ix"><span className="num">04</span><span className="nm">Powered by QuickShift Labs<span className="desc">Part of the Marketifyall family of tools for modern creators.</span></span><span className="sys">Team</span></div>
          </div>
          <p className="standfirst reveal" style={{ marginTop: 24 }}>
            Open on{' '}
            <a href="https://github.com/Aadilhassan/Marketifyall-design-Editor" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
              GitHub
            </a>{' '}
            · A{' '}
            <a href="https://quickshiftlabs.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
              QuickShift Labs
            </a>{' '}
            project.
          </p>
        </section>
      </main>

      <section className="backcover">
        <span className="ghost" aria-hidden="true">M</span>
        <div className="wrap inner reveal">
          <p className="ov">№ 03 · Get started</p>
          <h2>
            Make <em>something.</em>
          </h2>
          <p>Open the editor and turn an idea into a finished design — in minutes, for free.</p>
          <span className="btn btn-lg" onClick={go}>
            Open the editor <span className="ar">↗</span>
          </span>
        </div>
      </section>
    </EditorialShell>
  )
}

export default About
