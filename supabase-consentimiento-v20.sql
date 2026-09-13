-- ============================================================
--  Mi Mascota Club — Consentimiento al registrarse (v20)
--  13 de septiembre de 2026
--
--  ⚠️ YA EJECUTADO. Documentación: NO volver a correrlo.
-- ------------------------------------------------------------
--  Faltaba lo más básico: la persona nunca autorizaba nada.
--
--  Una casilla en el formulario no sirve si el servidor acepta el
--  registro igual, así que el consentimiento es obligatorio aquí:
--  registrar_socio LANZA UN ERROR si p_acepta_terminos viene en
--  false. Aunque alguien desbloquee el botón desde el navegador,
--  no se crea la cuenta.
--
--  Y se guarda CUÁNDO aceptó y QUÉ VERSIÓN del texto aceptó. Eso
--  es lo que hace el consentimiento demostrable: si mañana cambian
--  los textos, se sabe a qué dijo que sí cada socio.
-- ============================================================

ALTER TABLE public.socios ADD COLUMN IF NOT EXISTS terminos_aceptados_en timestamptz;
ALTER TABLE public.socios ADD COLUMN IF NOT EXISTS terminos_version text;

-- registrar_socio se reemplazó con dos parámetros nuevos al final:
--   p_acepta_terminos  boolean DEFAULT false   -> si es false, error
--   p_terminos_version text    DEFAULT '2026-09-13'
--
-- Hubo que DROP antes de crear, porque agregar un parámetro genera una
-- función distinta y dos versiones del mismo nombre confundirían a la API.
--
-- (Definición completa aplicada en la migración consentimiento_terminos_v20.)

-- ============================================================
--  PROBADO: llamar a registrar_socio con p_acepta_terminos => false
--  devuelve "Para crear tu cuenta tienes que aceptar los términos
--  y la política de privacidad." y no inserta nada.
--
--  PENDIENTE: el formulario de negocios todavía no pide
--  consentimiento. Falta la misma casilla ahí.
-- ============================================================
