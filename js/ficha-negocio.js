/* ============================================================
   Mi Mascota Club — Ficha de negocio (componente compartido)
   ------------------------------------------------------------
   Se usa en tres lugares, siempre con el mismo aspecto:
     1. La página /negocio/<slug>
     2. El preview en vivo del formulario de inscripción
     3. La cola "Fichas por aprobar" del panel privado

   Uso:  renderFicha(elemento, datos)
         cardNegocioHTML(datos)   -> tarjeta del directorio

   Requiere: js/catalogos-negocio.js y css/mmc-ficha.css
   ============================================================ */

const MMC_ICONOS = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5.4"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg>',
  facebook:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.24 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22C18.34 21.24 22 17.08 22 12.06Z"/></svg>',
  tiktok:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.1v12.4a2.59 2.59 0 1 1-1.84-2.48V9.75a5.72 5.72 0 1 0 4.94 5.66V9.01a7.35 7.35 0 0 0 4.3 1.38V7.29a4.29 4.29 0 0 1-3.24-1.47Z"/></svg>',
  whatsapp:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2.1 22l5.34-1.38a9.83 9.83 0 0 0 4.6 1.16h.01c5.43 0 9.85-4.42 9.85-9.86C21.9 6.42 17.47 2 12.04 2Zm5.75 14.04c-.24.68-1.4 1.3-1.94 1.34-.5.04-.98.22-3.3-.7-2.78-1.1-4.55-3.95-4.69-4.14-.14-.18-1.12-1.49-1.12-2.85s.71-2.02.97-2.3c.25-.27.55-.34.73-.34.18 0 .37 0 .53.01.17.01.4-.06.62.48.24.57.8 1.98.87 2.12.07.14.12.31.02.5-.09.18-.14.29-.28.45-.14.16-.3.36-.42.48-.14.14-.29.29-.13.57.16.28.72 1.18 1.54 1.91 1.06.94 1.95 1.24 2.23 1.38.28.14.44.12.6-.07.17-.2.7-.81.88-1.09.19-.28.37-.23.63-.14.25.09 1.63.77 1.9.91.29.14.47.21.54.32.07.12.07.66-.17 1.34Z"/></svg>',
  mapa:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10.5c0 5.4-8 11.5-8 11.5s-8-6.1-8-11.5a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10.3" r="2.9"/></svg>',
  pin:       '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10.5c0 5.4-8 11.5-8 11.5s-8-6.1-8-11.5a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10.3" r="2.9"/></svg>'
};

function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function _waLink(numero) {
  if (!numero) return null;
  const limpio = String(numero).replace(/\D/g, '');
  if (!limpio) return null;
  return 'https://wa.me/' + (limpio.startsWith('56') ? limpio : '56' + limpio.replace(/^0+/, ''));
}

function _urlRed(valor, base) {
  if (!valor) return null;
  const v = String(valor).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, '');
}

/* Beneficio: si vienen los 3 campos estructurados los arma con el catálogo;
   si no (negocios registrados con el formulario antiguo), usa los textos
   que ya estén guardados en beneficio_tipo / beneficio_detalle. */
function _beneficio(d) {
  if (d.beneficio_valor && typeof beneficioTexto === 'function') {
    const b = beneficioTexto({
      valor: d.beneficio_valor, sobre: d.beneficio_sobre, cuando: d.beneficio_cuando,
      monto_minimo: d.beneficio_monto_min, detalle: d.beneficio_detalle
    });
    if (b) return b;
  }
  if (d.beneficio_label || d.beneficio_tipo) {
    return { principal: d.beneficio_label || d.beneficio_tipo, condicion: d.beneficio_condicion || d.beneficio_detalle || '', cuando: '' };
  }
  return null;
}

function _redes(d, comoLinks) {
  return [
    { k: 'instagram', href: _urlRed(d.instagram, 'https://instagram.com/'), label: 'Instagram' },
    { k: 'tiktok',    href: _urlRed(d.tiktok, 'https://tiktok.com/@'),      label: 'TikTok' },
    { k: 'facebook',  href: _urlRed(d.facebook, 'https://facebook.com/'),   label: 'Facebook' },
    { k: 'whatsapp',  href: _waLink(d.whatsapp),                            label: 'WhatsApp' },
    { k: 'mapa',      href: d.google_maps_url || null,                      label: 'Cómo llegar' }
  ].filter(r => r.href);
}

