-- ============================================================
--  Mi Mascota Club — Cerrar el acceso a los datos (v17)
--  13 de septiembre de 2026
--
--  ⚠️ YA EJECUTADO Y VERIFICADO contra la base real. Queda como
--  documentación: NO hay que volver a correrlo.
-- ------------------------------------------------------------
--  QUÉ ESTABA MAL
--
--  Las políticas de socios, canjes y validaciones decían
--  auth.role() = 'authenticated'. Eso NO significa "un
--  administrador": significa "cualquiera con una cuenta en el
--  proyecto". Si el registro público de Supabase Auth estaba
--  habilitado, cualquier persona podía crearse una cuenta y leer
--  la tabla completa de socios — con RUT, teléfono, correo y
--  notas médicas de cada dueño.
--
--  Además, los roles anon y authenticated tenían permiso de
--  INSERT, UPDATE y DELETE sobre todas las tablas. RLS los
--  bloqueaba por no haber políticas de escritura, pero eso deja
--  la seguridad colgando de una sola cosa: bastaba agregar una
--  política mal pensada para abrir la puerta entera.
-- ============================================================


-- 1) socios, canjes y validaciones: solo administradores de verdad
DROP POLICY IF EXISTS socios_select_admin ON public.socios;
CREATE POLICY socios_select_admin ON public.socios
  FOR SELECT TO authenticated USING (public.es_admin());

DROP POLICY IF EXISTS canjes_select_admin ON public.canjes;
CREATE POLICY canjes_select_admin ON public.canjes
  FOR SELECT TO authenticated USING (public.es_admin());

DROP POLICY IF EXISTS validaciones_select_admin ON public.validaciones;
CREATE POLICY validaciones_select_admin ON public.validaciones
  FOR SELECT TO authenticated USING (public.es_admin());


-- 2) Nadie escribe directo a ninguna tabla desde el navegador.
--    Se revisó todo el frontend: no existe un solo .insert(), .update()
--    ni .delete(); todo pasa por funciones RPC. Así que se quitan los
--    permisos de escritura como segundo candado.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.socios, public.canjes, public.negocios, public.negocios_solicitudes,
     public.validaciones, public.codigos_verificacion, public.admins
  FROM anon, authenticated;

-- Política muerta que permitía insertar solicitudes directo desde el navegador.
DROP POLICY IF EXISTS solicitudes_insert_publico ON public.negocios_solicitudes;


-- 3) Lectura: solo lo que el sitio de verdad lee
REVOKE SELECT ON public.socios, public.canjes FROM anon;
REVOKE SELECT ON public.admins, public.codigos_verificacion,
                 public.negocios_solicitudes, public.validaciones
  FROM anon, authenticated;

-- La Netlify Function usa la Service Role Key, que no pasa por estos
-- permisos: el envío de códigos por correo sigue funcionando igual.


-- ============================================================
--  CÓMO QUEDÓ (verificado con llamadas reales a la API pública)
--
--    negocios              200  ← el directorio público, correcto
--    socios                401
--    canjes                401
--    codigos_verificacion  401
--    negocios_solicitudes  401
--    admins                401
--    sesiones_socio        401
--
--  Y estando logueado sin ser admin, socios y canjes devuelven
--  cero filas.
-- ============================================================


-- ============================================================
--  LO QUE TODAVÍA QUEDA ABIERTO — EL CORREO DEL NEGOCIO
--
--  La tabla `negocios` es el directorio público, así que se lee
--  entera sin login. Y ahí va el correo del negocio, tanto en la
--  columna `email` como dentro de `contacto`. Está a propósito:
--  es el contacto que el negocio quiere que la gente use.
--
--  El problema es que ESE MISMO CORREO es hoy la credencial para
--  entrar a /mi-negocio y para validar canjes. Y los códigos son
--  correlativos. O sea, con una sola llamada pública cualquiera
--  obtiene el par (NEG0001, su correo) y con eso puede:
--    · entrar al panel de ese negocio y ver toda su lista de
--      clientes con nombre, mascota y código de socio
--    · registrar canjes falsos a nombre de ese negocio
--
--  Esconder el correo no sirve: es información de contacto que
--  debe ser pública. El arreglo correcto es dejar de usarlo como
--  credencial y pasar el acceso del negocio a código por correo
--  (OTP), igual que el de los dueños en el parche v15 —
--  reutilizando netlify/functions/enviar-codigo.js y una tabla
--  `sesiones_negocio` espejo de `sesiones_socio`.
--
--  El correo seguiría siendo público; lo que autoriza pasaría a
--  ser el código de 6 dígitos que solo llega a su bandeja.
-- ============================================================


-- ============================================================
--  PENDIENTE MANUAL EN EL PANEL DE SUPABASE
--  1. Authentication → Sign In / Providers → desactivar el
--     registro público ("Allow new users to sign up"). Jaime es
--     el único administrador y no hay ninguna razón para que
--     alguien más pueda crearse una cuenta.
--  2. Authentication → Policies → activar la protección de
--     contraseñas filtradas (HaveIBeenPwned).
-- ============================================================
