-- ============================================================
--  Mi Mascota Club — Parche de seguridad v13
--  6 de septiembre de 2026
-- ------------------------------------------------------------
--  Qué arregla y por qué:
--
--  1) Funciones de ESCRITURA abiertas a cualquiera.
--     actualizar_ficha() y actualizar_ficha_negocio() son
--     SECURITY DEFINER y estaban con permiso de ejecución para
--     el rol `anon`: cualquier persona con la anon key (que va
--     en el HTML, o sea, pública) podía llamar al endpoint
--     /rest/v1/rpc/actualizar_ficha_negocio con un código y
--     cambiarle a ese negocio el logo, la dirección, el horario,
--     las redes y la descripción. Lo mismo con la ficha de una
--     mascota (foto, documentos, notas médicas).
--     Hoy ninguna de las dos se usa en el sitio (quedaron de una
--     versión anterior del panel), así que se les quita el
--     permiso. Si algún día se vuelven a necesitar, hay que
--     rehacerlas pidiendo sesión iniciada, no solo el código.
--
--  2) Funciones de LECTURA que exponen datos con solo el código.
--     buscar_ficha_por_codigo() devuelve foto, documentos y
--     notas médicas de una mascota a quien tenga el código.
--     buscar_ficha_negocio() y detalle_validaciones_socio() son
--     del mismo tipo. Tampoco se usan hoy: se cierran.
--
--  3) search_path mutable en las 22 funciones SECURITY DEFINER.
--     Sin search_path fijo, una función SECURITY DEFINER puede
--     ser engañada para ejecutar una tabla o función falsa
--     puesta en otro esquema. Es la advertencia que más repite
--     el linter de Supabase y se arregla de una sola vez.
--
--  Ejecutar completo en el SQL Editor de Supabase. Es idempotente:
--  se puede correr más de una vez sin problema.
-- ============================================================


-- ------------------------------------------------------------
-- 1 y 2) Cerrar las RPC que no se usan y no deberían ser públicas
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.actualizar_ficha(text, text, jsonb, text, boolean)        FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.actualizar_ficha_negocio(text, text, text, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.buscar_ficha_por_codigo(text)                              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.buscar_ficha_negocio(text)                                 FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.detalle_validaciones_socio(text, text)                     FROM anon, authenticated, public;


-- ------------------------------------------------------------
-- 3) Fijar search_path en TODAS las funciones SECURITY DEFINER
--    del esquema public (las 22 que hay hoy y las que se agreguen
--    antes de volver a correr esto).
-- ------------------------------------------------------------
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS firma
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.firma);
  END LOOP;
END $$;


-- ------------------------------------------------------------
-- Verificación: después de correr esto, esta consulta no debería
-- devolver ninguna fila.
-- ------------------------------------------------------------
SELECT p.oid::regprocedure::text AS funcion_sin_search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.prosecdef = true
  AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'));


-- ============================================================
--  QUEDA PENDIENTE, A MANO EN EL PANEL DE SUPABASE:
--
--  Authentication → Policies → Password protection
--    Activar "Leaked password protection" (compara la contraseña
--    contra HaveIBeenPwned). Es un switch, no se puede hacer
--    desde SQL.
--
--  NOTA sobre las advertencias que quedan:
--  El linter va a seguir marcando "anon_security_definer_function_
--  executable" para las RPC que SÍ se usan (registrar_socio,
--  registrar_negocio, verificar_codigo_email, enviar_validacion,
--  registrar_canje, verificar_plan, contar_socios, contar_canjes,
--  resumen_reputacion_negocio, pendientes_por_validar,
--  detalle_validaciones_negocio). Eso es correcto y esperado: son
--  las funciones que el sitio necesita llamar sin sesión iniciada.
--  Las de admin (admin_fichas_pendientes, aprobar_solicitud_negocio,
--  rechazar_solicitud_negocio, admin_editar_ficha) sí validan por
--  dentro con es_admin(), así que también están bien.
-- ============================================================
