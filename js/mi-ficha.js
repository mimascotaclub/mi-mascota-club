/* ============================================================
   Mi Mascota Club — "Mi ficha" en /mi-negocio (28 de octubre de 2026)
   ------------------------------------------------------------
   Agrega la pestaña "Mi ficha" al panel del negocio. No cambia nada
   de lo que ya hacía js/app.js (login, visitas, /validar): lee la misma
   sesión que guarda app.js (localStorage "mmc_sesion_negocio") y usa
   su cliente de Supabase (window.mmcSupabase). app.js va encerrado en
   una función, así que sus funciones internas no se ven desde aquí:
   por eso este archivo trae sus propias versiones chicas.

   Qué puede hacer el negocio:
   · Se publica de inmediato: WhatsApp, teléfono, Instagram, TikTok,
     Facebook, sitio web, días y horario, descripción.
   · Con revisión (Jaime aprueba en /mi-panel): beneficio, logo, foto
     y dirección. Mientras tanto sigue vigente lo que ya está publicado.
   · No se cambia aquí: nombre, RUT, razón social, datos del responsable.

   Funciones de Supabase (parche v38): negocio_mi_ficha,
   negocio_guardar_ficha, negocio_pedir_cambio, negocio_anular_cambio.
   ============================================================ */
(function () {
  'use strict';

  var CORREO_CLUB = 'holamimascotaclub@gmail.com';
  /* Los mismos datos de EmailJS que usa js/app.js (son públicos por diseño). */
  var EMAILJS = { publicKey: '9eL8mW9_T5HjOEAYe', service: 'service_ch7ncxl', template: 'template_u9x5p1i' };
  var DIAS = ['Todos los días', 'Lunes a viernes', 'Lunes a sábado', 'Lunes a domingo',
              'Martes a domingo', 'Solo fines de semana', 'Con hora agendada'];
  var NOMBRES_CAMPO = { beneficio: 'Beneficio', logo: 'Logo', foto: 'Foto', direccion: 'Dirección' };

  var estado = null;      // lo que devuelve negocio_mi_ficha
  var cargando = false;
  var guardando = false;

  function $(id) { return document.getElementById(id); }
  function sb() { return window.mmcSupabase; }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function token() {
    try { var s = JSON.parse(localStorage.getItem('mmc_sesion_negocio') || 'null'); return (s && s.token) || ''; }
    catch (e) { return ''; }
  }
  /* Sesión vencida: se recarga /mi-negocio y app.js muestra el login con su aviso. */
  function sesionVencida() { location.replace('/mi-negocio'); }
  function soloDigitos(v) { return String(v || '').replace(/\D/g, ''); }
  function aviso(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(aviso.t);
    aviso.t = setTimeout(function () { t.classList.remove('show'); }, 3400);
  }
  function errorTexto(e) {
    var m = (e && (e.message || e.details)) || '';
    /* Los mensajes de las funciones de Supabase ya vienen escritos para el negocio. */
    if (m && !/fetch|network|JSON|function|permission|column|syntax/i.test(m)) return m;
    return 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.';
  }
  /* Igual que en app.js: así se arma el enlace /negocio/… */
  function slug(nombre) {
    return (nombre || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'negocio';
  }

  /* ---------- Horario: "9:00 AM - 7:00 PM" <-> "09:00" ---------- */
  function hora12(hhmm) {
    if (!hhmm) return '';
    var p = hhmm.split(':').map(Number);
    var suf = p[0] >= 12 ? 'PM' : 'AM';
    var h = p[0] % 12 === 0 ? 12 : p[0] % 12;
    return h + ':' + String(p[1]).padStart(2, '0') + ' ' + suf;
  }
  function hora24(txt) {
    var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(txt || '').trim());
    if (!m) return '';
    var h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return String(h).padStart(2, '0') + ':' + m[2];
  }
  function partirHorario(txt) {
    var p = String(txt || '').split(' - ');
    return { desde: hora24(p[0]), hasta: hora24(p[1]) };
  }

  /* ============================================================
     Pestañas
     ============================================================ */
  function montarPestanas() {
    var tabs = $('negTabs');
    if (!tabs || tabs.dataset.listo) return;
    tabs.dataset.listo = '1';
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('.mf-tab');
      if (b) mostrarPestana(b.dataset.tab);
    });
  }

  function mostrarPestana(cual) {
    document.querySelectorAll('#negTabs .mf-tab').forEach(function (b) {
      var on = b.dataset.tab === cual;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var vis = $('negVisitasBox'), fic = $('negFichaBox');
    if (vis) vis.hidden = cual !== 'visitas';
    if (fic) fic.hidden = cual !== 'ficha';
    if (cual === 'ficha') cargar();
  }

  /* Cuando el panel se cierra (Salir) o se vuelve a abrir, parte en Visitas. */
  function vigilarPanel() {
    var panel = $('negPanelBox');
    if (!panel) return;
    var visibleAntes = panel.style.display !== 'none';
    new MutationObserver(function () {
      var visible = panel.style.display !== 'none';
      if (visible !== visibleAntes) {
        visibleAntes = visible;
        estado = null;
        var f = $('negFichaBox'); if (f) f.innerHTML = '';
        mostrarPestana('visitas');
      }
    }).observe(panel, { attributes: true, attributeFilter: ['style'] });
  }

  /* ============================================================
     Carga
     ============================================================ */
  async function cargar() {
    var caja = $('negFichaBox');
    if (!caja || cargando) return;
    var tk = token();
    if (!tk) { sesionVencida(); return; }
    cargando = true;
    if (!estado) caja.innerHTML = '<div class="mf-cargando">Cargando tu ficha…</div>';
    try {
      var r = await sb().rpc('negocio_mi_ficha', { p_token: tk });
      if (r.error) throw r.error;
      if (!r.data || !r.data.ok) {
        sesionVencida();
        return;
      }
      estado = r.data;
      dibujar();
    } catch (e) {
      console.error('[mi-ficha]', e);
      caja.innerHTML = '<div class="mf-card"><p class="mf-sub" style="margin:0">No pudimos cargar tu ficha. ' +
        'Revisa tu conexión y <button type="button" class="mf-link-btn" id="mfReintentar">vuelve a intentarlo</button>.</p></div>';
      var b = $('mfReintentar'); if (b) b.onclick = cargar;
    } finally {
      cargando = false;
    }
  }

  function pendiente(campo) {
    return (estado.pendientes || []).find(function (p) { return p.campo === campo; }) || null;
  }
  function reciente(campo) {
    return (estado.recientes || []).find(function (p) { return p.campo === campo; }) || null;
  }

  /* ============================================================
     Dibujo
     ============================================================ */
  function dibujar() {
    var f = estado.ficha;
    var h = partirHorario(f.horario);
    var dias = DIAS.slice();
    if (f.horario_dias && dias.indexOf(f.horario_dias) === -1) dias.unshift(f.horario_dias);
    var maxDesc = Math.max(160, (f.descripcion || '').length);
    var wa = soloDigitos(f.whatsapp).replace(/^569/, '');
    var tel = String(f.telefono || '').replace(/^\+56\s?/, '');

    $('negFichaBox').innerHTML =
      '<div class="mf">' +

      /* Vista rápida */
      '<div class="mf-card">' +
        '<div class="mf-mini">' +
          '<div class="mf-mini__logo">' + (f.logo ? '<img src="' + esc(f.logo) + '" alt="">' : 'Logo') + '</div>' +
          '<div><b>Así te ven los socios</b><small>' + esc([f.cat, f.comuna].filter(Boolean).join(' · ')) + '</small></div>' +
        '</div>' +
        '<a class="mf-link" href="/negocio/' + esc(slug(f.nombre)) + '" target="_blank" rel="noopener">Ver mi ficha pública ↗</a>' +
      '</div>' +

      /* Contacto y redes */
      '<form class="mf-card" id="mfForm" novalidate>' +
        '<h3>Contacto y redes <span class="mf-tag mf-tag--ya">Se publica de inmediato</span></h3>' +
        '<div class="mf-fila">' +
          campoPre('mfWa', 'WhatsApp', '+56 9', wa, '1234 5678', 'tel', 'Ingresa los 8 dígitos, sin el 9.', 'maxlength="11" inputmode="numeric"') +
          campoPre('mfTel', 'Teléfono <small>(opcional)</small>', '+56', tel, '2 2345 6789', 'tel', 'Si lo escribes, revisa que tenga entre 8 y 11 dígitos.', 'inputmode="tel"') +
        '</div>' +
        '<div class="mf-fila">' +
          campoPre('mfIg', 'Instagram', '@', f.instagram || '', 'tunegocio', 'text', '', 'autocapitalize="off" autocomplete="off"') +
          campoPre('mfTt', 'TikTok', '@', f.tiktok || '', 'tunegocio', 'text', '', 'autocapitalize="off" autocomplete="off"') +
        '</div>' +
        '<div class="mf-fila">' +
          campoPre('mfFb', 'Facebook', 'facebook.com/', f.facebook || '', 'tunegocio', 'text', '', 'autocapitalize="off" autocomplete="off"') +
          '<div class="mf-f" id="f-mfWeb"><label for="mfWeb">Sitio web <small>(opcional)</small></label>' +
            '<input class="mf-in" id="mfWeb" type="url" inputmode="url" autocapitalize="off" placeholder="https://" value="' + esc(f.sitio_web || '') + '">' +
            '<div class="mf-err">Revisa el sitio web.</div></div>' +
        '</div>' +

        '<h3 style="margin-top:10px">Horario <span class="mf-tag mf-tag--ya">Se publica de inmediato</span></h3>' +
        '<div class="mf-f" id="f-mfDias"><label for="mfDias">Días de atención</label>' +
          '<select id="mfDias">' + dias.map(function (d) {
            return '<option' + (d === f.horario_dias ? ' selected' : '') + '>' + esc(d) + '</option>';
          }).join('') + '</select><div class="mf-err">Elige los días.</div></div>' +
        '<div class="mf-fila mf-fila--2m">' +
          '<div class="mf-f" id="f-mfDesde"><label for="mfDesde">Abre</label><input class="mf-in" type="time" id="mfDesde" value="' + esc(h.desde || '09:00') + '"><div class="mf-err">Indica la hora.</div></div>' +
          '<div class="mf-f" id="f-mfHasta"><label for="mfHasta">Cierra</label><input class="mf-in" type="time" id="mfHasta" value="' + esc(h.hasta || '19:00') + '"><div class="mf-err">Indica la hora.</div></div>' +
        '</div>' +
        '<p class="mf-nota">Se verá así: <b id="mfHorPrev"></b></p>' +

        '<h3 style="margin-top:22px">Descripción <span class="mf-tag mf-tag--ya">Se publica de inmediato</span></h3>' +
        '<div class="mf-sub">En una línea, qué haces y qué te hace especial.</div>' +
        '<div class="mf-f" style="margin-bottom:0"><textarea id="mfDesc" maxlength="' + maxDesc + '" placeholder="Ej: Petshop de barrio con alimento natural y accesorios.">' + esc(f.descripcion || '') + '</textarea>' +
          '<div class="mf-cuenta"><span id="mfDescN">0</span>/' + maxDesc + '</div></div>' +

        '<button type="submit" class="mf-btn" id="mfGuardar">Guardar cambios</button>' +
        '<div class="mf-msg" id="mfMsg"></div>' +
      '</form>' +

      /* Beneficio */
      '<div class="mf-card" id="mfBenCard">' + htmlBeneficio() + '</div>' +

      /* Logo y foto */
      '<div class="mf-card" id="mfFotosCard">' + htmlFotos() + '</div>' +

      /* Dirección */
      (f.tiene_local === false ? '' : '<div class="mf-card" id="mfDirCard">' + htmlDireccion() + '</div>') +

      /* Lo que no se cambia aquí */
      '<div class="mf-card">' +
        '<h3>Lo que no se cambia aquí</h3>' +
        '<div class="mf-sub" style="margin-bottom:0">Nombre, RUT, razón social y datos del responsable' +
          (f.tiene_local === false ? ', y las comunas donde atiendes' : '') +
          '. Si necesitas cambiarlos, <a href="mailto:' + CORREO_CLUB + '?subject=' +
          encodeURIComponent('Cambio en la ficha de ' + f.nombre + ' (' + f.codigo + ')') +
          '" style="color:var(--ink);font-weight:800">escríbenos</a> y lo hacemos por ti.</div>' +
      '</div>' +

      '</div>';

    conectarFormulario();
    conectarBeneficio();
    conectarFotos();
    conectarDireccion();
  }

  function campoPre(id, label, pre, valor, ph, tipo, err, extra) {
    return '<div class="mf-f" id="f-' + id + '"><label for="' + id + '">' + label + '</label>' +
      '<div class="mf-pre"><span>' + esc(pre) + '</span><input id="' + id + '" type="' + tipo + '" placeholder="' + esc(ph) +
      '" value="' + esc(valor) + '" ' + (extra || '') + '></div>' +
      (err ? '<div class="mf-err">' + esc(err) + '</div>' : '') + '</div>';
  }

  function htmlAvisoPendiente(campo, texto) {
    var p = pendiente(campo);
    if (p) {
      return '<div class="mf-aviso"><b>⏳ Cambio en revisión</b>' + texto(p.pide) +
        ' Lo revisamos en menos de 48 horas. Mientras, sigue vigente lo que ya está publicado.' +
        '<br><button type="button" class="mf-link-btn" data-anular="' + esc(p.id) + '">Anular este pedido</button></div>';
    }
    var r = reciente(campo);
    if (r && r.estado === 'aprobado') {
      return '<div class="mf-aviso mf-aviso--ok"><b>✓ Aprobamos tu cambio</b>Ya se ve en tu ficha.</div>';
    }
    if (r && r.estado === 'rechazado') {
      return '<div class="mf-aviso mf-aviso--no"><b>No pudimos aprobar tu último cambio</b>' +
        (r.motivo ? esc(r.motivo) : 'Escríbenos si tienes dudas.') + '</div>';
    }
    return '';
  }

  /* ---------- Beneficio ---------- */
  function htmlBeneficio() {
    var f = estado.ficha;
    return '<h3>Beneficio para socios <span class="mf-tag mf-tag--rev">Con revisión</span></h3>' +
      '<div class="mf-ben"><small>Vigente hoy</small><div class="t">' + esc(f.beneficio_tipo || 'Sin beneficio') + '</div>' +
        (f.beneficio_detalle ? '<small>' + esc(f.beneficio_detalle) + '</small>' : '') + '</div>' +
      htmlAvisoPendiente('beneficio', function (p) {
        return 'Pediste: <b style="display:inline">' + esc([p.label, p.condicion].filter(Boolean).join(' · ')) + '</b>.';
      }) +
      '<div class="mf-acc"><button type="button" class="mf-btn mf-btn--ng" id="mfBenAbrir">' +
        (pendiente('beneficio') ? 'Cambiar lo que pedí' : 'Cambiar beneficio') + '</button></div>' +
      '<div class="mf-editor" id="mfBenEditor" hidden></div>';
  }

  function opciones(lista, actual) {
    return '<option value="">Selecciona</option>' + (lista || []).map(function (o) {
      return '<option value="' + esc(o.id) + '"' + (o.id === actual ? ' selected' : '') + '>' + esc(o.etiqueta) + '</option>';
    }).join('');
  }

  function conectarBeneficio() {
    var abrir = $('mfBenAbrir');
    if (!abrir) return;
    abrir.onclick = function () {
      var ed = $('mfBenEditor');
      if (!ed.hidden) { ed.hidden = true; return; }
      var f = estado.ficha, p = pendiente('beneficio');
      var base = p ? p.pide : { valor: f.beneficio_valor, sobre: f.beneficio_sobre, cuando: f.beneficio_cuando,
                                monto_min: f.beneficio_monto_min, detalle: '' };
      ed.innerHTML =
        '<div class="mf-f"><label for="mfBV">1 · Qué ofreces</label><select id="mfBV">' + opciones(typeof BENEFICIO_VALOR !== 'undefined' ? BENEFICIO_VALOR : [], base.valor) + '</select></div>' +
        '<div class="mf-f"><label for="mfBS">2 · Sobre qué</label><select id="mfBS">' + opciones(typeof BENEFICIO_SOBRE !== 'undefined' ? BENEFICIO_SOBRE : [], base.sobre) + '</select></div>' +
        '<div class="mf-f"><label for="mfBC">3 · Cuándo</label><select id="mfBC">' + opciones(typeof BENEFICIO_CUANDO !== 'undefined' ? BENEFICIO_CUANDO : [], base.cuando) + '</select></div>' +
        '<div class="mf-fila">' +
          '<div class="mf-f"><label for="mfBM">Compra mínima <small>(opcional)</small></label><div class="mf-pre"><span>$</span><input id="mfBM" inputmode="numeric" placeholder="30000" value="' + esc(base.monto_min || '') + '"></div></div>' +
          '<div class="mf-f"><label for="mfBD">Detalle <small>(opcional)</small></label><input class="mf-in" id="mfBD" maxlength="60" placeholder="Ej: no acumulable con otras promos" value="' + esc(base.detalle || '') + '"></div>' +
        '</div>' +
        '<p class="mf-nota">Se verá así: <b id="mfBenPrev">—</b></p>' +
        '<button type="button" class="mf-btn" id="mfBenEnviar">Enviar a revisión</button>' +
        '<div class="mf-msg" id="mfBenMsg"></div>';
      ed.hidden = false;
      ['mfBV', 'mfBS', 'mfBC', 'mfBM', 'mfBD'].forEach(function (id) { $(id).addEventListener('input', prevBeneficio); });
      $('mfBM').addEventListener('input', function () { this.value = soloDigitos(this.value).slice(0, 8); prevBeneficio(); });
      prevBeneficio();
      $('mfBenEnviar').onclick = enviarBeneficio;
    };
  }

  function leerBeneficio() {
    var b = {
      valor: $('mfBV').value, sobre: $('mfBS').value, cuando: $('mfBC').value,
      monto_min: soloDigitos($('mfBM').value) || '', detalle: $('mfBD').value.trim()
    };
    var t = typeof beneficioTexto === 'function'
      ? beneficioTexto({ valor: b.valor, sobre: b.sobre, cuando: b.cuando, monto_minimo: b.monto_min, detalle: b.detalle })
      : null;
    b.label = t ? t.principal : '';
    b.condicion = t ? [t.condicion, t.cuando].filter(Boolean).join(' · ') : '';
    return b;
  }
  function prevBeneficio() {
    var b = leerBeneficio();
    $('mfBenPrev').textContent = b.valor && b.sobre && b.cuando ? [b.label, b.condicion].filter(Boolean).join(' · ') : '—';
  }

  async function enviarBeneficio() {
    var b = leerBeneficio();
    var msg = $('mfBenMsg');
    if (!b.valor || !b.sobre || !b.cuando) { ponerMsg(msg, 'Completa los tres pasos del beneficio.', false); return; }
    await pedirCambio('beneficio', b, $('mfBenEnviar'), msg,
      [b.label, b.condicion].filter(Boolean).join(' · '));
  }

  /* ---------- Logo y foto ---------- */
  function htmlFotos() {
    var f = estado.ficha;
    var pl = pendiente('logo'), pf = pendiente('foto');
    function caja(campo, titulo, actual, pend, ancha) {
      var url = pend ? pend.pide.url : actual;
      return '<div class="mf-foto mf-foto--' + campo + (ancha ? ' mf-foto--ancha' : '') + '">' +
        '<span>' + titulo + '</span>' +
        '<div class="mf-foto__img">' + (url ? '<img src="' + esc(url) + '" alt="">' : 'Sin imagen') +
          (pend ? '<span class="mf-foto__rev">En revisión</span>' : '') + '</div>' +
        '<label class="mf-btn mf-btn--ng" for="mfFile-' + campo + '">Cambiar ' + titulo.toLowerCase() + '</label>' +
        '<input type="file" id="mfFile-' + campo + '" accept="image/png,image/jpeg" data-campo="' + campo + '">' +
        '</div>';
    }
    return '<h3>Logo y foto <span class="mf-tag mf-tag--rev">Con revisión</span></h3>' +
      '<div class="mf-sub">PNG o JPG. El logo se ve mejor cuadrado; la foto, horizontal.</div>' +
      '<div class="mf-fotos">' + caja('logo', 'Logo', f.logo, pl, false) + caja('foto', 'Foto', f.foto, pf, true) + '</div>' +
      htmlAvisoPendiente('logo', function () { return 'Pediste cambiar el logo.'; }) +
      htmlAvisoPendiente('foto', function () { return 'Pediste cambiar la foto.'; }) +
      '<div class="mf-msg" id="mfFotoMsg"></div>';
  }

  function conectarFotos() {
    ['logo', 'foto'].forEach(function (campo) {
      var inp = $('mfFile-' + campo);
      if (!inp) return;
      inp.addEventListener('change', async function () {
        var file = inp.files && inp.files[0];
        inp.value = '';
        if (!file) return;
        var msg = $('mfFotoMsg');
        if (['image/png', 'image/jpeg'].indexOf(file.type) === -1) {
          ponerMsg(msg, 'La imagen tiene que ser PNG o JPG.', false); return;
        }
        if (file.size > 15 * 1024 * 1024) { ponerMsg(msg, 'La imagen pesa más de 15 MB. Usa una más liviana.', false); return; }
        ponerMsg(msg, 'Subiendo imagen…', true);
        try {
          var url = await subirImagen(file, campo === 'logo' ? 'logos' : 'fotos');
          await pedirCambio(campo, { url: url }, null, msg, campo === 'logo' ? 'Logo nuevo' : 'Foto nueva', url);
        } catch (e) {
          console.error('[mi-ficha] imagen', e);
          ponerMsg(msg, e && e.esNuestro ? e.message : 'No pudimos subir la imagen. Inténtalo de nuevo.', false);
        }
      });
    });
  }

  /* Igual que en el formulario de inscripción: se achica antes de subir. */
  function achicarImagen(file, maxLado, comoJpg) {
    return new Promise(function (resolve) {
      try {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(url);
          var escala = Math.min(1, maxLado / Math.max(img.width, img.height));
          if (escala === 1 && file.size < 600 * 1024) { resolve(file); return; }
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * escala);
          c.height = Math.round(img.height * escala);
          var ctx = c.getContext('2d');
          if (comoJpg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var tipo = comoJpg ? 'image/jpeg' : 'image/png';
          c.toBlob(function (blob) {
            if (!blob || blob.size >= file.size) { resolve(file); return; }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + (comoJpg ? '.jpg' : '.png'), { type: tipo }));
          }, tipo, 0.85);
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
      } catch (e) { resolve(file); }
    });
  }

  async function subirImagen(file, carpeta) {
    var esLogo = carpeta === 'logos';
    var archivo = await achicarImagen(file, esLogo ? 800 : 1600, !esLogo);
    if (archivo.size > 5 * 1024 * 1024) {
      var e1 = new Error('La imagen pesa más de 5 MB. Usa una más liviana.'); e1.esNuestro = true; throw e1;
    }
    var ext = archivo.type === 'image/png' ? 'png' : 'jpg';
    var ultimo = null;
    for (var i = 1; i <= 3; i++) {
      var path = carpeta + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      try {
        var r = await sb().storage.from('negocios').upload(path, archivo, { cacheControl: '3600', upsert: false, contentType: archivo.type });
        if (!r.error) return sb().storage.from('negocios').getPublicUrl(path).data.publicUrl;
        ultimo = r.error;
      } catch (e) { ultimo = e; }
      if (i < 3) await new Promise(function (ok) { setTimeout(ok, 1200 * i); });
    }
    throw ultimo || new Error('subida');
  }

  /* ---------- Dirección ---------- */
  function htmlDireccion() {
    var f = estado.ficha;
    return '<h3>Dirección <span class="mf-tag mf-tag--rev">Con revisión</span></h3>' +
      '<div class="mf-in" style="background:#F7F7F5">' + esc([f.direccion, f.comuna].filter(Boolean).join(', ') || '—') + '</div>' +
      htmlAvisoPendiente('direccion', function (p) { return 'Pediste: <b style="display:inline">' + esc(p.direccion) + '</b>.'; }) +
      '<div class="mf-acc"><button type="button" class="mf-btn mf-btn--ng" id="mfDirAbrir">' +
        (pendiente('direccion') ? 'Cambiar lo que pedí' : 'Cambiar dirección') + '</button></div>' +
      '<div class="mf-editor" id="mfDirEditor" hidden></div>';
  }

  function conectarDireccion() {
    var abrir = $('mfDirAbrir');
    if (!abrir) return;
    abrir.onclick = function () {
      var ed = $('mfDirEditor');
      if (!ed.hidden) { ed.hidden = true; return; }
      var f = estado.ficha, p = pendiente('direccion');
      var base = p ? p.pide : { direccion: f.direccion, google_maps_url: f.google_maps_url };
      ed.innerHTML =
        '<div class="mf-f"><label for="mfDir">Dirección</label><input class="mf-in" id="mfDir" maxlength="120" placeholder="Ej: Av. Irarrázaval 1234, local 2" value="' + esc(base.direccion || '') + '"></div>' +
        '<div class="mf-f"><label for="mfMaps">Enlace de Google Maps</label><input class="mf-in" id="mfMaps" type="url" autocapitalize="off" placeholder="https://maps.app.goo.gl/…" value="' + esc(base.google_maps_url || '') + '"></div>' +
        '<p class="mf-nota">Búscate en Google Maps, toca <b>Compartir</b> y pega aquí el enlace. Si cambias de comuna, <a href="mailto:' + CORREO_CLUB + '" style="color:var(--ink)">escríbenos</a>.</p>' +
        '<button type="button" class="mf-btn" id="mfDirEnviar">Enviar a revisión</button>' +
        '<div class="mf-msg" id="mfDirMsg"></div>';
      ed.hidden = false;
      $('mfDirEnviar').onclick = async function () {
        var d = { direccion: $('mfDir').value.trim(), google_maps_url: $('mfMaps').value.trim() };
        var msg = $('mfDirMsg');
        if (d.direccion.length < 5) { ponerMsg(msg, 'Escribe la dirección completa.', false); return; }
        if (!/^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(d.google_maps_url)) {
          ponerMsg(msg, 'Pega el enlace de Google Maps de tu local.', false); return;
        }
        await pedirCambio('direccion', d, $('mfDirEnviar'), msg, d.direccion);
      };
    };
  }

  /* ---------- Pedir / anular un cambio con revisión ---------- */
  async function pedirCambio(campo, datos, btn, msg, resumen, imagen) {
    var texto = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
    try {
      var r = await sb().rpc('negocio_pedir_cambio', { p_token: token(), p_campo: campo, p_datos: datos });
      if (r.error) throw r.error;
      avisarJaime(campo, resumen, imagen);
      aviso('✓ Enviado. Lo revisamos en menos de 48 horas.');
      await cargar();
    } catch (e) {
      console.error('[mi-ficha] pedir', e);
      if (msg) ponerMsg(msg, errorTexto(e), false);
    } finally {
      if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = texto; }
    }
  }

  async function anularCambio(id, btn) {
    if (!confirm('¿Anular este pedido? Tu ficha queda como está publicada hoy.')) return;
    btn.disabled = true;
    try {
      var r = await sb().rpc('negocio_anular_cambio', { p_token: token(), p_id: id });
      if (r.error) throw r.error;
      aviso('Pedido anulado.');
      await cargar();
    } catch (e) {
      console.error('[mi-ficha] anular', e);
      btn.disabled = false;
      aviso('No pudimos anularlo. Inténtalo de nuevo.');
    }
  }

  /* Correo a Jaime para que sepa que hay algo por revisar. Si falla, el
     pedido igual quedó guardado y aparece en /mi-panel. */
  function avisarJaime(campo, resumen, imagen) {
    try {
      if (!window.emailjs) return;
      var f = estado.ficha;
      emailjs.send(EMAILJS.service, EMAILJS.template, {
        to_email: CORREO_CLUB,
        to_name: 'Jaime',
        ocultar_socio: 'si',
        asunto: 'Cambio por revisar — ' + f.nombre,
        eyebrow: 'Negocios',
        titulo: f.nombre + ' pidió un cambio',
        intro: f.nombre + ' (' + f.codigo + ') pidió cambiar: ' + (NOMBRES_CAMPO[campo] || campo) + '.' +
               (resumen ? ' Pide: ' + resumen + '.' : '') + (imagen ? ' Imagen: ' + imagen : ''),
        caja_titulo: 'Estado',
        caja_dato: 'POR REVISAR',
        boton_texto: 'Revisar en mi panel →',
        boton_url: 'https://mimascotaclub.cl/mi-panel',
        caja_nota: 'Está en Cambios de fichas por revisar.',
        mensaje_extra: ''
      }, { publicKey: EMAILJS.publicKey }).catch(function (e) { console.warn('[mi-ficha] correo', e); });
    } catch (e) { console.warn('[mi-ficha] correo', e); }
  }

  /* ---------- Formulario de lo que se publica de inmediato ---------- */
  function conectarFormulario() {
    var form = $('mfForm');
    if (!form) return;
    var prevHor = function () { $('mfHorPrev').textContent = 'Horario: ' + (horarioTexto() || '—'); };
    $('mfDesde').addEventListener('input', prevHor);
    $('mfHasta').addEventListener('input', prevHor);
    prevHor();
    var cuenta = function () { $('mfDescN').textContent = $('mfDesc').value.length; };
    $('mfDesc').addEventListener('input', cuenta);
    cuenta();
    $('mfWa').addEventListener('input', function () { this.value = this.value.replace(/[^\d ]/g, ''); });
    form.addEventListener('input', function (e) {
      var f = e.target.closest('.mf-f'); if (f) f.classList.remove('is-err');
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); guardar(); });
    document.querySelectorAll('#negFichaBox [data-anular]').forEach(function (b) {
      b.onclick = function () { anularCambio(b.getAttribute('data-anular'), b); };
    });
  }

  function horarioTexto() {
    var a = $('mfDesde').value, b = $('mfHasta').value;
    return a && b ? hora12(a) + ' - ' + hora12(b) : '';
  }

  function marcar(id, ok) {
    var el = $('f-' + id);
    if (el) el.classList.toggle('is-err', !ok);
    return ok;
  }

  async function guardar() {
    if (guardando) return;
    var msg = $('mfMsg');
    var wa = soloDigitos($('mfWa').value);
    var tel = soloDigitos($('mfTel').value);
    var web = $('mfWeb').value.trim();
    var ok = true;
    ok = marcar('mfWa', wa.length === 8) && ok;
    ok = marcar('mfTel', tel.length === 0 || (tel.length >= 8 && tel.length <= 11)) && ok;
    ok = marcar('mfWeb', !web || (!/\s/.test(web) && /\.[a-z]{2,}/i.test(web))) && ok;
    ok = marcar('mfDias', !!$('mfDias').value) && ok;
    ok = marcar('mfDesde', !!$('mfDesde').value) && ok;
    ok = marcar('mfHasta', !!$('mfHasta').value) && ok;
    if (!ok) {
      ponerMsg(msg, 'Revisa los campos marcados en rojo.', false);
      var primero = document.querySelector('#mfForm .is-err');
      if (primero) primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var f = estado.ficha;
    /* Si el horario no se tocó, se manda tal cual estaba guardado. */
    var h = partirHorario(f.horario);
    var horario = (h.desde === $('mfDesde').value && h.hasta === $('mfHasta').value && f.horario) ? f.horario : horarioTexto();
    var telOriginal = String(f.telefono || '').replace(/^\+56\s?/, '');

    var datos = {
      p_token: token(),
      p_whatsapp: '+569' + wa,
      p_telefono: !tel ? null : (soloDigitos(telOriginal) === tel ? f.telefono : '+56 ' + $('mfTel').value.trim().replace(/\s+/g, ' ')),
      p_instagram: $('mfIg').value.trim() || null,
      p_tiktok: $('mfTt').value.trim() || null,
      p_facebook: $('mfFb').value.trim() || null,
      p_sitio_web: web || null,
      p_horario_dias: $('mfDias').value,
      p_horario: horario,
      p_descripcion: $('mfDesc').value.trim() || null
    };

    guardando = true;
    var btn = $('mfGuardar');
    btn.disabled = true; btn.textContent = 'Guardando…';
    ponerMsg(msg, '', true);
    try {
      var r = await sb().rpc('negocio_guardar_ficha', datos);
      if (r.error) throw r.error;
      if (r.data && r.data.cambios === 0) {
        ponerMsg(msg, 'No había cambios que guardar.', true);
      } else {
        aviso('✓ Guardado. Ya se ve en tu ficha.');
        await cargar();
        ponerMsg($('mfMsg'), '✓ Guardado. Ya se ve en tu ficha.', true);
      }
    } catch (e) {
      console.error('[mi-ficha] guardar', e);
      ponerMsg(msg, errorTexto(e), false);
    } finally {
      guardando = false;
      var b2 = $('mfGuardar');
      if (b2) { b2.disabled = false; b2.textContent = 'Guardar cambios'; }
    }
  }

  function ponerMsg(el, texto, ok) {
    if (!el) return;
    el.textContent = texto || '';
    el.className = 'mf-msg ' + (texto ? (ok ? 'mf-msg--ok' : 'mf-msg--err') : '');
  }

  /* ============================================================
     Arranque
     ============================================================ */
  function iniciar() {
    if (!$('negPanelBox') || !$('negTabs')) return;
    montarPestanas();
    vigilarPanel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
