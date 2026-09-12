-- ============================================================
--  Mi Mascota Club — El canje trazable (v16)
--  12 de septiembre de 2026
--
--  ⚠️ YA EJECUTADO. Se aplicó y se probó contra la base real el
--  12 de septiembre. Queda aquí como documentación: NO hay que
--  volver a correrlo.
-- ------------------------------------------------------------
--  QUÉ RESUELVE
--
--  Hasta ahora el QR del carnet era simbólico. El circuito real
--  del beneficio tenía cinco agujeros:
--
--  1. El formulario de registro v3 nunca mostraba un carnet ni un
--     QR: el socio se inscribía y no se llevaba nada que mostrar
--     en el mesón. (Se arregla en el frontend, no aquí.)
--  2. La pantalla /validar no le decía al cajero quién había
--     llegado, si estaba vigente, ni cuál era su propio beneficio.
--     El que atiende casi nunca es el dueño y no tiene por qué
--     acordarse de qué se ofreció hace tres meses.
--  3. Cualquiera podía escribir NEG0001 y registrar visitas
--     falsas — o un socio autovalidarse canjes desde su casa.
--  4. El canje no guardaba QUÉ beneficio se dio. Si el negocio
--     cambiaba de "15%" a "2x1", los canjes viejos perdían
--     sentido.
--  5. No había un número común entre socio y negocio para
--     referirse a la misma visita si algo salía mal.
--
--  DECISIÓN DE DISEÑO: el que confirma es el negocio, no el
--  socio. El negocio es el que regala el descuento, así que no
--  tiene ningún incentivo para inventar visitas — por eso su
--  confirmación es la que hace que el registro valga como prueba.
--
--  Y el correo se pide recién AL CONFIRMAR, no antes: así ningún
--  negocio queda bloqueado en el mesón y ninguna visita se pierde.
--  La primera vez se identifica al apretar el botón y la visita
--  se registra en ese mismo momento; de ahí en adelante ese
--  teléfono queda identificado.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Folio y beneficio congelado dentro del canje
-- ------------------------------------------------------------
ALTER TABLE public.canjes ADD COLUMN IF NOT EXISTS folio text;
ALTER TABLE public.canjes ADD COLUMN IF NOT EXISTS beneficio_texto text;
CREATE UNIQUE INDEX IF NOT EXISTS canjes_folio_idx ON public.canjes (folio) WHERE folio IS NOT NULL;

-- Folio corto y legible en voz alta: C-XXXX, sin las letras que se
-- confunden al dictarlas por teléfono (0/O, 1/I/L).
CREATE OR REPLACE FUNCTION public.canje_folio_nuevo()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
declare
  v_alfabeto text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_folio text; v_i int;
begin
  loop
    v_folio := 'C-';
    for v_i in 1..4 loop
      v_folio := v_folio || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from canjes where folio = v_folio);
  end loop;
  return v_folio;
end; $function$;

REVOKE ALL ON FUNCTION public.canje_folio_nuevo() FROM public, anon, authenticated;


-- ------------------------------------------------------------
-- 2) El beneficio, escrito como lo lee un cajero
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.negocio_beneficio_txt(p_codigo text)
RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
  select nullif(trim(both ' ·' from
           coalesce(nullif(trim(n.beneficio_tipo),''), '') || ' · ' ||
           coalesce(nullif(trim(n.beneficio_detalle),''), '')), '')
    from negocios n where n.codigo = upper(trim(p_codigo));
$function$;

REVOKE ALL ON FUNCTION public.negocio_beneficio_txt(text) FROM public, anon, authenticated;


