declare const VERSION: string
declare const ASSETS: string[]
declare const self: ServiceWorkerGlobalScope

const cachePrefix = 'hex-strategy:' + self.registration.scope + ':'
const cacheName = cachePrefix + VERSION
const shell = new URL('index.html', self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) =>
        cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))),
      ),
  )
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
