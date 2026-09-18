# ESTADO — Mi Mascota Club

**Última actualización: 17 de septiembre de 2026**

Esto es lo PRIMERO que hay que leer al empezar una sesión nueva, humana o con una IA.
`CONTEXTO-PROYECTO.md` es la bitácora histórica: tiene el detalle de cómo se construyó
cada cosa y por qué, pero son más de 1.700 líneas y **no hay que leerlo entero** — se
consulta por secciones cuando hace falta entender una pieza específica.

La regla: **este archivo se actualiza en el mismo commit del trabajo, antes del push.**
Si una sesión termina sin tocar este archivo, la siguiente empieza a ciegas.

---

## Cómo orientarse en dos minutos

1. Leer este archivo completo.
2. Mirar el esquema real en Supabase (proyecto `mzsqyjxqnomsbqzhygkx`). **La base es la
   verdad, no el documento.** Las funciones RPC en vivo mandan sobre cualquier `.sql` del repo.
3. `git log --oneline -15` para ver lo último que se hizo.

---

## Dónde vive todo

| Qué | Dónde |
|---|---|
| Sitio en vivo | **https://mimascotaclub.cl** (el `.netlify.app` sigue activo y redirige) |
| Repo local | `/Users/jaimeflorian/Desktop/Repositorio MI MASCOTA CLUB/mi-mascota-club-12-8` |
| Despliegue | `git add .` → `git commit -m "..."` → `git push`. Netlify construye solo. |
| Base de datos | Supabase, proyecto `mzsqyjxqnomsbqzhygkx` (São Paulo) |
| Correos | EmailJS desde el navegador (público) + Netlify Function `enviar-codigo.js` para los OTP |

`index.html` es la home real. **`index-combinado.html` es legado y no se toca.**

### Rutas privadas (existen pero no están enlazadas en el menú)

| Ruta | Para quién |
|---|---|
| `/mi-mascota` | El dueño — Mi Mascota ID: carnet, QR, perfil, historial |
| `/mi-negocio` | El negocio — su panel y sus visitas |
| `/validar` | El negocio — confirmar una visita |
| `/mi-panel` | Jaime — aprobar fichas, ver canjes, ajustes |

---

## Qué está en producción y funcionando

- **Registro de dueños** (`formulario-registro-demo-v3.html`, ruta `/registro`): tipo
  typeform, validación de RUT, razas según especie, verificación del correo por código
  OTP de 6 dígitos, mascota animada, consentimiento obligatorio y carnet con QR al final.
- **Mi Mascota ID** (`/mi-mascota`): entra solo con el correo + OTP, sesión por token de
  30 días, selector de mascotas, barra de "completa tu perfil", carnet con QR, foto de la
  mascota, edición de datos e historial de visitas.
- **Directorio** con filtros en columna izquierda, fichas de negocio en `/negocio/<slug>`,
  página de especialistas, selector Región → Comuna y buscador.
- **Panel del negocio** (`/mi-negocio`): entra con su código + OTP al correo, ve sus
  visitas y confirma canjes. El canje lo confirma **el negocio**, nunca el socio.
- **Canje trazable**: cada visita genera un folio, queda registrada para las dos partes y
  el monto de la compra es opcional.
- **Panel de Jaime** (`/mi-panel`): aprobar / modificar / rechazar fichas de negocio desde
  el celular, y ver los canjes.
- **Inscripción de negocios** (`formulario-negocio-v3.html`): un formulario con campos
  condicionales, aprobación manual antes de publicar.
- **Legal**: términos, privacidad, borrar cuenta, buzón de sugerencias.
- **Seguridad**: RLS cerrado, RPC de administración detrás de `es_admin()`, sesiones por
  token, bucket de Storage cerrado.
- **Dominio propio** con HTTPS de Let's Encrypt.

Base limpia de datos de prueba desde el 13 de septiembre. **3 socios reales** al 17 de
septiembre.

---

## Qué se está construyendo ahora — Verificación de tenencia

El agujero: no había forma de saber si quien se inscribe tiene mascota de verdad.
Cualquiera podía inventar los datos y llevarse los descuentos, lo que además arruina el
argumento de venta ante los negocios ("tengo X dueños verificados").

**El modelo, decidido el 16 y 17 de septiembre:**

