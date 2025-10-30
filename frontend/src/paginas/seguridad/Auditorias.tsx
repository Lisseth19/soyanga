// src/paginas/seguridad/Auditorias.tsx
import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/types/pagination";
import { listarAuditorias } from "@/servicios/auditorias";
import type { AuditoriaItem, AuditoriaQuery } from "@/types/auditorias";

function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function pillClass(kind: "accion" | "modulo", text: string) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  if (kind === "accion") {
    if (/crear|insert/i.test(text)) return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
    if (/editar|update/i.test(text)) return `${base} bg-amber-50 text-amber-700 border-amber-200`;
    if (/eliminar|delete|anular/i.test(text)) return `${base} bg-rose-50 text-rose-700 border-rose-200`;
    return `${base} bg-slate-50 text-slate-700 border-slate-200`;
  }
  // modulo
  if (/inventario/i.test(text)) return `${base} bg-sky-50 text-sky-700 border-sky-200`;
  if (/seguridad/i.test(text)) return `${base} bg-purple-50 text-purple-700 border-purple-200`;
  if (/compras/i.test(text)) return `${base} bg-teal-50 text-teal-700 border-teal-200`;
  return `${base} bg-slate-50 text-slate-700 border-slate-200`;
}

export default function AuditoriasPage() {
  // filtros
  const [usuarioId, setUsuarioId] = useState<string>("");
  const [modulo, setModulo] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [q, setQ] = useState("");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // datos
  const [data, setData] = useState<Page<AuditoriaItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // debounce en texto
  const qDeb = useDebouncedValue(q, 500);
  const moduloDeb = useDebouncedValue(modulo, 400);
  const accionDeb = useDebouncedValue(accion, 400);

  const params: AuditoriaQuery = useMemo(() => {
    return {
      usuarioId: usuarioId ? Number(usuarioId) : undefined,
      modulo: moduloDeb || undefined,
      accion: accionDeb || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      q: qDeb || undefined,
      page,
      size,
    };
  }, [usuarioId, moduloDeb, accionDeb, desde, hasta, qDeb, page, size]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await listarAuditorias(params);
        setData(res);
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || "No se pudo cargar auditorías";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  function limpiar() {
    setUsuarioId("");
    setModulo("");
    setAccion("");
    setDesde("");
    setHasta("");
    setQ("");
    setPage(0);
  }

  function exportCSV() {
    const rows = data?.content ?? [];
    const header = [
      "idAuditoria",
      "fechaEvento",
      "usuario",
      "idUsuario",
      "moduloAfectado",
      "accion",
      "idRegistroAfectado",
      "detalle",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.idAuditoria,
          new Date(r.fechaEvento).toLocaleString(),
          r.usuario ?? "",
          r.idUsuario ?? "",
          JSON.stringify(r.moduloAfectado ?? "").replaceAll('"', '""'),
          JSON.stringify(r.accion ?? "").replaceAll('"', '""'),
          r.idRegistroAfectado ?? "",
          JSON.stringify(r.detalle ?? "").replaceAll('"', '""'),
        ]
          .map((v) => (String(v).includes(",") ? `"${v}"` : String(v)))
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditorias_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Auditorías</h1>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-600 mb-1">Usuario ID</label>
            <input
              type="number"
              value={usuarioId}
              onChange={(e) => {
                setUsuarioId(e.target.value);
                setPage(0);
              }}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. 1"
              min={0}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-neutral-600 mb-1">Módulo</label>
            <input
              type="text"
              value={modulo}
              onChange={(e) => {
                setModulo(e.target.value);
                setPage(0);
              }}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="inventario.ajustes, seguridad, compras…"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-600 mb-1">Acción</label>
            <input
              type="text"
              value={accion}
              onChange={(e) => {
                setAccion(e.target.value);
                setPage(0);
              }}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="crear_aplicar, editar…"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-600 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                setPage(0);
              }}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-600 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
                setPage(0);
              }}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm text-neutral-600 mb-1">Buscar</label>
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="detalle, módulo o acción…"
            />
          </div>

          <div className="md:col-span-3 flex items-end gap-2">
            <button
              onClick={() => {
                setPage(0);
              }}
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
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(0);
                }}
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
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Usuario</th>
                <th className="text-left px-3 py-2">Módulo</th>
                <th className="text-left px-3 py-2">Acción</th>
                <th className="text-left px-3 py-2">Ref</th>
                <th className="text-left px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                    Cargando…
                  </td>
                </tr>
              )}
              {err && !loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-rose-600">
                    {err}
                  </td>
                </tr>
              )}
              {!loading && !err && (data?.content?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                    Sin resultados.
                  </td>
                </tr>
              )}
              {(data?.content ?? []).map((a) => (
                <tr key={a.idAuditoria} className="border-t border-neutral-100">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(a.fechaEvento).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {a.usuario?.trim() || (a.idUsuario != null ? `#${a.idUsuario}` : "—")}
                  </td>
                  <td className="px-3 py-2">
                    <span className={pillClass("modulo", a.moduloAfectado)}>{a.moduloAfectado}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={pillClass("accion", a.accion)}>{a.accion}</span>
                  </td>
                  <td className="px-3 py-2">{a.idRegistroAfectado ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="max-w-[560px] truncate" title={a.detalle ?? ""}>
                      {a.detalle ?? "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200 text-sm">
          <div>
            Página <strong>{(data?.number ?? 0) + 1}</strong> de{" "}
            <strong>{data?.totalPages ?? 1}</strong> • {data?.totalElements ?? 0} registros
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