/**
 * Dibuja la ficha completa dentro de un elemento.
 * @param {HTMLElement} el
 * @param {Object} d      datos del negocio
 * @param {Object} [opts] { interactivo:false } deja los links inertes (preview/panel)
 */
function renderFicha(el, d, opts) {
  opts = opts || {};
  const vivo = opts.interactivo !== false;

  const tipo = typeof tipoNegocioPorId === 'function' ? tipoNegocioPorId(d.tipo_negocio) : null;
  const tipoLabel = d.tipo_label || (tipo ? tipo.nombre : (d.cat || ''));
  const ben = _beneficio(d);
  const redes = _redes(d);

  const logoHTML = d.logo_url
    ? `<img src="${_esc(d.logo_url)}" alt="Logo de ${_esc(d.nombre)}">`
    : `<span>Logo</span>`;

  const fotoHTML = d.foto_url
    ? `<img src="${_esc(d.foto_url)}" alt="${_esc(d.nombre)}">`
    : `<div class="mmcf__foto-ph">Foto negocio</div>`;

  const horario = d.horario_texto
    ? `<div class="mmcf__horario">Horario: ${_esc(d.horario_texto)}</div>`
    : '<div></div>';

  const ubicacion = d.tiene_local === false
    ? (d.comunas_cobertura && d.comunas_cobertura.length
        ? `Atiende en ${_esc(d.comunas_cobertura.slice(0, 3).join(', '))}${d.comunas_cobertura.length > 3 ? ' y más' : ''}`
        : _esc(d.comuna || ''))
    : [d.direccion, d.comuna].filter(Boolean).map(_esc).join(', ');

  el.innerHTML = `
   <div class="mmcf__grid">
    <div class="mmcf__head">
      <div class="mmcf__logo">${logoHTML}</div>
      <div class="mmcf__ident">
        ${tipoLabel ? `<span class="mmcf__tipo">${_esc(tipoLabel)}</span>` : ''}
        <h1 class="mmcf__nombre">${_esc(d.nombre || 'Nombre negocio')}</h1>
        ${ubicacion ? `<p class="mmcf__comuna">${MMC_ICONOS.pin} ${ubicacion}</p>` : ''}
      </div>
    </div>

    ${ben && ben.principal ? `
    <div class="mmcf__beneficio">
      <div class="mmcf__ben-valor">${_esc(ben.principal)}</div>
      <div class="mmcf__ben-meta">
        ${ben.cuando ? `<div class="mmcf__chip">${_esc(ben.cuando)}</div>` : ''}
        ${ben.condicion ? `<div class="mmcf__chip">${_esc(ben.condicion)}</div>` : ''}
      </div>
    </div>` : ''}

    <div class="mmcf__foto">
      ${fotoHTML}
      <div class="mmcf__foto-bar">
        ${horario}
        <div class="mmcf__redes">
          ${redes.map(r => `
            <a class="mmcf__red" ${vivo ? `href="${_esc(r.href)}" target="_blank" rel="noopener"` : 'href="#" onclick="return false"'}
               aria-label="${_esc(r.label)}" title="${_esc(r.label)}">${MMC_ICONOS[r.k]}</a>`).join('')}
        </div>
      </div>
    </div>

    ${ben && ben.principal ? `<button class="mmcf__cta" type="button">Obtener beneficio</button>` : ''}
   </div>
  `;
  return el;
}

/**
 * Tarjeta del directorio: la misma ficha en versión compacta.
 * Devuelve solo el contenido interior — va dentro del .biz-card que ya existe.
 * @param {Object} d      datos del negocio
 * @param {String} badge  etiqueta de la esquina (Fundador #002, Ejemplo, ★ Destacado)
 * @param {String} extra  HTML opcional al final (los íconos de contacto de siempre)
 */
