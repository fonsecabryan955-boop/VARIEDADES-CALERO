const CACHE_NAME = 'variedades-calero-v2' // bump: fuerza a purgar todo lo cacheado por versiones anteriores

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Estrategia:
// - Navegación (el documento HTML principal): SIEMPRE red, nunca cache.
//   Esto evita que quede un index.html viejo apuntando a chunks JS que
//   ya no existen en el servidor (o mezclado con chunks de otra versión).
// - Todo lo demás (JS, CSS, imágenes): red primero, y si falla se
//   usa lo último cacheado (para que funcione offline).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// ---------- Notificaciones push (nuevos pedidos online) ----------
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Variedades Calero', body: event.data ? event.data.text() : 'Tenés un nuevo pedido' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Variedades Calero', {
      body: data.body || 'Tenés un nuevo pedido online',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [300, 120, 300, 120, 300],
      silent: false,
      requireInteraction: true,
      renotify: true,
      tag: data.tag || `pedido-${Date.now()}`,
      actions: [{ action: 'view', title: 'Ver pedido' }],
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
