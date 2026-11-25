# Manual de operación: Distrito Zalce

Para quien administra el sitio desde la cuenta **ventas@distritozalce.com**.
Revisión del 25 de noviembre de 2026.

Este manual describe cómo funciona todo una vez terminada la Fase 2. Mientras
tanto, el botón para publicar lotes, el registro automático de leads y los
correos todavía no están activos.

## Lo que usas

| Herramienta | Para qué |
|---|---|
| Hoja «Distrito Zalce — Operación» | Cambiar estado y precio de los lotes, y dar seguimiento a los prospectos |
| Gmail de ventas@ | Aviso de cada prospecto, resumen diario y alertas |
| WhatsApp Business, en el teléfono de ventas | Los chats que llegan desde el sitio |

No necesitas tocar el sitio, el código ni ninguna configuración técnica.

## 1. Cambiar el estado o el precio de un lote

1. Abre la pestaña **Lotes**. Solo se editan las columnas en color arena:
   **estado**, **precio_m2** y **mostrar_precio**. Las demás están protegidas.
2. **estado:** elígelo de la lista.
    - DISPONIBLE: se puede vender.
    - NEGOCIACION: hay una oferta en curso.
    - VENDIDO: ya se vendió.
    - DESARROLLO HERSO: lo reserva Grupo Herso para un proyecto propio.
3. **precio_m2:** precio por metro cuadrado en pesos, sin signos ni comas (por
   ejemplo, `2500`). Déjalo vacío si el precio no se publica. El valor total se
   calcula solo.
4. **mostrar_precio:** marca la casilla para que el precio aparezca en el sitio.
   Si la casilla se pone **roja**, hay un problema: el lote no tiene precio, o
   está VENDIDO o es DESARROLLO HERSO, y esos nunca muestran precio.
5. Cuando termines **todos** tus cambios, abre el menú **Distrito Zalce → Ver
   cambios sin publicar** para revisarlos.
6. Luego elige **Distrito Zalce → Publicar cambios** y confirma.
7. El sitio se actualiza en unos 10 minutos. Te llega un correo con la lista de
   lo que cambió.

**Si aparece «No se publicó nada»:** la ventana dice qué fila corregir y por
qué. Corrígela y vuelve a publicar. Nada de lo que estaba mal llegó al sitio.

**Las filas con texto gris** son lotes que no tienen dibujo en el mapa. No
aparecen en el sitio aunque los cambies. Si uno de ellos debería verse, avisa a
soporte.

## 2. Atender un prospecto del formulario

1. Te llega un correo con el asunto «Nuevo lead DZ-2026-000123: Nombre». Si le
   das **responder**, le escribes directo al prospecto.
2. En la pestaña **Leads**, la fila del prospecto ya está creada. Tú solo llenas
   las columnas en color arena: **estado**, **responsable**,
   **proximo_seguimiento** y **notas**.
3. Avanza el **estado** conforme avance la venta:
    - Nuevo: acaba de llegar.
    - Contactado: ya le respondiste.
    - Calificado: tiene interés real y la posibilidad de comprar.
    - Visita: agendó o hizo una visita al predio.
    - Propuesta: recibió una propuesta formal.
    - Ganado: compró.
    - Perdido: no va a comprar.
    - Spam: no es un prospecto real.
4. Si eliges **Perdido**, llena también **motivo_perdida**. Si falta, la celda
   se pone roja.
5. Pon una fecha en **proximo_seguimiento** cuando quedes de volver a buscar al
   prospecto. Ese día aparecerá en tu resumen de la mañana.

No edites las columnas grises (fuente, campaña y datos técnicos). Las llena el
sistema, y sirven para saber qué anuncio trae prospectos.

## 3. Atender un WhatsApp

Los mensajes que salen del sitio terminan con un código, por ejemplo
**(Ref. DZ7K3Q)**.

1. Contesta el chat como siempre.
2. En **Leads**, en la primera fila vacía, llena **canal** = whatsapp,
   **nombre**, **telefono** y, en **ref_wa**, el código sin paréntesis (por
   ejemplo, `DZ7K3Q`).
3. Al escribir, el sistema le pone número de lead y fecha. Con el código, copia
   de qué anuncio vino el prospecto.
4. Si el mensaje no trae código, regístralo igual. Queda como WhatsApp sin
   campaña.

Registra de la misma forma a quien llame por teléfono (canal = telefono),
escriba al correo (canal = correo) o llegue en persona (canal = presencial).

## 4. Correos que vas a recibir

| Correo | Cuándo llega | Qué hacer |
|---|---|---|
| «Nuevo lead …» | Con cada formulario | Responder y actualizar la hoja |
| «Resumen del …» | 8:00, de lunes a sábado | Atender los seguimientos del día y los leads que siguen en Nuevo |
| «Lotes publicados» | Después de publicar | Confirmar que los cambios son los que querías |
| «7 días sin leads» | Si pasa una semana sin prospectos | Enviar una prueba con el formulario del sitio; si no llega, avisar a soporte |

Las alertas técnicas (sitio caído, errores al publicar) le llegan a soporte, no
a ti.

## 5. Lo que no se hace

- **No cambies los nombres de los encabezados** ni borres, muevas o renombres
  columnas o pestañas. El sistema las busca por su nombre.
- **No edites la pestaña Catálogos.** Si falta una opción en alguna lista,
  pídela a soporte. Un estado de lote nuevo también requiere un cambio en el
  sitio.
- **No compartas ni descargues la hoja**, y no copies datos de prospectos a otros
  archivos, chats personales o correos fuera de @distritozalce.com. Son datos
  personales protegidos por la ley.
- **No borres filas de Leads.** Para descartar un prospecto, usa el estado Spam o
  Perdido.

## 6. Si algo falla

| Si pasa esto | Haz esto |
|---|---|
| El sitio no abre | Avisa a soporte |
| Hay filas nuevas en Leads pero no te llegó el correo | Revisa la carpeta de spam y los filtros de Gmail. Si no está ahí, avisa a soporte |
| Publicar dice que hubo un error | No lo intentes varias veces seguidas. Avisa a soporte, que ya recibió la alerta |
| Un prospecto dice que el botón de WhatsApp no abre | Dale el número directo y avisa a soporte |
| Alguien pide ver, corregir o borrar sus datos personales | Reenvía su mensaje a **privacidaddedatos@grupoherso.com.mx**, que es el único canal para esas solicitudes. No borres nada por tu cuenta |

**Soporte técnico:** Bernardo.
