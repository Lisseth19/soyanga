import { useEffect, useMemo, useState } from "react";
import { almacenService, type PresentacionEnAlmacenDTO } from "@/servicios/almacen";

/* === helpers === */
const fmtNum = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { maximumFractionDigits: 3 }).format(n ?? 0);
const fmtMoney = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

type Props = {
    idAlmacen: number | null;
    abierto: boolean;
    onClose: () => void;
    onPick: (p: PresentacionEnAlmacenDTO) => void;
};

export default function PresenPorAlmacen({ idAlmacen, abierto, onClose, onPick }: Props) {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [rows, setRows] = useState<PresentacionEnAlmacenDTO[]>([]);
    const [totalPages, setTotalPages] = useState(1);

    const titulo = useMemo(() => {
        return `Seleccionar Productos${idAlmacen ? ` (Almacén #${idAlmacen})` : ""}`;
    }, [idAlmacen]);

    async function load(wanted = page) {
        if (!idAlmacen) return;
        setLoading(true);
        setErr(null);
        try {
            const r = await almacenService.listarPresentaciones(idAlmacen, {
                q: q || undefined,
                soloConStock: false,          // ← mostrar con y sin stock
                page: wanted,
                size,
                sort: "producto,asc",
            });
            setRows(r.content ?? []);
            setTotalPages(r.totalPages ?? 1);
            setPage(r.number ?? wanted);
        } catch (e: any) {
            setErr(e?.response?.data?.message || e?.message || "No se pudo cargar productos.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (abierto) {
            setPage(0);
            load(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto, idAlmacen, q, size]);

    if (!abierto) return null;

    return (
        <div className="fixed inset-0 z-[1000]">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="absolute inset-0 p-4 sm:p-6 flex items-start justify-center overflow-auto">
                <div className="bg-white text-neutral-800 rounded-xl shadow-2xl w-full max-w-5xl border border-neutral-200">
                    {/* Header */}
                    <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
                        <h3 className="text-[22px] font-bold tracking-[-0.015em]">{titulo}</h3>
                        <button
                            className="h-8 px-3 rounded-md border border-neutral-300 hover:bg-neutral-50 text-sm"
                            onClick={onClose}
                            title="Cerrar"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Buscador */}
                    <div className="p-5 pt-4">
                        <label className="block text-sm font-medium text-neutral-900 mb-2">Buscar producto</label>
                        <div className="flex w-full items-stretch rounded-lg h-11">
                            <div className="flex items-center justify-center pl-4 rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-100 text-neutral-500">
                                🔍
                            </div>
                            <input
                                className="flex-1 h-full rounded-r-lg border border-neutral-300 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Buscar por nombre o SKU"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>
                        {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}
                    </div>

                    {/* Tabla */}
                    <div className="px-5 pb-5 max-h-[55vh] overflow-auto">
                        {(!idAlmacen) ? (
                            <div className="text-sm text-neutral-600">Selecciona un almacén primero.</div>
                        ) : loading ? (
                            <div className="text-sm">Cargando…</div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-neutral-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-neutral-50 text-neutral-700 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Nombre</th>
                                        <th className="px-4 py-2 text-left font-medium">SKU</th>
                                        <th className="px-4 py-2 text-center font-medium">Stock</th>
                                        <th className="px-4 py-2 text-center font-medium">Reservado</th>
                                        <th className="px-4 py-2 text-right font-medium">Precio</th>
                                        <th className="px-4 py-2 text-center font-medium">Acción</th>
                                    </tr>
                                    </thead>
                                    <tbody className="text-neutral-800">
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-4 text-center text-neutral-500">
                                                Sin resultados
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((p) => {
                                            const sinStock = (p.stockDisponible ?? 0) <= 0;
                                            return (
                                                <tr
                                                    key={p.idPresentacion}
                                                    className={`border-t border-neutral-200 ${
                                                        sinStock ? "bg-rose-50" : "bg-white hover:bg-neutral-50"
                                                    }`}
                                                >
                                                    <td className="px-4 py-2 align-middle">
                                                        <div className="font-medium">{p.producto}</div>
                                                        <div className="text-xs text-neutral-500">
                                                            {p.presentacion ?? "Presentación"}{p.unidad ? ` · ${p.unidad}` : ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 align-middle">{p.sku ?? "—"}</td>
                                                    <td className="px-4 py-2 text-center align-middle">{fmtNum(p.stockDisponible)}</td>
                                                    <td className="px-4 py-2 text-center align-middle">
                                                        {typeof p.reservado === "number" ? fmtNum(p.reservado) : "—"}
                                                    </td>
                                                    <td className="px-4 py-2 text-right align-middle">
                                                        {typeof p.precioBob === "number" ? `${fmtMoney(p.precioBob)} BOB` : "—"}
                                                    </td>
                                                    <td className="px-4 py-2 text-center align-middle">
                                                        {!sinStock ? (
                                                            <button
                                                                className="inline-flex h-8 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium"
                                                                onClick={() => onPick(p)}
                                                            >
                                                                Agregar
                                                            </button>
                                                        ) : (
                                                            <span className="text-neutral-400 text-xs">Sin stock</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Paginación */}
                        <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                                    disabled={page <= 0 || loading}
                                    onClick={() => load(page - 1)}
                                >
                                    ← Anterior
                                </button>
                                <div className="text-xs text-neutral-600">
                                    Página {page + 1} / {totalPages}
                                </div>
                                <button
                                    className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                                    disabled={page >= totalPages - 1 || loading}
                                    onClick={() => load(page + 1)}
                                >
                                    Siguiente →
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-600">Filas:</span>
                                <select
                                    className="border rounded px-2 py-1 text-sm"
                                    value={size}
                                    onChange={(e) => setSize(Number(e.target.value))}
                                >
                                    {[10, 20, 50].map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
