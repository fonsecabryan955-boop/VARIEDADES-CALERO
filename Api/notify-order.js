// Vercel Serverless Function
// URL final: https://tu-dominio.vercel.app/api/notify-order
//
// Supabase llama a esta URL automáticamente (vía Database Webhook) cada vez
// que se inserta una fila en "orders". Si es un pedido online, le manda una
// notificación push a todos los dispositivos admin suscritos.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Simple shared-secret check so random people on the internet can't spam
  // this endpoint and drain your push quota / spam your phone.
  const secret = req.headers['x-webhook-secret']
  if (!secret || secret !== process.env.NOTIFY_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const payload = req.body || {}
  const order = payload.record || payload.new || payload

  // Only notify for online store orders, not in-store POS sales.
  if (!order || order.order_type !== 'online') {
    res.status(200).json({ skipped: true })
    return
  }

  try {
    webpush.setVapidDetails(
      'mailto:notificaciones@variedadescalero.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: subs, error } = await supabase.from('push_subscriptions').select('*')
    if (error) throw error

    const total = Number(order.total || 0).toFixed(2)
    const notificationPayload = JSON.stringify({
      title: '🛍️ Nuevo pedido online',
      body: `Pedido por $${total}. Tocá para verlo.`,
      url: '/',
    })

    const results = await Promise.allSettled(
      (subs || []).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notificationPayload
        )
      )
    )

    // Clean up subscriptions that are no longer valid (uninstalled, expired).
    const toDelete = []
    results.forEach((r, i) => {
      if (r.status === 'rejected' && (r.reason?.statusCode === 404 || r.reason?.statusCode === 410)) {
        toDelete.push(subs[i].id)
      }
    })
    if (toDelete.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', toDelete)
    }

    res.status(200).json({ sent: results.filter((r) => r.status === 'fulfilled').length, removed: toDelete.length })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
