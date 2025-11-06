-- V__sprint7_config_redondeo.sql
CREATE TABLE IF NOT EXISTS configuracion_precios (
  id_config        BIGSERIAL PRIMARY KEY,
  modo_redondeo    TEXT NOT NULL,            -- ENTERO | MULTIPLO | DECIMALES | NINGUNO
  multiplo         NUMERIC(18,6),            -- usado si modo = MULTIPLO (ej: 0.50, 1, 10)
  decimales        INT,                      -- usado si modo = DECIMALES (ej: 2)
  actualizado_por  TEXT,
  actualizado_en   TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT ck_modo_redondeo CHECK (modo_redondeo IN ('ENTERO','MULTIPLO','DECIMALES','NINGUNO'))
);

-- Garantiza una sola fila “activa”: usa la de menor id
INSERT INTO configuracion_precios (modo_redondeo, multiplo, decimales, actualizado_por)
SELECT 'ENTERO', NULL, NULL, 'seed'
WHERE NOT EXISTS (SELECT 1 FROM configuracion_precios);
