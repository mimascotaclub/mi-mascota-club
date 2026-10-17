-- ============================================================
-- Mi Mascota Club · Avisos al celular (notificaciones push) · v35
-- 17 de octubre de 2026
--
-- Guarda la "dirección" de cada celular que aceptó recibir avisos.
-- Nadie la lee desde el navegador (RLS sin políticas): solo la
-- función enviar-aviso.js de Netlify, con la Service Role Key.
--   socio_push_suscribir → la llama Mi Mascota al tocar "Activar avisos"
--   socio_push_quitar    → al tocar "Desactivar"
--   admin_push_resumen   → cuántos celulares hay (para /mi-panel)
-- ============================================================

create table if not exists public.push_suscripciones (
  id bigserial primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  email text,
  agente text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  ultimo_envio timestamptz
);
alter table public.push_suscripciones enable row level security;
create index if not exists push_suscripciones_email_idx on public.push_suscripciones (lower(email));

create or replace function public.socio_push_suscribir(p_token uuid, p_endpoint text, p_p256dh text, p_auth text, p_agente text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_email text;
begin
  v_email := public.socio_email_de_token(p_token);
  if v_email is null then raise exception 'Sesión no válida'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh),0) not between 80 and 100 or coalesce(length(p_auth),0) not between 16 and 30 then
    raise exception 'Datos de aviso no válidos';
  end if;
  if (select count(*) from push_suscripciones where lower(email) = lower(v_email)) >= 10
     and not exists (select 1 from push_suscripciones where endpoint = p_endpoint) then
    raise exception 'Demasiados celulares para este correo';
  end if;
  insert into push_suscripciones (endpoint, p256dh, auth, email, agente)
  values (p_endpoint, p_p256dh, p_auth, lower(v_email), left(p_agente, 200))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
    email = excluded.email, agente = excluded.agente, actualizado_en = now();
  return true;
end $$;

create or replace function public.socio_push_quitar(p_token uuid, p_endpoint text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_email text;
begin
  v_email := public.socio_email_de_token(p_token);
  if v_email is null then return false; end if;
  delete from push_suscripciones where endpoint = p_endpoint and lower(email) = lower(v_email);
  return true;
end $$;

create or replace function public.admin_push_resumen()
returns table(celulares bigint, correos bigint) language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  return query select count(*), count(distinct lower(email)) from push_suscripciones;
end $$;

revoke all on function public.socio_push_suscribir(uuid, text, text, text, text) from public;
revoke all on function public.socio_push_quitar(uuid, text) from public;
revoke all on function public.admin_push_resumen() from public;
grant execute on function public.socio_push_suscribir(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.socio_push_quitar(uuid, text) to anon, authenticated;
grant execute on function public.admin_push_resumen() to authenticated;
