import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { sucursalService } from "@/servicios/sucursal";
import type { Page } from "@/types/pagination";
import type { Sucursal } from "@/types/sucursal";

export default function SucursalesList() {
  const [sp] = useSearchParams();
  const [page, setPage] = useState<Page<Sucursal> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    sucursalService
      .list({ size: 10, sort: "nombreSucursal,asc" })
      .then(setPage)
      .catch((e: any) => setErr(e?.message || "Error cargando sucursales"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sucursales</h1>
        <Link to="/sucursales/nueva" className="px-4 py-2 rounded-lg bg-black text-white">
          Nueva sucursal
        </Link>
      </div>

      {sp.get("created") && (
        <div className="text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">
          Sucursal creada correctamente.
        </div>
      )}

      {err && <div className="text-red-600">Error: {err}</div>}
      {loading && !err && <div>Cargando…</div>}

      {!loading && !err && (
        <div className="overflow-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-left px-3 py-2">Dirección</th>
                <th className="text-left px-3 py-2">Ciudad</th>
                <th className="text-left px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {page?.content?.length ? (
                page.content.map((s) => (
                  <tr key={s.idSucursal} className="border-t">
                    <td className="px-3 py-2">{s.nombreSucursal}</td>
                    <td className="px-3 py-2">{s.direccion}</td>
                    <td className="px-3 py-2">{s.ciudad}</td>
                    <td className="px-3 py-2">{s.estadoActivo ? "Activo" : "Inactivo"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center px-3 py-6 text-gray-500">
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