- Estados por mascota: `registrado` → `en_revision` → `verificado` / `rechazado`.
- El dueño acredita con **número de chip + foto de la cartilla veterinaria**.
- La revisión es **manual**, con SLA de **48 horas hábiles**.
- **Solo `verificado` puede canjear**, controlado por un interruptor en la base
  (`ajustes.canje_exige_verificacion`) que se prende desde `/mi-panel`.
- El chip **nunca es obligatorio** al inscribirse: perder una inscripción cuesta más que
  esperar la verificación. Quien lo salta se inscribe igual y lo completa después.
- El formato del chip **orienta pero no bloquea**: el estándar chileno son 15 dígitos,
  pero hay mascotas viejas con chips antiguos. Decide la revisión manual.
- La foto de la cartilla **se borra apenas se resuelve** la verificación, se apruebe o se
  rechace. Es el dato más sensible de la base y ya cumplió su función.

**Estado de la construcción:**

| Pieza | Estado |
|---|---|
| Parche `supabase-verificacion-v25.sql` | ✅ Aplicado a la base |
| Paso de chip + cartilla en el registro | ✅ Construido y probado |
| Subir chip y cartilla desde `/mi-mascota` | ✅ Construido y probado |
| Revisar y aprobar desde `/mi-panel` | ✅ Construido y probado |
| Interruptor del bloqueo en `/mi-panel` | ✅ Construido y probado |
| Mensaje del bloqueo en el panel del negocio | ✅ Construido |
| Políticas y Términos con el SLA de 48 h | ✅ Actualizados (versión 2026-09-17) |
| Contactos del dueño y del negocio en `/mi-panel` | ✅ Construido |
| Visor de la cartilla en el registro y en `/mi-mascota` | ✅ Construido (v27) |
| Eliminar una sola mascota sin borrar la cuenta | ✅ Construido (v27) |
| **QA de punta a punta contra la base real** | ✅ Hecho el 17 de septiembre |
| **Encender el interruptor** | ⬜ **Pendiente** |
| **Correo al socio cuando se aprueba o rechaza** | ⬜ **Pendiente — el sitio lo promete y no existe** |

**El interruptor está APAGADO.** Mientras lo esté, cualquier socio puede canjear aunque
no esté verificado. Se prende en `/mi-panel` → "Ajustes del club", **después del QA**.

Ojo: la pantalla final del registro y el correo de bienvenida ya dicen que falta verificar
para canjear. Es verdad en el estado final; no lo es mientras el interruptor siga apagado.

### ⚠️ Pendiente inmediato: los socios viejos

Los socios inscritos **antes** del parche v25 quedaron en `registrado`. Si se enciende el
interruptor sin arreglarlos, no pueden canjear. Hay que decidir uno por uno: verificarlos a
mano (si Jaime los conoce) o borrarlos (si eran de prueba).

```sql
select codigo, pet, email, verificacion from socios order by socio_number;
```

```sql
update socios set verificacion = 'verificado', verificacion_en = now()
 where codigo = 'MMC00001';
```

---

## Decidido pero sin construir

- **Etiquetas visibles** "Registrado" y "Verificado" en el carnet y el perfil.
- **Páginas de categoría curadas** (ej. `/veterinarias`) que listan tarjetas apuntando a
  las fichas reales. Sirven como material de venta al reclutar negocios.
  **No** crear rutas por rubro (`/vet/<slug>`): `/negocio/<slug>` es la única plantilla.
- **Gamificación**: insignias en el carnet (Verificado, fiel a un negocio, Explorador),
  racha de meses activo, referidos con premio cuando el referido **se verifica**, no
  cuando se registra. Sin ranking público entre usuarios, y separada de los planes de
  pago para no confundirlas.
- **Veterinarias como socias fundadoras** que registren el chip al momento de implantarlo.
- **Alerta de mascota perdida** como gancho de registro real.

---

## Pendientes, en orden

