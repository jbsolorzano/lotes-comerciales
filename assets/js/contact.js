/**
 * Formulario de contacto: validación, envío por AJAX y el selector de lotes.
 *
 * El envío va a Web3Forms (el `action` del form) mientras BACKEND_URL esté
 * vacío; con BACKEND_URL, va al backend de Apps Script con la atribución de la
 * visita (contrato en apps-script/README.md).
 *
 * Todo lo de aquí es mejora progresiva sobre un formulario que ya funciona sin
 * JavaScript: el <form> lleva su `action`, su `method` y sus atributos de
 * validación en el marcado, así que si este módulo no carga, el navegador hace
 * el POST y valida por su cuenta.
 */

import { prefersReducedMotion } from './state.js';
import { loadLots } from './lots.js';
import { whatsappUrl, BACKEND_URL, AVISO_VERSION } from './config.js';
import { getAttribution } from './attribution.js';

const WHATSAPP_URL = whatsappUrl();

/** Cuándo se pintó el formulario; el backend descarta envíos de menos de 3 s. */
const T_RENDER = Date.now();

const WHATSAPP_LINK = (texto) =>
  `<a href="${WHATSAPP_URL}" data-wa-ubicacion="alerta" class="underline underline-offset-4 font-semibold">${texto}</a>`;

const ALERT_ENVIO = `No pudimos enviar tu mensaje. Vuelve a intentarlo o ${WHATSAPP_LINK('escríbenos por WhatsApp')}.`;

const ALERT_LIMITE = `Recibimos muchos mensajes en poco tiempo. ${WHATSAPP_LINK('Escríbenos por WhatsApp')}.`;

/** Mensajes propios por campo; la llave es la propiedad de ValidityState. */
const MESSAGES = {
  nombre: {
    valueMissing: 'Escribe tu nombre.',
  },
  email: {
    valueMissing: 'Escribe tu correo electrónico.',
    typeMismatch: 'Revisa tu correo: parece faltarle el @ o el dominio.',
  },
  telefono: {
    patternMismatch: 'Usa solo números, espacios y los signos + ( ) −.',
  },
  mensaje: {
    valueMissing: 'Cuéntanos qué necesitas.',
  },
  consentimiento: {
    valueMissing: 'Necesitamos tu autorización para poder contactarte.',
  },
};

/** El mensaje propio si hay uno para esa causa; si no, el del navegador. */
function messageFor(el) {
  const table = MESSAGES[el.name] ?? {};
  for (const cause of Object.keys(table)) {
    if (el.validity[cause]) return table[cause];
  }
  return el.validationMessage;
}

/**
 * Los errores del backend vienen como { campo: 'requerido' | 'formato' }. Se
 * traducen a la causa de ValidityState para reutilizar los mismos mensajes que
 * la validación del navegador.
 */
const BACKEND_CAUSES = {
  requerido: ['valueMissing'],
  formato: ['typeMismatch', 'patternMismatch'],
};

function backendMessageFor(el, code) {
  const table = MESSAGES[el.name] ?? {};
  for (const cause of BACKEND_CAUSES[code] ?? []) {
    if (table[cause]) return table[cause];
  }
  return 'Revisa este campo.';
}

const pushDataLayer = (evento) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(evento);
};

/* ── Validación ───────────────────────────────────────────────────────────── */

const errorBoxOf = (el) => document.getElementById(`e-${el.id.replace(/^f-/, '')}`);

function showError(el, text) {
  el.setAttribute('aria-invalid', 'true');
  const box = errorBoxOf(el);
  if (box) box.textContent = text;
}

function clearError(el) {
  el.removeAttribute('aria-invalid');
  const box = errorBoxOf(el);
  if (box) box.textContent = '';
}

