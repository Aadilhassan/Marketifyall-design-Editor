import { useHistory } from 'react-router-dom'
import EditorialShell from '@/components/EditorialShell'
import '../../styles/landing.css'

const GITHUB = 'https://github.com/Aadilhassan/Marketifyall-design-Editor'

const EMBED_SNIPPET = `<!-- Embed the Marketifyall editor -->
<iframe
  src="https://design.marketifyall.com/embed?embed=true&callback=true"
  width="100%"
  height="640"
  allow="clipboard-write; fullscreen"
  style="border:0">
</iframe>`

const LISTEN_SNIPPET = `// Listen for events coming from the editor
window.addEventListener('message', (event) => {
  const { type, data } = event.data || {}

  switch (type) {
    case 'marketifyall:ready':
      console.log('Editor is ready')
      break
    case 'marketifyall:design-complete':
      // data.image is a base64 PNG of the finished design
      saveDesign(data.image)
      break
    case 'marketifyall:cancelled':
      closeEditor()
      break
  }
})`

const COMMAND_SNIPPET = `const editor = document.querySelector('iframe').contentWindow

// Load an image onto the canvas
editor.postMessage({
  type: 'marketifyall:load-image',
  data: { imageUrl: 'https://example.com/photo.jpg' },
}, '*')

// Trigger an export -> fires 'marketifyall:design-complete'
editor.postMessage({ type: 'marketifyall:export' }, '*')

// Resize the canvas
editor.postMessage({
  type: 'marketifyall:set-size',
  data: { width: 1080, height: 1080 },
}, '*')`

const WHY = [
  ['◳', 'Full-featured editor', 'Templates, fonts, stock photos, shapes, video and animation — the whole studio in an iframe.'],
  ['⚡', '5-minute integration', 'Just drop in an iframe and listen for postMessage events. No SDK, no build step.'],
  ['🔒', 'Secure by default', 'Cross-origin messaging with configurable allowed origins. Verify event.origin and you’re safe.'],
]

const USES = [
  ['E-commerce', 'Let sellers design product images and ads without leaving your store.'],
  ['Print on demand', 'Give customers a canvas to design mugs, tees and posters in your sizes.'],
  ['Email marketing', 'Build on-brand email graphics inside your campaign builder.'],
  ['Social tools', 'Add a post/story/reel designer to your scheduling product.'],
  ['Education', 'A safe, simple design surface for classrooms and courses.'],
  ['CMS & blogging', 'Let authors create cover art and inline graphics in the editor.'],
]

