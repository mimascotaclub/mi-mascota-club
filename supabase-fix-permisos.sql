-- ============================================================
-- PARCHE: re-asegura los permisos de lectura del panel admin
-- ============================================================
-- Es seguro correr esto aunque ya lo hayas hecho antes — no borra
-- ni duplica datos, solo confirma que las políticas existan bien.
-- ============================================================

drop policy if exists "socios_select_admin" on socios;
create policy "socios_select_admin" on socios for select using (auth.role() = 'authenticated');

drop policy if exists "canjes_select_admin" on canjes;
create policy "canjes_select_admin" on canjes for select using (auth.role() = 'authenticated');

drop policy if exists "negocios_select_public" on negocios;
create policy "negocios_select_public" on negocios for select using (true);

-- Verificación: esto te muestra qué políticas quedaron activas.
-- Deberías ver 3 filas: negocios, socios, canjes.
select tablename, policyname, cmd from pg_policies where tablename in ('negocios','socios','canjes');
