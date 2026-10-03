// netlify/functions/enviar-codigo.js
// ------------------------------------------------------------
// Genera un código de 6 dígitos, lo guarda en Supabase (usando
// la Service Role Key, que nunca se expone al navegador) y lo
// envía por correo vía EmailJS. Esta función corre en el
// servidor de Netlify, no en el navegador de quien se registra.
//
// Recibe UNA de estas cosas:
//
//   { email: "persona@correo.cl" }                → registro de dueños.
//     Se manda a cualquier correo: es alguien que se está inscribiendo.
//
//   { email: "persona@correo.cl", acceso: true }  → entrar a Mi Mascota ID
//     o activar el pase de fundador. Solo se manda si el correo está
//     inscrito, PERO la respuesta es la misma en los dos casos. Así
//     nadie puede usar esta función para averiguar quién es socio.
//
//   { negocio: "NEG0001" }                        → acceso de negocios.
//     Aquí el correo NO viene del navegador: se busca en la
//     tabla `negocios` con la Service Role Key. Es a propósito.
//     El correo del negocio es público (sale en el directorio),
//     así que si el navegador pudiera elegir a dónde mandar el
//     código, cualquiera pediría el código de NEG0001 a su
//     propia bandeja y entraría al panel de otro. Resolviéndolo
//     en el servidor, el código solo puede llegar a la bandeja
//     que el negocio registró.
//
// LÍMITES (desde el 3 de octubre, parche v30 · otp_registrar):
//   5 códigos por correo cada 15 min, 10 por conexión cada hora y
//   40 por hora en todo el sitio. Sin esto, un programa podía gastar
//   en un minuto los 200 correos al mes de EmailJS y dejar a todo el
//   club sin poder registrarse ni entrar.
//   La conexión (IP) nunca se guarda tal cual: se guarda cifrada.
// ------------------------------------------------------------

import { createHash } from 'crypto';

const MENSAJE_ACCESO = 'Si ese correo está inscrito, te llegará un código en un minuto.';

const MENSAJES_LIMITE = {
  limite_correo: 'Ya pediste varios códigos seguidos. Espera 15 minutos y vuelve a intentarlo.',
  limite_ip: 'Hubo demasiados pedidos desde esta conexión. Espera un rato y vuelve a intentarlo.',
  limite_total: 'Estamos recibiendo muchas solicitudes en este momento. Inténtalo de nuevo en unos minutos.',
  email_invalido: 'Correo inválido.',
};

function ipCifrada(event) {
  const h = event.headers || {};
  const ip = h['x-nf-client-connection-ip']
          || String(h['x-forwarded-for'] || '').split(',')[0].trim();
  if (!ip) return null;
  const sal = process.env.OTP_SALT || 'mi-mascota-club';
  return createHash('sha256').update(sal + '|' + ip).digest('hex');
}

function responder(statusCode, cuerpo) {
  return { statusCode, body: JSON.stringify(cuerpo) };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return responder(405, { ok: false, mensaje: 'Método no permitido.' });
  }

  const SB = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cabecerasSupabase = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const cuerpo = JSON.parse(event.body || '{}');
    let emailLimpio = '';
    let paraQuien = '';
    let soloSocios = false;

    if (cuerpo.negocio) {
      // ---- Acceso de negocio: el correo se resuelve aquí, no allá ----
      const codigo = String(cuerpo.negocio).trim().toUpperCase();
      if (!/^NEG\d{3,6}$/.test(codigo)) {
        return responder(400, { ok: false, mensaje: 'Ese código de negocio no tiene el formato correcto.' });
      }

      const res = await fetch(
        `${SB}/rest/v1/negocios?select=nombre,email&codigo=eq.${encodeURIComponent(codigo)}`,
        { headers: cabecerasSupabase }
      );
      if (!res.ok) {
        return responder(500, { ok: false, mensaje: 'No pudimos verificar el negocio.' });
      }
      const filas = await res.json();
      if (!filas.length) {
        return responder(404, { ok: false, mensaje: 'No encontramos ese código de negocio.' });
      }
      if (!filas[0].email) {
        return responder(409, {
          ok: false,
          mensaje: 'Tu negocio no tiene un correo registrado, así que no podemos enviarte el código. Escríbenos para cargarlo.',
        });
      }
      emailLimpio = String(filas[0].email).toLowerCase().trim();
      paraQuien = filas[0].nombre || codigo;

    } else {
      // ---- Dueños: registro (cualquier correo) o acceso (solo inscritos) ----
      const { email } = cuerpo;
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        return responder(400, { ok: false, mensaje: 'Correo inválido.' });
      }
      emailLimpio = String(email).toLowerCase().trim();
      soloSocios = cuerpo.acceso === true;
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    // ---- 1) Guardar el código revisando los límites (todo en la base) ----
    const resReg = await fetch(`${SB}/rest/v1/rpc/otp_registrar`, {
      method: 'POST',
      headers: cabecerasSupabase,
      body: JSON.stringify({
        p_email: emailLimpio,
        p_codigo: codigo,
        p_ip_hash: ipCifrada(event),
        p_solo_socios: soloSocios,
      }),
    });

    if (!resReg.ok) {
      return responder(500, { ok: false, mensaje: 'No se pudo generar el código.' });
    }
    const reg = await resReg.json();

    if (!reg || !reg.ok) {
      const motivo = (reg && reg.motivo) || '';
      return responder(429, {
        ok: false,
        motivo,
        mensaje: MENSAJES_LIMITE[motivo] || 'No pudimos enviar el código. Inténtalo de nuevo en un momento.',
      });
    }

    // Acceso con un correo que no está inscrito: no se manda nada, pero
    // se responde EXACTAMENTE igual que cuando sí se manda.
    if (!reg.enviar) {
      return responder(200, { ok: true, mensaje: MENSAJE_ACCESO });
    }

    // ---- 2) Enviar el correo vía EmailJS (API REST, desde el servidor) ----
    const resEmail = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID_OTP,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: { to_email: emailLimpio, codigo },
      }),
    });

    if (!resEmail.ok) {
      return responder(500, { ok: false, mensaje: 'No se pudo enviar el correo.' });
    }

    if (soloSocios) {
      return responder(200, { ok: true, mensaje: MENSAJE_ACCESO });
    }

    // Se devuelve el correo TAPADO para que el negocio sepa a qué bandeja mirar
    // sin que la respuesta sirva para descubrir correos ajenos.
    const tapado = emailLimpio.replace(/^(.)(.*)(.@)/, (m, a, medio, c) => a + '•'.repeat(Math.max(medio.length, 1)) + c);

    return responder(200, { ok: true, mensaje: 'Código enviado.', correo_tapado: tapado, nombre: paraQuien });
  } catch (e) {
    return responder(500, { ok: false, mensaje: 'Error interno.' });
  }
}
