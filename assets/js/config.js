/**
 * Datos de configuración del sitio que no son del mapa: hoy, el número de
 * WhatsApp y el texto con que se abre el chat.
 *
 * El número va en formato internacional, sin "+", espacios ni guiones, porque
 * es como lo pide wa.me: con solo los 10 dígitos, WhatsApp lee el "55" inicial
 * como el código de país de Brasil y dice que el número no es válido.
 *
 * Los enlaces fijos del HTML (botón flotante, CTA de la hoja lateral, columna
 * de /contacto/ y /contacto/gracias/) no pueden importar este módulo y llevan
 * el número escrito. Si cambia, hay que cambiarlo aquí y en esos enlaces:
 *
 *   grep -rn "wa.me/" --include=*.html .
 */

/** México (52) + (55) 4499 6922. */
export const WHATSAPP_NUMBER = '525544996922';

/** Texto con que se abre el chat cuando no hay un lote seleccionado. */
export const WHATSAPP_DEFAULT_TEXT =
  'Me interesa conocer mas de los lotes comerciales en Tres Marias.';

/** URL de wa.me con el texto ya codificado. */
export const whatsappUrl = (text = WHATSAPP_DEFAULT_TEXT) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/**
 * URL de la implementación web de Apps Script (termina en /exec), sin
 * parámetros: cada módulo le agrega su `?action=`.
 *
 * Vacía = backend apagado. Así el sitio se comporta como antes: los enlaces de
 * WhatsApp no llevan código Ref., no se registra ningún clic y el formulario
 * sigue enviando a Web3Forms. Para encenderlo, ver "Activar el backend" en el
 * README: no basta con poner la URL aquí, también cambia el `action` del form.
 */
export const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbz_jXnH-bM9meMLLdAZcD9SwQoyG4qeJKGHOKI7BhgC1eHuvJBWNktDWx1LKYq3D3w4Qg/exec';

/**
 * Interruptor de la atribución (attribution.js): guardar en el navegador de
 * dónde llegó el visitante y mandarlo con cada lead y cada clic a WhatsApp.
 *
 * Se enciende cuando el aviso de privacidad cubra la atribución, y es
 * independiente de BACKEND_URL: el backend puede funcionar con esto en false.
 * Los clics llevan su código Ref. y el formulario se envía igual, solo que con
 * `atribucion` vacía. Para guardar algo hacen falta los dos encendidos.
 */
export const ATRIBUCION_ACTIVA = false;

/**
 * Versión del aviso de privacidad que acepta quien envía el formulario; viaja
 * en cada lead como `version_aviso`. Será la fecha de última actualización del
 * aviso (p. ej. '2026-12-01'). Vacía mientras el aviso no tenga fecha: hoy el
 * documento no la trae (ver Pendientes en el README).
 */
export const AVISO_VERSION = '';
