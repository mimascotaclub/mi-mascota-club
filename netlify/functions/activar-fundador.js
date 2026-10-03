// netlify/functions/activar-fundador.js
// ------------------------------------------------------------
// Activa el Pase de Socio Fundador SOLO si Mercado Pago confirma
// que el pago existe de verdad.
//
// La llama /gracias cuando la persona vuelve de pagar. Recibe:
//   { token: "<sesión del socio>", payment_id: "1234567890" }
//
// POR QUÉ ESTO CORRE EN EL SERVIDOR
//   La dirección de /gracias la puede escribir cualquiera a mano,
//   con un número inventado y "approved". Por eso el navegador no
//   decide nada: esta función le pregunta a Mercado Pago, con la
//   clave secreta de la cuenta (MP_ACCESS_TOKEN), y solo activa si
//   el pago existe, está aprobado, es en pesos y es por el monto
//   del pase. Esa clave nunca sale del servidor.
//
//   El correo tampoco viene del navegador: se saca del token de
//   sesión del socio, que solo se obtiene entrando con el código
//   que le llegó a su correo.
//
//   La activación en la base (activar_fundador) la puede llamar
//   solo esta función: el navegador no tiene permiso (parche v30).
//
// VARIABLES DE ENTORNO
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY            (ya existen)
//   EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY (ya existen)
//   MP_ACCESS_TOKEN   → NUEVA. Access Token de PRODUCCIÓN de Mercado Pago.
//   AVISO_CANJE_EMAIL → opcional, a dónde llega el aviso (por defecto
//                       holamimascotaclub@gmail.com)
// ------------------------------------------------------------

const PRECIO_PASE = 9990;
// Los pagos anteriores al lanzamiento del pase no sirven, aunque sean
// por el mismo monto (la cuenta de Mercado Pago es anterior al club).
const PASE_DESDE = new Date('2026-09-23T00:00:00-03:00');

const PLANTILLA_AVISO = 'template_u9x5p1i';
const CORREO_JAIME = 'holamimascotaclub@gmail.com';

const GRUPO_FUNDADORES = process.env.GRUPO_FUNDADORES_URL || 'https://chat.whatsapp.com/FMw6QHmwkSnFXIYbX5Cosb';

const ESTADOS_EN_PROCESO = ['pending', 'in_process', 'authorized', 'in_mediation'];

function responder(statusCode, cuerpo) {
  return { statusCode, body: JSON.stringify(cuerpo) };
}

