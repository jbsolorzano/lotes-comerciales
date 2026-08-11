# lotes-comerciales

Lotes Distrito Zalce — sitio estático con un explorador de lotes sobre Google Maps.

No hay build ni dependencias: el sitio se publica tal cual con `git push`.

**Producción:** <https://distritozalce.com/> — GitHub Pages desde `main:/`, con
dominio propio y HTTPS forzado.

---

## Pendientes (TO DO)

- [ ] **Falta `assets/favicon.png`.** El `index.html` ya lo referencia (`<link
  rel="icon">` y `<link rel="apple-touch-icon">` en el `<head>`), así que basta
  con dejar el archivo ahí: no hay que tocar el marcado. **512×512** es la
  medida segura — baja bien a los 16px de la pestaña y alcanza para el icono de
  pantalla de inicio en iOS. Mientras no exista, el navegador se lleva un 404 en
  cada carga.

- [x] **Aviso de privacidad publicado** en `/aviso-de-privacidad/` y enlazado
  desde el pie de las dos páginas — es el enlace que antes decía *Legal* y
  apuntaba a `href="#"`. Cómo está armado: [Páginas y rutas](#páginas-y-rutas).

- [ ] **Al texto del aviso le faltan dos cosas.** El contenido se publicó tal
  cual lo entregó la empresa —sin reescribir ni resumir—, así que esto son
  huecos del documento legal, no del marcado:

  - La sección *«¿Cómo puede limitar el uso o divulgación de su información
    personal?»* anuncia que «contamos con los siguientes listados de exclusión»
    y luego **no enumera ninguno**. O se listan, o se reformula la frase: tal
    como está, promete algo que no entrega.
  - **No hay fecha de última actualización ni versión.** El propio aviso dice
    que «puede sufrir modificaciones», y sin fecha el titular no tiene forma de
    saber qué versión aceptó ni de notar que cambió. Conviene sellarlo con una
    fecha visible al final del documento.

  Además, falta que **un abogado valide el contenido completo**. Lo de enlazar el
  aviso desde el formulario ya está resuelto: la casilla de consentimiento de
  `/contacto/` lo enlaza en el momento mismo en que se recaban los datos, que es
  lo que la LFPDPPP exige.

- [x] **Formulario de contacto publicado** en `/contacto/`, con endpoint en
  **Web3Forms**. La `access_key` va a la vista en el HTML: es pública por
  necesidad, exactamente por la misma razón que la clave de Maps (el envío sale
  del navegador y no hay build que pueda esconderla). Cómo está armado:
  [Formulario de contacto](#formulario-de-contacto).

  > **Endurecimiento pendiente:** en el panel de Web3Forms se puede restringir el
  > dominio desde el que se aceptan envíos. Mientras no se haga, cualquiera puede
  > copiar la clave y mandar mensajes al buzón desde otro sitio.

- [ ] **Falta el correo y el teléfono de ventas.** La columna lateral de
  `/contacto/` sale solo con WhatsApp porque **no existe en el repo ninguna
  dirección ni teléfono comercial**, y no se inventan. Cuando los haya, se
  agregan ahí con enlaces `mailto:` y `tel:`.

  > **Ojo:** `privacidaddedatos@grupoherso.com.mx` y el `(443) 324 24 39` del
  > aviso de privacidad **no sirven para esto**. Son del encargado de datos
  > personales, para solicitudes ARCO; reutilizarlos mandaría prospectos al
  > buzón equivocado.

- [ ] **Transiciones ease-in-out del scroll del header.** `nav.js` usa
  `scrollIntoView({ behavior: 'smooth' })`; la curva y la duración las elige el
  navegador y no son iguales en Chrome, Firefox y Safari, así que el ease-in-out
  no está realmente bajo nuestro control. Para tenerlo, hay que hacer el tween a
  mano con `requestAnimationFrame`, igual que `panCameraTo()` en `map2d.js`
  — ahí ya vive una `easeInOut` cúbica que convendría mover a un módulo
  compartido en vez de duplicarla. Respetar `prefersReducedMotion()` como ahora.

---

## Probar en local

### Requisitos

| Requisito | Para qué | Notas |
|---|---|---|
| Un servidor HTTP estático | Obligatorio | Ver abajo por qué `file://` no funciona |
| Navegador moderno | Obligatorio | Chrome/Edge/Firefox/Safari actuales. Se usan módulos ES, `svh`, `matchMedia`, `IntersectionObserver` y Pointer Events |
| Conexión a internet | Obligatorio | Tailwind, Google Fonts y la API de Google Maps se cargan desde CDN |
| El origen local en la lista de referrers de la clave | Para que se vea el mapa | Ver [Clave de Google Maps](#clave-de-google-maps). Sin esto el resto del sitio sí funciona |
| `ffmpeg` | Opcional | Solo si hay que regenerar `assets/hero-poster.jpg` |

### Levantar el servidor

**No abras `index.html` con doble clic.** Bajo `file://` el navegador bloquea
los módulos ES (`assets/js/*.js`) por CORS y `fetch()` no puede leer el KML ni
el JSON, así que la página queda en blanco con errores en consola.

Cualquiera de estas opciones sirve — desde la raíz del repo:

```bash
python -m http.server 8099 --bind 127.0.0.1      # Python 3
npx serve .                                       # Node
```

Luego abre `http://127.0.0.1:8099/index.html`.

### Clave de Google Maps

Si el origen desde el que abres el sitio no está autorizado, **todo funciona
salvo el mapa** (lista, filtros, ficha y WhatsApp siguen operando) y verás:

```
consola: Google Maps JavaScript API error: RefererNotAllowedMapError
         Your site URL to be authorized: http://localhost:3000/
```

Eso **no es un bug del código**, es configuración de Google Cloud.

> **La API de Maps JavaScript NO admite restricción por dirección IP.** Esa
> opción es solo para APIs de servidor (Geocoding, etc.). Una clave de mapa de
> navegador se protege **únicamente** con *Restricciones de sitios web
> (HTTP referrers)*.

En *Google Cloud Console → APIs & Services → Credentials → (la clave)*:

**1. Restricciones de aplicación → Sitios web.** Hay que dar la cadena
completa, incluido el puerto:

```
https://distritozalce.com/*
https://www.distritozalce.com/*
http://localhost:3000/*
http://127.0.0.1:3000/*
```

Agrega una línea por cada puerto de desarrollo que uses (`:8099`, `:5173`…);
los comodines no cubren el puerto.

**2. Restricciones de API →** solo *Maps JavaScript API*. Si se conserva el
botón "Ver en 3D", agrega también *Map Tiles API*.

**3. Cuotas y presupuesto.** En *Google Maps Platform → Quotas* pon un tope
diario de cargas de mapa, y una alerta de presupuesto en la cuenta de
facturación. Las restricciones de referrer se pueden falsificar fuera de un
navegador, así que **la cuota es el verdadero límite de gasto**, no el referrer.

**Sobre exponer la clave:** una clave de Maps JavaScript **siempre** es visible
en el HTML — se ejecuta en el navegador y no hay forma de ocultarla. Todos los
sitios con Google Maps la exponen; el modelo de seguridad de Google asume esa
visibilidad y la compensa con los tres puntos de arriba. No hace falta ningún
backend ni proxy para esto.

El archivo `.env` de la raíz no lo usa nada (el sitio es estático y no hay
build); la clave real vive en `index.html`.

### Qué revisar al probar un cambio

- **Escritorio (≥768px):** barra lateral de 320px + mapa; la ficha del lote
  flota sobre el mapa abajo a la izquierda.
- **Móvil (<768px):** mapa a pantalla completa y la barra lateral se convierte
  en un *bottom sheet* arrastrable. Verifica los tres topes (peek / half /
  full) arrastrando el asa, y que tocar un lote cambie la hoja a la ficha con
  el botón "Todos los lotes" para volver.
- **Filtros:** las 7 opciones deben sumar 49 lotes
  (Servicios 2, Comercial 3, Habitacional 5, Mixto 16, Corporativo 22,
  Áreas verdes 1).
- **Movimiento reducido:** DevTools → Rendering → *Emulate
  `prefers-reduced-motion: reduce`*. Las transiciones deben ser instantáneas.
  El video del hero **sí** debe seguir reproduciéndose (es intencional).
- **Rendimiento:** DevTools → Performance, grabando mientras se pasa el cursor
  por varios polígonos. El *presentation delay* debe quedar dentro del
  presupuesto de 16.6 ms por frame.
- **Red:** `maps3d` no debe aparecer en la pestaña Network hasta pulsar
  "Ver en 3D".
- **Aviso de privacidad** (`/aviso-de-privacidad/`): que el enlace del pie lleve
  ahí desde la portada, que el menú móvil abra, y que **a 320px de ancho no haya
  scroll horizontal** — el correo `privacidaddedatos@grupoherso.com.mx` es una
  cadena larga sin espacios y desborda si se le quita `break-words`. En Network
  no debe aparecer ninguna petición a `maps.googleapis.com`.
- **Formulario** (`/contacto/`). Sin mandar nada al buzón real: en la consola,
  `window.fetch = async () => new Response('{}', {status:200})` antes de enviar.
  - Enviar vacío: cuatro errores en español, borde rojo y el foco en *Nombre*.
    Al corregir un campo su error se va **solo**, sin tocar los demás.
  - Camino feliz: el formulario se sustituye por el bloque de éxito y el foco
    salta ahí.
  - Con el stub lanzando error: aparece la alerta con la salida por WhatsApp,
    el botón vuelve a "Enviar mensaje" y **lo escrito sigue ahí**.
  - El `<select>` de lote debe traer 49 opciones agrupadas por manzana. Si sale
    con una sola, el KML no cargó — revisar rutas (ver [Datos](#datos)).
  - **A 320px no debe haber scroll horizontal**, y hay que medirlo *después* de
    que se llenen las opciones: el ancho del `<select>` cambia al llegar.
  - Sin JavaScript (DevTools → Settings → Debugger → *Disable JavaScript*): el
    formulario debe verse completo y el navegador debe validar con sus burbujas.

---

## Estructura

```
index.html              Portada: marcado + cargador de Google Maps
aviso-de-privacidad/
  index.html            Aviso de privacidad — la carpeta ES la ruta pública
contacto/
  index.html            Formulario de contacto
  gracias/
    index.html          Aterrizaje del envío sin JavaScript (noindex)
assets/
  js/
    tailwind-config.js  Tokens de DESIGN.md; lo cargan todas las páginas
    contact.js          Validación, envío a Web3Forms y selector de lote
    main.js             Arranque y cableado (solo la portada)
    lots.js             Carga y unión de KML + JSON, normalización, estilos
    state.js            Estado (selección/hover/filtro) y bus de eventos
    map2d.js            Mapa 2D, polígonos, eventos nativos, encuadre
    map3d.js            Vista 3D bajo demanda, de un lote a la vez
    ui.js               Listado lateral, filtro, ficha del lote
    sheet.js            Bottom sheet móvil
    hero.js             Video del hero (carga diferida y pausa)
    nav.js              Navegación, menú móvil, botón flotante
  lotes-data.json       Datos comerciales por lote (63 registros)
  predios-Tres-Marias.kml  Geometría por lote (49 placemarks)
  predios-overview.mp4  Video del hero (~33 MB)
  hero-poster.jpg       Póster del video
  WhatsApp.svg
DESIGN.md               Tokens de diseño y guía de estilo
```

### Páginas y rutas

No hay router: **en GitHub Pages una carpeta con `index.html` es una ruta.**
`aviso-de-privacidad/index.html` se sirve en `/aviso-de-privacidad/`, y
`/aviso-de-privacidad` (sin barra) recibe un 301 a la versión con barra. Lo mismo
vale para `/contacto/` y `/contacto/gracias/`. Para agregar otra página basta con
crear otra carpeta igual; no hay nada que configurar.

Como esa página vive un nivel por debajo de la raíz, **sus rutas a assets llevan
`../`** (`../assets/js/nav.js`). Es el único cuidado al copiar marcado desde
`index.html`.

**Qué comparte con la portada y qué no.** El header, el pie y el botón flotante
de WhatsApp son el mismo marcado, e importa `nav.js` para el menú móvil en vez
de duplicarlo — `initAnchors()` e `initFab()` no encuentran sus elementos
(`#nosotrosBtn`, `#explorer`) y salen solos. Lo que **no** carga es `main.js`:
sin mapa ni video, la página no toca la API de Google Maps y no gasta cuota.

Los tokens de color y tipografía salen de `assets/js/tailwind-config.js`, que
antes estaba en línea dentro de `index.html`. Se sacó a un archivo para que las
dos páginas no se separen visualmente con el tiempo.

> **`tailwind-config.js` no es un módulo ES.** Se carga con un `<script src>`
> normal —bloqueante, justo después del CDN de Tailwind y antes del `<style>`—
> porque Tailwind tiene que leer `tailwind.config` antes de generar las clases.
> Si se le pone `type="module"` o `defer`, se ejecuta demasiado tarde y la
> página se cae al Tailwind por defecto: la paleta y las fuentes desaparecen.

> **Ese HTML es la única copia del aviso que existe en el repo.** El texto se
> publicó palabra por palabra como lo entregó la empresa; el marcado solo le da
> formato (jerarquía de encabezados, listas, `mailto:`/`tel:`). Al tocar esa
> página **no se corrige ni se reescribe el texto legal** —ni una coma— aunque
> se le vea una errata: eso se cambia con quien firma el aviso, no aquí. Si
> alguna vez se vuelve a editar en Word o Markdown, el archivo fuente va al
> repo y esta nota se actualiza.

Cada sección del aviso tiene `id` (`#identidad`, `#finalidades`,
`#derechos-arco`…), así que se puede enlazar directo a un apartado; la regla
`main [id] { scroll-margin-top }` del `<style>` evita que el header fijo lo tape.

### Formulario de contacto

`/contacto/` es el único `<form>` del sitio. El endpoint es **Web3Forms**
(`https://api.web3forms.com/submit`), porque sin backend ni build no hay dónde
recibir un POST propio.

**Todo el JavaScript es mejora progresiva.** El `<form>` lleva su `action`, su
`method` y sus atributos de validación en el marcado, así que si `contact.js` no
carga, el navegador hace el POST y valida por su cuenta. De ahí salen tres
decisiones que parecen rarezas y no lo son:

- **`form.noValidate` se pone desde JS, nunca en el HTML.** Con el atributo
  `novalidate` escrito en el marcado, quien no tenga JavaScript mandaría campos
  vacíos a Web3Forms. Puesto desde JS: con JavaScript salen nuestros mensajes en
  español, sin él salen las burbujas del navegador. Las reglas viven en un solo
  lugar (los atributos) y no se duplican.
- **El campo del correo se llama `email`, no `correo`.** Web3Forms toma de ahí la
  dirección de respuesta *por el nombre del campo*. Con cualquier otro nombre, el
  asesor le daría «responder» y no le llegaría a quien escribió.
- **`fetch(form.action)`**, no una constante con la URL repetida. Una sola fuente
  de verdad, y para probar en local basta con apuntar el `action` a otro lado.

El campo oculto `redirect` es **solo** para el camino sin JavaScript: manda al
visitante a `/contacto/gracias/`. `contact.js` lo borra del payload AJAX, porque
si viaja, Web3Forms contesta una redirección en vez del JSON que esperamos. La
respuesta se juzga por el código HTTP: la documentación no garantiza la llave
`success`, así que exigirla rompería el día que dejen de mandarla.

**El selector de lote se llena con `loadLots()`**, el mismo módulo que alimenta el
mapa. Es a propósito: el KML es lo único que sabe cuáles lotes son públicos
—`lotes-data.json` trae 63 registros y 14 no tienen polígono—, y el formato del
nombre (`MZ 06 Lote 16`) ya vive ahí, así que reimplementarlo daría dos
ortografías del mismo lote en el mismo buzón. Cuesta **31 KB comprimidos**, es
asíncrono y ya viene en caché si el visitante llegó desde el mapa. Si esa carga
falla, el `<select>` se queda con su opción única y el formulario se envía igual:
el campo nunca es obligatorio.

Hay un enlace profundo listo, `/contacto/?lote=mz06L16`, que preselecciona el
lote. **Hoy nada del sitio lo genera** — la ficha del lote manda a WhatsApp a
propósito —, pero queda por si algún día se quiere cambiar eso.

> **Los inputs se apartan de DESIGN.md a propósito.** DESIGN.md pide campos con
> solo borde inferior; el único control tipo campo que ya estaba publicado (el
> disparador del filtro) es una caja completa de 1px sobre blanco. Se siguió el
> control publicado: un formulario con otro estilo leería como otro sitio. El
> texto que se escribe va además en caja normal a 13px y no en versalitas
> espaciadas como el resto de las etiquetas — un correo así es ilegible.

**Qué enlace va a dónde.** Es deliberado y conviene no «terminar el trabajo»:

| Enlace | Destino |
|---|---|
| *Contacto* del header (escritorio, menú móvil y botón blanco) | `/contacto/` |
| *Contacto* del pie | `/contacto/` |
| CTA de la hoja lateral del explorador | WhatsApp |
| *Contáctanos* de la ficha del lote (`#card-cta`) | WhatsApp, con el nombre del lote en el mensaje |
| Botón flotante | WhatsApp |

La lógica: el header y el pie son navegación del sitio; los CTA de en medio
aparecen cuando el visitante ya está viendo un lote concreto, y ahí WhatsApp
convierte mejor que un formulario. El menú móvil **sí** va al formulario aunque
esté "dentro" del header desplegable: es la navegación del header por debajo de
768px, y el botón blanco que lleva al formulario está oculto en ese ancho, así
que dejarlo en WhatsApp haría el formulario inalcanzable desde el header en un
teléfono.

### Datos

El mapa y el listado se construyen **desde el KML**: solo aparecen los 49 lotes
con geometría. Los 14 registros de `lotes-data.json` sin `Placemark`
(`mz01L01-03`, `mz03L01`, `mz04L05-06`, `mz07L02-03`, `mz08L01`, `mz09L01`,
`mz15L01`, `mz15L03-04`, `mz17L01`) no se muestran en ningún lado. Para
publicarlos hay que agregar su polígono al KML.

El `id` de cada `<Placemark>` es la llave que une ambos archivos
(p. ej. `mz06L16`).

`lots.js` resuelve las rutas de los dos archivos contra `import.meta.url`, no
contra el documento. Por eso `loadLots()` funciona igual desde la portada que
desde `/contacto/`, que vive un nivel más abajo: con rutas relativas al documento
el formulario habría pedido `/contacto/assets/predios-Tres-Marias.kml` y recibido
un 404.

### Video del hero

El video es el fondo del hero **siempre**: en todos los tamaños de pantalla y
**sin importar `prefers-reduced-motion`**. Es una decisión de producto: el hero
debe moverse. El póster solo cubre el instante previo a que decodifique el
primer cuadro.

`src` y `autoplay` están en el HTML, no los pone el JS — así el video arranca
sin esperar a que cargue el módulo. `hero.js` se encarga solo de dos cosas que
el HTML no puede expresar: pausar el video cuando el hero sale de la vista, y
reintentar la reproducción tras la primera interacción si el navegador rechazó
el autoplay (el Modo de bajo consumo de iOS lo bloquea aunque esté en mudo).

> **Ojo al revisar el sitio en Windows:** si *Configuración → Accesibilidad →
> Efectos visuales → Efectos de animación* está **desactivado**, Chrome reporta
> `prefers-reduced-motion: reduce`. Eso ya no afecta al video del hero, pero sí
> desactiva las demás transiciones del sitio (hoja móvil, dropdown de filtros,
> scroll suave). Es útil saberlo para no confundirlo con un bug.

Si algún día se quiere devolver el póster a quien pide movimiento reducido,
basta con salir temprano en `initHero()` cuando
`matchMedia('(prefers-reduced-motion: reduce)').matches` sea verdadero.

> **Al recomprimir, el archivo TIENE que quedar *faststart*.** Si el átomo
> `moov` queda al final, el navegador debe descargar el MP4 **completo** antes
> de mostrar un solo cuadro. Medido en este repo: con `moov` al final hacían
> falta los 17 MB; con faststart bastan ~0.56 MB.

```bash
# Comprobar dónde quedó el átomo moov (debe salir ANTES que mdat)
ffprobe -v trace -i assets/predios-overview.mp4 2>&1 | grep -E "type:'(moov|mdat)'"

# Arreglarlo sin recodificar (sin pérdida, mismo tamaño)
ffmpeg -i in.mp4 -c copy -movflags +faststart assets/predios-overview.mp4
```

El bitrate manda en la fluidez: el video debe ir **muy por debajo** del ancho de
banda del visitante, porque compite con Tailwind, las fuentes y la API de Maps
durante la carga inicial. Un fondo de hero atenuado al 50% no necesita más de
~1–1.5 Mbps.

```bash
# Recodificar a ~1.1 Mbps (1080p, sin audio, faststart)
ffmpeg -i entrada.mp4 -an -c:v libx264 -preset medium -crf 32 \
  -maxrate 1200k -bufsize 2400k -pix_fmt yuv420p \
  -movflags +faststart assets/predios-overview.mp4
```

### Regenerar el póster del hero

```bash
ffmpeg -y -ss 3 -i assets/predios-overview.mp4 -frames:v 1 -update 1 \
  -vf "scale=1600:-2" -q:v 6 assets/hero-poster.jpg
```
