// netlify/functions/enviar-codigo.js
// ------------------------------------------------------------
// Genera un código de 6 dígitos, lo guarda en Supabase (usando
// la Service Role Key, que nunca se expone al navegador) y lo
// envía por correo vía EmailJS. Esta función corre en el
// servidor de Netlify, no en el navegador de quien se registra.
//
// Recibe UNA de estas dos cosas:
//
//   { email: "persona@correo.cl" }   → registro y acceso de dueños.
//     El correo lo escribe la persona, y quien intente entrar
//     necesita recibir el código en esa bandeja.
//
//   { negocio: "NEG0001" }           → acceso de negocios.
//     Aquí el correo NO viene del navegador: se busca en la
//     tabla `negocios` con la Service Role Key. Es a propósito.
//     El correo del negocio es público (sale en el directorio),
//     así que si el navegador pudiera elegir a dónde mandar el
//     código, cualquiera pediría el código de NEG0001 a su
//     propia bandeja y entraría al panel de otro. Resolviéndolo
//     en el servidor, el código solo puede llegar a la bandeja
//     que el negocio registró.
// ------------------------------------------------------------

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, mensaje: 'Método no permitido.' }) };
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

    if (cuerpo.negocio) {
      // ---- Acceso de negocio: el correo se resuelve aquí, no allá ----
      const codigo = String(cuerpo.negocio).trim().toUpperCase();
      if (!/^NEG\d{3,6}$/.test(codigo)) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, mensaje: 'Ese código de negocio no tiene el formato correcto.' }) };
      }

      const res = await fetch(
        `${SB}/rest/v1/negocios?select=nombre,email&codigo=eq.${encodeURIComponent(codigo)}`,
        { headers: cabecerasSupabase }
      );
      if (!res.ok) {
        return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'No pudimos verificar el negocio.' }) };
      }
      const filas = await res.json();
      if (!filas.length) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, mensaje: 'No encontramos ese código de negocio.' }) };
      }
      if (!filas[0].email) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            ok: false,
            mensaje: 'Tu negocio no tiene un correo registrado, así que no podemos enviarte el código. Escríbenos para cargarlo.',
          }),
        };
      }
      emailLimpio = String(filas[0].email).toLowerCase().trim();
      paraQuien = filas[0].nombre || codigo;

    } else {
      // ---- Registro y acceso de dueños: el correo lo escribe la persona ----
      const { email } = cuerpo;
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, mensaje: 'Correo inválido.' }) };
      }
      emailLimpio = email.toLowerCase().trim();
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

    // ---- 1) Guardar el código en Supabase (con la Service Role Key, oculta) ----
    const resSupabase = await fetch(`${SB}/rest/v1/codigos_verificacion`, {
      method: 'POST',
      headers: { ...cabecerasSupabase, Prefer: 'return=minimal' },
      body: JSON.stringify({ email: emailLimpio, codigo, expira_en: expiraEn }),
    });

    if (!resSupabase.ok) {
      const detalle = await resSupabase.text();
      return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'No se pudo generar el código.', detalle }) };
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
      const detalle = await resEmail.text();
      return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'No se pudo enviar el correo.', detalle }) };
    }

    // Se devuelve el correo TAPADO para que el negocio sepa a qué bandeja mirar
    // sin que la respuesta sirva para descubrir correos ajenos.
    const tapado = emailLimpio.replace(/^(.)(.*)(.@)/, (m, a, medio, c) => a + '•'.repeat(Math.max(medio.length, 1)) + c);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, mensaje: 'Código enviado.', correo_tapado: tapado, nombre: paraQuien }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'Error interno.', detalle: e.message }) };
  }
}
