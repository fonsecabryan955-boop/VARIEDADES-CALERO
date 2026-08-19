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
  const [brand, setBrand] = useState('')
  const [categoryName, setCategoryName] = useState('Ropa')
  const [customCategory, setCustomCategory] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')
  const [supplier, setSupplier] = useState('')
  const [sharedColor, setSharedColor] = useState('')
  const [onSale, setOnSale] = useState(false)
  const [discountPercent, setDiscountPercent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // when editing an existing product's basic info (name/price/cost/etc,
  // not its variants — those still use the add/delete variant flow below)
  const [editingProductId, setEditingProductId] = useState(null)

  // variant rows being built for the new product
  const [rows, setRows] = useState([])

  // adding a single new variant to an existing product
  const [addingVariantTo, setAddingVariantTo] = useState(null) // product object or null
  const [newVariantAttr, setNewVariantAttr] = useState('')
  const [newVariantColor, setNewVariantColor] = useState('')
  const [newVariantStock, setNewVariantStock] = useState('')
  const [newVariantPrice, setNewVariantPrice] = useState('')
  const [newVariantSku, setNewVariantSku] = useState('')

  const [existingCategoryNames, setExistingCategoryNames] = useState([])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('product_variants')
      .select('id, size, color, stock, price, sku, product_id, products(id, name, brand, base_price, image_url, category_id, description, cost, supplier, on_sale, discount_percent, active, categories(id, name))')
      .order('created_at', { ascending: false })
    setRawVariants(data || [])
    setLoading(false)
  }

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('name').order('name')
    setExistingCategoryNames((data || []).map((c) => c.name))
  }

  // ---------- toggle: mostrar/ocultar producto en la tienda online ----------
  const [togglingStoreId, setTogglingStoreId] = useState(null)
  const toggleShowInStore = async (product) => {
    setTogglingStoreId(product.id)
    const nextValue = !product.showInStore
    const { error } = await supabase
      .from('products')
      .update({ active: nextValue })
      .eq('id', product.id)
    if (!error) {
      setRawVariants((prev) =>
        prev.map((v) =>
          v.product_id === product.id
            ? { ...v, products: { ...v.products, active: nextValue } }
            : v
        )
      )
    }
    setTogglingStoreId(null)
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
          brand: v.products?.brand || '',
          image: v.products?.image_url || null,
          category: v.products?.categories?.name || 'Sin categoría',
          categoryId: v.products?.category_id || null,
          basePrice: v.products?.base_price,
          description: v.products?.description || '',
          cost: v.products?.cost ?? 0,
          supplier: v.products?.supplier || '',
          onSale: v.products?.on_sale || false,
          discountPercent: v.products?.discount_percent || 0,
          // los productos existentes no tienen este campo tocado nunca,
          // así que null/undefined cuenta como "sí visible" (true)
          showInStore: v.products?.active !== false,
          variants: [],
        })
      }
      map.get(pid).variants.push({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        price: v.price,
        sku: v.sku,
      })
    })
    return Array.from(map.values())
  }, [rawVariants])

  const preset = getPreset(categoryName === '__custom__' ? customCategory : categoryName)

  // ---------- variant row builder (new product form) ----------
  const addRow = (attr = '', color = sharedColor) => {
    setRows((prev) => [...prev, { key: newRowId(), attr, color, stock: '', price: basePrice, sku: '' }])
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
    setBrand('')
    setCategoryName('Ropa')
    setCustomCategory('')
    setBasePrice('')
    setCost('')
    setDescription('')
    setSupplier('')
    setSharedColor('')
    setOnSale(false)
    setDiscountPercent('')
    setImageFile(null)
    setImagePreview(null)
    setRows([])
    setError('')
    setEditingProductId(null)
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
    if (!editingProductId && rows.length === 0) {
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

      const productPayload = {
        name: name.trim(),
        brand: brand.trim() || null,
        category_id: categoryId,
        base_price: parseFloat(basePrice),
        cost: cost ? parseFloat(cost) : 0,
        description: description.trim() || null,
        supplier: supplier.trim() || null,
        on_sale: onSale,
        discount_percent: onSale ? (parseInt(discountPercent) || 0) : 0,
      }
      if (imageUrl) productPayload.image_url = imageUrl

      if (editingProductId) {
        const { error: updErr } = await supabase.from('products').update(productPayload).eq('id', editingProductId)
        if (updErr) throw new Error('Error al actualizar producto: ' + updErr.message)
        flashSuccess(`"${name.trim()}" fue actualizado`)
      } else {
        const { data: newProduct, error: prodErr } = await supabase
          .from('products')
          .insert(productPayload)
          .select('id')
          .single()
        if (prodErr) throw new Error('Error al crear producto: ' + prodErr.message)

        const variantRows = rows.map((r) => ({
          product_id: newProduct.id,
          size: r.attr.trim() || null,
          color: r.color.trim() || null,
          sku: r.sku?.trim() || null,
          price: r.price ? parseFloat(r.price) : parseFloat(basePrice),
          stock: parseInt(r.stock) || 0,
        }))

        const { error: varErr } = await supabase.from('product_variants').insert(variantRows)
        if (varErr) throw new Error('Error al crear variantes: ' + varErr.message)
        flashSuccess(`"${name.trim()}" fue creado`)
      }

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

  const openEditProduct = (product) => {
    setEditingProductId(product.id)
    setName(product.name)
    setBrand(product.brand || '')
    setCategoryName(CATEGORY_PRESETS.some((c) => c.name === product.category) ? product.category : '__custom__')
    setCustomCategory(CATEGORY_PRESETS.some((c) => c.name === product.category) ? '' : product.category)
    setBasePrice(String(product.basePrice ?? ''))
    setCost(String(product.cost ?? ''))
    setDescription(product.description || '')
    setSupplier(product.supplier || '')
    setOnSale(!!product.onSale)
    setDiscountPercent(product.discountPercent ? String(product.discountPercent) : '')
    setImageFile(null)
    setImagePreview(product.image)
    setRows([])
    setError('')
    setShowForm(true)
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

  const friendlyDbError = (rawMessage) => {
    if (rawMessage && rawMessage.includes('foreign key constraint')) {
      return 'No se puede eliminar porque ya tiene pedidos asociados. Corré el SQL "permitir_eliminar_con_pedidos.sql" en Supabase para poder eliminarlo conservando el historial de esos pedidos.'
    }
    return rawMessage
  }

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
        setActionError('Error al eliminar variantes: ' + friendlyDbError(delVarErr.message))
        setDeleting(false)
        return
      }
      const { data: delProdData, error: delProdErr } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
        .select('id')
      if (delProdErr) {
        setActionError('Error al eliminar producto: ' + friendlyDbError(delProdErr.message))
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
        setActionError('Error al eliminar: ' + friendlyDbError(delErr.message))
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
    setNewVariantSku('')
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
      sku: newVariantSku.trim() || null,
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>
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
          <p style={styles.formTitle}>{editingProductId ? 'Editar producto' : 'Nuevo producto'}</p>
          <div style={styles.formRow}>
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Nombre del producto *</label>
              <input style={styles.input} placeholder="Ej. Camisa a cuadros" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Marca</label>
              <input style={styles.input} placeholder="Ej. Levi's, Nike, Genérico" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Categoría *</label>
              <select style={styles.input} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} disabled={!!editingProductId}>
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
              <label style={styles.fieldLabel}>Precio de venta *</label>
              <input style={styles.input} type="number" step="0.01" placeholder="0.00" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Costo de compra</label>
              <input style={styles.input} type="number" step="0.01" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.fieldLabel}>Proveedor</label>
              <input style={styles.input} placeholder="Ej. Distribuidora XYZ" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
          </div>

          {basePrice && cost && (
            <p style={styles.marginPreview}>
              {(() => {
                const p = parseFloat(basePrice) || 0
                const c = parseFloat(cost) || 0
                const gain = p - c
                const pct = p > 0 ? (gain / p) * 100 : 0
                return `Ganancia estimada: $${gain.toFixed(2)} por unidad (${pct.toFixed(0)}% de margen)`
              })()}
            </p>
          )}

          <div style={styles.saleBox}>
            <label style={styles.saleToggleRow}>
              <input
                type="checkbox"
                checked={onSale}
                onChange={(e) => setOnSale(e.target.checked)}
                style={styles.saleCheckbox}
              />
              <span style={styles.saleToggleText}>🏷️ Poner en liquidación</span>
            </label>
            {onSale && (
              <div style={styles.saleFields}>
                <div style={{ ...styles.fieldCol, maxWidth: 160 }}>
                  <label style={styles.fieldLabel}>% de descuento</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="1"
                    max="90"
                    placeholder="Ej. 20"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                  />
                </div>
                {basePrice && discountPercent && (
                  <p style={styles.salePreview}>
                    Precio normal <span style={styles.saleStrike}>${Number(basePrice).toFixed(2)}</span>
                    {' '}→ precio en liquidación{' '}
                    <b>${(Number(basePrice) * (1 - Number(discountPercent) / 100)).toFixed(2)}</b>
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.fieldCol, flex: 2 }}>
              <label style={styles.fieldLabel}>Descripción</label>
              <textarea
                style={{ ...styles.input, minHeight: 70, resize: 'vertical' }}
                placeholder="Detalles del producto: material, uso, características..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {preset.hasColor && !editingProductId && (
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

          {/* variant builder, adapted to the category — only for new products;
              editing an existing product's variants happens on its card below */}
          {!editingProductId && (
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
                  <span style={{ flex: 1 }}>SKU</span>
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
                      style={{ ...styles.rowInput, flex: 1 }}
                      placeholder="Código (opcional)"
                      value={r.sku}
                      onChange={(e) => updateRow(r.key, 'sku', e.target.value)}
                    />
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
          )}

          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.saveBtn} onClick={handleSaveProduct} disabled={saving}>
            {saving ? (uploadingImage ? 'Subiendo foto...' : 'Guardando...') : editingProductId ? 'Guardar cambios' : 'Guardar producto'}
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
                      <div style={styles.cardName}>
                        {p.name}
                        {p.brand && <span style={styles.brandBadge}>{p.brand}</span>}
                        {p.onSale && p.discountPercent > 0 && (
                          <span style={styles.saleBadge}>🏷️ -{p.discountPercent}%</span>
                        )}
                        {!p.showInStore && (
                          <span style={styles.hiddenBadge}>🚫 Oculto de la tienda</span>
                        )}
                      </div>
                      <div style={styles.cardMeta}>
                        {p.category} · {p.variants.length} variante{p.variants.length !== 1 ? 's' : ''} · Stock total: {totalStock}
                      </div>
                    </div>
                  </div>
                  <div style={styles.cardRight}>
                    {p.onSale && p.discountPercent > 0 ? (
                      <div style={styles.cardPriceSaleWrap}>
                        <div style={styles.cardPriceStrike}>${Number(p.basePrice).toFixed(2)}</div>
                        <div style={styles.cardPriceSale}>
                          ${(Number(p.basePrice) * (1 - p.discountPercent / 100)).toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <div style={styles.cardPrice}>${Number(p.basePrice).toFixed(2)}</div>
                    )}
                    <button
                      style={p.showInStore ? styles.storeToggleOn : styles.storeToggleOff}
                      disabled={togglingStoreId === p.id}
                      onClick={(e) => { e.stopPropagation(); toggleShowInStore(p) }}
                      title={p.showInStore ? 'Visible en la tienda online — clic para ocultar' : 'Oculto de la tienda online — clic para mostrar'}
                    >
                      {togglingStoreId === p.id ? '...' : p.showInStore ? '👁️ En tienda' : '🚫 Oculto'}
                    </button>
                    <span style={styles.expandIcon}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={styles.cardExpand}>
                    {(p.cost > 0 || p.supplier || p.description || p.brand) && (
                      <div style={styles.detailBox}>
                        {p.brand && (
                          <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>Marca</span>
                            <span>{p.brand}</span>
                          </div>
                        )}
                        {p.cost > 0 && (
                          <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>Costo de compra</span>
                            <span>${Number(p.cost).toFixed(2)}</span>
                          </div>
                        )}
                        {p.cost > 0 && (
                          <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>Ganancia por unidad</span>
                            <span style={styles.gainValue}>
                              ${(Number(p.basePrice) - Number(p.cost)).toFixed(2)}
                              {' '}({Number(p.basePrice) > 0 ? (((Number(p.basePrice) - Number(p.cost)) / Number(p.basePrice)) * 100).toFixed(0) : 0}%)
                            </span>
                          </div>
                        )}
                        {p.supplier && (
                          <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>Proveedor</span>
                            <span>{p.supplier}</span>
                          </div>
                        )}
                        {p.description && (
                          <div style={styles.detailDescription}>{p.description}</div>
                        )}
                      </div>
                    )}

                    <div style={styles.variantTable}>
                      {p.variants.map((v) => (
                        <div key={v.id} style={styles.variantRow}>
                          <span style={{ flex: 1 }}>
                            {[
                              v.size ? `${preset2.attrLabel}: ${v.size}` : null,
                              v.color ? `Color: ${v.color}` : null,
                              v.sku ? `SKU: ${v.sku}` : null,
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
                        <input style={styles.rowInput} placeholder="Código (opcional)" value={newVariantSku} onChange={(e) => setNewVariantSku(e.target.value)} />
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
                        <button style={styles.smallActionBtn} onClick={() => openEditProduct(p)}>
                          ✏️ Editar info
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
  container: { minHeight: '100vh', background: '#f5f4f1', color: '#0b0b0a', fontFamily: "'Inter', system-ui, sans-serif", padding: 24 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  backBtn: { background: 'transparent', color: '#726d63', border: '1px solid #e2ded5', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  title: { color: '#0b0b0a', margin: 0, fontSize: 20, fontFamily: "'Bodoni Moda', serif", letterSpacing: 0.5, fontWeight: 500 },
  addBtn: { background: '#0b0b0a', color: '#f5f4f1', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' },

  successBanner: { background: '#1e3a24', color: '#3f6b4a', border: '1px solid #2d5636', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13.5 },
  errorBanner: { background: '#3a1e1e', color: '#b5574a', border: '1px solid #d9cfc0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13.5 },

  confirmOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
  },
  confirmBox: {
    background: '#ffffff', border: '1px solid #e2ded5', borderRadius: 14, padding: 24, maxWidth: 380, width: '100%',
  },
  confirmTitle: { fontSize: 17, fontWeight: 'bold', margin: '0 0 10px', color: '#0b0b0a' },
  confirmText: { fontSize: 13.5, color: '#726d63', margin: '0 0 20px', lineHeight: 1.5 },
  confirmActions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  confirmDeleteBtn: { background: '#9c3b2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 'bold', cursor: 'pointer', fontSize: 13.5 },

  form: { background: '#ffffff', border: '1px solid #e2ded5', borderRadius: 12, padding: 20, marginBottom: 24 },
  formTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 'bold', color: '#0b0b0a' },
  marginPreview: { color: '#3f6b4a', fontSize: 12.5, margin: '-6px 0 14px', fontStyle: 'italic' },
  formRow: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  fieldCol: { flex: 1, minWidth: 160 },
  fieldLabel: { display: 'block', fontSize: 11.5, color: '#726d63', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { width: '100%', background: '#f2f0ec', color: '#0b0b0a', border: '1px solid #e2ded5', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' },

  variantBuilder: { background: '#f2f0ec', border: '1px dashed #e2ded5', borderRadius: 10, padding: 16, marginBottom: 14 },
  variantBuilderTitle: { margin: '0 0 12px', fontSize: 13.5, color: '#726d63', fontWeight: 600 },
  quickRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  quickChip: { background: '#f2f0ec', border: '1px solid #e2ded5', color: '#0b0b0a', borderRadius: 999, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
  quickChipActive: { background: '#0b0b0a', border: '1px solid #0b0b0a', color: '#f5f4f1', borderRadius: 999, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 700 },

  rowsList: { marginBottom: 10 },
  rowsHeader: { display: 'flex', gap: 8, fontSize: 11, color: '#726d63', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, padding: '0 2px' },
  rowItem: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  rowInput: { background: '#f2f0ec', color: '#0b0b0a', border: '1px solid #e2ded5', borderRadius: 7, padding: '8px 10px', fontSize: 13 },
  rowRemoveBtn: { width: 30, background: 'transparent', border: '1px solid #e2ded5', color: '#9c3b2e', borderRadius: 7, cursor: 'pointer', padding: '8px 0' },
  addRowBtn: { background: 'transparent', border: '1px solid #e2ded5', color: '#726d63', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },

  saleBox: { background: '#f2f0ec', border: '1px dashed #e2ded5', borderRadius: 10, padding: '12px 16px', marginBottom: 14 },
  saleToggleRow: { display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' },
  saleCheckbox: { width: 16, height: 16, accentColor: '#9c3b2e', cursor: 'pointer' },
  saleToggleText: { fontSize: 13.5, fontWeight: 600, color: '#0b0b0a' },
  saleFields: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2ded5' },
  salePreview: { fontSize: 12.5, color: '#9c3b2e', margin: '10px 0 0', fontStyle: 'italic' },
  saleStrike: { textDecoration: 'line-through', color: '#726d63', fontStyle: 'normal' },
  saleBadge: {
    marginLeft: 8, background: '#9c3b2e', color: '#ffffff', fontSize: 10.5, fontWeight: 700,
    borderRadius: 999, padding: '2px 9px', verticalAlign: 'middle',
  },
  brandBadge: {
    marginLeft: 8, background: '#f2f0ec', color: '#726d63', fontSize: 10.5, fontWeight: 700,
    borderRadius: 999, padding: '2px 9px', verticalAlign: 'middle', border: '1px solid #e2ded5',
  },
  hiddenBadge: {
    marginLeft: 8, background: '#f5f4f1', color: '#9c3b2e', fontSize: 10.5, fontWeight: 700,
    borderRadius: 999, padding: '2px 9px', verticalAlign: 'middle', border: '1px solid #9c3b2e',
  },
  storeToggleOn: {
    background: '#E7EFE3', color: '#3f6b4a', border: '1px solid #3f6b4a', borderRadius: 999,
    padding: '5px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  storeToggleOff: {
    background: '#F7E9E6', color: '#9c3b2e', border: '1px solid #9c3b2e', borderRadius: 999,
    padding: '5px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  cardPriceSaleWrap: { textAlign: 'right' },
  cardPriceStrike: { color: '#726d63', fontSize: 12, textDecoration: 'line-through' },
  cardPriceSale: { color: '#9c3b2e', fontWeight: 'bold' },

  error: { color: '#9c3b2e', fontSize: 13, marginBottom: 12 },
  muted: { color: '#726d63' },
  saveBtn: { background: '#0b0b0a', color: '#f5f4f1', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#ffffff', border: '1px solid #e2ded5', borderRadius: 10, overflow: 'hidden' },
  cardTop: { padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 8, objectFit: 'cover' },
  thumbPlaceholder: { width: 48, height: 48, borderRadius: 8, background: '#f2f0ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  cardName: { fontWeight: 'bold', fontSize: 15 },
  cardMeta: { color: '#726d63', fontSize: 12.5, marginTop: 2 },
  cardRight: { display: 'flex', alignItems: 'center', gap: 14 },
  cardPrice: { color: '#0b0b0a', fontWeight: 'bold' },
  expandIcon: { color: '#726d63', fontSize: 11 },

  cardExpand: { padding: '4px 18px 16px', borderTop: '1px solid #e2ded5' },
  detailBox: { background: '#f2f0ec', border: '1px solid #e2ded5', borderRadius: 10, padding: '12px 14px', margin: '12px 0 4px' },
  detailRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6, color: '#726d63' },
  detailLabel: { color: '#726d63' },
  gainValue: { color: '#3f6b4a', fontWeight: 600 },
  detailDescription: { fontSize: 12.5, color: '#726d63', lineHeight: 1.5, marginTop: 6, borderTop: '1px solid #e2ded5', paddingTop: 8 },
  variantTable: { marginTop: 10, marginBottom: 12 },
  variantRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #e2ded5', fontSize: 13 },
  stockOk: { color: '#3f6b4a', width: 90 },
  stockLow: { color: '#9c3b2e', width: 90 },
  variantPrice: { color: '#0b0b0a', width: 70, fontWeight: 600 },
  deleteVariantBtn: { background: 'transparent', border: '1px solid #e2ded5', color: '#9c3b2e', borderRadius: 7, padding: '5px 10px', fontSize: 11.5, cursor: 'pointer' },

  cardActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  smallActionBtn: { background: '#f2f0ec', border: '1px solid #e2ded5', color: '#0b0b0a', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' },
  deleteProductBtn: { background: 'transparent', border: '1px solid #d9cfc0', color: '#9c3b2e', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' },

  addVariantBox: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#f2f0ec', border: '1px dashed #e2ded5', borderRadius: 10, padding: 12 },
  saveBtnSmall: { background: '#0b0b0a', color: '#f5f4f1', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },
  cancelBtnSmall: { background: 'transparent', border: '1px solid #e2ded5', color: '#726d63', borderRadius: 7, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' },

  imageUploadBox: { display: 'flex', alignItems: 'center', gap: 12 },
  imagePreview: { width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2ded5' },
  imagePlaceholder: { width: 40, height: 40, borderRadius: 8, background: '#f2f0ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#726d63', textAlign: 'center' },
  uploadLabel: { background: '#f2f0ec', color: '#0b0b0a', border: '1px solid #e2ded5', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' },
}
