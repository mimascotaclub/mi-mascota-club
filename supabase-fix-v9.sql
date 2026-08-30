-- ============================================================
-- PARCHE v9: Validación bidireccional (calificaciones mutuas, tipo Uber)
-- ============================================================
-- Ejecuta esto UNA VEZ en el SQL Editor de Supabase. Requiere que
-- supabase-fix-v7.sql (columna "plan" en socios) ya se haya ejecutado.
--
-- QUÉ HACE (ver sistema-validacion-mi-mascota-club.md para el diseño completo):
-- 1) Agrega "plan" a "negocios" (presencia / destacado / premium) — igual que
--    el plan de socios, para poder gatear el beneficio de calificar.
-- 2) Crea la tabla "validaciones": una fila por cada calificación (dueño→negocio
--    o negocio→dueño) ligada a una visita real ya cerrada (canjes.id). Nunca se
--    puede calificar sin una transacción real de por medio.
-- 3) Calificación CIEGA: cada validación queda con visible=false hasta que
--    AMBAS partes de esa visita hayan calificado — recién ahí se revelan las
--    dos, igual que Uber/Airbnb (evita que una parte "compre" la nota de la otra).
-- 4) Beneficio PREMIUM: solo dueños con plan 'pro'/'premium' y negocios con
--    plan 'premium' pueden calificar y ver el detalle de comentarios. Todos
--    (incluido plan free/presencia) siguen viendo el promedio general público.
-- 5) Ventana de 72h desde la visita para calificar (como se definió en el doc).
-- 6) registrar_canje() se reemplaza para devolver también el id de la visita y
--    el plan del negocio, así el frontend puede ofrecer "calificar ahora" al
--    negocio apenas cierra la visita, sin otra consulta.
-- ============================================================

-- ---------- 1) Plan de negocio ----------
alter table negocios add column if not exists plan text not null default 'presencia';
alter table negocios drop constraint if exists negocios_plan_check;
alter table negocios
  add constraint negocios_plan_check check (plan in ('presencia','destacado','premium'));

-- ---------- 2) Tabla de validaciones ----------
create table if not exists validaciones (
  id uuid primary key default gen_random_uuid(),
  canje_id uuid not null references canjes(id),
  origen text not null check (origen in ('socio','negocio')), -- quién califica
  estrellas int not null check (estrellas between 1 and 5),
  comentario text,
  -- submetadata: dueño→negocio = puntualidad/trato/cumplimiento del servicio;
  -- negocio→dueño = puntualidad/comportamiento de la mascota/pago a tiempo.
  -- Se guardan en las mismas 3 columnas genéricas; el frontend las etiqueta
  -- distinto según "origen" (ver sección 4 del .md).
  criterio1 int check (criterio1 between 1 and 5),
  criterio2 int check (criterio2 between 1 and 5),
  criterio3 int check (criterio3 between 1 and 5),
  visible boolean not null default false, -- true solo cuando ambas partes ya calificaron
  created_at timestamptz not null default now(),
  unique (canje_id, origen) -- una sola calificación por lado y por visita, no se puede recalificar
);

alter table validaciones enable row level security;
drop policy if exists "validaciones_select_admin" on validaciones;
create policy "validaciones_select_admin" on validaciones for select using (auth.role() = 'authenticated');
-- Nadie inserta directo — todo pasa por enviar_validacion() más abajo.

-- ---------- 3) registrar_canje(): ahora devuelve también canje_id y el plan del negocio ----------
drop function if exists registrar_canje(text, text, numeric);

create or replace function registrar_canje(p_negocio_codigo text, p_socio_codigo text, p_monto numeric)
returns table(ok boolean, mensaje text, nombre_mostrar text, ahorro numeric, negocio_nombre text,
              canje_id uuid, negocio_plan text)
language plpgsql security definer as $$
declare
  v_negocio negocios%rowtype; v_socio socios%rowtype;
  v_nombre text; v_ahorro numeric; v_canje_id uuid;
begin
  select * into v_negocio from negocios where codigo = upper(p_negocio_codigo);
  if not found then
    return query select false, 'Código de negocio no encontrado.', null::text, null::numeric, null::text, null::uuid, null::text; return;
  end if;
  select * into v_socio from socios where codigo = upper(p_socio_codigo);
  if not found then
    return query select false, 'Código de socio no encontrado.', null::text, null::numeric, null::text, null::uuid, null::text; return;
  end if;
  if p_monto is null or p_monto <= 0 then
    return query select false, 'Monto inválido.', null::text, null::numeric, null::text, null::uuid, null::text; return;
  end if;
  v_ahorro := p_monto * 0.10;
  if v_negocio.tipo = 'dueno' then
    v_nombre := coalesce(nullif(v_socio.representante_nombre,''), 'Socio ' || v_socio.codigo);
  else
    v_nombre := v_socio.pet;
  end if;
  insert into canjes (negocio_id, negocio_nombre, negocio_codigo, socio_id, socio_nombre, socio_mascota, socio_codigo, monto, ahorro)
  values (v_negocio.id, v_negocio.nombre, v_negocio.codigo, v_socio.id, v_nombre, v_socio.pet, v_socio.codigo, p_monto, v_ahorro)
  returning id into v_canje_id;
  return query select true, 'Visita validada.', v_nombre, v_ahorro, v_negocio.nombre, v_canje_id, v_negocio.plan;
