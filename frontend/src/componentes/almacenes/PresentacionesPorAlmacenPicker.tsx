import { useEffect, useMemo, useRef, useState } from "react";
import { almacenService, type PresentacionEnAlmacenDTO } from "@/servicios/almacen";
import type { Page } from "@/types/pagination";
import { X, Search } from "lucide-react";

type Props = {
    idAlmacen: number;
    abierto: boolean;
    onClose: () => void;
    onPick: (p: PresentacionEnAlmacenDTO) => void;
    soloConStockDefault?: boolean;
};

const ASSETS_BASE = import.meta.env.VITE_ASSETS_BASE ?? "";

function assetUrl(path?: string | null) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${ASSETS_BASE}${path}`;
}

export default function PresentacionesPorAlmacenPicker({
                                                           idAlmacen,
                                                           abierto,
                                                           onClose,
                                                           onPick,
                                                           soloConStockDefault = true,
                                                       }: Props) {
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("producto,asc"); // "sku,asc" | "sku,desc" | "producto,asc" | "producto,desc" | "precioBob,asc" | "precioBob,desc"
    const [soloConStock, setSoloConStock] = useState(soloConStockDefault);

    const [pageIdx, setPageIdx] = useState(0);
    const [size, setSize] = useState(10);

    const [data, setData] = useState<Page<PresentacionEnAlmacenDTO> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const panelRef = useRef<HTMLDivElement | null>(null);

    // Cerrar con click afuera y ESC
    useEffect(() => {
        if (!abierto) return;
        const onDown = (ev: MouseEvent) => {
            const target = ev.target as Node;
            if (panelRef.current && !panelRef.current.contains(target)) onClose();
        };
        const onEsc = (ev: KeyboardEvent) => {
            if (ev.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onEsc);
        };
    }, [abierto, onClose]);

    const params = useMemo(
        () => ({ idAlmacen, q: q.trim() || undefined, sort, soloConStock, page: pageIdx, size }),
        [idAlmacen, q, sort, soloConStock, pageIdx, size]
    );

    async function load(resetPage = false) {
        if (!abierto) return;
        setLoading(true);
        setErr(null);
        try {
            const res = await almacenService.listarPresentaciones(idAlmacen, {
                q: params.q,
                soloConStock: params.soloConStock,
                page: resetPage ? 0 : params.page,
                size: params.size,
                sort: params.sort,
            });
            setData(res);
            if (resetPage) setPageIdx(0);
        } catch (e: any) {
            setErr(e?.message || "No se pudo cargar la lista.");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    // Carga inicial y cada cambio de filtros/tamaño
    useEffect(() => {
        if (abierto) load(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto, idAlmacen, sort, soloConStock, size]);

    // Cambio de página
    useEffect(() => {
        if (abierto) load(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIdx]);

    const limpiar = () => {
        setQ("");
        setSort("producto,asc");
        setSoloConStock(soloConStockDefault);
        setSize(10);
        setPageIdx(0);
    };

    return (
        <div className={`fixed inset-0 z-[1000] ${abierto ? "" : "pointer-events-none"} `} aria-hidden={!abierto}>
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black/40 transition-opacity ${abierto ? "opacity-100" : "opacity-0"}`} />

            {/* Panel */}
            <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-8">
                <div
                    ref={panelRef}
                    className={`w-full max-w-5xl bg-white rounded-xl shadow-2xl border transition-transform ${
                        abierto ? "translate-y-0" : "translate-y-4"
                    }`}
                >
                    {/* Header */}
                    <div className="p-3 sm:p-4 border-b flex items-center justify-between gap-3">
                        <h3 className="text-base sm:text-lg font-semibold">Lista de presentaciones / productos</h3>
                        <button
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border hover:bg-neutral-50"
                            onClick={onClose}
                            title="Cerrar"
                        >
                            <X size={16} /> Cerrar
                        </button>
                    </div>

                    {/* Filtros */}
                    <div className="p-3 sm:p-4 border-b">
                        <div className="flex flex-col md:flex-row gap-2 items-stretch">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && load(true)}
                                    placeholder="Buscar por SKU o nombre de producto..."
                                    className="h-10 w-full pl-9 pr-3 rounded border"
                                />
                            </div>

                            <button
                                className="h-10 px-3 rounded border bg-neutral-50 hover:bg-neutral-100"
                                onClick={() => load(true)}
                                disabled={loading}
                            >
                                Buscar
                            </button>

                            <button className="h-10 px-3 rounded border" onClick={limpiar} disabled={loading}>
                                Limpiar
                            </button>

                            <select className="h-10 px-2 rounded border w-full md:w-48" value={sort} onChange={(e) => setSort(e.target.value)}>
                                <option value="sku,asc">SKU (A→Z)</option>
                                <option value="sku,desc">SKU (Z→A)</option>
                                <option value="producto,asc">Producto (A→Z)</option>
                                <option value="producto,desc">Producto (Z→A)</option>
                                <option value="precioBob,asc">Precio (↑)</option>
                                <option value="precioBob,desc">Precio (↓)</option>
                            </select>

                            <label className="h-10 px-3 inline-flex items-center gap-2 rounded border">
                                <input
                                    type="checkbox"
                                    checked={soloConStock}
                                    onChange={(e) => setSoloConStock(e.target.checked)}
                                    className="accent-emerald-600"
                                />
                                Solo con stock
                            </label>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="p-3 sm:p-4">
                        {err && <div className="text-red-600 mb-2">{err}</div>}
                        {loading && <div className="mb-2">Cargando…</div>}

                        <div className="overflow-auto rounded border">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-neutral-600">
                                <tr>
                                    <th className="p-2 text-left w-[76px]">Imagen</th>
                                    <th className="p-2 text-left w-[140px]">SKU</th>
                                    <th className="p-2 text-left">Producto</th>
                                    <th className="p-2 text-right w-[140px]">Precio (BOB)</th>
                                    <th className="p-2 text-right w-[110px]">Acción</th>
                                </tr>
                                </thead>
                                <tbody>
                                {(data?.content ?? []).map((it) => (
                                    <tr key={it.idPresentacion} className="border-t">
                                        <td className="p-2">
                                            {it.imagenUrl ? (
                                                <img src={assetUrl(it.imagenUrl)} alt={it.sku ?? ""} className="w-12 h-12 object-cover rounded border" />
                                            ) : (
                                                <div className="w-12 h-12 rounded border border-dashed flex items-center justify-center text-[10px] text-neutral-400">
                                                    Sin img
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-2 font-medium">{it.sku ?? "—"}</td>
                                        <td className="p-2">{it.producto}</td>
                                        <td className="p-2 text-right">
                                            {typeof it.precioBob === "number"
                                                ? new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(it.precioBob)
                                                : "—"}
                                        </td>
                                        <td className="p-2 text-right">
                                            <button
                                                className="px-3 py-1.5 rounded border hover:bg-neutral-50"
                                                onClick={() => {
                                                    onPick(it);
                                                    onClose();
                                                }}
                                            >
                                                Elegir
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {(!data?.content || data.content.length === 0) && !loading && (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-neutral-500">
                                            Sin resultados
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        <div className="mt-3 flex items-center gap-2 justify-between">
                            <div className="text-sm">Página {(data as any)?.number + 1 || pageIdx + 1} de {(data as any)?.totalPages || 1}</div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="border rounded px-3 py-1"
                                    onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                                    disabled={!data || pageIdx <= 0 || loading}
                                >
                                    Anterior
                                </button>
                                <button
                                    className="border rounded px-3 py-1"
                                    onClick={() => setPageIdx((p) => p + 1)}
                                    disabled={!data || loading || ((data as any)?.last ?? pageIdx >= ((data as any)?.totalPages || 1) - 1)}
                                >
                                    Siguiente
                                </button>

                                <select className="border rounded px-2 py-1" value={size} onChange={(e) => setSize(Number(e.target.value))} disabled={loading}>
                                    {[10, 20, 50].map((n) => (
                                        <option key={n} value={n}>
                                            {n} por página
                                        </option>
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
