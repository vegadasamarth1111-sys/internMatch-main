const CACHE = 'internmatch-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/IM.png'
]

// INSTALL
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ACTIVATE
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// FETCH
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // ❌ skip backend / API calls
  if (url.port === '8000' || url.pathname.startsWith('/api/')) return

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache useful assets
        if (
          res.ok &&
          ['document', 'script', 'style', 'image'].includes(e.request.destination)
        ) {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(e.request, clone))
        }
        return res
      })
      .catch(async () => {
        // Try cache
        const cached = await caches.match(e.request)
        if (cached) return cached

        // SPA fallback (VERY IMPORTANT for React Router)
        if (e.request.destination === 'document') {
          return caches.match('/index.html')
        }

        // Final fallback (must return Response)
        return new Response('Offline', {
          status: 503,
          statusText: 'Offline'
        })
      })
  )
})