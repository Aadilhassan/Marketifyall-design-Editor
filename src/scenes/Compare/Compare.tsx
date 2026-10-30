import { useEffect } from 'react'
import { useHistory, useParams, Redirect } from 'react-router-dom'
import EditorialShell from '@/components/EditorialShell'
import Seo from '@/components/Seo'
import { COMPARISONS, REVIEWED, comparisonBySlug } from './data'
import '../../styles/landing.css'
import '../../styles/compare.css'

const TRY = '/design?demo=true'

function useNav() {
  const history = useHistory()
  // In-app links keep a real href (crawlers, middle-click) but route client-side.
  return (path: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    history.push(path)
  }
}

export function CompareIndex() {
  const nav = useNav()
  useEffect(() => window.scrollTo(0, 0), [])
  return (
    <EditorialShell folio="COMPARE · HOW WE STACK UP">
      <Seo
        title="Marketifyall vs the alternatives — Canva, Adobe Express, Clipchamp and more"
        description="Honest comparisons of Marketifyall with Canva, Adobe Express, Clipchamp, Kapwing, VistaCreate, Polotno, Pixlr and Photopea — including where each of them is the better pick."
        path="/compare"
      />
      <main className="wrap cmp">
        <section className="sec" style={{ borderTop: 'none' }}>
          <div className="kq">Compare</div>
          <h2>
            How Marketifyall <em>stacks up.</em>
          </h2>
          <p className="lead">
            Side-by-side notes on the tools people usually weigh us against — and, in every case, where the other tool is
            the better choice.
          </p>
        </section>
        <section className="cmp-list">
          {COMPARISONS.map((c, i) => (
            <a key={c.slug} className="cmp-card" href={`/compare/${c.slug}`} onClick={nav(`/compare/${c.slug}`)}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <span className="t">
                vs <b>{c.name}</b>
              </span>
              <span className="k">{c.kind}</span>
              <span className="ar">↗</span>
            </a>
          ))}
        </section>
      </main>
    </EditorialShell>
  )
}

function Compare() {
  const { slug } = useParams<{ slug: string }>()
  const nav = useNav()
  const c = comparisonBySlug(slug)
  // Links from long pages (the landing footer) would otherwise land mid-article.
  useEffect(() => window.scrollTo(0, 0), [slug])
  if (!c) return <Redirect to="/compare" />
  const others = COMPARISONS.filter(o => o.slug !== c.slug)

  return (
    <EditorialShell folio={`COMPARE · VS ${c.name.toUpperCase()}`}>
      <Seo title={c.title} description={c.description} path={`/compare/${c.slug}`} />
      <main className="wrap cmp">
        <article>
          <header className="sec cmp-head" style={{ borderTop: 'none' }}>
            <a className="kq" href="/compare" onClick={nav('/compare')}>
              ← All comparisons
            </a>
            <h1>
              {c.headline[0]} <em>{c.headline[1]}</em>
            </h1>
            <p className="cmp-meta">
              {c.name}: {c.kind} · Reviewed {REVIEWED}
            </p>
            {c.intro.map(p => (
              <p className="cmp-p" key={p.slice(0, 24)}>
                {p}
              </p>
            ))}
          </header>

          <section className="sec">
            <div className="kq">At a glance</div>
            <div className="cmp-table" role="table" aria-label={`Marketifyall compared with ${c.name}`}>
              <div className="row head" role="row">
                <span role="columnheader">Feature</span>
                <span role="columnheader">Marketifyall</span>
                <span role="columnheader">{c.name}</span>
              </div>
              {c.table.map(([f, us, them]) => (
                <div className="row" role="row" key={f}>
                  <span role="rowheader">{f}</span>
                  <span role="cell" className="us">
                    {us}
                  </span>
                  <span role="cell">{them}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="sec cmp-split">
            <div>
              <div className="kq">Where {c.name} is better</div>
              <ul>
                {c.theyWin.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="kq">Where Marketifyall is better</div>
              <ul>
                {c.weWin.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="sec">
            <div className="kq">The verdict</div>
            <div className="cmp-verdict">
              <p>
                <b>Choose {c.name} if</b> {c.pickThem.charAt(0).toLowerCase() + c.pickThem.slice(1)}
              </p>
              <p>
                <b>Choose Marketifyall if</b> {c.pickUs.charAt(0).toLowerCase() + c.pickUs.slice(1)}
              </p>
            </div>
            <div className="doc-acts">
              <a className="btn" href={TRY} onClick={nav(TRY)}>
                Try Marketifyall free <span className="ar">↗</span>
              </a>
              <span className="cmp-note">No sign-up · no watermark</span>
            </div>
          </section>

          <section className="sec">
            <div className="kq">Questions</div>
            <dl className="cmp-faq">
              {c.faq.map(([q, a]) => (
                <div key={q}>
                  <dt>{q}</dt>
                  <dd>{a}</dd>
                </div>
              ))}
            </dl>
            <p className="cmp-fine">
              {c.name} is a trademark of its owner. Details about {c.name} come from its public website and change over
              time — check their current plans before deciding.
            </p>
          </section>

          <section className="sec cmp-more">
            <div className="kq">More comparisons</div>
            <div className="cmp-chips">
              {others.map(o => (
                <a key={o.slug} href={`/compare/${o.slug}`} onClick={nav(`/compare/${o.slug}`)}>
                  vs {o.name}
                </a>
              ))}
            </div>
          </section>
        </article>
      </main>
    </EditorialShell>
  )
}

export default Compare
