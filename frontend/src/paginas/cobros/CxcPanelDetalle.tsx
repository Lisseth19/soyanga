import { useEffect, useMemo, useRef, useState } from "react";
import { cobrosService } from "@/servicios/cobros.ts";
import type { CxcDetalleDTO } from "@/types/cobros.ts";

function money(n?: number | null) {
    if (n == null) return "—";
    return new Intl.NumberFormat("es-BO", {
        style: "currency",
        currency: "BOB",
        minimumFractionDigits: 2,
    }).format(n);
}
function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-BO");
}



export default function CxcHistorialPagosModal({
                                                   ventaId,
                                                   ventaLabel,               // ej. "Factura FAC-00125" o "Boleta B-000053"
                                                   cliente,                  // nombre del cliente
                                                   onClose,
                                               }: {
    ventaId: number;
    ventaLabel?: string;
    cliente?: string | null;
    onClose: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);

    const [detalle, setDetalle] = useState<CxcDetalleDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Cerrar con click afuera
    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [onClose]);

    // Cerrar con ESC
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const data = await cobrosService.obtenerCxcDetallePorVenta(ventaId);
                if (alive) setDetalle(data);
            } catch (e: any) {
                if (alive) setErr(e?.message || "No se pudo cargar el historial.");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [ventaId]);

    const total = Number(detalle?.totalACobrar ?? 0);
    const aplicado = Number(detalle?.totalAplicado ?? 0);
    const pendiente = Number(detalle?.pendiente ?? 0);
    const progreso = useMemo(() => {
        if (total <= 0) return 0;
        const pct = (aplicado / total) * 100;
        return Math.max(0, Math.min(100, pct));
    }, [total, aplicado]);

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-[1000]" />
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
                <div
                    ref={cardRef}
                    role="dialog"
                    aria-modal="true"
                    className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold">Historial de Pagos</h2>
                            <p className="text-sm text-neutral-500">
                                {ventaLabel ?? `Venta #${ventaId}`}
                                {cliente ? ` — ${cliente}` : ""}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100"
                            aria-label="Cerrar"
                            title="Cerrar"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto">
                        {loading && (
                            <div className="space-y-3">
                                <div className="h-6 w-48 bg-neutral-200 animate-pulse rounded" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="h-20 bg-neutral-100 rounded animate-pulse" />
                                    ))}
                                </div>
                                <div className="h-2 bg-neutral-200 rounded" />
                                <div className="h-40 bg-neutral-100 rounded animate-pulse mt-4" />
                            </div>
                        )}

                        {!loading && err && (
                            <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2">
                                {err}
                            </div>
                        )}

                        {!loading && !err && detalle && (
                            <>
                                {/* Estado de cuenta */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-neutral-600 mb-4">
                                        Estado de Cuenta por Cobrar
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        {/* Total a cobrar */}
                                        <div className="bg-neutral-100 p-4 rounded-lg flex items-center">
                                            <div className="p-3 rounded-full bg-blue-100 mr-4">
                                                {/* Icono simple */}
                                                <span role="img" aria-label="recibo">🧾</span>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-neutral-500 uppercase tracking-wider">
                                                    Total a cobrar
                                                </p>
                                                <p className="text-xl font-bold">{money(total)}</p>
                                            </div>
                                        </div>

                                        {/* Pagos aplicados */}
                                        <div className="bg-neutral-100 p-4 rounded-lg flex items-center">
                                            <div className="p-3 rounded-full bg-emerald-100 mr-4">
                                                <span role="img" aria-label="ok">✅</span>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-neutral-500 uppercase tracking-wider">
                                                    Pagos aplicados
                                                </p>
                                                <p className="text-xl font-bold text-emerald-600">{money(aplicado)}</p>
                                            </div>
                                        </div>

                                        {/* Pendiente */}
                                        <div className="bg-neutral-100 p-4 rounded-lg flex items-center">
                                            <div className="p-3 rounded-full bg-rose-100 mr-4">
                                                <span role="img" aria-label="pendiente">⏳</span>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-neutral-500 uppercase tracking-wider">
                                                    Pendiente
                                                </p>
                                                <p className="text-xl font-bold text-rose-600">{money(pendiente)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra de progreso */}
                                    <div className="w-full bg-neutral-200 rounded-full h-2.5">
                                        <div
                                            className="bg-blue-500 h-2.5 rounded-full"
                                            style={{ width: `${progreso.toFixed(1)}%` }}
                                        />
                                    </div>

                                    {/* Vencimiento */}
                                    <div className="mt-2 text-xs text-neutral-500">
                                        Vence: {fmtDate(detalle.fechaVencimiento)}
                                    </div>
                                </div>

                                {/* Tabla de pagos */}
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-neutral-500 uppercase bg-neutral-50">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Fecha</th>
                                            <th className="px-6 py-3 font-medium">Método de pago</th>
                                            <th className="px-6 py-3 font-medium">Referencia</th>
                                            <th className="px-6 py-3 font-medium text-right">Monto aplicado</th>
                                            <th className="px-6 py-3 font-medium text-right">Saldo después</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {detalle.pagos.length === 0 && (
                                            <tr>
                                                <td className="px-6 py-4 text-neutral-500" colSpan={5}>
                                                    Sin pagos aplicados.
                                                </td>
                                            </tr>
                                        )}
                                        {detalle.pagos.map((p) => (
                                            <tr key={`${p.idPago}-${p.fechaPago}`} className="border-t">
                                                <td className="px-6 py-3">{fmtDate(p.fechaPago)}</td>
                                                <td className="px-6 py-3 capitalize">{p.metodoDePago}</td>
                                                <td className="px-6 py-3 font-mono text-xs">
                                                    {p.referenciaExterna || "—"}
                                                </td>
                                                <td className="px-6 py-3 text-right text-emerald-600 font-semibold">
                                                    {money(p.aplicadoBob)}
                                                </td>
                                                <td className="px-6 py-3 text-right">{money(p.saldoDespues)}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end items-center gap-3 p-4 bg-neutral-50 border-t rounded-b-xl">
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center rounded-lg h-10 px-4 bg-neutral-200 text-sm font-semibold hover:bg-neutral-300"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
