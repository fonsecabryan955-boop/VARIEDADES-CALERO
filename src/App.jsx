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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F2EBDB',
      color: '#8A7A56',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 14,
    }}>
      Cargando...
    </div>
  )
}

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
    <div style={{
      minHeight: '100vh',
      background: '#F2EBDB',
      color: '#2E2618',
      fontFamily: 'system-ui, sans-serif',
      padding: 24,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        borderBottom: '1px solid #DACC9E',
        paddingBottom: 16,
      }}>
        <div>
          <h1 style={{ color: '#3B2E1F', fontSize: 20, margin: 0 }}>
            VARIEDADES CALERO
          </h1>
          <p style={{ color: '#8A7A56', fontSize: 13, marginTop: 4 }}>
            {user.name} · {user.role === 'admin' ? 'Administrador' : 'Empleado'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            color: '#8A7A56',
            border: '1px solid #C7B689',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer',
          }}
        >
          Salir
        </button>
      </div>

      {user.role === 'admin' && (
        <Suspense fallback={null}>
          <PushNotificationSetup />
        </Suspense>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setView('pos')}
          style={cardBtnStyle}
        >
          🛒 Punto de venta
        </button>

        <button
          onClick={() => setView('cash')}
          style={cardBtnStyle}
        >
          💰 Caja
        </button>

        {user.role === 'admin' && (
          <>
            <button onClick={() => setView('products')} style={cardBtnStyle}>
              📦 Productos
            </button>
            <button onClick={() => setView('orders')} style={cardBtnStyle}>
              🌐 Pedidos Online
            </button>
            <button onClick={() => setView('reports')} style={cardBtnStyle}>
              📊 Reportes
            </button>
            <button onClick={() => setView('receivables')} style={cardBtnStyle}>
              🧾 Cuentas por Cobrar
            </button>
            <button onClick={() => setView('clients')} style={cardBtnStyle}>
              👥 Clientes
            </button>
            <button onClick={() => setView('employees')} style={cardBtnStyle}>
              🧑‍💼 Empleados y Nómina
            </button>
          </>
        )}
      </div>

      {user.role === 'admin' && (
        <p style={{ opacity: 0.5, marginTop: 24, fontSize: 13 }}>
          Tienda pública: {window.location.origin}/tienda
        </p>
      )}
    </div>
  )
}

const cardBtnStyle = {
  background: '#FBF8F0',
  border: '1px solid #DACC9E',
  borderRadius: 12,
  padding: '24px 32px',
  color: '#2E2618',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 'bold',
}
