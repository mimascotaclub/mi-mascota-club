-- ============================================================
-- PARCHE v3: beneficio de negocio + privacidad + registro completo
-- ============================================================
-- Ejecuta esto UNA vez en el SQL Editor. Es seguro de correr aunque
-- ya tengas datos — no borra nada existente.
-- ============================================================

-- Nueva columna para el beneficio que ofrece cada negocio
alter table negocios add column if not exists beneficio_tipo text;
alter table negocios add column if not exists beneficio_detalle text;

-- Quitamos las funciones anteriores para poder recrearlas con nueva forma
drop function if exists registrar_negocio(text,text,text,text,text,text);
drop function if exists registrar_socio(text,text,text,text,text);
drop function if exists buscar_ficha_por_codigo(text);
drop function if exists actualizar_ficha(text,text,jsonb,text,text,text,text,text,text,text,text);
drop function if exists actualizar_ficha(text,text,jsonb,text,text,text,text,text,text,text,text,boolean);

-- Registrar negocio, ahora con el beneficio incluido
create or replace function registrar_negocio(
  p_nombre text, p_cat text, p_tipo text, p_comuna text, p_contacto text, p_servicios text,
  p_beneficio_tipo text, p_beneficio_detalle text
) returns table(codigo text, founder_number int)
language plpgsql security definer as $$
declare
  v_num int; v_codigo text;
begin
  v_num := nextval('negocio_seq');
  v_codigo := 'NEG' || lpad(v_num::text, 4, '0');
  insert into negocios (codigo, nombre, cat, tipo, comuna, contacto, servicios, meta, founder_number, beneficio_tipo, beneficio_detalle)
  values (v_codigo, p_nombre, p_cat, p_tipo, p_comuna, p_contacto, p_servicios,
          coalesce(nullif(p_servicios,''), p_cat || ' en ' || p_comuna || '.'), v_num, p_beneficio_tipo, p_beneficio_detalle);
  return query select v_codigo, v_num;
end; $$;

-- Registrar socio: TODOS los datos de una vez (dueño incluido), como pidió el founder.
-- Esto es lo único que puede escribir estos datos sensibles — nunca se leen de vuelta
-- por código público (ver buscar_ficha_por_codigo más abajo, que ya NO los expone).
create or replace function registrar_socio(
  p_pet text, p_species text, p_breed text, p_comuna text, p_email text,
  p_edad text, p_peso text, p_tamano text,
  p_representante_nombre text, p_representante_rut text, p_representante_telefono text
) returns table(codigo text, socio_number int)
language plpgsql security definer as $$
declare
  v_num int; v_codigo text;
begin
  v_num := nextval('socio_seq');
  v_codigo := 'MMC' || lpad(v_num::text, 5, '0');
  insert into socios (codigo, pet, species, breed, comuna, email, socio_number, edad, peso, tamano,
    representante_nombre, representante_rut, representante_telefono)
  values (v_codigo, p_pet, p_species, p_breed, p_comuna, p_email, v_num, p_edad, p_peso, p_tamano,
    p_representante_nombre, p_representante_rut, p_representante_telefono);
  return query select v_codigo, v_num;
end; $$;

-- Ficha por código: SOLO datos no sensibles (foto, documentos, notas médicas).
-- Ya NO devuelve nombre del representante, RUT, teléfono ni email — esos solo
-- se guardan una vez al registrarse y no se pueden leer ni editar con el código.
create or replace function buscar_ficha_por_codigo(p_codigo text)
returns table(pet text, species text, breed text, comuna text, foto text, documentos jsonb, notas_medicas text)
language sql security definer as $$
  select pet, species, breed, comuna, foto, documentos, notas_medicas
  from socios where codigo = upper(p_codigo);
$$;

-- Actualizar ficha: SOLO foto, documentos y notas médicas — nada de datos de identidad.
create or replace function actualizar_ficha(
  p_codigo text, p_foto text, p_documentos jsonb, p_notas_medicas text, p_quitar_foto boolean default false
) returns boolean
language plpgsql security definer as $$
begin
  update socios set
    foto = case when p_quitar_foto then null else coalesce(p_foto, foto) end,
    documentos = coalesce(p_documentos, documentos),
    notas_medicas = p_notas_medicas
  where codigo = upper(p_codigo);
  return found;
end; $$;

grant execute on function registrar_negocio(text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function registrar_socio(text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function buscar_ficha_por_codigo(text) to anon, authenticated;
grant execute on function actualizar_ficha(text,text,jsonb,text,boolean) to anon, authenticated;

-- Verificación: deberías ver las 4 funciones nuevas listadas.
select routine_name from information_schema.routines
where routine_name in ('registrar_negocio','registrar_socio','buscar_ficha_por_codigo','actualizar_ficha');
