/* ============================================================
   Mi Mascota Club — Catálogos del flujo de negocios
   Fuente única de verdad para el formulario y para la ficha.
   ------------------------------------------------------------
   local:  true  -> tiene local físico (pide dirección + Google Maps + horario)
           false -> servicio sin local (pide comunas de cobertura)
   Nota: la COMUNA siempre es obligatoria, tenga local o no.
   ============================================================ */

const TIPOS_NEGOCIO = [
  {
    grupo: 'Salud veterinaria',
    items: [
      { id: 'veterinaria',              nombre: 'Veterinaria / Clínica veterinaria', local: true },
      { id: 'hospital_veterinario',     nombre: 'Hospital veterinario 24 horas',     local: true },
      { id: 'urgencia_veterinaria',     nombre: 'Urgencias veterinarias',            local: true },
      { id: 'veterinario_domicilio',    nombre: 'Veterinario a domicilio',           local: false },
      { id: 'veterinaria_movil',        nombre: 'Veterinaria móvil',                 local: false },
      { id: 'especialista_veterinario', nombre: 'Especialista veterinario (traumatología, oftalmología, etc.)', local: true },
      { id: 'odontologia_veterinaria',  nombre: 'Odontología veterinaria',           local: true },
      { id: 'laboratorio_imagenologia', nombre: 'Laboratorio e imagenología',        local: true },
      { id: 'farmacia_veterinaria',     nombre: 'Farmacia veterinaria',              local: true },
      { id: 'fisioterapia_animal',      nombre: 'Fisioterapia y rehabilitación animal', local: true },
      { id: 'medicina_integrativa',     nombre: 'Acupuntura y medicina integrativa animal', local: true }
    ]
  },
  {
    grupo: 'Cuidado y estética',
    items: [
      { id: 'peluqueria_canina',    nombre: 'Peluquería canina / Grooming',     local: true },
      { id: 'grooming_domicilio',   nombre: 'Grooming a domicilio',             local: false },
      { id: 'spa_mascotas',         nombre: 'Spa para mascotas',                local: true },
      { id: 'guarderia_dia',        nombre: 'Guardería de día (daycare)',       local: true },
      { id: 'hotel_mascotas',       nombre: 'Hotel para mascotas',              local: true },
      { id: 'cuidador_domicilio',   nombre: 'Cuidador a domicilio / Pet sitter', local: false },
      { id: 'paseador',             nombre: 'Paseador de perros',               local: false }
    ]
  },
  {
    grupo: 'Educación y comportamiento',
    items: [
      { id: 'entrenador_canino',   nombre: 'Entrenador canino / Adiestrador',    local: false },
      { id: 'etologo',             nombre: 'Etólogo / Especialista en conducta', local: false },
      { id: 'escuela_canina',      nombre: 'Escuela de adiestramiento',          local: true },
      { id: 'terapia_asistida',    nombre: 'Terapia asistida con animales',      local: false }
    ]
  },
  {
    grupo: 'Tiendas y productos',
    items: [
      { id: 'petshop',            nombre: 'Tienda de mascotas / Petshop',       local: true },
      { id: 'forrajeria',         nombre: 'Tienda de alimento / Forrajería',    local: true },
      { id: 'tienda_online',      nombre: 'Tienda online de mascotas',          local: false },
      { id: 'alimento_natural',   nombre: 'Alimentación natural / BARF',        local: true },
      { id: 'pasteleria_mascotas',nombre: 'Pastelería y snacks para mascotas',  local: true },
      { id: 'ropa_accesorios',    nombre: 'Ropa y accesorios para mascotas',    local: true },
      { id: 'juguetes',           nombre: 'Juguetes y enriquecimiento',         local: true },
      { id: 'camas_muebles',      nombre: 'Camas y muebles para mascotas',      local: true },
      { id: 'placas_id',          nombre: 'Placas de identificación y grabado', local: false }
    ]
  },
  {
    grupo: 'Servicios especializados',
    items: [
      { id: 'transporte_mascotas',  nombre: 'Transporte de mascotas',                  local: false },
      { id: 'traslado_internacional', nombre: 'Traslado internacional y documentación', local: false },
      { id: 'microchip_registro',   nombre: 'Microchip y registro',                    local: true },
      { id: 'seguro_mascotas',      nombre: 'Seguro para mascotas',                    local: false },
      { id: 'fotografia_mascotas',  nombre: 'Fotografía de mascotas',                  local: false },
      { id: 'funeraria_mascotas',   nombre: 'Servicios funerarios y cremación',        local: true },
      { id: 'sanitizacion_hogar',   nombre: 'Limpieza y sanitización de hogar',        local: false },
      { id: 'adopcion_rescate',     nombre: 'Fundación de adopción y rescate',         local: true },
      { id: 'criadero',             nombre: 'Criadero registrado',                     local: true }
    ]
  },
  {
    grupo: 'Espacios pet friendly',
    items: [
      { id: 'cafe_pet_friendly',       nombre: 'Café pet friendly',              local: true },
      { id: 'restaurante_pet_friendly',nombre: 'Restaurante pet friendly',       local: true },
      { id: 'bar_pet_friendly',        nombre: 'Bar o cervecería pet friendly',  local: true },
      { id: 'heladeria_pet_friendly',  nombre: 'Heladería pet friendly',         local: true },
      { id: 'hotel_pet_friendly',      nombre: 'Hotel o cabaña pet friendly',    local: true },
      { id: 'cancha_perros',           nombre: 'Cancha o parque de pago para perros', local: true },
      { id: 'piscina_perros',          nombre: 'Piscina para perros',            local: true },
      { id: 'coworking_pet_friendly',  nombre: 'Coworking o librería pet friendly', local: true }
    ]
  },
  {
    grupo: 'Para el dueño (lifestyle)',
    items: [
      { id: 'barberia',        nombre: 'Barbería',                        local: true },
      { id: 'peluqueria',      nombre: 'Peluquería y salón de belleza',   local: true },
      { id: 'unas_estetica',   nombre: 'Uñas y estética',                 local: true },
      { id: 'gimnasio',        nombre: 'Gimnasio o centro deportivo',     local: true },
      { id: 'tienda_ropa',     nombre: 'Tienda de ropa',                  local: true },
      { id: 'otro',            nombre: 'Otro (lo revisamos contigo)',     local: true }
    ]
  }
];


