-- V22__anticipos_estado_transferido.sql

-- 1) Borrar el CHECK actual (nombre desconocido) de forma segura
DO $$
DECLARE
cname text;
BEGIN
SELECT pc.conname
INTO cname
FROM pg_constraint pc
         JOIN pg_class c ON c.oid = pc.conrelid
WHERE c.relname = 'anticipos'
  AND c.relnamespace = 'public'::regnamespace
    AND pc.contype = 'c'
    AND pg_get_constraintdef(pc.oid) ILIKE '%estado_anticipo%';

IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.anticipos DROP CONSTRAINT %I', cname);
END IF;
END $$;

-- 2) Crear el nuevo CHECK con el estado adicional (si no existe con este nombre)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_anticipos_estado_anticipo'
  ) THEN
ALTER TABLE public.anticipos
    ADD CONSTRAINT chk_anticipos_estado_anticipo
        CHECK (
            estado_anticipo IN (
                                'registrado',
                                'parcialmente_aplicado',
                                'aplicado_total',
                                'anulado',
                                'transferido_a_venta'
                )
            );
END IF;
END $$;
