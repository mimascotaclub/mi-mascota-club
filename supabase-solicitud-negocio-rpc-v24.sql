-- ============================================================
--  Mi Mascota Club — Inscripción de negocios por RPC (v24)
--  13 de septiembre de 2026
--
--  ⚠️ YA EJECUTADO. Documentación: NO volver a correrlo.
-- ------------------------------------------------------------
--  EL ERROR QUE CORRIGE
--
--  formulario-negocio-v3.html insertaba DIRECTO en la tabla:
--      await sb.from('negocios_solicitudes').insert(payload)
--
--  El parche v17 revocó los permisos de escritura directa sobre
--  todas las tablas. Eso dejó el formulario de negocios ROTO: desde
--  ese momento ningún negocio podía inscribirse.
--
--  Cómo se pasó por alto: al revisar si algo escribía directo, la
--  búsqueda incluyó este archivo pero el archivo no estaba
--  descargado en ese momento, así que no arrojó coincidencias y se
--  leyó como "nadie escribe directo".
--
--  LA CORRECCIÓN
--
--  No se reabre el permiso directo. La inscripción pasa por
--  registrar_solicitud_negocio(jsonb), que además valida:
--    · el consentimiento es obligatorio
--    · los 12 campos que la tabla exige, con mensaje claro de cuál falta
--    · el correo del responsable con formato válido — es la credencial
--      con la que después entra a su panel y valida canjes
--    · tope de 10 inscripciones por hora
--
--  Y se agregaron las columnas terminos_aceptados_en y
--  terminos_version, igual que en socios, para dejar registrado
--  cuándo aceptó y qué versión del texto.
-- ============================================================

ALTER TABLE public.negocios_solicitudes ADD COLUMN IF NOT EXISTS terminos_aceptados_en timestamptz;
ALTER TABLE public.negocios_solicitudes ADD COLUMN IF NOT EXISTS terminos_version text;

-- (Definición completa aplicada en la migración registrar_solicitud_negocio_v24b.)

REVOKE ALL ON FUNCTION public.registrar_solicitud_negocio(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_solicitud_negocio(jsonb) TO anon, authenticated;


-- ============================================================
--  ADEMÁS, EL BUCKET DE IMÁGENES
--
--  Tenía dos problemas:
--    1. Una política que permitía LISTAR todos los archivos. Un bucket
--       público sirve las imágenes por URL sin pasar por RLS, así que
--       esa política no aportaba nada y sí dejaba pedir el inventario
--       completo. Supabase lo marcaba con una advertencia. Se eliminó.
--    2. Aceptaba CUALQUIER archivo de CUALQUIER tamaño. Alguien podía
--       llenar el gigabyte gratis con basura —y ahí se cae el registro
--       de negocios— o alojar archivos propios en el proyecto.
--
--  Ahora: máximo 5 MB, y solo PNG y JPG. Se descartó el SVG porque
--  puede llevar código adentro y no vale la pena el riesgo para un logo.
-- ============================================================
-- DROP POLICY negocios_bucket_read ON storage.objects;
-- UPDATE storage.buckets SET file_size_limit = 5242880,
--        allowed_mime_types = ARRAY['image/png','image/jpeg'] WHERE id = 'negocios';
