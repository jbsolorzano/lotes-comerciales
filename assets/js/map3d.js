/**
 * Opt-in photorealistic 3D, scoped to one lot.
 *
 * This is the only place the maps3d library is ever loaded, and the
 * <gmp-map-3d> element is destroyed on close — so the default page never pays
 * for terrain tiles or CLAMP_TO_GROUND polygon draping.
 */

import { state } from './state.js';

/* ── Camera framing ──────────────────────────────────────────────────────────
   Map3DElement aims the camera at `center` and puts that point in the middle of
   the viewport, so centring is purely a matter of naming the right target;
   `range`, the camera-to-target distance in metres, is the only zoom control.

   Both inputs were wrong before. `center.altitude` is documented as "meters
   above the mean sea level", and it was 0 — but Tres Marías sits at 2015 m, a
   figure the KML itself carries on three of its placemarks. The camera was
   aimed two kilometres underground, which is what knocked the parcel off
   centre. And `range` was a flat 700 m whether the lot was 2,200 m2 or
   16,600 m2, which is the "sometimes too close, sometimes too far".

   Tilt and heading are unchanged at 60/0; they are inputs to the fit below,
   not something it overrides. */

const SITE_ALTITUDE_M = 2015; // above mean sea level, per the KML's own figure
const TILT_DEG    = 60;
const HEADING_DEG = 0;
const FOV_DEG     = 35;  // Map3DElement's default vertical field of view
const FILL_RATIO  = 0.65; // parcel occupies at most this much of each axis
const MIN_RANGE_M = 90;
const MAX_RANGE_M = 3000;

const M_PER_DEG_LAT = 111_320;
const rad = (deg) => (deg * Math.PI) / 180;

/**
 * The smallest camera distance that still holds every vertex of `path` inside
 * the frustum, at the tilt and heading we already use.
 *
 * Working in a local east/north metre frame centred on the target: the camera
 * sits at `target - range * forward`, so moving `range` slides the camera along
 * its own view axis. A vertex's screen-space x and y are therefore constant in
 * `range` and only its depth changes, as `z = z0 + range`. Each frustum edge
 * |x| <= z * tan(fov/2) collapses to a plain lower bound on `range`, and the
 * answer is simply the largest of them — no iteration, and perspective is exact
 * rather than approximated.
 *
 * That exactness is the point of doing it this way. Tilt foreshortens the far
 * half of a parcel and magnifies the near half, so the near edge needs roughly
 * 2.5x the room the far edge does; a symmetric fit would either clip the near
 * edge or waste most of the frame.
 */
function rangeToFit(path, target, aspect) {
  const t = rad(TILT_DEG), h = rad(HEADING_DEG);
  const sinT = Math.sin(t), cosT = Math.cos(t);
  const sinH = Math.sin(h), cosH = Math.cos(h);

  // Shrinking the half-angles is what makes the fit "comfortable" — the parcel
  // is framed within FILL_RATIO of each axis, leaving a margin all round.
  const tanV = Math.tan(rad(FOV_DEG) / 2) * FILL_RATIO;
  const tanH = tanV * aspect;

  const mPerDegLng = M_PER_DEG_LAT * Math.cos(rad(target.lat));

  let range = MIN_RANGE_M;
  for (const p of path) {
    const east  = (p.lng - target.lng) * mPerDegLng;
    const north = (p.lat - target.lat) * M_PER_DEG_LAT;

    const away  = east * sinH + north * cosH; // along the view azimuth
    const right = east * cosH - north * sinH; // across it

    range = Math.max(
      range,
      Math.abs(right) / tanH - sinT * away,          // left and right edges
      (cosT * Math.abs(away)) / tanV - sinT * away,  // top and bottom edges
    );
  }
  return Math.min(range, MAX_RANGE_M);
}

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

    // Measured after the await, so the modal has laid out. A portrait phone
    // needs roughly double the range of a desktop stage to fit the same parcel
    // across its much narrower frame, so this cannot be a constant.
    const aspect = stage.clientHeight > 0 ? stage.clientWidth / stage.clientHeight : 16 / 9;

    mapEl = new Map3DElement({
      center: { ...lot.centroid, altitude: SITE_ALTITUDE_M },
      range: rangeToFit(lot.path, lot.centroid, aspect),
      tilt: TILT_DEG,
      heading: HEADING_DEG,
      fov: FOV_DEG, // stated rather than assumed, so the fit maths is exact
      mode: MapMode?.HYBRID ?? 'HYBRID',
    });
    mapEl.className = 'absolute inset-0 w-full h-full';

    const polygon = new Polygon3DElement();
    polygon.altitudeMode = 'CLAMP_TO_GROUND';
    polygon.fillColor = 'rgba(255, 178, 60, 0.55)';
    polygon.strokeColor = '#B45309';
    polygon.strokeWidth = 4;
    // `path` replaces the deprecated `outerCoordinates`. CLAMP_TO_GROUND ignores
    // the altitude component, so plain LatLngLiterals are enough — but they must
    // be fresh objects, since lot.path is shared with the 2D polygon.
    polygon.path = lot.path.map(({ lat, lng }) => ({ lat, lng }));
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
