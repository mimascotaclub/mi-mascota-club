-- ============================================================
-- PARCHE v4: ficha extendida de negocio (dirección, horario, redes, logo)
-- ============================================================
-- Ejecuta esto una vez en el SQL Editor. Base para los planes
-- Presencia/Destacado/Premium que ya definiste — esto construye
-- la ficha pública básica que todo negocio (incluso gratis) debe tener.
-- ============================================================

alter table negocios add column if not exists logo text;
alter table negocios add column if not exists direccion text;
alter table negocios add column if not exists horario text;
alter table negocios add column if not exists redes_sociales text;
alter table negocios add column if not exists descripcion text;
alter table negocios add column if not exists verificado boolean not null default false;

drop function if exists buscar_ficha_negocio(text);
drop function if exists actualizar_ficha_negocio(text,text,text,text,text,text);

-- Buscar ficha de negocio por su propio código (funciona como su "clave" de edición)
create or replace function buscar_ficha_negocio(p_codigo text)
returns table(nombre text, cat text, comuna text, contacto text, servicios text,
              logo text, direccion text, horario text, redes_sociales text, descripcion text,
              beneficio_tipo text, beneficio_detalle text, verificado boolean)
language sql security definer as $$
  select nombre, cat, comuna, contacto, servicios, logo, direccion, horario, redes_sociales, descripcion,
         beneficio_tipo, beneficio_detalle, verificado
  from negocios where codigo = upper(p_codigo);
$$;

create or replace function actualizar_ficha_negocio(
  p_codigo text, p_logo text, p_direccion text, p_horario text, p_redes_sociales text, p_descripcion text
) returns boolean
language plpgsql security definer as $$
begin
  update negocios set
    logo = coalesce(p_logo, logo),
    direccion = p_direccion, horario = p_horario, redes_sociales = p_redes_sociales, descripcion = p_descripcion
  where codigo = upper(p_codigo);
  return found;
end; $$;

grant execute on function buscar_ficha_negocio(text) to anon, authenticated;
grant execute on function actualizar_ficha_negocio(text,text,text,text,text,text) to anon, authenticated;

select routine_name from information_schema.routines
where routine_name in ('buscar_ficha_negocio','actualizar_ficha_negocio');
