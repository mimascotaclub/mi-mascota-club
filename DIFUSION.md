# DIFUSIÓN — Mi Mascota Club

**Última actualización: 22 de octubre de 2026**

Cómo se consigue que la gente se registre **después del lanzamiento**: los canales que
Jaime ya está usando, el programa de embajadores pagados y las ideas aprobadas el 11 de
octubre. `LANZAMIENTO.md` tiene la estrategia de fondo (mensaje central, pase fundador,
calendario); este archivo es el **plan de acción** del día a día.

**Decisión de Jaime (11 de octubre): todas estas ideas, las suyas y las propuestas, se
aplican.**

---

## Dónde estamos

- Lanzamiento: 11 de octubre. **Al primer día: 22 registros.**
- Directorio sin negocios todavía (a propósito: "Próximamente aquí se agregarán negocios").
- Por eso el gancho hoy **no son los descuentos** (aún no existen), es el **carnet de la
  mascota**, ser de los primeros y poder recomendar negocios.

---

## Los canales de Jaime (ya en marcha)

- [x] **Grupo de WhatsApp de la comunidad** (tres torres; Jaime vive en la torre 2 y se
      presenta como "papá de Max y Emma").
- [x] **Grupo de WhatsApp de perritos** (39 personas).
- [ ] **Más grupos de WhatsApp de perritos.** Mismo mensaje, adaptado a cada grupo.
- [ ] **Folletos** repartidos en locales (veterinarias, peluquerías, tiendas de mascotas,
      cafés pet friendly).
- [ ] **Historias de Instagram.** Listas (en `historias-lanzamiento/`):
      historia 1 a 5, historia de Max con su carnet, "Únete gratis", plantilla amarilla y
      negra para escribir encima, **"Esta historia es para ti"** (con espacio para el
      sticker de Enlace) y **"Les recomiendo seguir esta cuenta"** (para que la suban
      otros, con espacio para el sticker de Mención @mimascotaclub).
- [ ] **Reel** con el gancho *"Gasté más de un millón de pesos en una semana"*, 3 pasos y
      cierre *"mándaselo a alguien que tenga mascota"*.
- [ ] **Anuncio pagado:** impulsar el reel. Santiago, 25 a 50 años, $3.000 a $5.000 al día.
- [ ] **Post en LinkedIn** contando el proyecto.

---

## Programa de embajadores pagados

Cada embajador recibe **su propio enlace** (por ejemplo `mimascotaclub.cl/?ref=camila`).
El sitio guarda quién lo invitó y Jaime ve cuántos registros trajo cada uno.

> ✅ **El enlace con `?ref=` ESTÁ CONSTRUIDO (push del 17 de octubre).** El sitio guarda el
> código 30 días en el celular, cuenta las visitas por código y marca de dónde llegó cada
> socio y cada negocio. Códigos en uso: `folleto1`, `folleto2`, `jofre`, `lanyard`,
> `parque`, `correo` (correos a negocios). La consulta de resultados está en
> `supabase-origen-v34.sql`. Un código nuevo no requiere push: basta con inventarlo
> (solo letras, números, guion) y usarlo en el enlace.

### La tabla (propuesta del 11 de octubre)

| Registros verificados | Pago | Valor por registro |
|---|---|---|
| 10 | $4.000 | $400 |
| 25 | $10.000 | $400 |
| 50 | $22.500 | $450 |
| 100 (tope) | $50.000 | $500 |

- **Se paga el último nivel alcanzado** (37 registros → $10.000). Eso empuja a llegar al
  siguiente.
- El valor por registro **se mantiene o sube**, nunca baja: si baja, al embajador le da lo
  mismo seguir.
- La idea original de Jaime (25 → $10.000, 50 → $15.000) bajaba a $300 por registro en el
  segundo nivel; por eso se ajustó.
- Pagar $1.000 por registro se descartó por caro.
- **Probar primero con 2 o 3 personas.**

### Reglas (se dicen desde el principio)

- **Registro que cuenta:** correo confirmado + RUT válido + mascota con foto + dirección real.
- **No cuenta:** RUT repetido, muchos registros con la misma dirección, o registros hechos
  todos seguidos desde el mismo celular.
- **Plazo:** 30 días para juntar registros. Se paga 15 días después del cierre, cuando
  Jaime ya revisó.
- **Publicidad transparente:** el embajador avisa que es colaboración pagada (por ejemplo
  `#publicidad`). En Chile la publicidad encubierta puede traer problemas con SERNAC.

### Qué medir

El riesgo de pagar por registros es que la gente se inscriba "para hacer el favor" y no
vuelva. Por cada embajador, mirar **cuántos de sus registros completan la foto o vuelven a
entrar**. Si la calidad es mala, se ajusta o se corta.

---

## Ideas aprobadas el 11 de octubre

### 1. Paseadores de perros como embajadores ⭐ prioridad

Pagarles la tabla de embajadores a **paseadores, peluqueras y adiestradores** en vez de (o
además de) influencers. Un paseador ve 10 perros al día y habla con los dueños cara a cara.
**Y son los primeros negocios del directorio:** se les ofrece su ficha de especialista
gratis (ver `NEGOCIOS-CAPTACION.md`). Resuelve dos problemas a la vez.

