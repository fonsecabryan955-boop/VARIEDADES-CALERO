import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Store() {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [step, setStep] = useState('catalog') // catalog | checkout | confirmed
  const [accounts, setAccounts] = useState([])

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('product_variants')
        .select('id, size, color, stock, price, products(name, base_price, image_url)')
        .gt('stock', 0)
        .order('created_at', { ascending: false })
      setVariants(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const addToCart = (variant) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === variant.id)
      if (existing) {
        if (existing.qty >= variant.stock) return prev
        return prev.map((i) => (i.id === variant.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...variant, qty: 1 }]
    })
  }

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0)
    )
  }

  const total = cart.reduce((sum, i) => sum + (i.price ?? i.products?.base_price ?? 0) * i.qty, 0)

  const goToCheckout = async () => {
    const { data } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('active', true)
    setAccounts(data || [])
    setStep('checkout')
  }

  const handleSubmitOrder = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      setError('Nombre y teléfono son obligatorios')
      return
    }
    setSubmitting(true)
    setError('')

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({ name: clientName.trim(), phone: clientPhone.trim(), address: clientAddress.trim() || null })
      .select('id')
      .single()

    if (clientErr) {
      setError('Error al guardar tus datos: ' + clientErr.message)
      setSubmitting(false)
      return
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_type: 'online',
        client_id: client.id,
        status: 'pending',
        payment_status: 'unpaid',
        payment_method: 'transfer',
        subtotal: total,
        discount: 0,
        total,
        notes: notes.trim() || null,
      })
      .select('id')
      .single()

    if (orderErr) {
      setError('Error al crear el pedido: ' + orderErr.message)
      setSubmitting(false)
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
      setError('Error al guardar los artículos: ' + itemsErr.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setStep('confirmed')
  }

  if (step === 'confirmed') {
    return (
      <div style={styles.page}>
        <div style={styles.confirmBox}>
          <h1 style={styles.brand}>VARIEDADES CALERO</h1>
          <div style={styles.checkmark}>✅</div>
          <h2 style={{ color: '#f5f5f5' }}>¡Pedido recibido!</h2>
          <p style={styles.muted}>
            Gracias {clientName.split(' ')[0]}, tu pedido por <b style={{ color: '#d4af37' }}>${total.toFixed(2)}</b> fue registrado.
          </p>
          <div style={styles.payBox}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Para confirmar tu compra, transferí a:</p>
            {accounts.map((a) => (
              <div key={a.id} style={styles.accountCard}>
                <div><b>{a.bank}</b> ({a.currency})</div>
                <div>Cuenta: {a.account_number}</div>
                <div>Titular: {a.account_holder}</div>
              </div>
            ))}
            <p style={styles.muted}>
              Una vez realizada la transferencia, enviá el comprobante por WhatsApp para confirmar tu pedido.
            </p>
          </div>
          <button style={styles.primaryBtn} onClick={() => window.location.reload()}>
            Volver a la tienda
          </button>
        </div>
      </div>
    )
  }

  if (step === 'checkout') {
    return (
      <div style={styles.page}>
        <div style={styles.checkoutBox}>
          <h2 style={styles.brand}>Datos de entrega</h2>
          <input style={styles.input} placeholder="Nombre completo *" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <input style={styles.input} placeholder="Teléfono / WhatsApp *" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          <input style={styles.input} placeholder="Dirección de entrega" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
          <textarea style={{ ...styles.input, minHeight: 70 }} placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div style={styles.summaryBox}>
            {cart.map((i) => (
              <div key={i.id} style={styles.summaryRow}>
                <span>{i.products?.name} x{i.qty}</span>
                <span>${((i.price ?? i.products?.base_price ?? 0) * i.qty).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ ...styles.summaryRow, fontWeight: 'bold', borderTop: '1px solid #333', paddingTop: 8, marginTop: 8 }}>
              <span>Total</span>
              <span style={{ color: '#d4af37' }}>${total.toFixed(2)}</span>
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.primaryBtn} onClick={handleSubmitOrder} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Confirmar pedido'}
          </button>
          <button style={styles.linkBtn} onClick={() => setStep('catalog')}>
            ← Volver al catálogo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.brand}>VARIEDADES CALERO</h1>
        <p style={styles.muted}>Tienda online</p>
      </div>

      <div style={styles.layout}>
        <div style={{ flex: 2, minWidth: 280 }}>
          {loading ? (
            <p style={styles.muted}>Cargando catálogo...</p>
          ) : variants.length === 0 ? (
            <p style={styles.muted}>No hay productos disponibles por ahora.</p>
          ) : (
            <div style={styles.grid}>
              {variants.map((v) => (
                <div key={v.id} style={styles.productCard}>
                  <div style={styles.productName}>{v.products?.name}</div>
                  <div style={styles.productMeta}>
                    {v.size ? `Talla ${v.size}` : ''} {v.color || ''}
                  </div>
                  <div style={styles.productPrice}>${Number(v.price ?? v.products?.base_price).toFixed(2)}</div>
                  <button style={styles.addBtn} onClick={() => addToCart(v)}>
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.cartPanel}>
          <h3 style={{ marginTop: 0, color: '#d4af37' }}>Tu pedido</h3>
          {cart.length === 0 ? (
            <p style={styles.muted}>Agregá productos del catálogo.</p>
          ) : (
            <>
              {cart.map((i) => (
                <div key={i.id} style={styles.cartRow}>
                  <span style={{ flex: 1, fontSize: 13 }}>{i.products?.name}</span>
                  <button style={styles.qtyBtn} onClick={() => changeQty(i.id, -1)}>-</button>
                  <span style={{ minWidth: 16, textAlign: 'center' }}>{i.qty}</span>
                  <button style={styles.qtyBtn} onClick={() => changeQty(i.id, 1)} disabled={i.qty >= i.stock}>+</button>
                </div>
              ))}
              <div style={{ ...styles.cartRow, fontWeight: 'bold', borderTop: '1px solid #333', paddingTop: 8 }}>
                <span>Total</span>
                <span style={{ color: '#d4af37' }}>${total.toFixed(2)}</span>
              </div>
              <button style={styles.primaryBtn} onClick={goToCheckout}>
                Continuar pedido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#f5f5f5',
    fontFamily: 'system-ui, sans-serif',
    padding: 24,
  },
  header: { marginBottom: 20, textAlign: 'center' },
  brand: { color: '#d4af37', letterSpacing: 1, margin: 0 },
  muted: { color: '#999', fontSize: 14 },
  layout: { display: 'flex', gap: 20, flexWrap: 'wrap' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 14,
  },
  productCard: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  productName: { fontWeight: 'bold', fontSize: 14 },
  productMeta: { color: '#999', fontSize: 12, marginTop: 2 },
  productPrice: { color: '#d4af37', fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  addBtn: {
    width: '100%',
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '8px 0',
    cursor: 'pointer',
  },
  cartPanel: {
    flex: 1,
    minWidth: 240,
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 18,
    alignSelf: 'flex-start',
  },
  cartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  qtyBtn: {
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 6,
    width: 22,
    height: 22,
    cursor: 'pointer',
  },
  primaryBtn: {
    width: '100%',
    background: '#d4af37',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: 8,
    padding: '12px 0',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 10,
  },
  linkBtn: {
    width: '100%',
    background: 'transparent',
    color: '#999',
    border: 'none',
    padding: '10px 0',
    cursor: 'pointer',
    fontSize: 13,
  },
  checkoutBox: {
    maxWidth: 420,
    margin: '0 auto',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 24,
  },
  input: {
    width: '100%',
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 10,
    fontSize: 14,
    boxSizing: 'border-box',
  },
  summaryBox: {
    background: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    marginBottom: 4,
  },
  error: { color: '#ff6b6b', fontSize: 13, marginBottom: 10 },
  confirmBox: {
    maxWidth: 420,
    margin: '0 auto',
    textAlign: 'center',
  },
  checkmark: { fontSize: 40, margin: '16px 0' },
  payBox: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 18,
    marginTop: 20,
    textAlign: 'left',
  },
  accountCard: {
    background: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.6,
  },
}
