/* ============================================================
   Mi Mascota Club — /mi-panel: fichas de negocios (28 de octubre de 2026)
   ------------------------------------------------------------
   Dos bloques nuevos del panel privado. No toca nada de js/app.js:
   1. "Cambios de fichas por revisar": lo que los negocios piden desde
      /mi-negocio → Mi ficha (beneficio, logo, foto, dirección).
      Aprobar lo publica de inmediato; rechazar deja la ficha como está.
   2. "Editar fichas publicadas": cambiar cualquier ficha que ya está
      en el directorio (antes solo se podían editar las pendientes).

   Cada cambio guarda una copia de la ficha anterior en la tabla
   negocios_ediciones (parche v38), así siempre se puede volver atrás.
   ============================================================ */
(function () {
  'use strict';

  var NOMBRES = { beneficio: 'Beneficio', logo: 'Logo', foto: 'Foto', direccion: 'Dirección' };
  var DIAS = ['Todos los días', 'Lunes a viernes', 'Lunes a sábado', 'Lunes a domingo',
              'Martes a domingo', 'Solo fines de semana', 'Con hora agendada'];
  /* Los mismos datos de EmailJS que usa js/app.js (son públicos por diseño). */
  var EMAILJS = { publicKey: '9eL8mW9_T5HjOEAYe', service: 'service_ch7ncxl', template: 'template_u9x5p1i' };
  var cambios = [];
  var negocios = [];
  var cargado = false;

  function $(id) { return document.getElementById(id); }
  function sb() { return window.mmcSupabase; }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function aviso(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(aviso.t);
    aviso.t = setTimeout(function () { t.classList.remove('show'); }, 3400);
  }
  /* Las tablas de abajo del panel (app.js) se vuelven a cargar. */
  function refrescarPanel() { if (typeof window.refreshAdmin === 'function') { try { window.refreshAdmin(); } catch (_) {} } }
  function msgDe(e) { return (e && (e.message || e.details)) || 'Algo falló. Inténtalo de nuevo.'; }
  function slug(nombre) {
    return (nombre || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'negocio';
  }

  /* ============================================================
     1. Cambios por revisar
     ============================================================ */
  async function cargarCambios() {
    var cont = $('colaCambios');
    if (!cont) return;
    cont.innerHTML = '<div class="cola-vacia">Cargando…</div>';
    try {
      var r = await sb().rpc('admin_cambios_pendientes');
      if (r.error) throw r.error;
      cambios = r.data || [];
      contar(cambios.length);
      if (!cambios.length) { cont.innerHTML = '<div class="cola-vacia">No hay cambios esperando revisión. 🎉</div>'; return; }
      cont.innerHTML = cambios.map(htmlCambio).join('');
    } catch (e) {
      console.error('[panel-fichas]', e);
      contar(0);
      cont.innerHTML = '<div class="cola-vacia">No pudimos cargar los cambios. Toca ↻ Actualizar.</div>';
    }
  }

  /* El número aparece en "Por hacer", en el título del bloque y en su resumen. */
  function contar(n) {
    var c = $('cambiosCount');
    if (c) { c.textContent = n; c.dataset.cero = n ? '0' : '1'; }
    var d = $('dshCntCambios');
    if (d) { d.textContent = n; d.classList.toggle('hay', n > 0); }
    /* panel-dashboard.js vuelve a contar "Por hacer" cuando cambia un contador
       que ya vigila; se le da un toque al de fichas sin cambiar su valor. */
    var t = $('colaCount');
    if (t) t.textContent = t.textContent;
  }

  function valorHtml(campo, v) {
    v = v || {};
    if (campo === 'beneficio') return esc([v.label, v.condicion].filter(Boolean).join(' · ') || '—');
    if (campo === 'logo' || campo === 'foto') return v.url ? '<img src="' + esc(v.url) + '" alt="">' : '—';
    return esc(v.direccion || '—') + (v.google_maps_url
      ? '<br><a href="' + esc(v.google_maps_url) + '" target="_blank" rel="noopener">Ver en Google Maps ↗</a>' : '');
  }

  function htmlCambio(c) {
    var fecha = new Date(c.creado_en).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return '<div class="cola-item" id="cmb-' + esc(c.id) + '">' +
      '<div class="mf-cab"><b>' + esc(c.nombre) + ' <small style="font-weight:600;color:var(--gray)">' + esc(c.codigo) + '</small></b>' +
        '<span class="mf-tag mf-tag--rev">' + esc(NOMBRES[c.campo] || c.campo) + '</span></div>' +
      '<div class="cola-fecha">Pedido el ' + esc(fecha) + '</div>' +
      '<div class="mf-cmb">' +
        '<div class="mf-cmb__antes"><small>Hoy publicado</small>' + valorHtml(c.campo, c.ahora) + '</div>' +
        '<div class="mf-cmb__pide"><small>Pide</small>' + valorHtml(c.campo, c.pide) + '</div>' +
      '</div>' +
      '<div class="cola-acciones">' +
        '<button class="cola-btn cola-btn--ok" data-cmb-ok="' + esc(c.id) + '">✓ Aprobar</button>' +
        '<button class="cola-btn cola-btn--no" data-cmb-no="' + esc(c.id) + '">✕ Rechazar</button>' +
      '</div>' +
      '<div class="cola-msg" id="cmbmsg-' + esc(c.id) + '"></div>' +
    '</div>';
  }

  async function resolver(id, aprobar) {
    var c = cambios.find(function (x) { return x.id === id; });
    if (!c) return;
    var motivo = null;
    if (aprobar) {
      if (!confirm('¿Aprobar el cambio de ' + (NOMBRES[c.campo] || c.campo).toLowerCase() + ' de "' + c.nombre + '"?\n\nSe publica de inmediato en su ficha.')) return;
    } else {
      motivo = prompt('¿Por qué no se aprueba? El negocio lo verá en su panel y le llega por correo.\n\nEj: La foto se ve borrosa. Envía una con más luz.', '');
      if (motivo === null) return;
    }
    var item = $('cmb-' + id), m = $('cmbmsg-' + id);
    item.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    if (m) { m.textContent = aprobar ? 'Publicando…' : 'Guardando…'; m.className = 'cola-msg cola-msg--ok'; }
    try {
      var r = await sb().rpc('admin_resolver_cambio', { p_id: id, p_aprobar: aprobar, p_motivo: motivo || null });
      if (r.error) throw r.error;
      avisarNegocio(c, aprobar, motivo);
      if (m) m.textContent = aprobar ? '✓ Publicado. Avisando al negocio…' : 'Rechazado. Avisando al negocio…';
      refrescarPanel();
      setTimeout(function () { cargarCambios(); cargarNegocios(); }, 1500);
    } catch (e) {
      console.error('[panel-fichas]', e);
      item.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
      if (m) { m.textContent = msgDe(e); m.className = 'cola-msg cola-msg--err'; }
    }
  }

  function avisarNegocio(c, aprobar, motivo) {
    try {
      if (!c.email || !window.emailjs) return;
      var que = (NOMBRES[c.campo] || c.campo).toLowerCase();
      emailjs.send(EMAILJS.service, EMAILJS.template, {
        to_email: c.email,
        to_name: c.nombre,
        ocultar_socio: 'si',
        asunto: aprobar ? 'Aprobamos el cambio de tu ficha' : 'Sobre el cambio que pediste en tu ficha',
        eyebrow: 'Negocios',
        titulo: aprobar ? 'Tu cambio ya está publicado' : 'No pudimos aprobar tu cambio',
        intro: aprobar
          ? 'Revisamos el cambio de ' + que + ' que pediste para ' + c.nombre + ' y ya se ve en tu ficha del directorio.'
          : 'Revisamos el cambio de ' + que + ' que pediste para ' + c.nombre + ' y esta vez no lo pudimos aprobar. '
            + 'Tu ficha sigue como estaba.' + (motivo ? ' Motivo: ' + motivo : ''),
        caja_titulo: 'Cambio de ' + que,
        caja_dato: aprobar ? 'APROBADO' : 'NO APROBADO',
        boton_texto: aprobar ? 'Ver mi ficha →' : 'Ir a mi panel →',
        boton_url: aprobar ? 'https://mimascotaclub.cl/negocio/' + slug(c.nombre) : 'https://mimascotaclub.cl/mi-negocio',
        caja_nota: aprobar ? '' : 'Puedes enviar el cambio de nuevo desde Mi ficha.',
        mensaje_extra: 'Si tienes dudas, responde este correo.'
      }, { publicKey: EMAILJS.publicKey }).catch(function (e) { console.warn('[panel-fichas] correo', e); });
    } catch (e) { console.warn('[panel-fichas] correo', e); }
  }

  /* ============================================================
     2. Editar fichas publicadas
     ============================================================ */
  async function cargarNegocios() {
    var cont = $('editFichasLista');
    if (!cont) return;
    try {
      var r = await sb().from('negocios').select('*').order('created_at', { ascending: true });
      if (r.error) throw r.error;
      negocios = r.data || [];
      pintarLista();
    } catch (e) {
      console.error('[panel-fichas]', e);
      cont.innerHTML = '<div class="cola-vacia">No pudimos cargar los negocios.</div>';
    }
  }

  function pintarLista() {
    var cont = $('editFichasLista');
    if (!cont) return;
    var q = (($('editFichasBuscar') || {}).value || '').toLowerCase().trim();
    var abiertos = {};
    cont.querySelectorAll('.mf-item__form:not([hidden])').forEach(function (f) { abiertos[f.dataset.codigo] = true; });
    var lista = negocios.filter(function (n) {
      return !q || [n.nombre, n.codigo, n.comuna, n.cat].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    if (!lista.length) { cont.innerHTML = '<div class="cola-vacia">' + (q ? 'Ningún negocio coincide.' : 'Aún no hay negocios publicados.') + '</div>'; return; }
    cont.innerHTML = lista.map(function (n) {
      return '<div class="mf-item" id="ed-' + esc(n.codigo) + '">' +
        '<div class="mf-item__cab" data-ed-abrir="' + esc(n.codigo) + '">' +
          '<div><b>' + esc(n.nombre) + '</b><small>' + esc([n.codigo, n.cat, n.comuna].filter(Boolean).join(' · ')) + '</small></div>' +
          '<span class="mf-tag mf-tag--ya">Editar ›</span></div>' +
        '<div class="mf-item__form" data-codigo="' + esc(n.codigo) + '" hidden></div>' +
      '</div>';
    }).join('');
    Object.keys(abiertos).forEach(abrirEditor);
  }

  function campo(id, label, valor, extra, nota) {
    return '<div class="mf-f"><label for="' + id + '">' + label + '</label>' +
      '<input class="mf-in" id="' + id + '" value="' + esc(valor || '') + '" ' + (extra || '') + '>' +
      (nota ? '<div class="mf-aviso-sm">' + nota + '</div>' : '') + '</div>';
  }

  var CAMPOS = [
    ['nombre', 'Nombre'], ['email', 'Correo'], ['comuna', 'Comuna'], ['direccion', 'Dirección'],
    ['google_maps_url', 'Google Maps'], ['whatsapp', 'WhatsApp'], ['telefono', 'Teléfono'],
    ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['sitio_web', 'Sitio web'],
    ['horario_dias', 'Días'], ['horario', 'Horario'], ['descripcion', 'Descripción'],
    ['beneficio_tipo', 'Beneficio'], ['beneficio_detalle', 'Condición'], ['logo', 'Logo'], ['foto', 'Foto']
  ];

  function abrirEditor(codigo) {
    var item = $('ed-' + codigo);
    if (!item) return;
    var form = item.querySelector('.mf-item__form');
    if (!form.hidden && form.innerHTML) { form.hidden = true; form.innerHTML = ''; return; }
    var n = negocios.find(function (x) { return x.codigo === codigo; });
    if (!n) return;
    var dias = DIAS.slice();
    if (n.horario_dias && dias.indexOf(n.horario_dias) === -1) dias.unshift(n.horario_dias);
    var p = 'ed_' + codigo + '_';
    form.innerHTML =
      campo(p + 'nombre', 'Nombre', n.nombre, 'maxlength="60"', 'Si cambias el nombre, cambia el enlace de su ficha (/negocio/…). Los enlaces viejos dejan de funcionar.') +
      campo(p + 'email', 'Correo del responsable', n.email, 'type="email" autocapitalize="off"', 'Con este correo entra a /mi-negocio y valida canjes.') +
      '<div class="mf-fila">' + campo(p + 'comuna', 'Comuna', n.comuna) + campo(p + 'direccion', 'Dirección', n.direccion) + '</div>' +
      campo(p + 'google_maps_url', 'Enlace de Google Maps', n.google_maps_url, 'autocapitalize="off"') +
      '<div class="mf-fila">' + campo(p + 'whatsapp', 'WhatsApp', n.whatsapp, 'placeholder="+56912345678"') + campo(p + 'telefono', 'Teléfono', n.telefono, 'placeholder="+56 2 2345 6789"') + '</div>' +
      '<div class="mf-fila">' + campo(p + 'instagram', 'Instagram', n.instagram, 'autocapitalize="off"') + campo(p + 'tiktok', 'TikTok', n.tiktok, 'autocapitalize="off"') + '</div>' +
      '<div class="mf-fila">' + campo(p + 'facebook', 'Facebook', n.facebook, 'autocapitalize="off"') + campo(p + 'sitio_web', 'Sitio web', n.sitio_web, 'autocapitalize="off"') + '</div>' +
      '<div class="mf-fila">' +
        '<div class="mf-f"><label for="' + p + 'horario_dias">Días</label><select id="' + p + 'horario_dias"><option value="">—</option>' +
          dias.map(function (d) { return '<option' + (d === n.horario_dias ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select></div>' +
        campo(p + 'horario', 'Horario', n.horario, 'placeholder="9:00 AM - 7:00 PM"') +
      '</div>' +
      '<div class="mf-f"><label for="' + p + 'descripcion">Descripción</label><textarea id="' + p + 'descripcion" maxlength="400">' + esc(n.descripcion || '') + '</textarea></div>' +
      campo(p + 'beneficio_tipo', 'Beneficio (línea grande)', n.beneficio_tipo, 'maxlength="80"') +
      campo(p + 'beneficio_detalle', 'Condición (línea chica)', n.beneficio_detalle, 'maxlength="220"', 'Se muestra tal cual en la ficha y al validar el canje.') +
      '<div class="mf-fotos">' +
        fotoAdmin(p, 'logo', 'Logo', n.logo) + fotoAdmin(p, 'foto', 'Foto', n.foto) +
      '</div>' +
      '<div class="mf-acc">' +
        '<button type="button" class="mf-btn" data-ed-guardar="' + esc(codigo) + '">Guardar y publicar</button>' +
        '<a class="mf-btn mf-btn--ng" style="text-decoration:none;text-align:center" href="/negocio/' + esc(slug(n.nombre)) + '" target="_blank" rel="noopener">Ver ficha ↗</a>' +
      '</div>' +
      '<div class="mf-msg" id="' + p + 'msg"></div>';
    form.hidden = false;
    ['logo', 'foto'].forEach(function (k) {
      var inp = $(p + 'file_' + k);
      if (inp) inp.addEventListener('change', function () { subirFotoAdmin(p, k, inp); });
    });
  }

  function fotoAdmin(p, k, titulo, url) {
    return '<div class="mf-foto mf-foto--' + k + (k === 'foto' ? ' mf-foto--ancha' : '') + '"><span>' + titulo + '</span>' +
      '<div class="mf-foto__img" id="' + p + 'img_' + k + '">' + (url ? '<img src="' + esc(url) + '" alt="">' : 'Sin imagen') + '</div>' +
      '<input type="hidden" id="' + p + k + '" value="' + esc(url || '') + '">' +
      '<label class="mf-btn mf-btn--ng" for="' + p + 'file_' + k + '">Cambiar ' + titulo.toLowerCase() + '</label>' +
      '<input type="file" id="' + p + 'file_' + k + '" accept="image/png,image/jpeg"></div>';
  }

  async function subirFotoAdmin(p, k, inp) {
    var file = inp.files && inp.files[0];
    inp.value = '';
    if (!file) return;
    var msg = $(p + 'msg');
    if (['image/png', 'image/jpeg'].indexOf(file.type) === -1) { ponerMsg(msg, 'Solo PNG o JPG.', false); return; }
    if (file.size > 5 * 1024 * 1024) { ponerMsg(msg, 'La imagen pesa más de 5 MB.', false); return; }
    ponerMsg(msg, 'Subiendo imagen…', true);
    try {
      var path = (k === 'logo' ? 'logos' : 'fotos') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) +
        (file.type === 'image/png' ? '.png' : '.jpg');
      var r = await sb().storage.from('negocios').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (r.error) throw r.error;
      var url = sb().storage.from('negocios').getPublicUrl(path).data.publicUrl;
      $(p + k).value = url;
      $(p + 'img_' + k).innerHTML = '<img src="' + esc(url) + '" alt="">';
      ponerMsg(msg, 'Imagen lista. Toca «Guardar y publicar» para que se vea en la ficha.', true);
    } catch (e) {
      console.error('[panel-fichas] imagen', e);
      ponerMsg(msg, 'No se pudo subir la imagen. Inténtalo de nuevo.', false);
    }
  }

  async function guardarEditor(codigo, btn) {
    var n = negocios.find(function (x) { return x.codigo === codigo; });
    if (!n) return;
    var p = 'ed_' + codigo + '_';
    var datos = {}, cambiados = [];
    CAMPOS.forEach(function (c) {
      var el = $(p + c[0]);
      if (!el) return;
      var nuevo = el.value.trim();
      var viejo = n[c[0]] == null ? '' : String(n[c[0]]);
      if (nuevo !== viejo.trim()) { datos[c[0]] = nuevo || null; cambiados.push(c[1]); }
    });
    var msg = $(p + 'msg');
    if (!cambiados.length) { ponerMsg(msg, 'No hay cambios que guardar.', true); return; }
    if (!confirm('¿Publicar estos cambios en la ficha de "' + n.nombre + '"?\n\n' + cambiados.join(', '))) return;
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      var r = await sb().rpc('admin_editar_negocio', { p_codigo: codigo, p_datos: datos });
      if (r.error) throw r.error;
      aviso('✓ Ficha actualizada.');
      refrescarPanel();
      await cargarNegocios();
      var m2 = $(p + 'msg');
      ponerMsg(m2, '✓ Publicado: ' + cambiados.join(', ') + '.', true);
    } catch (e) {
      console.error('[panel-fichas] editar', e);
      ponerMsg(msg, msgDe(e), false);
    } finally {
      var b = document.querySelector('[data-ed-guardar="' + codigo + '"]');
      if (b) { b.disabled = false; b.textContent = 'Guardar y publicar'; }
    }
  }

  function ponerMsg(el, t, ok) {
    if (!el) return;
    el.textContent = t || '';
    el.className = 'mf-msg ' + (t ? (ok ? 'mf-msg--ok' : 'mf-msg--err') : '');
  }

  /* ============================================================
     Arranque: igual que el dashboard, se enciende al mostrarse el panel.
     ============================================================ */
  function conectar() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cmb-ok],[data-cmb-no],[data-ed-abrir],[data-ed-guardar]');
      if (!t || !t.closest('#adminPanel')) return;
      if (t.hasAttribute('data-cmb-ok')) resolver(t.getAttribute('data-cmb-ok'), true);
      else if (t.hasAttribute('data-cmb-no')) resolver(t.getAttribute('data-cmb-no'), false);
      else if (t.hasAttribute('data-ed-abrir')) abrirEditor(t.getAttribute('data-ed-abrir'));
      else if (t.hasAttribute('data-ed-guardar')) guardarEditor(t.getAttribute('data-ed-guardar'), t);
    });
    var b = $('editFichasBuscar');
    if (b) b.addEventListener('input', pintarLista);
  }

  function vigilarPanel() {
    var panel = $('adminPanel');
    if (!panel) return;
    function revisar() {
      var visible = panel.style.display === 'block';
      if (visible && !cargado) { cargado = true; cargarCambios(); cargarNegocios(); }
      if (!visible) cargado = false;
    }
    new MutationObserver(revisar).observe(panel, { attributes: true, attributeFilter: ['style'] });
    revisar();
  }

  function iniciar() {
    if (!$('colaCambios')) return;
    conectar();
    vigilarPanel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.mmcCambios = { cargar: cargarCambios, negocios: cargarNegocios };
})();
