// netlify/functions/aviso-canje.js
// ------------------------------------------------------------
// Le avisa a Jaime por correo cada vez que un negocio confirma
// una visita.
//
// POR QUÉ ESTO CORRE EN EL SERVIDOR Y NO EN EL NAVEGADOR
//
//   El aviso sirve para poder escribirle al dueño el mismo día y
//   preguntarle cómo le fue. O sea, tiene que traer su nombre,
//   su correo y su teléfono.
//
//   Pero la política de privacidad del club dice, textual, que el
//   negocio NO ve el correo, el teléfono ni el RUT del socio. Si
//   el correo se armara en el navegador del negocio, esos datos
//   tendrían que pasar por ahí — y quedarían a la vista de
//   cualquiera que abra las herramientas del navegador.
//
//   Por eso el navegador del negocio solo manda dos cosas que ya
//   tiene: su token de sesión y el id del canje. El resto lo
//   busca esta función con la Service Role Key, que nunca sale
//   del servidor.
//
// SEGURIDAD
//   La función es pública, así que valida el token de sesión del
//   negocio y comprueba que el canje sea SUYO. Sin eso, cualquiera
//   podría pedir avisos de canjes ajenos o llenar de correos la
//   bandeja de Jaime.
//
// VARIABLES DE ENTORNO (todas ya existen para enviar-codigo.js,
// salvo la última, que es opcional):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY
//   EMAILJS_TEMPLATE_ID_AVISO  → si no está, usa template_u9x5p1i
//   AVISO_CANJE_EMAIL          → si no está, holamimascotaclub@gmail.com
// ------------------------------------------------------------

const PLANTILLA_POR_DEFECTO = 'template_u9x5p1i';
const CORREO_POR_DEFECTO = 'holamimascotaclub@gmail.com';

function formatCLP(n) {
  if (n == null || isNaN(n)) return null;
  return '$' + Number(n).toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, mensaje: 'Método no permitido.' }) };
  }

  const SB = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cabeceras = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const { token, canje_id } = JSON.parse(event.body || '{}');

    if (!token || !canje_id) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, mensaje: 'Faltan datos.' }) };
    }

    // ---- 1) ¿De qué negocio es esta sesión? ----
    const resToken = await fetch(`${SB}/rest/v1/rpc/negocio_de_token`, {
      method: 'POST',
      headers: cabeceras,
      body: JSON.stringify({ p_token: token }),
    });
    if (!resToken.ok) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'No pudimos validar la sesión.' }) };
    }
    const negocioCodigo = await resToken.json();
    if (!negocioCodigo) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, mensaje: 'Sesión no válida.' }) };
    }

    // ---- 2) El canje, y que sea de ESE negocio ----
    const resCanje = await fetch(
      `${SB}/rest/v1/canjes?select=*&id=eq.${encodeURIComponent(canje_id)}`,
      { headers: cabeceras }
    );
    if (!resCanje.ok) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'No pudimos leer el canje.' }) };
    }
    const canjes = await resCanje.json();
    const c = canjes[0];
    if (!c) {
      return { statusCode: 404, body: JSON.stringify({ ok: false, mensaje: 'Ese canje no existe.' }) };
    }
    if (c.negocio_codigo !== negocioCodigo) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, mensaje: 'Ese canje no es de tu negocio.' }) };
    }

    // ---- 3) El dueño, que es el dato que el navegador no puede ver ----
    let dueno = {};
    if (c.socio_codigo) {
      const resSocio = await fetch(
        `${SB}/rest/v1/socios?select=pet,representante_nombre,email,representante_telefono,verificacion&codigo=eq.${encodeURIComponent(c.socio_codigo)}`,
        { headers: cabeceras }
      );
      if (resSocio.ok) {
        const filas = await resSocio.json();
        dueno = filas[0] || {};
      }
    }

    // ---- 4) El correo del negocio, para poder contestarle también a él ----
    let negocio = {};
    const resNeg = await fetch(
      `${SB}/rest/v1/negocios?select=nombre,email,telefono&codigo=eq.${encodeURIComponent(negocioCodigo)}`,
      { headers: cabeceras }
    );
    if (resNeg.ok) {
      const filas = await resNeg.json();
      negocio = filas[0] || {};
    }

    // ---- 5) Armar el correo ----
    const mascota = c.socio_mascota || dueno.pet || 'un socio';
    const montoTxt = formatCLP(c.monto);
    const ahorroTxt = formatCLP(c.ahorro);

    const contactoDueno = [
      dueno.representante_nombre || 'Sin nombre cargado',
      dueno.email || null,
      dueno.representante_telefono || null,
    ].filter(Boolean).join(' · ');

    const contactoNegocio = [
      negocio.nombre || c.negocio_nombre,
      negocio.email || null,
      negocio.telefono || null,
    ].filter(Boolean).join(' · ');

    const asunto = 'Canje en ' + (c.negocio_nombre || negocioCodigo) + ' — ' + mascota
                 + (montoTxt ? ' · ' + montoTxt : '');

    const intro = mascota + ' (' + (c.socio_codigo || 's/código') + ') usó su beneficio en '
                + (c.negocio_nombre || negocioCodigo) + '. '
                + (montoTxt
                    ? 'Compra de ' + montoTxt + (ahorroTxt ? ', ahorró ' + ahorroTxt + '.' : '.')
                    : 'El negocio no anotó el monto de la compra.');

    const cierre = 'Dueño: ' + contactoDueno + '.  ·  Negocio: ' + contactoNegocio + '.'
                 + (c.beneficio_texto ? '  ·  Beneficio aplicado: ' + c.beneficio_texto + '.' : '')
                 + '  Es buen momento para escribirle y preguntarle cómo le fue: al día siguiente ya no contestan igual.';

    const resEmail = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID_AVISO || PLANTILLA_POR_DEFECTO,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: process.env.AVISO_CANJE_EMAIL || CORREO_POR_DEFECTO,
          to_name: 'Jaime',
          mascota: mascota,
          codigo: c.socio_codigo || '',
          asunto: asunto,
          eyebrow: 'Visita validada',
          titulo: 'Canje en ' + (c.negocio_nombre || negocioCodigo),
          intro: intro,
          caja_titulo: 'Folio de la visita',
          caja_dato: c.folio || '—',
          boton_texto: 'Ver el detalle en mi panel →',
          boton_url: 'https://mimascotaclub.cl/mi-panel',
          caja_nota: new Date(c.created_at).toLocaleString('es-CL', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
          }),
          mensaje_extra: cierre,
        },
      }),
    });

    if (!resEmail.ok) {
      const detalle = await resEmail.text();
      return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'No se pudo enviar el aviso.', detalle }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, mensaje: 'Error interno.', detalle: e.message }) };
  }
}
