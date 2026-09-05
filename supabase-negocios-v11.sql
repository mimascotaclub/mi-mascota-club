-- ============================================================
-- Mi Mascota Club — v11
-- Inscripción de negocios: solicitudes + aprobación manual
-- ------------------------------------------------------------
-- IMPORTANTE: la tabla `negocios` que ya existe (el directorio en
-- vivo) NO cambia su estructura actual. Solo se le AGREGAN columnas
-- públicas nuevas para la ficha. Los datos privados (RUT, correo y
-- teléfono del responsable) viven en una tabla aparte que nadie
-- puede leer con la anon key.
--
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Columnas públicas nuevas en `negocios`
--    Todas son visibles: la política negocios_select_public deja
--    leer esta tabla completa, así que aquí NO va nada privado.
-- ------------------------------------------------------------
alter table public.negocios add column if not exists foto                text;
alter table public.negocios add column if not exists google_maps_url     text;
alter table public.negocios add column if not exists whatsapp            text;
alter table public.negocios add column if not exists instagram           text;
alter table public.negocios add column if not exists facebook            text;
alter table public.negocios add column if not exists tiktok              text;
alter table public.negocios add column if not exists sitio_web           text;
alter table public.negocios add column if not exists horario_dias        text;
alter table public.negocios add column if not exists tiene_local         boolean not null default true;
alter table public.negocios add column if not exists comunas_cobertura   text[];
alter table public.negocios add column if not exists tipo_negocio        text;
alter table public.negocios add column if not exists beneficio_valor     text;
alter table public.negocios add column if not exists beneficio_sobre     text;
alter table public.negocios add column if not exists beneficio_cuando    text;
alter table public.negocios add column if not exists beneficio_monto_min integer;

create index if not exists idx_negocios_beneficio_cuando on public.negocios (beneficio_cuando);
create index if not exists idx_negocios_tipo_negocio     on public.negocios (tipo_negocio);


-- ------------------------------------------------------------
-- 2) Tabla de solicitudes
--    Aquí llega TODO lo que llena el negocio, incluidos los datos
--    privados. Solo se puede insertar; no se puede leer.
-- ------------------------------------------------------------
create table if not exists public.negocios_solicitudes (
  id                   uuid primary key default gen_random_uuid(),
  creado_en            timestamptz not null default now(),
  revisado_en          timestamptz,

  estado               text not null default 'pendiente'
                       check (estado in ('pendiente','aprobada','rechazada')),
  motivo_rechazo       text,
  negocio_id           uuid references public.negocios(id) on delete set null,

  -- ---------- Se publica en la ficha ----------
  nombre               text not null,
  tipo_negocio         text not null,      -- id del catálogo (js/catalogos-negocio.js)
  dir_tipo             text not null,      -- 'mascota' | 'dueno'  (directorio)
  dir_cat              text not null,      -- categoría del directorio
  es_especialista      boolean not null default false,
  tiene_local          boolean not null default true,
  descripcion          text,

  region               text,
  comuna               text not null,      -- SIEMPRE obligatoria
  comunas_cobertura    text[],
  direccion            text,
  google_maps_url      text,

  telefono_local       text,
  whatsapp             text,
  instagram            text,
  facebook             text,
  tiktok               text,
  sitio_web            text,

  horario_texto        text,
  horario_dias         text,

  logo_url             text,
  foto_url             text,

  beneficio_valor      text not null,
  beneficio_sobre      text not null,
  beneficio_cuando     text not null,
  beneficio_monto_min  integer,
  beneficio_detalle    text,
  beneficio_label      text,               -- "20% de descuento"
  beneficio_condicion  text,               -- "En compras sobre $30.000 · Solo los jueves"

  -- ---------- Privado: nunca se publica ----------
  razon_social         text,
  rut_comercial        text not null,
  responsable_nombre   text not null,
  responsable_rut      text not null,
  responsable_email    text not null,
  responsable_telefono text not null,
  email_verificado     boolean not null default false,

  acepta_terminos      boolean not null default false,
  origen               text default 'formulario-negocio-v3'
);

create index if not exists idx_solicitudes_estado on public.negocios_solicitudes (estado, creado_en);


-- ------------------------------------------------------------
-- 3) RLS de las solicitudes
--    INSERT abierto (cualquiera postula) · SELECT cerrado.
--    Sin política de SELECT, la anon key no puede leer ni una fila,
--    así que los RUT y correos no salen aunque alguien inspeccione
--    la red desde el navegador.
-- ------------------------------------------------------------
alter table public.negocios_solicitudes enable row level security;

