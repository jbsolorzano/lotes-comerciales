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
