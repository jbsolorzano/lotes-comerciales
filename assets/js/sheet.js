/**
 * Mobile bottom sheet.
 *
 * Below the md breakpoint the sidebar <aside> becomes a draggable sheet over a
 * full-bleed map; at md and up it reverts to the static 320px left panel and
 * every transform written here is cleared.
 *
 * There is only one #lot-detail-card in the DOM. Rather than duplicating the
 * markup, it is relocated between the map container (desktop) and the sheet
 * body (mobile) whenever the breakpoint changes.
 */

import { on, select, state, prefersReducedMotion, isDesktop } from './state.js';

const PEEK_PX = 88;              // handle + filter trigger peeking above the fold
const HALF_RATIO = 0.5;          // of the explorer section height
const VELOCITY_THRESHOLD = 0.5;  // px/ms — above this, follow the flick
const EASE = 'transform 260ms cubic-bezier(.32,.72,0,1)';

let sheet, handle, listView, detailView, card, mapContainer, backBtn;
let snap = 'peek';

const desktopMQ = window.matchMedia('(min-width: 768px)');

/* ── Geometry ────────────────────────────────────────────────────────────── */

const sheetHeight = () => sheet.offsetHeight;

function offsets() {
  const h = sheetHeight();
  return {
    full: 0,
    half: Math.max(0, h - h * HALF_RATIO),
    peek: Math.max(0, h - PEEK_PX),
  };
}

/** Height of the sheet currently covering the map, for camera padding. */
const visibleHeight = () => sheetHeight() - offsets()[snap];

function syncMapPadding() {
  state.mapPadding = isDesktop()
    ? { top: 24, right: 24, bottom: 24, left: 360 } // detail card overlays bottom-left
    : { top: 24, right: 24, bottom: visibleHeight() + 24, left: 24 };
}

/* ── Snapping ────────────────────────────────────────────────────────────── */

function applyTransform(px, animate) {
  sheet.style.transition = animate && !prefersReducedMotion() ? EASE : 'none';
  sheet.style.transform = `translateY(${px}px)`;
}

export function setSnap(next, animate = true) {
  snap = next;
  sheet.dataset.snap = next;
  applyTransform(offsets()[next], animate);
  syncBodyHeight();
  syncMapPadding();
}

/**
 * The sheet is a fixed-height element slid down by a transform, so its scroll
 * areas would otherwise be sized to the whole sheet — including the part hanging
 * below the fold, which no amount of scrolling can reach. Cap the body to what
 * is actually on screen at the current snap.
 */
function syncBodyHeight() {
  const body = Math.max(0, visibleHeight() - handle.offsetHeight);
  sheet.style.setProperty('--sheet-body', `${body}px`);
}

function nearestSnap(px, velocity) {
  const o = offsets();
  const order = ['full', 'half', 'peek']; // ascending translateY

  if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
    const i = order.indexOf(snap);
    // velocity > 0 means dragging downward → collapse one step
    const next = velocity > 0 ? Math.min(i + 1, order.length - 1) : Math.max(i - 1, 0);
    return order[next];
  }
  return order.reduce((best, name) =>
    Math.abs(o[name] - px) < Math.abs(o[best] - px) ? name : best
  , order[0]);
}

/* ── Drag ────────────────────────────────────────────────────────────────── */

function initDrag() {
  let startY = 0, startOffset = 0, lastY = 0, lastT = 0, velocity = 0, dragging = false;

  handle.addEventListener('pointerdown', (e) => {
    if (isDesktop()) return;
    dragging = true;
    startY = lastY = e.clientY;
    lastT = e.timeStamp;
    velocity = 0;
    startOffset = offsets()[snap];
    handle.setPointerCapture(e.pointerId);
    sheet.style.transition = 'none';
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    const o = offsets();
    const px = Math.min(o.peek, Math.max(o.full, startOffset + (e.clientY - startY)));
    sheet.style.transform = `translateY(${px}px)`;

    const dt = e.timeStamp - lastT;
    if (dt > 0) velocity = (e.clientY - lastY) / dt;
    lastY = e.clientY;
    lastT = e.timeStamp;
  });

  function end(e) {
    if (!dragging) return;
    dragging = false;
    handle.releasePointerCapture?.(e.pointerId);

    const moved = Math.abs(e.clientY - startY);
    // A tap (rather than a drag) cycles through the snap points, so the sheet
    // is usable without a gesture at all.
    if (moved < 6) {
      setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek');
      return;
    }

    const current = startOffset + (e.clientY - startY);
    setSnap(nearestSnap(current, velocity));
  }

  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);

  handle.addEventListener('keydown', (e) => {
    if (isDesktop()) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSnap(snap === 'peek' ? 'half' : 'full');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSnap(snap === 'full' ? 'half' : 'peek');
    }
  });
}

/* ── list ⇄ detail ───────────────────────────────────────────────────────── */

// Applied only while the card floats over the map; stripped when it moves into
// the sheet, where it is just a block of the scrolling body.
const DESKTOP_CARD_CLASSES = [
  'absolute', 'bottom-4', 'left-4', 'w-80', 'max-h-[calc(100%-2rem)]',
  'overflow-y-auto', 'border', 'border-stone-200', 'shadow-2xl', 'z-20',
];

function setMode(next) {
  const showDetail = next === 'detail' && !isDesktop();
  listView.hidden = showDetail;
  detailView.hidden = !showDetail;
  backBtn.hidden = !showDetail;
}

/** Move the single detail card between the map container and the sheet body. */
function placeCard() {
  if (isDesktop()) {
    if (card.parentElement !== mapContainer) mapContainer.appendChild(card);
    card.classList.add(...DESKTOP_CARD_CLASSES);
    setMode('list');
  } else {
    if (card.parentElement !== detailView) detailView.appendChild(card);
    card.classList.remove(...DESKTOP_CARD_CLASSES);
    setMode(state.activeLotId ? 'detail' : 'list');
  }
}

function applyBreakpoint() {
  if (isDesktop()) {
    sheet.style.transition = 'none';
    sheet.style.transform = '';
    delete sheet.dataset.snap;
  } else {
    setSnap(snap, false);
  }
  placeCard();
  syncMapPadding();
}

/* ── Wiring ──────────────────────────────────────────────────────────────── */

export function initSheet() {
  sheet        = document.getElementById('lot-sheet');
  handle       = document.getElementById('sheet-handle');
  listView     = document.getElementById('sheet-list-view');
  detailView   = document.getElementById('sheet-detail-view');
  backBtn      = document.getElementById('sheet-back');
  card         = document.getElementById('lot-detail-card');
  mapContainer = document.getElementById('map-container');

  initDrag();
  backBtn.addEventListener('click', () => select(null));

  on('select', ({ current }) => {
    if (isDesktop()) return;
    if (current) {
      setMode('detail');
      if (snap === 'peek') setSnap('half');
      else syncMapPadding();
    } else {
      setMode('list');
    }
  });

  desktopMQ.addEventListener('change', applyBreakpoint);
  window.addEventListener('resize', () => {
    if (!isDesktop()) syncBodyHeight();
    syncMapPadding();
  });
  window.addEventListener('orientationchange', () => setTimeout(applyBreakpoint, 150));

  applyBreakpoint();
}
