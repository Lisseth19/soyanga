-- V6__monedas_add_estado_activo.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='monedas'
      AND column_name='estado_activo'
  ) THEN
ALTER TABLE monedas
    ADD COLUMN estado_activo BOOLEAN NOT NULL DEFAULT TRUE;
-- Normaliza nulos si existieran (no debería):
UPDATE monedas SET estado_activo = TRUE WHERE estado_activo IS NULL;
END IF;
END $$;
