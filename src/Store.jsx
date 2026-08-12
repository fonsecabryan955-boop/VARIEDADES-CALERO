import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'

// ---------- Icons (inline SVG, no extra deps) ----------
const IconBag = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 20} height={p.size || 20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8h12l-1 12H7L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
)
const IconClose = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 18} height={p.size || 18} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const IconMinus = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
)
const IconPlus = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
)
const IconChevronLeft = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
)
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 34} height={p.size || 34} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
)

// ---------- Global styles for this page only ----------
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap');

      .vc-store {
        --vc-bg: #0e0d0c;
        --vc-panel: #171512;
        --vc-panel-raised: #1e1b16;
        --vc-border: #2b2721;
        --vc-gold: #d4af37;
        --vc-gold-deep: #b3901f;
        --vc-cream: #f4efe4;
        --vc-muted: #9a9284;
        --vc-oxblood: #7a2e34;
        --vc-oxblood-bright: #a8434b;
        --vc-green: #6fae74;
        --vc-red: #e0685f;
        min-height: 100vh;
        background: var(--vc-bg);
        color: var(--vc-cream);
        font-family: 'Inter', system-ui, sans-serif;
        position: relative;
      }
      .vc-store * { box-sizing: border-box; }
      .vc-serif { font-family: 'Fraunces', serif; }

      .vc-store a, .vc-store button, .vc-store input, .vc-store textarea {
        font-family: inherit;
      }
      .vc-store button:focus-visible,
      .vc-store input:focus-visible,
      .vc-store textarea:focus-visible,
      .vc-store [tabindex]:focus-visible {
        outline: 2px solid var(--vc-gold);
        outline-offset: 2px;
      }

      /* header */
      .vc-header {
        position: sticky;
        top: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: rgba(14,13,12,0.86);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--vc-border);
      }
      .vc-logo {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-weight: 500;
        font-size: 22px;
        color: var(--vc-gold);
        letter-spacing: 0.3px;
        margin: 0;
      }
      .vc-logo-sub {
        color: var(--vc-muted);
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .vc-cart-btn {
        position: relative;
        background: var(--vc-panel);
        border: 1px solid var(--vc-border);
        color: var(--vc-cream);
        border-radius: 999px;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: border-color .2s, transform .15s;
      }
      .vc-cart-btn:hover { border-color: var(--vc-gold); transform: translateY(-1px); }
      .vc-cart-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--vc-gold);
        color: #1a1608;
        font-size: 11px;
        font-weight: 700;
        min-width: 18px;
        height: 18px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }

      /* intro band */
      .vc-intro {
        padding: 28px 20px 8px;
        max-width: 1180px;
        margin: 0 auto;
      }
      .vc-intro h1 {
        font-family: 'Fraunces', serif;
        font-weight: 400;
        font-size: clamp(26px, 4vw, 38px);
        margin: 0 0 6px;
        color: var(--vc-cream);
      }
      .vc-intro p {
        color: var(--vc-muted);
        font-size: 14px;
        margin: 0;
      }

      /* category chips */
      .vc-chips {
        display: flex;
        gap: 8px;
        padding: 18px 20px;
        max-width: 1180px;
        margin: 0 auto;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .vc-chips::-webkit-scrollbar { display: none; }
      .vc-chip {
        flex: none;
        background: transparent;
        border: 1px solid var(--vc-border);
        color: var(--vc-muted);
        padding: 8px 16px;
        border-radius: 999px;
        font-size: 13px;
        cursor: pointer;
        transition: all .15s;
        white-space: nowrap;
      }
      .vc-chip:hover { border-color: var(--vc-gold); color: var(--vc-cream); }
      .vc-chip.active {
        background: var(--vc-gold);
        border-color: var(--vc-gold);
        color: #1a1608;
        font-weight: 600;
      }

      /* grid */
      .vc-main { max-width: 1180px; margin: 0 auto; padding: 4px 20px 80px; }
      .vc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 18px;
      }

      .vc-card {
        background: var(--vc-panel);
        border: 1px solid var(--vc-border);
        border-radius: 14px;
        overflow: hidden;
        cursor: pointer;
        transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
        display: flex;
        flex-direction: column;
      }
      .vc-card:hover {
        transform: translateY(-4px);
        border-color: #3a352b;
        box-shadow: 0 14px 30px -14px rgba(0,0,0,0.6);
      }
      .vc-card-imgwrap {
        position: relative;
        width: 100%;
        aspect-ratio: 3 / 4;
        overflow: hidden;
        background: var(--vc-panel-raised);
      }
      .vc-card-imgwrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform .5s ease;
      }
      .vc-card:hover .vc-card-imgwrap img { transform: scale(1.07); }
      .vc-card-imgwrap .vc-noimg {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        font-size: 34px; color: var(--vc-border);
      }
      .vc-card-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background: var(--vc-oxblood);
        color: var(--vc-cream);
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 0.4px;
        padding: 4px 9px;
        border-radius: 999px;
        text-transform: uppercase;
      }
      .vc-card-quick {
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 10px;
        transform: translateY(140%);
        transition: transform .25s ease;
      }
      .vc-card:hover .vc-card-quick { transform: translateY(0); }
      .vc-quick-btn {
        width: 100%;
        background: var(--vc-cream);
        color: #17140f;
        border: none;
        border-radius: 8px;
        padding: 9px 0;
        font-weight: 600;
        font-size: 12.5px;
        cursor: pointer;
        letter-spacing: 0.2px;
      }
      .vc-quick-btn:hover { background: var(--vc-gold); }

      .vc-card-body { padding: 12px 13px 14px; }
      .vc-card-cat { color: var(--vc-muted); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 3px; }
      .vc-card-name {
        font-size: 14.5px;
        font-weight: 500;
        margin: 0 0 6px;
        line-height: 1.3;
        background-image: linear-gradient(var(--vc-gold), var(--vc-gold));
        background-position: 0 100%;
        background-repeat: no-repeat;
        background-size: 0% 1px;
        transition: background-size .3s ease;
        display: inline;
      }
      .vc-card:hover .vc-card-name { background-size: 100% 1px; }
      .vc-card-price { color: var(--vc-gold); font-weight: 700; font-size: 14px; }

      .vc-skeleton {
        background: var(--vc-panel);
        border: 1px solid var(--vc-border);
        border-radius: 14px;
        overflow: hidden;
      }
      .vc-skeleton-img {
        width: 100%; aspect-ratio: 3/4;
        background: linear-gradient(90deg, var(--vc-panel) 25%, var(--vc-panel-raised) 37%, var(--vc-panel) 63%);
        background-size: 400% 100%;
        animation: vc-shimmer 1.4s ease infinite;
      }
      @keyframes vc-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

      .vc-empty { text-align: center; padding: 60px 20px; color: var(--vc-muted); }

      /* overlay shared */
      .vc-overlay {
        position: fixed; inset: 0;
        background: rgba(5,5,4,0.72);
        backdrop-filter: blur(2px);
        z-index: 40;
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease;
      }
      .vc-overlay.open { opacity: 1; pointer-events: auto; }

      /* product modal */
      .vc-modal {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -46%) scale(0.97);
        width: min(760px, 92vw);
        max-height: 88vh;
        overflow: auto;
        background: var(--vc-panel);
        border: 1px solid var(--vc-border);
        border-radius: 16px;
        z-index: 41;
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease, transform .25s ease;
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .vc-modal.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
      .vc-modal-imgwrap { background: var(--vc-panel-raised); aspect-ratio: 1; }
      .vc-modal-imgwrap img { width: 100%; height: 100%; object-fit: cover; }
      .vc-modal-imgwrap .vc-noimg { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: var(--vc-border); }
      .vc-modal-body { padding: 26px 26px 22px; position: relative; display: flex; flex-direction: column; }
      .vc-modal-close {
        position: absolute; top: 16px; right: 16px;
        background: var(--vc-panel-raised); border: 1px solid var(--vc-border);
        color: var(--vc-cream); border-radius: 999px; width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .vc-modal-cat { color: var(--vc-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
      .vc-modal-name { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 500; margin: 0 0 10px; padding-right: 30px; }
      .vc-modal-price { color: var(--vc-gold); font-size: 19px; font-weight: 700; margin-bottom: 18px; }
      .vc-attr-label { font-size: 12px; color: var(--vc-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
      .vc-chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
      .vc-variant-chip {
        border: 1px solid var(--vc-border);
        background: var(--vc-panel-raised);
        color: var(--vc-cream);
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
        cursor: pointer;
        transition: all .15s;
      }
      .vc-variant-chip:hover { border-color: var(--vc-gold); }
      .vc-variant-chip.active { border-color: var(--vc-gold); background: var(--vc-gold); color: #1a1608; font-weight: 600; }
      .vc-variant-chip.disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
      .vc-stock-note { font-size: 12.5px; margin-bottom: 18px; }
      .vc-stock-note.low { color: var(--vc-oxblood-bright); }
      .vc-stock-note.ok { color: var(--vc-green); }

      .vc-qty-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
      .vc-stepper { display: flex; align-items: center; border: 1px solid var(--vc-border); border-radius: 8px; overflow: hidden; }
      .vc-stepper button {
        background: var(--vc-panel-raised); border: none; color: var(--vc-cream);
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .vc-stepper button:hover:not(:disabled) { color: var(--vc-gold); }
      .vc-stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
      .vc-stepper span { width: 34px; text-align: center; font-size: 14px; }

      .vc-btn-primary {
        background: var(--vc-gold);
        color: #1a1608;
        border: none;
        border-radius: 9px;
        padding: 13px 0;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        width: 100%;
        transition: background .15s, transform .1s;
        margin-top: auto;
      }
      .vc-btn-primary:hover:not(:disabled) { background: var(--vc-gold-deep); }
      .vc-btn-primary:active:not(:disabled) { transform: scale(0.99); }
      .vc-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

      .vc-btn-ghost {
        background: transparent;
        border: 1px solid var(--vc-border);
        color: var(--vc-muted);
        border-radius: 9px;
        padding: 12px 0;
        font-size: 13px;
        cursor: pointer;
        width: 100%;
        margin-top: 10px;
        display: flex; align-items: center; justify-content: center; gap: 6px;
      }
      .vc-btn-ghost:hover { border-color: var(--vc-gold); color: var(--vc-cream); }

      /* cart drawer */
      .vc-drawer {
        position: fixed;
        top: 0; right: 0;
        height: 100vh;
        width: min(420px, 100vw);
        background: var(--vc-panel);
        border-left: 1px solid var(--vc-border);
        z-index: 42;
        transform: translateX(100%);
        transition: transform .3s cubic-bezier(.4,0,.2,1);
        display: flex;
        flex-direction: column;
      }
      .vc-drawer.open { transform: translateX(0); }
      .vc-drawer-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px; border-bottom: 1px solid var(--vc-border);
      }
      .vc-drawer-head h3 { font-family: 'Fraunces', serif; font-weight: 500; margin: 0; font-size: 19px; }
      .vc-drawer-items { flex: 1; overflow-y: auto; padding: 14px 20px; }
      .vc-drawer-empty { color: var(--vc-muted); text-align: center; padding: 60px 10px; font-size: 14px; }
      .vc-drawer-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--vc-border); }
      .vc-drawer-item img, .vc-drawer-item .vc-noimg {
        width: 58px; height: 58px; border-radius: 8px; object-fit: cover; background: var(--vc-panel-raised);
        display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--vc-border); flex: none;
      }
      .vc-drawer-item-info { flex: 1; min-width: 0; }
      .vc-drawer-item-name { font-size: 13.5px; font-weight: 500; margin-bottom: 2px; }
      .vc-drawer-item-variant { font-size: 12px; color: var(--vc-muted); margin-bottom: 6px; }
      .vc-drawer-item-row { display: flex; align-items: center; justify-content: space-between; }
      .vc-drawer-item-remove { background: none; border: none; color: var(--vc-muted); font-size: 11.5px; cursor: pointer; text-decoration: underline; padding: 0; }
      .vc-drawer-item-remove:hover { color: var(--vc-red); }
      .vc-drawer-foot { padding: 18px 20px 22px; border-top: 1px solid var(--vc-border); }
      .vc-drawer-total { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 14px; }
      .vc-drawer-total b { color: var(--vc-gold); font-size: 18px; }

      /* checkout */
      .vc-checkout-wrap { max-width: 1180px; margin: 0 auto; padding: 30px 20px 80px; display: flex; justify-content: center; }
      .vc-checkout-box { width: 100%; max-width: 460px; }
      .vc-steps-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 26px; }
      .vc-step-dot {
        display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--vc-muted);
      }
      .vc-step-num {
        width: 22px; height: 22px; border-radius: 999px; border: 1px solid var(--vc-border);
        display: flex; align-items: center; justify-content: center; font-size: 11px; flex: none;
      }
      .vc-step-dot.active .vc-step-num { background: var(--vc-gold); border-color: var(--vc-gold); color: #1a1608; font-weight: 700; }
      .vc-step-dot.active { color: var(--vc-cream); }
      .vc-step-line { flex: 1; height: 1px; background: var(--vc-border); }

      .vc-panel-card { background: var(--vc-panel); border: 1px solid var(--vc-border); border-radius: 14px; padding: 24px; }
      .vc-field-label { font-size: 12px; color: var(--vc-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
      .vc-input {
        width: 100%;
        background: var(--vc-panel-raised);
        color: var(--vc-cream);
        border: 1px solid var(--vc-border);
        border-radius: 9px;
        padding: 11px 13px;
        font-size: 14px;
        margin-bottom: 14px;
        box-sizing: border-box;
        transition: border-color .15s;
      }
      .vc-input::placeholder { color: #6b6558; }
      .vc-input:focus { border-color: var(--vc-gold); outline: none; }

      .vc-summary { background: var(--vc-bg); border-radius: 10px; padding: 14px; margin: 16px 0; }
      .vc-summary-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: var(--vc-muted); }
      .vc-summary-row.total { color: var(--vc-cream); font-weight: 700; border-top: 1px solid var(--vc-border); padding-top: 8px; margin-top: 8px; }
      .vc-summary-row.total b { color: var(--vc-gold); font-size: 16px; }

      .vc-error { color: var(--vc-red); font-size: 13px; margin-bottom: 12px; }

      .vc-confirm-wrap { text-align: center; }
      .vc-confirm-icon {
        width: 64px; height: 64px; border-radius: 999px; background: rgba(111,174,116,0.12);
        color: var(--vc-green); display: flex; align-items: center; justify-content: center;
        margin: 6px auto 18px;
      }
      .vc-account-card {
        background: var(--vc-bg); border: 1px solid var(--vc-border); border-radius: 10px;
        padding: 14px; margin-top: 10px; font-size: 13.5px; line-height: 1.7; text-align: left;
      }
      .vc-upload-label {
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--vc-panel-raised); border: 1px solid var(--vc-border); color: var(--vc-cream);
        border-radius: 9px; padding: 11px 18px; font-size: 13px; cursor: pointer; margin-bottom: 12px;
      }
      .vc-upload-label:hover { border-color: var(--vc-gold); }
      .vc-proof-preview { width: 100%; max-width: 220px; border-radius: 10px; margin: 0 auto 12px; display: block; }

      @media (prefers-reduced-motion: reduce) {
        .vc-store *, .vc-store *::before, .vc-store *::after {
          animation-duration: 0.001ms !important;
          transition-duration: 0.001ms !important;
        }
      }

      @media (max-width: 680px) {
        .vc-modal {
          grid-template-columns: 1fr;
          width: 100vw; height: 100vh; max-height: 100vh;
          top: 0; left: 0; transform: translate(0, 4%);
          border-radius: 0;
        }
        .vc-modal.open { transform: translate(0,0); }
        .vc-modal-imgwrap { aspect-ratio: 4/3; }
        .vc-drawer { width: 100vw; }
      }
    `}</style>
  )
}

export default function Store() {
  const [rawVariants, setRawVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Todos')

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalVariantId, setModalVariantId] = useState(null)
  const [modalQty, setModalQty] = useState(1)

  const [cart, setCart] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [step, setStep] = useState('catalog') // catalog | checkout | confirmed
  const [accounts, setAccounts] = useState([])

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState(null)
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [proofUploaded, setProofUploaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('product_variants')
        .select('id, size, color, stock, price, product_id, products(name, base_price, image_url, categories(name))')
        .gt('stock', 0)
        .order('created_at', { ascending: false })
      setRawVariants(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Makes /tienda installable as its own app (separate icon, name and start
  // screen from the admin panel), by swapping the manifest + title/theme
  // tags that live in index.html for tienda-specific ones at runtime.
  useEffect(() => {
    document.title = 'Variedades Calero — Tienda'

    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`)
      if (!el) {
        el = document.createElement('link')
        el.rel = rel
        document.head.appendChild(el)
      }
      el.href = href
    }
    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.name = name
        document.head.appendChild(el)
      }
      el.content = content
    }

    setLink('manifest', '/tienda-manifest.json')
    setMeta('theme-color', '#0e0d0c')
    setMeta('apple-mobile-web-app-title', 'Var. Calero')
  }, [])

  // group variants into products
  const products = useMemo(() => {
    const map = new Map()
    rawVariants.forEach((v) => {
      const pid = v.product_id
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: v.products?.name || 'Producto',
          image: v.products?.image_url || null,
          category: v.products?.categories?.name || 'Otros',
          basePrice: v.products?.base_price,
          variants: [],
        })
      }
      map.get(pid).variants.push({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        price: v.price ?? v.products?.base_price ?? 0,
      })
    })
    return Array.from(map.values())
  }, [rawVariants])

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category))
    return ['Todos', ...Array.from(set)]
  }, [products])

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'Todos') return products
    return products.filter((p) => p.category === activeCategory)
  }, [products, activeCategory])

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

  const variantLabel = (v) => [v.size ? `Talla ${v.size}` : null, v.color || null].filter(Boolean).join(' · ') || 'Único'

  const priceDisplay = (product) => {
    const prices = product.variants.map((v) => v.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    if (min === max) return `$${min.toFixed(2)}`
    return `Desde $${min.toFixed(2)}`
  }

  const totalStock = (product) => product.variants.reduce((s, v) => s + v.stock, 0)

  // ---------- modal ----------
  const openProduct = (product) => {
    setSelectedProduct(product)
    const firstAvailable = product.variants.find((v) => v.stock > 0) || product.variants[0]
    setModalVariantId(firstAvailable?.id ?? null)
    setModalQty(1)
  }
  const closeProduct = () => setSelectedProduct(null)

  const activeModalVariant = selectedProduct?.variants.find((v) => v.id === modalVariantId)

  const addToCart = (product, variant, qty) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === variant.id)
      if (existing) {
        const nextQty = Math.min(existing.qty + qty, variant.stock)
        return prev.map((i) => (i.id === variant.id ? { ...i, qty: nextQty } : i))
      }
      return [
        ...prev,
        {
          id: variant.id,
          productId: product.id,
          name: product.name,
          image: product.image,
          variantLabel: variantLabel(variant),
          price: variant.price,
          qty: Math.min(qty, variant.stock),
          stock: variant.stock,
        },
      ]
    })
    setDrawerOpen(true)
  }

  const quickAdd = (product) => {
    if (product.variants.length === 1) {
      addToCart(product, product.variants[0], 1)
    } else {
      openProduct(product)
    }
  }

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.min(Math.max(i.qty + delta, 0), i.stock) } : i)).filter((i) => i.qty > 0)
    )
  }
  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.id !== id))

  const goToCheckout = async () => {
    const { data } = await supabase.from('payment_accounts').select('*').eq('active', true)
    setAccounts(data || [])
    setDrawerOpen(false)
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
      unit_price: i.price,
      subtotal: i.price * i.qty,
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(items)

    if (itemsErr) {
      setError('Error al guardar los artículos: ' + itemsErr.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setCreatedOrderId(order.id)
    setStep('confirmed')
  }

  const handleProofChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
  }

  const handleUploadProof = async () => {
    if (!proofFile || !createdOrderId) return
    setUploadingProof(true)
    setError('')

    const fileExt = proofFile.name.split('.').pop()
    const fileName = `${createdOrderId}-${Date.now()}.${fileExt}`

    const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(fileName, proofFile)

    if (uploadErr) {
      setError('Error al subir el comprobante: ' + uploadErr.message)
      setUploadingProof(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName)

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ payment_proof_url: publicUrlData.publicUrl })
      .eq('id', createdOrderId)

    if (updateErr) {
      setError('Error al guardar el comprobante: ' + updateErr.message)
      setUploadingProof(false)
      return
    }

    setUploadingProof(false)
    setProofUploaded(true)
  }

  // ---------- render ----------

  if (step === 'confirmed') {
    return (
      <div className="vc-store">
        <GlobalStyle />
        <div className="vc-checkout-wrap">
          <div className="vc-checkout-box vc-confirm-wrap">
            <p className="vc-logo" style={{ marginBottom: 22 }}>Variedades Calero</p>
            <div className="vc-confirm-icon"><IconCheck /></div>
            <h2 className="vc-serif" style={{ fontWeight: 500, margin: '0 0 8px' }}>¡Pedido recibido!</h2>
            <p style={{ color: 'var(--vc-muted)', fontSize: 14 }}>
              Gracias {clientName.split(' ')[0]}, tu pedido por <b style={{ color: 'var(--vc-gold)' }}>${total.toFixed(2)}</b> fue registrado.
            </p>

            <div className="vc-panel-card" style={{ marginTop: 20, textAlign: 'left' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Para confirmar tu compra, transferí a:</p>
              {accounts.map((a) => (
                <div key={a.id} className="vc-account-card">
                  <div><b>{a.bank}</b> ({a.currency})</div>
                  <div>Cuenta: {a.account_number}</div>
                  <div>Titular: {a.account_holder}</div>
                </div>
              ))}

              {proofUploaded ? (
                <p style={{ color: 'var(--vc-green)', fontWeight: 600, marginTop: 14, fontSize: 13.5 }}>
                  ✅ Comprobante recibido. ¡Gracias! Vamos a confirmar tu pago pronto.
                </p>
              ) : (
                <div style={{ marginTop: 16, borderTop: '1px dashed var(--vc-border)', paddingTop: 16, textAlign: 'center' }}>
                  <p style={{ color: 'var(--vc-muted)', fontSize: 13, marginBottom: 10 }}>
                    Subí la foto o captura del comprobante de tu transferencia acá mismo:
                  </p>
                  {proofPreview && <img src={proofPreview} alt="comprobante" className="vc-proof-preview" />}
                  <label className="vc-upload-label">
                    {proofFile ? 'Cambiar foto' : '📎 Subir comprobante'}
                    <input type="file" accept="image/*" onChange={handleProofChange} style={{ display: 'none' }} />
                  </label>
                  {error && <p className="vc-error">{error}</p>}
                  {proofFile && (
                    <button className="vc-btn-primary" onClick={handleUploadProof} disabled={uploadingProof}>
                      {uploadingProof ? 'Subiendo...' : 'Enviar comprobante'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button className="vc-btn-ghost" onClick={() => window.location.reload()}>
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'checkout') {
    return (
      <div className="vc-store">
        <GlobalStyle />
        <div className="vc-checkout-wrap">
          <div className="vc-checkout-box">
            <div className="vc-steps-bar">
              <div className="vc-step-dot active"><span className="vc-step-num">✓</span>Carrito</div>
              <div className="vc-step-line" />
              <div className="vc-step-dot active"><span className="vc-step-num">2</span>Entrega</div>
              <div className="vc-step-line" />
              <div className="vc-step-dot"><span className="vc-step-num">3</span>Pago</div>
            </div>

            <div className="vc-panel-card">
              <h2 className="vc-serif" style={{ fontWeight: 500, marginTop: 0, fontSize: 21 }}>Datos de entrega</h2>
              <label className="vc-field-label">Nombre completo *</label>
              <input className="vc-input" placeholder="Ej. María Pérez" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              <label className="vc-field-label">Teléfono / WhatsApp *</label>
              <input className="vc-input" placeholder="Ej. 8888 8888" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              <label className="vc-field-label">Dirección de entrega</label>
              <input className="vc-input" placeholder="Barrio, referencia..." value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
              <label className="vc-field-label">Notas (opcional)</label>
              <textarea className="vc-input" style={{ minHeight: 70, resize: 'vertical' }} placeholder="Instrucciones adicionales" value={notes} onChange={(e) => setNotes(e.target.value)} />

              <div className="vc-summary">
                {cart.map((i) => (
                  <div key={i.id} className="vc-summary-row">
                    <span>{i.name} ({i.variantLabel}) x{i.qty}</span>
                    <span>${(i.price * i.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="vc-summary-row total">
                  <span>Total</span>
                  <b>${total.toFixed(2)}</b>
                </div>
              </div>

              {error && <p className="vc-error">{error}</p>}

              <button className="vc-btn-primary" onClick={handleSubmitOrder} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Confirmar pedido'}
              </button>
              <button className="vc-btn-ghost" onClick={() => setStep('catalog')}>
                <IconChevronLeft size={14} /> Volver al catálogo
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vc-store">
      <GlobalStyle />

      <header className="vc-header">
        <div>
          <p className="vc-logo">Variedades Calero</p>
          <p className="vc-logo-sub">Tienda online</p>
        </div>
        <button className="vc-cart-btn" onClick={() => setDrawerOpen(true)} aria-label="Ver carrito">
          <IconBag />
          {cartCount > 0 && <span className="vc-cart-badge">{cartCount}</span>}
        </button>
      </header>

      <div className="vc-intro">
        <h1>Ropa y variedades para vos</h1>
        <p>Elegí tus prendas favoritas, agregalas al carrito y coordinamos la entrega.</p>
      </div>

      {categories.length > 1 && (
        <div className="vc-chips">
          {categories.map((c) => (
            <button key={c} className={`vc-chip ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <main className="vc-main">
        {loading ? (
          <div className="vc-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="vc-skeleton">
                <div className="vc-skeleton-img" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="vc-empty">No hay productos disponibles en esta categoría por ahora.</div>
        ) : (
          <div className="vc-grid">
            {filteredProducts.map((p) => (
              <div key={p.id} className="vc-card" onClick={() => openProduct(p)}>
                <div className="vc-card-imgwrap">
                  {p.image ? <img src={p.image} alt={p.name} /> : <div className="vc-noimg">📦</div>}
                  {totalStock(p) <= 5 && <span className="vc-card-badge">Últimas unidades</span>}
                  <div className="vc-card-quick">
                    <button
                      className="vc-quick-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        quickAdd(p)
                      }}
                    >
                      {p.variants.length === 1 ? 'Agregar al carrito' : 'Elegir opciones'}
                    </button>
                  </div>
                </div>
                <div className="vc-card-body">
                  <div className="vc-card-cat">{p.category}</div>
                  <p className="vc-card-name">{p.name}</p>
                  <div className="vc-card-price">{priceDisplay(p)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* product modal */}
      <div className={`vc-overlay ${selectedProduct ? 'open' : ''}`} onClick={closeProduct} />
      {selectedProduct && (
        <div className={`vc-modal ${selectedProduct ? 'open' : ''}`}>
          <div className="vc-modal-imgwrap">
            {selectedProduct.image ? <img src={selectedProduct.image} alt={selectedProduct.name} /> : <div className="vc-noimg">📦</div>}
          </div>
          <div className="vc-modal-body">
            <button className="vc-modal-close" onClick={closeProduct} aria-label="Cerrar"><IconClose /></button>
            <div className="vc-modal-cat">{selectedProduct.category}</div>
            <h2 className="vc-modal-name">{selectedProduct.name}</h2>
            <div className="vc-modal-price">
              {activeModalVariant ? `$${activeModalVariant.price.toFixed(2)}` : priceDisplay(selectedProduct)}
            </div>

            {selectedProduct.variants.length > 1 && (
              <>
                <div className="vc-attr-label">Elegí una opción</div>
                <div className="vc-chip-row">
                  {selectedProduct.variants.map((v) => (
                    <button
                      key={v.id}
                      className={`vc-variant-chip ${modalVariantId === v.id ? 'active' : ''} ${v.stock === 0 ? 'disabled' : ''}`}
                      onClick={() => v.stock > 0 && (setModalVariantId(v.id), setModalQty(1))}
                      disabled={v.stock === 0}
                    >
                      {variantLabel(v)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeModalVariant && (
              <p className={`vc-stock-note ${activeModalVariant.stock <= 5 ? 'low' : 'ok'}`}>
                {activeModalVariant.stock <= 5 ? `Solo quedan ${activeModalVariant.stock} disponibles` : 'Disponible'}
              </p>
            )}

            <div className="vc-qty-row">
              <div className="vc-attr-label" style={{ margin: 0 }}>Cantidad</div>
              <div className="vc-stepper">
                <button onClick={() => setModalQty((q) => Math.max(1, q - 1))} disabled={modalQty <= 1}><IconMinus /></button>
                <span>{modalQty}</span>
                <button
                  onClick={() => setModalQty((q) => Math.min(activeModalVariant?.stock || 1, q + 1))}
                  disabled={!activeModalVariant || modalQty >= activeModalVariant.stock}
                >
                  <IconPlus />
                </button>
              </div>
            </div>

            <button
              className="vc-btn-primary"
              disabled={!activeModalVariant || activeModalVariant.stock === 0}
              onClick={() => {
                addToCart(selectedProduct, activeModalVariant, modalQty)
                closeProduct()
              }}
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      )}

      {/* cart drawer */}
      <div className={`vc-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`vc-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="vc-drawer-head">
          <h3>Tu carrito</h3>
          <button className="vc-modal-close" onClick={() => setDrawerOpen(false)} aria-label="Cerrar carrito"><IconClose /></button>
        </div>
        <div className="vc-drawer-items">
          {cart.length === 0 ? (
            <div className="vc-drawer-empty">Tu carrito está vacío.<br />Agregá productos del catálogo.</div>
          ) : (
            cart.map((i) => (
              <div key={i.id} className="vc-drawer-item">
                {i.image ? <img src={i.image} alt={i.name} /> : <div className="vc-noimg">📦</div>}
                <div className="vc-drawer-item-info">
                  <div className="vc-drawer-item-name">{i.name}</div>
                  <div className="vc-drawer-item-variant">{i.variantLabel}</div>
                  <div className="vc-drawer-item-row">
                    <div className="vc-stepper">
                      <button onClick={() => changeQty(i.id, -1)}><IconMinus size={12} /></button>
                      <span>{i.qty}</span>
                      <button onClick={() => changeQty(i.id, 1)} disabled={i.qty >= i.stock}><IconPlus size={12} /></button>
                    </div>
                    <span style={{ color: 'var(--vc-gold)', fontWeight: 700, fontSize: 13.5 }}>${(i.price * i.qty).toFixed(2)}</span>
                  </div>
                  <button className="vc-drawer-item-remove" onClick={() => removeItem(i.id)}>Quitar</button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="vc-drawer-foot">
            <div className="vc-drawer-total">
              <span>Total</span>
              <b>${total.toFixed(2)}</b>
            </div>
            <button className="vc-btn-primary" onClick={goToCheckout}>Continuar pedido</button>
          </div>
        )}
      </div>
    </div>
  )
}
