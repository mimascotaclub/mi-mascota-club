-- ============================================================
-- MI MASCOTA CLUB — ESQUEMA DE BASE DE DATOS PARA SUPABASE
-- ============================================================
-- Cómo usar: ve a tu proyecto en supabase.com → SQL Editor →
-- "New query" → pega TODO este archivo → Run. Se ejecuta una sola vez.
-- ============================================================

-- ---------- TABLAS ----------

create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  cat text not null,
  tipo text not null default 'mascota',
  comuna text not null,
  contacto text not null,
  servicios text,
  meta text,
  founder_number int not null,
  created_at timestamptz not null default now()
);

create table if not exists socios (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  pet text not null,
  species text,
  breed text,
  comuna text,
  email text,
  socio_number int not null,
  foto text,
  documentos jsonb,
  notas_medicas text,
  edad text,
  peso text,
  tamano text,
  representante_nombre text,
  representante_rut text,
  representante_telefono text,
  created_at timestamptz not null default now()
);

create table if not exists canjes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id),
  negocio_nombre text,
  negocio_codigo text,
  socio_id uuid references socios(id),
  socio_nombre text,
  socio_mascota text,
  socio_codigo text,
  monto numeric not null,
  ahorro numeric,
  created_at timestamptz not null default now()
);

create sequence if not exists negocio_seq start 1;
create sequence if not exists socio_seq start 1;

-- ---------- SEGURIDAD (RLS) ----------
-- Negocios: el directorio es público, cualquiera puede verlo.
-- Socios y canjes: NADIE puede leerlos directo (ni con la clave pública del sitio) —
-- solo se accede vía las funciones de abajo (con el código de socio) o el panel
-- con tu inicio de sesión real de administrador.

alter table negocios enable row level security;
alter table socios enable row level security;
alter table canjes enable row level security;

create policy "negocios_select_public" on negocios for select using (true);
create policy "socios_select_admin" on socios for select using (auth.role() = 'authenticated');
create policy "canjes_select_admin" on canjes for select using (auth.role() = 'authenticated');

-- Nadie inserta directo a las tablas — todo pasa por las funciones seguras de abajo.

-- ---------- FUNCIONES SEGURAS (RPC) ----------

create or replace function registrar_negocio(
  p_nombre text, p_cat text, p_tipo text, p_comuna text, p_contacto text, p_servicios text
) returns table(codigo text, founder_number int)
language plpgsql security definer as $$
declare
  v_num int; v_codigo text;
begin
  v_num := nextval('negocio_seq');
  v_codigo := 'NEG' || lpad(v_num::text, 4, '0');
  insert into negocios (codigo, nombre, cat, tipo, comuna, contacto, servicios, meta, founder_number)
  values (v_codigo, p_nombre, p_cat, p_tipo, p_comuna, p_contacto, p_servicios,
          coalesce(nullif(p_servicios,''), p_cat || ' en ' || p_comuna || '.'), v_num);
  return query select v_codigo, v_num;
end; $$;

create or replace function registrar_socio(
  p_pet text, p_species text, p_breed text, p_comuna text, p_email text
) returns table(codigo text, socio_number int)
language plpgsql security definer as $$
declare
  v_num int; v_codigo text;
begin
  v_num := nextval('socio_seq');
  v_codigo := 'MMC' || lpad(v_num::text, 5, '0');
  insert into socios (codigo, pet, species, breed, comuna, email, socio_number)
  values (v_codigo, p_pet, p_species, p_breed, p_comuna, p_email, v_num);
  return query select v_codigo, v_num;
end; $$;

create or replace function contar_socios() returns int
language sql security definer as $$ select count(*)::int from socios; $$;

create or replace function contar_canjes() returns int
language sql security definer as $$ select count(*)::int from canjes; $$;

-- Solo quien tiene el código puede ver o editar esa ficha (no expone la tabla completa)
create or replace function buscar_ficha_por_codigo(p_codigo text)
returns table(pet text, species text, breed text, comuna text, foto text, documentos jsonb,
              notas_medicas text, edad text, peso text, tamano text,
              representante_nombre text, representante_rut text, representante_telefono text, email text)
language sql security definer as $$
  select pet, species, breed, comuna, foto, documentos, notas_medicas, edad, peso, tamano,
         representante_nombre, representante_rut, representante_telefono, email
  from socios where codigo = upper(p_codigo);
$$;

create or replace function actualizar_ficha(
  p_codigo text, p_foto text, p_documentos jsonb, p_notas_medicas text,
  p_edad text, p_peso text, p_tamano text,
  p_representante_nombre text, p_representante_rut text, p_representante_telefono text, p_email text
) returns boolean
language plpgsql security definer as $$
begin
  update socios set
    foto = coalesce(p_foto, foto),
    documentos = coalesce(p_documentos, documentos),
    notas_medicas = p_notas_medicas, edad = p_edad, peso = p_peso, tamano = p_tamano,
    representante_nombre = p_representante_nombre, representante_rut = p_representante_rut,
    representante_telefono = p_representante_telefono, email = coalesce(p_email, email)
  where codigo = upper(p_codigo);
  return found;
end; $$;

-- Valida negocio + socio y registra la compra, todo de forma segura en el servidor
create or replace function registrar_canje(p_negocio_codigo text, p_socio_codigo text, p_monto numeric)
returns table(ok boolean, mensaje text, nombre_mostrar text, ahorro numeric, negocio_nombre text)
language plpgsql security definer as $$
declare
  v_negocio negocios%rowtype; v_socio socios%rowtype;
  v_nombre text; v_ahorro numeric;
begin
  select * into v_negocio from negocios where codigo = upper(p_negocio_codigo);
  if not found then
    return query select false, 'Código de negocio no encontrado.', null::text, null::numeric, null::text; return;
  end if;
  select * into v_socio from socios where codigo = upper(p_socio_codigo);
  if not found then
    return query select false, 'Código de socio no encontrado.', null::text, null::numeric, null::text; return;
  end if;
  if p_monto is null or p_monto <= 0 then
    return query select false, 'Monto inválido.', null::text, null::numeric, null::text; return;
  end if;
  v_ahorro := p_monto * 0.10;
  if v_negocio.tipo = 'dueno' then
    v_nombre := coalesce(nullif(v_socio.representante_nombre,''), 'Socio ' || v_socio.codigo);
  else
    v_nombre := v_socio.pet;
  end if;
  insert into canjes (negocio_id, negocio_nombre, negocio_codigo, socio_id, socio_nombre, socio_mascota, socio_codigo, monto, ahorro)
  values (v_negocio.id, v_negocio.nombre, v_negocio.codigo, v_socio.id, v_nombre, v_socio.pet, v_socio.codigo, p_monto, v_ahorro);
  return query select true, 'Visita validada.', v_nombre, v_ahorro, v_negocio.nombre;
end; $$;

grant execute on function registrar_negocio(text,text,text,text,text,text) to anon, authenticated;
grant execute on function registrar_socio(text,text,text,text,text) to anon, authenticated;
grant execute on function contar_socios() to anon, authenticated;
grant execute on function contar_canjes() to anon, authenticated;
grant execute on function buscar_ficha_por_codigo(text) to anon, authenticated;
grant execute on function actualizar_ficha(text,text,jsonb,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function registrar_canje(text,text,numeric) to anon, authenticated;
