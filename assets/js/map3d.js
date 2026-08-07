/**
 * Opt-in photorealistic 3D, scoped to one lot.
 *
 * This is the only place the maps3d library is ever loaded, and the
 * <gmp-map-3d> element is destroyed on close — so the default page never pays
 * for terrain tiles or CLAMP_TO_GROUND polygon draping.
 */

import { state } from './state.js';

let byId = {};
let modal, stage, titleEl, openerBtn;
let mapEl = null;
let libs = null;
let loading = false;

async function ensureLibs() {
  if (libs) return libs;
  const { Map3DElement, Polygon3DElement, MapMode } = await google.maps.importLibrary('maps3d');
  libs = { Map3DElement, Polygon3DElement, MapMode };
  return libs;
}

function destroyMap() {
  mapEl?.remove();
  mapEl = null;
}

async function open(lotId) {
  const lot = byId[lotId];
  if (!lot || loading) return;

  openerBtn = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  titleEl.textContent = lot.name;

  loading = true;
  stage.dataset.status = 'loading';

  try {
    const { Map3DElement, Polygon3DElement, MapMode } = await ensureLibs();

    destroyMap();
    mapEl = new Map3DElement({
      center: { ...lot.center, altitude: 0 },
      range: 700,
      tilt: 60,
      heading: 0,
      mode: MapMode?.HYBRID ?? 'HYBRID',
    });
    mapEl.className = 'absolute inset-0 w-full h-full';

    const polygon = new Polygon3DElement();
    polygon.altitudeMode = 'CLAMP_TO_GROUND';
    polygon.fillColor = 'rgba(255, 178, 60, 0.55)';
    polygon.strokeColor = '#B45309';
    polygon.strokeWidth = 4;
    polygon.outerCoordinates = lot.path.map(({ lat, lng }) => ({ lat, lng, altitude: 0 }));
    mapEl.append(polygon);

    stage.append(mapEl);
    stage.dataset.status = 'ready';
  } catch (err) {
    console.error('3D view failed to load:', err);
    stage.dataset.status = 'error';
  } finally {
    loading = false;
  }

  modal.querySelector('#lot3d-close').focus();
}

function close() {
  modal.hidden = true;
  document.body.style.overflow = '';
  destroyMap();
  stage.dataset.status = 'idle';
  openerBtn?.focus?.();
}

export function initMap3D(lotsById) {
  byId = lotsById;
  modal   = document.getElementById('lot3d-modal');
  stage   = document.getElementById('lot3d-stage');
  titleEl = document.getElementById('lot3d-title');
  if (!modal) return;

  document.getElementById('card-3d').addEventListener('click', () => {
    if (state.activeLotId) open(state.activeLotId);
  });
  document.getElementById('lot3d-close').addEventListener('click', close);
  modal.querySelector('[data-backdrop]').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
}
