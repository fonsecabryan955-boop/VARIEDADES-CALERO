import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'

// Ajustá esto si en tu tabla "orders" el teléfono del cliente
// se guarda con otro nombre de columna.
const ORDER_PHONE_FIELD = 'customer_phone'

// Umbrales para calcular el nivel de lealtad automáticamente
// según el total histórico gastado (en córdobas).
const TIER_THRESHOLDS = { plata: 1000, oro: 3000 }

const normalizePhone = (phone) => (phone || '').replace(/\D/g, '')

const computeTierFromSpent = (spent) => {
  if (spent >= TIER_THRESHOLDS.oro) return 'Oro'
  if (spent >= TIER_THRESHOLDS.plata) return 'Plata'
  return 'Bronce'
}

const TIER_COLORS = {
  Bronce: '#8A5A3B',
  Plata: '#6B6B6B',
  Oro: '#B8912F',
}

export default function Clients({ onBack }) {
  const [clients, setClients] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [tierOverride, setTierOverride] = useState(false)
  const [formTier, setFormTier] = useState('Bronce')
  const [saving, setSaving] = useState(false)

  const [selectedClient, setSelectedClient] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')

    const { data: clientsData, error: clientsErr } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })

    if (clientsErr) {
      setError('Error al cargar clientes: ' + clientsErr.message)
      setLoading(false)
      return
    }

    const { data: ordersData, error: ordersErr } = await supabase
      .from('orders')
      .select(`id, client_id, ${ORDER_PHONE_FIELD}, total, created_at`)
      .order('created_at', { ascending: false })

    if (ordersErr) {
      setError('Error al cargar pedidos: ' + ordersErr.message)
      setLoading(false)
      return
    }

    setClients(clientsData || [])
    setOrders(ordersData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Índice de pedidos por client_id y por teléfono normalizado,
  // para poder relacionar pedidos viejos que no tienen client_id.
  const ordersByClientId = useMemo(() => {
    const map = {}
    orders.forEach((o) => {
      if (o.client_id) {
        if (!map[o.client_id]) map[o.client_id] = []
        map[o.client_id].push(o)
      }
    })
    return map
  }, [orders])

  const ordersByPhone = useMemo(() => {
    const map = {}
    orders.forEach((o) => {
      if (!o.client_id && o[ORDER_PHONE_FIELD]) {
        const key = normalizePhone(o[ORDER_PHONE_FIELD])
        if (!key) return
        if (!map[key]) map[key] = []
        map[key].push(o)
      }
    })
    return map
  }, [orders])

  const getClientOrders = (client) => {
    const byId = ordersByClientId[client.id] || []
    const byPhone = ordersByPhone[normalizePhone(client.phone)] || []
    return [...byId, ...byPhone].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
  }

  const getClientStats = (client) => {
    const clientOrders = getClientOrders(client)
    const totalSpent = clientOrders.reduce((s, o) => s + Number(o.total || 0), 0)
    return {
      orders: clientOrders,
      orderCount: clientOrders.length,
      totalSpent,
      lastOrder: clientOrders[0] || null,
      autoTier: computeTierFromSpent(totalSpent),
    }
  }

  const displayTier = (client, stats) =>
    client.tier_override ? client.loyalty_tier : stats.autoTier

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qDigits = normalizePhone(search)
    if (!q) return clients
    return clients.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(q)
      const phoneMatch = qDigits && normalizePhone(c.phone).includes(qDigits)
      return nameMatch || phoneMatch
    })
  }, [clients, search])

  const openNewForm = () => {
    setEditingClient(null)
    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormAddress('')
    setFormNotes('')
    setTierOverride(false)
    setFormTier('Bronce')
    setError('')
    setShowForm(true)
  }

  const openEditForm = (client) => {
    setEditingClient(client)
    setFormName(client.name || '')
    setFormPhone(client.phone || '')
    setFormEmail(client.email || '')
    setFormAddress(client.address || '')
    setFormNotes(client.notes || '')
    setTierOverride(!!client.tier_override)
    setFormTier(client.loyalty_tier || 'Bronce')
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      setError('Nombre y teléfono son obligatorios')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || null,
      address: formAddress.trim() || null,
      notes: formNotes.trim() || null,
      tier_override: tierOverride,
      loyalty_tier: tierOverride ? formTier : computeTierFromSpent(0),
    }

    // Si es edición y no hay override, conservamos el nivel automático actual
    if (editingClient && !tierOverride) {
      const stats = getClientStats(editingClient)
      payload.loyalty_tier = stats.autoTier
    }

    let err
    if (editingClient) {
      ;({ error: err } = await supabase.from('clients').update(payload).eq('id', editingClient.id))
    } else {
      ;({ error: err } = await supabase.from('clients').insert(payload))
    }

    if (err) {
      setError(
        err.code === '23505'
          ? 'Ya existe un cliente con ese teléfono'
          : 'Error al guardar: ' + err.message
      )
      setSaving(false)
      return
    }

    setSaving(false)
    setShowForm(false)
    loadData()
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeleting(true)
    const { error: err } = await supabase.from('clients').delete().eq('id', confirmDeleteId)
    if (err) {
      setError('Error al eliminar cliente: ' + err.message)
      setDeleting(false)
      setConfirmDeleteId(null)
      return
    }
    setDeleting(false)
    setConfirmDeleteId(null)
    if (selectedClient?.id === confirmDeleteId) setSelectedClient(null)
    loadData()
  }

  const handleExportCSV = () => {
    const rows = [
      ['Nombre', 'Teléfono', 'Email', 'Dirección', 'Nivel', 'Pedidos', 'Total gastado'],
    ]
    filteredClients.forEach((c) => {
      const stats = getClientStats(c)
      rows.push([
        c.name,
        c.phone,
        c.email || '',
        c.address || '',
        displayTier(c, stats),
        stats.orderCount,
        stats.totalSpent.toFixed(2),
      ])
    })
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Cargando...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Volver</button>
        <h2 style={styles.title}>Clientes</h2>
        <button style={styles.primaryBtn} onClick={openNewForm}>+ Nuevo cliente</button>
      </div>

      <div style={styles.toolbar}>
        <input
          style={styles.searchInput}
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={styles.secondaryBtn} onClick={handleExportCSV}>
          Exportar CSV
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.list}>
        {filteredClients.length === 0 && (
          <p style={styles.muted}>No se encontraron clientes.</p>
        )}
        {filteredClients.map((client) => {
          const stats = getClientStats(client)
          const tier = displayTier(client, stats)
          return (
            <div key={client.id} style={styles.row}>
              <div style={styles.rowMain} onClick={() => setSelectedClient(client)}>
                <div style={styles.rowNameLine}>
                  <span style={styles.rowName}>{client.name}</span>
                  <span style={{ ...styles.tierBadge, borderColor: TIER_COLORS[tier], color: TIER_COLORS[tier] }}>
                    {tier}
                  </span>
                </div>
                <div style={styles.rowSub}>
                  {client.phone} · {stats.orderCount} pedido{stats.orderCount === 1 ? '' : 's'} · ${stats.totalSpent.toFixed(2)}
                </div>
              </div>
              <div style={styles.rowActions}>
                <button style={styles.linkBtn} onClick={() => setSelectedClient(client)}>Historial</button>
                <button style={styles.linkBtn} onClick={() => openEditForm(client)}>Editar</button>
                <button style={styles.linkBtnDanger} onClick={() => setConfirmDeleteId(client.id)}>Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Panel de historial */}
      {selectedClient && (
        <div style={styles.overlay} onClick={() => setSelectedClient(null)}>
          <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const stats = getClientStats(selectedClient)
              const tier = displayTier(selectedClient, stats)
              return (
                <>
                  <div style={styles.panelHeader}>
                    <div>
                      <h3 style={styles.panelTitle}>{selectedClient.name}</h3>
                      <p style={styles.muted}>{selectedClient.phone}</p>
                    </div>
                    <button style={styles.closeBtn} onClick={() => setSelectedClient(null)}>✕</button>
                  </div>

                  <div style={styles.statsGrid}>
                    <div style={styles.statBox}>
                      <div style={styles.muted}>Nivel</div>
                      <div style={{ color: TIER_COLORS[tier], fontFamily: "'IBM Plex Mono', monospace" }}>{tier}</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.muted}>Pedidos</div>
                      <div style={styles.statNum}>{stats.orderCount}</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.muted}>Total gastado</div>
                      <div style={styles.statNum}>${stats.totalSpent.toFixed(2)}</div>
                    </div>
                  </div>

                  {(selectedClient.email || selectedClient.address || selectedClient.notes) && (
                    <div style={styles.infoBlock}>
                      {selectedClient.email && <p style={styles.infoLine}><b>Email:</b> {selectedClient.email}</p>}
                      {selectedClient.address && <p style={styles.infoLine}><b>Dirección:</b> {selectedClient.address}</p>}
                      {selectedClient.notes && <p style={styles.infoLine}><b>Notas:</b> {selectedClient.notes}</p>}
                    </div>
                  )}

                  <h4 style={styles.historyTitle}>Historial de compras</h4>
                  {stats.orders.length === 0 ? (
                    <p style={styles.muted}>Este cliente aún no tiene pedidos registrados.</p>
                  ) : (
                    <div style={styles.historyList}>
                      {stats.orders.map((o) => (
                        <div key={o.id} style={styles.historyRow}>
                          <span>{new Date(o.created_at).toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>${Number(o.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Formulario nuevo/editar */}
      {showForm && (
        <div style={styles.overlay} onClick={() => setShowForm(false)}>
          <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>{editingClient ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button style={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <input style={styles.input} placeholder="Nombre completo" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <input style={styles.input} placeholder="Teléfono" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            <input style={styles.input} placeholder="Email (opcional)" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            <input style={styles.input} placeholder="Dirección (opcional)" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} placeholder="Notas (opcional)" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />

            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={tierOverride} onChange={(e) => setTierOverride(e.target.checked)} />
              Fijar nivel de lealtad manualmente
            </label>

            {tierOverride && (
              <select style={styles.input} value={formTier} onChange={(e) => setFormTier(e.target.value)}>
                <option value="Bronce">Bronce</option>
                <option value="Plata">Plata</option>
                <option value="Oro">Oro</option>
              </select>
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button style={styles.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmación de borrado (custom, no window.confirm) */}
      {confirmDeleteId && (
        <div style={styles.overlay} onClick={() => !deleting && setConfirmDeleteId(null)}>
          <div style={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <p style={styles.confirmText}>¿Eliminar este cliente? Esta acción no se puede deshacer.</p>
            <div style={styles.confirmActions}>
              <button style={styles.secondaryBtn} onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
                Cancelar
              </button>
              <button style={styles.dangerBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#FFFFFF',
    color: '#111111',
    fontFamily: "'Inter', sans-serif",
    padding: 24,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  title: {
    fontFamily: "'Bodoni Moda', serif",
    fontWeight: 500,
    fontSize: 24,
    margin: 0,
    letterSpacing: '0.5px',
  },
  backBtn: {
    background: 'transparent',
    color: '#111111',
    border: '1px solid #111111',
    borderRadius: 0,
    padding: '8px 14px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
  },
  toolbar: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: 220,
    border: '1px solid #111111',
    borderRadius: 0,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
  },
  muted: { color: '#767676', fontSize: 13 },
  error: { color: '#B5574A', fontSize: 13, marginBottom: 10 },
  list: { display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 760 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #E5E5E5',
    padding: '14px 4px',
    gap: 12,
    flexWrap: 'wrap',
  },
  rowMain: { cursor: 'pointer', flex: 1, minWidth: 200 },
  rowNameLine: { display: 'flex', alignItems: 'center', gap: 10 },
  rowName: { fontSize: 15, fontWeight: 600 },
  tierBadge: {
    fontSize: 10,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    border: '1px solid',
    borderRadius: 0,
    padding: '2px 8px',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  rowSub: { fontSize: 12, color: '#767676', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" },
  rowActions: { display: 'flex', gap: 14 },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#111111',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    fontFamily: "'Inter', sans-serif",
  },
  linkBtnDanger: {
    background: 'transparent',
    border: 'none',
    color: '#B5574A',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    fontFamily: "'Inter', sans-serif",
  },
  primaryBtn: {
    background: '#111111',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 0,
    padding: '10px 20px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
  },
  secondaryBtn: {
    background: 'transparent',
    color: '#111111',
    border: '1px solid #111111',
    borderRadius: 0,
    padding: '10px 16px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
  },
  dangerBtn: {
    background: '#B5574A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 0,
    padding: '10px 20px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  panel: {
    background: '#FFFFFF',
    width: '100%',
    maxWidth: 480,
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: 28,
    borderRadius: 0,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  panelTitle: {
    fontFamily: "'Bodoni Moda', serif",
    fontSize: 20,
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#111111',
  },
  input: {
    width: '100%',
    border: '1px solid #111111',
    borderRadius: 0,
    padding: '10px 12px',
    marginBottom: 10,
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 18,
    borderTop: '1px solid #E5E5E5',
    borderBottom: '1px solid #E5E5E5',
    padding: '14px 0',
  },
  statBox: { fontSize: 13 },
  statNum: { fontSize: 16, fontFamily: "'IBM Plex Mono', monospace" },
  infoBlock: { marginBottom: 18 },
  infoLine: { fontSize: 13, margin: '4px 0' },
  historyTitle: { fontFamily: "'Bodoni Moda', serif", fontSize: 15, marginBottom: 8 },
  historyList: { display: 'flex', flexDirection: 'column', gap: 0 },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    padding: '8px 0',
    borderBottom: '1px solid #E5E5E5',
  },
  confirmBox: {
    background: '#FFFFFF',
    padding: 24,
    maxWidth: 360,
    width: '100%',
    borderRadius: 0,
  },
  confirmText: { fontSize: 14, marginBottom: 20 },
  confirmActions: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
}
