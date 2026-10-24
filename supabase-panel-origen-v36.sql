-- =====================================================================
-- Mi Mascota Club — parche v36 (24 de octubre de 2026)
-- Resumen "¿De dónde llegan?" para el dashboard de /mi-panel.
--
-- SOLO LEE: cuenta visitas (origen_visitas), socios (socios.origen) y
-- negocios (negocios_solicitudes.origen) por cada código ?ref=.
-- No cambia ninguna tabla ni ningún dato. Solo un administrador puede
-- llamarla (es_admin()), igual que admin_fundadores().
-- Fila con ref = '' = los que llegaron sin código.
-- =====================================================================
create or replace function public.admin_origen_resumen()
returns table(ref text, visitas bigint, socios bigint, negocios bigint)
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver el origen';
  end if;

  return query
  with v as (
    select o.ref as r, count(*) as n from origen_visitas o group by o.ref
  ), s as (
    select coalesce(x.origen, '') as r, count(*) as n from socios x group by 1
  ), g as (
    select coalesce(regexp_replace(y.origen, '^ref:', ''), '') as r, count(*) as n
      from negocios_solicitudes y group by 1
  ), todos as (
    select r from v union select r from s union select r from g
  )
  select t.r,
         coalesce(v.n, 0),
         coalesce(s.n, 0),
         coalesce(g.n, 0)
    from todos t
    left join v on v.r = t.r
    left join s on s.r = t.r
    left join g on g.r = t.r
   where t.r <> 'prueba-claude'
   order by (t.r = ''), coalesce(s.n,0) + coalesce(g.n,0) desc, coalesce(v.n,0) desc, t.r;
end $$;

revoke all on function public.admin_origen_resumen() from public, anon;
grant execute on function public.admin_origen_resumen() to authenticated;
