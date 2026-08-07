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

const PAN_DURATION_MS = 650;

/** Cubic ease-in-out: gentle start, quick middle, soft landing. */
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let map = null;
let byId = {};
const polygons = Object.create(null);
let homeBounds = null;
let panFrame = null;

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

function cancelPan() {
  if (panFrame === null) return;
  cancelAnimationFrame(panFrame);
  panFrame = null;
}

/**
 * Shift the camera target so the lot lands in the middle of the *visible* map,
 * not the middle of the viewport — the detail card covers the bottom-left 320px
 * on desktop, and the sheet covers the lower half on mobile. This is the job
 * fitBounds used to do with its padding argument.
 *
 * World coordinates are y-down like screen pixels, so for a lot to render at
 * the visible centre the camera centre must sit at
 *   lot + (padBottom - padTop) / 2  vertically, and (padRight - padLeft) / 2
 * horizontally, converted from pixels to world units by the zoom scale.
 */
function visibleCentreFor(center) {
  const projection = map.getProjection();
  const zoom = map.getZoom();
  if (!projection || typeof zoom !== 'number') return center;

  const p = state.mapPadding;
  const dx = (p.right - p.left) / 2;
  const dy = (p.bottom - p.top) / 2;
  if (!dx && !dy) return center;

  const scale = 2 ** zoom;
  const world = projection.fromLatLngToPoint(new google.maps.LatLng(center));
  const shifted = new google.maps.Point(world.x + dx / scale, world.y + dy / scale);
  return projection.fromPointToLatLng(shifted).toJSON();
}

/**
 * Glide the camera to a new centre.
 *
 * panTo() only animates when the move is smaller than the map's own width and
 * height, so selections across the development would snap; fitBounds() animates
 * only per undocumented internal heuristics. moveCamera() is instant by
 * contract, which makes it the right primitive to step ourselves from rAF with
 * an easing curve we control. Zoom is deliberately left alone.
 */
function panCameraTo(target) {
  cancelPan();

  const from = map.getCenter()?.toJSON();
  if (!from) {
    map.setCenter(target);
    return;
  }

  const start = performance.now();
  const step = (now) => {
    // rAF's timestamp can precede performance.now(), so clamp both ends.
    const t = Math.min(Math.max((now - start) / PAN_DURATION_MS, 0), 1);
    const k = easeInOut(t);
    map.moveCamera({
      center: {
        lat: from.lat + (target.lat - from.lat) * k,
        lng: from.lng + (target.lng - from.lng) * k,
      },
    });
    panFrame = t < 1 ? requestAnimationFrame(step) : null;
  };
  panFrame = requestAnimationFrame(step);
}

/** Bring the selected lot into view, clear of the sidebar/card/sheet. */
function focusLot(lotId) {
  const lot = byId[lotId];
  if (!lot || !map) return;
  panCameraTo(visibleCentreFor(lot.center));
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

  // A visitor grabbing the map mid-glide must win; otherwise the tween keeps
  // writing the centre underneath their drag.
  map.addListener('dragstart', cancelPan);

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