end; $$;

grant execute on function registrar_canje(text,text,numeric) to anon, authenticated;

-- ---------- 4) verificar_plan(): detecta si un código es de socio o negocio y si es premium ----------
create or replace function verificar_plan(p_codigo text)
returns table(rol text, plan text, premium boolean, nombre text)
language plpgsql security definer as $$
declare v_codigo text := upper(trim(p_codigo));
begin
  if v_codigo like 'MMC%' then
    return query select 'socio'::text, s.plan, (s.plan in ('pro','premium')), s.pet
    from socios s where s.codigo = v_codigo;
  elsif v_codigo like 'NEG%' then
    return query select 'negocio'::text, n.plan, (n.plan = 'premium'), n.nombre
    from negocios n where n.codigo = v_codigo;
  end if;
  return;
end; $$;

grant execute on function verificar_plan(text) to anon, authenticated;

-- ---------- 5) enviar_validacion(): calificación ciega, gateada a premium, ligada a una visita real ----------
create or replace function enviar_validacion(
  p_canje_id uuid, p_rol text, p_codigo text, p_estrellas int, p_comentario text,
  p_criterio1 int default null, p_criterio2 int default null, p_criterio3 int default null
) returns table(ok boolean, mensaje text, revelada boolean)
language plpgsql security definer as $$
declare
  v_canje canjes%rowtype; v_codigo text := upper(trim(p_codigo)); v_plan text; v_es_premium boolean;
  v_conteo int; v_revelada boolean := false;
begin
  if p_rol not in ('socio','negocio') then
    return query select false, 'Rol inválido.', false; return;
  end if;
  if p_estrellas is null or p_estrellas < 1 or p_estrellas > 5 then
    return query select false, 'La calificación debe ser entre 1 y 5 estrellas.', false; return;
  end if;

  select * into v_canje from canjes where id = p_canje_id;
  if not found then
    return query select false, 'Esta visita no existe.', false; return;
  end if;

  if p_rol = 'socio' then
    if v_canje.socio_codigo <> v_codigo then
      return query select false, 'Este código no corresponde al dueño de esta visita.', false; return;
    end if;
    select plan into v_plan from socios where codigo = v_codigo;
    v_es_premium := v_plan in ('pro','premium');
  else
    if v_canje.negocio_codigo <> v_codigo then
      return query select false, 'Este código no corresponde al negocio de esta visita.', false; return;
    end if;
    select plan into v_plan from negocios where codigo = v_codigo;
    v_es_premium := v_plan = 'premium';
  end if;

  if not coalesce(v_es_premium, false) then
    return query select false, 'Calificar visitas es un beneficio de los planes premium. Mejora tu plan para desbloquearlo.', false; return;
  end if;

  if now() - v_canje.created_at > interval '72 hours' then
    return query select false, 'La ventana de 72 horas para calificar esta visita ya cerró.', false; return;
  end if;

  if exists(select 1 from validaciones where canje_id = p_canje_id and origen = p_rol) then
    return query select false, 'Ya calificaste esta visita — no se puede recalificar.', false; return;
  end if;

  insert into validaciones (canje_id, origen, estrellas, comentario, criterio1, criterio2, criterio3)
  values (p_canje_id, p_rol, p_estrellas, nullif(trim(coalesce(p_comentario,'')), ''), p_criterio1, p_criterio2, p_criterio3);

  select count(*) into v_conteo from validaciones where canje_id = p_canje_id;
  if v_conteo = 2 then
    update validaciones set visible = true where canje_id = p_canje_id;
    v_revelada := true;
  end if;

  return query select true,
    case when v_revelada then 'Calificación enviada. Como la otra parte también calificó, ya se reveló en el historial.'
         else 'Calificación enviada. Se revelará cuando la otra parte también califique esta visita.' end,
    v_revelada;
end; $$;

grant execute on function enviar_validacion(uuid,text,text,int,text,int,int,int) to anon, authenticated;

