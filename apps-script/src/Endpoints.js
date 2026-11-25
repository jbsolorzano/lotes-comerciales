/**
 * Endpoints públicos del despliegue web.
 *
 *   POST ?action=lead      formulario de contacto
 *   POST ?action=wa_click  clic a WhatsApp (sendBeacon, nadie lee la respuesta)
 *   GET                    salud: { ok: true }
 *
 * El sitio manda JSON con Content-Type text/plain para evitar la petición
 * previa de CORS, que Apps Script no contesta. Apps Script siempre responde
 * 200: el resultado va en `ok`. Sin JavaScript, el <form> manda un POST
 * normal (application/x-www-form-urlencoded) y recibe una página HTML.
 *
 * Contrato completo en apps-script/README.md.
 */

function doGet() {
  return respuestaJson({ ok: true, servicio: 'distrito-zalce' });
}

function doPost(e) {
  const accion = (e && e.parameter && e.parameter.action) || '';
  const { datos, sinJs } = leerCuerpo(e);
  try {
    if (accion === 'lead') return responderLead(recibirLead(datos, sinJs), sinJs);
    if (accion === 'wa_click') return respuestaJson(recibirClicWa(datos));
    return respuestaJson({ ok: false, error: 'accion' });
  } catch (err) {
    console.error(err);
    alertar(`Error en ${accion || 'doPost'}`, String(err && err.stack || err));
    const r = { ok: false, error: 'interno', reintentar: true };
    return accion === 'lead' ? responderLead(r, sinJs) : respuestaJson(r);
  }
}

/** JSON si vino del sitio con JavaScript; parámetros si vino del <form> solo. */
function leerCuerpo(e) {
  const tipo = (e && e.postData && e.postData.type) || '';
  const contenido = (e && e.postData && e.postData.contents) || '';
  if (tipo !== 'application/x-www-form-urlencoded' && contenido.trim().startsWith('{')) {
    try { return { datos: JSON.parse(contenido), sinJs: false }; } catch (err) { /* cae al formulario */ }
  }
  return { datos: Object.assign({}, e && e.parameter), sinJs: true };
}

/* ── Lead ─────────────────────────────────────────────────────────────────── */

/**
 * Pura: valida y normaliza. Devuelve { lead, campos, spam } donde campos son
 * los errores por campo para el visitante y spam el motivo, si lo hay.
 */
function validarLead(d, ahoraMs) {
  const campos = {};
  const lead = {
    nombre: limpiar(d.nombre, 80),
    email: limpiar(d.email, 120).toLowerCase(),
    telefono: normalizarTelefono(limpiar(d.telefono, 20)),
    lote_interes: parseLote(d.lote),
    mensaje: limpiar(d.mensaje, 1200),
    consentimiento: d.consentimiento === true || (typeof d.consentimiento === 'string' && d.consentimiento !== '' && d.consentimiento !== 'false'),
    version_aviso: limpiar(d.version_aviso, 40),
    pagina: limpiar(d.pagina, 300),
  };
  if (lead.nombre.length < 2) campos.nombre = 'requerido';
  if (!esCorreo(lead.email)) campos.email = 'formato';
  if (d.telefono && !/^[0-9+()\s-]{7,20}$/.test(String(d.telefono).trim())) campos.telefono = 'formato';
  if (!lead.mensaje) campos.mensaje = 'requerido';
  if (!lead.consentimiento) campos.consentimiento = 'requerido';

  let spam = '';
  if (d.botcheck) spam = 'trampa';
  else if (d.t_render && ahoraMs - Number(d.t_render) < LIMITES.SEGUNDOS_MINIMOS * 1000) spam = 'rapido';
  else if (contarUrls(lead.mensaje) > LIMITES.URLS_MAXIMAS) spam = 'urls';

  const at = d.atribucion && typeof d.atribucion === 'object' ? d.atribucion : d;
  CAMPOS_ATRIBUCION.concat(['primera_visita_el', 'primera_fuente']).forEach((k) => { lead[k] = limpiar(at[k], 500); });
  return { lead, campos, spam };
}

/** Cuenta en CacheService; true si ya se pasó del límite. */
function excedeLimite(clave, maximo) {
  const cache = CacheService.getScriptCache();
  const hora = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  const k = `rl:${clave}:${hora}`;
  const n = Number(cache.get(k) || 0) + 1;
  cache.put(k, String(n), 3600);
  return n > maximo;
}

function siguienteLeadId(hLeads) {
  const anio = Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy');
  const prefijo = `DZ-${anio}-`;
  const col = mapaEncabezados(hLeads).lead_id;
  const n = hLeads.getLastRow() - 1;
  let max = 0;
  if (n > 0) {
    hLeads.getRange(2, col, n, 1).getValues().forEach(([v]) => {
      const s = String(v);
      if (s.startsWith(prefijo)) max = Math.max(max, Number(s.slice(prefijo.length)) || 0);
    });
  }
  return prefijo + String(max + 1).padStart(6, '0');
}

