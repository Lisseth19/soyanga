-- Asegura que no se duplique el tipo de cambio por par y fecha
CREATE UNIQUE INDEX IF NOT EXISTS uq_tc_par_fecha
    ON tipos_de_cambio (id_moneda_origen, id_moneda_destino, fecha_vigencia);

-- USD -> BOB = 6.96 para la fecha actual
WITH usd AS (SELECT id_moneda FROM monedas WHERE codigo_moneda = 'USD'),
     bob AS (SELECT id_moneda FROM monedas WHERE codigo_moneda = 'BOB')
INSERT INTO tipos_de_cambio (id_moneda_origen, id_moneda_destino, fecha_vigencia, tasa_cambio)
SELECT u.id_moneda, b.id_moneda, CURRENT_DATE, CAST(6.960000 AS NUMERIC(18,6))
FROM usd u, bob b
ON CONFLICT (id_moneda_origen, id_moneda_destino, fecha_vigencia) DO NOTHING;

-- (opcional inverso) BOB -> USD = 1/6.96
WITH usd AS (SELECT id_moneda FROM monedas WHERE codigo_moneda = 'USD'),
     bob AS (SELECT id_moneda FROM monedas WHERE codigo_moneda = 'BOB')
INSERT INTO tipos_de_cambio (id_moneda_origen, id_moneda_destino, fecha_vigencia, tasa_cambio)
SELECT b.id_moneda, u.id_moneda, CURRENT_DATE, ROUND(1 / CAST(6.960000 AS NUMERIC(18,6)), 6)
FROM usd u, bob b
ON CONFLICT (id_moneda_origen, id_moneda_destino, fecha_vigencia) DO NOTHING;
