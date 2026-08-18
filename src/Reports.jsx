import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const RANGES = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
}

const paymentLabels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' }
const typeLabels = { in_store: 'Tienda', online: 'Online' }

// ---------- Icons (inline SVG, no extra deps) ----------
const IconChevronLeft = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 15} height={p.size || 15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
)
const IconTrash = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 13} height={p.size || 13} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>
)
const IconAlert = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 15} height={p.size || 15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
)
const IconChart = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 22} height={p.size || 22} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-3" /></svg>
)

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
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('es-NI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export default function Reports({ onBack }) {
  const [range, setRange] = useState('today')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loadError, setLoadError] = useState('')

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setLoadError('')
    const start = getStartDate(range)

    try {
      const [{ data: orderData, error: ordersErr }, { data: expenseData, error: expensesErr }] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_type, payment_method, payment_status, total, created_at, order_items(quantity, unit_price, product_variants(products(name)))')
          .gte('created_at', start)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('amount, created_at')
          .gte('created_at', start),
      ])

      if (ordersErr) throw ordersErr
      if (expensesErr) throw expensesErr

      setOrders(orderData || [])
      setExpenses(expenseData || [])
      setSelectedIds(new Set())
    } catch (e) {
      setLoadError('No se pudieron cargar los datos: ' + (e?.message || 'error desconocido'))
      setOrders([])
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const totalSales = orders.reduce((s, o) => s + Number(o.total || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const orderCount = orders.length
  const avgTicket = orderCount > 0 ? totalSales / orderCount : 0

  const byPayment = orders.reduce((acc, o) => {
    const key = o.payment_method || 'sin especificar'
    acc[key] = (acc[key] || 0) + Number(o.total || 0)
    return acc
  }, {})

  const inStoreTotal = orders.filter((o) => o.order_type === 'in_store').reduce((s, o) => s + Number(o.total || 0), 0)
  const onlineTotal = orders.filter((o) => o.order_type === 'online').reduce((s, o) => s + Number(o.total || 0), 0)

  const productTotals = {}
  orders.forEach((o) => {
    o.order_items?.forEach((it) => {
      const name = it.product_variants?.products?.name || 'Producto'
      productTotals[name] = (productTotals[name] || 0) + Number(it.quantity || 0)
    })
  })
  const topProducts = Object.entries(productTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const allSelected = orders.length > 0 && selectedIds.size === orders.length

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(orders.map((o) => o.id)))
  }

  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    setDeleteError('')
    const ids = Array.from(selectedIds)
    try {
      // Se borran primero los order_items por la FK hacia orders.
      // Borrado puro del registro de venta: no toca stock ni caja.
      const { error: itemsError } = await supabase.from('order_items').delete().in('order_id', ids)
      if (itemsError) throw itemsError

      const { error: ordersError } = await supabase.from('orders').delete().in('id', ids)
      if (ordersError) throw ordersError

      setOrders((prev) => prev.filter((o) => !selectedIds.has(o.id)))
      setSelectedIds(new Set())
      setConfirmOpen(false)
    } catch (e) {
      setDeleteError('No se pudo borrar: ' + (e?.message || 'error desconocido'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rpt-root">
      <style>{RPT_STYLES}</style>

      <div className="rpt-header">
        <button onClick={onBack} className="rpt-back"><IconChevronLeft /> Volver</button>
        <h2 className="rpt-title">Reportes</h2>
        <div style={{ width: 90 }} />
      </div>

      <div className="rpt-range">
        {Object.entries(RANGES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`rpt-range-btn ${range === key ? 'rpt-range-btn-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="rpt-error-banner">
          <IconAlert size={16} />
          <span>{loadError}</span>
          <button className="rpt-retry-btn" onClick={loadData}>Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="rpt-skeleton-grid">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rpt-skeleton" />)}
        </div>
      ) : (
        <>
          <div className="rpt-stats-grid">
            <div className="rpt-stat-card">
              <div className="rpt-muted">Ventas totales</div>
              <div className="rpt-stat-value">${totalSales.toFixed(2)}</div>
            </div>
            <div className="rpt-stat-card">
              <div className="rpt-muted">Pedidos</div>
              <div className="rpt-stat-value">{orderCount}</div>
            </div>
            <div className="rpt-stat-card">
              <div className="rpt-muted">Ticket promedio</div>
              <div className="rpt-stat-value">${avgTicket.toFixed(2)}</div>
            </div>
            <div className="rpt-stat-card">
              <div className="rpt-muted">Gastos</div>
              <div className="rpt-stat-value rpt-danger">-${totalExpenses.toFixed(2)}</div>
            </div>
          </div>

          <div className="rpt-net-card">
            <span>Ganancia neta (ventas − gastos)</span>
            <span className="rpt-net-value">${(totalSales - totalExpenses).toFixed(2)}</span>
          </div>

          <div className="rpt-row">
            <div className="rpt-card">
              <h3 className="rpt-card-title">Por tipo de venta</h3>
              <div className="rpt-line-row"><span>Tienda</span><span className="rpt-num">${inStoreTotal.toFixed(2)}</span></div>
              <div className="rpt-line-row"><span>Online</span><span className="rpt-num">${onlineTotal.toFixed(2)}</span></div>
            </div>

            <div className="rpt-card">
              <h3 className="rpt-card-title">Por método de pago</h3>
              {Object.entries(byPayment).length === 0 ? (
                <p className="rpt-muted">Sin datos</p>
              ) : (
                Object.entries(byPayment).map(([method, amount]) => (
                  <div key={method} className="rpt-line-row">
                    <span>{paymentLabels[method] || method}</span>
                    <span className="rpt-num">${amount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rpt-card">
            <h3 className="rpt-card-title">Productos más vendidos</h3>
            {topProducts.length === 0 ? (
              <p className="rpt-muted">Sin ventas en este período</p>
            ) : (
              topProducts.map(([name, qty]) => (
                <div key={name} className="rpt-line-row">
                  <span>{name}</span>
                  <span className="rpt-num">{qty} unid.</span>
                </div>
              ))
            )}
          </div>

          <div className="rpt-card">
            <div className="rpt-sales-header">
              <h3 className="rpt-card-title" style={{ marginBottom: 0 }}>Ventas del período</h3>
              {selectedIds.size > 0 && (
                <button className="rpt-delete-btn" onClick={() => setConfirmOpen(true)}>
                  <IconTrash /> Borrar seleccionadas ({selectedIds.size})
                </button>
              )}
            </div>

            {orders.length === 0 ? (
              <div className="rpt-empty">
                <div className="rpt-empty-icon"><IconChart /></div>
                <p className="rpt-muted">Sin ventas en este período.</p>
              </div>
            ) : (
              <div className="rpt-sales-list">
                <div className="rpt-sales-row-head">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  <span className="rpt-muted">Seleccionar todas</span>
                </div>
                {orders.map((o) => (
                  <div key={o.id} className="rpt-sale-row">
                    <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleOne(o.id)} />
                    <span className="rpt-sale-date">{formatDateTime(o.created_at)}</span>
                    <span className="rpt-sale-type">{typeLabels[o.order_type] || o.order_type || '—'}</span>
                    <span className="rpt-muted">{paymentLabels[o.payment_method] || o.payment_method || '—'}</span>
                    <span className="rpt-sale-total rpt-num">${Number(o.total || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {confirmOpen && (
        <div className="rpt-modal-overlay">
          <div className="rpt-modal-box">
            <h3 className="rpt-modal-title">¿Borrar ventas seleccionadas?</h3>
            <p className="rpt-muted">
              Se {selectedIds.size === 1 ? 'borrará' : 'borrarán'} {selectedIds.size} venta{selectedIds.size === 1 ? '' : 's'} de forma permanente.
              El stock y la caja no se ven afectados — esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="rpt-modal-error"><IconAlert size={14} /> {deleteError}</p>}
            <div className="rpt-modal-actions">
              <button className="rpt-btn-ghost" onClick={() => { setConfirmOpen(false); setDeleteError('') }} disabled={deleting}>
                Cancelar
              </button>
              <button className="rpt-btn-danger" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? 'Borrando...' : 'Borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const RPT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .rpt-root {
    --bg: #f5f4f1;
    --panel: #ffffff;
    --panel-raised: #f2f0ec;
    --border: #e2ded5;
    --ink: #0b0b0a;
    --ink-soft: #726d63;
    --ink-faint: #a39d8f;
    --success: #3f6b4a;
    --danger: #9c3b2e;
    --gold: #9c7a3c;
    --display: 'Bodoni Moda', serif;
    --body: 'Inter', system-ui, -apple-system, sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace;

    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--body);
    padding: 22px 26px 40px;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }
  .rpt-root * { box-sizing: border-box; }
  .rpt-root button { font: inherit; }
  .rpt-num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .rpt-muted { color: var(--ink-soft); font-size: 13px; }
  .rpt-danger { color: var(--danger) !important; }

  .rpt-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid var(--border);
  }
  .rpt-title { font-family: var(--display); font-weight: 500; font-size: 21px; margin: 0; }
  .rpt-back {
    display: flex; align-items: center; gap: 7px;
    background: transparent; color: var(--ink); border: 1px solid var(--ink);
    padding: 10px 16px; font-size: 12px; cursor: pointer; transition: background .15s, color .15s;
  }
  .rpt-back:hover { background: var(--ink); color: #fff; }

  .rpt-range { display: flex; gap: 0; border: 1px solid var(--border); width: fit-content; margin-bottom: 22px; }
  .rpt-range-btn {
    background: transparent; color: var(--ink-soft); border: none; border-right: 1px solid var(--border);
    padding: 9px 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.3px; cursor: pointer; transition: all .15s;
  }
  .rpt-range-btn:last-child { border-right: none; }
  .rpt-range-btn:hover { color: var(--ink); }
  .rpt-range-btn-active { background: var(--ink); color: #fff; }

  .rpt-error-banner {
    display: flex; align-items: center; gap: 10px;
    background: #fbecea; border: 1px solid var(--danger); color: var(--danger);
    padding: 12px 14px; font-size: 13px; margin-bottom: 18px;
  }
  .rpt-retry-btn {
    margin-left: auto; background: var(--danger); color: #fff; border: none;
    padding: 6px 12px; font-size: 11.5px; cursor: pointer; flex-shrink: 0;
  }

  .rpt-skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .rpt-skeleton {
    height: 76px; border: 1px solid var(--border);
    background: linear-gradient(90deg, var(--panel) 25%, var(--panel-raised) 50%, var(--panel) 75%);
    background-size: 200% 100%; animation: rpt-pulse 1.4s ease-in-out infinite;
  }
  @keyframes rpt-pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .rpt-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .rpt-stat-card { background: var(--panel); border: 1px solid var(--border); padding: 16px; }
  .rpt-stat-value { font-family: var(--display); font-weight: 600; font-size: 22px; margin-top: 4px; }

  .rpt-net-card {
    background: var(--panel); border: 1px solid var(--ink); padding: 16px 18px;
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 14px;
  }
  .rpt-net-value { font-family: var(--display); font-weight: 700; font-size: 20px; }

  .rpt-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
  .rpt-card { flex: 1; min-width: 240px; background: var(--panel); border: 1px solid var(--border); padding: 18px; margin-bottom: 16px; }
  .rpt-card-title { margin-top: 0; font-family: var(--display); font-weight: 600; font-size: 15px; }
  .rpt-line-row { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 8px; }

  .rpt-sales-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
  .rpt-delete-btn {
    display: flex; align-items: center; gap: 7px;
    background: var(--danger); color: #fff; border: none; padding: 8px 14px; cursor: pointer; font-size: 12.5px; font-weight: 600;
  }
  .rpt-delete-btn:hover { opacity: 0.88; }

  .rpt-sales-list { display: flex; flex-direction: column; gap: 0; }
  .rpt-sales-row-head { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
  .rpt-sale-row {
    display: grid; grid-template-columns: auto 1fr auto auto auto; align-items: center; gap: 12px;
    padding: 10px 4px; border-bottom: 1px solid var(--panel-raised); font-size: 13px;
  }
  .rpt-sale-date { color: var(--ink-soft); font-family: var(--mono); font-size: 11.5px; }
  .rpt-sale-type { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink-soft); }
  .rpt-sale-total { font-weight: 700; text-align: right; }

  .rpt-empty { text-align: center; padding: 50px 20px; border: 1px dashed var(--border); }
  .rpt-empty-icon { color: var(--ink-faint); margin-bottom: 10px; display: flex; justify-content: center; }

  .rpt-modal-overlay {
    position: fixed; inset: 0; background: rgba(11,11,10,.45);
    display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
  }
  .rpt-modal-box { background: var(--panel); border: 1px solid var(--ink); padding: 26px; max-width: 380px; width: 100%; }
  .rpt-modal-title { font-family: var(--display); font-weight: 600; font-size: 18px; margin: 0 0 8px; }
  .rpt-modal-error { display: flex; align-items: center; gap: 6px; color: var(--danger); font-size: 12.5px; margin-top: 10px; }
  .rpt-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
  .rpt-btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--border); padding: 9px 16px; font-size: 12.5px; cursor: pointer; }
  .rpt-btn-ghost:hover { border-color: var(--ink); }
  .rpt-btn-danger { background: var(--danger); color: #fff; border: 1px solid var(--danger); padding: 9px 16px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .rpt-btn-danger:disabled, .rpt-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 640px) {
    .rpt-root { padding: 16px 16px 32px; }
    .rpt-sale-row { grid-template-columns: auto 1fr auto; row-gap: 4px; }
    .rpt-sale-type, .rpt-muted.rpt-sale-payment { display: none; }
  }
`
