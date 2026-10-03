-- ============================================================
-- MI MASCOTA CLUB · v30
-- Pase de Socio Fundador verificado con Mercado Pago
-- + límites al código por correo (OTP)
--
-- REEMPLAZA a supabase-fundador-auto-v29.sql, que nunca se corrió.
-- No correr el v29.
--
-- Se corre COMPLETO en el SQL Editor de Supabase, ANTES del push.
-- Todo lo de acá es compatible con el sitio que está hoy en línea:
-- nada se rompe en los minutos entre correr esto y hacer el push.
-- No borra datos de socios, negocios ni fundadores.
--
-- Qué hace, en dos partes:
--
--  A) EL CÓDIGO POR CORREO (OTP)
--     1. Máximo 5 códigos por correo cada 15 minutos.
--     2. Máximo 10 códigos por conexión (IP) cada hora.
--     3. Tope total de 40 códigos por hora para todo el sitio:
--        así nadie puede gastar de golpe los correos de EmailJS.
--     4. Un solo código vigente por correo: pedir uno nuevo anula
--        el anterior.
--     5. Máximo 5 intentos por código: al quinto error se anula.
--     6. El inicio de sesión ya no dice si un correo está inscrito.
--
--  B) EL PASE DE FUNDADOR
--     1. activar_fundador() la puede llamar SOLO el servidor
--        (la Netlify Function activar-fundador.js, después de
--        preguntarle a Mercado Pago). El navegador no puede.
--     2. Cada número de operación de Mercado Pago sirve UNA vez.
--     3. Los pagos que no se pueden activar solos (en proceso,
--        sin cupo) quedan en fundadores_pendientes y se ven en
--        /mi-panel. Nadie que pagó queda en el aire.
--
-- REGLA DEL PROYECTO: las funciones que llama el sitio van
-- VOLATILE, no STABLE (con STABLE el navegador recibe 405).
-- ============================================================


-- ############################################################
-- A) EL CÓDIGO POR CORREO
-- ############################################################

-- A1) Columnas nuevas en la tabla de códigos.
--     intentos: cuántas veces se escribió mal ESTE código.
--     ip_hash:  la conexión desde donde se pidió, cifrada (nunca la
--               IP real), solo para contar pedidos por conexión.
alter table public.codigos_verificacion
  add column if not exists intentos integer not null default 0,
  add column if not exists ip_hash  text;

create index if not exists codigos_verificacion_email_idx
  on public.codigos_verificacion (email, created_at desc);
create index if not exists codigos_verificacion_creado_idx
  on public.codigos_verificacion (created_at desc);


-- A2) Registrar un código nuevo, revisando los límites.
--     La llama SOLO enviar-codigo.js (con la Service Role Key).
--     Devuelve:
--       { ok:true,  enviar:true  }  → guardado, hay que mandar el correo
--       { ok:true,  enviar:false }  → era un acceso y el correo no está
--                                     inscrito: no se manda nada, pero a
--                                     la persona se le responde igual
--       { ok:false, motivo:'...' }  → se pasó de algún límite
create or replace function public.otp_registrar(
  p_email       text,
  p_codigo      text,
  p_ip_hash     text,
  p_solo_socios boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  -- Los límites. Si algún día quedan cortos, se cambian acá.
  MAX_POR_CORREO constant integer := 5;   -- cada 15 minutos
  MAX_POR_IP     constant integer := 10;  -- cada hora
  MAX_TOTAL      constant integer := 40;  -- cada hora, todo el sitio
  v_n integer;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'email_invalido');
  end if;

  -- Acceso a Mi Mascota ID: si el correo no está inscrito no se manda
  -- nada, pero la respuesta hacia afuera es la misma que si estuviera.
  if p_solo_socios and not exists (
    select 1 from socios
     where lower(trim(coalesce(email, ''))) = v_email
  ) then
    return jsonb_build_object('ok', true, 'enviar', false);
  end if;

  select count(*) into v_n from codigos_verificacion
   where email = v_email and created_at > now() - interval '15 minutes';
  if v_n >= MAX_POR_CORREO then
    return jsonb_build_object('ok', false, 'motivo', 'limite_correo');
  end if;

  if p_ip_hash is not null then
    select count(*) into v_n from codigos_verificacion
     where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if v_n >= MAX_POR_IP then
      return jsonb_build_object('ok', false, 'motivo', 'limite_ip');
    end if;
  end if;

  select count(*) into v_n from codigos_verificacion
   where created_at > now() - interval '1 hour';
  if v_n >= MAX_TOTAL then
    return jsonb_build_object('ok', false, 'motivo', 'limite_total');
  end if;

  -- Un solo código vigente por correo: los anteriores dejan de servir.
  update codigos_verificacion set usado = true
   where email = v_email and usado = false;

  insert into codigos_verificacion (email, codigo, expira_en, ip_hash)
  values (v_email, p_codigo, now() + interval '10 minutes', p_ip_hash);

  -- Limpieza: los códigos de hace más de 2 días ya no sirven para nada.
  delete from codigos_verificacion where created_at < now() - interval '2 days';

  return jsonb_build_object('ok', true, 'enviar', true);