### 2. Carnet en el parque ⭐ prioridad

Un letrero en el parque: *"Saca el carnet de tu perro en 1 minuto"*. Jaime le toma una
foto bonita al perro y la persona sale con su carnet en el celular. Da registros de calidad
**y** contenido para Instagram. El plan completo está más abajo.

### 3. Placa QR para el collar, gratis para los primeros 100

Algo físico que el perro usa todos los días y que, si se pierde, lleva a su ficha. Le da
utilidad real al registro aunque todavía no haya descuentos, y se ve en la calle.
Se conecta con la **alerta de mascota perdida** (ya anotada en `ESTADO.md`) y con el kit
pendiente de cotizar en `LANZAMIENTO.md`.
- [ ] Cotizar placas (material, cantidad mínima, costo por unidad).
- [ ] Decidir cómo se entrega (en persona en el parque es lo más barato).

### 4. "Trae a tus amigos" para todos los socios

Cada socio tiene su propio enlace (la misma tecnología del `?ref=`, mismo push).
> ⚠️ **Por decidir:** el Pase de Socio Fundador **se vende** ($9.990, 100 cupos). Regalarlo
> por traer amigos le quita valor. Opciones:
> - **Insignia "Embajador"** en el carnet al traer 3 socios verificados (no cuesta nada).
> - **Pase fundador gratis al traer 5 verificados** (equivale a ~$2.000 por registro,
>   más que la tabla en efectivo, pero no sale plata del bolsillo).
> - Entrar a un **sorteo** mensual (por ejemplo un baño en la primera peluquería socia).

### 5. Conserjes y administraciones de edificios

Afiche con QR en el ascensor o el hall. Partir por las **tres torres de la comunidad de
Jaime**. En Santiago Centro y Ñuñoa hay edificios con decenas de perros cada uno.
- [ ] Pedir permiso a la administración.
- [ ] Afiche con QR `?ref=edificio` (o uno por edificio, para comparar).

---

## Plan: carnet en el parque

### Antes

- [ ] **Imprimir el letrero** (`letrero-parque-60x90.pdf`, 60 × 90 cm). Lo más práctico es
      **foam board** (liviano, se lleva bajo el brazo) o un **caballete tipo A** si se
      quiere dejar parado. El PDF va en tamaño real; el PNG sirve para mandarlo por
      WhatsApp a la imprenta.
- [ ] **Probar el QR** con dos celulares (iPhone y Android) antes de imprimir.
- [ ] Llevar: celular cargado + batería externa, galletas para perros (para que miren a la
      cámara), una toallita o paño de color liso como fondo, y **Max** (abre la conversación
      solo).
- [ ] Folletos chicos con el mismo QR para los que van apurados.
- [ ] Ir sin mesa ni toldo: solo el letrero en la mano o apoyado. Si un guardia pregunta,
      es una iniciativa de un vecino, no una venta.

### Dónde y cuándo

- **Parque Bustamante** (Providencia, zona canina) y **Parque Inés de Suárez**
  (Providencia). Después, plazas de Ñuñoa y Santiago Centro.
- **Sábado o domingo**, en la hora de paseo: de 10:00 a 13:00 o de 17:00 a 19:30.
- Una comuna por vez (densidad antes que tamaño, regla de `LANZAMIENTO.md`).

### El minuto con cada persona

1. **Saludo:** *"Hola, ¿quieres sacarle el carnet a tu perro? Es gratis y le tomo la foto
   ahora."* (o empezar por el perro: *"¿Cómo se llama?"*).
2. **Escanea el QR** con su celular y se registra (nombre de la mascota, sus datos, el
   código que le llega al correo).
3. **La foto:** Jaime la toma **con el celular de la persona** (modo retrato, perro a la
   altura de los ojos, galleta arriba de la cámara). Así la sube al tiro y se queda con la
   foto.
