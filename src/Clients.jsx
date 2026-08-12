import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const TIERS = [
  { name: 'Oro', min: 150, color: '#d4af37', icon: '🥇' },
  { name: 'Plata', min: 50, color: '#c0c0c0', icon: '🥈' },
  { name: 'Bronce', min: 0, color: '#cd7f32', icon: '🥉' },
]

function getTier(totalSpent) {
  return TIERS.find((t) => totalSpent >= t.min)
}

export default function Clients({ onBack }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  const loadClients = async () => {
    setLoading(true)
    const { data: clientRows } = await supabase.from('clients').select('*')

    const { data: orderRows } = await supabase
      .from('orders')
      .select('client_id, total, status, created_at, order_type')
      .neq('status', 'cancelled')
      .not('client_id', 'is', null)

    const merged = (clientRows || []).map((c) => {
      const clientOrders = (orderRows || []).filter((o) => o.client_id === c.id)
      const totalSpent = clientOrders.reduce((s, o) => s + Number(o.total), 0)
      const lastOrder = clientOrders.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )[0]
      return {
        ...c,
        orderCount: clientOrders.length,
        totalSpent,
        lastOrderDate: lastOrder?.created_at || null,
        orders: clientOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      }
    })

    merged.sort((a, b) => b.totalSpent - a.totalSpent)
    setClients(merged)
    setLoading(false)
  }

  useEffect(() => {
    loadClients()
  }, [])

  const filtered = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Volver</button>
        <h2 style={styles.title}>Clientes</h2>
        <div style={{ width: 90 }} />
      </div>

      <input
        style={styles.search}
        placeholder="Buscar por nombre o teléfono..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p style={styles.muted}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <p style={styles.muted}>No hay clientes todavía. Se registran automáticamente al vender a crédito o al recibir pedidos online.</p>
      ) : (
        <div style={styles.list}>
          {filtered.map((c) => {
            const tier = getTier(c.totalSpent)
            return (
              <div key={c.id} style={styles.card}>
                <div
                  style={styles.cardHeader}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <div style={styles.clientInfo}>
                    <div style={styles.clientName}>
                      {c.name} <span style={{ ...styles.tierBadge, color: tier.color, borderColor: tier.color }}>{tier.icon} {tier.name}</span>
                    </div>
                    <div style={styles.muted}>
                      {c.phone} {c.address ? `· ${c.address}` : ''}
                    </div>
                    <div style={styles.muted}>
                      {c.orderCount} compra{c.orderCount !== 1 ? 's' : ''}
                      {c.lastOrderDate ? ` · Última: ${new Date(c.lastOrderDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div style={styles.spent}>${c.totalSpent.toFixed(2)}</div>
                </div>

                {expanded === c.id && (
                  <div style={styles.ordersList}>
                    {c.orders.length === 0 ? (
                      <p style={styles.muted}>Sin compras registradas.</p>
                    ) : (
                      c.orders.map((o, idx) => (
                        <div key={idx} style={styles.orderRow}>
                          <span>
                            {new Date(o.created_at).toLocaleDateString()} · {o.order_type === 'online' ? '🌐 Online' : '🛒 Tienda'}
                          </span>
                          <span>${Number(o.total).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
  search: {
    width: '100%',
    background: '#1a1a1a',
    color: '#f5f5f5',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 20,
    fontSize: 14,
    boxSizing: 'border-box',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    cursor: 'pointer',
    gap: 10,
  },
  clientInfo: { flex: 1 },
  clientName: { fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tierBadge: {
    fontSize: 11,
    border: '1px solid',
    borderRadius: 20,
    padding: '2px 8px',
  },
  spent: { color: '#d4af37', fontWeight: 'bold', fontSize: 16 },
  ordersList: {
    borderTop: '1px solid #2a2a2a',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  orderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    background: '#0f0f0f',
    borderRadius: 8,
    padding: '8px 12px',
  },
}
