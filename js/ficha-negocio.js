/* ============================================================
   Mi Mascota Club — Renderizador de la ficha de negocio
   Uso:  renderFicha(document.getElementById('ficha'), datos)
   El mismo componente sirve para /negocio/<slug> y para el
   preview en vivo dentro del formulario.
   Requiere: catalogos-negocio.js
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
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, '');
}

/**
 * @param {HTMLElement} el  contenedor
 * @param {Object} d        datos del negocio
 * @param {Object} [opts]   { interactivo: true }  false = preview sin links
 */
function renderFicha(el, d, opts) {
  opts = opts || {};
  const vivo = opts.interactivo !== false;

  const tipo = typeof tipoNegocioPorId === 'function' ? tipoNegocioPorId(d.tipo_negocio) : null;
  const tipoLabel = d.tipo_label || (tipo ? tipo.nombre : '');

  const ben = typeof beneficioTexto === 'function'
    ? beneficioTexto({
        valor: d.beneficio_valor,
        sobre: d.beneficio_sobre,
        cuando: d.beneficio_cuando,
        monto_minimo: d.beneficio_monto_min,
        detalle: d.beneficio_detalle
      })
    : null;

  const redes = [
    { k: 'instagram', href: _urlRed(d.instagram, 'https://instagram.com/'), label: 'Instagram' },
    { k: 'tiktok',    href: _urlRed(d.tiktok, 'https://tiktok.com/@'),      label: 'TikTok' },
    { k: 'facebook',  href: _urlRed(d.facebook, 'https://facebook.com/'),   label: 'Facebook' },
    { k: 'whatsapp',  href: _waLink(d.whatsapp),                            label: 'WhatsApp' },
    { k: 'mapa',      href: d.google_maps_url || null,                      label: 'Cómo llegar' }
  ].filter(r => r.href);

  const logoHTML = d.logo_url
    ? `<img src="${_esc(d.logo_url)}" alt="Logo de ${_esc(d.nombre)}">`
    : `<span>Logo</span>`;

  const fotoHTML = d.foto_url
    ? `<img src="${_esc(d.foto_url)}" alt="${_esc(d.nombre)}">`
    : `<div class="ficha__foto__ph">Foto negocio</div>`;

  const horario = d.horario_texto
    ? `<div class="ficha__horario">Horario: ${_esc(d.horario_texto)}</div>`
    : '<div></div>';

  const ubicacion = d.tiene_local === false
    ? (d.comunas_cobertura && d.comunas_cobertura.length
        ? `Atiende en ${_esc(d.comunas_cobertura.slice(0, 3).join(', '))}${d.comunas_cobertura.length > 3 ? ' y más' : ''}`
        : _esc(d.comuna || ''))
    : [d.direccion, d.comuna].filter(Boolean).map(_esc).join(', ');

  el.innerHTML = `
   <div class="ficha__grid">
    <div class="ficha__head">
      <div class="ficha__logo">${logoHTML}</div>
      <div class="ficha__ident">
        ${tipoLabel ? `<span class="ficha__tipo">${_esc(tipoLabel)}</span>` : ''}
        <h1 class="ficha__nombre">${_esc(d.nombre || 'Nombre negocio')}</h1>
        ${ubicacion ? `<p class="ficha__comuna">${MMC_ICONOS.pin} ${ubicacion}</p>` : ''}
      </div>
    </div>

    <div class="ficha__beneficio">
      <div class="beneficio__valor">${_esc(ben && ben.principal ? ben.principal : 'Beneficio')}</div>
      <div class="beneficio__meta">
        ${ben && ben.cuando ? `<div class="beneficio__chip">${_esc(ben.cuando)}</div>` : ''}
        ${ben && ben.condicion ? `<div class="beneficio__chip">${_esc(ben.condicion)}</div>` : ''}
      </div>
    </div>

    <div class="ficha__foto">
      ${fotoHTML}
      <div class="ficha__foto__bar">
        ${horario}
        <div class="ficha__redes">
          ${redes.map(r => `
            <a class="ficha__red" ${vivo ? `href="${_esc(r.href)}" target="_blank" rel="noopener"` : 'href="#" onclick="return false"'}
               aria-label="${_esc(r.label)}" title="${_esc(r.label)}">${MMC_ICONOS[r.k]}</a>`).join('')}
        </div>
      </div>
    </div>

    <button class="ficha__cta" type="button">Obtener beneficio</button>
   </div>
  `;

  return el;
}

if (typeof module !== 'undefined') module.exports = { renderFicha, MMC_ICONOS };