/* ------------------------------------------------------------
   Puente con el directorio que ya existe.
   Cada tipo de negocio se traduce al par (tipo, cat) que usa el
   directorio del sitio, y dice si es un especialista (una sola
   persona) para la página /especialistas.
   ------------------------------------------------------------ */
const MAPA_DIRECTORIO = {
  veterinaria: { tipo: 'mascota', cat: 'Veterinaria', especialista: false },
  hospital_veterinario: { tipo: 'mascota', cat: 'Veterinaria', especialista: false },
  urgencia_veterinaria: { tipo: 'mascota', cat: 'Veterinaria', especialista: false },
  veterinario_domicilio: { tipo: 'mascota', cat: 'Veterinaria', especialista: true },
  veterinaria_movil: { tipo: 'mascota', cat: 'Veterinaria', especialista: false },
  especialista_veterinario: { tipo: 'mascota', cat: 'Salud', especialista: true },
  odontologia_veterinaria: { tipo: 'mascota', cat: 'Salud', especialista: false },
  laboratorio_imagenologia: { tipo: 'mascota', cat: 'Salud', especialista: false },
  farmacia_veterinaria: { tipo: 'mascota', cat: 'Salud', especialista: false },
  fisioterapia_animal: { tipo: 'mascota', cat: 'Salud', especialista: false },
  medicina_integrativa: { tipo: 'mascota', cat: 'Salud', especialista: false },
  peluqueria_canina: { tipo: 'mascota', cat: 'Peluquería', especialista: false },
  grooming_domicilio: { tipo: 'mascota', cat: 'Peluquería', especialista: true },
  spa_mascotas: { tipo: 'mascota', cat: 'Peluquería', especialista: false },
  guarderia_dia: { tipo: 'mascota', cat: 'Hotel / Pensión', especialista: false },
  hotel_mascotas: { tipo: 'mascota', cat: 'Hotel / Pensión', especialista: false },
  cuidador_domicilio: { tipo: 'mascota', cat: 'Hotel / Pensión', especialista: true },
  paseador: { tipo: 'mascota', cat: 'Paseador', especialista: true },
  entrenador_canino: { tipo: 'mascota', cat: 'Adiestramiento', especialista: true },
  etologo: { tipo: 'mascota', cat: 'Adiestramiento', especialista: true },
  escuela_canina: { tipo: 'mascota', cat: 'Adiestramiento', especialista: false },
  terapia_asistida: { tipo: 'mascota', cat: 'Salud', especialista: true },
  petshop: { tipo: 'mascota', cat: 'Tienda', especialista: false },
  forrajeria: { tipo: 'mascota', cat: 'Alimentos', especialista: false },
  tienda_online: { tipo: 'mascota', cat: 'Tienda', especialista: false },
  alimento_natural: { tipo: 'mascota', cat: 'Alimentos', especialista: false },
  pasteleria_mascotas: { tipo: 'mascota', cat: 'Alimentos', especialista: false },
  ropa_accesorios: { tipo: 'mascota', cat: 'Accesorios', especialista: false },
  juguetes: { tipo: 'mascota', cat: 'Accesorios', especialista: false },
  camas_muebles: { tipo: 'mascota', cat: 'Accesorios', especialista: false },
  placas_id: { tipo: 'mascota', cat: 'Accesorios', especialista: false },
  transporte_mascotas: { tipo: 'mascota', cat: 'Servicios', especialista: false },
  traslado_internacional: { tipo: 'mascota', cat: 'Servicios', especialista: false },
  microchip_registro: { tipo: 'mascota', cat: 'Salud', especialista: false },
  seguro_mascotas: { tipo: 'mascota', cat: 'Servicios', especialista: false },
  fotografia_mascotas: { tipo: 'mascota', cat: 'Fotografía', especialista: true },
  funeraria_mascotas: { tipo: 'mascota', cat: 'Servicios', especialista: false },
  sanitizacion_hogar: { tipo: 'mascota', cat: 'Servicios', especialista: false },
  adopcion_rescate: { tipo: 'mascota', cat: 'Servicios', especialista: false },
  criadero: { tipo: 'mascota', cat: 'Servicios', especialista: false },
  cafe_pet_friendly: { tipo: 'dueno', cat: 'Café', especialista: false },
  restaurante_pet_friendly: { tipo: 'dueno', cat: 'Restaurante', especialista: false },
  bar_pet_friendly: { tipo: 'dueno', cat: 'Restaurante', especialista: false },
  heladeria_pet_friendly: { tipo: 'dueno', cat: 'Café', especialista: false },
  hotel_pet_friendly: { tipo: 'dueno', cat: 'Hotel', especialista: false },
  cancha_perros: { tipo: 'dueno', cat: 'Deporte', especialista: false },
  piscina_perros: { tipo: 'dueno', cat: 'Deporte', especialista: false },
  coworking_pet_friendly: { tipo: 'dueno', cat: 'Otro', especialista: false },
  barberia: { tipo: 'dueno', cat: 'Barbería', especialista: false },
  peluqueria: { tipo: 'dueno', cat: 'Belleza', especialista: false },
  unas_estetica: { tipo: 'dueno', cat: 'Belleza', especialista: false },
  gimnasio: { tipo: 'dueno', cat: 'Deporte', especialista: false },
  tienda_ropa: { tipo: 'dueno', cat: 'Tienda', especialista: false },
  otro: { tipo: 'dueno', cat: 'Otro', especialista: false },
};

