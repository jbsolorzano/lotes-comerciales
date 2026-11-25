/**
 * Publicar lotes: de la pestaña Lotes a assets/lotes-data.json en el repo.
 *
 * El sitio nunca lee la hoja. La administradora edita Lotes y usa el menú
 * Distrito Zalce → Publicar cambios; el script valida todo, arma el JSON, lo
 * compara con el publicado y, si hay cambios, hace commit con la API de
 * GitHub. El commit dispara el deploy. Si la validación falla no se publica
 * nada: un error en la hoja nunca llega al sitio.
 */

/* ── Puras ────────────────────────────────────────────────────────────────── */

const redondear2 = (n) => Math.round(n * 100) / 100;

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * filas: objetos de la pestaña Lotes (como los da leerObjetos).
 * catalogo: { estados: [...], usos: [...] }
 * Devuelve { datos, errores } donde datos es { id: registro } en el formato de
 * lotes-data.json.
 */
function construirLotes(filas, catalogo) {
  const errores = [];
  const vistos = {};
  const registros = [];

  filas.forEach((f) => {
    const id = limpiar(f.id);
    if (!id && !f.estado && !f.superficie_m2) return; // fila vacía
    const donde = `Fila ${f._fila} (${id || 'sin id'})`;

    if (!RE_LOTE_ID.test(id)) { errores.push(`${donde}: el id debe tener la forma mz06L16.`); return; }
    if (vistos[id]) { errores.push(`${donde}: el id se repite en la fila ${vistos[id]}.`); return; }
    vistos[id] = f._fila;

    const estado = limpiar(f.estado);
    const uso = limpiar(f.uso_suelo);
    const superficie = f.superficie_m2;
    const precio = f.precio_m2 === '' || f.precio_m2 === null ? null : f.precio_m2;
    const mostrar = f.mostrar_precio === true;

    if (!catalogo.estados.includes(estado)) errores.push(`${donde}: el estado "${estado}" no está en Catálogos.`);
    if (!catalogo.usos.includes(uso)) errores.push(`${donde}: el uso de suelo "${uso}" no está en Catálogos.`);
    if (!esNumero(superficie) || superficie <= 0) errores.push(`${donde}: la superficie debe ser un número mayor que 0.`);
    if (precio !== null && (!esNumero(precio) || precio < LIMITES.PRECIO_MIN || precio > LIMITES.PRECIO_MAX)) {
      errores.push(`${donde}: el precio por m² debe estar entre ${LIMITES.PRECIO_MIN} y ${LIMITES.PRECIO_MAX}, o vacío.`);
    }
    if (mostrar && precio === null) errores.push(`${donde}: está marcado "mostrar_precio" pero no tiene precio.`);

    const publicaPrecio = mostrar && precio !== null && !ESTADOS_SIN_PRECIO.includes(estado);
    registros.push({
      id,
      manzana: Number(f.manzana),
      lote: Number(f.lote),
      registro: {
        manzana: Number(f.manzana),
        lote: Number(f.lote),
        uso_suelo: uso,
        superficie_m2: esNumero(superficie) ? redondear2(superficie) : superficie,
        precio_por_m2: publicaPrecio ? precio : null,
        valor_final: publicaPrecio && esNumero(superficie) ? redondear2(superficie * precio) : null,
        estado,
      },
    });
  });

  registros.sort((a, b) => a.manzana - b.manzana || a.lote - b.lote);
  const datos = {};
  registros.forEach((r) => { datos[r.id] = r.registro; });
  return { datos, errores };
}

/** El mismo formato que el archivo del repo: un registro por bloque de 3 líneas. */
function serializarLotes(datos) {
  const bloques = Object.keys(datos).map((id) => {
    const r = datos[id];
    const campos = Object.keys(r).map((k) => `${JSON.stringify(k)}: ${JSON.stringify(r[k])}`).join(', ');
    return `  ${JSON.stringify(id)}: {\n    ${campos}\n  }`;
  });
  return `{\n${bloques.join(',\n')}\n}\n`;
}

const dinero = (v) => (v === null || v === undefined ? 'sin precio' : `$${Number(v).toLocaleString('en-US')}`);

/** Lista legible de cambios entre el JSON publicado y el nuevo. */
function diferenciasLotes(anterior, nuevo) {
  const cambios = [];
  Object.keys(nuevo).forEach((id) => {
    const a = anterior[id];
    const n = nuevo[id];
    if (!a) { cambios.push(`${id}: lote nuevo (${n.estado}).`); return; }
    const partes = [];
    if (a.estado !== n.estado) partes.push(`${a.estado} → ${n.estado}`);
    if (a.precio_por_m2 !== n.precio_por_m2) partes.push(`precio/m² ${dinero(a.precio_por_m2)} → ${dinero(n.precio_por_m2)}`);
    if (a.valor_final !== n.valor_final) partes.push(`valor total ${dinero(a.valor_final)} → ${dinero(n.valor_final)}`);
    if (a.superficie_m2 !== n.superficie_m2) partes.push(`superficie ${a.superficie_m2} → ${n.superficie_m2} m²`);
    if (a.uso_suelo !== n.uso_suelo) partes.push(`uso ${a.uso_suelo} → ${n.uso_suelo}`);
    if (partes.length) cambios.push(`${id}: ${partes.join('; ')}.`);
  });
  Object.keys(anterior).forEach((id) => { if (!nuevo[id]) cambios.push(`${id}: ya no está en la hoja.`); });
  return cambios;
}

