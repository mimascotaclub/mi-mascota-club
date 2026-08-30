# Mi Mascota Club — Contexto completo del proyecto

Este documento resume TODO lo construido hasta ahora, para que puedas pegarlo al inicio de una
conversación nueva (en otra cuenta de Claude, u otra IA como ChatGPT/Gemini) y que quien te ayude
entienda el proyecto sin que tengas que reexplicar todo desde cero.

## 0. Actualización 30 de agosto — Migración completa de infraestructura

Se migró TODA la infraestructura del proyecto, dejando cero rastro de la anterior. Motivo: la cuenta
de Netlify anterior se quedó sin minutos de build por el hábito de subir la carpeta completa a mano
("drag & drop") en cada cambio, en vez de usar control de versiones.

**Qué cambió:**
- **Control de versiones**: el proyecto ya NO se sube a mano. Ahora vive en un repositorio de GitHub:
  `https://github.com/mimascotaclub/mi-mascota-club` (rama `main`). Cada cambio se hace con
  `git add .` → `git commit -m "..."` → `git push`, y Netlify redespliega solo, en segundos (deploy
  incremental, gasta muchísimos menos minutos que el drag & drop).
- **Netlify**: cuenta nueva (conectada por GitHub, no por email suelto). Sitio en
  `https://mimascotaclub.netlify.app`. Auto-publish activado desde la rama `main`.
- **Supabase**: proyecto nuevo desde cero (el anterior, `ybnibsruzkgtuycgecun`, quedó abandonado —
  **ya no se usa, ignorar cualquier referencia vieja a esa URL**).
  - Nuevo Project ID: `mzsqyjxqnomsbqzhygkx`
  - Nueva URL: `https://mzsqyjxqnomsbqzhygkx.supabase.co`
  - Nueva publishable key: `sb_publishable_KdIYZfFtnfO2e7VaMMfWAA_GBT79hZ1`
  - Región: South America (São Paulo)
  - Se re-ejecutaron en orden, en una base 100% limpia: `supabase-schema.sql` → `v3` → `v4` → `v5` →
    `v6` → `v7` → `v8` → `v9` → `supabase-fix-permisos.sql`. Todo verificado con éxito paso a paso.
  - **`supabase-fix-foto.sql` NO se ejecutó** — se detectó que recrea `actualizar_ficha` con la firma
    vieja de 11 parámetros (incluye nombre/RUT/teléfono del representante), que choca con la versión
    de 4-5 parámetros que dejó `v3` por motivos de privacidad. Si en el sitio migrado falla la opción
    de "quitar foto" de la mascota, revisar cuál firma llama realmente `js/app.js` antes de correr
    ese parche — puede que ya no aplique al diseño actual.
  - Se recreó el usuario administrador en Authentication → Users con el mismo correo
    (`holamimascotaclub@gmail.com`) y una contraseña nueva (el usuario la tiene guardada).
- **Código actualizado**: `js/app.js` e `index-combinado.html` ya apuntan a las credenciales nuevas
  de Supabase (URL y publishable key de arriba). Cambio subido a GitHub y ya en producción.
- **Todos los datos del Supabase anterior se perdieron a propósito** (se decidió partir de cero en
  vez de migrar datos existentes) — la base nueva está vacía, lista para registros reales.

## 1. Qué es el proyecto

"Mi Mascota Club" es un club de beneficios para dueños de mascotas en Chile (piloto en Santiago).
Conecta negocios (veterinarias, peluquerías, pero también barberías, cafés, etc. — beneficios para
el DUEÑO, no solo la mascota) con dueños de mascotas socios. Los negocios validan visitas de socios
con un código, y el club genera datos de ROI (cuántos clientes trajo, cuánto gastaron) para poder
mostrarle a los negocios el valor real de estar en el club.

## 2. Arquitectura técnica (ya funcionando en producción)

- **Frontend**: HTML + CSS + JavaScript vanilla (sin frameworks), un solo archivo `index.html` que
  referencia `css/styles.css` y `js/app.js`.
- **Hosting**: Netlify (gratis), conectado a GitHub — deploys automáticos con cada `git push` a
  `main` (ya no se sube a mano). Sitio publicado en `https://mimascotaclub.netlify.app`.
- **Control de versiones**: GitHub, repo `https://github.com/mimascotaclub/mi-mascota-club`, rama
  `main`. Flujo: `git add .` → `git commit -m "..."` → `git push`.
- **Base de datos**: Supabase (Postgres), proyecto recreado el 30 de agosto (ver sección 0).
  URL: `https://mzsqyjxqnomsbqzhygkx.supabase.co`
  Clave pública (publishable key, segura de exponer en el navegador): `sb_publishable_KdIYZfFtnfO2e7VaMMfWAA_GBT79hZ1`
- **Seguridad**: Row Level Security (RLS) activado. Los datos sensibles de socios (RUT, teléfono,
  email) NUNCA se leen directo desde el navegador — solo mediante funciones controladas (RPC) o el
  panel de administrador con login real (Supabase Auth).
- **Panel privado**: en la sección "Panel" del sitio, requiere email + contraseña reales (no una
  clave escondida). El usuario ya creó su cuenta admin en Supabase → Authentication → Users.
- **Correo de bienvenida**: EmailJS (gratis, conectado a Gmail, sin backend propio).
  - Service ID: `service_ch7ncxl`
  - Template ID: `template_u9x5p1i`
  - Public Key: `9eL8mW9_T5HjOEAYe`
  - La plantilla HTML del correo vive en `email-template.html` (con header oscuro, logo blanco, y
    footer con colores de marca) y ya está pegada en EmailJS.
- **Mapa**: Leaflet + OpenStreetMap (gratis, sin API key ni tarjeta). Ubica cada negocio en el
  centro aproximado de su comuna (no se pide dirección exacta geocodificada todavía).
- **Rutas del directorio**: el directorio (`/directorio`, `/directorio/veterinaria`, etc.) no es un
  archivo HTML aparte — sigue siendo el mismo `index.html` de siempre, con un router simple en
  `js/app.js` que cambia la URL con `history.pushState()`. El archivo `_redirects` (en la raíz del
  proyecto, se sube a Netlify junto con `index.html`) es lo que hace que esas URLs funcionen al
  entrar directo o refrescar. Ver sección 15 para el detalle completo.

## 3. Identidad de marca

- Colores: amarillo `#FFCE00`, turquesa `#47C9C9`, negro `#151515`, blanco.
- Tipografía: **Lato** (Google Fonts).
- Logo: ícono de pata+casa. Existen versión a color (`assets/logo.svg`) y versión blanca para fondos
  oscuros (`assets/logo-blanco.svg`).

## 4. Cómo aplicar cambios (flujo de trabajo)

1. El código fuente vive separado en carpetas: `index.html`, `css/styles.css`, `js/app.js`.
2. Cuando se genera la versión "para compartir como artifact de Claude", se combinan estos 3
   archivos en un solo HTML (con `<style>` y `<script>` inline) y los logos se convierten a
   data-URI base64. Ese archivo combinado es el que se sube a Netlify.
3. Los cambios de base de datos van en archivos `supabase-fix-vX.sql` — cada uno se pega una sola
   vez en el SQL Editor de Supabase y se ejecuta.

