-- ============================================================
--  Mi Mascota Club — El negocio entra con código, no con correo (v18)
--  13 de septiembre de 2026
--
--  ⚠️ YA EJECUTADO Y PROBADO contra la base real. Queda como
--  documentación: NO hay que volver a correrlo.
-- ------------------------------------------------------------
--  EL PROBLEMA QUE CIERRA
--
--  Hasta el parche v17, el negocio entraba a /mi-negocio y validaba
--  canjes con su código + su correo. El problema: el correo del
--  negocio sale PÚBLICO en su ficha del directorio (es su contacto,
--  y así debe ser), y los códigos son correlativos. Con una sola
--  consulta pública cualquiera obtenía el par (NEG0001, su correo)
--  y con eso podía:
--    · entrar al panel de ese negocio y ver su lista completa de
--      clientes, con nombre, mascota y código de socio
--    · registrar canjes falsos a nombre de ese negocio
--
--  Esconder el correo no era la solución: es información de
--  contacto que tiene que ser pública. La solución es dejar de
--  usarlo como credencial.
--
--  AHORA: el negocio escribe su código NEG0001, le llega un código
--  de 6 dígitos al correo con el que se inscribió, y con eso se
--  abre una sesión de 30 días. El correo sigue siendo público; lo
--  que autoriza es el código que solo llega a su bandeja. Es el
--  mismo modelo del acceso de los dueños (parche v15).
--
--  DETALLE QUE IMPORTA: el correo de destino NO lo elige el
--  navegador. netlify/functions/enviar-codigo.js recibe el código
--  del negocio y busca el correo en la base con la Service Role
--  Key. Si el navegador pudiera decir a dónde mandar el código,
--  cualquiera pediría el de NEG0001 a su propia bandeja.
-- ============================================================


-- 1) Sesiones del negocio (espejo de sesiones_socio)
CREATE TABLE IF NOT EXISTS public.sesiones_negocio (
  token          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_codigo text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expira_en      timestamptz NOT NULL DEFAULT now() + interval '30 days',
  ultimo_uso     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sesiones_negocio_codigo_idx ON public.sesiones_negocio (negocio_codigo);
CREATE INDEX IF NOT EXISTS sesiones_negocio_expira_idx ON public.sesiones_negocio (expira_en);
ALTER TABLE public.sesiones_negocio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sesiones_negocio FROM anon, authenticated;

-- 2) negocio_de_token(token) -> código. Helper interno, revocado para anon.

-- 3) negocio_puede_entrar(codigo)
--    ¿Existe y tiene correo cargado? Devuelve el correo TAPADO
--    (j••••4@gmail.com) para que sepan a qué bandeja mirar.

-- 4) negocio_login(codigo, otp) -> token
--    Valida el OTP contra el correo REGISTRADO del negocio, nunca
--    contra uno que venga del navegador. Consume el código.

-- 5) negocio_perfil(token)        -> nombre, plan, beneficio, fundador
-- 6) historial_negocio_v2(token)  -> sus canjes, con folio y beneficio
-- 7) registrar_canje_v3(token, socio, monto) -> registra la visita
-- 8) negocio_logout(token)        -> borra el token del servidor

-- 9) Se cierran las versiones que usaban el correo como credencial
REVOKE ALL ON FUNCTION public.negocio_acceso(text, text)                    FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.historial_negocio(text, text)                 FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_canje_v2(text, text, text, numeric) FROM public, anon, authenticated;

-- (Las definiciones completas están aplicadas en la migración sesion_negocio_v18.)


-- ============================================================
--  PROBADO CONTRA LA BASE REAL
--    negocio_puede_entrar('neg0001')  → ok, correo tapado
--    negocio_puede_entrar('NEG0002')  → avisa que no tiene correo
--    negocio_login                    → devuelve token
--    negocio_perfil / historial_v2    → devuelven los datos del negocio
--    registrar_canje_v3 con token falso → "Tu sesión venció"
--  Y en navegador: entrar por el QR sin sesión pide el código,
--  y al identificarse sigue derecho al carnet escaneado sin
--  perderlo.
-- ============================================================


-- ============================================================
--  LO QUE TODAVÍA QUEDA CON IDENTIDAD DÉBIL
--
--  enviar_validacion(canje_id, rol, codigo, ...) — las
--  calificaciones mutuas del parche v9 — sigue identificando por
--  código pelado. Alguien podría dejar calificaciones a nombre de
--  otro. Es de bajo impacto (son estrellas, está limitado a plan
--  premium y a canjes reales dentro de 72 horas), pero conviene
--  pasarlo a token cuando se retome esa función.
-- ============================================================
