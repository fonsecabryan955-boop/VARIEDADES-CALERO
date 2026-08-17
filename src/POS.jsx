import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'

// ---------- Icons (inline SVG, no extra deps) ----------
const IconChevronLeft = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
)
const IconSearch = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 15} height={p.size || 15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
const IconMinus = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 13} height={p.size || 13} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
)
const IconPlus = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 13} height={p.size || 13} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
)
const IconClose = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 13} height={p.size || 13} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
)
const IconPrinter = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="1" /><path d="M6 17v4h12v-4" />
  </svg>
)
const IconBox = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 22} height={p.size || 22} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
  </svg>
)
const IconCheckCircle = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 34} height={p.size || 34} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
)

const paymentLabelsMap = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' }
const cardBanks = ['BAC', 'Lafise', 'BanPro']
const formatPaymentLabel = (method, bank) =>
  (method === 'card' || method === 'transfer') && bank ? `${paymentLabelsMap[method]} · ${bank}` : paymentLabelsMap[method]

// A variant can have its own price, otherwise falls back to the product's
// base price. If the product is marked as "en liquidación", the discount
// applies on top of whichever of those two prices was in effect.
const getBasePrice = (v) => v.price ?? v.products?.base_price ?? 0
const isOnSale = (v) => !!v.products?.on_sale && Number(v.products?.discount_percent) > 0
const getEffectivePrice = (v) => {
  const base = getBasePrice(v)
  if (isOnSale(v)) {
    return +(base * (1 - Number(v.products.discount_percent) / 100)).toFixed(2)
  }
  return base
}

