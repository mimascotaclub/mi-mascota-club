/* ============================================================
   Mi Mascota Club — Logos de la franja de la portada
   ------------------------------------------------------------
   Esta es la lista de los logos que aparecen en la cinta que se
   desplaza bajo el buscador. Son espacios PAGADOS: no se leen de
   la tabla `negocios`, se agregan a mano aquí.

   CÓMO AGREGAR UNO
   1. Deja el archivo en  assets/logos/
   2. Agrega una línea a la lista de abajo.
   3. Listo — no hay que tocar nada más.

   MEDIDA DEL ARCHIVO (esto es lo importante)
   Todos los logos se entregan ya compuestos dentro de un lienzo
   de 300 × 120 px (proporción 5:2), con el logo centrado y con
   aire a los lados. Así da lo mismo que el logo sea horizontal o
   cuadrado: el que manda es el lienzo, y todos se ven parejos.
     · SVG  → viewBox="0 0 300 120"
     · PNG  → 900 × 360 px (el triple, para pantallas retina),
              fondo transparente, menos de 300 KB
   En el sitio se muestran a 150 × 60 px sobre el cuadro blanco.

   `url` es opcional: si la pones, el logo lleva al sitio del
   negocio; si no, lleva a su ficha en el directorio buscándolo
   por nombre.
   ============================================================ */

const LOGOS_PARTNERS = [
  // { nombre: 'Veterinaria Los Robles', archivo: 'assets/logos/los-robles.svg', url: 'https://losrobles.cl' },
  // { nombre: 'Café Con Patas',         archivo: 'assets/logos/con-patas.svg' },
];

/* Cuántos espacios muestra la cinta. Mientras haya menos logos que
   esta cantidad, el resto se rellena con "Tu negocio aquí". Cuando
   haya más de 15, se muestran todos igual y la cinta sigue girando
   en bucle — nadie queda fuera. */
const LOGOS_PARTNERS_ESPACIOS = 15;

if (typeof window !== 'undefined') {
  window.LOGOS_PARTNERS = LOGOS_PARTNERS;
  window.LOGOS_PARTNERS_ESPACIOS = LOGOS_PARTNERS_ESPACIOS;
}
