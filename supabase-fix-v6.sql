-- ============================================================
-- PARCHE v6: separar el contacto de negocio en correo y teléfono
-- ============================================================
-- Ejecuta esto UNA VEZ en el SQL Editor de Supabase, ANTES de subir a
-- Netlify el frontend actualizado (el frontend nuevo llama a
-- registrar_negocio() con p_email y p_telefono por separado; si subes
-- el sitio sin correr este parche antes, el registro de negocios se
-- rompe porque la función vieja todavía espera un solo p_contacto).
--
-- Qué hace:
-- 1) Agrega dos columnas nuevas a "negocios": email y telefono.
-- 2) La columna vieja "contacto" se mantiene (deja de ser obligatoria)
--    para no romper los negocios ya registrados antes de este parche,
--    y se sigue llenando automáticamente como "correo · teléfono" para
--    lo que todavía la use como respaldo.
-- 3) Reemplaza registrar_negocio(): recibe p_email y p_telefono en vez
--    de p_contacto.
-- ============================================================

alter table negocios add column if not exists email text;
alter table negocios add column if not exists telefono text;
alter table negocios alter column contacto drop not null;

drop function if exists registrar_negocio(text,text,text,text,text,text,text,text,text,text,text,text,text);

create or replace function registrar_negocio(
  p_nombre text, p_cat text, p_tipo text, p_comuna text, p_email text, p_telefono text, p_servicios text,
  p_beneficio_tipo text, p_beneficio_detalle text,
  p_logo text, p_direccion text, p_horario text, p_redes_sociales text, p_descripcion text
) returns table(codigo text, founder_number int)
language plpgsql security definer as $$
declare
  v_num int; v_codigo text; v_contacto text;
begin
  v_num := nextval('negocio_seq');
  v_codigo := 'NEG' || lpad(v_num::text, 4, '0');
  v_contacto := nullif(concat_ws(' · ', nullif(trim(p_email), ''), nullif(trim(p_telefono), '')), '');
  insert into negocios (codigo, nombre, cat, tipo, comuna, email, telefono, contacto, servicios, meta, founder_number,
    beneficio_tipo, beneficio_detalle, logo, direccion, horario, redes_sociales, descripcion)
  values (v_codigo, p_nombre, p_cat, p_tipo, p_comuna, p_email, p_telefono, v_contacto, p_servicios,
          coalesce(nullif(p_servicios,''), p_cat || ' en ' || p_comuna || '.'), v_num,
          p_beneficio_tipo, p_beneficio_detalle, p_logo, p_direccion, p_horario, p_redes_sociales, p_descripcion);
  return query select v_codigo, v_num;
end; $$;

grant execute on function registrar_negocio(text,text,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;

select routine_name from information_schema.routines
where routine_name = 'registrar_negocio';