function recibirLead(d, sinJs) {
  const { lead, campos, spam } = validarLead(d, Date.now());
  if (Object.keys(campos).length && !spam) return { ok: false, error: 'validacion', campos };

  if (!spam) {
    if (excedeLimite('leads', LIMITES.ENVIOS_TOTALES_HORA)) {
      alertar('Límite de envíos por hora alcanzado', 'El formulario está rechazando envíos. Puede ser un ataque.');
      return { ok: false, error: 'limite', reintentar: false };
    }
    if (excedeLimite(`email:${sha256(lead.email)}`, LIMITES.ENVIOS_POR_CORREO_HORA)) {
      return { ok: false, error: 'limite', reintentar: false };
    }
  }

  const antispam = spam || (sinJs ? 'sin_token' : verificarCaptcha(d.captcha_token));
  const esSpam = Boolean(spam) || antispam === 'rechazado';

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let leadId;
  try {
    const h = hoja(HOJAS.LEADS);
    leadId = siguienteLeadId(h);
    agregarPorEncabezados(h, Object.assign({}, lead, {
      lead_id: leadId,
      creado_el: ahoraIso(),
      canal: 'formulario',
      estado: esSpam ? 'Spam' : 'Nuevo',
      landing_page: lead.landing_page || lead.pagina,
      origen_envio: sinJs ? 'sin_js' : 'js',
      antispam,
    }));
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // A un bot se le contesta como si todo hubiera salido bien.
  if (esSpam) return { ok: true, lead_id: leadId };

  try { avisarLead(leadId, lead); } catch (err) { console.error(err); encolar('PENDIENTES_AVISO', leadId); }
  try {
    enviarEventoMeta('Lead', limpiar(d.event_id, 100) || leadId, lead, limpiar(d.user_agent, 400), lead.pagina);
  } catch (err) { console.error(err); }
  return { ok: true, lead_id: leadId };
}

function avisarLead(leadId, lead) {
  const para = prop('VENTAS_EMAIL');
  if (!para) throw new Error('Falta VENTAS_EMAIL');
  const lote = lead.lote_interes ? ` (${lead.lote_interes})` : '';
  const fuente = lead.utm_source ? `${lead.utm_source}/${lead.utm_medium || '—'} · ${lead.utm_campaign || 'sin campaña'}` : (lead.referrer || 'directo');
  MailApp.sendEmail({
    to: para,
    replyTo: lead.email,
    name: 'Distrito Zalce — sitio',
    subject: `Nuevo lead ${leadId}: ${lead.nombre}${lote}`,
    body: [
      `Nombre: ${lead.nombre}`,
      `Correo: ${lead.email}`,
      `Teléfono: ${lead.telefono || '—'}`,
      `Lote: ${lead.lote_interes || '—'}`,
      '',
      lead.mensaje,
      '',
      `Fuente: ${fuente}`,
      `Hoja: ${libro().getUrl()}`,
      '',
      'Responde a este correo para escribirle directo al prospecto.',
    ].join('\n'),
  });
}

/** Sin JavaScript: una página mínima con salida a /contacto/gracias/. */
function responderLead(r, sinJs) {
  if (!sinJs) return respuestaJson(r);
  const sitio = prop('SITE_URL', 'https://distritozalce.com');
  const titulo = r.ok ? 'Recibimos tu mensaje' : 'No pudimos recibir tu mensaje';
  const texto = r.ok
    ? 'Gracias. Te contactaremos pronto.'
    : 'Revisa que hayas llenado nombre, correo, mensaje y la casilla del aviso de privacidad, y vuelve a intentarlo.';
  const destino = r.ok ? `${sitio}/contacto/gracias/` : `${sitio}/contacto/`;
  const html = `<!doctype html><meta charset="utf-8"><title>${titulo}</title>
<body style="font-family:sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5">
<h1 style="font-weight:400">${titulo}</h1><p>${texto}</p>
<p><a href="${destino}" target="_top">Volver a distritozalce.com</a></p></body>`;
  return HtmlService.createHtmlOutput(html).setTitle(titulo);
}

/* ── Clic a WhatsApp ──────────────────────────────────────────────────────── */

const RE_REF_WA = /^[A-HJ-NP-Z2-9]{6}$/; // sin I, O, 0 ni 1

function recibirClicWa(d) {
  const ref = limpiar(d.ref_wa, 6).toUpperCase();
  if (!RE_REF_WA.test(ref)) return { ok: false, error: 'validacion' };
  if (excedeLimite('clics', LIMITES.CLICS_TOTALES_HORA)) return { ok: false, error: 'limite' };

  const at = d.atribucion && typeof d.atribucion === 'object' ? d.atribucion : {};
  const fila = { ref_wa: ref, creado_el: ahoraIso(), lote_id: parseLote(d.lote_id), pagina: limpiar(d.pagina, 300) };
  CAMPOS_ATRIBUCION.forEach((k) => { fila[k] = limpiar(at[k], 500); });
  agregarPorEncabezados(hoja(HOJAS.CLICS), fila);

  try {
    enviarEventoMeta('Contact', limpiar(d.event_id, 100) || ref, fila, limpiar(d.user_agent, 400), fila.pagina);
  } catch (err) { console.error(err); }
  return { ok: true };
}