## 5. Parches SQL — orden de ejecución si empiezas desde cero

Si el Supabase ya está configurado (lo más probable), estos ya se ejecutaron en orden:
1. `supabase-schema.sql` — crea las tablas base (negocios, socios, canjes) y las funciones RPC.
2. `supabase-fix-foto.sql` — permite borrar explícitamente la foto de una mascota.
3. `supabase-fix-permisos.sql` — otorga permisos SELECT que faltaban (bug de "Automatically expose
   new tables" desactivado).
4. `supabase-fix-v3.sql` — agrega beneficio de negocio (tipo/detalle) y separa la privacidad de la
   ficha del socio (RUT/teléfono ya no se leen por código público).
5. `supabase-fix-v4.sql` — agrega campos extendidos de negocio (logo, dirección, horario, redes,
   descripción, verificado).
6. `supabase-fix-v5.sql` — fusiona todos los
   campos de la ficha (foto, documentos, notas médicas / logo, dirección, horario, redes) para que
   se guarden en el registro inicial en un solo paso, sin secciones separadas de "completar ficha".
7. `supabase-fix-v6.sql` — separa el correo y teléfono de negocio en columnas propias (`email`,
   `telefono`) en vez de un solo texto combinado `contacto`.
8. `supabase-fix-v7.sql` — agrega la columna `plan` (`'free' | 'pro' | 'premium'`, default `'free'`)
   a la tabla `socios`, para el badge de membresía del carnet (ver secciones 13 y 14).
9. `supabase-fix-v8.sql` — agrega las columnas `destacado` y `es_especialista` a la tabla `negocios`,
   y reemplaza `registrar_negocio()` para que reciba el parámetro nuevo `p_es_especialista` (ver
   sección 16).
10. `supabase-fix-v9.sql` — **el más reciente, probablemente AÚN NO EJECUTADO** — agrega la columna
    `plan` a `negocios`, crea la tabla `validaciones` y todas las funciones RPC del sistema de
    calificaciones mutuas (ver sección 17).

## 6. Qué se estaba haciendo en el momento de pausar (16 de agosto)

El usuario pidió, en una sola tanda de cambios:
1. ✅ Arreglar el menú móvil (la barra `sticky` se hacía enorme y tapaba contenido cuando el botón
   "Quiero unirme al club" no cabía en una línea) — **ya corregido en el CSS**.
2. ✅ Rediseñar las tarjetas de planes con un estilo tipo "pricing table" (tarjeta del medio
   destacada con fondo sólido, checks en círculos, botón redondeado) — **ya aplicado**, incluyendo
   los planes de negocio actualizados (Presencia $0 / Destacado $14.990 / Premium $29.990) según
   documento que el usuario compartió.
3. ✅ Renombrar "Negocios fundadores del club" → "✓ Negocios verificados" — **ya aplicado**.
4. ✅ Corregir sombra cortada de las tarjetas del carrusel del hero — **ya aplicado**.
5. ✅ **Fusionar las fichas de mascota y negocio directamente en el formulario de registro inicial**
   — HTML y JS confirmados consistentes con `registrar_socio`/`registrar_negocio` de
   `supabase-fix-v5.sql` (columnas ya existían desde v3/v4, el parche v5 solo reemplaza las funciones).
6. ✅ **Íconos de contacto circulares en las tarjetas del directorio** — `bizContactIcons(n)` en
   `js/app.js` arma solo los íconos según lo que el negocio completó: WhatsApp o correo (primario),
   Instagram/sitio web, dirección (Google Maps) y horario.
7. 🔶 **Pendiente por hacer el usuario (requiere acceso a su cuenta, no disponible para la IA)**:
   - Pegar y ejecutar `supabase-fix-v5.sql` en el SQL Editor de Supabase.
   - Subir `index-combinado.html` (renombrado a `index.html`) al mismo "site" de Netlify (drag & drop).
   - Probar de punta a punta en el sitio publicado.

## 9. Rediseño del flujo de entrada (16 de agosto, segunda tanda)

El usuario pidió, en una sola tanda de cambios:
1. ✅ **Tarjetas del carrusel del hero (fan-carousel) clicables** — cada tarjeta lleva directo al
   directorio filtrado por esa categoría (`filtrarPorCategoria`).
2. ✅ **Marquesina de "Negocios verificados" clicable** — clic en un negocio real lleva al directorio
   con el buscador ya escrito con su nombre (`filtrarPorNegocio`, función nueva); clic en un
   placeholder "+ Tu negocio aquí" abre el selector de camino.
3. ✅ **Nuevo flujo de registro en dos pasos** — los dos formularios directos ya NO son visibles de
   entrada (`#negocios` con `display:none`). El botón "Quiero unirme al club" (nav) y los "+ Tu
   negocio aquí" abren un modal (`abrirElegirCamino()`) con dos botones: "🏪 Soy un negocio" / "🐾
   Quiero registrar mi mascota". Elegir uno llama a `mostrarFormulario('negocio'|'dueno')`, que
   revela solo el panel correspondiente (una sola columna, clase CSS `.split.single`). El nav "Mi
   Mascota" y los botones de Planes también llaman a `mostrarFormulario(...)`. El correo de
   bienvenida sigue disparándose al enviar cada formulario, sin cambios ahí.
4. ✅ **"Validar visita" y "Panel privado" ocultos** — `display:none` por defecto, accesibles solo
   desde dos links nuevos en el footer que llaman a `mostrarSeccion(id)`.
5. 🐛 **BUG encontrado y corregido en la misma tanda**: las 4 funciones nuevas (`abrirElegirCamino`,
   `mostrarFormulario`, `mostrarSeccion`, `filtrarPorNegocio`) no estaban en el bloque de exports al
   final de `js/app.js` (`window.xxx = xxx`) — como el script corre dentro de un IIFE, los `onclick`
   del HTML (que ejecutan en scope global) no encontraban esas funciones y no pasaba nada al hacer
   clic. Ya están agregadas al bloque de exports. **Lección para el futuro**: cualquier función nueva
   que el HTML llame por `onclick`/`oninput`/`onchange` DEBE agregarse a ese bloque al final de
   `js/app.js`, o si no, no funcionará en el navegador aunque el código esté bien escrito.
6. 🔶 **Pendiente**: subir el `index-combinado.html` regenerado (con el fix del bug) a Netlify y
   probar en el sitio publicado.

## 10. Corrección de "vista movida" en mobile (16 de agosto, tercera tanda)

El usuario reportó capturas de pantalla en celular donde el diseño se veía "movido": la tarjeta
(carnet) de la mascota aparecía cortada por el lado derecho ("Socio fundador", "MMC00000" y
"ESTADO / Activo" no se alcanzaban a ver), y las tarjetas de precios (planes) aparecían dos a la
vez, cada una mostrando solo una mitad.

**Causa raíz encontrada (dos bugs distintos en `css/styles.css`):**
1. `.credencial` (el carnet negro) tenía un ancho fijo `width:340px` que no se achicaba en pantallas
   angostas. Como estaba dentro de contenedores `flex`/`grid` sin `min-width:0`, en vez de recortarse
   forzaba a TODA la página a ser más ancha que la pantalla del celular, lo que hace que el navegador
   móvil renderice todo "alejado"/desplazado — el efecto exacto de "se ve movido".
2. `.pricing-grid` (las tarjetas de planes) nunca cambiaba de 3 columnas a 1 en mobile. La regla que
   debía apilarlas estaba en el primer bloque `@media (max-width:880px)` del archivo, pero ese bloque
   aparece ANTES de donde se define `.pricing-grid` más abajo en el CSS — en la cascada, la regla que
   aparece después gana cuando la especificidad es igual, así que la definición de 3 columnas
   (posterior) le ganaba a la de 1 columna (anterior), sin importar el tamaño de pantalla.

**Arreglos aplicados en `css/styles.css`:**
- `html, body` ahora tienen `overflow-x:hidden` como red de seguridad general contra este tipo de
  desbordes horizontales.
- `.credencial` pasó a `width:100%; max-width:340px;` (se achica en pantallas angostas en vez de
  desbordar) y se agregó `min-width:0` a `.card-stage` y a los hijos directos de `.hero-grid`.
- `.dir-grid` bajó su ancho mínimo de tarjeta de `270px` a `240px` (margen extra para celulares muy
  angostos, <330px).
- La regla que apila `.pricing-grid` a 1 columna y resetea el `transform:scale()` de la tarjeta
  destacada en mobile se movió al SEGUNDO bloque `@media (max-width:880px)` (al final del archivo,
  después de la definición de `.pricing-grid`), para que sí gane la cascada.
- `index-combinado.html` fue regenerado desde `index.html` + `css/styles.css` + `js/app.js` con estos
  cambios ya incluidos (el `<style>` embebido se reconstruyó completo; el `<script>` con `js/app.js`
  no cambió).

**Verificación realizada:** se probó `index-combinado.html` con Playwright en un viewport de 375px de
ancho (iPhone SE / mobile chico). Se confirmó que `document.documentElement.scrollWidth` quedó igual
a `clientWidth` (sin scroll horizontal) en toda la página, incluida la sección de planes y el
formulario de registro de mascota con el carnet en vivo. Se revisó visualmente con capturas: el
carnet ya se ve completo (incluida la etiqueta "Socio fundador" y la fila COMUNA/ESTADO), y las 3
tarjetas de planes se apilan una debajo de otra en vez de mostrarse cortadas a la mitad.

**Nota:** en el entorno de pruebas no hay acceso a internet, así que los scripts externos (Supabase,
QR, Leaflet, EmailJS, Google Fonts) no cargaron durante la prueba — eso es normal ahí y no afecta el
sitio real en Netlify, que sí tiene internet. La prueba se hizo intencionalmente sobre el HTML/CSS
puro (que es donde estaba el bug), revelando manualmente por JS el panel de registro para poder
verlo sin depender de esos scripts.

**Pendiente:** subir este `index-combinado.html` (renombrado a `index.html`) al sitio de Netlify y
volver a probar en el sitio publicado real, con conexión a internet, para confirmar que Supabase,
el QR, el mapa y el correo de bienvenida siguen funcionando igual que antes (el JS no se tocó).

## 11. Formularios en 3 pasos + validación estricta en vivo (16 de agosto, cuarta tanda)

El usuario pidió, en una sola tanda de cambios, sobre los dos formularios de registro (`bizForm` y
`ownerForm`):

1. ✅ **Reordenar los campos por bloques.** En dueños: primero "Datos de tu mascota", después "Tus
   datos". En negocios: primero "Datos de tu negocio", después "Tus datos" (contacto).
2. ✅ **Convertir ambos formularios en un wizard de 3 pasos**, inspirado en capturas que el usuario
   compartió de otro sitio (indicador de pasos con círculos conectados por líneas arriba del
   formulario). Implementado con `.wizard-steps` / `.wizard-step` / `.form-step` en el HTML y
   `wizardNext(prefix)` / `wizardBack(prefix)` / `wizardReset(prefix)` / `wizardRender(prefix)` en
   `js/app.js` (`prefix` es `'owner'` o `'biz'`).
   - Dueños: 1) Tu mascota → 2) Tus datos → 3) Crear ficha (foto/documentos/notas + botón final
     "Crear carnet y unirme gratis").
   - Negocios: 1) Tu negocio → 2) Tus datos (contacto) → 3) Beneficio + botón final "Quiero ser
     negocio fundador".
   - El paso 3 es el que realmente envía el formulario (`type="submit"`); los pasos 1 y 2 avanzan
     con botones `type="button"` que llaman a `wizardNext()`, y este NO avanza si el paso actual
     tiene campos requeridos vacíos o inválidos (`wizardValidarPaso`) — evita saltarse pasos con
     datos incompletos.
   - `mostrarFormulario(tipo)` ahora también llama a `wizardReset('owner')` y `wizardReset('biz')`
     para que el wizard siempre empiece en el paso 1 al abrir la sección.
