# ESTADO — Mi Mascota Club

**Última actualización: 11 de octubre de 2026**

Esto es lo PRIMERO que hay que leer al empezar una sesión nueva, humana o con una IA.
`MARCA.md` es el compañero de este archivo: este dice **qué está construido**, aquel dice
**para qué existe** (el porqué, el lema, cómo se explica y las líneas de negocio).
`LANZAMIENTO.md` dice **cómo se sale a buscar socios**: canales, calendario y el pase de
Socio Fundador.
`NEGOCIOS-CAPTACION.md` dice **cómo se reclutan negocios**: el modelo de cobro, a quién
escribirle primero y los mensajes exactos que se mandan.
`CONTEXTO-PROYECTO.md` es la bitácora histórica: tiene el detalle de cómo se construyó
cada cosa y por qué, pero son más de 1.700 líneas y **no hay que leerlo entero** — se
consulta por secciones cuando hace falta entender una pieza específica.

La regla: **este archivo se actualiza en el mismo commit del trabajo, antes del push.**
Si una sesión termina sin tocar este archivo, la siguiente empieza a ciegas.

Y una regla chica que ya confundió una vez (3 de octubre): **al editar cualquiera de
estos `.md` hay que cambiar también la línea "Última actualización" de arriba.** Una
sesión nueva se fía de esa línea para saber qué tan al día está el documento, no de la
fecha del archivo.

---

## Cómo orientarse en dos minutos

1. Leer este archivo completo, y `MARCA.md` si la sesión toca concepto, textos o negocio.
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
| Correos | EmailJS. Dos plantillas y no caben más en el plan gratis: `EMAILJS_TEMPLATE_ID_OTP` (el código de 6 dígitos, se manda desde la Netlify Function `enviar-codigo.js` con la clave privada) y **`template_u9x5p1i`, que es la plantilla GENÉRICA de avisos** — bienvenida, verificación aprobada y rechazada salen todas de ahí, con el texto viajando como variables. El aviso de canje a Jaime sale de `netlify/functions/aviso-canje.js`, también en el servidor, porque el correo lleva el contacto del dueño y el negocio no puede verlo |

`index.html` es la home real. **`index-combinado.html` es legado y no se toca.**

### Rutas privadas (existen pero no están enlazadas en el menú)

| Ruta | Para quién |
|---|---|
| `/mi-mascota` | El dueño — Mi Mascota ID: carnet, QR, perfil, historial |
| `/mi-negocio` | El negocio — su panel y sus visitas |
| `/validar` | El negocio — confirmar una visita |
| `/mi-panel` | Jaime — aprobar fichas, ver canjes, marcar fundadores, ajustes |

`/quienes-somos` sí es pública y va en el menú. **Es una página suelta** (`quienes-somos.html`
servida por una regla de `_redirects`), no una vista de la SPA: se hizo así porque es la que
más va a cambiar durante el lanzamiento y así nada de lo que se toque ahí puede romper la home.

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
- **Landing `/quienes-somos`** (23 de septiembre): la historia de Max, el gasto de $100.000
  al mes, el manifiesto, los tres pasos, "los negocios los eligen los socios", el pase de
  Socio Fundador y las preguntas frecuentes.
- **Pase de Socio Fundador** (23 de septiembre): $9.990 pago único, 100 cupos, sin kit
  físico por ahora. Ver el bloque de abajo.

- **El grupo del club y el pase de fundador dentro de `/mi-mascota`** (25 de septiembre):
  dos tarjetas que solo ve un socio con sesión iniciada. El enlace del grupo **no existe
  en el sitio público**: esa es la forma de que al grupo solo llegue gente inscrita, sin
  revisar a mano quién es quién. Al que ya es fundador se le muestra su número en vez de
  la oferta.
- **El grupo y el pase también al final del registro y en el correo de bienvenida**
  (25 de septiembre). En la pantalla final van *después* del carnet y de la verificación:
  la inscripción ya terminó y nada de eso puede entorpecerla. En el correo viajan como
  texto dentro de `mensaje_extra`, no como variables nuevas, para no tener que editar la
  plantilla de EmailJS.

Base limpia de datos de prueba desde el 13 de septiembre. **3 socios reales** al 17 de
septiembre.

- **`/gracias`** (26 de septiembre): la página a la que Mercado Pago devuelve después de
  pagar el pase. Antes el retorno era `/quienes-somos#ya-pague` y era un mal final —
  pagabas y aterrizabas arriba de la misma página que te había vendido. Ahora es una
  pantalla propia: el check, el contador de cupos y **un botón de WhatsApp gigante** como
  única acción, más los tres pasos de qué pasa ahora.

**Segunda limpieza (25 de septiembre):** se borraron las 6 mascotas de prueba
(MMC00004 a MMC00009) y los 7 canjes contra negocios de demostración. Los códigos
MMC00004 en adelante vuelven a estar libres.

**Estado de la base al 26 de septiembre:** 5 mascotas, 2 fundadores, **0 negocios**
(se borró el de demostración antes de invitar gente real) y 0 canjes.

### ⚠️ La trampa del retorno de Mercado Pago

Mercado Pago pega sus parámetros **después del `#`**, así que la URL de retorno vuelve
como `…/gracias#ancla?collection_id=…&status=approved`. Cualquier comparación exacta con
`location.hash` falla. Costó un QA descubrirlo. **Por eso el retorno es una ruta propia
y no un ancla**, y en `quienes-somos.html` quedó una red de seguridad que manda a
`/gracias` si detecta el ancla vieja.

---

## Socios Fundadores — TERMINADO (23 de septiembre)

$9.990 de pago único, 12 meses de membresía, 100 cupos. Sin kit físico: se decidió lanzar
solo con el pase digital para no frenarse cotizando y despachando.

Lo que incluye: número de fundador visible en el carnet, insignia permanente, voto para
elegir qué negocios entran y precio congelado de por vida.

**El circuito que está HOY en producción (automático desde el 3 de octubre):**

1. En `/quienes-somos` la persona entra con el código a su correo (si no tenía sesión).
2. Paga en el link de Mercado Pago `https://mpago.la/1pwEBKm`.
3. Toca **"← Volver a Mi Mascota Club"** y llega a `/gracias`, que le pregunta a Mercado
   Pago por el pago y activa el pase sola. A Jaime le llega un correo por cada fundador.
4. Lo que no se activa solo queda en `/mi-panel` → "Pagos de fundador pendientes".

**Boleta (decidido el 3 de octubre):** Jaime **empieza a cobrar a los fundadores así**,
sin boleta, y consulta al contador después. Mercado Pago entrega un comprobante de pago,
que no es un documento tributario. Va de la mano con la decisión del 25 de septiembre de
no frenar el lanzamiento por la formalización.

### Fundador automático y VERIFICADO — EN PRODUCCIÓN (3 de octubre)

**Decisión del 30 de septiembre: el paso de "avísame por WhatsApp" se elimina.** Acaba
de pagar y está contento: es el peor momento para pedirle un trámite.

**Decisión del 3 de octubre: se hace bien de una vez.** El diseño del 1 de octubre
confiaba en el número de operación que viene en la dirección de `/gracias`, y esa
dirección la puede escribir cualquiera a mano. Ahora **se le pregunta a Mercado Pago**
antes de activar nada. Jaime lo pidió explícitamente pensando en una futura competencia
con mala intención, no en un curioso.

**El flujo construido:**

1. **En `/quienes-somos`, antes de pagar** (`js/pase-fundador.js`): el botón ya no va
   directo a Mercado Pago.
   - Con sesión iniciada (la misma de `/mi-mascota`): *"Vas a activar tu pase como
     xxx@"* y el botón de pagar. Si ya es fundador, se lo dice y no lo manda a pagar.
   - Sin sesión: **entra con el código al correo** (opción A, decidida el 3 de
     octubre). Así el pase queda ligado al correo correcto y nadie puede usar la página
     para averiguar si un correo está inscrito.
   - Se le dice que puede pagar con cualquier cuenta de Mercado Pago y que **al terminar
     toque "Volver a Mi Mascota Club"**.
2. **Link de pago `https://mpago.la/1pwEBKm`** (desde el 3 de octubre; el viejo
   `1gq8qDj` se reemplazó porque no devolvía al sitio — ver "El link que no volvía").
