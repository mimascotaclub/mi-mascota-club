-- ============================================================
-- MI MASCOTA CLUB · v33 — Lanzamiento (11 de octubre de 2026)
-- Saca del directorio el negocio de PRUEBA "GLORIA PET SALON ROJAS"
-- (NEG0002) y reinicia el contador, para que el primer negocio real
-- sea NEG0001 / fundador #001.
--
-- Se corre COMPLETO en el SQL Editor de Supabase. Borra:
--   · el canje de prueba C-2UPC (Max en Gloria)
--   · las 2 solicitudes de prueba (aprobada y "v2" rechazada)
--   · el negocio NEG0002
-- NO toca las imágenes en Storage: el logo lo sigue usando la ficha
-- de ejemplo (mimascotaclub.cl/ejemplo-ficha).
-- ============================================================

begin;

delete from public.canjes
 where negocio_id = '23e92a25-3ca9-4c90-a8fe-e9f940ae28bc';

delete from public.negocios_solicitudes
 where id in ('0ce40bf7-31f1-43c0-9b16-d816dea67b12',
              '833ac952-ee99-46e4-9e34-65b95d0eae2f');

delete from public.negocios
 where id = '23e92a25-3ca9-4c90-a8fe-e9f940ae28bc';

select setval('public.negocio_seq', 1, false);

commit;

-- Comprobación (debe dar: 0 negocios, 0 solicitudes, 0 canjes, 1/false)
select (select count(*) from public.negocios)             as negocios,
       (select count(*) from public.negocios_solicitudes) as solicitudes,
       (select count(*) from public.canjes)               as canjes,
       (select last_value || '/' || is_called from public.negocio_seq) as contador;
