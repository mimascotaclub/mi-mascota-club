# ESTADO — Mi Mascota Club

**Última actualización: 3 de octubre de 2026**

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

**El circuito que está HOY en producción (con paso manual):**

1. La persona paga en el link de Mercado Pago (`https://mpago.la/1gq8qDj`).
2. Mercado Pago la devuelve a `/gracias`, que muestra el check, el contador de cupos y un
   botón de WhatsApp al **+56 9 9713 2591**.
3. La persona avisa por WhatsApp.
4. Jaime confirma el pago en Mercado Pago y la marca en `/mi-panel` → Socios Fundadores.

### Fundador automático — DISEÑADO, falta construir (1 de octubre)

**Decisión del 30 de septiembre: el paso de "avísame por WhatsApp" se elimina.** Es el
peor momento posible para pedirle un trámite a alguien: acaba de pagar y está contento.
Lo que se creía inevitable no lo era — el correo no hay que pedirlo *después* de pagar,
hay que pedirlo *antes*, que es donde cualquier compra lo pide y nadie se molesta.

**El flujo nuevo, en tres partes:**

1. **En `/quienes-somos`, antes de ir a Mercado Pago.** El botón del pase ya no manda
   directo a pagar. Abre un paso de una sola pregunta:
   - Con sesión iniciada: no pide nada. Muestra *"Vas a activar tu pase como xxx@xxx"*
     y el botón de pagar.
   - Sin sesión: un campo de correo, validado contra `socios` con `socio_existe()`. Si no
     existe, lo manda a registrarse. **Esto además cierra un agujero de hoy: que alguien
     pague sin estar registrado y quede en tierra de nadie.**
   - El correo se guarda en `localStorage` antes de salir a pagar.
2. **Mercado Pago no se toca.** No se depende de que el pagador escriba nada ahí — el
   correo de su cuenta de Mercado Pago casi nunca va a ser el del registro.
3. **En `/gracias`, cero preguntas.** Lee `payment_id` / `collection_id` de la URL,
   recupera el correo por sesión o por `localStorage`, llama a `activar_fundador()` y
   muestra *"Listo. Eres el Socio Fundador #007"*. El grupo de WhatsApp queda como
   invitación, no como obligación.
   - **No se promete ningún plazo.** Se activa en dos segundos; decir "en 48 horas" sería
     hacerse ver más chico de lo que se es.
   - Plan B visible solo si falla: un campo *"Confirma el correo con el que te
     registraste"*. No es el camino normal.
   - Plan C invisible: si el correo no está en `socios` o no quedan cupos, el pago cae en
     `fundadores_pendientes` con el id de la operación y Jaime lo ve en `/mi-panel`.
     **Nadie que pagó queda en el aire.**

**Riesgo asumido a conciencia:** `activar_fundador()` exige un `payment_id` de al menos 6
dígitos, pero **no le pregunta a Mercado Pago si ese pago existe de verdad**. Alguien que
entienda cómo funciona podría escribir la URL a mano y marcarse como fundador sin pagar.
Se asume porque: hace falta buscarlo a propósito, Jaime ve todos los pagos reales en
Mercado Pago, el id queda guardado para cruzar, y quitar a alguien es un botón en
`/mi-panel`. **Se cierra cuando haya volumen o cuando suba el precio**, con una Netlify
Function que consulte la API de Mercado Pago antes de activar (ver "Cuando haya volumen").

| Pieza | Estado |
|---|---|
| `supabase-fundador-auto-v29.sql` escrito | ✅ En el repo |
| Correrlo en Supabase | ⬜ **Gratis, se puede hacer en cualquier momento** |
| Paso del correo antes de pagar en `quienes-somos.html` | ⬜ Falta |
| Activación automática en `gracias.html` | ⬜ Falta |
| Bloque de pagos pendientes en `/mi-panel` | ⬜ Falta |
| Validar el pago contra la API de Mercado Pago | ⬜ A futuro, no urgente |

El SQL agrega la tabla `fundadores_pendientes` y las funciones `socio_existe()`,
`activar_fundador()`, `admin_fundadores_pendientes()` y `admin_resolver_pendiente()`.
Todas `volatile` (ver la trampa más abajo). No borra ni modifica nada existente.

| Pieza | Estado |
|---|---|
| Parche `supabase-fundadores-v28.sql` | ✅ Aplicado |
| Landing `/quienes-somos` con el pase | ✅ Construido y probado |
| Contador "quedan X de 100" leyendo la base | ✅ Construido y probado |
| Link de pago de Mercado Pago conectado | ✅ Conectado |
| Bloque "Socios Fundadores" en `/mi-panel` | ✅ Construido y probado |
| Insignia "★ Socio Fundador #001" en el carnet | ✅ Construido y probado |
| Aviso por WhatsApp después de pagar | ✅ Construido — **se reemplaza por la activación automática** |
| **Emitir boleta por las membresías** | ⬜ **Falta: consultar al contador antes de cobrarle al primer fundador** |
| Cambiar el nombre del negocio en Mercado Pago | ✅ Cambiado |
| URL de retorno apuntando a `/gracias` | ✅ Puesta |

