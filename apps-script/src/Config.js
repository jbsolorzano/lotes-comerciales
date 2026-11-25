/**
 * Configuración del backend de Distrito Zalce.
 *
 * Lo que cambia entre la hoja prototipo y la definitiva vive en las
 * propiedades del script (Configuración del proyecto → Propiedades del
 * script), no aquí. Los secretos nunca van en el código ni en la hoja.
 *
 *   SITE_URL          https://distritozalce.com (sin "/" al final)
 *   VENTAS_EMAIL      buzón que recibe el aviso de cada lead
 *   ALERT_EMAIL       quien recibe las alertas técnicas
 *   GITHUB_REPO       jbsolorzano/lotes-comerciales
 *   GITHUB_BRANCH     main
 *   GITHUB_TOKEN      token de grano fino: solo este repo, permiso Contents
 *   CAPTCHA_PROVIDER  turnstile | recaptcha | (vacío = sin captcha)
 *   CAPTCHA_SECRET    clave secreta de Turnstile, o API key de reCAPTCHA
 *   RECAPTCHA_PROJECT id del proyecto de Google Cloud (solo reCAPTCHA)
 *   RECAPTCHA_SITE_KEY clave del sitio (solo reCAPTCHA)
 *   META_PIXEL_ID     id del Pixel (vacío = no se manda nada a Meta)
 *   META_TOKEN        token de la Conversions API
 *
 * Meta queda apagado mientras META_PIXEL_ID esté vacío. No se activa hasta que
 * el aviso de privacidad cubra la Conversions API (decisión D10).
 */

const HOJAS = {
  LOTES: 'Lotes',
  LEADS: 'Leads',
  CLICS: 'Clics WA',
  CATALOGOS: 'Catálogos',
};

/** Columnas por nombre de encabezado: el código no depende de su posición. */
const CAMPOS_ATRIBUCION = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'gbraid', 'wbraid', 'fbclid', 'fbc', 'fbp', 'ga_client_id',
  'landing_page', 'referrer',
];

/** Estados en los que el sitio nunca muestra precio. */
const ESTADOS_SIN_PRECIO = ['VENDIDO', 'DESARROLLO HERSO'];

/** Estados de lead que se reportan como conversión fuera de línea. */
const ESTADOS_CONVERSION = ['Calificado', 'Ganado'];

const LIMITES = {
  ENVIOS_POR_CORREO_HORA: 3,
  ENVIOS_TOTALES_HORA: 30,
  CLICS_TOTALES_HORA: 300,
  SEGUNDOS_MINIMOS: 3,
  URLS_MAXIMAS: 2,
  PRECIO_MIN: 500,
  PRECIO_MAX: 50000,
};

const RUTA_LOTES_JSON = 'assets/lotes-data.json';

function prop(nombre, porDefecto) {
  const v = PropertiesService.getScriptProperties().getProperty(nombre);
  return v === null || v === '' ? (porDefecto === undefined ? '' : porDefecto) : v;
}