3. ✅ **Validación estricta y formato único y automático para RUT, teléfono y correo** — antes
   cualquier texto se guardaba tal cual, ahora:
   - **Teléfono**: el input solo permite escribir los 8 dígitos del celular; el prefijo `+56 9`
     queda fijo a la izquierda del campo (no editable), así es imposible escribirlo de dos formas
     distintas. Se autoformatea en grupos de 4 mientras se escribe (`formatearTelefonoInput`) y se
     valida que sean exactamente 8 dígitos (`validarTelefonoParcial`). Al guardar, se arma el
     teléfono completo con `telefonoCompleto()` → siempre `+56 9 XXXX XXXX`.
   - **RUT**: se autoformatea con puntos de miles y guion mientras se escribe (`formatearRut`) y se
     valida el dígito verificador real con el algoritmo módulo 11 (`validarRut`) — un RUT con el DV
     incorrecto queda marcado inválido aunque tenga el formato correcto.
   - **Correo**: validación de formato en vivo (`validarEmail`).
   - En los tres casos, apenas el valor queda válido se agrega la clase `is-valid` al contenedor
     `.field-validated` → aparece un ícono de check verde a la derecha del campo y el borde se pone
     verde (ver `.field-check` / `.field-validated.is-valid` en `css/styles.css`). Si queda inválido,
     se agrega `is-invalid` (borde rojo + mensaje de error debajo, en `.field-msg`).
   - `ownerRepRut` y `ownerRepTelefono` pasaron a ser **obligatorios** (`required`) — antes eran
     opcionales; ahora, como identifican al dueño ante el negocio, se exige que estén completos y
     validados antes de poder pasar del paso 2.
