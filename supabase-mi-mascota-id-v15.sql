-- ============================================================
--  Mi Mascota Club — Mi Mascota ID: panel privado del dueño (v15)
--  12 de septiembre de 2026
-- ------------------------------------------------------------
--  QUÉ RESUELVE ESTE PARCHE
--
--  1) SEGURIDAD (urgente). Hoy existen dos funciones viejas,
--     buscar_ficha_por_codigo() y actualizar_ficha(), que piden
--     SOLO el código del socio. Como los códigos son correlativos
--     (MMC00001, MMC00002, MMC00003...), cualquiera puede probar
--     códigos al azar y leer — o peor, SOBRESCRIBIR — la foto, la
--     comuna y las notas médicas de otro socio. Es el mismo
--     agujero que el parche v14 ya cerró del lado de los negocios.
--     Aquí se les quita el permiso al rol anónimo del sitio.
--     (No se borran: ninguna pantalla del sitio las usa hoy, así
--     que revocar el permiso no rompe nada, y quedan disponibles
--     por si algún día se ocupan desde el servidor.)
--
--  2) ACCESO POR CORREO. El dueño entra con su correo: le llega un
--     código de 6 dígitos al mail (la misma función de Netlify
--     enviar-codigo.js que ya usa el registro) y con eso abre una
--     sesión. No tiene que acordarse de su MMC00003. Y como un
--     mismo correo puede tener varias mascotas inscritas — en tu
--     base ya hay un correo con tres — la sesión es del CORREO, no
--     de una mascota: entra una vez y ve todas.
--
--  3) SESIÓN REAL. La sesión es una fila en sesiones_socio con un
--     token uuid imposible de adivinar y 30 días de vigencia. El
--     token es lo único que se guarda en el teléfono del dueño;
--     todas las funciones de abajo lo exigen y sacan el correo de
--     ahí. Nunca se confía en un correo que venga del navegador.
--
--  Ejecutar completo en el SQL Editor de Supabase.
--  Se puede volver a ejecutar sin problema (es idempotente).
-- ============================================================


