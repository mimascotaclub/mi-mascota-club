/* ============================================================
   Mi Mascota Club — "trabajador" de la app (service worker)
   Hace que el sitio se pueda INSTALAR como app en el celular
   y, desde el 17 de octubre, que lleguen los AVISOS (push).

   A propósito NO guarda copias del sitio: cada vez que se abre la
   app carga lo último de mimascotaclub.cl, así cada `git push` le
   llega a todos al tiro y nadie se queda con una versión vieja.

   Los avisos los manda /mi-panel a través de
   netlify/functions/enviar-aviso.js. Llegan cifrados y acá se
   muestran con el logo del club.
   ============================================================ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

/* Llega un aviso → se muestra */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { mensaje: e.data ? e.data.text() : '' }; }
  const titulo = d.titulo || 'Mi Mascota Club';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.mensaje || '',
    icon: '/assets/app/icon-192.png',
    /* Android pinta este ícono chico en la barra de arriba usando SOLO la
       transparencia: tiene que ser blanco sobre fondo transparente. Con el
       ícono a color se veía un cuadro blanco. */
    badge: '/assets/app/badge-96.png',
    tag: d.tag || 'mmc',
    data: { url: d.url || '/mi-mascota' }
  }));
});

/* Tocan el aviso → abre la página que corresponde */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || '/mi-mascota', self.location.origin).href;
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of ventanas) {
      if (v.url.startsWith(self.location.origin) && 'focus' in v) {
        try { await v.navigate(destino); } catch (_) {}
        return v.focus();
      }
    }
    return self.clients.openWindow(destino);
  })());
});
