import React, { useState, useEffect } from 'react'
import Login from './Login.jsx'
import Products from './Products.jsx'
import POS from './POS.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState('home')

  useEffect(() => {
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

  if (!user) {
    return <Login onLogin={setUser} />
  }

  if (view === 'products') {
    return <Products onBack={() => setView('home')} />
  }

  if (view === 'pos') {
    return <POS user={user} onBack={() => setView('home')} />
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      color: '#f5f5f5',
      fontFamily: 'system-ui, sans-serif',
      padding: 24,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        borderBottom: '1px solid #2a2a2a',
        paddingBottom: 16,
      }}>
        <div>
          <h1 style={{ color: '#d4af37', fontSize: 20, margin: 0 }}>
            VARIEDADES CALERO
          </h1>
          <p style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
            {user.name} · {user.role === 'admin' ? 'Administrador' : 'Empleado'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            color: '#999',
            border: '1px solid #333',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer',
          }}
        >
          Salir
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setView('pos')}
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: '24px 32px',
            color: '#f5f5f5',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          🛒 Punto de venta
        </button>

        {user.role === 'admin' && (
          <button
            onClick={() => setView('products')}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 12,
              padding: '24px 32px',
              color: '#f5f5f5',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 'bold',
            }}
          >
            📦 Productos
          </button>
        )}
      </div>

      {user.role === 'admin' && (
        <p style={{ opacity: 0.5, marginTop: 24, fontSize: 13 }}>
          Próximos módulos: Inventario, Reportes, Órdenes Online, Caja
        </p>
      )}
    </div>
  )
}
