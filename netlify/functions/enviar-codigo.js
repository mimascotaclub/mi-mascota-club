// netlify/functions/enviar-codigo.js
// ------------------------------------------------------------
// Genera un código de 6 dígitos, lo guarda en Supabase (usando
// la Service Role Key, que nunca se expone al navegador) y lo
// envía por correo vía EmailJS. Esta función corre en el
// servidor de Netlify, no en el navegador de quien se registra.
// ------------------------------------------------------------

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, mensaje: 'Método no permitido.' }) };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, mensaje: 'Correo inválido.' }) };
    }

    const emailLimpio = email.toLowerCase().trim();
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

    // ---- 1) Guardar el código en Supabase (con la Service Role Key, oculta) ----
    const resSupabase = await fetch(`${process.env.SUPABASE_URL}/rest/v1/codigos_verificacion`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
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

    return { statusCode: 200, body: JSON.stringify({ ok: true, mensaje: 'Código enviado.' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'Error interno.', detalle: e.message }) };
  }
}
