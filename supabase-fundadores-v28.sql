-- ============================================================================
-- MI MASCOTA CLUB — PARCHE v28 · SOCIOS FUNDADORES
-- ============================================================================
-- Qué hace: guarda quiénes pagaron el Pase de Socio Fundador y les asigna un
-- número correlativo (#001, #002, ...).
--
-- POR QUÉ UNA TABLA APARTE Y NO UNA COLUMNA EN `socios`:
-- `socios` tiene una fila POR MASCOTA. Quien inscribe dos perros aparece dos
-- veces con el mismo correo. El pase de fundador es de la PERSONA, así que su
-- llave natural es el correo, no la mascota. Con una columna en `socios`, el
-- mismo dueño quedaría con dos números de fundador.
--
-- Es seguro correrlo más de una vez: todo está con IF NOT EXISTS / REPLACE.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LA TABLA
-- ----------------------------------------------------------------------------
create table if not exists public.fundadores (
  email        text primary key,
  numero       integer not null unique,
  pagado_en    timestamptz not null default now(),
  monto        integer,
  referencia   text,   -- el id de la operación de Mercado Pago, para poder rastrearla
  nota         text
);

comment on table  public.fundadores is
  'Socios que pagaron el Pase de Socio Fundador. Una fila por PERSONA (correo), no por mascota.';
comment on column public.fundadores.numero is
  'Número correlativo de fundador (#001 en adelante). No se reutiliza.';
comment on column public.fundadores.referencia is
  'Id de la operación en Mercado Pago. Sirve para cruzar el pago si alguien reclama.';

-- Nadie entra directo a esta tabla. Todo pasa por las funciones de abajo.
alter table public.fundadores enable row level security;


-- ----------------------------------------------------------------------------
-- 2. CUÁNTOS FUNDADORES HAY (público)
-- ----------------------------------------------------------------------------
-- Lo usa la landing /quienes-somos para el contador "quedan X de 100".
-- Devuelve solo un número: no expone ningún correo.
create or replace function public.contar_fundadores()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from public.fundadores;
$$;


-- ----------------------------------------------------------------------------
-- 3. MI NÚMERO DE FUNDADOR (el socio, con su sesión)
-- ----------------------------------------------------------------------------
-- Pide el token de sesión, igual que socio_perfil o socio_historial. Así nadie
-- puede preguntar por el correo de otra persona.
-- Devuelve el número, o NULL si no es fundador.
--
-- OJO CON EL "volatile": la primera versión decía `stable` y la API respondía
-- 405 a la llamada que hace el sitio, así que la insignia nunca aparecía.
-- socio_perfil y socio_historial son volatile y funcionan. No lo cambies.
create or replace function public.socio_fundador(p_token uuid)
returns integer
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_email text;
  v_num   integer;
begin
  v_email := public.socio_email_de_token(p_token);
  if v_email is null then
    return null;
  end if;

  select numero into v_num
    from public.fundadores
   where lower(email) = lower(v_email);

  return v_num;
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. MARCAR A ALGUIEN COMO FUNDADOR (solo Jaime)
-- ----------------------------------------------------------------------------
-- Asigna el siguiente número libre y devuelve el número asignado.
-- Si el correo ya es fundador, NO crea otro: devuelve el número que ya tenía.
create or replace function public.admin_marcar_fundador(
  p_email      text,
  p_referencia text default null,
  p_monto      integer default 9990
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_num   integer;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede marcar fundadores';
  end if;

  if v_email is null or v_email = '' then
    raise exception 'Falta el correo';
  end if;

  -- Si ya es fundador, devolvemos su número y no hacemos nada más.
  select numero into v_num from public.fundadores where email = v_email;
  if v_num is not null then
    return v_num;
  end if;

  -- El correo tiene que existir entre los socios. Esto atrapa los errores de
  -- tipeo: sin esta comprobación, un correo mal escrito crea un fundador
  -- fantasma con un número gastado que nadie va a poder usar.
  if not exists (select 1 from public.socios where lower(email) = v_email) then
    raise exception 'Ese correo no está inscrito en el club. Revisa que esté bien escrito o pide que se inscriba primero.';
  end if;

  select coalesce(max(numero), 0) + 1 into v_num from public.fundadores;

  insert into public.fundadores (email, numero, monto, referencia)
  values (v_email, v_num, p_monto, nullif(trim(p_referencia), ''));

  return v_num;
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. DESHACER (solo Jaime)
-- ----------------------------------------------------------------------------
-- Para cuando te equivocas de correo o hay una devolución.
-- OJO: el número NO se reutiliza. Si borras al #007, el próximo sigue siendo
-- #008. Es a propósito: un número que reaparece en otra persona es peor que un
-- número que falta.
create or replace function public.admin_quitar_fundador(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede quitar fundadores';
  end if;

  delete from public.fundadores where email = v_email;
  return found;
end;
$$;


-- ----------------------------------------------------------------------------
-- 6. LA LISTA (solo Jaime) — para verla en /mi-panel
-- ----------------------------------------------------------------------------
create or replace function public.admin_fundadores()
returns table (
  numero     integer,
  email      text,
  mascotas   text,
  pagado_en  timestamptz,
  monto      integer,
  referencia text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver los fundadores';
  end if;

  return query
    select f.numero,
           f.email,
           -- Los nombres de sus mascotas, juntos, para reconocer de quién se trata.
           (select string_agg(s.pet, ', ' order by s.socio_number)
              from public.socios s
             where lower(s.email) = f.email),
           f.pagado_en,
           f.monto,
           f.referencia
      from public.fundadores f
     order by f.numero;
end;
$$;


-- ----------------------------------------------------------------------------
-- 7. QUIÉN PUEDE LLAMAR A QUÉ
-- ----------------------------------------------------------------------------
-- Las dos primeras las llama el sitio sin que nadie haya iniciado sesión.
grant execute on function public.contar_fundadores()        to anon, authenticated;
grant execute on function public.socio_fundador(uuid)       to anon, authenticated;

-- Las de administración solo desde una sesión iniciada, y además por dentro
-- verifican es_admin(). Doble llave.
revoke execute on function public.admin_marcar_fundador(text, text, integer) from anon;
revoke execute on function public.admin_quitar_fundador(text)                from anon;
revoke execute on function public.admin_fundadores()                         from anon;

grant execute on function public.admin_marcar_fundador(text, text, integer) to authenticated;
grant execute on function public.admin_quitar_fundador(text)                to authenticated;
grant execute on function public.admin_fundadores()                         to authenticated;


-- ============================================================================
-- CÓMO SE USA A MANO, MIENTRAS NO EXISTE EL BOTÓN EN /mi-panel
-- ============================================================================
-- Marcar a alguien (el correo tiene que estar inscrito en el club):
--
--   select admin_marcar_fundador('correo@ejemplo.cl', '1234567890', 9990);
--
-- Ver la lista:
--
--   select * from admin_fundadores();
--
-- Cuántos van (esto lo puede llamar cualquiera, es el contador de la landing):
--
--   select contar_fundadores();
--
-- Deshacer:
--
--   select admin_quitar_fundador('correo@ejemplo.cl');
-- ============================================================================
