import React, { useState, useEffect } from 'react'
import { supabase } from './src/supabaseClient'

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
      <style>{`
        @keyframes vc-pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.45); }
          70% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
        }
        @keyframes vc-bell-swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-12deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-6deg); }
          80% { transform: rotate(4deg); }
        }
        @keyframes vc-fade-up {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .vc-push-btn {
          animation: vc-pulse-ring 2.4s ease-out infinite;
        }
        .vc-push-btn:hover {
          border-color: #d4af37 !important;
          background: linear-gradient(180deg, #1c1c1c 0%, #161616 100%) !important;
        }
        .vc-push-btn:hover .vc-bell {
          animation: vc-bell-swing 0.5s ease-in-out;
        }
        .vc-push-btn:active {
          transform: scale(0.98);
        }
        .vc-badge-on {
          animation: vc-fade-up 0.35s ease-out;
        }
        .vc-dot {
          animation: vc-pulse-ring 2s ease-out infinite;
        }
      `}</style>

      {status === 'on' ? (
        <div className="vc-badge-on" style={styles.badgeOn}>
          <span style={styles.dotOnWrap}>
            <span className="vc-dot" style={styles.dotOn} />
          </span>
          <span style={styles.badgeOnText}>
            Avisos activados
            <span style={styles.badgeOnSub}>Recibirás los pedidos en este dispositivo</span>
          </span>
        </div>
      ) : (
        <button
          className="vc-push-btn"
          style={{
            ...styles.btn,
            ...(status === 'asking' ? styles.btnAsking : {}),
          }}
          onClick={enable}
          disabled={status === 'asking'}
        >
          <span className="vc-bell" style={styles.bellIcon}>
            {status === 'asking' ? '⏳' : '🔔'}
          </span>
          <span style={styles.btnTextWrap}>
            <span style={styles.btnTitle}>
              {status === 'asking' ? 'Activando…' : 'Activar avisos de pedidos'}
            </span>
            {status !== 'asking' && (
              <span style={styles.btnSub}>Enterate al instante de cada venta</span>
            )}
          </span>
        </button>
      )}

      {status === 'error' && (
        <p style={styles.error}>
          No se pudo activar. Probá de nuevo o revisá los permisos de notificación del navegador.
        </p>
      )}
    </div>
  )
}

const styles = {
  wrap: { marginBottom: 20 },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'linear-gradient(180deg, #191919 0%, #141414 100%)',
    color: '#f5f5f5',
    border: '1px solid #2e2a1f',
    borderRadius: 12,
    padding: '12px 18px',
    fontSize: 13,
    cursor: 'pointer',
    boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset',
    transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.1s ease',
  },
  btnAsking: {
    opacity: 0.7,
    cursor: 'default',
    animation: 'none',
  },
  bellIcon: {
    fontSize: 18,
    display: 'inline-block',
    filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.35))',
  },
  btnTextWrap: { display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' },
  btnTitle: { color: '#d4af37', fontWeight: 700, fontSize: 13, letterSpacing: 0.2 },
  btnSub: { color: '#8a8a8a', fontSize: 11.5 },
  badgeOn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: 'linear-gradient(180deg, rgba(111,174,116,0.10) 0%, rgba(111,174,116,0.05) 100%)',
    color: '#7fd88f',
    border: '1px solid #2d5636',
    borderRadius: 12,
    padding: '10px 16px',
    fontSize: 12.5,
  },
  dotOnWrap: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  dotOn: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#7fd88f',
    display: 'inline-block',
  },
  badgeOnText: { display: 'flex', flexDirection: 'column', gap: 1 },
  badgeOnSub: { color: '#5f9e6c', fontSize: 11 },
  error: { color: '#ff9b9b', fontSize: 12, marginTop: 8 },
}
