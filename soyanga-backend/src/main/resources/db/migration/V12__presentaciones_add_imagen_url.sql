-- Añade la columna imagen_url a presentaciones_de_productos (PostgreSQL)
-- Idempotente: no falla si ya existe.

ALTER TABLE presentaciones_de_productos
    ADD COLUMN IF NOT EXISTS imagen_url varchar(512);

-- (Opcional) Si quieres asegurar NOT NULL con valor por defecto en el futuro:
-- UPDATE presentaciones_de_productos SET imagen_url = '' WHERE imagen_url IS NULL;
-- ALTER TABLE presentaciones_de_productos ALTER COLUMN imagen_url SET NOT NULL;
