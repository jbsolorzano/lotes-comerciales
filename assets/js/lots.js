/**
 * Data layer: fetches the KML geometry + the business metadata, joins them,
 * and exposes the style tables keyed by a normalised `estado`.
 *
 * The map is KML-driven: lots present in lotes-data.json but with no Placemark
 * have no geometry and are intentionally not surfaced anywhere.
 */

const KML_URL  = 'assets/predios-Tres-Marias.kml';
const DATA_URL = 'assets/lotes-data.json';

/** Accent- and whitespace-insensitive upper-case key, so "NEGOCIACION" and
 *  "EN NEGOCIACIÓN" resolve to the same style. */
export const norm = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // strip the combining marks NFD just split off
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

const ESTADO_ALIASES = {
  'EN NEGOCIACION': 'NEGOCIACION',
};

const estadoKeyOf = (estado) => {
  const k = norm(estado);
  return ESTADO_ALIASES[k] ?? k;
};

/* ── Style tables ───────────────────────────────────────────────────────────
   The 3D API took a single rgba() fill; google.maps.Polygon splits colour and
   opacity, so alpha moves into fillOpacity. Opacities sit ~0.08 above the old
   alpha values to compensate for the flat dim overlay replacing the CSS
   brightness filter on the map surface. */

const STYLES = {
  DEFAULT: {
    'VENDIDO':          { fillColor: '#6E6E78', fillOpacity: 0.88, strokeColor: '#555560', strokeWeight: 2 },
    'NEGOCIACION':      { fillColor: '#A0D2D4', fillOpacity: 0.68, strokeColor: '#5AAAB0', strokeWeight: 2 },
    'DESARROLLO HERSO': { fillColor: '#DCB9AF', fillOpacity: 0.68, strokeColor: '#C9897C', strokeWeight: 2 },
    'DISPONIBLE':       { fillColor: '#4A6FD4', fillOpacity: 0.68, strokeColor: '#3A5AAD', strokeWeight: 2 },
  },
  HOVER: {
    'VENDIDO':          { fillColor: '#82828C', fillOpacity: 0.95, strokeColor: '#333338', strokeWeight: 3 },
    'NEGOCIACION':      { fillColor: '#82C8CD', fillOpacity: 0.88, strokeColor: '#3A8A90', strokeWeight: 3 },
    'DESARROLLO HERSO': { fillColor: '#C89B91', fillOpacity: 0.88, strokeColor: '#A86055', strokeWeight: 3 },
    'DISPONIBLE':       { fillColor: '#375ABE', fillOpacity: 0.88, strokeColor: '#253F8A', strokeWeight: 3 },
  },
};

const SELECTED = { fillColor: '#FFB23C', fillOpacity: 0.85, strokeColor: '#B45309', strokeWeight: 3 };

const BADGES = {
  'DISPONIBLE':       'text-blue-600 border-blue-300',
  'VENDIDO':          'text-stone-500 border-stone-300',
  'NEGOCIACION':      'text-cyan-600 border-cyan-300',
  'DESARROLLO HERSO': 'text-rose-400 border-rose-200',
};

/**
 * @param {string} estadoKey normalised estado
 * @param {'default'|'hover'|'selected'} mode
 */
export function styleFor(estadoKey, mode = 'default') {
  if (mode === 'selected') return { ...SELECTED, strokeOpacity: 1, zIndex: 3 };
  const table = mode === 'hover' ? STYLES.HOVER : STYLES.DEFAULT;
  const base  = table[estadoKey] ?? table['DISPONIBLE'];
  return { ...base, strokeOpacity: 1, zIndex: mode === 'hover' ? 2 : 1 };
}

export const badgeFor = (estadoKey) => BADGES[estadoKey] ?? BADGES['DISPONIBLE'];

/** Bounds + centre from a path, ignoring altitude (three placemarks carry a
 *  stray 2015.4m altitude that would skew any 3D-aware maths). */
function boundsOf(path) {
  let north = -Infinity, south = Infinity, east = -Infinity, west = Infinity;
  for (const { lat, lng } of path) {
    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lng > east)  east  = lng;
    if (lng < west)  west  = lng;
  }
  return { north, south, east, west };
}

const centerOf = (b) => ({ lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 });

/**
 * @returns {Promise<{lots: Array, byId: Object, bounds: Object}>}
 */
export async function loadLots() {
  const [kmlRes, dataRes] = await Promise.all([
    fetch(KML_URL),
    fetch(DATA_URL).catch(() => null),
  ]);

  if (!kmlRes.ok) throw new Error(`KML fetch failed: ${kmlRes.status}`);

  const kmlText   = await kmlRes.text();
  const lotesData = dataRes?.ok ? await dataRes.json() : {};

  const kml = new DOMParser().parseFromString(kmlText, 'text/xml');
  const parseErr = kml.getElementsByTagName('parsererror')[0];
  if (parseErr) throw new Error(`KML parse error: ${parseErr.textContent}`);

  // getElementsByTagName is namespace-safe (querySelector can miss elements under xmlns)
  const placemarks = Array.from(kml.getElementsByTagName('Placemark'));

  const lots = [];
  const byId = Object.create(null);

  for (const pm of placemarks) {
    const coordElem = pm.getElementsByTagName('coordinates')[0];
    if (!coordElem) continue;

    const lotId = pm.getAttribute('id') ?? '';
    if (!lotId) continue;

    const {
      estado = 'DISPONIBLE',
      manzana = '—',
      lote = '—',
      uso_suelo = '—',
      superficie_m2 = '—',
      precio_por_m2 = null,
      valor_final = null,
    } = lotesData[lotId] ?? {};

    const path = coordElem.textContent
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((c) => {
        const [lng, lat] = c.split(',').map(Number);
        return { lat, lng };
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (path.length < 3) continue; // degenerate ring — nothing to draw

    const name =
      manzana !== '—' && lote !== '—'
        ? `MZ ${String(manzana).padStart(2, '0')} Lote ${String(lote).padStart(2, '0')}`
        : lotId.toUpperCase();

    const bounds = boundsOf(path);

    const lot = {
      lotId,
      name,
      estado,
      estadoKey: estadoKeyOf(estado),
      manzana,
      lote,
      uso_suelo,
      usoKey: norm(uso_suelo),
      superficie_m2,
      precio_por_m2,
      valor_final,
      path,
      bounds,
      center: centerOf(bounds),
    };

    lots.push(lot);
    byId[lotId] = lot;
  }

  // Overall extent, used for the map's home view.
  const all = boundsOf(lots.flatMap((l) => [
    { lat: l.bounds.north, lng: l.bounds.east },
    { lat: l.bounds.south, lng: l.bounds.west },
  ]));

  return { lots, byId, bounds: all };
}
