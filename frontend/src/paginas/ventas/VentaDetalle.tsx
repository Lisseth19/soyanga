// src/paginas/ventas/VentaDetalle.tsx
import { useEffect, useMemo, useState } from "react";
import { ventasService } from "@/servicios/ventas";
import type { VentaDetalleRespuestaDTO, VentaTrazabilidadDTO } from "@/types/ventas";
import VentaTrazabilidad from "@/paginas/ventas/VentaTrazabilidad";
//import CxcPanelDetalle from "@/componentes/cxc/CxcPanelDetalle";
import { almacenService, type OpcionIdNombre } from "@/servicios/almacen";

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
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    // Para mostrar el nombre del almacén
    const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);

    // Para derivar interés si el DTO no trae el porcentaje
    const [cxcPendiente, setCxcPendiente] = useState<number | null>(null);

    useEffect(() => {
        almacenService.options().then(setAlmacenes).catch(() => setAlmacenes([]));
    }, []);

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

    // Si el DTO de detalle no trae CxC, intento obtenerlo desde trazabilidad
    useEffect(() => {
        const posible = Number((data as any)?.cxc?.montoPendienteBob ?? 0);
        if (posible > 0) {
            setCxcPendiente(posible);
            return;
        }
        const esCredito = String(data?.condicionDePago ?? "").toLowerCase() === "credito";
        if (!esCredito) {
            setCxcPendiente(null);
            return;
        }
        ventasService
            .trazabilidad(idVenta)
            .then((t: VentaTrazabilidadDTO) => {
                const m1 = Number((t as any)?.cxc?.montoPendienteBob ?? 0);
                const m2 = Number((t as any)?.cuentaPorCobrar?.montoPendienteBob ?? 0);
                const m3 = Number((t as any)?.cxc?.totalACobrarBob ?? 0);
                const best = Math.max(m1, m2, m3);
                setCxcPendiente(best > 0 ? best : null);
            })
            .catch(() => setCxcPendiente(null));
    }, [idVenta, data]);

    // ===== Totales (panel derecho) =====
    const totales = useMemo(() => {
        const bruto = Number(data?.totalBrutoBob ?? 0);
        const desc = Number(data?.descuentoTotalBob ?? 0);

        // Base imponible (antes de impuesto)
        const baseImponible = Math.max(0, bruto - desc);

        // Neto del backend (incluye impuesto cuando es FACTURA)
        const netoInclImpuesto = Number(data?.totalNetoBob ?? 0);

        // Impuesto derivado
        const esFactura = String(data?.tipoDocumentoTributario ?? "").toLowerCase() === "factura";
        const impuestoMonto = esFactura ? Math.max(0, netoInclImpuesto - baseImponible) : 0;
        const impuestoPct = baseImponible > 0 ? (impuestoMonto / baseImponible) * 100 : 0;

        // Interés
        const esCredito = String(data?.condicionDePago ?? "").toLowerCase() === "credito";

        // 1) porcentaje directo, si viene
        let interesPctRaw =
            Number((data as any)?.interesCredito ?? 0) ||
            Number((data as any)?.interesCreditoPct ?? 0) ||
            Number((data as any)?.interes ?? 0);

        // 2) monto por diferencia con CxC (si no vino %)
        let interesMonto = 0;
        if (esCredito) {
            if (interesPctRaw > 0) {
                interesMonto = netoInclImpuesto * (interesPctRaw / 100);
            } else {
                const cxcTotal =
                    Number((data as any)?.cxc?.montoPendienteBob ?? 0) || Number(cxcPendiente ?? 0);
                if (cxcTotal > netoInclImpuesto) {
                    interesMonto = cxcTotal - netoInclImpuesto;
                    if (netoInclImpuesto > 0) interesPctRaw = (interesMonto / netoInclImpuesto) * 100;
                }
            }
        }
        const interesPct = interesPctRaw || 0;

        // ===== Anticipo aplicado (si existe en la CxC de la venta) =====
        const anticipoAplicado =
            Number((data as any)?.cxc?.totalAnticiposAplicadosBob ?? 0) ||
            Number((data as any)?.cxc?.anticipoAplicadoBob ?? 0) ||
            Number((data as any)?.cxc?.totalAnticipoBob ?? 0); // <-- agrega aquí más alias si tu backend usa otro nombre

        // Totales visuales
        const netoConTodo = netoInclImpuesto + interesMonto; // neto + impuesto + interés
        const netoFinal = Math.max(0, netoConTodo - (anticipoAplicado || 0)); // restar anticipo

        return {
            bruto,
            desc,
            impuestoMonto,
            impuestoPct,
            interesMonto,
            interesPct,
            anticipoAplicado,
            netoConTodo,
            netoFinal,
            netoSinInteres: netoInclImpuesto,
        };
    }, [data, cxcPendiente]);

    const totalItems = useMemo(() => data?.items?.length ?? 0, [data]);

    // Nombre del almacén
    const nombreAlmacen = useMemo(() => {
        const byId = almacenes.find((a) => a.id === (data?.idAlmacenDespacho as any));
        return (
            (data as any)?.almacenDespachoNombre ??
            byId?.nombre ??
            (data?.idAlmacenDespacho != null ? String(data.idAlmacenDespacho) : "-")
        );
    }, [almacenes, data]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* overlay que cierra al click */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            {/* contenedor: detenemos la propagación para no cerrar cuando se hace click dentro */}
            <div
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
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
                        <button className="px-3 py-1 border rounded text-sm hover:bg-neutral-50" onClick={onClose}>
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
                                {/* Información general */}
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
                                            <dd className="font-medium">{String(data.tipoDocumentoTributario).toUpperCase()}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-neutral-500">Número</dt>
                                            <dd className="font-medium">{data.numeroDocumento ?? "-"}</dd>
                                        </div>

                                        <div>
                                            <dt className="text-neutral-500">Condición</dt>
                                            <dd className="font-medium capitalize">{String(data.condicionDePago).toLowerCase()}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-neutral-500">Método de pago</dt>
                                            <dd className="font-medium capitalize">{String(data.metodoDePago).toLowerCase()}</dd>
                                        </div>

                                        {data.fechaVencimientoCredito && (
                                            <div>
                                                <dt className="text-neutral-500">Vence</dt>
                                                <dd className="font-medium">{data.fechaVencimientoCredito}</dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-neutral-500">Almacén despacho</dt>
                                            <dd className="font-medium">{nombreAlmacen}</dd>
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
                                                    <td className="p-2 text-right">{Number(it.descuentoPorcentaje ?? 0).toFixed(2)}</td>
                                                    <td className="p-2 text-right">{money(it.descuentoMontoBob)}</td>
                                                    <td className="p-2 text-right font-medium">{money(it.subtotalBob)}</td>
                                                    <td className="p-2">
                                                        {it.lotes?.length ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {it.lotes.map((l, i) => (
                                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs">
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
                                            <span className="font-medium text-rose-500">({money(totales.desc)})</span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-neutral-600">Impuesto ({(totales.impuestoPct ?? 0).toFixed(2)}%)</span>
                                            <span className="font-medium">{money(totales.impuestoMonto)}</span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-neutral-600">Interés ({(totales.interesPct ?? 0).toFixed(2)}%)</span>
                                            <span className="font-medium">{money(totales.interesMonto)}</span>
                                        </div>

                                        {/* NUEVO: Monto anticipo si aplica */}
                                        {totales.anticipoAplicado > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-neutral-600">Monto anticipo</span>
                                                <span className="font-medium text-emerald-600">- {money(totales.anticipoAplicado)}</span>
                                            </div>
                                        )}

                                        <div className="border-t my-2" />

                                        <div className="flex justify-between text-base font-semibold">
                                            <span>Total Neto</span>
                                            <span>{money(totales.netoFinal)}</span>
                                        </div>
                                    </div>
                                </div>


                                {/*  <CxcPanelDetalle ventaId={idVenta} />*/}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Trazabilidad */}
            {openTraz && <VentaTrazabilidad idVenta={idVenta} onClose={() => setOpenTraz(false)} />}
        </div>
    );
}
