/* ============================================================
   Mi Mascota Club — instalar como app (11 de octubre de 2026)
   - Registra sw.js (lo que permite instalar).
   - Android / Chrome de computador: un toque y queda instalada
     (usa el aviso de instalación del navegador).
   - iPhone: Apple NO deja instalar con un botón. Por eso se abre una
     guía visual con los pasos EXACTOS según el navegador que usa
     (Safari, Chrome o el navegador de Instagram/Facebook/WhatsApp),
     con una flecha que apunta a dónde está el botón.
   - Si ya se abrió como app, el botón no aparece.
   Uso: cualquier elemento con  data-instalar-app  se vuelve el botón.
   No depende de js/app.js (tiene su propia ventana).
   ============================================================ */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  var avisoAndroid = null;
  var yaEsApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var ua = navigator.userAgent || '';
  var esIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var enApp = /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\//i.test(ua);       // navegador dentro de otra app
  var enChromeIOS = esIOS && /CriOS/i.test(ua);
  var enOtroIOS = esIOS && /FxiOS|EdgiOS|OPiOS/i.test(ua);

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    avisoAndroid = e;
    mostrar();
  });
  window.addEventListener('appinstalled', function () {
    avisoAndroid = null; yaEsApp = true; cerrar(); mostrar();
  });

  function puedeInstalar() { return !yaEsApp && (avisoAndroid || esIOS || enApp); }
  function mostrar() {
    document.querySelectorAll('[data-instalar-app]').forEach(function (el) {
      el.style.display = puedeInstalar() ? '' : 'none';
    });
  }

  /* ---------- Íconos dibujados igual que en el iPhone ---------- */
  var IC_COMPARTIR = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0A84FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var IC_MAS = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#151515" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var IC_PUNTOS = '<svg viewBox="0 0 24 24" width="22" height="22" fill="#151515"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

  function paso(n, icono, texto) {
    return '<div class="mmc-ins__paso"><span class="mmc-ins__n">' + n + '</span>' +
      (icono ? '<span class="mmc-ins__ic">' + icono + '</span>' : '') +
      '<span class="mmc-ins__tx">' + texto + '</span></div>';
  }

  function guia() {
    var titulo, pasos, flecha = '';
    if (enApp) {
      titulo = 'Primero ábrelo en tu navegador';
      pasos =
        paso(1, IC_PUNTOS, 'Toca los <b>tres puntos ···</b> arriba a la derecha.') +
        paso(2, '', 'Elige <b>«Abrir en navegador externo»</b> (o «Abrir en Safari»).') +
        paso(3, '', 'Ahí vuelve a tocar <b>«Instalar la app»</b> y sigue los pasos.');
      flecha = 'arriba';
    } else if (enChromeIOS || enOtroIOS) {
      titulo = 'Instálalo en 3 toques';
      pasos =
        paso(1, IC_COMPARTIR, 'Toca <b>Compartir</b>, el ícono de la flecha <b>arriba, junto a la dirección</b>.') +
        paso(2, IC_MAS, 'Baja y elige <b>«Agregar a pantalla de inicio»</b>. Si no lo ves, toca <b>«Ver más»</b>.') +
        paso(3, '', 'Toca <b>Agregar</b>. ¡Listo! Mi Mascota Club queda con tus otras apps.');
      flecha = 'arriba';
    } else if (esIOS) {
      titulo = 'Instálalo en 3 toques';
      pasos =
        paso(1, IC_COMPARTIR, 'Toca <b>Compartir</b> abajo en Safari. Si no lo ves, toca <b>···</b> y luego <b>Compartir</b>.') +
        paso(2, IC_MAS, 'Baja y elige <b>«Agregar a pantalla de inicio»</b>.') +
        paso(3, '', 'Toca <b>Agregar</b>. ¡Listo! Mi Mascota Club queda con tus otras apps.');
      flecha = 'abajo';
    } else {
      titulo = 'Instala la app';
      pasos = paso(1, IC_PUNTOS, 'Abre el menú del navegador y elige <b>«Instalar app»</b> o <b>«Agregar a pantalla de inicio»</b>.');
    }
    var html =
      '<div class="mmc-ins__fondo" data-cerrar></div>' +
      (flecha === 'arriba' ? '<div class="mmc-ins__flecha mmc-ins__flecha--arriba">↑</div>' : '') +
      (flecha === 'abajo' ? '<div class="mmc-ins__flecha mmc-ins__flecha--abajo">↓</div>' : '') +
      '<div class="mmc-ins__hoja" role="dialog" aria-label="' + titulo + '">' +
        '<img src="/assets/app/icon-192.png" alt="" class="mmc-ins__logo">' +
        '<div class="mmc-ins__t">' + titulo + '</div>' +
        '<p class="mmc-ins__sub">Tu carnet siempre a mano, con el ícono del club en tu pantalla.</p>' +
        pasos +
        '<button type="button" class="mmc-ins__ok" data-cerrar>Entendido</button>' +
      '</div>';
    var caja = document.createElement('div');
    caja.id = 'mmcInstalar';
    caja.innerHTML = html;
    document.body.appendChild(caja);
    caja.addEventListener('click', function (e) { if (e.target.closest('[data-cerrar]')) cerrar(); });
  }
  function cerrar() { var c = document.getElementById('mmcInstalar'); if (c) c.remove(); }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-instalar-app]');
    if (!btn) return;
    e.preventDefault();
    if (avisoAndroid && !enApp) {
      avisoAndroid.prompt();
      avisoAndroid.userChoice.finally(function () { avisoAndroid = null; mostrar(); });
    } else {
      guia();
    }
  });

  /* Estilos de la guía (van acá para no depender de otra hoja) */
  var css = document.createElement('style');
  css.textContent =
    '#mmcInstalar{position:fixed;inset:0;z-index:9999;font-family:Lato,-apple-system,sans-serif}' +
    '.mmc-ins__fondo{position:absolute;inset:0;background:rgba(21,21,21,.55)}' +
    '.mmc-ins__hoja{position:absolute;left:12px;right:12px;bottom:12px;max-width:460px;margin:0 auto;border-radius:30px;padding:24px 20px 18px;' +
      'background:linear-gradient(165deg,#FFF9E3 0%,#FFE58A 75%,#FFCE00 140%);box-shadow:0 20px 60px rgba(0,0,0,.25);animation:mmcInsSube .25s ease}' +
    '@keyframes mmcInsSube{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}' +
    '.mmc-ins__logo{width:64px;height:64px;border-radius:16px;display:block;margin:0 auto 10px;box-shadow:0 6px 16px rgba(0,0,0,.12)}' +
    '.mmc-ins__t{text-align:center;font-weight:900;font-size:22px;color:#151515;line-height:1.2}' +
    '.mmc-ins__sub{text-align:center;margin:6px 0 16px;font-size:14px;color:#3a4446;line-height:1.45}' +
    '.mmc-ins__paso{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.9);border-radius:18px;padding:12px 14px;margin-bottom:8px;font-size:15px;line-height:1.4;color:#151515}' +
    '.mmc-ins__n{flex:none;width:26px;height:26px;border-radius:50%;background:#151515;color:#FFCE00;font-weight:900;font-size:14px;display:grid;place-items:center}' +
    '.mmc-ins__ic{flex:none;width:38px;height:38px;border-radius:10px;background:#fff;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.08)}' +
    '.mmc-ins__ok{width:100%;margin-top:8px;border:0;border-radius:999px;background:#151515;color:#fff;font:900 16px Lato,sans-serif;padding:16px;cursor:pointer}' +
    '.mmc-ins__flecha{position:absolute;right:22px;font-size:46px;font-weight:900;color:#FFCE00;text-shadow:0 2px 10px rgba(0,0,0,.4);animation:mmcInsSalta 1s ease-in-out infinite}' +
    '.mmc-ins__flecha--arriba{top:6px}.mmc-ins__flecha--abajo{bottom:2px;left:0;right:0;text-align:center;display:none}' +
    '@keyframes mmcInsSalta{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}';
  document.head.appendChild(css);

  document.addEventListener('DOMContentLoaded', mostrar);
  mostrar();
})();
