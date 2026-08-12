import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const RANGES = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
}

const paymentLabels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' }

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

export default function Reports({ onBack }) {
  const [range, setRange] = useState('today')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [expenses, setExpenses] = useState([])

  const loadData = async () => {
    setLoading(true)
    const start = getStartDate(range)

    const { data: orderData } = await supabase
      .from('orders')
      .select('id, order_type, payment_method, payment_status, total, created_at, order_items(quantity, unit_price, product_variants(products(name)))')
      .gte('created_at', start)
      .neq('status', 'cancelled')

    const { data: expenseData } = await supabase
      .from('expenses')
      .select('amount, created_at')
      .gte('created_at', start)

    setOrders(orderData || [])
    setExpenses(expenseData || [])
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
              <div style={{ ...styles.statValue, color: '#ff9b9b' }}>-${totalExpenses.toFixed(2)}</div>
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
  rangeSelector: { display: 'flex', gap: 8, marginBottom: 20 },
  rangeBtn: { background: '#1a1a1a', color: '#ccc', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13 },
  rangeBtnActive: { background: '#d4af37', color: '#0f0f0f', border: '1px solid #d4af37', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  statCard: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#f5f5f5', marginTop: 4 },
  netCard: {
    background: '#1a1a1a',
    border: '1px solid #d4af37',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    fontSize: 15,
  },
  netValue: { color: '#d4af37', fontWeight: 'bold', fontSize: 20 },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 },
  card: { flex: 1, minWidth: 240, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 18 },
  cardTitle: { marginTop: 0, color: '#d4af37', fontSize: 15 },
  lineRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 },
}