function directorioPara(id) {
  return MAPA_DIRECTORIO[id] || { tipo: 'mascota', cat: 'Servicios', especialista: false };
}

/* --- Beneficio: paso 1 de 3 — qué entrega el negocio (10 opciones) --- */
const BENEFICIO_VALOR = [
  { id: 'desc_10',       etiqueta: '10% de descuento' },
  { id: 'desc_15',       etiqueta: '15% de descuento' },
  { id: 'desc_20',       etiqueta: '20% de descuento' },
  { id: 'desc_25',       etiqueta: '25% de descuento' },
  { id: 'desc_30',       etiqueta: '30% de descuento' },
  { id: 'desc_40',       etiqueta: '40% de descuento' },
  { id: 'desc_50',       etiqueta: '50% de descuento' },
  { id: 'dos_x_uno',     etiqueta: '2x1' },
  { id: 'regalo',        etiqueta: 'Producto o servicio de regalo' },
  { id: 'envio_gratis',  etiqueta: 'Envío gratis' }
];

/* --- Beneficio: paso 2 de 3 — sobre qué aplica --- */
const BENEFICIO_SOBRE = [
  { id: 'compras',            etiqueta: 'En compras' },
  { id: 'todos_productos',    etiqueta: 'En todos los productos' },
  { id: 'productos_selecc',   etiqueta: 'En productos seleccionados' },
  { id: 'servicios',          etiqueta: 'En todos los servicios' },
  { id: 'servicio_especifico',etiqueta: 'En un servicio específico' },
  { id: 'total_boleta',       etiqueta: 'En el total de la boleta' },
  { id: 'primera_compra',     etiqueta: 'En la primera compra' },
  { id: 'segundo_producto',   etiqueta: 'En el segundo producto' }
];

