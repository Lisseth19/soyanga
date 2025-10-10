-- V7__permisos_add_estado_activo.sql  (reemplaza su contenido)
ALTER TABLE permisos
    ADD COLUMN IF NOT EXISTS estado_activo BOOLEAN;

UPDATE permisos
SET estado_activo = TRUE
WHERE estado_activo IS NULL;

ALTER TABLE permisos
    ALTER COLUMN estado_activo SET DEFAULT TRUE,
ALTER COLUMN estado_activo SET NOT NULL;
