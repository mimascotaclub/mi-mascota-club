-- ============================================================
-- MI MASCOTA CLUB · v32
-- Correo del responsable VERIFICADO en la inscripción de negocios
--
-- Se corre COMPLETO en el SQL Editor de Supabase, JUSTO ANTES del
-- push del formulario nuevo. Entre correrlo y el push, el formulario
-- viejo deja de poder inscribir (pide un comprobante que todavía no
-- manda). Hoy no hay negocios invitados, así que no afecta a nadie.
--
-- Por qué: el correo del responsable es la llave con la que el
-- negocio entra a /mi-negocio y confirma las visitas. Si lo escribe
-- mal, queda fuera de su propio panel; si escribe el correo de otro,
-- se lo apropia. Ahora se confirma con un código antes de inscribir.
--
-- Cómo funciona:
--   1. El formulario pide el código (enviar-codigo.js, mismos límites
--      del v30: 5 por correo cada 15 min, 10 por conexión, 40 por hora).
--   2. negocio_verificar_correo() revisa el código con otp_consumir()
--      (5 intentos y se anula) y, si está bien, entrega un COMPROBANTE
--      que dura 2 horas.
--   3. registrar_solicitud_negocio() exige ese comprobante, que sea del
--      mismo correo que viene en la inscripción, y lo gasta.
--   El navegador no puede saltarse el paso: sin comprobante válido la
--   base rechaza la inscripción.
-- ============================================================


-- 1) Comprobantes de correo verificado
create table if not exists public.correos_verificados (
  token     uuid primary key default gen_random_uuid(),
  email     text not null,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '2 hours'
);

alter table public.correos_verificados enable row level security;
-- Sin políticas a propósito: solo la tocan las funciones de abajo.
revoke all on public.correos_verificados from anon, authenticated;


