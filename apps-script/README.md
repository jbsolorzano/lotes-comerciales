# Backend en Apps Script

Backend del sitio, ligado a la hoja de operación de Distrito Zalce. **Todavía no
está en producción:** se prueba contra la hoja prototipo y, cuando exista el
Workspace de la empresa, se instala en la hoja definitiva con los mismos pasos.

Hace tres cosas:

1. **Publicar lotes.** Menú *Distrito Zalce → Publicar cambios* en la hoja: valida
   la pestaña Lotes, arma `assets/lotes-data.json` y hace commit al repo con la
   API de GitHub. El commit dispara el deploy. El sitio nunca lee la hoja.
2. **Recibir el formulario** (`POST ?action=lead`): valida, filtra spam, escribe
   en Leads y manda el aviso a ventas.
3. **Registrar clics a WhatsApp** (`POST ?action=wa_click`): escribe en Clics WA
   el código Ref. que va en el mensaje, para atribuir el lead después.

Además, tres disparadores: al editar la hoja, el resumen diario de las 8:00 y la
revisión del sitio cada hora.

## Archivos

```
apps-script/
  .clasp.json.example   Plantilla; la copia real (.clasp.json) no se versiona
  src/                  Lo que sube clasp
    appsscript.json     Zona horaria, permisos y despliegue web
    Config.js           Nombres de pestañas, límites y propiedades del script
    Util.js             Lectura y escritura por encabezado, fechas, texto
    Publicar.js         Lotes → lotes-data.json → commit en GitHub
    Endpoints.js        doGet/doPost: lead y wa_click
    Servicios.js        Captcha y Conversions API de Meta (opcionales)
    Hoja.js             Menú, edición y disparadores programados
  test/run.mjs          Pruebas de las funciones puras con Node
```

El código busca las columnas **por el nombre del encabezado**, no por posición:
se pueden reordenar columnas en la hoja, pero no renombrarlas.

## Instalación (una vez por hoja)

Requiere Node 18+ y clasp: `npm install -g @google/clasp`.

1. En la hoja: *Extensiones → Apps Script*. Se crea un proyecto ligado a la
   hoja. En *Configuración del proyecto* copia el **ID de la secuencia de
   comandos**.
2. `clasp login` con la cuenta dueña de la hoja (en producción, `admin@`).
3. `cp apps-script/.clasp.json.example apps-script/.clasp.json` y pon el ID.
4. Desde `apps-script/`: `clasp push`. Sobrescribe el `Código.gs` vacío.
5. En *Configuración del proyecto → Propiedades del script*, agrega las de la
   tabla de abajo.
6. Recarga la hoja. En el menú *Distrito Zalce*, usa **Instalar disparadores
   (solo una vez)** y acepta los permisos.
7. *Implementar → Nueva implementación → Aplicación web*. Ejecutar como: **yo**.
   Quién tiene acceso: **cualquier usuario**. Guarda la URL y el **ID de la
   implementación**.

### Propiedades del script

| Propiedad | Ejemplo | Obligatoria |
|---|---|---|
| `SITE_URL` | `https://distritozalce.com` | Sí |
| `VENTAS_EMAIL` | `ventas@distritozalce.com` | Sí |
| `ALERT_EMAIL` | `admin@distritozalce.com` | Sí |
| `GITHUB_REPO` | `jbsolorzano/lotes-comerciales` | Para publicar |
| `GITHUB_BRANCH` | `main` | Para publicar |
| `GITHUB_TOKEN` | token de grano fino | Para publicar |
| `CAPTCHA_PROVIDER` | `turnstile` o `recaptcha` | No (vacío = sin captcha) |
| `CAPTCHA_SECRET` | clave secreta / API key | Con captcha |
| `RECAPTCHA_PROJECT`, `RECAPTCHA_SITE_KEY` | | Solo reCAPTCHA |
| `META_PIXEL_ID`, `META_TOKEN` | | No (vacío = Meta apagado) |
| `SHEET_ID` | id de la hoja | No; solo si el script no está ligado |

**`GITHUB_TOKEN`:** token *fine-grained* con acceso **solo a este repo** y
permiso **Contents: Read and write**, nada más. Vive solo en las propiedades
del script: nunca en el código, la hoja ni un chat.

