-- ============================================================
--  supabase-verificacion-v25.sql
--  Verificación de tenencia — chip + cartilla veterinaria
--  17 de septiembre de 2026
--
--  Qué resuelve: hasta ahora cualquiera podía inventar una
--  mascota y canjear beneficios. Este parche agrega un estado
--  de verificación por mascota y, cuando el interruptor está
--  encendido, solo las mascotas verificadas pueden canjear.
--
--  Estados: registrado → en_revision → verificado / rechazado
--
--  El interruptor (`canje_exige_verificacion`) queda APAGADO al
--  correr este parche, para no romper el canje mientras se
--  termina el frontend. Se enciende desde /mi-panel.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Columnas nuevas en `socios`
-- ------------------------------------------------------------
alter table public.socios
  add column if not exists chip              text,
  add column if not exists cartilla          text,
  add column if not exists verificacion      text not null default 'registrado',
  add column if not exists verificacion_en   timestamptz,
  add column if not exists verificacion_nota text;

alter table public.socios drop constraint if exists socios_verificacion_chk;
alter table public.socios add constraint socios_verificacion_chk
  check (verificacion in ('registrado','en_revision','verificado','rechazado'));

comment on column public.socios.chip is
  'Número de microchip normalizado (sin espacios ni guiones). Único entre las mascotas no rechazadas.';
comment on column public.socios.cartilla is
  'Foto de la cartilla veterinaria como data URL. Se borra apenas se resuelve la verificación: solo sirve para revisarla una vez.';


-- ------------------------------------------------------------
-- 2) Un chip = un animal
--    Los rechazados quedan fuera del índice para que un número
--    mal escrito no bloquee al dueño real de ese chip.
-- ------------------------------------------------------------
create unique index if not exists socios_chip_uniq
  on public.socios (chip)
  where chip is not null and verificacion <> 'rechazado';


-- ------------------------------------------------------------
-- 3) Formato del chip
--    El estándar chileno (ISO 11784/11785) son 15 dígitos, pero
--    hay mascotas viejas con chips antiguos de otro largo. Por
--    eso el formato NO es una muralla: `chip_aceptable` deja
--    pasar cualquier cosa razonable y `chip_formato_ok` es solo
--    una señal para la revisión manual.
-- ------------------------------------------------------------
create or replace function public.chip_normalizar(p text)
returns text language sql immutable
set search_path to 'public','pg_temp' as $function$
  select nullif(upper(regexp_replace(coalesce(p,''), '[^0-9A-Za-z]', '', 'g')), '');
$function$;

create or replace function public.chip_formato_ok(p text)
returns boolean language sql immutable
set search_path to 'public','pg_temp' as $function$
  select coalesce(public.chip_normalizar(p) ~ '^[0-9]{15}$', false);
$function$;

create or replace function public.chip_aceptable(p text)
returns boolean language sql immutable
set search_path to 'public','pg_temp' as $function$
  select coalesce(public.chip_normalizar(p) ~ '^[0-9A-Z]{9,20}$', false);
$function$;


-- ------------------------------------------------------------
-- 4) Ajustes del sitio — el interruptor del bloqueo
--    RLS encendido y sin políticas: invisible desde el navegador.
--    Solo lo tocan las funciones security definer de abajo.
-- ------------------------------------------------------------
create table if not exists public.ajustes (
  clave          text primary key,
  valor          text not null,
  actualizado_en timestamptz not null default now()
);

alter table public.ajustes enable row level security;

insert into public.ajustes (clave, valor)
values ('canje_exige_verificacion', 'false')
on conflict (clave) do nothing;

create or replace function public.ajuste_bool(p_clave text, p_default boolean default false)
returns boolean language sql stable security definer
set search_path to 'public','pg_temp' as $function$
  select coalesce((select a.valor = 'true' from public.ajustes a where a.clave = p_clave), p_default);
$function$;

revoke all on function public.ajuste_bool(text, boolean) from public, anon, authenticated;


-- ------------------------------------------------------------
-- 5) El dueño manda su verificación desde /mi-mascota
-- ------------------------------------------------------------
create or replace function public.socio_enviar_verificacion(
  p_token    uuid,
  p_codigo   text,
  p_chip     text default null,
  p_cartilla text default null)
returns table(ok boolean, mensaje text, estado text)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
declare
  v_email  text := socio_email_de_token(p_token);
  v_cod    text := upper(trim(coalesce(p_codigo,'')));
  v_chip   text := public.chip_normalizar(p_chip);
  v_s      socios%rowtype;
  v_estado text;
