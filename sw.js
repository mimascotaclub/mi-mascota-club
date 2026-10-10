/* ============================================================
   Mi Mascota Club — "trabajador" de la app (service worker)
   Hace que el sitio se pueda INSTALAR como app en el celular.

   A propósito NO guarda copias del sitio: cada vez que se abre la
   app carga lo último de mimascotaclub.cl, así cada `git push` le
   llega a todos al tiro y nadie se queda con una versión vieja.
   (Las notificaciones push se suman acá más adelante.)
   ============================================================ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
