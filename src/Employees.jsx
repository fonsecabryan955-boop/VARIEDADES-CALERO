import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'

// ---------- date helpers ----------
const toISODate = (d) => d.toISOString().slice(0, 10)
const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
// Default current quincena: 1-15 or 16-end of month
const currentQuincena = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (now.getDate() <= 15) {
    return { start: toISODate(new Date(y, m, 1)), end: toISODate(new Date(y, m, 15)) }
  }
  const lastDay = new Date(y, m + 1, 0)
  return { start: toISODate(new Date(y, m, 16)), end: toISODate(lastDay) }
}

function GlobalStyle() {
  return (
    <style>{`
      .em-page {
        min-height: 100vh;
        background: #F2EBDB;
        color: #2E2618;
        font-family: system-ui, sans-serif;
        padding: 24px;
      }
      .em-page * { box-sizing: border-box; }
      .em-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 22px; flex-wrap: wrap; gap: 12px;
      }
      .em-back {
        background: transparent; color: #8A7A56; border: 1px solid #C7B689;
        border-radius: 8px; padding: 8px 14px; cursor: pointer;
      }
      .em-title { color: #3B2E1F; margin: 0; font-size: 20px; }
      .em-tabs { display: flex; gap: 8px; margin-bottom: 22px; flex-wrap: wrap; }
      .em-tab {
        background: transparent; border: 1px solid #C7B689; color: #8A7A56;
        padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 13.5px;
      }
      .em-tab.active { background: #3B2E1F; border-color: #3B2E1F; color: #F2EBDB; font-weight: 700; }
      .em-add-btn {
        background: #3B2E1F; color: #F2EBDB; border: none; border-radius: 8px;
        padding: 10px 16px; font-weight: bold; cursor: pointer;
      }
      .em-form {
        background: #FBF8F0; border: 1px solid #DACC9E; border-radius: 12px;
        padding: 20px; margin-bottom: 22px;
      }
      .em-form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
      .em-input {
        flex: 1; min-width: 140px; background: #EAE0C7; color: #2E2618;
        border: 1px solid #C7B689; border-radius: 8px; padding: 10px 12px; font-size: 14px;
      }
      .em-input::placeholder { color: #6b6b6b; }
      .em-label { display: block; font-size: 11.5px; color: #8A7A56; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.4px; }
      .em-save-btn {
        background: #3B2E1F; color: #F2EBDB; border: none; border-radius: 8px;
        padding: 10px 20px; font-weight: bold; cursor: pointer;
      }
      .em-error { color: #B5574A; font-size: 13px; margin-bottom: 12px; }
      .em-muted { color: #8A7A56; }

      .em-list { display: flex; flex-direction: column; gap: 10px; }
      .em-card {
        background: #FBF8F0; border: 1px solid #DACC9E; border-radius: 10px;
        padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
      }
      .em-card-name { font-weight: bold; font-size: 15px; }
      .em-card-meta { color: #8A7A56; font-size: 13px; margin-top: 2px; }
      .em-card-right { display: flex; align-items: center; gap: 12px; }
      .em-salary { color: #3B2E1F; font-weight: bold; }
      .em-status { font-size: 11.5px; padding: 3px 9px; border-radius: 999px; }
      .em-status.active { background: rgba(111,174,116,0.15); color: #4C7A52; }
      .em-status.inactive { background: rgba(255,107,107,0.12); color: #B5574A; }
      .em-icon-btn {
        background: #EAE0C7; border: 1px solid #C7B689; color: #2E2618;
        border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 12.5px;
      }
      .em-icon-btn:hover { border-color: #3B2E1F; }
      .em-delete-btn { color: #B5574A; border-color: #D9B9AE; }
      .em-delete-btn:hover { border-color: #B5574A; }

      .em-period-bar {
        display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;
        background: #FBF8F0; border: 1px solid #DACC9E; border-radius: 12px; padding: 16px; margin-bottom: 20px;
      }
      .em-period-field { display: flex; flex-direction: column; gap: 5px; }
      .em-period-field input {
        background: #EAE0C7; color: #2E2618; border: 1px solid #C7B689; border-radius: 8px; padding: 9px 10px; font-size: 13.5px;
      }

      .em-payroll-row {
        background: #FBF8F0; border: 1px solid #DACC9E; border-radius: 10px;
        padding: 14px 16px; margin-bottom: 10px;
      }
      .em-payroll-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
      .em-payroll-name { font-weight: bold; font-size: 15px; }
      .em-payroll-fields { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
      .em-mini-field { display: flex; flex-direction: column; gap: 4px; }
      .em-mini-field label { font-size: 10.5px; color: #8A7A56; text-transform: uppercase; }
      .em-mini-field input {
        width: 110px; background: #EAE0C7; color: #2E2618; border: 1px solid #C7B689;
        border-radius: 7px; padding: 7px 9px; font-size: 13px;
      }
      .em-net { color: #3B2E1F; font-weight: bold; font-size: 16px; }
      .em-pay-btn {
        background: #3B2E1F; color: #F2EBDB; border: none; border-radius: 8px;
        padding: 9px 16px; font-weight: bold; cursor: pointer; font-size: 13px;
      }
      .em-paid-tag {
        background: rgba(111,174,116,0.15); color: #4C7A52; font-size: 12px;
        padding: 6px 12px; border-radius: 8px; font-weight: 600;
      }

      .em-history-row {
        background: #FBF8F0; border: 1px solid #DACC9E; border-radius: 10px;
        padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;
      }
      .em-history-meta { color: #8A7A56; font-size: 12.5px; }

      /* ---- receipt (58mm print) ---- */
      .em-receipt-wrap { display: flex; flex-direction: column; align-items: center; }
      .em-receipt {
        width: 58mm;
        background: #fff;
        color: #111;
        padding: 8px 6px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.5;
      }
      .em-receipt hr { border: none; border-top: 1px dashed #111; margin: 6px 0; }
      .em-receipt .center { text-align: center; }
      .em-receipt .bold { font-weight: 700; }
      .em-receipt .row { display: flex; justify-content: space-between; }
      .em-receipt .brand { font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }
      .em-receipt .total-row { font-size: 13px; margin-top: 4px; }

      .em-receipt-actions { display: flex; gap: 10px; margin-top: 20px; }
      .em-print-btn {
        background: #3B2E1F; color: #F2EBDB; border: none; border-radius: 8px;
        padding: 11px 22px; font-weight: bold; cursor: pointer;
      }

      @media print {
        body * { visibility: hidden; }
        .em-print-area, .em-print-area * { visibility: visible; }
        .em-print-area {
          position: absolute; top: 0; left: 0; margin: 0; padding: 0;
        }
        @page { size: 58mm auto; margin: 0; }
      }
    `}</style>
  )
}