drop policy if exists "solicitudes_insert_publico" on public.negocios_solicitudes;
create policy "solicitudes_insert_publico"
  on public.negocios_solicitudes for insert
  to anon, authenticated
  with check (estado = 'pendiente');


-- ------------------------------------------------------------
-- 4) Storage: bucket para logos y fotos
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('negocios', 'negocios', true)
on conflict (id) do nothing;

drop policy if exists "negocios_bucket_upload" on storage.objects;
create policy "negocios_bucket_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'negocios');

drop policy if exists "negocios_bucket_read" on storage.objects;
create policy "negocios_bucket_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'negocios');


-- ------------------------------------------------------------
-- 5) Aprobar: copia la solicitud al directorio en vivo
--    Genera codigo y founder_number con la misma secuencia que usa
--    registrar_negocio, para no romper la numeración de fundadores.
-- ------------------------------------------------------------
create or replace function public.aprobar_solicitud_negocio(p_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  s public.negocios_solicitudes%rowtype;
  v_num int;
  v_codigo text;
  v_contacto text;
  v_meta text;
  v_negocio_id uuid;
begin
  select * into s from public.negocios_solicitudes where id = p_id;
  if not found then
    raise exception 'No existe la solicitud %', p_id;
  end if;
  if s.estado = 'aprobada' then
    raise exception 'La solicitud ya fue aprobada (negocio %)', s.negocio_id;
  end if;

  v_num      := nextval('negocio_seq');
  v_codigo   := 'NEG' || lpad(v_num::text, 4, '0');
  v_contacto := nullif(concat_ws(' · ',
                  nullif(trim(coalesce(s.telefono_local, s.whatsapp, '')), ''),
                  nullif(trim(coalesce(s.direccion, s.comuna)), '')), '');
  v_meta     := coalesce(nullif(s.descripcion, ''), s.dir_cat || ' en ' || s.comuna || '.');

  insert into public.negocios (
    codigo, nombre, cat, tipo, comuna, email, telefono, contacto, servicios, meta,
    founder_number, beneficio_tipo, beneficio_detalle, logo, direccion, horario,
    redes_sociales, descripcion, es_especialista,
    foto, google_maps_url, whatsapp, instagram, facebook, tiktok, sitio_web,
    horario_dias, tiene_local, comunas_cobertura, tipo_negocio,
    beneficio_valor, beneficio_sobre, beneficio_cuando, beneficio_monto_min
  ) values (
    v_codigo, s.nombre, s.dir_cat, s.dir_tipo, s.comuna,
    null,                       -- el correo del responsable NO se publica
    s.telefono_local, v_contacto, s.descripcion, v_meta,
    v_num, s.beneficio_label, s.beneficio_condicion, s.logo_url, s.direccion, s.horario_texto,
    s.instagram, s.descripcion, s.es_especialista,
    s.foto_url, s.google_maps_url, s.whatsapp, s.instagram, s.facebook, s.tiktok, s.sitio_web,
    s.horario_dias, s.tiene_local, s.comunas_cobertura, s.tipo_negocio,
    s.beneficio_valor, s.beneficio_sobre, s.beneficio_cuando, s.beneficio_monto_min
  )
  returning id into v_negocio_id;

  update public.negocios_solicitudes
     set estado = 'aprobada', revisado_en = now(), motivo_rechazo = null, negocio_id = v_negocio_id
   where id = p_id;

  return v_codigo;
end $$;


create or replace function public.rechazar_solicitud_negocio(p_id uuid, p_motivo text)
returns void
language sql
security definer
as $$
  update public.negocios_solicitudes
     set estado = 'rechazada', revisado_en = now(), motivo_rechazo = p_motivo
   where id = p_id;
$$;

-- Solo tú (service role / SQL Editor) puedes aprobar o rechazar.
revoke execute on function public.aprobar_solicitud_negocio(uuid) from anon, authenticated;
revoke execute on function public.rechazar_solicitud_negocio(uuid, text) from anon, authenticated;


-- ------------------------------------------------------------
-- 6) Cola de revisión — para el día a día
--    Se consulta desde el SQL Editor, nunca desde el navegador.
-- ------------------------------------------------------------
create or replace view public.cola_negocios as
select id, creado_en, nombre, dir_cat, comuna,
       concat_ws(' · ', beneficio_label, beneficio_condicion) as beneficio,
       responsable_nombre, responsable_email, responsable_telefono,
       logo_url, foto_url
from public.negocios_solicitudes
where estado = 'pendiente'
order by creado_en;

revoke all on public.cola_negocios from anon, authenticated;
