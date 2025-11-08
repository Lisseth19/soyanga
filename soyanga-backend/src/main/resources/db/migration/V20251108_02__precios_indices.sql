-- =========================================
-- Índices Sprint 7 — Reglas de precios
-- Requiere PostgreSQL 9.5+ (por IF NOT EXISTS)
-- =========================================

-- 0) Normalizar: dejar solo 1 fila vigente por id_presentacion.
--    Usamos ctid (system column) porque no sabemos el nombre de la PK.
WITH vigentes AS (
  SELECT
    ctid,                       -- identificador físico de la fila
    id_presentacion,
    ROW_NUMBER() OVER (
      PARTITION BY id_presentacion
      ORDER BY fecha_inicio_vigencia DESC, ctid DESC
    ) AS rn
  FROM precios_de_venta_historicos
  WHERE fecha_fin_vigencia IS NULL
),
cerrar AS (
  SELECT ctid
  FROM vigentes
  WHERE rn > 1                  -- todas menos la más reciente
)
UPDATE precios_de_venta_historicos p
SET fecha_fin_vigencia = NOW()
FROM cerrar c
WHERE p.ctid = c.ctid;

-- 1) Único vigente por presentación (solo cuando fecha_fin_vigencia es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_precio_vigente_por_presentacion
  ON precios_de_venta_historicos (id_presentacion)
  WHERE fecha_fin_vigencia IS NULL;

-- 2) Búsquedas rápidas por historial (inicio de vigencia DESC)
CREATE INDEX IF NOT EXISTS idx_precio_hist_inicio_desc
  ON precios_de_venta_historicos (id_presentacion, fecha_inicio_vigencia DESC);

-- 3) Tipos de cambio por par y vigencia (consulta del vigente más reciente)
CREATE INDEX IF NOT EXISTS idx_tc_par_fecha_desc
  ON tipos_de_cambio (id_moneda_origen, id_moneda_destino, fecha_vigencia DESC);
