// netlify/functions/enviar-aviso.js
// ------------------------------------------------------------
// Envía un aviso (notificación push) a los celulares de los socios
// que tocaron "Activar avisos" en Mi Mascota. Lo usa /mi-panel.
//
// SEGURIDAD
//   Solo Jaime puede enviar: la función recibe el token de su sesión
//   de /mi-panel, le pregunta a Supabase de quién es y revisa que esté
//   en la tabla admins. Las direcciones de los celulares se leen con la
//   Service Role Key, que nunca sale del servidor.
//
// SIN LIBRERÍAS
//   El repo no tiene package.json, así que el cifrado del aviso
//   (RFC 8291) y la firma (VAPID, RFC 8292) están hechos con el
//   módulo crypto que ya trae Node. Funciona igual en iPhone y Android.
//
// VARIABLES DE ENTORNO
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (ya existen)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY       (nuevas: el par de llaves de avisos)
//   VAPID_SUBJECT  → opcional, por defecto mailto:holamimascotaclub@gmail.com
//
// CUERPO (POST, JSON)
//   { titulo, mensaje, url, email }  → email = solo a ese socio (prueba)
//   { titulo, mensaje, url, todos: true }  → a todos
// ------------------------------------------------------------
import crypto from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/* ---------- Cifrado del contenido (aes128gcm, RFC 8291) ---------- */
export function cifrar(payload, p256dh, authSecret) {
  const uaPublic = deB64u(p256dh);        // llave pública del celular (65 bytes)
  const auth = deB64u(authSecret);        // secreto del celular (16 bytes)
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();   // llave de un solo uso del servidor
  const compartido = ecdh.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);

  const infoClave = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', compartido, auth, infoClave, 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));

  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const texto = Buffer.concat([Buffer.from(payload), Buffer.from([2])]); // 2 = último bloque
  const cifrado = Buffer.concat([c.update(texto), c.final(), c.getAuthTag()]);

  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, cifrado]);
}

/* ---------- Firma del servidor (VAPID, RFC 8292) ---------- */
export function firmaVapid(endpoint, publica, privada, sujeto) {
  const pub = deB64u(publica);
  const llave = crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: privada, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: 'jwk',
  });
  const cabecera = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const datos = b64u(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: sujeto,
  }));
  const firma = crypto.sign('sha256', Buffer.from(cabecera + '.' + datos), { key: llave, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${cabecera}.${datos}.${b64u(firma)}, k=${publica}`;
}

async function enviarUno(sub, contenido, env) {
  const cuerpo = cifrar(contenido, sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: firmaVapid(sub.endpoint, env.pub, env.priv, env.sujeto),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body: cuerpo,
  });
  return res.status;
}

const responder = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

export async function handler(event) {
  if (event.httpMethod !== 'POST') return responder(405, { ok: false, mensaje: 'Método no permitido.' });

  const SB = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const env = {
    pub: process.env.VAPID_PUBLIC_KEY,
    priv: process.env.VAPID_PRIVATE_KEY,
    sujeto: process.env.VAPID_SUBJECT || 'mailto:holamimascotaclub@gmail.com',
  };
  if (!env.pub || !env.priv) return responder(500, { ok: false, mensaje: 'Faltan las llaves de avisos (VAPID) en Netlify.' });
  const cab = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

  try {
    // ---- 1) ¿Es Jaime? ----
    const tokenAdmin = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
    if (!tokenAdmin) return responder(401, { ok: false, mensaje: 'Falta la sesión de /mi-panel.' });
    const resUser = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${tokenAdmin}` } });
    if (!resUser.ok) return responder(401, { ok: false, mensaje: 'Sesión vencida: vuelve a entrar a /mi-panel.' });
    const user = await resUser.json();
    const resAdm = await fetch(`${SB}/rest/v1/admins?select=user_id&user_id=eq.${encodeURIComponent(user.id)}`, { headers: cab });
    const adm = resAdm.ok ? await resAdm.json() : [];
    if (!adm.length) return responder(403, { ok: false, mensaje: 'No autorizado.' });

    // ---- 2) Qué se envía ----
    const b = JSON.parse(event.body || '{}');
    const titulo = String(b.titulo || 'Mi Mascota Club').slice(0, 60);
    const mensaje = String(b.mensaje || '').slice(0, 180);
    let url = String(b.url || '/mi-mascota');
    if (!url.startsWith('/')) url = '/mi-mascota';           // solo páginas del club
    if (!mensaje) return responder(400, { ok: false, mensaje: 'Escribe el mensaje del aviso.' });
    const email = String(b.email || '').trim().toLowerCase();
    if (!email && b.todos !== true) return responder(400, { ok: false, mensaje: 'Elige un correo de prueba o "enviar a todos".' });

    // ---- 3) A qué celulares ----
    const filtro = email ? `&email=eq.${encodeURIComponent(email)}` : '';
    const resSubs = await fetch(`${SB}/rest/v1/push_suscripciones?select=id,endpoint,p256dh,auth${filtro}`, { headers: cab });
    if (!resSubs.ok) return responder(500, { ok: false, mensaje: 'No pudimos leer los celulares.', detalle: await resSubs.text() });
    const subs = await resSubs.json();
    if (!subs.length) {
      return responder(200, { ok: true, enviados: 0, fallidos: 0, borrados: 0,
        mensaje: email ? 'Ese correo no tiene avisos activados en ningún celular.' : 'Todavía nadie activó los avisos.' });
    }

    // ---- 4) Enviar (de a 20 a la vez) ----
    const contenido = JSON.stringify({ titulo, mensaje, url, tag: 'mmc-' + Date.now() });
    let enviados = 0, fallidos = 0;
    const vencidos = [], okIds = [];
    for (let i = 0; i < subs.length; i += 20) {
      const lote = subs.slice(i, i + 20);
      const res = await Promise.all(lote.map((s) => enviarUno(s, contenido, env).catch(() => 0)));
      res.forEach((st, k) => {
        if (st >= 200 && st < 300) { enviados++; okIds.push(lote[k].id); }
        else { fallidos++; if (st === 404 || st === 410) vencidos.push(lote[k].id); }
      });
    }

    // ---- 5) Ordenar la tabla: borrar celulares que ya no existen ----
    if (vencidos.length) {
      await fetch(`${SB}/rest/v1/push_suscripciones?id=in.(${vencidos.join(',')})`, { method: 'DELETE', headers: cab });
    }
    if (okIds.length) {
      await fetch(`${SB}/rest/v1/push_suscripciones?id=in.(${okIds.join(',')})`, {
        method: 'PATCH', headers: cab, body: JSON.stringify({ ultimo_envio: new Date().toISOString() }),
      });
    }

    return responder(200, { ok: true, enviados, fallidos, borrados: vencidos.length });
  } catch (e) {
    return responder(500, { ok: false, mensaje: 'Error interno.', detalle: e.message });
  }
}
