-- ============================================================
-- PARCHE v7: plan de membresía del socio (Free / Pro / Premium)
-- ============================================================
-- Ejecuta esto una vez en el SQL Editor. Agrega la columna "plan" a la
-- tabla socios, para reemplazar la antigua etiqueta fija "Socio fundador"
-- del carnet por el plan de membresía real del dueño.
--
-- Por ahora NO hay pasarela de pago conectada, así que todo registro
-- nuevo queda automáticamente en 'free' (gracias al "default" de abajo).
-- Cuando conectemos la pasarela de pago más adelante, un webhook (Edge
-- Function) podrá actualizar esta columna a 'pro' o 'premium' según la
-- suscripción activa del socio.
--
-- Mientras tanto, para VER cómo se ve el carnet con otro plan, puedes
-- cambiar el valor a mano en Supabase → Table Editor → tabla "socios"
-- → columna "plan" de cualquier fila, escribiendo "pro" o "premium".
-- ============================================================

alter table socios
  add column if not exists plan text not null default 'free';

-- Nos aseguramos de que el valor siempre sea uno de los 3 planes válidos.
alter table socios drop constraint if exists socios_plan_check;
alter table socios
  add constraint socios_plan_check check (plan in ('free','pro','premium'));

-- Verificación: deberías ver la columna "plan" en el resultado.
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'socios' and column_name = 'plan';