begin
  if v_email is null then
    return query select false, 'Tu sesión venció. Vuelve a entrar con tu correo.', null::text; return;
  end if;

  select * into v_s from socios
   where codigo = v_cod and lower(trim(coalesce(email,''))) = v_email;
  if not found then
    return query select false, 'Esa mascota no está en tu cuenta.', null::text; return;
  end if;

  if v_s.verificacion = 'verificado' then
    return query select false, 'Esta mascota ya está verificada.', 'verificado'::text; return;
  end if;

  if v_chip is null and p_cartilla is null then
    return query select false, 'Necesitamos el número de chip o la foto de la cartilla.', v_s.verificacion; return;
  end if;

  if v_chip is not null and not public.chip_aceptable(v_chip) then
    return query select false,
      'Ese número de chip no parece válido. Son entre 9 y 20 caracteres, sin espacios.',
      v_s.verificacion; return;
  end if;

  if p_cartilla is not null and length(p_cartilla) > 900000 then
    return query select false, 'La foto de la cartilla es demasiado pesada. Intenta con otra.',
      v_s.verificacion; return;
  end if;

  if v_chip is not null and exists (
       select 1 from socios x
        where x.chip = v_chip and x.codigo <> v_cod and x.verificacion <> 'rechazado') then
    return query select false,
      'Ese número de chip ya está registrado en otra mascota. Si crees que es un error, escríbenos.',
      v_s.verificacion; return;
  end if;

  v_estado := case
    when coalesce(v_chip, v_s.chip) is not null
     and coalesce(p_cartilla, v_s.cartilla) is not null then 'en_revision'
    else 'registrado' end;

  update socios set
    chip              = coalesce(v_chip, chip),
    cartilla          = coalesce(p_cartilla, cartilla),
    verificacion      = v_estado,
    verificacion_en   = case when v_estado = 'en_revision' then now() else verificacion_en end,
    verificacion_nota = case when v_estado = 'en_revision' then null else verificacion_nota end
  where codigo = v_cod;

  return query select true,
    case when v_estado = 'en_revision'
      then 'Recibido. Lo revisamos dentro de 48 horas hábiles y te avisamos por correo.'
      else 'Guardamos el número de chip. Falta la foto de la cartilla para poder verificarte.' end,
    v_estado;
end $function$;

revoke all on function public.socio_enviar_verificacion(uuid, text, text, text) from public;
grant execute on function public.socio_enviar_verificacion(uuid, text, text, text) to anon, authenticated;


-- ------------------------------------------------------------
-- 6) `registrar_socio` acepta chip y cartilla
--    Regla de oro: nada de lo que pase con el chip puede hacer
--    fracasar la inscripción. Si el número está duplicado, mal
--    formado o la foto pesa demasiado, se inscribe igual y se
--    devuelve un `aviso` para mostrarlo en pantalla.
--    (Hubo que DROP porque cambia el tipo de retorno.)
-- ------------------------------------------------------------
drop function if exists public.registrar_socio(
  text,text,text,text,text,text,text,text,text,text,text,text,jsonb,text,boolean,text);

create or replace function public.registrar_socio(
  p_pet text, p_species text, p_breed text, p_comuna text, p_email text,
  p_edad text, p_peso text, p_tamano text,
  p_representante_nombre text, p_representante_rut text, p_representante_telefono text,
  p_foto text, p_documentos jsonb, p_notas_medicas text,
  p_acepta_terminos  boolean default false,
  p_terminos_version text    default '2026-09-13',
  p_chip             text    default null,
  p_cartilla         text    default null)
returns table(codigo text, socio_number integer, verificacion text, aviso text)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
declare
  v_num    int;
  v_codigo text;
  v_chip   text := public.chip_normalizar(p_chip);
  v_cart   text := p_cartilla;
  v_estado text;
  v_aviso  text := null;