-- ------------------------------------------------------------
-- 0) Tapar el agujero de las fichas por código
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.buscar_ficha_por_codigo(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.actualizar_ficha(text, text, jsonb, text, boolean) FROM public, anon, authenticated;

-- El mismo problema existía en el espejo para negocios: código solo, sin correo.
DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.buscar_ficha_negocio(text) FROM public, anon, authenticated';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.actualizar_ficha_negocio(text, text, text, text, text, text) FROM public, anon, authenticated';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;


-- ------------------------------------------------------------
-- 1) Tabla de sesiones del socio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sesiones_socio (
  token      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expira_en  timestamptz NOT NULL DEFAULT now() + interval '30 days',
  ultimo_uso timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sesiones_socio_email_idx ON public.sesiones_socio (email);
CREATE INDEX IF NOT EXISTS sesiones_socio_expira_idx ON public.sesiones_socio (expira_en);

-- RLS encendido y SIN políticas: desde el navegador la tabla es invisible.
-- Solo las funciones de abajo (security definer) la pueden tocar.
ALTER TABLE public.sesiones_socio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sesiones_socio FROM anon, authenticated;


-- ------------------------------------------------------------
-- 2) Helper interno: token -> correo (y renueva el último uso)
--    No se expone al navegador.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.socio_email_de_token(p_token uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_email text;
begin
  if p_token is null then return null; end if;

  select email into v_email
    from sesiones_socio
   where token = p_token and expira_en > now();

  if v_email is null then return null; end if;

  update sesiones_socio set ultimo_uso = now() where token = p_token;
  return v_email;
end; $function$;

REVOKE ALL ON FUNCTION public.socio_email_de_token(uuid) FROM public, anon, authenticated;


-- ------------------------------------------------------------
-- 3) ¿Este correo tiene mascotas inscritas?
--    Se usa ANTES de mandar el código, para no enviarle un correo
--    a alguien que no está en el club y poder ofrecerle registrarse.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.socio_existe(p_email text)
RETURNS TABLE(existe boolean, mascotas integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  select count(*) > 0, count(*)::integer
    from socios
   where lower(trim(coalesce(email,''))) = lower(trim(coalesce(p_email,'')))
     and coalesce(email,'') <> '';
$function$;


-- ------------------------------------------------------------
-- 4) Login: correo + código de 6 dígitos -> token de sesión
--    Consume el código (igual que verificar_codigo_email) para que
--    no sirva dos veces.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.socio_login(p_email text, p_codigo text)
RETURNS TABLE(ok boolean, token uuid, mensaje text, mascotas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  v_valido boolean;
  v_n integer;
  v_token uuid;
begin
  if v_email = '' or coalesce(trim(p_codigo),'') = '' then
    return query select false, null::uuid, 'Falta el correo o el código.', 0; return;
  end if;

  select count(*)::integer into v_n
    from socios where lower(trim(coalesce(email,''))) = v_email;

  if v_n = 0 then
    return query select false, null::uuid,
      'No encontramos mascotas inscritas con ese correo.', 0; return;
  end if;

  select exists(
    select 1 from codigos_verificacion
     where email = v_email and codigo = trim(p_codigo)
       and usado = false and expira_en > now()
  ) into v_valido;

  if not v_valido then
    return query select false, null::uuid,
      'El código no es válido o ya venció. Pide uno nuevo.', 0; return;
  end if;

  update codigos_verificacion set usado = true
   where email = v_email and codigo = trim(p_codigo) and usado = false;

  -- Una sesión nueva por login; las vencidas se limpian de paso.
  delete from sesiones_socio where expira_en < now();

  insert into sesiones_socio (email) values (v_email) returning sesiones_socio.token into v_token;

  return query select true, v_token, 'Sesión iniciada.', v_n;
end; $function$;


-- ------------------------------------------------------------
-- 5) Perfil: todas las mascotas de ese correo
--    "completitud" es el porcentaje de perfil lleno — es lo que
--    alimenta la barra de "Completa tu perfil" del panel.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.socio_perfil(p_token uuid)
RETURNS TABLE(
  codigo text, socio_number integer, pet text, species text, breed text,
  comuna text, edad text, peso text, tamano text, foto text,
  notas_medicas text, plan text, created_at timestamptz,
  representante_nombre text, representante_telefono text, email text,
  completitud integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_email text := socio_email_de_token(p_token);
begin
  if v_email is null then return; end if;

  return query
    select s.codigo, s.socio_number, s.pet, s.species, s.breed,
           s.comuna, s.edad, s.peso, s.tamano, s.foto,
           s.notas_medicas, s.plan, s.created_at,
           s.representante_nombre, s.representante_telefono, s.email,
           (
             (case when coalesce(s.foto,'')                   <> '' then 1 else 0 end) +
             (case when coalesce(s.breed,'')                  <> '' then 1 else 0 end) +
             (case when coalesce(s.edad,'')                   <> '' then 1 else 0 end) +
             (case when coalesce(s.peso,'')                   <> '' then 1 else 0 end) +
             (case when coalesce(s.tamano,'')                 <> '' then 1 else 0 end) +
             (case when coalesce(s.comuna,'')                 <> '' then 1 else 0 end) +
             (case when coalesce(s.notas_medicas,'')          <> '' then 1 else 0 end) +
             (case when coalesce(s.representante_nombre,'')   <> '' then 1 else 0 end) +
             (case when coalesce(s.representante_telefono,'') <> '' then 1 else 0 end)
           ) * 100 / 9
      from socios s
     where lower(trim(coalesce(s.email,''))) = v_email
     order by s.socio_number;
end; $function$;


-- ------------------------------------------------------------
-- 6) Guardar cambios de una mascota
--    Solo deja tocar mascotas que pertenecen al correo de la sesión.
--    Los campos que llegan NULL no se tocan (así el frontend puede
--    guardar solo la foto, o solo los datos, sin borrar lo demás).
--    Excepciones a propósito: notas_medicas y p_quitar_foto, que sí
--    tienen que poder vaciarse.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.socio_actualizar(
  p_token                  uuid,
  p_codigo                 text,
  p_pet                    text    DEFAULT NULL,
  p_species                text    DEFAULT NULL,
  p_breed                  text    DEFAULT NULL,
  p_comuna                 text    DEFAULT NULL,
  p_edad                   text    DEFAULT NULL,
  p_peso                   text    DEFAULT NULL,
  p_tamano                 text    DEFAULT NULL,
  p_foto                   text    DEFAULT NULL,
  p_notas_medicas          text    DEFAULT NULL,
  p_representante_nombre   text    DEFAULT NULL,
  p_representante_telefono text    DEFAULT NULL,
  p_quitar_foto            boolean DEFAULT false,
  p_tocar_notas            boolean DEFAULT false
)
RETURNS TABLE(ok boolean, mensaje text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_email text := socio_email_de_token(p_token);
  v_cod   text := upper(trim(coalesce(p_codigo,'')));
begin
  if v_email is null then
    return query select false, 'Tu sesión venció. Vuelve a entrar con tu correo.'; return;
  end if;

  if not exists (
    select 1 from socios
     where codigo = v_cod and lower(trim(coalesce(email,''))) = v_email
  ) then
    return query select false, 'Esa mascota no está en tu cuenta.'; return;
  end if;

  -- La foto llega como data URL comprimida desde el navegador. Tope de ~700 KB
  -- para que una foto gigante no infle la fila ni la respuesta del perfil.
  if p_foto is not null and length(p_foto) > 700000 then
    return query select false, 'La foto es demasiado pesada. Intenta con otra.'; return;
  end if;

  update socios set
    pet                    = coalesce(nullif(trim(p_pet),''), pet),
    species                = coalesce(nullif(trim(p_species),''), species),
    breed                  = coalesce(p_breed, breed),
    comuna                 = coalesce(nullif(trim(p_comuna),''), comuna),
    edad                   = coalesce(p_edad, edad),
    peso                   = coalesce(p_peso, peso),
    tamano                 = coalesce(p_tamano, tamano),
    foto                   = case when p_quitar_foto then null else coalesce(p_foto, foto) end,
    notas_medicas          = case when p_tocar_notas then p_notas_medicas else notas_medicas end,
    representante_nombre   = coalesce(nullif(trim(p_representante_nombre),''), representante_nombre),
    representante_telefono = coalesce(nullif(trim(p_representante_telefono),''), representante_telefono)
  where codigo = v_cod;

  return query select true, 'Guardado.';
end; $function$;


-- ------------------------------------------------------------
-- 7) Historial de canjes del dueño (todas sus mascotas juntas)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.socio_historial(p_token uuid)
RETURNS TABLE(fecha timestamptz, negocio_nombre text, negocio_codigo text,
              socio_codigo text, socio_mascota text, monto numeric, ahorro numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_email text := socio_email_de_token(p_token);
begin
  if v_email is null then return; end if;

  return query
    select c.created_at, c.negocio_nombre, c.negocio_codigo,
           c.socio_codigo, c.socio_mascota, c.monto, c.ahorro
      from canjes c
      join socios s on s.codigo = c.socio_codigo
     where lower(trim(coalesce(s.email,''))) = v_email
     order by c.created_at desc
     limit 300;
end; $function$;


-- ------------------------------------------------------------
-- 8) Cerrar sesión (borra el token del servidor, no solo del teléfono)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.socio_logout(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  delete from sesiones_socio where token = p_token;
  return true;
end; $function$;


-- ------------------------------------------------------------
-- 9) Permisos: solo el rol del sitio, nada de PUBLIC
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.socio_existe(text)      FROM public;
REVOKE ALL ON FUNCTION public.socio_login(text, text) FROM public;
REVOKE ALL ON FUNCTION public.socio_perfil(uuid)      FROM public;
REVOKE ALL ON FUNCTION public.socio_historial(uuid)   FROM public;
REVOKE ALL ON FUNCTION public.socio_logout(uuid)      FROM public;
REVOKE ALL ON FUNCTION public.socio_actualizar(uuid, text, text, text, text, text, text, text, text, text, text, text, text, boolean, boolean) FROM public;

GRANT EXECUTE ON FUNCTION public.socio_existe(text)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socio_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socio_perfil(uuid)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socio_historial(uuid)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socio_logout(uuid)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socio_actualizar(uuid, text, text, text, text, text, text, text, text, text, text, text, text, boolean, boolean) TO anon, authenticated;


-- ============================================================
--  VERIFICACIÓN
--  A) Tienen que aparecer las 6 funciones nuevas, todas con
--     search_path fijo en "public, pg_temp".
--  B) Las dos funciones viejas de ficha ya NO deben tener
--     permiso de ejecución para anon.
-- ============================================================
SELECT p.proname, array_to_string(p.proconfig, ',') AS config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('socio_existe','socio_login','socio_perfil',
                    'socio_actualizar','socio_historial','socio_logout')
ORDER BY 1;

SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_puede_ejecutar
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('buscar_ficha_por_codigo','actualizar_ficha')
ORDER BY 1;
