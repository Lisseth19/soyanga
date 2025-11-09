-- V20_1__add_id_almacen_to_anticipos_detalle.sql

-- 1) Asegurar columna id_almacen en anticipos_detalle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='anticipos_detalle'
          AND column_name='id_almacen'
    ) THEN
ALTER TABLE public.anticipos_detalle
    ADD COLUMN id_almacen BIGINT;
END IF;
END$$;

-- 2) Backfill desde anticipos.id_almacen si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='anticipos'
          AND column_name='id_almacen'
    ) THEN
UPDATE public.anticipos_detalle d
SET id_almacen = a.id_almacen
    FROM public.anticipos a
WHERE a.id_anticipo = d.id_anticipo
  AND d.id_almacen IS NULL;
END IF;
END$$;

-- 3) NOT NULL solo si ya no quedan nulos (evita romper si falta backfill)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.anticipos_detalle WHERE id_almacen IS NULL LIMIT 1) THEN
        RAISE NOTICE 'anticipos_detalle.id_almacen aún tiene NULLs; se mantiene NULLABLE por ahora';
ELSE
ALTER TABLE public.anticipos_detalle
    ALTER COLUMN id_almacen SET NOT NULL;
END IF;
END$$;

-- 4) Índice de apoyo
CREATE INDEX IF NOT EXISTS idx_antdet_by_almacen
    ON public.anticipos_detalle (id_almacen);
