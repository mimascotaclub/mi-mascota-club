-- ============================================================
-- MI MASCOTA CLUB · v29
-- Activación automática del Pase de Socio Fundador
--
-- Qué resuelve: hoy, después de pagar, el socio tiene que avisar
-- por WhatsApp y Jaime lo marca a mano. Con esto, la página
-- /gracias lo activa sola y le muestra su número al instante.
--
-- Este archivo se puede correr completo en el SQL Editor de
-- Supabase. No borra nada de lo que ya existe.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Pagos que no se pudieron activar solos
--    (pagó pero no está registrado, o ya no quedaba cupo).
--    Nadie queda en el aire: aparecen en /mi-panel.
-- ------------------------------------------------------------
create table if not exists public.fundadores_pendientes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  referencia  text,
  motivo      text not null,
  creado_en   timestamptz not null default now(),
  resuelto    boolean not null default false
);

comment on table public.fundadores_pendientes is
  'Pagos de fundador que no se activaron solos. Los revisa Jaime en /mi-panel.';

alter table public.fundadores_pendientes enable row level security;
-- Sin políticas a propósito: nadie la toca directo, solo las funciones de abajo.


-- ------------------------------------------------------------
-- 2) ¿Este correo está registrado en el club?
--    Se usa ANTES de mandar a pagar, para que nadie pague
--    con un correo que no existe.
--    VOLATILE a propósito: si es STABLE, el navegador recibe 405.
-- ------------------------------------------------------------
create or replace function public.socio_existe(p_email text)
returns boolean
language sql
volatile
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.socios
    where lower(trim(email)) = lower(trim(p_email))
  );
$$;

grant execute on function public.socio_existe(text) to anon, authenticated;


-- ------------------------------------------------------------
-- 3) Activar el pase de fundador
--    La llama /gracias cuando vuelve de Mercado Pago.
--    Exige el id de la operación de Mercado Pago: sin eso no activa.
--    VOLATILE a propósito (ver nota de arriba).
-- ------------------------------------------------------------
create or replace function public.activar_fundador(p_email text, p_referencia text)
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
  v_tot   integer;
  CUPOS   constant integer := 100;   -- mismo número que muestra el sitio
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'email_invalido');
  end if;

  -- El id de pago de Mercado Pago es obligatorio.
  -- No es seguridad perfecta, pero nadie lo activa por curiosidad
  -- y queda guardado para cruzarlo contra Mercado Pago.
  if v_ref !~ '^[0-9]{6,}$' then
    return jsonb_build_object('ok', false, 'motivo', 'sin_referencia');
  end if;

  -- ¿Ya era fundador? Le devolvemos su número, no lo duplicamos.
  select numero into v_num from public.fundadores where email = v_email;
  if v_num is not null then
    return jsonb_build_object('ok', true, 'numero', v_num, 'ya_era', true);
  end if;

  -- ¿Está registrado como socio?
  if not exists (
    select 1 from public.socios where lower(trim(email)) = v_email
  ) then
    insert into public.fundadores_pendientes (email, referencia, motivo)
    values (v_email, v_ref, 'pago_sin_registro');
    return jsonb_build_object('ok', false, 'motivo', 'no_registrado');
  end if;

  -- ¿Queda cupo?
  select count(*) into v_tot from public.fundadores;
  if v_tot >= CUPOS then
    insert into public.fundadores_pendientes (email, referencia, motivo)
    values (v_email, v_ref, 'sin_cupo');
    return jsonb_build_object('ok', false, 'motivo', 'sin_cupo');
  end if;

  select coalesce(max(numero), 0) + 1 into v_num from public.fundadores;

  insert into public.fundadores (email, numero, monto, referencia, nota)
  values (v_email, v_num, 9990, v_ref, 'auto');

  return jsonb_build_object('ok', true, 'numero', v_num, 'ya_era', false);

exception
  when unique_violation then
    -- Dos pagos exactamente al mismo tiempo.
    select numero into v_num from public.fundadores where email = v_email;
    if v_num is not null then
      return jsonb_build_object('ok', true, 'numero', v_num, 'ya_era', true);
    end if;
    insert into public.fundadores_pendientes (email, referencia, motivo)
    values (v_email, v_ref, 'colision');
    return jsonb_build_object('ok', false, 'motivo', 'reintenta');
end;
$$;

grant execute on function public.activar_fundador(text, text) to anon, authenticated;


-- ------------------------------------------------------------
-- 4) Ver los pendientes en /mi-panel (solo admin)
-- ------------------------------------------------------------
create or replace function public.admin_fundadores_pendientes()
returns setof public.fundadores_pendientes
language sql
volatile
security definer
set search_path = public
as $$
  select *
  from public.fundadores_pendientes
  where public.es_admin() and not resuelto
  order by creado_en desc;
$$;

grant execute on function public.admin_fundadores_pendientes() to authenticated;


-- ------------------------------------------------------------
-- 5) Marcar un pendiente como resuelto (solo admin)
-- ------------------------------------------------------------
create or replace function public.admin_resolver_pendiente(p_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    return false;
  end if;
  update public.fundadores_pendientes set resuelto = true where id = p_id;
  return true;
end;
$$;

grant execute on function public.admin_resolver_pendiente(uuid) to authenticated;


-- ============================================================
-- Listo. Después de correr esto, probar en el SQL Editor:
--
--   select public.socio_existe('correo-que-si-existe@gmail.com');   -- true
--   select public.socio_existe('nadie@nadie.cl');                   -- false
--
-- No probar activar_fundador aquí con un correo real:
-- lo dejaría marcado como fundador de verdad.
-- ============================================================
