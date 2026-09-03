/* ======================================================================
   MI MASCOTA CLUB — LÓGICA DE LA APP (conectada a Supabase)
   ======================================================================
   Datos reales, para siempre, en tu propia base de datos. Los datos
   sensibles (socios, canjes) NUNCA se leen directo desde el navegador —
   solo a través de funciones seguras (RPC) definidas en supabase-schema.sql.
   El panel privado usa un inicio de sesión real (Supabase Auth), no una
   clave escondida en el código.
   ====================================================================== */

(function(){
'use strict';

const SUPABASE_URL = "https://mzsqyjxqnomsbqzhygkx.supabase.co";
const SUPABASE_KEY = "sb_publishable_KdIYZfFtnfO2e7VaMMfWAA_GBT79hZ1";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- Correo de bienvenida (EmailJS) ----------------
   PASO PENDIENTE PARA TI: crea una cuenta gratis en emailjs.com, conecta tu Gmail,
   crea UNA plantilla de correo, y reemplaza estos 3 valores. Mientras estén vacíos,
   el sitio funciona igual — simplemente no se envía el correo (no rompe nada).
   Instrucciones completas al final del mensaje del chat.
------------------------------------------------------------------- */
const EMAILJS_PUBLIC_KEY = "9eL8mW9_T5HjOEAYe";   // Account → General → Public Key
const EMAILJS_SERVICE_ID = "service_ch7ncxl";      // Email Services → tu servicio de Gmail
const EMAILJS_TEMPLATE_ID = "template_u9x5p1i";    // Email Templates → tu plantilla

if(EMAILJS_PUBLIC_KEY && window.emailjs){ emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); }

async function enviarCorreoBienvenida(params){
  if(!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID){
    console.log('EmailJS no configurado todavía — se omite el envío de correo.');
    return;
  }
  try{
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
  }catch(e){
    console.error('No se pudo enviar el correo de bienvenida:', e);
  }
}

const negociosSeed = [
  {nombre:"Veterinaria Los Robles", cat:"Veterinaria", tipo:"mascota", comuna:"Ñuñoa", meta:"Consultas, vacunas y urgencias.", demo:true, destacado:true},
  {nombre:"Pelu Copito", cat:"Peluquería", tipo:"mascota", comuna:"Providencia", meta:"Baño y corte a domicilio.", demo:true, destacado:true},
  {nombre:"Paseos Rex", cat:"Paseador", tipo:"mascota", comuna:"La Reina", meta:"Paseos grupales y GPS en vivo.", demo:true},
  {nombre:"Hotel Huellitas", cat:"Hotel / Pensión", tipo:"mascota", comuna:"Vitacura", meta:"Estadías cortas y largas, cámaras 24/7.", demo:true, destacado:true},
  {nombre:"Barbería El Roble", cat:"Barbería", tipo:"dueno", comuna:"Ñuñoa", meta:"15% de descuento para socios del club.", demo:true},
  {nombre:"Pádel Club Vitacura", cat:"Deporte", tipo:"dueno", comuna:"Vitacura", meta:"Hora de cancha con precio socio.", demo:true},
  {nombre:"Café Con Patas", cat:"Café", tipo:"dueno", comuna:"Providencia", meta:"Café pet-friendly, 2x1 los martes para socios.", demo:true},
  {nombre:"Valentina Ríos — Etóloga", cat:"Salud", tipo:"mascota", comuna:"Providencia", meta:"Consultas de conducta canina y felina, a domicilio u online.", demo:true, esEspecialista:true},
  {nombre:"Camila Soto — Nutrición Animal", cat:"Salud", tipo:"mascota", comuna:"Ñuñoa", meta:"Planes de alimentación personalizados para tu mascota.", demo:true, esEspecialista:true},
];
const iconByCat = {
  "Veterinaria":"🩺","Peluquería":"✂️","Paseador":"🦮","Hotel / Pensión":"🏠","Tienda":"🛍️","Alimentos":"🍖",
  "Salud":"💊","Accesorios":"🎾","Adiestramiento":"🏋️","Fotografía":"📷",
  "Barbería":"💈","Café":"☕","Restaurante":"🍽️","Belleza":"💅","Deporte":"🏓","Hotel":"🏨","Otro":"🎁"
};
const CATS_MASCOTA = ["Veterinaria","Peluquería","Paseador","Hotel / Pensión","Tienda","Alimentos","Salud","Accesorios","Adiestramiento","Fotografía"];
const CATS_DUENO = ["Café","Restaurante","Hotel","Deporte","Barbería","Belleza","Tienda","Otro"];
const DESCUENTO_EJEMPLO = 0.10;

/* ---------------- Regiones y comunas de Chile (16 regiones, 346 comunas) ----------------
   Se usa para el selector en cascada Región → Comuna de los formularios de dueños y
   negocios. La Región Metropolitana queda preseleccionada por defecto (piloto en Santiago). */
const CHILE_REGIONES = [
  { region: "Metropolitana de Santiago", comunas: ["Alhué","Buin","Calera de Tango","Cerrillos","Cerro Navia","Colina","Conchalí","Curacaví","El Bosque","El Monte","Estación Central","Huechuraba","Independencia","Isla de Maipo","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Lampa","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","María Pinto","Melipilla","Ñuñoa","Padre Hurtado","Paine","Pedro Aguirre Cerda","Peñaflor","Peñalolén","Pirque","Providencia","Pudahuel","Puente Alto","Quilicura","Quinta Normal","Recoleta","Renca","San Bernardo","San Joaquín","San José de Maipo","San Miguel","San Pedro","San Ramón","Santiago","Talagante","Tiltil","Vitacura"] },
  { region: "Arica y Parinacota", comunas: ["Arica","Camarones","General Lagos","Putre"] },
  { region: "Tarapacá", comunas: ["Alto Hospicio","Camiña","Colchane","Huara","Iquique","Pica","Pozo Almonte"] },
  { region: "Antofagasta", comunas: ["Antofagasta","Calama","María Elena","Mejillones","Ollagüe","San Pedro de Atacama","Sierra Gorda","Taltal","Tocopilla"] },
  { region: "Atacama", comunas: ["Alto del Carmen","Caldera","Chañaral","Copiapó","Diego de Almagro","Freirina","Huasco","Tierra Amarilla","Vallenar"] },
  { region: "Coquimbo", comunas: ["Andacollo","Canela","Combarbalá","Coquimbo","Illapel","La Higuera","La Serena","Los Vilos","Monte Patria","Ovalle","Paiguano","Punitaqui","Río Hurtado","Salamanca","Vicuña"] },
  { region: "Valparaíso", comunas: ["Algarrobo","Cabildo","Calera","Calle Larga","Cartagena","Casablanca","Catemu","Concón","El Quisco","El Tabo","Hijuelas","Isla de Pascua","Juan Fernández","La Cruz","La Ligua","Limache","Llaillay","Los Andes","Nogales","Olmué","Panquehue","Papudo","Petorca","Puchuncaví","Putaendo","Quillota","Quilpué","Quintero","Rinconada","San Antonio","San Esteban","San Felipe","Santa María","Santo Domingo","Valparaíso","Villa Alemana","Viña del Mar","Zapallar"] },
  { region: "Libertador Bernardo O'Higgins", comunas: ["Chépica","Chimbarongo","Codegua","Coínco","Coltauco","Doñihue","Graneros","La Estrella","Las Cabras","Litueche","Lolol","Machalí","Malloa","Marchihue","Mostazal","Nancagua","Navidad","Olivar","Palmilla","Paredones","Peralillo","Peumo","Pichidegua","Pichilemu","Placilla","Pumanque","Quinta de Tilcoco","Rancagua","Rengo","Requínoa","San Fernando","San Vicente","Santa Cruz"] },
  { region: "Maule", comunas: ["Cauquenes","Chanco","Colbún","Constitución","Curepto","Curicó","Empedrado","Hualañé","Licantén","Linares","Longaví","Maule","Molina","Parral","Pelarco","Pelluhue","Pencahue","Rauco","Retiro","Río Claro","Romeral","Sagrada Familia","San Clemente","San Javier","San Rafael","Talca","Teno","Vichuquén","Villa Alegre","Yerbas Buenas"] },
  { region: "Ñuble", comunas: ["Bulnes","Chillán","Chillán Viejo","Cobquecura","Coelemu","Coihueco","El Carmen","Ninhue","Ñiquén","Pemuco","Pinto","Portezuelo","Quillón","Quirihue","Ránquil","San Carlos","San Fabián","San Ignacio","San Nicolás","Treguaco","Yungay"] },
  { region: "Biobío", comunas: ["Alto Biobío","Antuco","Arauco","Cabrero","Cañete","Chiguayante","Concepción","Contulmo","Coronel","Curanilahue","Florida","Hualpén","Hualqui","Laja","Lebu","Los Álamos","Los Ángeles","Lota","Mulchén","Nacimiento","Negrete","Penco","Quilaco","Quilleco","San Pedro de la Paz","San Rosendo","Santa Bárbara","Santa Juana","Talcahuano","Tirúa","Tomé","Tucapel","Yumbel"] },
  { region: "La Araucanía", comunas: ["Angol","Carahue","Cholchol","Collipulli","Cunco","Curacautín","Curarrehue","Ercilla","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Lonquimay","Los Sauces","Lumaco","Melipeuco","Nueva Imperial","Padre Las Casas","Perquenco","Pitrufquén","Pucón","Purén","Renaico","Saavedra","Temuco","Teodoro Schmidt","Toltén","Traiguén","Victoria","Vilcún","Villarrica"] },
  { region: "Los Ríos", comunas: ["Corral","Futrono","La Unión","Lago Ranco","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","Río Bueno","Valdivia"] },
  { region: "Los Lagos", comunas: ["Ancud","Calbuco","Castro","Chaitén","Chonchi","Cochamó","Curaco de Vélez","Dalcahue","Fresia","Frutillar","Futaleufú","Hualaihué","Llanquihue","Los Muermos","Maullín","Osorno","Palena","Puerto Montt","Puerto Octay","Puerto Varas","Puqueldón","Purranque","Puyehue","Queilén","Quellón","Quemchi","Quinchao","Río Negro","San Juan de la Costa","San Pablo"] },
  { region: "Aysén", comunas: ["Aysén","Chile Chico","Cisnes","Cochrane","Coyhaique","Guaitecas","Lago Verde","O'Higgins","Río Ibáñez","Tortel"] },
  { region: "Magallanes y la Antártica Chilena", comunas: ["Antártica","Cabo de Hornos","Laguna Blanca","Natales","Porvenir","Primavera","Punta Arenas","Río Verde","San Gregorio","Timaukel","Torres del Paine"] },
];
const REGION_POR_DEFECTO = "Metropolitana de Santiago";

/* Rellena un <select> de regiones. */
function poblarRegiones(selectId){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  sel.innerHTML = '<option value="">Selecciona tu región</option>' +
    CHILE_REGIONES.map(r => `<option value="${r.region}">${r.region}</option>`).join('');
}
/* Rellena el <select> de comunas según la región elegida en otro <select>. */
function poblarComunas(regionSelectId, comunaSelectId){
  const regionSel = document.getElementById(regionSelectId);
  const comunaSel = document.getElementById(comunaSelectId);
  if(!regionSel || !comunaSel) return;
  const region = CHILE_REGIONES.find(r => r.region === regionSel.value);
  const comunaPrevia = comunaSel.value;
  comunaSel.innerHTML = '<option value="">Selecciona tu comuna</option>' +
    (region ? region.comunas.map(c => `<option value="${c}">${c}</option>`).join('') : '');
  if(region && region.comunas.includes(comunaPrevia)) comunaSel.value = comunaPrevia;
}
/* Deja el selector de región/comuna de un formulario ('owner' o 'biz') en su estado inicial:
   Región Metropolitana preseleccionada (piloto en Santiago) y su lista de comunas cargada. */
function resetRegionComuna(prefix){
  const regionSel = document.getElementById(prefix + 'Region');
  if(!regionSel) return;
  regionSel.value = REGION_POR_DEFECTO;
  poblarComunas(prefix + 'Region', prefix + 'Comuna');
}

/* ---------------- Planes de membresía de los socios (dueños) ----------------
   Por ahora todo registro nuevo queda en plan "free" — más adelante esto se conecta
   a una pasarela de pago real y el plan se actualizará según el estado de la suscripción. */
const PLAN_LABELS = { free: "Miembro Free", pro: "Miembro Pro", premium: "Miembro Premium" };
function planLabel(plan){ return PLAN_LABELS[plan] || PLAN_LABELS.free; }

let bizTipoActual = 'mascota';
let dirTipoFiltro = '';
let negociosReal = [];
let sociosCount = 0;
let canjesCount = 0;
let modoDirectorioEspecialistas = false;
let modoDirectorioBeneficios = false;
let bizEsEspecialista = false;

/* Alterna, en el paso 1 del formulario de negocio, si la ficha que se está creando es
   de un NEGOCIO (local/marca) o de un ESPECIALISTA individual (una sola persona que
   ofrece un servicio: etólogo, nutricionista, adiestrador, etc.). Se guarda en la
   columna es_especialista de la tabla negocios y decide si aparece en /especialistas. */
function setBizEsEspecialista(val){
  bizEsEspecialista = val;
  const btnNegocio = document.getElementById('fichaNegocioBtn');
  const btnEsp = document.getElementById('fichaEspecialistaBtn');
  if(btnNegocio) btnNegocio.className = 'btn btn-sm ' + (!val ? 'btn-primary' : 'btn-outline');
  if(btnEsp) btnEsp.className = 'btn btn-sm ' + (val ? 'btn-primary' : 'btn-outline');
  const nameInput = document.getElementById('bizName');
  if(nameInput) nameInput.placeholder = val ? 'Ej: Camila Soto — Nutrición animal' : 'Ej: Veterinaria Los Robles';
}

function setBizTipo(tipo){
  bizTipoActual = tipo;
  document.getElementById('tipoMascotaBtn').className = 'btn btn-sm ' + (tipo==='mascota' ? 'btn-primary' : 'btn-outline');
  document.getElementById('tipoDuenoBtn').className = 'btn btn-sm ' + (tipo==='dueno' ? 'btn-primary' : 'btn-outline');
  const cats = tipo === 'mascota' ? CATS_MASCOTA : CATS_DUENO;
  document.getElementById('bizCat').innerHTML = '<option value="">Selecciona</option>' + cats.map(c=>`<option>${c}</option>`).join('');
  document.getElementById('bizFormHint').textContent = tipo === 'mascota'
    ? 'Beneficio para la mascota (ej. veterinaria, peluquería, tienda).'
    : 'Beneficio para el dueño, sin relación directa con mascotas (ej. barbería, café, deporte) — así premiamos a quien tiene mascota, no solo su gasto en ella.';
}
function setDirTipo(tipo){
  dirTipoFiltro = tipo;
  document.getElementById('tabTodos').className = 'btn btn-sm ' + (tipo==='' ? 'btn-primary' : 'btn-outline');
  document.getElementById('tabMascota').className = 'btn btn-sm ' + (tipo==='mascota' ? 'btn-primary' : 'btn-outline');
  document.getElementById('tabDueno').className = 'btn btn-sm ' + (tipo==='dueno' ? 'btn-primary' : 'btn-outline');
  renderDirectory();
}
function renderCatGrid(){
  const el = document.getElementById('catGrid');
  if(!el) return;
  const all = [...CATS_MASCOTA.map(c=>({cat:c, tipo:'mascota'})), ...CATS_DUENO.map(c=>({cat:c, tipo:'dueno'}))];
  el.innerHTML = all.map(({cat,tipo}) => `
    <div class="cat-tile ${tipo==='dueno'?'dueno':''}" onclick="filtrarPorCategoria('${cat.replace(/'/g,"\\'")}','${tipo}')">
      <div class="ic">${iconByCat[cat]||'🐾'}</div>
      <div class="lbl">${cat}</div>
      <span class="map-link" onclick="event.stopPropagation(); abrirMapa('${cat.replace(/'/g,"\\'")}')">📍 Ver en el mapa</span>
    </div>`).join('');
}
function filtrarPorCategoria(cat, tipo){
  irADirectorio({ cat, tipo });
}
function filtrarPorNegocio(nombre){
  irADirectorio({ q: nombre });
}

/* ---------------- Directorio como página propia (/directorio/...) ----------------
   El directorio ya NO vive "más abajo" en la página de inicio: es su propia vista,
   con su propia URL (ej. /directorio/veterinaria), a la que se llega con una
   navegación real (history.pushState) en vez de un simple scroll. Como el sitio
   sigue siendo un único archivo index.html (sin backend), esto se logra con un
   router muy simple en el navegador: cambiamos la URL visible y mostramos u
   ocultamos secciones según corresponda — el archivo _redirects de Netlify hace
   que refrescar o entrar directo a /directorio/algo siga funcionando. */
function slugify(s){
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-+|-+$)/g,'');
}
const DIR_CATS_INDEX = [
  ...CATS_MASCOTA.map(c => ({ cat:c, tipo:'mascota', slug:slugify(c) })),
  ...CATS_DUENO.map(c => ({ cat:c, tipo:'dueno', slug:slugify(c) })),
];
function catBySlug(slug){ return DIR_CATS_INDEX.find(c => c.slug === slug) || null; }