function clp(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

async function avisarAJaime({ asunto, titulo, intro, cajaTitulo, cajaDato, nota }) {
  try {
    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID_AVISO || PLANTILLA_AVISO,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: process.env.AVISO_CANJE_EMAIL || CORREO_JAIME,
          to_name: 'Jaime',
          // Esconde los bloques de socio de la plantilla ("Cómo se usa", etc.)
          ocultar_socio: 'si',
          asunto,
          eyebrow: 'Socios Fundadores',
          titulo,
          intro,
          caja_titulo: cajaTitulo,
          caja_dato: cajaDato,
          boton_texto: 'Ver en mi panel →',
          boton_url: 'https://mimascotaclub.cl/mi-panel',
          caja_nota: new Date().toLocaleString('es-CL', {
            timeZone: 'America/Santiago', day: '2-digit', month: 'short',
            hour: '2-digit', minute: '2-digit', hour12: false,
          }),
          mensaje_extra: nota || '',
        },
      }),
    });
  } catch (e) {
    // El aviso es para Jaime. Si falla, la activación del socio no se cae.
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return responder(405, { ok: false, motivo: 'metodo' });
  }

  const SB = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const MP = process.env.MP_ACCESS_TOKEN;
  const cabeceras = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

  async function rpc(nombre, params) {
    const r = await fetch(`${SB}/rest/v1/rpc/${nombre}`, {
      method: 'POST', headers: cabeceras, body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error('rpc ' + nombre + ' ' + r.status);
    return r.json();
  }

  try {
    if (!MP) {
      return responder(500, { ok: false, motivo: 'config' });
    }

    const { token, payment_id } = JSON.parse(event.body || '{}');
    const ref = String(payment_id || '').trim();

    if (!/^[0-9]{6,20}$/.test(ref)) {
      return responder(400, { ok: false, motivo: 'sin_pago' });
    }
    if (!/^[0-9a-f-]{36}$/i.test(String(token || ''))) {
      return responder(401, { ok: false, motivo: 'sin_sesion' });
    }

    // ---- 1) ¿Quién es? Lo dice su sesión, no el navegador ----
    const email = await rpc('socio_email_de_token', { p_token: token });
    if (!email) {
      return responder(401, { ok: false, motivo: 'sin_sesion' });
    }

    // ---- 2) Preguntarle a Mercado Pago por ese pago ----
    const resMP = await fetch(`https://api.mercadopago.com/v1/payments/${ref}`, {
      headers: { Authorization: `Bearer ${MP}` },
    });
    if (resMP.status === 404) {
      return responder(404, { ok: false, motivo: 'pago_no_encontrado' });
    }
    if (!resMP.ok) {
      return responder(502, { ok: false, motivo: 'mp_no_responde' });
    }
    const pago = await resMP.json();
    const estado = String(pago.status || '');
    const monto = Number(pago.transaction_amount || 0);
    const moneda = String(pago.currency_id || '');
    const fecha = new Date(pago.date_approved || pago.date_created || 0);

    // ---- 3) Pago en efectivo o transferencia que todavía no se acredita ----
    if (ESTADOS_EN_PROCESO.includes(estado)) {
      const nuevo = await rpc('registrar_pendiente_fundador', {
        p_email: email, p_referencia: ref, p_motivo: 'pago_en_proceso', p_estado: estado, p_monto: Math.round(monto),
      });
      // Un aviso por pago, no uno por cada vez que la persona recarga la página.
      if (nuevo) await avisarAJaime({
        asunto: 'Pase fundador en proceso — ' + email,
        titulo: 'Un pago quedó en proceso',
        intro: email + ' pagó el pase, pero Mercado Pago todavía no lo acredita (estado: ' + estado + '). Suele pasar con efectivo o transferencia.',
        cajaTitulo: 'Operación de Mercado Pago',
        cajaDato: ref,
        nota: 'Cuando Mercado Pago lo apruebe, márcalo como fundador desde Pagos pendientes en /mi-panel.',
      });
      return responder(200, { ok: false, motivo: 'en_proceso' });
    }

    if (estado !== 'approved') {
      return responder(200, { ok: false, motivo: 'no_aprobado', estado });
    }

    // ---- 4) Aprobado, pero ¿es el pago del pase? ----
    if (moneda !== 'CLP' || Math.round(monto) !== PRECIO_PASE || !(fecha >= PASE_DESDE)) {
      const nuevo = await rpc('registrar_pendiente_fundador', {
        p_email: email, p_referencia: ref, p_motivo: 'monto_distinto', p_estado: estado, p_monto: Math.round(monto),
      });
      if (nuevo) await avisarAJaime({
        asunto: 'Revisar un pago de fundador — ' + email,
        titulo: 'Un pago no calza con el pase',
        intro: email + ' intentó activar el pase con un pago de ' + clp(monto) + ' ' + moneda + '. El pase vale ' + clp(PRECIO_PASE) + '.',
        cajaTitulo: 'Operación de Mercado Pago',
        cajaDato: ref,
        nota: 'Revísalo en Mercado Pago y resuélvelo desde Pagos pendientes en /mi-panel.',
      });
      return responder(200, { ok: false, motivo: 'revision' });
    }

    // ---- 5) Todo calza: activar ----
    const r = await rpc('activar_fundador', { p_email: email, p_referencia: ref, p_monto: PRECIO_PASE });

    if (r && r.ok) {
      if (!r.ya_era) {
        const num = '#' + String(r.numero).padStart(3, '0');
        await avisarAJaime({
          asunto: 'Nuevo Socio Fundador ' + num + ' — ' + email,
          titulo: 'Nuevo Socio Fundador ' + num,
          intro: email + ' pagó ' + clp(PRECIO_PASE) + ' y su pase se activó solo. Mercado Pago confirmó el pago.',
          cajaTitulo: 'Operación de Mercado Pago',
          cajaDato: ref,
          nota: 'Es buen momento para darle la bienvenida al grupo de fundadores.',
        });
      }
      // El enlace del grupo se entrega SOLO acá, con el pase ya activo:
      // así no queda escrito en ninguna página pública.
      return responder(200, { ok: true, numero: r.numero, ya_era: !!r.ya_era, grupo: GRUPO_FUNDADORES });
    }

    const motivo = (r && r.motivo) || 'error';
    if (motivo === 'sin_cupo' && r.nuevo !== false) {
      await avisarAJaime({
        asunto: 'Pago de fundador sin cupo — ' + email,
        titulo: 'Alguien pagó sin cupo',
        intro: email + ' pagó el pase, pero ya no quedaban cupos. Hay que devolverle el pago o hacerle un lugar.',
        cajaTitulo: 'Operación de Mercado Pago',
        cajaDato: ref,
        nota: 'Está en Pagos pendientes en /mi-panel.',
      });
    }
    return responder(200, { ok: false, motivo });
  } catch (e) {
    return responder(500, { ok: false, motivo: 'error' });
  }
}
