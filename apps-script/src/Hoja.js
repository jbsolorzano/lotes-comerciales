/**
 * Menú, edición en la hoja y disparadores programados.
 *
 * La primera vez, quien administra el script corre `instalarDisparadores` una
 * sola vez desde el editor (o desde el menú). Es idempotente: borra los que
 * hubiera y los vuelve a crear.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Distrito Zalce')
    .addItem('Ver cambios sin publicar', 'menuVerCambios')
    .addItem('Publicar cambios', 'menuPublicar')
    .addSeparator()
    .addItem('Instalar disparadores (solo una vez)', 'instalarDisparadores')
    .addToUi();
}

function instalarDisparadores() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  const ss = libro();
  ScriptApp.newTrigger('alEditar').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('resumenDiario').timeBased().atHour(8).everyDays(1).inTimezone('America/Mexico_City').create();
  ScriptApp.newTrigger('saludDelSitio').timeBased().everyHours(1).create();
  try { SpreadsheetApp.getUi().alert('Disparadores instalados.'); } catch (err) { /* corrido desde el editor */ }
}

/* ── Edición ──────────────────────────────────────────────────────────────── */

/** Disparador instalable de edición (puede llamar servicios externos). */
function alEditar(e) {
  if (!e || !e.range) return;
  const h = e.range.getSheet();
  const nombre = h.getName();
  if (nombre === HOJAS.LOTES) return alEditarLote(e, h);
  if (nombre === HOJAS.LEADS) return alEditarLead(e, h);
}

function alEditarLote(e, h) {
  const mapa = mapaEncabezados(h);
  const editables = [mapa.estado, mapa.precio_m2, mapa.mostrar_precio];
  const c0 = e.range.getColumn();
  const c1 = c0 + e.range.getNumColumns() - 1;
  if (!editables.some((c) => c >= c0 && c <= c1)) return;
  const f0 = Math.max(2, e.range.getRow());
  const filas = e.range.getLastRow() - f0 + 1;
  if (filas < 1) return;
  const quien = Session.getActiveUser().getEmail() || '';
  h.getRange(f0, mapa.actualizado_el, filas, 1).setValue(new Date());
  h.getRange(f0, mapa.actualizado_por, filas, 1).setValue(quien);
}

function alEditarLead(e, h) {
  const mapa = mapaEncabezados(h);
  const f0 = Math.max(2, e.range.getRow());
  const f1 = e.range.getLastRow();
  const c0 = e.range.getColumn();
  const c1 = c0 + e.range.getNumColumns() - 1;
  const toca = (col) => col >= c0 && col <= c1;

  for (let fila = f0; fila <= f1; fila++) {
    const valores = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0];
    const v = (campo) => valores[mapa[campo] - 1];

    // Un lead capturado a mano (WhatsApp, teléfono…) recibe id y fecha.
    if (!v('lead_id') && (v('nombre') || v('telefono') || v('email'))) {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        escribirCelda(h, fila, 'lead_id', siguienteLeadId(h));
        escribirCelda(h, fila, 'creado_el', ahoraIso());
        if (!v('estado')) h.getRange(fila, mapa.estado).setValue('Nuevo');
        if (!v('origen_envio')) h.getRange(fila, mapa.origen_envio).setValue('manual');
        SpreadsheetApp.flush();
      } finally {
        lock.releaseLock();
      }
    }

    if (toca(mapa.ref_wa) && v('ref_wa')) copiarAtribucionWa(h, fila, String(v('ref_wa')).trim().toUpperCase());
    if (toca(mapa.estado) && ESTADOS_CONVERSION.includes(v('estado')) && !v('conv_meta_el')) {
      reportarConversionMeta(h, fila);
    }
  }
}

/** Busca el clic con ese código y copia su atribución al lead. */
function copiarAtribucionWa(hLeads, fila, ref) {
  const hClics = hoja(HOJAS.CLICS);
  const clic = leerObjetos(hClics).reverse().find((c) => String(c.ref_wa).toUpperCase() === ref);
  if (!clic) return;
  const lead = leerObjetos(hLeads).find((l) => l._fila === fila);
  CAMPOS_ATRIBUCION.forEach((k) => { if (clic[k] && !lead[k]) escribirCelda(hLeads, fila, k, String(clic[k])); });
  if (clic.lote_id && !lead.lote_interes) escribirCelda(hLeads, fila, 'lote_interes', String(clic.lote_id));
  if (!lead.canal) hLeads.getRange(fila, mapaEncabezados(hLeads).canal).setValue('whatsapp');
  if (lead.lead_id) escribirCelda(hClics, clic._fila, 'lead_id', String(lead.lead_id));
}

