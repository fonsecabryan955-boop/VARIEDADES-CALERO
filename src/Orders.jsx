import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export default function Orders({ onBack }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const loadOrders = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id, status, payment_status, total, notes, payment_proof_url, created_at, clients(name, phone, address), order_items(quantity, unit_price, product_variants(size, color, products(name)))')
      .eq('order_type', 'online')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (id, status) => {
    await supabase.from('orders').update({ status }).eq('id', id)
    loadOrders()
  }

  const markPaid = async (id) => {
    await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', id)
    loadOrders()
  }

  const handleDeleteOrder = async (order) => {
    const ok = window.confirm(
      `¿Eliminar el pedido de ${order.clients?.name || 'este cliente'} por $${Number(order.total).toFixed(2)}? Esta acción no se puede deshacer.`
    )
    if (!ok) return
    const { error: itemsErr } = await supabase.from('order_items').delete().eq('order_id', order.id)
    if (itemsErr) {
      alert('Error al eliminar artículos del pedido: ' + itemsErr.message)
      return
    }
    const { error: orderErr } = await supabase.from('orders').delete().eq('id', order.id)
    if (orderErr) {
      alert('Error al eliminar el pedido: ' + orderErr.message)
      return
    }
    loadOrders()
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Volver</button>
        <h2 style={styles.title}>Pedidos Online</h2>
        <button onClick={loadOrders} style={styles.backBtn}>↻ Actualizar</button>
      </div>

      {loading ? (
        <p style={styles.muted}>Cargando...</p>
      ) : orders.length === 0 ? (
        <p style={styles.muted}>No hay pedidos online todavía.</p>
      ) : (
        <div style={styles.list}>
          {orders.map((o) => (
            <div key={o.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.clientName}>{o.clients?.name}</div>
                  <div style={styles.muted}>{o.clients?.phone} {o.clients?.address ? `· ${o.clients.address}` : ''}</div>
                </div>
                <div style={styles.total}>${Number(o.total).toFixed(2)}</div>
              </div>

              <div style={styles.items}>
                {o.order_items?.map((it, idx) => (
                  <div key={idx} style={styles.itemRow}>
                    {it.product_variants?.products?.name} x{it.quantity}
                    {it.product_variants?.size ? ` (${it.product_variants.size})` : ''}
                  </div>
                ))}
              </div>

              {o.notes && <div style={styles.notes}>Nota: {o.notes}</div>}

              {o.payment_proof_url && (
                <a href={o.payment_proof_url} target="_blank" rel="noreferrer" style={styles.proofLink}>
                  <img src={o.payment_proof_url} alt="comprobante" style={styles.proofThumb} />
                  Ver comprobante completo
                </a>
              )}

              <div style={styles.badges}>
                <span style={styles.statusBadge}>{statusLabels[o.status] || o.status}</span>
                <span style={o.payment_status === 'paid' ? styles.paidBadge : styles.unpaidBadge}>
                  {o.payment_status === 'paid' ? 'Pagado' : 'Sin pagar'}
                </span>
              </div>

              <div style={styles.actions}>
                {o.payment_status !== 'paid' && (
                  <button style={styles.actionBtn} onClick={() => markPaid(o.id)}>
                    Marcar pagado
                  </button>
                )}
                {o.status === 'pending' && (
                  <button style={styles.actionBtn} onClick={() => updateStatus(o.id, 'confirmed')}>
                    Confirmar
                  </button>
                )}
                {o.status === 'confirmed' && (
                  <button style={styles.actionBtn} onClick={() => updateStatus(o.id, 'preparing')}>
                    Preparando
                  </button>
                )}
                {o.status === 'preparing' && (
                  <button style={styles.actionBtn} onClick={() => updateStatus(o.id, 'ready')}>
                    Listo
                  </button>
                )}
                {o.status === 'ready' && (
                  <button style={styles.actionBtn} onClick={() => updateStatus(o.id, 'delivered')}>
                    Entregado
                  </button>
                )}
                {o.status !== 'cancelled' && o.status !== 'delivered' && (
                  <button style={styles.cancelBtn} onClick={() => updateStatus(o.id, 'cancelled')}>
                    Cancelar
                  </button>
                )}
                <button style={styles.deleteBtn} onClick={() => handleDeleteOrder(o)}>
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f0f', color: '#f5f5f5', fontFamily: 'system-ui, sans-serif', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  backBtn: { background: 'transparent', color: '#999', border: '1px solid #333', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  title: { color: '#d4af37', margin: 0, fontSize: 20 },
  muted: { color: '#999', fontSize: 13 },
  list: { display: 'flex', flexDirection: 'column', gap: 14 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 18 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  clientName: { fontWeight: 'bold' },
  total: { color: '#d4af37', fontWeight: 'bold', fontSize: 16 },
  items: { marginBottom: 8 },
  itemRow: { fontSize: 13, color: '#ccc' },
  notes: { fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 8 },
  badges: { display: 'flex', gap: 8, marginBottom: 12 },
  statusBadge: { background: '#242424', padding: '4px 10px', borderRadius: 20, fontSize: 12 },
  paidBadge: { background: '#1e3a24', color: '#7fd88f', padding: '4px 10px', borderRadius: 20, fontSize: 12 },
  unpaidBadge: { background: '#3a1e1e', color: '#ff9b9b', padding: '4px 10px', borderRadius: 20, fontSize: 12 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  actionBtn: { background: '#d4af37', color: '#0f0f0f', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' },
  cancelBtn: { background: 'transparent', color: '#ff6b6b', border: '1px solid #ff6b6b', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
  deleteBtn: { background: 'transparent', color: '#ff6b6b', border: '1px solid #5a2323', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
  proofLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#d4af37',
    fontSize: 12,
    textDecoration: 'none',
    marginBottom: 10,
    background: '#0f0f0f',
    borderRadius: 8,
    padding: 8,
  },
  proofThumb: {
    width: 40,
    height: 40,
    objectFit: 'cover',
    borderRadius: 6,
  },
}