function EmbedDocs() {
  const history = useHistory()
  const go = () => history.push('/dashboard')

  return (
    <EditorialShell folio="DEVELOPERS · EMBED THE EDITOR">
      <main className="wrap">
        {/* intro */}
        <section className="sec" style={{ borderTop: 'none' }}>
          <div className="reveal">
            <div className="kq">Developer documentation</div>
            <h2>
              Embed the editor in <em>your</em> product.
            </h2>
            <p className="lead">
              Marketifyall is open-source and embeddable. Add a full design surface to your app with a single iframe and
              a few lines of <span className="chip">postMessage</span> — no SDK, no build step.
            </p>
            <div className="doc-acts">
              <a className="btn" href="#quickstart">
                Quick start <span className="ar">↓</span>
              </a>
              <a className="ghbtn" onClick={() => history.push('/embed')} style={{ cursor: 'pointer' }}>
                Try the live embed
              </a>
              <a className="ghbtn" href={GITHUB} target="_blank" rel="noreferrer">
                ★ GitHub
              </a>
            </div>
          </div>

          <div className="feats reveal" style={{ marginTop: 38 }}>
            {WHY.map(([ic, t, d]) => (
              <div className="feat" key={t}>
                <div className="ic">{ic}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* quick start */}
        <section className="sec" id="quickstart">
          <div className="reveal">
            <div className="kq">№ 01 · Quick start</div>
            <h2>Drop in the iframe.</h2>
            <p className="lead">
              Point an iframe at the embed URL with <span className="chip">embed=true</span> and{' '}
              <span className="chip">callback=true</span>. That’s the whole install.
            </p>
            <pre className="code" style={{ marginTop: 22 }}>
              {EMBED_SNIPPET}
            </pre>
          </div>
        </section>

        {/* url params */}
        <section className="sec">
          <div className="reveal">
            <div className="kq">№ 02 · URL parameters</div>
            <h2>Configure the embed.</h2>
            <table className="doctable">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="chip">embed</span></td>
                  <td>false</td>
                  <td>Run the editor in embed mode (compact chrome, Done / Cancel controls).</td>
                </tr>
                <tr>
                  <td><span className="chip">callback</span></td>
                  <td>false</td>
                  <td>Emit postMessage events (ready / design-complete / cancelled) to the parent window.</td>
                </tr>
                <tr>
                  <td><span className="chip">theme</span></td>
                  <td>light</td>
                  <td>Editor color theme — <span className="chip">light</span> or <span className="chip">dark</span>.</td>
                </tr>
                <tr>
                  <td><span className="chip">imageUrl</span></td>
                  <td>—</td>
                  <td>URL-encoded image to pre-load onto the canvas when the editor opens.</td>
                </tr>
                <tr>
                  <td><span className="chip">hideBranding</span></td>
                  <td>false</td>
                  <td>Hide Marketifyall branding inside the embedded editor.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* events */}
        <section className="sec">
          <div className="reveal">
            <div className="kq">№ 03 · Events</div>
            <h2>
              Editor <em>→</em> your app.
            </h2>
            <p className="lead">The editor posts these messages to the parent window when callbacks are enabled.</p>
            <table className="doctable">
              <thead>
                <tr>
                  <th>Event type</th>
                  <th>Payload</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="chip">marketifyall:ready</span></td>
                  <td>—</td>
                  <td>The editor has fully loaded and is ready to use.</td>
                </tr>
                <tr>
                  <td><span className="chip">marketifyall:design-complete</span></td>
                  <td><span className="chip">{'{ image }'}</span></td>
                  <td>User clicked “Done” — <span className="chip">data.image</span> is a base64 PNG of the design.</td>
                </tr>
                <tr>
                  <td><span className="chip">marketifyall:cancelled</span></td>
                  <td>—</td>
                  <td>User clicked “Cancel”.</td>
                </tr>
              </tbody>
            </table>
            <p className="code-cap">Listen in your app</p>
            <pre className="code">{LISTEN_SNIPPET}</pre>
          </div>
        </section>

        {/* commands */}
        <section className="sec">
          <div className="reveal">
            <div className="kq">№ 04 · Commands</div>
            <h2>
              Your app <em>→</em> editor.
            </h2>
            <p className="lead">Send these messages to the iframe to drive the editor programmatically.</p>
            <table className="doctable">
              <thead>
                <tr>
                  <th>Command type</th>
                  <th>Payload</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="chip">marketifyall:load-image</span></td>
                  <td><span className="chip">{'{ imageUrl }'}</span></td>
                  <td>Load an image URL onto the editor canvas.</td>
                </tr>
                <tr>
                  <td><span className="chip">marketifyall:export</span></td>
                  <td>—</td>
                  <td>Programmatically trigger an export (fires design-complete).</td>
                </tr>
                <tr>
                  <td><span className="chip">marketifyall:set-size</span></td>
                  <td><span className="chip">{'{ width, height }'}</span></td>
                  <td>Set the canvas dimensions in pixels.</td>
                </tr>
              </tbody>
            </table>
            <p className="code-cap">Send a command</p>
            <pre className="code">{COMMAND_SNIPPET}</pre>
          </div>
        </section>

        {/* use cases */}
        <section className="sec">
          <div className="reveal">
            <div className="kq">№ 05 · Use cases</div>
            <h2>Perfect for…</h2>
            <div className="feats" style={{ marginTop: 30 }}>
              {USES.map(([t, d]) => (
                <div className="feat" key={t}>
                  <h3 style={{ marginTop: 0 }}>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* CTA */}
      <section className="ctaband">
        <div className="wrap">
          <h2>
            Ready to <em>integrate?</em>
          </h2>
          <p>Try the editor, copy the iframe, and ship a design surface in your product today.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="btn btn-lg" onClick={go}>
              Open the editor <span className="ar">↗</span>
            </span>
            <a
              className="btn btn-lg"
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              style={{ background: 'transparent', color: '#fff', borderColor: '#fff' }}
            >
              View source
            </a>
          </div>
        </div>
      </section>
    </EditorialShell>
  )
}

export default EmbedDocs