1. **Correos automáticos.** Avisarle al socio cuando su verificación se aprueba o se
   rechaza — **hoy el sitio lo promete tres veces y no ocurre** — y avisarle a Jaime en
   cada canje.
   **Se hacen con EmailJS, no hace falta Resend ni pagar nada.** `enviar-codigo.js` ya
   manda correos por EmailJS desde el servidor con la clave privada, y el formulario los
   manda desde el navegador con la pública: las dos vías ya funcionan.
   El límite real del plan gratis **no son los envíos (200/mes) sino las plantillas: son
   2 y las dos están usadas** (OTP y bienvenida). La salida sin costo es convertir la de
   bienvenida en una plantilla **genérica de aviso** (`{{asunto}}`, `{{titulo}}`,
   `{{mensaje}}`, `{{boton_texto}}`, `{{boton_url}}` — EmailJS acepta variables en todos
   los campos, incluido el asunto), que sirve para bienvenida, verificación aprobada,
   rechazada y aviso de canje. Cuando el volumen pase de ~40-50 socios nuevos al mes, el
   plan Personal de US$9 da 2.000 envíos y 6 plantillas.
2. Resolver los socios viejos y encender el interruptor (ver arriba).
3. **Sacar los precios del formulario de registro** (Pro $2.990 / Premium $4.990). La
   página `/planes` se sacó del menú justo para no anclar precios, así que es incoherente.
4. **Casilla de consentimiento en el formulario de negocios** — todavía no la pide.
5. **Migrar el formulario de negocios al estilo v3** (OTP + mascota animada).
6. **Afiche imprimible con el QR** para el mesón del negocio.
7. **El QR del carnet no se escanea todavía**: el negocio escribe el código a mano.
8. **Moderación de las fotos** que suben los dueños — hoy no hay ninguna revisión.
9. **Mercado Pago Preapproval + webhook** (cobro recurrente). Solo hay plan de pasos.
10. Contenido y tips para dueños, para dar valor mientras hay pocos negocios.
11. Login con Google (prioridad baja, el acceso por correo ya cubre el caso).
12. `supabase-fix-foto.sql` sigue sin resolver (firma de función en conflicto).

---

## Manuales pendientes en paneles externos

- **Supabase → Authentication:** desactivar el registro público de usuarios y activar la
  protección de contraseñas filtradas (HaveIBeenPwned).
- **Supabase → Storage → bucket `negocios`:** quedan 4 archivos de prueba por borrar.
- **EmailJS, plantilla `template_u9x5p1i`:** agregar un botón grande a `{{carnet_url}}`
  que diga "Ver el carnet de {{mascota}}". El carnet tiene que estar en el teléfono, no
  en el correo.

---

## Reglas del proyecto que no hay que romper

- **Nadie queda bloqueado en el mesón.** Si un socio no puede canjear, se entera antes —
  en su carnet, en `/mi-mascota` o en el correo— nunca frente al cajero. Es la misma razón
  por la que el correo del negocio se pide recién al confirmar la primera visita.
- **El canje lo confirma el negocio, no el socio.** El negocio es el que regala el
  descuento y no tiene incentivo para inventar visitas.
- **Una sola plantilla de ficha** (`/negocio/<slug>`). Las categorías son páginas curadas
  que apuntan a ella, no rutas nuevas.
- **Un solo campo de estado de verificación** en la base. Cada panel muestra solo lo que
  le corresponde: el negocio ve si el socio puede canjear, nunca el chip ni la cartilla.
- **El concepto es compensar el gasto de tener mascota con beneficios en otras áreas de la
  vida**, no dar descuentos en cosas de mascota. Tener mascota es el filtro de entrada, no
  la razón de valor. Por eso los primeros negocios candidatos son un tatuador, un gásfiter,
  un electricista y una relojería.
- **Probar siempre en 360×600**, no solo en iPhone. Es donde aparecen los problemas de
  scroll y es un teléfono muy común en Chile.
- **Nada del chip puede hacer fracasar una inscripción.** Duplicado, mal formato o foto
  pesada: se inscribe igual y se avisa.

---

## Estrategia de lanzamiento vigente (10 de septiembre)

Captar **dueños primero, gratis**, dándoles contenido y beneficios desde ya. Después usar
el número de dueños inscritos como argumento de venta ante los negocios, ofreciéndoles un
monto mínimo los primeros tres meses. Los primeros 20-30 negocios entran gratis 2-3 meses
como socios fundadores.

Reparto de trabajo: **Jaime hace el QA de los flujos, la IA avanza en el desarrollo.**
