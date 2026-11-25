/**
 * Formato de las cifras de lotes-data.json para mostrarlas.
 *
 * El JSON guarda números (superficie en m², precios en MXN) y el formato se
 * pone aquí, al pintar. Así la hoja de administración puede escribir el JSON
 * sin preocuparse por comas ni signos, y todas las cifras del sitio salen
 * iguales: separador de miles con coma y dos decimales, como en es-MX.
 *
 * Si llega un texto (un JSON viejo con "$2,500.00", o el '—' de lots.js
 * cuando falta el dato), se muestra tal cual.
 */

const TWO_DECIMALS = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** 6931.54 → "6,931.54" */
export const formatArea = (v) => (isNumber(v) ? TWO_DECIMALS.format(v) : v);

/** 19366760 → "$19,366,760.00" */
export const formatMoney = (v) => (isNumber(v) ? `$${TWO_DECIMALS.format(v)}` : v);