end;
$$;

revoke all on function public.otp_registrar(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.otp_registrar(text, text, text, boolean) to service_role;


-- A3) Revisar un código escrito por la persona.
--     Solo mira el ÚLTIMO código vigente de ese correo. Si está bien,
--     lo gasta. Si está mal, suma un intento, y al quinto lo anula.
--     La usan por dentro socio_login, negocio_login y
--     verificar_codigo_email. Nadie la llama desde afuera.
create or replace function public.otp_consumir(p_email text, p_codigo text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cod   text := trim(coalesce(p_codigo, ''));
  MAX_INTENTOS constant integer := 5;
  v_id   uuid;
  v_real text;
  v_int  integer;
begin
  if v_email = '' or v_cod = '' then
    return false;
  end if;

  select id, codigo, intentos into v_id, v_real, v_int
    from codigos_verificacion
   where email = v_email and usado = false and expira_en > now()
   order by created_at desc
   limit 1
   for update;

  if v_id is null then
    return false;
  end if;

  if v_real = v_cod then
    update codigos_verificacion set usado = true where id = v_id;
    return true;
  end if;

  update codigos_verificacion
     set intentos = intentos + 1,
         usado    = (intentos + 1 >= MAX_INTENTOS)
   where id = v_id;
  return false;
end;
$$;

revoke all on function public.otp_consumir(text, text) from public, anon, authenticated;


-- A4) verificar_codigo_email (lo usa el formulario de registro).
--     Misma firma y mismo resultado que antes; ahora con límite de intentos.
create or replace function public.verificar_codigo_email(p_email text, p_codigo text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return public.otp_consumir(p_email, p_codigo);
end;
$$;


-- A5) socio_login (Mi Mascota ID y ahora también el pase de fundador).
--     Cambio importante: ya NO dice "no encontramos mascotas con ese
--     correo". Para quien no está inscrito la respuesta es la misma que
--     para un código malo, así nadie puede averiguar quién es socio.
create or replace function public.socio_login(p_email text, p_codigo text)
returns table(ok boolean, token uuid, mensaje text, mascotas integer)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  v_n integer;
  v_token uuid;
begin
  if v_email = '' or coalesce(trim(p_codigo),'') = '' then
    return query select false, null::uuid, 'Falta el correo o el código.', 0; return;
  end if;

  if not public.otp_consumir(v_email, p_codigo) then
    return query select false, null::uuid, 'El código no es válido o ya venció. Pide uno nuevo.', 0; return;
  end if;

  select count(*)::integer into v_n from socios
   where lower(trim(coalesce(email,''))) = v_email;

  if v_n = 0 then
    return query select false, null::uuid, 'El código no es válido o ya venció. Pide uno nuevo.', 0; return;
  end if;

  delete from sesiones_socio where expira_en < now();
  insert into sesiones_socio (email) values (v_email) returning sesiones_socio.token into v_token;

  return query select true, v_token, 'Sesión iniciada.', v_n;
end;
$$;


-- A6) negocio_login (/mi-negocio y /validar). Misma firma; ahora con
--     límite de intentos.
create or replace function public.negocio_login(p_codigo text, p_otp text)
returns table(ok boolean, mensaje text, token uuid, nombre text, plan text, founder_number integer, desde timestamptz)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v negocios%rowtype; v_mail text; v_token uuid;
  v_cod text := upper(trim(coalesce(p_codigo,'')));