-- ------------------------------------------------------------
-- 3) El porcentaje real del beneficio
--    Antes el "ahorro" era un 10% fijo inventado, igual para todos.
--    Ahora sale del beneficio de verdad: primero mira beneficio_valor
--    ('desc_30') y si no, el primer NN% que encuentre en el texto.
--    Si no hay porcentaje devuelve NULL — mejor no decir nada que
--    mostrarle al socio un ahorro que no es cierto.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.negocio_descuento_pct(p_codigo text)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
declare v negocios%rowtype; v_m text;
begin
  select * into v from negocios where codigo = upper(trim(p_codigo));
  if not found then return null; end if;

  v_m := substring(coalesce(v.beneficio_valor,'') from 'desc_([0-9]{1,2})');
  if v_m is not null then return v_m::numeric; end if;

  v_m := substring(coalesce(v.beneficio_tipo,'') || ' ' || coalesce(v.beneficio_detalle,'')
                   from '([0-9]{1,2})\s*%');
  if v_m is not null then return v_m::numeric; end if;

  return null;
end; $function$;

REVOKE ALL ON FUNCTION public.negocio_descuento_pct(text) FROM public, anon, authenticated;


-- ------------------------------------------------------------
-- 4) canje_previo(): lo que ve el cajero ANTES de confirmar
--
--    A propósito NO devuelve foto, correo, teléfono ni el nombre
--    del dueño. El cajero tiene el carnet delante en el teléfono
--    del socio; esta pantalla solo tiene que responder tres cosas:
--    ¿es socio vigente?, ¿qué le doy?, ¿ya vino antes?
--    Así, aunque alguien adivine dos códigos, no saca nada
--    personal de nadie.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.canje_previo(p_negocio_codigo text, p_socio_codigo text)
RETURNS TABLE(
  ok boolean, mensaje text,
  socio_pet text, socio_species text, socio_breed text, socio_plan text,
  socio_codigo text, socio_desde timestamptz,
  negocio_nombre text, negocio_codigo text, negocio_tiene_email boolean,
  beneficio_texto text, beneficio_monto_min integer, descuento_pct numeric,
  visitas_previas integer, ultima_visita timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
declare
  v_n negocios%rowtype; v_s socios%rowtype;
  v_cn text := upper(trim(coalesce(p_negocio_codigo,'')));
  v_cs text := upper(trim(coalesce(p_socio_codigo,'')));
begin
  select * into v_n from negocios where codigo = v_cn;
  if not found then
    return query select false, 'No encontramos ese código de negocio.',
      null::text,null::text,null::text,null::text,null::text,null::timestamptz,
      null::text,null::text,null::boolean,null::text,null::integer,null::numeric,
      null::integer,null::timestamptz;
    return;
  end if;

  select * into v_s from socios where codigo = v_cs;
  if not found then
    return query select false, 'Ese código de socio no existe. Revisa que esté bien escrito.',
      null::text,null::text,null::text,null::text,null::text,null::timestamptz,
      v_n.nombre,v_n.codigo,(coalesce(v_n.email,'') <> ''),
      negocio_beneficio_txt(v_cn), v_n.beneficio_monto_min, negocio_descuento_pct(v_cn),
      null::integer,null::timestamptz;
    return;
  end if;

  return query select
    true, 'ok',
    v_s.pet, v_s.species, v_s.breed, v_s.plan, v_s.codigo, v_s.created_at,
    v_n.nombre, v_n.codigo, (coalesce(v_n.email,'') <> ''),
    negocio_beneficio_txt(v_cn), v_n.beneficio_monto_min, negocio_descuento_pct(v_cn),
    (select count(*)::integer from canjes c where c.negocio_codigo = v_cn and c.socio_codigo = v_cs),
    (select max(c.created_at) from canjes c where c.negocio_codigo = v_cn and c.socio_codigo = v_cs);
end; $function$;


-- ------------------------------------------------------------
-- 5) registrar_canje_v2(): confirmar la visita
--    Exige el par código + correo del negocio: la misma prueba que
--    ya pedía el panel (v14). Guarda el folio y el beneficio del
--    momento, y calcula el ahorro con el porcentaje real.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_canje_v2(
  p_negocio_codigo text, p_negocio_email text,
  p_socio_codigo text, p_monto numeric DEFAULT NULL
)
RETURNS TABLE(ok boolean, mensaje text, folio text, nombre_mostrar text,
              socio_mascota text, negocio_nombre text, beneficio_texto text,
              monto numeric, ahorro numeric, canje_id uuid, negocio_plan text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
declare
  v_n negocios%rowtype; v_s socios%rowtype;
  v_cn text := upper(trim(coalesce(p_negocio_codigo,'')));
  v_cs text := upper(trim(coalesce(p_socio_codigo,'')));
  v_nombre text; v_ahorro numeric; v_pct numeric;
  v_folio text; v_ben text; v_id uuid;
begin
  select * into v_n from negocios
   where codigo = v_cn
     and lower(trim(coalesce(email,''))) = lower(trim(coalesce(p_negocio_email,'')))
     and coalesce(email,'') <> '';
  if not found then
    return query select false,
      'No pudimos confirmar tu negocio. Revisa que sea el mismo correo con el que te inscribiste.',
      null::text,null::text,null::text,null::text,null::text,null::numeric,null::numeric,null::uuid,null::text;
    return;
  end if;

  select * into v_s from socios where codigo = v_cs;
  if not found then
    return query select false, 'Código de socio no encontrado.',
      null::text,null::text,null::text,null::text,null::text,null::numeric,null::numeric,null::uuid,null::text;
    return;
  end if;

  if p_monto is not null and p_monto <= 0 then
    return query select false, 'El monto tiene que ser mayor que cero (o dejarlo vacío).',
      null::text,null::text,null::text,null::text,null::text,null::numeric,null::numeric,null::uuid,null::text;
    return;
  end if;

  v_pct := negocio_descuento_pct(v_cn);
  v_ahorro := case when p_monto is null or v_pct is null then null
                   else round(p_monto * v_pct / 100) end;

  v_ben := negocio_beneficio_txt(v_cn);
  v_folio := canje_folio_nuevo();

  if v_n.tipo = 'dueno' then
    v_nombre := coalesce(nullif(v_s.representante_nombre,''), 'Socio ' || v_s.codigo);
  else
    v_nombre := v_s.pet;
  end if;

  insert into canjes (negocio_id, negocio_nombre, negocio_codigo, socio_id, socio_nombre,
                      socio_mascota, socio_codigo, monto, ahorro, folio, beneficio_texto)
  values (v_n.id, v_n.nombre, v_n.codigo, v_s.id, v_nombre,
          v_s.pet, v_s.codigo, p_monto, v_ahorro, v_folio, v_ben)
  returning id into v_id;

  return query select true, 'Visita registrada.', v_folio, v_nombre,
                      v_s.pet, v_n.nombre, v_ben, p_monto, v_ahorro, v_id, v_n.plan;
end; $function$;

-- La versión vieja queda cerrada: no pedía correo, así que permitía visitas falsas.
REVOKE ALL ON FUNCTION public.registrar_canje(text, text, numeric) FROM public, anon, authenticated;


-- ------------------------------------------------------------
-- 6) Los dos historiales devuelven el folio y el beneficio aplicado
--    (hubo que DROP porque cambia el tipo de retorno)
-- ------------------------------------------------------------
-- historial_negocio(p_codigo, p_email)  -> + folio, beneficio_texto
-- socio_historial(p_token)              -> + folio, beneficio_texto
-- (definiciones completas aplicadas en la migración canje_trazable_v16)


-- ------------------------------------------------------------
-- 7) Permisos
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.canje_previo(text, text) FROM public;
REVOKE ALL ON FUNCTION public.registrar_canje_v2(text, text, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.canje_previo(text, text)                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_canje_v2(text, text, text, numeric) TO anon, authenticated;


-- ============================================================
--  PENDIENTE PARA JAIME EN SUPABASE
--  NEG0002 y NEG0003 no tienen correo cargado en la tabla
--  `negocios`. Sin correo no pueden validar visitas ni entrar a
--  su panel. Hay que completarlo:
--    update negocios set email = 'correo@delnegocio.cl' where codigo = 'NEG0002';
-- ============================================================