function cardNegocioHTML(d, badge, extra) {
  const ben = _beneficio(d);
  const tipo = typeof tipoNegocioPorId === 'function' ? tipoNegocioPorId(d.tipo_negocio) : null;
  const catLabel = d.cat || (tipo ? tipo.nombre : '');

  const fondo = d.foto_url
    ? ''
    : (d.tipo === 'dueno'
        ? 'background:linear-gradient(135deg,#FFE699,#FFCE00);'
        : 'background:linear-gradient(135deg,#B9EDED,#47C9C9);');

  const foto = d.foto_url
    ? `<img src="${_esc(d.foto_url)}" alt="${_esc(d.nombre)}">`
    : `<span>${d.emoji || '🐾'}</span>`;

  const logo = d.logo_url
    ? `<img src="${_esc(d.logo_url)}" alt="">`
    : `<span>${d.emoji || '🐾'}</span>`;

  return `
    <div class="mmcard">
      <div class="mmcard__foto" style="${fondo}">
        ${badge ? `<span class="founder-badge${/destacado/i.test(badge) ? ' badge-destacado' : ''}">${_esc(badge)}</span>` : ''}
        ${foto}
      </div>
      <div class="mmcard__body">
        <div class="mmcard__head">
          <div class="mmcard__logo">${logo}</div>
          <div>
            <h3 class="mmcard__nombre">${_esc(d.nombre)}</h3>
            <div class="mmcard__cat">${_esc(catLabel)} · ${_esc(d.comuna || '')}</div>
          </div>
        </div>
        ${ben ? `
        <div class="mmcard__ben">
          <b>${_esc(ben.principal)}</b>
          ${(ben.condicion || ben.cuando) ? `<small>${_esc([ben.condicion, ben.cuando].filter(Boolean).join(' · '))}</small>` : ''}
        </div>` : ''}
        ${d.meta ? `<p class="mmcard__meta">${_esc(d.meta)}</p>` : ''}
        ${extra || ''}
      </div>
    </div>`;
}

/* Adaptador: pasa un negocio tal como lo arma js/app.js al formato de la ficha. */
function fichaDesdeNegocio(n) {
  return {
    nombre: n.nombre,
    cat: n.cat,
    tipo: n.tipo,
    tipo_negocio: n.tipoNegocio || null,
    tiene_local: n.tieneLocal !== false,
    comuna: n.comuna,
    comunas_cobertura: n.comunasCobertura || null,
    direccion: n.direccion,
    google_maps_url: n.googleMapsUrl || (n.direccion ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${n.direccion}, ${n.comuna}`) : null),
    whatsapp: n.whatsapp,
    instagram: n.instagram || n.redesSociales,
    facebook: n.facebook,
    tiktok: n.tiktok,
    horario_texto: n.horario,
    logo_url: n.logo,
    foto_url: n.foto,
    /* En la tabla `negocios` el beneficio ya viene escrito en dos líneas
       (beneficio_tipo / beneficio_detalle), armadas al aprobar la ficha.
       No se recalcula desde los campos estructurados para no repetir el texto. */
    beneficio_label: n.beneficioTipo,
    beneficio_condicion: n.beneficioDetalle,
    meta: n.meta,
    emoji: n.emoji
  };
}

/* Adaptador: una solicitud pendiente (tabla negocios_solicitudes) a la ficha. */
function fichaDesdeSolicitud(s) {
  return {
    nombre: s.nombre,
    cat: s.dir_cat,
    tipo: s.dir_tipo,
    tipo_negocio: s.tipo_negocio,
    tiene_local: s.tiene_local,
    comuna: s.comuna,
    comunas_cobertura: s.comunas_cobertura,
    direccion: s.direccion,
    google_maps_url: s.google_maps_url,
    whatsapp: s.whatsapp,
    instagram: s.instagram,
    facebook: s.facebook,
    tiktok: s.tiktok,
    horario_texto: s.horario_texto,
    logo_url: s.logo_url,
    foto_url: s.foto_url,
    beneficio_valor: s.beneficio_valor,
    beneficio_sobre: s.beneficio_sobre,
    beneficio_cuando: s.beneficio_cuando,
    beneficio_monto_min: s.beneficio_monto_min,
    beneficio_detalle: s.beneficio_detalle,
    beneficio_label: s.beneficio_label,
    beneficio_condicion: s.beneficio_condicion
  };
}

if (typeof window !== 'undefined') {
  window.renderFicha = renderFicha;
  window.cardNegocioHTML = cardNegocioHTML;
  window.fichaDesdeNegocio = fichaDesdeNegocio;
  window.fichaDesdeSolicitud = fichaDesdeSolicitud;
  window.MMC_ICONOS = MMC_ICONOS;
}

if (typeof module !== 'undefined') {
  module.exports = { renderFicha, cardNegocioHTML, fichaDesdeNegocio, fichaDesdeSolicitud, MMC_ICONOS };
}
