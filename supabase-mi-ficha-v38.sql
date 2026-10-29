-- =====================================================================
-- Mi Mascota Club — parche v38 (28 de octubre de 2026)
-- "Mi ficha": el negocio edita su ficha desde /mi-negocio, y Jaime puede
-- editar fichas ya publicadas desde /mi-panel.
--
-- SOLO AGREGA. No cambia ni borra ninguna tabla, columna ni función que
-- ya existía. Lo que agrega:
--   · tabla negocios_cambios    → pedidos de cambio que esperan revisión
--                                  (beneficio, logo, foto, dirección)
--   · tabla negocios_ediciones  → copia de la ficha ANTES de cada cambio,
--                                  para poder volver atrás si algo sale mal
--   · funciones negocio_*       → las usa el negocio con su sesión de /mi-negocio
--   · funciones admin_*         → las usa Jaime en /mi-panel (es_admin())
--
-- Qué se publica de inmediato (lo cambia el negocio solo):
--   WhatsApp, teléfono, Instagram, TikTok, Facebook, sitio web, días y
--   horario de atención, descripción.
-- Qué pasa por revisión: beneficio, logo, foto y dirección.
-- Qué no se cambia desde el panel del negocio: nombre, RUT, razón social,
--   datos del responsable (eso lo hace Jaime).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tablas nuevas. Sin políticas: nadie las lee ni escribe directo,
--    solo a través de las funciones de abajo.
-- ---------------------------------------------------------------------
create table if not exists public.negocios_cambios (
  id             uuid primary key default gen_random_uuid(),
  negocio_codigo text not null,
  campo          text not null check (campo in ('beneficio','logo','foto','direccion')),
  antes          jsonb,
  pide           jsonb not null,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente','aprobado','rechazado','anulado')),
  motivo         text,
  creado_en      timestamptz not null default now(),
  revisado_en    timestamptz
);
create index if not exists negocios_cambios_codigo_idx on public.negocios_cambios (negocio_codigo, estado);
-- Un solo pedido pendiente por negocio y por tipo: si vuelve a pedir, se reemplaza.
create unique index if not exists negocios_cambios_un_pendiente
  on public.negocios_cambios (negocio_codigo, campo) where estado = 'pendiente';

create table if not exists public.negocios_ediciones (
  id             bigserial primary key,
  negocio_codigo text not null,
  quien          text not null,          -- 'negocio' | 'admin' | 'aprobacion'
  antes          jsonb not null,         -- la fila completa de negocios antes del cambio
  creado_en      timestamptz not null default now()
);
create index if not exists negocios_ediciones_codigo_idx on public.negocios_ediciones (negocio_codigo, creado_en desc);

alter table public.negocios_cambios   enable row level security;
alter table public.negocios_ediciones enable row level security;
revoke all on table public.negocios_cambios   from anon, authenticated;
revoke all on table public.negocios_ediciones from anon, authenticated;
revoke all on sequence public.negocios_ediciones_id_seq from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) Ayudantes (solo los usan las funciones de este parche)
-- ---------------------------------------------------------------------
-- Limpia un texto: quita espacios de más; vacío → null; avisa si es muy largo.
create or replace function public.mmc_txt(p text, p_max int, p_campo text)
returns text language plpgsql immutable set search_path to 'public','pg_temp' as $$
declare v text := nullif(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')), '');
begin
  if v is not null and char_length(v) > p_max then
    raise exception '% es muy largo (máximo % caracteres).', p_campo, p_max;
  end if;
  return v;
end $$;

-- Usuario de red social: sin @ inicial y sin espacios.
create or replace function public.mmc_red(p text, p_campo text)
returns text language plpgsql immutable set search_path to 'public','pg_temp' as $$
declare v text := public.mmc_txt(regexp_replace(coalesce(p, ''), '^\s*@', ''), 120, p_campo);
begin
  if v is not null and v ~ '\s' then
    raise exception '% no puede llevar espacios.', p_campo;
  end if;
  return v;
end $$;

-- El texto "contacto" que muestra la tarjeta del directorio (igual que al aprobar).
create or replace function public.mmc_contacto(p_tel text, p_wa text, p_dir text, p_comuna text)
returns text language sql immutable set search_path to 'public','pg_temp' as $$
  select nullif(concat_ws(' · ',
           nullif(trim(coalesce(p_tel, p_wa, '')), ''),
           nullif(trim(coalesce(p_dir, p_comuna, '')), '')), '');
$$;

revoke all on function public.mmc_txt(text,int,text)              from public, anon, authenticated;
revoke all on function public.mmc_red(text,text)                  from public, anon, authenticated;
revoke all on function public.mmc_contacto(text,text,text,text)   from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Lo que usa el negocio (con su sesión de /mi-negocio)
-- ---------------------------------------------------------------------

-- 3a) Leer su ficha + sus pedidos pendientes + lo revisado en los últimos 7 días.
create or replace function public.negocio_mi_ficha(p_token uuid)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v_cod text := public.negocio_de_token(p_token);
  n public.negocios%rowtype;
  v_pend jsonb; v_rec jsonb;
