import { ReactNode, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import '../styles/editorial.css'

interface Props {
  folio?: string
  children: ReactNode
}

/** Shared editorial chrome (masthead + colophon + reveal-on-scroll) for the
 *  Landing-adjacent marketing pages (About, Features, Contact, …). */
function EditorialShell({ folio, children }: Props) {
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
      <div className="grain" aria-hidden="true" />
      <div className="topbar" aria-hidden="true" />

      <header className="masthead">
        <div className="wrap row">
          <span className="logo" style={{ cursor: 'pointer' }} onClick={() => history.push('/')}>
            Marketify<i>all</i>
          </span>
          <nav>
            <a style={{ cursor: 'pointer' }} onClick={() => history.push('/features')}>Features</a>
            <a style={{ cursor: 'pointer' }} onClick={() => history.push('/about')}>About</a>
            <a style={{ cursor: 'pointer' }} onClick={() => history.push('/contact')}>Contact</a>
            <a href="https://github.com/Aadilhassan/Marketifyall-design-Editor" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <span className="folio">{folio || `MARKETIFYALL · ${year}`}</span>
          <span className="cta" onClick={go}>
            Open editor <span className="ar">↗</span>
          </span>
        </div>
      </header>

      {children}

      <footer className="colophon">
        <div className="wrap inner">
          <div className="c">
            <span className="big">Marketifyall</span>
            A free, open-source Canva alternative — templates, video and animation — that you can embed in any website.
            Built by <b>QuickShift Labs</b>. Set in <b>Fraunces</b>, <b>Space Grotesk</b> &amp; <b>Space Mono</b>.
          </div>
          <nav>
            <a style={{ cursor: 'pointer' }} onClick={() => history.push('/features')}>Features</a>
            <a style={{ cursor: 'pointer' }} onClick={() => history.push('/about')}>About</a>
            <a style={{ cursor: 'pointer' }} onClick={() => history.push('/contact')}>Contact</a>
            <a href="https://github.com/Aadilhassan/Marketifyall-design-Editor" target="_blank" rel="noreferrer">GitHub ↗</a>
            <span style={{ cursor: 'pointer' }} onClick={go}>
              Open editor <span className="ar">↗</span>
            </span>
          </nav>
          <div className="end">
            <span>© {year} Marketifyall · Design Editor</span>
            <span>Free &amp; open-source · No account required</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default EditorialShell