begin
  if not coalesce(p_acepta_terminos, false) then
    raise exception 'Para crear tu cuenta tienes que aceptar los términos y la política de privacidad.';
  end if;

  if v_chip is not null and not public.chip_aceptable(v_chip) then
    v_aviso := 'Te inscribimos, pero el número de chip no tenía un formato válido y no lo guardamos. Puedes corregirlo en Mi Mascota ID.';
    v_chip  := null;
  end if;

  if v_chip is not null and exists (
       select 1 from socios x where x.chip = v_chip and x.verificacion <> 'rechazado') then
    v_aviso := 'Te inscribimos, pero ese número de chip ya está registrado en otra mascota, así que no lo guardamos. Puedes corregirlo en Mi Mascota ID.';
    v_chip  := null;
  end if;

  if v_cart is not null and length(v_cart) > 900000 then
    v_aviso := coalesce(v_aviso || ' ', '') || 'La foto de la cartilla era demasiado pesada y no se guardó.';
    v_cart  := null;
  end if;

  v_estado := case when v_chip is not null and v_cart is not null then 'en_revision' else 'registrado' end;

  v_num    := nextval('socio_seq');
  v_codigo := 'MMC' || lpad(v_num::text, 5, '0');

  insert into socios (codigo, pet, species, breed, comuna, email, socio_number, edad, peso, tamano,
    representante_nombre, representante_rut, representante_telefono, foto, documentos, notas_medicas,
    terminos_aceptados_en, terminos_version,
    chip, cartilla, verificacion, verificacion_en)
  values (v_codigo, p_pet, p_species, p_breed, p_comuna, p_email, v_num, p_edad, p_peso, p_tamano,
    p_representante_nombre, p_representante_rut, p_representante_telefono, p_foto, p_documentos, p_notas_medicas,
    now(), coalesce(nullif(trim(p_terminos_version),''), '2026-09-13'),
    v_chip, v_cart, v_estado, case when v_estado = 'en_revision' then now() else null end);

  return query select v_codigo, v_num, v_estado, v_aviso;
end $function$;

revoke all on function public.registrar_socio(
  text,text,text,text,text,text,text,text,text,text,text,text,jsonb,text,boolean,text,text,text) from public;
grant execute on function public.registrar_socio(
  text,text,text,text,text,text,text,text,text,text,text,text,jsonb,text,boolean,text,text,text)
  to anon, authenticated;


-- ------------------------------------------------------------
-- 7) `socio_perfil` devuelve el estado de verificación
--    No devuelve la foto de la cartilla: pesa y el dueño ya la
--    tiene. Solo dice si está cargada.
--    (Hubo que DROP porque cambia el tipo de retorno.)
-- ------------------------------------------------------------
drop function if exists public.socio_perfil(uuid);

create or replace function public.socio_perfil(p_token uuid)
returns table(codigo text, socio_number integer, pet text, species text, breed text, comuna text,
              edad text, peso text, tamano text, foto text, notas_medicas text, plan text,
              created_at timestamptz, representante_nombre text, representante_telefono text,
              email text, completitud integer,
              verificacion text, chip text, tiene_cartilla boolean,
              verificacion_nota text, verificacion_en timestamptz)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
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
           ) * 100 / 9,
           s.verificacion, s.chip, (coalesce(s.cartilla,'') <> ''),
           s.verificacion_nota, s.verificacion_en
      from socios s
     where lower(trim(coalesce(s.email,''))) = v_email
     order by s.socio_number;
end $function$;

revoke all on function public.socio_perfil(uuid) from public;
grant execute on function public.socio_perfil(uuid) to anon, authenticated;


-- ------------------------------------------------------------
-- 8) La revisión, desde /mi-panel
-- ------------------------------------------------------------
create or replace function public.admin_verificaciones_pendientes()
returns table(codigo text, pet text, species text, breed text, comuna text, email text,
              representante_nombre text, representante_telefono text,
              chip text, formato_ok boolean, cartilla text, foto text,
              created_at timestamptz, verificacion_en timestamptz)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  return query
    select s.codigo, s.pet, s.species, s.breed, s.comuna, s.email,
           s.representante_nombre, s.representante_telefono,
           s.chip, public.chip_formato_ok(s.chip), s.cartilla, s.foto,
           s.created_at, s.verificacion_en
      from socios s
     where s.verificacion = 'en_revision'
     order by s.verificacion_en;
end $function$;

revoke all on function public.admin_verificaciones_pendientes() from public, anon;
grant execute on function public.admin_verificaciones_pendientes() to authenticated;


create or replace function public.admin_resolver_verificacion(
  p_codigo text, p_decision text, p_nota text default null)
returns table(ok boolean, mensaje text)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
declare
  v_cod text := upper(trim(coalesce(p_codigo,'')));
  v_d   text := lower(trim(coalesce(p_decision,'')));
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;

  if v_d not in ('verificado','rechazado') then
    return query select false, 'Decisión no válida.'; return;
  end if;

  if not exists (select 1 from socios where socios.codigo = v_cod) then
    return query select false, 'No encontramos ese socio.'; return;
  end if;

  -- La cartilla se borra en los dos casos: ya cumplió su función y es el dato
  -- más sensible de la base. Si se rechaza, el dueño sube una nueva.
  update socios set
    verificacion      = v_d,
    verificacion_en   = now(),
    verificacion_nota = case when v_d = 'rechazado'
                             then nullif(trim(coalesce(p_nota,'')),'')
                             else null end,
    cartilla          = null
  where socios.codigo = v_cod;

  return query select true,
    case when v_d = 'verificado' then 'Socio verificado.' else 'Solicitud rechazada.' end;
