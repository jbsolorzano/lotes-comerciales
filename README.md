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

  Además, falta que **un abogado valide el contenido completo**, y cuando exista
  el formulario de contacto (ver el punto siguiente) hay que enlazar el aviso
  **desde el formulario mismo**: ése es el momento en que la LFPDPPP exige
  ponerlo a la vista, no el pie de página.

- [ ] **Falta el endpoint del formulario de contacto.** No existe ningún
  `<form>` en el sitio: los enlaces *Contacto* del header y del pie apuntan a
  `href="#"`. Como no hay backend ni build, un formulario necesita un endpoint
  de terceros (Formspree, Netlify Forms, Google Forms) — o bien resolverse con
  WhatsApp, que es lo que ya hace la ficha del lote y no requiere infraestructura
  nueva. Decidir cuál antes de maquetar el formulario.

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

---

## Estructura

```
index.html              Portada: marcado + cargador de Google Maps
aviso-de-privacidad/
  index.html            Aviso de privacidad — la carpeta ES la ruta pública
assets/
  js/
    tailwind-config.js  Tokens de DESIGN.md; lo cargan las dos páginas
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
`/aviso-de-privacidad` (sin barra) recibe un 301 a la versión con barra. Para
agregar otra página legal basta con crear otra carpeta igual; no hay nada que
configurar.

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

### Datos

El mapa y el listado se construyen **desde el KML**: solo aparecen los 49 lotes
con geometría. Los 14 registros de `lotes-data.json` sin `Placemark`
(`mz01L01-03`, `mz03L01`, `mz04L05-06`, `mz07L02-03`, `mz08L01`, `mz09L01`,
`mz15L01`, `mz15L03-04`, `mz17L01`) no se muestran en ningún lado. Para
publicarlos hay que agregar su polígono al KML.

El `id` de cada `<Placemark>` es la llave que une ambos archivos
(p. ej. `mz06L16`).

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
