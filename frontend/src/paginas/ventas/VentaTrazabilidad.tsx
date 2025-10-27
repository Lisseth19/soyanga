// src/paginas/ventas/VentaTrazabilidad.tsx
import { useEffect, useMemo, useState } from "react";
import { ventasService } from "@/servicios/ventas";
import type { VentaTrazabilidadDTO } from "@/types/ventas";
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

export default function VentaTrazabilidad({
                                              idVenta,
                                              onClose,
                                          }: {
    idVenta: number;
    onClose: () => void;
}) {
    const [data, setData] = useState<VentaTrazabilidadDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // mapa de almacenes id -> nombre
    const [almacenes, setAlmacenes] = useState<Record<number, string>>({});

    useEffect(() => {
        // cargar trazabilidad
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const r = await ventasService.trazabilidad(idVenta);
                setData(r);
            } catch (e: any) {
                setErr(e?.message ?? "No se pudo cargar la trazabilidad");
            } finally {
                setLoading(false);
            }
        })();

        // cargar nombres de almacenes para mostrar en movimientos
        (async () => {
            try {
                const opts: OpcionIdNombre[] = await almacenService.options();
                const map: Record<number, string> = {};
                for (const a of opts) map[a.id] = a.nombre;
                setAlmacenes(map);
            } catch {
                setAlmacenes({});
            }
        })();
    }, [idVenta]);

    // Nombre de almacén por id
    function almacNombre(id?: number | null) {
        if (!id && id !== 0) return "-";
        return almacenes[id] ?? `#${id}`;
    }

    // Mapa idLote -> numeroLote (armado desde los detalles)
    const loteNombreById = useMemo(() => {
        const map = new Map<number, string>();
        for (const d of data?.detalles ?? []) {
            for (const l of d.lotes ?? []) {
                if (typeof l.idLote === "number" && l.numeroLote) {
                    map.set(l.idLote, l.numeroLote);
                }
            }
        }
        return map;
    }, [data]);

    // Totales: sumar interés (si hay CxC)
    const netos = useMemo(() => {
        const netoSinInteres = Number(data?.totalNetoBob ?? 0);
        const cxcPend = Number(data?.cxcPendienteBob ?? 0);
        const interesMonto = Math.max(0, cxcPend - netoSinInteres);
        const netoConInteres = netoSinInteres + interesMonto;
        return { netoSinInteres, interesMonto, netoConInteres };
    }, [data]);

    // posible nombre de quien atendió (si backend lo agrega)
    const atendidoPor: string =
        (data as any)?.usuarioCreadorNombre ??
        (data as any)?.creadoPorNombre ??
        "-";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">Trazabilidad · Venta #{idVenta}</h3>
                    <button
                        className="px-3 py-1 border rounded text-sm hover:bg-neutral-50"
                        onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                            ev.preventDefault();
                            onClose();
                        }}
                    >
                        Cerrar
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {loading && <div className="text-neutral-500">Cargando…</div>}
                    {err && <div className="text-rose-600">{err}</div>}

                    {data && (
                        <>
                            {/* Información general (limpia) */}
                            <div className="rounded-xl border p-4">
                                <h4 className="font-semibold mb-3">Información general</h4>

                                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3 text-sm">
                                    <div>
                                        <dt className="text-neutral-500">Fecha</dt>
                                        <dd className="font-medium">{fmtFecha(data.fechaVenta)}</dd>
                                    </div>

                                    <div>
                                        <dt className="text-neutral-500">Cliente</dt>
                                        <dd className="font-medium">{data.cliente ?? "(sin cliente)"}</dd>
                                    </div>

                                    <div>
                                        <dt className="text-neutral-500">Total (bruto)</dt>
                                        <dd className="font-medium">{money(data.totalBrutoBob)}</dd>
                                    </div>

                                    <div>
                                        <dt className="text-neutral-500">Total (neto)</dt>
                                        {/* neto incluye interés si existe */}
                                        <dd className="font-medium">{money(netos.netoConInteres)}</dd>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <dt className="text-neutral-500">Atendido por</dt>
                                        <dd className="font-medium">{atendidoPor}</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Detalles con lotes */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-neutral-50 text-sm text-neutral-600">
                                    Detalles
                                </div>
                                <div className="overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-neutral-50 text-neutral-600">
                                        <tr>
                                            <th className="text-left p-2">SKU</th>
                                            <th className="text-left p-2">Producto</th>
                                            <th className="text-right p-2">Cantidad</th>
                                            <th className="text-right p-2">P. Unidad.</th>
                                            <th className="text-left p-2">Lotes</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {data.detalles.map((d, i: number) => (
                                            <tr key={d.idVentaDetalle ?? i} className="border-t">
                                                <td className="p-2">{d.sku}</td>
                                                <td className="p-2">{d.producto}</td>
                                                <td className="p-2 text-right">{d.cantidad}</td>
                                                <td className="p-2 text-right">{money(d.precioUnitarioBob)}</td>
                                                <td className="p-2">
                                                    {d.lotes?.length ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {d.lotes.map((l, j: number) => (
                                                                <span
                                                                    key={`${l.idLote}-${j}`}
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

                            {/* Movimientos de inventario */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-neutral-50 text-sm text-neutral-600">
                                    Movimientos de inventario
                                </div>
                                <div className="overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-neutral-50 text-neutral-600">
                                        <tr>
                                            <th className="text-left p-2">Fecha</th>
                                            <th className="text-left p-2">Tipo</th>
                                            <th className="text-left p-2">Lote</th>
                                            <th className="text-right p-2">Cantidad</th>
                                            <th className="text-left p-2">Almacén Origen</th>
                                            <th className="text-left p-2">Almacén Destino</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {data.movimientos?.length ? (
                                            data.movimientos.map((m, i: number) => (
                                                <tr key={m.idMovimiento ?? i} className="border-t">
                                                    <td className="p-2">{fmtFecha(m.fechaMovimiento)}</td>
                                                    <td className="p-2">{m.tipoMovimiento}</td>
                                                    <td className="p-2">
                                                        {loteNombreById.get(m.idLote) ?? `#${m.idLote}`}
                                                    </td>
                                                    <td className="p-2 text-right">{m.cantidad}</td>
                                                    <td className="p-2">{almacNombre(m.idAlmacenOrigen)}</td>
                                                    <td className="p-2">{almacNombre(m.idAlmacenDestino)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-4 text-center text-neutral-500">
                                                    Sin movimientos
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
