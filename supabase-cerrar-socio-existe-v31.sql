-- ============================================================
-- MI MASCOTA CLUB · v31
-- Cerrar socio_existe() al navegador
--
-- SE CORRE DESPUÉS DEL PUSH del fundador verificado (v30), no antes.
-- Si se corre antes, el sitio viejo que todavía está en línea deja
-- de poder mandar el código de acceso a Mi Mascota ID.
--
-- Por qué: socio_existe() respondía a cualquiera si un correo está
-- inscrito en el club. Desde el push del 3 de octubre el sitio ya no
-- la usa: el acceso responde lo mismo esté o no inscrito el correo,
-- y la revisión se hace adentro del servidor (otp_registrar).
-- ============================================================

revoke all on function public.socio_existe(text) from public, anon, authenticated;

-- Comprobación (debe decir false):
--   select has_function_privilege('anon', 'public.socio_existe(text)', 'execute');
