-- Numeración secuencial por tipo de documento (sin tabla extra)
CREATE SEQUENCE IF NOT EXISTS boleta_seq  START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS factura_seq START 1 INCREMENT 1;

-- Unicidad del número (solo cuando no es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uk_ventas_numero_doc
    ON public.ventas (numero_documento)
    WHERE numero_documento IS NOT NULL;

-- Inicializar cada secuencia con el último emitido (si ya existen datos)
-- BOLETA
WITH last_b AS (
    SELECT MAX(CAST(SPLIT_PART(numero_documento,'-',2) AS BIGINT)) AS last
    FROM public.ventas
    WHERE tipo_documento_tributario = 'boleta' AND numero_documento IS NOT NULL
)
SELECT CASE
           WHEN last IS NULL THEN setval('boleta_seq', 1, false)  -- nextval() => 1
           ELSE setval('boleta_seq', last, true)                  -- nextval() => last+1
           END
FROM last_b;

-- FACTURA
WITH last_f AS (
    SELECT MAX(CAST(SPLIT_PART(numero_documento,'-',2) AS BIGINT)) AS last
    FROM public.ventas
    WHERE tipo_documento_tributario = 'factura' AND numero_documento IS NOT NULL
)
SELECT CASE
           WHEN last IS NULL THEN setval('factura_seq', 1, false)
           ELSE setval('factura_seq', last, true)
           END
FROM last_f;