4. **Le muestra el carnet** en su pantalla y le ofrece instalar la app (botón "📲 Instalar
   la app en mi celular").
5. **Pide permiso** para una foto del perro con su carnet para Instagram. Sin caras de
   personas si no lo autorizan.
6. Si conoce una veterinaria o peluquería buena: *"Recomiéndala en la página, así la
   vamos a buscar."*

### Después

- [ ] Historia del día: *"Hoy en el Parque Bustamante: X perros nuevos en el club"*, con un
      collage de las fotos autorizadas.
- [ ] Contar los registros del día (con `?ref=parque` cuando esté construido; antes,
      contar a mano o comparar el total antes y después).
- [ ] Anotar aquí qué funcionó, qué preguntó la gente y cuántos se registraron.

### Bitácora de jornadas

| Fecha | Parque | Horario | Registros | Notas |
|---|---|---|---|---|
| | | | | |

---

## Material listo

| Pieza | Archivo |
|---|---|
| Letrero del parque (60 × 90 cm) | `letrero-parque-60x90.pdf` / `.png` (QR → `mimascotaclub.cl/?ref=parque`) |
| Historias de lanzamiento | `historias-lanzamiento/` |
| Historia "Esta historia es para ti" | `historia-esta-es-para-ti.png` |
| Historia "Les recomiendo seguir esta cuenta" | `historia-recomiendo-seguir.png` |
| Foto de perfil de Instagram | `perfil-instagram-mimascotaclub.png` |

---

## Pendientes, en orden

1. [x] **Construir el enlace `?ref=`** — hecho el 17 de octubre.
2. [ ] Imprimir el letrero y hacer la **primera jornada en el parque**.
3. [ ] Hablar con **2 o 3 paseadores** y ofrecerles la tabla + su ficha gratis.
4. [ ] Decidir el premio de "trae a tus amigos" (ver idea 4).
5. [ ] Afiche para las tres torres.
6. [ ] Cotizar la placa QR.
7. [ ] Reel + anuncio pagado.

---

## Lo aprendido al 22 de octubre

- **Folletos:** se imprimieron 100 de 9 × 14 cm a una cara por $8.330 ($83 c/u), con QR
  `?ref=folleto2`. A Jaime le cuesta entregarlos a desconocidos en la calle (en su
  comunidad sí lo hace). Lo que mejor le acomoda: dejarlos en el **mesón de los negocios
  del club**, que otros repartan (Jofre, embajadores, socios) y lo digital. Si practica la
  calle: solo a gente detenida (plaza, esperando), empezar por el perro ("¡qué lindo! ¿cómo
  se llama?") y llevar a Max.
- **Avisos al celular (push) ya existen:** se envían desde /mi-panel → "Avisos al celular".
  Primer uso pensado: anunciar los negocios nuevos y el "beneficio del mes".
- **Estrategia completa de captación de socios** (Hormozi + "Roba como un artista" + plan
  de 30 días): doc "Mi Mascota Club · Cómo conseguir socios",
  https://claude.ai/artifact/Wnab9CSzqiechzTC4ZkJWS
  Idea central: ofrecer "El carnet de tu mascota, gratis" + alerta si se pierde, llenar un
  barrio a la vez, y medir costo por socio por código (repetir lo que salga bajo $500).

## Instagram: crecer en seguidores y socios (12 de octubre)

### Ideas nuevas

- **Socio de la semana** ⭐: cada semana se publica una mascota registrada (foto + nombre +
  comuna + una frase del dueño). El dueño la comparte y la ven sus amigos con mascota.
  Para salir hay que estar registrado. Partir con Max como #1. Es el motor de crecimiento
  que no cuesta plata.
- **Publicaciones en colaboración** (función "Colaborador" de Instagram) con paseadores y
  negocios: el mismo post aparece en los dos perfiles.
- **Contenido que se guarda y se comparte:** "Parques con zona canina en Santiago",
  "Cuánto cuesta tener un perro al año en Santiago", "Qué hacer en una urgencia de noche".
- **Comentar con valor** en cuentas de mascotas de Ñuñoa, Providencia y Santiago Centro
  (no spam: comentarios reales desde @mimascotaclub).
- **Sorteo con un negocio socio** cuando exista el primero: participar = seguir + estar
  registrado. Con bases simples publicadas.
- **Etiquetar ubicación** (comuna o parque) en cada post y reel.
- **Ritmo:** 3 publicaciones por semana + historias todos los días.

### Los 3 primeros posts (se fijan arriba en el perfil)

1. **Reel — la historia de Max.** Gancho: "Gasté más de un millón de pesos en una semana".
   Jaime a cámara, 30 a 40 segundos. Cierre: "Mándaselo a alguien que tenga mascota".
2. **Carrusel — qué es Mi Mascota Club** (6 láminas): el problema, el club, el carnet, el
   directorio por recomendación, es gratis, cómo unirse.
3. **Reel — "Saca el carnet de tu perro en 1 minuto":** grabación de pantalla del registro
   real, con cronómetro. Demuestra que es fácil.

Regla de honestidad: mientras no haya negocios, decir "pronto" para los descuentos y
nunca mostrar un beneficio que no existe.

---

## Frase corta para invitar (13 de octubre, de Jaime)

> **"Disfruta de beneficios uniéndote gratis al club. Solo toma 1 minuto. Beneficios muy pronto."**

Es el llamado resumido para invitar a un usuario: en historias, posts, folletos, mensajes
de WhatsApp y como texto debajo de un botón. "Beneficios muy pronto" va siempre mientras no
haya negocios (regla de honestidad).

Piezas hechas con esta frase: post `post-unete-1-minuto.png` (1080 × 1350) e historia
`historia-unete-1-minuto.png` (1080 × 1920, con espacio para el sticker de Enlace).

---

## Bienvenida en el sitio (13 de octubre)

Lo primero que veía alguien nuevo era un buscador de negocios vacío. Ahora la primera
visita al inicio muestra 4 láminas tipo app (ver `ESTADO.md`, push del 13 de octubre) que
dicen lo mismo que Jaime explica en persona: qué es el club, el carnet, que los negocios
llegan pronto, y el botón para registrarse.
