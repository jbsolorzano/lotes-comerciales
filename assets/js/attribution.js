/**
 * Atribución: de dónde llegó el visitante, para saber qué campaña trajo cada
 * lead y cada clic a WhatsApp.
 *
 * Corre al importarse (lo importa nav.js, que cargan las cuatro páginas) y
 * guarda dos cosas en localStorage:
 *
 *   dz_atribucion  Último toque: los parámetros de campaña de la URL, la página
 *                  de entrada y el referrer externo. Se reescribe cada vez que
 *                  llega una URL con cualquiera de esos parámetros y vale 90
 *                  días; vencido, se ignora.
 *   dz_primera     Primera visita conocida: fecha y fuente. Se escribe una sola
 *                  vez y no se pisa.
 *
 * Además lee las cookies de Google Analytics (_ga) y de Meta (_fbp, _fbc) si
 * existen; hoy el sitio no carga ninguna de las dos etiquetas, así que salen
 * vacías.
 *
 * Nada de esto puede romper el sitio: localStorage falla en modo privado de
 * algunos navegadores o con el almacenamiento lleno, y las cookies pueden
 * venir bloqueadas. Todo acceso va en try/catch y, si falla, el dato sale
 * vacío.
 */

const CLAVE_ULTIMO = 'dz_atribucion';
const CLAVE_PRIMERA = 'dz_primera';
const VIGENCIA_MS = 90 * 24 * 60 * 60 * 1000;

/** Parámetros de la URL que cuentan como "llegó por una campaña". */
const PARAMETROS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'gbraid', 'wbraid', 'fbclid',
];

/**
 * Las llaves que devuelve getAttribution(), en este orden. Son las mismas que
 * lee el backend (CAMPOS_ATRIBUCION + primera_visita_el y primera_fuente en
 * apps-script/src/Config.js); si se agrega una, va en los dos lados.
 */
const LLAVES = [
  ...PARAMETROS, 'fbc', 'fbp', 'ga_client_id', 'landing_page', 'referrer',
  'primera_visita_el', 'primera_fuente',
];

/* ── Almacenamiento ───────────────────────────────────────────────────────── */

function leer(clave) {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento no hay atribución, pero el sitio sigue.
  }
}

function cookie(nombre) {
  try {
    const par = document.cookie.split('; ').find((c) => c.startsWith(`${nombre}=`));
    return par ? decodeURIComponent(par.slice(nombre.length + 1)) : '';
  } catch {
    return '';
  }
}

/* ── Formato ──────────────────────────────────────────────────────────────── */

/** El referrer, solo si viene de otro dominio; navegar dentro del sitio no es una fuente. */
function referrerExterno() {
  try {
    if (!document.referrer) return '';
    const url = new URL(document.referrer);
    return url.host === location.host ? '' : document.referrer;
  } catch {
    return '';
  }
}

/** 2026-11-25T10:42:00-06:00: hora local con su desfase, como la lee la hoja. */
function isoLocal(fecha) {
  const dos = (n) => String(Math.abs(n)).padStart(2, '0');
  const desfase = -fecha.getTimezoneOffset();
  const signo = desfase >= 0 ? '+' : '-';
  return (
    `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}` +
    `T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}` +
    `${signo}${dos(Math.trunc(desfase / 60))}:${dos(desfase % 60)}`
  );
}

/** "_ga=GA1.1.123.456" → "123.456", el client_id que espera Google. */
function gaClientId() {
  const partes = cookie('_ga').split('.');
  return partes.length >= 4 ? partes.slice(-2).join('.') : '';
}

/* ── Al importarse ────────────────────────────────────────────────────────── */

function registrarVisita() {
  let params;
  try {
    params = new URLSearchParams(location.search);
  } catch {
    return;
  }
  const referrer = referrerExterno();

  const campana = {};
  for (const p of PARAMETROS) {
    const v = params.get(p);
    if (v) campana[p] = v.slice(0, 500);
  }
  const hayCampana = Object.keys(campana).length > 0;

  if (hayCampana) {
    escribir(CLAVE_ULTIMO, {
      ...campana,
      landing_page: location.pathname + location.search,
      referrer,
      guardado: Date.now(),
    });
  }

  if (!leer(CLAVE_PRIMERA)) {
    let fuente = 'directo';
    if (campana.utm_source) {
      fuente = `${campana.utm_source}/${campana.utm_medium || ''}`;
    } else if (referrer) {
      fuente = `${new URL(referrer).host}/referral`;
    }
    escribir(CLAVE_PRIMERA, { primera_visita_el: isoLocal(new Date()), primera_fuente: fuente });
  }
}

// Un error aquí no debe impedir que el módulo que lo importa (nav.js) cargue.
try {
  registrarVisita();
} catch (err) {
  console.warn('Atribución: no se pudo registrar la visita.', err);
}

/* ── Lectura ──────────────────────────────────────────────────────────────── */

/**
 * La atribución actual como objeto plano, con exactamente las llaves de LLAVES
 * y '' donde no hay dato. Es lo que viaja al backend en `atribucion`.
 */
export function getAttribution() {
  const salida = Object.fromEntries(LLAVES.map((k) => [k, '']));

  let ultimo = leer(CLAVE_ULTIMO);
  if (!ultimo || !(Date.now() - Number(ultimo.guardado) < VIGENCIA_MS)) ultimo = null;

  if (ultimo) {
    for (const k of [...PARAMETROS, 'landing_page', 'referrer']) {
      if (typeof ultimo[k] === 'string') salida[k] = ultimo[k];
    }
  }

  const primera = leer(CLAVE_PRIMERA);
  if (primera) {
    salida.primera_visita_el = String(primera.primera_visita_el || '');
    salida.primera_fuente = String(primera.primera_fuente || '');
  }

  salida.ga_client_id = gaClientId();
  salida.fbp = cookie('_fbp');
  salida.fbc = cookie('_fbc');
  // Sin la cookie del Pixel, Meta acepta fbc armado a mano con el fbclid y el
  // momento en que llegó: fb.1.<ms>.<fbclid>.
  if (!salida.fbc && salida.fbclid) salida.fbc = `fb.1.${Number(ultimo.guardado)}.${salida.fbclid}`;

  return salida;
}