begin
  if v_cod is null then return jsonb_build_object('ok', false); end if;
  select * into n from public.negocios where codigo = v_cod;
  if not found then return jsonb_build_object('ok', false); end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'campo', c.campo, 'pide', c.pide, 'creado_en', c.creado_en)
                            order by c.creado_en), '[]'::jsonb)
    into v_pend
    from public.negocios_cambios c
   where c.negocio_codigo = v_cod and c.estado = 'pendiente';

  select coalesce(jsonb_agg(jsonb_build_object('campo', c.campo, 'estado', c.estado, 'motivo', c.motivo, 'revisado_en', c.revisado_en)
                            order by c.revisado_en desc), '[]'::jsonb)
    into v_rec
    from public.negocios_cambios c
   where c.negocio_codigo = v_cod and c.estado in ('aprobado','rechazado')
     and c.revisado_en > now() - interval '7 days';

  return jsonb_build_object(
    'ok', true,
    'ficha', jsonb_build_object(
      'codigo', n.codigo, 'nombre', n.nombre, 'cat', n.cat, 'comuna', n.comuna,
      'tiene_local', n.tiene_local, 'es_especialista', n.es_especialista,
      'whatsapp', n.whatsapp, 'telefono', n.telefono, 'instagram', n.instagram,
      'tiktok', n.tiktok, 'facebook', n.facebook, 'sitio_web', n.sitio_web,
      'horario', n.horario, 'horario_dias', n.horario_dias, 'descripcion', n.descripcion,
      'direccion', n.direccion, 'google_maps_url', n.google_maps_url,
      'logo', n.logo, 'foto', n.foto,
      'beneficio_tipo', n.beneficio_tipo, 'beneficio_detalle', n.beneficio_detalle,
      'beneficio_valor', n.beneficio_valor, 'beneficio_sobre', n.beneficio_sobre,
      'beneficio_cuando', n.beneficio_cuando, 'beneficio_monto_min', n.beneficio_monto_min),
    'pendientes', v_pend,
    'recientes', v_rec);
end $$;

