import React, { useState, useEffect, Suspense, lazy } from 'react'
import Login from './Login.jsx'

// Cada vista se carga como su propio chunk, en vez de ir todas
// empaquetadas juntas en el bundle principal.
const Products = lazy(() => import('./Products.jsx'))
const POS = lazy(() => import('./POS.jsx'))
const Store = lazy(() => import('./Store.jsx'))
const Orders = lazy(() => import('./Orders.jsx'))
const Cash = lazy(() => import('./Cash.jsx'))
const Reports = lazy(() => import('./Reports.jsx'))
const Receivables = lazy(() => import('./Receivables.jsx'))
const Clients = lazy(() => import('./Clients.jsx'))
const Employees = lazy(() => import('./Employees.jsx'))
const PushNotificationSetup = lazy(() => import('./PushNotificationSetup.jsx'))

function ViewLoader() {
  return (
    <div className="vchome-loader">
      <style>{HOME_STYLES}</style>
      Cargando...
    </div>
  )
}

const NAV_ITEMS = [
  { key: 'pos', label: 'Punto de venta', adminOnly: false, icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18l-1.5 10.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 6Z"/><path d="M8 6V4a4 4 0 0 1 8 0v2"/></svg>
  )},
  { key: 'cash', label: 'Caja', adminOnly: false, icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="6" width="20" height="12" rx="1"/><circle cx="12" cy="12" r="3"/><path d="M6 6v0M18 6v0"/></svg>
  )},
  { key: 'products', label: 'Productos', adminOnly: true, icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
  )},
  { key: 'orders', label: 'Pedidos Online', adminOnly: true, icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18M12 3a9 9 0 0 0 0 18M3 12h18"/></svg>
  )},
  { key: 'reports', label: 'Reportes', adminOnly: true, icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>
  )},
  { key: 'receivables', label: 'Cuentas por Cobrar', adminOnly: true, icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4"/><path d="M9 13h6M9 17h6"/></svg>
  )},
  { key: 'clients', label: 'Clientes', adminOnly: true, icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="18" cy="8.5" r="2.4"/><path d="M16.2 14.3c2.6.4 4.3 2.3 4.3 5.2"/></svg>
  )},
  { key: 'employees', label: 'Empleados y Nómina', adminOnly: true, icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>
  )},
]

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState('home')
  const [isPublicStore, setIsPublicStore] = useState(false)

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/tienda')) {
      setIsPublicStore(true)
      setChecking(false)
      return
    }

    const saved = localStorage.getItem('vc_user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {
        localStorage.removeItem('vc_user')
      }
    }
    setChecking(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('vc_user')
    setUser(null)
    setView('home')
  }

  if (checking) return null

  if (isPublicStore) {
    return (
      <Suspense fallback={<ViewLoader />}>
        <Store />
      </Suspense>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  if (view === 'products') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <Products onBack={() => setView('home')} />
      </Suspense>
    )
  }

  if (view === 'pos') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <POS user={user} onBack={() => setView('home')} />
      </Suspense>
    )
  }

  if (view === 'orders') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <Orders onBack={() => setView('home')} />
      </Suspense>
    )
  }

  if (view === 'cash') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <Cash user={user} onBack={() => setView('home')} />
      </Suspense>
    )
  }

  if (view === 'reports') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <Reports onBack={() => setView('home')} />
      </Suspense>
    )
  }

  if (view === 'receivables') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <Receivables onBack={() => setView('home')} />
      </Suspense>
    )
  }

  if (view === 'clients') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <Clients onBack={() => setView('home')} />
      </Suspense>
    )
  }

  if (view === 'employees') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <Employees onBack={() => setView('home')} />
      </Suspense>
    )
  }

  return (
    <div className="vchome-root">
      <style>{HOME_STYLES}</style>

      <div className="vchome-header">
        <div className="vchome-brand">
          <div className="vchome-monogram">VC</div>
          <div>
            <h1 className="vchome-title">VARIEDADES CALERO</h1>
            <p className="vchome-subtitle">
              {user.name} · {user.role === 'admin' ? 'Administrador' : 'Empleado'}
            </p>
          </div>
        </div>
        <button className="vchome-logout" onClick={handleLogout}>
          Salir
        </button>
      </div>

      {user.role === 'admin' && (
        <Suspense fallback={null}>
          <PushNotificationSetup />
        </Suspense>
      )}

      <div className="vchome-grid">
        {NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'admin').map((item) => (
          <button key={item.key} className="vchome-card" onClick={() => setView(item.key)}>
            <span className="vchome-card-icon">{item.icon}</span>
            <span className="vchome-card-label">{item.label}</span>
          </button>
        ))}
      </div>

      {user.role === 'admin' && (
        <p className="vchome-footer">
          Tienda pública: {window.location.origin}/tienda
        </p>
      )}
    </div>
  )
}

const HOME_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500&family=Inter:wght@400;500;600;700&display=swap');

  .vchome-root {
    --bg: #f5f4f1;
    --panel: #ffffff;
    --panel-raised: #f2f0ec;
    --border: #e2ded5;
    --ink: #0b0b0a;
    --ink-soft: #726d63;
    --ink-faint: #a39d8f;
    --display: 'Bodoni Moda', serif;
    --body: 'Inter', system-ui, -apple-system, sans-serif;

    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--body);
    padding: 26px 28px 40px;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }
  .vchome-root * { box-sizing: border-box; }
  .vchome-root button { font-family: var(--body); }

  .vchome-loader {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f4f1;
    color: #726d63;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
  }

  .vchome-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .vchome-brand { display: flex; align-items: center; gap: 14px; }
  .vchome-monogram {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--display);
    font-size: 15px;
    flex-shrink: 0;
  }
  .vchome-title {
    font-family: var(--display);
    color: var(--ink);
    font-size: 19px;
    font-weight: 500;
    letter-spacing: 1.2px;
    margin: 0;
  }
  .vchome-subtitle {
    color: var(--ink-soft);
    font-size: 12.5px;
    margin-top: 4px;
  }
  .vchome-logout {
    background: transparent;
    color: var(--ink-soft);
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 9px 18px;
    font-size: 12.5px;
    cursor: pointer;
    transition: border-color .15s, color .15s;
  }
  .vchome-logout:hover { border-color: var(--ink); color: var(--ink); }

  .vchome-grid {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }
  .vchome-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 26px 30px;
    color: var(--ink);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    min-width: 170px;
    transition: background .15s, color .15s, border-color .15s;
  }
  .vchome-card:hover { background: var(--ink); color: #fff; border-color: var(--ink); }
  .vchome-card-icon { display: flex; }
  .vchome-card-label {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.2px;
  }

  .vchome-footer {
    opacity: 0.5;
    margin-top: 28px;
    font-size: 12.5px;
  }
`

const cardBtnStyle = {}