/* ── Con servicios de Google ──────────────────────────────────────────────── */

function leerCatalogo() {
  const valores = hoja(HOJAS.CATALOGOS).getDataRange().getValues();
  const enc = valores[0].map((v) => String(v).trim());
  const columna = (nombre) => {
    const i = enc.indexOf(nombre);
    return i < 0 ? [] : valores.slice(1).map((f) => String(f[i]).trim()).filter(Boolean);
  };
  return { estados: columna('estado_lote'), usos: columna('uso_suelo') };
}

function github(metodo, ruta, cuerpo) {
  const repo = prop('GITHUB_REPO');
  const token = prop('GITHUB_TOKEN');
  if (!repo || !token) throw new Error('Faltan GITHUB_REPO o GITHUB_TOKEN en las propiedades del script.');
  const opciones = {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    muteHttpExceptions: true,
  };
  if (cuerpo) { opciones.contentType = 'application/json'; opciones.payload = JSON.stringify(cuerpo); }
  const res = UrlFetchApp.fetch(`https://api.github.com/repos/${repo}/${ruta}`, opciones);
  const codigo = res.getResponseCode();
  if (codigo >= 300) throw new Error(`GitHub respondió ${codigo}: ${res.getContentText().slice(0, 300)}`);
  return JSON.parse(res.getContentText());
}

function leerPublicado() {
  const rama = prop('GITHUB_BRANCH', 'main');
  const r = github('get', `contents/${RUTA_LOTES_JSON}?ref=${encodeURIComponent(rama)}`);
  const texto = Utilities.newBlob(Utilities.base64Decode(r.content.replace(/\n/g, ''))).getDataAsString('UTF-8');
  return { sha: r.sha, datos: JSON.parse(texto), texto };
}

/** Prepara la publicación sin escribir nada. */
function prepararPublicacion() {
  const { datos, errores } = construirLotes(leerObjetos(hoja(HOJAS.LOTES)), leerCatalogo());
  if (errores.length) return { errores };
  const publicado = leerPublicado();
  const texto = serializarLotes(datos);
  return {
    errores: [],
    texto,
    sha: publicado.sha,
    cambios: diferenciasLotes(publicado.datos, datos),
    igual: texto === publicado.texto,
  };
}

function menuVerCambios() {
  const ui = SpreadsheetApp.getUi();
  const p = prepararPublicacion();
  if (p.errores.length) { ui.alert('Hay que corregir la hoja antes de publicar', p.errores.join('\n'), ui.ButtonSet.OK); return; }
  if (p.igual) { ui.alert('Sin cambios', 'Lo que está en la hoja ya está publicado.', ui.ButtonSet.OK); return; }
  ui.alert(`${p.cambios.length || 'Hay'} cambios por publicar`, p.cambios.join('\n') || 'Cambios de formato del archivo.', ui.ButtonSet.OK);
}

function menuPublicar() {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert('Hay otra publicación en curso. Intenta en un minuto.'); return; }
  try {
    const p = prepararPublicacion();
    if (p.errores.length) { ui.alert('No se publicó nada', `Corrige esto en la hoja:\n\n${p.errores.join('\n')}`, ui.ButtonSet.OK); return; }
    if (p.igual) { ui.alert('Sin cambios', 'Lo que está en la hoja ya está publicado.', ui.ButtonSet.OK); return; }

    const resumen = p.cambios.join('\n') || 'Cambios de formato del archivo.';
    const ok = ui.alert('¿Publicar estos cambios?', `${resumen}\n\nEl sitio se actualiza en unos minutos.`, ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;

    const quien = Session.getActiveUser().getEmail() || 'la hoja';
    const n = p.cambios.length;
    github('put', `contents/${RUTA_LOTES_JSON}`, {
      message: `Publica lotes desde la hoja: ${n} ${n === 1 ? 'cambio' : 'cambios'} (por ${quien})\n\n${resumen}`,
      content: Utilities.base64Encode(p.texto, Utilities.Charset.UTF_8),
      sha: p.sha,
      branch: prop('GITHUB_BRANCH', 'main'),
    });

    const para = Session.getActiveUser().getEmail();
    if (para) {
      MailApp.sendEmail({
        to: para,
        subject: `[Distrito Zalce] Lotes publicados: ${n} ${n === 1 ? 'cambio' : 'cambios'}`,
        body: `${resumen}\n\nEl sitio se actualiza en unos minutos: ${prop('SITE_URL', 'https://distritozalce.com')}`,
        name: 'Distrito Zalce — sitio',
      });
    }
    ui.alert('Publicado', 'Listo. El sitio se actualiza en unos minutos.', ui.ButtonSet.OK);
  } catch (err) {
    console.error(err);
    alertar('Falló la publicación de lotes', String(err && err.stack || err));
    ui.alert('No se pudo publicar', `${err.message}\n\nYa se avisó a soporte. No se cambió nada en el sitio.`, ui.ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}
