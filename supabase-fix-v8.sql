-- ============================================================
-- PARCHE v8: negocios "Destacados" + ficha de "Especialista" individual
-- ============================================================
-- Ejecuta esto UNA VEZ en el SQL Editor de Supabase, ANTES de subir a
-- Netlify el frontend actualizado (el frontend nuevo llama a
-- registrar_negocio() con un parámetro nuevo p_es_especialista; si subes
-- el sitio sin correr este parche antes, el registro de negocios se
-- rompe porque la función vieja no lo espera).
--
-- Qué hace:
-- 1) Agrega "destacado" (boolean, default false) a "negocios" — se marca
--    a MANO en el Table Editor de Supabase para que ese negocio aparezca
--    en la fila de "Destacados" arriba del directorio (máximo 10 a la
--    vez, elegidos por ti, no hay ninguna lógica automática).
-- 2) Agrega "es_especialista" (boolean, default false) a "negocios" —
--    la marca el propio formulario de registro (nuevo botón "Negocio" /
--    "Especialista individual" en el paso 1) y decide si esa ficha
--    aparece en la nueva página /especialistas.
-- 3) Reemplaza registrar_negocio(): agrega el parámetro p_es_especialista
--    al final (con default false, así que llamadas viejas sin ese
--    parámetro no se rompen, pero el frontend nuevo ya lo envía siempre).
-- ============================================================

alter table negocios add column if not exists destacado boolean not null default false;
alter table negocios add column if not exists es_especialista boolean not null default false;

drop function if exists registrar_negocio(text,text,text,text,text,text,text,text,text,text,text,text,text,text);

create or replace function registrar_negocio(
  p_nombre text, p_cat text, p_tipo text, p_comuna text, p_email text, p_telefono text, p_servicios text,
  p_beneficio_tipo text, p_beneficio_detalle text,
  p_logo text, p_direccion text, p_horario text, p_redes_sociales text, p_descripcion text,
  p_es_especialista boolean default false
) returns table(codigo text, founder_number int)
language plpgsql security definer as $$
declare
  v_num int; v_codigo text; v_contacto text;
begin
  v_num := nextval('negocio_seq');
  v_codigo := 'NEG' || lpad(v_num::text, 4, '0');
  v_contacto := nullif(concat_ws(' · ', nullif(trim(p_email), ''), nullif(trim(p_telefono), '')), '');
  insert into negocios (codigo, nombre, cat, tipo, comuna, email, telefono, contacto, servicios, meta, founder_number,
    beneficio_tipo, beneficio_detalle, logo, direccion, horario, redes_sociales, descripcion, es_especialista)
  values (v_codigo, p_nombre, p_cat, p_tipo, p_comuna, p_email, p_telefono, v_contacto, p_servicios,
          coalesce(nullif(p_servicios,''), p_cat || ' en ' || p_comuna || '.'), v_num,
          p_beneficio_tipo, p_beneficio_detalle, p_logo, p_direccion, p_horario, p_redes_sociales, p_descripcion,
          coalesce(p_es_especialista, false));
  return query select v_codigo, v_num;
end; $$;

grant execute on function registrar_negocio(text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean) to anon, authenticated;

-- Verificación rápida: deberías ver las 2 columnas nuevas.
select column_name from information_schema.columns
where table_name = 'negocios' and column_name in ('destacado','es_especialista');
