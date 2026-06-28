import { useEffect } from 'react'

const BASE = 'https://design.marketifyall.com'

function upsertMeta(key: 'name' | 'property', keyVal: string, content: string) {
  let el = document.head.querySelector(`meta[${key}="${keyVal}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(key, keyVal)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

interface Props {
  title: string
  description: string
  path: string
}

/** Per-route <title>/description/canonical/OG/Twitter — so each page is indexed
 *  distinctly even though this is a client-rendered SPA. */
function Seo({ title, description, path }: Props) {
  useEffect(() => {
    const url = BASE + path
    document.title = title
    upsertMeta('name', 'title', title)
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'twitter:title', title)
    upsertMeta('property', 'twitter:description', description)
    upsertMeta('property', 'twitter:url', url)
    upsertCanonical(url)
  }, [title, description, path])

  return null
}

export default Seo
