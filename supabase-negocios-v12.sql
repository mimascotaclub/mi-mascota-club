-- ============================================================
-- Mi Mascota Club — v12
-- Panel de aprobación de fichas de negocio
-- ------------------------------------------------------------
-- YA EJECUTADO en el proyecto. Se guarda como registro del
-- cambio, igual que los supabase-fix-vX.sql anteriores.
--
-- Qué hace: crea la tabla `admins` (quién puede aprobar), y las
-- funciones que usa la sección "Fichas por aprobar" del panel
-- privado. Todas verifican que el usuario logueado sea admin,
-- así que la publishable key por sí sola no puede ver los datos
-- privados ni aprobar nada.
-- ============================================================

create table if not exists public.admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text,
  creado_en timestamptz not null default now()
);
alter table public.admins enable row level security;

-- Tu usuario administrador (Authentication → Users).
-- Para sumar a otra persona: copia su User UID desde ese panel
-- y agrégala aquí con otro insert igual a este.
insert into public.admins (user_id, email)
values ('d14227c1-2064-44c8-96f9-ad3cc8602b2b', 'holamimascotaclub@gmail.com')
on conflict (user_id) do nothing;

create or replace function public.es_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.es_admin() to authenticated;

-- Cola de fichas por aprobar (trae también los datos privados)
create or replace function public.admin_fichas_pendientes()
returns setof public.negocios_solicitudes
language plpgsql security definer as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  return query
    select * from public.negocios_solicitudes
     where estado = 'pendiente'
     order by creado_en;
end $$;

-- Editar una ficha antes de aprobarla (botón "Modificar").
-- Solo se tocan los campos que llegan con valor.
create or replace function public.admin_editar_ficha(
  p_id uuid,
  p_nombre text default null, p_dir_cat text default null, p_dir_tipo text default null,
  p_es_especialista boolean default null, p_comuna text default null,
  p_direccion text default null, p_google_maps_url text default null,
  p_telefono_local text default null, p_whatsapp text default null,
  p_instagram text default null, p_facebook text default null, p_tiktok text default null,
  p_horario_texto text default null, p_horario_dias text default null,
  p_descripcion text default null,
  p_beneficio_label text default null, p_beneficio_condicion text default null
) returns void
language plpgsql security definer as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  update public.negocios_solicitudes set
    nombre              = coalesce(nullif(p_nombre,''), nombre),
    dir_cat             = coalesce(nullif(p_dir_cat,''), dir_cat),
    dir_tipo            = coalesce(nullif(p_dir_tipo,''), dir_tipo),
    es_especialista     = coalesce(p_es_especialista, es_especialista),
    comuna              = coalesce(nullif(p_comuna,''), comuna),
    direccion           = coalesce(p_direccion, direccion),
    google_maps_url     = coalesce(p_google_maps_url, google_maps_url),
    telefono_local      = coalesce(p_telefono_local, telefono_local),
    whatsapp            = coalesce(p_whatsapp, whatsapp),
    instagram           = coalesce(p_instagram, instagram),
    facebook            = coalesce(p_facebook, facebook),
    tiktok              = coalesce(p_tiktok, tiktok),
    horario_texto       = coalesce(nullif(p_horario_texto,''), horario_texto),
    horario_dias        = coalesce(p_horario_dias, horario_dias),
    descripcion         = coalesce(p_descripcion, descripcion),
    beneficio_label     = coalesce(nullif(p_beneficio_label,''), beneficio_label),
    beneficio_condicion = coalesce(p_beneficio_condicion, beneficio_condicion)
  where id = p_id and estado = 'pendiente';
end $$;

-- aprobar_solicitud_negocio y rechazar_solicitud_negocio (de v11)
-- se reemplazaron para que también verifiquen es_admin(). El cuerpo
-- completo está aplicado en la base; ver supabase-negocios-v11.sql
-- para la lógica de copiado al directorio.

grant execute on function public.admin_fichas_pendientes() to authenticated;
grant execute on function public.aprobar_solicitud_negocio(uuid) to authenticated;
grant execute on function public.rechazar_solicitud_negocio(uuid, text) to authenticated;
grant execute on function public.admin_editar_ficha(uuid,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
revoke execute on function public.admin_fichas_pendientes() from anon;
revoke execute on function public.aprobar_solicitud_negocio(uuid) from anon;
revoke execute on function public.rechazar_solicitud_negocio(uuid, text) from anon;
revoke execute on function public.admin_editar_ficha(uuid,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text,text,text,text) from anon;
