const CACHE_NAME = 'gather-v2'

// Install - skip waiting so new SW activates immediately
self.addEventListener('install', event => {
  self.skipWaiting()
})

// Activate - clean up old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch - network first, cache fallback for offline only
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip API routes - never cache these
  if (event.request.url.includes('/api/')) return

  // Skip Supabase requests
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Only use cache if network fails (offline)
        return caches.match(event.request)
      })
  )
})