export default function POS({ user, onBack }) {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cardBank, setCardBank] = useState('')
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
      .select('id, size, color, stock, price, products(name, base_price, image_url, on_sale, discount_percent, categories(id, name))')
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

  const total = cart.reduce((sum, i) => sum + getEffectivePrice(i) * i.qty, 0)

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
    if ((paymentMethod === 'card' || paymentMethod === 'transfer') && !cardBank) {
      setMessage('Seleccioná el banco.')
      return
    }
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
        notes: `Vendido por ${user.name}${(paymentMethod === 'card' || paymentMethod === 'transfer') && cardBank ? ` · Banco: ${cardBank}` : ''}`,
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
      unit_price: getEffectivePrice(i),
      subtotal: getEffectivePrice(i) * i.qty,
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
      cardBank: (paymentMethod === 'card' || paymentMethod === 'transfer') ? cardBank : '',
      date: new Date(),
      soldBy: user.name,
    })

    setCart([])
    setPaymentMethod('cash')
    setCardBank('')
    setClientName('')
    setClientPhone('')
    setAmountPaid('')
    setCheckingOut(false)
    loadVariants()
  }

  if (receipt) {
    const savings = receipt.items.reduce(
      (s, i) => s + (getBasePrice(i) - getEffectivePrice(i)) * i.qty,
      0
    )
    const itemCount = receipt.items.reduce((s, i) => s + i.qty, 0)
    return (
      <div className="pos-root">
        <style>{POS_STYLES}</style>
        <div className="pos-receipt-wrap">
          <div className="pos-receipt-success">
            <span className="pos-receipt-success-icon"><IconCheckCircle size={26} /></span>
            <p className="pos-receipt-success-text">Venta completada</p>
          </div>

          <div className="pos-receipt-box" id="receipt-print">
            <div className="pos-receipt-monogram">VC</div>
            <h2 className="pos-brand">Variedades Calero</h2>
            <p className="pos-receipt-tagline">Boutique · Masatepe, Nicaragua</p>
            <p className="pos-receipt-ref">N.º {receipt.orderRef}</p>

            <div className="pos-receipt-meta">
              <div className="pos-receipt-meta-row"><span>Fecha</span><span>{receipt.date.toLocaleDateString()} · {receipt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div className="pos-receipt-meta-row"><span>Atendido por</span><span>{receipt.soldBy}</span></div>
              {receipt.clientName && <div className="pos-receipt-meta-row"><span>Cliente</span><span>{receipt.clientName}</span></div>}
              {receipt.cardBank && <div className="pos-receipt-meta-row"><span>Banco</span><span>{receipt.cardBank}</span></div>}
            </div>

            <div className="pos-receipt-divider" />

            <div className="pos-receipt-cols-head">
              <span>Artículo</span>
              <span>Importe</span>
            </div>
            {receipt.items.map((i) => (
              <div key={i.id} className="pos-receipt-item">
                <div className="pos-receipt-item-top">
                  <span className="pos-receipt-item-name">
                    {i.products?.name}
                    {isOnSale(i) && <span className="pos-receipt-sale-tag">liquidación</span>}
                  </span>
                  <span className="pos-num">${(getEffectivePrice(i) * i.qty).toFixed(2)}</span>
                </div>
                <div className="pos-receipt-item-sub">
                  {i.qty} × ${getEffectivePrice(i).toFixed(2)}
                  {isOnSale(i) && <span className="pos-receipt-item-strike pos-num">${getBasePrice(i).toFixed(2)}</span>}
                </div>
              </div>
            ))}

            <div className="pos-receipt-divider" />

            <div className="pos-receipt-line">
              <span>Artículos</span>
              <span className="pos-num">{itemCount}</span>
            </div>
            {savings > 0 && (
              <div className="pos-receipt-line pos-success">
                <span>Ahorro por liquidación</span>
                <span className="pos-num">-${savings.toFixed(2)}</span>
              </div>
            )}
            <div className="pos-receipt-line pos-receipt-total">
              <span>Total</span>
              <span className="pos-num">${receipt.total.toFixed(2)}</span>
            </div>
            <div className="pos-receipt-line">
              <span>Abonado ({formatPaymentLabel(receipt.paymentMethod, receipt.cardBank)})</span>
              <span className="pos-num">${receipt.paid.toFixed(2)}</span>
            </div>
            <div className={`pos-receipt-line pos-receipt-bold ${receipt.remaining > 0 ? 'pos-danger' : 'pos-success'}`}>
              <span>{receipt.remaining > 0 ? 'Resta de esta compra' : 'Pagado completo'}</span>
              <span className="pos-num">${receipt.remaining.toFixed(2)}</span>
            </div>

            {receipt.clientName && receipt.clientBalance > 0 && (
              <>
                <div className="pos-receipt-divider" />
                <div className="pos-receipt-line pos-receipt-bold pos-danger">
                  <span>Total pendiente del cliente</span>
                  <span className="pos-num">${receipt.clientBalance.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="pos-receipt-divider" />
            <p className="pos-receipt-thanks">Gracias por tu compra</p>
            <p className="pos-receipt-footer-tag">Conservá este recibo para cualquier cambio o garantía.</p>
          </div>

          <div className="pos-receipt-actions">
            <button className="pos-btn-primary" onClick={() => window.print()}>
              <IconPrinter size={15} /> Imprimir recibo
            </button>
            <button className="pos-btn-ghost" onClick={() => setReceipt(null)}>
              Nueva venta
            </button>
            <button className="pos-btn-ghost" onClick={onBack}>
              Volver al menú
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pos-root">
      <style>{POS_STYLES}</style>

      <div className="pos-header">
        <div className="pos-brand-block">
          <div className="pos-monogram">VC</div>
          <div>
            <div className="pos-wordmark">Variedades Calero</div>
            <div className="pos-subtitle">Punto de venta</div>
          </div>
        </div>
        <button onClick={onBack} className="pos-back"><IconChevronLeft size={15} /> Volver</button>
      </div>

      <div className="pos-toolbar">
        <div className="pos-search-wrap">
          <span className="pos-search-icon"><IconSearch /></span>
          <input
            className="pos-search"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="pos-chips">
          {categories.map((c) => (
            <button
              key={c}
              className={`pos-chip ${activeCategory === c ? 'pos-chip-active' : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="pos-layout">
        <div className="pos-products">
          {loading ? (
            <div className="pos-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pos-skeleton" />
              ))}
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="pos-empty">
              <div className="pos-empty-icon"><IconBox size={26} /></div>
              <p className="pos-muted">
                {variants.length === 0
                  ? 'No hay productos con stock disponible.'
                  : 'Ningún producto coincide con la búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="pos-grid">
              {filteredVariants.map((v) => (
                <button key={v.id} className="pos-card" onClick={() => addToCart(v)}>
                  {isOnSale(v) && (
                    <span className="pos-sale-badge">-{v.products.discount_percent}%</span>
                  )}
                  {v.stock <= 3 && <span className="pos-lowstock-badge">Stock {v.stock}</span>}
                  <div className="pos-card-imgwrap">
                    {v.products?.image_url ? (
                      <img src={v.products.image_url} alt="" className="pos-card-img" />
                    ) : (
                      <div className="pos-card-img-placeholder"><IconBox size={20} /></div>
                    )}
                  </div>
                  <div className="pos-card-body">
                    <div className="pos-card-name">{v.products?.name}</div>
                    <div className="pos-card-meta">
                      {v.size ? `Talla ${v.size}` : ''} {v.color || ''}
                    </div>
                    <div className="pos-card-footer">
                      {isOnSale(v) ? (
                        <span className="pos-card-price-wrap">
                          <span className="pos-card-price-strike pos-num">${getBasePrice(v).toFixed(2)}</span>
                          <span className="pos-card-price pos-num">${getEffectivePrice(v).toFixed(2)}</span>
                        </span>
                      ) : (
                        <span className="pos-card-price pos-num">${getBasePrice(v).toFixed(2)}</span>
                      )}
                      {v.stock > 3 && <span className="pos-card-stock">Stock {v.stock}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pos-cart">
          <div className="pos-cart-head">
            <h3 className="pos-cart-title">Carrito</h3>
            <span className="pos-cart-count">{cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}</span>
          </div>
          {cart.length === 0 ? (
            <p className="pos-muted pos-cart-empty">Vacío. Tocá un producto para agregarlo.</p>
          ) : (
            <div className="pos-cart-list">
              {cart.map((i) => (
                <div key={i.id} className="pos-cart-item">
                  <div className="pos-cart-item-info">
                    <div className="pos-cart-item-name">
                      {i.products?.name}
                      {isOnSale(i) && <span className="pos-cart-sale-tag">Liquidación</span>}
                    </div>
                    <div className="pos-cart-item-meta">
                      {i.size ? `Talla ${i.size}` : ''} {i.color || ''}
                    </div>
                  </div>
                  <div className="pos-qty">
                    <button className="pos-qty-btn" onClick={() => changeQty(i.id, -1)}><IconMinus /></button>
                    <span className="pos-qty-value pos-num">{i.qty}</span>
                    <button
                      className="pos-qty-btn"
                      onClick={() => changeQty(i.id, 1)}
                      disabled={i.qty >= i.stock}
                    >
                      <IconPlus />
                    </button>
                  </div>
                  <div className="pos-cart-item-price pos-num">
                    ${(getEffectivePrice(i) * i.qty).toFixed(2)}
                  </div>
                  <button className="pos-remove" onClick={() => removeItem(i.id)}><IconClose /></button>
                </div>
              ))}
            </div>
          )}

          <div className="pos-total-row">
            <span className="pos-total-label">Total a pagar</span>
            <span className={`pos-total-value ${bump ? 'pos-bump' : ''}`}>${total.toFixed(2)}</span>
          </div>

          <div className="pos-pay-methods">
            {Object.keys(paymentLabelsMap).map((key) => (
              <button
                key={key}
                className={`pos-pay-chip ${paymentMethod === key ? 'pos-pay-chip-active' : ''}`}
                onClick={() => {
                  setPaymentMethod(key)
                  if (key !== 'card' && key !== 'transfer') setCardBank('')
                  setMessage('')
                }}
              >
                {paymentLabelsMap[key]}
              </button>
            ))}
          </div>

          {(paymentMethod === 'card' || paymentMethod === 'transfer') && (
            <div className="pos-bank-row">
              <p className="pos-credit-label">Banco</p>
              <div className="pos-pay-methods pos-bank-methods">
                {cardBanks.map((bank) => (
                  <button
                    key={bank}
                    className={`pos-pay-chip ${cardBank === bank ? 'pos-pay-chip-active' : ''}`}
                    onClick={() => { setCardBank(bank); setMessage('') }}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pos-credit">
            <p className="pos-credit-label">Cliente (opcional, para ventas al crédito)</p>
            <input
              className="pos-input"
              placeholder="Nombre del cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <input
              className="pos-input"
              placeholder="Teléfono"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
            <input
              className="pos-input"
              type="number"
              step="0.01"
              placeholder={`Monto abonado (vacío = paga todo $${total.toFixed(2)})`}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>

          {message && <p className="pos-message">{message}</p>}

          <button
            className="pos-checkout-btn"
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

const POS_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .pos-root {
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

    position: relative;
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--body);
    padding: 22px 26px 40px;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }
  .pos-root * { box-sizing: border-box; }
  .pos-root button { font: inherit; }
  .pos-root button:focus-visible,
  .pos-root input:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .pos-num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .pos-muted { color: var(--ink-soft); }
  .pos-danger { color: var(--danger) !important; }
  .pos-success { color: var(--success) !important; }

  /* ---------- header ---------- */
  .pos-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 22px;
    gap: 12px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border);
  }
  .pos-brand-block { display: flex; align-items: center; gap: 13px; }
  .pos-monogram {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--display);
    font-weight: 600;
    font-size: 13px;
    color: var(--ink);
  }
  .pos-wordmark {
    font-family: var(--display);
    font-weight: 500;
    font-size: 19px;
    color: var(--ink);
    letter-spacing: 0.2px;
    line-height: 1.15;
  }
  .pos-subtitle {
    font-family: var(--body);
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 2.2px;
    color: var(--ink-soft);
    font-weight: 600;
    margin-top: 3px;
  }
  .pos-back {
    display: flex;
    align-items: center;
    gap: 7px;
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--ink);
    border-radius: 0;
    padding: 10px 16px;
    font-size: 12px;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition: background .15s, color .15s;
    flex-shrink: 0;
  }
  .pos-back:hover { background: var(--ink); color: #fff; }

  /* ---------- toolbar ---------- */
  .pos-toolbar {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 22px;
  }
  .pos-search-wrap {
    position: relative;
    max-width: 360px;
  }
  .pos-search-icon {
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-faint);
    display: flex;
  }
  .pos-search {
    width: 100%;
    background: transparent;
    color: var(--ink);
    border: none;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    padding: 9px 6px 9px 24px;
    font-family: var(--body);
    font-size: 13.5px;
    outline: none;
    transition: border-color .2s;
  }
  .pos-search::placeholder { color: var(--ink-faint); }
  .pos-search:focus { border-bottom-color: var(--ink); }
  .pos-chips {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
    border-bottom: 1px solid var(--border);
  }
  .pos-chips::-webkit-scrollbar { display: none; }
  .pos-chip {
    flex-shrink: 0;
    background: transparent;
    color: var(--ink-soft);
    border: none;
    border-bottom: 1.5px solid transparent;
    padding: 4px 0 9px;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    cursor: pointer;
    white-space: nowrap;
    transition: color .15s, border-color .15s;
  }
  .pos-chip:hover { color: var(--ink); }
  .pos-chip-active { color: var(--ink); border-bottom-color: var(--ink); }

  /* ---------- layout ---------- */
  .pos-layout { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
  .pos-products { flex: 2; min-width: 300px; }

  .pos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: 16px;
  }

  .pos-card {
    position: relative;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 0;
    text-align: left;
    cursor: pointer;
    color: var(--ink);
    font-family: var(--body);
    overflow: hidden;
    transition: border-color .15s, transform .12s;
  }
  .pos-card:hover { border-color: var(--ink); transform: translateY(-2px); }
  .pos-card:active { transform: translateY(0); }
  .pos-card-imgwrap {
    width: 100%;
    aspect-ratio: 1;
    background: var(--panel-raised);
    overflow: hidden;
  }
  .pos-card-img { width: 100%; height: 100%; object-fit: cover; }
  .pos-card-img-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--ink-faint);
  }
  .pos-card-body { padding: 11px 12px 12px; }
  .pos-card-name { font-weight: 600; font-size: 13px; line-height: 1.3; font-family: var(--display); }
  .pos-card-meta { color: var(--ink-soft); font-size: 10.5px; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.4px; }
  .pos-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 10px;
    padding-top: 9px;
    border-top: 1px solid var(--border);
  }
  .pos-card-price { color: var(--ink); font-weight: 700; font-size: 13px; }
  .pos-card-price-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
  .pos-card-price-strike { color: var(--ink-faint); font-size: 10px; text-decoration: line-through; }
  .pos-sale-badge {
    position: absolute; top: 0; left: 0; z-index: 1;
    background: var(--danger); color: #fff;
    font-family: var(--body); font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px;
    padding: 4px 9px;
  }
  .pos-lowstock-badge {
    position: absolute; top: 0; right: 0; z-index: 1;
    background: var(--ink); color: #fff;
    font-family: var(--mono); font-size: 9.5px; font-weight: 600;
    padding: 4px 9px;
  }
  .pos-cart-sale-tag {
    display: inline-block;
    margin-left: 6px;
    font-size: 9px;
    color: var(--danger);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid var(--danger);
    padding: 1px 5px;
  }
  .pos-card-stock { color: var(--ink-faint); font-size: 10px; font-family: var(--mono); }

  .pos-skeleton {
    aspect-ratio: 0.78;
    background: linear-gradient(90deg, var(--panel) 25%, var(--panel-raised) 50%, var(--panel) 75%);
    background-size: 200% 100%;
    animation: pos-pulse 1.4s ease-in-out infinite;
    border: 1px solid var(--border);
  }
  @keyframes pos-pulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .pos-empty {
    text-align: center;
    padding: 70px 20px;
    border: 1px dashed var(--border);
  }
  .pos-empty-icon { color: var(--ink-faint); margin-bottom: 12px; display: flex; justify-content: center; }

  /* ---------- cart ---------- */
  .pos-cart {
    flex: 1;
    min-width: 300px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 22px;
    position: sticky;
    top: 16px;
  }
  .pos-cart-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .pos-cart-title {
    margin: 0;
    color: var(--ink);
    font-family: var(--display);
    font-weight: 500;
    font-size: 20px;
  }
  .pos-cart-count {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .pos-cart-empty { padding: 26px 0; text-align: center; font-size: 13px; }
  .pos-cart-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; max-height: 320px; overflow-y: auto; }
  .pos-cart-item {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .pos-cart-item-info { flex: 1; min-width: 0; }
  .pos-cart-item-name { font-size: 13px; font-weight: 600; font-family: var(--display); }
  .pos-cart-item-meta { font-size: 10.5px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }
  .pos-qty { display: flex; align-items: center; border: 1px solid var(--border); }
  .pos-qty-btn {
    background: transparent;
    color: var(--ink);
    border: none;
    width: 24px;
    height: 24px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .pos-qty-btn:hover:not(:disabled) { background: var(--panel-raised); }
  .pos-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .pos-qty-value { min-width: 20px; text-align: center; font-size: 12.5px; }
  .pos-cart-item-price { font-size: 13px; min-width: 58px; text-align: right; }
  .pos-remove {
    background: transparent;
    color: var(--ink-soft);
    border: none;
    cursor: pointer;
    display: flex;
    padding: 2px;
  }
  .pos-remove:hover { color: var(--danger); }

  .pos-total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-top: 1px solid var(--border);
    padding-top: 16px;
    margin-bottom: 16px;
  }
  .pos-total-label {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    color: var(--ink-soft);
    font-weight: 600;
  }
  .pos-total-value {
    font-family: var(--display);
    font-weight: 600;
    color: var(--ink);
    font-size: 28px;
    display: inline-block;
    transition: transform .18s ease;
  }
  .pos-total-value.pos-bump { transform: scale(1.07); }

  .pos-pay-methods { display: flex; border: 1px solid var(--border); margin-bottom: 18px; }
  .pos-bank-row { margin-top: -10px; margin-bottom: 4px; animation: pos-receipt-rise .25s ease both; }
  .pos-bank-methods { margin-bottom: 18px; }
  .pos-pay-chip {
    flex: 1;
    background: transparent;
    color: var(--ink-soft);
    border: none;
    border-right: 1px solid var(--border);
    padding: 11px 4px;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    font-family: var(--body);
    cursor: pointer;
    transition: all .15s;
  }
  .pos-pay-chip:last-child { border-right: none; }
  .pos-pay-chip:hover { color: var(--ink); }
  .pos-pay-chip-active {
    background: var(--ink);
    color: #fff;
  }

  .pos-credit {
    border-top: 1px solid var(--border);
    padding-top: 16px;
    margin-bottom: 16px;
  }
  .pos-credit-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--ink-faint);
    font-weight: 700;
    margin: 0 0 12px;
  }
  .pos-input {
    width: 100%;
    background: transparent;
    color: var(--ink);
    border: none;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    padding: 9px 1px;
    margin-bottom: 12px;
    font-size: 13px;
    font-family: var(--body);
    outline: none;
    transition: border-color .2s;
  }
  .pos-input::placeholder { color: var(--ink-faint); }
  .pos-input:focus { border-bottom-color: var(--ink); }

  .pos-message { font-size: 12.5px; margin-bottom: 12px; color: var(--danger); }

  .pos-checkout-btn {
    width: 100%;
    background: var(--ink);
    color: #fff;
    border: 1px solid var(--ink);
    border-radius: 0;
    padding: 15px 0;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    font-family: var(--body);
    cursor: pointer;
    transition: opacity .15s;
  }
  .pos-checkout-btn:hover:not(:disabled) { opacity: 0.85; }
  .pos-checkout-btn:disabled { opacity: 0.32; cursor: not-allowed; }

  /* ---------- receipt (perforated ticket) ---------- */
  .pos-receipt-wrap { max-width: 380px; margin: 0 auto; position: relative; }
  .pos-receipt-wrap::before {
    content: 'VC';
    position: absolute;
    top: 70px; left: 50%;
    transform: translateX(-50%);
    font-family: var(--display);
    font-weight: 700;
    font-size: 190px;
    letter-spacing: -10px;
    color: var(--ink);
    opacity: 0.025;
    pointer-events: none;
    z-index: 0;
  }
  .pos-receipt-box, .pos-receipt-actions { position: relative; z-index: 1; }

  .pos-receipt-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
    animation: pos-receipt-pop .5s cubic-bezier(.34,1.56,.64,1) both;
  }
  .pos-receipt-success-icon {
    width: 50px; height: 50px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    background: var(--ink);
    box-shadow: 0 0 0 5px var(--bg), 0 0 0 6px var(--gold);
  }
  .pos-receipt-success-text {
    font-family: var(--display);
    font-style: italic;
    font-size: 13.5px;
    color: var(--ink-soft);
    margin: 0;
    letter-spacing: .3px;
  }
  @keyframes pos-receipt-pop {
    0% { opacity: 0; transform: scale(.6); }
    100% { opacity: 1; transform: scale(1); }
  }

  .pos-receipt-monogram {
    width: 38px;
    height: 38px;
    margin: 0 auto 12px;
    border-radius: 50%;
    border: 1px solid var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--display);
    font-weight: 600;
    font-size: 13px;
    box-shadow: 0 0 0 4px var(--bg), 0 0 0 5px var(--gold);
  }
  .pos-brand {
    font-family: var(--display);
    font-weight: 500;
    color: var(--ink);
    text-align: center;
    margin: 0;
    font-size: 21px;
  }
  .pos-receipt-tagline {
    text-align: center;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--ink-soft);
    margin: 5px 0 0;
    font-weight: 600;
  }
  .pos-receipt-tagline::after {
    content: '';
    display: block;
    width: 34px; height: 1px;
    background: var(--gold);
    margin: 12px auto 0;
  }
  .pos-receipt-ref {
    display: table;
    text-align: center;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 3px;
    color: var(--ink);
    margin: 18px auto 4px;
    padding: 7px 16px 16px;
    padding: 7px 16px;
    border: 1px solid var(--gold);
  }
  .pos-receipt-meta { margin: 16px 0 4px; }
  .pos-receipt-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--ink-soft);
    margin-bottom: 5px;
  }
  .pos-receipt-meta-row span:last-child { color: var(--ink); font-weight: 500; }
  .pos-receipt-box {
    position: relative;
    background: var(--panel);
    background-image: radial-gradient(var(--border) 0.5px, transparent 0.5px);
    background-size: 14px 14px;
    background-position: -7px -7px;
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 30px 24px 24px;
    margin: 10px 0;
    box-shadow: 0 1px 2px rgba(11,11,10,.04), 0 20px 44px -24px rgba(11,11,10,.4);
    animation: pos-receipt-rise .5s .08s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes pos-receipt-rise {
    0% { opacity: 0; transform: translateY(14px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .pos-receipt-box::before, .pos-receipt-box::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 9px;
    background-image: radial-gradient(circle at 9px 4.5px, var(--bg) 5.5px, transparent 6px);
    background-size: 18px 9px;
    background-repeat: repeat-x;
  }
  .pos-receipt-box::before { top: -4.5px; }
  .pos-receipt-box::after { bottom: -4.5px; transform: scaleY(-1); }
  .pos-receipt-divider { position: relative; border-top: 1px dashed var(--border); margin: 18px 0; }
  .pos-receipt-divider::after {
    content: '◆';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: var(--panel);
    color: var(--gold);
    font-size: 8px;
    padding: 0 9px;
  }
  .pos-receipt-cols-head {
    display: flex;
    justify-content: space-between;
    font-family: var(--mono);
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--ink-faint);
    margin-bottom: 10px;
  }
  .pos-receipt-item { margin-bottom: 10px; }
  .pos-receipt-item-top { display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 500; }
  .pos-receipt-item-name { padding-right: 10px; }
  .pos-receipt-sale-tag {
    display: inline-block;
    margin-left: 6px;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--danger);
    border: 1px solid var(--danger);
    padding: 1px 5px;
    vertical-align: middle;
  }
  .pos-receipt-item-sub {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-soft);
    margin-top: 2px;
  }
  .pos-receipt-item-strike {
    text-decoration: line-through;
    margin-left: 7px;
    opacity: 0.7;
  }
  .pos-receipt-line { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 7px; }
  .pos-receipt-total { font-weight: 700; font-size: 16px; }
  .pos-receipt-total span:last-child { color: var(--gold); }
  .pos-receipt-bold { font-weight: 700; }
  .pos-receipt-thanks {
    text-align: center;
    font-family: var(--display);
    font-style: italic;
    font-size: 19px;
    color: var(--ink);
    margin: 12px 0 4px;
  }
  .pos-receipt-footer-tag {
    text-align: center;
    font-size: 10.5px;
    color: var(--ink-soft);
    margin: 0;
  }
  .pos-receipt-actions { margin-top: 18px; display: flex; flex-direction: column; gap: 9px; }
  .pos-btn-primary {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: var(--ink);
    color: #fff;
    border: 1px solid var(--ink);
    border-radius: 0;
    padding: 14px 0;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    font-family: var(--body);
    cursor: pointer;
    transition: opacity .15s;
  }
  .pos-btn-primary:hover { opacity: 0.85; }
  .pos-btn-ghost {
    background: transparent;
    color: var(--ink-soft);
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 12px 0;
    font-size: 12px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    font-family: var(--body);
    cursor: pointer;
    transition: border-color .2s, color .2s;
  }
  .pos-btn-ghost:hover { border-color: var(--ink); color: var(--ink); }

  @media print {
    .pos-root { background: white; color: black; padding: 0; }
    .pos-receipt-actions { display: none; }
    .pos-receipt-success { display: none; }
    .pos-receipt-wrap::before { display: none; }
    .pos-receipt-box { border: none; box-shadow: none; animation: none; }
    .pos-receipt-box::before, .pos-receipt-box::after { display: none; }
  }

  @media (max-width: 640px) {
    .pos-root { padding: 16px 16px 32px; }
    .pos-header { flex-wrap: wrap; }
    .pos-cart { position: static; }
  }
`
