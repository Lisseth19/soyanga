-- =========================================
-- Sprint 7 — Agregar columna 'usuario' al histórico de precios
-- Compatible con PostgreSQL 9.5+ (IF NOT EXISTS)
-- =========================================

-- 1) Agrega la columna si no existe
ALTER TABLE precios_de_venta_historicos
ADD COLUMN IF NOT EXISTS usuario TEXT;

-- 2) Backfill opcional: etiqueta registros antiguos como 'sistema'
UPDATE precios_de_venta_historicos
SET usuario = 'sistema'
WHERE usuario IS NULL;

-- 3) Índice para acelerar filtros por usuario (case-insensitive)
--    Si usas ILIKE/LOWER en tus consultas:
CREATE INDEX IF NOT EXISTS idx_precios_hist_usuario_lower
ON precios_de_venta_historicos (LOWER(usuario));

-- (Opcional) Si no filtras case-insensitive, usa un índice simple:
-- CREATE INDEX IF NOT EXISTS idx_precios_hist_usuario
-- ON precios_de_venta_historicos (usuario);
