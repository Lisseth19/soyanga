// src/paginas/ventas/VentaDetalle.tsx
import { useEffect, useMemo, useState } from "react";
import { ventasService } from "@/servicios/ventas";
import type { VentaDetalleRespuestaDTO } from "@/types/ventas";
import VentaTrazabilidad from "@/paginas/ventas/VentaTrazabilidad";

function fmtFecha(iso?: string | null) {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return String(iso);
    }
}
function money(n?: number | null) {
    const v = Number(n ?? 0);
    return v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export default function VentaDetalle({
                                         idVenta,
                                         onClose,
                                     }: {
    idVenta: number;
    onClose: () => void;
}) {
    const [data, setData] = useState<VentaDetalleRespuestaDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [openTraz, setOpenTraz] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const res = await ventasService.detalle(idVenta);
                setData(res);
            } catch (e: any) {
                setErr(e?.message || "No se pudo cargar el detalle");
            } finally {
                setLoading(false);
            }
        })();
    }, [idVenta]);

    // ===== Totales (panel derecho) =====
    const totales = useMemo(() => {
        const bruto = Number(data?.totalBrutoBob ?? 0);
        const desc = Number(data?.descuentoTotalBob ?? 0);

        // Base imponible (antes de impuesto)
        const baseImponible = Math.max(0, bruto - desc);

        // Neto que manda el backend (incluye impuesto cuando es FACTURA)
        const netoInclImpuesto = Number(data?.totalNetoBob ?? 0);

        // Impuesto derivado
        const esFactura =
            String(data?.tipoDocumentoTributario ?? "").toLowerCase() === "factura";
        const impuestoMonto = esFactura
            ? Math.max(0, netoInclImpuesto - baseImponible)
            : 0;
        const impuestoPct =
            baseImponible > 0 ? (impuestoMonto / baseImponible) * 100 : 0;

        // Interés derivado (desde CxC; si no hay diferencia, intenta con interesCredito%)
        const esCredito =
            String(data?.condicionDePago ?? "").toLowerCase() === "credito";
        let interesMonto = 0;
        if (esCredito) {
            const pendienteCxC = Number(data?.cxc?.montoPendienteBob ?? 0);
            interesMonto = Math.max(0, pendienteCxC - netoInclImpuesto);

            if (interesMonto === 0) {
                const interesCreditoPct = Number((data as any)?.interesCredito ?? 0);
                if (interesCreditoPct > 0) {
                    interesMonto = netoInclImpuesto * (interesCreditoPct / 100);
                }
            }
        }
        const interesPct =
            netoInclImpuesto > 0 ? (interesMonto / netoInclImpuesto) * 100 : 0;

        // Total final mostrado (neto + interés)
        const netoConTodo = netoInclImpuesto + interesMonto;

        return {
            bruto,
            desc,
            impuestoMonto,
            impuestoPct,
            interesMonto,
            interesPct,
            netoConTodo,
            netoSinInteres: netoInclImpuesto,
        };
    }, [data]);

    const totalItems = useMemo(() => data?.items?.length ?? 0, [data]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">
                        Venta #{idVenta} {data ? `· ${String(data.estadoVenta).toUpperCase()}` : ""}
                    </h3>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1 border rounded text-sm hover:bg-neutral-50"
                            onClick={() => setOpenTraz(true)}
                            disabled={!data}
                            title="Ver trazabilidad de esta venta"
                        >
                            Ver trazabilidad
                        </button>
                        <button
                            className="px-3 py-1 border rounded text-sm hover:bg-neutral-50"
                            onClick={onClose}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {loading && <div className="text-neutral-500">Cargando…</div>}
                    {err && <div className="text-rose-600">{err}</div>}

                    {data && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* ===== Columna izquierda (Info + Ítems) ===== */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Información general — estilo “definición”, limpio */}
                                <div className="rounded-xl border p-4">
                                    <h4 className="font-semibold mb-3">Información general</h4>

                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                                        <div>
                                            <dt className="text-neutral-500">Fecha</dt>
                                            <dd className="font-medium">{fmtFecha(data.fechaVenta)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-neutral-500">Cliente</dt>
                                            <dd className="font-medium">{data.cliente ?? "-"}</dd>
                                        </div>

                                        <div>
                                            <dt className="text-neutral-500">Tipo Doc.</dt>
                                            <dd className="font-medium">
                                                {String(data.tipoDocumentoTributario).toUpperCase()}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-neutral-500">Número</dt>
                                            <dd className="font-medium">{data.numeroDocumento ?? "-"}</dd>
                                        </div>

                                        <div>
                                            <dt className="text-neutral-500">Condición</dt>
                                            <dd className="font-medium capitalize">
                                                {String(data.condicionDePago).toLowerCase()}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-neutral-500">Método de pago</dt>
                                            <dd className="font-medium capitalize">
                                                {String(data.metodoDePago).toLowerCase()}
                                            </dd>
                                        </div>

                                        {data.fechaVencimientoCredito && (
                                            <div>
                                                <dt className="text-neutral-500">Vence</dt>
                                                <dd className="font-medium">{data.fechaVencimientoCredito}</dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-neutral-500">Almacén despacho</dt>
                                            <dd className="font-medium">{data.idAlmacenDespacho}</dd>
                                        </div>

                                        {data.observaciones && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-neutral-500">Observaciones</dt>
                                                <dd className="font-medium">{data.observaciones}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>

                                {/* Ítems */}
                                <div className="rounded-xl border overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-neutral-50">
                                        <div className="text-sm text-neutral-600">Ítems ({totalItems})</div>
                                    </div>
                                    <div className="overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-neutral-50 text-neutral-600">
                                            <tr>
                                                <th className="text-left p-2">SKU</th>
                                                <th className="text-left p-2">Producto</th>
                                                <th className="text-right p-2">Cant.</th>
                                                <th className="text-right p-2">P. Unitario</th>
                                                <th className="text-right p-2">Desc. %</th>
                                                <th className="text-right p-2">Desc. (Bs)</th>
                                                <th className="text-right p-2">Subtotal</th>
                                                <th className="text-left p-2">Lotes</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {data.items.map((it) => (
                                                <tr key={it.idVentaDetalle} className="border-t">
                                                    <td className="p-2">{it.sku}</td>
                                                    <td className="p-2">{it.producto}</td>
                                                    <td className="p-2 text-right">{it.cantidad}</td>
                                                    <td className="p-2 text-right">{money(it.precioUnitarioBob)}</td>
                                                    <td className="p-2 text-right">
                                                        {Number(it.descuentoPorcentaje ?? 0).toFixed(2)}
                                                    </td>
                                                    <td className="p-2 text-right">{money(it.descuentoMontoBob)}</td>
                                                    <td className="p-2 text-right font-medium">{money(it.subtotalBob)}</td>
                                                    <td className="p-2">
                                                        {it.lotes?.length ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {it.lotes.map((l, i) => (
                                                                    <span
                                                                        key={i}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs"
                                                                    >
                                      {l.numeroLote} · {l.cantidad}
                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-neutral-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* ===== Columna derecha (Totales + CxC) ===== */}
                            <div className="space-y-6">
                                {/* Totales */}
                                <div className="rounded-xl border p-4">
                                    <h4 className="font-semibold mb-3">Totales</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-600">Total Bruto</span>
                                            <span className="font-medium">{money(totales.bruto)}</span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-neutral-600">Total Descuento</span>
                                            <span className="font-medium text-rose-500">
                        ({money(totales.desc)})
                      </span>
                                        </div>

                                        {/* Impuesto SIEMPRE visible */}
                                        <div className="flex justify-between">
                      <span className="text-neutral-600">
                        Impuesto ({(totales.impuestoPct ?? 0).toFixed(2)}%)
                      </span>
                                            <span className="font-medium">{money(totales.impuestoMonto)}</span>
                                        </div>

                                        {/* Interés SIEMPRE visible */}
                                        <div className="flex justify-between">
                      <span className="text-neutral-600">
                        Interés ({(totales.interesPct ?? 0).toFixed(2)}%)
                      </span>
                                            <span className="font-medium">{money(totales.interesMonto)}</span>
                                        </div>

                                        <div className="border-t my-2" />

                                        <div className="flex justify-between text-base font-semibold">
                                            <span>Total Neto</span>
                                            <span>{money(totales.netoConTodo)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* CxC */}
                                {data.cxc && (
                                    <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100">
                                        <h4 className="font-semibold mb-3 text-emerald-700">
                                            Estado de Cuenta por Cobrar
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-neutral-700">Total a Cobrar</span>
                                                <span className="font-medium">
                          {money(data.cxc.montoPendienteBob)}
                        </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-700">Pagos aplicados</span>
                                                <span className="font-medium">
                          {money(data.cxc.totalPagosAplicadosBob)}
                        </span>
                                            </div>
                                            <div className="border-t my-2" />
                                            <div className="flex justify-between text-base font-semibold text-emerald-700">
                                                <span>Pendiente</span>
                                                <span>{money(data.cxc.montoPendienteBob)}</span>
                                            </div>
                                            {data.cxc.fechaVencimiento && (
                                                <div className="text-xs text-neutral-600">
                                                    Vence: {data.cxc.fechaVencimiento}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Trazabilidad */}
            {openTraz && (
                <VentaTrazabilidad idVenta={idVenta} onClose={() => setOpenTraz(false)} />
            )}
        </div>
    );
}
