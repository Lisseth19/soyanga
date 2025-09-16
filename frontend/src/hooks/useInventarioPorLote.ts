import { useEffect, useMemo, useRef, useState } from "react";
import { getInventarioPorLote } from "@/servicios/inventario";
import type { InventarioLotesQuery, InventarioPorLoteItem } from "@/types/inventario-lotes";
import type { Page } from "@/types/pagination";

export function useInventarioPorLote(initial?: Partial<InventarioLotesQuery>) {
  const [query, setQuery] = useState<InventarioLotesQuery>({ page: 0, size: 20, ...initial });
  const [data, setData] = useState<Page<InventarioPorLoteItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<unknown>(null);

  const abortRef = useRef<AbortController | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true); setErr(null);
    try {
      const res = await getInventarioPorLote(query); // tu httpClient ya maneja cancel si lo implementaste
      if (signal?.aborted) return;
      setData(res);
    } catch (e) {
      if (signal?.aborted) return;
      setErr(e);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.idAlmacen, query.q, query.venceAntes, query.page, query.size]);

  const setPage = (p: number) => setQuery(q => ({ ...q, page: p }));
  const setSize = (s: number) => setQuery(q => ({ ...q, size: s, page: 0 }));
  const setFilters = (f: Partial<InventarioLotesQuery>) => setQuery(q => ({ ...q, ...f, page: 0 }));
  const refresh = () => load(abortRef.current?.signal);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;
    return "Error al cargar inventario por lote";
  }, [error]);
  return { data, loading, error, errorMessage, query, setPage, setSize, setFilters, refresh };
}
