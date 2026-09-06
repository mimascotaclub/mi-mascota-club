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
const CATS_MASCOTA = ["Veterinaria","Peluquería","Paseador","Hotel / Pensión","Tienda","Alimentos","Salud","Accesorios","Adiestramiento","Fotografía","Servicios"];
const CATS_DUENO = ["Café","Restaurante","Hotel","Deporte","Barbería","Belleza","Tienda","Otro"];
/* Todas las categorías del directorio (las mismas 18 de "Explora por categoría"),
   en orden alfabético — se usan para llenar el filtro de categoría del directorio
   completo, no solo las que ya tienen algún negocio cargado. */
const ALL_DIR_CATS = [...new Set([...CATS_MASCOTA, ...CATS_DUENO])].sort((a,b)=>a.localeCompare(b,'es'));
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
/* Todas las comunas de Chile (las 346 de CHILE_REGIONES), sin duplicados y en orden
   alfabético — se usan para llenar el filtro de comuna del directorio completo. */
const ALL_COMUNAS_CHILE = [...new Set(CHILE_REGIONES.flatMap(r => r.comunas))].sort((a,b)=>a.localeCompare(b,'es'));

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
  document.getElementById('tabTodos').className   = 'dir-opt' + (tipo===''        ? ' is-on' : '');
  document.getElementById('tabMascota').className = 'dir-opt' + (tipo==='mascota' ? ' is-on' : '');
  document.getElementById('tabDueno').className   = 'dir-opt' + (tipo==='dueno'   ? ' is-on' : '');
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
const BANNER_PLANES = [
  { cat: 'Planes para dueños de mascota' },
  { cat: 'Planes para negocios y especialistas' },
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
/* Planes: página propia (/planes), separada del home — antes era una sección
   más de la página principal (#planes) a la que se llegaba con scroll. No tiene
   filtros como el directorio, así que no reutiliza mostrarPaginaDirectorio: solo
   alterna la clase del body (igual que pagina-directorio/pagina-ficha) y pinta
   su propio banner. */
function mostrarPaginaPlanes(){
  document.body.classList.remove('pagina-directorio');
  document.body.classList.remove('pagina-ficha');
  document.body.classList.add('pagina-planes');
  renderPageBanner('planesBanner', BANNER_PLANES);
  window.scrollTo({ top:0, behavior:'instant' in window.scrollTo ? 'instant' : 'auto' });
}
function irAPlanes(){
  history.pushState({ planes:true }, '', '/planes');
  mostrarPaginaPlanes();
}
function volverAlInicio(){
  document.body.classList.remove('pagina-directorio');
  document.body.classList.remove('pagina-ficha');
  document.body.classList.remove('pagina-planes');
  if(location.pathname !== '/') history.pushState({}, '', '/');
  window.scrollTo({ top:0, behavior:'smooth' });
}
function mostrarPaginaDirectorio(opts){
  opts = opts || {};
  document.body.classList.remove('pagina-ficha');
  document.body.classList.remove('pagina-planes');
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
  } else if(parts[0] === 'planes'){
    mostrarPaginaPlanes();
  } else if(parts[0] === 'negocio' && parts[1]){
    mostrarPaginaFichaPorSlug(parts[1]);
  } else if(parts[0] === 'mi-negocio'){
    mostrarPaginaNegocio();
  } else if(parts[0] === 'validar'){
    /* Es la URL que trae el QR del carnet del socio. Llega el negocio, con el
       celular, después de escanear. */
    abrirValidarConSocio(parts[1] ? decodeURIComponent(parts[1]).toUpperCase() : '');
  } else {
    document.body.classList.remove('pagina-directorio');
    document.body.classList.remove('pagina-ficha');
    document.body.classList.remove('pagina-planes');
    document.body.classList.remove('pagina-negocio');
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
  if(tipo === 'negocio'){
    // El registro de negocios ahora usa el formulario v3 (ficha, beneficio en 3 pasos
    // y aprobación manual). El asistente antiguo del index queda como respaldo.
    window.location.href = 'formulario-negocio-v3.html';
    return;
  }
  if(tipo === 'dueno'){
    // El registro de mascota ahora usa el formulario animado v3 (con verificación OTP)
    window.location.href = 'formulario-registro-demo-v3.html';
    return;
  }
  closeModal();
  // Si veníamos de una página propia (directorio o planes), volvemos primero al
  // inicio para que el formulario aparezca en la página principal, como siempre.
  if(document.body.classList.contains('pagina-directorio') || document.body.classList.contains('pagina-planes')) volverAlInicio();
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
  if(document.body.classList.contains('pagina-directorio') || document.body.classList.contains('pagina-planes')) volverAlInicio();
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
      esEspecialista: !!n.es_especialista, destacado: !!n.destacado,
      /* Columnas nuevas del flujo de inscripción v3 (parche v11) */
      foto: n.foto, googleMapsUrl: n.google_maps_url, whatsapp: n.whatsapp,
      instagram: n.instagram, facebook: n.facebook, tiktok: n.tiktok, sitioWeb: n.sitio_web,
      horarioDias: n.horario_dias, tieneLocal: n.tiene_local !== false,
      comunasCobertura: n.comunas_cobertura, tipoNegocio: n.tipo_negocio,
      beneficioValor: n.beneficio_valor, beneficioSobre: n.beneficio_sobre,
      beneficioCuando: n.beneficio_cuando, beneficioMontoMin: n.beneficio_monto_min,
      email: n.email, telefono: n.telefono
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

/* Llena los <select> de categoría y comuna del directorio con las listas COMPLETAS
   (ALL_DIR_CATS / ALL_COMUNAS_CHILE), no solo las que ya tienen algún negocio cargado —
   así se puede filtrar por cualquier categoría o comuna del país aunque todavía no haya
   negocios ahí. Se llama una sola vez al iniciar (las listas son fijas, no dependen de
   los datos de Supabase), y mostrarPaginaDirectorio() confía en que ya están pobladas
   antes de fijar dirCat.value / dirComuna.value según la URL. */
function refreshFilterOptions(){
  const catSelect = document.getElementById('dirCat'), comunaSelect = document.getElementById('dirComuna');
  const curCat = catSelect.value, curComuna = comunaSelect.value;
  catSelect.innerHTML = '<option value="">Todas las categorías</option>' + ALL_DIR_CATS.map(c=>`<option ${c===curCat?'selected':''}>${c}</option>`).join('');
  comunaSelect.innerHTML = '<option value="">Todas las comunas</option>' + ALL_COMUNAS_CHILE.map(c=>`<option ${c===curComuna?'selected':''}>${c}</option>`).join('');
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
  const badge = destacado ? '★ Destacado' : (n.demo ? 'Ejemplo' : (n.verificado ? '✓ Verificado' : 'Fundador #'+String(n.founderNumber||'').padStart(3,'0')));
  const datos = fichaDesdeNegocio(n);
  datos.emoji = iconByCat[n.cat] || '🐾';
  return cardNegocioHTML(datos, badge, bizContactIcons(n));
}
/* ---------------- Filtros del directorio (columna izquierda) ----------------
   El directorio pasó de "3 botones + 2 menús desplegables" a una columna de
   filtros a la izquierda, como MercadoLibre: se ve de una sola mirada qué
   categorías y comunas existen y cuántos negocios hay en cada una, sin tener
   que abrir un desplegable y adivinar.

   Los <select id="dirCat"> y <select id="dirComuna"> siguen existiendo (ocultos
   en el HTML) y siguen siendo la fuente de verdad: el router de URLs
   (/directorio/veterinaria) y refreshFilterOptions() los usan igual que antes.
   La columna de filtros solo les escribe el valor y vuelve a dibujar. */

let dirVerTodasCat = false, dirVerTodasComuna = false;
const DIR_FACET_TOPE = 8;   // cuántas opciones se muestran antes de "Ver todas"

function dirFiltrosActuales(){
  return {
    q: (document.getElementById('dirSearch').value || '').trim().toLowerCase(),
    cat: document.getElementById('dirCat').value,
    comuna: document.getElementById('dirComuna').value,
    tipo: dirTipoFiltro
  };
}

/* Filtra la lista completa. `omitir` deja fuera un filtro a propósito: se usa
   para contar cuántos resultados tendría cada opción de una faceta si se
   eligiera (igual que los números entre paréntesis de MercadoLibre). */
function dirFiltrar(f, omitir){
  const keywords = f.q ? palabrasClaveBusqueda(f.q) : [];
  return combinedNegocios().filter(n => {
    const texto = `${n.nombre} ${n.cat} ${n.comuna} ${n.meta||''} ${n.servicios||''} ${n.descripcion||''}`.toLowerCase();
    const coincideBusqueda = !f.q || (keywords.length ? keywords.some(k => texto.includes(k)) : texto.includes(f.q));
    return coincideBusqueda
      && (omitir==='cat'    || !f.cat    || n.cat === f.cat)
      && (omitir==='comuna' || !f.comuna || n.comuna === f.comuna)
      && (omitir==='tipo'   || !f.tipo   || n.tipo === f.tipo)
      && (!modoDirectorioEspecialistas || n.esEspecialista === true)
      && (!modoDirectorioBeneficios || !!n.beneficioDetalle);
  });
}

/* Porcentaje del beneficio, para poder ordenar por "mayor descuento".
   Lee el texto tal como quedó guardado ("30% de descuento en...") porque es
   lo único que tienen en común las fichas viejas y las nuevas. */
function dirDescuentoPct(n){
  const txt = `${n.beneficioTipo||''} ${n.beneficioDetalle||''} ${n.meta||''}`;
  const m = txt.match(/(\d{1,3})\s*%/);
  return m ? parseInt(m[1], 10) : -1;
}

function dirOrdenar(lista, orden){
  const arr = lista.slice();
  const nuevoPrimero = (a,b) => (b.founderNumber||0) - (a.founderNumber||0);
  if(orden === 'az')        arr.sort((a,b) => a.nombre.localeCompare(b.nombre,'es'));
  else if(orden === 'descuento') arr.sort((a,b) => dirDescuentoPct(b) - dirDescuentoPct(a) || nuevoPrimero(a,b));
  else if(orden === 'nuevos')    arr.sort((a,b) => (a.demo?1:0)-(b.demo?1:0) || nuevoPrimero(a,b));
  else /* recomendados */        arr.sort((a,b) =>
      (b.destacado?1:0)-(a.destacado?1:0) ||
      (a.demo?1:0)-(b.demo?1:0) ||
      (a.founderNumber||999) - (b.founderNumber||999));
  return arr;
}

/* Escribe el valor en el <select> oculto y vuelve a dibujar todo.
   Volver a hacer clic en la opción ya elegida la quita (toggle). */
function setDirCat(cat){
  const s = document.getElementById('dirCat');
  s.value = (s.value === cat) ? '' : cat;
  renderDirectory();
}
function setDirComuna(comuna){
  const s = document.getElementById('dirComuna');
  s.value = (s.value === comuna) ? '' : comuna;
  renderDirectory();
}
function limpiarFiltrosDir(){
  document.getElementById('dirSearch').value = '';
  document.getElementById('dirCat').value = '';
  document.getElementById('dirComuna').value = '';
  setDirTipo('');           // setDirTipo ya llama a renderDirectory()
}
function toggleVerTodas(cual){
  if(cual === 'cat') dirVerTodasCat = !dirVerTodasCat;
  else dirVerTodasComuna = !dirVerTodasComuna;
  renderDirectory();
}
function abrirFiltrosDir(){ document.body.classList.add('filtros-abiertos'); }
function cerrarFiltrosDir(){ document.body.classList.remove('filtros-abiertos'); }

/* Dibuja una faceta (categoría o comuna) con su contador.
   Solo aparecen las opciones que hoy tienen al menos un negocio — con 3 o 300
   negocios cargados, una lista de 18 categorías vacías no ayuda a nadie.
   "Ver todas" muestra el resto (útil para filtrar por algo que todavía no
   existe y caer en el mensaje de "sé el primero en sumar tu ficha"). */
function dirRenderFaceta(contenedorId, verMasId, opciones, seleccionada, verTodas, onClickFn){
  const cont = document.getElementById(contenedorId);
  const btnMas = document.getElementById(verMasId);
  if(!cont) return;
  const conResultados = opciones.filter(o => o.n > 0 || o.valor === seleccionada);
  const lista = verTodas ? opciones : conResultados.slice(0, DIR_FACET_TOPE);
  cont.innerHTML = lista.map(o => `
    <button type="button" class="dir-opt${o.valor === seleccionada ? ' is-on' : ''}${o.n === 0 ? ' is-vacia' : ''}"
            onclick="${onClickFn}('${String(o.valor).replace(/'/g,"\\'")}')">
      <span class="dir-opt__lbl">${o.valor}</span>
      <span class="dir-opt__n">${o.n}</span>
    </button>`).join('') || '<p class="dir-facet__vacia">Sin resultados con los filtros de arriba.</p>';
  if(btnMas){
    const hayMas = opciones.length > conResultados.slice(0, DIR_FACET_TOPE).length;
    btnMas.hidden = !hayMas;
    btnMas.textContent = verTodas ? 'Ver menos' : `Ver todas (${opciones.length})`;
  }
}

function renderDirectory(){
  const f = dirFiltrosActuales();
  const grid = document.getElementById('dirGrid');
  const filtered = dirFiltrar(f);

  /* ---- Columna de filtros: contadores por categoría y por comuna ---- */
  const baseCat = dirFiltrar(f, 'cat');
  const baseComuna = dirFiltrar(f, 'comuna');
  const cuenta = (lista, campo, valor) => lista.filter(n => n[campo] === valor).length;

  dirRenderFaceta('dirCatList', 'dirCatVerMas',
    ALL_DIR_CATS.map(c => ({ valor:c, n: cuenta(baseCat,'cat',c) })),
    f.cat, dirVerTodasCat, 'setDirCat');

  /* De las 346 comunas del país solo se listan las que hoy tienen negocios,
     ordenadas por cantidad; el resto queda detrás de "Ver todas". */
  const comunasOpts = ALL_COMUNAS_CHILE
    .map(c => ({ valor:c, n: cuenta(baseComuna,'comuna',c) }))
    .sort((a,b) => b.n - a.n || a.valor.localeCompare(b.valor,'es'));
  dirRenderFaceta('dirComunaList', 'dirComunaVerMas', comunasOpts, f.comuna, dirVerTodasComuna, 'setDirComuna');

  /* ---- Chips de lo que está aplicado ---- */
  const chips = [];
  if(f.tipo)   chips.push({ txt: f.tipo === 'mascota' ? 'Para tu mascota' : 'Para ti como dueño', fn: "setDirTipo('')" });
  if(f.cat)    chips.push({ txt: f.cat,    fn: "setDirCat('" + f.cat.replace(/'/g,"\\'") + "')" });
  if(f.comuna) chips.push({ txt: f.comuna, fn: "setDirComuna('" + f.comuna.replace(/'/g,"\\'") + "')" });
  if(f.q)      chips.push({ txt: '“' + f.q + '”', fn: "document.getElementById('dirSearch').value=''; renderDirectory();" });
  const chipsBox = document.getElementById('dirChips');
  if(chipsBox){
    chipsBox.innerHTML = chips.length
      ? chips.map(c => `<button type="button" class="dir-chip" onclick="${c.fn}">${c.txt} <span>✕</span></button>`).join('')
        + '<button type="button" class="dir-chip dir-chip--limpiar" onclick="limpiarFiltrosDir()">Limpiar todo</button>'
      : '';
    chipsBox.hidden = !chips.length;
  }
  const nBadge = document.getElementById('dirFiltrosN');
  if(nBadge){ nBadge.textContent = chips.length; nBadge.hidden = !chips.length; }

  /* ---- Contador de resultados y botón del panel móvil ---- */
  const cuentaBox = document.getElementById('dirCount');
  if(cuentaBox) cuentaBox.textContent = `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`;
  const aplicar = document.getElementById('dirAplicarBtn');
  if(aplicar) aplicar.textContent = `Ver ${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`;

  /* ---- Grilla ---- */
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
  const ordenSel = document.getElementById('dirOrden');
  dirOrdenar(filtered, ordenSel ? ordenSel.value : 'recomendados').forEach(n=>{
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
  document.body.classList.remove('pagina-planes');
  document.body.classList.add('pagina-ficha');
  document.getElementById('fichaContent').innerHTML = `<div class="empty-state">No encontramos esta ficha. <a href="/directorio" onclick="event.preventDefault(); irADirectorio({});" style="color:var(--brass);text-decoration:underline;">Volver al directorio →</a></div>`;
}
/* ---------------- "Obtener beneficio" (solo socios) ----------------
   La tarjeta del directorio lleva SIEMPRE a la ficha: ahí está la dirección,
   el horario y la letra chica, que es lo que hay que leer antes de ir. El
   canje vive en la ficha, y ahí sí se pide ser socio: sin código no hay QR
   que mostrar en el local. El código queda guardado en este navegador para
   no tener que escribirlo cada vez. */
let negocioActual = null;
const LS_SOCIO = 'mmc_codigo_socio';

function codigoSocioGuardado(){
  try{ return localStorage.getItem(LS_SOCIO) || ''; }catch(e){ return ''; }
}
function guardarCodigoSocio(codigo){
  try{ localStorage.setItem(LS_SOCIO, codigo); }catch(e){ /* modo incógnito */ }
}

function abrirBeneficio(){
  const n = negocioActual;
  if(!n) return;
  const guardado = codigoSocioGuardado();
  openModal(`
    <div style="font-family:var(--font-display);font-weight:900;font-size:20px;line-height:1.15;">Obtener el beneficio</div>
    <div style="font-size:13.5px;color:#5C5C5C;margin-top:6px;line-height:1.5;">
      En <b>${colaEsc(n.nombre)}</b>${n.beneficioTipo ? ' · ' + colaEsc(n.beneficioTipo) : ''}
    </div>
    <div id="benPaso" style="margin-top:18px;">
      <label style="display:block;font-size:12.5px;font-weight:800;margin-bottom:6px;">Tu código de socio</label>
      <input id="benCodigo" type="text" value="${colaEsc(guardado)}" placeholder="MMC00001"
             style="width:100%;padding:13px 14px;border-radius:12px;border:2px solid var(--line);font-family:var(--font-mono);font-size:15px;text-transform:uppercase;">
      <div id="benMsg" style="font-size:12.5px;color:var(--rust);margin-top:8px;display:none;"></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:14px;" onclick="confirmarBeneficio()">Mostrar mi carnet</button>
      <div style="margin-top:14px;font-size:12.5px;color:#6B7280;text-align:center;line-height:1.5;">
        ¿Todavía no eres socio?
        <a href="formulario-registro-demo-v3.html" style="color:var(--brass);text-decoration:underline;font-weight:800;">Regístrate gratis →</a>
      </div>
    </div>
  `);
  const input = document.getElementById('benCodigo');
  if(input){
    input.focus();
    input.addEventListener('keydown', e => { if(e.key === 'Enter') confirmarBeneficio(); });
  }
}

async function confirmarBeneficio(){
  const n = negocioActual;
  const input = document.getElementById('benCodigo');
  const msg = document.getElementById('benMsg');
  const codigo = (input.value || '').trim().toUpperCase();
  const error = txt => { msg.textContent = txt; msg.style.display = 'block'; };
  if(!codigo){ error('Escribe tu código de socio.'); return; }
  msg.style.display = 'none';
  try{
    const { data, error: err } = await supabase.rpc('verificar_plan', { p_codigo: codigo });
    if(err) throw err;
    if(!data || !data.length || data[0].rol !== 'socio'){
      error('No encontramos ese código de socio. Revísalo o regístrate gratis.');
      return;
    }
    guardarCodigoSocio(codigo);
    document.getElementById('benPaso').innerHTML = `
      <div style="text-align:center;">
        <div id="benQR" class="cred-qr" style="margin:0 auto;"></div>
        <div style="font-family:var(--font-mono);font-size:15px;font-weight:600;margin-top:10px;">${colaEsc(codigo)}</div>
        <div style="font-size:13.5px;color:#5C5C5C;margin-top:12px;line-height:1.5;">
          Muéstrale este código en <b>${colaEsc(n.nombre)}</b> para aplicar tu beneficio.
          ${n.beneficioDetalle ? '<br><span style="font-size:12px;">' + colaEsc(n.beneficioDetalle) + '</span>' : ''}
        </div>
      </div>`;
    renderQR('benQR', urlCarnet(codigo));
  }catch(e){
    console.error(e);
    error('No pudimos verificar el código. Inténtalo de nuevo.');
  }
}

function mostrarPaginaFicha(n){
  negocioActual = n;
  document.body.classList.remove('pagina-directorio');
  document.body.classList.remove('pagina-planes');
  document.body.classList.add('pagina-ficha');
  renderPageBanner('fichaBanner', [{ cat: n.nombre, img: n.logo || null }]);
  document.getElementById('fichaContent').innerHTML = renderFichaContenido(n);
  const cajaFicha = document.getElementById('fichaMMC');
  if(cajaFicha){
    const datos = fichaDesdeNegocio(n);
    datos.tipo_label = n.esEspecialista ? `${n.cat} · Especialista` : n.cat;
    renderFicha(cajaFicha, datos);
  }
  window.scrollTo({ top:0, behavior:'instant' in window.scrollTo ? 'instant' : 'auto' });
  if(!n.demo && n.codigo) cargarReputacionNegocio(n);
}
function renderFichaContenido(n){
  const dato = (label, valor) => valor ? `<div class="mmc-datos__row"><span>${label}</span><b>${valor}</b></div>` : '';
  return `
    <div class="mmc-ficha-wrap">
      <div class="mmc-ficha" id="fichaMMC"></div>
      ${n.descripcion ? `<p class="mmc-ficha-desc">${n.descripcion}</p>` : ''}
      ${!n.demo && n.codigo ? `<div id="repSummaryBox" class="rep-empty" style="margin-top:18px;">Cargando reputación…</div>` : ''}
    </div>
    <div class="mmc-datos">
      ${dato('Estado', n.demo ? 'Ejemplo de directorio' : 'Activo · gratis (piloto)')}
      ${dato('Beneficio para', n.tipo === 'dueno' ? 'El dueño' : 'La mascota')}
      ${n.verificado ? dato('Verificado', '✓ Sí') : ''}
      ${n.esEspecialista ? dato('Ficha', 'Especialista') : ''}
      ${dato('Especialidad', n.servicios)}
      ${dato('Dirección', n.direccion)}
      ${dato('Días', n.horarioDias)}
      ${dato('Horario', n.horario)}
      ${dato('Teléfono', n.telefono)}
      ${!n.demo ? dato('N° fundador', '#' + String(n.founderNumber||'').padStart(3,'0')) : ''}
      ${!n.demo ? dato('Código', n.codigo || '—') : ''}
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
/* El QR del carnet lleva una URL, no el código pelado.
   Antes el QR contenía solo "MMC00001": al escanearlo con la cámara del
   teléfono aparecía ese texto y no pasaba nada más. Ahora contiene
   https://…/validar/MMC00001, así que el negocio lo escanea con la cámara
   que ya trae su celular (sin apps ni lectores raros), le abre la página de
   validar con el código del socio ya puesto, y solo tiene que escribir el
   monto. Ese registro es el que deja la huella del movimiento en `canjes`. */
function urlCarnet(codigo){
  return location.origin + '/validar/' + encodeURIComponent(codigo);
}

function renderQR(elId, text){
  const el = document.getElementById(elId);
  if(!el) return;
  const respaldo = String(text).split('/').pop();   // si falla la librería, al menos el código
  el.innerHTML = '';
  try{
    if(typeof QRCode !== 'undefined'){ new QRCode(el, { text, width:120, height:120, correctLevel: QRCode.CorrectLevel.M }); }
    else { el.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;text-align:center;">${respaldo}</div>`; }
  }catch(e){ el.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;text-align:center;">${respaldo}</div>`; }
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
/* ---------------- Cinta de logos de la portada ----------------
   Son espacios PAGADOS y se administran a mano en js/logos-partners.js,
   no salen de la tabla `negocios`. Todos los archivos vienen ya compuestos
   en un lienzo de 300x120 px, así que en pantalla todos ocupan exactamente
   lo mismo (150x60) y la cinta se ve pareja aunque un logo sea horizontal
   y el otro cuadrado.

   Mientras haya menos logos que espacios, el resto se rellena con
   "Tu negocio aquí". Si algún día hay más de 15, se muestran todos: la
   cinta gira en bucle y ninguno se queda fuera. */
function renderTrustMarquee(){
  const track = document.getElementById('trustTrack');
  if(!track) return;

  const lista = (typeof LOGOS_PARTNERS !== 'undefined' ? LOGOS_PARTNERS : []).filter(l => l && l.archivo);
  const espacios = (typeof LOGOS_PARTNERS_ESPACIOS !== 'undefined' ? LOGOS_PARTNERS_ESPACIOS : 15);

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const tarjetas = lista.map(l => {
    const accion = l.url
      ? `onclick="window.open('${esc(l.url)}','_blank','noopener')"`
      : `onclick="filtrarPorNegocio('${String(l.nombre||'').replace(/'/g,"\\'")}')"`;
    /* Si el archivo no carga (nombre mal escrito, archivo que falta), la
       tarjeta cae de vuelta al nombre en texto en vez de mostrar la imagen rota. */
    return `<div class="trust-card partner" title="${esc(l.nombre)}" ${accion}>
      <img class="partner-logo" src="${esc(l.archivo)}" alt="${esc(l.nombre)}" loading="lazy"
           onerror="var c=this.closest('.trust-card'); c.classList.remove('partner'); c.textContent=this.alt;">
    </div>`;
  });

  const faltan = Math.max(espacios - tarjetas.length, 0);
  const placeholders = Array.from({length:faltan}, () => `<div class="trust-card" onclick="abrirElegirCamino()">➕ Tu negocio aquí</div>`);
  const html = [...tarjetas, ...placeholders].join('');
  track.innerHTML = html + html;   // duplicado para que el bucle no tenga costura
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
    guardarCodigoSocio(codigo);
    sociosCount++;
    const record = { pet, species, breed, comuna, email, codigo, socioNumber: socio_number, foto, plan: 'free' };
    updateCounts();
    document.getElementById('credId').textContent = codigo;
    renderQR('credQR', urlCarnet(codigo));
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
    renderQR('modalQR', urlCarnet(codigo));
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

/* ---------------- Validar visita (canje) ----------------
   El negocio escanea el QR del socio con la cámara de su celular y aterriza
   aquí con el código del socio ya puesto. Su propio código de negocio queda
   guardado en ese teléfono, así que a partir de la segunda vez lo único que
   escribe es el monto. */
const LS_NEGOCIO = 'mmc_codigo_negocio';

function abrirValidarConSocio(socioCodigo){
  document.body.classList.remove('pagina-directorio','pagina-ficha','pagina-planes');
  const seccion = document.getElementById('validar');
  if(!seccion) return;
  seccion.style.display = '';
  const inputSocio = document.getElementById('valSocioCode');
  const inputBiz = document.getElementById('valBizCode');
  if(socioCodigo && inputSocio) inputSocio.value = socioCodigo;
  let guardado = '';
  try{ guardado = localStorage.getItem(LS_NEGOCIO) || ''; }catch(e){}
  if(guardado && inputBiz) inputBiz.value = guardado;
  setTimeout(() => {
    seccion.scrollIntoView({ behavior:'smooth' });
    const foco = guardado ? document.getElementById('valMonto') : inputBiz;
    if(foco) foco.focus();
  }, 120);
}


document.getElementById('validarForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const btn = document.getElementById('validarSubmitBtn');
  const bizCodigo = document.getElementById('valBizCode').value.trim().toUpperCase();
  const socioCodigo = document.getElementById('valSocioCode').value.trim().toUpperCase();
  const montoRaw = document.getElementById('valMonto').value.trim();
  const monto = montoRaw === '' ? null : Number(montoRaw);
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
    try{ localStorage.setItem(LS_NEGOCIO, bizCodigo); }catch(e){ /* modo incógnito */ }
    let calCta = '';
    if(r.negocio_plan === 'premium' && r.canje_id){
      calCta = `<div style="margin-top:14px;"><button type="button" class="btn btn-sm btn-primary" onclick="abrirFormularioCalificar('${r.canje_id}','negocio','${bizCodigo}','${String(r.nombre_mostrar).replace(/'/g,"\\'")}')">⭐ Calificar a este socio ahora</button></div>`;
    }
    resultBox.innerHTML = (monto != null
        ? `<div class="big">${formatCLP(monto)}</div>Compra validada de <b>${r.nombre_mostrar}</b> en <b>${r.negocio_nombre}</b>.<br>Ahorro de socio aplicado (ejemplo 10%): <b>${formatCLP(r.ahorro)}</b>`
        : `<div class="big">✓</div>Visita de <b>${r.nombre_mostrar}</b> registrada en <b>${r.negocio_nombre}</b>.<br><span style="font-size:12.5px;color:#7a8377;">Sin monto anotado — la visita queda igual en el historial.</span>`)
      + calCta
      + `<div style="margin-top:14px;font-size:12.5px;"><a href="/mi-negocio" onclick="event.preventDefault(); irAMiNegocio();" style="color:var(--brass);text-decoration:underline;font-weight:800;">Ver todas mis visitas →</a></div>`;
    resultBox.classList.add('show');
    document.getElementById('valSocioCode').value = '';
    document.getElementById('valMonto').value = '';
    toast('¡Visita validada y registrada!');
  }catch(err){ console.error(err); toast('No se pudo registrar la visita. Intenta de nuevo.'); }
  finally{ btn.disabled = false; btn.textContent = 'Validar y registrar visita'; }
});

/* ============================================================
   PANEL DEL NEGOCIO  (/mi-negocio)
   ------------------------------------------------------------
   Cada visita validada queda en la tabla `canjes`. Esto es esa
   misma información, pero mostrada al negocio: cuántas visitas
   le trajo el club, cuántos socios distintos, cuánto sumaron las
   compras y quién repitió.

   El acceso pide código + correo de registro (ver
   supabase-panel-negocio-v14.sql). El par queda guardado en ese
   navegador para no escribirlo cada vez.
   ============================================================ */
const LS_NEG_SESION = 'mmc_sesion_negocio';

function sesionNegocio(){
  try{ return JSON.parse(localStorage.getItem(LS_NEG_SESION) || 'null'); }catch(e){ return null; }
}
function guardarSesionNegocio(codigo, email){
  try{ localStorage.setItem(LS_NEG_SESION, JSON.stringify({ codigo, email })); }catch(e){}
}
function salirPanelNegocio(){
  try{ localStorage.removeItem(LS_NEG_SESION); }catch(e){}
  document.getElementById('negPanelBox').style.display = 'none';
  document.getElementById('negLoginBox').style.display = '';
  document.getElementById('negCodigo').value = '';
  document.getElementById('negEmail').value = '';
}

function irAMiNegocio(){
  history.pushState({ miNegocio:true }, '', '/mi-negocio');
  mostrarPaginaNegocio();
}

function mostrarPaginaNegocio(){
  document.body.classList.remove('pagina-directorio','pagina-ficha','pagina-planes');
  document.body.classList.add('pagina-negocio');
  window.scrollTo({ top:0, behavior:'instant' in window.scrollTo ? 'instant' : 'auto' });
  const s = sesionNegocio();
  if(s && s.codigo && s.email) cargarPanelNegocio(s.codigo, s.email);
  else salirPanelNegocio();
}

async function cargarPanelNegocio(codigo, email){
  const errBox = document.getElementById('negLoginError');
  const btn = document.getElementById('negLoginBtn');
  if(errBox) errBox.style.display = 'none';
  if(btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Entrando...'; }
  try{
    const { data, error } = await supabase.rpc('negocio_acceso', { p_codigo: codigo, p_email: email });
    if(error) throw error;
    const acc = data && data[0];
    if(!acc || !acc.ok){
      salirPanelNegocio();
      if(errBox){
        errBox.textContent = 'No encontramos un negocio con ese código y ese correo. Revisa que sea el mismo correo con el que te inscribiste.';
        errBox.style.display = 'block';
      }
      document.getElementById('negCodigo').value = codigo;
      document.getElementById('negEmail').value = email;
      return;
    }
    guardarSesionNegocio(codigo.toUpperCase(), email);
    document.getElementById('negLoginBox').style.display = 'none';
    document.getElementById('negPanelBox').style.display = '';
    document.getElementById('negNombre').textContent = acc.nombre;
    const desde = acc.desde ? new Date(acc.desde).toLocaleDateString('es-CL', { month:'long', year:'numeric' }) : '';
    document.getElementById('negSub').textContent =
      [codigo.toUpperCase(),
       acc.founder_number ? 'Fundador #' + String(acc.founder_number).padStart(3,'0') : '',
       desde ? 'en el club desde ' + desde : ''].filter(Boolean).join(' · ');

    const { data: filas, error: err2 } = await supabase.rpc('historial_negocio', { p_codigo: codigo, p_email: email });
    if(err2) throw err2;
    renderPanelNegocio(filas || []);
  }catch(e){
    console.error(e);
    if(errBox){ errBox.textContent = 'No pudimos cargar tus visitas. Inténtalo de nuevo en un momento.'; errBox.style.display = 'block'; }
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = 'Entrar'; }
  }
}

function renderPanelNegocio(filas){
  const ahora = new Date();
  const esteMes = filas.filter(f => {
    const d = new Date(f.fecha);
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  });
  const socios = new Set(filas.map(f => f.socio_codigo));
  const conMonto = filas.filter(f => f.monto != null);
  const totalVentas = conMonto.reduce((a,f) => a + Number(f.monto || 0), 0);
  const repiten = [...socios].filter(c => filas.filter(f => f.socio_codigo === c).length > 1).length;

  const kpi = (n, label, hint) =>
    `<div class="neg-kpi"><div class="neg-kpi__n">${n}</div><div class="neg-kpi__l">${label}</div>${hint ? `<div class="neg-kpi__h">${hint}</div>` : ''}</div>`;

  document.getElementById('negKpis').innerHTML =
    kpi(filas.length, 'Visitas del club', esteMes.length + ' este mes') +
    kpi(socios.size, 'Socios distintos', repiten ? repiten + ' han vuelto' : 'ninguno ha repetido aún') +
    kpi(conMonto.length ? formatCLP(totalVentas) : '—', 'Compras registradas',
        conMonto.length ? 'en ' + conMonto.length + ' de ' + filas.length + ' visitas' : 'nadie ha anotado monto') +
    kpi(conMonto.length ? formatCLP(Math.round(totalVentas / conMonto.length)) : '—', 'Compra promedio',
        conMonto.length ? '' : 'aparece al anotar montos');

  const tabla = document.getElementById('negTabla');
  if(!filas.length){
    tabla.innerHTML = `<div class="neg-vacio">
      Todavía no has validado ninguna visita.<br>
      Cuando un socio te muestre el QR de su carnet, escanéalo con la cámara de tu celular
      y quedará registrada aquí.
    </div>`;
    return;
  }
  tabla.innerHTML = `<div class="neg-tabla"><table>
    <thead><tr><th>Fecha</th><th>Socio</th><th>Código</th><th class="num">Compra</th></tr></thead>
    <tbody>${filas.map(f => {
      const d = new Date(f.fecha);
      const fecha = d.toLocaleDateString('es-CL', { day:'2-digit', month:'short' }) + ' · ' +
                    d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', hour12:false });
      const quien = colaEsc(f.socio_nombre || '') +
        (f.socio_mascota && f.socio_mascota !== f.socio_nombre ? ` <span class="dim">· ${colaEsc(f.socio_mascota)}</span>` : '');
      return `<tr>
        <td>${fecha}</td>
        <td>${quien}</td>
        <td class="dim" style="font-family:var(--font-mono);font-size:12px;">${colaEsc(f.socio_codigo || '')}</td>
        <td class="num">${f.monto != null ? formatCLP(Number(f.monto)) : '<span class="dim">—</span>'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

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
        <a href="/planes" onclick="closeModal(); event.preventDefault(); irAPlanes();" style="color:var(--brass);text-decoration:underline;font-weight:800;">Ver planes →</a>
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
      out.innerHTML = `<div class="rep-locked">Ver el detalle de reseñas es un beneficio de los planes Pro/Premium (o todavía no hay reseñas visibles).<br><a href="/planes" onclick="event.preventDefault(); irAPlanes();" style="color:var(--brass);text-decoration:underline;font-weight:800;">Ver planes →</a></div>`;
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
    cargarColaFichas();
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
refreshFilterOptions(); // listas fijas (categorías/comunas) — se llenan una sola vez, antes de leer la URL
setDirTipo('');
manejarRutaActual(); // si se entra directo a /directorio/... (o se refresca ahí), se muestra esa vista de inmediato

// Buscar y filtrar en el directorio en vivo: antes solo se refrescaba al tocar una de
// las pestañas (Todos/Para tu mascota/Para ti como dueño); escribir en el buscador o
// cambiar categoría/comuna no hacía nada hasta tocar una pestaña. Ahora cada uno
// dispara renderDirectory() de inmediato.
document.getElementById('dirSearch').addEventListener('input', renderDirectory);
document.getElementById('dirCat').addEventListener('change', renderDirectory);
document.getElementById('dirComuna').addEventListener('change', renderDirectory);
document.getElementById('dirOrden').addEventListener('change', renderDirectory);
document.getElementById('negLoginForm').addEventListener('submit', function(e){
  e.preventDefault();
  cargarPanelNegocio(
    document.getElementById('negCodigo').value.trim().toUpperCase(),
    document.getElementById('negEmail').value.trim()
  );
});
// Cerrar el panel de filtros del celular con la tecla Esc
document.addEventListener('keydown', e => { if(e.key === 'Escape') cerrarFiltrosDir(); });

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
window.abrirBeneficio = abrirBeneficio;
window.abrirValidarConSocio = abrirValidarConSocio;
window.irAMiNegocio = irAMiNegocio;
window.salirPanelNegocio = salirPanelNegocio;
window.confirmarBeneficio = confirmarBeneficio;
window.setDirCat = setDirCat;
window.setDirComuna = setDirComuna;
window.limpiarFiltrosDir = limpiarFiltrosDir;
window.toggleVerTodas = toggleVerTodas;
window.abrirFiltrosDir = abrirFiltrosDir;
window.cerrarFiltrosDir = cerrarFiltrosDir;
window.renderDirectory = renderDirectory;
window.poblarComunas = poblarComunas;
window.filtrarPorCategoria = filtrarPorCategoria;
window.filtrarPorNegocio = filtrarPorNegocio;
window.abrirElegirCamino = abrirElegirCamino;
/* ============================================================
   COLA DE APROBACIÓN DE FICHAS DE NEGOCIO
   ------------------------------------------------------------
   Vive dentro del panel privado (sección "Fichas por aprobar").
   Todo pasa por funciones RPC con SECURITY DEFINER que verifican
   que el usuario logueado esté en la tabla `admins`, así que la
   anon key por sí sola no puede ver ni aprobar nada.
   ============================================================ */

let colaFichasCache = [];

function colaEsc(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function cargarColaFichas(){
  const cont = document.getElementById('colaFichas');
  const cnt = document.getElementById('colaCount');
  if(!cont) return;
  cont.innerHTML = '<div class="cola-vacia">Cargando…</div>';
  try{
    const { data, error } = await supabase.rpc('admin_fichas_pendientes');
    if(error) throw error;
    colaFichasCache = data || [];
    if(cnt){ cnt.textContent = colaFichasCache.length; cnt.dataset.cero = colaFichasCache.length ? '0' : '1'; }
    if(!colaFichasCache.length){
      cont.innerHTML = '<div class="cola-vacia">No hay fichas esperando revisión. 🎉</div>';
      return;
    }
    cont.innerHTML = '';
    colaFichasCache.forEach(sol => cont.appendChild(colaItemEl(sol)));
  }catch(e){
    console.error(e);
    cont.innerHTML = '<div class="cola-vacia">No pudimos cargar la cola. Vuelve a entrar al panel e inténtalo otra vez.</div>';
    if(cnt){ cnt.textContent = '0'; cnt.dataset.cero = '1'; }
  }
}

function colaItemEl(sol){
  const el = document.createElement('div');
  el.className = 'cola-item';
  el.id = 'cola-' + sol.id;
  const fecha = new Date(sol.creado_en).toLocaleString('es-CL', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  el.innerHTML = `
    <div class="cola-fecha">Recibida el ${colaEsc(fecha)}</div>
    <div class="mmc-ficha" id="colaficha-${sol.id}"></div>
    <div class="cola-priv">
      <div class="cola-priv__t">No se publica — solo para ti</div>
      <div class="cola-priv__row"><span>Razón social</span><b>${colaEsc(sol.razon_social) || '—'}</b></div>
      <div class="cola-priv__row"><span>RUT comercial</span><b>${colaEsc(sol.rut_comercial)}</b></div>
      <div class="cola-priv__row"><span>Responsable</span><b>${colaEsc(sol.responsable_nombre)} · ${colaEsc(sol.responsable_rut)}</b></div>
      <div class="cola-priv__row"><span>Correo</span><b><a href="mailto:${colaEsc(sol.responsable_email)}">${colaEsc(sol.responsable_email)}</a></b></div>
      <div class="cola-priv__row"><span>Teléfono</span><b>${colaEsc(sol.responsable_telefono)}</b></div>
      <div class="cola-priv__row"><span>Categoría en el directorio</span><b>${colaEsc(sol.dir_cat)} · ${sol.dir_tipo === 'dueno' ? 'Para el dueño' : 'Para la mascota'}${sol.es_especialista ? ' · Especialista' : ''}</b></div>
    </div>
    <div id="colaedit-${sol.id}"></div>
    <div class="cola-acciones">
      <button class="cola-btn cola-btn--ok" onclick="aprobarFicha('${sol.id}')">✓ Aprobar</button>
      <button class="cola-btn cola-btn--edit" onclick="editarFicha('${sol.id}')">✎ Modificar</button>
      <button class="cola-btn cola-btn--no" onclick="rechazarFicha('${sol.id}')">✕ Rechazar</button>
    </div>
    <div class="cola-msg" id="colamsg-${sol.id}"></div>`;
  setTimeout(() => {
    const caja = document.getElementById('colaficha-' + sol.id);
    if(caja) renderFicha(caja, fichaDesdeSolicitud(sol), { interactivo:false });
  }, 0);
  return el;
}

function colaMsg(id, texto, ok){
  const el = document.getElementById('colamsg-' + id);
  if(el){ el.textContent = texto; el.className = 'cola-msg ' + (ok ? 'cola-msg--ok' : 'cola-msg--err'); }
}
function colaBloquear(id, on){
  const el = document.getElementById('cola-' + id);
  if(el) el.dataset.ocupado = on ? '1' : '0';
}

async function aprobarFicha(id){
  const sol = colaFichasCache.find(x => x.id === id);
  if(!confirm(`¿Publicar la ficha de "${sol ? sol.nombre : 'este negocio'}"?\n\nVa a aparecer en el directorio de inmediato.`)) return;
  colaBloquear(id, true);
  colaMsg(id, 'Publicando…', true);
  try{
    const { data, error } = await supabase.rpc('aprobar_solicitud_negocio', { p_id: id });
    if(error) throw error;
    colaMsg(id, `Publicada como ${data}. Ya está en el directorio.`, true);
    setTimeout(() => { cargarColaFichas(); loadData(); }, 900);
  }catch(e){
    console.error(e);
    colaBloquear(id, false);
    colaMsg(id, 'No se pudo aprobar: ' + (e.message || 'error desconocido'), false);
  }
}

async function rechazarFicha(id){
  const motivo = prompt('¿Por qué la rechazas? (el negocio va a ver este mensaje)');
  if(motivo === null) return;
  if(!motivo.trim()){ alert('Escribe un motivo para poder avisarle al negocio.'); return; }
  colaBloquear(id, true);
  colaMsg(id, 'Guardando…', true);
  try{
    const { error } = await supabase.rpc('rechazar_solicitud_negocio', { p_id: id, p_motivo: motivo.trim() });
    if(error) throw error;
    colaMsg(id, 'Ficha rechazada.', true);
    setTimeout(cargarColaFichas, 800);
  }catch(e){
    console.error(e);
    colaBloquear(id, false);
    colaMsg(id, 'No se pudo rechazar: ' + (e.message || 'error desconocido'), false);
  }
}

/* "Modificar": abre los campos editables de esa misma ficha.
   Al guardar, la ficha de arriba se vuelve a dibujar con los cambios,
   y recién ahí decides si la apruebas. */
function editarFicha(id){
  const sol = colaFichasCache.find(x => x.id === id);
  const caja = document.getElementById('colaedit-' + id);
  if(!sol || !caja) return;
  if(caja.innerHTML){ caja.innerHTML = ''; return; }   // segundo clic: cerrar

  const campo = (name, label, valor, tipo) =>
    `<div class="cola-campo"><label for="ed-${name}-${id}">${label}</label>
       <input id="ed-${name}-${id}" type="${tipo||'text'}" value="${colaEsc(valor||'')}"></div>`;

  const cats = (typeof ALL_DIR_CATS !== 'undefined' ? ALL_DIR_CATS : [])
    .map(c => `<option ${c === sol.dir_cat ? 'selected' : ''}>${colaEsc(c)}</option>`).join('');

  caja.innerHTML = `
    <div class="cola-edit">
      <div class="cola-edit__grid">
        ${campo('nombre', 'Nombre del negocio', sol.nombre)}
        <div class="cola-campo"><label for="ed-cat-${id}">Categoría del directorio</label>
          <select id="ed-cat-${id}">${cats}</select></div>
        <div class="cola-campo"><label for="ed-tipo-${id}">Aparece en</label>
          <select id="ed-tipo-${id}">
            <option value="mascota" ${sol.dir_tipo==='mascota'?'selected':''}>Beneficios para la mascota</option>
            <option value="dueno" ${sol.dir_tipo==='dueno'?'selected':''}>Beneficios para el dueño</option>
          </select></div>
        <div class="cola-campo"><label for="ed-esp-${id}">¿Es especialista?</label>
          <select id="ed-esp-${id}">
            <option value="false" ${!sol.es_especialista?'selected':''}>No, es un local o marca</option>
            <option value="true" ${sol.es_especialista?'selected':''}>Sí, es una persona</option>
          </select></div>
        ${campo('beneficio', 'Beneficio (línea grande)', sol.beneficio_label)}
        ${campo('condicion', 'Condición (línea chica)', sol.beneficio_condicion)}
        ${campo('comuna', 'Comuna', sol.comuna)}
        ${campo('direccion', 'Dirección', sol.direccion)}
        ${campo('horario', 'Horario', sol.horario_texto)}
        ${campo('dias', 'Días de atención', sol.horario_dias)}
        ${campo('telefono', 'Teléfono del local', sol.telefono_local)}
        ${campo('whatsapp', 'WhatsApp', sol.whatsapp)}
        ${campo('instagram', 'Instagram', sol.instagram)}
        ${campo('facebook', 'Facebook', sol.facebook)}
        ${campo('tiktok', 'TikTok', sol.tiktok)}
        ${campo('maps', 'Enlace de Google Maps', sol.google_maps_url, 'url')}
        ${campo('descripcion', 'Descripción corta', sol.descripcion)}
      </div>
      <button class="cola-btn cola-btn--ok" style="width:100%;" onclick="guardarEdicionFicha('${id}')">Guardar cambios</button>
    </div>`;
}

async function guardarEdicionFicha(id){
  const v = name => { const el = document.getElementById(`ed-${name}-${id}`); return el ? el.value.trim() : null; };
  colaMsg(id, 'Guardando…', true);
  try{
    const { error } = await supabase.rpc('admin_editar_ficha', {
      p_id: id,
      p_nombre: v('nombre'),
      p_dir_cat: v('cat'),
      p_dir_tipo: v('tipo'),
      p_es_especialista: v('esp') === 'true',
      p_comuna: v('comuna'),
      p_direccion: v('direccion'),
      p_google_maps_url: v('maps'),
      p_telefono_local: v('telefono'),
      p_whatsapp: v('whatsapp'),
      p_instagram: v('instagram'),
      p_facebook: v('facebook'),
      p_tiktok: v('tiktok'),
      p_horario_texto: v('horario'),
      p_horario_dias: v('dias'),
      p_descripcion: v('descripcion'),
      p_beneficio_label: v('beneficio'),
      p_beneficio_condicion: v('condicion')
    });
    if(error) throw error;
    colaMsg(id, 'Cambios guardados. Revisa la ficha y apruébala si está lista.', true);
    await cargarColaFichas();
  }catch(e){
    console.error(e);
    colaMsg(id, 'No se pudo guardar: ' + (e.message || 'error desconocido'), false);
  }
}

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
window.cargarColaFichas = cargarColaFichas;
window.aprobarFicha = aprobarFicha;
window.rechazarFicha = rechazarFicha;
window.editarFicha = editarFicha;
window.guardarEdicionFicha = guardarEdicionFicha;
window.irADirectorio = irADirectorio;
window.irAEspecialistas = irAEspecialistas;
window.irABeneficios = irABeneficios;
window.irAPlanes = irAPlanes;
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