3. **En `/gracias`**: lee `payment_id` / `collection_id` de la dirección (de los dos
   lados del `#`), y si no hay sesión pide entrar con el código. Después llama a
   **`netlify/functions/activar-fundador.js`**, que:
   - saca el correo **del token de sesión**, nunca del navegador;
   - le pregunta a Mercado Pago por el pago (`GET /v1/payments/{id}` con
     `MP_ACCESS_TOKEN`) y exige: **aprobado, en CLP, $9.990 exactos y posterior al 23 de
     septiembre** (la cuenta de Mercado Pago es anterior al club);
   - recién ahí llama a `activar_fundador()`, que **solo puede llamar el servidor**;
   - cada número de operación sirve **una sola vez** (índice único en `fundadores`);
   - le manda a Jaime un correo por cada fundador nuevo;
   - entrega el enlace del grupo **solo si el pase se activó**: ya no está escrito en
     `gracias.html`.
4. **Lo que no se activa solo cae en "Pagos de fundador pendientes" en `/mi-panel`**,
   con aviso a Jaime por correo (uno por pago, no uno por recarga):
   - pago en efectivo o transferencia todavía no acreditado (`pago_en_proceso`). La
     persona ve *"Tu pago está en proceso"*. Cuando Mercado Pago lo apruebe, Jaime lo
     activa desde ese bloque;
   - pago que no calza con el monto o la fecha (`monto_distinto`);
   - pago aprobado sin cupo (`sin_cupo`).
   El botón "Activar como fundador" de ese bloque es manual: **revisar antes en Mercado
   Pago que la operación esté aprobada.**

**Lo que queda abierto, a conciencia:**

- **Si la persona cierra Mercado Pago sin tocar "Volver a Mi Mascota Club"**, el pago queda
  aprobado pero nadie llama a `/gracias`. Mercado Pago le avisa a Jaime de cada venta:
  si ve un pago sin fundador, lo marca a mano en `/mi-panel` (necesita el correo de la
  persona). Se cierra del todo con un webhook de Mercado Pago, que es trabajo de "Cuando
  haya volumen".
- **El enlace del grupo sigue escrito en `js/app.js`** (`renderExtrasSocio`, para mostrárselo
  al fundador en `/mi-mascota`), y `app.js` es público. La llave real del grupo es
  **"Aprobar nuevos miembros"** en WhatsApp: tiene que seguir activada siempre.

| Pieza | Estado |
|---|---|
| `supabase-fundador-verificado-v30.sql` | ✅ Corrido en Supabase el 3 de octubre |
| `supabase-fundador-auto-v29.sql` | ➖ **Reemplazado por el v30. NO CORRER.** |
| `MP_ACCESS_TOKEN` en Netlify | ✅ Puesto el 3 de octubre (app "Mi Mascota Club" en Mercado Pago Developers, token renovado) |
| Paso del correo antes de pagar en `quienes-somos.html` | ✅ En producción y probado |
| Activación automática en `gracias.html` + `activar-fundador.js` | ✅ En producción y probada con un pago real |
| Bloque de pagos pendientes en `/mi-panel` | ✅ En producción |
| `supabase-cerrar-socio-existe-v31.sql` | ✅ Corrido después del push |
| Link nuevo `1pwEBKm` en `quienes-somos.html` | ✅ Push del 3 de octubre (segundo) |
| Link viejo `1gq8qDj` | ✅ Eliminado en Mercado Pago el 3 de octubre |

### QA del 3 de octubre (hecho)

- `/mi-mascota` con un correo inscrito y con uno inventado: mismo mensaje, solo llega
  código al inscrito. ✅
- `/gracias` abierta a mano, sin pago y con `payment_id` inventado: no activa nada ni
  muestra el grupo ("No encontramos ese pago"). ✅ Eso además probó que el Access Token
  funciona.
- Límites de envío e intentos: probados directo en la base, sin gastar correos. ✅
- `/quienes-somos`: con sesión, sin sesión, "¿No eres tú?" y siendo ya fundador. ✅
- **Dos pagos reales de $9.990** (tarjeta Tenpo de Jaime, como invitado, sin iniciar
  sesión en Mercado Pago): las dos veces se activó el #001, llegó el correo "Nuevo
  Socio Fundador #001", y después se devolvió el pago y se quitó el fundador. ✅
- Pagarse a uno mismo **sí funciona** si se paga como invitado con una tarjeta, sin
  iniciar sesión en Mercado Pago.

### El link que no volvía (3 de octubre)

Con el link viejo `1gq8qDj`, después de pagar Mercado Pago mostraba la pantalla verde
**sin ningún botón** para volver: la persona quedaba atascada y su pase no se activaba
(se terminó a mano abriendo `/gracias?payment_id=…`). El "Sitio de redireccionamiento"
de Mercado Pago (Link de pago → Configuraciones) es **para todos los links**, pero el
del pase se había creado antes de guardarlo. **Con un link creado de nuevo apareció el
botón "← Volver a Mi Mascota Club"**, que lleva a `/gracias` con el número de
operación, y el pase se activó solo.

**Ojo: no es automático.** La persona tiene que tocar ese botón. Si cierra la pestaña
antes, el pago queda aprobado pero el pase no se activa: Jaime lo ve en el correo de
venta de Mercado Pago y lo marca a mano en `/mi-panel`. **La solución de fondo (opción
B, decidida para cuando haga falta):** que el sitio cree el cobro con la API de Mercado
Pago (preferencia con `back_urls` + `auto_return` + `notification_url`), así vuelve
solo y además Mercado Pago le avisa al servidor (webhook) aunque la persona cierre la
ventana. Un push.

**Pendiente menor:** el correo "Nuevo Socio Fundador" sale por la plantilla genérica de
EmailJS (`template_u9x5p1i`), que trae fijo un bloque "Cómo se usa" (llegas al negocio,
muestras tu carnet…) que no corresponde a ese aviso. Se arregla en EmailJS, no en el
código.

**Variables de entorno de Netlify:** `MP_ACCESS_TOKEN` (nueva y obligatoria: el Access
Token de **producción**). Opcionales: `GRUPO_FUNDADORES_URL` (si se cambia el enlace del
grupo) y `OTP_SALT` (la sal con que se cifra la IP). La clave de Mercado Pago **nunca** va
en el código, en un `.md` ni en un chat.

## Límites del código por correo (OTP) — CONSTRUIDO (3 de octubre)

El 3 de octubre se revisó y **no existía ningún límite**: ni de envíos ni de intentos.
Tres agujeros reales:

1. Un programa podía pedir 200 códigos en un minuto y **gastar el mes entero de EmailJS**:
   desde ahí nadie podía registrarse, entrar a `/mi-mascota` ni validar un canje.
2. **El código se podía adivinar**: intentos ilimitados y varios códigos vigentes a la vez.
   Era el más grave, porque permitía entrar a una cuenta ajena.
3. **El acceso decía si un correo estaba inscrito** ("No encontramos mascotas…") y
   `socio_existe()` respondía lo mismo a cualquiera.

Lo construido (`supabase-fundador-verificado-v30.sql` + `enviar-codigo.js`):

| Límite | Valor |
|---|---|
| Códigos por correo | 5 cada 15 minutos |
| Códigos por conexión (IP, guardada cifrada) | 10 por hora |
| Códigos en todo el sitio | 40 por hora |
| Códigos vigentes por correo | 1 (pedir otro anula el anterior) |
| Intentos por código | 5 (al quinto error se anula) |

- `otp_registrar()` revisa los límites y guarda el código; solo la llama
  `enviar-codigo.js`. `otp_consumir()` revisa lo que escribe la persona y la usan por
  dentro `socio_login`, `negocio_login` y `verificar_codigo_email`.
- **El acceso a `/mi-mascota` y al pase ya no dice si un correo está inscrito:** responde
  *"Si ese correo está inscrito, te llegará un código"* y, si no lo está, no se manda
  nada. `enviar-codigo.js` recibe `acceso: true` para eso; el registro sigue mandando a
  cualquier correo, porque es alguien inscribiéndose.
- `socio_existe()` se cierra al navegador con `supabase-cerrar-socio-existe-v31.sql`,
  **después** del push (antes rompería el sitio viejo).
