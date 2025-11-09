-- V20251027__ajustes_inventario.sql
CREATE TABLE IF NOT EXISTS ajustes_inventario (
  id_ajuste           BIGSERIAL PRIMARY KEY,
  tipo                VARCHAR(10) NOT NULL,         -- 'INGRESO' | 'EGRESO'
  id_almacen          BIGINT NOT NULL,
  id_lote             BIGINT NOT NULL,
  cantidad            NUMERIC(18,6) NOT NULL CHECK (cantidad > 0),
  motivo              VARCHAR(50) NOT NULL,         -- PERDIDA, ROTURA, etc.
  observaciones       TEXT,
  estado              VARCHAR(15) NOT NULL DEFAULT 'APLICADO',  -- APLICADO | ANULADO (por si luego permites anular)
  creado_por          BIGINT NOT NULL,
  creado_en           TIMESTAMP NOT NULL DEFAULT now(),
  aplicado_en         TIMESTAMP NULL,               -- set al aplicar
  request_id          UUID NOT NULL UNIQUE,         -- idempotencia a nivel de ajuste
  id_movimiento       BIGINT NULL                   -- FK lógica al kardex para trazabilidad
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS ix_ajustes_req ON ajustes_inventario(request_id);
CREATE INDEX IF NOT EXISTS ix_ajustes_lote ON ajustes_inventario(id_lote);
CREATE INDEX IF NOT EXISTS ix_ajustes_almacen ON ajustes_inventario(id_almacen);
