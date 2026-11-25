/**
 * Servicios externos opcionales: captcha y Conversions API de Meta.
 * Ambos se apagan solos si sus propiedades están vacías.
 */

/**
 * Devuelve 'ok', 'rechazado', 'sin_token', 'sin_captcha' o 'error'.
 * Un 'error' del proveedor no bloquea el lead: entra para revisión.
 */
function verificarCaptcha(token) {
  const proveedor = prop('CAPTCHA_PROVIDER');
  if (!proveedor) return 'sin_captcha';
  if (!token) return 'sin_token';
  try {
    if (proveedor === 'turnstile') {
      const r = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'post',
        payload: { secret: prop('CAPTCHA_SECRET'), response: token },
        muteHttpExceptions: true,
      });
      return JSON.parse(r.getContentText()).success ? 'ok' : 'rechazado';
    }
    if (proveedor === 'recaptcha') {
      const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${prop('RECAPTCHA_PROJECT')}/assessments?key=${prop('CAPTCHA_SECRET')}`;
      const r = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ event: { token, siteKey: prop('RECAPTCHA_SITE_KEY'), expectedAction: 'lead' } }),
        muteHttpExceptions: true,
      });
      const a = JSON.parse(r.getContentText());
      if (!a.tokenProperties || !a.tokenProperties.valid) return 'rechazado';
      const puntaje = a.riskAnalysis ? a.riskAnalysis.score : 0;
      return puntaje >= 0.5 ? 'ok' : 'rechazado';
    }
    return 'sin_captcha';
  } catch (err) {
    console.error(err);
    return 'error';
  }
}

/**
 * Evento de la Conversions API. `datos` puede traer email, telefono, fbc, fbp.
 * Apps Script no ve la IP del visitante; Meta acepta el evento sin ella.
 */
function enviarEventoMeta(nombre, eventId, datos, userAgent, pagina, origen) {
  const pixel = prop('META_PIXEL_ID');
  const token = prop('META_TOKEN');
  if (!pixel || !token) return false;

  const usuario = {};
  if (datos.email) usuario.em = [sha256(datos.email)];
  if (datos.telefono) usuario.ph = [sha256(String(datos.telefono).replace(/\D/g, ''))];
  if (datos.fbc) usuario.fbc = datos.fbc;
  if (datos.fbp) usuario.fbp = datos.fbp;
  if (userAgent) usuario.client_user_agent = userAgent;

  const sitio = prop('SITE_URL', 'https://distritozalce.com');
  const evento = {
    event_name: nombre,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: origen || 'website',
    user_data: usuario,
  };
  if (evento.action_source === 'website') evento.event_source_url = pagina ? sitio + pagina : sitio;

  const r = UrlFetchApp.fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ data: [evento] }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) throw new Error(`Meta respondió ${r.getResponseCode()}: ${r.getContentText().slice(0, 300)}`);
  return true;
}