-- 3b) Guardar lo que se publica de inmediato.
create or replace function public.negocio_guardar_ficha(
  p_token uuid,
  p_whatsapp text, p_telefono text,
  p_instagram text, p_tiktok text, p_facebook text, p_sitio_web text,
  p_horario_dias text, p_horario text, p_descripcion text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v_cod text := public.negocio_de_token(p_token);
  n public.negocios%rowtype;
  v_wa text; v_tel text; v_ig text; v_tt text; v_fb text; v_web text;
  v_dias text; v_hor text; v_desc text; v_meta text; v_serv text; v_auto text;
begin
  if v_cod is null then raise exception 'Tu sesión venció. Entra de nuevo con tu código.'; end if;
  select * into n from public.negocios where codigo = v_cod for update;
  if not found then raise exception 'Tu sesión venció. Entra de nuevo con tu código.'; end if;

  if (select count(*) from public.negocios_ediciones e
       where e.negocio_codigo = v_cod and e.quien = 'negocio' and e.creado_en > now() - interval '1 hour') >= 30 then
    raise exception 'Hiciste muchos cambios seguidos. Espera unos minutos y vuelve a intentarlo.';
  end if;

  v_wa := public.mmc_txt(p_whatsapp, 20, 'El WhatsApp');
  if v_wa is null or v_wa !~ '^\+569[0-9]{8}$' then
    raise exception 'Revisa el WhatsApp: son 8 dígitos después del +56 9.';
  end if;

  v_tel := public.mmc_txt(p_telefono, 24, 'El teléfono');
  if v_tel is not null and (v_tel !~ '^\+56 [0-9 ]+$'
                            or length(regexp_replace(v_tel, '\D', '', 'g')) not between 10 and 13) then
    raise exception 'Revisa el teléfono: si lo escribes, debe tener entre 8 y 11 dígitos.';
  end if;

  v_ig := public.mmc_red(p_instagram, 'Instagram');
  v_tt := public.mmc_red(p_tiktok, 'TikTok');
  v_fb := public.mmc_red(p_facebook, 'Facebook');

  v_web := public.mmc_txt(p_sitio_web, 200, 'El sitio web');
  if v_web is not null then
    if v_web ~ '\s' then raise exception 'El sitio web no puede llevar espacios.'; end if;
    if v_web !~* '^https?://' then v_web := 'https://' || v_web; end if;
    if v_web !~* '^https?://[^/]+\.[^/]+' then raise exception 'Revisa el sitio web.'; end if;
  end if;

  v_dias := public.mmc_txt(p_horario_dias, 40, 'Los días');
  if v_dias is null or (v_dias is distinct from n.horario_dias and v_dias not in
      ('Todos los días','Lunes a viernes','Lunes a sábado','Lunes a domingo',
       'Martes a domingo','Solo fines de semana','Con hora agendada')) then
    raise exception 'Elige los días de atención.';
  end if;

  v_hor := public.mmc_txt(p_horario, 40, 'El horario');
  if v_hor is null or (v_hor is distinct from n.horario
                       and v_hor !~ '^[0-9]{1,2}:[0-9]{2} (AM|PM) - [0-9]{1,2}:[0-9]{2} (AM|PM)$') then
    raise exception 'Indica la hora de apertura y de cierre.';
  end if;

  v_desc := public.mmc_txt(p_descripcion, greatest(160, coalesce(char_length(n.descripcion), 0)), 'La descripción');

  -- meta y servicios se armaron con la descripción al aprobar. Si siguen
  -- siendo esa copia, se actualizan junto con ella; si Jaime los cambió a
  -- mano, se respetan.
  v_auto := n.cat || ' en ' || n.comuna || '.';
  v_meta := case when n.meta is null or n.meta = n.descripcion or n.meta = v_auto
                 then coalesce(v_desc, v_auto) else n.meta end;
  v_serv := case when n.servicios is null or n.servicios = n.descripcion
                 then v_desc else n.servicios end;

  if  v_wa  is not distinct from n.whatsapp  and v_tel is not distinct from n.telefono
  and v_ig  is not distinct from n.instagram and v_tt  is not distinct from n.tiktok
  and v_fb  is not distinct from n.facebook  and v_web is not distinct from n.sitio_web
  and v_dias is not distinct from n.horario_dias and v_hor is not distinct from n.horario
  and v_desc is not distinct from n.descripcion then
    return jsonb_build_object('ok', true, 'cambios', 0);
  end if;

  insert into public.negocios_ediciones (negocio_codigo, quien, antes)
  values (v_cod, 'negocio', to_jsonb(n));

  update public.negocios set
    whatsapp = v_wa, telefono = v_tel,
    instagram = v_ig, redes_sociales = v_ig, tiktok = v_tt, facebook = v_fb, sitio_web = v_web,
    horario_dias = v_dias, horario = v_hor,
    descripcion = v_desc, meta = v_meta, servicios = v_serv,
    contacto = public.mmc_contacto(v_tel, v_wa, n.direccion, n.comuna)
  where id = n.id;

  return jsonb_build_object('ok', true, 'cambios', 1);
end $$;

-- 3c) Pedir un cambio que pasa por revisión (beneficio, logo, foto, dirección).
create or replace function public.negocio_pedir_cambio(p_token uuid, p_campo text, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v_cod text := public.negocio_de_token(p_token);
  n public.negocios%rowtype;
  v_pide jsonb; v_antes jsonb; v_id uuid;
  v_txt text; v_monto int; v_url text;
begin
  if v_cod is null then raise exception 'Tu sesión venció. Entra de nuevo con tu código.'; end if;
  select * into n from public.negocios where codigo = v_cod;
  if not found then raise exception 'Tu sesión venció. Entra de nuevo con tu código.'; end if;
  if p_campo is null or p_campo not in ('beneficio','logo','foto','direccion') then
    raise exception 'Cambio no válido.';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then raise exception 'Faltan datos.'; end if;

  if (select count(*) from public.negocios_cambios c
       where c.negocio_codigo = v_cod and c.creado_en > now() - interval '1 day') >= 15 then
    raise exception 'Hiciste muchos pedidos hoy. Escríbenos si necesitas algo urgente.';
  end if;

  if p_campo = 'beneficio' then
    if coalesce(p_datos->>'valor','')  !~ '^[a-z0-9_]{1,30}$'
    or coalesce(p_datos->>'sobre','')  !~ '^[a-z0-9_]{1,30}$'
    or coalesce(p_datos->>'cuando','') !~ '^[a-z0-9_]{1,30}$' then
      raise exception 'Completa los tres pasos del beneficio.';
    end if;
    v_txt := nullif(p_datos->>'monto_min', '');
    if v_txt is not null and v_txt !~ '^[0-9]{1,8}$' then raise exception 'Revisa el monto mínimo.'; end if;
    v_monto := nullif(v_txt, '')::int;
    v_pide := jsonb_build_object(
      'valor', p_datos->>'valor', 'sobre', p_datos->>'sobre', 'cuando', p_datos->>'cuando',
      'monto_min', v_monto,
      'detalle',   public.mmc_txt(p_datos->>'detalle', 60, 'El detalle'),
      'label',     public.mmc_txt(p_datos->>'label', 80, 'El beneficio'),
      'condicion', public.mmc_txt(p_datos->>'condicion', 220, 'La condición'));
    if v_pide->>'label' is null then raise exception 'Completa los tres pasos del beneficio.'; end if;
    v_antes := jsonb_build_object('label', n.beneficio_tipo, 'condicion', n.beneficio_detalle,
      'valor', n.beneficio_valor, 'sobre', n.beneficio_sobre, 'cuando', n.beneficio_cuando,
      'monto_min', n.beneficio_monto_min);

  elsif p_campo in ('logo','foto') then
    v_url := coalesce(p_datos->>'url', '');
    if v_url !~ ('^https://mzsqyjxqnomsbqzhygkx\.supabase\.co/storage/v1/object/public/negocios/'
                 || case when p_campo = 'logo' then 'logos' else 'fotos' end || '/[A-Za-z0-9._-]+$') then
      raise exception 'No pudimos recibir la imagen. Vuelve a subirla.';
    end if;
    v_pide  := jsonb_build_object('url', v_url);
    v_antes := jsonb_build_object('url', case when p_campo = 'logo' then n.logo else n.foto end);

  else -- direccion
    if n.tiene_local = false then
      raise exception 'Tu ficha muestra las comunas donde atiendes. Escríbenos para cambiarlas.';
    end if;
    v_txt := public.mmc_txt(p_datos->>'direccion', 120, 'La dirección');
    if v_txt is null or char_length(v_txt) < 5 then raise exception 'Escribe la dirección completa.'; end if;
    v_url := public.mmc_txt(p_datos->>'google_maps_url', 400, 'El enlace de Google Maps');
    if v_url is null or v_url !~* '^https?://(www\.)?(google\.[a-z.]+/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl/maps)' then
      raise exception 'Pega el enlace de Google Maps de tu local.';
    end if;
    v_pide  := jsonb_build_object('direccion', v_txt, 'google_maps_url', v_url);
    v_antes := jsonb_build_object('direccion', n.direccion, 'google_maps_url', n.google_maps_url);
  end if;

  update public.negocios_cambios
     set pide = v_pide, antes = v_antes, creado_en = now()
   where negocio_codigo = v_cod and campo = p_campo and estado = 'pendiente'
  returning id into v_id;

  if v_id is null then
    insert into public.negocios_cambios (negocio_codigo, campo, antes, pide)
    values (v_cod, p_campo, v_antes, v_pide)
    returning id into v_id;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- 3d) El negocio se arrepiente de un pedido que aún no se revisa.
