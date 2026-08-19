import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Cash({ user, onBack }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [cashSales, setCashSales] = useState(0)

  const [openingAmount, setOpeningAmount] = useState('')
  const [opening, setOpening] = useState(false)

  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)

  const [closingAmount, setClosingAmount] = useState('')
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [deletingSession, setDeletingSession] = useState(false)

  const loadSession = async () => {
    setLoading(true)
    const { data: openSession } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setSession(openSession)

    if (openSession) {
      const { data: expData } = await supabase
        .from('expenses')
        .select('*')
        .eq('cash_session_id', openSession.id)
        .order('created_at', { ascending: false })
      setExpenses(expData || [])

      const { data: salesData } = await supabase
        .from('orders')
        .select('total')
        .eq('order_type', 'in_store')
        .eq('payment_method', 'cash')
        .gte('created_at', openSession.opened_at)

      const sum = (salesData || []).reduce((s, o) => s + Number(o.total), 0)
      setCashSales(sum)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSession()
  }, [])

  const handleOpen = async () => {
    if (!openingAmount) {
      setError('Ingresá el monto inicial')
      return
    }
    setOpening(true)
    setError('')
    const { error: err } = await supabase.from('cash_sessions').insert({
      opening_amount: parseFloat(openingAmount),
      opened_by: user.name,
      status: 'open',
    })
    if (err) {
      setError('Error al abrir caja: ' + err.message)
      setOpening(false)
      return
    }
    setOpeningAmount('')
    setOpening(false)
    loadSession()
  }

  const handleAddExpense = async () => {
    if (!expDesc.trim() || !expAmount) {
      setError('Descripción y monto son obligatorios')
      return
    }
    setSavingExpense(true)
    setError('')
    const { error: err } = await supabase.from('expenses').insert({
      cash_session_id: session.id,
      description: expDesc.trim(),
      amount: parseFloat(expAmount),
      category: expCategory.trim() || null,
    })
    if (err) {
      setError('Error al guardar gasto: ' + err.message)
      setSavingExpense(false)
      return
    }
    setExpDesc('')
    setExpAmount('')
    setExpCategory('')
    setSavingExpense(false)
    loadSession()
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) return
    setDeleting(expenseId)
    setError('')
    const { error: err } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (err) {
      setError('Error al eliminar gasto: ' + err.message)
      setDeleting(null)
      return
    }
    setDeleting(null)
    loadSession()
  }

  const handleDeleteSession = async () => {
    if (
      !window.confirm(
        '¿Eliminar esta sesión de caja por completo (incluyendo todos sus gastos registrados)? Esta acción no se puede deshacer.'
      )
    )
      return
    setDeletingSession(true)
    setError('')

    // Primero borramos los gastos ligados a esta sesión para evitar conflicto de llave foránea
    const { error: expErr } = await supabase
      .from('expenses')
      .delete()
      .eq('cash_session_id', session.id)
    if (expErr) {
      setError('Error al eliminar gastos de la sesión: ' + expErr.message)
      setDeletingSession(false)
      return
    }

    const { error: sessErr } = await supabase.from('cash_sessions').delete().eq('id', session.id)
    if (sessErr) {
      setError('Error al eliminar sesión de caja: ' + sessErr.message)
      setDeletingSession(false)
      return
    }

    setDeletingSession(false)
    loadSession()
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const expected = session ? Number(session.opening_amount) + cashSales - totalExpenses : 0

  const handleClose = async () => {
    if (!closingAmount) {
      setError('Ingresá el monto contado en caja')
      return
    }
    setClosing(true)
    setError('')
    const difference = parseFloat(closingAmount) - expected
    const { error: err } = await supabase
      .from('cash_sessions')
      .update({
        closed_at: new Date().toISOString(),
        closing_amount: parseFloat(closingAmount),
        closed_by: user.name,
        status: 'closed',
        notes: `Diferencia: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`,
      })
      .eq('id', session.id)

    if (err) {
      setError('Error al cerrar caja: ' + err.message)
      setClosing(false)
      return
    }
    setClosingAmount('')
    setClosing(false)
    loadSession()
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Cargando...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Volver</button>
        <h2 style={styles.title}>Caja</h2>
        <div style={{ width: 90 }} />
      </div>

      {!session ? (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Abrir caja</h3>
          <p style={styles.muted}>No hay un turno abierto. Ingresá el monto con el que arrancás.</p>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            placeholder="Monto inicial"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.primaryBtn} onClick={handleOpen} disabled={opening}>
            {opening ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </div>
      ) : (
        <>
          <div style={styles.card}>
            <div style={styles.cardHeaderRow}>
              <h3 style={styles.cardTitle}>Turno abierto</h3>
              <button
                style={styles.deleteSessionBtn}
                onClick={handleDeleteSession}
                disabled={deletingSession}
                title="Eliminar esta sesión de caja por completo"
              >
                {deletingSession ? 'Eliminando...' : '🗑 Eliminar caja'}
              </button>
            </div>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <div style={styles.muted}>Abierta por</div>
                <div>{session.opened_by}</div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.muted}>Monto inicial</div>
                <div>${Number(session.opening_amount).toFixed(2)}</div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.muted}>Ventas en efectivo</div>
                <div style={{ color: '#3f6b4a' }}>${cashSales.toFixed(2)}</div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.muted}>Gastos</div>
                <div style={{ color: '#b5574a' }}>-${totalExpenses.toFixed(2)}</div>
              </div>
            </div>
            <div style={styles.expectedBox}>
              Esperado en caja: <b style={{ color: '#0b0b0a' }}>${expected.toFixed(2)}</b>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Registrar gasto</h3>
            <div style={styles.formRow}>
              <input
                style={styles.input}
                placeholder="Descripción"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
              />
              <input
                style={styles.input}
                type="number"
                step="0.01"
                placeholder="Monto"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Categoría (opcional)"
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.primaryBtn} onClick={handleAddExpense} disabled={savingExpense}>
              {savingExpense ? 'Guardando...' : 'Agregar gasto'}
            </button>

            {expenses.length > 0 && (
              <div style={styles.expenseList}>
                {expenses.map((e) => (
                  <div key={e.id} style={styles.expenseRow}>
                    <span>{e.description} {e.category ? `(${e.category})` : ''}</span>
                    <div style={styles.expenseRight}>
                      <span style={{ color: '#b5574a' }}>-${Number(e.amount).toFixed(2)}</span>
                      <button
                        style={styles.deleteExpenseBtn}
                        onClick={() => handleDeleteExpense(e.id)}
                        disabled={deleting === e.id}
                        title="Eliminar este gasto"
                      >
                        {deleting === e.id ? '...' : '🗑'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Cerrar caja</h3>
            <p style={styles.muted}>Contá el efectivo físico e ingresalo acá.</p>
            <input
              style={styles.input}
              type="number"
              step="0.01"
              placeholder="Monto contado"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
            />
            <button style={styles.dangerBtn} onClick={handleClose} disabled={closing}>
              {closing ? 'Cerrando...' : 'Cerrar caja'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#f5f4f1', color: '#0b0b0a', fontFamily: "'Inter', system-ui, sans-serif", padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { background: 'transparent', color: '#726d63', border: '1px solid #e2ded5', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  title: { color: '#0b0b0a', margin: 0, fontSize: 20, fontFamily: "'Bodoni Moda', serif", letterSpacing: 0.5, fontWeight: 500 },
  muted: { color: '#726d63', fontSize: 13 },
  card: { background: '#ffffff', border: '1px solid #e2ded5', borderRadius: 12, padding: 20, marginBottom: 18, maxWidth: 480 },
  cardTitle: { marginTop: 0, color: '#0b0b0a', fontSize: 16 },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  deleteSessionBtn: {
    background: 'transparent',
    color: '#9c3b2e',
    border: '1px solid #9c3b2e',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    background: '#f2f0ec',
    color: '#0b0b0a',
    border: '1px solid #e2ded5',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 10,
    fontSize: 14,
    boxSizing: 'border-box',
  },
  formRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  primaryBtn: {
    background: '#0b0b0a',
    color: '#f5f4f1',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  dangerBtn: {
    background: 'transparent',
    color: '#9c3b2e',
    border: '1px solid #9c3b2e',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: { color: '#9c3b2e', fontSize: 13, marginBottom: 10 },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 14,
  },
  summaryItem: { fontSize: 14 },
  expectedBox: {
    background: '#f5f4f1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  expenseList: {
    marginTop: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  expenseRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    borderBottom: '1px solid #e2ded5',
    paddingBottom: 6,
  },
  expenseRight: { display: 'flex', alignItems: 'center', gap: 8 },
  deleteExpenseBtn: {
    background: 'transparent',
    color: '#9c3b2e',
    border: '1px solid #9c3b2e',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
}
