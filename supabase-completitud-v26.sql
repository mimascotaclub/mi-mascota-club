-- ============================================================
--  supabase-completitud-v26.sql
--  La verificación cuenta como casilla del perfil
--  17 de septiembre de 2026
--
--  Por qué: la barra decía "Perfil completo 100%" en una mascota
--  que no estaba verificada y por lo tanto no podía canjear nada.
--  Dos afirmaciones contradictorias en la misma pantalla.
--
--  Ahora son 10 casillas en vez de 9: las 9 de siempre más la
--  verificación de tenencia. Una mascota sin verificar llega
--  como máximo a 90%.
--
--  YA EJECUTADO el 17 de septiembre de 2026.
-- ============================================================

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

  -- 10 casillas: las 9 del perfil más la verificación de tenencia.
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
             (case when coalesce(s.representante_telefono,'') <> '' then 1 else 0 end) +
             (case when s.verificacion = 'verificado'              then 1 else 0 end)
           ) * 10,
           s.verificacion, s.chip, (coalesce(s.cartilla,'') <> ''),
           s.verificacion_nota, s.verificacion_en
      from socios s
     where lower(trim(coalesce(s.email,''))) = v_email
     order by s.socio_number;
end $function$;

revoke all on function public.socio_perfil(uuid) from public;
grant execute on function public.socio_perfil(uuid) to anon, authenticated;


-- ============================================================
--  RECORDATORIO: los socios que ya estaban inscritos antes del
--  parche v25 quedaron en 'registrado'. Para darlos por
--  verificados a mano, uno por uno:
--
--    update socios set verificacion = 'verificado',
--           verificacion_en = now()
--     where codigo = 'MMC00001';
--
--  Para ver cómo están todos:
--
--    select codigo, pet, email, verificacion from socios
--     order by socio_number;
-- ============================================================