create or replace function public.negocio_anular_cambio(p_token uuid, p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_cod text := public.negocio_de_token(p_token); v_n int;
begin
  if v_cod is null then raise exception 'Tu sesión venció. Entra de nuevo con tu código.'; end if;
  update public.negocios_cambios set estado = 'anulado', revisado_en = now()
   where id = p_id and negocio_codigo = v_cod and estado = 'pendiente';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', v_n > 0);
end $$;

-- ---------------------------------------------------------------------
-- 4) Lo que usa Jaime en /mi-panel (solo admins)
-- ---------------------------------------------------------------------

-- 4a) Pedidos de cambio pendientes, con lo que hoy se ve en la ficha.
create or replace function public.admin_cambios_pendientes()
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'codigo', c.negocio_codigo, 'campo', c.campo,
             'antes', c.antes, 'pide', c.pide, 'creado_en', c.creado_en,
             'nombre', n.nombre, 'email', n.email,
             'ahora', case c.campo
               when 'beneficio' then jsonb_build_object('label', n.beneficio_tipo, 'condicion', n.beneficio_detalle)
               when 'logo'      then jsonb_build_object('url', n.logo)
               when 'foto'      then jsonb_build_object('url', n.foto)
               else jsonb_build_object('direccion', n.direccion, 'google_maps_url', n.google_maps_url) end)
           order by c.creado_en)
      from public.negocios_cambios c
      join public.negocios n on n.codigo = c.negocio_codigo
     where c.estado = 'pendiente'), '[]'::jsonb);
