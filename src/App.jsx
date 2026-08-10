import React from 'react'

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f0f',
      color: '#f5f5f5',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: 24,
    }}>
      <h1 style={{ fontSize: 32, marginBottom: 8, letterSpacing: 1 }}>
        VARIEDADES CALERO
      </h1>
      <p style={{ opacity: 0.7 }}>
        Base del sistema desplegada correctamente ✅
      </p>
      <p style={{ opacity: 0.5, fontSize: 14, marginTop: 16 }}>
        Próximo paso: conectar Supabase y construir el Login
      </p>
    </div>
  )
}
