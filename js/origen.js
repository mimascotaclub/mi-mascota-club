/* ============================================================
   Mi Mascota Club — ¿de dónde llegó cada persona? (17 oct 2026)

   Cada pieza impresa o digital lleva su propio código en el QR o
   en el enlace:  mimascotaclub.cl/?ref=folleto2
   Este archivo:
   1) Lee ese ?ref= y lo recuerda 30 días en el celular
      (si alguien escanea hoy y se inscribe el sábado, igual cuenta).
   2) Anota UNA visita por sesión en Supabase (registrar_visita_origen).
   3) Cuando la persona se inscribe, marca de dónde vino
      (marcar_origen_socio). Eso lo llaman los formularios.

   No guarda nada personal: solo el código de la pieza y la página.
   No depende de supabase-js: habla directo con la API, así funciona
   igual en todas las páginas.
   Requiere supabase-origen-v34.sql (ya aplicado).
   ============================================================ */
(function () {
  var SB_URL = 'https://mzsqyjxqnomsbqzhygkx.supabase.co';
  var SB_KEY = 'sb_publishable_KdIYZfFtnfO2e7VaMMfWAA_GBT79hZ1';
  var CLAVE = 'mmc_origen';
  var DIAS = 30;

  function limpiar(r) {
    return String(r || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 30);
  }
  function leer() {
    try {
      var o = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (o && o.ref && Date.now() - o.t < DIAS * 864e5) return o.ref;
    } catch (e) {}
    return '';
  }
  function rpc(nombre, cuerpo) {
    return fetch(SB_URL + '/rest/v1/rpc/' + nombre, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      keepalive: true
    }).catch(function () {});
  }

  var refUrl = limpiar(new URLSearchParams(location.search).get('ref'));
  if (refUrl) {
    try { localStorage.setItem(CLAVE, JSON.stringify({ ref: refUrl, t: Date.now() })); } catch (e) {}
    /* Una visita por sesión y por código: recargar la página no suma de nuevo. */
    var marca = 'mmc_origen_visto_' + refUrl;
    var visto = false;
    try { visto = sessionStorage.getItem(marca) === '1'; sessionStorage.setItem(marca, '1'); } catch (e) {}
    if (!visto) rpc('registrar_visita_origen', { p_ref: refUrl, p_ruta: location.pathname.slice(0, 60) });
  }

  /* El código con el que llegó esta persona ('' si llegó sola). */
  window.mmcOrigen = function () { return refUrl || leer(); };

  /* Lo llaman los formularios justo después de crear al socio. */
  window.mmcMarcarOrigenSocio = function (codigo) {
    var ref = window.mmcOrigen();
    if (!ref || !codigo) return;
    rpc('marcar_origen_socio', { p_codigo: String(codigo), p_ref: ref });
  };
})();
