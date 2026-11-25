/**
 * Clics a WhatsApp: el evento para dataLayer y, con el backend encendido, el
 * código Ref. que une el chat con la visita que lo originó.
 *
 * La app de WhatsApp Business no tiene API: cuando llega un chat no hay forma
 * de saber de qué campaña vino. Por eso, al dar clic, se agrega al mensaje un
 * código corto, "(Ref. DZ7K3Q)", y se registra en el backend junto con la
 * atribución de la visita. Quien atiende el chat copia ese código a la hoja
 * de Leads y el backend le pega la campaña (copiarAtribucionWa en
 * apps-script/src/Hoja.js).
 *
 * Un solo listener delegado en `document` cubre los enlaces fijos del HTML y
 * el #card-cta que pinta ui.js después. Cada enlace dice dónde está con
 * `data-wa-ubicacion` y, si es de un lote, cuál con `data-lot-id`.
 *
 * Nunca bloquea ni retrasa la navegación: el href se reescribe dentro del
 * mismo clic, antes de que el navegador lo siga, y el registro va por
 * sendBeacon, que no espera respuesta.
 */

import { BACKEND_URL } from './config.js';
import { getAttribution } from './attribution.js';

/** Sin I, O, 0 ni 1: se dictan y se copian a mano sin confundirse. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO_REF = 6;

/** Un código Ref. ya agregado en un clic anterior al mismo enlace. */
const RE_REF = /\s*\(Ref\. [A-Z0-9]{6}\)$/;

function nuevoRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(LARGO_REF));
  // 256 es múltiplo de 32 (el largo del alfabeto), así que el módulo no sesga.
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/**
 * Agrega " (Ref. XXXXXX)" al parámetro `text` del enlace. Si ya traía uno (el
 * visitante volvió y dio clic otra vez), lo sustituye: cada clic es un registro.
 */
function ponerRef(enlace, ref) {
  const url = new URL(enlace.href);
  const texto = (url.searchParams.get('text') || '').replace(RE_REF, '');
  url.searchParams.set('text', `${texto} (Ref. ${ref})`.trim());
  // URLSearchParams escribe los espacios como "+"; los enlaces del sitio usan
  // %20, que wa.me lee sin ambigüedad. Un "+" real del texto ya va como %2B.
  enlace.href = url.href.replace(/\+/g, '%20');
}

function registrarClic(ref, loteId) {
  try {
    if (!navigator.sendBeacon) return;
    const cuerpo = {
      ref_wa: ref,
      lote_id: loteId,
      pagina: location.pathname + location.search,
      event_id: crypto.randomUUID(),
      user_agent: navigator.userAgent,
      atribucion: getAttribution(),
    };
    // text/plain para que el navegador no haga la petición previa de CORS, que
    // Apps Script no contesta.
    const blob = new Blob([JSON.stringify(cuerpo)], { type: 'text/plain;charset=utf-8' });
    navigator.sendBeacon(`${BACKEND_URL}?action=wa_click`, blob);
  } catch (err) {
    // Perder un registro es aceptable; perder el chat, no.
    console.warn('No se pudo registrar el clic a WhatsApp:', err);
  }
}

function alDarClic(e) {
  const enlace = e.target.closest?.('a[href^="https://wa.me/"]');
  if (!enlace) return;

  const loteId = enlace.dataset.lotId || '';
  let ref = '';

  if (BACKEND_URL) {
    try {
      ref = nuevoRef();
      ponerRef(enlace, ref);
      registrarClic(ref, loteId);
    } catch (err) {
      // Si algo falla, el enlace sigue con el href que traía.
      console.warn('Código Ref. de WhatsApp:', err);
      ref = '';
    }
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'whatsapp_click',
    ref_wa: ref,
    lote_id: loteId,
    ubicacion: enlace.dataset.waUbicacion || '',
  });
}

document.addEventListener('click', alDarClic);
