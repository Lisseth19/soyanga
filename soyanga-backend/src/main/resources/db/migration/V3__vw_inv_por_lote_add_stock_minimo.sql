-- V3__vw_inv_por_lote_add_stock_minimo.sql

-- IMPORTANTE: En PG, para cambiar columnas de una vista hay que soltarla y recrearla.
-- Si te diera error por dependencias, cambia a: DROP VIEW IF EXISTS vw_inventario_por_lote CASCADE;
DROP VIEW IF EXISTS vw_inventario_por_lote;

CREATE VIEW vw_inventario_por_lote AS
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
    epl.stock_minimo            AS stock_minimo,
    l.fecha_vencimiento         AS vencimiento
FROM existencias_por_lote epl
         JOIN almacenes a                 ON a.id_almacen = epl.id_almacen
         JOIN lotes l                     ON l.id_lote = epl.id_lote
         JOIN presentaciones_de_productos pp ON pp.id_presentacion = l.id_presentacion
         JOIN productos p                 ON p.id_producto = pp.id_producto
;
