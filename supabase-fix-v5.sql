-- ============================================================
-- PARCHE v5: registro completo en un solo paso (sin fichas separadas)
-- ============================================================
-- Ejecuta esto una vez en el SQL Editor. Reemplaza registrar_socio y
-- registrar_negocio para que reciban TODOS los datos de una vez
-- (foto, documentos, notas médicas / logo, dirección, horario, redes).
-- ============================================================

drop function if exists registrar_socio(text,text,text,text,text,text,text,text,text,text,text);
drop function if exists registrar_negocio(text,text,text,text,text,text,text,text);

create or replace function registrar_socio(
  p_pet text, p_species text, p_breed text, p_comuna text, p_email text,
  p_edad text, p_peso text, p_tamano text,
  p_representante_nombre text, p_representante_rut text, p_representante_telefono text,
  p_foto text, p_documentos jsonb, p_notas_medicas text
) returns table(codigo text, socio_number int)
language plpgsql security definer as $$
declare
  v_num int; v_codigo text;
begin
  v_num := nextval('socio_seq');
  v_codigo := 'MMC' || lpad(v_num::text, 5, '0');
  insert into socios (codigo, pet, species, breed, comuna, email, socio_number, edad, peso, tamano,
    representante_nombre, representante_rut, representante_telefono, foto, documentos, notas_medicas)
  values (v_codigo, p_pet, p_species, p_breed, p_comuna, p_email, v_num, p_edad, p_peso, p_tamano,
    p_representante_nombre, p_representante_rut, p_representante_telefono, p_foto, p_documentos, p_notas_medicas);
  return query select v_codigo, v_num;
end; $$;

create or replace function registrar_negocio(
  p_nombre text, p_cat text, p_tipo text, p_comuna text, p_contacto text, p_servicios text,
  p_beneficio_tipo text, p_beneficio_detalle text,
  p_logo text, p_direccion text, p_horario text, p_redes_sociales text, p_descripcion text
) returns table(codigo text, founder_number int)
language plpgsql security definer as $$
declare
  v_num int; v_codigo text;
begin
  v_num := nextval('negocio_seq');
  v_codigo := 'NEG' || lpad(v_num::text, 4, '0');
  insert into negocios (codigo, nombre, cat, tipo, comuna, contacto, servicios, meta, founder_number,
    beneficio_tipo, beneficio_detalle, logo, direccion, horario, redes_sociales, descripcion)
  values (v_codigo, p_nombre, p_cat, p_tipo, p_comuna, p_contacto, p_servicios,
          coalesce(nullif(p_servicios,''), p_cat || ' en ' || p_comuna || '.'), v_num,
          p_beneficio_tipo, p_beneficio_detalle, p_logo, p_direccion, p_horario, p_redes_sociales, p_descripcion);
  return query select v_codigo, v_num;
end; $$;

grant execute on function registrar_socio(text,text,text,text,text,text,text,text,text,text,text,text,jsonb,text) to anon, authenticated;
grant execute on function registrar_negocio(text,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;

select routine_name from information_schema.routines
where routine_name in ('registrar_socio','registrar_negocio');
