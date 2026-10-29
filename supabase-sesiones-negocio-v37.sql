-- =====================================================================
-- Mi Mascota Club — parche v37 (28 de octubre de 2026). YA APLICADO.
-- Una sesión de negocio nunca debe sobrevivir a su negocio.
--
-- Caso real: el 3 de octubre Jaime entró a /mi-negocio con NEG0002, que
-- entonces era un negocio de prueba. Se borraron los datos de prueba, se
-- reinició negocio_seq y el 19 de octubre el código NEG0002 pasó a ser de
-- Pet Harmony. La sesión vieja (válida 30 días) seguía viva y su navegador
-- abría el panel de Pet Harmony. Solo existía en el navegador de Jaime.
-- =====================================================================

-- 1) Borra solo las sesiones creadas ANTES que el negocio que hoy tiene ese
--    código, o cuyo negocio ya no existe. No toca sesiones legítimas.
delete from public.sesiones_negocio s
 where not exists (select 1 from public.negocios n
                    where n.codigo = s.negocio_codigo and n.created_at <= s.created_at);

-- 2) Desde ahora, al crear o borrar un negocio se cierran las sesiones de ese código.
create or replace function public.limpiar_sesiones_negocio()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.sesiones_negocio where negocio_codigo = old.codigo;
    return old;
  end if;
  delete from public.sesiones_negocio where negocio_codigo = new.codigo;
  return new;
end $$;

revoke all on function public.limpiar_sesiones_negocio() from public, anon, authenticated;

drop trigger if exists trg_negocios_limpiar_sesiones_ins on public.negocios;
create trigger trg_negocios_limpiar_sesiones_ins
  after insert on public.negocios
  for each row execute function public.limpiar_sesiones_negocio();

drop trigger if exists trg_negocios_limpiar_sesiones_del on public.negocios;
create trigger trg_negocios_limpiar_sesiones_del
  after delete on public.negocios
  for each row execute function public.limpiar_sesiones_negocio();
