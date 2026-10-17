-- =====================================================================
-- v34 — ORIGEN DE LOS REGISTROS (15 de octubre de 2026)
-- Permite saber de dónde llega cada socio: folleto1, folleto2, jofre, etc.
-- Los QR y enlaces llevan ?ref=CODIGO. El sitio guarda el código en el
-- navegador (30 días), anota cada visita y, si la persona se registra,
-- lo marca en su ficha de socio. Las solicitudes de negocio ya tenían la
-- columna "origen": ahora llega como "ref:CODIGO".
-- Es solo AGREGAR: no toca ni borra nada existente.
-- =====================================================================

alter table public.socios add column if not exists origen text;

create table if not exists public.origen_visitas (
  id         bigserial primary key,
  ref        text not null,
  ruta       text,
  creado_en  timestamptz not null default now()
);
alter table public.origen_visitas enable row level security;
-- Sin políticas a propósito: nadie lee ni escribe directo, solo por las funciones.

create or replace function public.registrar_visita_origen(p_ref text, p_ruta text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ref text := lower(left(regexp_replace(coalesce(p_ref,''), '[^a-zA-Z0-9_-]', '', 'g'), 30));
begin
  if v_ref = '' then return; end if;
  -- freno simple contra abuso
  if (select count(*) from origen_visitas where creado_en > now() - interval '1 minute') > 120 then
    return;
  end if;
  insert into origen_visitas(ref, ruta) values (v_ref, left(coalesce(p_ruta,''), 60));
end $$;

create or replace function public.marcar_origen_socio(p_codigo text, p_ref text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ref text := lower(left(regexp_replace(coalesce(p_ref,''), '[^a-zA-Z0-9_-]', '', 'g'), 30));
begin
  if v_ref = '' or coalesce(p_codigo,'') = '' then return; end if;
  -- Solo se marca una vez y solo en registros recién creados.
  update socios
     set origen = v_ref
   where codigo = p_codigo
     and origen is null
     and created_at > now() - interval '30 minutes';
end $$;

revoke all on function public.registrar_visita_origen(text, text) from public;
revoke all on function public.marcar_origen_socio(text, text) from public;
grant execute on function public.registrar_visita_origen(text, text) to anon, authenticated;
grant execute on function public.marcar_origen_socio(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- PARA VER LOS RESULTADOS (copiar en el SQL Editor de Supabase):
--
-- select coalesce(v.ref, s.ref) as codigo,
--        coalesce(v.visitas, 0) as visitas,
--        coalesce(s.socios, 0)  as socios
--   from (select ref, count(*) visitas from origen_visitas group by ref) v
--   full join (select origen ref, count(*) socios from socios where origen is not null group by origen) s
--     on s.ref = v.ref
--  order by 2 desc;
-- ---------------------------------------------------------------------
