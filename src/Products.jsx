import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'

// ---------- category presets ----------
// Each preset tells the form what the "size-like" attribute is called for
// that kind of product (talla, presentación, tono...) and whether a color
// field makes sense. This is what makes adding a product "adapt" to what
// you're actually selling instead of always asking for "talla".
const CATEGORY_PRESETS = [
  { name: 'Ropa', attrLabel: 'Talla', quickOptions: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], hasColor: true },
  { name: 'Calzado', attrLabel: 'Talla', quickOptions: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'], hasColor: true },
  { name: 'Perfumería', attrLabel: 'Presentación', quickOptions: ['30ml', '50ml', '75ml', '100ml', '150ml'], hasColor: false },
  { name: 'Maquillaje', attrLabel: 'Tono / Color', quickOptions: [], hasColor: false },
  { name: 'Accesorios', attrLabel: 'Talla', quickOptions: ['Único'], hasColor: true },
  { name: 'Artículos para el cabello', attrLabel: 'Presentación', quickOptions: [], hasColor: false },
  { name: 'Otros', attrLabel: 'Variante', quickOptions: [], hasColor: true },
]
const getPreset = (categoryName) =>
  CATEGORY_PRESETS.find((c) => c.name === categoryName) || { name: categoryName, attrLabel: 'Variante', quickOptions: [], hasColor: true }

