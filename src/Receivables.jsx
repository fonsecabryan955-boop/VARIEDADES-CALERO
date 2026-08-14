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
            Total por cobrar: <b style={{ color: '#d4af37' }}>${grandTotal.toFixed(2)}</b>
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
                          <div style={{ color: '#ff9b9b', fontWeight: 'bold' }}>
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
  container: { minHeight: '100vh', background: '#0f0f0f', color: '#f5f5f5', fontFamily: 'system-ui, sans-serif', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { background: 'transparent', color: '#999', border: '1px solid #333', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  title: { color: '#d4af37', margin: 0, fontSize: 20 },
  muted: { color: '#999', fontSize: 13 },
  error: { color: '#ff6b6b', fontSize: 13, marginTop: 10 },
  totalBanner: {
    background: '#1a1a1a',
    border: '1px solid #d4af37',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    fontSize: 15,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    cursor: 'pointer',
  },
  clientName: { fontWeight: 'bold' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  clientTotal: { color: '#ff9b9b', fontWeight: 'bold', fontSize: 16 },
  deleteClientBtn: {
    background: 'transparent',
    color: '#ff6b6b',
    border: '1px solid #ff6b6b',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    cursor: 'pointer',
  },
  ordersList: {
    borderTop: '1px solid #2a2a2a',
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
    background: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
  },
  orderInfo: { fontSize: 13 },
  payBox: { display: 'flex', gap: 6 },
  payInput: {
    width: 90,
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 13,
  },
  payBtn: {
    background: '#d4af37',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  deleteOrderBtn: {
    background: 'transparent',
    color: '#ff6b6b',
    border: '1px solid #ff6b6b',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
}
