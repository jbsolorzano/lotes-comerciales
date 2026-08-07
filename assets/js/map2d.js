/**
 * The 2D map. Replaces the previous <gmp-map-3d> + hand-rolled hit-testing.
 *
 * The old implementation ran a point-in-polygon test against every lot on every
 * gmp-mousemove and re-draped CLAMP_TO_GROUND polygons over photorealistic
 * terrain on every style change. google.maps.Polygon hit-tests natively and
 * repaints a flat vector overlay, which is what actually fits this use case:
 * flat parcels seen from directly above.
 */

import { styleFor } from './lots.js';
import { on, select, hover, state, passesFilter, canHover } from './state.js';

/** fitBounds on a small parcel would otherwise slam past useful imagery. */
const MAX_FOCUS_ZOOM = 18;

let map = null;
let byId = {};
const polygons = Object.create(null);
let homeBounds = null;

function paint(lotId) {
  const poly = polygons[lotId];
  const lot = byId[lotId];
  if (!poly || !lot) return;

  const mode =
    state.activeLotId === lotId ? 'selected'
    : state.hoveredLotId === lotId ? 'hover'
    : 'default';

  poly.setOptions(styleFor(lot.estadoKey, mode));
}

/** Frame the selected lot, keeping it clear of the sidebar/card/sheet. */
function focusLot(lotId) {
  const lot = byId[lotId];
  if (!lot || !map) return;

  // fitBounds sets the viewport outright rather than animating a pan, so it is
  // already reduced-motion friendly.
  map.fitBounds(lot.bounds, { ...state.mapPadding });
  google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
    if (map.getZoom() > MAX_FOCUS_ZOOM) map.setZoom(MAX_FOCUS_ZOOM);
  });
}

export async function initMap2D({ container, lots, byId: lotsById, bounds }) {
  byId = lotsById;
  homeBounds = bounds;

  const { Map } = await google.maps.importLibrary('maps');
  const { ControlPosition } = await google.maps.importLibrary('core');

  map = new Map(container, {
    center: { lat: 19.7224545, lng: -101.1175265 },
    zoom: 15,
    mapTypeId: 'hybrid',
    tilt: 0,
    gestureHandling: 'greedy', // one-finger pan; the sheet owns vertical drag
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    rotateControl: false,
    zoomControl: true,
    zoomControlOptions: { position: ControlPosition.RIGHT_TOP },
    // Replaces the old setTimeout + shadowRoot + !important control hack.
  });

  const hoverable = canHover();
  let lastPolygonClick = 0;

  for (const lot of lots) {
    const polygon = new google.maps.Polygon({
      paths: lot.path,
      map,
      clickable: true,
      ...styleFor(lot.estadoKey, 'default'),
    });

    polygon.addListener('click', () => {
      lastPolygonClick = performance.now();
      select(lot.lotId);
    });

    if (hoverable) {
      polygon.addListener('mouseover', () => hover(lot.lotId));
      polygon.addListener('mouseout', () => hover(null));
    }

    polygons[lot.lotId] = polygon;
  }

  // Clicking bare map deselects. Polygon clicks bubble here in some builds, so
  // ignore anything arriving on the heels of a polygon hit.
  map.addListener('click', () => {
    if (performance.now() - lastPolygonClick < 50) return;
    select(null);
  });

  if (homeBounds) map.fitBounds(homeBounds, 32);

  on('select', ({ current, previous }) => {
    if (previous) paint(previous);
    if (current) {
      paint(current);
      focusLot(current);
    }
  });

  on('hover', ({ current, previous }) => {
    if (previous) paint(previous);
    if (current) paint(current);
  });

  on('filter', () => {
    for (const [id, poly] of Object.entries(polygons)) {
      poly.setVisible(passesFilter(byId[id]));
    }
  });

  return map;
}