function reportarConversionMeta(h, fila) {
  const lead = leerObjetos(h).find((l) => l._fila === fila);
  try {
    const enviado = enviarEventoMeta('LeadCalificado', `${lead.lead_id}-calificado`, lead, '', '', 'system_generated');
    if (enviado) escribirCelda(h, fila, 'conv_meta_el', ahoraIso());
  } catch (err) {
    console.error(err);
    encolar('PENDIENTES_META', String(lead.lead_id));
  }
}

/* ── Programados ──────────────────────────────────────────────────────────── */

const hoyMx = () => Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd');

/** 8:00, lunes a sábado: leads nuevos, seguimientos del día y reintentos. */
function resumenDiario() {
  const dia = Utilities.formatDate(new Date(), 'America/Mexico_City', 'u'); // 1 = lunes … 7 = domingo
  reintentarPendientes();
  revisarSinLeads();
  if (dia === '7' || !prop('VENTAS_EMAIL')) return;

  const leads = leerObjetos(hoja(HOJAS.LEADS)).filter((l) => l.lead_id && l.estado !== 'Spam');
  const hoy = hoyMx();
  const ayer = Utilities.formatDate(new Date(Date.now() - 864e5), 'America/Mexico_City', 'yyyy-MM-dd');
  const fecha = (v) => (v instanceof Date ? Utilities.formatDate(v, 'America/Mexico_City', 'yyyy-MM-dd') : String(v).slice(0, 10));

  const nuevos = leads.filter((l) => [hoy, ayer].includes(fecha(l.creado_el)));
  const seguimiento = leads.filter((l) => l.proximo_seguimiento && fecha(l.proximo_seguimiento) <= hoy && !['Ganado', 'Perdido'].includes(l.estado));
  const sinAtender = leads.filter((l) => l.estado === 'Nuevo');
  if (!nuevos.length && !seguimiento.length && !sinAtender.length) return;

  const linea = (l) => `- ${l.lead_id} · ${l.nombre} · ${l.canal}${l.lote_interes ? ` · ${l.lote_interes}` : ''}`;
  const cuerpo = [
    `Leads nuevos desde ayer: ${nuevos.length}`, ...nuevos.map(linea), '',
    `Seguimientos para hoy o atrasados: ${seguimiento.length}`, ...seguimiento.map(linea), '',
    `Leads en estado Nuevo (sin contactar): ${sinAtender.length}`, '',
    `Hoja: ${libro().getUrl()}`,
  ].join('\n');
  MailApp.sendEmail({ to: prop('VENTAS_EMAIL'), subject: `[Distrito Zalce] Resumen del ${hoy}`, body: cuerpo, name: 'Distrito Zalce — sitio' });
}

function reintentarPendientes() {
  const leads = leerObjetos(hoja(HOJAS.LEADS));
  sacarCola('PENDIENTES_AVISO').forEach((id) => {
    const l = leads.find((x) => x.lead_id === id);
    if (!l) return;
    try { avisarLead(id, l); } catch (err) { encolar('PENDIENTES_AVISO', id); }
  });
  sacarCola('PENDIENTES_META').forEach((id) => {
    const l = leads.find((x) => x.lead_id === id);
    if (l) reportarConversionMeta(hoja(HOJAS.LEADS), l._fila);
  });
}

function revisarSinLeads() {
  const leads = leerObjetos(hoja(HOJAS.LEADS)).filter((l) => l.lead_id && l.estado !== 'Spam');
  const ultimo = leads.map((l) => String(l.creado_el).slice(0, 10)).sort().pop();
  const limite = Utilities.formatDate(new Date(Date.now() - 7 * 864e5), 'America/Mexico_City', 'yyyy-MM-dd');
  if (ultimo && ultimo < limite) {
    const cuerpo = `El último lead entró el ${ultimo}. Revisa que el formulario y WhatsApp funcionen.`;
    alertar('7 días sin leads', cuerpo);
    if (prop('VENTAS_EMAIL')) MailApp.sendEmail({ to: prop('VENTAS_EMAIL'), subject: '[Distrito Zalce] 7 días sin leads', body: cuerpo, name: 'Distrito Zalce — sitio' });
  }
}

/** Cada hora: la portada y lotes-data.json deben responder 200. Avisa máximo cada 6 h. */
function saludDelSitio() {
  const sitio = prop('SITE_URL', 'https://distritozalce.com');
  const fallas = [`${sitio}/`, `${sitio}/${RUTA_LOTES_JSON}`].filter((url) => {
    try { return UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true }).getResponseCode() !== 200; } catch (err) { return true; }
  });
  if (!fallas.length) return;
  const cache = CacheService.getScriptCache();
  if (cache.get('alerta-salud')) return;
  cache.put('alerta-salud', '1', 6 * 3600);
  alertar('El sitio no responde', `No respondieron con 200:\n${fallas.join('\n')}`);
}
