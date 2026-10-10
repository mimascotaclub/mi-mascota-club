/* ============================================================
   Mi Mascota Club — instalar como app (11 de octubre de 2026)
   - Registra sw.js (lo que permite instalar).
   - Android/Chrome: guarda el aviso de instalación del navegador
     y lo dispara con el botón "Instalar la app".
   - iPhone: Safari no tiene botón; se muestran los 3 pasos.
   - Si ya se abrió como app, el botón no aparece.
   Uso: cualquier elemento con  data-instalar-app  se vuelve el botón.
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
  var esSafari = esIOS && !/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV/i.test(ua);

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    avisoAndroid = e;
    mostrar();
  });
  window.addEventListener('appinstalled', function () {
    avisoAndroid = null;
    yaEsApp = true;
    mostrar();
  });

  function puedeInstalar() { return !yaEsApp && (avisoAndroid || esIOS); }

  function mostrar() {
    document.querySelectorAll('[data-instalar-app]').forEach(function (el) {
      el.style.display = puedeInstalar() ? '' : 'none';
    });
  }

  function pasosIPhone() {
    var html = esSafari
      ? '<div style="font-weight:900;font-size:20px;line-height:1.2;">Instala Mi Mascota Club</div>' +
        '<ol style="margin:14px 0 0;padding-left:20px;font-size:15px;line-height:1.7;">' +
        '<li>Toca el botón <b>Compartir</b> <span style="font-size:18px;">⬆️</span> abajo en Safari.</li>' +
        '<li>Elige <b>«Agregar a pantalla de inicio»</b>.</li>' +
        '<li>Toca <b>Agregar</b>. ¡Listo! El ícono del club queda junto a tus apps.</li></ol>'
      : '<div style="font-weight:900;font-size:20px;line-height:1.2;">Ábrelo en Safari</div>' +
        '<p style="margin:12px 0 0;font-size:15px;line-height:1.6;">En iPhone la app se instala desde <b>Safari</b>. ' +
        'Copia <b>mimascotaclub.cl</b>, ábrelo en Safari y toca <b>Compartir → Agregar a pantalla de inicio</b>.</p>';
    html += '<button type="button" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:18px;" onclick="closeModal()">Entendido</button>';
    if (typeof openModal === 'function') openModal(html); else alert('Toca Compartir y luego «Agregar a pantalla de inicio».');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-instalar-app]');
    if (!btn) return;
    e.preventDefault();
    if (avisoAndroid) {
      avisoAndroid.prompt();
      avisoAndroid.userChoice.finally(function () { avisoAndroid = null; mostrar(); });
    } else if (esIOS) {
      pasosIPhone();
    }
  });

  document.addEventListener('DOMContentLoaded', mostrar);
  mostrar();
})();
