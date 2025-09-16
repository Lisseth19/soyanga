import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { sucursalService } from "@/servicios/sucursal";
import type { Page } from "@/types/pagination";
import type { Sucursal } from "@/types/sucursal";

export default function SucursalesList() {
  const [sp, setSp] = useSearchParams();

  // datos
  const [page, setPage] = useState<Page<Sucursal> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filtro de búsqueda (sin ordenar)
  const [q, setQ] = useState(sp.get("q") ?? "");

  // @ts-ignore
  async function fetchList(signal?: AbortSignal) {
    setLoading(true);
    setErr(null);
    try {
      const p = await sucursalService.list({
        q,
        page: 0,
        size: 10,
        // Si tu backend NO tiene orden por defecto, descomenta la línea de abajo:
        sort: "nombreSucursal,asc",
        // signal, // si tu httpClient soporta AbortSignal, pasa el signal
      });
      setPage(p);
    } catch (e: any) {
      setErr(e?.message || "Error cargando sucursales");
    } finally {
      setLoading(false);
    }
  }

  // sincroniza filtros -> URL (ya no hay sort)
  useEffect(() => {
    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    setSp(params, { replace: true });
  }, [q, setSp]);

  // carga inicial + cada vez que cambie q
  useEffect(() => {
    const ac = new AbortController();
    fetchList(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function onDelete(s: Sucursal) {
    const ok = window.confirm(`¿Eliminar la sucursal "${s.nombreSucursal}"?`);
    if (!ok) return;
    setLoading(true);
    try {
      await sucursalService.remove(s.idSucursal);
      await fetchList();
    } catch (e: any) {
      setErr(e?.message || "No se pudo eliminar");
      setLoading(false);
    }
  }

  // iconitos
  const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor" />
    </svg>
  );
  const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block">
      <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
    </svg>
  );
  const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" className="text-neutral-400">
      <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.71.71l.27.28v.79L20 21.49 21.49 20 15.5 14zM10 15a5 5 0 110-10 5 5 0 010 10z" fill="currentColor" />
    </svg>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
         <h1 className="text-2xl font-semibold">Sucursales</h1>
      </div>

      {/* solo buscador (se quitó 'Ordenar por') */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o ciudad…"
            className="pl-9 pr-3 py-2 rounded-lg border border-neutral-300 w-[280px]"
          />
        </div>
       
        <Link
          to="/sucursales/nueva"
          className="h-10 inline-flex items-center justify-center px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
  >
          Nueva sucursal
        </Link>
      </div>

      {err && <div className="text-red-600">Error: {err}</div>}
      {loading && !err && <div>Cargando…</div>}

      {!loading && !err && (
        <div className="border rounded-xl overflow-hidden bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-neutral-600 uppercase text-xs tracking-wider">
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Dirección</th>
                <th className="text-left px-4 py-3">Ciudad</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3 w-40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {page?.content?.length ? (
                page.content.map((s) => (
                  <tr key={s.idSucursal} className="border-t hover:bg-neutral-50/60">
                    <td className="px-4 py-3 font-semibold">{s.nombreSucursal}</td>
                    <td className="px-4 py-3">{s.direccion}</td>
                    <td className="px-4 py-3">{s.ciudad}</td>
                    <td className="px-4 py-3">{s.estadoActivo ? "Activo" : "Inactivo"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/sucursales/${s.idSucursal}`}
                          className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-900"
                          title="Editar"
                        >
                          <PencilIcon /> <span>Editar</span>
                        </Link>
                        <button
                          onClick={() => onDelete(s)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                          title="Eliminar"
                          disabled={loading}
                        >
                          <TrashIcon /> <span>Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center px-4 py-8 text-neutral-500">
                    Sin registros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
