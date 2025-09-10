-- V4__monedas.sql
-- Solo índices/normalización/seed para la tabla existente "monedas"

-- 0) Verificación básica: si NO existe la tabla, aborta con mensaje claro
DO $$
BEGIN
  IF to_regclass('public.monedas') IS NULL THEN
    RAISE EXCEPTION 'La tabla "monedas" no existe. Asegúrate que V1__schema.sql la cree.';
END IF;
END $$;

-- 1) Normalización de datos ya existentes
UPDATE monedas
SET codigo_moneda = upper(trim(codigo_moneda))
WHERE codigo_moneda IS NOT NULL
  AND codigo_moneda <> upper(trim(codigo_moneda));

UPDATE monedas
SET nombre_moneda = trim(nombre_moneda)
WHERE nombre_moneda IS NOT NULL
  AND nombre_moneda <> trim(nombre_moneda);

-- 2) Índice único case-insensitive por código
CREATE UNIQUE INDEX IF NOT EXISTS uq_monedas_codigo_lower
    ON monedas ((lower(codigo_moneda)));

-- 3) Seed idempotente (sin ON CONFLICT por ser índice funcional)
INSERT INTO monedas (codigo_moneda, nombre_moneda, es_moneda_local)
SELECT 'BOB', 'Boliviano', TRUE
    WHERE NOT EXISTS (
  SELECT 1 FROM monedas WHERE lower(codigo_moneda) = 'bob'
);

INSERT INTO monedas (codigo_moneda, nombre_moneda, es_moneda_local)
SELECT 'USD', 'Dólar estadounidense', FALSE
    WHERE NOT EXISTS (
  SELECT 1 FROM monedas WHERE lower(codigo_moneda) = 'usd'
);

-- 4) (Opcional recomendado) Enforzar que haya *a lo sumo una* moneda local
--    Si ya tienes 2+ TRUE, no lo crea y deja un aviso.
DO $$
BEGIN
  IF (SELECT count(*) FROM monedas WHERE es_moneda_local) <= 1 THEN
-- Única fila con es_moneda_local=TRUE (índice único sobre constante con filtro)
CREATE UNIQUE INDEX IF NOT EXISTS uq_monedas_solo_una_local
    ON monedas ((true))
    WHERE es_moneda_local;
ELSE
    RAISE NOTICE 'No se crea uq_monedas_solo_una_local: hay varias filas con es_moneda_local=TRUE';
END IF;
END $$;
