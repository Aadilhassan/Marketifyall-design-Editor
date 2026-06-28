/* Marketifyall service worker — offline support + PWA installability.
 * Network-first: always try the network (so app code never goes stale), cache
 * each response, and fall back to the cache (or the app shell) when offline. */
const CACHE = 'marketifyall-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  let url
  try {
    url = new URL(req.url)
  } catch (e) {
    return
  }
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone()
        caches
          .open(CACHE)
          .then(c => c.put(req, copy))
          .catch(() => {})
        return res
      })
      .catch(() =>
        caches.match(req).then(cached => cached || (req.mode === 'navigate' ? caches.match('/index.html') : undefined))
      )
  )
})