-- 2) Revisar el código y entregar el comprobante
create or replace function public.negocio_verificar_correo(p_email text, p_codigo text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token uuid;
begin
  if not public.otp_consumir(v_email, p_codigo) then
    return jsonb_build_object('ok', false, 'mensaje', 'El código no es válido o ya venció. Pide uno nuevo.');
  end if;

  delete from correos_verificados where expira_en < now();

  insert into correos_verificados (email) values (v_email)
  returning token into v_token;

  return jsonb_build_object('ok', true, 'comprobante', v_token);
end;
$$;

revoke all on function public.negocio_verificar_correo(text, text) from public;
grant execute on function public.negocio_verificar_correo(text, text) to anon, authenticated;


-- 3) La inscripción ahora exige el comprobante.
--    Es la misma función del v24, con UN cambio: el bloque marcado
--    "NUEVO (v32)". Todo lo demás queda igual.
create or replace function public.registrar_solicitud_negocio(p_datos jsonb)
returns table(ok boolean, mensaje text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_email text := lower(trim(coalesce(p_datos->>'responsable_email','')));
  v_falta text;
  v_obligatorios text[] := array[
    'nombre','tipo_negocio','dir_tipo','dir_cat','comuna',
    'beneficio_valor','beneficio_sobre','beneficio_cuando',
    'rut_comercial','responsable_nombre','responsable_rut','responsable_telefono'
  ];
  v_campo text;
  v_comprobante uuid;
begin
  if not coalesce((p_datos->>'acepta_terminos')::boolean, false) then
    raise exception 'Para inscribir tu negocio tienes que aceptar los términos y la política de privacidad.';
  end if;

  foreach v_campo in array v_obligatorios loop
    if coalesce(trim(p_datos->>v_campo),'') = '' then
      v_falta := coalesce(v_falta || ', ', '') || v_campo;
    end if;
  end loop;
  if v_falta is not null then
    raise exception 'Faltan datos obligatorios: %', v_falta;
  end if;

  -- El correo del responsable es la credencial con la que después entrará a su
  -- panel y validará canjes: sin él, el negocio nace inutilizable.
  if v_email !~ '^[a-z0-9][a-z0-9._%+-]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,24}$' then
    raise exception 'Revisa el correo del responsable: es con el que vas a entrar a tu panel.';
  end if;

  -- ---------- NUEVO (v32): el correo tiene que estar verificado ----------
  begin
    v_comprobante := nullif(p_datos->>'comprobante_correo', '')::uuid;
  exception when others then
    v_comprobante := null;
  end;

  delete from correos_verificados
   where token = v_comprobante
     and email = v_email
     and expira_en > now()
  returning token into v_comprobante;

  if v_comprobante is null then
    raise exception 'Tenemos que confirmar tu correo de nuevo. Vuelve al paso del código y pide uno nuevo.';
  end if;
  -- ----------------------------------------------------------------------

  if (select count(*) from negocios_solicitudes where creado_en > now() - interval '1 hour') >= 10 then
    raise exception 'Estamos recibiendo muchas inscripciones en este momento. Inténtalo en un rato.';
  end if;

  insert into negocios_solicitudes (
    nombre, tipo_negocio, dir_tipo, dir_cat, es_especialista, tiene_local, descripcion,
    region, comuna, comunas_cobertura, direccion, google_maps_url,
    telefono_local, whatsapp, instagram, facebook, tiktok, sitio_web,
    horario_texto, horario_dias, logo_url, foto_url,
    beneficio_valor, beneficio_sobre, beneficio_cuando, beneficio_monto_min,
    beneficio_detalle, beneficio_label, beneficio_condicion,
    razon_social, rut_comercial,
    responsable_nombre, responsable_rut, responsable_email, responsable_telefono,
    acepta_terminos, terminos_aceptados_en, terminos_version, estado, origen
  ) values (
    trim(p_datos->>'nombre'),
    p_datos->>'tipo_negocio', p_datos->>'dir_tipo', p_datos->>'dir_cat',
    coalesce((p_datos->>'es_especialista')::boolean, false),
    coalesce((p_datos->>'tiene_local')::boolean, true),
    p_datos->>'descripcion',
    p_datos->>'region', trim(p_datos->>'comuna'),
    case when p_datos->'comunas_cobertura' is null or jsonb_typeof(p_datos->'comunas_cobertura') <> 'array'
         then null
         else array(select jsonb_array_elements_text(p_datos->'comunas_cobertura')) end,
    p_datos->>'direccion', p_datos->>'google_maps_url',
    p_datos->>'telefono_local', p_datos->>'whatsapp', p_datos->>'instagram',
    p_datos->>'facebook', p_datos->>'tiktok', p_datos->>'sitio_web',
    p_datos->>'horario_texto', p_datos->>'horario_dias',
    p_datos->>'logo_url', p_datos->>'foto_url',
    p_datos->>'beneficio_valor', p_datos->>'beneficio_sobre', p_datos->>'beneficio_cuando',
    nullif(p_datos->>'beneficio_monto_min','')::integer,
    p_datos->>'beneficio_detalle', p_datos->>'beneficio_label', p_datos->>'beneficio_condicion',
    p_datos->>'razon_social', trim(p_datos->>'rut_comercial'),
    trim(p_datos->>'responsable_nombre'), trim(p_datos->>'responsable_rut'), v_email,
    trim(p_datos->>'responsable_telefono'),
    true, now(), coalesce(nullif(p_datos->>'terminos_version',''), '2026-09-13'),
    'pendiente', coalesce(nullif(p_datos->>'origen',''), 'formulario-v3')
  );

  return query select true, 'Solicitud recibida.';
end; $function$;

revoke all on function public.registrar_solicitud_negocio(jsonb) from public;
grant execute on function public.registrar_solicitud_negocio(jsonb) to anon, authenticated;


-- ============================================================
-- Comprobación (correr aparte, debe devolver 2 filas):
--   select proname from pg_proc
--    where proname in ('negocio_verificar_correo','registrar_solicitud_negocio');
-- ============================================================
