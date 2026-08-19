import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Receivables({ onBack }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [payAmount, setPayAmount] = useState({})
  const [paying, setPaying] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id, total, amount_paid, created_at, notes, client_id, clients(name, phone)')
      .eq('payment_status', 'partial')
      .order('created_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const grouped = orders.reduce((acc, o) => {
    const key = o.client_id || 'sin_cliente'
    if (!acc[key]) {
      acc[key] = {
        name: o.clients?.name || 'Cliente sin nombre',
        phone: o.clients?.phone || '',
        orders: [],
        total: 0,
      }
    }
    const remaining = Number(o.total) - Number(o.amount_paid)
    acc[key].orders.push({ ...o, remaining })
    acc[key].total += remaining
    return acc
  }, {})

  const clients = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total)
  const grandTotal = clients.reduce((s, [, c]) => s + c.total, 0)

  const handlePay = async (orderId, currentPaid, currentTotal) => {
    const amount = parseFloat(payAmount[orderId])
    if (!amount || amount <= 0) {
      setError('Ingresá un monto válido')
      return
    }
    setPaying(orderId)
    setError('')

    const newPaid = Math.min(currentPaid + amount, currentTotal)
    const newStatus = newPaid >= currentTotal ? 'paid' : 'partial'

    const { error: err } = await supabase
      .from('orders')
      .update({ amount_paid: newPaid, payment_status: newStatus })
      .eq('id', orderId)

    if (err) {
      setError('Error al registrar abono: ' + err.message)
      setPaying(null)
      return
    }

    setPayAmount((prev) => ({ ...prev, [orderId]: '' }))
    setPaying(null)
    loadData()
  }

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('¿Eliminar esta orden por cobrar? Esta acción no se puede deshacer.')) return
    setDeleting(orderId)
    setError('')
    const { error: err } = await supabase.from('orders').delete().eq('id', orderId)
    if (err) {
      setError('Error al eliminar orden: ' + err.message)
      setDeleting(null)
      return
    }
    setDeleting(null)
    loadData()
  }

  const handleDeleteClient = async (clientId, orderIds) => {
    if (
      !window.confirm(
        `¿Eliminar TODAS las cuentas pendientes de este cliente (${orderIds.length} orden${orderIds.length === 1 ? '' : 'es'})? Esta acción no se puede deshacer.`
      )
    )
      return
    setDeleting(clientId)
    setError('')
    const { error: err } = await supabase.from('orders').delete().in('id', orderIds)
    if (err) {
      setError('Error al eliminar cuenta del cliente: ' + err.message)
      setDeleting(null)
      return
    }
    setDeleting(null)
    loadData()
  }

  return (
    <div style={styles.container}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Volver</button>
        <h2 style={styles.title}>Cuentas por Cobrar</h2>
        <div style={{ width: 90 }} />
      </div>

      {loading ? (
        <p style={styles.muted}>Cargando...</p>
      ) : clients.length === 0 ? (
        <p style={styles.muted}>No hay saldos pendientes. 🎉</p>
      ) : (
        <>
          <div style={styles.totalBanner}>
            Total por cobrar: <b style={{ color: '#0b0b0a' }}>${grandTotal.toFixed(2)}</b>
          </div>

          <div style={styles.list}>
            {clients.map(([clientId, c]) => (
              <div key={clientId} style={styles.card}>
                <div
                  style={styles.cardHeader}
                  onClick={() => setExpanded(expanded === clientId ? null : clientId)}
                >
                  <div>
                    <div style={styles.clientName}>{c.name}</div>
                    <div style={styles.muted}>{c.phone}</div>
                  </div>
                  <div style={styles.headerRight}>
                    <div style={styles.clientTotal}>${c.total.toFixed(2)}</div>
                    <button
                      style={styles.deleteClientBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClient(
                          clientId,
                          c.orders.map((o) => o.id)
                        )
                      }}
                      disabled={deleting === clientId}
                      title="Eliminar toda la cuenta de este cliente"
                    >
                      {deleting === clientId ? '...' : '🗑'}
                    </button>
                  </div>
                </div>

                {expanded === clientId && (
                  <div style={styles.ordersList}>
                    {c.orders.map((o) => (
                      <div key={o.id} style={styles.orderRow}>
                        <div style={styles.orderInfo}>
                          <div style={styles.muted}>
                            {new Date(o.created_at).toLocaleDateString()}
                          </div>
                          <div>
                            Total: ${Number(o.total).toFixed(2)} · Pagado: ${Number(o.amount_paid).toFixed(2)}
                          </div>
                          <div style={{ color: '#b5574a', fontWeight: 'bold' }}>
                            Resta: ${o.remaining.toFixed(2)}
                          </div>
                        </div>
                        <div style={styles.payBox}>
                          <input
                            style={styles.payInput}
                            type="number"
                            step="0.01"
                            placeholder="Monto"
                            value={payAmount[o.id] || ''}
                            onChange={(e) =>
                              setPayAmount((prev) => ({ ...prev, [o.id]: e.target.value }))
                            }
                          />
                          <button
                            style={styles.payBtn}
                            onClick={() => handlePay(o.id, Number(o.amount_paid), Number(o.total))}
                            disabled={paying === o.id}
                          >
                            {paying === o.id ? '...' : 'Abonar'}
                          </button>
                          <button
                            style={styles.deleteOrderBtn}
                            onClick={() => handleDeleteOrder(o.id)}
                            disabled={deleting === o.id}
                            title="Eliminar esta orden"
                          >
                            {deleting === o.id ? '...' : '🗑'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {error && <p style={styles.error}>{error}</p>}
        </>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#f5f4f1', color: '#0b0b0a', fontFamily: "'Inter', system-ui, sans-serif", padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { background: 'transparent', color: '#726d63', border: '1px solid #e2ded5', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  title: { color: '#0b0b0a', margin: 0, fontSize: 20, fontFamily: "'Bodoni Moda', serif", letterSpacing: 0.5, fontWeight: 500 },
  muted: { color: '#726d63', fontSize: 13 },
  error: { color: '#9c3b2e', fontSize: 13, marginTop: 10 },
  totalBanner: {
    background: '#ffffff',
    border: '1px solid #0b0b0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    fontSize: 15,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#ffffff', border: '1px solid #e2ded5', borderRadius: 12, overflow: 'hidden' },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    cursor: 'pointer',
  },
  clientName: { fontWeight: 'bold' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  clientTotal: { color: '#b5574a', fontWeight: 'bold', fontSize: 16 },
  deleteClientBtn: {
    background: 'transparent',
    color: '#9c3b2e',
    border: '1px solid #9c3b2e',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    cursor: 'pointer',
  },
  ordersList: {
    borderTop: '1px solid #e2ded5',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  orderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    background: '#f5f4f1',
    borderRadius: 8,
    padding: 12,
  },
  orderInfo: { fontSize: 13 },
  payBox: { display: 'flex', gap: 6 },
  payInput: {
    width: 90,
    background: '#f2f0ec',
    color: '#0b0b0a',
    border: '1px solid #e2ded5',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 13,
  },
  payBtn: {
    background: '#0b0b0a',
    color: '#f5f4f1',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  deleteOrderBtn: {
    background: 'transparent',
    color: '#9c3b2e',
    border: '1px solid #9c3b2e',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
}