- Los límites se cambian en las constantes de `otp_registrar()`.

**Lo que no se cubre:** alguien con muchas conexiones distintas puede gastar hasta 40
códigos por hora. Ya no es un minuto para vaciar el mes, pero sí unas horas. Si pasa, se
nota en EmailJS y se cambia a Brevo o Resend (ver CONTEXTO, sección 30.5).

Y aparte del correo: llamar miles de veces a cualquier función gasta invocaciones de
Netlify aunque no se mande nada. En septiembre todas las funciones juntas costaron 0,3
créditos de 1.000, así que haría falta un ataque enorme y sostenido. Si pasa, se ve en
Usage & billing; con la recarga automática apagada, lo peor es que el sitio se pause
hasta el ciclo siguiente.


### Dos trampas que ya costaron tiempo (23 de septiembre)

- **`app.js` completo vive dentro de una función.** Cualquier función nueva que se llame
  desde un `onclick` del HTML tiene que quedar colgada de `window` al final del archivo,
  junto a las demás. Sin eso el botón simplemente no hace nada y no aparece ningún error
  hasta que se mira la consola.
- **Las funciones RPC que llama el sitio van `volatile`, no `stable`.** `socio_fundador`
  se creó `stable` y la API respondía **405** a la llamada del navegador, así que la
  insignia nunca aparecía. `socio_perfil` y `socio_historial` son `volatile`: hay que
  seguir ese patrón.

### El grupo de WhatsApp es SOLO DE FUNDADORES (decidido el 1 de octubre)

Entró al grupo alguien que no había pagado el pase. No fue un error del sistema: el
enlace se le mostraba a **todo socio registrado** desde `/mi-mascota`, en la pantalla
final del registro y en el correo de bienvenida.

**La decisión:** el grupo es la única cosa exclusiva que hoy se recibe por los $9.990. Si
lo tiene cualquiera que se registra gratis, el pase no vende nada. Además un grupo chico
de gente comprometida conversa, y uno grande de gente que entró gratis se muere en tres
días.

**Lo que se cambió (desplegado el 1 de octubre):**

- `renderExtrasSocio()` en `js/app.js`: al que **no** es fundador se le ofrece el pase y
  **no** ve el enlace del grupo. Al fundador se le muestran las dos tarjetas, y el grupo
  pasó a llamarse "El grupo de los fundadores".
- El bloque del grupo salió de la pantalla final del registro (`bloqueGrupo` quedó vacío,
  con el comentario de por qué) y del `mensaje_extra` del correo de bienvenida.
- Donde antes se ofrecía el pase, ahora **el grupo se nombra como parte de lo que
  incluye**: "tu número en el carnet, el grupo privado de fundadores, …".

**Agujero cerrado el 3 de octubre:** `/gracias` ya no tiene el enlace del grupo escrito;
lo recibe del servidor solo si el pase se activó de verdad.

"Aprobar nuevos miembros" está activado en los ajustes del grupo (confirmado el 3 de
octubre). Es la llave real del grupo: no apagarla nunca.
A quien ya entró sin pagar **no se le echa**: son conocidos y es una prueba cerrada.

---

## Verificación de tenencia — TERMINADA (17-18 de septiembre)

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
| Correo al socio cuando se aprueba o rechaza | ✅ Construido y probado |
| Correo a Jaime en cada canje | ✅ Construido y probado (`netlify/functions/aviso-canje.js`) |
| Gasto total y columna de compra en el historial | ✅ Construido y probado |
| **QA de punta a punta contra la base real** | ✅ Hecho el 17-18 de septiembre |
| Auditoría en pantalla de Android (360×640) | ✅ Hecha el 18 de septiembre |
| **Encender el interruptor** | ⬜ **Lo único que falta, y es una decisión, no código** |

**El interruptor está APAGADO.** Mientras lo esté, cualquier socio puede canjear aunque
no esté verificado. Se prende en `/mi-panel` → "Ajustes del club", **después del QA**.

Ojo: la pantalla final del registro y el correo de bienvenida ya dicen que falta verificar
para canjear. Es verdad en el estado final; no lo es mientras el interruptor siga apagado.

### ⚠️ Pendiente: los socios de prueba

Al 18 de septiembre los socios que hay en la base **son todos de prueba y se dejan a
propósito**, porque sirven para seguir probando. Jaime los borra cuando termine de
construir el lado de los negocios.

Cuando llegue ese momento, ojo con esto: los inscritos **antes** del parche v25 quedaron en
`registrado`, así que si se enciende el interruptor sin resolverlos, no pueden canjear. Hay
que decidir uno por uno: verificarlos a mano o borrarlos.

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

### Asistente de triage con IA — evaluado el 30 de septiembre, fase 2

La idea original era "un veterinario en línea". **No puede llamarse así ni comportarse
así.** En Chile la medicina veterinaria es profesión regulada, Jaime trabaja como persona
natural (sin empresa ni seguro de por medio), y hay errores que matan: paracetamol en
gatos, ibuprofeno en perros, dosis mal calculadas. Un bot que diagnostica o receta es una
exposición personal, no un feature.

**Lo que sí se puede hacer, y es lo que la gente realmente necesita:** un triage. Se
llamaría algo como *"¿Es urgencia?"* o *"Primera ayuda MMC"* y haría cinco cosas:
decidir urgencia (anda ahora / hoy / mañana), preparar la visita al veterinario, explicar
en simple lo que le dijeron, cuidado preventivo, y **derivar al negocio del club que
corresponde por comuna**. Ese último punto es el que lo convierte en motor del modelo: el
bot le lleva clientes a los negocios, y eso es lo que después justifica cobrarles.

Reglas duras del prompt: nunca recetar medicamentos ni dosis, nunca decir "no es nada",
y ante señales de alarma (no respira bien, convulsiona, sangra, no orina, comió algo
tóxico, parto con problemas) cortar y mandar al veterinario. Más un aviso visible y
aceptado antes de la primera consulta: *"orientación, no diagnóstico"*.

**El costo no es el obstáculo.** Precios consultados el 30 de septiembre, por millón de
tokens: Gemini 3.1 Flash-Lite US$0,25 entrada / US$1,50 salida; Gemini 3.8 Flash
US$0,75 / US$3,75; Claude Haiku 4.5 US$1 / US$5. Una consulta de 5-6 mensajes sale entre
**$4 y $15 pesos**. Con 120 consultas al mes son menos de $2.000 al mes — un solo pase de
fundador paga el bot de todos. Gemini además tiene capa gratuita para probar.

**Arquitectura prevista** (la misma de `aviso-canje.js`): una Netlify Function que valida
el token de sesión y que el correo esté en `fundadores`, llama a la API y guarda en una
tabla `consultas_ia` con tope de 20 consultas al mes por socio. **La clave de la API va en
la función, nunca en el navegador.** Ojo: las invocaciones de función también consumen
créditos de Netlify.

**Antes de construirlo, validarlo gratis:** ofrecer en el grupo de fundadores que escriban
sus dudas y contar cuántas llegan en tres semanas. Si llegan dos, no es el beneficio que
la gente quiere. Si llegan cuarenta, es el producto — y además quedan las preguntas reales
para escribir el prompt.

**Orden acordado: negocios → registro de negocios → bot.** Sin negocios a los que derivar,
el bot pierde la mitad de su gracia.

---

## Dónde quedó todo al 1 de octubre

### Créditos de Netlify — los números reales (verificados el 1 de octubre)

Mirado en app.netlify.com → equipo JFD → Usage & billing. **Esto ya no es estimación.**

- **Plan Personal, US$9 al mes: 1.000 créditos mensuales.** No es el plan gratis.
- **Un deploy de producción cuesta exactamente 15 créditos** (975 créditos ÷ 65 deploys
  del ciclo de septiembre). O sea: **el presupuesto real son unos 66 deploys al mes,
  unos 2 por día.**
- **Los créditos NO se acumulan:** vencen al cerrar el ciclo. Lo que no se usa se pierde.
- El ciclo va **del 3 de un mes al 2 del siguiente**, y los créditos nuevos se otorgan el
  día 2. (Septiembre: otorgados el 2, vencen el 2 de octubre.)
