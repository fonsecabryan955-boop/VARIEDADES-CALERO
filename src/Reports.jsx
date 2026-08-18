import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const RANGES = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
}

const paymentLabels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' }
const typeLabels = { in_store: '🛒 Tienda', online: '🌐 Online' }

function getStartDate(range) {
  const now = new Date()
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (range === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1)
  return d.toISOString()
}

function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('es-NI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Ajustá esto según cómo determinás el rol en tu app (ej. leerlo de localStorage,
// de un contexto de auth, o pasarlo como prop desde el componente padre).
export default function Reports({ onBack, isAdmin = false }) {
  const [range, setRange] = useState('today')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [expenses, setExpenses] = useState([])

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadData = async () => {
    setLoading(true)
    const start = getStartDate(range)

    const { data: orderData } = await supabase
      .from('orders')
      .select('id, order_type, payment_method, payment_status, total, created_at, order_items(quantity, unit_price, product_variants(products(name)))')
      .gte('created_at', start)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    const { data: expenseData } = await supabase
      .from('expenses')
      .select('amount, created_at')
      .gte('created_at', start)

    setOrders(orderData || [])
    setExpenses(expenseData || [])
    setSelectedIds(new Set())
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [range])

  const totalSales = orders.reduce((s, o) => s + Number(o.total), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const orderCount = orders.length
  const avgTicket = orderCount > 0 ? totalSales / orderCount : 0

  const byPayment = orders.reduce((acc, o) => {
    const key = o.payment_method || 'sin especificar'
    acc[key] = (acc[key] || 0) + Number(o.total)
    return acc
  }, {})

  const inStoreTotal = orders.filter((o) => o.order_type === 'in_store').reduce((s, o) => s + Number(o.total), 0)
  const onlineTotal = orders.filter((o) => o.order_type === 'online').reduce((s, o) => s + Number(o.total), 0)

  const productTotals = {}
  orders.forEach((o) => {
    o.order_items?.forEach((it) => {
      const name = it.product_variants?.products?.name || 'Producto'
      productTotals[name] = (productTotals[name] || 0) + it.quantity
    })
  })
  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const allSelected = orders.length > 0 && selectedIds.size === orders.length

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(orders.map((o) => o.id)))
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    const ids = Array.from(selectedIds)
    try {
      // Se borran primero los order_items por la FK hacia orders.
      // No se toca stock ni caja: esto es un borrado puro del registro de venta.
      const { error: itemsError } = await supabase.from('order_items').delete().in('order_id', ids)
      if (itemsError) throw itemsError

      const { error: ordersError } = await supabase.from('orders').delete().in('id', ids)
      if (ordersError) throw ordersError

      setOrders((prev) => prev.filter((o) => !selectedIds.has(o.id)))
      setSelectedIds(new Set())
      setConfirmOpen(false)
    } catch (e) {
      setDeleteError('No se pudo borrar: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Volver</button>
        <h2 style={styles.title}>Reportes</h2>
        <div style={{ width: 90 }} />
      </div>

      <div style={styles.rangeSelector}>
        {Object.entries(RANGES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            style={range === key ? styles.rangeBtnActive : styles.rangeBtn}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={styles.muted}>Cargando...</p>
      ) : (
        <>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.muted}>Ventas totales</div>
              <div style={styles.statValue}>${totalSales.toFixed(2)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.muted}>Pedidos</div>
              <div style={styles.statValue}>{orderCount}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.muted}>Ticket promedio</div>
              <div style={styles.statValue}>${avgTicket.toFixed(2)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.muted}>Gastos</div>
              <div style={{ ...styles.statValue, color: '#C97A6E' }}>-${totalExpenses.toFixed(2)}</div>
            </div>
          </div>

          <div style={styles.netCard}>
            <span>Ganancia neta (ventas - gastos)</span>
            <span style={styles.netValue}>${(totalSales - totalExpenses).toFixed(2)}</span>
          </div>

          <div style={styles.row}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Por tipo de venta</h3>
              <div style={styles.lineRow}>
                <span>🛒 En tienda</span>
                <span>${inStoreTotal.toFixed(2)}</span>
              </div>
              <div style={styles.lineRow}>
                <span>🌐 Online</span>
                <span>${onlineTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Por método de pago</h3>
              {Object.entries(byPayment).length === 0 ? (
                <p style={styles.muted}>Sin datos</p>
              ) : (
                Object.entries(byPayment).map(([method, amount]) => (
                  <div key={method} style={styles.lineRow}>
                    <span>{paymentLabels[method] || method}</span>
                    <span>${amount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Productos más vendidos</h3>
            {topProducts.length === 0 ? (
              <p style={styles.muted}>Sin ventas en este período</p>
            ) : (
              topProducts.map(([name, qty]) => (
                <div key={name} style={styles.lineRow}>
                  <span>{name}</span>
                  <span>{qty} unid.</span>
                </div>
              ))
            )}
          </div>

          {/* Listado de ventas individuales — solo admin puede seleccionar/borrar */}
          <div style={styles.card}>
            <div style={styles.salesHeader}>
              <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>Ventas del período</h3>
              {isAdmin && selectedIds.size > 0 && (
                <button style={styles.deleteBtn} onClick={() => setConfirmOpen(true)}>
                  Borrar seleccionadas ({selectedIds.size})
                </button>
              )}
            </div>

            {orders.length === 0 ? (
              <p style={styles.muted}>Sin ventas en este período</p>
            ) : (
              <div style={styles.salesList}>
                {isAdmin && (
                  <div style={styles.salesRowHead}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    <span style={styles.muted}>Seleccionar todas</span>
                  </div>
                )}
                {orders.map((o) => (
                  <div key={o.id} style={styles.saleRow}>
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={() => toggleOne(o.id)}
                      />
                    )}
                    <span style={styles.saleDate}>{formatDateTime(o.created_at)}</span>
                    <span style={styles.saleType}>{typeLabels[o.order_type] || o.order_type}</span>
                    <span style={styles.muted}>{paymentLabels[o.payment_method] || o.payment_method || '—'}</span>
                    <span style={styles.saleTotal}>${Number(o.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {confirmOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ marginTop: 0, color: '#3B2E1F' }}>¿Borrar ventas seleccionadas?</h3>
            <p style={styles.muted}>
              Se {selectedIds.size === 1 ? 'borrará' : 'borrarán'} {selectedIds.size} venta
              {selectedIds.size === 1 ? '' : 's'} de forma permanente. El stock y la caja no se verán
              afectados — esta acción no se puede deshacer.
            </p>
            {deleteError && <p style={{ color: '#C97A6E', fontSize: 13 }}>{deleteError}</p>}
            <div style={styles.modalActions}>
              <button
                style={styles.modalCancelBtn}
                onClick={() => { setConfirmOpen(false); setDeleteError('') }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button style={styles.modalConfirmBtn} onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? 'Borrando...' : 'Borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#F2EBDB', color: '#2E2618', fontFamily: 'system-ui, sans-serif', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { background: 'transparent', color: '#8A7A56', border: '1px solid #C7B689', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  title: { color: '#3B2E1F', margin: 0, fontSize: 20 },
  muted: { color: '#8A7A56', fontSize: 13 },
  rangeSelector: { display: 'flex', gap: 8, marginBottom: 20 },
  rangeBtn: { background: '#FBF8F0', color: '#5C4E36', border: '1px solid #DACC9E', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13 },
  rangeBtnActive: { background: '#3B2E1F', color: '#F2EBDB', border: '1px solid #3B2E1F', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  statCard: { background: '#FBF8F0', border: '1px solid #DACC9E', borderRadius: 12, padding: 16 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#2E2618', marginTop: 4 },
  netCard: {
    background: '#FBF8F0',
    border: '1px solid #3B2E1F',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    fontSize: 15,
  },
  netValue: { color: '#3B2E1F', fontWeight: 'bold', fontSize: 20 },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 },
  card: { flex: 1, minWidth: 240, background: '#FBF8F0', border: '1px solid #DACC9E', borderRadius: 12, padding: 18, marginBottom: 16 },
  cardTitle: { marginTop: 0, color: '#3B2E1F', fontSize: 15 },
  lineRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 },

  salesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  deleteBtn: { background: '#C97A6E', color: '#FFF', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' },
  salesList: { display: 'flex', flexDirection: 'column', gap: 4 },
  salesRowHead: { display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '1px solid #DACC9E', marginBottom: 4 },
  saleRow: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto auto auto',
    alignItems: 'center',
    gap: 12,
    padding: '10px 6px',
    borderBottom: '1px solid #EFE7D3',
    fontSize: 13,
  },
  saleDate: { color: '#5C4E36' },
  saleType: { color: '#3B2E1F' },
  saleTotal: { fontWeight: 'bold', color: '#2E2618', textAlign: 'right' },

  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(46, 38, 24, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  modalBox: {
    background: '#FBF8F0', border: '1px solid #3B2E1F', borderRadius: 12,
    padding: 24, maxWidth: 380, width: '100%',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalCancelBtn: { background: 'transparent', color: '#5C4E36', border: '1px solid #C7B689', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  modalConfirmBtn: { background: '#C97A6E', color: '#FFF', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' },
}