**Meta queda apagado** mientras `META_PIXEL_ID` esté vacío, y no se enciende hasta
que el aviso de privacidad cubra la Conversions API.

### Actualizar el código

```bash
cd apps-script
clasp push
clasp deploy -i <ID-de-la-implementación> -d "descripción del cambio"
```

**Siempre `-i` con el mismo ID.** `clasp deploy` sin `-i`, o una "Nueva
implementación" desde el editor, crea otra URL y el sitio sigue mandando a la
vieja.

## Contrato de los endpoints

Una sola URL de implementación; la acción va en `?action=`. El sitio manda
`POST` con `Content-Type: text/plain` y cuerpo JSON, así el navegador no hace la
petición previa de CORS. **Apps Script siempre responde 200**: el resultado va en
`ok`.

### `POST ?action=lead`

```json
{
  "nombre": "Ana Pérez", "email": "ana@ejemplo.com", "telefono": "443 123 4567",
  "lote": "MZ 06 Lote 16", "mensaje": "…", "consentimiento": true,
  "version_aviso": "2026-12-01", "captcha_token": "…", "botcheck": "",
  "t_render": 1764088800000, "event_id": "uuid", "user_agent": "…",
  "pagina": "/contacto/?lote=mz06L16",
  "atribucion": { "utm_source": "…", "gclid": "…", "fbc": "…", "landing_page": "…", "…": "…" }
}
```

`lote` acepta el id (`mz06L16`) o el texto del `<select>` (`MZ 06 Lote 16
(VENDIDO)`).

```json
{ "ok": true, "lead_id": "DZ-2026-000123" }
{ "ok": false, "error": "validacion", "campos": { "email": "formato" } }
{ "ok": false, "error": "limite", "reintentar": false }
{ "ok": false, "error": "interno", "reintentar": true }
```

Sin JavaScript, el `<form>` hace un POST normal con los mismos nombres de campo y
recibe una página mínima con enlace a `/contacto/gracias/`. Esa fila entra con
`origen_envio = sin_js` y `antispam = sin_token`.

**Antispam:** campo trampa `botcheck`, menos de 3 s entre `t_render` y el envío,
más de 2 URLs en el mensaje y captcha si está configurado. Un envío marcado como
spam recibe `ok: true` (para no enseñarle al bot), entra con estado Spam y no
genera aviso. **Límites:** 3 envíos por correo por hora y 30 en total por hora;
al pasar el total se avisa a `ALERT_EMAIL`.

### `POST ?action=wa_click`

```json
{ "ref_wa": "DZ7K3Q", "lote_id": "mz06L16", "pagina": "/", "event_id": "…", "user_agent": "…", "atribucion": { "…": "…" } }
```

`ref_wa` son 6 caracteres de `A-Z` y `2-9`, sin I, O, 0 ni 1. Responde
`{ "ok": true }`, pero el sitio lo manda con `sendBeacon` y no lo lee. Límite:
300 clics por hora.

## Publicar lotes

- **Validación antes de escribir.** Si algo falla (estado o uso de suelo fuera
  de Catálogos, superficie no numérica, precio fuera de 500–50,000, "mostrar
  precio" sin precio, id repetido), se lista qué fila y por qué, y no se publica
  nada.
- **Reglas.** VENDIDO y DESARROLLO HERSO nunca muestran precio. El valor total
  es superficie × precio, redondeado a centavos.
- **Orden.** Por manzana y lote, el mismo formato que el archivo del repo.
- **La primera publicación cambia 3 valores totales**, porque hoy están
  capturados a mano y no cuadran: `mz06L26`, `mz08L04` y `mz10L01`. Comercial
  debe confirmar antes.
- Cada publicación es un commit con el resumen de cambios. Para deshacer una, se
  revierte el commit.

## Pruebas

```bash
node apps-script/test/run.mjs                 # contra assets/lotes-data.json
```

Prueban la validación del lead, la normalización de teléfono y lote, y que la
hoja reproduzca el JSON publicado byte por byte, salvo los 3 valores de arriba.
Lo que toca servicios de Google (hoja, correo, GitHub) se prueba en la hoja
prototipo.
