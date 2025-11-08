-- Agrega el campo opcional interes_credito a ventas
ALTER TABLE public.ventas
    ADD COLUMN IF NOT EXISTS interes_credito NUMERIC(5,2);

-- (Opcional) Si quisieras inicializar los existentes:
-- UPDATE public.ventas SET interes_credito = 0.00 WHERE interes_credito IS NULL;
