-- ============================================================
--  Mi Mascota Club — Borrar la cuenta del socio (v19)
--  13 de septiembre de 2026
--
--  ⚠️ YA EJECUTADO. Documentación: NO volver a correrlo.
-- ------------------------------------------------------------
--  La ley de datos personales exige poder suprimir los datos de
--  una persona cuando lo pide, y esconder eso detrás de un correo
--  de contacto no cuenta: tiene que haber un botón.
--
--  DECISIÓN DE DISEÑO: los canjes NO se borran, se ANONIMIZAN.
--  La visita ocurrió de verdad y el negocio tiene derecho a
--  conservar el registro de su propia venta. Lo que desaparece es
--  todo lo que apunta a la persona: quedan la fecha, el monto y el
--  negocio, que son datos del negocio, no del socio.
-- ============================================================

-- El FK dejaba de permitir borrar un socio con visitas. Ahora el
-- vínculo simplemente se corta.
ALTER TABLE public.canjes DROP CONSTRAINT IF EXISTS canjes_socio_id_fkey;
ALTER TABLE public.canjes
  ADD CONSTRAINT canjes_socio_id_fkey
  FOREIGN KEY (socio_id) REFERENCES public.socios(id) ON DELETE SET NULL;

-- socio_eliminar_cuenta(token):
--   · anonimiza los canjes (socio_nombre = 'Socio dado de baja',
--     socio_mascota y socio_codigo a NULL)
--   · borra los comentarios de sus calificaciones
--   · borra sus sesiones y sus códigos de verificación
--   · borra todas las mascotas de ese correo
--   · devuelve cuántas borró
--
-- (Definición completa aplicada en la migración borrar_cuenta_socio_v19.)

REVOKE ALL ON FUNCTION public.socio_eliminar_cuenta(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.socio_eliminar_cuenta(uuid) TO anon, authenticated;