/* ---------------- Banner de página (5 slides, degradados de marca) ----------------
   Reutilizable: se usa arriba del directorio, de especialistas y de la ficha de cada
   negocio. Rota sola cada 5000ms con un fundido; si solo hay 1 slide (ficha de un
   negocio puntual) no rota y no muestra los puntos. Cuando el usuario suba fotos reales,
   basta con agregar "img" a cada slide (ver BANNER_DIRECTORIO / BANNER_ESPECIALISTAS más
   abajo) — mientras no haya foto, se usa el degradado de esa posición. */
const PAGE_BANNER_GRADIENTS = [
  'linear-gradient(135deg,#FFCE00,#47C9C9)',
  'linear-gradient(135deg,#47C9C9,#151515)',
  'linear-gradient(135deg,#D65A3A,#FFCE00)',
  'linear-gradient(135deg,#3FAE7A,#47C9C9)',
  'linear-gradient(135deg,#151515,#D65A3A)'
];
const BANNER_DIRECTORIO = [
  { cat: 'Veterinarias y salud' },
  { cat: 'Peluquería y estética' },
  { cat: 'Paseadores y hoteles' },
  { cat: 'Tiendas y accesorios' },
  { cat: 'Beneficios para ti como dueño' },
];
const BANNER_ESPECIALISTAS = [
  { cat: 'Etología y conducta' },
  { cat: 'Nutrición animal' },
  { cat: 'Adiestramiento' },
  { cat: 'Fisioterapia y rehabilitación' },
  { cat: 'Especialistas para ti como dueño' },
];
const BANNER_BENEFICIOS = [
  { cat: 'Beneficios para tu mascota' },
  { cat: 'Beneficios para ti como dueño' },
  { cat: 'Descuentos de negocios verificados' },
];
let pageBannerTimers = {};
function renderPageBanner(containerId, slides){
  const el = document.getElementById(containerId);
  if(!el) return;
  clearInterval(pageBannerTimers[containerId]);
  slides = slides && slides.length ? slides : [{ cat: 'Mi Mascota Club' }];
  el.innerHTML = slides.map((s,i) => `
    <div class="page-banner-slide ${i===0?'active':''}" style="background:${s.img ? `url('${s.img}') center/cover no-repeat` : PAGE_BANNER_GRADIENTS[i % PAGE_BANNER_GRADIENTS.length]};">
      <div class="page-banner-overlay"></div>
      <div class="page-banner-text">
        <span class="page-banner-eyebrow">Mi Mascota Club</span>
        <h2 class="page-banner-cat">${s.cat}</h2>
      </div>
    </div>`).join('') +
    (slides.length > 1 ? `<div class="page-banner-dots">${slides.map((_,i)=>`<span class="page-banner-dot ${i===0?'active':''}" data-i="${i}" onclick="irASlideBanner('${containerId}',${i})"></span>`).join('')}</div>` : '');
  if(slides.length <= 1) return;
  let idx = 0;
  pageBannerTimers[containerId] = setInterval(() => {
    idx = (idx + 1) % slides.length;
    mostrarSlideBanner(containerId, idx);
  }, 5000);
}
function mostrarSlideBanner(containerId, idx){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.querySelectorAll('.page-banner-slide').forEach((s,i) => s.classList.toggle('active', i===idx));
  el.querySelectorAll('.page-banner-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
}
function irASlideBanner(containerId, idx){
  clearInterval(pageBannerTimers[containerId]);
  mostrarSlideBanner(containerId, idx);
  pageBannerTimers[containerId] = setInterval(() => {
    const el = document.getElementById(containerId);
    const total = el ? el.querySelectorAll('.page-banner-slide').length : 0;
    if(!total) return;
    const activo = [...el.querySelectorAll('.page-banner-slide')].findIndex(s=>s.classList.contains('active'));
    mostrarSlideBanner(containerId, (activo + 1) % total);
  }, 5000);
}

/* Navega DE VERDAD al directorio (cambia la URL con pushState) con los filtros dados.
   opts: { cat, tipo, comuna, q } — todos opcionales. */
function irADirectorio(opts){
  opts = opts || {};
  let path = '/directorio';
  if(opts.cat){
    const found = DIR_CATS_INDEX.find(c => c.cat === opts.cat && (!opts.tipo || c.tipo === opts.tipo));
    if(found) path += '/' + found.slug;
  }
  history.pushState({ directorio:true, ...opts }, '', path);
  mostrarPaginaDirectorio(opts);
}
/* Igual que irADirectorio, pero para la nueva vista /especialistas — solo cambia el
   prefijo de la URL y agrega la bandera "especialistas" que filtra el listado. */
function irAEspecialistas(opts){
  opts = opts || {};
  let path = '/especialistas';
  if(opts.cat){
    const found = DIR_CATS_INDEX.find(c => c.cat === opts.cat && (!opts.tipo || c.tipo === opts.tipo));
    if(found) path += '/' + found.slug;
  }
  history.pushState({ especialistas:true, ...opts }, '', path);
  mostrarPaginaDirectorio({ ...opts, especialistas:true });
}
/* Igual que las anteriores, pero para /beneficios — filtra el directorio para
   mostrar solo los negocios que tienen un beneficio de socio cargado
   (beneficioDetalle), en vez de la vista previa de 3 ejemplos que mostraba
   antes el menú desplegable "Beneficios" del nav. */
function irABeneficios(opts){
  opts = opts || {};
  let path = '/beneficios';
  if(opts.cat){
    const found = DIR_CATS_INDEX.find(c => c.cat === opts.cat && (!opts.tipo || c.tipo === opts.tipo));
    if(found) path += '/' + found.slug;
  }
  history.pushState({ beneficios:true, ...opts }, '', path);
  mostrarPaginaDirectorio({ ...opts, beneficios:true });
}
function volverAlInicio(){
  document.body.classList.remove('pagina-directorio');
  document.body.classList.remove('pagina-ficha');
  if(location.pathname !== '/') history.pushState({}, '', '/');
  window.scrollTo({ top:0, behavior:'smooth' });
}
function mostrarPaginaDirectorio(opts){
  opts = opts || {};
  document.body.classList.remove('pagina-ficha');
  document.body.classList.add('pagina-directorio');
  modoDirectorioEspecialistas = !!opts.especialistas;
  modoDirectorioBeneficios = !!opts.beneficios;
  const eyebrow = document.getElementById('dirEyebrow');
  if(eyebrow) eyebrow.textContent = modoDirectorioBeneficios ? 'Beneficios' : (modoDirectorioEspecialistas ? 'Especialistas' : 'Directorio');
  renderPageBanner('dirBanner', modoDirectorioBeneficios ? BANNER_BENEFICIOS : (modoDirectorioEspecialistas ? BANNER_ESPECIALISTAS : BANNER_DIRECTORIO));
  const featuredWrap = document.getElementById('featuredStripWrap');
  if(modoDirectorioEspecialistas || modoDirectorioBeneficios){
    if(featuredWrap) featuredWrap.style.display = 'none';
  } else {
    renderFeaturedStrip();
  }
  document.getElementById('dirSearch').value = opts.q || '';
  document.getElementById('dirCat').value = opts.cat || '';
  document.getElementById('dirComuna').value = opts.comuna || '';
  setDirTipo(opts.tipo || ''); // setDirTipo ya llama a renderDirectory()
  window.scrollTo({ top:0, behavior:'instant' in window.scrollTo ? 'instant' : 'auto' });
}
/* Lee la URL actual (al cargar la página o al usar atrás/adelante del navegador)
   y muestra la vista que corresponda: /directorio, /especialistas o /negocio/slug. */
function manejarRutaActual(){
  const path = location.pathname.replace(/\/+$/,'') || '/';
  const parts = path.split('/').filter(Boolean);
  if(parts[0] === 'directorio'){
    const found = parts[1] ? catBySlug(parts[1]) : null;
    mostrarPaginaDirectorio(found ? { cat: found.cat, tipo: found.tipo } : {});
  } else if(parts[0] === 'especialistas'){
    const found = parts[1] ? catBySlug(parts[1]) : null;
    mostrarPaginaDirectorio(found ? { cat: found.cat, tipo: found.tipo, especialistas:true } : { especialistas:true });
  } else if(parts[0] === 'beneficios'){
    const found = parts[1] ? catBySlug(parts[1]) : null;
    mostrarPaginaDirectorio(found ? { cat: found.cat, tipo: found.tipo, beneficios:true } : { beneficios:true });
  } else if(parts[0] === 'negocio' && parts[1]){
    mostrarPaginaFichaPorSlug(parts[1]);
  } else {
    document.body.classList.remove('pagina-directorio');
    document.body.classList.remove('pagina-ficha');
  }
}
window.addEventListener('popstate', manejarRutaActual);

/* ---------------- Flujo de entrada: elegir camino antes de mostrar el formulario ---------------- */
function irAMiMascota(){
  openModal(`
    <div style="text-align:center;padding:6px 2px 4px;">
      <h3 style="margin:0 0 6px;">🐾 Perfil de tu mascota</h3>
      <p style="font-size:13.5px;color:#5a6259;margin:0 0 22px;">
        Muy pronto vas a poder entrar aquí con un código para ver y completar el perfil de tu mascota (foto y datos finales).
        Si todavía no te has registrado, partamos por ahí.
      </p>
      <button type="button" class="btn btn-primary" style="width:100%;justify-content:center;" onclick="mostrarFormulario('dueno')">🐾 Quiero registrar mi mascota</button>
    </div>
  `);
}
function abrirElegirCamino(){
  openModal(`
    <div style="text-align:center;padding:6px 2px 4px;">
      <h3 style="margin:0 0 6px;">¿Cómo quieres unirte?</h3>
      <p style="font-size:13.5px;color:#5a6259;margin:0 0 22px;">Elige un camino para continuar.</p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button type="button" class="btn btn-brass" style="width:100%;justify-content:center;" onclick="mostrarFormulario('negocio')">🏪 Soy un negocio</button>
        <button type="button" class="btn btn-primary" style="width:100%;justify-content:center;" onclick="mostrarFormulario('dueno')">🐾 Quiero registrar mi mascota</button>
      </div>
    </div>
  `);
}
function mostrarFormulario(tipo){
  if(tipo === 'dueno'){
    // El registro de mascota ahora usa el formulario animado v3 (con verificación OTP)
    window.location.href = 'formulario-registro-demo-v3.html';
    return;
  }
  closeModal();
  // Si veníamos de la página del directorio, volvemos primero al inicio para
  // que el formulario aparezca en la página principal, como siempre.
  if(document.body.classList.contains('pagina-directorio')) volverAlInicio();
  const section = document.getElementById('negocios');
  const panelNegocio = document.getElementById('panelNegocio');
  const panelDueno = document.getElementById('duenos');
  const split = document.getElementById('negociosSplit');
  section.style.display = '';
  if(split) split.classList.add('single');
  if(tipo === 'negocio'){
    panelNegocio.style.display = '';
    panelDueno.style.display = 'none';
  }else{
    panelNegocio.style.display = 'none';
    panelDueno.style.display = '';
  }
  wizardReset('owner');
  wizardReset('biz');
  setTimeout(() => section.scrollIntoView({behavior:'smooth'}), 50);
}

/* ---------------- Wizard de pasos para los formularios de registro ---------------- */
const wizardState = { owner: 1, biz: 1 };
const wizardTotalSteps = { owner: 3, biz: 3 };

function wizardRender(prefix){
  const step = wizardState[prefix];
  document.querySelectorAll(`.form-step[data-wizard="${prefix}"]`).forEach(el=>{
    el.classList.toggle('active', Number(el.dataset.step) === step);
  });
  const indicator = document.getElementById(`wizardSteps-${prefix}`);
  if(indicator){
    indicator.querySelectorAll('.wizard-step').forEach(el=>{
      const n = Number(el.dataset.step);
      el.classList.toggle('active', n === step);
      el.classList.toggle('done', n < step);
    });
  }
}

function wizardValidarPaso(prefix, step){
  const stepEl = document.querySelector(`.form-step[data-wizard="${prefix}"][data-step="${step}"]`);
  if(!stepEl) return true;
  const invalidos = [];
  stepEl.querySelectorAll('input[required], select[required], textarea[required]').forEach(el=>{
    if(!el.checkValidity()) invalidos.push(el);
  });
  stepEl.querySelectorAll('.field-validated').forEach(f=>{
    const input = f.querySelector('input');
    if(input && input.hasAttribute('required') && !f.classList.contains('is-valid')){
      f.classList.add('is-invalid');
      if(!invalidos.includes(input)) invalidos.push(input);
    }
  });
  if(invalidos.length){
    invalidos[0].focus();
    toast('Revisa los datos marcados antes de continuar.');
    return false;
  }
  return true;
}

function wizardNext(prefix){
  if(!wizardValidarPaso(prefix, wizardState[prefix])) return;
  wizardState[prefix] = Math.min(wizardState[prefix] + 1, wizardTotalSteps[prefix]);
  wizardRender(prefix);
}
function wizardBack(prefix){
  wizardState[prefix] = Math.max(wizardState[prefix] - 1, 1);
  wizardRender(prefix);
}
function wizardReset(prefix){
  wizardState[prefix] = 1;
  wizardRender(prefix);
}

/* ---------------- Validación y formato en vivo: RUT, teléfono CL, correo ----------------
   Objetivo: que un dato mal escrito NUNCA pueda guardarse. Cada campo se formatea
   automáticamente mientras se escribe (un solo formato posible) y muestra un check
   verde + borde verde apenas queda válido, o el mensaje de error si no. */
function soloDigitos(v){ return (v||'').replace(/\D/g,''); }

function limpiarRut(v){ return (v||'').replace(/[^0-9kK]/g,'').toUpperCase(); }
function formatearRut(v){
  const limpio = limpiarRut(v).replace(/^0+(?=.)/,'');
  if(!limpio) return '';
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return cuerpoFmt ? `${cuerpoFmt}-${dv}` : dv;
}
function validarRut(v){
  const limpio = limpiarRut(v);
  if(limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if(!/^\d+$/.test(cuerpo)) return false;
  let suma = 0, multiplo = 2;
  for(let i = cuerpo.length - 1; i >= 0; i--){
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === dvEsperado;
}
function validarEmail(v){
  const s = (v||'').trim();
  // Formato general de correo: local@dominio.tld — sin espacios, sin puntos dobles,
  // sin empezar/terminar en punto, con un dominio y una extensión de al menos 2 letras.
  const re = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,24}$/;
  if(!re.test(s)) return false;
  if(/\.\./.test(s)) return false;
  const local = s.split('@')[0];
  const localLimpio = local.toLowerCase();
  // Rechaza correos obviamente inventados: la parte antes del @ hecha del mismo
  // carácter repetido (ej. "0000000000@gmail.com", "1111@hotmail.com" o "kkkkkk@gmail.com").
  if(/^(.)\1{3,}$/i.test(localLimpio)) return false;
  // Rechaza secuencias de teclado obvias como "asdf", "qwerty", "1234", "12345678".
  const SECUENCIAS_FALSAS = ['asdf','asdfg','qwerty','qwert','zxcv','1234','12345','123456','1234567','12345678'];
  if(SECUENCIAS_FALSAS.includes(localLimpio)) return false;
  // La parte local debe tener al menos 2 caracteres reales.
  if(localLimpio.replace(/[^a-z0-9]/g,'').length < 2) return false;
  return true;
}

function formatearTelefonoInput(v){
  const d = soloDigitos(v).slice(0, 8);
  return d.length > 4 ? d.slice(0,4) + ' ' + d.slice(4) : d;
}
function validarTelefonoParcial(v){
  const d = soloDigitos(v);
  if(d.length !== 8) return false;
  if(d[0] === '0') return false; // los celulares chilenos no empiezan con 0 tras el +56 9
  if(/^(\d)\1{7}$/.test(d)) return false; // rechaza números inventados como 0000 0000 o 1111 1111
  return true;
}
function telefonoCompleto(v){ return '+56 9 ' + formatearTelefonoInput(v); }

function marcarCampo(fieldEl, msgEl, estado, mensaje){
  fieldEl.classList.remove('is-valid', 'is-invalid');
  if(estado === 'valid') fieldEl.classList.add('is-valid');
  else if(estado === 'invalid') fieldEl.classList.add('is-invalid');
  if(msgEl) msgEl.textContent = mensaje || '';
}

function initRutField(inputId, fieldId, msgId){
  const input = document.getElementById(inputId), field = document.getElementById(fieldId), msg = document.getElementById(msgId);
  input.addEventListener('input', () => {
    input.value = formatearRut(input.value);
    input.setSelectionRange(input.value.length, input.value.length);
    if(!input.value){ marcarCampo(field, msg, null, ''); return; }
    marcarCampo(field, msg, validarRut(input.value) ? 'valid' : 'invalid',
      validarRut(input.value) ? 'RUT válido' : 'RUT inválido — revisa el dígito verificador');
  });
}
function initEmailField(inputId, fieldId, msgId){
  const input = document.getElementById(inputId), field = document.getElementById(fieldId), msg = document.getElementById(msgId);
  input.addEventListener('input', () => {
    if(!input.value.trim()){ marcarCampo(field, msg, null, ''); return; }
    marcarCampo(field, msg, validarEmail(input.value) ? 'valid' : 'invalid',
      validarEmail(input.value) ? 'Correo válido' : 'Ingresa un correo válido, ej: juan@mail.com');
  });
}
function initTelefonoField(inputId, fieldId, msgId){
  const input = document.getElementById(inputId), field = document.getElementById(fieldId), msg = document.getElementById(msgId);
  input.addEventListener('input', () => {
    input.value = formatearTelefonoInput(input.value);
    if(!input.value){ marcarCampo(field, msg, null, ''); return; }
    marcarCampo(field, msg, validarTelefonoParcial(input.value) ? 'valid' : 'invalid',
      validarTelefonoParcial(input.value) ? 'Número válido' : 'Ingresa los 8 dígitos de tu celular');
  });
}
function resetValidacionesForm(formEl){
  formEl.querySelectorAll('.field-validated').forEach(f=>{
    f.classList.remove('is-valid', 'is-invalid');
    const m = f.querySelector('.field-msg');
    if(m) m.textContent = '';
  });
}
function mostrarSeccion(id){
  if(document.body.classList.contains('pagina-directorio')) volverAlInicio();
  const el = document.getElementById(id);
  if(!el) return;
  el.style.display = '';
  setTimeout(() => el.scrollIntoView({behavior:'smooth'}), 50);
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3400);
}
function openModal(html){
  document.getElementById('modalBox').innerHTML = `<button class="modal-close" onclick="closeModal()">✕</button>${html}`;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal(){ document.getElementById('modalOverlay').classList.remove('show'); }
function formatCLP(n){ return '$' + Math.round(n).toLocaleString('es-CL'); }

async function loadAll(){
  try{
    const { data, error } = await supabase.from('negocios').select('*').order('created_at', { ascending: true });
    if(error) throw error;
    negociosReal = (data||[]).map(n => ({
      id: n.id, codigo: n.codigo, nombre: n.nombre, cat: n.cat, tipo: n.tipo, comuna: n.comuna,
      contacto: n.contacto, servicios: n.servicios, meta: n.meta, founderNumber: n.founder_number,
      beneficioTipo: n.beneficio_tipo, beneficioDetalle: n.beneficio_detalle,
      logo: n.logo, direccion: n.direccion, horario: n.horario, redesSociales: n.redes_sociales,
      descripcion: n.descripcion, verificado: n.verificado, createdAt: n.created_at, demo:false,
      esEspecialista: !!n.es_especialista, destacado: !!n.destacado
    }));
  }catch(e){ console.error(e); negociosReal = []; }
  try{
    const { data } = await supabase.rpc('contar_socios');
    sociosCount = data || 0;
  }catch(e){ sociosCount = 0; }
  try{
    const { data } = await supabase.rpc('contar_canjes');
    canjesCount = data || 0;
  }catch(e){ canjesCount = 0; }
  renderDirectory();
  updateCounts();
  renderDropdowns();
  renderTrustMarquee();
  const status = document.getElementById('dirStatus');
  if(status) status.style.display = 'none';
}

function updateCounts(){
  document.getElementById('bizCount').textContent = `${negociosReal.length} negocio${negociosReal.length===1?'':'s'} inscrito${negociosReal.length===1?'':'s'}`;
  document.getElementById('ownerCount').textContent = `${sociosCount} mascota${sociosCount===1?'':'s'} inscrita${sociosCount===1?'':'s'}`;
  const liveCounter = document.getElementById('liveBeneficiosCount');
  if(liveCounter) liveCounter.textContent = `${combinedNegocios().length} beneficios activos ahora`;
}

/* ---------------- Directorio ---------------- */
function combinedNegocios(){ return [...negociosReal, ...negociosSeed]; }

function refreshFilterOptions(){
  const all = combinedNegocios();
  const cats = [...new Set(all.map(n=>n.cat))];
  const comunas = [...new Set(all.map(n=>n.comuna))].sort();
  const catSelect = document.getElementById('dirCat'), comunaSelect = document.getElementById('dirComuna');
  const curCat = catSelect.value, curComuna = comunaSelect.value;
  catSelect.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c=>`<option ${c===curCat?'selected':''}>${c}</option>`).join('');
  comunaSelect.innerHTML = '<option value="">Todas las comunas</option>' + comunas.map(c=>`<option ${c===curComuna?'selected':''}>${c}</option>`).join('');
}

/* Íconos circulares de contacto para la tarjeta del directorio.
   Se arman solo con los datos que el negocio realmente completó al registrarse. */
function bizContactIcons(n){
  const icons = [];
  const contacto = n.contacto || '';
  const telefono = n.telefono || (contacto.match(/\+?56\s?9\s?\d{4}\s?\d{4}/) || [])[0] || '';
  const email = n.email || (contacto.match(/[^\s·|]+@[^\s·|]+\.[^\s·|]+/) || [])[0] || '';
  if(telefono){
    const digits = telefono.replace(/\D/g,'');
    const wa = digits.length===9 ? '56'+digits : digits.startsWith('56') ? digits : '56'+digits.replace(/^0+/,'');
    icons.push(`<a href="https://wa.me/${wa}" target="_blank" rel="noopener" class="biz-icon-btn primary" title="WhatsApp" onclick="event.stopPropagation()">💬</a>`);
  }
  if(email){
    icons.push(`<a href="mailto:${email}" class="biz-icon-btn${telefono?'':' primary'}" title="Correo" onclick="event.stopPropagation()">✉️</a>`);
  }
  if(n.redesSociales){
    const raw = n.redesSociales.trim();
    const url = /^https?:\/\//i.test(raw) ? raw : `https://instagram.com/${raw.replace(/^@/,'')}`;
    icons.push(`<a href="${url}" target="_blank" rel="noopener" class="biz-icon-btn" title="Instagram / sitio web" onclick="event.stopPropagation()">📷</a>`);
  }
  if(n.direccion){
    const q = encodeURIComponent(`${n.direccion}, ${n.comuna}`);
    icons.push(`<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener" class="biz-icon-btn" title="Cómo llegar" onclick="event.stopPropagation()">📍</a>`);
  }
  if(n.horario){
    icons.push(`<span class="biz-icon-btn" title="Horario: ${n.horario}" onclick="event.stopPropagation()">🕒</span>`);
  }
  return icons.length ? `<div class="biz-icons-row">${icons.join('')}</div>` : '';
}

/* Palabras genéricas que no aportan al buscar (para que "Necesito un paseador"
   encuentre igual la categoría "Paseador" en vez de buscar la frase completa). */
const BUSQUEDA_STOPWORDS = new Set(['necesito','quiero','busco','buscar','buscando','un','una','unos','unas','el','la','los','las','de','del','al','en','con','para','mi','tu','que','algo','algun','alguna']);
function palabrasClaveBusqueda(q){
  return q.toLowerCase().split(/\s+/).filter(w => w && !BUSQUEDA_STOPWORDS.has(w));
}
/* Contenido interno (sin el <div class="biz-card"> exterior) de una tarjeta del
   directorio. Se comparte entre la grilla normal y la fila de "Destacados" para no
   duplicar el markup. destacado=true agrega la etiqueta ★ Destacado en vez del badge
   normal (Ejemplo / Verificado / Fundador #). */
function bizCardInnerHTML(n, destacado){
  const headerBg = n.tipo === 'dueno' ? 'linear-gradient(135deg, #FFE699, var(--yellow))' : 'linear-gradient(135deg, #B9EDED, var(--teal))';
  const badge = destacado ? '★ Destacado' : (n.demo ? 'Ejemplo' : (n.verificado ? '✓ Verificado' : 'Fundador #'+String(n.founderNumber||'').padStart(3,'0')));
  return `
      <div class="biz-photo" style="background:${n.logo ? '#fff' : headerBg};">
        <span class="founder-badge${destacado?' badge-destacado':''}">${badge}</span>
        ${n.logo ? `<img src="${n.logo}" alt="${n.nombre}" style="width:70px;height:70px;object-fit:cover;border-radius:14px;">` : (iconByCat[n.cat]||'🐾')}
      </div>
      <div class="biz-body">
        <h3>${n.nombre}</h3>
        <div class="biz-cat"><span class="${n.tipo==='dueno'?'tag-dueno':''}">${n.cat}</span> · ${n.comuna}</div>
        <div class="biz-meta">${n.meta||'Negocio fundador del club.'}</div>
        ${n.beneficioDetalle ? `<div class="biz-meta" style="color:var(--teal-dark);font-weight:700;margin-top:4px;">🎁 ${n.beneficioTipo}: ${n.beneficioDetalle}</div>` : ''}
        ${bizContactIcons(n)}
      </div>`;
}
function renderDirectory(){
  refreshFilterOptions();
  const qRaw = document.getElementById('dirSearch').value.trim().toLowerCase();
  const cat = document.getElementById('dirCat').value, comuna = document.getElementById('dirComuna').value;
  const grid = document.getElementById('dirGrid');
  const keywords = qRaw ? palabrasClaveBusqueda(qRaw) : [];
  const filtered = combinedNegocios().filter(n => {
    const texto = `${n.nombre} ${n.cat} ${n.comuna} ${n.meta||''} ${n.servicios||''} ${n.descripcion||''}`.toLowerCase();
    const coincideBusqueda = !qRaw || (keywords.length ? keywords.some(k => texto.includes(k)) : texto.includes(qRaw));
    return coincideBusqueda && (!cat || n.cat===cat) && (!comuna || n.comuna===comuna) &&
      (!dirTipoFiltro || n.tipo===dirTipoFiltro) &&
      (!modoDirectorioEspecialistas || n.esEspecialista===true) &&
      (!modoDirectorioBeneficios || !!n.beneficioDetalle);
  });
  grid.innerHTML = '';
  if(filtered.length===0){
    const msg = modoDirectorioBeneficios
      ? 'Todavía no hay beneficios cargados con esos filtros.'
      : modoDirectorioEspecialistas
      ? 'Todavía no hay especialistas registrados con esos filtros.'
      : 'No encontramos negocios con esos filtros todavía.';
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">${msg} Sé el primero en <a href="#negocios" onclick="event.preventDefault(); abrirElegirCamino();" style="color:var(--brass);text-decoration:underline;">sumar tu ficha</a>.</div>`;
    return;
  }
  filtered.forEach(n=>{
    const el = document.createElement('div');
    el.className='biz-card';
    el.innerHTML = bizCardInnerHTML(n, false);
    el.addEventListener('click', ()=>irANegocio(n));
    grid.appendChild(el);
  });
}

/* Fila de negocios "Destacados" arriba del directorio (antes del listado completo).
   Se eligen a mano en Supabase: columna "destacado" (boolean) en la tabla negocios —
   no hay ninguna lógica automática de selección. Máximo 10 a la vez. */
function renderFeaturedStrip(){
  const wrap = document.getElementById('featuredStripWrap');
  const track = document.getElementById('featuredStrip');
  if(!track || !wrap) return;
  const destacados = combinedNegocios().filter(n => n.destacado === true).slice(0, 10);
  if(!destacados.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  track.innerHTML = '';
  destacados.forEach(n=>{
    const el = document.createElement('div');
    el.className='biz-card';
    el.innerHTML = bizCardInnerHTML(n, true);
    el.addEventListener('click', ()=>irANegocio(n));
    track.appendChild(el);
  });
}

/* ---------------- Ficha de negocio/especialista como página propia (/negocio/slug) ----------------
   Antes esto era un modal (showFicha). Ahora es una vista a pantalla completa, con el
   mismo banner con degradado/foto que el resto de las páginas nuevas, para que se vea
   igual de cuidada que el directorio — los datos siguen siendo exactamente los mismos
   que ya se guardaban en Supabase, solo cambia cómo se muestran. */
function negocioSlug(n){ return slugify(n.nombre) || 'negocio'; }
/* Nota/limitación conocida (igual que con las categorías): si algún día dos negocios
   tienen el mismo nombre exacto, esta búsqueda por slug encuentra el primero. No afecta
   la navegación normal del sitio (siempre se hace clic en la tarjeta correcta). */
function negocioPorSlug(slug){ return combinedNegocios().find(n => negocioSlug(n) === slug) || null; }

function irANegocio(n){
  history.pushState({ negocio:true, slug: negocioSlug(n) }, '', '/negocio/' + negocioSlug(n));
  mostrarPaginaFicha(n);
}
function mostrarPaginaFichaPorSlug(slug){
  const n = negocioPorSlug(slug);
  if(n){ mostrarPaginaFicha(n); return; }
  document.body.classList.remove('pagina-directorio');
  document.body.classList.add('pagina-ficha');
  document.getElementById('fichaContent').innerHTML = `<div class="empty-state">No encontramos esta ficha. <a href="/directorio" onclick="event.preventDefault(); irADirectorio({});" style="color:var(--brass);text-decoration:underline;">Volver al directorio →</a></div>`;
}
function mostrarPaginaFicha(n){
  document.body.classList.remove('pagina-directorio');
  document.body.classList.add('pagina-ficha');
  renderPageBanner('fichaBanner', [{ cat: n.nombre, img: n.logo || null }]);
  document.getElementById('fichaContent').innerHTML = renderFichaContenido(n);
  window.scrollTo({ top:0, behavior:'instant' in window.scrollTo ? 'instant' : 'auto' });
  if(!n.demo && n.codigo) cargarReputacionNegocio(n);
}
function renderFichaContenido(n){
  return `
    <div class="ficha-page">
      <div class="ficha-page-main">
        ${n.logo ? `<img src="${n.logo}" alt="${n.nombre}" class="ficha-page-logo">` : `<div class="ficha-page-icon">${iconByCat[n.cat]||'🐾'}</div>`}
        <h1>${n.nombre} ${n.verificado ? '<span style="color:var(--teal-dark);font-size:15px;">✓ Verificado</span>' : (n.esEspecialista ? '<span style="color:var(--teal-dark);font-size:15px;">🧑‍⚕️ Especialista</span>' : '')}</h1>
        <div class="biz-cat">${n.cat} · ${n.comuna}</div>
        ${n.descripcion ? `<p style="font-size:14.5px;color:#3a3a3a;line-height:1.6;margin:16px 0;">${n.descripcion}</p>` : ''}
        ${n.beneficioDetalle ? `<div class="biz-meta" style="color:var(--teal-dark);font-weight:700;font-size:14.5px;margin:8px 0 4px;">🎁 Beneficio de socio — ${n.beneficioTipo}: ${n.beneficioDetalle}</div>` : ''}
        ${!n.demo && n.codigo ? `<div id="repSummaryBox" class="rep-empty">Cargando reputación…</div>` : ''}
        ${bizContactIcons(n)}
      </div>
      <div class="ficha-page-side">
        <div class="row"><span>Estado</span><b style="color:var(--forest-2);">${n.demo ? 'Ejemplo de directorio' : 'Activo · gratis (piloto)'}</b></div>
        <div class="row"><span>Tipo de beneficio</span><b>${n.tipo==='dueno' ? 'Para el dueño' : 'Para la mascota'}</b></div>
        ${n.servicios ? `<div class="row"><span>Especialidad</span><b>${n.servicios}</b></div>` : ''}
        ${n.direccion ? `<div class="row"><span>Dirección</span><b>${n.direccion}</b></div>` : ''}
        ${n.horario ? `<div class="row"><span>Horario</span><b>${n.horario}</b></div>` : ''}
        ${n.redesSociales ? `<div class="row"><span>Redes / contacto</span><b>${n.redesSociales}</b></div>` : ''}
        ${!n.demo ? `<div class="row"><span>N° fundador</span><b>#${String(n.founderNumber||'').padStart(3,'0')}</b></div>` : ''}
        ${!n.demo ? `<div class="row"><span>Código</span><b>${n.codigo||'—'}</b></div>` : ''}
      </div>
    </div>
    <div style="margin-top:18px;font-size:12.5px;color:#5a6259;">← <a href="/directorio" onclick="event.preventDefault(); irADirectorio({});" style="color:var(--brass);text-decoration:underline;">Volver al directorio</a></div>
  `;
}

/* ---------------- Carnet + QR ---------------- */
function updateCard(){
  const name = document.getElementById('petName').value.trim();
  const species = document.getElementById('petSpecies').value;
  const breed = document.getElementById('petBreed').value.trim();
  const comuna = document.getElementById('ownerComuna').value.trim();
  document.getElementById('credName').textContent = name || 'Tu mascota';
  document.getElementById('credBreed').textContent = breed ? `${species} · ${breed}` : (name ? species : 'Escribe su nombre para previsualizar →');
  document.getElementById('credComuna').textContent = comuna || 'Santiago';
}
function renderQR(elId, text){
  const el = document.getElementById(elId);
  if(!el) return;
  el.innerHTML = '';
  try{
    if(typeof QRCode !== 'undefined'){ new QRCode(el, { text, width:120, height:120, correctLevel: QRCode.CorrectLevel.M }); }
    else { el.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;text-align:center;">${text}</div>`; }
  }catch(e){ el.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;text-align:center;">${text}</div>`; }
}

/* ---------------- Compartir carnet en Instagram (SIN código ni QR) ---------------- */
function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath(); ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
}
function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}
function drawImageCover(ctx, img, x, y, w, h){
  const ir = img.width / img.height, tr = w / h;
  let sx, sy, sw, sh;
  if(ir > tr){ sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function drawPawIcon(ctx, cx, cy, size, color){
  ctx.fillStyle = color;
  const padR = size * 0.16;
  [[-0.32,-0.38],[-0.11,-0.5],[0.11,-0.5],[0.32,-0.38]].forEach(([dx,dy]) => {
    ctx.beginPath(); ctx.arc(cx + dx*size, cy + dy*size, padR, 0, Math.PI*2); ctx.fill();
  });
  ctx.beginPath(); ctx.ellipse(cx, cy + 0.08*size, size*0.28, size*0.22, 0, 0, Math.PI*2); ctx.fill();
}
async function generateShareCardBlob(record){
  try{
    if(document.fonts && document.fonts.load){
      await Promise.all([document.fonts.load('900 84px Lato'), document.fonts.load('900 52px Lato'),
        document.fonts.load('700 40px Lato'), document.fonts.load('600 34px Lato')]);
    }
  }catch(e){}
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, '#1E1E1E'); grad.addColorStop(1, '#111111');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  ctx.globalAlpha = 0.07;
  for(let i=0;i<12;i++){ drawPawIcon(ctx, Math.random()*W, Math.random()*H, 60+Math.random()*70, '#FFCE00'); }
  ctx.globalAlpha = 1;
  const pad = 64;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, pad, 230, W-pad*2, 1260, 52); ctx.fill();
  const photoSize = 420, photoY = 320;
  ctx.save();
  ctx.beginPath(); ctx.arc(W/2, photoY+photoSize/2, photoSize/2, 0, Math.PI*2); ctx.closePath(); ctx.clip();
  if(record.foto){
    try{ const img = await loadImage(record.foto); drawImageCover(ctx, img, W/2-photoSize/2, photoY, photoSize, photoSize); }
    catch(e){ ctx.fillStyle = '#47C9C9'; ctx.fillRect(W/2-photoSize/2, photoY, photoSize, photoSize); }
  } else { ctx.fillStyle = '#47C9C9'; ctx.fillRect(W/2-photoSize/2, photoY, photoSize, photoSize); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(W/2, photoY+photoSize/2, photoSize/2, 0, Math.PI*2);
  ctx.lineWidth = 14; ctx.strokeStyle = '#FFCE00'; ctx.stroke();
  if(!record.foto){ drawPawIcon(ctx, W/2, photoY+photoSize/2, photoSize*0.45, '#FFFFFF'); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#151515';
  ctx.font = '900 84px Lato, sans-serif';
  ctx.fillText(record.pet || 'Mi mascota', W/2, photoY+photoSize+110);
  ctx.font = '700 38px Lato, sans-serif'; ctx.fillStyle = '#6B7280';
  const sub = record.breed ? `${record.species} · ${record.breed}` : (record.species || '');
  ctx.fillText(sub, W/2, photoY+photoSize+170);
  ctx.font = '900 36px Lato, sans-serif'; ctx.fillStyle = '#2FA8A8';
  ctx.fillText('🐾  ' + planLabel(record.plan).toUpperCase(), W/2, photoY+photoSize+250);
  ctx.font = '600 32px Lato, sans-serif'; ctx.fillStyle = '#1A1A1A';
  ctx.fillText(record.comuna || '', W/2, photoY+photoSize+305);
  drawPawIcon(ctx, W/2-150, H-150, 56, '#FFCE00');
  ctx.textAlign = 'left'; ctx.font = '900 50px Lato, sans-serif'; ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Mi Mascota Club', W/2-95, H-130);
  ctx.textAlign = 'center'; ctx.font = '600 28px Lato, sans-serif'; ctx.fillStyle = '#B0B0B0';
  ctx.fillText('Únete gratis · link en bio', W/2, H-70);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
}
async function compartirCarne(record){
  if(!record){ toast('Primero busca o crea tu carnet.'); return; }
  try{
    const blob = await generateShareCardBlob(record);
    const fileName = `carne-${(record.pet||'mascota').toString().trim().replace(/\s+/g,'-').toLowerCase()}.png`;
    let compartido = false;
    if(navigator.canShare && navigator.share){
      try{
        const file = new File([blob], fileName, { type: 'image/png' });
        if(navigator.canShare({ files:[file] })){
          await navigator.share({ files:[file], title:'Mi Mascota Club', text:`¡${record.pet} ya es parte de Mi Mascota Club! 🐾` });
          compartido = true;
        }
      }catch(shareErr){}
    }
    if(!compartido){
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('¡Imagen lista! Descárgala y súbela a tu historia de Instagram.');
    }
  }catch(err){ console.error(err); toast('No se pudo generar la imagen. Intenta de nuevo.'); }
}

/* ---------------- Mapa (Leaflet + OpenStreetMap, gratis, sin llave) ----------------
   Como todavía no pedimos dirección exacta al registrar un negocio, ubicamos cada
   uno en el centro aproximado de su comuna (con un pequeño desplazamiento aleatorio
   para que no queden todos exactamente en el mismo punto). Cuando más adelante
   pidamos dirección exacta, se puede afinar la precisión sin rehacer el mapa.
------------------------------------------------------------------------------- */
const COMUNA_COORDS = {
  "Santiago":[-33.4489,-70.6693], "Providencia":[-33.4260,-70.6088], "Ñuñoa":[-33.4558,-70.5987],
  "Las Condes":[-33.4089,-70.5693], "Vitacura":[-33.3789,-70.5678], "La Reina":[-33.4419,-70.5344],
  "Macul":[-33.4881,-70.5978], "San Bernardo":[-33.5928,-70.7008], "Peñalolén":[-33.4831,-70.5364],
  "La Florida":[-33.5228,-70.5928], "Maipú":[-33.5167,-70.7500], "Puente Alto":[-33.6119,-70.5756],
  "Recoleta":[-33.4064,-70.6394], "Independencia":[-33.4189,-70.6644], "Quilicura":[-33.3600,-70.7300],
  "Huechuraba":[-33.3667,-70.6333], "Estación Central":[-33.4597,-70.6797], "San Miguel":[-33.4964,-70.6503],
  "La Cisterna":[-33.5322,-70.6656], "Lo Barnechea":[-33.3550,-70.5150], "Cerrillos":[-33.4989,-70.7089],
  "Conchalí":[-33.3833,-70.6667], "Renca":[-33.4033,-70.7217], "Pudahuel":[-33.4419,-70.7581]
};
const SANTIAGO_CENTER = [-33.4489,-70.6693];
let mapaLeaflet = null, mapaMarkers = [];

function coordsParaComuna(comuna){
  const base = COMUNA_COORDS[comuna] || SANTIAGO_CENTER;
  const jitter = () => (Math.random()-0.5)*0.012;
  return [base[0]+jitter(), base[1]+jitter()];
}

function abrirMapa(categoriaFiltro){
  document.getElementById('mapModalTitle').textContent = categoriaFiltro
    ? `Mapa · ${categoriaFiltro}` : 'Mapa de Mi Mascota Club';
  document.getElementById('mapModalOverlay').classList.add('show');

  setTimeout(() => {
    if(!mapaLeaflet){
      mapaLeaflet = L.map('mapContainer').setView(SANTIAGO_CENTER, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(mapaLeaflet);
    } else {
      mapaLeaflet.invalidateSize();
    }

    mapaMarkers.forEach(m => mapaLeaflet.removeLayer(m));
    mapaMarkers = [];

    const negociosAMostrar = combinedNegocios().filter(n => !categoriaFiltro || n.cat === categoriaFiltro);
    negociosAMostrar.forEach(n => {
      const [lat, lng] = coordsParaComuna(n.comuna);
      const marker = L.marker([lat, lng]).addTo(mapaLeaflet);
      marker.bindPopup(`
        <b>${n.nombre}</b><br>${iconByCat[n.cat]||'🐾'} ${n.cat} · ${n.comuna}
        ${n.beneficioDetalle ? `<br>🎁 ${n.beneficioTipo}: ${n.beneficioDetalle}` : ''}
      `);
      mapaMarkers.push(marker);
    });

    if(negociosAMostrar.length > 0){
      const grupo = L.featureGroup(mapaMarkers);
      mapaLeaflet.fitBounds(grupo.getBounds().pad(0.3));
    }

    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos => {
        const tuUbicacion = [pos.coords.latitude, pos.coords.longitude];
        L.circleMarker(tuUbicacion, { radius:9, fillColor:'#47C9C9', fillOpacity:0.9, color:'#fff', weight:3 })
          .addTo(mapaLeaflet).bindPopup('📍 Tú estás aquí');
        mapaLeaflet.setView(tuUbicacion, 13);
      }, () => { /* si no da permiso, se queda centrado en Santiago, sin problema */ });
    }
  }, 50);
}

function cerrarMapa(){
  document.getElementById('mapModalOverlay').classList.remove('show');
}

/* ---------------- Menús desplegables del nav ---------------- */
function toggleDropdown(id){
  const el = document.getElementById(id);
  const dropdown = el.closest('.nav-dropdown');
  const yaAbierto = dropdown.classList.contains('open');
  document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
  if(!yaAbierto) dropdown.classList.add('open');
}
document.addEventListener('click', (e) => {
  if(!e.target.closest('.nav-dropdown')){
    document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
  }
});

function renderDropdowns(){
  const ddMascota = document.getElementById('ddMascotaList');
  const ddDueno = document.getElementById('ddDuenoList');
  if(ddMascota){
    ddMascota.innerHTML = CATS_MASCOTA.map(c => `<button class="dd-item" onclick="filtrarPorCategoria('${c.replace(/'/g,"\\'")}','mascota'); toggleDropdown('exploreDropdown');">${iconByCat[c]||'🐾'} ${c}</button>`).join('');
  }
  if(ddDueno){
    ddDueno.innerHTML = CATS_DUENO.map(c => `<button class="dd-item" onclick="filtrarPorCategoria('${c.replace(/'/g,"\\'")}','dueno'); toggleDropdown('exploreDropdown');">${iconByCat[c]||'🎁'} ${c}</button>`).join('');
  }
  // El menú "Beneficios" del nav ya no es un desplegable con 3 ejemplos — ahora es
  // un link directo a /beneficios (ver irABeneficios), que reutiliza la misma vista
  // del directorio filtrada a negocios con beneficioDetalle cargado.
}

/* ---------------- Buscador animado del hero ---------------- */
const HERO_SUGERENCIAS = [
  "Necesito una veterinaria...", "¿Dónde baño a mi perro?", "Necesito comida...", "¿Dónde venden esto?",
  "Quiero un hotel para mi perro...", "Quiero un paseador...", "Quiero comprar algo...",
  "Quiero encontrar algo cerca...", "¿Hay algún descuento?", "Quiero guardar la información de mi mascota...",
  "Quiero beneficios..."
];
let heroSugIndex = 0;
function rotarSugerenciaHero(){
  const input = document.getElementById('heroSearch');
  if(!input || document.activeElement === input) { heroSugIndex = (heroSugIndex+1)%HERO_SUGERENCIAS.length; return; }
  heroSugIndex = (heroSugIndex+1) % HERO_SUGERENCIAS.length;
  input.style.opacity = '0';
  setTimeout(() => { input.placeholder = HERO_SUGERENCIAS[heroSugIndex]; input.style.opacity = '1'; }, 200);
}
function irABuscar(){
  const heroInput = document.getElementById('heroSearch');
  const q = heroInput.value.trim();
  irADirectorio({ q });
  setTimeout(() => document.getElementById('dirSearch').focus(), 300);
}

/* ---------------- Carrusel circular de categorías (hero) ---------------- */
const FAN_CARDS = [
  {emoji:'🩺', label:'Veterinaria', bg:'linear-gradient(135deg,#B9EDED,var(--teal))', cat:'Veterinaria', tipo:'mascota'},
  {emoji:'☕', label:'Café pet-friendly', bg:'linear-gradient(135deg,#FFE699,var(--yellow))', cat:'Café', tipo:'dueno'},
  {emoji:'🏓', label:'Cancha de pádel', bg:'linear-gradient(135deg,#B9EDED,var(--teal))', cat:'Deporte', tipo:'dueno'},
  {emoji:'✂️', label:'Peluquería', bg:'linear-gradient(135deg,#FFE699,var(--yellow))', cat:'Peluquería', tipo:'mascota'},
  {emoji:'🦮', label:'Paseador', bg:'linear-gradient(135deg,#B9EDED,var(--teal))', cat:'Paseador', tipo:'mascota'},
  {emoji:'🍽️', label:'Restaurante', bg:'linear-gradient(135deg,#FFE699,var(--yellow))', cat:'Restaurante', tipo:'dueno'},
  {emoji:'🏨', label:'Hotel / guardería', bg:'linear-gradient(135deg,#B9EDED,var(--teal))', cat:'Hotel / Pensión', tipo:'mascota'},
  {emoji:'🛍️', label:'Tienda', bg:'linear-gradient(135deg,#FFE699,var(--yellow))', cat:'Tienda', tipo:'mascota'},
  {emoji:'🏋️', label:'Adiestramiento', bg:'linear-gradient(135deg,#B9EDED,var(--teal))', cat:'Adiestramiento', tipo:'mascota'},
  {emoji:'💈', label:'Barbería', bg:'linear-gradient(135deg,#FFE699,var(--yellow))', cat:'Barbería', tipo:'dueno'},
];
function renderFanCarousel(){
  const track = document.getElementById('fanTrack');
  if(!track) return;
  const html = FAN_CARDS.map(c => `<div class="fan-card" style="background:${c.bg};" onclick="filtrarPorCategoria('${c.cat.replace(/'/g,"\\'")}','${c.tipo}')"><div class="fan-emoji">${c.emoji}</div><div class="fan-label">${c.label}</div></div>`).join('');
  track.innerHTML = html + html; // duplicado para el loop continuo
}

/* ---------------- Marquesina de negocios fundadores ---------------- */
/* ---------------- Marquesina de negocios verificados ----------------
   NOTA: por ahora muestra cualquier negocio registrado. Cuando se construya
   el sistema de planes pagados para negocios (Presencia/Destacado/Premium),
   este filtro debe cambiar a mostrar solo los que tengan verificado = true.
------------------------------------------------------------------------- */
function renderTrustMarquee(){
  const track = document.getElementById('trustTrack');
  if(!track) return;
  const reales = negociosReal.slice(0,6).map(n => `<div class="trust-card real" onclick="filtrarPorNegocio('${n.nombre.replace(/'/g,"\\'")}')">✓ ${n.nombre}</div>`);
  const faltan = Math.max(10 - reales.length, 4);
  const placeholders = Array.from({length:faltan}, () => `<div class="trust-card" onclick="abrirElegirCamino()">➕ Tu negocio aquí</div>`);
  const html = [...reales, ...placeholders].join('');
  track.innerHTML = html + html;
}

/* ---------------- Formularios ---------------- */
document.getElementById('bizForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const btn = document.getElementById('bizSubmitBtn');
  const nombre = document.getElementById('bizName').value.trim();
  const cat = document.getElementById('bizCat').value;
  const comuna = document.getElementById('bizComuna').value.trim();
  const bizEmailVal = document.getElementById('bizEmail').value.trim();
  const bizTelefonoRaw = document.getElementById('bizTelefono').value.trim();
  const bizTelefonoVal = bizTelefonoRaw ? telefonoCompleto(bizTelefonoRaw) : '';
  const servicios = document.getElementById('bizServicios').value.trim();
  const beneficioTipo = document.getElementById('bizBeneficioTipo').value;
  const beneficioDetalle = document.getElementById('bizBeneficioDetalle').value.trim();
  const direccion = document.getElementById('bizDireccion').value.trim();
  const horario = document.getElementById('bizHorario').value.trim();
  const redes = document.getElementById('bizRedes').value.trim();
  const descripcion = document.getElementById('bizDescripcion').value.trim();
  const logoFile = document.getElementById('bizLogo').files[0];
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Guardando...';
  try{
    const logo = await compressImage(logoFile, 300, 0.7);
    const { data, error } = await supabase.rpc('registrar_negocio', {
      p_nombre: nombre, p_cat: cat, p_tipo: bizTipoActual, p_comuna: comuna, p_email: bizEmailVal, p_telefono: bizTelefonoVal,
      p_servicios: servicios, p_beneficio_tipo: beneficioTipo, p_beneficio_detalle: beneficioDetalle,
      p_logo: logo, p_direccion: direccion, p_horario: horario, p_redes_sociales: redes, p_descripcion: descripcion,
      p_es_especialista: bizEsEspecialista
    });
    if(error) throw error;
    const { codigo, founder_number } = data[0];
    const record = { nombre, cat, tipo: bizTipoActual, comuna, email: bizEmailVal, telefono: bizTelefonoVal, codigo, servicios,
      beneficioTipo, beneficioDetalle, logo, direccion, horario, redesSociales: redes, descripcion,
      meta: servicios || `${cat} en ${comuna}.`, founderNumber: founder_number, demo:false,
      esEspecialista: bizEsEspecialista, destacado:false };
    negociosReal.push(record);
    updateCounts(); renderDirectory(); renderTrustMarquee();
    const row = document.createElement('div');
    row.className='waitlist-item';
    row.innerHTML = `<span>${nombre} — ${cat}</span><span class="small">${comuna} · ${codigo}</span>`;
    document.getElementById('bizList').prepend(row);
    this.reset(); setBizTipo('mascota'); setBizEsEspecialista(false); resetValidacionesForm(this); wizardReset('biz'); resetRegionComuna('biz');
    openModal(`
      <div class="ficha">
        ${logo ? `<img src="${logo}" alt="${nombre}" style="width:56px;height:56px;object-fit:cover;border-radius:14px;margin-bottom:14px;">` : `<div class="ficha-icon">${iconByCat[cat]||'🐾'}</div>`}
        <h3>${nombre}</h3>
        <div class="biz-cat">${cat} · ${comuna}</div>
        <div class="row"><span>Estado</span><b style="color:var(--forest-2);">Guardado · gratis durante el piloto</b></div>
        <div class="row"><span>Código de negocio</span><b>${codigo}</b></div>
        ${bizEmailVal ? `<div class="row"><span>Correo</span><b>${bizEmailVal}</b></div>` : ''}
        ${bizTelefonoVal ? `<div class="row"><span>Teléfono</span><b>${bizTelefonoVal}</b></div>` : ''}
        ${servicios ? `<div class="row"><span>Especialidad</span><b>${servicios}</b></div>` : ''}
        ${beneficioDetalle ? `<div class="row"><span>Beneficio</span><b>${beneficioTipo}: ${beneficioDetalle}</b></div>` : ''}
      </div>
      <div style="margin-top:16px;font-size:13px;">¡Listo! Guarda tu <b>código de negocio (${codigo})</b>: lo necesitas para validar visitas de socios en la sección "Validar visita".</div>
    `);
    enviarCorreoBienvenida({
      to_email: bizEmailVal,
      to_name: nombre,
      tipo_registro: 'negocio',
      codigo: codigo,
      mensaje_extra: 'El mundo es mejor gracias a las personas que cuidan tan bien a sus clientes con mascota — y tú ahora eres parte de este club que lo demuestra todos los días.'
    });
  }catch(err){ console.error(err); toast('No se pudo guardar tu negocio. Intenta de nuevo.'); }
  finally{ btn.disabled = false; btn.textContent = 'Quiero ser negocio fundador'; }
});