end $function$;

revoke all on function public.admin_resolver_verificacion(text, text, text) from public, anon;
grant execute on function public.admin_resolver_verificacion(text, text, text) to authenticated;


create or replace function public.admin_ajustes()
returns table(clave text, valor text, actualizado_en timestamptz)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  return query select a.clave, a.valor, a.actualizado_en from public.ajustes a order by a.clave;
end $function$;

revoke all on function public.admin_ajustes() from public, anon;
grant execute on function public.admin_ajustes() to authenticated;


create or replace function public.admin_ajuste_set(p_clave text, p_valor text)
returns table(ok boolean, mensaje text)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
declare v_c text := trim(coalesce(p_clave,''));
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;

  if v_c not in ('canje_exige_verificacion') then
    return query select false, 'Ese ajuste no existe.'; return;
  end if;

  insert into public.ajustes (clave, valor) values (v_c, case when p_valor = 'true' then 'true' else 'false' end)
  on conflict (clave) do update set valor = excluded.valor, actualizado_en = now();

  return query select true, 'Ajuste guardado.';
end $function$;

revoke all on function public.admin_ajuste_set(text, text) from public, anon;
grant execute on function public.admin_ajuste_set(text, text) to authenticated;


-- ------------------------------------------------------------
-- 9) El bloqueo del canje
--    `canje_previo` es el que lo frena en pantalla, antes de que
--    el cajero llegue a confirmar nada. `registrar_canje_v3` lo
--    repite por si alguien llama a la función directamente.
--    (canje_previo: DROP porque cambia el tipo de retorno.)
-- ------------------------------------------------------------
drop function if exists public.canje_previo(text, text);

create or replace function public.canje_previo(p_negocio_codigo text, p_socio_codigo text)
returns table(ok boolean, mensaje text, socio_pet text, socio_species text, socio_breed text,
              socio_plan text, socio_codigo text, socio_desde timestamptz,
              negocio_nombre text, negocio_codigo text, negocio_tiene_email boolean,
              beneficio_texto text, beneficio_monto_min integer, descuento_pct numeric,
              visitas_previas integer, ultima_visita timestamptz,
              socio_verificacion text)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
declare
  v_n negocios%rowtype; v_s socios%rowtype;
  v_cn text := upper(trim(coalesce(p_negocio_codigo,'')));
  v_cs text := upper(trim(coalesce(p_socio_codigo,'')));
  v_exige boolean := public.ajuste_bool('canje_exige_verificacion', false);
begin
  select * into v_n from negocios where negocios.codigo = v_cn;
  if not found then
    return query select false, 'No encontramos ese código de negocio.',
      null::text,null::text,null::text,null::text,null::text,null::timestamptz,
      null::text,null::text,null::boolean,null::text,null::integer,null::numeric,
      null::integer,null::timestamptz,null::text;
    return;
  end if;

  select * into v_s from socios where socios.codigo = v_cs;
  if not found then
    return query select false, 'Ese código de socio no existe. Revisa que esté bien escrito.',
      null::text,null::text,null::text,null::text,null::text,null::timestamptz,
      v_n.nombre,v_n.codigo,(coalesce(v_n.email,'') <> ''),
      negocio_beneficio_txt(v_cn), v_n.beneficio_monto_min, negocio_descuento_pct(v_cn),
      null::integer,null::timestamptz,null::text;
    return;
  end if;

  -- El socio existe pero todavía no acredita que la mascota es suya.
  if v_exige and v_s.verificacion <> 'verificado' then
    return query select false,
      case v_s.verificacion
        when 'en_revision' then 'Este socio está en revisión. Apenas confirmemos los datos de su mascota va a poder canjear — normalmente dentro de 48 horas hábiles.'
        when 'rechazado'   then 'Este socio todavía no está verificado. Tiene que completar los datos de su mascota en Mi Mascota ID.'
        else 'Este socio todavía no verifica su mascota. Puede hacerlo en un minuto desde Mi Mascota ID, en mimascotaclub.cl.'
      end,
      v_s.pet, v_s.species, v_s.breed, v_s.plan, v_s.codigo, v_s.created_at,
      v_n.nombre, v_n.codigo, (coalesce(v_n.email,'') <> ''),
      negocio_beneficio_txt(v_cn), v_n.beneficio_monto_min, negocio_descuento_pct(v_cn),
      null::integer, null::timestamptz, v_s.verificacion;
    return;
  end if;

  return query select
    true, 'ok',
    v_s.pet, v_s.species, v_s.breed, v_s.plan, v_s.codigo, v_s.created_at,
    v_n.nombre, v_n.codigo, (coalesce(v_n.email,'') <> ''),
    negocio_beneficio_txt(v_cn), v_n.beneficio_monto_min, negocio_descuento_pct(v_cn),
    (select count(*)::integer from canjes c where c.negocio_codigo = v_cn and c.socio_codigo = v_cs),
    (select max(c.created_at) from canjes c where c.negocio_codigo = v_cn and c.socio_codigo = v_cs),
    v_s.verificacion;