begin
  if v_cod = '' or coalesce(trim(p_otp),'') = '' then
    return query select false, 'Falta el código de negocio o el código del correo.',
      null::uuid, null::text, null::text, null::integer, null::timestamptz; return;
  end if;

  select * into v from negocios where codigo = v_cod;
  if not found then
    return query select false, 'No encontramos ese código de negocio.',
      null::uuid, null::text, null::text, null::integer, null::timestamptz; return;
  end if;

  v_mail := lower(trim(coalesce(v.email,'')));
  if v_mail = '' then
    return query select false, 'Tu negocio no tiene un correo registrado.',
      null::uuid, null::text, null::text, null::integer, null::timestamptz; return;
  end if;

  if not public.otp_consumir(v_mail, p_otp) then
    return query select false, 'El código no es válido o ya venció. Pide uno nuevo.',
      null::uuid, null::text, null::text, null::integer, null::timestamptz; return;
  end if;

  delete from sesiones_negocio where expira_en < now();
  insert into sesiones_negocio (negocio_codigo) values (v_cod)
    returning sesiones_negocio.token into v_token;

  return query select true, 'Sesión iniciada.', v_token, v.nombre, v.plan, v.founder_number, v.created_at;
end;
$$;


-- ############################################################
-- B) EL PASE DE FUNDADOR
-- ############################################################

-- B1) Un número de operación de Mercado Pago sirve para UN solo pase.
--     (El fundador #001 de prueba tiene la referencia '12345' y el #002
--     no tiene: ninguno choca con esto.)
create unique index if not exists fundadores_referencia_unica
  on public.fundadores (referencia)
  where referencia is not null and referencia <> '';


-- B2) Pagos que no se pudieron activar solos.
create table if not exists public.fundadores_pendientes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  referencia  text not null unique,   -- n° de operación de Mercado Pago
  motivo      text not null,          -- pago_en_proceso | sin_cupo | otro
  estado_pago text,                   -- lo que dijo Mercado Pago
  monto       integer,
  creado_en   timestamptz not null default now(),
  resuelto    boolean not null default false
);

comment on table public.fundadores_pendientes is
  'Pagos de fundador que no se activaron solos. Los revisa Jaime en /mi-panel.';

alter table public.fundadores_pendientes enable row level security;
-- Sin políticas a propósito: nadie la toca directo, solo las funciones.
revoke all on public.fundadores_pendientes from anon, authenticated;


