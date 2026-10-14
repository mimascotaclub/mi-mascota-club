/* =========================================================
   BIENVENIDA (onboarding) — Mi Mascota Club
   - Una sola vez por dispositivo (localStorage "mmc_bienvenida_v1").
   - Solo en el inicio ("/") y solo si NO hay sesión de socio.
   - Sin "Saltar" ni "Explorar primero" (decisión de Jaime, 13 oct): se avanza
     solo con Siguiente y la última lámina lleva al registro.
   - Para verla de nuevo: mimascotaclub.cl/?bienvenida=1
   No toca datos: es solo una pantalla de presentación.
   ========================================================= */
(function () {
  var CLAVE = 'mmc_bienvenida_v1';
  var params = new URLSearchParams(location.search);
  var forzar = params.get('bienvenida') === '1';

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  if (!forzar) {
    var ruta = location.pathname.replace(/\/index\.html$/, '/');
    if (ruta !== '/') return;
    if (leer(CLAVE)) return;
    if (leer('mmc_sesion_socio')) return;
  }

  var LAMINAS = [
    {
      ilus: '<img class="mmcb-i1" src="/assets/bienvenida/mascota.webp" alt="">',
      titulo: 'Bienvenido a Mi&nbsp;Mascota&nbsp;Club',
      texto: 'El club para quienes quieren a su mascota como familia, aquí en Santiago.'
    },
    {
      ilus:
        '<div class="mmcb-carnet" aria-hidden="true">' +
          '<div class="mmcb-carnet__top"><img src="/assets/logo.svg" alt=""><span>SOCIO</span></div>' +
          '<div class="mmcb-carnet__mid"><img src="/assets/bienvenida/max.jpg" alt=""><div><b>Max</b><small>Mestizo</small></div></div>' +
          '<div class="mmcb-carnet__qr"><img src="/assets/bienvenida/qr.svg" alt="">' +
            '<div><span class="num">N° 121026</span>Comuna <b>Santiago</b><br>Estado <b class="ok">Verificado</b></div></div>' +
        '</div>',
      titulo: 'Tu mascota, con su propio carnet',
      texto: 'Regístrala gratis y lleva su carnet digital siempre a mano en tu celular.'
    },
    {
      ilus:
        '<div class="mmcb-i3" aria-hidden="true">' +
          '<img class="casa" src="/assets/bienvenida/icono.png" alt="">' +
          '<span class="chip c1">Veterinarias <em>Pronto</em></span>' +
          '<span class="chip c2">Peluquerías <em>Pronto</em></span>' +
          '<span class="chip c3">Paseadores <em>Pronto</em></span>' +
          '<span class="chip c4">Tiendas <em>Pronto</em></span>' +
        '</div>',
      titulo: 'Recién estamos comenzando',
      texto: 'Pronto llegan negocios con beneficios. ¿Conoces uno bueno? <b>Recomiéndalo</b>.'
    },
    {
      ilus:
        '<div class="mmcb-i4" aria-hidden="true"><img src="/assets/bienvenida/icono.png" alt=""><span>Es gratis</span></div>',
      titulo: 'Sé uno de los primeros socios',
      texto: 'Registra a tu mascota en solo un minuto y recibe su carnet al instante.'
    }
  ];

  function montar() {
    var total = LAMINAS.length;
    var el = document.createElement('div');
    el.className = 'mmcb';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Bienvenida a Mi Mascota Club');
    el.dataset.paso = '1';

    el.innerHTML =
      '<div class="mmcb__card">' +
        '<div class="mmcb__bg"><i></i><i></i></div>' +
        '<div class="mmcb__top"><img class="mmcb__logo" src="/assets/logo.svg" alt="Mi Mascota Club"></div>' +
        '<div class="mmcb__pista">' +
          LAMINAS.map(function (l, i) {
            return '<div class="mmcb__lamina" aria-label="' + (i + 1) + ' de ' + total + '">' +
              '<div class="mmcb__ilus">' + l.ilus + '</div>' +
              '<h2 class="mmcb__titulo">' + l.titulo + '</h2>' +
              '<p class="mmcb__texto">' + l.texto + '</p></div>';
          }).join('') +
        '</div>' +
        '<div class="mmcb__pie">' +
          '<div class="mmcb__puntos">' +
            LAMINAS.map(function (_, i) { return '<button type="button" aria-label="Ir a la lámina ' + (i + 1) + '" data-i="' + i + '"></button>'; }).join('') +
          '</div>' +
          '<button type="button" class="mmcb__btn">Siguiente</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(el);
    var overflowAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    var pista = el.querySelector('.mmcb__pista');
    var puntos = el.querySelectorAll('.mmcb__puntos button');
    var btn = el.querySelector('.mmcb__btn');
    var actual = 0;

    function pintar(i) {
      actual = i;
      el.dataset.paso = String(i + 1);
      puntos.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
      var ultima = i === total - 1;
      btn.textContent = ultima ? 'Registrar a mi mascota' : 'Siguiente';
      btn.classList.toggle('mmcb__btn--si', ultima);
    }
    function ir(i, suave) {
      pista.scrollTo({ left: i * pista.clientWidth, behavior: suave === false ? 'auto' : 'smooth' });
      pintar(i);
    }
    function cerrar(destino) {
      guardar(CLAVE, '1');
      el.classList.add('is-off');
      document.body.style.overflow = overflowAntes;
      document.removeEventListener('keydown', teclas);
      setTimeout(function () { el.remove(); if (destino) location.href = destino; }, 300);
    }
    function teclas(e) {
      if (e.key === 'ArrowRight' && actual < total - 1) ir(actual + 1);
      if (e.key === 'ArrowLeft' && actual > 0) ir(actual - 1);
    }

    var t;
    pista.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var i = Math.round(pista.scrollLeft / pista.clientWidth);
        if (i !== actual) pintar(i);
      }, 60);
    }, { passive: true });

    puntos.forEach(function (p) { p.addEventListener('click', function () { ir(+p.dataset.i); }); });
    btn.addEventListener('click', function () {
      if (actual < total - 1) ir(actual + 1); else cerrar('/registro');
    });
    el.querySelectorAll('[data-mmcb-salir]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        var href = b.getAttribute('href');
        if (href) { e.preventDefault(); cerrar(href); } else { cerrar(); }
      });
    });
    document.addEventListener('keydown', teclas);

    var inicio = Math.min(Math.max((parseInt(params.get('paso'), 10) || 1) - 1, 0), total - 1);
    pintar(inicio);
    requestAnimationFrame(function () {
      if (inicio) ir(inicio, false);
      el.classList.add('is-on');
      el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
