import { useEffect, useState } from "react";
import { almacenService } from "@/servicios/almacen";

export type Opcion = { value: number; label: string };

export function useAlmacenes(params?: { q?: string; incluirInactivos?: boolean }) {
  const [ops, setOps] = useState<Opcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      // Usa el endpoint de opciones (con fallback interno a list())
      const arr = await almacenService.options({
        q: params?.q,
        incluirInactivos: params?.incluirInactivos ?? false,
      });

      setOps(arr.map(a => ({ value: a.id, label: a.nombre })));
    } catch (e: any) {
      setError(e.message || "No se pudieron cargar almacenes");
      setOps([]);
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial y cuando cambien los filtros
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.q, params?.incluirInactivos]);

  return { ops, loading, error, refresh: load };
}
