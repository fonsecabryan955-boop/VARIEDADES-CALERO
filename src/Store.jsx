import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'

// ---------- Icons (inline SVG, no extra deps) ----------
const IconBag = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 20} height={p.size || 20} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8h12l-1 12H7L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
)
const IconClose = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 18} height={p.size || 18} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const IconMinus = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14" /></svg>
)
const IconPlus = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
)
const IconChevronLeft = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
)
const IconSearch = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 15} height={p.size || 15} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
const IconBell = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" /><path d="M9.5 17a2.5 2.5 0 0 0 5 0" /></svg>
)
const IconArrow = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 15} height={p.size || 15} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
)
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 30} height={p.size || 30} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
)
const IconWhatsapp = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 22} height={p.size || 22} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" />
    <path d="M12.01 2C6.486 2 2 6.486 2 12.01c0 1.98.578 3.82 1.575 5.37L2 22l4.75-1.545a9.96 9.96 0 0 0 5.26 1.505h.004c5.523 0 10.008-4.486 10.008-10.01C22.023 6.486 17.537 2 12.01 2Zm0 18.19h-.003a8.157 8.157 0 0 1-4.157-1.14l-.298-.177-3.09 1.006 1.024-3.033-.194-.31a8.146 8.146 0 0 1-1.253-4.328c0-4.51 3.664-8.175 8.175-8.175 2.184 0 4.236.852 5.78 2.398a8.12 8.12 0 0 1 2.394 5.782c0 4.51-3.665 8.175-8.175 8.175Z" />
  </svg>
)

// ---------- WhatsApp ----------
const WHATSAPP_NUMBER = '50589110148' // +505 8911 0148, sin espacios ni símbolos

function buildWhatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

// ---------- category-aware care copy for the product accordion ----------
const CARE_TEXT = {
  'Ropa': 'Lavar a mano o en ciclo delicado con agua fría. Secar a la sombra, evitar la secadora para conservar la tela.',
  'Calzado': 'Limpiar con un paño húmedo. Guardar en un lugar seco y evitar la exposición directa al sol.',
  'Perfumería': 'Conservar en un lugar fresco, lejos de la luz directa. Cerrar bien después de cada uso.',
  'Maquillaje': 'Conservar a temperatura ambiente. Evitar la exposición directa al sol y revisar la fecha de vencimiento.',
  'Accesorios': 'Guardar en un lugar seco. Evitar el contacto con perfumes o productos químicos.',
  'Artículos para el cabello': 'Seguir las instrucciones de uso del empaque. Conservar en un lugar seco.',
  default: 'Conservar en un lugar fresco y seco. Ante cualquier duda, escribinos por WhatsApp.',
}

// ---------- size charts shown as a table inside the product accordion ----------
// Only categories with a real, useful chart are listed here — everything
// else simply doesn't get a "Guía de tallas" section, since a fabricated
// chart would be worse than none.
const SIZE_GUIDES = {
  'Ropa': {
    headers: ['Talla', 'Busto (cm)', 'Cintura (cm)', 'Cadera (cm)'],
    rows: [
      ['S', '82–86', '64–68', '90–94'],
      ['M', '87–91', '69–73', '95–99'],
      ['L', '92–97', '74–79', '100–105'],
      ['XL', '98–104', '80–86', '106–112'],
    ],
    note: 'Medidas de referencia tomadas sobre el cuerpo, no sobre la prenda. Si estás entre dos tallas, te recomendamos la más grande.',
  },
  'Calzado': {
    headers: ['Talla NIC', 'Talla US', 'Largo del pie (cm)'],
    rows: [
      ['35', '5', '22.5'],
      ['36', '6', '23.1'],
      ['37', '7', '23.8'],
      ['38', '8', '24.4'],
      ['39', '9', '25.0'],
      ['40', '10', '25.6'],
    ],
    note: 'Medí tu pie descalzo, de talón a punta, al final del día. Ante la duda entre dos tallas, escribinos antes de pedir.',
  },
}

