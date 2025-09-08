-- Vista de inventario por lote (lectura para listados/paginación)
-- Basada en V1__schema.sql compartido
CREATE OR REPLACE VIEW vw_inventario_por_lote AS
SELECT
    epl.id_existencia_lote      AS id_existencia_lote,
    epl.id_almacen              AS id_almacen,
    a.nombre_almacen            AS almacen,
    l.id_lote                   AS id_lote,
    l.numero_lote               AS numero_lote,
    pp.id_presentacion          AS id_presentacion,
    pp.codigo_sku               AS sku,
    p.nombre_producto           AS producto,
    epl.cantidad_disponible     AS disponible,
    epl.cantidad_reservada      AS reservado,
    l.fecha_vencimiento         AS vencimiento
FROM existencias_por_lote epl
         JOIN almacenes a                 ON a.id_almacen = epl.id_almacen
         JOIN lotes l                     ON l.id_lote = epl.id_lote
         JOIN presentaciones_de_productos pp ON pp.id_presentacion = l.id_presentacion
         JOIN productos p                 ON p.id_producto = pp.id_producto
-- (Opcional) Solo activos en catálogo, descomenta si quieres filtrar:
-- WHERE p.estado_activo = TRUE AND pp.estado_activo = TRUE AND a.estado_activo = TRUE
;

-- Sugerencias: la vista se apoya en índices ya creados en tablas base:
-- idx_existencias_almacen, idx_existencias_lote, idx_lotes_vencimiento,
-- idx_presentaciones_producto, idx_productos_nombre (TSVector), etc.
