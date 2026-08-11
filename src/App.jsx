import React, { useState, useEffect } from 'react'
import Login from './Login.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

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
  }

  if (checking) return null

  if (!user) {
    return <Login onLogin={setUser} />
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

      {user.role === 'admin' ? (
        <div>
          <p style={{ opacity: 0.7 }}>
            Panel de administrador ✅ (POS, Inventario, Reportes, Órdenes Online — próximos módulos)
          </p>
        </div>
      ) : (
        <div>
          <p style={{ opacity: 0.7 }}>
            Panel de empleado ✅ (acceso solo a POS — próximo módulo)
          </p>
        </div>
      )}
    </div>
  )
}
