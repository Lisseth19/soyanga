import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/types/pagination";
import { alertasService } from "@/servicios/alertas";
import type { AlertaItem, AlertasQuery, AlertaSeveridad, AlertaTipo } from "@/types/alertas";

function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

const TIPO_LABEL: Record<AlertaTipo, string> = {
  stock_agotado: "Stock agotado",
  stock_bajo: "Stock bajo",
  vencido: "Vencido",
  vencimiento_inminente: "Vence ≤ 7 días",
  vencimiento_proximo: "Vence ≤ 30 días",
};

const SEVERIDAD_LABEL: Record<AlertaSeveridad, string> = {
  urgente: "Urgente",
  advertencia: "Advertencia",
  proximo: "Próximo",
};

function pillSeveridad(sev?: string) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  if (!sev) return `${base} bg-slate-50 text-slate-700 border-slate-200`;
  if (sev === "urgente") return `${base} bg-rose-50 text-rose-700 border-rose-200`;
  if (sev === "advertencia") return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  if (sev === "proximo") return `${base} bg-yellow-50 text-yellow-700 border-yellow-200`;
  return `${base} bg-slate-50 text-slate-700 border-slate-200`;
}
function pillTipo(tipo?: string) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  if (!tipo) return `${base} bg-slate-50 text-slate-700 border-slate-200`;
  if (tipo === "stock_agotado" || tipo === "vencido") return `${base} bg-rose-50 text-rose-700 border-rose-200`;
  if (tipo === "stock_bajo" || tipo === "vencimiento_inminente") return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  if (tipo === "vencimiento_proximo") return `${base} bg-yellow-50 text-yellow-700 border-yellow-200`;
  return `${base} bg-slate-50 text-slate-700 border-slate-200`;
}

