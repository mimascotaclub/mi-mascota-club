-- ============================================================
-- PARCHE v10: Verificación real de correo con código (OTP)
-- ============================================================
-- Ejecuta esto UNA VEZ en el SQL Editor de Supabase.
-- Crea la tabla donde se guardan los códigos temporales y la
-- función que los valida. La tabla NO es legible directo desde
-- el navegador (RLS activo, sin políticas de select/insert) —
-- solo el backend (Netlify Function, con la Service Role Key)
-- puede escribir ahí, y solo esta función puede leerla.
-- ============================================================

create table if not exists codigos_verificacion (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  codigo text not null,
  usado boolean not null default false,
  expira_en timestamptz not null,
  created_at timestamptz not null default now()
);

alter table codigos_verificacion enable row level security;
-- A propósito: no se crea ninguna policy de select/insert para "anon".
-- Solo la Service Role Key (usada por la Netlify Function) puede escribir,
-- y solo la función de abajo (security definer) puede leer, para validar.

create or replace function verificar_codigo_email(p_email text, p_codigo text)
returns boolean
language plpgsql security definer as $$
declare v_valido boolean;
begin
  select exists(
    select 1 from codigos_verificacion
    where email = lower(trim(p_email))
      and codigo = p_codigo
      and usado = false
      and expira_en > now()
  ) into v_valido;

  if v_valido then
    update codigos_verificacion set usado = true
    where email = lower(trim(p_email)) and codigo = p_codigo and usado = false;
  end if;

  return v_valido;
end; $$;

grant execute on function verificar_codigo_email(text,text) to anon, authenticated;

-- Verificación rápida
select table_name from information_schema.tables where table_name = 'codigos_verificacion';
