-- V20__anticipos_pedido_vs_reserva.sql
-- PostgreSQL / Flyway

-- 1) Nueva columna (idempotente)
ALTER TABLE public.anticipos_detalle
    ADD COLUMN IF NOT EXISTS cantidad_solicitada NUMERIC(18,3) NOT NULL DEFAULT 0;

-- 2) Backfill: si había reservas, que el pedido inicial sea igual
UPDATE public.anticipos_detalle
SET cantidad_solicitada = COALESCE(cantidad_reservada, 0)
WHERE COALESCE(cantidad_reservada, 0) <> 0
  AND COALESCE(cantidad_solicitada, 0) = 0;

-- 3) Normalizar cantidad_reservada: default y NOT NULL
ALTER TABLE public.anticipos_detalle
    ALTER COLUMN cantidad_reservada SET DEFAULT 0;

UPDATE public.anticipos_detalle
SET cantidad_reservada = 0
WHERE cantidad_reservada IS NULL;

ALTER TABLE public.anticipos_detalle
    ALTER COLUMN cantidad_reservada SET NOT NULL;

-- 4) Consolidar duplicados con tabla temporal
DROP TABLE IF EXISTS tmp_antdet_dups;
CREATE TEMP TABLE tmp_antdet_dups AS
SELECT
    id_anticipo,
    id_presentacion,
    id_almacen,
    MIN(id_anticipo_detalle)                      AS keep_id,
    COUNT(*)                                      AS cnt,
    SUM(COALESCE(cantidad_reservada,0))          AS sum_res,
    SUM(COALESCE(cantidad_solicitada,0))         AS sum_sol
FROM public.anticipos_detalle
GROUP BY 1,2,3
HAVING COUNT(*) > 1;

-- Actualizar la fila que se conserva
UPDATE public.anticipos_detalle ad
SET cantidad_reservada  = t.sum_res,
    cantidad_solicitada = t.sum_sol
FROM tmp_antdet_dups t
WHERE ad.id_anticipo_detalle = t.keep_id;

-- Borrar duplicados restantes
DELETE FROM public.anticipos_detalle ad
    USING tmp_antdet_dups t
WHERE ad.id_anticipo_detalle <> t.keep_id
  AND ad.id_anticipo       = t.id_anticipo
  AND ad.id_presentacion   = t.id_presentacion
  AND ad.id_almacen        = t.id_almacen;

DROP TABLE IF EXISTS tmp_antdet_dups;

-- 5) CHECKs
ALTER TABLE public.anticipos_detalle
    DROP CONSTRAINT IF EXISTS chk_antdet_nonneg,
    DROP CONSTRAINT IF EXISTS chk_antdet_sane;

ALTER TABLE public.anticipos_detalle
    ADD CONSTRAINT chk_antdet_nonneg
        CHECK (cantidad_solicitada >= 0::numeric AND cantidad_reservada >= 0::numeric),
    ADD CONSTRAINT chk_antdet_sane
        CHECK (cantidad_solicitada >= cantidad_reservada);

-- 6) UNIQUE por (anticipo, presentacion, almacen)
DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_antdet_anticipo_presentacion_almacen'
        ) THEN
            ALTER TABLE public.anticipos_detalle
                ADD CONSTRAINT uq_antdet_anticipo_presentacion_almacen
                    UNIQUE (id_anticipo, id_presentacion, id_almacen);
        END IF;
    END$$;

-- 7) Índices de ayuda
CREATE INDEX IF NOT EXISTS idx_antdet_by_anticipo     ON public.anticipos_detalle (id_anticipo);
CREATE INDEX IF NOT EXISTS idx_antdet_by_presentacion ON public.anticipos_detalle (id_presentacion);

-- 8) Comentarios
COMMENT ON COLUMN public.anticipos_detalle.cantidad_solicitada
    IS 'Cantidad pedida en el anticipo. Puede ser > cantidad_reservada cuando no hay stock.';
COMMENT ON COLUMN public.anticipos_detalle.cantidad_reservada
    IS 'Cantidad efectivamente reservada (bloquea stock). 0 si aún no se reservó.';
