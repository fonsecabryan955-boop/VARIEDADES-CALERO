import React, { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDigit = (digit) => {
    if (pin.length >= 6) return
    setError('')
    setPin(pin + digit)
  }

  const handleClear = () => {
    setPin('')
    setError('')
  }

  const handleBackspace = () => {
    setPin(pin.slice(0, -1))
    setError('')
  }

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('app_users')
      .select('*')
      .eq('pin', pin)
      .eq('active', true)
      .maybeSingle()

    setLoading(false)

    if (dbError) {
      setError('Error de conexión, intentá de nuevo')
      return
    }

    if (!data) {
      setError('PIN incorrecto')
      setPin('')
      return
    }

    localStorage.setItem('vc_user', JSON.stringify(data))
    onLogin(data)
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>VARIEDADES CALERO</h1>
        <p style={styles.subtitle}>Ingresá tu PIN</p>

        <div style={styles.pinDisplay}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={styles.pinDot(i < pin.length)} />
          ))}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.keypad}>
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />
            if (d === '⌫') {
              return (
                <button key={i} style={styles.key} onClick={handleBackspace}>
                  ⌫
                </button>
              )
            }
            return (
              <button key={i} style={styles.key} onClick={() => handleDigit(d)}>
                {d}
              </button>
            )
          })}
        </div>

        <div style={styles.actions}>
          <button style={styles.clearBtn} onClick={handleClear}>
            Borrar
          </button>
          <button
            style={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f0f',
    fontFamily: 'system-ui, sans-serif',
    padding: 16,
  },
  card: {
    background: '#1a1a1a',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    textAlign: 'center',
    border: '1px solid #2a2a2a',
  },
  title: {
    color: '#d4af37',
    fontSize: 24,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 24,
  },
  pinDisplay: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  pinDot: (filled) => ({
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: filled ? '#d4af37' : 'transparent',
    border: '2px solid #d4af37',
    transition: 'background 0.15s',
  }),
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 12,
    minHeight: 16,
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  key: {
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 12,
    fontSize: 20,
    padding: '16px 0',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    background: 'transparent',
    color: '#999',
    border: '1px solid #333',
    borderRadius: 10,
    padding: '12px 0',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    background: '#d4af37',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: 10,
    padding: '12px 0',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}
