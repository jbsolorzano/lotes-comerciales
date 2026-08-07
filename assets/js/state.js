/**
 * Single source of truth for selection / hover / filter, plus a tiny event bus.
 *
 * The map and the sidebar both read and write here instead of reaching into
 * each other's DOM, which is what made the previous implementation hard to
 * keep in sync.
 */

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

function emit(event, payload) {
  for (const fn of listeners.get(event) ?? []) fn(payload);
}

export const state = {
  activeLotId: null,
  hoveredLotId: null,
  filter: 'ALL',
  /** Extra bottom inset the map camera must avoid — the mobile sheet writes here. */
  mapPadding: { top: 24, right: 24, bottom: 24, left: 24 },
};

// select/hover emit { current, previous } so subscribers can repaint just the
// two shapes that changed instead of sweeping all 49 on every mouse move.

export function select(lotId) {
  if (state.activeLotId === lotId) return;
  const previous = state.activeLotId;
  state.activeLotId = lotId;
  emit('select', { current: lotId, previous });
}

export function hover(lotId) {
  if (state.hoveredLotId === lotId) return;
  const previous = state.hoveredLotId;
  state.hoveredLotId = lotId;
  emit('hover', { current: lotId, previous });
}

export function setFilter(usoKey) {
  if (state.filter === usoKey) return;
  state.filter = usoKey;
  emit('filter', usoKey);
}

/** True when the lot passes the active uso_suelo filter. */
export const passesFilter = (lot) => state.filter === 'ALL' || lot.usoKey === state.filter;

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const canHover = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;
