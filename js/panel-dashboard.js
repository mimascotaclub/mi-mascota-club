/* ============================================================
   Mi Mascota Club — Dashboard de /mi-panel (24 de octubre de 2026)

   Solo dibuja el resumen de arriba del panel. No cambia nada de lo
   que ya hacía js/app.js: esas funciones siguen llenando sus bloques
   (con los mismos id) y este archivo solo los LEE.

   - Se activa solo cuando #adminPanel se muestra (después de entrar).
   - Lee socios y negocios (fechas y verificación), los fundadores
     (admin_fundadores) y el origen por código (admin_origen_resumen,
     parche v36). Todo es lectura.
   - Copia los contadores de los bloques de abajo (verificaciones,
     fichas, pagos, sugerencias, avisos…) a "Por hacer" y a las
     secciones plegables.

   Las metas del mes se cambian aquí abajo (METAS).
   ============================================================ */
(function () {
  var METAS = { socios: 150, fundadores: 30, negocios: 10 };
  var CUPOS_FUNDADOR = 100;
  var SEMANAS = 7;

  var cargado = false;
  function $(id) { return document.getElementById(id); }
  function sb() { return window.mmcSupabase; }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clp(n) { return '$' + Math.round(n || 0).toLocaleString('es-CL'); }
  function txt(id, v) { var e = $(id); if (e) e.textContent = v; }

  /* Lunes 00:00 (hora local) de la semana de una fecha. */
  function lunes(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var dia = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - dia);
    return x;
  }

  function fecha() {
    var s = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    txt('dshFecha', s + ' · panel privado');
  }

  function meta(idFill, idLbl, valor, objetivo) {
    var f = $(idFill); if (!f) return;
    f.textContent = valor;
    f.style.width = Math.min(100, Math.round(valor / objetivo * 100)) + '%';
    txt(idLbl, 'meta ' + objetivo);
  }

  /* ---------- Inscripciones por semana + deltas + verificación ---------- */
  function dibujarSocios(soc, neg) {
    var hoy = new Date();
    var esta = lunes(hoy).getTime();
    var semanas = [];
    for (var i = SEMANAS - 1; i >= 0; i--) {
      var ini = new Date(esta); ini.setDate(ini.getDate() - i * 7);
      semanas.push({ ini: ini.getTime(), n: 0 });
    }
    soc.forEach(function (s) {
      var t = lunes(new Date(s.created_at)).getTime();
      for (var k = 0; k < semanas.length; k++) if (semanas[k].ini === t) { semanas[k].n++; break; }
    });
    var max = Math.max.apply(null, semanas.map(function (s) { return s.n; }).concat([1]));
    var topN = Math.max.apply(null, semanas.slice(0, -1).map(function (s) { return s.n; }).concat([0]));
    var cont = $('dshBarras');
    if (cont) {
      cont.innerHTML = semanas.map(function (s, idx) {
        var ultima = idx === semanas.length - 1;
        var di = new Date(s.ini);
        var mes = di.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '').slice(0, 3);
        var etiqueta = ultima ? 'Esta' : di.getDate() + ' <i>' + esc(mes) + '</i>';
        var cls = 'dsh-barra' + (ultima ? ' actual' : '') + (!ultima && s.n === topN && topN > 0 ? ' top' : '');
        var h = Math.max(4, Math.round(s.n / max * 100));
        return '<div class="' + cls + '"><span class="dsh-barra__v">' + s.n + '</span>' +
          '<span class="dsh-barra__b" style="height:' + h + '%"></span>' +
          '<span class="dsh-barra__s">' + etiqueta + '</span></div>';
      }).join('');
    }
    var actual = semanas[semanas.length - 1].n, previa = semanas[semanas.length - 2].n;
    txt('dshSemana', actual);
    txt('dshSemanaTxt', 'esta semana · la anterior ' + (previa === 1 ? 'fue 1' : 'fueron ' + previa));

    var negSemana = neg.filter(function (n) { return n.created_at && new Date(n.created_at).getTime() >= esta; }).length;
    var dO = $('dshDeltaOwners');
    if (dO) dO.innerHTML = actual ? '<b>+' + actual + '</b> esta semana' : 'Sin nuevos esta semana';
    var dB = $('dshDeltaBiz');
    if (dB) dB.innerHTML = negSemana ? '<b>+' + negSemana + '</b> esta semana' : 'Sin cambios esta semana';

    var si = soc.filter(function (s) { return s.verificacion === 'verificado'; }).length;
    var pct = soc.length ? Math.round(si / soc.length * 100) : 0;
    txt('dshVerifPct', pct + '%');
    txt('dshVerifSi', si);
    txt('dshVerifNo', soc.length - si);
    var bar = $('dshVerifBar'); if (bar) bar.style.width = pct + '%';

    meta('dshMetaSocios', 'dshMetaSociosL', soc.length, METAS.socios);
    meta('dshMetaNeg', 'dshMetaNegL', neg.length, METAS.negocios);
    txt('dshCntDuenos', soc.length);
    txt('dshCntNeg', neg.length);
  }

  /* ---------- Pase Fundador ---------- */
  function dibujarFundadores(f) {
    var n = f.length;
    var plata = f.reduce(function (t, x) { return t + Number(x.monto || 0); }, 0);
    txt('dshFundN', n);
    txt('dshFundPlata', clp(plata));
    txt('dshFundLibres', Math.max(0, CUPOS_FUNDADOR - n));
    var ring = $('dshFundRing');
    if (ring) {
      var largo = 2 * Math.PI * 50;
      ring.setAttribute('stroke-dasharray', (largo * Math.min(1, n / CUPOS_FUNDADOR)).toFixed(1) + ' ' + largo.toFixed(2));
    }
    meta('dshMetaFund', 'dshMetaFundL', n, METAS.fundadores);
  }

  /* ---------- ¿De dónde llegan? ---------- */
  /* 'formulario-v3' es el valor que el formulario de negocios guarda por
     defecto cuando nadie llegó con código: cuenta como "sin código". */
  var SIN_CODIGO = { '': 1, 'formulario-v3': 1 };
  function dibujarOrigen(filas) {
    var tb = $('dshOrigen'); if (!tb) return;
    var sin = { visitas: 0, socios: 0, negocios: 0 };
    var con = [];
    (filas || []).forEach(function (r) {
      var o = { ref: r.ref || '', visitas: Number(r.visitas || 0), socios: Number(r.socios || 0), negocios: Number(r.negocios || 0) };
      if (SIN_CODIGO[o.ref]) { sin.visitas += o.visitas; sin.socios += o.socios; sin.negocios += o.negocios; }
      else con.push(o);
    });
    var html = con.map(function (o) {
      var inscritos = o.socios + o.negocios;
      var estado, cls = '';
      if (inscritos > 0) { estado = 'Trae inscripciones'; cls = 'bien'; }
      else if (o.visitas >= 3) { estado = 'Visitan, no se inscriben'; cls = 'mal'; }
      else if (o.visitas > 0) { estado = 'Pocas visitas aún'; }
      else { estado = 'Sin visitas aún'; }
      return '<tr class="' + cls + '"><td><span class="dsh-cod">' + esc(o.ref) + '</span></td>' +
        '<td class="num">' + o.visitas + '</td><td class="num">' + o.socios + '</td><td class="num">' + o.negocios + '</td>' +
        '<td class="col-res"><span class="dsh-pill ' + cls + '">' + estado + '</span></td></tr>';
    }).join('');
    html += '<tr><td><span class="dsh-cod dsh-cod--sin">Sin código</span></td><td class="num">—</td>' +
      '<td class="num">' + sin.socios + '</td><td class="num">' + sin.negocios + '</td>' +
      '<td class="col-res"><span class="dsh-pill">Llegaron solos</span></td></tr>';
    tb.innerHTML = html;
  }

  /* ---------- Contadores copiados de los bloques de abajo ---------- */
  var ESPEJOS = [
    ['verifCount', 'dshCntVerif'], ['colaCount', 'dshCntFichas'], ['fundPendCount', 'dshCntPagos'],
    ['sugCount', 'dshCntSug'], ['avisosCount', 'dshCntAvisos'], ['fundCount', 'dshCntFund'],
    ['statCanjes', 'dshCntCanjes'], ['ajusteVerifEstado', 'dshCntAjustes']
  ];
  var PENDIENTES = { dshCntVerif: 1, dshCntFichas: 1, dshCntPagos: 1, dshCntSug: 1 };

  function copiarContadores() {
    ESPEJOS.forEach(function (par) {
      var o = $(par[0]), d = $(par[1]);
      if (!o || !d) return;
      var v = (o.textContent || '').trim();
      if (par[1] === 'dshCntAjustes' && v.length > 14) v = v.slice(0, 14) + '…';
      if (par[1] === 'dshCntAvisos') v = v + (v === '1' ? ' celular' : ' celulares');
      d.textContent = v || '·';
      if (PENDIENTES[par[1]]) d.classList.toggle('hay', Number(v) > 0);
    });

    var algo = false;
    document.querySelectorAll('#panel .dsh-tarea').forEach(function (b) {
      var o = $(b.getAttribute('data-fuente'));
      var n = o ? Number((o.textContent || '0').trim()) || 0 : 0;
      var el = b.querySelector('.dsh-tarea__n');
      if (el) el.textContent = n;
      b.classList.toggle('ok', n === 0);
      if (n > 0) algo = true;
    });
    var al = $('dshAlDia');
    if (al) al.innerHTML = algo
      ? '<b style="color:var(--yellow)">Tienes cosas por revisar.</b> Toca una fila para abrirla.'
      : '<b>Todo al día.</b> Cuando algo llegue, se pinta amarillo.';

    /* Los números en cero se ven apagados. */
    ['statBiz', 'statOwners', 'statClientes', 'statGMV', 'statCanjes', 'statAhorro'].forEach(function (id) {
      var e = $(id); if (!e) return;
      var cero = /^\$?0$/.test((e.textContent || '').trim());
      e.parentNode.classList.toggle('es-cero', cero);
      var d = e.parentNode.querySelector('.d');
      if (d && !d.id) d.textContent = cero ? 'Aún sin canjes' : '';
    });
  }

  function observarContadores() {
    var obs = new MutationObserver(function () { clearTimeout(observarContadores.t); observarContadores.t = setTimeout(copiarContadores, 60); });
    ESPEJOS.concat([['statBiz'], ['statOwners'], ['statClientes'], ['statGMV'], ['statAhorro']]).forEach(function (par) {
      var o = $(par[0]); if (o) obs.observe(o, { childList: true, characterData: true, subtree: true });
    });
  }

  /* "Por hacer": tocar una fila abre su sección y baja hasta ella. */
  function conectarTareas() {
    document.querySelectorAll('#panel .dsh-tarea').forEach(function (b) {
      b.addEventListener('click', function () {
        var det = $(b.getAttribute('data-abrir'));
        if (!det) return;
        det.open = true;
        det.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ---------- Carga ---------- */
  function cargar() {
    var c = sb(); if (!c) return;
    fecha();
    Promise.all([
      c.from('socios').select('created_at,verificacion'),
      c.from('negocios').select('created_at'),
      c.rpc('admin_fundadores'),
      c.rpc('admin_origen_resumen')
    ]).then(function (r) {
      if (!r[0].error) dibujarSocios(r[0].data || [], (!r[1].error && r[1].data) || []);
      if (!r[2].error) dibujarFundadores(r[2].data || []);
      if (!r[3].error) dibujarOrigen(r[3].data || []);
      else { var tb = $('dshOrigen'); if (tb) tb.innerHTML = '<tr><td colspan="5" class="dsh-vacio">No se pudo cargar el origen.</td></tr>'; }
      copiarContadores();
    }).catch(function (e) { console.error('[dashboard]', e); });
  }

  /* Se enciende cuando app.js muestra el panel (al entrar o con la sesión viva). */
  function vigilarPanel() {
    var panel = $('adminPanel'), sec = $('panel');
    if (!panel || !sec) return;
    function revisar() {
      var visible = panel.style.display === 'block';
      sec.classList.toggle('dsh-on', visible);
      if (visible && !cargado) { cargado = true; cargar(); }
      if (!visible) cargado = false;
    }
    new MutationObserver(revisar).observe(panel, { attributes: true, attributeFilter: ['style'] });
    revisar();
  }

  function iniciar() { conectarTareas(); observarContadores(); vigilarPanel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.mmcDash = { cargar: cargar };
})();
