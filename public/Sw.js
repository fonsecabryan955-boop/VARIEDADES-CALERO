const CACHE_NAME = 'variedades-calero-v1'

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

// Estrategia simple: red primero, y si falla usa lo último cacheado
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
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
      // Doble vibración tipo WhatsApp en vez de un solo golpe corto.
      vibrate: [300, 120, 300, 120, 300],
      // Suena con el sonido de notificación por defecto del sistema
      // (no la silenciamos) y se queda visible hasta que la toques,
      // en vez de desaparecer sola a los pocos segundos.
      silent: false,
      requireInteraction: true,
      renotify: true,
      // Un tag único por pedido: cada pedido nuevo dispara su propia
      // alerta con sonido/vibración en vez de reemplazar la anterior
      // en silencio.
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
