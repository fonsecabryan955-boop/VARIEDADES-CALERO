import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'

const paymentLabelsMap = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' }
const paymentIconMap = { cash: '💵', card: '💳', transfer: '🏦' }

export default function POS({ user, onBack }) {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [bump, setBump] = useState(false)

  const loadVariants = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('product_variants')
      .select('id, size, color, stock, price, products(name, base_price, image_url, categories(id, name))')
      .gt('stock', 0)
      .order('created_at', { ascending: false })
    setVariants(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadVariants()
  }, [])

  const categories = useMemo(() => {
    const set = new Set()
    variants.forEach((v) => set.add(v.products?.categories?.name || 'Otros'))
    return ['Todos', ...Array.from(set).sort()]
  }, [variants])

  const filteredVariants = useMemo(() => {
    const q = search.trim().toLowerCase()
    return variants.filter((v) => {
      const catName = v.products?.categories?.name || 'Otros'
      const matchesCategory = activeCategory === 'Todos' || catName === activeCategory
      const matchesSearch = !q || (v.products?.name || '').toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [variants, activeCategory, search])

  const addToCart = (variant) => {
    setMessage('')
    setCart((prev) => {
      const existing = prev.find((i) => i.id === variant.id)
      if (existing) {
        if (existing.qty >= variant.stock) return prev
        return prev.map((i) =>
          i.id === variant.id ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, { ...variant, qty: 1 }]
    })
  }

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    )
  }

  const removeItem = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id))
  }

  const total = cart.reduce((sum, i) => {
    const price = i.price ?? i.products?.base_price ?? 0
    return sum + price * i.qty
  }, 0)

  const prevTotalRef = useRef(total)
  useEffect(() => {
    if (total !== prevTotalRef.current) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 260)
      prevTotalRef.current = total
      return () => clearTimeout(t)
    }
  }, [total])

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setCheckingOut(true)
    setMessage('')

    const subtotal = total
    const paidInput = amountPaid.trim()
    const finalPaid = paidInput === '' ? subtotal : (isNaN(parseFloat(paidInput)) ? subtotal : parseFloat(paidInput))
    const paymentStatus = finalPaid >= subtotal ? 'paid' : 'partial'

    let clientId = null
    let clientBalance = 0

    if (clientName.trim()) {
      let existingClient = null
      if (clientPhone.trim()) {
        const { data: found } = await supabase
          .from('clients')
          .select('id')
          .eq('phone', clientPhone.trim())
          .maybeSingle()
        existingClient = found
      }

      if (existingClient) {
        clientId = existingClient.id
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({ name: clientName.trim(), phone: clientPhone.trim() || null })
          .select('id')
          .single()
        if (clientErr) {
          setMessage('Error al guardar cliente: ' + clientErr.message)
          setCheckingOut(false)
          return
        }
        clientId = newClient.id
      }
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_type: 'in_store',
        client_id: clientId,
        status: 'delivered',
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount_paid: finalPaid,
        subtotal,
        discount: 0,
        total: subtotal,
        notes: `Vendido por ${user.name}`,
      })
      .select('id')
      .single()

    if (orderErr) {
      setMessage('Error al crear la venta: ' + orderErr.message)
      setCheckingOut(false)
      return
    }

    const items = cart.map((i) => ({
      order_id: order.id,
      variant_id: i.id,
      quantity: i.qty,
      unit_price: i.price ?? i.products?.base_price ?? 0,
      subtotal: (i.price ?? i.products?.base_price ?? 0) * i.qty,
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(items)

    if (itemsErr) {
      setMessage('Error al guardar los artículos: ' + itemsErr.message)
      setCheckingOut(false)
      return
    }

    if (clientId) {
      const { data: pending } = await supabase
        .from('orders')
        .select('total, amount_paid')
        .eq('client_id', clientId)
        .neq('payment_status', 'paid')
      clientBalance = (pending || []).reduce(
        (s, o) => s + (Number(o.total) - Number(o.amount_paid)),
        0
      )
    }

    setReceipt({
      orderRef: (order.id || Date.now()).toString().slice(-6).padStart(6, '0'),
      items: cart,
      subtotal,
      total: subtotal,
      paid: finalPaid,
      remaining: subtotal - finalPaid,
      clientName: clientName.trim(),
      clientBalance,
      paymentMethod,
      date: new Date(),
      soldBy: user.name,
    })

    setCart([])
    setPaymentMethod('cash')
    setClientName('')
    setClientPhone('')
    setAmountPaid('')
    setCheckingOut(false)
    loadVariants()
  }

  if (receipt) {
    return (
      <div className="vc-root">
        <style>{VC_STYLES}</style>
        <div className="vc-topbar" />
        <div className="vc-receipt-wrap">
          <div className="vc-receipt-box" id="receipt-print">
            <div className="vc-receipt-hole" />
            <h2 className="vc-brand">Variedades Calero</h2>
            <div className="vc-brand-rule" />
            <p className="vc-receipt-ref">N.º {receipt.orderRef}</p>
            <p className="vc-muted vc-center">{receipt.date.toLocaleString()}</p>
            <p className="vc-muted vc-center">Vendido por: {receipt.soldBy}</p>
            {receipt.clientName && <p className="vc-muted vc-center">Cliente: {receipt.clientName}</p>}

            <div className="vc-receipt-divider" />

            {receipt.items.map((i) => (
              <div key={i.id} className="vc-receipt-line">
                <span>{i.products?.name} ×{i.qty}</span>
                <span className="vc-num">${((i.price ?? i.products?.base_price ?? 0) * i.qty).toFixed(2)}</span>
              </div>
            ))}

            <div className="vc-receipt-divider" />

            <div className="vc-receipt-line vc-receipt-total">
              <span>Total</span>
              <span className="vc-num">${receipt.total.toFixed(2)}</span>
            </div>
            <div className="vc-receipt-line">
              <span>Abonado ({paymentLabelsMap[receipt.paymentMethod]})</span>
              <span className="vc-num">${receipt.paid.toFixed(2)}</span>
            </div>
            <div className={`vc-receipt-line vc-receipt-bold ${receipt.remaining > 0 ? 'vc-danger' : 'vc-success'}`}>
              <span>{receipt.remaining > 0 ? 'Resta de esta compra' : 'Pagado completo'}</span>
              <span className="vc-num">${receipt.remaining.toFixed(2)}</span>
            </div>

            {receipt.clientName && receipt.clientBalance > 0 && (
              <>
                <div className="vc-receipt-divider" />
                <div className="vc-receipt-line vc-receipt-bold vc-danger">
                  <span>Total pendiente del cliente</span>
                  <span className="vc-num">${receipt.clientBalance.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="vc-receipt-actions">
            <button className="vc-btn-primary" onClick={() => window.print()}>
              🖨️ Imprimir recibo
            </button>
            <button className="vc-btn-ghost" onClick={() => setReceipt(null)}>
              Nueva venta
            </button>
            <button className="vc-btn-ghost" onClick={onBack}>
              Volver al menú
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vc-root">
      <style>{VC_STYLES}</style>
      <div className="vc-topbar" />

      <div className="vc-header">
        <div className="vc-brand-block">
          <div className="vc-crest">
            <span className="vc-crest-text">VC</span>
          </div>
          <div className="vc-headtext">
            <div className="vc-wordmark">Variedades Calero</div>
            <div className="vc-subtitle">Punto de venta</div>
          </div>
        </div>
        <button onClick={onBack} className="vc-back">← Volver</button>
      </div>

      <div className="vc-toolbar">
        <div className="vc-search-wrap">
          <span className="vc-search-icon">🔍</span>
          <input
            className="vc-search"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="vc-chips">
          {categories.map((c) => (
            <button
              key={c}
              className={`vc-chip ${activeCategory === c ? 'vc-chip-active' : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="vc-layout">
        <div className="vc-products">
          {loading ? (
            <div className="vc-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="vc-skeleton" />
              ))}
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="vc-empty">
              <div className="vc-empty-icon">🏷️</div>
              <p className="vc-muted">
                {variants.length === 0
                  ? 'No hay productos con stock disponible.'
                  : 'Ningún producto coincide con la búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="vc-grid">
              {filteredVariants.map((v) => (
                <button key={v.id} className="vc-card" onClick={() => addToCart(v)}>
                  <span className="vc-card-hole" />
                  {v.products?.image_url ? (
                    <img src={v.products.image_url} alt="" className="vc-card-img" />
                  ) : (
                    <div className="vc-card-img-placeholder">📦</div>
                  )}
                  <div className="vc-card-name">{v.products?.name}</div>
                  <div className="vc-card-meta">
                    {v.size ? `Talla ${v.size}` : ''} {v.color || ''}
                  </div>
                  <div className="vc-card-footer">
                    <span className="vc-card-price vc-num">
                      ${Number(v.price ?? v.products?.base_price).toFixed(2)}
                    </span>
                    <span className="vc-card-stock">Stock {v.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="vc-cart">
          <div className="vc-cart-head">
            <h3 className="vc-cart-title">Carrito</h3>
            <span className="vc-cart-count">{cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}</span>
          </div>
          {cart.length === 0 ? (
            <p className="vc-muted vc-cart-empty">Vacío. Tocá un producto para agregarlo.</p>
          ) : (
            <div className="vc-cart-list">
              {cart.map((i) => (
                <div key={i.id} className="vc-cart-item">
                  <div className="vc-cart-item-info">
                    <div className="vc-cart-item-name">{i.products?.name}</div>
                    <div className="vc-cart-item-meta">
                      {i.size ? `Talla ${i.size}` : ''} {i.color || ''}
                    </div>
                  </div>
                  <div className="vc-qty">
                    <button className="vc-qty-btn" onClick={() => changeQty(i.id, -1)}>−</button>
                    <span className="vc-qty-value vc-num">{i.qty}</span>
                    <button
                      className="vc-qty-btn"
                      onClick={() => changeQty(i.id, 1)}
                      disabled={i.qty >= i.stock}
                    >
                      +
                    </button>
                  </div>
                  <div className="vc-cart-item-price vc-num">
                    ${((i.price ?? i.products?.base_price ?? 0) * i.qty).toFixed(2)}
                  </div>
                  <button className="vc-remove" onClick={() => removeItem(i.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className="vc-total-row">
            <span className="vc-total-label">Total a pagar</span>
            <span className={`vc-total-value ${bump ? 'vc-bump' : ''}`}>${total.toFixed(2)}</span>
          </div>

          <div className="vc-pay-methods">
            {Object.keys(paymentLabelsMap).map((key) => (
              <button
                key={key}
                className={`vc-pay-chip ${paymentMethod === key ? 'vc-pay-chip-active' : ''}`}
                onClick={() => setPaymentMethod(key)}
              >
                {paymentIconMap[key]} {paymentLabelsMap[key]}
              </button>
            ))}
          </div>

          <div className="vc-credit">
            <p className="vc-credit-label">Cliente (opcional, para ventas al crédito)</p>
            <input
              className="vc-input"
              placeholder="Nombre del cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <input
              className="vc-input"
              placeholder="Teléfono"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
            <input
              className="vc-input"
              type="number"
              step="0.01"
              placeholder={`Monto abonado (dejar vacío = paga todo $${total.toFixed(2)})`}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>

          {message && <p className="vc-message">{message}</p>}

          <button
            className="vc-checkout-btn"
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkingOut}
          >
            {checkingOut ? 'Procesando...' : `Cobrar $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

const VC_STYLES = `
  .vc-root {
    --bg: #F2EBDB;
    --surface: #FBF8F0;
    --surface-2: #EAE0C7;
    --border: #DACC9E;
    --border-soft: #C7B689;
    --stitch: rgba(59, 46, 31, 0.18);
    --accent: #3B2E1F;
    --accent-soft: #55432C;
    --accent-contrast: #F5EFDF;
    --ink: #2E2618;
    --muted: #8A7A56;
    --success: #5F7D53;
    --danger: #9C5340;
    --display: 'Fraunces', Georgia, serif;
    --body: 'Inter', system-ui, -apple-system, sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace;

    position: relative;
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--body);
    padding: 24px;
    box-sizing: border-box;
  }
  .vc-root * { box-sizing: border-box; }
  .vc-num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .vc-muted { color: var(--muted); }
  .vc-center { text-align: center; }
  .vc-danger { color: var(--danger) !important; }
  .vc-success { color: var(--success) !important; }

  .vc-topbar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent);
  }

  .vc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 6px 0 24px;
    gap: 12px;
  }
  .vc-brand-block { display: flex; align-items: center; gap: 13px; }
  .vc-crest {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid var(--border-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: var(--surface);
  }
  .vc-crest::before {
    content: '';
    position: absolute;
    inset: 4px;
    border: 1px solid var(--border);
    border-radius: 50%;
  }
  .vc-crest-text {
    font-family: var(--display);
    font-style: italic;
    font-weight: 600;
    font-size: 14px;
    color: var(--accent);
    letter-spacing: 0.5px;
  }
  .vc-headtext { text-align: left; }
  .vc-wordmark {
    font-family: var(--display);
    font-style: italic;
    font-weight: 600;
    font-size: 21px;
    color: var(--ink);
    letter-spacing: 0.2px;
    line-height: 1.15;
  }
  .vc-subtitle {
    font-family: var(--mono);
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    color: var(--muted);
    margin-top: 2px;
  }
  .vc-back {
    background: var(--surface);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 15px;
    font-family: var(--body);
    font-size: 13px;
    cursor: pointer;
    transition: border-color .2s, color .2s;
    flex-shrink: 0;
  }
  .vc-back:hover { border-color: var(--accent); color: var(--accent); }

  .vc-toolbar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 22px;
  }
  .vc-search-wrap {
    position: relative;
    max-width: 360px;
  }
  .vc-search-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    opacity: 0.5;
  }
  .vc-search {
    width: 100%;
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 11px 12px 11px 36px;
    font-family: var(--body);
    font-size: 13px;
    outline: none;
    transition: border-color .2s;
  }
  .vc-search::placeholder { color: var(--muted); }
  .vc-search:focus { border-color: var(--accent); }
  .vc-chips {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .vc-chips::-webkit-scrollbar { display: none; }
  .vc-chip {
    flex-shrink: 0;
    background: var(--surface);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 3px 0 0 3px;
    padding: 7px 20px 7px 14px;
    font-size: 12px;
    font-family: var(--body);
    cursor: pointer;
    white-space: nowrap;
    transition: color .2s, border-color .2s, background .2s;
    clip-path: polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%);
  }
  .vc-chip:hover { color: var(--accent); border-color: var(--accent); }
  .vc-chip-active {
    background: var(--accent);
    color: var(--accent-contrast);
    border-color: var(--accent);
    font-weight: 600;
  }

  .vc-layout { display: flex; gap: 22px; flex-wrap: wrap; align-items: flex-start; }
  .vc-products { flex: 2; min-width: 280px; }

  .vc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
    gap: 16px;
  }

  .vc-card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px 18px 4px 4px;
    padding: 18px 13px 13px;
    text-align: left;
    cursor: pointer;
    color: var(--ink);
    font-family: var(--body);
    box-shadow: 0 1px 2px rgba(59, 46, 31, 0.05);
    transition: border-color .2s, transform .18s, box-shadow .2s;
  }
  .vc-card::after {
    content: '';
    position: absolute;
    inset: 6px;
    border: 1px dashed var(--stitch);
    border-radius: 3px 15px 3px 3px;
    pointer-events: none;
  }
  .vc-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(59, 46, 31, 0.09);
  }
  .vc-card:active { transform: translateY(0); }
  .vc-card-hole {
    position: absolute;
    top: 9px;
    left: 11px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--bg);
    border: 1px solid var(--border);
    z-index: 1;
  }
  .vc-card-img {
    width: 100%;
    height: 86px;
    object-fit: cover;
    border-radius: 7px;
    margin-bottom: 9px;
    position: relative;
  }
  .vc-card-img-placeholder {
    width: 100%;
    height: 86px;
    background: var(--surface-2);
    border-radius: 7px;
    margin-bottom: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    opacity: 0.55;
  }
  .vc-card-name { font-weight: 600; font-size: 13.5px; line-height: 1.3; position: relative; }
  .vc-card-meta { color: var(--muted); font-size: 11px; margin-top: 3px; position: relative; }
  .vc-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 11px;
    padding-top: 9px;
    border-top: 1px dashed var(--border);
    position: relative;
  }
  .vc-card-price { color: var(--accent); font-weight: 700; font-size: 13.5px; }
  .vc-card-stock { color: var(--success); font-size: 10px; font-family: var(--mono); }

  .vc-skeleton {
    height: 180px;
    border-radius: 4px 18px 4px 4px;
    background: linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%);
    background-size: 200% 100%;
    animation: vc-pulse 1.4s ease-in-out infinite;
    border: 1px solid var(--border);
  }
  @keyframes vc-pulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .vc-empty {
    text-align: center;
    padding: 64px 20px;
    border: 1px dashed var(--border);
    border-radius: 14px;
  }
  .vc-empty-icon { font-size: 30px; margin-bottom: 10px; opacity: 0.5; }

  .vc-cart {
    flex: 1;
    min-width: 270px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
    position: sticky;
    top: 16px;
    box-shadow: 0 1px 2px rgba(59, 46, 31, 0.05);
  }
  .vc-cart-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .vc-cart-title {
    margin: 0;
    color: var(--ink);
    font-family: var(--display);
    font-style: italic;
    font-size: 19px;
  }
  .vc-cart-count {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .vc-cart-empty { padding: 24px 0; text-align: center; font-size: 13px; }
  .vc-cart-list { display: flex; flex-direction: column; gap: 11px; margin-bottom: 16px; }
  .vc-cart-item {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px dashed var(--border);
    padding-bottom: 11px;
  }
  .vc-cart-item-info { flex: 1; min-width: 0; }
  .vc-cart-item-name { font-size: 13px; font-weight: 600; }
  .vc-cart-item-meta { font-size: 11px; color: var(--muted); }
  .vc-qty { display: flex; align-items: center; gap: 6px; }
  .vc-qty-btn {
    background: var(--surface-2);
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: 6px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    transition: border-color .2s;
  }
  .vc-qty-btn:hover:not(:disabled) { border-color: var(--accent); }
  .vc-qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .vc-qty-value { min-width: 16px; text-align: center; font-size: 13px; }
  .vc-cart-item-price { font-size: 13px; min-width: 54px; text-align: right; }
  .vc-remove {
    background: transparent;
    color: var(--danger);
    border: none;
    font-size: 17px;
    cursor: pointer;
    line-height: 1;
    padding: 0 2px;
  }

  .vc-total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-top: 1px solid var(--border);
    padding-top: 14px;
    margin-bottom: 14px;
  }
  .vc-total-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--muted);
  }
  .vc-total-value {
    font-family: var(--display);
    font-style: italic;
    font-weight: 600;
    color: var(--accent);
    font-size: 27px;
    display: inline-block;
    transition: transform .18s ease;
  }
  .vc-total-value.vc-bump { transform: scale(1.08); }

  .vc-pay-methods { display: flex; gap: 7px; margin-bottom: 16px; }
  .vc-pay-chip {
    flex: 1;
    background: var(--surface-2);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 10px 4px;
    font-size: 11px;
    font-family: var(--body);
    cursor: pointer;
    transition: all .2s;
  }
  .vc-pay-chip:hover { color: var(--ink); }
  .vc-pay-chip-active {
    background: var(--accent);
    color: var(--accent-contrast);
    border-color: var(--accent);
    font-weight: 600;
  }

  .vc-credit {
    border-top: 1px solid var(--border);
    padding-top: 14px;
    margin-bottom: 14px;
  }
  .vc-credit-label {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--muted);
    margin: 0 0 9px;
  }
  .vc-input {
    width: 100%;
    background: var(--surface-2);
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 10px 11px;
    margin-bottom: 9px;
    font-size: 13px;
    font-family: var(--body);
    outline: none;
    transition: border-color .2s;
  }
  .vc-input::placeholder { color: var(--muted); }
  .vc-input:focus { border-color: var(--accent); }

  .vc-message { font-size: 13px; margin-bottom: 10px; color: var(--danger); }

  .vc-checkout-btn {
    width: 100%;
    background: var(--accent);
    color: var(--accent-contrast);
    border: none;
    border-radius: 9px;
    padding: 14px 0;
    font-weight: 700;
    font-size: 14px;
    font-family: var(--body);
    cursor: pointer;
    transition: background .2s;
  }
  .vc-checkout-btn:hover:not(:disabled) { background: var(--accent-soft); }
  .vc-checkout-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .vc-receipt-wrap { max-width: 380px; margin: 0 auto; }
  .vc-brand {
    font-family: var(--display);
    font-style: italic;
    color: var(--ink);
    text-align: center;
    margin: 0;
    font-size: 21px;
  }
  .vc-brand-rule {
    width: 52px;
    height: 1px;
    margin: 9px auto 8px;
    background: var(--border-soft);
  }
  .vc-receipt-ref {
    text-align: center;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 1.5px;
    color: var(--accent);
    margin: 0 0 12px;
  }
  .vc-receipt-box {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 26px 22px 22px;
    box-shadow: 0 2px 8px rgba(59, 46, 31, 0.06);
  }
  .vc-receipt-hole {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--bg);
    border: 1px solid var(--border);
  }
  .vc-receipt-divider { position: relative; border-top: 1px dashed var(--border); margin: 12px 0; }
  .vc-receipt-divider::after {
    content: '❖';
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface);
    color: var(--accent);
    font-size: 11px;
    padding: 0 8px;
  }
  .vc-receipt-line { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px; }
  .vc-receipt-total { font-weight: 700; font-size: 15px; }
  .vc-receipt-bold { font-weight: 700; }
  .vc-receipt-actions { margin-top: 18px; display: flex; flex-direction: column; gap: 9px; }
  .vc-btn-primary {
    background: var(--accent);
    color: var(--accent-contrast);
    border: none;
    border-radius: 9px;
    padding: 13px 0;
    font-weight: 700;
    font-family: var(--body);
    cursor: pointer;
    transition: background .2s;
  }
  .vc-btn-primary:hover { background: var(--accent-soft); }
  .vc-btn-ghost {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 11px 0;
    font-family: var(--body);
    cursor: pointer;
    transition: border-color .2s, color .2s;
  }
  .vc-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

  @media print {
    .vc-root { background: white; color: black; padding: 0; }
    .vc-topbar { display: none; }
    .vc-receipt-actions { display: none; }
    .vc-receipt-box { border: none; box-shadow: none; }
  }

  @media (max-width: 640px) {
    .vc-header { flex-wrap: wrap; }
    .vc-cart { position: static; }
  }
`