- **Auto recharge está DESACTIVADO** y así debe quedarse: es la protección contra una
  cuenta sorpresa.

**Todo lo demás es ruido.** Desglose del ciclo de septiembre: deploys 975 créditos
(99,6%), peticiones web 2,5 (12.342 visitas), ancho de banda 1,5 (0,07 GB), funciones
0,3. Total 979,2. **No hay nada que optimizar en imágenes, tráfico ni funciones** — una
sospecha que se tuvo el 1 de octubre y los datos descartaron. El único gasto que existe
es desplegar.

**Las tres reglas que devuelven holgura, sin cambiar de plan:**

1. **`[skip ci]` en todo commit que solo toque archivos `.md`.** No construye, no cuesta.
2. **Juntar los cambios y subir una vez.** Un push con ocho archivos cuesta lo mismo que
   uno con un archivo.
3. **Probar en local antes de subir.** Los deploys que se van en nada son del tipo "me
   faltó una coma", y son los que de verdad drenan el mes.

Con eso, 66 deploys al mes sobran. Subir de plan solo tendría sentido después de aplicar
las tres reglas y seguir quedando corto: hoy sería pagar por un problema de método.

**Desplegado el 1 de octubre, con los últimos 15 créditos del ciclo** (vencían esa noche,
así que o se usaban o se perdían):

- ✅ **El chip como opción visible** en el registro: el "lo hago después" dejó de ser un
  enlace gris al 42% de opacidad y pasó a ser un bloque propio con su botón **"Continuar
  sin el chip"**. Solo CSS y texto; la lógica del registro no se tocó.
- ✅ **El grupo de WhatsApp cerrado a fundadores** (ver la sección de arriba).

### PUSH 1 del ciclo de octubre — ✅ HECHO Y PROBADO el 3 de octubre

Fundador automático y verificado + límites del código por correo. El detalle está más
arriba. **El orden importa:**

1. ✅ Sacar el Access Token de **producción** de Mercado Pago y pegarlo en Netlify como
   `MP_ACCESS_TOKEN` (Site configuration → Environment variables).
2. ✅ Correr `supabase-fundador-verificado-v30.sql` en Supabase (SQL Editor). Es
   compatible con el sitio que está en línea: nada se rompe antes del push.
3. ✅ `git add .` → `git commit` → `git push` (15 créditos).
4. ✅ QA en mimascotaclub.cl (lista abajo; resultado más arriba).
5. ✅ Correr `supabase-cerrar-socio-existe-v31.sql`. **Después** del push, nunca antes.
6. ✅ Borrados los fundadores de prueba #001 y #002 (la tabla quedó vacía: el primero
   real será el #001). ✅ "Aprobar nuevos miembros" confirmado.

**QA:**

- `/mi-mascota`: entrar con un correo inscrito (llega el código) y con uno que no (mismo
  mensaje, no llega nada).
- Escribir mal el código 5 veces: el quinto anula el código y hay que pedir otro.
- Pedir 6 códigos seguidos al mismo correo: el sexto dice que esperes 15 minutos.
- Registro nuevo de punta a punta (el código del registro también pasa por los límites).
- Entrar a `/mi-negocio` con el código de un negocio.
- `/quienes-somos` → "Quiero ser Socio Fundador": con sesión, sin sesión y siendo ya
  fundador.
- Abrir a mano `mimascotaclub.cl/gracias?payment_id=1234567890`: **no debe activar nada
  ni mostrar el grupo.**
- Un pago real de $9.990 hecho por alguien de confianza (uno no se puede pagar a sí
  mismo), tocar "Volver a Mi Mascota Club", ver el número, revisar que llegó el correo de aviso, y
  devolver el pago desde Mercado Pago. Después, quitar ese fundador de prueba en
  `/mi-panel`.


### El resto del ciclo de octubre, agrupado por push

Cada push son 15 créditos. Con 1.000 al mes hay espacio para 66, así que **lo que se
cuida no es el número de pushes: es no gastar cinco en una tarde corrigiendo.** Un push
por bloque de trabajo, probado antes de subir.

**PUSH 2 — el flujo de negocios.** Es lo que sigue después del fundador, porque el
formulario de negocios es lo primero que ve un local cuando Jaime le manda el link y hoy
se ve de otra época al lado del de dueños.

