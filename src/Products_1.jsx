import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Products({ onBack }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [stock, setStock] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('product_variants')
      .select('id, size, color, stock, sku, product_id, products(name, base_price, image_url, category_id, categories(name))')
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const resetForm = () => {
    setName('')
    setCategory('')
    setPrice('')
    setSize('')
    setColor('')
    setStock('')
    setImageFile(null)
    setImagePreview(null)
    setError('')
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!name.trim() || !price) {
      setError('Nombre y precio son obligatorios')
      return
    }
    setSaving(true)
    setError('')

    let categoryId = null
    if (category.trim()) {
      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', category.trim())
        .maybeSingle()

      if (existingCat) {
        categoryId = existingCat.id
      } else {
        const { data: newCat, error: catErr } = await supabase
          .from('categories')
          .insert({ name: category.trim() })
          .select('id')
          .single()
        if (catErr) {
          setError('Error al crear categoría: ' + catErr.message)
          setSaving(false)
          return
        }
        categoryId = newCat.id
      }
    }

    let imageUrl = null
    if (imageFile) {
      setUploadingImage(true)
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageFile)

      if (uploadErr) {
        setError('Error al subir la foto: ' + uploadErr.message)
        setUploadingImage(false)
        setSaving(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)
      imageUrl = publicUrlData.publicUrl
      setUploadingImage(false)
    }

    const { data: newProduct, error: prodErr } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        category_id: categoryId,
        base_price: parseFloat(price),
        image_url: imageUrl,
      })
      .select('id')
      .single()

    if (prodErr) {
      setError('Error al crear producto: ' + prodErr.message)
      setSaving(false)
      return
    }

    const { error: varErr } = await supabase.from('product_variants').insert({
      product_id: newProduct.id,
      size: size.trim() || null,
      color: color.trim() || null,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
    })

    if (varErr) {
      setError('Error al crear variante: ' + varErr.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setShowForm(false)
    resetForm()
    loadProducts()
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          ← Volver
        </button>
        <h2 style={styles.title}>Productos</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {showForm && (
        <div style={styles.form}>
          <div style={styles.formRow}>
            <input
              style={styles.input}
              placeholder="Nombre del producto *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Categoría (ej: Camisetas)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div style={styles.formRow}>
            <input
              style={styles.input}
              placeholder="Precio *"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Talla (ej: M)"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Stock inicial"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <div style={styles.formRow}>
            <div style={styles.imageUploadBox}>
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={styles.imagePreview} />
              ) : (
                <div style={styles.imagePlaceholder}>Sin foto</div>
              )}
              <label style={styles.uploadLabel}>
                {imageFile ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
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
          {products.map((v) => (
            <div key={v.id} style={styles.card}>
              <div style={styles.cardLeft}>
                {v.products?.image_url ? (
                  <img src={v.products.image_url} alt="" style={styles.thumb} />
                ) : (
                  <div style={styles.thumbPlaceholder}>📦</div>
                )}
                <div>
                  <div style={styles.cardName}>{v.products?.name}</div>
                <div style={styles.cardMeta}>
                  {v.products?.categories?.name || 'Sin categoría'}
                  {v.size ? ` · Talla ${v.size}` : ''}
                  {v.color ? ` · ${v.color}` : ''}
                </div>
                </div>
              </div>
              <div style={styles.cardRight}>
                <div style={styles.cardPrice}>${Number(v.products?.base_price).toFixed(2)}</div>
                <div style={v.stock > 0 ? styles.stockOk : styles.stockLow}>
                  Stock: {v.stock}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
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
  addBtn: {
    background: '#d4af37',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  form: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  formRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 140,
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
  },
  saveBtn: {
    background: '#d4af37',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 12,
  },
  muted: {
    color: '#777',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  card: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: 'cover',
  },
  thumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: '#242424',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  },
  imageUploadBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  imagePreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    objectFit: 'cover',
    border: '1px solid #333',
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    background: '#242424',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: '#777',
    textAlign: 'center',
  },
  uploadLabel: {
    background: '#242424',
    color: '#f5f5f5',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  cardName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  cardMeta: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  cardRight: {
    textAlign: 'right',
  },
  cardPrice: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  stockOk: {
    color: '#7fd88f',
    fontSize: 12,
  },
  stockLow: {
    color: '#ff6b6b',
    fontSize: 12,
  },
}