// Floating contact button, visible while browsing. Minimalist ink circle —
// matches the boutique palette instead of generic WhatsApp green branding.
function FloatingWhatsapp() {
  const message = 'Hola, tengo una consulta sobre Variedades Calero 🙂'
  return (
    <a
      className="vc-wa-float"
      href={buildWhatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
    >
      <IconWhatsapp size={21} />
    </a>
  )
}

// Running assurance strip — the page's signature element. A slow, seamless
// marquee in inverted ink, standing in for the trust badges a boutique
// would print on a garment tag: what you're buying, how it moves, how it's
// paid for. Real operational facts, not decoration.
function MarqueeBar() {
  const items = [
    'PIEZAS SELECCIONADAS CON CRITERIO',
    'PAGO POR TRANSFERENCIA BANCARIA',
    'ENTREGA COORDINADA POR WHATSAPP',
    'MASATEPE, NICARAGUA',
  ]
  const track = [...items, ...items]
  return (
    <div className="vc-marquee" aria-hidden="true">
      <div className="vc-marquee-track">
        {track.map((t, i) => (
          <span key={i} className="vc-marquee-item">
            {t}
            <span className="vc-marquee-dot">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------- Global styles for this page only ----------
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500;1,6..96,600&family=Inter:wght@400;500;600;700&display=swap');

      .vc-store {
        --vc-bg: #ffffff;
        --vc-bg-soft: #f5f4f1;
        --vc-panel: #ffffff;
        --vc-panel-raised: #f2f0ec;
        --vc-border: #e2ded5;
        --vc-line: #0b0b0a;
        --vc-ink: #0b0b0a;
        --vc-ink-soft: #726d63;
        --vc-ink-faint: #a39d8f;
        --vc-accent: #0b0b0a;
        --vc-green: #3f6b4a;
        --vc-red: #9c3b2e;
        min-height: 100vh;
        background: var(--vc-bg);
        color: var(--vc-ink);
        font-family: 'Inter', system-ui, sans-serif;
        position: relative;
        -webkit-font-smoothing: antialiased;
      }
      .vc-store * { box-sizing: border-box; }
      .vc-serif { font-family: 'Bodoni Moda', serif; }

      .vc-store a, .vc-store button, .vc-store input, .vc-store textarea, .vc-store select {
        font-family: inherit;
      }
      .vc-store button:focus-visible,
      .vc-store input:focus-visible,
      .vc-store textarea:focus-visible,
      .vc-store select:focus-visible,
      .vc-store [tabindex]:focus-visible {
        outline: 2px solid var(--vc-ink);
        outline-offset: 2px;
      }
      .vc-store button { font: inherit; }

      /* ---------- marquee (signature) ---------- */
      .vc-marquee {
        background: var(--vc-ink);
        color: #fdfcf9;
        overflow: hidden;
        white-space: nowrap;
        border-bottom: 1px solid var(--vc-ink);
      }
      .vc-marquee-track {
        display: inline-flex;
        align-items: center;
        animation: vc-marquee-scroll 26s linear infinite;
        will-change: transform;
      }
      .vc-marquee-item {
        display: inline-flex;
        align-items: center;
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 2px;
        text-transform: uppercase;
        padding: 10px 0;
      }
      .vc-marquee-dot { margin: 0 26px; font-size: 9px; opacity: 0.55; }
      @keyframes vc-marquee-scroll {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .vc-marquee-track { animation: none; }
      }

      /* ---------- header ---------- */
      .vc-header {
        position: sticky;
        top: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--vc-border);
      }
      .vc-header-left { display: flex; align-items: center; gap: 13px; }
      .vc-monogram {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid var(--vc-ink);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Bodoni Moda', serif;
        font-weight: 600;
        font-size: 12.5px;
        color: var(--vc-ink);
        flex: none;
      }
      .vc-logo {
        font-family: 'Bodoni Moda', serif;
        font-weight: 500;
        font-size: 19px;
        letter-spacing: 0.3px;
        color: var(--vc-ink);
        margin: 0;
      }
      .vc-logo-sub {
        color: var(--vc-ink-soft);
        font-size: 9.5px;
        letter-spacing: 2.2px;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .vc-cart-btn {
        position: relative;
        background: transparent;
        border: 1px solid var(--vc-ink);
        color: var(--vc-ink);
        border-radius: 0;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background .2s, color .2s;
      }
      .vc-cart-btn:hover { background: var(--vc-ink); color: #fff; }
      .vc-cart-badge {
        position: absolute;
        top: -7px;
        right: -7px;
        background: var(--vc-ink);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        min-width: 17px;
        height: 17px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        border: 1.5px solid #fff;
      }

      /* ---------- hero (asymmetric editorial split) ---------- */
      .vc-hero {
        position: relative;
        border-bottom: 1px solid var(--vc-border);
        background: var(--vc-bg-soft);
      }
      .vc-hero-grid {
        max-width: 1180px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1.5fr 1px 1fr;
        gap: 0;
        align-items: stretch;
      }
      .vc-hero-rule { background: var(--vc-border); }
      .vc-hero-main {
        padding: 76px 40px 76px 24px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .vc-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 10.5px;
        letter-spacing: 2.6px;
        text-transform: uppercase;
        color: var(--vc-ink-soft);
        font-weight: 600;
        margin-bottom: 20px;
      }
      .vc-eyebrow::before {
        content: '';
        width: 26px;
        height: 1px;
        background: var(--vc-ink-soft);
        opacity: 0.6;
      }
      .vc-hero-main h1 {
        font-family: 'Bodoni Moda', serif;
        font-weight: 400;
        font-size: clamp(38px, 6vw, 64px);
        line-height: 1.03;
        letter-spacing: -0.5px;
        margin: 0 0 22px;
        color: var(--vc-ink);
      }
      .vc-hero-main h1 em { font-style: italic; font-weight: 500; }
      .vc-hero-main p {
        color: var(--vc-ink-soft);
        font-size: 15px;
        line-height: 1.7;
        max-width: 400px;
        margin: 0 0 32px;
      }
      .vc-hero-cta {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        border: 1px solid var(--vc-ink);
        color: var(--vc-ink);
        padding: 15px 26px;
        border-radius: 0;
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        cursor: pointer;
        transition: background .2s, color .2s;
        width: fit-content;
      }
      .vc-hero-cta:hover { background: var(--vc-ink); color: #fff; }
      .vc-hero-cta svg { transition: transform .2s; }
      .vc-hero-cta:hover svg { transform: translateX(3px); }

      .vc-hero-meta {
        padding: 76px 24px 76px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 30px;
      }
      .vc-meta-item { }
      .vc-meta-label {
        font-size: 10px;
        letter-spacing: 1.6px;
        text-transform: uppercase;
        color: var(--vc-ink-faint);
        font-weight: 700;
        margin-bottom: 7px;
      }
      .vc-meta-value {
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--vc-ink);
        max-width: 260px;
      }

      /* ---------- catalog section head ---------- */
      .vc-section-head {
        max-width: 1180px;
        margin: 0 auto;
        padding: 56px 24px 6px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 10px;
      }
      .vc-section-head .vc-eyebrow { margin-bottom: 10px; }
      .vc-section-head h2 {
        font-family: 'Bodoni Moda', serif;
        font-weight: 500;
        font-size: clamp(21px, 3vw, 28px);
        margin: 0;
        color: var(--vc-ink);
      }
      .vc-section-count { color: var(--vc-ink-soft); font-size: 12px; letter-spacing: 0.3px; }

      /* ---------- toolbar: category tabs + sort ---------- */
      .vc-toolbar {
        max-width: 1180px;
        margin: 0 auto;
        padding: 20px 24px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 14px;
        border-bottom: 1px solid var(--vc-border);
      }
      .vc-chips {
        display: flex;
        gap: 22px;
        overflow-x: auto;
        scrollbar-width: none;
        flex: 1;
      }
      .vc-chips::-webkit-scrollbar { display: none; }
      .vc-chip {
        flex: none;
        background: transparent;
        border: none;
        border-bottom: 1.5px solid transparent;
        color: var(--vc-ink-soft);
        padding: 4px 0 8px;
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        cursor: pointer;
        transition: color .15s, border-color .15s;
        white-space: nowrap;
      }
      .vc-chip:hover { color: var(--vc-ink); }
      .vc-chip.active { color: var(--vc-ink); border-bottom-color: var(--vc-ink); }

      .vc-sort-wrap { display: flex; align-items: center; gap: 9px; flex: none; }
      .vc-sort-wrap label { font-size: 10.5px; color: var(--vc-ink-faint); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
      .vc-sort-select {
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--vc-border);
        color: var(--vc-ink);
        border-radius: 0;
        padding: 5px 18px 5px 0;
        font-size: 12px;
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230b0b0a' stroke-width='1.6'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right center;
        background-size: 13px;
      }
      .vc-sort-select:focus { border-bottom-color: var(--vc-ink); outline: none; }

      /* ---------- search bar ---------- */
      .vc-search-row {
        max-width: 1180px;
        margin: 0 auto;
        padding: 18px 24px 0;
      }
      .vc-search-wrap { position: relative; max-width: 380px; }
      .vc-search-icon {
        position: absolute; left: 1px; top: 50%; transform: translateY(-50%);
        color: var(--vc-ink-faint); display: flex;
      }
      .vc-search-input {
        width: 100%;
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--vc-border);
        color: var(--vc-ink);
        padding: 10px 4px 10px 24px;
        font-size: 13.5px;
        outline: none;
        transition: border-color .15s;
      }
      .vc-search-input::placeholder { color: var(--vc-ink-faint); }
      .vc-search-input:focus { border-bottom-color: var(--vc-ink); }

      /* ---------- sold out / notify me ---------- */
      .vc-card.vc-soldout .vc-card-imgwrap img { filter: grayscale(0.75); opacity: 0.55; }
      .vc-soldout-badge {
        position: absolute; top: 0; left: 0; z-index: 1;
        background: var(--vc-ink); color: #fdfcf9;
        font-size: 9.5px; font-weight: 700; letter-spacing: 1px;
        padding: 6px 11px; text-transform: uppercase;
      }
      .vc-card-addbar.vc-notify { background: var(--vc-ink-soft); }
      .vc-modal-soldout-note {
        font-size: 11.5px; color: var(--vc-ink-soft); margin-bottom: 22px; letter-spacing: 0.2px;
      }
      .vc-btn-notify {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        background: transparent;
        border: 1px solid var(--vc-ink);
        color: var(--vc-ink);
        border-radius: 0;
        padding: 15px 0;
        font-weight: 700;
        font-size: 11.5px;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        cursor: pointer;
        width: 100%;
        transition: background .15s, color .15s;
        margin-top: auto;
        text-decoration: none;
      }
      .vc-btn-notify:hover { background: var(--vc-ink); color: #fff; }

      /* ---------- size guide table ---------- */
      .vc-size-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      .vc-size-table th, .vc-size-table td {
        text-align: left; padding: 7px 8px; font-size: 12px; border-bottom: 1px solid var(--vc-border);
      }
      .vc-size-table th { color: var(--vc-ink-faint); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; }
      .vc-size-note { font-size: 11.5px; color: var(--vc-ink-soft); margin-top: 10px; line-height: 1.5; }

      /* ---------- related products ---------- */
      .vc-related { margin-top: 30px; border-top: 1px solid var(--vc-border); padding-top: 22px; }
      .vc-related-title { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700; color: var(--vc-ink-faint); margin-bottom: 14px; }
      .vc-related-scroll { display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
      .vc-related-scroll::-webkit-scrollbar { display: none; }
      .vc-related-card {
        flex: none; width: 118px; cursor: pointer; background: none; border: none; padding: 0; text-align: left;
      }
      .vc-related-imgwrap { width: 118px; height: 148px; background: var(--vc-panel-raised); overflow: hidden; margin-bottom: 8px; }
      .vc-related-imgwrap img { width: 100%; height: 100%; object-fit: cover; }
      .vc-related-name { font-family: 'Bodoni Moda', serif; font-size: 12.5px; line-height: 1.3; color: var(--vc-ink); margin-bottom: 3px; }
      .vc-related-price { font-size: 11.5px; color: var(--vc-ink-soft); }

      /* ---------- grid ---------- */
      .vc-main { max-width: 1180px; margin: 0 auto; padding: 12px 24px 96px; }
      .vc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 40px 22px;
      }
      .vc-grid .vc-card {
        opacity: 0;
        animation: vc-card-in .55s ease forwards;
      }
      @keyframes vc-card-in {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .vc-grid .vc-card:nth-child(1) { animation-delay: .02s; }
      .vc-grid .vc-card:nth-child(2) { animation-delay: .06s; }
      .vc-grid .vc-card:nth-child(3) { animation-delay: .10s; }
      .vc-grid .vc-card:nth-child(4) { animation-delay: .14s; }
      .vc-grid .vc-card:nth-child(5) { animation-delay: .18s; }
      .vc-grid .vc-card:nth-child(6) { animation-delay: .22s; }
      .vc-grid .vc-card:nth-child(7) { animation-delay: .26s; }
      .vc-grid .vc-card:nth-child(8) { animation-delay: .30s; }
      .vc-grid .vc-card:nth-child(n+9) { animation-delay: .32s; }

      .vc-card {
        background: transparent;
        border: none;
        border-radius: 0;
        overflow: visible;
        cursor: pointer;
        display: flex;
        flex-direction: column;
      }
      .vc-card-imgwrap {
        position: relative;
        width: 100%;
        aspect-ratio: 4 / 5;
        overflow: hidden;
        background: var(--vc-panel-raised);
      }
      .vc-card-imgwrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform .7s ease;
      }
      @media (hover: hover) {
        .vc-card:hover .vc-card-imgwrap img { transform: scale(1.04); }
      }
      .vc-card-imgwrap .vc-noimg {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        font-size: 30px; color: var(--vc-border);
      }
      .vc-card-badge {
        position: absolute;
        top: 0;
        left: 0;
        background: var(--vc-bg);
        color: var(--vc-ink);
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 1px;
        padding: 6px 11px;
        border-radius: 0;
        text-transform: uppercase;
        border: 1px solid var(--vc-border);
      }
      .vc-card-sale-badge {
        position: absolute;
        top: 0;
        left: 0;
        background: var(--vc-red);
        color: #fff;
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.6px;
        padding: 6px 11px;
        border-radius: 0;
        text-transform: uppercase;
      }
      .vc-card-price-strike {
        color: var(--vc-ink-faint);
        text-decoration: line-through;
        font-size: 12px;
        margin-right: 7px;
        font-weight: 400;
      }
      .vc-card-price-sale { color: var(--vc-red); }
      .vc-modal-sale-badge {
        display: inline-block;
        margin-left: 8px;
        background: var(--vc-red);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.4px;
        padding: 3px 9px;
        border-radius: 0;
        text-transform: uppercase;
        vertical-align: middle;
      }
      .vc-modal-price-strike {
        color: var(--vc-ink-faint);
        text-decoration: line-through;
        font-size: 15px;
        margin-right: 8px;
        font-weight: 400;
      }
      .vc-modal-price-sale { color: var(--vc-red); }

      /* slide-up add bar (desktop hover / always-on touch) */
      .vc-card-addbar {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        background: var(--vc-ink);
        color: #fdfcf9;
        text-align: center;
        padding: 13px 8px;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 1.1px;
        text-transform: uppercase;
        cursor: pointer;
        transform: translateY(100%);
        transition: transform .3s cubic-bezier(.4,0,.2,1);
      }
      @media (hover: hover) {
        .vc-card:hover .vc-card-addbar { transform: translateY(0); }
      }
      @media (hover: none) {
        .vc-card-addbar {
          position: static;
          transform: none;
          margin-top: 10px;
          background: transparent;
          color: var(--vc-ink);
          border: 1px solid var(--vc-ink);
          padding: 10px 8px;
        }
      }

      .vc-card-body { padding: 16px 1px 0; }
      .vc-card-cat { color: var(--vc-ink-faint); font-size: 9.5px; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 5px; font-weight: 600; }
      .vc-card-name {
        font-family: 'Bodoni Moda', serif;
        font-size: 16px;
        font-weight: 500;
        margin: 0 0 7px;
        line-height: 1.28;
        color: var(--vc-ink);
      }
      .vc-card-price { color: var(--vc-ink); font-weight: 600; font-size: 13px; letter-spacing: 0.2px; }

      .vc-skeleton {
        background: var(--vc-panel-raised);
        overflow: hidden;
      }
      .vc-skeleton-img {
        width: 100%; aspect-ratio: 4/5;
        background: linear-gradient(90deg, var(--vc-panel-raised) 25%, #e9e5da 37%, var(--vc-panel-raised) 63%);
        background-size: 400% 100%;
        animation: vc-shimmer 1.4s ease infinite;
      }
      @keyframes vc-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

      .vc-empty { text-align: center; padding: 70px 20px; color: var(--vc-ink-soft); font-size: 13.5px; }

      /* ---------- overlay shared ---------- */
      .vc-overlay {
        position: fixed; inset: 0;
        background: rgba(11,11,10,0.45);
        z-index: 40;
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease;
      }
      .vc-overlay.open { opacity: 1; pointer-events: auto; }

      /* ---------- product modal ---------- */
      .vc-modal {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -46%) scale(0.98);
        width: min(820px, 94vw);
        max-height: 90vh;
        overflow: auto;
        background: var(--vc-panel);
        border: 1px solid var(--vc-border);
        border-radius: 0;
        z-index: 41;
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease, transform .25s ease;
        display: grid;
        grid-template-columns: 1.1fr 1fr;
      }
      .vc-modal.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
      .vc-modal-imgwrap { background: var(--vc-panel-raised); aspect-ratio: 4/5; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .vc-modal-imgwrap img { width: 100%; height: 100%; object-fit: cover; }
      .vc-modal-imgwrap .vc-noimg { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 44px; color: var(--vc-border); }
      .vc-modal-body { padding: 34px 34px 28px; position: relative; display: flex; flex-direction: column; border-left: 1px solid var(--vc-border); }
      .vc-modal-close {
        position: absolute; top: 20px; right: 20px;
        background: transparent; border: 1px solid var(--vc-border);
        color: var(--vc-ink); border-radius: 50%; width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .vc-modal-close:hover { border-color: var(--vc-ink); }
      .vc-modal-cat { color: var(--vc-ink-faint); font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px; margin-bottom: 10px; font-weight: 700; }
      .vc-modal-name { font-family: 'Bodoni Moda', serif; font-size: 27px; font-weight: 500; margin: 0 0 14px; padding-right: 30px; color: var(--vc-ink); line-height: 1.15; }
      .vc-modal-price { color: var(--vc-ink); font-size: 17px; font-weight: 600; margin-bottom: 26px; }
      .vc-attr-label { font-size: 10.5px; color: var(--vc-ink-faint); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
      .vc-chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
      .vc-variant-chip {
        border: 1px solid var(--vc-border);
        background: transparent;
        color: var(--vc-ink);
        padding: 9px 16px;
        border-radius: 0;
        font-size: 12.5px;
        cursor: pointer;
        transition: all .15s;
      }
      .vc-variant-chip:hover { border-color: var(--vc-ink); }
      .vc-variant-chip.active { border-color: var(--vc-ink); background: var(--vc-ink); color: #fff; font-weight: 600; }
      .vc-variant-chip.disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
      .vc-stock-note { font-size: 11.5px; margin-bottom: 22px; letter-spacing: 0.2px; }
      .vc-stock-note.low { color: var(--vc-red); }
      .vc-stock-note.ok { color: var(--vc-green); }

      .vc-qty-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 24px; }
      .vc-stepper { display: flex; align-items: center; border: 1px solid var(--vc-border); border-radius: 0; overflow: hidden; }
      .vc-stepper button {
        background: transparent; border: none; color: var(--vc-ink);
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .vc-stepper button:hover:not(:disabled) { background: var(--vc-panel-raised); }
      .vc-stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
      .vc-stepper span { width: 34px; text-align: center; font-size: 13px; }

      .vc-btn-primary {
        background: var(--vc-ink);
        color: #fff;
        border: 1px solid var(--vc-ink);
        border-radius: 0;
        padding: 15px 0;
        font-weight: 700;
        font-size: 11.5px;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        cursor: pointer;
        width: 100%;
        transition: opacity .15s, transform .1s;
        margin-top: auto;
      }
      .vc-btn-primary:hover:not(:disabled) { opacity: 0.85; }
      .vc-btn-primary:active:not(:disabled) { transform: scale(0.995); }
      .vc-btn-primary:disabled { opacity: 0.32; cursor: not-allowed; }

      .vc-btn-ghost {
        background: transparent;
        border: 1px solid var(--vc-border);
        color: var(--vc-ink-soft);
        border-radius: 0;
        padding: 13px 0;
        font-size: 11.5px;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        cursor: pointer;
        width: 100%;
        margin-top: 10px;
        display: flex; align-items: center; justify-content: center; gap: 7px;
      }
      .vc-btn-ghost:hover { border-color: var(--vc-ink); color: var(--vc-ink); }

      /* ---------- accordion ---------- */
      .vc-accordion { border-top: 1px solid var(--vc-border); margin-top: 26px; }
      .vc-accordion-item { border-bottom: 1px solid var(--vc-border); }
      .vc-accordion-head {
        width: 100%;
        background: none;
        border: none;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
        padding: 15px 0;
        font-size: 11.5px;
        font-weight: 700;
        color: var(--vc-ink);
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        text-align: left;
      }
      .vc-accordion-head-title { flex: 1; min-width: 0; overflow-wrap: break-word; }
      .vc-accordion-chevron { transition: transform .2s ease; color: var(--vc-ink-faint); font-size: 15px; flex: none; }
      .vc-accordion-chevron.open { transform: rotate(180deg); }
      .vc-accordion-body { padding: 0 0 18px; color: var(--vc-ink-soft); font-size: 13px; line-height: 1.65; }

      /* ---------- cart drawer ---------- */
      .vc-drawer {
        position: fixed;
        top: 0; right: 0;
        height: 100vh;
        width: min(430px, 100vw);
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
        padding: 24px; border-bottom: 1px solid var(--vc-border);
      }
      .vc-drawer-head h3 { font-family: 'Bodoni Moda', serif; font-weight: 500; margin: 0; font-size: 19px; color: var(--vc-ink); }
      .vc-drawer-items { flex: 1; overflow-y: auto; padding: 14px 24px; }
      .vc-drawer-empty { color: var(--vc-ink-soft); text-align: center; padding: 60px 10px; font-size: 13.5px; }
      .vc-drawer-item { display: flex; gap: 14px; padding: 18px 0; border-bottom: 1px solid var(--vc-border); }
      .vc-drawer-item img, .vc-drawer-item .vc-noimg {
        width: 64px; height: 78px; border-radius: 0; object-fit: cover; background: var(--vc-panel-raised);
        display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--vc-border); flex: none;
      }
      .vc-drawer-item-info { flex: 1; min-width: 0; }
      .vc-drawer-item-name { font-size: 13.5px; font-weight: 500; margin-bottom: 3px; font-family: 'Bodoni Moda', serif; color: var(--vc-ink); }
      .vc-drawer-item-variant { font-size: 11px; color: var(--vc-ink-soft); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
      .vc-drawer-item-row { display: flex; align-items: center; justify-content: space-between; }
      .vc-drawer-item-remove { background: none; border: none; color: var(--vc-ink-soft); font-size: 10.5px; cursor: pointer; text-decoration: underline; padding: 0; text-transform: uppercase; letter-spacing: 0.4px; }
      .vc-drawer-item-remove:hover { color: var(--vc-red); }
      .vc-drawer-foot { padding: 20px 24px 26px; border-top: 1px solid var(--vc-border); }
      .vc-drawer-total { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 18px; color: var(--vc-ink); text-transform: uppercase; letter-spacing: 0.5px; }
      .vc-drawer-total b { color: var(--vc-ink); font-size: 18px; font-family: 'Bodoni Moda', serif; letter-spacing: 0; }

      /* ---------- checkout ---------- */
      .vc-checkout-wrap { max-width: 1180px; margin: 0 auto; padding: 40px 24px 90px; display: flex; justify-content: center; }
      .vc-checkout-box { width: 100%; max-width: 440px; }
      .vc-steps-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
      .vc-step-dot {
        display: flex; align-items: center; gap: 8px; font-size: 10.5px; color: var(--vc-ink-faint);
        text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;
      }
      .vc-step-num {
        width: 21px; height: 21px; border-radius: 50%; border: 1px solid var(--vc-border);
        display: flex; align-items: center; justify-content: center; font-size: 10px; flex: none;
      }
      .vc-step-dot.active .vc-step-num { background: var(--vc-ink); border-color: var(--vc-ink); color: #fff; font-weight: 700; }
      .vc-step-dot.active { color: var(--vc-ink); }
      .vc-step-line { flex: 1; height: 1px; background: var(--vc-border); }

      .vc-panel-card { background: var(--vc-panel); border: 1px solid var(--vc-border); border-radius: 0; padding: 30px; }
      .vc-field-label { font-size: 10.5px; color: var(--vc-ink-faint); margin-bottom: 7px; display: block; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
      .vc-input {
        width: 100%;
        background: transparent;
        color: var(--vc-ink);
        border: none;
        border-bottom: 1px solid var(--vc-border);
        border-radius: 0;
        padding: 10px 1px;
        font-size: 13.5px;
        margin-bottom: 18px;
        box-sizing: border-box;
        transition: border-color .15s;
      }
      .vc-input::placeholder { color: var(--vc-ink-faint); }
      .vc-input:focus { border-bottom-color: var(--vc-ink); outline: none; }

      .vc-summary { background: var(--vc-bg-soft); border-radius: 0; padding: 18px; margin: 18px 0; border: 1px solid var(--vc-border); }
      .vc-summary-row { display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 8px; color: var(--vc-ink-soft); }
      .vc-summary-row.total { color: var(--vc-ink); font-weight: 700; border-top: 1px solid var(--vc-border); padding-top: 10px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
      .vc-summary-row.total b { color: var(--vc-ink); font-size: 17px; font-family: 'Bodoni Moda', serif; letter-spacing: 0; }

      .vc-error { color: var(--vc-red); font-size: 12.5px; margin-bottom: 14px; }

      .vc-confirm-wrap { text-align: center; }
      .vc-confirm-icon {
        width: 60px; height: 60px; border-radius: 50%; border: 1px solid var(--vc-green);
        color: var(--vc-green); display: flex; align-items: center; justify-content: center;
        margin: 6px auto 20px;
      }
      .vc-account-card {
        background: var(--vc-bg-soft); border: 1px solid var(--vc-border); border-radius: 0;
        padding: 16px; margin-top: 12px; font-size: 13px; line-height: 1.75; text-align: left; color: var(--vc-ink);
      }
      .vc-upload-label {
        display: inline-flex; align-items: center; gap: 7px;
        background: transparent; border: 1px solid var(--vc-ink); color: var(--vc-ink);
        border-radius: 0; padding: 11px 20px; font-size: 11.5px; letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; margin-bottom: 14px;
      }
      .vc-upload-label:hover { background: var(--vc-ink); color: #fff; }
      .vc-proof-preview { width: 100%; max-width: 220px; border-radius: 0; margin: 0 auto 14px; display: block; }

      /* ---------- footer ---------- */
      .vc-footer {
        max-width: 1180px;
        margin: 30px auto 0;
        padding: 60px 24px 40px;
        border-top: 1px solid var(--vc-border);
      }
      .vc-footer-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr 1fr;
        gap: 46px;
        margin-bottom: 50px;
      }
      .vc-footer-brand-block .vc-monogram { margin-bottom: 16px; }
      .vc-footer-brand { font-family: 'Bodoni Moda', serif; color: var(--vc-ink); font-size: 18px; margin-bottom: 8px; }
      .vc-footer-tag { color: var(--vc-ink-soft); font-size: 12.5px; line-height: 1.6; max-width: 260px; }
      .vc-footer-col-title { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.4px; font-weight: 700; color: var(--vc-ink-faint); margin-bottom: 18px; }
      .vc-footer-steps { display: flex; flex-direction: column; gap: 14px; }
      .vc-footer-step { display: flex; gap: 12px; align-items: flex-start; }
      .vc-footer-step-num {
        font-family: 'Bodoni Moda', serif; font-size: 13px; color: var(--vc-ink-faint); flex: none; width: 18px;
      }
      .vc-footer-step-text { font-size: 12.5px; color: var(--vc-ink-soft); line-height: 1.55; }
      .vc-footer-contact-btn {
        display: inline-flex; align-items: center; gap: 8px;
        border: 1px solid var(--vc-ink); color: var(--vc-ink); background: transparent;
        padding: 11px 18px; font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase;
        text-decoration: none; margin-bottom: 14px; transition: background .15s, color .15s;
      }
      .vc-footer-contact-btn:hover { background: var(--vc-ink); color: #fff; }
      .vc-footer-hours { font-size: 12.5px; color: var(--vc-ink-soft); line-height: 1.6; }
      .vc-footer-bottom {
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
        padding-top: 26px; border-top: 1px solid var(--vc-border);
        font-size: 10.5px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--vc-ink-faint);
      }

      /* ---------- toast ---------- */
      .vc-toast {
        position: fixed;
        left: 50%;
        bottom: 26px;
        transform: translateX(-50%);
        background: var(--vc-ink);
        color: #fff;
        padding: 13px 24px;
        border-radius: 0;
        font-size: 11.5px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        z-index: 60;
        box-shadow: 0 10px 28px rgba(0,0,0,0.18);
        animation: vc-toast-in .25s ease;
      }
      @keyframes vc-toast-in {
        from { opacity: 0; transform: translate(-50%, 8px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }

      /* ---------- color swatches ---------- */
      .vc-attr-value { color: var(--vc-ink-soft); font-weight: 400; text-transform: none; letter-spacing: 0; }
      .vc-swatch-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
      .vc-swatch {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid var(--vc-border);
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: var(--vc-ink-soft);
        background: var(--vc-panel-raised);
        padding: 0;
      }
      .vc-swatch.active { outline: 2px solid var(--vc-ink); outline-offset: 2px; }
      .vc-swatch.disabled { opacity: 0.3; cursor: not-allowed; }

      /* ---------- shopping bag full page ---------- */
      .vc-bag-back {
        background: transparent; border: 1px solid var(--vc-ink); color: var(--vc-ink);
        border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .vc-bag-back:hover { background: var(--vc-ink); color: #fff; }
      .vc-bag-page { max-width: 640px; margin: 0 auto; padding: 12px 24px 140px; }
      .vc-bag-list { display: flex; flex-direction: column; }
      .vc-bag-checkout-bar {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        background: var(--vc-panel);
        border-top: 1px solid var(--vc-border);
        padding: 18px 24px;
        z-index: 30;
      }

      @media (prefers-reduced-motion: reduce) {
        .vc-store *, .vc-store *::before, .vc-store *::after {
          animation-duration: 0.001ms !important;
          transition-duration: 0.001ms !important;
        }
      }

      @media (max-width: 900px) {
        .vc-hero-grid { grid-template-columns: 1fr; }
        .vc-hero-rule { display: none; }
        .vc-hero-main { padding: 52px 24px 30px; }
        .vc-hero-meta { padding: 20px 24px 52px; flex-direction: row; flex-wrap: wrap; gap: 26px; border-top: 1px solid var(--vc-border); }
        .vc-footer-grid { grid-template-columns: 1fr; gap: 34px; }
      }

      @media (max-width: 680px) {
        .vc-modal {
          grid-template-columns: 1fr;
          width: 100vw; height: 100vh; max-height: 100vh;
          top: 0; left: 0; transform: translate(0, 4%);
          border-radius: 0;
        }
        .vc-modal.open { transform: translate(0,0); }
        .vc-modal-body { border-left: none; border-top: 1px solid var(--vc-border); }
        .vc-modal-imgwrap { aspect-ratio: 4/3; }
        .vc-drawer { width: 100vw; }
      }

      /* floating whatsapp contact button */
      .vc-wa-float {
        position: fixed;
        right: 22px;
        bottom: 26px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--vc-ink);
        color: #fdfcf9;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 22px rgba(11,11,10,0.3);
        z-index: 70;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .vc-wa-float:hover {
        transform: translateY(-2px) scale(1.04);
        box-shadow: 0 12px 28px rgba(11,11,10,0.36);
      }
      .vc-wa-float:active { transform: scale(0.96); }
      @media (max-width: 680px) {
        .vc-wa-float { right: 16px; bottom: 92px; width: 46px; height: 46px; }
      }

      /* whatsapp order-summary button on the confirmation screen */
      .vc-wa-order-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        background: var(--vc-ink);
        color: #fdfcf9;
        border: none;
        border-radius: 0;
        padding: 14px 18px;
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        font-size: 11.5px;
        letter-spacing: 1px;
        text-transform: uppercase;
        cursor: pointer;
        transition: opacity 0.15s ease;
        text-decoration: none;
      }
      .vc-wa-order-btn:hover { opacity: 0.85; }
    `}</style>
  )
}


function buildOrderWhatsappMessage({ orderId, clientName, clientAddress, cart, total }) {
  const lines = cart.map((i) => `• ${i.name} (${i.variantLabel}) x${i.qty} — $${(i.price * i.qty).toFixed(2)}`)
  const parts = [
    `Hola, soy ${clientName}. Acabo de hacer un pedido en la tienda online (#${orderId}).`,
    '',
    ...lines,
    '',
    `Total: $${total.toFixed(2)}`,
  ]
  if (clientAddress?.trim()) {
    parts.push('', `Dirección: ${clientAddress.trim()}`)
  }
  parts.push('', 'Te comparto el comprobante de pago acá mismo.')
  return parts.join('\n')
}

export default function Store() {
  const [rawVariants, setRawVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [sortBy, setSortBy] = useState('recent') // recent | price_asc | price_desc
  const [search, setSearch] = useState('')

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalColor, setModalColor] = useState(null)
  const [modalSize, setModalSize] = useState(null)
  const [modalQty, setModalQty] = useState(1)
  const [openSection, setOpenSection] = useState(null)

  const [cart, setCart] = useState([])
  const [toast, setToast] = useState('')

  const [step, setStep] = useState('catalog') // catalog | bag | checkout | confirmed
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
      // No filtramos por stock > 0 acá: los productos agotados se siguen
      // trayendo para poder mostrarlos con "Avisame cuando vuelva" en vez
      // de que desaparezcan del catálogo sin dejar rastro.
      const { data } = await supabase
        .from('product_variants')
        .select('id, size, color, stock, price, product_id, products(name, base_price, image_url, on_sale, discount_percent, categories(name))')
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
    setMeta('theme-color', '#ffffff')
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
          onSale: !!v.products?.on_sale && Number(v.products?.discount_percent) > 0,
          discountPercent: Number(v.products?.discount_percent) || 0,
          variants: [],
        })
      }
      const product = map.get(pid)
      const rawPrice = v.price ?? v.products?.base_price ?? 0
      const finalPrice = product.onSale
        ? +(rawPrice * (1 - product.discountPercent / 100)).toFixed(2)
        : rawPrice
      map.get(pid).variants.push({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        price: finalPrice,
        originalPrice: rawPrice,
        onSale: product.onSale,
      })
    })
    return Array.from(map.values())
  }, [rawVariants])

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category))
    return ['Todos', ...Array.from(set)]
  }, [products])

  const filteredProducts = useMemo(() => {
    let list = activeCategory === 'Todos' ? products : products.filter((p) => p.category === activeCategory)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q))
    const minPrice = (p) => Math.min(...p.variants.map((v) => v.price))
    if (sortBy === 'price_asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b))
    if (sortBy === 'price_desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a))
    // Los agotados se mandan al final del listado sin importar el orden
    // elegido, para que no ocupen los primeros lugares del catálogo.
    const inStock = (p) => p.variants.reduce((s, v) => s + v.stock, 0) > 0
    list = [...list.filter(inStock), ...list.filter((p) => !inStock(p))]
    return list
  }, [products, activeCategory, sortBy, search])

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

  const originalPriceDisplay = (product) => {
    const prices = product.variants.map((v) => v.originalPrice)
    const min = Math.min(...prices)
    return `$${min.toFixed(2)}`
  }

  const totalStock = (product) => product.variants.reduce((s, v) => s + v.stock, 0)

  // named colors get a real swatch dot; anything unrecognized falls back to
  // a small labeled chip so we never guess wrong.
  const COLOR_HEX = {
    rojo: '#b23b32', azul: '#2f5fa8', 'azul marino': '#1f3358', celeste: '#8fc1e0',
    negro: '#1a1a1a', blanco: '#f5f5f0', beige: '#d8c9ae', crema: '#efe6d5',
    rosa: '#e8a0bf', rosado: '#e8a0bf', verde: '#4c7a52', 'verde olivo': '#6b7a4f',
    amarillo: '#e4c13b', cafe: '#6b4a34', café: '#6b4a34', marron: '#6b4a34', marrón: '#6b4a34',
    gris: '#9b968c', dorado: '#c9a34e', plateado: '#b9b9b9', morado: '#7b5ea7',
    purpura: '#7b5ea7', púrpura: '#7b5ea7', lila: '#b9a3d1', naranja: '#d97b3f',
    turquesa: '#2fa6a6', vino: '#6e2b3a', mostaza: '#c9a13b', coral: '#e18b73',
    fucsia: '#c23b8f', khaki: '#a89a6b', caqui: '#a89a6b',
  }
  const colorHex = (name) => (name ? COLOR_HEX[name.trim().toLowerCase()] : null)

  const uniqueColors = (product) => {
    const seen = new Set()
    return product.variants.map((v) => v.color).filter((c) => c && !seen.has(c) && seen.add(c))
  }
  const uniqueSizes = (product) => {
    const seen = new Set()
    return product.variants.map((v) => v.size).filter((s) => s && !seen.has(s) && seen.add(s))
  }

  // ---------- modal ----------
  const openProduct = (product) => {
    setSelectedProduct(product)
    const firstAvailable = product.variants.find((v) => v.stock > 0) || product.variants[0]
    setModalColor(firstAvailable?.color ?? null)
    setModalSize(firstAvailable?.size ?? null)
    setModalQty(1)
    setOpenSection(null)
  }
  const closeProduct = () => setSelectedProduct(null)

  const activeModalVariant = selectedProduct?.variants.find(
    (v) => (v.color || null) === (modalColor || null) && (v.size || null) === (modalSize || null)
  )

  const selectColor = (color) => {
    setModalColor(color)
    setModalQty(1)
    // if current size isn't available for this color, jump to one that is
    const stillValid = selectedProduct.variants.some((v) => (v.color || null) === (color || null) && (v.size || null) === (modalSize || null))
    if (!stillValid) {
      const fallback = selectedProduct.variants.find((v) => (v.color || null) === (color || null) && v.stock > 0)
        || selectedProduct.variants.find((v) => (v.color || null) === (color || null))
      setModalSize(fallback?.size ?? null)
    }
  }
  const selectSize = (size) => {
    setModalSize(size)
    setModalQty(1)
    const stillValid = selectedProduct.variants.some((v) => (v.size || null) === (size || null) && (v.color || null) === (modalColor || null))
    if (!stillValid) {
      const fallback = selectedProduct.variants.find((v) => (v.size || null) === (size || null) && v.stock > 0)
        || selectedProduct.variants.find((v) => (v.size || null) === (size || null))
      setModalColor(fallback?.color ?? null)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

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
    showToast(`Agregado: ${product.name}`)
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
            <div className="vc-monogram" style={{ margin: '0 auto 16px' }}>VC</div>
            <p className="vc-logo" style={{ marginBottom: 24 }}>Variedades Calero</p>
            <div className="vc-confirm-icon"><IconCheck /></div>
            <h2 className="vc-serif" style={{ fontWeight: 500, margin: '0 0 10px', fontSize: 24 }}>Pedido recibido</h2>
            <p style={{ color: 'var(--vc-ink-soft)', fontSize: 14 }}>
              Gracias {clientName.split(' ')[0]}, tu pedido por <b style={{ color: 'var(--vc-ink)' }}>${total.toFixed(2)}</b> fue registrado.
            </p>

            <div className="vc-panel-card" style={{ marginTop: 22, textAlign: 'left' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Para confirmar tu compra, transferí a:</p>
              {accounts.map((a) => (
                <div key={a.id} className="vc-account-card">
                  <div><b>{a.bank}</b> ({a.currency})</div>
                  <div>Cuenta: {a.account_number}</div>
                  <div>Titular: {a.account_holder}</div>
                </div>
              ))}

              {proofUploaded ? (
                <p style={{ color: 'var(--vc-green)', fontWeight: 600, marginTop: 16, fontSize: 13.5 }}>
                  Comprobante recibido. Vamos a confirmar tu pago pronto.
                </p>
              ) : (
                <div style={{ marginTop: 18, borderTop: '1px dashed var(--vc-border)', paddingTop: 18, textAlign: 'center' }}>
                  <p style={{ color: 'var(--vc-ink-soft)', fontSize: 13, marginBottom: 12 }}>
                    Subí la foto o captura del comprobante de tu transferencia acá mismo:
                  </p>
                  {proofPreview && <img src={proofPreview} alt="comprobante" className="vc-proof-preview" />}
                  <label className="vc-upload-label">
                    {proofFile ? 'Cambiar foto' : 'Subir comprobante'}
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

            <a
              className="vc-wa-order-btn"
              style={{ marginTop: 16 }}
              href={buildWhatsappLink(
                buildOrderWhatsappMessage({ orderId: createdOrderId, clientName, clientAddress, cart, total })
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconWhatsapp size={16} /> Enviar mi pedido por WhatsApp
            </a>

            <button className="vc-btn-ghost" onClick={() => window.location.reload()}>
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'bag') {
    return (
      <div className="vc-store">
        <GlobalStyle />
        <header className="vc-header">
          <div className="vc-header-left">
            <button className="vc-bag-back" onClick={() => setStep('catalog')} aria-label="Volver">
              <IconChevronLeft size={18} />
            </button>
            <p className="vc-logo" style={{ fontSize: 18 }}>Bolsa de compras</p>
          </div>
        </header>

        <div className="vc-bag-page">
          {cart.length === 0 ? (
            <div className="vc-drawer-empty" style={{ padding: '90px 20px' }}>
              Tu bolsa está vacía.<br />Volvé al catálogo para agregar productos.
              <div style={{ marginTop: 22 }}>
                <button className="vc-btn-ghost" style={{ width: 'auto', padding: '11px 26px' }} onClick={() => setStep('catalog')}>
                  Ir al catálogo
                </button>
              </div>
            </div>
          ) : (
            <div className="vc-bag-list">
              {cart.map((i) => (
                <div key={i.id} className="vc-drawer-item">
                  {i.image ? <img src={i.image} alt={i.name} /> : <div className="vc-noimg">—</div>}
                  <div className="vc-drawer-item-info">
                    <div className="vc-drawer-item-name">{i.name}</div>
                    <div className="vc-drawer-item-variant">{i.variantLabel}</div>
                    <div className="vc-drawer-item-row">
                      <div className="vc-stepper">
                        <button onClick={() => changeQty(i.id, -1)}><IconMinus size={12} /></button>
                        <span>{i.qty}</span>
                        <button onClick={() => changeQty(i.id, 1)} disabled={i.qty >= i.stock}><IconPlus size={12} /></button>
                      </div>
                      <span style={{ color: 'var(--vc-ink)', fontWeight: 700, fontSize: 13.5 }}>${(i.price * i.qty).toFixed(2)}</span>
                    </div>
                    <button className="vc-drawer-item-remove" onClick={() => removeItem(i.id)}>Quitar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="vc-bag-checkout-bar">
            <button className="vc-btn-primary" style={{ maxWidth: 1180, margin: '0 auto' }} onClick={goToCheckout}>
              Ir a pagar · ${total.toFixed(2)}
            </button>
          </div>
        )}
        <FloatingWhatsapp />
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
              <h2 className="vc-serif" style={{ fontWeight: 500, marginTop: 0, fontSize: 22 }}>Datos de entrega</h2>
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
              <button className="vc-btn-ghost" onClick={() => setStep('bag')}>
                <IconChevronLeft size={14} /> Volver a la bolsa
              </button>
            </div>
          </div>
        </div>
        <FloatingWhatsapp />
      </div>
    )
  }

  return (
    <div className="vc-store">
      <GlobalStyle />

      <header className="vc-header">
        <div className="vc-header-left">
          <div className="vc-monogram">VC</div>
          <div>
            <p className="vc-logo">Variedades Calero</p>
            <p className="vc-logo-sub">Tienda online</p>
          </div>
        </div>
        <button className="vc-cart-btn" onClick={() => setStep('bag')} aria-label="Ver bolsa de compras">
          <IconBag />
          {cartCount > 0 && <span className="vc-cart-badge">{cartCount}</span>}
        </button>
      </header>

      <MarqueeBar />

      <section className="vc-hero">
        <div className="vc-hero-grid">
          <div className="vc-hero-main">
            <div className="vc-eyebrow">Masatepe, Nicaragua</div>
            <h1>Piezas que <em>se notan.</em></h1>
            <p>Ropa, calzado y accesorios seleccionados con criterio. Pedís en línea y coordinamos la entrega directo con vos.</p>
            <button
              className="vc-hero-cta"
              onClick={() => document.getElementById('vc-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Ver catálogo <IconArrow />
            </button>
          </div>
          <div className="vc-hero-rule" />
          <div className="vc-hero-meta">
            <div className="vc-meta-item">
              <div className="vc-meta-label">Envíos</div>
              <div className="vc-meta-value">Coordinados por WhatsApp a toda Nicaragua.</div>
            </div>
            <div className="vc-meta-item">
              <div className="vc-meta-label">Pago</div>
              <div className="vc-meta-value">Transferencia bancaria, con verificación manual del comprobante.</div>
            </div>
            <div className="vc-meta-item">
              <div className="vc-meta-label">Atención</div>
              <div className="vc-meta-value">Personalizada, directo con nosotros.</div>
            </div>
          </div>
        </div>
      </section>

      <div className="vc-section-head" id="vc-catalog">
        <div>
          <div className="vc-eyebrow" style={{ marginBottom: 10 }}>Catálogo</div>
          <h2>Todo lo disponible ahora</h2>
        </div>
        {!loading && <span className="vc-section-count">{filteredProducts.length} artículo{filteredProducts.length !== 1 ? 's' : ''}</span>}
      </div>

      <div className="vc-search-row">
        <div className="vc-search-wrap">
          <span className="vc-search-icon"><IconSearch /></span>
          <input
            className="vc-search-input"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="vc-toolbar">
        {categories.length > 1 && (
          <div className="vc-chips">
            {categories.map((c) => (
              <button key={c} className={`vc-chip ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="vc-sort-wrap">
          <label htmlFor="vc-sort">Ordenar</label>
          <select id="vc-sort" className="vc-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Más recientes</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
          </select>
        </div>
      </div>

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
            {filteredProducts.map((p) => {
              const soldOut = totalStock(p) === 0
              return (
                <div key={p.id} className={`vc-card ${soldOut ? 'vc-soldout' : ''}`} onClick={() => openProduct(p)}>
                  <div className="vc-card-imgwrap">
                    {p.image ? <img src={p.image} alt={p.name} /> : <div className="vc-noimg">—</div>}
                    {soldOut && <span className="vc-soldout-badge">Agotado</span>}
                    {!soldOut && p.onSale && <span className="vc-card-sale-badge">-{p.discountPercent}% Liquidación</span>}
                    {!soldOut && !p.onSale && totalStock(p) <= 5 && <span className="vc-card-badge">Últimas unidades</span>}
                    <div
                      className={`vc-card-addbar ${soldOut ? 'vc-notify' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (soldOut) {
                          window.open(
                            buildWhatsappLink(`Hola! Quiero que me avisen cuando "${p.name}" vuelva a tener stock.`),
                            '_blank'
                          )
                        } else {
                          quickAdd(p)
                        }
                      }}
                    >
                      {soldOut ? 'Avisame cuando vuelva' : p.variants.length === 1 ? 'Agregar a la bolsa' : 'Elegir opciones'}
                    </div>
                  </div>
                  <div className="vc-card-body">
                    <div className="vc-card-cat">{p.category}</div>
                    <p className="vc-card-name">{p.name}</p>
                    <div className="vc-card-price">
                      {!soldOut && p.onSale && <span className="vc-card-price-strike">{originalPriceDisplay(p)}</span>}
                      <span className={!soldOut && p.onSale ? 'vc-card-price-sale' : ''}>{priceDisplay(p)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="vc-footer">
        <div className="vc-footer-grid">
          <div className="vc-footer-brand-block">
            <div className="vc-monogram">VC</div>
            <div className="vc-footer-brand">Variedades Calero</div>
            <p className="vc-footer-tag">Ropa, calzado y accesorios elegidos con cuidado. Hecho con cariño en Masatepe, Nicaragua.</p>
          </div>
          <div>
            <div className="vc-footer-col-title">Cómo comprar</div>
            <div className="vc-footer-steps">
              <div className="vc-footer-step">
                <span className="vc-footer-step-num">01</span>
                <span className="vc-footer-step-text">Explorá el catálogo y elegí talla o color.</span>
              </div>
              <div className="vc-footer-step">
                <span className="vc-footer-step-num">02</span>
                <span className="vc-footer-step-text">Confirmá tu pedido con tus datos de entrega.</span>
              </div>
              <div className="vc-footer-step">
                <span className="vc-footer-step-num">03</span>
                <span className="vc-footer-step-text">Transferí y coordinamos la entrega por WhatsApp.</span>
              </div>
            </div>
          </div>
          <div>
            <div className="vc-footer-col-title">Contacto</div>
            <a
              className="vc-footer-contact-btn"
              href={buildWhatsappLink('Hola, tengo una consulta sobre Variedades Calero 🙂')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconWhatsapp size={15} /> Escribinos
            </a>
            <div className="vc-footer-hours">Lunes a sábado.<br />Respuesta por WhatsApp.</div>
          </div>
        </div>
        <div className="vc-footer-bottom">
          <span>Variedades Calero — Masatepe, Nicaragua</span>
          <span>Pago por transferencia · Entrega coordinada</span>
        </div>
      </footer>

      {/* product modal */}
      <div className={`vc-overlay ${selectedProduct ? 'open' : ''}`} onClick={closeProduct} />
      {selectedProduct && (
        <div className={`vc-modal ${selectedProduct ? 'open' : ''}`}>
          <div className="vc-modal-imgwrap">
            {selectedProduct.image ? <img src={selectedProduct.image} alt={selectedProduct.name} /> : <div className="vc-noimg">—</div>}
          </div>
          <div className="vc-modal-body">
            <button className="vc-modal-close" onClick={closeProduct} aria-label="Cerrar"><IconClose /></button>
            <div className="vc-modal-cat">
              {selectedProduct.category}
              {selectedProduct.onSale && (
                <span className="vc-modal-sale-badge">-{selectedProduct.discountPercent}% Liquidación</span>
              )}
            </div>
            <h2 className="vc-modal-name">{selectedProduct.name}</h2>
            <div className="vc-modal-price">
              {selectedProduct.onSale && (
                <span className="vc-modal-price-strike">
                  {activeModalVariant ? `$${activeModalVariant.originalPrice.toFixed(2)}` : originalPriceDisplay(selectedProduct)}
                </span>
              )}
              <span className={selectedProduct.onSale ? 'vc-modal-price-sale' : ''}>
                {activeModalVariant ? `$${activeModalVariant.price.toFixed(2)}` : priceDisplay(selectedProduct)}
              </span>
            </div>

            {uniqueColors(selectedProduct).length > 0 && (
              <>
                <div className="vc-attr-label">
                  Color{modalColor ? <span className="vc-attr-value">: {modalColor}</span> : ''}
                </div>
                <div className="vc-swatch-row">
                  {uniqueColors(selectedProduct).map((c) => {
                    const hex = colorHex(c)
                    const anyStock = selectedProduct.variants.some((v) => v.color === c && v.stock > 0)
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`vc-swatch ${modalColor === c ? 'active' : ''} ${!anyStock ? 'disabled' : ''}`}
                        style={hex ? { background: hex } : undefined}
                        onClick={() => anyStock && selectColor(c)}
                        disabled={!anyStock}
                        title={c}
                      >
                        {!hex && c.slice(0, 1).toUpperCase()}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {uniqueSizes(selectedProduct).length > 0 && (
              <>
                <div className="vc-attr-label">Talla</div>
                <div className="vc-chip-row">
                  {uniqueSizes(selectedProduct).map((s) => {
                    const anyStock = selectedProduct.variants.some((v) => v.size === s && v.stock > 0)
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`vc-variant-chip ${modalSize === s ? 'active' : ''} ${!anyStock ? 'disabled' : ''}`}
                        onClick={() => anyStock && selectSize(s)}
                        disabled={!anyStock}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {totalStock(selectedProduct) === 0 ? (
              <p className="vc-modal-soldout-note">Este producto está agotado por ahora. Dejanos tu WhatsApp y te avisamos apenas vuelva.</p>
            ) : activeModalVariant ? (
              <p className={`vc-stock-note ${activeModalVariant.stock <= 5 ? 'low' : 'ok'}`}>
                {activeModalVariant.stock <= 5 ? `Solo quedan ${activeModalVariant.stock} disponibles` : 'Disponible'}
              </p>
            ) : (
              <p className="vc-stock-note low">Esa combinación no está disponible</p>
            )}

            {totalStock(selectedProduct) === 0 ? (
              <a
                className="vc-btn-notify"
                href={buildWhatsappLink(`Hola! Quiero que me avisen cuando "${selectedProduct.name}" vuelva a tener stock.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Avisame cuando vuelva
              </a>
            ) : (
              <>
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
                  Agregar a la bolsa
                </button>
              </>
            )}

            <div className="vc-accordion">
              {[
                { key: 'details', title: 'Detalles del producto', body: `${selectedProduct.name} — categoría ${selectedProduct.category}. Pieza seleccionada por Variedades Calero.` },
                ...(SIZE_GUIDES[selectedProduct.category] && uniqueSizes(selectedProduct).length > 0
                  ? [{ key: 'sizes', title: 'Guía de tallas', body: null }]
                  : []),
                { key: 'care', title: 'Cuidados', body: CARE_TEXT[selectedProduct.category] || CARE_TEXT.default },
                { key: 'shipping', title: 'Envío y devoluciones', body: 'Coordinamos la entrega directo con vos por WhatsApp después de confirmar tu pedido. Si algo no calza, escribinos dentro de las 48 horas siguientes a la entrega.' },
              ].map((s) => (
                <div key={s.key} className="vc-accordion-item">
                  <button
                    type="button"
                    className="vc-accordion-head"
                    onClick={() => setOpenSection(openSection === s.key ? null : s.key)}
                  >
                    <span className="vc-accordion-head-title">{s.title}</span>
                    <span className={`vc-accordion-chevron ${openSection === s.key ? 'open' : ''}`}>⌄</span>
                  </button>
                  {openSection === s.key && (
                    <div className="vc-accordion-body">
                      {s.key === 'sizes' ? (
                        <>
                          <table className="vc-size-table">
                            <thead>
                              <tr>
                                {SIZE_GUIDES[selectedProduct.category].headers.map((h) => <th key={h}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {SIZE_GUIDES[selectedProduct.category].rows.map((row, ri) => (
                                <tr key={ri}>
                                  {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="vc-size-note">{SIZE_GUIDES[selectedProduct.category].note}</p>
                        </>
                      ) : (
                        s.body
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {(() => {
              const related = products.filter((rp) => rp.id !== selectedProduct.id && rp.category === selectedProduct.category).slice(0, 4)
              if (related.length === 0) return null
              return (
                <div className="vc-related">
                  <div className="vc-related-title">También te puede gustar</div>
                  <div className="vc-related-scroll">
                    {related.map((rp) => (
                      <button key={rp.id} className="vc-related-card" onClick={() => openProduct(rp)}>
                        <div className="vc-related-imgwrap">
                          {rp.image ? <img src={rp.image} alt={rp.name} /> : null}
                        </div>
                        <div className="vc-related-name">{rp.name}</div>
                        <div className="vc-related-price">{priceDisplay(rp)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {toast && <div className="vc-toast">{toast}</div>}
      <FloatingWhatsapp />
    </div>
  )
}
