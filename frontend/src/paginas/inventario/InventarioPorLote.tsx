// src/paginas/inventario/InventarioPorLote.tsx
import { useEffect, useMemo, useState } from "react";
import { useInventarioPorLote } from "@/hooks/useInventarioPorLote";
import { getMovimientosDeLote, type MovimientoDeInventario } from "@/servicios/inventario";
import { MovimientosModal } from "@/componentes/MovimientosModal";
import { Filtros } from "@/componentes/Filtros";
import { almacenService, type OpcionIdNombre } from "@/servicios/almacen";

function num(n?: number) {
    return (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtDate(iso?: string) {
    if (!iso) return "-";
    const only = (iso.includes("T") ? iso.split("T")[0] : iso) || iso;
    const [y, m, d] = only.split("-");
    return y && m && d ? `${d}/${m}/${y}` : iso;
}
function daysUntil(dateStr?: string) {
    if (!dateStr) return undefined;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    const a = Date.UTC(y, m - 1, d);
    const today = new Date();
    const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.floor((a - b) / 86400000);
}
function VenceBadge({ fecha }: { fecha?: string }) {
    const d = daysUntil(fecha);
    const label = fecha ? fmtDate(fecha) : "-";
    if (d === undefined) return <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{label}</span>;
    if (d < 0) return <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">Vencido · {label}</span>;
    if (d <= 30) return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">{label} · {d}d</span>;
    if (d <= 90) return <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{label} · {d}d</span>;
    return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">{label} · {d}d</span>;
}

export default function InventarioPorLotePage() {
    const { data, loading, error, query, setFilters, setPage, setSize } = useInventarioPorLote();

    // ====== Estado local de filtros (controlados) ======
    const [almacenId, setAlmacenId] = useState<number | undefined>(query.idAlmacen);
    const [productoInput, setProductoInput] = useState<string>(query.q ?? "");
    const [venceAntes, setVenceAntes] = useState<string>(query.venceAntes ?? "");

    // opciones de almacenes
    const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);
    const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);
    useEffect(() => {
        setLoadingAlmacenes(true);
        almacenService
            .options()
            .then(setAlmacenes)
            .finally(() => setLoadingAlmacenes(false));
    }, []);

    // ====== AUTO-APPLY ======
    // 1) Almacén y Fecha -> aplica INMEDIATO
    useEffect(() => {
        setPage(0);
        setFilters({
            idAlmacen: almacenId,
            q: productoInput || undefined,
            venceAntes: venceAntes || undefined,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [almacenId, venceAntes]);

    // 2) Producto/SKU -> aplica con debounce
    useEffect(() => {
        const h = setTimeout(() => {
            setPage(0);
            setFilters({
                idAlmacen: almacenId,
                q: productoInput || undefined,
                venceAntes: venceAntes || undefined,
            });
        }, 350);
        return () => clearTimeout(h);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productoInput]);

    // Reset
    const onReset = () => {
        setAlmacenId(undefined);
        setProductoInput("");
        setVenceAntes("");
        setPage(0);
        setFilters({ idAlmacen: undefined, q: undefined, venceAntes: undefined });
    };

    // Totales de la página y export
    const { totalDisp, totalRes, totalPages, currentPage } = useMemo(() => {
        const rows = data?.content ?? [];
        const disp = rows.reduce((acc, r) => acc + (r.disponible ?? 0), 0);
        const resv = rows.reduce((acc, r) => acc + (r.reservado ?? 0), 0);
        const size = query.size ?? 20;
        const total = Math.max(1, Math.ceil((data?.totalElements ?? 0) / size));
        const cur = (query.page ?? 0) + 1;
        return { totalDisp: disp, totalRes: resv, totalPages: total, currentPage: cur };
    }, [data?.content, data?.totalElements, query.size, query.page]);

    const dataForExport = useMemo(
        () =>
            (data?.content ?? []).map((r) => ({
                SKU: r.sku,
                Producto: r.nombreProducto,
                Lote: r.codigoLote,
                Almacén: r.nombreAlmacen,
                Vence: fmtDate(r.fechaVencimiento),
                Disponible: r.disponible,
                Reservado: r.reservado,
            })),
        [data?.content]
    );

    // ====== Modal de movimientos ======
    const [movOpen, setMovOpen] = useState(false);
    const [movLoading, setMovLoading] = useState(false);
    const [movError, setMovError] = useState<string | null>(null);
    const [movItems, setMovItems] = useState<MovimientoDeInventario[]>([]);
    const [movTitulo, setMovTitulo] = useState<string>("");

    const abrirMovimientos = async (row: {
        idLote: number;
        idAlmacen: number;
        sku: string;
        codigoLote: string;
        nombreProducto: string;
    }) => {
        setMovOpen(true);
        setMovLoading(true);
        setMovError(null);
        setMovItems([]);
        setMovTitulo(`${row.nombreProducto} • ${row.sku} • Lote ${row.codigoLote}`);
        try {
            const items = await getMovimientosDeLote(row.idLote, { idAlmacen: row.idAlmacen, limit: 100 });
            setMovItems(items);
        } catch (e: any) {
            const status = e?.status ?? e?.response?.status;
            setMovError(
                status === 404 ? "Este backend aún no expone movimientos para lotes (404)." : e?.message ?? "Error al cargar movimientos."
            );
        } finally {
            setMovLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-5">
            {/* Header con stats */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Inventario por lote</h1>
                    <p className="text-sm text-gray-500">Consulta por almacén, producto/SKU y vencimiento.</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl ring-1 ring-neutral-200 bg-white p-3 text-center">
                        <div className="text-xs text-gray-500">Página</div>
                        <div className="text-lg font-semibold">
                            {currentPage} / {totalPages}
                        </div>
                    </div>
                    <div className="rounded-2xl ring-1 ring-neutral-200 bg-white p-3 text-center">
                        <div className="text-xs text-gray-500">Disponible (pág.)</div>
                        <div className="text-lg font-semibold text-emerald-700">{num(totalDisp)}</div>
                    </div>
                    <div className="rounded-2xl ring-1 ring-neutral-200 bg-white p-3 text-center">
                        <div className="text-xs text-gray-500">Reservado (pág.)</div>
                        <div className="text-lg font-semibold text-amber-700">{num(totalRes)}</div>
                    </div>
                </div>
            </div>

            {/* Filtros (auto-apply) */}
            <div className="rounded-2xl ring-1 ring-neutral-200 p-3 sm:p-4 bg-white">
                <Filtros
                    almacenId={almacenId}
                    setAlmacenId={setAlmacenId}
                    productoInput={productoInput}
                    setProductoInput={setProductoInput}
                    venceAntes={venceAntes}
                    setVenceAntes={setVenceAntes}
                    loadingAlmacenes={loadingAlmacenes}
                    almacenes={almacenes}
                    dataForExport={dataForExport}
                    onReset={onReset}
                    size={query.size ?? 20}
                    setSize={setSize}
                    setPage={setPage}
                />
            </div>

            {/* Tabla */}
            <div className="rounded-2xl ring-1 ring-neutral-200 overflow-hidden bg-white">
                <div className="max-h-[65vh] overflow-auto no-scrollbar">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-neutral-50/95 backdrop-blur z-10">
                        <tr className="text-left text-neutral-700">
                            <th className="p-3">SKU</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3">Lote</th>
                            <th className="p-3">Almacén</th>
                            <th className="p-3">Vence</th>
                            <th className="p-3 text-right">Disp.</th>
                            <th className="p-3 text-right">Res.</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={`sk-${i}`}>
                                    <td className="p-3"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded" /></td>
                                    <td className="p-3"><div className="h-3 w-40 bg-gray-200 animate-pulse rounded" /></td>
                                    <td className="p-3"><div className="h-3 w-20 bg-gray-200 animate-pulse rounded" /></td>
                                    <td className="p-3"><div className="h-3 w-28 bg-gray-200 animate-pulse rounded" /></td>
                                    <td className="p-3"><div className="h-6 w-28 bg-gray-200 animate-pulse rounded" /></td>
                                    <td className="p-3 text-right"><div className="h-3 w-12 bg-gray-200 animate-pulse rounded ml-auto" /></td>
                                    <td className="p-3 text-right"><div className="h-3 w-12 bg-gray-200 animate-pulse rounded ml-auto" /></td>
                                    <td className="p-3 text-right"><div className="h-8 w-28 bg-gray-200 animate-pulse rounded ml-auto" /></td>
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td className="p-6 text-red-600" colSpan={8}>
                                    Error al cargar
                                </td>
                            </tr>
                        ) : (data?.content ?? []).length === 0 ? (
                            <tr>
                                <td className="p-10 text-center text-gray-500" colSpan={8}>
                                    <div className="text-2xl mb-2">🗂️</div>
                                    No hay resultados con los filtros actuales.
                                </td>
                            </tr>
                        ) : (
                            data!.content.map((r, idx) => {
                                const rowKey = [r.idLote, r.idAlmacen, r.sku, r.codigoLote, idx].join("|");
                                return (
                                    <tr key={rowKey} className="hover:bg-gray-50/60">
                                        <td className="p-3 font-medium">{r.sku}</td>
                                        <td className="p-3">
                                            <div className="font-medium">{r.nombreProducto}</div>
                                            <div className="text-xs text-gray-500">Pres.: {r.idPresentacion ?? "—"}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded-full bg-gray-100">{r.codigoLote}</span>
                                        </td>
                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{r.nombreAlmacen}</span>
                                        </td>
                                        <td className="p-3">
                                            <VenceBadge fecha={r.fechaVencimiento} />
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="font-semibold text-emerald-700">{num(r.disponible)}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="font-semibold text-amber-700">{num(r.reservado)}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-gray-50"
                                                onClick={() =>
                                                    abrirMovimientos({
                                                        idLote: r.idLote,
                                                        idAlmacen: r.idAlmacen,
                                                        sku: r.sku,
                                                        codigoLote: r.codigoLote,
                                                        nombreProducto: r.nombreProducto,
                                                    })
                                                }
                                                title="Ver movimientos del lote"
                                            >
                                                📄 <span>Movimientos</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Footer paginación */}
                <div className="flex items-center gap-2 p-3 border-t border-neutral-200 bg-neutral-50">
                    <button
                        className="border border-neutral-300 rounded-lg px-3 py-1.5 disabled:opacity-50"
                        disabled={(query.page ?? 0) <= 0}
                        onClick={() => setPage((query.page ?? 0) - 1)}
                    >
                        ← Anterior
                    </button>
                    <span className="text-sm">
            Página {(query.page ?? 0) + 1} de {totalPages}
          </span>
                    <button
                        className="border border-neutral-300 rounded-lg px-3 py-1.5 disabled:opacity-50"
                        disabled={((query.page ?? 0) + 1) * (query.size ?? 20) >= (data?.totalElements ?? 0)}
                        onClick={() => setPage((query.page ?? 0) + 1)}
                    >
                        Siguiente →
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm text-gray-500">Filas por página</span>
                        <select
                            className="border border-neutral-300 rounded-lg px-2 py-1.5"
                            value={query.size ?? 20}
                            onChange={(e) => setSize(Number(e.target.value))}
                        >
                            {[10, 20, 50, 100].map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Modal de movimientos */}
            <MovimientosModal
                open={movOpen}
                onClose={() => setMovOpen(false)}
                titulo={movTitulo}
                loading={movLoading}
                error={movError}
                items={movItems}
            />
        </div>
    );

}
