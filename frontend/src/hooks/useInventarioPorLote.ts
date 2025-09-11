import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getInventarioPorLote, getMovimientosDeLote } from "@/servicios/inventario";
import { getAlmacenesOpciones } from "@/servicios/catalogo";
import type { OpcionIdNombre } from "@/servicios/catalogo";
import type { InventarioPorLoteItem, Page, MovimientoDeInventario } from "@/servicios/inventario";
import { parseSort, buildSort } from "../utils/sort";

export type SortDir = "asc" | "desc";
const DEFAULT_SIZE = 20;
const DEFAULT_SORT = "vencimiento,asc";

export function useInventarioPorLote() {
  const [sp, setSp] = useSearchParams();

  // URL -> estado
  const [almacenId, setAlmacenId] = useState<number | undefined>(() => {
    const v = sp.get("almacenId"); return v ? Number(v) : undefined;
  });
  const [producto, setProducto] = useState(() => sp.get("producto") ?? "");
  const [productoInput, setProductoInput] = useState(() => sp.get("producto") ?? "");
  const [venceAntes, setVenceAntes] = useState(() => sp.get("venceAntes") ?? "");
  const [page, setPage]   = useState(() => Number(sp.get("page") ?? 0));
  const [size, setSize]   = useState(() => Number(sp.get("size") ?? DEFAULT_SIZE));
  const [sort, setSort]   = useState(() => sp.get("sort") ?? DEFAULT_SORT);

  // Datos
  const [data, setData] = useState<Page<InventarioPorLoteItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Almacenes
  const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);

  // Movimientos
  const [movOpen, setMovOpen] = useState(false);
  const [movLoading, setMovLoading] = useState(false);
  const [movError, setMovError] = useState<string | null>(null);
  const [movs, setMovs] = useState<MovimientoDeInventario[]>([]);
  const [movTitulo, setMovTitulo] = useState("");

  // Almacenes
  useEffect(() => {
    let alive = true; setLoadingAlmacenes(true);
    getAlmacenesOpciones(true)
      .then(l => alive && setAlmacenes(l))
      .catch(() => alive && setAlmacenes([]))
      .finally(() => alive && setLoadingAlmacenes(false));
    return () => { alive = false; };
  }, []);

  // Debounce buscador
  useEffect(() => {
    const t = setTimeout(() => setProducto(productoInput.trim()), 400);
    return () => clearTimeout(t);
  }, [productoInput]);

  // Estado -> URL
  useEffect(() => {
    const params: Record<string,string> = {};
    if (almacenId !== undefined && !Number.isNaN(almacenId)) params.almacenId = String(almacenId);
    if (producto) params.producto = producto;
    if (venceAntes) params.venceAntes = venceAntes;
    if (page) params.page = String(page);
    if (size !== DEFAULT_SIZE) params.size = String(size);
    if (sort !== DEFAULT_SORT) params.sort = sort;
    setSp(params, { replace: true });
  }, [almacenId, producto, venceAntes, page, size, sort, setSp]);

  // Carga de datos
  useEffect(() => {
    let alive = true; setLoading(true); setErr(null);
    getInventarioPorLote({
      almacenId: almacenId && !Number.isNaN(almacenId) ? almacenId : undefined,
      producto: producto || undefined,
      venceAntes: venceAntes || undefined,
      page, size, sort,
    })
      .then(r => alive && setData(r))
      .catch((e:any) => alive && (setErr(e?.message ?? "Error desconocido"), setData(null)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [almacenId, producto, venceAntes, page, size, sort]);

  const sortState = useMemo(() => parseSort(sort), [sort]);

  function onHeaderSort(field: string) { setSort(buildSort(field, sort)); setPage(0); }
  function resetFilters() {
    setAlmacenId(undefined); setProducto(""); setVenceAntes("");
    setPage(0); setSize(DEFAULT_SIZE); setSort(DEFAULT_SORT);
  }

  async function verMovimientos(row: InventarioPorLoteItem) {
    setMovOpen(true);
    setMovTitulo(`${row.producto} — Lote ${row.numeroLote}`);
    setMovLoading(true); setMovError(null); setMovs([]);
    try {
      const data = await getMovimientosDeLote(row.loteId, {
        almacenId: almacenId && !Number.isNaN(almacenId) ? almacenId : undefined,
        limit: 50,
      });
      setMovs(data);
    } catch (e:any) { setMovError(e?.message ?? "Error al cargar movimientos"); }
    finally { setMovLoading(false); }
  }

  return {
    // estado
    almacenId, setAlmacenId, productoInput, setProductoInput, venceAntes, setVenceAntes,
    page, setPage, size, setSize, sort, setSort, sortState,
    // datos
    data, loading, err, almacenes, loadingAlmacenes,
    // acciones
    onHeaderSort, resetFilters, verMovimientos,
    // modal
    movOpen, setMovOpen, movLoading, movError, movs, movTitulo,
  };
}
