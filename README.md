# Mi Mascota Club — Proyecto MVP

Esta carpeta es tu proyecto de diseño para personalizar el sitio. **No es la versión con datos reales** — esa vive en el enlace del Artifact de Claude que te compartí en el chat (ese link sí guarda negocios, socios y visitas de verdad, para siempre).

Piensa en esto así:
- **Enlace de Claude (Artifact)** → la app "viva", donde la gente se registra de verdad y tú validas visitas. Compártelo por WhatsApp.
- **Esta carpeta** → tu banco de trabajo para cambiar diseño (tipografía, logo, colores, imágenes) y, más adelante, la base para migrar a un hosting propio con base de datos real.

## Estructura

```
mi-mascota-club/
├── index.html          → estructura de la página
├── css/styles.css       → TODOS los estilos (tipografía, colores, logo, tamaños)
├── js/app.js             → toda la lógica (formularios, directorio, QR, panel)
├── assets/logo.svg       → tu logo (reemplázalo por el tuyo)
└── assets/images/        → pon aquí tus fotos/imágenes
```

## Cómo personalizar

**Cambiar la tipografía:** abre `css/styles.css`, busca el bloque `:root` al inicio y cambia `--font-display`, `--font-body` y `--font-mono`. Si usas una fuente nueva de Google Fonts, actualiza también el `<link>` en `index.html` (Google te da ese código cuando eliges la fuente en fonts.google.com).

**Cambiar colores:** mismas variables `:root` en `css/styles.css` — cada color del sitio sale de ahí.

**Cambiar el logo:** reemplaza `assets/logo.svg` por tu archivo (mismo nombre), o si usas PNG/JPG, cambia en `index.html` cada `assets/logo.svg` por `assets/tu-logo.png`.

**Agregar imágenes:** copia tus fotos a `assets/images/` y agrégalas en `index.html` con `<img src="assets/images/tu-foto.jpg" alt="descripción">`.

## Cómo ver los cambios

Abre `index.html` haciendo doble clic — se abre en tu navegador. Verás un aviso amarillo arriba indicando que estás en "modo diseño" (sin base de datos real), es normal.

## El sistema de validación con QR — cómo funciona

1. Un dueño se registra → recibe un **código de socio** (ej. `MMC00001`) y un carné con QR.
2. Un negocio se registra → recibe un **código de negocio** (ej. `NEG0001`).
3. Cuando el socio compra en el local, el negocio entra a la sección "Validar visita", escribe su propio código, escribe (o más adelante escanea) el código del socio y el monto de la compra.
4. Eso queda guardado como una "visita validada", y el panel privado suma automáticamente cuántos clientes llegaron por el club y cuánto generaron en ventas — el dato que necesitas para mostrarle a un inversionista.

*Nota:* por ahora la lectura del QR es manual (el negocio escribe el código que ve en el carné). Escanear con la cámara del celular es la mejora natural siguiente.

## Ficha de mascota con foto y documentos

Cada dueño puede volver más tarde, buscar su ficha con su código de socio (ej. `MMC00001`) y agregar: una foto de su mascota, notas médicas (alergias, medicamentos, veterinario) y hasta 2 documentos (receta, cartola de vacunas).

**Sobre el espacio:** como el club guarda texto/JSON (no archivos binarios), las fotos se comprimen automáticamente en el navegador antes de guardarse — quedan livianas (decenas de KB, no megas). Esto funciona perfecto para tu etapa de validación (decenas o cientos de mascotas). Si el club crece a miles de usuarios con fotos, ahí sí conviene mover las imágenes a un almacenamiento de archivos real (Supabase Storage, por ejemplo, tiene 1GB gratis y luego es muy barato por GB) — es un cambio técnico acotado, no hay que rehacer el proyecto.

## Siguiente paso: privacidad real y crecer fuera de Claude

Ahora mismo, la clave del panel vive en el código — cualquier persona técnica podría encontrarla mirando el código fuente. Es una traba razonable para una etapa muy inicial, pero no es seguridad real.

Cuando quieras que esto sea 100% privado y/o hospedar el sitio en tu propio dominio, el paso natural es migrar a una base de datos con inicio de sesión real. Recomendado: **Supabase** (tiene plan gratuito, base de datos Postgres, y sistema de login integrado). En ese momento:
- Las tablas `negocios`, `socios` y `canjes` se mueven a Supabase.
- Se activa un login solo para ti (o tu equipo) para entrar al panel.
- El resto del sitio (directorio, formularios, carné) casi no cambia de diseño — solo cambia a dónde se guardan los datos.

Avísame cuando quieras dar ese salto y armamos ese proyecto paso a paso.