end $$;

-- 4b) Aprobar o rechazar un pedido.
create or replace function public.admin_resolver_cambio(p_id uuid, p_aprobar boolean, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare c public.negocios_cambios%rowtype; n public.negocios%rowtype;
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  select * into c from public.negocios_cambios where id = p_id for update;
  if not found then raise exception 'Ese pedido ya no existe.'; end if;
  if c.estado <> 'pendiente' then raise exception 'Este pedido ya fue revisado.'; end if;
  select * into n from public.negocios where codigo = c.negocio_codigo for update;
  if not found then raise exception 'El negocio ya no existe.'; end if;

  if p_aprobar then
    insert into public.negocios_ediciones (negocio_codigo, quien, antes)
    values (n.codigo, 'aprobacion', to_jsonb(n));

    if c.campo = 'beneficio' then
      update public.negocios set
        beneficio_tipo      = c.pide->>'label',
        beneficio_detalle   = c.pide->>'condicion',
        beneficio_valor     = c.pide->>'valor',
        beneficio_sobre     = c.pide->>'sobre',
        beneficio_cuando    = c.pide->>'cuando',
        beneficio_monto_min = nullif(c.pide->>'monto_min', '')::int
      where id = n.id;
    elsif c.campo = 'logo' then
      update public.negocios set logo = c.pide->>'url' where id = n.id;
    elsif c.campo = 'foto' then
      update public.negocios set foto = c.pide->>'url' where id = n.id;
    else
      update public.negocios set
        direccion       = c.pide->>'direccion',
        google_maps_url = c.pide->>'google_maps_url',
        contacto        = public.mmc_contacto(n.telefono, n.whatsapp, c.pide->>'direccion', n.comuna)
      where id = n.id;
    end if;

    update public.negocios_cambios set estado = 'aprobado', revisado_en = now(), motivo = null where id = c.id;
  else
    update public.negocios_cambios
       set estado = 'rechazado', revisado_en = now(), motivo = public.mmc_txt(p_motivo, 300, 'El motivo')
     where id = c.id;
  end if;

  return jsonb_build_object('ok', true, 'codigo', n.codigo, 'nombre', n.nombre, 'email', n.email, 'campo', c.campo);
end $$;

-- 4c) Editar cualquier ficha publicada. Solo cambia las claves que vienen en p_datos.
create or replace function public.admin_editar_negocio(p_codigo text, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  n public.negocios%rowtype; d jsonb := coalesce(p_datos, '{}'::jsonb);
  v_nombre text; v_comuna text; v_dir text; v_maps text; v_tel text; v_wa text;
  v_ig text; v_tt text; v_fb text; v_web text; v_dias text; v_hor text; v_desc text;
  v_bt text; v_bd text; v_email text; v_logo text; v_foto text; v_meta text; v_serv text; v_auto text;
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  select * into n from public.negocios where codigo = upper(trim(p_codigo)) for update;
  if not found then raise exception 'No existe el negocio %', p_codigo; end if;

  v_nombre := case when d ? 'nombre'    then public.mmc_txt(d->>'nombre', 60, 'El nombre') else n.nombre end;
  if v_nombre is null or char_length(v_nombre) < 2 then raise exception 'El nombre no puede quedar vacío.'; end if;
  v_comuna := case when d ? 'comuna'    then public.mmc_txt(d->>'comuna', 60, 'La comuna') else n.comuna end;
  if v_comuna is null then raise exception 'La comuna no puede quedar vacía.'; end if;
  v_dir    := case when d ? 'direccion' then public.mmc_txt(d->>'direccion', 120, 'La dirección') else n.direccion end;
  v_maps   := case when d ? 'google_maps_url' then public.mmc_txt(d->>'google_maps_url', 400, 'Google Maps') else n.google_maps_url end;
  v_tel    := case when d ? 'telefono'  then public.mmc_txt(d->>'telefono', 24, 'El teléfono') else n.telefono end;
  v_wa     := case when d ? 'whatsapp'  then public.mmc_txt(d->>'whatsapp', 20, 'El WhatsApp') else n.whatsapp end;
  v_ig     := case when d ? 'instagram' then public.mmc_red(d->>'instagram', 'Instagram') else n.instagram end;
  v_tt     := case when d ? 'tiktok'    then public.mmc_red(d->>'tiktok', 'TikTok') else n.tiktok end;
  v_fb     := case when d ? 'facebook'  then public.mmc_red(d->>'facebook', 'Facebook') else n.facebook end;
  v_web    := case when d ? 'sitio_web' then public.mmc_txt(d->>'sitio_web', 200, 'El sitio web') else n.sitio_web end;
  v_dias   := case when d ? 'horario_dias' then public.mmc_txt(d->>'horario_dias', 40, 'Los días') else n.horario_dias end;
  v_hor    := case when d ? 'horario'   then public.mmc_txt(d->>'horario', 40, 'El horario') else n.horario end;
  v_desc   := case when d ? 'descripcion' then public.mmc_txt(d->>'descripcion', 400, 'La descripción') else n.descripcion end;
  v_bt     := case when d ? 'beneficio_tipo' then public.mmc_txt(d->>'beneficio_tipo', 80, 'El beneficio') else n.beneficio_tipo end;
  v_bd     := case when d ? 'beneficio_detalle' then public.mmc_txt(d->>'beneficio_detalle', 220, 'La condición') else n.beneficio_detalle end;
  v_email  := case when d ? 'email' then lower(public.mmc_txt(d->>'email', 120, 'El correo')) else n.email end;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Revisa el correo: sin correo el negocio no puede entrar a su panel.';
  end if;
  v_logo   := case when d ? 'logo' then public.mmc_txt(d->>'logo', 400, 'El logo') else n.logo end;
  v_foto   := case when d ? 'foto' then public.mmc_txt(d->>'foto', 400, 'La foto') else n.foto end;
  if v_web is not null and v_web !~* '^https?://' then v_web := 'https://' || v_web; end if;

  v_auto := n.cat || ' en ' || n.comuna || '.';
  v_meta := case when n.meta is null or n.meta = n.descripcion or n.meta = v_auto
                 then coalesce(v_desc, n.cat || ' en ' || v_comuna || '.') else n.meta end;
  v_serv := case when n.servicios is null or n.servicios = n.descripcion then v_desc else n.servicios end;

  insert into public.negocios_ediciones (negocio_codigo, quien, antes)
  values (n.codigo, 'admin', to_jsonb(n));

  update public.negocios set
    nombre = v_nombre, comuna = v_comuna, direccion = v_dir, google_maps_url = v_maps,
    telefono = v_tel, whatsapp = v_wa,
    instagram = v_ig, redes_sociales = v_ig, tiktok = v_tt, facebook = v_fb, sitio_web = v_web,
    horario_dias = v_dias, horario = v_hor,
    descripcion = v_desc, meta = v_meta, servicios = v_serv,
    beneficio_tipo = v_bt, beneficio_detalle = v_bd,
    email = v_email, logo = v_logo, foto = v_foto,
    contacto = public.mmc_contacto(v_tel, v_wa, v_dir, v_comuna)
  where id = n.id;

  return jsonb_build_object('ok', true, 'codigo', n.codigo);
end $$;

-- ---------------------------------------------------------------------
-- 5) Permisos
-- ---------------------------------------------------------------------
revoke all on function public.negocio_mi_ficha(uuid)                                           from public;
revoke all on function public.negocio_guardar_ficha(uuid,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.negocio_pedir_cambio(uuid,text,jsonb)                             from public;
revoke all on function public.negocio_anular_cambio(uuid,uuid)                                  from public;
grant execute on function public.negocio_mi_ficha(uuid)                                         to anon, authenticated;
grant execute on function public.negocio_guardar_ficha(uuid,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.negocio_pedir_cambio(uuid,text,jsonb)                           to anon, authenticated;
grant execute on function public.negocio_anular_cambio(uuid,uuid)                                to anon, authenticated;

revoke all on function public.admin_cambios_pendientes()                    from public, anon;
revoke all on function public.admin_resolver_cambio(uuid,boolean,text)      from public, anon;
revoke all on function public.admin_editar_negocio(text,jsonb)              from public, anon;
grant execute on function public.admin_cambios_pendientes()                 to authenticated;
grant execute on function public.admin_resolver_cambio(uuid,boolean,text)   to authenticated;
grant execute on function public.admin_editar_negocio(text,jsonb)           to authenticated;