export default function AlertasInventarioPage() {
  // filtros
  const [tipo, setTipo] = useState<AlertaTipo | "">("");
  const [severidad, setSeveridad] = useState<AlertaSeveridad | "">("");
  const [almacenId, setAlmacenId] = useState<string>("");
  const [q, setQ] = useState("");

  // paginación
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // datos
  const [data, setData] = useState<Page<AlertaItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // debounce
  const qDeb = useDebouncedValue(q, 500);
  const tipoDeb = useDebouncedValue(tipo, 200);
  const sevDeb = useDebouncedValue(severidad, 200);
  const almDeb = useDebouncedValue(almacenId, 200);

  const params: AlertasQuery = useMemo(() => {
    return {
      tipo: (tipoDeb || undefined) as AlertaTipo | undefined,
      severidad: (sevDeb || undefined) as AlertaSeveridad | undefined,
      almacenId: almDeb ? Number(almDeb) : undefined,
      q: qDeb || undefined,
      page,
      size,
    };
  }, [tipoDeb, sevDeb, almDeb, qDeb, page, size]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const resp = await alertasService.list(params); // 👈 renombrado para no “pisar” page
        if (!cancelled) setData(resp);
      } catch (e: any) {
        const status = e?.response?.status;
        const msgBackend = e?.response?.data?.message;
        const msg =
          status === 401 || status === 403
            ? "No autorizado"
            : msgBackend || e?.message || "No se pudo cargar alertas";
        if (!cancelled) setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params]);

  function limpiar() {
    setTipo("");
    setSeveridad("");
    setAlmacenId("");
    setQ("");
    setPage(0);
  }

  function exportCSV() {
    const rows = data?.content ?? [];
    const header = [
      "producto","sku","numeroLote","almacen",
      "stockDisponible","stockReservado","stockMinimo",
      "venceEl","diasRestantes","tipo","severidad","prioridad",
      "motivo","idAlerta","idLote","idAlmacen","idPresentacion",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.producto, r.sku, r.numeroLote, r.almacen,
          r.stockDisponible, r.stockReservado, r.stockMinimo,
          r.venceEl ?? "", r.diasRestantes ?? "",
          r.tipo, r.severidad, r.prioridad,
          r.motivo ?? "", r.idAlerta, r.idLote, r.idAlmacen, r.idPresentacion,
        ]
          .map((v) => {
            const s = String(v ?? "");
            return s.includes(",") ? `"${s.replaceAll('"', '""')}"` : s;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alertas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Alertas de Inventario</h1>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-600 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => { setTipo(e.target.value as AlertaTipo | ""); setPage(0); }}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Todos</option>
              <option value="stock_agotado">Stock agotado</option>
              <option value="stock_bajo">Stock bajo</option>
              <option value="vencido">Vencido</option>
              <option value="vencimiento_inminente">Vence ≤ 7 días</option>
              <option value="vencimiento_proximo">Vence ≤ 30 días</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-600 mb-1">Severidad</label>
            <select
              value={severidad}
              onChange={(e) => { setSeveridad(e.target.value as AlertaSeveridad | ""); setPage(0); }}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Todas</option>
              <option value="urgente">Urgente</option>
              <option value="advertencia">Advertencia</option>
              <option value="proximo">Próximo</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-600 mb-1">Almacén ID</label>
            <input
              type="number"
              value={almacenId}
              onChange={(e) => { setAlmacenId(e.target.value); setPage(0); }}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. 1"
              min={0}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm text-neutral-600 mb-1">Buscar</label>
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="SKU, producto o número de lote…"
            />
          </div>

          <div className="md:col-span-3 flex items-end gap-2">
            <button
              onClick={() => setPage(0)}
              className="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50"
            >
              Aplicar
            </button>
            <button
              onClick={limpiar}
              className="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50"
            >
              Limpiar
            </button>

            <div className="ml-auto flex items-center gap-2">
              <select
                value={size}
                onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                className="border rounded-lg px-2 py-2"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>

              <button
                onClick={exportCSV}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="mt-4 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="text-left px-3 py-2">Producto / SKU</th>
                <th className="text-left px-3 py-2">Lote</th>
                <th className="text-left px-3 py-2">Almacén</th>
                <th className="text-left px-3 py-2">Stock</th>
                <th className="text-left px-3 py-2">Vence</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Severidad</th>
                <th className="text-left px-3 py-2">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-neutral-500">Cargando…</td>
                </tr>
              )}
              {err && !loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-rose-600">{err}</td>
                </tr>
              )}
              {!loading && !err && (data?.content?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-neutral-500">Sin resultados.</td>
                </tr>
              )}

              {(data?.content ?? []).map((a) => (
                <tr key={`${a.idAlerta}-${a.idLote}-${a.idAlmacen}`} className="border-t border-neutral-100">
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.producto}</div>
                    <div className="text-neutral-500 text-xs">{a.sku}</div>
                  </td>
                  <td className="px-3 py-2">{a.numeroLote}</td>
                  <td className="px-3 py-2">{a.almacen}</td>
                  <td className="px-3 py-2">
                    <div className="whitespace-nowrap">
                      <span className="font-medium">{a.stockDisponible}</span>{" "}
                      <span className="text-neutral-500">disp</span>
                      {a.stockMinimo != null && (
                        <>
                          {" "} <span>•</span>{" "}
                          <span className="font-medium">{a.stockMinimo}</span>{" "}
                          <span className="text-neutral-500">min</span>
                        </>
                      )}
                      {a.stockReservado > 0 && (
                        <>
                          {" "} <span>•</span>{" "}
                          <span className="font-medium">{a.stockReservado}</span>{" "}
                          <span className="text-neutral-500">res</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {a.venceEl ? (
                      <div className="whitespace-nowrap">
                        <div>{new Date(a.venceEl).toLocaleDateString()}</div>
                        <div className="text-xs text-neutral-500">
                          {a.diasRestantes! < 0
                            ? `Vencido hace ${Math.abs(a.diasRestantes!)} d`
                            : a.diasRestantes === 0
                            ? "Vence hoy"
                            : `En ${a.diasRestantes} d`}
                        </div>
                      </div>
                    ) : ("—")}
                  </td>
                  <td className="px-3 py-2">
                    <span className={pillTipo(a.tipo)}>{TIPO_LABEL[a.tipo]}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={pillSeveridad(a.severidad)}>{SEVERIDAD_LABEL[a.severidad]}</span>
                  </td>
                  <td className="px-3 py-2">{a.prioridad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200 text-sm">
          <div>
            Página <strong>{(data?.number ?? 0) + 1}</strong> de <strong>{data?.totalPages ?? 1}</strong> • {data?.totalElements ?? 0} registros
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg border border-neutral-300 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page <= 0}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-neutral-300 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