/* --- Beneficio: paso 3 de 3 — cuándo aplica --- */
const BENEFICIO_CUANDO = [
  { id: 'todos_los_dias',  etiqueta: 'Todos los días' },
  { id: 'todo_el_mes',     etiqueta: 'Durante todo el mes' },
  { id: 'lun_vie',         etiqueta: 'De lunes a viernes' },
  { id: 'fin_de_semana',   etiqueta: 'Solo fines de semana' },
  { id: 'dia_lunes',       etiqueta: 'Solo los lunes' },
  { id: 'dia_martes',      etiqueta: 'Solo los martes' },
  { id: 'dia_miercoles',   etiqueta: 'Solo los miércoles' },
  { id: 'dia_jueves',      etiqueta: 'Solo los jueves' },
  { id: 'dia_viernes',     etiqueta: 'Solo los viernes' },
  { id: 'dia_sabado',      etiqueta: 'Solo los sábados' },
  { id: 'dia_domingo',     etiqueta: 'Solo los domingos' },
  { id: 'primera_semana',  etiqueta: 'Primera semana del mes' }
];

/* --- Helpers --- */
const TIPOS_PLANOS = TIPOS_NEGOCIO.flatMap(g => g.items);

function tipoNegocioPorId(id) {
  return TIPOS_PLANOS.find(t => t.id === id) || null;
}

function tipoTieneLocal(id) {
  const t = tipoNegocioPorId(id);
  return t ? t.local : true;
}

function etiqueta(catalogo, id) {
  const o = catalogo.find(x => x.id === id);
  return o ? o.etiqueta : '';
}

/* Texto que se imprime en la ficha, ej:
   "20% DE DESCUENTO" / "SOLO LOS JUEVES" / "POR COMPRAS SOBRE $30.000" */
function beneficioTexto(b) {
  if (!b || !b.valor) return null;
  const linea1 = etiqueta(BENEFICIO_VALOR, b.valor);
  const cuando = etiqueta(BENEFICIO_CUANDO, b.cuando);
  const sobre  = etiqueta(BENEFICIO_SOBRE, b.sobre);
  let condicion = sobre;
  if (b.monto_minimo) {
    condicion = `${sobre} sobre $${Number(b.monto_minimo).toLocaleString('es-CL')}`;
  }
  if (b.detalle) condicion += ` · ${b.detalle}`;
  return { principal: linea1, cuando, condicion };
}

if (typeof module !== 'undefined') {
  module.exports = {
    TIPOS_NEGOCIO, TIPOS_PLANOS, BENEFICIO_VALOR, BENEFICIO_SOBRE, BENEFICIO_CUANDO,
    tipoNegocioPorId, tipoTieneLocal, etiqueta, beneficioTexto,
    MAPA_DIRECTORIO, directorioPara
  };
}
