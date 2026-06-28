import { useHistory } from 'react-router-dom'
import EditorialShell from '@/components/EditorialShell'
import '../../styles/landing.css'

const GITHUB = 'https://github.com/Aadilhassan/Marketifyall-design-Editor'

const DIFF = [
  ['◎', 'Free & open-source', 'Every feature unlocked, no watermark, no account — and the full source is on GitHub.'],
  ['◧', 'Runs in the browser', 'Nothing to install. Your designs auto-save to this device and never leave unless you export.'],
  ['✷', 'Built for creators', 'Made by people who design every day — fast, focused and honest, no dark patterns.'],
  ['{ }', 'Embeddable', 'Drop the whole editor into any product with a single iframe — designs export as plain JSON.'],
]

function About() {
  const history = useHistory()
  const go = () => history.push('/dashboard')

  return (
    <EditorialShell folio="ABOUT · THE DESIGN EDITOR">
      <main className="wrap">
        <section className="sec" style={{ borderTop: 'none' }}>
          <div className="reveal">
            <div className="kq">About</div>
            <h2>
              A free, open-source <em>Canva alternative.</em>
            </h2>
            <p className="lead">
              Design Editor by Marketifyall is a complete design studio you can open in a browser tab — templates,
              photos, video and real animation, with one-click export and no watermark. It’s built by{' '}
              <b>QuickShift Labs</b>, fully open-source, and embeddable in any website.
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
            <div className="kq">What makes us different</div>
            <h2>
              Great design tools, <em>free for everyone.</em>
            </h2>
            <p className="lead">No subscription, no lock-in — just a fast, capable editor that’s yours to use and build on.</p>
            <div className="feats" style={{ marginTop: 30 }}>
              {DIFF.map(([ic, t, d]) => (
                <div className="feat" key={t}>
                  <div className="ic">{ic}</div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <section className="ctaband">
        <div className="wrap">
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
