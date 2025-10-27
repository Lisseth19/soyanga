-- V15: Cambiar tipo de fecha_anticipo de DATE a TIMESTAMP(6)
ALTER TABLE IF EXISTS anticipos
ALTER COLUMN fecha_anticipo TYPE timestamp(6)
  USING (fecha_anticipo::timestamp(6));

-- (Opcional) si quieres un default:
-- ALTER TABLE anticipos ALTER COLUMN fecha_anticipo SET DEFAULT now();

-- (Opcional) si en tu entidad es NOT NULL, garantízalo:
-- ALTER TABLE anticipos ALTER COLUMN fecha_anticipo SET NOT NULL;
