-- V8__add_estado_activo_to_roles.sql
-- Hace idempotente la adición/normalización de la columna estado_activo en roles

DO $$
BEGIN
  -- 1) Crear la columna si no existe
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name   = 'roles'
      AND column_name  = 'estado_activo'
  ) THEN
ALTER TABLE roles
    ADD COLUMN estado_activo BOOLEAN;
END IF;

  -- 2) Asegurar DEFAULT TRUE
ALTER TABLE roles
    ALTER COLUMN estado_activo SET DEFAULT TRUE;

-- 3) Rellenar NULLs con TRUE (por si existían filas previas)
UPDATE roles
SET estado_activo = TRUE
WHERE estado_activo IS NULL;

-- 4) Asegurar NOT NULL
ALTER TABLE roles
    ALTER COLUMN estado_activo SET NOT NULL;
END$$;
