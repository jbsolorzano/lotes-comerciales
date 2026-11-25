// Pruebas de las funciones puras del backend, con Node y sin servicios de Google.
//   node apps-script/test/run.mjs [ruta/a/lotes-data.json]
// Carga los .js de src/ en un contexto aislado con stubs mínimos.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(dir, '..', 'src');
const ctx = vm.createContext({ console, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) } });
for (const f of ['Config.js', 'Util.js', 'Publicar.js', 'Endpoints.js']) {
  vm.runInContext(fs.readFileSync(path.join(src, f), 'utf8'), ctx, { filename: f });
}
const g = (expr) => vm.runInContext(expr, ctx);
let n = 0;
const prueba = (nombre, fn) => { fn(); n++; console.log(`ok - ${nombre}`); };

prueba('parseLote acepta id y texto del select', () => {
  const parseLote = g('parseLote');
  assert.equal(parseLote('mz06L16'), 'mz06L16');
  assert.equal(parseLote('MZ06l16'), 'mz06L16');
  assert.equal(parseLote('MZ 06 Lote 16'), 'mz06L16');
  assert.equal(parseLote('MZ 06 Lote 16 (VENDIDO)'), 'mz06L16');
  assert.equal(parseLote('MZ 6 Lote 3'), 'mz06L03');
  assert.equal(parseLote(''), '');
  assert.equal(parseLote('cualquier cosa'), '');
});

prueba('normalizarTelefono a E.164', () => {
  const t = g('normalizarTelefono');
  assert.equal(t('443 123 4567'), '+524431234567');
  assert.equal(t('(443) 123-45-67'), '+524431234567');
  assert.equal(t('+52 443 123 4567'), '+524431234567');
  assert.equal(t('524431234567'), '+524431234567');
  assert.equal(t(''), '');
});

const base = {
  nombre: 'Ana Pérez', email: 'Ana@Ejemplo.com', telefono: '443 123 4567', lote: 'MZ 06 Lote 16',
  mensaje: 'Me interesa.', consentimiento: true, botcheck: '', t_render: 0,
  atribucion: { utm_source: 'google', gclid: 'abc' },
};
const validar = (d) => JSON.parse(JSON.stringify(g('validarLead')(d, 60_000)));

prueba('validarLead normaliza un envío correcto', () => {
  const r = validar(base);
  assert.deepEqual(r.campos, {});
  assert.equal(r.spam, '');
  assert.equal(r.lead.email, 'ana@ejemplo.com');
  assert.equal(r.lead.telefono, '+524431234567');
  assert.equal(r.lead.lote_interes, 'mz06L16');
  assert.equal(r.lead.utm_source, 'google');
  assert.equal(r.lead.gclid, 'abc');
});

prueba('validarLead acepta el formulario sin JavaScript', () => {
  const r = validar({ nombre: 'Ana', email: 'a@b.mx', mensaje: 'Hola', consentimiento: 'Acepto el aviso de privacidad', utm_source: 'qr' });
  assert.deepEqual(r.campos, {});
  assert.equal(r.lead.consentimiento, true);
  assert.equal(r.lead.utm_source, 'qr');
});

prueba('validarLead marca campos faltantes', () => {
  const r = validar({ nombre: '', email: 'malo', mensaje: '', consentimiento: false, telefono: 'abc' });
  assert.deepEqual(Object.keys(r.campos).sort(), ['consentimiento', 'email', 'mensaje', 'nombre', 'telefono']);
});

prueba('validarLead detecta spam', () => {
  assert.equal(validar({ ...base, botcheck: 'on' }).spam, 'trampa');
  assert.equal(validar({ ...base, t_render: 59_000 }).spam, 'rapido');
  assert.equal(validar({ ...base, mensaje: 'http://a http://b www.c' }).spam, 'urls');
});

// Filas de la hoja a partir de lotes-data.json: así el JSON que arma la hoja se
// compara contra el publicado.
const jsonPath = process.argv[2] || path.join(dir, '..', '..', 'assets', 'lotes-data.json');
const publicado = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const numero = (v) => (typeof v === 'string' ? Number(v.replace(/[$,]/g, '')) : v);
const filas = Object.entries(publicado).map(([id, r], i) => ({
  _fila: i + 2, id, manzana: Number(r.manzana), lote: Number(r.lote), uso_suelo: r.uso_suelo,
  superficie_m2: numero(r.superficie_m2), estado: r.estado,
  precio_m2: r.precio_por_m2 === null ? '' : numero(r.precio_por_m2),
  mostrar_precio: r.precio_por_m2 !== null,
}));
const catalogo = {
  estados: ['DISPONIBLE', 'NEGOCIACION', 'VENDIDO', 'DESARROLLO HERSO'],
  usos: [...new Set(Object.values(publicado).map((r) => r.uso_suelo))],
};
const construir = (f) => JSON.parse(JSON.stringify(g('construirLotes')(f, catalogo)));

prueba('construirLotes reproduce el JSON publicado salvo los 3 valores mal capturados', () => {
  const { datos, errores } = construir(filas);
  assert.deepEqual(errores, []);
  assert.equal(Object.keys(datos).length, 63);
  const cambios = g('diferenciasLotes')(Object.fromEntries(Object.entries(publicado).map(([k, r]) => [k, {
    ...r, superficie_m2: numero(r.superficie_m2), precio_por_m2: r.precio_por_m2 === null ? null : numero(r.precio_por_m2),
    valor_final: r.valor_final === null ? null : numero(r.valor_final),
  }])), datos);
  assert.deepEqual(Array.from(cambios, (c) => c.split(':')[0]).sort(), ['mz06L26', 'mz08L04', 'mz10L01']);
  console.log('   ' + cambios.join('\n   '));
});

prueba('serializarLotes es JSON válido y en orden de manzana y lote', () => {
  const { datos } = construir(filas);
  const texto = g('serializarLotes')(datos);
  const ids = Object.keys(JSON.parse(texto));
  assert.equal(ids[0], 'mz01L01');
  assert.equal(ids.at(-1), 'mz17L01');
  assert.ok(texto.endsWith('}\n'));
});

prueba('construirLotes oculta el precio de VENDIDO y DESARROLLO HERSO', () => {
  const f = [{ ...filas[15], estado: 'VENDIDO' }];
  const { datos } = construir(f);
  const r = Object.values(datos)[0];
  assert.equal(r.precio_por_m2, null);
  assert.equal(r.valor_final, null);
});

prueba('construirLotes rechaza errores de captura', () => {
  const f = [
    { ...filas[15], estado: 'APARTADO' },
    { ...filas[16], precio_m2: 100 },
    { ...filas[17], precio_m2: '', mostrar_precio: true },
    { ...filas[18], id: filas[17].id },
    { ...filas[19], id: 'MZ-6' },
  ];
  const { errores } = construir(f);
  assert.equal(errores.length, 5, errores.join('\n'));
});

console.log(`\n${n} pruebas pasaron.`);