export function initContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const alertBox = document.getElementById('form-alert');
  const success = document.getElementById('form-success');
  const button = document.getElementById('contact-submit');
  const buttonLabel = document.getElementById('contact-submit-label');

  // Se desactiva la validación nativa desde JS y no con el atributo `novalidate`
  // en el HTML: sin JavaScript el navegador tiene que seguir validando con sus
  // burbujas, o el formulario mandaría campos vacíos a Web3Forms.
  form.noValidate = true;

  const controls = () =>
    [...form.elements].filter(
      (el) => el.name && el.type !== 'hidden' && el.name !== 'botcheck' && el.willValidate
    );

  /** Marca todos los inválidos, enfoca el primero y devuelve si el form es válido. */
  function validateAll() {
    let firstInvalid = null;
    for (const el of controls()) {
      if (el.checkValidity()) {
        clearError(el);
      } else {
        showError(el, messageFor(el));
        firstInvalid ??= el;
      }
    }
    firstInvalid?.focus();
    return firstInvalid === null;
  }

  // Revalidar solo lo que YA está marcado como inválido, conforme se corrige.
  // Un campo virgen nunca se valida: nadie quiere ver "escribe tu correo" antes
  // de haber tenido oportunidad de escribirlo.
  const revalidate = (e) => {
    const el = e.target;
    if (el.hasAttribute('aria-invalid')) {
      if (el.checkValidity()) clearError(el);
      else showError(el, messageFor(el));
    }
  };
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  /* ── Estado del botón y de la alerta ───────────────────────────────────── */

  function setSending(on) {
    button.disabled = on;
    button.setAttribute('aria-busy', String(on));
    buttonLabel.textContent = on ? 'Enviando…' : 'Enviar mensaje';
  }

  function showAlert(html) {
    alertBox.innerHTML = html;
    alertBox.hidden = false;
  }

  const hideAlert = () => {
    alertBox.hidden = true;
    alertBox.textContent = '';
  };

  function showSuccess() {
    form.hidden = true;
    success.hidden = false;
    // El foco es lo que de verdad anuncia el cambio cuando lo único que pasó fue
    // dejar de ocultar un elemento que ya estaba en el DOM; role="status" es el
    // cinturón además del tirante.
    success.focus({ preventScroll: true });
    success.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    });
  }

  /* ── Envío al backend (solo con BACKEND_URL) ───────────────────────────── */

  /** Marca los campos que rechazó el backend y enfoca el primero. Devuelve si marcó alguno. */
  function markBackendErrors(campos) {
    let first = null;
    for (const [name, code] of Object.entries(campos ?? {})) {
      const el = form.elements[name];
      if (!el?.id) continue;
      showError(el, backendMessageFor(el, code));
      first ??= el;
    }
    first?.focus();
    return first !== null;
  }

  async function sendToBackend() {
    const f = form.elements;
    // El backend acepta el id o el texto de la opción; se manda el id, que no
    // depende de cómo se escriba el nombre del lote.
    const option = f.lote?.selectedOptions?.[0];
    const loteId = option?.dataset.lotId || '';
    const eventId = crypto.randomUUID();
    const body = {
      nombre: f.nombre.value,
      email: f.email.value,
      telefono: f.telefono.value,
      lote: loteId || f.lote?.value || '',
      mensaje: f.mensaje.value,
      consentimiento: f.consentimiento.checked,
      version_aviso: AVISO_VERSION,
      captcha_token: '',
      botcheck: f.botcheck?.checked ? 'on' : '',
      t_render: T_RENDER,
      event_id: eventId,
      user_agent: navigator.userAgent,
      pagina: location.pathname + location.search,
      atribucion: getAttribution(),
    };

    let data;
    try {
      // text/plain para que el navegador no haga la petición previa de CORS,
      // que Apps Script no contesta.
      const res = await fetch(`${BACKEND_URL}?action=lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout?.(15000),
      });
      // Apps Script responde 200 aunque falle: lo que decide es `ok`.
      data = await res.json();
    } catch (err) {
      console.error('Envío del formulario de contacto:', err);
      data = { ok: false, error: 'red' };
    }

    if (data?.ok) {
      pushDataLayer({ event: 'generate_lead', lead_id: data.lead_id || '', lote_id: loteId, event_id: eventId });
      showSuccess();
      return;
    }

    const error = data?.error || 'desconocido';
    pushDataLayer({ event: 'form_error', error });
    if (error === 'limite') {
      showAlert(ALERT_LIMITE);
    } else if (error !== 'validacion' || !markBackendErrors(data.campos)) {
      // Con errores de validación los mensajes van junto a cada campo; la alerta
      // general queda para todo lo demás (y para una validación sin campos).
      showAlert(ALERT_ENVIO);
    }
    // Lo que el visitante escribió sigue ahí y el formulario se puede reenviar.
    sending = false;
    setSending(false);
  }

  /* ── Envío ─────────────────────────────────────────────────────────────── */

  let sending = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // La bandera es la guarda real contra el doble envío: `disabled` no detiene
    // un requestSubmit() programático ni el Enter repetido antes del repintado.
    if (sending) return;
    hideAlert();
    if (!validateAll()) return;

    if (BACKEND_URL) {
      sending = true;
      setSending(true);
      await sendToBackend();
      return;
    }

    const payload = Object.fromEntries(new FormData(form));
    // `redirect` es una instrucción sólo para el camino sin JavaScript. Si viaja
    // en la petición AJAX, Web3Forms contesta una redirección en vez del JSON.
    delete payload.redirect;
    payload.origen = location.href;

    sending = true;
    setSending(true);

    try {
      // Se lee la URL del marcado en vez de repetirla aquí: una sola fuente de
      // verdad, y para probar en local basta con cambiar el `action`.
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout?.(15000),
      });
      const data = await res.json().catch(() => ({}));
      // La documentación de Web3Forms no garantiza la llave `success`, así que
      // manda el código HTTP; `success:false` sólo se toma en cuenta si viene.
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      showSuccess();
    } catch (err) {
      console.error('Envío del formulario de contacto:', err);
      showAlert(ALERT_ENVIO);
      // Se deja el formulario intacto y enviable: lo que el visitante escribió
      // sigue ahí.
      sending = false;
      setSending(false);
    }
  });

  fillLotSelect();
}

/* ── Selector de lote ─────────────────────────────────────────────────────── */

/**
 * Llena el <select> con los lotes que tienen geometría, agrupados por manzana.
 *
 * Se usa loadLots() —el mismo módulo que alimenta el mapa— porque el KML es lo
 * único que sabe cuáles lotes son públicos: lotes-data.json trae 63 registros y
 * 14 no tienen polígono, así que no se muestran en ninguna parte del sitio.
 * Además el formato del nombre ("MZ 06 Lote 16") ya vive ahí; reimplementarlo
 * daría dos ortografías del mismo lote en el mismo buzón.
 *
 * Es deliberadamente "fire and forget": si la carga falla, el <select> se queda
 * con su opción por defecto y el formulario se envía igual.
 */
async function fillLotSelect() {
  const select = document.getElementById('f-lote');
  if (!select) return;

  let lots;
  try {
    ({ lots } = await loadLots());
  } catch (err) {
    console.warn('No se pudieron cargar los lotes para el selector:', err);
    return;
  }

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : Infinity; // los registros '—' se van al final
  };

  const sorted = [...lots].sort(
    (a, b) =>
      num(a.manzana) - num(b.manzana) ||
      num(a.lote) - num(b.lote) ||
      a.name.localeCompare(b.name, 'es')
  );

  const groups = new Map();
  for (const lot of sorted) {
    const key = num(lot.manzana) === Infinity ? 'Otros' : `Manzana ${String(lot.manzana).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lot);
  }

  const frag = document.createDocumentFragment();
  for (const [label, items] of groups) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const lot of items) {
      const option = document.createElement('option');
      // El valor va legible para que el correo se explique solo, sin obligar a
      // nadie a traducir "mz06L16" del otro lado.
      option.textContent =
        lot.estadoKey === 'DISPONIBLE' ? lot.name : `${lot.name} (${lot.estado})`;
      option.value = option.textContent;
      option.dataset.lotId = lot.lotId;
      group.appendChild(option);
    }
    frag.appendChild(group);
  }
  select.appendChild(frag);

  // Enlace profundo /contacto/?lote=mz06L16. Hoy nada del sitio lo genera —la
  // ficha del lote manda a WhatsApp a propósito—, pero deja la puerta lista por
  // si algún día se quiere mandar la ficha aquí.
  const wanted = new URLSearchParams(location.search).get('lote')?.toLowerCase();
  if (!wanted) return;
  const match = [...select.options].find(
    (o) => o.dataset.lotId?.toLowerCase() === wanted
  );
  if (match) select.value = match.value;
}