export default function Employees({ onBack }) {
  const [tab, setTab] = useState('list') // list | payroll | history
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  // employee form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [phone, setPhone] = useState('')
  const [salary, setSalary] = useState('')
  const [startDate, setStartDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // payroll
  const q = currentQuincena()
  const [periodStart, setPeriodStart] = useState(q.start)
  const [periodEnd, setPeriodEnd] = useState(q.end)
  const [payrollDraft, setPayrollDraft] = useState({}) // { employeeId: { bonuses, deductions } }
  const [paidThisPeriod, setPaidThisPeriod] = useState({}) // { employeeId: payment }
  const [payingId, setPayingId] = useState(null)

  // history
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // receipt
  const [receipt, setReceipt] = useState(null) // payment + employee data

  const loadEmployees = async () => {
    setLoading(true)
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
    setEmployees(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (tab === 'payroll') loadPaidThisPeriod()
  }, [tab, periodStart, periodEnd, employees])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab])

  const loadPaidThisPeriod = async () => {
    const { data } = await supabase
      .from('payroll_payments')
      .select('*')
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
    const map = {}
    ;(data || []).forEach((p) => { map[p.employee_id] = p })
    setPaidThisPeriod(map)
  }

  const loadHistory = async () => {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('payroll_payments')
      .select('*, employees(name, position)')
      .order('paid_at', { ascending: false })
      .limit(60)
    setHistory(data || [])
    setLoadingHistory(false)
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setPosition('')
    setPhone('')
    setSalary('')
    setStartDate('')
    setError('')
  }

  const openEdit = (emp) => {
    setEditingId(emp.id)
    setName(emp.name || '')
    setPosition(emp.position || '')
    setPhone(emp.phone || '')
    setSalary(String(emp.salary_quincenal ?? ''))
    setStartDate(emp.start_date || '')
    setShowForm(true)
  }

  const handleSaveEmployee = async () => {
    if (!name.trim() || !salary) {
      setError('Nombre y salario quincenal son obligatorios')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: name.trim(),
      position: position.trim() || null,
      phone: phone.trim() || null,
      salary_quincenal: parseFloat(salary),
      start_date: startDate || null,
    }

    let err
    if (editingId) {
      const { error: updateErr } = await supabase.from('employees').update(payload).eq('id', editingId)
      err = updateErr
    } else {
      const { error: insertErr } = await supabase.from('employees').insert(payload)
      err = insertErr
    }

    if (err) {
      setError('Error al guardar: ' + err.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setShowForm(false)
    resetForm()
    loadEmployees()
  }

  const toggleActive = async (emp) => {
    await supabase.from('employees').update({ active: !emp.active }).eq('id', emp.id)
    loadEmployees()
  }

  const handleDeleteEmployee = async (emp) => {
    const ok = window.confirm(
      `¿Eliminar a "${emp.name}" definitivamente? Esto también borra su historial de pagos de nómina. Esta acción no se puede deshacer.`
    )
    if (!ok) return
    const { error: delErr } = await supabase.from('employees').delete().eq('id', emp.id)
    if (delErr) {
      alert('Error al eliminar: ' + delErr.message)
      return
    }
    loadEmployees()
  }

  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees])

  const getDraft = (empId) => payrollDraft[empId] || { bonuses: '0', deductions: '0' }
  const setDraft = (empId, field, value) => {
    setPayrollDraft((prev) => ({
      ...prev,
      [empId]: { ...getDraft(empId), [field]: value },
    }))
  }

  const netFor = (emp) => {
    const d = getDraft(emp.id)
    const base = Number(emp.salary_quincenal) || 0
    const bonuses = parseFloat(d.bonuses) || 0
    const deductions = parseFloat(d.deductions) || 0
    return base + bonuses - deductions
  }

  const handlePay = async (emp) => {
    setPayingId(emp.id)
    const d = getDraft(emp.id)
    const base = Number(emp.salary_quincenal) || 0
    const bonuses = parseFloat(d.bonuses) || 0
    const deductions = parseFloat(d.deductions) || 0
    const net = base + bonuses - deductions

    const { data, error: payErr } = await supabase
      .from('payroll_payments')
      .insert({
        employee_id: emp.id,
        period_start: periodStart,
        period_end: periodEnd,
        base_amount: base,
        bonuses,
        deductions,
        net_amount: net,
      })
      .select('*')
      .single()

    setPayingId(null)

    if (payErr) {
      alert('Error al registrar el pago: ' + payErr.message)
      return
    }

    setPaidThisPeriod((prev) => ({ ...prev, [emp.id]: data }))
    setReceipt({ ...data, employee_name: emp.name, employee_position: emp.position })
  }

  const openReceiptFromHistory = (payment) => {
    setReceipt({
      ...payment,
      employee_name: payment.employees?.name,
      employee_position: payment.employees?.position,
    })
  }

  // ---------- RECEIPT VIEW ----------
  if (receipt) {
    return (
      <div className="em-page">
        <GlobalStyle />
        <div className="em-header" style={{ marginBottom: 0 }}>
          <button className="em-back" onClick={() => setReceipt(null)}>← Volver</button>
          <h2 className="em-title">Recibo de sueldo</h2>
          <div style={{ width: 90 }} />
        </div>

        <div className="em-receipt-wrap" style={{ marginTop: 24 }}>
          <div className="em-print-area">
            <div className="em-receipt">
              <div className="center brand">VARIEDADES CALERO</div>
              <div className="center">Recibo de sueldo</div>
              <hr />
              <div className="row"><span>Empleado:</span></div>
              <div className="bold">{receipt.employee_name}</div>
              {receipt.employee_position && <div>{receipt.employee_position}</div>}
              <hr />
              <div className="row"><span>Período:</span></div>
              <div>{fmtDate(receipt.period_start)} — {fmtDate(receipt.period_end)}</div>
              <div className="row"><span>Fecha de pago:</span></div>
              <div>{fmtDate(String(receipt.paid_at).slice(0, 10))}</div>
              <hr />
              <div className="row"><span>Salario base</span><span>${Number(receipt.base_amount).toFixed(2)}</span></div>
              <div className="row"><span>Bonificaciones</span><span>+${Number(receipt.bonuses).toFixed(2)}</span></div>
              <div className="row"><span>Descuentos</span><span>-${Number(receipt.deductions).toFixed(2)}</span></div>
              <hr />
              <div className="row bold total-row"><span>NETO A PAGAR</span><span>${Number(receipt.net_amount).toFixed(2)}</span></div>
              <hr />
              <div className="center" style={{ marginTop: 14 }}>_____________________</div>
              <div className="center">Firma del empleado</div>
              <div className="center" style={{ marginTop: 10, fontSize: 9 }}>Gracias por tu trabajo</div>
            </div>
          </div>

          <div className="em-receipt-actions">
            <button className="em-print-btn" onClick={() => window.print()}>🖨️ Imprimir recibo</button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- MAIN VIEW ----------
  return (
    <div className="em-page">
      <GlobalStyle />
      <div className="em-header">
        <button className="em-back" onClick={onBack}>← Volver</button>
        <h2 className="em-title">Empleados y Nómina</h2>
        <div style={{ width: 90 }} />
      </div>

      <div className="em-tabs">
        <button className={`em-tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>👥 Empleados</button>
        <button className={`em-tab ${tab === 'payroll' ? 'active' : ''}`} onClick={() => setTab('payroll')}>💵 Generar nómina</button>
        <button className={`em-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>🧾 Historial de pagos</button>
      </div>

      {tab === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button
              className="em-add-btn"
              onClick={() => {
                if (showForm) { setShowForm(false); resetForm() } else { resetForm(); setShowForm(true) }
              }}
            >
              {showForm ? 'Cancelar' : '+ Nuevo empleado'}
            </button>
          </div>

          {showForm && (
            <div className="em-form">
              <div className="em-form-row">
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="em-label">Nombre *</label>
                  <input className="em-input" style={{ width: '100%' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="em-label">Cargo</label>
                  <input className="em-input" style={{ width: '100%' }} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ej. Vendedora" />
                </div>
              </div>
              <div className="em-form-row">
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="em-label">Teléfono</label>
                  <input className="em-input" style={{ width: '100%' }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8888 8888" />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="em-label">Salario quincenal *</label>
                  <input className="em-input" style={{ width: '100%' }} type="number" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0.00" />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="em-label">Fecha de ingreso</label>
                  <input className="em-input" style={{ width: '100%' }} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
              {error && <p className="em-error">{error}</p>}
              <button className="em-save-btn" onClick={handleSaveEmployee} disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar empleado'}
              </button>
            </div>
          )}

          {loading ? (
            <p className="em-muted">Cargando...</p>
          ) : employees.length === 0 ? (
            <p className="em-muted">No hay empleados todavía. Agregá el primero.</p>
          ) : (
            <div className="em-list">
              {employees.map((emp) => (
                <div key={emp.id} className="em-card">
                  <div>
                    <div className="em-card-name">{emp.name}</div>
                    <div className="em-card-meta">
                      {emp.position || 'Sin cargo'}{emp.phone ? ` · ${emp.phone}` : ''}
                      {emp.start_date ? ` · Desde ${fmtDate(emp.start_date)}` : ''}
                    </div>
                  </div>
                  <div className="em-card-right">
                    <span className={`em-status ${emp.active ? 'active' : 'inactive'}`}>{emp.active ? 'Activo' : 'Inactivo'}</span>
                    <span className="em-salary">${Number(emp.salary_quincenal).toFixed(2)} / quincena</span>
                    <button className="em-icon-btn" onClick={() => openEdit(emp)}>Editar</button>
                    <button className="em-icon-btn" onClick={() => toggleActive(emp)}>
                      {emp.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="em-icon-btn em-delete-btn" onClick={() => handleDeleteEmployee(emp)}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'payroll' && (
        <>
          <div className="em-period-bar">
            <div className="em-period-field">
              <label className="em-label">Inicio de período</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="em-period-field">
              <label className="em-label">Fin de período</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          {activeEmployees.length === 0 ? (
            <p className="em-muted">No hay empleados activos. Agregá empleados en la pestaña "Empleados".</p>
          ) : (
            activeEmployees.map((emp) => {
              const paid = paidThisPeriod[emp.id]
              return (
                <div key={emp.id} className="em-payroll-row">
                  <div className="em-payroll-top">
                    <div>
                      <div className="em-payroll-name">{emp.name}</div>
                      <div className="em-card-meta">{emp.position || 'Sin cargo'} · Base ${Number(emp.salary_quincenal).toFixed(2)}</div>
                    </div>
                    {paid ? (
                      <span className="em-paid-tag">✅ Pagado — ${Number(paid.net_amount).toFixed(2)}</span>
                    ) : null}
                  </div>

                  {!paid ? (
                    <div className="em-payroll-fields">
                      <div className="em-mini-field">
                        <label>Bonificación</label>
                        <input type="number" step="0.01" value={getDraft(emp.id).bonuses} onChange={(e) => setDraft(emp.id, 'bonuses', e.target.value)} />
                      </div>
                      <div className="em-mini-field">
                        <label>Descuentos</label>
                        <input type="number" step="0.01" value={getDraft(emp.id).deductions} onChange={(e) => setDraft(emp.id, 'deductions', e.target.value)} />
                      </div>
                      <div className="em-mini-field">
                        <label>Neto</label>
                        <div className="em-net" style={{ padding: '7px 0' }}>${netFor(emp).toFixed(2)}</div>
                      </div>
                      <button className="em-pay-btn" onClick={() => handlePay(emp)} disabled={payingId === emp.id}>
                        {payingId === emp.id ? 'Pagando...' : 'Pagar e imprimir'}
                      </button>
                    </div>
                  ) : (
                    <button className="em-icon-btn" onClick={() => openReceiptFromHistory({ ...paid, employees: { name: emp.name, position: emp.position } })}>
                      Ver / reimprimir recibo
                    </button>
                  )}
                </div>
              )
            })
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {loadingHistory ? (
            <p className="em-muted">Cargando...</p>
          ) : history.length === 0 ? (
            <p className="em-muted">Todavía no hay pagos registrados.</p>
          ) : (
            history.map((p) => (
              <div key={p.id} className="em-history-row">
                <div>
                  <div className="em-card-name">{p.employees?.name || 'Empleado'}</div>
                  <div className="em-history-meta">
                    {fmtDate(p.period_start)} — {fmtDate(p.period_end)} · Pagado {fmtDate(String(p.paid_at).slice(0, 10))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="em-salary">${Number(p.net_amount).toFixed(2)}</span>
                  <button className="em-icon-btn" onClick={() => openReceiptFromHistory(p)}>Ver recibo</button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
