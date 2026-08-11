/**
 * Sidebar list, uso-de-suelo filter dropdown, and the lot detail card.
 * Everything here reacts to state.js — it never talks to the map directly.
 */

import { badgeFor, norm } from './lots.js';
import { on, select, hover, setFilter, state, passesFilter, prefersReducedMotion, canHover } from './state.js';

const WHATSAPP = '5544996922';

let byId = {};

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

function itemHTML({ name, uso_suelo, superficie_m2, estado, estadoKey, valor_final }) {
  const precioLine = valor_final
    ? `<p class="text-xs text-stone-600 font-semibold mt-1.5">${valor_final} MXN</p>`
    : '';
  return `
    <div class="flex justify-between items-start mb-2 gap-2">
      <span class="text-[10px] uppercase tracking-tighter text-secondary font-bold text-left">${uso_suelo}</span>
      <span class="text-[10px] px-2 py-0.5 border ${badgeFor(estadoKey)} uppercase whitespace-nowrap">${estado}</span>
    </div>
    <h4 class="font-serif text-sm mb-1 text-primary text-left">${name}</h4>
    <p class="text-xs text-stone-400 text-left">${superficie_m2} m²</p>
    ${precioLine}`;
}

function buildSidebar(lots) {
  const list = document.getElementById('plot-list');
  const frag = document.createDocumentFragment();

  for (const lot of lots) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className =
      'plot-item w-full block p-4 border border-stone-200 bg-white cursor-pointer text-left ' +
      'transition-colors hover:border-stone-400 focus-visible:outline-none ' +
      'focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1';
    item.dataset.lotId = lot.lotId;
    item.dataset.usoKey = lot.usoKey;
    item.setAttribute('aria-pressed', 'false');
    item.innerHTML = itemHTML(lot);

    item.addEventListener('click', () => select(lot.lotId));
    if (canHover()) {
      item.addEventListener('mouseenter', () => hover(lot.lotId));
      item.addEventListener('mouseleave', () => hover(null));
    }
    frag.appendChild(item);
  }

  list.appendChild(frag);
}

const items = () => document.querySelectorAll('#plot-list > .plot-item');
const itemFor = (lotId) =>
  lotId ? document.querySelector(`#plot-list > .plot-item[data-lot-id="${lotId}"]`) : null;

function markItem(el, isActive) {
  if (!el) return;
  el.classList.toggle('border-stone-800', isActive);
  el.classList.toggle('bg-stone-50', isActive);
  el.setAttribute('aria-pressed', String(isActive));
}

// Touch only the two rows that changed — a full sweep would trip Tailwind's
// document MutationObserver 49 times per interaction.
function paintSelection({ current, previous }) {
  markItem(itemFor(previous), false);
  const el = itemFor(current);
  markItem(el, true);
  el?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'nearest',
  });
}

function applyFilterToSidebar(usoKey) {
  let visible = 0;
  for (const el of items()) {
    const show = usoKey === 'ALL' || el.dataset.usoKey === usoKey;
    el.hidden = !show;
    if (show) visible++;
  }
  const empty = document.getElementById('plot-empty');
  if (empty) empty.hidden = visible > 0;
  const count = document.getElementById('plot-count');
  if (count) count.textContent = `${visible} ${visible === 1 ? 'lote' : 'lotes'}`;
}

/* ── Detail card ─────────────────────────────────────────────────────────── */

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

function showCard(lotId) {
  const lot = byId[lotId];
  if (!lot) return;

  setText('card-ref', lot.lotId.toUpperCase());
  setText('card-name', lot.name);
  setText('card-zoning', lot.uso_suelo);
  setText('card-area', `${lot.superficie_m2} m²`);
  setText('card-sector', `Manzana ${lot.manzana}`);
  setText('card-estado', lot.estado);
  setText('card-precio-m2', lot.precio_por_m2 ? `${lot.precio_por_m2} MXN/m²` : '—');
  setText('card-precio', lot.valor_final ? `${lot.valor_final} MXN` : '—');

  const msg = encodeURIComponent(`Estoy interesado en ${lot.name} del proyecto Distrito Zalce.`);
  document.getElementById('card-cta').href = `https://wa.me/${WHATSAPP}?text=${msg}`;

  document.getElementById('lot-detail-card').hidden = false;
}

function hideCard() {
  document.getElementById('lot-detail-card').hidden = true;
}

/* ── Filter dropdown ─────────────────────────────────────────────────────── */

function initFilter() {
  const trigger  = document.getElementById('filter-trigger');
  const panel    = document.getElementById('filter-panel');
  const inner    = document.getElementById('filter-inner');
  const chevron  = document.getElementById('filter-chevron');
  const labelEl  = document.getElementById('filter-label');
  const dropdown = document.getElementById('filter-dropdown');
  let isOpen = false;

  function open() {
    isOpen = true;
    trigger.setAttribute('aria-expanded', 'true');
    panel.style.height = panel.scrollHeight + 'px';
    chevron.style.transform = 'rotate(180deg)';
    if (prefersReducedMotion()) {
      inner.style.opacity = '1';
      inner.style.transform = 'none';
      return;
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        inner.style.opacity = '1';
        inner.style.transform = 'translateY(0)';
      })
    );
  }

  function close() {
    isOpen = false;
    trigger.setAttribute('aria-expanded', 'false');
    inner.style.opacity = '0';
    inner.style.transform = 'translateY(-4px)';
    panel.style.height = '0';
    chevron.style.transform = '';
  }

  trigger.addEventListener('click', () => (isOpen ? close() : open()));

  document.addEventListener('click', (e) => {
    if (isOpen && !dropdown.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      close();
      trigger.focus();
    }
  });

  const options = document.querySelectorAll('.filter-option');
  for (const opt of options) {
    opt.addEventListener('click', () => {
      for (const o of options) {
        o.style.borderLeftColor = 'transparent';
        o.setAttribute('aria-checked', 'false');
        o.querySelector('span:last-child').style.cssText = 'color:rgb(120,113,108);font-weight:400;';
        o.querySelector('.material-symbols-outlined').style.color = 'rgb(168,162,158)';
      }
      opt.style.borderLeftColor = 'rgb(28,25,23)';
      opt.setAttribute('aria-checked', 'true');
      opt.querySelector('span:last-child').style.cssText = 'color:rgb(28,25,23);font-weight:600;';
      opt.querySelector('.material-symbols-outlined').style.color = 'rgb(87,83,78)';

      if (prefersReducedMotion()) {
        labelEl.textContent = opt.dataset.label;
        close();
      } else {
        labelEl.style.opacity = '0';
        setTimeout(() => {
          labelEl.textContent = opt.dataset.label;
          labelEl.style.opacity = '1';
        }, 150);
        opt.style.background = 'rgb(231,229,228)';
        setTimeout(() => {
          opt.style.background = '';
          close();
        }, 130);
      }

      const raw = opt.dataset.filter;
      setFilter(raw === 'all' ? 'ALL' : norm(raw));
    });
  }
}

/* ── Wiring ──────────────────────────────────────────────────────────────── */

export function initUI(lots, lotsById) {
  byId = lotsById;

  buildSidebar(lots);
  initFilter();
  applyFilterToSidebar('ALL');

  document.getElementById('card-close').addEventListener('click', () => select(null));

  on('select', (change) => {
    paintSelection(change);
    if (change.current) showCard(change.current);
    else hideCard();
  });

  on('filter', (usoKey) => {
    applyFilterToSidebar(usoKey);
    // A hidden lot must not stay selected.
    const active = state.activeLotId && byId[state.activeLotId];
    if (active && !passesFilter(active)) select(null);
  });
}
