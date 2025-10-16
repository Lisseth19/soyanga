import { useEffect, useMemo, useRef, useState } from "react";
import { comprasService } from "@/servicios/compras";
import type { CompraEstado, Page } from "@/types/compras";

// helper mínimo para mapear idMoneda -> código (USD/BS/…)
async function fetchMapaMonedas(): Promise<Record<number, string>> {
  try {
    const r = await fetch("/v1/monedas"); // ajusta si tu ruta difiere
    if (!r.ok) throw new Error();
    const arr = await r.json(); // espera [{idMoneda, codigo, simbolo, ...}]
    const map: Record<number, string> = {};
    for (const m of arr) {
      const code = m.codigo || m.simbolo || m.nombre || String(m.idMoneda);
      map[m.idMoneda] = String(code).toUpperCase();
    }
    return map;
  } catch {
    // fallback más común
    return { 1: "BS", 2: "USD" };
  }
}

export default function ComprasListaPage() {
  const [estado, setEstado] = useState<"" | CompraEstado>("");
  const [qProveedor, setQProveedor] = useState(""); // búsqueda por nombre
  const [desde, setDesde] = useState<string | undefined>();
  const [hasta, setHasta] = useState<string | undefined>();

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [data, setData] = useState<Page<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [monedas, setMonedas] = useState<Record<number, string>>({});

  // refs para abrir el datepicker con el iconito
  const refDesde = useRef<HTMLInputElement>(null);
  const refHasta = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMapaMonedas().then(setMonedas);
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setErr(null);
      const res = await comprasService.listar({
        estado,
        // el backend filtra por proveedorId, aquí hacemos filtro por nombre del proveedor en cliente
        desde,
        hasta,
        page,
        size,
      });
      setData(res);
    } catch (e: any) {
      setErr(e.message || "Error al listar");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchData();
  }, [estado, desde, hasta, page, size]);

  // filtro por nombre del proveedor (lado cliente sobre la página actual)
  const filas = useMemo(() => {
    const q = qProveedor.trim().toLowerCase();
    if (!q) return data?.content ?? [];
    return (data?.content ?? []).filter((r: any) =>
      String(r.proveedor || "")
        .toLowerCase()
        .includes(q)
    );
  }, [data, qProveedor]);

  return (
    <div className="p-4 space-y-4">
      {/* Header + filtros */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="text-xl font-semibold flex-1 min-w-[200px]">
          Órdenes de Compra
        </div>

        <a
          href="/compras/nueva"
          className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center"
        >
          + Nueva Orden de Compra
        </a>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {/* Buscar proveedor por nombre */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs mb-1">Buscar por proveedor</label>
          <div className="relative">
            <input
              className="w-full border rounded-lg px-3 py-2 pr-10"
              placeholder="Ej. Agroinsumos SRL…"
              value={qProveedor}
              onChange={(e) => setQProveedor(e.target.value)}
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-xs mb-1">Estado</label>
          <select
            className="border rounded-lg px-3 py-2"
            value={estado}
            onChange={(e) => setEstado(e.target.value as any)}
          >
            <option value="">Todos</option>
            {[
              "pendiente",
              "aprobada",
              "enviada",
              "parcial",
              "recibida",
              "anulada",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha desde */}
        <div>
          <label className="block text-xs mb-1">Desde</label>
          <div className="relative">
            <input
              ref={refDesde}
              type="date"
              className="border rounded-lg px-3 py-2 pr-9"
              value={desde || ""}
              onChange={(e) => setDesde(e.target.value || undefined)}
            />
            <button
              type="button"
              onClick={() =>
                (refDesde.current as any)?.showPicker
                  ? (refDesde.current as any).showPicker()
                  : refDesde.current?.focus()
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
              title="Abrir calendario"
            >
              <svg
                className="h-4 w-4 text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M7 3v2M17 3v2M3.5 8h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2V7.5A1.5 1.5 0 0 1 5 6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Fecha hasta */}
        <div>
          <label className="block text-xs mb-1">Hasta</label>
          <div className="relative">
            <input
              ref={refHasta}
              type="date"
              className="border rounded-lg px-3 py-2 pr-9"
              value={hasta || ""}
              onChange={(e) => setHasta(e.target.value || undefined)}
            />
            <button
              type="button"
              onClick={() =>
                (refHasta.current as any)?.showPicker
                  ? (refHasta.current as any).showPicker()
                  : refHasta.current?.focus()
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
              title="Abrir calendario"
            >
              <svg
                className="h-4 w-4 text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M7 3v2M17 3v2M3.5 8h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19A2.5 2.5 0 0 1-18 21H6a2.5 2.5 0 0 1-2.5-2V7.5A1.5 1.5 0 0 1 5 6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* Vista móvil: cards */}
      <div className="md:hidden space-y-3">
        {filas.map((r: any) => (
          <div key={r.idCompra} className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">OC{String(r.idCompra).padStart(3, "0")}</div>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                {r.estadoCompra || r.estado}
              </span>
            </div>
            <div className="mt-1 text-sm text-neutral-700">{r.proveedor ?? "—"}</div>
            <div className="mt-1 text-xs text-neutral-500">
              {new Date(r.fechaCompra).toLocaleDateString()} ·{" "}
              {monedas[r.idMoneda] ?? r.idMoneda} · TC {Number(r.tipoCambioUsado).toFixed(4)}
            </div>
            <div className="mt-2 flex gap-2">
              <a
                href={`/compras/${r.idCompra}`}
                className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs"
                title="Abrir"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M14 3h7v7M21 3 13 11M5 12v8a1 1 0 0 0 1 1h8" stroke="currentColor" strokeWidth="2" />
                </svg>
                Abrir
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Vista escritorio: tabla */}
      <div className="hidden md:block border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">ID COMPRA</th>
              <th className="p-2 text-left">PROVEEDOR</th>
              <th className="p-2 text-left">FECHA COMPRA</th>
              <th className="p-2 text-left">MONEDA</th>
              <th className="p-2 text-right hidden lg:table-cell">TC USADO</th>
              <th className="p-2 text-center">ESTADO</th>
              <th className="p-2 text-right hidden lg:table-cell">ÍTEMS</th>
              <th className="p-2 text-right">TOTAL</th>
              <th className="p-2">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r: any) => (
              <tr key={r.idCompra} className="border-t">
                <td className="p-2">OC{String(r.idCompra).padStart(3, "0")}</td>
                <td className="p-2">{r.proveedor ?? "—"}</td>
                <td className="p-2">{new Date(r.fechaCompra).toLocaleDateString()}</td>
                <td className="p-2">{monedas[r.idMoneda] ?? r.idMoneda}</td>
                <td className="p-2 text-right hidden lg:table-cell">
                  {Number(r.tipoCambioUsado).toFixed(4)}
                </td>
                <td className="p-2 text-center">
                  <span className="px-2 py-0.5 rounded bg-gray-100">
                    {r.estadoCompra || r.estado}
                  </span>
                </td>
                <td className="p-2 text-right hidden lg:table-cell">{r.totalItems}</td>
                <td className="p-2 text-right">{Number(r.totalMoneda).toFixed(2)}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/compras/${r.idCompra}`}
                      className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50"
                      title="Abrir"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M14 3h7v7M21 3 13 11M5 12v8a1 1 0 0 0 1 1h8"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {(!filas || filas.length === 0) && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-neutral-500">
                  No hay resultados con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-end gap-2">
        <button
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
          className="border px-2 py-1 rounded"
        >
          Anterior
        </button>
        <span className="text-xs">
          Página {page + 1} / {data?.totalPages ?? 1}
        </span>
        <button
          disabled={!!data && page >= ((data.totalPages || 1) - 1)}
          onClick={() => setPage((p) => p + 1)}
          className="border px-2 py-1 rounded"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
