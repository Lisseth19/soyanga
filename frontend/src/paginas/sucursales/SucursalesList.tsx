import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { sucursalService } from "@/servicios/sucursal";
import type { Page } from "@/types/pagination";
import type { Sucursal } from "@/types/sucursal";
import { Pencil, Trash2, Plus, Search } from "lucide-react";

export default function SucursalesList() {
  const [sp, setSp] = useSearchParams();

  // datos
  const [page, setPage] = useState<Page<Sucursal> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filtro
  const [q, setQ] = useState(sp.get("q") ?? "");

  // listar
  async function fetchList() {
    setLoading(true);
    setErr(null);
    try {
      const p = await sucursalService.list({
        q,
        page: 0,
        size: 10,
        sort: "nombreSucursal,asc",
      });
      setPage(p);
    } catch (e: any) {
      setErr(e?.message || "Error cargando sucursales");
    } finally {
      setLoading(false);
    }
  }

  // sync URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    setSp(params, { replace: true });
  }, [q, setSp]);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function onDelete(s: Sucursal) {
    if (!confirm(`¿Eliminar la sucursal "${s.nombreSucursal}"?`)) return;
    setLoading(true);
    try {
      await sucursalService.remove(s.idSucursal);
      await fetchList();
    } catch (e: any) {
      setErr(e?.message || "No se pudo eliminar");
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      {/* Título + acción (responsive) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Sucursales</h1>

        {/* Buscador */}
        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o ciudad…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300"
            />
          </div>

          {/* Botón crear */}
          <Link
            to="/sucursales/nueva"
            className="h-10 w-1/3 sm:w-auto min-w-[160px] inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus size={18} />
            <span className="hidden xs:inline">Nueva sucursal</span>
            <span className="xs:hidden">Nueva</span>
          </Link>
        </div>
      </div>

      {err && <div className="text-red-600 mb-3">Error: {err}</div>}
      {loading ? (
        <div className="bg-white rounded-xl p-4 shadow-sm">Cargando…</div>
      ) : (
        <div className="space-y-3">
          {/* Encabezado (estilo Presentaciones) visible solo en md+ */}
          <div className="hidden md:grid w-full grid-cols-[1.2fr_1.4fr_1fr_0.6fr_110px] items-center text-xs uppercase text-neutral-500 px-3">
            <div>Nombre</div>
            <div>Dirección</div>
            <div>Ciudad</div>
            <div>Estado</div>
            <div className="text-right pr-1">Acciones</div>
          </div>

          {/* Tarjetas */}
          {page?.content?.length ? (
            page.content.map((s) => (
              <div
                key={s.idSucursal}
                className={
                  "grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_1fr_0.6fr_110px] items-start md:items-center gap-2 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition " +
                  (!s.estadoActivo ? "opacity-60" : "")
                }
              >
                {/* Nombre */}
                <div className="font-semibold text-neutral-800">
                  <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Nombre</span>
                  {s.nombreSucursal}
                </div>

                {/* Dirección */}
                <div className="text-neutral-800">
                  <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Dirección</span>
                  {s.direccion || "—"}
                </div>

                {/* Ciudad */}
                <div className="text-neutral-800">
                  <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Ciudad</span>
                  {s.ciudad || "—"}
                </div>

                {/* Estado */}
                <div className="text-neutral-800">
                  <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Estado</span>
                  {s.estadoActivo ? "Activo" : "Inactivo"}
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-1 mt-1 md:mt-0">
                  <Link
                    to={`/sucursales/${s.idSucursal}`}
                    aria-label="Editar"
                    title="Editar"
                    className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                  >
                    <Pencil size={18} />
                  </Link>
                  <button
                    aria-label="Eliminar"
                    title="Eliminar"
                    onClick={() => onDelete(s)}
                    className="p-2 rounded-md hover:bg-neutral-100 text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">Sin registros</div>
          )}
        </div>
      )}
    </div>
  );
}