end $function$;

revoke all on function public.canje_previo(text, text) from public;
grant execute on function public.canje_previo(text, text) to anon, authenticated;


create or replace function public.registrar_canje_v3(
  p_token uuid, p_socio_codigo text, p_monto numeric default null)
returns table(ok boolean, mensaje text, folio text, nombre_mostrar text, socio_mascota text,
              negocio_nombre text, beneficio_texto text, monto numeric, ahorro numeric,
              canje_id uuid, negocio_plan text)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
declare
  v_cn text := negocio_de_token(p_token);
  v_n negocios%rowtype; v_s socios%rowtype;
  v_cs text := upper(trim(coalesce(p_socio_codigo,'')));
  v_nombre text; v_ahorro numeric; v_pct numeric;
  v_folio text; v_ben text; v_id uuid;
  v_exige boolean := public.ajuste_bool('canje_exige_verificacion', false);
begin
  if v_cn is null then
    return query select false, 'Tu sesión venció. Vuelve a entrar con tu código.',
      null::text,null::text,null::text,null::text,null::text,null::numeric,null::numeric,null::uuid,null::text;
    return;
  end if;

  select * into v_n from negocios where negocios.codigo = v_cn;

  select * into v_s from socios where socios.codigo = v_cs;
  if not found then
    return query select false, 'Código de socio no encontrado.',
      null::text,null::text,null::text,null::text,null::text,null::numeric,null::numeric,null::uuid,null::text;
    return;
  end if;

  if v_exige and v_s.verificacion <> 'verificado' then
    return query select false, 'Este socio todavía no verifica su mascota, así que no puede canjear.',
      null::text,null::text,null::text,null::text,null::text,null::numeric,null::numeric,null::uuid,null::text;
    return;
  end if;

  if p_monto is not null and p_monto <= 0 then
    return query select false, 'El monto tiene que ser mayor que cero (o dejarlo vacío).',
      null::text,null::text,null::text,null::text,null::text,null::numeric,null::numeric,null::uuid,null::text;
    return;
  end if;

  v_pct    := negocio_descuento_pct(v_cn);
  v_ahorro := case when p_monto is null or v_pct is null then null
                   else round(p_monto * v_pct / 100) end;
  v_ben    := negocio_beneficio_txt(v_cn);
  v_folio  := canje_folio_nuevo();

  if v_n.tipo = 'dueno' then
    v_nombre := coalesce(nullif(v_s.representante_nombre,''), 'Socio ' || v_s.codigo);
  else
    v_nombre := v_s.pet;
  end if;

  insert into canjes (negocio_id, negocio_nombre, negocio_codigo, socio_id, socio_nombre,
                      socio_mascota, socio_codigo, monto, ahorro, folio, beneficio_texto)
  values (v_n.id, v_n.nombre, v_n.codigo, v_s.id, v_nombre,
          v_s.pet, v_s.codigo, p_monto, v_ahorro, v_folio, v_ben)
  returning id into v_id;

  return query select true, 'Visita registrada.', v_folio, v_nombre,
                      v_s.pet, v_n.nombre, v_ben, p_monto, v_ahorro, v_id, v_n.plan;
end $function$;

revoke all on function public.registrar_canje_v3(uuid, text, numeric) from public;
grant execute on function public.registrar_canje_v3(uuid, text, numeric) to anon, authenticated;


-- ============================================================
--  DESPUÉS DE CORRER ESTE PARCHE
--
--  1. El interruptor queda apagado. Se enciende desde /mi-panel
--     cuando el frontend esté listo y probado.
--
--  2. Los socios que ya estaban inscritos quedan en
--     'registrado'. Si quieres dar por verificados a los que
--     conoces personalmente, uno por uno:
--        update socios set verificacion = 'verificado',
--               verificacion_en = now()
--         where codigo = 'MMC00001';
-- ============================================================
