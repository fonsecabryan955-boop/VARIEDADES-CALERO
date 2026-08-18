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

const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']

const nextAction = {
  pending: { label: 'Confirmar', next: 'confirmed' },
  confirmed: { label: 'Preparando', next: 'preparing' },
  preparing: { label: 'Listo', next: 'ready' },
  ready: { label: 'Entregado', next: 'delivered' },
}

// ---------- Icons (inline SVG, no extra deps) ----------
const IconChevronLeft = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 15} height={p.size || 15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
)
const IconRefresh = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v6h-6" /></svg>
)
const IconTrash = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 13} height={p.size || 13} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>
)
const IconInbox = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 22} height={p.size || 22} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></svg>
)
const IconImage = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="0" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
)

export default function Orders({ onBack }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError('')
    const { error: itemsErr } = await supabase.from('order_items').delete().eq('order_id', pendingDelete.id)
    if (itemsErr) {
      setDeleteError('Error al eliminar artículos: ' + itemsErr.message)
      setDeleting(false)
      return
    }
    const { error: orderErr } = await supabase.from('orders').delete().eq('id', pendingDelete.id)
    if (orderErr) {
      setDeleteError('Error al eliminar el pedido: ' + orderErr.message)
      setDeleting(false)
      return
    }
    setDeleting(false)
    setPendingDelete(null)
    loadOrders()
  }

  const pendingCount = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length

  return (
    <div className="ord-root">
      <style>{ORD_STYLES}</style>

      <div className="ord-header">
        <button onClick={onBack} className="ord-back"><IconChevronLeft /> Volver</button>
        <div className="ord-title-block">
          <h2 className="ord-title">Pedidos Online</h2>
          {pendingCount > 0 && <span className="ord-subtitle">{pendingCount} en curso</span>}
        </div>
        <button onClick={loadOrders} className="ord-back"><IconRefresh /> Actualizar</button>
      </div>

      {loading ? (
        <div className="ord-grid">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="ord-skeleton" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="ord-empty">
          <div className="ord-empty-icon"><IconInbox size={26} /></div>
          <p className="ord-muted">No hay pedidos online todavía.</p>
        </div>
      ) : (
        <div className="ord-grid">
          {orders.map((o) => {
            const action = nextAction[o.status]
            const canCancel = o.status !== 'cancelled' && o.status !== 'delivered'
            return (
              <div key={o.id} className={`ord-card ${o.status === 'cancelled' ? 'ord-card-muted' : ''}`}>
                <div className="ord-card-top">
                  <div>
                    <div className="ord-client">{o.clients?.name || 'Cliente'}</div>
                    <div className="ord-contact">
                      {o.clients?.phone}
                      {o.clients?.address ? ` · ${o.clients.address}` : ''}
                    </div>
                  </div>
                  <div className="ord-total ord-num">${Number(o.total).toFixed(2)}</div>
                </div>

                <div className="ord-badges">
                  <span className={`ord-status-badge ord-status-${o.status}`}>{statusLabels[o.status] || o.status}</span>
                  <span className={o.payment_status === 'paid' ? 'ord-paid-badge' : 'ord-unpaid-badge'}>
                    {o.payment_status === 'paid' ? 'Pagado' : 'Sin pagar'}
                  </span>
                </div>

                <div className="ord-divider" />

                <div className="ord-items">
                  {o.order_items?.map((it, idx) => (
                    <div key={idx} className="ord-item-row">
                      <span>{it.product_variants?.products?.name}{it.product_variants?.size ? ` · Talla ${it.product_variants.size}` : ''}</span>
                      <span className="ord-num">x{it.quantity}</span>
                    </div>
                  ))}
                </div>

                {o.notes && <div className="ord-notes">Nota: {o.notes}</div>}

                {o.payment_proof_url && (
                  <a href={o.payment_proof_url} target="_blank" rel="noreferrer" className="ord-proof-link">
                    <img src={o.payment_proof_url} alt="comprobante" className="ord-proof-thumb" />
                    <span><IconImage size={12} /> Ver comprobante</span>
                  </a>
                )}

                <div className="ord-divider" />

                <div className="ord-actions">
                  {o.payment_status !== 'paid' && (
                    <button className="ord-btn-ghost" onClick={() => markPaid(o.id)}>Marcar pagado</button>
                  )}
                  {action && (
                    <button className="ord-btn-primary" onClick={() => updateStatus(o.id, action.next)}>
                      {action.label}
                    </button>
                  )}
                  {canCancel && (
                    <button className="ord-btn-danger-ghost" onClick={() => updateStatus(o.id, 'cancelled')}>
                      Cancelar
                    </button>
                  )}
                  <button className="ord-btn-icon" onClick={() => { setPendingDelete(o); setDeleteError('') }} title="Eliminar pedido">
                    <IconTrash />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pendingDelete && (
        <div className="ord-modal-overlay">
          <div className="ord-modal-box">
            <h3 className="ord-modal-title">¿Eliminar este pedido?</h3>
            <p className="ord-muted">
              {pendingDelete.clients?.name || 'Este cliente'} · ${Number(pendingDelete.total).toFixed(2)}.
              Esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="ord-modal-error">{deleteError}</p>}
            <div className="ord-modal-actions">
              <button className="ord-btn-ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
                Cancelar
              </button>
              <button className="ord-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ORD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .ord-root {
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
  .ord-root * { box-sizing: border-box; }
  .ord-root button { font: inherit; }
  .ord-num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .ord-muted { color: var(--ink-soft); font-size: 13px; margin: 0; }

  .ord-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 26px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border);
  }
  .ord-title-block { text-align: center; }
  .ord-title {
    font-family: var(--display);
    font-weight: 500;
    font-size: 21px;
    margin: 0;
    color: var(--ink);
  }
  .ord-subtitle {
    display: block;
    margin-top: 4px;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--gold);
  }
  .ord-back {
    display: flex;
    align-items: center;
    gap: 7px;
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--ink);
    padding: 10px 16px;
    font-size: 12px;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition: background .15s, color .15s;
  }
  .ord-back:hover { background: var(--ink); color: #fff; }

  .ord-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
  }

  .ord-card {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 20px;
    display: flex;
    flex-direction: column;
    transition: border-color .15s;
  }
  .ord-card:hover { border-color: var(--ink); }
  .ord-card-muted { opacity: 0.55; }

  .ord-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
  .ord-client { font-family: var(--display); font-weight: 600; font-size: 16px; }
  .ord-contact { color: var(--ink-soft); font-size: 11.5px; margin-top: 3px; }
  .ord-total { font-size: 17px; font-weight: 700; color: var(--ink); flex-shrink: 0; }

  .ord-badges { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .ord-status-badge {
    font-family: var(--mono);
    font-size: 9.5px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 4px 9px;
    border: 1px solid var(--border);
    color: var(--ink-soft);
  }
  .ord-status-pending { border-color: var(--gold); color: var(--gold); }
  .ord-status-confirmed, .ord-status-preparing { border-color: var(--ink); color: var(--ink); }
  .ord-status-ready { border-color: var(--success); color: var(--success); }
  .ord-status-delivered { border-color: var(--success); color: var(--success); background: var(--panel-raised); }
  .ord-status-cancelled { border-color: var(--danger); color: var(--danger); }

  .ord-paid-badge, .ord-unpaid-badge {
    font-family: var(--mono);
    font-size: 9.5px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 4px 9px;
  }
  .ord-paid-badge { color: var(--success); border: 1px solid var(--success); }
  .ord-unpaid-badge { color: var(--danger); border: 1px solid var(--danger); }

  .ord-divider { border-top: 1px dashed var(--border); margin: 14px 0; }

  .ord-items { display: flex; flex-direction: column; gap: 6px; }
  .ord-item-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--ink-soft); gap: 10px; }
  .ord-item-row span:first-child { color: var(--ink); }

  .ord-notes { font-size: 11.5px; color: var(--ink-soft); font-style: italic; margin-top: 10px; }

  .ord-proof-link {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--ink);
    font-size: 11.5px;
    text-decoration: none;
    margin-top: 12px;
    border: 1px solid var(--border);
    padding: 7px;
  }
  .ord-proof-link:hover { border-color: var(--ink); }
  .ord-proof-link span { display: flex; align-items: center; gap: 5px; }
  .ord-proof-thumb { width: 34px; height: 34px; object-fit: cover; flex-shrink: 0; }

  .ord-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .ord-btn-primary {
    background: var(--ink);
    color: #fff;
    border: 1px solid var(--ink);
    padding: 9px 14px;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition: opacity .15s;
  }
  .ord-btn-primary:hover { opacity: 0.85; }
  .ord-btn-ghost {
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--border);
    padding: 9px 14px;
    font-size: 11.5px;
    cursor: pointer;
    transition: border-color .15s;
  }
  .ord-btn-ghost:hover { border-color: var(--ink); }
  .ord-btn-danger-ghost {
    background: transparent;
    color: var(--danger);
    border: 1px solid var(--danger);
    padding: 9px 14px;
    font-size: 11.5px;
    cursor: pointer;
    opacity: 0.85;
  }
  .ord-btn-danger-ghost:hover { opacity: 1; }
  .ord-btn-danger {
    background: var(--danger);
    color: #fff;
    border: 1px solid var(--danger);
    padding: 10px 16px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .ord-btn-icon {
    margin-left: auto;
    background: transparent;
    color: var(--ink-faint);
    border: 1px solid var(--border);
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color .15s, border-color .15s;
  }
  .ord-btn-icon:hover { color: var(--danger); border-color: var(--danger); }

  .ord-skeleton {
    height: 220px;
    background: linear-gradient(90deg, var(--panel) 25%, var(--panel-raised) 50%, var(--panel) 75%);
    background-size: 200% 100%;
    animation: ord-pulse 1.4s ease-in-out infinite;
    border: 1px solid var(--border);
  }
  @keyframes ord-pulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .ord-empty { text-align: center; padding: 80px 20px; border: 1px dashed var(--border); }
  .ord-empty-icon { color: var(--ink-faint); margin-bottom: 12px; display: flex; justify-content: center; }

  .ord-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(11,11,10,.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 20px;
  }
  .ord-modal-box {
    background: var(--panel);
    border: 1px solid var(--ink);
    padding: 26px;
    max-width: 380px;
    width: 100%;
  }
  .ord-modal-title { font-family: var(--display); font-weight: 600; font-size: 18px; margin: 0 0 8px; }
  .ord-modal-error { color: var(--danger); font-size: 12.5px; margin-top: 10px; }
  .ord-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

  @media (max-width: 640px) {
    .ord-root { padding: 16px 16px 32px; }
    .ord-grid { grid-template-columns: 1fr; }
  }
`