4. ✅ **Negocios: contacto separado en dos campos** — `bizContact` (un solo input combinado) se
   reemplazó por `bizTelefono` (con el mismo formato estricto `+56 9 XXXX XXXX`) y `bizEmail` (con
   validación de formato), ambos obligatorios y en el paso 2 ("Tus datos de contacto").
   - **Importante — no se tocó la base de datos**: la tabla `negocios` sigue teniendo una sola
     columna `contacto` (texto). El frontend arma ese texto combinando los dos campos nuevos, ej.
     `"negocio@correo.com · +56 9 1234 5678"`, antes de llamar a `registrar_negocio`. Si en el
     futuro se quiere guardar el correo y el teléfono en columnas separadas de verdad, hace falta un
     nuevo parche SQL (`p_email`, `p_telefono` en vez de `p_contacto`) — no incluido en esta tanda.
   - `bizContactIcons()` en `js/app.js` se actualizó para leer ese texto combinado y mostrar **ambos**
     íconos (WhatsApp y correo) en la tarjeta del directorio cuando ambos datos existen, en vez de
     solo uno como antes.
   - El correo de bienvenida al negocio ahora usa `bizEmailVal` directo (el campo de correo dedicado)
     en vez de intentar adivinar si el contacto combinado tenía un `@`.
5. 🔶 **Pendiente por el usuario**: `index-combinado.html` (el archivo que se sube a Netlify) quedó
   **desactualizado** — todavía tiene el formulario viejo de un solo paso con `bizContact`. Antes de
   volver a subir a Netlify hay que regenerarlo combinando los `index.html` + `css/styles.css` +
   `js/app.js` actuales (ver sección 4, "Cómo aplicar cambios").

## 12. Parche v6 — correo y teléfono de negocio en columnas separadas de verdad (16 de agosto, quinta tanda)

Después de la tanda anterior, el usuario pidió separar de verdad en la base de datos el contacto de
negocio (antes solo se separaba en el formulario, pero se seguía guardando combinado en una sola
columna `contacto`). Se creó `supabase-fix-v6.sql`:

- Agrega dos columnas a `negocios`: `email` y `telefono`.
- La columna vieja `contacto` se mantiene (deja de ser `not null`) para no romper negocios ya
  registrados antes del parche, y la función la sigue llenando automáticamente como
  `"correo · teléfono"` — solo como respaldo, ya no es la fuente de verdad.
- Reemplaza `registrar_negocio(...)`: ahora recibe `p_email` y `p_telefono` en vez de `p_contacto`
  (pasa de 13 a 14 parámetros).

**Cambios en el frontend que van de la mano de este parche** (ya aplicados en `js/app.js`):
- El submit de `bizForm` llama a `registrar_negocio` con `p_email`/`p_telefono` en vez de `p_contacto`.
- La ficha de confirmación tras registrarse muestra "Correo" y "Teléfono" como filas separadas (antes
  una sola fila "Contacto").
- `bizContactIcons()` ahora lee `n.email` / `n.telefono` directo de las columnas nuevas (con
  respaldo: si un negocio viejo no las tiene, sigue extrayéndolas del `contacto` combinado con
  regex, para no perder los íconos de negocios registrados antes de este parche).

**⚠️ ORDEN DE DESPLIEGUE — MUY IMPORTANTE**: el `js/app.js` de este zip llama a la nueva firma de
`registrar_negocio` (con `p_email`/`p_telefono`). Si se sube el sitio a Netlify **antes** de correr
`supabase-fix-v6.sql` en Supabase, el registro de negocios se rompe (la función en la base de datos
todavía espera el `p_contacto` viejo). Orden correcto:
1. Pegar y ejecutar `supabase-fix-v6.sql` en el SQL Editor de Supabase.
2. Recién ahí regenerar `index-combinado.html` y subirlo a Netlify.

## 13. Plan de membresía, selector Región→Comuna, buscador funcional y validación estricta de
    teléfono/correo (16 de agosto, sexta tanda)

El usuario pidió, en una sola tanda de cambios:

1. ✅ **Quitar "Socio fundador" del carnet de mascota y mostrar el plan de membresía del dueño en su
   lugar** (Free / Pro / Premium — ya se conectará a una pasarela de pago y estados de suscripción en
   vivo más adelante, por ahora solo la parte visual).
   - `PLAN_LABELS` y `planLabel(plan)` nuevos en `js/app.js`: `free`→"Miembro Free",
     `pro`→"Miembro Pro", `premium`→"Miembro Premium".
   - El badge del carnet (vista previa en `index.html` y el modal de confirmación en `js/app.js`)
     ahora muestra "Miembro Free" en vez de "Socio fundador" — todo registro nuevo queda en plan
     `free` mientras no exista pasarela de pago.
   - Nueva columna `plan` en la tabla `socios` (`supabase-fix-v7.sql`, ver sección 14), con
     `default 'free'` y un `check` que solo permite `'free' | 'pro' | 'premium'`.
   - El panel privado (admin) ahora muestra el plan de cada socio junto a su mascota en la tabla de
     dueños, leyendo `o.plan` (con respaldo a "Miembro Free" si la columna todavía no existe en la
     base de datos, para que no rompa nada si se sube el sitio antes de correr el parche SQL).
   - **Pendiente para más adelante (fuera de esta tanda, tal como pidió el usuario)**: conectar una
     pasarela de pago (MercadoPago/Flow) que actualice esta columna `plan` en vivo según el estado
     real de la suscripción.
2. ✅ **Selector de ubicación en cascada Región → Comuna** en ambos formularios de registro (dueños y
   negocios), con las 346 comunas reales de las 16 regiones de Chile.
   - Nuevo dataset `CHILE_REGIONES` en `js/app.js` (16 regiones, cada una con su lista de comunas).
   - Funciones nuevas: `poblarRegiones(selectId)` llena un `<select>` con las 16 regiones;
     `poblarComunas(regionSelectId, comunaSelectId)` llena el `<select>` de comunas según la región
     elegida (se llama automáticamente con el `onchange` del select de región); `resetRegionComuna
     (prefix)` deja el selector de un formulario ('owner' o 'biz') en su estado inicial.
   - **La Región Metropolitana de Santiago queda preseleccionada por defecto** en ambos formularios
     (piloto en Santiago), con sus 52 comunas ya cargadas — el usuario puede cambiar de región si
     vive en otra parte de Chile.
   - En `index.html`: `bizComuna` y `ownerComuna` dejaron de ser un `<input>` de texto libre y ahora
     son un `<select>` (`required`), precedido por el nuevo `<select>` de región (`bizRegion` /
     `ownerRegion`). El campo de dirección de negocio (`bizDireccion`, ya existía) queda justo debajo,
     sin cambios. **No se agregó un campo de dirección para el dueño** — no se pidió explícitamente y
     hoy no hay ningún servicio que lo necesite (delivery, etc.); si se necesita más adelante, es un
     cambio simple (nuevo campo + columna en `socios` + parámetro en `registrar_socio`).
   - Al enviar cualquiera de los dos formularios, `resetRegionComuna('owner')` /
     `resetRegionComuna('biz')` se llama después de `this.reset()` para volver a dejar la Región
     Metropolitana preseleccionada (si no, el `reset()` nativo del navegador deja los `<select>` en
     su primera opción vacía, ya que las opciones se agregan por JavaScript y no tienen el atributo
     `selected` en el HTML).
   - No fue necesario tocar `registrar_socio` ni `registrar_negocio` — ambas funciones ya recibían
     `p_comuna` como texto plano, y el `<select>` sigue enviando el nombre de la comuna como texto.
