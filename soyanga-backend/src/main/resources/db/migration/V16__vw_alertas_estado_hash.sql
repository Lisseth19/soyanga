-- V16__vw_alertas_estado_hash.sql
-- Vista de alertas con hash de estado (para detectar cambios y notificar)

BEGIN;

-- 1) Eliminamos la vista previa para evitar el error
DROP VIEW IF EXISTS public.vw_alertas_inventario;

-- 2) La creamos desde cero con las columnas necesarias para el backend
CREATE VIEW public.vw_alertas_inventario AS
WITH base AS (
  SELECT
    e.id_existencia_lote,
    e.id_almacen,
    a.nombre_almacen                           AS almacen,
    e.id_lote,
    l.numero_lote,
    l.id_presentacion,
    pp.codigo_sku                              AS sku,
    pr.nombre_producto                         AS producto,
    COALESCE(e.cantidad_disponible, 0)::numeric AS disponible,
    COALESCE(e.cantidad_reservada, 0)::numeric  AS reservado,
    COALESCE(e.stock_minimo, 0)::numeric        AS stock_minimo,
    l.fecha_vencimiento                        AS vencimiento
  FROM existencias_por_lote e
  JOIN almacenes a                    ON a.id_almacen = e.id_almacen
  JOIN lotes l                        ON l.id_lote = e.id_lote
  JOIN presentaciones_de_productos pp ON pp.id_presentacion = l.id_presentacion
  JOIN productos pr                   ON pr.id_producto = pp.id_producto
)
SELECT
  b.id_existencia_lote,
  b.id_almacen,
  b.almacen,
  b.id_lote,
  b.numero_lote,
  b.id_presentacion,
  b.sku,
  b.producto,
  b.disponible,
  b.reservado,
  b.stock_minimo,
  b.vencimiento,

  /* días restantes (int) */
  CASE
    WHEN b.vencimiento IS NULL THEN NULL
    ELSE (b.vencimiento::date - CURRENT_DATE)
  END::int                                   AS dias_restantes,

  /* tipo de alerta */
  CASE
    WHEN b.disponible <= 0 THEN 'stock_agotado'
    WHEN b.disponible <= b.stock_minimo THEN 'stock_bajo'
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= CURRENT_DATE THEN 'vencido'
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '7 day')::date THEN 'vencimiento_inminente'
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '30 day')::date THEN 'vencimiento_proximo'
    ELSE NULL
  END                                        AS tipo_alerta,

  /* motivo legible (mantenlo antes que severidad para compat) */
  CASE
    WHEN b.disponible <= 0 THEN 'Disponible ≤ 0'
    WHEN b.disponible <= b.stock_minimo THEN 'Disponible ≤ stock_minimo'
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= CURRENT_DATE THEN 'Lote vencido'
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '7 day')::date THEN 'Vence en ≤ 7 días'
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '30 day')::date THEN 'Vence en ≤ 30 días'
    ELSE NULL
  END                                        AS motivo_alerta,

  /* severidad (para badges/contadores) */
  CASE
    WHEN b.disponible <= 0
         OR (b.vencimiento IS NOT NULL AND b.vencimiento::date <= CURRENT_DATE)
      THEN 'urgente'
    WHEN b.disponible <= b.stock_minimo
         OR (b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '7 day')::date)
      THEN 'advertencia'
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '30 day')::date
      THEN 'proximo'
    ELSE NULL
  END                                        AS severidad,

  /* prioridad (para orden) */
  CASE
    WHEN b.disponible <= 0 THEN 100
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= CURRENT_DATE THEN 95
    WHEN b.disponible <= b.stock_minimo THEN 90
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '7 day')::date THEN 80
    WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '30 day')::date THEN 60
    ELSE 0
  END                                        AS prioridad,

  /* hash de estado (para detectar cambios) */
  md5(
    coalesce(
      CASE
        WHEN b.disponible <= 0 THEN 'stock_agotado'
        WHEN b.disponible <= b.stock_minimo THEN 'stock_bajo'
        WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= CURRENT_DATE THEN 'vencido'
        WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '7 day')::date THEN 'vencimiento_inminente'
        WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '30 day')::date THEN 'vencimiento_proximo'
        ELSE ''
      END, ''
    ) || '|' ||
    coalesce(
      CASE
        WHEN b.disponible <= 0
             OR (b.vencimiento IS NOT NULL AND b.vencimiento::date <= CURRENT_DATE)
          THEN 'urgente'
        WHEN b.disponible <= b.stock_minimo
             OR (b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '7 day')::date)
          THEN 'advertencia'
        WHEN b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '30 day')::date
          THEN 'proximo'
        ELSE ''
      END, ''
    ) || '|' ||
    coalesce(
      (CASE WHEN b.vencimiento IS NULL THEN NULL ELSE (b.vencimiento::date - CURRENT_DATE) END)::text,
      ''
    ) || '|' ||
    coalesce(b.stock_minimo::text,'') || '|' ||
    coalesce(b.disponible::text,'')
  )                                          AS estado_hash

FROM base b
WHERE
      b.disponible <= b.stock_minimo
   OR (b.vencimiento IS NOT NULL AND b.vencimiento::date <= (CURRENT_DATE + INTERVAL '30 day')::date);

COMMIT;
