# CÓMO CALCULAR EL NEGOCIO — método "de atrás hacia adelante"

Guardado el 25 de octubre de 2026, a partir del audio de Hormozi que compartió Jaime.
Sirve para cualquier línea de Mi Mascota Club (plan de dueños, verificación de negocios,
box, etc.). Se usa más adelante para decidir metas y precios.

## La idea

No hace falta inventar algo nuevo y loco para tener una empresa valiosa. Casi cualquier
negocio simple puede llegar lejos si se sabe **cuánto hay que vender cada día**. El cálculo
parte del valor de empresa que quieres y va hacia atrás hasta las ventas diarias.

## Las 6 preguntas

1. **¿Cuánto quiero que valga la empresa?** (valor objetivo)
2. **¿Qué múltiplo de utilidad paga el mercado por un negocio así?** (cuántas veces la
   utilidad anual vale la empresa; en negocios chicos suele ser bajo, por eso conviene ser
   conservador)
3. **¿Qué margen neto deja este negocio?** (utilidad ÷ facturación)
4. **¿Cuánto vale cada cliente?** (lo que paga al mes × cuántos meses se queda)
5. **¿Cuánto tengo que facturar?** (al año, al mes, a la semana, al día)
6. **¿Cuántas ventas necesito al día?**

## Las fórmulas

```
Utilidad anual necesaria = Valor objetivo ÷ Múltiplo
Facturación anual        = Utilidad anual ÷ Margen neto
Facturación mensual      = Facturación anual ÷ 12
Facturación diaria       = Facturación anual ÷ 365
Valor de un cliente      = Pago mensual × Meses que se queda (promedio)
Clientes activos         = Facturación mensual ÷ Pago mensual
Clientes nuevos al mes   = Clientes activos ÷ Meses que se queda
Clientes nuevos al día   = Clientes nuevos al mes ÷ 30
```

## El ejemplo del audio (limpieza de casas, EE.UU.)

- Cliente paga US$400 al mes y se queda 2 años → vale **US$9.600**.
- Margen neto de la industria: 20%.
- Para que la empresa valga US$100 millones se necesitan unos US$12-15 millones de utilidad.
  Para ir a la segura: **US$20 millones**.
- US$20 millones es el 20% de → **US$100 millones de facturación al año**.
- Eso es **US$8,3 millones al mes**, unos **US$2 millones a la semana**, unos
  **US$275-300 mil al día**.
- Con eso se calcula cuántas ventas diarias hacen falta según lo que vale cada cliente.

## Aplicado a Mi Mascota Club (números de ejemplo)

Supuestos para ilustrar, **no son datos reales todavía**. Hay que reemplazarlos cuando haya
historia: cuántos meses se queda un socio que paga y cuál es el margen real.

### Meta 1 — que el club pague un sueldo (lo más cercano)

| Paso | Cálculo | Resultado |
|---|---|---|
| Utilidad que quiero al mes | — | $1.500.000 |
| Margen neto supuesto (negocio digital) | 30% | — |
| Facturación mensual necesaria | 1.500.000 ÷ 0,30 | **$5.000.000** |
| Plan de dueños a $9.990/mes | 5.000.000 ÷ 9.990 | **≈ 500 socios pagando** |
| Si un socio paga 12 meses en promedio | 500 ÷ 12 | **≈ 42 socios nuevos pagando al mes** |
| Al día | 42 ÷ 30 | **≈ 1,4 socios nuevos pagando al día** |

Combinado con negocios verificados (ver VERIFICADO-PET-FRIENDLY.md), la meta baja: por
ejemplo, 30 negocios pagando $14.990 al mes son $450.000, y 3 verificaciones nuevas al mes a
$100.000 son $300.000 más.

### Meta 2 — una empresa que valga $1.000 millones

| Paso | Cálculo | Resultado |
|---|---|---|
| Valor objetivo | — | $1.000.000.000 |
| Múltiplo conservador | 4 veces la utilidad | — |
| Utilidad anual | 1.000M ÷ 4 | $250.000.000 |
| Margen neto | 30% | — |
| Facturación anual | 250M ÷ 0,30 | **$833.000.000** |
| Facturación mensual | ÷ 12 | **≈ $69.400.000** |
| Facturación diaria | ÷ 365 | **≈ $2.280.000** |
| Socios pagando a $9.990 (si fuera solo eso) | 69,4M ÷ 9.990 | **≈ 6.950** |
| Socios nuevos al mes (si se quedan 12 meses) | 6.950 ÷ 12 | **≈ 580** (unos 19 al día) |

Para comparar: en Chile hay unos 2,7 millones de hogares que gastan en sus mascotas
(MERCADO-MASCOTAS.md). 6.950 es 0,26% de ellos.

## Qué mirar siempre

- **Cuánto se queda un cliente** es el número que más mueve todo. Si un socio se queda 24
  meses en vez de 12, se necesitan la mitad de socios nuevos.
- **El margen real** se sabe cuando haya costos reales (Netlify, Supabase, kit, envíos,
  comisiones de Mercado Pago, tiempo de Jaime).
- **Ventas por día** es la meta que se mira a diario. Las demás se miran al mes.
- Antes de cobrar en serie, ordenar la boleta o factura con un contador.
