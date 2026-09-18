-- ============================================================
--  supabase-eliminar-mascota-v27.sql
--  Eliminar UNA mascota sin borrar la cuenta entera
--  17 de septiembre de 2026
--
--  Por qué: un mismo correo puede tener varias mascotas
--  inscritas, y hasta ahora la única salida para sacar una era
--  "Borrar mi cuenta" — demasiado para "inscribí una por error".
--
--  La última mascota NO se puede eliminar por acá a propósito:
--  ese caso es darse de baja del club, y para eso está
--  socio_eliminar_cuenta(), que además limpia sesiones y códigos
--  de verificación. Dejarlo acá crearía una cuenta sin mascotas
--  pero con la sesión viva.
--
--  YA EJECUTADO el 17 de septiembre de 2026.
-- ============================================================

create or replace function public.socio_eliminar_mascota(p_token uuid, p_codigo text)
returns table(ok boolean, mensaje text, quedan integer)
language plpgsql security definer
set search_path to 'public','pg_temp' as $function$
declare
  v_email  text := socio_email_de_token(p_token);
  v_cod    text := upper(trim(coalesce(p_codigo,'')));
  v_total  integer;
  v_nombre text;
begin
  if v_email is null then
    return query select false, 'Tu sesión venció. Vuelve a entrar con tu correo.', 0; return;
  end if;

  select count(*)::integer into v_total
    from socios s where lower(trim(coalesce(s.email,''))) = v_email;

  -- Solo puede tocar mascotas que pertenecen al correo de la sesión.
  select s.pet into v_nombre
    from socios s
   where s.codigo = v_cod and lower(trim(coalesce(s.email,''))) = v_email;

  if v_nombre is null then
    return query select false, 'Esa mascota no está en tu cuenta.', v_total; return;
  end if;

  if v_total <= 1 then
    return query select false,
      'Es tu única mascota. Para darte de baja del club usa "Borrar mi cuenta", más abajo.',
      v_total; return;
  end if;

  -- Misma regla que al borrar la cuenta: la visita ocurrió y es también el
  -- registro de venta del negocio, así que se conserva, pero deja de apuntar
  -- a la persona ni a la mascota.
  update canjes
     set socio_nombre  = 'Socio dado de baja',
         socio_mascota = null,
         socio_codigo  = null
   where socio_codigo = v_cod;

  delete from socios s where s.codigo = v_cod;

  return query select true, v_nombre || ' se eliminó de tu cuenta.', (v_total - 1);
end $function$;

revoke all on function public.socio_eliminar_mascota(uuid, text) from public;
grant execute on function public.socio_eliminar_mascota(uuid, text) to anon, authenticated;
