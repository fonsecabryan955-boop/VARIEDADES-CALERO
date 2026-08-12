import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function POS({ user, onBack }) {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const loadVariants = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('product_variants')
      .select('id, size, color, stock, price, products(name, base_price, image_url)')
      .gt('stock', 0)
      .order('created_at', { ascending: false })
    setVariants(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadVariants()
  }, [])

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

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_type: 'in_store',
        status: 'delivered',
        payment_status: 'paid',
        payment_method: paymentMethod,
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

    setMessage('✅ Venta registrada correctamente')
    setCart([])
    setPaymentMethod('cash')
    setCheckingOut(false)
    loadVariants()
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          ← Volver
        </button>
        <h2 style={styles.title}>Punto de venta</h2>
        <div style={{ width: 90 }} />
      </div>

      <div style={styles.layout}>
        <div style={styles.productsPanel}>
          {loading ? (
            <p style={styles.muted}>Cargando productos...</p>
          ) : variants.length === 0 ? (
            <p style={styles.muted}>No hay productos con stock disponible.</p>
          ) : (
            <div style={styles.grid}>
              {variants.map((v) => (
                <button
                  key={v.id}
                  style={styles.productBtn}
                  onClick={() => addToCart(v)}
                >
                  {v.products?.image_url ? (
                    <img src={v.products.image_url} alt="" style={styles.productImage} />
                  ) : (
                    <div style={styles.productImagePlaceholder}>📦</div>
                  )}
                  <div style={styles.productName}>{v.products?.name}</div>
                  <div style={styles.productMeta}>
                    {v.size ? `Talla ${v.size}` : ''} {v.color || ''}
                  </div>
                  <div style={styles.productPrice}>
                    ${Number(v.price ?? v.products?.base_price).toFixed(2)}
                  </div>
                  <div style={styles.productStock}>Stock: {v.stock}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={styles.cartPanel}>
          <h3 style={styles.cartTitle}>Carrito</h3>
          {cart.length === 0 ? (
            <p style={styles.muted}>Vacío. Tocá un producto para agregarlo.</p>
          ) : (
            <div style={styles.cartList}>
              {cart.map((i) => (
                <div key={i.id} style={styles.cartItem}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.cartItemName}>{i.products?.name}</div>
                    <div style={styles.cartItemMeta}>
                      {i.size ? `Talla ${i.size}` : ''} {i.color || ''}
                    </div>
                  </div>
                  <div style={styles.qtyControls}>
                    <button style={styles.qtyBtn} onClick={() => changeQty(i.id, -1)}>
                      -
                    </button>
                    <span style={styles.qtyValue}>{i.qty}</span>
                    <button
                      style={styles.qtyBtn}
                      onClick={() => changeQty(i.id, 1)}
                      disabled={i.qty >= i.stock}
                    >
                      +
                    </button>
                  </div>
                  <div style={styles.cartItemPrice}>
                    ${((i.price ?? i.products?.base_price ?? 0) * i.qty).toFixed(2)}
                  </div>
                  <button style={styles.removeBtn} onClick={() => removeItem(i.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.totalRow}>
            <span>Total</span>
            <span style={styles.totalValue}>${total.toFixed(2)}</span>
          </div>

          <div style={styles.paymentMethods}>
            <button
              style={paymentMethod === 'cash' ? styles.paymentBtnActive : styles.paymentBtn}
              onClick={() => setPaymentMethod('cash')}
            >
              💵 Efectivo
            </button>
            <button
              style={paymentMethod === 'card' ? styles.paymentBtnActive : styles.paymentBtn}
              onClick={() => setPaymentMethod('card')}
            >
              💳 Tarjeta
            </button>
            <button
              style={paymentMethod === 'transfer' ? styles.paymentBtnActive : styles.paymentBtn}
              onClick={() => setPaymentMethod('transfer')}
            >
              🏦 Transferencia
            </button>
          </div>

          {message && <p style={styles.message}>{message}</p>}

          <button
            style={styles.checkoutBtn}
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkingOut}
          >
            {checkingOut ? 'Procesando...' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#f5f5f5',
    fontFamily: 'system-ui, sans-serif',
    padding: 24,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    background: 'transparent',
    color: '#999',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  title: {
    color: '#d4af37',
    margin: 0,
    fontSize: 20,
  },
  layout: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
  },
  productsPanel: {
    flex: 2,
    minWidth: 280,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  },
  productBtn: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    padding: 14,
    textAlign: 'left',
    cursor: 'pointer',
    color: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: 80,
    objectFit: 'cover',
    borderRadius: 6,
    marginBottom: 8,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 80,
    background: '#242424',
    borderRadius: 6,
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  productMeta: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  productPrice: {
    color: '#d4af37',
    fontWeight: 'bold',
    marginTop: 8,
  },
  productStock: {
    color: '#7fd88f',
    fontSize: 11,
    marginTop: 4,
  },
  cartPanel: {
    flex: 1,
    minWidth: 260,
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 18,
    alignSelf: 'flex-start',
  },
  cartTitle: {
    marginTop: 0,
    color: '#d4af37',
  },
  cartList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid #2a2a2a',
    paddingBottom: 10,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cartItemMeta: {
    fontSize: 11,
    color: '#999',
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 6,
    width: 24,
    height: 24,
    cursor: 'pointer',
  },
  qtyValue: {
    minWidth: 16,
    textAlign: 'center',
    fontSize: 13,
  },
  cartItemPrice: {
    fontSize: 13,
    minWidth: 50,
    textAlign: 'right',
  },
  removeBtn: {
    background: 'transparent',
    color: '#ff6b6b',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 16,
    fontWeight: 'bold',
    borderTop: '1px solid #2a2a2a',
    paddingTop: 12,
    marginBottom: 12,
  },
  totalValue: {
    color: '#d4af37',
  },
  paymentMethods: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
  },
  paymentBtn: {
    flex: 1,
    background: '#242424',
    color: '#ccc',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '8px 4px',
    fontSize: 11,
    cursor: 'pointer',
  },
  paymentBtnActive: {
    flex: 1,
    background: '#d4af37',
    color: '#0f0f0f',
    border: '1px solid #d4af37',
    borderRadius: 8,
    padding: '8px 4px',
    fontSize: 11,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  checkoutBtn: {
    width: '100%',
    background: '#d4af37',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: 8,
    padding: '12px 0',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  message: {
    fontSize: 13,
    marginBottom: 10,
    color: '#7fd88f',
  },
  muted: {
    color: '#777',
  },
}