- 🟡 Migrar `formulario-negocio-v3.html` al estilo del registro (OTP + mascota animada).
  **Construido el 3 de octubre, falta SQL v32 + push + QA** (ver "Formulario de negocios
  nuevo" más abajo).
- ⬜ Revisar que aprobar fichas desde el celular en `/mi-panel` siga cómodo.
- **En paralelo, Jaime diseña el look and feel de cómo se ven los negocios** (tarjetas y
  ficha). La IA trabaja el formulario y no toca el diseño de las fichas hasta que él lo
  entregue.

**PUSH 3 — "Recomienda un negocio".** Votos sobre el buzón de sugerencias y las
etiquetas "Recomendado por X socios" / "Nuevo en el club". Tiene sentido cuando haya
socios suficientes para que la lista no se vea muerta.

**Gratis, sin tocar créditos, y es lo que de verdad mueve el proyecto este mes:**

- ⬜ Escribirle a los primeros **5 negocios** (mensajes en `NEGOCIOS-CAPTACION.md`).
  **Espera al formulario de negocios terminado y probado** (decidido el 3 de octubre):
  no se invita a nadie a un formulario que todavía no está listo.
- ⬜ Escribirle a las primeras **5 personas**.
- ⬜ Las dos fotos para la landing (Jaime con Max, el carnet).
- ⬜ Preguntar en el grupo si quieren el asistente y contar cuántas dudas llegan en tres
  semanas: así se valida el bot sin construirlo.

**La prueba cerrada va en curso** con conocidos (se bajó de 15 a 5 personas para partir).
Después de eso: reiniciar contadores, encender el interruptor de verificación, volver a
mostrar el botón de compartir y recién ahí abrir al público.

---

## Formulario de negocios nuevo — CONSTRUIDO (3 de octubre), falta activarlo

Ruta pública: **`/formulario-negocio`** (sirve `formulario-negocio-v3.html`; el nombre del
archivo no se cambió para no romper enlaces). Decisiones de Jaime del 3 de octubre:

- **Preguntas agrupadas por tema (9 pantallas)**, no una por pantalla (serían ~25).
- **El correo se confirma en la pantalla del responsable**, cerca del final, no al
  principio: pedir un código antes de contar nada es una barrera.
- **Mismo estilo que el registro de dueños** (fondo negro, eyebrow turquesa, botón
  amarillo, barra de progreso arriba, la mascota en el código). Lo que Jaime diseña en
  paralelo es cómo se ven los negocios **en el directorio y en su ficha**, no el
  formulario.

Lo construido:

- `css/mmc-negocios-oscuro.css` (nuevo): el estilo oscuro. Redefine las variables de
  color dentro de `.form-shell` y las vuelve a dejar claras dentro de `.preview-frame`,
  así la vista previa de la ficha se ve como en el directorio.
- **Paso 8 nuevo, "Confirma tu correo"**: el código se manda solo al llegar, la mascota
  se tapa los ojos, y al acertar pasa sola a la vista previa. Si vuelve atrás a corregir
  algo, no se le pide el código de nuevo, salvo que cambie el correo.
- **Verificación en el servidor** (`supabase-negocio-correo-v32.sql`): al acertar el
  código, `negocio_verificar_correo()` entrega un comprobante de 2 horas, y
  `registrar_solicitud_negocio()` **rechaza la inscripción sin ese comprobante** o si es
  de otro correo. El comprobante se gasta al inscribir. Usa los mismos límites del v30.
  El registro de dueños **no** tiene esto todavía (allá se revisa en el navegador).
- **Textos nuevos** según `NEGOCIOS-CAPTACION.md`: fuera "miles de dueños" y "clientes
  que ya pagan una membresía"; ahora dice gratis el primer año, lo único que se pide es
  un beneficio, y nada se publica sin que el negocio lo vea.
- **Guarda el avance** en el navegador (`mmc_negocio_borrador`, 30 días). Al volver ve
  "Seguir donde quedé / Empezar de cero". Las fotos y el correo confirmado no se guardan.
- En el teléfono la vista previa parte en "Mobile", y el marco se ensanchó para que la
  ficha no se corte (la ficha necesita ~345 px).

**Para activarlo, en este orden:**
1. ⬜ Correr `supabase-negocio-correo-v32.sql` en Supabase, **justo antes del push**
   (desde ahí el formulario viejo ya no puede inscribir; hoy no hay negocios invitados).
2. ⬜ Push.
3. ⬜ QA en `mimascotaclub.cl/formulario-negocio`, con un negocio de prueba:
   las 9 pantallas, un tipo con local y uno sin local, el código (uno malo y el bueno),
   "Cambiar correo", cerrar a la mitad y "Seguir donde quedé", la vista previa en el
   teléfono, enviar, y verla llegar a `/mi-panel` → Fichas por aprobar. Después,
   rechazarla para dejar la cola limpia.

### QA del 3 de octubre y lo que trae el push siguiente

**Lo que salió del QA (con un negocio de prueba real, "Gloria Pet Salon Rojas"):**

- El formulario, el código, la vista previa y el envío funcionaron. La verificación del
  correo funcionó de punta a punta en el servidor.
- **Error "HTTP 520" al enviar:** los registros de Supabase muestran que el logo subió
  bien y la **foto (PNG de 1,4 MB) falló con un 520 de Supabase Storage**, una falla
  momentánea del servidor. Al apretar Enviar otra vez pasó. Quedó un logo suelto del
  primer intento en el bucket `negocios` (limpiar junto con los archivos de prueba).
- **En /mi-panel, en el teléfono, la ficha se cortaba por la derecha.** Causa: el
  componente `.mmc-ficha` no se encogía bajo ~345 px (hijos de grid/flex sin
  `min-width:0`, el tipo de negocio sin corte de línea y la foto con `min-height:200px`
  + `aspect-ratio 16/10`, que obligaba a 320 px). Afectaba también a `/negocio/<slug>` y
  a la vista previa del formulario en teléfonos angostos.
- La solicitud de prueba **se deja en la cola a propósito** para seguir probando (Jaime).

**Push siguiente (construido el 3 de octubre, un solo push):**

1. `css/mmc-ficha.css`: la ficha se encoge bien hasta 290 px (probado en 290, 320, 350
   y 700). Es un arreglo de base; el rediseño de la ficha lo hace Jaime aparte.
2. Formulario: las imágenes se **achican antes de subir** (foto a JPG de 1600 px, logo a
   PNG de 800 px), **se reintenta hasta 3 veces** si Supabase falla, no se vuelven a
   subir si ya subieron en un intento anterior, y los errores técnicos se muestran como
   "Tuvimos un problema… vuelve a apretar Enviar: tus datos no se perdieron". La foto
   ahora acepta hasta 15 MB antes de achicarla.
3. Correos de negocios con la plantilla genérica y `ocultar_socio: 'si'`:
   - **"Recibimos la inscripción de …"** al negocio, al enviar el formulario;
   - **"Nueva ficha por aprobar — …"** a Jaime, al enviar el formulario;
   - **"Tu ficha ya está publicada"** al aprobar en `/mi-panel`, con el **código NEG** y
     el enlace a `/mi-negocio` (función `avisoNegocio()` en `js/app.js`);
   - **"Hay que ajustar algo de tu ficha"** al rechazar, con el motivo.
   Si un correo falla, `/mi-panel` lo dice ("pásale su código a mano").
4. `ocultar_socio: 'si'` en los avisos a Jaime (`activar-fundador.js` y
   `aviso-canje.js`): se acabó el "Cómo se usa" en esos correos.

**QA del push (3 de octubre, noche) — TODO OK:** la ficha ya no se corta en /mi-panel en
el celular; inscripción con foto de celular sin errores; llegaron "Recibimos la
inscripción" y "Nueva ficha por aprobar" sin bloques de socio; al rechazar llegó "Hay que
ajustar algo" con el motivo; al aprobar llegó "Tu ficha ya está publicada" con el código;
el negocio entró a `/mi-negocio`, confirmó una visita de Max (folio C-2UPC, compra
$35.000) y a Jaime le llegó el aviso de canje sin "Cómo se usa".

### ⚠️ Datos de prueba que se dejan A PROPÓSITO (decidido el 3 de octubre)

Jaime los deja para ver cómo queda la **nueva visualización de los negocios** (directorio
y ficha) con datos reales. **Se borran después de afinar ese diseño**, todo junto:

- Negocio **NEG0002 "GLORIA PET SALON ROJAS"**, publicado en el directorio (fundador #002).
- Sus 2 solicitudes (una aprobada, una rechazada "v2").
- El canje de prueba **C-2UPC** (Max en Gloria Pet Salon).
- Las imágenes de prueba en Storage → `negocios` (incluido el logo suelto del error 520).

**Al limpiar, reiniciar el contador de negocios.** El código NEG y el número de "negocio
fundador" salen de la secuencia `negocio_seq` (en `aprobar_solicitud_negocio`), que nunca
retrocede: el NEG0001 se lo llevó el negocio de demostración borrado el 26 de septiembre,
y por eso el de prueba salió NEG0002 / fundador #002. Con la tabla `negocios` vacía:
`select setval('negocio_seq', 1, false);` → el primer negocio real será **NEG0001 y
fundador #001**.

### Los correos a los negocios (pendiente, conversado el 3 de octubre)

EmailJS gratis da **2 plantillas** y están las dos ocupadas:

- **La del código** (`EMAILJS_TEMPLATE_ID_OTP`) es 100% genérica ("Tu código de acceso…
  escríbelo en la pantalla donde lo pediste"). **Sirve tal cual para negocios**, y ya la
  usa `/mi-negocio`.
- **La genérica de avisos** (`template_u9x5p1i`) **no sirve tal cual para negocios**:
  trae fijos bloques pensados para el dueño ("Cómo se usa: llegas al negocio y muestras
  tu carnet…", "Ayúdanos a hacer crecer el club", "puedes borrar tu cuenta desde tu
  carnet"). Es el mismo problema que se vio en el aviso de fundador.

**Plantilla genérica de verdad — HECHO el 3 de octubre.** La plantilla `template_u9x5p1i`
en EmailJS ya tiene la variable `ocultar_socio` (archivo de respaldo:
`emailjs-template-avisos.html`). Usa las "secciones" de EmailJS: los 4 bloques de socio
van entre `{{^ocultar_socio}}` y `{{/ocultar_socio}}`, siempre **dentro** de un `<td>`.
Sin la variable, el correo sale igual que antes; con `ocultar_socio: 'si'` salen sin
"Cómo se usa", sin "Ayúdanos a hacer crecer el club" y el pie solo con los términos.
Probado con "Test It" en los dos casos. (Un primer intento poniendo la variable dentro de
los `style` no funcionó: no usar ese método.)

**Hoy al negocio no le llega ningún correo** ni al inscribirse ni al aprobarse: el código
de negocio (NEG…) y el enlace a `/mi-negocio` se los pasa Jaime a mano. **La solución
propuesta:** sacar esos bloques fijos a una variable, para que la plantilla sea genérica
de verdad, y armar los correos "Recibimos tu inscripción", "Tu ficha está publicada (tu
código es NEG…)" y "Hay que ajustar algo". Para eso hace falta el HTML **actual** de la
plantilla, copiado desde EmailJS (el `emailjs-template-bienvenida.html` del repo está
desactualizado).

## Pendientes, en orden

**El flujo del dueño está cerrado, y desde el 3 de octubre el del pase fundador también
(automático, verificado y probado con pagos reales).** Lo que queda abajo es otra cosa.

### 🚀 LANZAMIENTO — 11 de octubre de 2026 (decidido por Jaime)

Jaime lanza **mañana con lo que hay**: invita a dueños y negocios a sumarse, con una
historia propia diciendo que el club está comenzando.

- **Directorio vacío a propósito.** Gloria (NEG0002, prueba) sale con
  `supabase-limpiar-prueba-v33.sql` (borra canje C-2UPC, sus 2 solicitudes y el negocio,
  y reinicia `negocio_seq` → el primer negocio real será **NEG0001 / fundador #001**).
  Las imágenes de Storage NO se borran: el logo lo usa `/ejemplo-ficha`.
- Con 0 negocios, el directorio muestra **"Próximamente aquí se agregarán negocios"** +
  botón **"Recomiéndalo aquí"** → `/sugerencias` (bloque `.dir-pronto` en js/app.js).
- Al 10 de octubre: 17 socios (14 sin verificar), 0 fundadores, 0 negocios reales.

- **Se puede instalar como app (PWA), en el mismo push del lanzamiento.** Archivos:
  `manifest.webmanifest` (nombre, colores, abre en `/mi-mascota`), `sw.js` (NO guarda copias:
  cada push llega a todos), `js/instalar-app.js` y los íconos en `assets/app/`. En
  `/mi-mascota` aparece el botón **"📲 Instalar la app en mi celular"**: en Android abre el
  instalador; en iPhone muestra los 3 pasos (Safari → Compartir → Agregar a pantalla de
  inicio). Probado: Chrome la reconoce como instalable, sin errores.
  **Falta (siguiente etapa):** notificaciones push (llaves, tabla en Supabase, botón
  "Activar avisos" y envío desde /mi-panel).

**Después del lanzamiento, en este orden:**
1. Escribirles a los primeros 5 negocios (formulario listo) y mostrarles `/ejemplo-ficha`
   y las fichas de especialista de ejemplo.
2. Revisar las recomendaciones que lleguen a `/sugerencias` y contactar esos negocios.
3. Resolver a los 14 socios sin verificar y decidir el interruptor de verificación.
4. Consultar al contador por la boleta de las membresías.
5. Campos `profesion` / `especialidad` / `modalidad` en el formulario (especialistas reales).
6. Afiche con QR, páginas por categoría, "Recomienda un negocio".
7. Ideas para después: dashboard en vivo, PWA con notificaciones, avatar de la mascota,
   estrellas y reseñas reales, mapa.

### La lista corta (acordada el 3 de octubre, Jaime pide que se le recuerde cuando la pida)

**Antes de seguir cobrando a escala**
1. Consultar al contador por la boleta de las membresías (se cobra igual mientras tanto).

**Negocios — lo que sigue**
2. ✅ Formulario de negocios al estilo del registro de dueños (código por correo + mascota), con correos a negocios. *En producción y probado el 3 de octubre.*
3. ✅ Aprobar fichas desde el celular en `/mi-panel` (la ficha ya no se corta; probado el 3 de octubre).
4. Escribirles a los primeros 5 negocios — **recién con el formulario listo y probado.**
5. Afiche imprimible con el QR para el mesón.
6. Páginas por categoría (ej. `/veterinarias`) como material de venta.
7. ✅ **Ficha nueva — EN PRODUCCIÓN Y PROBADA (push del 7 de octubre; Jaime: "se ve perfecto")**:
   banner con el patrón negro al 30% (`assets/images/patron-negocios.svg`, sin el logo
   estirado), encabezado compacto (logo grande; al lado tipo + sello Verificado, estrellas
   y dirección; el nombre abajo en UNA línea, se achica solo), sello y estrellas
   preparados (aparecen solo si el negocio tiene `verificado = true`; las estrellas de
   arriba además necesitan calificaciones reales), y la **ficha de ejemplo para vender:
   `mimascotaclub.cl/ejemplo-ficha`** (Gloria, 4.9 ★ de muestra, no indexada, no enlazada). Sus datos están escritos en `FICHA_EJEMPLO`
   (js/app.js) y la foto en `assets/images/ejemplo/`; el logo todavía es el de Storage:
   **no borrar ese logo al limpiar los datos de prueba** (o pasarlo a `assets/`).
   La foto de Gloria (NEG0002) en el directorio real ya es la del letrero
   (`foto` = `/assets/images/ejemplo/gloria-letrero.jpg`, cambiada en Supabase el 7 de octubre).
   **Push siguiente (7 de octubre, decidido por Jaime):** se saca el banner grande de la
   ficha (repetía el nombre). En su lugar va una franja delgada con el patrón y la **miga
   de pan** "Directorio › Peluquería › Nombre" (`renderFichaFranja` en js/app.js). El
   banner grande con slides sigue en el directorio y demás páginas, para promos.
   Ajuste de Jaime (mismo día): la franja va **negra lisa, sin patrón**, y la ficha de
   ejemplo va **sin la franja amarilla "Ficha de ejemplo"** (eso lo explica él en persona).
   El patrón queda en `assets/images/patron-negocios.svg` por si se usa en otro lado.
   **Sigue mañana:** banner propio por negocio queda descartado en la ficha; revisar la
   tarjeta del directorio con el diseño de Jaime; después borrar datos de prueba
   (sin tocar el logo de Gloria) y reiniciar `negocio_seq`.
   Anotado para ese diseño (3 de octubre): (a) el banner de arriba de `/negocio/<slug>`
   usa el **logo estirado** y se ve pixelado (con Gloria Pet Salon se nota mucho): usar la
   foto del local, o un fondo de color; (b) sumar una **miga de pan** en la ficha
   ("Directorio › Peluquería › Gloria Pet Salon") con "← Volver a Peluquería", en vez de
   cambiar la URL (ver "Las URL de los negocios" en las reglas). Después: borrar los datos de prueba y reiniciar `negocio_seq` (ver "Datos de prueba que se dejan a propósito").

**Negocios — confianza y ficha pagada (conversado el 4 de octubre, después del diseño)**
7a. **Estrellas 1-5 y reseñas en las dos direcciones, estilo Uber.** La base ya existe;
    falta mostrarlas en tarjetas y ficha, y sumar reseñas escritas.
7b. **Regla de reputación:** los socios califican SIEMPRE a todos los negocios, pero las
    estrellas y reseñas se muestran solo si el negocio paga. Ver "Regla de confianza" en MARCA.md.
7c. **Mapa "abierto y cerca de mí"** con Leaflet + OpenStreetMap. Necesita coordenadas y
    horario estructurado (día / abre / cierra), no solo texto.
7d. **Sello "Verificado"** para negocios: un campo en Supabase + insignia, que se activa a
    mano desde `/mi-panel` cuando el negocio paga.
7e. **Ficha gratis vs. pagada.** Gratis: solo foto de portada, sin sello, sin estrellas ni
    reseñas visibles. Pagada: galería, sello Verificado, estrellas y reseñas.
7f. **Los 100 negocios fundadores** tienen todo lo pagado, gratis durante su año.
7g. **Servicio de fotografía con Valorgic** para los negocios que pagan.
7h. **Por definir:** el resto de la oferta gratis vs. pagada (referencia: Yelp).
7i. ✅ **Ficha de especialista CONSTRUIDA (9 de octubre, falta push y probar)**: diseño de
    Jaime (referencia tipo app médica): foto de la persona sobre degradado desenfocado
    **celeste** (salud: veterinario, etólogo…) o **amarillo** (entrenador, paseador,
    cuidador, grooming, fotografía), nombre grande, nota ★, barra de vidrio con "Ver
    beneficio" y redes; abajo franja Reseñas · Visitas del club · Comunas, beneficio,
    botón, Atiende en / Modalidad / Horario y descripción. Desktop: foto a la izquierda,
    datos a la derecha. Se activa sola cuando `es_especialista = true`
    (`renderFichaEspecialista` en js/ficha-negocio.js, estilos `.mmce` en css/mmc-ficha.css).
    Foto JPG (lo que guarda el formulario) = llena el recuadro y se funde; foto PNG/WebP
    recortada sin fondo = la persona parada sobre el degradado.
    **Fichas de ejemplo para vender** (fotos de banco, datos inventados, no indexadas):
    `/ejemplo-ficha/veterinaria`, `/ejemplo-ficha/etologo`, `/ejemplo-ficha/educador`
    (`FICHAS_EJEMPLO_ESP` en js/app.js, fotos en `assets/images/ejemplo/`).
    Falta: campos nuevos `profesion`, `especialidad` y `modalidad` en Supabase + formulario
    (hoy solo las fichas de ejemplo los traen); tarjeta del directorio para especialistas.
    Pedido original (9 de octubre):
    una versión de la ficha pensada para una persona, no un local (ej. veterinario a
    domicilio, etólogo, adiestrador). Por definir con el diseño de Jaime: foto de la
    persona en vez del logo/fachada, profesión y especialidad, comunas que cubre en vez
    de dirección, y si atiende a domicilio u online. Los datos base ya existen
    (`es_especialista`, `tiene_local`, `comunas_cobertura`).

**Lanzamiento — después de negocios**
8. "Recomienda un negocio" con votos + etiquetas "Recomendado por X socios" / "Nuevo en el club".
9. Volver a mostrar el botón "Compartir en historias".
10. Ofrecer el pase al terminar el registro.
11. Las dos fotos de la landing (Jaime con Max, el carnet).
12. Preguntar en el grupo de fundadores si quieren el asistente "¿Es urgencia?".

**Para abrir al público (decisiones)**
13. Terminar la prueba cerrada con las 5 personas.
14. Encender el interruptor de verificación, resolviendo antes a los socios en `registrado`.
15. Moderación de las fotos que suben los dueños.

**Estilo "vidrio" en negocios + historia nueva (10 de octubre) — ✅ en producción y probado por Jaime (historia compartida en Instagram)**
- Fichas y tarjetas de **negocio** con el mismo concepto que las de especialista:
  degradado desenfocado + paneles translúcidos (logo, categoría, beneficio, horario,
  redes). Misma foto, mismas posiciones, mismos datos. **Color por rubro** (decisión de
  Jaime): celeste = Veterinaria y Salud; amarillo = todo lo demás (`tonoNegocio()` en
  js/ficha-negocio.js; estilos "ESTILO VIDRIO" al final de css/mmc-ficha.css).
- **Historia de Instagram de la mascota** rediseñada (`generateShareCardBlob` en
  js/app.js): amarillo si es Socio Fundador (píldora "★ Socio Fundador #00X"), celeste
  si no; foto grande en marco de vidrio, nombre grande, Comuna · Especie · Miembro.
  **Corrección de Jaime:** la comparte cada dueño desde su Instagram PERSONAL, así que
  NO dice "link en bio" ni "¿Y tu mascota?": dice solo **"Únete gratis"** +
  **mimascotaclub.cl**. Foto: si viene sin fondo (PNG) se ve entera; si es una foto normal
  llena el marco y, si hay que recortar, se recorta más abajo que arriba para no cortar la cara.
  Sin código ni QR. Se volvió a mostrar el botón "Compartir en Instagram" en /mi-mascota.
  Las fotos de Supabase ahora se cargan con permiso de otro dominio (crossOrigin) para
  que el navegador deje generar la imagen.

- **Carnet en /mi-mascota** también en estilo vidrio (amarillo si es Fundador, celeste si
  no): logo, foto cuadrada con bordes redondos, nombre grande, QR en blanco puro con el
  código debajo, y Comuna · Especie · Estado. La raza "Mestizo/No sé" se muestra como
  **"Mestizo"** en carnet, historia y panel (`razaVisible()`); en el formulario sigue la
  opción completa, para quien no sabe la raza.

**Dashboard en vivo estilo Shopify (idea del 10 de octubre — después del lanzamiento)**
- En `/mi-panel`: personas dentro del sitio ahora mismo, registros nuevos de hoy/semana,
  fundadores, negocios inscritos, canjes, y un aviso en vivo cuando alguien se registra.
  Dificultad: contadores y registros nuevos 3/10 (los datos ya están en Supabase);
  "personas ahora mismo" 5/10 (Supabase Realtime con presencia, sin costo extra en el plan
  actual, sin cookies de terceros). ~1 push.

**Avatar de la mascota (idea del 10 de octubre — evaluar después)**
- Al subir la foto, ofrecer crear un avatar 3D estilo Disney de la mascota, con
  movimientos leves (rascándose, riéndose, invitando a jugar, acostándose), para
  historias y para la app. Dificultad estimada: avatar quieto 4/10, con movimiento 7/10.
  Se hace con servicios de IA de imagen y de video (función de Netlify con clave
  secreta); costo por imagen bajo y por clip mayor, así que conviene limitarlo
  (ej. 1 avatar para Fundadores, animaciones como beneficio Premium). Pedir 2 fotos
  (cara de frente y cuerpo entero). Primera prueba sugerida: con la foto de Max.

**App en el celular (después de negocios, conversado el 7 y 9 de octubre)**
- **PWA:** ✅ instalable desde el 11 de octubre. Falta: **notificaciones push**.
  Gratis, sin Google Play ni App Store. Los cambios llegan solos con cada `git push`
  (con un aviso "Hay una versión nueva · Actualizar" para que nadie quede con una copia
  vieja). En iPhone hay que instalarla desde Safari (*Compartir → Agregar a pantalla de
  inicio*) para recibir avisos. Trabajo estimado: ~1 push. Incluye botón "Activar avisos",
  guardar suscripciones en Supabase y enviar avisos desde `/mi-panel`. Las tiendas
  (Apple USD 99/año, Google USD 25 una vez) quedan para más adelante, usando la PWA de base.

**Mejoras chicas**
- Opción B del pago (vuelta automática + webhook).
- Sacar el bloque "Cómo se usa" de la plantilla genérica de EmailJS.
- Revisar a ojo la barra de menú en todas las vistas.

**Cuando haya volumen:** precios Pro/Premium fuera del registro, Preapproval, gamificación,
login con Google, `supabase-fix-foto.sql`.

El detalle de cada punto está en las secciones de abajo.

### Antes de cobrarle a alguien

0. ✅ **Fundadores de prueba borrados** (3 de octubre). La tabla está vacía y el primero
   real será el #001.

**Formalización: decidido el 25 de septiembre que NO es bloqueante.** Jaime parte sin
formalizar y valida primero; si el pase de fundador se llena, con esa plata paga la
formalización. No volver a plantearlo como impedimento para lanzar. Queda anotado en
`LANZAMIENTO.md` para cuando haya volumen — y ojo, no hace falta crear una empresa: el
inicio de actividades como persona natural es online y gratis.

### Para poner el club en marcha (no es construir, es decidir)

1. **Borrar las mascotas de prueba** y **resolver los socios viejos**: los inscritos antes
   del parche v25 quedaron en `registrado` y no van a poder canjear cuando se encienda el
   bloqueo. Ver el bloque de arriba con el SQL.
2. **Encender el interruptor** en `/mi-panel` → Ajustes del club.
3. **Conseguir negocios.** Es el verdadero cuello de botella: un club de beneficios con
   cero beneficios no retiene a nadie, por muy bien construido que esté el registro.
   **El modelo de cobro, el orden de a quién escribirle y los mensajes exactos están en
   `NEGOCIOS-CAPTACION.md`** (30 de septiembre).

### Deuda real del flujo del dueño

4. **Moderación de las fotos** que suben los dueños — hoy no hay ninguna revisión y
   cualquiera puede subir cualquier imagen como foto de su mascota. Es el único agujero
   que queda de este lado.
5. **Contenido y tips para dueños.** La estrategia del 10 de septiembre era captar dueños
   gratis dándoles valor desde ya, mientras hay pocos negocios. Ese valor todavía no existe.

### Menú y navegación — RESUELTO el 25 de septiembre

- ✅ **La página activa se marca sola** en negrita, en celeste y con una línea debajo. Lo
  hace `marcarNavActivo()` en `js/app.js`, que compara la URL con el `href` de cada enlace.
  Como el sitio navega con `history.pushState`, esa función se envuelve una sola vez en
  vez de tocar las veinte funciones `irA...()`: menos invasivo y menos riesgo.
- ✅ En `/quienes-somos`, que no carga `app.js`, la clase `activo` va escrita a mano.
- ➖ Los formularios de registro y de negocio **no llevan barra a propósito**: son
  pantallas de una sola tarea y un menú ahí solo invita a abandonarlas.
- ⬜ Queda revisar a ojo el resto de las vistas (directorio, fichas, legales, paneles)
  para confirmar que la barra se ve igual en todas.

**Si agregas o sacas una categoría del desplegable, hay que tocarla en los dos lados:**
`CATS_MASCOTA` / `CATS_DUENO` en `js/app.js` y el HTML de `quienes-somos.html`.

### Del lanzamiento, lo que falta construir

5b. **"Recomienda un negocio"** — adaptar el buzón de sugerencias (v21) para que los socios
   nominen negocios, con contador de votos. Es la pieza que sostiene la promesa de la
   landing: *"cada semana visitamos al negocio más recomendado"*. Hoy está prometido y no
   existe. Es lo más urgente de esta lista.
5c. **Etiquetas en las fichas**: "Recomendado por X socios" y "Nuevo en el club".
5d. **Botón "Compartir en historias"** en `/mi-mascota`, que genere la imagen vertical del
   carnet con la insignia de fundador. Es el motor del boca a boca.
5e. **Bloque "Únete a la comunidad"** en `/mi-mascota` y al final del registro, con el link
   de la Comunidad de WhatsApp (falta crearla).
5f. **Ofrecer el pase fundador al terminar el registro**, que es el momento de más ganas.
5g. **PWA**: `manifest.json`, íconos y service worker para que el sitio se instale en el
   teléfono como una app.
5h. **Latitud y longitud en `negocios`**, para que el mapa tenga datos cuando valga la pena
   mostrarlo (unos 15-20 negocios). Leaflet ya está cargado en el sitio.

### Flujo de los negocios (el que sigue)

6. **Migrar el formulario de negocios al estilo v3** (OTP + mascota animada). Es lo primero
   que ve un negocio cuando Jaime le manda el link: hoy se ve de otra época al lado del de
   dueños.
7. **Afiche imprimible con el QR** para el mesón del negocio.
8. **Páginas de categoría curadas** (ej. `/veterinarias`) como material de venta.

> **Corrección (18 de septiembre):** esta lista decía que al formulario de negocios le
> faltaba la casilla de consentimiento. **Es falso**: tiene dos, las dos obligatorias, y
> `registrar_solicitud_negocio` las valida en el servidor desde el parche v24 del 13 de
> septiembre. La nota venía de la sección 23.3 del CONTEXTO, escrita antes de ese parche.
> Lo que sí estaba mal y se arregló: registraba `terminos_version: '2026-09-13'` cuando los
> términos publicados son del 17. **Al editar los términos hay que cambiar esa fecha en los
> DOS formularios**, el de dueños y el de negocios.

### Cuando haya volumen

10. **Sacar los precios del formulario de registro** (Pro $2.990 / Premium $4.990). La
    página `/planes` se sacó del menú justo para no anclar precios: es incoherente.
11. **Mercado Pago Preapproval + webhook** (cobro recurrente). Solo hay plan de pasos.
11b. ✅ **Validar el pago contra la API de Mercado Pago** — hecho el 3 de octubre
    (`activar-fundador.js`). Lo que queda para cuando haya volumen es el **webhook** de
    Mercado Pago, para activar también a quien cierra Mercado Pago sin volver al sitio.
12. **Gamificación** (insignias, racha, referidos) — ver "Decidido pero sin construir".
13. Login con Google (prioridad baja, el acceso por correo ya cubre el caso).
14. `supabase-fix-foto.sql` sigue sin resolver (firma de función en conflicto).

> **Corrección:** una versión anterior de esta lista decía que el QR del carnet no se
> escaneaba. Es falso desde el 12 de septiembre: el QR lleva a `/validar/<codigo>`, el
> negocio lo escanea con la cámara del teléfono y el código del socio llega puesto solo.

---

## Manuales pendientes en paneles externos

- **Supabase → Storage → bucket `negocios`:** quedan 4 archivos de prueba por borrar. Sin
  apuro: Jaime decidió (21 de septiembre) que no es necesario por ahora.

Resueltos (verificado el 21 de septiembre):

- ✅ **Registro público de Supabase Auth: APAGADO.** "Allow new users to sign up" está
  desactivado. El sitio no usa el login de Supabase, así que no rompe nada.
- ✅ **Botón "Ver el carnet" en el correo de bienvenida:** ya estaba hecho. Esta lista lo
  daba como pendiente por error.
- ➖ **Protección de contraseñas filtradas (HaveIBeenPwned):** se descarta. El sitio no usa
  contraseñas (todo el acceso es por código OTP al correo), y en el plan gratis de Supabase
  la opción ni siquiera aparece.

---

## Reglas del proyecto que no hay que romper

- **Nadie queda bloqueado en el mesón.** Si un socio no puede canjear, se entera antes —
  en su carnet, en `/mi-mascota` o en el correo— nunca frente al cajero. Es la misma razón
  por la que el correo del negocio se pide recién al confirmar la primera visita.
- **El canje lo confirma el negocio, no el socio.** El negocio es el que regala el
  descuento y no tiene incentivo para inventar visitas.
- **Una sola plantilla de ficha** (`/negocio/<slug>`). **Las URL de los negocios
  (conversado el 3 de octubre):** la dirección de un negocio es siempre
  `/negocio/<nombre>`, sin la categoría adentro (no `/directorio/peluqueria/<nombre>`),
  porque un negocio puede estar en varias categorías o cambiar de categoría, y su enlace
  (el que comparte en Instagram, el del afiche con QR) no debe cambiar ni duplicarse
  nunca. El orden visual se da con la miga de pan dentro de la ficha. Las categorías son páginas curadas
  que apuntan a ella, no rutas nuevas.
- **Un solo campo de estado de verificación** en la base. Cada panel muestra solo lo que
  le corresponde: el negocio ve si el socio puede canjear, nunca el chip ni la cartilla.
- **El club es full mascotas** (decidido el 18 de septiembre; reemplaza la regla anterior).
  Un negocio entra solo si es pet-friendly o tiene una especialidad de mascotas — un
  tatuador entra si hace retratos de mascotas, no por ser tatuador. Se descartó la versión
  anterior del concepto ("compensar el gasto de tener mascota con beneficios en otras áreas
  de la vida"), cuyos candidatos eran un gásfiter, un electricista y una relojería.
  **Consecuencia: el pipeline de negocios volvió a cero y hay que reclutar en veterinarias
  y peluquerías caninas, donde no hay contactos previos.**
- **El porqué vive en `MARCA.md`** y manda sobre las decisiones de producto: querer a un
  animal no debería salir tan caro; las mascotas no son un negocio, son vida. Lema:
  *Porque son familia.*
- **Nunca prometer "ahorra 50 mil al mes".** Con 100 mil de gasto mensual y descuentos de
  10-15%, el ahorro real es de 10 a 15 mil — que ya es 2 o 3 veces la membresía y es
  verdad. La frase que se usa siempre es **"se paga sola con un baño"**.
- **Probar siempre en 360×600**, no solo en iPhone. Es donde aparecen los problemas de
  scroll y es un teléfono muy común en Chile.
- **Nunca `width:100vw`, siempre `width:100%`.** El 18 de septiembre se encontró que el
  `.stage` del formulario en `100vw` estiraba la página unos 40px en Android y empujaba el
  contador de pasos fuera de la pantalla: se leía "11 /" en vez de "11 / 12". `100vw` mide
  el viewport ideal, no lo que se ve. Lo mismo vale para el campo trampa anti-bots, que
  heredaba `width:100%` de la regla global de los inputs y medía 360px de ancho aunque
  estuviera fuera de pantalla: va en `position:fixed` y 1px.
- **Un archivo escrito no es un archivo guardado.** El 17 de septiembre un cambio se dio por
  subido, el commit llevaba su nombre y el código nunca llegó al repo. Después de escribir
  algo importante, leerlo de vuelta antes de decir que está listo.
- **Nada del chip puede hacer fracasar una inscripción.** Duplicado, mal formato o foto
  pesada: se inscribe igual y se avisa.

---

## Estrategia de lanzamiento vigente (actualizada el 30 de septiembre)

Captar **dueños primero, gratis**, dándoles contenido y beneficios desde ya. Después usar
el número de dueños inscritos como argumento de venta ante los negocios.

**Lo que cambió respecto al 10 de septiembre:** ya no son "2-3 meses gratis para los
primeros 20-30". El modelo acordado es **12 meses gratis para los primeros negocios, con
el precio normal publicado desde el día uno y congelado para ellos**, más un nivel gratis
permanente (estar listado en el directorio). Lo que se cobra es la visibilidad y los
datos, no la existencia. Todo el detalle, con los mensajes, en `NEGOCIOS-CAPTACION.md`.

Reparto de trabajo: **Jaime hace el QA de los flujos, la IA avanza en el desarrollo.**
