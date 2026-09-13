-- ============================================================
--  Mi Mascota Club — Buzón de sugerencias (v21)
--  13 de septiembre de 2026
--
--  ⚠️ YA EJECUTADO. Documentación: NO volver a correrlo.
-- ------------------------------------------------------------
--  DECISIÓN: las sugerencias se GUARDAN, no se envían por correo.
--
--  La idea original era mandarlas a holamimascotaclub@gmail.com,
--  pero un formulario público que dispara correos es un blanco
--  fácil: un bot lo golpea mil veces y quema los 200 correos
--  mensuales de EmailJS — que son los mismos que sostienen el
--  registro de socios y el acceso de los negocios. Perder eso por
--  un buzón de sugerencias sería un mal negocio.
--
--  Así que se guardan en la base y Jaime las lee en /mi-panel.
--  Cuesta cero correos y no se pierde ninguna. En la página igual
--  hay un enlace mailto: para quien prefiera escribir directo —
--  ese correo lo manda la persona desde su propia cuenta, así que
--  no gasta cuota.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sugerencias (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto      text NOT NULL,
  nombre     text,
  email      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  leida      boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS sugerencias_fecha_idx ON public.sugerencias (created_at DESC);

ALTER TABLE public.sugerencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sugerencias FROM anon, authenticated;
GRANT SELECT ON public.sugerencias TO authenticated;

DROP POLICY IF EXISTS sugerencias_select_admin ON public.sugerencias;
CREATE POLICY sugerencias_select_admin ON public.sugerencias
  FOR SELECT TO authenticated USING (public.es_admin());

-- enviar_sugerencia(texto, nombre, email)
--   · nombre y correo son OPCIONALES: si alguien quiere decir algo y
--     quedarse anónimo, mejor que lo diga
--   · mínimo 10 y máximo 3.000 caracteres
--   · freno contra ráfagas: máximo 20 sugerencias por hora en total
--
-- admin_sugerencia_leida(id, leida) -> marcar leída/no leída, solo admin
--
-- (Definiciones completas aplicadas en la migración sugerencias_v21.)

REVOKE ALL ON FUNCTION public.enviar_sugerencia(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.enviar_sugerencia(text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_sugerencia_leida(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_sugerencia_leida(uuid, boolean) TO authenticated;


-- ============================================================
--  ACTUALIZACIÓN v22 (mismo día): nombre y correo OBLIGATORIOS
--
--  Dejarlas anónimas invitaba a que alguien dejara odio sin costo.
--  Pedir nombre y correo no verifica a nadie —se puede escribir uno
--  falso— pero sube la barrera para el impulso y deja con quién
--  responder cuando la idea es buena.
--
--  enviar_sugerencia() ahora exige:
--    · nombre de al menos 3 caracteres
--    · correo con formato válido
--    · máximo 3 sugerencias por correo cada 24 horas
--  (además de los topes que ya tenía de largo y de ráfaga por hora)
-- ============================================================
