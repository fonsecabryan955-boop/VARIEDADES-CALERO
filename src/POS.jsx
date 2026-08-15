import React, { useState, useEffect, useMemo } from 'react'
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
        <div className="vc-receipt-wrap">
          <div className="vc-receipt-box" id="receipt-print">
            <div className="vc-receipt-hole" />
            <h2 className="vc-brand">Variedades Calero</h2>
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

      <div className="vc-header">
        <button onClick={onBack} className="vc-back">← Volver</button>
        <div className="vc-headtext">
          <div className="vc-wordmark">Variedades Calero</div>
          <div className="vc-subtitle">Punto de venta</div>
        </div>
        <div className="vc-header-spacer" />
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
          <h3 className="vc-cart-title">Carrito</h3>
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
            <span>Total</span>
            <span className="vc-total-value vc-num">${total.toFixed(2)}</span>
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
    --bg: #16140F;
    --surface: #1E1A13;
    --surface-2: #262015;
    --border: #362E1E;
    --gold: #C7A048;
    --gold-bright: #E7C878;
    --ivory: #F4EEDD;
    --muted: #948A72;
    --success: #7FB88A;
    --danger: #E08668;
    --display: 'Fraunces', Georgia, serif;
    --body: 'Inter', system-ui, -apple-system, sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace;

    min-height: 100vh;
    background: var(--bg);
    color: var(--ivory);
    font-family: var(--body);
    padding: 20px;
    box-sizing: border-box;
  }
  .vc-root * { box-sizing: border-box; }
  .vc-num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .vc-muted { color: var(--muted); }
  .vc-center { text-align: center; }
  .vc-danger { color: var(--danger) !important; }
  .vc-success { color: var(--success) !important; }

  .vc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    gap: 12px;
  }
  .vc-back {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 14px;
    font-family: var(--body);
    font-size: 13px;
    cursor: pointer;
    transition: border-color .15s, color .15s;
  }
  .vc-back:hover { border-color: var(--gold); color: var(--gold-bright); }
  .vc-headtext { text-align: center; }
  .vc-wordmark {
    font-family: var(--display);
    font-style: italic;
    font-weight: 600;
    font-size: 23px;
    color: var(--gold-bright);
    letter-spacing: 0.2px;
  }
  .vc-subtitle {
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-top: 2px;
  }
  .vc-header-spacer { width: 78px; }

  .vc-toolbar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
  }
  .vc-search-wrap {
    position: relative;
    max-width: 360px;
  }
  .vc-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    opacity: 0.6;
  }
  .vc-search {
    width: 100%;
    background: var(--surface);
    color: var(--ivory);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px 10px 34px;
    font-family: var(--body);
    font-size: 13px;
    outline: none;
    transition: border-color .15s;
  }
  .vc-search:focus { border-color: var(--gold); }
  .vc-chips {
    display: flex;
    gap: 8px;
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
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-family: var(--body);
    cursor: pointer;
    white-space: nowrap;
    transition: all .15s;
  }
  .vc-chip:hover { color: var(--ivory); border-color: var(--gold); }
  .vc-chip-active {
    background: var(--gold);
    color: var(--bg);
    border-color: var(--gold);
    font-weight: 600;
  }

  .vc-layout { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start; }
  .vc-products { flex: 2; min-width: 280px; }

  .vc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
    gap: 14px;
  }

  .vc-card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px 16px 4px 4px;
    padding: 16px 12px 12px;
    text-align: left;
    cursor: pointer;
    color: var(--ivory);
    font-family: var(--body);
    transition: border-color .15s, transform .1s;
  }
  .vc-card:hover { border-color: var(--gold); transform: translateY(-2px); }
  .vc-card:active { transform: translateY(0); }
  .vc-card-hole {
    position: absolute;
    top: 8px;
    left: 10px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--bg);
    border: 1px solid var(--border);
  }
  .vc-card-img {
    width: 100%;
    height: 84px;
    object-fit: cover;
    border-radius: 6px;
    margin-bottom: 8px;
  }
  .vc-card-img-placeholder {
    width: 100%;
    height: 84px;
    background: var(--surface-2);
    border-radius: 6px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }
  .vc-card-name { font-weight: 600; font-size: 13.5px; line-height: 1.3; }
  .vc-card-meta { color: var(--muted); font-size: 11px; margin-top: 2px; }
  .vc-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed var(--border);
  }
  .vc-card-price { color: var(--gold-bright); font-weight: 600; font-size: 13px; }
  .vc-card-stock { color: var(--success); font-size: 10px; font-family: var(--mono); }

  .vc-skeleton {
    height: 176px;
    border-radius: 4px 16px 4px 4px;
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
    padding: 60px 20px;
    border: 1px dashed var(--border);
    border-radius: 12px;
  }
  .vc-empty-icon { font-size: 28px; margin-bottom: 8px; opacity: 0.6; }

  .vc-cart {
    flex: 1;
    min-width: 270px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px;
    position: sticky;
    top: 16px;
  }
  .vc-cart-title {
    margin: 0 0 12px;
    color: var(--gold-bright);
    font-family: var(--display);
    font-style: italic;
    font-size: 18px;
  }
  .vc-cart-empty { padding: 20px 0; text-align: center; font-size: 13px; }
  .vc-cart-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .vc-cart-item {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px dashed var(--border);
    padding-bottom: 10px;
  }
  .vc-cart-item-info { flex: 1; min-width: 0; }
  .vc-cart-item-name { font-size: 13px; font-weight: 600; }
  .vc-cart-item-meta { font-size: 11px; color: var(--muted); }
  .vc-qty { display: flex; align-items: center; gap: 6px; }
  .vc-qty-btn {
    background: var(--surface-2);
    color: var(--ivory);
    border: 1px solid var(--border);
    border-radius: 6px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    transition: border-color .15s;
  }
  .vc-qty-btn:hover:not(:disabled) { border-color: var(--gold); }
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
    font-size: 15px;
    font-weight: 600;
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-bottom: 12px;
  }
  .vc-total-value { color: var(--gold-bright); font-size: 18px; }

  .vc-pay-methods { display: flex; gap: 6px; margin-bottom: 14px; }
  .vc-pay-chip {
    flex: 1;
    background: var(--surface-2);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 4px;
    font-size: 11px;
    font-family: var(--body);
    cursor: pointer;
    transition: all .15s;
  }
  .vc-pay-chip:hover { color: var(--ivory); }
  .vc-pay-chip-active {
    background: var(--gold);
    color: var(--bg);
    border-color: var(--gold);
    font-weight: 600;
  }

  .vc-credit {
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-bottom: 12px;
  }
  .vc-credit-label {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--muted);
    margin: 0 0 8px;
  }
  .vc-input {
    width: 100%;
    background: var(--surface-2);
    color: var(--ivory);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 10px;
    margin-bottom: 8px;
    font-size: 13px;
    font-family: var(--body);
    outline: none;
    transition: border-color .15s;
  }
  .vc-input:focus { border-color: var(--gold); }

  .vc-message { font-size: 13px; margin-bottom: 10px; color: var(--danger); }

  .vc-checkout-btn {
    width: 100%;
    background: var(--gold);
    color: var(--bg);
    border: none;
    border-radius: 8px;
    padding: 13px 0;
    font-weight: 700;
    font-size: 14px;
    font-family: var(--body);
    cursor: pointer;
    transition: background .15s;
  }
  .vc-checkout-btn:hover:not(:disabled) { background: var(--gold-bright); }
  .vc-checkout-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .vc-receipt-wrap { max-width: 380px; margin: 0 auto; }
  .vc-brand {
    font-family: var(--display);
    font-style: italic;
    color: var(--gold-bright);
    text-align: center;
    margin: 0 0 4px;
    font-size: 20px;
  }
  .vc-receipt-box {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 22px 20px 20px;
  }
  .vc-receipt-hole {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--bg);
    border: 1px solid var(--border);
  }
  .vc-receipt-divider { border-top: 1px dashed var(--border); margin: 10px 0; }
  .vc-receipt-line { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px; }
  .vc-receipt-total { font-weight: 700; font-size: 15px; }
  .vc-receipt-bold { font-weight: 700; }
  .vc-receipt-actions { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
  .vc-btn-primary {
    background: var(--gold);
    color: var(--bg);
    border: none;
    border-radius: 8px;
    padding: 12px 0;
    font-weight: 700;
    font-family: var(--body);
    cursor: pointer;
  }
  .vc-btn-primary:hover { background: var(--gold-bright); }
  .vc-btn-ghost {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 0;
    font-family: var(--body);
    cursor: pointer;
  }
  .vc-btn-ghost:hover { border-color: var(--gold); color: var(--gold-bright); }

  @media print {
    .vc-root { background: white; color: black; padding: 0; }
    .vc-receipt-actions { display: none; }
    .vc-receipt-box { border: none; }
  }

  @media (max-width: 640px) {
    .vc-header { flex-wrap: wrap; }
    .vc-header-spacer { display: none; }
    .vc-cart { position: static; }
  }
`