3. ✅ **Buscador principal del hero (el que dice "Explorar") ahora funciona de verdad.**
   - Antes: el `<input>` tenía `readonly` y solo redirigía a la sección del directorio sin usar lo
     que el usuario había escrito (de hecho no se podía escribir nada). Se quitó `readonly` y los
     manejadores `onfocus`/`onclick` que interceptaban el clic.
   - Ahora: se puede escribir libremente; al presionar Enter o el botón "Explorar" (`irABuscar()`),
     el texto se copia al buscador del directorio (`dirSearch`), se limpian los demás filtros
     (categoría/comuna/tipo), se hace scroll a la sección del directorio y se muestran los
     resultados ya filtrados.
   - `renderDirectory()` también se hizo más flexible: antes solo comparaba el texto exacto contra el
     nombre del negocio. Ahora ignora palabras genéricas del español ("necesito", "quiero", "un",
     "una", etc. — lista en `BUSQUEDA_STOPWORDS`) y compara las palabras restantes contra nombre,
     categoría, comuna, descripción corta (`meta`) y especialidad (`servicios`) del negocio — así
     "Necesito un paseador" encuentra los negocios de categoría "Paseador" aunque ninguno se llame
     literalmente así.
4. ✅ **Validación de teléfono y correo corregida — antes aceptaba datos obviamente falsos.**
   - **Teléfono**: `validarTelefonoParcial` solo exigía 8 dígitos, así que `0000 0000` o `1111 1111`
     pasaban como "Número válido". Ahora además exige que el primer dígito no sea `0` (los celulares
     chilenos no empiezan con 0 después de `+56 9`) y rechaza los 8 dígitos repetidos
     (`0000 0000`, `1111 1111`, etc.).
   - **Correo**: `validarEmail` con una regex muy permisiva marcaba como válido cualquier cosa con
     forma `algo@algo.algo`, incluyendo entradas de prueba como `0000000000@gmail.com`. Se endureció
     la regex (dominio y extensión con formato correcto, sin puntos dobles ni al inicio/final) y se
     agregó un rechazo específico para la parte antes de la `@` cuando es el mismo dígito repetido 4
     o más veces seguidas (ej. `0000000000@gmail.com`, `1111@hotmail.com`).
   - **Número de teléfono de ejemplo (placeholder) actualizado**: antes decía `5059 1447`, ahora dice
     `1234 5678` en ambos formularios (dueños y negocios).
5. 🔶 **Pendiente por el usuario** (ambos explícitamente pospuestos por el usuario para más adelante,
   no se tocó nada de esto en esta tanda):
   - **QR del carnet**: hoy el QR solo muestra el código del socio como texto/imagen, pero no está
     conectado a ninguna validación real. Falta decidir el mecanismo para que el negocio pueda
     escanear el QR y ver al instante si el socio está activo (probablemente una vista pública tipo
     `.../validar?codigo=MMC00001` que llame a una función RPC de solo lectura, o integrarlo directo
     al flujo de "Validar visita" que ya existe).
   - **Pasarela de pago** (MercadoPago o Flow) para que los planes Free/Pro/Premium (socios) y
     Presencia/Destacado/Premium (negocios) se cobren de verdad y actualicen el estado de suscripción
     en vivo — sigue sin construir, ver sección 7.
6. 🔶 **Pendiente por el usuario (acceso a sus cuentas)**:
   - Pegar y ejecutar `supabase-fix-v7.sql` en el SQL Editor de Supabase (ver sección 14 para el
     detalle y el orden completo de despliegue).
   - Subir el `index-combinado.html` ya regenerado (con todos los cambios de esta tanda) al sitio de
     Netlify.

## 15. Directorio como página propia + correcciones de correo, plan y beneficios (17 de agosto, séptima tanda)

El usuario pidió, en una sola tanda de cambios (todo **solo frontend**, no se tocó ninguna tabla ni
función de Supabase — no hay ningún `supabase-fix-vX.sql` nuevo en esta tanda):

1. ✅ **Corregido el correo que se marcaba como "válido" sin serlo.** `validarEmail` en `js/app.js`
   ya rechazaba una parte antes del `@` hecha del mismo **dígito** repetido (ej.
   `0000000000@gmail.com`), pero un correo como `KKKKKK@GMAIL.COM` (la misma **letra** repetida)
   seguía pasando como válido. Ahora:
   - Rechaza cualquier carácter (letra o número) repetido 4+ veces seguidas antes del `@`
     (`kkkkkk@gmail.com`, `aaaa@hotmail.com`, `1111@gmail.com`, etc.).
   - Rechaza secuencias de teclado obvias como `asdf@...`, `qwerty@...`, `1234@...`.
   - Exige que la parte antes del `@` tenga al menos 2 caracteres alfanuméricos reales.
   - No se tocó la validación de RUT ni de teléfono, que ya eran estrictas desde la tanda anterior.
2. ✅ **Quitado el "Socio fundador" que seguía apareciendo en la tarjeta para compartir en
   Instagram.** El texto "Miembro Free/Pro/Premium" (`planLabel()`) ya se había aplicado en la
   vista previa del carnet y en el modal de confirmación (tanda 13), pero la función que dibuja la
   **imagen PNG para compartir** (`generateShareCardBlob`, la que genera el archivo que se comparte
   o descarga) todavía tenía el texto "🐾 SOCIO FUNDADOR" escrito directo en el canvas. Ahora usa
   `planLabel(record.plan)` igual que el resto del carnet, y el mensaje que acompaña al compartir
   (`"¡Firulais ya es socio fundador..."`) se cambió a `"¡Firulais ya es parte de Mi Mascota
   Club!"` — ya no asume que todos son fundadores. El registro de un dueño nuevo arma su `record`
   con `plan: 'free'` (todo registro nuevo queda en plan Free hasta que exista pasarela de pago,
   igual que antes).
