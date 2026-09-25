declare const VERSION: string
declare const ASSETS: string[]
declare const self: ServiceWorkerGlobalScope

const cachePrefix = 'hexmate:' + self.registration.scope + ':'
const cacheName = cachePrefix + VERSION
const shell = new URL('index.html', self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then(async (cache) => {
      await Promise.all(
        ASSETS.map(async (url) => {
          const response = await fetch(new Request(url, { cache: 'reload' }))
          if (!response.ok) throw new Error('Precaching failed: ' + url)
          await cache.put(
            url,
            // Safari rejects responses that followed redirects
            response.redirected
              ? new Response(await response.blob(), { headers: response.headers })
              : response,
          )
        }),
      )
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') void self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (names) => {
      await Promise.all(
        names
          .filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return
  event.respondWith(
    caches
      .match(request.mode === 'navigate' ? shell : request, { cacheName })
      .then((cached) => cached ?? fetch(request)),
  )
})
