
import { useEffect, useRef, useState } from "react";
import { preciosService } from "@/servicios/precios";
import AjusteManualModal from "@/componentes/precios/AjusteManualModal";
import type { Page } from "@/types/pagination";
import type { PrecioHistoricoDTO, FiltroHistoricoDTO } from "@/types/precios";

export default function HistorialPrecios() {
  const [sku, setSku] = useState("");
  const [desde, setDesde] = useState<string | undefined>();
  const [hasta, setHasta] = useState<string | undefined>();
  const [motivo, setMotivo] = useState("");
  const [usuario, setUsuario] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const emptyPage: Page<PrecioHistoricoDTO> = {
    content: [],
    totalPages: 0,
    totalElements: 0,
    number: 0,
    size,
    first: true,
    last: true,
  };
  const [data, setData] = useState<Page<PrecioHistoricoDTO>>(emptyPage);

  const [modalManual, setModalManual] = useState<{ open: boolean; id: number | null; sku?: string }>({
    open: false,
    id: null,
  });
  // refs para abrir el datepicker nativo
  const refDesde = useRef<HTMLInputElement>(null);
  const refHasta = useRef<HTMLInputElement>(null);

  const buscar = async (p = page) => {
    const skuTrim = (sku ?? "").trim();
    const filtro: FiltroHistoricoDTO = {
      sku: skuTrim.length ? skuTrim : undefined,
      desde: desde ? `${desde}T00:00:00` : undefined,
      hasta: hasta ? `${hasta}T23:59:59` : undefined,
      motivo: (motivo ?? "").trim() || undefined,
      usuario: (usuario ?? "").trim() || undefined,
    };
    try {
      const r = await preciosService.buscarHistorico(filtro, p, size);
      setData({
        ...(r as Page<PrecioHistoricoDTO>),
        content: r.content ?? [],
        totalPages: r.totalPages ?? 0,
        totalElements: r.totalElements ?? 0,
        number: (r as any).number ?? p,
        size: (r as any).size ?? size,
        first: (r as any).first ?? p === 0,
        last: (r as any).last ?? ((r.totalPages ?? 1) <= p + 1),
      });
      setPage(p);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        e?.response?.statusText ||
        e?.message ||
        "Error desconocido";
      alert(msg);

    }
  };

  useEffect(() => {}, []);

  const revertir = async (idHist: number) => {
    if (!confirm("¿Revertir a este precio? Creará un nuevo vigente.")) return;
    try {
      await preciosService.revertir(idHist, "ui");
      alert("Reversión aplicada");
      buscar(0);
    } catch (e: any) {
      alert(e.message || "No se pudo revertir");
    }
  };

  return (
    <div className="p-6 text-slate-800">
      <h1 className="text-3xl font-bold mb-6">Historial de Cambios de Precios</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtros */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <label className="text-sm text-slate-600">Buscar por SKU</label>
            <div className="relative">
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                onBlur={() => setSku((v) => v.trim())}
                placeholder="Ingresa el SKU Identico"
                className="w-full mt-1 rounded-lg bg-white px-3 py-2 pr-10 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none"
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

          <div className="grid grid-cols-2 gap-3">
            {/* Desde */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Desde</label>
              <div className="relative">
                <input
                  ref={refDesde}
                  type="date"
                  className="w-full rounded-lg bg-white px-3 py-2 pr-9 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={desde || ""}
                  onChange={(e) => setDesde(e.target.value || undefined)}
                  max={hasta || undefined}
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
                  <svg className="h-4 w-4 text-neutral-500" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 3v2M17 3v2M3.5 8h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19A2.5 2.5 0 0 1 18 21H6A2.5 2.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Hasta */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Hasta</label>
              <div className="relative">
                <input
                  ref={refHasta}
                  type="date"
                  className="w-full rounded-lg bg-white px-3 py-2 pr-9 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={hasta || ""}
                  onChange={(e) => setHasta(e.target.value || undefined)}
                  min={desde || undefined}
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
                  <svg className="h-4 w-4 text-neutral-500" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 3v2M17 3v2M3.5 8h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19A2.5 2.5 0 0 1 18 21H6A2.5 2.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-sm text-slate-600">Motivo del Cambio</label>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Promoción, TC, manual…"
              className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-3">
            <label className="text-sm text-slate-600">Usuario</label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="usuario"
              className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => buscar(0)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={() => {
                setSku("");
                setDesde(undefined);
                setHasta(undefined);
                setMotivo("");
                setUsuario("");
                setPage(0);
                setData(emptyPage);
              }}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300"
            >
              Limpiar
            </button>
          </div>
        </aside>

        {/* Tabla */}
        <section className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600 bg-slate-50">
                <tr>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Precio</th>
                  <th className="p-2">Vigencia</th>
                  <th className="p-2">Motivo</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((h) => (
                  <tr key={h.idPrecioHistorico} className="border-t border-slate-200">
                    <td className="p-2">{sku}</td>
                    <td className="p-2 font-semibold">Bs {Number(h.precioVentaBob).toFixed(2)}</td>
                    <td className="p-2">
                      {new Date(h.fechaInicioVigencia).toLocaleString()}{" "}
                      {h.fechaFinVigencia ? `— ${new Date(h.fechaFinVigencia).toLocaleString()}` : ""}
                    </td>
                    <td className="p-2">{h.motivoCambio ?? "-"}</td>
                    <td className="p-2">
                      {h.vigente ? <span className="text-emerald-500">●</span> : <span className="text-slate-400">–</span>}
                    </td>
                    <td className="p-2 flex gap-2">
                      {!h.vigente && (
                        <button
                          onClick={() => revertir(h.idPrecioHistorico)}
                          className="px-3 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-400"
                        >
                          Revertir
                        </button>
                      )}
                      {h.vigente && (
                        <button
                          onClick={() => setModalManual({ open: true, id: h.idPresentacion, sku })}
                          className="px-3 py-1 rounded-md bg-slate-200 hover:bg-slate-300"
                        >
                          Ajuste manual
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.content.length === 0 && (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={6}>
                      Aplica filtros para ver resultados…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              disabled={page <= 0}
              onClick={() => buscar(page - 1)}
              className="px-3 py-1 rounded-md bg-slate-200 hover:bg-slate-300 disabled:opacity-40"
            >
              Anterior
            </button>
            <div className="text-slate-600 text-sm">
              Página {page + 1} de {Math.max(1, data.totalPages)}
            </div>
            <button
              disabled={page + 1 >= data.totalPages}
              onClick={() => buscar(page + 1)}
              className="px-3 py-1 rounded-md bg-slate-200 hover:bg-slate-300 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </section>
      </div>

      <AjusteManualModal
        open={modalManual.open}
        onClose={() => setModalManual({ open: false, id: null })}
        idPresentacion={modalManual.id}
        sku={sku}
        onSaved={() => buscar(0)}
      />
    </div>
  );
}
