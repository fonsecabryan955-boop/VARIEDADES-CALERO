import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Public VAPID key (safe to expose in client code — it's the "public" half).
const VAPID_PUBLIC_KEY = 'BFfuUTsQdDETGiMyHHYKBbuNO6BKPl9ySHZgVXNE2jmmKW_9At194RxKNGSyyDB1PpTLjmK9G9mMmBRqZU983io'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

// Small pill button that lives on the admin home screen. Shows nothing if
// push isn't supported on this browser/device (older Safari, etc.), shows
// "Activar avisos" if not yet subscribed, and a quiet confirmation once it is.
export default function PushNotificationSetup() {
  const [status, setStatus] = useState('checking') // checking | unsupported | off | on | asking | error

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setStatus(sub ? 'on' : 'off')
  }

  useEffect(() => {
    checkSubscription()
  }, [])

  const enable = async () => {
    setStatus('asking')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('off')
        return
      }
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }
      const json = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: 'endpoint' }
      )
      if (error) throw error
      setStatus('on')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }

  if (status === 'checking' || status === 'unsupported') return null

  return (
    <div style={styles.wrap}>
      {status === 'on' ? (
        <span style={styles.badgeOn}>🔔 Avisos activados en este dispositivo</span>
      ) : (
        <button style={styles.btn} onClick={enable} disabled={status === 'asking'}>
          {status === 'asking' ? 'Activando...' : '🔔 Activar avisos de pedidos'}
        </button>
      )}
      {status === 'error' && <p style={styles.error}>No se pudo activar. Probá de nuevo o revisá permisos de notificación del navegador.</p>}
    </div>
  )
}

const styles = {
  wrap: { marginBottom: 20 },
  btn: {
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 13,
    cursor: 'pointer',
  },
  badgeOn: {
    display: 'inline-block',
    background: 'rgba(111,174,116,0.12)',
    color: '#7fd88f',
    border: '1px solid #2d5636',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 12.5,
  },
  error: { color: '#ff9b9b', fontSize: 12, marginTop: 6 },
}