-- ---------- 6) pendientes_por_validar(): visitas de ese código que aún no calificó, dentro de 72h ----------
create or replace function pendientes_por_validar(p_codigo text, p_rol text)
returns table(canje_id uuid, contraparte text, monto numeric, fecha timestamptz, horas_restantes numeric)
language plpgsql security definer as $$
declare v_codigo text := upper(trim(p_codigo)); v_plan text; v_es_premium boolean;
begin
  if p_rol = 'socio' then
    select plan into v_plan from socios where codigo = v_codigo;
    if not (v_plan in ('pro','premium')) then return; end if;
    return query
      select c.id, c.negocio_nombre, c.monto, c.created_at,
             round(extract(epoch from (c.created_at + interval '72 hours' - now()))/3600.0, 1)
      from canjes c
      where c.socio_codigo = v_codigo
        and now() - c.created_at <= interval '72 hours'
        and not exists(select 1 from validaciones v where v.canje_id = c.id and v.origen = 'socio')
      order by c.created_at desc;
  elsif p_rol = 'negocio' then
    select plan into v_plan from negocios where codigo = v_codigo;
    if v_plan <> 'premium' then return; end if;
    return query
      select c.id, c.socio_nombre, c.monto, c.created_at,
             round(extract(epoch from (c.created_at + interval '72 hours' - now()))/3600.0, 1)
      from canjes c
      where c.negocio_codigo = v_codigo
        and now() - c.created_at <= interval '72 hours'
        and not exists(select 1 from validaciones v where v.canje_id = c.id and v.origen = 'negocio')
      order by c.created_at desc;
  end if;
end; $$;

grant execute on function pendientes_por_validar(text,text) to anon, authenticated;

-- ---------- 7) Reputación pública de un NEGOCIO (agregado, visible para todos) ----------
create or replace function resumen_reputacion_negocio(p_negocio_codigo text)
returns table(promedio numeric, total_validado int, total_visitas int, mostrar_promedio boolean)
language sql security definer as $$
  select
    round(avg(v.estrellas)::numeric, 1),
    count(v.id)::int,
    (select count(*)::int from canjes c where c.negocio_codigo = upper(p_negocio_codigo)),
    count(v.id) >= 3
  from validaciones v
  join canjes c on c.id = v.canje_id
  where c.negocio_codigo = upper(p_negocio_codigo) and v.origen = 'socio' and v.visible = true;
$$;

grant execute on function resumen_reputacion_negocio(text) to anon, authenticated;

-- ---------- 8) Detalle de comentarios de un NEGOCIO — solo para dueños premium que consultan ----------
create or replace function detalle_validaciones_negocio(p_negocio_codigo text, p_codigo_consultante text)
returns table(estrellas int, comentario text, criterio1 int, criterio2 int, criterio3 int, fecha timestamptz)
language plpgsql security definer as $$
declare v_plan text;
begin
  select plan into v_plan from socios where codigo = upper(trim(p_codigo_consultante));
  if not (v_plan in ('pro','premium')) then return; end if; -- fail closed: no premium, no detalle

  return query
    select v.estrellas, v.comentario, v.criterio1, v.criterio2, v.criterio3, v.created_at
    from validaciones v
    join canjes c on c.id = v.canje_id
    where c.negocio_codigo = upper(p_negocio_codigo) and v.origen = 'socio' and v.visible = true
    order by v.created_at desc limit 50;
end; $$;

grant execute on function detalle_validaciones_negocio(text,text) to anon, authenticated;

-- ---------- 9) Reputación pública de un SOCIO como cliente (para que negocios premium filtren) ----------
create or replace function resumen_reputacion_socio(p_socio_codigo text)
returns table(promedio numeric, total_validado int, mostrar_promedio boolean)
language sql security definer as $$
  select
    round(avg(v.estrellas)::numeric, 1),
    count(v.id)::int,
    count(v.id) >= 3
  from validaciones v
  join canjes c on c.id = v.canje_id
  where c.socio_codigo = upper(p_socio_codigo) and v.origen = 'negocio' and v.visible = true;
$$;

grant execute on function resumen_reputacion_socio(text) to anon, authenticated;

-- ---------- 10) Detalle de comentarios de un SOCIO — solo para negocios premium que consultan ----------
create or replace function detalle_validaciones_socio(p_socio_codigo text, p_codigo_consultante text)
returns table(estrellas int, comentario text, criterio1 int, criterio2 int, criterio3 int, fecha timestamptz)
language plpgsql security definer as $$
declare v_plan text;
begin
  select plan into v_plan from negocios where codigo = upper(trim(p_codigo_consultante));
  if v_plan <> 'premium' then return; end if; -- fail closed

  return query
    select v.estrellas, v.comentario, v.criterio1, v.criterio2, v.criterio3, v.created_at
    from validaciones v
    join canjes c on c.id = v.canje_id
    where c.socio_codigo = upper(p_socio_codigo) and v.origen = 'negocio' and v.visible = true
    order by v.created_at desc limit 50;
end; $$;

grant execute on function detalle_validaciones_socio(text,text) to anon, authenticated;

-- ---------- Verificación rápida ----------
select column_name from information_schema.columns where table_name = 'negocios' and column_name = 'plan';
select table_name from information_schema.tables where table_name = 'validaciones';
