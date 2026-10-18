/* ============================================================
   Mi Mascota Club — avisos al celular (notificaciones push)
   17 de octubre de 2026

   DOS PARTES
   1) En Mi Mascota: el botón "Activar avisos en este celular".
      - Android: funciona en Chrome, instalada o no.
      - iPhone: solo con la app INSTALADA (iOS 16.4 o más nuevo).
        Si está en Safari normal, el botón explica eso y abre la guía
        de instalación de js/instalar-app.js.
      - El permiso se pide SOLO al tocar el botón (si se pide solo,
        el iPhone lo bloquea y la gente dice que no).
   2) En /mi-panel: la tarjeta "Avisos al celular" para que Jaime
      escriba y envíe avisos (primero de prueba a su correo).

   La llave pública de abajo NO es secreta (va en todos los
   celulares). La privada vive solo en Netlify (VAPID_PRIVATE_KEY).
   Requiere supabase-avisos-push-v35.sql y
   netlify/functions/enviar-aviso.js.
   ============================================================ */
(function () {
  var SB_URL = 'https://mzsqyjxqnomsbqzhygkx.supabase.co';
  var SB_KEY = 'sb_publishable_KdIYZfFtnfO2e7VaMMfWAA_GBT79hZ1';
  var VAPID_PUBLICA = 'BBEsX39wSeor7FnATLOM_K3S37_tAEHqsECNlxf9qRYAoOElQgB9a6YQ7RZ77cZNH8-iHhkG9sMyJ-Zqg0lk7K4';

  var ua = navigator.userAgent || '';
  var esIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var esApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  function $(id) { return document.getElementById(id); }
  function token() { try { return localStorage.getItem('mmc_sesion_socio') || ''; } catch (e) { return ''; } }
  function llaveBytes(b64) {
    var s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function rpc(nombre, cuerpo) {
    return fetch(SB_URL + '/rest/v1/rpc/' + nombre, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.message || 'Error ' + r.status); });
      return r.json();
    });
  }
  function guardarEnBase(sub) {
    var j = sub.toJSON();
    return rpc('socio_push_suscribir', {
      p_token: token(), p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
      p_agente: (esIOS ? 'iPhone' : /Android/i.test(ua) ? 'Android' : 'Computador') + (esApp ? ' · app' : ' · navegador')
    });
  }
  function suscripcionActual() {
    if (!soporta) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); });
  }

  /* ------------------------- 1) Mi Mascota ------------------------- */
  var ocupado = false;
  function pintar(estado, texto) {
    var btn = $('socAvisosBtn'), nota = $('socAvisosNota');
    if (!btn) return;
    btn.style.display = '';
    btn.disabled = ocupado;
    var t = {
      instalar: '🔔 Activar avisos',
      apagado: '🔔 Activar avisos en este celular',
      activo: 'Desactivar avisos',
      bloqueado: '🔔 Avisos bloqueados',
      cargando: 'Un momento…'
    };
    btn.textContent = t[estado] || t.apagado;
    btn.dataset.estado = estado;
    if (nota) {
      nota.style.display = texto ? '' : 'none';
      nota.innerHTML = texto || '';
    }
  }

  function revisar() {
    if (!$('socAvisosBtn')) return;
    if (!soporta) {
      if (esIOS && !esApp) {
        pintar('instalar', 'En iPhone los avisos llegan solo con la app instalada. Toca el botón y te mostramos cómo.');
      } else {
        $('socAvisosBtn').style.display = 'none';
        if ($('socAvisosNota')) $('socAvisosNota').style.display = 'none';
      }
      return;
    }
    if (Notification.permission === 'denied') {
      pintar('bloqueado', 'Los avisos están bloqueados para Mi Mascota Club. Actívalos en los ajustes de notificaciones de tu celular y vuelve a tocar el botón.');
      return;
    }
    suscripcionActual().then(function (sub) {
      if (sub && Notification.permission === 'granted') {
        pintar('activo', '✓ Los avisos están activados en este celular.');
        /* Se vuelve a guardar en cada visita: si cambió la sesión o el
           celular renovó su dirección, la base queda al día. */
        if (token()) guardarEnBase(sub).catch(function () {});
      } else {
        pintar('apagado', 'Te avisamos cuando lleguen negocios y beneficios nuevos. Nada de spam.');
      }
    }).catch(function () { pintar('apagado', ''); });
  }

  function activar() {
    if (!token()) { pintar('apagado', 'Entra a Mi Mascota con tu correo para activar los avisos.'); return; }
    ocupado = true; pintar('cargando', '');
    Notification.requestPermission().then(function (permiso) {
      if (permiso !== 'granted') throw new Error('sin-permiso');
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return reg.pushManager.getSubscription().then(function (s) {
        return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveBytes(VAPID_PUBLICA) });
      });
    }).then(guardarEnBase).then(function () {
      ocupado = false;
      pintar('activo', '✓ ¡Listo! Los avisos están activados en este celular.');
    }).catch(function (e) {
      ocupado = false;
      if (e && e.message === 'sin-permiso') {
        revisar();
      } else {
        pintar('apagado', 'No pudimos activar los avisos. Inténtalo de nuevo en un rato.');
      }
    });
  }

  function desactivar() {
    ocupado = true; pintar('cargando', '');
    suscripcionActual().then(function (sub) {
      if (!sub) return;
      var endpoint = sub.endpoint;
      return sub.unsubscribe().then(function () {
        if (token()) return rpc('socio_push_quitar', { p_token: token(), p_endpoint: endpoint }).catch(function () {});
      });
    }).then(function () {
      ocupado = false;
      pintar('apagado', 'Avisos desactivados. Puedes volver a activarlos cuando quieras.');
    }).catch(function () { ocupado = false; revisar(); });
  }

  function alTocar() {
    var btn = $('socAvisosBtn');
    var estado = btn && btn.dataset.estado;
    if (estado === 'instalar') {
      var ins = document.querySelector('[data-instalar-app]');
      if (ins) ins.click();
      return;
    }
    if (estado === 'bloqueado') { revisar(); return; }
    if (estado === 'activo') { desactivar(); return; }
    activar();
  }

  /* ------------------------- 2) /mi-panel ------------------------- */
  function sesionAdmin() {
    /* window.mmcSupabase es el cliente que crea js/app.js (con la sesión de /mi-panel). */
    var sb = window.mmcSupabase;
    if (!sb || !sb.auth) return Promise.resolve(null);
    return sb.auth.getSession().then(function (r) { return r.data && r.data.session; });
  }
  function resultado(txt, ok) {
    var box = $('avisoResultado');
    if (!box) return;
    box.className = 'fund-msg ' + (ok ? 'ok' : 'mal');
    box.style.display = txt ? '' : 'none';
    box.textContent = txt || '';
  }
  var confirmarTodos = 0;

  window.mmcAvisosAdmin = {
    cargar: function () {
      var c = $('avisosCount');
      var sb = window.mmcSupabase;
      if (!c || !sb) return;
      sb.rpc('admin_push_resumen').then(function (r) {
        var d0 = $('avisosDetalle');
        if (r.error) { if (d0) d0.textContent = 'No pudimos leer cuántos celulares hay. Toca ↻ Actualizar.'; return; }
        var f = r.data && r.data[0];
        c.textContent = f ? f.celulares : '0';
        var d = $('avisosDetalle');
        if (d && f) d.textContent = f.celulares + (f.celulares == 1 ? ' celular' : ' celulares') + ' de ' + f.correos + (f.correos == 1 ? ' socio' : ' socios') + ' con avisos activados.';
      });
    },
    enviar: function (todos) {
      var titulo = ($('avisoTitulo').value || '').trim();
      var mensaje = ($('avisoMensaje').value || '').trim();
      var url = $('avisoUrl').value;
      var email = ($('avisoEmail').value || '').trim();
      if (!titulo) { resultado('Escribe un título corto para el aviso.', false); return; }
      if (!mensaje) { resultado('Escribe el mensaje del aviso.', false); return; }
      if (!todos && !email) { resultado('Escribe tu correo de socio para la prueba.', false); return; }
      if (todos) {
        var btnT = $('avisoTodosBtn');
        if (Date.now() - confirmarTodos > 5000) {
          confirmarTodos = Date.now();
          btnT.textContent = '¿Seguro? Toca otra vez';
          setTimeout(function () { btnT.textContent = 'Enviar a todos'; }, 5000);
          return;
        }
        confirmarTodos = 0; btnT.textContent = 'Enviar a todos';
      }
      resultado('Enviando…', true);
      sesionAdmin().then(function (s) {
        if (!s) throw new Error('Tu sesión de /mi-panel venció. Vuelve a entrar.');
        return fetch('/.netlify/functions/enviar-aviso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token },
          body: JSON.stringify(todos ? { titulo: titulo, mensaje: mensaje, url: url, todos: true }
                                     : { titulo: titulo, mensaje: mensaje, url: url, email: email })
        });
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.mensaje || 'No se pudo enviar.');
        if (j.mensaje && !j.enviados) { resultado(j.mensaje, false); return; }
        resultado('Enviado a ' + j.enviados + (j.enviados === 1 ? ' celular' : ' celulares') +
          (j.fallidos ? ' · ' + j.fallidos + ' no llegaron' : '') +
          (j.borrados ? ' (' + j.borrados + ' ya no existían y se borraron)' : '') + '.', true);
        window.mmcAvisosAdmin.cargar();
      }).catch(function (e) { resultado(e.message, false); });
    }
  };

  function iniciar() {
    var btn = $('socAvisosBtn');
    if (btn) { btn.addEventListener('click', alTocar); revisar(); }
    /* /mi-panel: app.js puede abrir el panel antes de que este archivo cargue,
       así que el número se pide también acá si ya hay sesión de Jaime. */
    if ($('avisosCount')) {
      sesionAdmin().then(function (s) { if (s) window.mmcAvisosAdmin.cargar(); }).catch(function () {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
