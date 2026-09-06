-- ============================================================
--  Mi Mascota Club — Panel del negocio + monto opcional (v14)
--  6 de septiembre de 2026
-- ------------------------------------------------------------
--  1) El monto de la compra pasa a ser OPCIONAL.
--     Hay beneficios que no tienen un monto claro (2x1, un
--     servicio gratis, un upgrade). Si el campo es obligatorio,
--     el negocio inventa un número con tal de poder validar, y
--     eso ensucia los datos. Mejor registrar la visita sin monto
--     que registrar una visita con un monto falso.
--
--  2) Dos funciones nuevas para el panel del negocio: una valida
--     el acceso y otra devuelve las visitas.
--
--  SOBRE EL ACCESO AL PANEL: el negocio entra con su código
--  (NEG0001) MÁS el correo con el que se registró. El código solo
--  no sirve, porque los códigos son correlativos y cualquiera
--  podría probar NEG0001, NEG0002... y ver los clientes de otro.
--  El correo no se puede adivinar desde el código, así que esto
--  cierra ese agujero sin montar todavía un sistema de login.
--  Cuando haya más negocios conviene subirlo a un código por
--  correo (como el de los dueños), reusando enviar-codigo.js.
--
--  Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Monto opcional
-- ------------------------------------------------------------
ALTER TABLE public.canjes ALTER COLUMN monto DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.registrar_canje(
  p_negocio_codigo text,
  p_socio_codigo   text,
  p_monto          numeric DEFAULT NULL
)
RETURNS TABLE(ok boolean, mensaje text, nombre_mostrar text, ahorro numeric,
              negocio_nombre text, canje_id uuid, negocio_plan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_negocio negocios%rowtype; v_socio socios%rowtype;
  v_nombre text; v_ahorro numeric; v_canje_id uuid;
begin
  select * into v_negocio from negocios where codigo = upper(p_negocio_codigo);
  if not found then
    return query select false, 'Código de negocio no encontrado.', null::text, null::numeric, null::text, null::uuid, null::text; return;
  end if;

  select * into v_socio from socios where codigo = upper(p_socio_codigo);
  if not found then
    return query select false, 'Código de socio no encontrado.', null::text, null::numeric, null::text, null::uuid, null::text; return;
  end if;

  -- El monto ahora puede venir vacío. Si viene, tiene que ser positivo.
  if p_monto is not null and p_monto <= 0 then
    return query select false, 'El monto tiene que ser mayor que cero (o dejarlo vacío).', null::text, null::numeric, null::text, null::uuid, null::text; return;
  end if;

  v_ahorro := case when p_monto is null then null else p_monto * 0.10 end;

  if v_negocio.tipo = 'dueno' then
    v_nombre := coalesce(nullif(v_socio.representante_nombre,''), 'Socio ' || v_socio.codigo);
  else
    v_nombre := v_socio.pet;
  end if;

  insert into canjes (negocio_id, negocio_nombre, negocio_codigo, socio_id, socio_nombre, socio_mascota, socio_codigo, monto, ahorro)
  values (v_negocio.id, v_negocio.nombre, v_negocio.codigo, v_socio.id, v_nombre, v_socio.pet, v_socio.codigo, p_monto, v_ahorro)
  returning id into v_canje_id;

  return query select true, 'Visita validada.', v_nombre, v_ahorro, v_negocio.nombre, v_canje_id, v_negocio.plan;
end; $function$;


-- ------------------------------------------------------------
-- 2a) Acceso al panel: código de negocio + correo de registro
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.negocio_acceso(p_codigo text, p_email text)
RETURNS TABLE(ok boolean, nombre text, plan text, beneficio text,
              founder_number integer, desde timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare v negocios%rowtype;
begin
  select * into v from negocios
   where codigo = upper(trim(p_codigo))
     and lower(trim(coalesce(email,''))) = lower(trim(coalesce(p_email,'')))
     and coalesce(email,'') <> '';
  if not found then
    return query select false, null::text, null::text, null::text, null::integer, null::timestamptz;
    return;
  end if;
  return query select true, v.nombre, v.plan,
                      nullif(trim(coalesce(v.beneficio_tipo,'') || ' · ' || coalesce(v.beneficio_detalle,'')), '·'),
                      v.founder_number, v.created_at;
end; $function$;


-- ------------------------------------------------------------
-- 2b) Visitas validadas de ese negocio (últimas 300)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.historial_negocio(p_codigo text, p_email text)
RETURNS TABLE(fecha timestamptz, socio_nombre text, socio_mascota text,
              socio_codigo text, monto numeric, ahorro numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- Sin el par código + correo correcto, no devuelve ninguna fila.
  if not exists (
    select 1 from negocios
     where codigo = upper(trim(p_codigo))
       and lower(trim(coalesce(email,''))) = lower(trim(coalesce(p_email,'')))
       and coalesce(email,'') <> ''
  ) then
    return;
  end if;

  return query
    select c.created_at, c.socio_nombre, c.socio_mascota, c.socio_codigo, c.monto, c.ahorro
      from canjes c
     where c.negocio_codigo = upper(trim(p_codigo))
     order by c.created_at desc
     limit 300;
end; $function$;


-- ------------------------------------------------------------
-- 3) Permisos: solo el rol anónimo del sitio, nada de PUBLIC
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.negocio_acceso(text, text)    FROM public;
REVOKE ALL ON FUNCTION public.historial_negocio(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.negocio_acceso(text, text)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.historial_negocio(text, text) TO anon, authenticated;


-- ------------------------------------------------------------
-- Verificación: las tres funciones con search_path fijo.
-- Tiene que devolver 3 filas, todas con search_path=public, pg_temp.
-- ------------------------------------------------------------
SELECT p.proname, array_to_string(p.proconfig, ',') AS config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('registrar_canje','negocio_acceso','historial_negocio')
ORDER BY 1;
