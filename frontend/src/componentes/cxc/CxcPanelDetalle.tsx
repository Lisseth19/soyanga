import { useEffect, useState } from "react";
import { cobrosService } from "@/servicios/cobros";
import type { CxcDetalleDTO } from "@/types/cobros";

function money(n?: number | null) {
    if (n == null) return "-";
    return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB", minimumFractionDigits: 2 }).format(n);
}
function fmtDT(iso?: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("es-BO");
}
function fmtDate(iso?: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("es-BO");
}

export default function CxcPanelDetalle({ ventaId }: { ventaId: number }) {
    const [detalle, setDetalle] = useState<CxcDetalleDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setErr(null);
            try {

                const data = await cobrosService.obtenerCxcDetallePorVenta(ventaId);

                if (mounted) setDetalle(data);
            } catch (e: any) {
                if (mounted) setErr(e?.message ?? "No se pudo cargar CxC");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [ventaId]);

    if (loading) {
        return (
            <div className="rounded-lg border p-4 bg-green-50">
                <div className="animate-pulse h-5 w-40 bg-green-200 rounded mb-2" />
                <div className="animate-pulse h-4 w-24 bg-green-200 rounded" />
            </div>
        );
    }

    if (err) {
        return <div className="rounded-lg border p-4 text-red-700 bg-red-50">Error: {err}</div>;
    }

    if (!detalle) {
        return (
            <div className="rounded-lg border p-4 bg-green-50">
                <div className="font-semibold text-green-900">Estado de Cuenta por Cobrar</div>
                <div className="text-sm text-green-700 mt-2">Esta venta no generó CxC.</div>
            </div>
        );
    }

    const { totalACobrar, totalAplicado, pendiente, fechaVencimiento, pagos } = detalle;

    return (
        <div className="rounded-lg border p-0 overflow-hidden">
            <div className="p-4 bg-green-50">
                <div className="font-semibold text-green-900">Estado de Cuenta por Cobrar</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="text-neutral-600">Total a Cobrar</div>
                    <div className="text-right font-medium">{money(totalACobrar)}</div>
                    <div className="text-neutral-600">Pagos aplicados</div>
                    <div className="text-right font-medium">{money(totalAplicado)}</div>
                    <div className="col-span-2 border-t my-1" />
                    <div className="text-green-700 font-semibold">Pendiente</div>
                    <div className="text-right text-green-700 font-semibold">{money(pendiente)}</div>
                </div>
                <div className="mt-1 text-xs text-neutral-500">Vence: {fmtDate(fechaVencimiento)}</div>
            </div>

            <div className="p-4">
                <div className="font-medium mb-2">Historial de pagos</div>

                {pagos.length === 0 ? (
                    <div className="text-sm text-neutral-500">Sin pagos aplicados.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left border-b">
                            <tr className="[&>th]:py-2">
                                <th>Fecha</th>
                                <th>Método</th>
                                <th>Referencia</th>
                                <th className="text-right">Aplicado</th>
                                <th className="text-right">Saldo después</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pagos.map((p) => (
                                <tr key={`${p.idPago}-${p.fechaPago}`} className="border-b last:border-0">
                                    <td className="py-2">{fmtDT(p.fechaPago)}</td>
                                    <td className="capitalize">{p.metodoDePago}</td>
                                    <td className="text-neutral-600">{p.referenciaExterna ?? "-"}</td>
                                    <td className="text-right font-medium">{money(p.aplicadoBob)}</td>
                                    <td className="text-right">{money(p.saldoDespues)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