3. ✅ **Menú desplegable "Beneficios" del nav ahora es clicable.** Antes cada fila (ej. "20% ·
   Veterinaria Carmen") era un simple `<div>` sin acción — no pasaba nada al hacer clic. Ahora cada
   fila es un botón real que llama a `filtrarPorNegocio(nombre)` (ya existía desde la tanda 9) y
   cierra el menú — lleva directo a la ficha de ese negocio en el directorio, con el buscador ya
   escrito con su nombre.
4. ✅ **El directorio pasó a ser una página propia, con su propia URL — ya no es "más abajo" en el
   home.** Este fue el cambio más grande de la tanda:
   - **Antes**: el directorio era una sección más de `index.html` (`id="directorio"`); "explorar",
     las categorías y los negocios simplemente hacían `scrollIntoView()` hasta ahí. Se sentía como
     desplazarse en la misma página, no como entrar a otra parte del sitio.
   - **Ahora**: se agregó un router muy simple en `js/app.js` (sin librerías — el sitio sigue siendo
     HTML/CSS/JS vanilla) que usa `history.pushState()` para cambiar la URL de verdad:
     - `irADirectorio({cat, tipo, comuna, q})` (nueva función) arma la URL — ej.
       `/directorio/veterinaria` si hay categoría, o `/directorio` a secas si es una búsqueda
       libre — la empuja al historial del navegador, y muestra la vista del directorio.
     - `filtrarPorCategoria`, `filtrarPorNegocio` (las tarjetas de categoría, el carrusel del hero,
       la marquesina de negocios verificados, el menú Beneficios) y `irABuscar` (el buscador
       "Explorar" del hero) ahora llaman a `irADirectorio(...)` en vez de hacer scroll.
     - `mostrarPaginaDirectorio(opts)` aplica los filtros y muestra la sección `#directorio` a
       pantalla completa.
     - `manejarRutaActual()` lee la URL actual (`location.pathname`) y decide qué mostrar — se
       llama al cargar la página (por si alguien entra directo a `/directorio/algo`) y en el evento
       `popstate` (para que "atrás"/"adelante" del navegador funcionen bien).
     - Cada categoría tiene su propio "slug" en la URL (`DIR_CATS_INDEX` + `slugify()`), ej.
       "Veterinaria" → `veterinaria`, "Peluquería" → `peluqueria`. **Nota/limitación conocida**: la
       categoría "Tienda" existe tanto para mascota como para dueño con el mismo nombre — si algún
       día se navega por URL directa a `/directorio/tienda` sin pasar por un clic (que sí sabe de
       cuál se trata), el router toma la primera coincidencia (la de mascota). No afecta el uso
       normal (clicar en el sitio), solo compartir una URL exacta de esa categoría en particular.
   - **El directorio queda oculto del home** (`#directorio{ display:none; }` por defecto en
     `css/styles.css`) y solo se muestra —a pantalla completa, con el resto del home (hero,
     categorías, cómo funciona, planes) ocultos— cuando el body tiene la clase `.pagina-directorio`,
     que el router agrega/quita según la URL.
   - Se agregó un botón **"← Volver al inicio"** arriba del directorio (llama a `volverAlInicio()`),
     y `mostrarFormulario()` / `mostrarSeccion()` ahora salen de la vista del directorio
     automáticamente antes de mostrar un formulario o el panel/validar, para que no queden
     mezclados.
   - **Se creó `_redirects`** (archivo nuevo en la raíz del proyecto, se sube junto con
     `index.html` a Netlify) con la regla `/directorio/* /index.html 200` — sin este archivo,
     entrar directo a una URL como `https://tu-sitio.netlify.app/directorio/veterinaria` (o
     refrescar la página estando ahí) daría un error 404 en Netlify, porque no existe
     físicamente una carpeta `/directorio` — el archivo le dice a Netlify que sirva igual
     `index.html`, y el JavaScript del sitio se encarga de mostrar la vista correcta.
   - Se probó con Playwright (sin internet, con stubs de Supabase/Leaflet/QR/EmailJS, igual que la
     prueba de la tanda 10): al llamar `filtrarPorCategoria('Veterinaria','mascota')`, la URL
     cambia a `/directorio/veterinaria`, la sección del directorio pasa a `display:block`, el hero
     pasa a `display:none`, y `volverAlInicio()` deja todo como estaba y la URL en `/`.
5. 🔶 **Pendiente por el usuario (acceso a sus cuentas)** — ver el paso a paso completo al final del
   mensaje del chat:
   - Subir `index-combinado.html` (renombrado a `index.html`) **y también el nuevo archivo
     `_redirects`** al mismo sitio de Netlify — sin `_redirects`, las URLs `/directorio/...`
     funcionan mientras se navega haciendo clic dentro del sitio, pero fallan si alguien entra
     directo a una o refresca la página estando ahí.
   - No hay ningún parche SQL nuevo que ejecutar en esta tanda. El `supabase-fix-v7.sql` de la
     tanda anterior (columna `plan`) sigue pendiente si todavía no se ha corrido — ver sección 14.

## 14. Parche v7 — columna `plan` en la tabla `socios`

Se creó `supabase-fix-v7.sql`, que:
- Agrega la columna `plan text not null default 'free'` a la tabla `socios`.
- Agrega una restricción (`check`) para que `plan` solo pueda ser `'free'`, `'pro'` o `'premium'` —
  cualquier otro valor es rechazado por la base de datos.
- No modifica `registrar_socio` ni ninguna otra función — como `plan` tiene un valor por defecto,
  cualquier registro nuevo (vía el formulario del sitio) queda automáticamente en `'free'` sin que el
  frontend tenga que enviarlo explícitamente.
- Es seguro correrlo en cualquier momento (antes o después de subir el `index-combinado.html` nuevo a
  Netlify) — el panel admin ya tiene un respaldo en el frontend (`planLabel(o.plan)` cae a "Miembro
  Free" si la columna todavía no existe), así que no hay riesgo de romper nada por el orden.
- **Para ver visualmente cómo se vería el carnet de alguien con plan Pro o Premium** (mientras no
  exista pasarela de pago real): en Supabase → Table Editor → tabla `socios`, edita a mano la columna
  `plan` de cualquier fila y escribe `pro` o `premium`. Eso no cambia el carnet ya mostrado en el
  navegador de esa persona (el carnet se genera en el momento del registro), pero si más adelante se
  arma una vista de "mi carnet" que vuelva a consultar la base de datos, ya quedará lista para leer
  ese valor real.

## 16. Banner de página, destacados, página de Especialistas y ficha a página completa (17 de agosto, octava tanda)

El usuario pidió, en una sola tanda de cambios (frontend + 1 parche SQL nuevo: `supabase-fix-v8.sql`):

1. ✅ **Banner de 5 slides arriba de cada página nueva** (`renderPageBanner()` en `js/app.js`,
   estilos `.page-banner*` en `css/styles.css`). Rota sola cada 5000ms con un fundido, con
   degradados de marca (`PAGE_BANNER_GRADIENTS`, 5 combinaciones de amarillo/turquesa/negro/óxido/
   verde salvia) y el nombre de la categoría centrado. Tiene puntos abajo a la derecha, clicables,
   que también reinician el temporizador. Si solo hay 1 slide (la ficha de un negocio puntual) no
   rota y no muestra los puntos.
   - **Medidas recomendadas para las fotos reales** (cuando el usuario las mande, reemplazan el
     degradado agregando `img: 'url-o-ruta'` a cada slide en `BANNER_DIRECTORIO` /
     `BANNER_ESPECIALISTAS` en `js/app.js`):
     - Ancho x alto: **1600 × 500 px** (proporción ancho:alto ≈ 3.2:1). El banner se ve a 260px de
       alto en mobile y 340px en escritorio, pero como es `background-size:cover`, una imagen más
       grande que eso se ve nítida en cualquier pantalla sin subir demasiado el peso del archivo.
     - Formato: JPG o WebP (no PNG, salvo que necesiten transparencia), idealmente bajo 300–400 KB
       cada una para que no ralentice la carga (son 5 por banner).
     - El texto de la categoría queda centrado-abajo a la izquierda con un degradado oscuro superpuesto
       (`.page-banner-overlay`) para que siempre se lea bien encima de la foto — no hace falta que la
       foto ya tenga espacio reservado para el texto.
2. ✅ **Botón "← Volver al inicio" eliminado.** El logo del nav ahora es un link real
   (`<a href="/">`) que siempre lleva al inicio (`onclick` llama a `volverAlInicio()`), tanto desde
   el directorio como desde especialistas o la ficha de un negocio — reemplaza al botón que existía
   solo arriba del directorio.
3. ✅ **Fila de "Destacados" arriba del directorio** (`renderFeaturedStrip()`), horizontal con
   scroll lateral, hasta 10 negocios. **Se eligen a mano**: nueva columna `destacado` (boolean) en
   la tabla `negocios` — el usuario la marca en el Table Editor de Supabase para cada negocio que
   quiera destacar, no hay ninguna lógica automática. No aparece en `/especialistas` (solo en
   `/directorio`), y se oculta sola si no hay ningún negocio marcado como destacado todavía.
4. ✅ **Limpieza del encabezado del directorio.** Se eliminó el título "Negocios y beneficios
   fundadores", su bajada ("No solo para tu mascota...") y el botón "🗺️ Ver mapa completo" — el
   directorio ahora va directo del banner + destacados a la etiqueta "Directorio" y los filtros. La
   función `abrirMapa()` sigue existiendo en `js/app.js` por si se reutiliza en otra parte más
   adelante, pero ya no tiene ningún botón que la llame desde el directorio.
5. ✅ **Nueva página `/especialistas`**, misma estructura visual que `/directorio` (banner propio
   con categorías tipo "Etología y conducta", "Nutrición animal", etc. — editable en
   `BANNER_ESPECIALISTAS`) pero filtrada para mostrar **solo especialistas**
   (`n.esEspecialista === true`). Reutiliza la misma sección `#directorio` y los mismos filtros
   (categoría/comuna/buscador) que el directorio normal — no se duplicó ningún HTML — el modo se
   decide con la variable `modoDirectorioEspecialistas`, que pone `renderDirectory()` a filtrar por
   `esEspecialista` además de los filtros normales. Nuevo link "Especialistas" en el nav
   (`irAEspecialistas()`), con sus propias URLs por categoría igual que el directorio (ej.
   `/especialistas/veterinaria`).
   - **Qué define a un especialista** (definición del usuario): una ficha de **una sola persona**
     que ofrece un servicio (ej. etólogo, nutricionista, adiestrador) — a diferencia de un negocio,
     que es un local o una marca.
   - Nueva columna `es_especialista` (boolean, default `false`) en `negocios` — se marca desde el
     propio formulario de registro: nuevo toggle "🏪 Negocio" / "🧑‍⚕️ Especialista individual" en el
     paso 1 del formulario de negocio (`setBizEsEspecialista()`), que se envía a `registrar_negocio`
     como el parámetro nuevo `p_es_especialista`.
6. ✅ **La ficha de un negocio pasó de ser un modal a una página propia**, con su propia URL
   (`/negocio/<slug-del-nombre>`), con el mismo banner arriba (una sola "slide" con el nombre del
   negocio — su logo si tiene, si no el degradado que le toque) y el contenido en dos columnas
   (detalle + una tarjeta lateral tipo "ficha técnica" con estado, tipo de beneficio, dirección,
   horario, redes, N° fundador, código). **Los datos que se muestran son exactamente los mismos que
   ya se guardaban en Supabase — no cambió qué se guarda, solo cómo se ve.**
   - `showFicha()` (el modal viejo) se reemplazó por `irANegocio(n)` (cambia la URL con
     `history.pushState`) + `mostrarPaginaFicha(n)` (arma la vista) + `renderFichaContenido(n)` (arma
     el HTML de la página). Se llama al hacer clic en cualquier tarjeta del directorio, de
     especialistas o de la fila de destacados.
   - **Nota/limitación conocida** (igual que la ya documentada para categorías): el slug de la URL
     sale del nombre del negocio (`slugify(nombre)`) — si algún día dos negocios tienen exactamente
     el mismo nombre, la URL encuentra el primero. No afecta la navegación normal del sitio (siempre
     se llega haciendo clic en la tarjeta correcta), solo compartir una URL exacta si hay nombres
     duplicados.
7. ✅ **`_redirects` actualizado** con las reglas nuevas `/especialistas/*` y `/negocio/*` (mismo
   motivo que `/directorio/*`: sin esto, entrar directo a esas URLs o refrescar ahí da 404 en
   Netlify).
8. 🔶 **Pendiente por el usuario (acceso a sus cuentas)** — ver el paso a paso completo al final del
   mensaje del chat:
   - Pegar y ejecutar `supabase-fix-v8.sql` en el SQL Editor de Supabase — agrega las columnas
     `destacado` y `es_especialista`, y reemplaza `registrar_negocio()` para que reciba el nuevo
     parámetro `p_es_especialista`. **Ejecutar este parche ANTES de subir el sitio nuevo a Netlify**
     (el frontend nuevo llama a `registrar_negocio` con ese parámetro nuevo; si el parche no se ha
     corrido, el registro de negocios se rompe).
   - Subir `index-combinado.html` (renombrado a `index.html`) **y el `_redirects` actualizado** al
     mismo sitio de Netlify.
   - En Supabase → Table Editor → tabla `negocios`, marcar a mano `destacado = true` en los negocios
     que se quieran mostrar en la fila de Destacados (hasta 10 a la vez).
   - Cuando el usuario tenga las fotos reales para el banner, agregarlas como `img:` en
     `BANNER_DIRECTORIO` / `BANNER_ESPECIALISTAS` (`js/app.js`) — medidas recomendadas en el punto 1
     de esta sección.

## 17. Validación bidireccional — calificaciones mutuas tipo Uber (19 de agosto)

Se implementó el sistema descrito en `sistema-validacion-mi-mascota-club.md` (incluido en el ZIP):
la confianza no se autodeclara ("5 años de experiencia") — se prevalida con datos que nacen de
transacciones reales cerradas y confirmadas por ambas partes, igual que Uber/Airbnb. Cada visita ya
validada en la sección "Validar visita" (tabla `canjes`) es ahora también un punto de calificación
mutua, ciega, y **exclusivo para socios/negocios con plan premium**.

1. ✅ **Parche SQL nuevo: `supabase-fix-v9.sql`** (pendiente de ejecutar en Supabase — ver sección
   7 "Pendientes"). Agrega:
   - Columna `plan` a `negocios` (`'presencia' | 'destacado' | 'premium'`, default `'presencia'`) —
     igual que `socios.plan` (parche v7), para poder gatear el beneficio de calificar también del
     lado del negocio.
   - Tabla `validaciones`: una fila por cada calificación (`origen: 'socio'|'negocio'`), ligada
     siempre a un `canje_id` real — nunca se puede calificar sin una visita cerrada de por medio.
     Tiene `estrellas` (1-5), `comentario`, y 3 columnas genéricas `criterio1/2/3` que el frontend
     etiqueta distinto según quién califica (dueño→negocio: puntualidad/trato/cumplimiento;
     negocio→dueño: puntualidad/comportamiento de la mascota/pago a tiempo — mismas columnas,
     etiquetas distintas, para no duplicar el esquema). Restricción `unique(canje_id, origen)`: no
     se puede recalificar la misma visita.
   - **Calificación ciega**: cada fila nace con `visible=false`; recién cuando existen las 2 filas
     de un mismo `canje_id` (una de cada `origen`), `enviar_validacion()` marca ambas como
     `visible=true` — ninguna de las dos partes ve la nota de la otra antes de calificar.
   - **Ventana de 72 horas** desde `canjes.created_at` para poder calificar esa visita (después de
     eso, `enviar_validacion()` la rechaza).
   - `registrar_canje()` se reemplazó (mismo nombre y parámetros de entrada) para devolver también
     `canje_id` y `negocio_plan` — así el frontend puede ofrecerle al negocio "calificar ahora" apenas
     se cierra la visita, sin otra consulta a la base de datos.
   - Funciones RPC nuevas (todas `security definer`, gateo real de premium **en el servidor**, no
     solo en el frontend — el frontend solo evita mostrar UI que el backend rechazaría igual):
     `verificar_plan(codigo)` (detecta MMC/NEG y si es premium), `enviar_validacion(...)`,
     `pendientes_por_validar(codigo, rol)`, `resumen_reputacion_negocio(codigo)` (público, con
     mínimo de 3 calificaciones antes de mostrar promedio — como Airbnb), `detalle_validaciones_negocio(negocio_codigo, codigo_consultante)`
     (gateado a socio Pro/Premium), y sus espejos `resumen_reputacion_socio` /
     `detalle_validaciones_socio` (para que un negocio Premium vea la reputación de un dueño como
     cliente).
2. ✅ **Frontend — nueva sección de calificaciones**, sin agregar una página nueva: se reutilizó el
   sistema de modales existente (`openModal`/`closeModal`).
   - Nuevo link en el footer: **"⭐ Calificar (Premium)"** → `abrirCalificaciones()` — pide un código
     (de socio o de negocio, se detecta solo por el prefijo `MMC`/`NEG`), valida el plan con
     `verificar_plan()`, y si es premium muestra sus visitas pendientes por calificar
     (`pendientes_por_validar()`) con un botón "Calificar" por cada una. Si no es premium, muestra
     un aviso con link directo a "Ver planes".
   - `abrirFormularioCalificar(canjeId, rol, codigo, contraparte)` abre el modal con un selector de
     estrellas (`starPickerHtml`/`setStarValue`, componente reutilizable de 5 botones ★) para la nota
     general + 3 criterios específicos (etiquetados según `rol`) + comentario opcional →
     `enviarCalificacion()` llama a `enviar_validacion()`.
   - **CTA inmediata para el negocio**: en el formulario "Validar visita" (`validarForm`), si la
     visita se registra con éxito y `registrar_canje()` devuelve `negocio_plan==='premium'`, el
     resultado incluye un botón **"⭐ Calificar a este socio ahora"** que abre el mismo modal directo
     con el `canje_id` recién creado — el negocio puede calificar en el momento, sin ir a buscar la
     visita después.
   - **Reputación pública en la ficha del negocio** (`/negocio/slug`): `renderFichaContenido()` ahora
     incluye un `<div id="repSummaryBox">`, y `mostrarPaginaFicha()` llama a
     `cargarReputacionNegocio(n)` (async, después de pintar la página) que trae el promedio y total
     de visitas — visible para **cualquier visitante**, gratis. Si hay menos de 3 calificaciones
     visibles, se muestra solo el conteo de visitas (sin promedio) para no exponer una nota con muy
     poca muestra. Debajo hay un campo para escribir un código de socio y un botón "Ver reseñas"
     (`verDetalleReputacionNegocio()`) que trae el detalle de comentarios **solo si ese código es de
     un socio Pro/Premium** (gateado también en el servidor) — si no, muestra el aviso premium con
     link a planes.
   - Nuevo bloque de CSS en `css/styles.css` (sección "Validación bidireccional"): `.star-picker`
     (selector de estrellas clicable), `.rep-summary`/`.rep-stars`/`.rep-avg`/`.rep-count` (resumen
     público), `.rep-locked` (aviso premium), `.rep-comment` (cada reseña individual),
     `.cal-pending-row` (cada visita pendiente por calificar).
3. 🔶 **Pendiente por el usuario (acceso a sus cuentas)**:
   - Pegar y ejecutar `supabase-fix-v9.sql` en el SQL Editor de Supabase (después de v7 y v8, que ya
     deberían estar corridos).
   - Subir `index-combinado.html` (renombrado a `index.html`) — ya regenerado en esta misma tanda
     con el CSS y JS nuevos embebidos — al sitio de Netlify.
   - Como todavía no hay pasarela de pago, para **probar el flujo de punta a punta** hay que marcar a
     mano en Supabase → Table Editor: un socio con `plan = 'pro'` o `'premium'` (tabla `socios`) y un
     negocio con `plan = 'premium'` (tabla `negocios`, columna nueva). Con eso, registra una visita
     de prueba en "Validar visita" con ese par de códigos y prueba a calificar desde ambos lados
     (footer → "⭐ Calificar") — debería quedar oculta hasta que ambos hayan calificado esa misma
     visita.
   - Falta decidir el precio/nombre exacto del plan premium de **negocios** que desbloquea esto (hoy
     los 3 planes de negocio ya definidos son Presencia $0 / Destacado $14.990 / Premium $29.990 —
     este parche asume que "Premium" es el que incluye calificar socios; falta reflejarlo en el texto
     de las tarjetas de precios de negocio en `#planes` si se quiere anunciar explícitamente).

## 7. Pendientes grandes (no empezados)

- **QR del carnet sin validación real todavía** — hoy es solo un código visual (imagen QR +
  texto `MMC00001`), pero no hay ninguna pantalla ni endpoint donde un negocio pueda escanearlo y ver
  al instante si el socio está activo. Es la pieza que falta para que "Validar visita" (que ya existe
  y funciona escribiendo el código a mano) también funcione escaneando el QR directamente.
- **Pagos recurrentes** (MercadoPago o Flow) para que los planes Pro/Premium (socios) y
  Destacado/Premium (negocios) se cobren de verdad — quedó solo como plan de pasos, sin construir.
  Requiere: crear cuenta comercial, modo sandbox, Edge Function de Supabase como webhook que
  actualice la columna `plan` de `socios` (y el estado equivalente de `negocios`) según el pago.
- **Verificación real de negocios** (columna `verificado` ya existe en la tabla, pero nadie la
  activa todavía — falta decidir si es manual o automática al pagar el plan Destacado).
- **Fotos reales** en el carrusel del hero (hoy son tarjetas con emoji, no fotos, para evitar
  problemas de derechos de autor).
- Posible rotación real de logos de negocios "Destacados" en el home (el usuario compartió un
  documento largo con la lógica de negocio para los planes de negocio, incluido en el historial del
  chat original).

## 8. Cómo continuar en una IA nueva

Copia y pega este mensaje al empezar:

> "Tengo un proyecto llamado Mi Mascota Club, un club de beneficios para dueños de mascotas en
> Chile. Ya está construido con HTML/CSS/JS vanilla, conectado a Supabase (base de datos) y
> publicado en Netlify. Te adjunto el código completo y un documento de contexto
> (CONTEXTO-PROYECTO.md) con todo lo que necesitas saber. Quiero continuar con [di aquí exactamente
> qué quieres hacer]."

Y adjunta el ZIP completo del proyecto (todo el código + este documento + los `.sql`).
