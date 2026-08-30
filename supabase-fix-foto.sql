-- ============================================================
-- PARCHE: permite borrar explícitamente la foto de una mascota
-- ============================================================
-- Cómo usar: SQL Editor → New query → pega esto → Run.
-- Es seguro correrlo aunque ya hayas ejecutado el script original.
-- ============================================================

create or replace function actualizar_ficha(
  p_codigo text, p_foto text, p_documentos jsonb, p_notas_medicas text,
  p_edad text, p_peso text, p_tamano text,
  p_representante_nombre text, p_representante_rut text, p_representante_telefono text, p_email text,
  p_quitar_foto boolean default false
) returns boolean
language plpgsql security definer as $$
begin
  update socios set
    foto = case when p_quitar_foto then null else coalesce(p_foto, foto) end,
    documentos = coalesce(p_documentos, documentos),
    notas_medicas = p_notas_medicas, edad = p_edad, peso = p_peso, tamano = p_tamano,
    representante_nombre = p_representante_nombre, representante_rut = p_representante_rut,
    representante_telefono = p_representante_telefono, email = coalesce(p_email, email)
  where codigo = upper(p_codigo);
  return found;
end; $$;

grant execute on function actualizar_ficha(text,text,jsonb,text,text,text,text,text,text,text,text,boolean) to anon, authenticated;
