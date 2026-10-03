/* ======================================================================
   PASE FUNDADOR — piezas compartidas por /quienes-somos y /gracias
   ----------------------------------------------------------------------
   Estas dos páginas son sueltas (no cargan js/app.js), así que lo que
   necesitan en común vive acá:

   - La sesión del socio: es la MISMA que usa /mi-mascota (se guarda en
     el teléfono con la llave 'mmc_sesion_socio'). Quien ya entró a su
     carnet no tiene que volver a poner nada.
   - El mini acceso con código al correo, para quien no tiene sesión.

   Por qué se pide entrar con código antes de pagar (decidido el 3 de
   octubre): así el pase queda ligado al correo correcto y nadie puede
   usar esta página para averiguar si un correo está inscrito.

   Requiere: supabase-js cargado antes, y /css/styles.css.
   ====================================================================== */
(function(){
  const SUPABASE_URL  = 'https://mzsqyjxqnomsbqzhygkx.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16c3F5anhxbm9tc2Jxemh5Z2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTA0NDAsImV4cCI6MjEwMzY4NjQ0MH0.v5MASfYE83x1Lr_p1Q4MlHtyqpJlopBbjUqhB2suTEc';
  const LS_SESION = 'mmc_sesion_socio';

  let _sb = null;
  function sb(){
    if(!_sb) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    return _sb;
  }

  function token(){
    try{ return localStorage.getItem(LS_SESION) || ''; }catch(e){ return ''; }
  }
  function guardarToken(t){
    try{ localStorage.setItem(LS_SESION, t); }catch(e){ /* modo incógnito */ }
  }
  function borrarToken(){
    try{ localStorage.removeItem(LS_SESION); }catch(e){}
  }

  /* Quién es el socio con sesión y si ya es fundador.
     Devuelve null si no hay sesión o venció. */
  async function quienSoy(){
    const t = token();
    if(!t) return null;
    try{
      const { data, error } = await sb().rpc('socio_perfil', { p_token: t });
      if(error || !data || !data.length){ borrarToken(); return null; }
      let fundador = null;
      try{
        const r = await sb().rpc('socio_fundador', { p_token: t });
        fundador = (r && !r.error) ? r.data : null;
      }catch(e){ fundador = null; }
      return { email: data[0].email, nombre: (data[0].representante_nombre || '').split(' ')[0], fundador };
    }catch(e){
      return null;
    }
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* Dibuja el acceso (correo → código) dentro de `caja`. Cuando la persona
     entra bien, llama a onListo(). Usa las mismas clases que /mi-mascota. */
  function montarAcceso(caja, onListo){
    caja.innerHTML = `
      <form class="pf-paso" data-paso="correo">
        <div class="field">
          <label for="pfEmail">El correo con el que inscribiste a tu mascota</label>
          <input id="pfEmail" type="email" required placeholder="tucorreo@gmail.com" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false">
        </div>
        <button type="submit" class="btn btn-primary pf-btn">Enviarme el código</button>
        <p class="pf-nota">¿Todavía no inscribes a tu mascota? <a href="/registro">Hazlo gratis acá</a> y vuelve.</p>
      </form>
      <form class="pf-paso" data-paso="codigo" hidden>
        <p class="soc-enviado">Si <b class="pf-eco"></b> está inscrito, te llegará un código de 6 dígitos en menos de un minuto. Si no lo ves, revisa el spam.</p>
        <div class="field">
          <label for="pfCodigo">Código de 6 dígitos</label>
          <input id="pfCodigo" inputmode="numeric" maxlength="6" required placeholder="123456" class="soc-otp" autocomplete="one-time-code">
        </div>
        <button type="submit" class="btn btn-primary pf-btn">Confirmar</button>
        <div class="soc-reenvio">
          <button type="button" class="soc-link" data-accion="volver">← Usar otro correo</button>
          <button type="button" class="soc-link" data-accion="reenviar">Reenviar código</button>
        </div>
        <p class="pf-nota">¿No te llega? Puede que tu mascota esté inscrita con otro correo, o que todavía no la inscribas: <a href="/registro">inscríbela gratis</a>.</p>
      </form>
      <div class="soc-error" hidden></div>`;

    const fCorreo = caja.querySelector('[data-paso="correo"]');
    const fCodigo = caja.querySelector('[data-paso="codigo"]');
    const err     = caja.querySelector('.soc-error');
    const inEmail = caja.querySelector('#pfEmail');
    const inCod   = caja.querySelector('#pfCodigo');
    let email = '';

    function error(t){ err.textContent = t || ''; err.hidden = !t; }
    function paso(cual){ fCorreo.hidden = cual !== 'correo'; fCodigo.hidden = cual !== 'codigo'; }

    async function pedirCodigo(btn){
      error('');
      const texto = btn ? btn.textContent : '';
      if(btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Enviando...'; }
      try{
        const res = await fetch('/.netlify/functions/enviar-codigo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, acceso: true })
        });
        const r = await res.json().catch(() => ({}));
        if(!res.ok || !r.ok){
          error(r.mensaje || 'No pudimos enviar el código. Inténtalo de nuevo en un momento.');
          return false;
        }
        caja.querySelector('.pf-eco').textContent = email;
        paso('codigo');
        inCod.value = '';
        inCod.focus();
        return true;
      }catch(e){
        error('No pudimos enviar el código. Revisa tu conexión e inténtalo de nuevo.');
        return false;
      }finally{
        if(btn){ btn.disabled = false; btn.textContent = texto; }
      }
    }

    fCorreo.addEventListener('submit', function(e){
      e.preventDefault();
      email = (inEmail.value || '').trim().toLowerCase();
      if(!/\S+@\S+\.\S+/.test(email)){ error('Revisa que el correo esté bien escrito.'); return; }
      pedirCodigo(fCorreo.querySelector('.pf-btn'));
    });

    fCodigo.addEventListener('submit', async function(e){
      e.preventDefault();
      error('');
      const codigo = (inCod.value || '').replace(/\D/g, '');
      if(codigo.length !== 6){ error('El código tiene 6 dígitos.'); return; }
      const btn = fCodigo.querySelector('.pf-btn');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Confirmando...';
      try{
        const { data, error: e2 } = await sb().rpc('socio_login', { p_email: email, p_codigo: codigo });
        if(e2) throw e2;
        const r = data && data[0];
        if(!r || !r.ok){ error((r && r.mensaje) || 'El código no es válido o ya venció. Pide uno nuevo.'); return; }
        guardarToken(r.token);
        onListo();
      }catch(e3){
        error('No pudimos confirmar el código. Inténtalo de nuevo.');
      }finally{
        btn.disabled = false; btn.textContent = 'Confirmar';
      }
    });

    caja.querySelector('[data-accion="volver"]').addEventListener('click', function(){ error(''); paso('correo'); });
    caja.querySelector('[data-accion="reenviar"]').addEventListener('click', async function(){
      const b = this;
      b.disabled = true;
      const ok = await pedirCodigo(null);
      b.textContent = ok ? 'Código reenviado' : 'Reenviar código';
      setTimeout(function(){ b.disabled = false; b.textContent = 'Reenviar código'; }, 20000);
    });

    setTimeout(function(){ inEmail.focus(); }, 50);
  }

  /* Estilos mínimos de las piezas de acá. El resto viene de styles.css. */
  const css = document.createElement('style');
  css.textContent = `
    .pf-btn{ width:100%; justify-content:center; }
    .pf-nota{ font-size:13px; color:var(--gray); line-height:1.5; margin:12px 0 0; font-weight:600; }
    .pf-nota a{ color:var(--teal-dark); font-weight:800; }
    .pf-paso[hidden], .soc-error[hidden]{ display:none !important; }
  `;
  document.head.appendChild(css);

  window.PaseFundador = { sb, token, guardarToken, borrarToken, quienSoy, montarAcceso, esc };
})();
