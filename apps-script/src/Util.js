/**
 * Utilidades compartidas: acceso a la hoja por encabezados, fechas, texto.
 *
 * Las funciones puras (sin servicios de Google) están separadas a propósito:
 * apps-script/test/run.mjs las prueba con Node.
 */

/* ── Puras ────────────────────────────────────────────────────────────────── */

const RE_LOTE_ID = /^mz(\d{2})L(\d{2})$/;

/**
 * Acepta el id ("mz06L16") o el texto del <select> del formulario
 * ("MZ 06 Lote 16 (VENDIDO)") y devuelve el id, o '' si no reconoce nada.
 */
function parseLote(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';
  const id = s.match(/^mz(\d{1,2})l(\d{1,2})$/i);
  if (id) return `mz${id[1].padStart(2, '0')}L${id[2].padStart(2, '0')}`;
  const nombre = s.match(/^MZ\s*(\d{1,2})\s+Lote\s+(\d{1,2})/i);
  if (nombre) return `mz${nombre[1].padStart(2, '0')}L${nombre[2].padStart(2, '0')}`;
  return '';
}

/** Teléfono a E.164. Diez dígitos se toman como México (+52). */
function normalizarTelefono(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';
  const digitos = s.replace(/\D/g, '');
  if (s.startsWith('+')) return `+${digitos}`;
  if (digitos.length === 10) return `+52${digitos}`;
  if (digitos.length === 12 && digitos.startsWith('52')) return `+${digitos}`;
  return digitos;
}

function contarUrls(texto) {
  return (String(texto || '').match(/(https?:\/\/|www\.)/gi) || []).length;
}

/** Recorta y limita el largo; nunca devuelve undefined. */
function limpiar(valor, max) {
  const s = String(valor === undefined || valor === null ? '' : valor).trim();
  return max ? s.slice(0, max) : s;
}

function esCorreo(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ''));
}

/* ── Con servicios de Google ──────────────────────────────────────────────── */

function libro() {
  const id = prop('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function hoja(nombre) {
  const h = libro().getSheetByName(nombre);
  if (!h) throw new Error(`No existe la pestaña "${nombre}"`);
  return h;
}

/** { encabezado: índice de columna, base 1 } */
function mapaEncabezados(h) {
  const fila = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  const mapa = {};
  fila.forEach((nombre, i) => { if (nombre) mapa[String(nombre).trim()] = i + 1; });
  return mapa;
}

/** Filas de datos como objetos { encabezado: valor, _fila: n }. */
function leerObjetos(h) {
  const ultima = h.getLastRow();
  if (ultima < 2) return [];
  const encabezados = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  return h.getRange(2, 1, ultima - 1, encabezados.length).getValues().map((fila, i) => {
    const o = { _fila: i + 2 };
    encabezados.forEach((e, j) => { if (e) o[String(e).trim()] = fila[j]; });
    return o;
  });
}

/**
 * Agrega una fila acomodando cada valor bajo su encabezado. Los textos se
 * escriben con apóstrofo para que la hoja no los convierta: un teléfono "+52…"
 * en número, una fecha ISO en fecha, o un "=…" del visitante en fórmula.
 */
function agregarPorEncabezados(h, obj) {
  const mapa = mapaEncabezados(h);
  const ancho = h.getLastColumn();
  const fila = new Array(ancho).fill('');
  Object.keys(obj).forEach((k) => {
    const col = mapa[k];
    if (!col) return;
    const v = obj[k];
    fila[col - 1] = typeof v === 'string' && v !== '' ? `'${v}` : v;
  });
  h.appendRow(fila);
  return h.getLastRow();
}

function escribirCelda(h, fila, encabezado, valor) {
  const col = mapaEncabezados(h)[encabezado];
  if (!col) return;
  h.getRange(fila, col).setValue(typeof valor === 'string' && valor !== '' ? `'${valor}` : valor);
}

function ahoraIso() {
  return Utilities.formatDate(new Date(), 'America/Mexico_City', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function sha256(texto) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(texto).trim().toLowerCase(),
    Utilities.Charset.UTF_8
  );
  return bytes.map((b) => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function respuestaJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function alertar(asunto, cuerpo) {
  const para = prop('ALERT_EMAIL');
  if (!para) { console.error(`Alerta sin ALERT_EMAIL: ${asunto}\n${cuerpo}`); return; }
  MailApp.sendEmail({ to: para, subject: `[Distrito Zalce] ${asunto}`, body: cuerpo, name: 'Distrito Zalce — sitio' });
}

/** Cola de reintentos en las propiedades del script (lead_ids pendientes). */
function encolar(cola, id) {
  const p = PropertiesService.getScriptProperties();
  const lista = JSON.parse(p.getProperty(cola) || '[]');
  if (!lista.includes(id)) lista.push(id);
  p.setProperty(cola, JSON.stringify(lista.slice(-200)));
}

function sacarCola(cola) {
  const p = PropertiesService.getScriptProperties();
  const lista = JSON.parse(p.getProperty(cola) || '[]');
  p.deleteProperty(cola);
  return lista;
}
