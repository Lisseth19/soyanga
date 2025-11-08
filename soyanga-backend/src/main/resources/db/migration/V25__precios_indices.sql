-- =========================================
-- Índices Sprint 7 — Reglas de precios
-- Requiere PostgreSQL 9.5+ (por IF NOT EXISTS)
-- =========================================

-- 1) Único vigente por presentación (evita más de un precio con fecha_fin_vigencia NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_precio_vigente_por_presentacion
ON precios_de_venta_historicos (id_presentacion)
WHERE fecha_fin_vigencia IS NULL;

-- 2) Búsquedas rápidas por historial (listar por inicio de vigencia descendente)
CREATE INDEX IF NOT EXISTS idx_precio_hist_inicio_desc
ON precios_de_venta_historicos (id_presentacion, fecha_inicio_vigencia DESC);

-- 3) Tipos de cambio por par y vigencia (consulta del vigente más reciente)
CREATE INDEX IF NOT EXISTS idx_tc_par_fecha_desc
ON tipos_de_cambio (id_moneda_origen, id_moneda_destino, fecha_vigencia DESC);
