/**
 * Bootstrap. Order matters in one place: the sheet must subscribe to `select`
 * before the map does, so the camera padding it publishes is already correct
 * when map2d runs fitBounds for the newly selected lot.
 */

import { loadLots } from './lots.js';
import { initUI } from './ui.js';
import { initSheet } from './sheet.js';
import { initMap2D } from './map2d.js';
import { initMap3D } from './map3d.js';
import { initHero } from './hero.js';
import { initNav } from './nav.js';

function fail(message) {
  const el = document.getElementById('map-status');
  if (el) {
    el.hidden = false;
    el.textContent = message;
  }
}

/**
 * Google calls this when it rejects the API key — wrong HTTP referrer, API not
 * enabled, or billing disabled. It fires *after* the Map is constructed, so
 * without it the visitor is left staring at Google's grey "Oops! Something went
 * wrong" panel and the page reads as broken. The lot list, filters and
 * WhatsApp CTA all keep working, so say so.
 */
window.gm_authFailure = () => {
  fail('El mapa no está disponible por el momento. Puedes seguir explorando los lotes en la lista.');
  console.error(
    'Google Maps rejected the API key for this origin (%s). Add it to the ' +
    'key\'s HTTP referrer allowlist in Google Cloud Console — note that the ' +
    'Maps JavaScript API does not support IP address restrictions.',
    location.origin
  );
};

async function start() {
  initNav();
  initHero();

  let data;
  try {
    data = await loadLots();
  } catch (err) {
    console.error(err);
    fail('No fue posible cargar la información de los lotes.');
    return;
  }

  const { lots, byId, bounds } = data;
  console.info(`Lotes con geometría: ${lots.length}`);

  initUI(lots, byId);
  initSheet();
  initMap3D(byId);

  try {
    await initMap2D({
      container: document.getElementById('map-canvas'),
      lots,
      byId,
      bounds,
    });
    document.getElementById('map-status').hidden = true;
  } catch (err) {
    console.error(err);
    fail('No fue posible cargar el mapa.');
  }
}

start();
