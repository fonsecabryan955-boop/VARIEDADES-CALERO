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
    <div className="vclogin-root">
      <style>{LOGIN_STYLES}</style>
      <div className="vclogin-card">
        <div className="vclogin-monogram">VC</div>
        <h1 className="vclogin-title">VARIEDADES CALERO</h1>
        <p className="vclogin-subtitle">Ingresá tu PIN</p>

        <div className="vclogin-pindisplay">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`vclogin-pindot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {error && <p className="vclogin-error">{error}</p>}

        <div className="vclogin-keypad">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />
            if (d === '⌫') {
              return (
                <button key={i} className="vclogin-key" onClick={handleBackspace}>
                  ⌫
                </button>
              )
            }
            return (
              <button key={i} className="vclogin-key" onClick={() => handleDigit(d)}>
                {d}
              </button>
            )
          })}
        </div>

        <div className="vclogin-actions">
          <button className="vclogin-clear" onClick={handleClear}>
            Borrar
          </button>
          <button
            className="vclogin-submit"
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

const LOGIN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500&family=Inter:wght@400;500;600;700&display=swap');

  .vclogin-root {
    --bg: #f5f4f1;
    --panel: #ffffff;
    --panel-raised: #f2f0ec;
    --border: #e2ded5;
    --ink: #0b0b0a;
    --ink-soft: #726d63;
    --ink-faint: #a39d8f;
    --danger: #9c3b2e;
    --gold: #9c7a3c;
    --display: 'Bodoni Moda', serif;
    --body: 'Inter', system-ui, -apple-system, sans-serif;

    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    font-family: var(--body);
    padding: 16px;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }
  .vclogin-root * { box-sizing: border-box; }
  .vclogin-root button { font-family: var(--body); }

  .vclogin-card {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 40px 32px 32px;
    width: 100%;
    max-width: 360px;
    text-align: center;
  }
  .vclogin-monogram {
    width: 46px;
    height: 46px;
    margin: 0 auto 18px;
    border-radius: 50%;
    border: 1px solid var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--display);
    font-size: 16px;
    letter-spacing: 0.5px;
    color: var(--ink);
  }
  .vclogin-title {
    font-family: var(--display);
    color: var(--ink);
    font-size: 21px;
    font-weight: 500;
    letter-spacing: 1.5px;
    margin: 0 0 6px;
  }
  .vclogin-subtitle {
    color: var(--ink-soft);
    font-size: 13px;
    margin: 0 0 26px;
  }
  .vclogin-pindisplay {
    display: flex;
    justify-content: center;
    gap: 11px;
    margin-bottom: 18px;
  }
  .vclogin-pindot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: transparent;
    border: 1.5px solid var(--ink);
    transition: background 0.15s;
  }
  .vclogin-pindot.filled { background: var(--ink); }
  .vclogin-error {
    color: var(--danger);
    font-size: 12.5px;
    margin: 0 0 12px;
    min-height: 16px;
  }
  .vclogin-keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 22px;
  }
  .vclogin-key {
    background: var(--panel-raised);
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: 0;
    font-family: var(--display);
    font-size: 19px;
    padding: 15px 0;
    cursor: pointer;
    transition: background .15s, color .15s;
  }
  .vclogin-key:hover { background: var(--ink); color: #fff; }
  .vclogin-actions { display: flex; gap: 10px; }
  .vclogin-clear {
    flex: 1;
    background: transparent;
    color: var(--ink-soft);
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 12px 0;
    font-size: 13px;
    cursor: pointer;
    transition: border-color .15s, color .15s;
  }
  .vclogin-clear:hover { border-color: var(--ink); color: var(--ink); }
  .vclogin-submit {
    flex: 2;
    background: var(--ink);
    color: #fff;
    border: none;
    border-radius: 0;
    padding: 12px 0;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition: opacity .15s;
  }
  .vclogin-submit:hover { opacity: 0.85; }
  .vclogin-submit:disabled { opacity: 0.5; cursor: default; }
`
