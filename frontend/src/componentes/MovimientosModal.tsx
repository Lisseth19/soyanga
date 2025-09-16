import { useEffect, useRef } from "react";
import type { MovimientoDeInventario } from "@/servicios/inventario";

function fmtDate(iso?: string) {
    if (!iso) return "—";
    const s = iso.includes("T") ? iso.split("T")[0] : iso; // yyyy-mm-dd
    const [y, m, d] = s.split("-");
    return y && m && d ? `${d}/${m}/${y}` : s;
}

export function MovimientosModal({
                                     open, onClose, titulo, loading, error, items
                                 }: {
    open: boolean; onClose: () => void; titulo: string;
    loading: boolean; error: string | null; items: MovimientoDeInventario[];
}) {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            aria-modal="true"
            role="dialog"
            aria-labelledby="movimientos-title"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Dialog */}
            <div
                ref={dialogRef}
                className="relative bg-white rounded-2xl shadow-xl w-[min(1000px,95vw)] max-h-[85vh] overflow-hidden flex flex-col ring-1 ring-neutral-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-neutral-200 bg-gradient-to-r from-emerald-50 to-emerald-100 flex items-center justify-between">
                    <div className="min-w-0">
                        <h2 id="movimientos-title" className="font-semibold truncate">
                            Movimientos — {titulo}
                        </h2>
                        <p className="text-xs text-neutral-600">Últimos registros del lote seleccionado</p>
                    </div>
                    <button
                        className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 hover:bg-white"
                        onClick={onClose}
                    >
                        Cerrar ✕
                    </button>
                </div>

                {/* Body (scroll oculto) */}
                <div className="p-4 flex-1 overflow-auto no-scrollbar">
                    {loading && <div className="text-sm text-neutral-600">Cargando movimientos…</div>}
                    {error && <div className="text-sm text-red-600">Error: {error}</div>}
                    {!loading && !error && items.length === 0 && (
                        <div className="text-sm text-neutral-500">Sin movimientos recientes.</div>
                    )}

                    {items.length > 0 && (
                        <div className="rounded-xl ring-1 ring-neutral-200 overflow-hidden bg-white">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-50 sticky top-0 z-10">
                                <tr className="text-neutral-700">
                                    <th className="text-left px-3 py-2">Fecha</th>
                                    <th className="text-left px-3 py-2">Tipo</th>
                                    <th className="text-right px-3 py-2">Cantidad</th>
                                    <th className="text-left px-3 py-2">Origen</th>
                                    <th className="text-left px-3 py-2">Destino</th>
                                    <th className="text-left px-3 py-2">Referencia</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                {items.map((m, i) => {
                                    const tipoLower = String(m.tipo ?? "").toLowerCase();
                                    const esNegativo =
                                        tipoLower.includes("salida") ||
                                        tipoLower.includes("reserva") ||
                                        tipoLower.includes("transferencia_salida") ||
                                        (m.cantidad ?? 0) < 0;

                                    const sign = esNegativo ? "-" : "+";
                                    const cantidadFmt = Math.abs(m.cantidad ?? 0).toLocaleString();

                                    return (
                                        <tr key={`${m.fecha}-${m.tipo}-${i}`} className="hover:bg-neutral-50/60">
                                            <td className="px-3 py-2">{fmtDate(m.fecha)}</td>
                                            <td className="px-3 py-2">
                          <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                  esNegativo ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                              }`}
                          >
                            {m.tipo || "—"}
                          </span>
                                            </td>
                                            <td className={`px-3 py-2 text-right ${esNegativo ? "text-red-600" : "text-emerald-700"} font-semibold`}>
                                                {sign}{cantidadFmt}
                                            </td>
                                            <td className="px-3 py-2 max-w-[22ch] truncate" title={m.almacenOrigen ?? "—"}>
                                                {m.almacenOrigen ?? "—"}
                                            </td>
                                            <td className="px-3 py-2 max-w-[22ch] truncate" title={m.almacenDestino ?? "—"}>
                                                {m.almacenDestino ?? "—"}
                                            </td>
                                            <td className="px-3 py-2">
                                                {m.referenciaModulo ?? "-"} {m.idReferencia ? `#${m.idReferencia}` : ""}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-neutral-200 bg-white">
                    <div className="flex justify-end">
                        <button
                            className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
                            onClick={onClose}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
