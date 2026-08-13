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

// ---------- Global styles for this page only ----------
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap');

      .vc-store {
        --vc-bg: #faf8f5;
        --vc-panel: #ffffff;
        --vc-panel-raised: #f2efe8;
        --vc-border: #e7e2d8;
        --vc-ink: #17150f;
        --vc-ink-soft: #6f6a5e;
        --vc-accent: #17150f;
        --vc-accent-soft: #3a362c;
        --vc-tag: #17150f;
        --vc-green: #4c7a52;
        --vc-red: #b3453f;
        min-height: 100vh;
        background: var(--vc-bg);
        color: var(--vc-ink);
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
        outline: 2px solid var(--vc-ink);
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
        padding: 18px 22px;
        background: rgba(250,248,245,0.9);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--vc-border);
      }
      .vc-header-left { display: flex; align-items: center; gap: 12px; }
      .vc-monogram {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid var(--vc-ink);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-weight: 600;
        font-size: 13px;
        color: var(--vc-ink);
        flex: none;
      }
      .vc-logo {
        font-family: 'Fraunces', serif;
        font-weight: 500;
        font-size: 20px;
        color: var(--vc-ink);
        letter-spacing: 0.2px;
        margin: 0;
      }
      .vc-logo-sub {
        color: var(--vc-ink-soft);
        font-size: 10.5px;
        letter-spacing: 1.6px;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .vc-cart-btn {
        position: relative;
        background: transparent;
        border: 1px solid var(--vc-border);
        color: var(--vc-ink);
        border-radius: 999px;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: border-color .2s, background .2s;
      }
      .vc-cart-btn:hover { border-color: var(--vc-ink); background: var(--vc-panel-raised); }
      .vc-cart-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--vc-ink);
        color: #fff;
        font-size: 10.5px;
        font-weight: 700;
        min-width: 17px;
        height: 17px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }

      /* hero */
      .vc-hero {
        position: relative;
        padding: 60px 20px 52px;
        text-align: center;
        border-bottom: 1px solid var(--vc-border);
      }
      .vc-hero-inner { max-width: 620px; margin: 0 auto; }
      .vc-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        font-size: 10.5px;
        letter-spacing: 2.4px;
        text-transform: uppercase;
        color: var(--vc-ink-soft);
        font-weight: 600;
        margin-bottom: 18px;
      }
      .vc-eyebrow::before, .vc-eyebrow::after {
        content: '';
        width: 20px;
        height: 1px;
        background: var(--vc-ink-soft);
        opacity: 0.55;
      }
      .vc-hero h1 {
        font-family: 'Fraunces', serif;
        font-weight: 400;
        font-size: clamp(32px, 6vw, 52px);
        line-height: 1.1;
        margin: 0 0 18px;
        color: var(--vc-ink);
      }
      .vc-hero p {
        color: var(--vc-ink-soft);
        font-size: 15px;
        line-height: 1.65;
        max-width: 420px;
        margin: 0 auto 30px;
      }
      .vc-hero-cta {
        background: var(--vc-ink);
        border: 1px solid var(--vc-ink);
        color: #fff;
        padding: 13px 30px;
        border-radius: 999px;
        font-size: 12.5px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        cursor: pointer;
        transition: opacity .2s, transform .15s;
      }
      .vc-hero-cta:hover { opacity: 0.8; transform: translateY(-1px); }

      .vc-stitch {
        width: 100%;
        height: 0;
        border-top: 1px solid var(--vc-border);
      }

      /* catalog section head */
      .vc-section-head {
        max-width: 1180px;
        margin: 0 auto;
        padding: 44px 20px 4px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 10px;
      }
      .vc-section-head .vc-eyebrow { margin-bottom: 8px; }
      .vc-section-head h2 {
        font-family: 'Fraunces', serif;
        font-weight: 500;
        font-size: clamp(19px, 3vw, 25px);
        margin: 0;
        color: var(--vc-ink);
      }
      .vc-section-count { color: var(--vc-ink-soft); font-size: 12.5px; }

      /* category chips */
      .vc-chips {
        display: flex;
        gap: 8px;
        padding: 20px 20px 6px;
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
        color: var(--vc-ink-soft);
        padding: 8px 16px;
        border-radius: 999px;
        font-size: 12.5px;
        cursor: pointer;
        transition: all .15s;
        white-space: nowrap;
      }
      .vc-chip:hover { border-color: var(--vc-ink); color: var(--vc-ink); }
      .vc-chip.active {
        background: var(--vc-ink);
        border-color: var(--vc-ink);
        color: #fff;
        font-weight: 600;
      }

      /* grid */
      .vc-main { max-width: 1180px; margin: 0 auto; padding: 8px 20px 90px; }
      .vc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 26px 20px;
      }
      .vc-grid .vc-card {
        opacity: 0;
        animation: vc-card-in .5s ease forwards;
      }
      @keyframes vc-card-in {
        from { opacity: 0; transform: translateY(12px); }
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
        aspect-ratio: 3 / 4;
        overflow: hidden;
        background: var(--vc-panel-raised);
        border-radius: 3px;
      }
      .vc-card-imgwrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform .6s ease;
      }
      @media (hover: hover) {
        .vc-card:hover .vc-card-imgwrap img { transform: scale(1.035); }
      }
      .vc-card-imgwrap .vc-noimg {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        font-size: 32px; color: var(--vc-border);
      }
      .vc-card-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        background: var(--vc-panel);
        color: var(--vc-ink);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        padding: 4px 10px;
        border-radius: 999px;
        text-transform: uppercase;
        border: 1px solid var(--vc-border);
      }
      .vc-card-quick {
        position: absolute;
        right: 10px;
        bottom: 10px;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity .2s ease, transform .2s ease;
      }
      @media (hover: hover) {
        .vc-card:hover .vc-card-quick { opacity: 1; transform: translateY(0); }
      }
      .vc-quick-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--vc-panel);
        border: 1px solid var(--vc-ink);
        color: var(--vc-ink);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        line-height: 1;
        box-shadow: 0 4px 14px rgba(0,0,0,0.08);
      }
      .vc-quick-btn:hover { background: var(--vc-ink); color: #fff; }

      .vc-card-body { padding: 14px 2px 0; }
      .vc-card-cat { color: var(--vc-ink-soft); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
      .vc-card-name {
        font-family: 'Fraunces', serif;
        font-size: 15px;
        font-weight: 500;
        margin: 0 0 6px;
        line-height: 1.3;
        color: var(--vc-ink);
      }
      .vc-card-price { color: var(--vc-ink); font-weight: 600; font-size: 13.5px; letter-spacing: 0.2px; }

      .vc-skeleton {
        background: var(--vc-panel-raised);
        border-radius: 3px;
        overflow: hidden;
      }
      .vc-skeleton-img {
        width: 100%; aspect-ratio: 3/4;
        background: linear-gradient(90deg, var(--vc-panel-raised) 25%, #e9e4d8 37%, var(--vc-panel-raised) 63%);
        background-size: 400% 100%;
        animation: vc-shimmer 1.4s ease infinite;
      }
      @keyframes vc-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

      .vc-empty { text-align: center; padding: 60px 20px; color: var(--vc-ink-soft); }

      /* overlay shared */
      .vc-overlay {
        position: fixed; inset: 0;
        background: rgba(23,21,15,0.4);
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
        border-radius: 4px;
        z-index: 41;
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease, transform .25s ease;
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .vc-modal.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
      .vc-modal-imgwrap { background: var(--vc-panel-raised); aspect-ratio: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .vc-modal-imgwrap img { width: 100%; height: 100%; object-fit: contain; }
      .vc-modal-imgwrap .vc-noimg { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: var(--vc-border); }
      .vc-modal-body { padding: 30px 30px 24px; position: relative; display: flex; flex-direction: column; }
      .vc-modal-close {
        position: absolute; top: 18px; right: 18px;
        background: transparent; border: 1px solid var(--vc-border);
        color: var(--vc-ink); border-radius: 999px; width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .vc-modal-close:hover { border-color: var(--vc-ink); }
      .vc-modal-cat { color: var(--vc-ink-soft); font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px; }
      .vc-modal-name { font-family: 'Fraunces', serif; font-size: 25px; font-weight: 500; margin: 0 0 12px; padding-right: 30px; color: var(--vc-ink); }
      .vc-modal-price { color: var(--vc-ink); font-size: 17px; font-weight: 600; margin-bottom: 22px; }
      .vc-attr-label { font-size: 11px; color: var(--vc-ink-soft); margin-bottom: 9px; text-transform: uppercase; letter-spacing: 0.6px; }
      .vc-chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
      .vc-variant-chip {
        border: 1px solid var(--vc-border);
        background: transparent;
        color: var(--vc-ink);
        padding: 9px 15px;
        border-radius: 3px;
        font-size: 12.5px;
        cursor: pointer;
        transition: all .15s;
      }
      .vc-variant-chip:hover { border-color: var(--vc-ink); }
      .vc-variant-chip.active { border-color: var(--vc-ink); background: var(--vc-ink); color: #fff; font-weight: 600; }
      .vc-variant-chip.disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
      .vc-stock-note { font-size: 12px; margin-bottom: 20px; }
      .vc-stock-note.low { color: var(--vc-red); }
      .vc-stock-note.ok { color: var(--vc-green); }

      .vc-qty-row { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
      .vc-stepper { display: flex; align-items: center; border: 1px solid var(--vc-border); border-radius: 3px; overflow: hidden; }
      .vc-stepper button {
        background: transparent; border: none; color: var(--vc-ink);
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .vc-stepper button:hover:not(:disabled) { background: var(--vc-panel-raised); }
      .vc-stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
      .vc-stepper span { width: 34px; text-align: center; font-size: 13.5px; }

      .vc-btn-primary {
        background: var(--vc-ink);
        color: #fff;
        border: 1px solid var(--vc-ink);
        border-radius: 3px;
        padding: 14px 0;
        font-weight: 600;
        font-size: 12.5px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        cursor: pointer;
        width: 100%;
        transition: opacity .15s, transform .1s;
        margin-top: auto;
      }
      .vc-btn-primary:hover:not(:disabled) { opacity: 0.82; }
      .vc-btn-primary:active:not(:disabled) { transform: scale(0.99); }
      .vc-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

      .vc-btn-ghost {
        background: transparent;
        border: 1px solid var(--vc-border);
        color: var(--vc-ink-soft);
        border-radius: 3px;
        padding: 12px 0;
        font-size: 12.5px;
        cursor: pointer;
        width: 100%;
        margin-top: 10px;
        display: flex; align-items: center; justify-content: center; gap: 6px;
      }
      .vc-btn-ghost:hover { border-color: var(--vc-ink); color: var(--vc-ink); }

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
        padding: 22px; border-bottom: 1px solid var(--vc-border);
      }
      .vc-drawer-head h3 { font-family: 'Fraunces', serif; font-weight: 500; margin: 0; font-size: 18px; color: var(--vc-ink); }
      .vc-drawer-items { flex: 1; overflow-y: auto; padding: 14px 22px; }
      .vc-drawer-empty { color: var(--vc-ink-soft); text-align: center; padding: 60px 10px; font-size: 13.5px; }
      .vc-drawer-item { display: flex; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--vc-border); }
      .vc-drawer-item img, .vc-drawer-item .vc-noimg {
        width: 60px; height: 60px; border-radius: 3px; object-fit: cover; background: var(--vc-panel-raised);
        display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--vc-border); flex: none;
      }
      .vc-drawer-item-info { flex: 1; min-width: 0; }
      .vc-drawer-item-name { font-size: 13px; font-weight: 500; margin-bottom: 2px; font-family: 'Fraunces', serif; color: var(--vc-ink); }
      .vc-drawer-item-variant { font-size: 11.5px; color: var(--vc-ink-soft); margin-bottom: 8px; }
      .vc-drawer-item-row { display: flex; align-items: center; justify-content: space-between; }
      .vc-drawer-item-remove { background: none; border: none; color: var(--vc-ink-soft); font-size: 11px; cursor: pointer; text-decoration: underline; padding: 0; }
      .vc-drawer-item-remove:hover { color: var(--vc-red); }
      .vc-drawer-foot { padding: 18px 22px 24px; border-top: 1px solid var(--vc-border); }
      .vc-drawer-total { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 16px; color: var(--vc-ink); }
      .vc-drawer-total b { color: var(--vc-ink); font-size: 17px; }

      /* checkout */
      .vc-checkout-wrap { max-width: 1180px; margin: 0 auto; padding: 30px 20px 80px; display: flex; justify-content: center; }
      .vc-checkout-box { width: 100%; max-width: 440px; }
      .vc-steps-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 28px; }
      .vc-step-dot {
        display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--vc-ink-soft);
      }
      .vc-step-num {
        width: 21px; height: 21px; border-radius: 999px; border: 1px solid var(--vc-border);
        display: flex; align-items: center; justify-content: center; font-size: 10.5px; flex: none;
      }
      .vc-step-dot.active .vc-step-num { background: var(--vc-ink); border-color: var(--vc-ink); color: #fff; font-weight: 700; }
      .vc-step-dot.active { color: var(--vc-ink); }
      .vc-step-line { flex: 1; height: 1px; background: var(--vc-border); }

      .vc-panel-card { background: var(--vc-panel); border: 1px solid var(--vc-border); border-radius: 4px; padding: 26px; }
      .vc-field-label { font-size: 11px; color: var(--vc-ink-soft); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.6px; }
      .vc-input {
        width: 100%;
        background: var(--vc-bg);
        color: var(--vc-ink);
        border: 1px solid var(--vc-border);
        border-radius: 3px;
        padding: 11px 13px;
        font-size: 13.5px;
        margin-bottom: 14px;
        box-sizing: border-box;
        transition: border-color .15s;
      }
      .vc-input::placeholder { color: #a29c8c; }
      .vc-input:focus { border-color: var(--vc-ink); outline: none; }

      .vc-summary { background: var(--vc-bg); border-radius: 3px; padding: 15px; margin: 16px 0; border: 1px solid var(--vc-border); }
      .vc-summary-row { display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 6px; color: var(--vc-ink-soft); }
      .vc-summary-row.total { color: var(--vc-ink); font-weight: 700; border-top: 1px solid var(--vc-border); padding-top: 8px; margin-top: 8px; }
      .vc-summary-row.total b { color: var(--vc-ink); font-size: 16px; }

      .vc-error { color: var(--vc-red); font-size: 12.5px; margin-bottom: 12px; }

      .vc-confirm-wrap { text-align: center; }
      .vc-confirm-icon {
        width: 62px; height: 62px; border-radius: 999px; background: rgba(76,122,82,0.12);
        color: var(--vc-green); display: flex; align-items: center; justify-content: center;
        margin: 6px auto 18px;
      }
      .vc-account-card {
        background: var(--vc-bg); border: 1px solid var(--vc-border); border-radius: 3px;
        padding: 14px; margin-top: 10px; font-size: 13px; line-height: 1.7; text-align: left; color: var(--vc-ink);
      }
      .vc-upload-label {
        display: inline-flex; align-items: center; gap: 6px;
        background: transparent; border: 1px solid var(--vc-border); color: var(--vc-ink);
        border-radius: 3px; padding: 11px 18px; font-size: 12.5px; cursor: pointer; margin-bottom: 12px;
      }
      .vc-upload-label:hover { border-color: var(--vc-ink); }
      .vc-proof-preview { width: 100%; max-width: 220px; border-radius: 4px; margin: 0 auto 12px; display: block; }

      /* footer */
      .vc-footer {
        max-width: 1180px;
        margin: 20px auto 0;
        padding: 50px 20px 56px;
        border-top: 1px solid var(--vc-border);
        text-align: center;
      }
      .vc-footer .vc-monogram { margin: 0 auto 14px; }
      .vc-footer-brand {
        font-family: 'Fraunces', serif;
        color: var(--vc-ink);
        font-size: 16px;
        margin-bottom: 6px;
      }
      .vc-footer-tag { color: var(--vc-ink-soft); font-size: 12.5px; margin-bottom: 24px; }
      .vc-trust-row {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 24px;
        font-size: 11.5px;
        color: var(--vc-ink-soft);
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .vc-trust-row span { display: flex; align-items: center; gap: 6px; }
      .vc-trust-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--vc-ink); }

      /* toolbar: chips + sort */
      .vc-toolbar {
        max-width: 1180px;
        margin: 0 auto;
        padding: 0 20px 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      .vc-toolbar .vc-chips { padding: 10px 0 6px; margin: 0; flex: 1; }
      .vc-sort-wrap { display: flex; align-items: center; gap: 8px; padding: 10px 0; flex: none; }
      .vc-sort-wrap label { font-size: 11px; color: var(--vc-ink-soft); text-transform: uppercase; letter-spacing: 0.5px; }
      .vc-sort-select {
        background: transparent;
        border: 1px solid var(--vc-border);
        color: var(--vc-ink);
        border-radius: 3px;
        padding: 7px 10px;
        font-size: 12.5px;
        cursor: pointer;
      }
      .vc-sort-select:focus { border-color: var(--vc-ink); outline: none; }

      /* color swatches */
      .vc-attr-value { color: var(--vc-ink-soft); font-weight: 400; text-transform: none; letter-spacing: 0; }
      .vc-swatch-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
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

      /* accordion */
      .vc-accordion { border-top: 1px solid var(--vc-border); margin-top: 24px; }
      .vc-accordion-item { border-bottom: 1px solid var(--vc-border); }
      .vc-accordion-head {
        width: 100%;
        background: none;
        border: none;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
        padding: 14px 0;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--vc-ink);
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        text-align: left;
      }
      .vc-accordion-head-title { flex: 1; min-width: 0; overflow-wrap: break-word; }
      .vc-accordion-chevron { transition: transform .2s ease; color: var(--vc-ink-soft); font-size: 15px; flex: none; }
      .vc-accordion-chevron.open { transform: rotate(180deg); }
      .vc-accordion-body { padding: 0 0 16px; color: var(--vc-ink-soft); font-size: 13px; line-height: 1.6; }

      /* toast */
      .vc-toast {
        position: fixed;
        left: 50%;
        bottom: 26px;
        transform: translateX(-50%);
        background: var(--vc-ink);
        color: #fff;
        padding: 12px 22px;
        border-radius: 999px;
        font-size: 12.5px;
        z-index: 60;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        animation: vc-toast-in .25s ease;
      }
      @keyframes vc-toast-in {
        from { opacity: 0; transform: translate(-50%, 8px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }

      /* shopping bag full page */
      .vc-bag-back {
        background: transparent; border: 1px solid var(--vc-border); color: var(--vc-ink);
        border-radius: 999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .vc-bag-back:hover { border-color: var(--vc-ink); }
      .vc-bag-page { max-width: 640px; margin: 0 auto; padding: 10px 20px 130px; }
      .vc-bag-list { display: flex; flex-direction: column; }
      .vc-bag-checkout-bar {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        background: var(--vc-panel);
        border-top: 1px solid var(--vc-border);
        padding: 16px 20px;
        z-index: 30;
      }


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
        .vc-hero { padding: 48px 20px 40px; }
      }
    `}</style>
  )
}


export default function Store() {
  const [rawVariants, setRawVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [sortBy, setSortBy] = useState('recent') // recent | price_asc | price_desc

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
    setMeta('theme-color', '#faf8f5')
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
    let list = activeCategory === 'Todos' ? products : products.filter((p) => p.category === activeCategory)
    const minPrice = (p) => Math.min(...p.variants.map((v) => v.price))
    if (sortBy === 'price_asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b))
    if (sortBy === 'price_desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a))
    return list
  }, [products, activeCategory, sortBy])

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
            <div className="vc-monogram" style={{ margin: '0 auto 14px' }}>VC</div>
            <p className="vc-logo" style={{ marginBottom: 22 }}>Variedades Calero</p>
            <div className="vc-confirm-icon"><IconCheck /></div>
            <h2 className="vc-serif" style={{ fontWeight: 500, margin: '0 0 8px' }}>¡Pedido recibido!</h2>
            <p style={{ color: 'var(--vc-muted)', fontSize: 14 }}>
              Gracias {clientName.split(' ')[0]}, tu pedido por <b style={{ color: 'var(--vc-ink)' }}>${total.toFixed(2)}</b> fue registrado.
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
            <div className="vc-drawer-empty" style={{ padding: '80px 20px' }}>
              Tu bolsa está vacía.<br />Volvé al catálogo para agregar productos.
              <div style={{ marginTop: 20 }}>
                <button className="vc-btn-ghost" style={{ width: 'auto', padding: '10px 22px' }} onClick={() => setStep('catalog')}>
                  Ir al catálogo
                </button>
              </div>
            </div>
          ) : (
            <div className="vc-bag-list">
              {cart.map((i) => (
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
              <button className="vc-btn-ghost" onClick={() => setStep('bag')}>
                <IconChevronLeft size={14} /> Volver a la bolsa
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

      <section className="vc-hero">
        <div className="vc-hero-inner">
          <div className="vc-eyebrow">Masatepe, Nicaragua</div>
          <h1>Piezas que se notan.</h1>
          <p>Ropa, calzado y accesorios elegidos con cuidado. Pedí en línea y coordinamos la entrega directo con vos.</p>
          <button
            className="vc-hero-cta"
            onClick={() => document.getElementById('vc-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Explorar catálogo
          </button>
        </div>
      </section>
      <div className="vc-stitch" />

      <div className="vc-section-head" id="vc-catalog">
        <div>
          <div className="vc-eyebrow" style={{ marginBottom: 8 }}>Catálogo</div>
          <h2>Todo lo disponible ahora</h2>
        </div>
        {!loading && <span className="vc-section-count">{filteredProducts.length} artículo{filteredProducts.length !== 1 ? 's' : ''}</span>}
      </div>

      <div className="vc-toolbar">
        {categories.length > 1 && (
          <div className="vc-chips" style={{ padding: '10px 20px 6px' }}>
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

      <footer className="vc-footer">
        <div className="vc-monogram">VC</div>
        <div className="vc-footer-brand">Variedades Calero</div>
        <p className="vc-footer-tag">Hecho con cariño en Masatepe, Nicaragua.</p>
        <div className="vc-trust-row">
          <span><span className="vc-trust-dot" />Pago por transferencia</span>
          <span><span className="vc-trust-dot" />Entrega coordinada</span>
          <span><span className="vc-trust-dot" />Atención personalizada</span>
        </div>
      </footer>

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

            {activeModalVariant ? (
              <p className={`vc-stock-note ${activeModalVariant.stock <= 5 ? 'low' : 'ok'}`}>
                {activeModalVariant.stock <= 5 ? `Solo quedan ${activeModalVariant.stock} disponibles` : 'Disponible'}
              </p>
            ) : (
              <p className="vc-stock-note low">Esa combinación no está disponible</p>
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
              Agregar a la bolsa
            </button>

            <div className="vc-accordion">
              {[
                { key: 'details', title: 'Detalles del producto', body: `${selectedProduct.name} — categoría ${selectedProduct.category}. Pieza seleccionada por Variedades Calero.` },
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
                  {openSection === s.key && <div className="vc-accordion-body">{s.body}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="vc-toast">{toast}</div>}
    </div>
  )
}