**La tabla `fundadores` tiene el correo como llave, no la mascota**, porque `socios` es una
fila por mascota y el pase es de la persona. Quien tiene tres perros ve la misma insignia
en los tres carnets.

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

**Queda un agujero conocido:** `/gracias` todavía muestra el botón del grupo y esa página
se puede abrir sin haber pagado. Se cierra con la activación automática, que solo mostrará
el botón si el pase se activó de verdad.

Revisar también que "Aprobar nuevos miembros" siga activado en los ajustes del grupo.
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

### ⬜ QUEDÓ FUERA del 1 de octubre — es el PUSH 1 del ciclo de octubre

Lo que estaba diseñado y **no se alcanzó a construir** esa noche, porque no quedaban
créditos para corregir si algo salía mal. **Sigue siendo lo primero de la lista.** El
diseño completo está más arriba, en "Fundador automático".

1. ⬜ **Correr `supabase-fundador-auto-v29.sql` en Supabase.** Gratis, no gasta créditos
   de Netlify, no toca el sitio. Se puede hacer antes que todo lo demás y conviene, para
   que al llegar al código las funciones ya existan.
2. ⬜ **Paso del correo antes de pagar, en `quienes-somos.html`.** Con sesión iniciada no
   pide nada y muestra el correo; sin sesión, un campo validado con `socio_existe()` que
   manda a registrarse si el correo no está. Guarda el correo en `localStorage` antes de
   salir a Mercado Pago.
3. ⬜ **`/gracias` automática, sin avisar por WhatsApp.** Lee `payment_id` de la URL,
   recupera el correo por sesión o `localStorage`, llama a `activar_fundador()` y muestra
   *"Listo. Eres el Socio Fundador #007"*. Sin prometer plazos. El botón del grupo se
   muestra **solo si la activación resultó**, y con eso se cierra el último agujero del
   grupo. Plan B: campo para confirmar el correo. Plan C: `fundadores_pendientes`.
4. ⬜ **Bloque de pagos pendientes en `/mi-panel`**, leyendo
   `admin_fundadores_pendientes()`.
5. ⬜ **QA antes del push**, y recién ahí `git add .` → `git commit` → `git push`.

Los cuatro cambios son **un solo push de 15 créditos**. Lo que no se hace es apurarlos:
este push toca el flujo de pago y hay que dejar margen para un segundo deploy el mismo
día si el QA saca algo.

### El resto del ciclo de octubre, agrupado por push

Cada push son 15 créditos. Con 1.000 al mes hay espacio para 66, así que **lo que se
cuida no es el número de pushes: es no gastar cinco en una tarde corrigiendo.** Un push
por bloque de trabajo, probado antes de subir.

**PUSH 2 — el flujo de negocios.** Es lo que sigue después del fundador, porque el
formulario de negocios es lo primero que ve un local cuando Jaime le manda el link y hoy
se ve de otra época al lado del de dueños.

- ⬜ Migrar `formulario-negocio-v3.html` al estilo del registro (OTP + mascota animada).
- ⬜ Revisar que aprobar fichas desde el celular en `/mi-panel` siga cómodo.

**PUSH 3 — "Recomienda un negocio".** Votos sobre el buzón de sugerencias y las
etiquetas "Recomendado por X socios" / "Nuevo en el club". Tiene sentido cuando haya
socios suficientes para que la lista no se vea muerta.

**Gratis, sin tocar créditos, y es lo que de verdad mueve el proyecto este mes:**

- ⬜ Correr el SQL v29 en Supabase.
- ⬜ Escribirle a los primeros **5 negocios** (mensajes en `NEGOCIOS-CAPTACION.md`).
- ⬜ Escribirle a las primeras **5 personas**.
- ⬜ Borrar el fundador de prueba #001.
- ⬜ Confirmar "Aprobar nuevos miembros" en el grupo de WhatsApp.
- ⬜ Las dos fotos para la landing (Jaime con Max, el carnet).
- ⬜ Preguntar en el grupo si quieren el asistente y contar cuántas dudas llegan en tres
  semanas: así se valida el bot sin construirlo.

**La prueba cerrada va en curso** con conocidos (se bajó de 15 a 5 personas para partir).
Después de eso: reiniciar contadores, encender el interruptor de verificación, volver a
mostrar el botón de compartir y recién ahí abrir al público.

---

## Pendientes, en orden

**El flujo del dueño está cerrado**, y desde el 23 de septiembre el del pase fundador
también. Lo que queda abajo es otra cosa.

### Antes de cobrarle a alguien

0. **Borrar el fundador de prueba #001** desde `/mi-panel` para partir desde cero. Con la
   tabla vacía el próximo vuelve a ser #001.

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
11b. **Validar el pago contra la API de Mercado Pago** antes de activar un fundador. Hoy
    `activar_fundador()` confía en el `payment_id` que viene en la URL. Se cierra con una
    Netlify Function que consulte la operación con las credenciales de Mercado Pago. No
    es urgente con 100 cupos y $9.990; sí lo es si sube el precio o crece el volumen.
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
- **Una sola plantilla de ficha** (`/negocio/<slug>`). Las categorías son páginas curadas
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