const newRowId = () => `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export default function Products({ onBack }) {
  const [rawVariants, setRawVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({}) // { productId: bool }
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // product-level fields
  const [name, setName] = useState('')
  const [categoryName, setCategoryName] = useState('Ropa')
  const [customCategory, setCustomCategory] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [sharedColor, setSharedColor] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // variant rows being built for the new product
  const [rows, setRows] = useState([])

  // adding a single new variant to an existing product
  const [addingVariantTo, setAddingVariantTo] = useState(null) // product object or null
  const [newVariantAttr, setNewVariantAttr] = useState('')
  const [newVariantColor, setNewVariantColor] = useState('')
  const [newVariantStock, setNewVariantStock] = useState('')
  const [newVariantPrice, setNewVariantPrice] = useState('')

  const [existingCategoryNames, setExistingCategoryNames] = useState([])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('product_variants')
      .select('id, size, color, stock, price, product_id, products(id, name, base_price, image_url, category_id, categories(id, name))')
      .order('created_at', { ascending: false })
    setRawVariants(data || [])
    setLoading(false)
  }

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('name').order('name')
    setExistingCategoryNames((data || []).map((c) => c.name))
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  // group flat variant rows into products, same pattern used in the store
  const products = useMemo(() => {
    const map = new Map()
    rawVariants.forEach((v) => {
      const pid = v.product_id
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: v.products?.name || 'Producto',
          image: v.products?.image_url || null,
          category: v.products?.categories?.name || 'Sin categoría',
          basePrice: v.products?.base_price,
          variants: [],
        })
      }
      map.get(pid).variants.push({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        price: v.price,
      })
    })
    return Array.from(map.values())
  }, [rawVariants])

  const preset = getPreset(categoryName === '__custom__' ? customCategory : categoryName)

  // ---------- variant row builder (new product form) ----------
  const addRow = (attr = '', color = sharedColor) => {
    setRows((prev) => [...prev, { key: newRowId(), attr, color, stock: '', price: basePrice }])
  }
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key))
  const updateRow = (key, field, value) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }
  const toggleQuick = (value) => {
    const exists = rows.find((r) => r.attr.toLowerCase() === value.toLowerCase())
    if (exists) {
      removeRow(exists.key)
    } else {
      addRow(value, sharedColor)
    }
  }

  const resetForm = () => {
    setName('')
    setCategoryName('Ropa')
    setCustomCategory('')
    setBasePrice('')
    setSharedColor('')
    setImageFile(null)
    setImagePreview(null)
    setRows([])
    setError('')
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const resolveCategoryId = async (finalCategoryName) => {
    const { data: existingCat } = await supabase.from('categories').select('id').eq('name', finalCategoryName).maybeSingle()
    if (existingCat) return existingCat.id
    const { data: newCat, error: catErr } = await supabase.from('categories').insert({ name: finalCategoryName }).select('id').single()
    if (catErr) throw new Error('Error al crear categoría: ' + catErr.message)
    return newCat.id
  }

  const handleSaveProduct = async () => {
    const finalCategory = categoryName === '__custom__' ? customCategory.trim() : categoryName
    if (!name.trim() || !basePrice || !finalCategory) {
      setError('Nombre, categoría y precio son obligatorios')
      return
    }
    if (rows.length === 0) {
      setError(`Agregá al menos una variante (${preset.attrLabel.toLowerCase()})`)
      return
    }
    for (const r of rows) {
      if (r.stock === '' || isNaN(parseInt(r.stock))) {
        setError('Cada variante necesita una cantidad de stock')
        return
      }
    }

    setSaving(true)
    setError('')

    try {
      const categoryId = await resolveCategoryId(finalCategory)

      let imageUrl = null
      if (imageFile) {
        setUploadingImage(true)
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        const { error: uploadErr } = await supabase.storage.from('product-images').upload(fileName, imageFile)
        if (uploadErr) throw new Error('Error al subir la foto: ' + uploadErr.message)
        const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
        imageUrl = publicUrlData.publicUrl
        setUploadingImage(false)
      }

      const { data: newProduct, error: prodErr } = await supabase
        .from('products')
        .insert({ name: name.trim(), category_id: categoryId, base_price: parseFloat(basePrice), image_url: imageUrl })
        .select('id')
        .single()
      if (prodErr) throw new Error('Error al crear producto: ' + prodErr.message)

      const variantRows = rows.map((r) => ({
        product_id: newProduct.id,
        size: r.attr.trim() || null,
        color: r.color.trim() || null,
        price: r.price ? parseFloat(r.price) : parseFloat(basePrice),
        stock: parseInt(r.stock) || 0,
      }))

      const { error: varErr } = await supabase.from('product_variants').insert(variantRows)
      if (varErr) throw new Error('Error al crear variantes: ' + varErr.message)

      setSaving(false)
      setShowForm(false)
      resetForm()
      loadProducts()
      loadCategories()
    } catch (e) {
      setError(e.message)
      setSaving(false)
      setUploadingImage(false)
    }
  }

  // ---------- delete product / variant ----------
  // NOTE: window.confirm()/alert() are unreliable when the site runs as an
  // installed app (Add to Home Screen) — many WebViews silently block
  // native JS dialogs, so the button appears to "flash" and nothing
  // happens. We use our own confirmation panel + inline banner instead,
  // which always works regardless of how the page is launched.
  const [confirmDelete, setConfirmDelete] = useState(null) // { type: 'product'|'variant', product, variantId }
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const flashSuccess = (msg) => {
    setActionSuccess(msg)
    setTimeout(() => setActionSuccess(''), 2500)
  }

  const askDeleteProduct = (product) => setConfirmDelete({ type: 'product', product })
  const askDeleteVariant = (product, variantId) => setConfirmDelete({ type: 'variant', product, variantId })

  const PERMISSION_HINT = 'Puede que falte el permiso de eliminar en Supabase (RLS). Corré el SQL "permitir_eliminar.sql" en el SQL Editor de Supabase.'

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    setActionError('')

    if (confirmDelete.type === 'product') {
      const { product } = confirmDelete
      const { data: delVarData, error: delVarErr } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', product.id)
        .select('id')
      if (delVarErr) {
        setActionError('Error al eliminar variantes: ' + delVarErr.message)
        setDeleting(false)
        return
      }
      const { data: delProdData, error: delProdErr } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
        .select('id')
      if (delProdErr) {
        setActionError('Error al eliminar producto: ' + delProdErr.message)
        setDeleting(false)
        return
      }
      // Supabase can return success with 0 rows affected when RLS silently
      // blocks the delete (no matching policy) instead of raising an error.
      if (!delProdData || delProdData.length === 0) {
        setActionError('No se eliminó nada — el producto sigue ahí. ' + PERMISSION_HINT)
        setDeleting(false)
        return
      }
      flashSuccess(`"${product.name}" fue eliminado`)
    } else {
      const { data: delData, error: delErr } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', confirmDelete.variantId)
        .select('id')
      if (delErr) {
        setActionError('Error al eliminar: ' + delErr.message)
        setDeleting(false)
        return
      }
      if (!delData || delData.length === 0) {
        setActionError('No se eliminó nada. ' + PERMISSION_HINT)
        setDeleting(false)
        return
      }
      flashSuccess('Variante eliminada')
    }

    setDeleting(false)
    setConfirmDelete(null)
    loadProducts()
  }

  // ---------- add a variant to an existing product ----------
  const openAddVariant = (product) => {
    setAddingVariantTo(product)
    setNewVariantAttr('')
    setNewVariantColor('')
    setNewVariantStock('')
    setNewVariantPrice(String(product.basePrice ?? ''))
  }

  const handleAddVariant = async () => {
    if (!newVariantStock || isNaN(parseInt(newVariantStock))) {
      setActionError('Ingresá el stock de la nueva variante')
      return
    }
    setActionError('')
    const { error: insErr } = await supabase.from('product_variants').insert({
      product_id: addingVariantTo.id,
      size: newVariantAttr.trim() || null,
      color: newVariantColor.trim() || null,
      price: newVariantPrice ? parseFloat(newVariantPrice) : addingVariantTo.basePrice,
      stock: parseInt(newVariantStock) || 0,
    })
    if (insErr) {
      setActionError('Error al agregar variante: ' + insErr.message)
      return
    }
    setAddingVariantTo(null)
    flashSuccess('Variante agregada')
    loadProducts()
  }

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const allCategoryOptions = useMemo(() => {
    const presetNames = CATEGORY_PRESETS.map((c) => c.name)
    const extra = existingCategoryNames.filter((n) => !presetNames.includes(n))
    return [...presetNames, ...extra]
  }, [existingCategoryNames])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Volver</button>
        <h2 style={styles.title}>Productos</h2>
        <button
          onClick={() => {
            if (showForm) { setShowForm(false); resetForm() } else { resetForm(); setShowForm(true) }
          }}
          style={styles.addBtn}
        >
          {showForm ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {actionSuccess && <div style={styles.successBanner}>✅ {actionSuccess}</div>}
      {actionError && <div style={styles.errorBanner}>⚠️ {actionError}</div>}

      {showForm && (
        <div style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Nombre del producto *</label>
              <input style={styles.input} placeholder="Ej. Camisa a cuadros" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Categoría *</label>
              <select style={styles.input} value={categoryName} onChange={(e) => setCategoryName(e.target.value)}>
                {allCategoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__custom__">+ Otra categoría...</option>
              </select>
            </div>
            {categoryName === '__custom__' && (
              <div style={styles.fieldCol}>
                <label style={styles.fieldLabel}>Nombre de la nueva categoría</label>
                <input style={styles.input} placeholder="Ej. Bisutería" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
              </div>
            )}
          </div>

          <div style={styles.formRow}>
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Precio base *</label>
              <input style={styles.input} type="number" step="0.01" placeholder="0.00" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
            {preset.hasColor && (
              <div style={styles.fieldCol}>
                <label style={styles.fieldLabel}>Color (aplica a las variantes que agregues)</label>
                <input style={styles.input} placeholder="Ej. Rojo" value={sharedColor} onChange={(e) => setSharedColor(e.target.value)} />
              </div>
            )}
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Foto</label>
              <div style={styles.imageUploadBox}>
                {imagePreview ? <img src={imagePreview} alt="preview" style={styles.imagePreview} /> : <div style={styles.imagePlaceholder}>Sin foto</div>}
                <label style={styles.uploadLabel}>
                  {imageFile ? 'Cambiar foto' : 'Subir foto'}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          {/* variant builder, adapted to the category */}
          <div style={styles.variantBuilder}>
            <p style={styles.variantBuilderTitle}>
              {preset.attrLabel}{preset.hasColor ? ' y color' : ''} — agregá cada variante que vas a tener en stock
            </p>

            {preset.quickOptions.length > 0 && (
              <div style={styles.quickRow}>
                {preset.quickOptions.map((opt) => {
                  const active = rows.some((r) => r.attr.toLowerCase() === opt.toLowerCase())
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleQuick(opt)}
                      style={active ? styles.quickChipActive : styles.quickChip}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {rows.length === 0 ? (
              <p style={styles.muted}>
                {preset.quickOptions.length > 0
                  ? 'Tocá arriba las opciones que apliquen, o agregá una manual.'
                  : `Todavía no agregaste ninguna variante de ${preset.attrLabel.toLowerCase()}.`}
              </p>
            ) : (
              <div style={styles.rowsList}>
                <div style={styles.rowsHeader}>
                  <span style={{ flex: 1.2 }}>{preset.attrLabel}</span>
                  {preset.hasColor && <span style={{ flex: 1 }}>Color</span>}
                  <span style={{ width: 90 }}>Stock</span>
                  <span style={{ width: 100 }}>Precio</span>
                  <span style={{ width: 30 }} />
                </div>
                {rows.map((r) => (
                  <div key={r.key} style={styles.rowItem}>
                    <input
                      style={{ ...styles.rowInput, flex: 1.2 }}
                      placeholder={preset.attrLabel}
                      value={r.attr}
                      onChange={(e) => updateRow(r.key, 'attr', e.target.value)}
                    />
                    {preset.hasColor && (
                      <input
                        style={{ ...styles.rowInput, flex: 1 }}
                        placeholder="Color"
                        value={r.color}
                        onChange={(e) => updateRow(r.key, 'color', e.target.value)}
                      />
                    )}
                    <input
                      style={{ ...styles.rowInput, width: 90 }}
                      type="number"
                      placeholder="Stock"
                      value={r.stock}
                      onChange={(e) => updateRow(r.key, 'stock', e.target.value)}
                    />
                    <input
                      style={{ ...styles.rowInput, width: 100 }}
                      type="number"
                      step="0.01"
                      placeholder={basePrice || '0.00'}
                      value={r.price}
                      onChange={(e) => updateRow(r.key, 'price', e.target.value)}
                    />
                    <button type="button" style={styles.rowRemoveBtn} onClick={() => removeRow(r.key)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <button type="button" style={styles.addRowBtn} onClick={() => addRow('')}>
              + Agregar {preset.attrLabel.toLowerCase()} manual
            </button>
          </div>

          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.saveBtn} onClick={handleSaveProduct} disabled={saving}>
            {saving ? (uploadingImage ? 'Subiendo foto...' : 'Guardando...') : 'Guardar producto'}
          </button>
        </div>
      )}

      {loading ? (
        <p style={styles.muted}>Cargando...</p>
      ) : products.length === 0 ? (
        <p style={styles.muted}>No hay productos todavía. Agregá el primero.</p>
      ) : (
        <div style={styles.list}>
          {products.map((p) => {
            const isOpen = !!expanded[p.id]
            const totalStock = p.variants.reduce((s, v) => s + v.stock, 0)
            const preset2 = getPreset(p.category)
            return (
              <div key={p.id} style={styles.card}>
                <div style={styles.cardTop} onClick={() => toggleExpand(p.id)}>
                  <div style={styles.cardLeft}>
                    {p.image ? <img src={p.image} alt="" style={styles.thumb} /> : <div style={styles.thumbPlaceholder}>📦</div>}
                    <div>
                      <div style={styles.cardName}>{p.name}</div>
                      <div style={styles.cardMeta}>
                        {p.category} · {p.variants.length} variante{p.variants.length !== 1 ? 's' : ''} · Stock total: {totalStock}
                      </div>
                    </div>
                  </div>
                  <div style={styles.cardRight}>
                    <div style={styles.cardPrice}>${Number(p.basePrice).toFixed(2)}</div>
                    <span style={styles.expandIcon}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={styles.cardExpand}>
                    <div style={styles.variantTable}>
                      {p.variants.map((v) => (
                        <div key={v.id} style={styles.variantRow}>
                          <span style={{ flex: 1 }}>
                            {[
                              v.size ? `${preset2.attrLabel}: ${v.size}` : null,
                              v.color ? `Color: ${v.color}` : null,
                            ].filter(Boolean).join(' · ') || 'Único'}
                          </span>
                          <span style={v.stock > 0 ? styles.stockOk : styles.stockLow}>Stock: {v.stock}</span>
                          <span style={styles.variantPrice}>${Number(v.price).toFixed(2)}</span>
                          <button style={styles.deleteVariantBtn} onClick={() => askDeleteVariant(p, v.id)}>Eliminar</button>
                        </div>
                      ))}
                    </div>

                    {addingVariantTo?.id === p.id ? (
                      <div style={styles.addVariantBox}>
                        <input style={styles.rowInput} placeholder={preset2.attrLabel} value={newVariantAttr} onChange={(e) => setNewVariantAttr(e.target.value)} />
                        {preset2.hasColor && (
                          <input style={styles.rowInput} placeholder="Color" value={newVariantColor} onChange={(e) => setNewVariantColor(e.target.value)} />
                        )}
                        <input style={{ ...styles.rowInput, width: 90 }} type="number" placeholder="Stock" value={newVariantStock} onChange={(e) => setNewVariantStock(e.target.value)} />
                        <input style={{ ...styles.rowInput, width: 100 }} type="number" step="0.01" placeholder="Precio" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} />
                        <button style={styles.saveBtnSmall} onClick={handleAddVariant}>Guardar</button>
                        <button style={styles.cancelBtnSmall} onClick={() => setAddingVariantTo(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <div style={styles.cardActions}>
                        <button style={styles.smallActionBtn} onClick={() => openAddVariant(p)}>
                          + Agregar {preset2.attrLabel.toLowerCase()}
                        </button>
                        <button style={styles.deleteProductBtn} onClick={() => askDeleteProduct(p)}>
                          🗑️ Eliminar producto
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <div style={styles.confirmOverlay} onClick={() => !deleting && setConfirmDelete(null)}>
          <div style={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <p style={styles.confirmTitle}>
              {confirmDelete.type === 'product' ? '¿Eliminar este producto?' : '¿Eliminar esta variante?'}
            </p>
            <p style={styles.confirmText}>
              {confirmDelete.type === 'product'
                ? `Se eliminará "${confirmDelete.product.name}" y sus ${confirmDelete.product.variants.length} variante(s). Esta acción no se puede deshacer.`
                : `Se eliminará esta variante de "${confirmDelete.product.name}". Esta acción no se puede deshacer.`}
            </p>
            <div style={styles.confirmActions}>
              <button style={styles.cancelBtnSmall} onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancelar
              </button>
              <button style={styles.confirmDeleteBtn} onClick={confirmDeleteAction} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f0f', color: '#f5f5f5', fontFamily: 'system-ui, sans-serif', padding: 24 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  backBtn: { background: 'transparent', color: '#999', border: '1px solid #333', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  title: { color: '#d4af37', margin: 0, fontSize: 20 },
  addBtn: { background: '#d4af37', color: '#0f0f0f', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' },

  successBanner: { background: '#1e3a24', color: '#7fd88f', border: '1px solid #2d5636', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13.5 },
  errorBanner: { background: '#3a1e1e', color: '#ff9b9b', border: '1px solid #5a2323', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13.5 },

  confirmOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
  },
  confirmBox: {
    background: '#1a1a1a', border: '1px solid #333', borderRadius: 14, padding: 24, maxWidth: 380, width: '100%',
  },
  confirmTitle: { fontSize: 17, fontWeight: 'bold', margin: '0 0 10px', color: '#f5f5f5' },
  confirmText: { fontSize: 13.5, color: '#999', margin: '0 0 20px', lineHeight: 1.5 },
  confirmActions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  confirmDeleteBtn: { background: '#c94b4b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 'bold', cursor: 'pointer', fontSize: 13.5 },

  form: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 24 },
  formRow: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  fieldCol: { flex: 1, minWidth: 160 },
  fieldLabel: { display: 'block', fontSize: 11.5, color: '#999', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { width: '100%', background: '#242424', color: '#f5f5f5', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' },

  variantBuilder: { background: '#151515', border: '1px dashed #333', borderRadius: 10, padding: 16, marginBottom: 14 },
  variantBuilderTitle: { margin: '0 0 12px', fontSize: 13.5, color: '#ccc', fontWeight: 600 },
  quickRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  quickChip: { background: '#242424', border: '1px solid #333', color: '#f5f5f5', borderRadius: 999, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
  quickChipActive: { background: '#d4af37', border: '1px solid #d4af37', color: '#0f0f0f', borderRadius: 999, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 700 },

  rowsList: { marginBottom: 10 },
  rowsHeader: { display: 'flex', gap: 8, fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, padding: '0 2px' },
  rowItem: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  rowInput: { background: '#242424', color: '#f5f5f5', border: '1px solid #333', borderRadius: 7, padding: '8px 10px', fontSize: 13 },
  rowRemoveBtn: { width: 30, background: 'transparent', border: '1px solid #333', color: '#ff6b6b', borderRadius: 7, cursor: 'pointer', padding: '8px 0' },
  addRowBtn: { background: 'transparent', border: '1px solid #333', color: '#999', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },

  error: { color: '#ff6b6b', fontSize: 13, marginBottom: 12 },
  muted: { color: '#777' },
  saveBtn: { background: '#d4af37', color: '#0f0f0f', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, overflow: 'hidden' },
  cardTop: { padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 8, objectFit: 'cover' },
  thumbPlaceholder: { width: 48, height: 48, borderRadius: 8, background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  cardName: { fontWeight: 'bold', fontSize: 15 },
  cardMeta: { color: '#999', fontSize: 12.5, marginTop: 2 },
  cardRight: { display: 'flex', alignItems: 'center', gap: 14 },
  cardPrice: { color: '#d4af37', fontWeight: 'bold' },
  expandIcon: { color: '#777', fontSize: 11 },

  cardExpand: { padding: '4px 18px 16px', borderTop: '1px solid #2a2a2a' },
  variantTable: { marginTop: 10, marginBottom: 12 },
  variantRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #232323', fontSize: 13 },
  stockOk: { color: '#7fd88f', width: 90 },
  stockLow: { color: '#ff6b6b', width: 90 },
  variantPrice: { color: '#d4af37', width: 70, fontWeight: 600 },
  deleteVariantBtn: { background: 'transparent', border: '1px solid #333', color: '#ff6b6b', borderRadius: 7, padding: '5px 10px', fontSize: 11.5, cursor: 'pointer' },

  cardActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  smallActionBtn: { background: '#242424', border: '1px solid #333', color: '#f5f5f5', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' },
  deleteProductBtn: { background: 'transparent', border: '1px solid #5a2323', color: '#ff6b6b', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' },

  addVariantBox: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#151515', border: '1px dashed #333', borderRadius: 10, padding: 12 },
  saveBtnSmall: { background: '#d4af37', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },
  cancelBtnSmall: { background: 'transparent', border: '1px solid #333', color: '#999', borderRadius: 7, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' },

  imageUploadBox: { display: 'flex', alignItems: 'center', gap: 12 },
  imagePreview: { width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #333' },
  imagePlaceholder: { width: 40, height: 40, borderRadius: 8, background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#777', textAlign: 'center' },
  uploadLabel: { background: '#242424', color: '#f5f5f5', border: '1px solid #333', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' },
}