-- B3) Activar el pase. SOLO la llama activar-fundador.js, y solo
--     después de que Mercado Pago confirmó: pago aprobado, $9.990, CLP.
--     El correo NO viene del navegador: la función lo saca del token
--     de sesión del socio.
create or replace function public.activar_fundador(
  p_email      text,
  p_referencia text,
  p_monto      integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_ref   text := trim(coalesce(p_referencia, ''));
  v_num   integer;
  v_otro  text;
  v_tot   integer;
  v_pend  uuid;
  CUPOS   constant integer := 100;   -- mismo número que muestra el sitio
begin
  if v_email = '' or v_ref !~ '^[0-9]{6,}$' then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;

  -- ¿Ya era fundador? Se le devuelve su número, no se duplica.
  select numero into v_num from fundadores where email = v_email;
  if v_num is not null then
    return jsonb_build_object('ok', true, 'numero', v_num, 'ya_era', true);
  end if;

  -- ¿Esa operación ya activó el pase de OTRA persona?
  select email into v_otro from fundadores where referencia = v_ref;
  if v_otro is not null then
    return jsonb_build_object('ok', false, 'motivo', 'referencia_usada');
  end if;

  if not exists (select 1 from socios where lower(trim(coalesce(email,''))) = v_email) then
    return jsonb_build_object('ok', false, 'motivo', 'no_registrado');
  end if;

  select count(*) into v_tot from fundadores;
  if v_tot >= CUPOS then
    insert into fundadores_pendientes (email, referencia, motivo, estado_pago, monto)
    values (v_email, v_ref, 'sin_cupo', 'approved', p_monto)
    on conflict (referencia) do nothing
    returning id into v_pend;
    -- nuevo = false si la persona solo recargó la página: así a Jaime le
    -- llega UN aviso por pago y no uno por cada recarga.
    return jsonb_build_object('ok', false, 'motivo', 'sin_cupo', 'nuevo', v_pend is not null);
  end if;

  select coalesce(max(numero), 0) + 1 into v_num from fundadores;

  insert into fundadores (email, numero, monto, referencia, nota)
  values (v_email, v_num, p_monto, v_ref, 'automático · verificado con Mercado Pago');

  -- Si ese pago había quedado pendiente antes (estaba en proceso), se cierra.
  update fundadores_pendientes set resuelto = true where referencia = v_ref;

  return jsonb_build_object('ok', true, 'numero', v_num, 'ya_era', false);

exception
  when unique_violation then
    -- Dos activaciones exactamente al mismo tiempo.
    select numero into v_num from fundadores where email = v_email;
    if v_num is not null then
      return jsonb_build_object('ok', true, 'numero', v_num, 'ya_era', true);
    end if;
    return jsonb_build_object('ok', false, 'motivo', 'reintenta');
end;
$$;

revoke all on function public.activar_fundador(text, text, integer) from public, anon, authenticated;
grant execute on function public.activar_fundador(text, text, integer) to service_role;


-- B4) Dejar un pago en la lista de pendientes (pago en proceso, etc.).
--     SOLO la llama activar-fundador.js.
--     Devuelve true si es un pendiente NUEVO (o cambió de motivo), y false
--     si la persona solo recargó la página: así el aviso a Jaime sale una vez.
create or replace function public.registrar_pendiente_fundador(
  p_email      text,
  p_referencia text,
  p_motivo     text,
  p_estado     text,
  p_monto      integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ya boolean;
begin
  select exists (
    select 1 from fundadores_pendientes
     where referencia = trim(p_referencia) and motivo = p_motivo and not resuelto
  ) into v_ya;

  insert into fundadores_pendientes (email, referencia, motivo, estado_pago, monto)
  values (lower(trim(p_email)), trim(p_referencia), p_motivo, p_estado, p_monto)
  on conflict (referencia) do update
     set motivo = excluded.motivo,
         estado_pago = excluded.estado_pago,
         resuelto = false;
  return not v_ya;
end;
$$;

revoke all on function public.registrar_pendiente_fundador(text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.registrar_pendiente_fundador(text, text, text, text, integer) to service_role;


-- B5) Ver los pendientes en /mi-panel (solo admin).
create or replace function public.admin_fundadores_pendientes()
returns table(id uuid, email text, mascotas text, referencia text, motivo text,
              estado_pago text, monto integer, creado_en timestamptz)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver los pagos pendientes';
  end if;

  return query
    select p.id, p.email,
           (select string_agg(s.pet, ', ' order by s.socio_number)
              from socios s where lower(trim(coalesce(s.email,''))) = p.email),
           p.referencia, p.motivo, p.estado_pago, p.monto, p.creado_en
      from fundadores_pendientes p
     where not p.resuelto
     order by p.creado_en desc;
end;
$$;

revoke all on function public.admin_fundadores_pendientes() from public, anon;
grant execute on function public.admin_fundadores_pendientes() to authenticated;


-- B6) Marcar un pendiente como resuelto (solo admin).
create or replace function public.admin_resolver_pendiente(p_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede resolver pendientes';
  end if;
  update fundadores_pendientes set resuelto = true where id = p_id;
  return true;
end;
$$;

revoke all on function public.admin_resolver_pendiente(uuid) from public, anon;
grant execute on function public.admin_resolver_pendiente(uuid) to authenticated;


-- ============================================================
-- Listo. Para comprobar que quedó bien, correr esto aparte
-- (debe devolver 6 filas):
--
--   select proname from pg_proc
--    where proname in ('otp_registrar','otp_consumir','activar_fundador',
--                      'registrar_pendiente_fundador',
--                      'admin_fundadores_pendientes','admin_resolver_pendiente');
--
-- NO probar activar_fundador acá con un correo real: lo dejaría
-- marcado como fundador de verdad.
--
-- DESPUÉS DEL PUSH falta un paso chico: supabase-cerrar-socio-existe-v31.sql
-- ============================================================