document.getElementById('ownerForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const btn = document.getElementById('ownerSubmitBtn');
  const pet = document.getElementById('petName').value.trim();
  const species = document.getElementById('petSpecies').value;
  const breed = document.getElementById('petBreed').value.trim();
  const comuna = document.getElementById('ownerComuna').value.trim();
  const email = document.getElementById('ownerEmail').value.trim();
  const edad = document.getElementById('petEdad').value.trim();
  const peso = document.getElementById('petPeso').value.trim();
  const tamano = document.getElementById('petTamano').value;
  const repNombre = document.getElementById('ownerRepNombre').value.trim();
  const repRut = document.getElementById('ownerRepRut').value.trim();
  const repTelefonoRaw = document.getElementById('ownerRepTelefono').value.trim();
  const repTelefono = repTelefonoRaw ? telefonoCompleto(repTelefonoRaw) : '';
  const notasMedicas = document.getElementById('petNotas').value.trim();
  const fotoFile = document.getElementById('petFoto').files[0];
  const doc1File = document.getElementById('petDoc1').files[0];
  const doc2File = document.getElementById('petDoc2').files[0];
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Guardando...';
  try{
    const foto = await compressImage(fotoFile, 360, 0.6);
    const doc1 = await compressImage(doc1File, 700, 0.5);
    const doc2 = await compressImage(doc2File, 700, 0.5);
    const documentos = [doc1, doc2].filter(Boolean);
    const { data, error } = await supabase.rpc('registrar_socio', {
      p_pet: pet, p_species: species, p_breed: breed, p_comuna: comuna, p_email: email,
      p_edad: edad, p_peso: peso, p_tamano: tamano,
      p_representante_nombre: repNombre, p_representante_rut: repRut, p_representante_telefono: repTelefono,
      p_foto: foto, p_documentos: documentos, p_notas_medicas: notasMedicas
    });
    if(error) throw error;
    const { codigo, socio_number } = data[0];
    sociosCount++;
    const record = { pet, species, breed, comuna, email, codigo, socioNumber: socio_number, foto, plan: 'free' };
    updateCounts();
    document.getElementById('credId').textContent = codigo;
    renderQR('credQR', codigo);
    const row = document.createElement('div');
    row.className='waitlist-item';
    row.innerHTML = `<span>${pet}</span><span class="small">${comuna} · ${codigo}</span>`;
    document.getElementById('ownerList').prepend(row);
    this.reset(); updateCard(); resetValidacionesForm(this); wizardReset('owner'); resetRegionComuna('owner');
    openModal(`
      <div class="credencial" style="width:100%;transform:none;">
        <div class="cred-badge">${planLabel('free')}</div>
        <div class="cred-top"><div class="cred-brand">MI MASCOTA CLUB</div><div class="cred-id">${codigo}</div></div>
        <div class="cred-name">${pet}</div>
        <div class="cred-breed">${breed ? species+' · '+breed : species}</div>
        <div id="modalQR" class="cred-qr"></div>
        <div class="cred-row" style="margin-top:14px;"><div>Comuna<b>${comuna}</b></div><div>Estado<b style="color:var(--sage);">Activo</b></div></div>
      </div>
      <div style="margin-top:16px;font-size:13px;">¡El carnet de ${pet} quedó guardado! Muéstrale este código QR al negocio cuando lo visites para validar tu descuento de socio.</div>
      <button type="button" id="modalShareBtn" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:14px;">📤 Compartir en Instagram</button>
      <div style="margin-top:8px;font-size:11.5px;color:#8a8a8a;text-align:center;">La imagen para compartir no incluye tu código ni tu QR — es segura de publicar.</div>
    `);
    renderQR('modalQR', codigo);
    document.getElementById('modalShareBtn').addEventListener('click', () => compartirCarne(record));
    enviarCorreoBienvenida({
      to_email: email,
      to_name: repNombre || pet,
      tipo_registro: 'socio',
      codigo: codigo,
      mensaje_extra: 'El mundo es mejor gracias a las personas que aman a sus mascotas — y tú ahora eres parte de este club que lo demuestra todos los días.'
    });
  }catch(err){ console.error(err); toast('No se pudo guardar el carnet. Intenta de nuevo.'); }
  finally{ btn.disabled = false; btn.textContent = 'Crear carnet y unirme gratis'; }
});

