# Mi Mascota Club · Flujo de negocios

## Archivos

```
formulario-negocio-v3.html    Formulario multi-paso (8 pasos + intro + confirmación)
ficha-negocio.html            Demo de la ficha: desktop, mobile y servicio sin local
css/mmc-negocios.css          Todo el sistema visual. Los colores están en :root
js/catalogos-negocio.js       54 tipos de negocio + los 3 catálogos de beneficio
js/ficha-negocio.js           renderFicha(elemento, datos) — el mismo componente
supabase-negocios-v11.sql     Tabla de solicitudes, RLS, storage y aprobación
```

## Para probarlo

`git add .` → `git commit -m "..."` → `git push`, y Netlify lo publica solo. Después:

```
https://mimascotaclub.netlify.app/formulario-negocio-v3.html
```

También se llega desde el sitio: "Quiero unirme al club" → "🏪 Soy un negocio".

Ya está todo conectado: la publishable key sale de `js/app.js`, las 346 comunas
también, `mostrarFormulario('negocio')` redirige al formulario nuevo, y
`supabase-negocios-v11.sql` ya fue ejecutado en el proyecto.

## Colores de marca

Ya están aplicados los de Mi Mascota Club, arriba de `css/mmc-negocios.css`:

```css
--mmc-negro:    #151515;  /* CTA "Obtener beneficio", botones principales */
--mmc-amarillo: #FFCE00;  /* fondo de la barra de beneficio */
--mmc-turquesa: #47C9C9;  /* foco de campos, selección, validación, check final */
```

Tipografía: **Lato** (400/700/900), la misma del sitio. Los titulares usan Lato
Black en mayúsculas.

## Comunas

El formulario usa `window.COMUNAS_POR_REGION` si el sitio ya lo define
(tu selector Región → Comuna con las 346 comunas). Si no existe, cae a un
listado interno con las 52 comunas de la RM. Para conectarlo, carga tu archivo
de comunas **antes** del script del formulario.

## Cómo encaja con lo que ya existe

La tabla `negocios` (el directorio en vivo) **no cambió su estructura**: solo se le
agregaron columnas públicas nuevas (foto, whatsapp, instagram, facebook, tiktok,
google_maps_url, horario_dias, tiene_local, comunas_cobertura, tipo_negocio y los
tres campos de beneficio). Todo lo que ya funcionaba sigue igual.

Las inscripciones nuevas **no entran directo al directorio**. Caen en una tabla
aparte, `negocios_solicitudes`, y solo pasan a `negocios` cuando tú las apruebas.

## Qué se publica y qué no

**Visible en la ficha:** logo, foto, nombre, tipo de negocio, comuna, dirección,
enlace de Google Maps, teléfono del local, WhatsApp, Instagram, Facebook, TikTok,
horario y el beneficio.

**Solo en `negocios_solicitudes`:** razón social, RUT comercial, nombre y RUT del
responsable, correo y teléfono del responsable.

La separación está garantizada a nivel de base de datos. `negocios_solicitudes`
tiene RLS con política **solo de INSERT**: cualquiera puede postular, nadie puede
leerla con la anon key. Aunque alguien inspeccione la red desde el navegador, los
RUT y correos no salen. Al aprobar, la función copia únicamente los campos públicos
a `negocios` — el correo del responsable ni siquiera se copia.

## Aprobación manual

Ver la cola de pendientes (SQL Editor de Supabase):

```sql
select * from cola_negocios;
```

Aprobar — devuelve el código de fundador (NEG0002, NEG0003…):

```sql
select aprobar_solicitud_negocio('<pega aquí el id>');
```

Rechazar:

```sql
select rechazar_solicitud_negocio('<id>', 'La foto tiene marca de agua');
```

Al aprobar, la solicitud se copia a `negocios` con su `codigo` y `founder_number`
generados por la misma secuencia (`negocio_seq`) que usa el flujo antiguo, así que
la numeración de fundadores sigue corrida sin saltos.

## Categorías del directorio

Cada uno de los 54 tipos de negocio se traduce al par (tipo, cat) que usa el
directorio. El mapa está en `MAPA_DIRECTORIO`, dentro de `js/catalogos-negocio.js`.
Ahí también se marca qué tipos son **especialistas** (una sola persona: paseador,
etólogo, entrenador, veterinario a domicilio, etc.) para que aparezcan en
`/especialistas`.

Se agregó la categoría **Servicios** a `CATS_MASCOTA` en `js/app.js`, porque no
había dónde clasificar transporte, funeraria, seguros, sanitización, criaderos ni
fundaciones de rescate.

## Pendientes conocidos

- Verificación OTP del correo del responsable (hoy la solicitud guarda
  `email_verificado = false`). Se puede reusar la Netlify Function del formulario
  de dueños.
- Correo automático de "recibimos tu inscripción" y de aprobación/rechazo.
- Panel de aprobación con interfaz, en vez de correr SQL a mano.