/* ---------------- Funciones reutilizables: tamaño sugerido y compresión de imágenes ---------------- */
function sugerirTamano(){
  const peso = Number(document.getElementById('petPeso').value);
  const sel = document.getElementById('petTamano');
  if(!peso || sel.value) return;
  if(peso <= 10) sel.value = 'S'; else if(peso <= 25) sel.value = 'M';
  else if(peso <= 40) sel.value = 'L'; else sel.value = 'XL';
}

function compressImage(file, maxDim, quality){
  return new Promise((resolve, reject) => {
    if(!file){ resolve(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if(w > h){ if(w > maxDim){ h = Math.round(h * (maxDim / w)); w = maxDim; } }
        else { if(h > maxDim){ w = Math.round(w * (maxDim / h)); h = maxDim; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/* ---------------- Validar visita (canje) ---------------- */
document.getElementById('validarForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const btn = document.getElementById('validarSubmitBtn');
  const bizCodigo = document.getElementById('valBizCode').value.trim().toUpperCase();
  const socioCodigo = document.getElementById('valSocioCode').value.trim().toUpperCase();
  const monto = Number(document.getElementById('valMonto').value);
  const resultBox = document.getElementById('validarResult');
  resultBox.classList.remove('show');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Validando...';
  try{
    const { data, error } = await supabase.rpc('registrar_canje', {
      p_negocio_codigo: bizCodigo, p_socio_codigo: socioCodigo, p_monto: monto
    });
    if(error) throw error;
    const r = data[0];
    if(!r.ok){ toast(r.mensaje); return; }
    canjesCount++;
    let calCta = '';
    if(r.negocio_plan === 'premium' && r.canje_id){
      calCta = `<div style="margin-top:14px;"><button type="button" class="btn btn-sm btn-primary" onclick="abrirFormularioCalificar('${r.canje_id}','negocio','${bizCodigo}','${String(r.nombre_mostrar).replace(/'/g,"\\'")}')">⭐ Calificar a este socio ahora</button></div>`;
    }
    resultBox.innerHTML = `<div class="big">${formatCLP(monto)}</div>Compra validada de <b>${r.nombre_mostrar}</b> en <b>${r.negocio_nombre}</b>.<br>Ahorro de socio aplicado (ejemplo 10%): <b>${formatCLP(r.ahorro)}</b>${calCta}`;
    resultBox.classList.add('show');
    document.getElementById('valSocioCode').value = '';
    document.getElementById('valMonto').value = '';
    toast('¡Visita validada y registrada!');
  }catch(err){ console.error(err); toast('No se pudo registrar la visita. Intenta de nuevo.'); }
  finally{ btn.disabled = false; btn.textContent = 'Validar y registrar compra'; }
});

/* ---------------- Validación bidireccional (calificaciones mutuas, beneficio Premium) ----------------
   Inspirada en el modelo Uber: al cerrarse una visita real (canjes), dueño y negocio pueden
   calificarse mutuamente. La calificación queda oculta (visible=false en la BD) hasta que AMBAS
   partes califican esa misma visita — recién ahí se revela. Solo disponible para socios con plan
   'pro'/'premium' y negocios con plan 'premium' (ver supabase-fix-v9.sql para el gateo real, que
   se aplica siempre en el servidor — el frontend solo evita mostrar UI que de todas formas el
   backend rechazaría). Ver sistema-validacion-mi-mascota-club.md para el diseño completo. */
const CRITERIOS_LABELS = {
  socio: ['Puntualidad', 'Trato', 'Cumplimiento del servicio'],
  negocio: ['Puntualidad del dueño', 'Comportamiento de la mascota', 'Pago a tiempo']
};

function starPickerHtml(inputId, value){
  value = value || 0;
  let btns = '';
  for(let i=1;i<=5;i++){ btns += `<button type="button" class="${i<=value?'on':''}" data-i="${i}" onclick="setStarValue('${inputId}',${i})">★</button>`; }
  return `<div class="star-picker" id="${inputId}_picker">${btns}</div><input type="hidden" id="${inputId}" value="${value}">`;
}
function setStarValue(inputId, i){
  const input = document.getElementById(inputId);
  if(input) input.value = i;
  document.querySelectorAll(`#${inputId}_picker button`).forEach(b => b.classList.toggle('on', Number(b.dataset.i) <= i));
}

function abrirCalificaciones(){
  openModal(`
    <h3 style="margin-bottom:6px;">⭐ Calificaciones</h3>
    <p class="dim" style="font-size:13px;margin-bottom:16px;">Al cierre de cada visita, dueño y negocio se califican mutuamente — como en Uber. Tu calificación queda oculta hasta que la otra parte también responda. Es un beneficio de los planes premium.</p>
    <div class="field"><label for="calCodigo">Tu código (MMC00001 o NEG0001)</label><input id="calCodigo" placeholder="MMC00001" style="text-transform:uppercase;"></div>
    <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="buscarPendientesCalificar()">Ver mis visitas para calificar</button>
    <div id="calResultado" style="margin-top:16px;"></div>
  `);
}

async function buscarPendientesCalificar(){
  const codigoInput = document.getElementById('calCodigo');
  const codigo = codigoInput.value.trim().toUpperCase();
  const box = document.getElementById('calResultado');
  if(!codigo){ box.innerHTML = `<div class="rep-locked">Escribe tu código.</div>`; return; }
  box.innerHTML = `<div class="dim" style="font-size:13px;">Buscando…</div>`;
  try{
    const { data, error } = await supabase.rpc('verificar_plan', { p_codigo: codigo });
    if(error) throw error;
    if(!data || !data.length){ box.innerHTML = `<div class="rep-locked">No encontramos ese código.</div>`; return; }
    const v = data[0];
    if(!v.premium){
      box.innerHTML = `<div class="rep-locked">
        Calificar visitas es un beneficio de los planes <b>${v.rol==='socio' ? 'Pro/Premium' : 'Premium'}</b>.
        Hoy tu plan es <b>${planLabel ? (v.rol==='socio'?planLabel(v.plan):v.plan) : v.plan}</b>.<br><br>
        <a href="#planes" onclick="closeModal(); mostrarSeccion('planes');" style="color:var(--brass);text-decoration:underline;font-weight:800;">Ver planes →</a>
      </div>`;
      return;
    }
    await renderPendientesCalificar(codigo, v.rol, box);
  }catch(err){ console.error(err); box.innerHTML = `<div class="rep-locked">No se pudo consultar. Intenta de nuevo.</div>`; }
}

async function renderPendientesCalificar(codigo, rol, box){
  box.innerHTML = `<div class="dim" style="font-size:13px;">Cargando visitas…</div>`;
  try{
    const { data, error } = await supabase.rpc('pendientes_por_validar', { p_codigo: codigo, p_rol: rol });
    if(error) throw error;
    if(!data || !data.length){
      box.innerHTML = `<div class="rep-premium-pill">✓ Plan premium activo</div><div class="rep-empty" style="margin-top:10px;">No tienes visitas pendientes por calificar (ventana de 72h desde cada visita).</div>`;
      return;
    }
    box.innerHTML = `<div class="rep-premium-pill">✓ Plan premium activo</div>` + data.map(p => `
      <div class="cal-pending-row">
        <div class="cp-head"><span>${p.contraparte}</span><span>${formatCLP(p.monto)}</span></div>
        <div class="cp-meta">${new Date(p.fecha).toLocaleDateString('es-CL')} · quedan ${Math.max(0,Math.round(p.horas_restantes))}h para calificar</div>
        <button class="btn btn-sm btn-outline" style="margin-top:10px;" onclick="abrirFormularioCalificar('${p.canje_id}','${rol}','${codigo}','${String(p.contraparte).replace(/'/g,"\\'")}')">Calificar</button>
      </div>
    `).join('');
  }catch(err){ console.error(err); box.innerHTML = `<div class="rep-locked">No se pudieron cargar tus visitas.</div>`; }
}

function abrirFormularioCalificar(canjeId, rol, codigo, contraparte){
  const labels = CRITERIOS_LABELS[rol] || CRITERIOS_LABELS.socio;
  openModal(`
    <h3 style="margin-bottom:4px;">Calificar a ${contraparte}</h3>
    <p class="dim" style="font-size:12.5px;margin-bottom:14px;">Tu calificación queda oculta hasta que ${rol==='socio' ? 'el negocio' : 'el dueño'} también califique esta misma visita.</p>
    <div class="field"><label>Calificación general</label>${starPickerHtml('calEstrellas', 5)}</div>
    <div class="field"><label style="font-size:12px;">${labels[0]}</label>${starPickerHtml('calC1', 5)}</div>
    <div class="field"><label style="font-size:12px;">${labels[1]}</label>${starPickerHtml('calC2', 5)}</div>
    <div class="field"><label style="font-size:12px;">${labels[2]}</label>${starPickerHtml('calC3', 5)}</div>
    <div class="field"><label>Comentario (opcional)</label><textarea id="calComentario" rows="3" placeholder="Cuéntanos cómo fue…"></textarea></div>
    <button class="btn btn-primary" id="calEnviarBtn" style="width:100%;justify-content:center;" onclick="enviarCalificacion('${canjeId}','${rol}','${codigo}')">Enviar calificación</button>
  `);
}

async function enviarCalificacion(canjeId, rol, codigo){
  const btn = document.getElementById('calEnviarBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Enviando...';
  try{
    const estrellas = Number(document.getElementById('calEstrellas').value || 0);
    if(!estrellas){ toast('Elige una calificación general de 1 a 5 estrellas.'); return; }
    const c1 = Number(document.getElementById('calC1').value || 0) || null;
    const c2 = Number(document.getElementById('calC2').value || 0) || null;
    const c3 = Number(document.getElementById('calC3').value || 0) || null;
    const comentario = document.getElementById('calComentario').value.trim();
    const { data, error } = await supabase.rpc('enviar_validacion', {
      p_canje_id: canjeId, p_rol: rol, p_codigo: codigo, p_estrellas: estrellas,
      p_comentario: comentario, p_criterio1: c1, p_criterio2: c2, p_criterio3: c3
    });
    if(error) throw error;
    const r = data[0];
    if(!r.ok){ toast(r.mensaje); return; }
    closeModal();
    toast(r.mensaje);
  }catch(err){ console.error(err); toast('No se pudo enviar la calificación. Intenta de nuevo.'); }
  finally{ if(btn){ btn.disabled = false; btn.textContent = 'Enviar calificación'; } }
}

/* Reputación pública de un negocio, mostrada en su ficha (/negocio/slug) — el promedio y el total
   son visibles para cualquiera; el detalle de comentarios individuales exige un código de socio
   con plan Pro/Premium (gateado también en el servidor, ver detalle_validaciones_negocio). */
async function cargarReputacionNegocio(n){
  const box = document.getElementById('repSummaryBox');
  if(!box || !n.codigo) return;
  try{
    const { data, error } = await supabase.rpc('resumen_reputacion_negocio', { p_negocio_codigo: n.codigo });
    if(error) throw error;
    const r = (data && data[0]) || {};
    if(!r.total_visitas){ box.innerHTML = `<div class="rep-empty">Todavía no hay visitas validadas en este negocio.</div>`; return; }
    if(!r.mostrar_promedio){
      box.innerHTML = `<div class="rep-empty">${r.total_visitas} visita${r.total_visitas===1?'':'s'} validada${r.total_visitas===1?'':'s'} · aún no hay suficientes calificaciones para mostrar un promedio.</div>`;
      return;
    }
    const llenas = Math.round(r.promedio);
    box.innerHTML = `
      <div class="rep-summary">
        <span class="rep-stars">${'★'.repeat(llenas)}${'☆'.repeat(5-llenas)}</span>
        <span class="rep-avg">${r.promedio}</span>
        <span class="rep-count">${r.total_validado} calificación${r.total_validado===1?'':'es'} · ${r.total_visitas} visitas totales</span>
      </div>
      <div class="field-row" style="align-items:flex-end;gap:8px;">
        <div class="field" style="flex:1;margin-bottom:0;"><label style="font-size:11px;">Tu código de socio Premium (para ver reseñas)</label><input id="repSocioCode" placeholder="MMC00001" style="text-transform:uppercase;"></div>
        <button class="btn btn-sm btn-outline" type="button" onclick="verDetalleReputacionNegocio('${n.codigo}')">Ver reseñas</button>
      </div>
      <div id="repDetalleBox"></div>
    `;
  }catch(err){ console.error(err); box.innerHTML = ''; }
}

async function verDetalleReputacionNegocio(negocioCodigo){
  const input = document.getElementById('repSocioCode');
  const codigo = input ? input.value.trim().toUpperCase() : '';
  const out = document.getElementById('repDetalleBox');
  if(!out) return;
  if(!codigo){ out.innerHTML = `<div class="rep-locked">Escribe tu código de socio para ver el detalle de reseñas (beneficio Pro/Premium).</div>`; return; }
  out.innerHTML = `<div class="dim" style="font-size:12.5px;">Verificando…</div>`;
  try{
    const { data, error } = await supabase.rpc('detalle_validaciones_negocio', { p_negocio_codigo: negocioCodigo, p_codigo_consultante: codigo });
    if(error) throw error;
    if(!data || !data.length){
      out.innerHTML = `<div class="rep-locked">Ver el detalle de reseñas es un beneficio de los planes Pro/Premium (o todavía no hay reseñas visibles).<br><a href="#planes" onclick="mostrarSeccion('planes');" style="color:var(--brass);text-decoration:underline;font-weight:800;">Ver planes →</a></div>`;
      return;
    }
    out.innerHTML = data.map(c => `
      <div class="rep-comment">
        <div class="rc-head"><span class="rc-stars">${'★'.repeat(c.estrellas)}</span><span>${new Date(c.fecha).toLocaleDateString('es-CL')}</span></div>
        ${c.comentario ? `<p>${c.comentario}</p>` : ''}
      </div>
    `).join('');
  }catch(err){ console.error(err); out.innerHTML = `<div class="rep-locked">No se pudo cargar el detalle.</div>`; }
}

/* ---------------- Panel privado (Supabase Auth real) ---------------- */
async function tryUnlock(){
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPass').value;
  const err = document.getElementById('adminError');
  const btn = document.getElementById('adminLoginBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Entrando...';
  try{
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) throw error;
    document.getElementById('adminLockWrap').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    err.style.display='none';
    await refreshAdmin();
  }catch(e){
    err.textContent = 'No se pudo iniciar sesión: revisa tu email y contraseña.';
    err.style.display='block';
  }finally{
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

async function refreshAdmin(){
  try{
    const [rNeg, rSoc, rCan] = await Promise.all([
      supabase.from('negocios').select('*').order('created_at', {ascending:false}),
      supabase.from('socios').select('*').order('created_at', {ascending:false}),
      supabase.from('canjes').select('*').order('created_at', {ascending:false}),
    ]);
    if(rNeg.error) throw new Error('Negocios: ' + rNeg.error.message);
    if(rSoc.error) throw new Error('Socios: ' + rSoc.error.message);
    if(rCan.error) throw new Error('Canjes: ' + rCan.error.message);
    const neg = rNeg.data || [], soc = rSoc.data || [], can = rCan.data || [];

    document.getElementById('statBiz').textContent = neg.length;
    document.getElementById('statOwners').textContent = soc.length;
    const clientesUnicos = new Set(can.map(c=>c.socio_id)).size;
    const gmvTotal = can.reduce((s,c)=>s+Number(c.monto||0),0);
    document.getElementById('statClientes').textContent = clientesUnicos;
    document.getElementById('statGMV').textContent = formatCLP(gmvTotal);

    document.getElementById('adminBizTable').innerHTML = neg.map(n=>`
      <div class="table-row"><span>${n.nombre}</span><span class="dim">${n.cat}</span><span class="dim">${n.comuna}</span><span class="dim">${n.contacto}</span></div>
    `).join('') || `<div class="table-row"><span class="dim">Aún no hay negocios reales inscritos.</span></div>`;

    document.getElementById('adminOwnerTable').innerHTML = soc.map(o=>`
      <div class="table-row"><span>${o.pet} <small class="dim" style="font-weight:600;">· ${planLabel(o.plan)}</small></span><span class="dim">${o.species||''}</span><span class="dim">${o.comuna||''}</span><span class="dim">${o.email||''}</span></div>
    `).join('') || `<div class="table-row"><span class="dim">Aún no hay dueños reales inscritos.</span></div>`;

    document.getElementById('adminCanjesTable').innerHTML = can.map(c=>`
      <div class="table-row"><span>${c.negocio_nombre}</span><span class="dim">${c.socio_nombre}</span><span class="dim">${formatCLP(c.monto)}</span><span class="dim">${new Date(c.created_at).toLocaleDateString('es-CL')}</span></div>
    `).join('') || `<div class="table-row"><span class="dim">Todavía no hay visitas validadas.</span></div>`;

    const porNegocio = {};
    can.forEach(c=>{
      if(!porNegocio[c.negocio_nombre]) porNegocio[c.negocio_nombre] = { visitas:0, monto:0 };
      porNegocio[c.negocio_nombre].visitas++;
      porNegocio[c.negocio_nombre].monto += Number(c.monto||0);
    });
    document.getElementById('adminRoiTable').innerHTML = Object.entries(porNegocio).sort((a,b)=>b[1].monto-a[1].monto).map(([nombre,d])=>`
      <div class="table-row"><span>${nombre}</span><span class="dim">${d.visitas} visita${d.visitas===1?'':'s'}</span><span class="dim">${formatCLP(d.monto)}</span><span class="dim">${formatCLP(d.monto/d.visitas)} prom.</span></div>
    `).join('') || `<div class="table-row"><span class="dim">Sin datos todavía — valida la primera visita para ver el ROI por negocio.</span></div>`;
  }catch(e){
    console.error(e);
    toast('No se pudo cargar el panel: ' + (e.message || 'error desconocido'));
  }
}

/* ---------------- Navegación interna segura ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});

loadAll().then(() => manejarRutaActual()); // reaplica filtros de la URL con datos reales ya cargados
renderCatGrid();
renderFanCarousel();
document.getElementById('heroSearch').style.transition = 'opacity .2s ease';
setInterval(rotarSugerenciaHero, 2600);
setBizTipo('mascota');
setDirTipo('');
manejarRutaActual(); // si se entra directo a /directorio/... (o se refresca ahí), se muestra esa vista de inmediato

// Campos con formato y validación estricta en vivo (RUT, teléfono CL, correo)
initRutField('ownerRepRut', 'fieldOwnerRut', 'ownerRepRutMsg');
initTelefonoField('ownerRepTelefono', 'fieldOwnerTelefono', 'ownerRepTelefonoMsg');
initEmailField('ownerEmail', 'fieldOwnerEmail', 'ownerEmailMsg');
initTelefonoField('bizTelefono', 'fieldBizTelefono', 'bizTelefonoMsg');
initEmailField('bizEmail', 'fieldBizEmail', 'bizEmailMsg');
wizardRender('owner');
wizardRender('biz');

// Selector Región → Comuna: se pobla al cargar la página, con la Región Metropolitana
// preseleccionada (piloto en Santiago) en ambos formularios.
poblarRegiones('ownerRegion');
poblarRegiones('bizRegion');
resetRegionComuna('owner');
resetRegionComuna('biz');

// Funciones que el HTML llama directo vía onclick / oninput — deben ser globales.
window.setBizTipo = setBizTipo;
window.setDirTipo = setDirTipo;
window.poblarComunas = poblarComunas;
window.filtrarPorCategoria = filtrarPorCategoria;
window.filtrarPorNegocio = filtrarPorNegocio;
window.abrirElegirCamino = abrirElegirCamino;
window.mostrarFormulario = mostrarFormulario;
window.mostrarSeccion = mostrarSeccion;
window.tryUnlock = tryUnlock;
window.updateCard = updateCard;
window.sugerirTamano = sugerirTamano;
window.closeModal = closeModal;
window.wizardNext = wizardNext;
window.wizardBack = wizardBack;
window.abrirMapa = abrirMapa;
window.cerrarMapa = cerrarMapa;
window.toggleDropdown = toggleDropdown;
window.irABuscar = irABuscar;
window.refreshAdmin = refreshAdmin;
window.irADirectorio = irADirectorio;
window.irAEspecialistas = irAEspecialistas;
window.irABeneficios = irABeneficios;
window.irAMiMascota = irAMiMascota;
window.irANegocio = irANegocio;
window.volverAlInicio = volverAlInicio;
window.setBizEsEspecialista = setBizEsEspecialista;
window.irASlideBanner = irASlideBanner;
window.abrirCalificaciones = abrirCalificaciones;
window.buscarPendientesCalificar = buscarPendientesCalificar;
window.abrirFormularioCalificar = abrirFormularioCalificar;
window.enviarCalificacion = enviarCalificacion;
window.setStarValue = setStarValue;
window.verDetalleReputacionNegocio = verDetalleReputacionNegocio;

})();
