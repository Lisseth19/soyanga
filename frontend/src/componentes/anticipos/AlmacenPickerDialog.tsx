import { useEffect, useMemo, useState } from "react";
import { almacenService } from "@/servicios/almacen";
import { sucursalService } from "@/servicios/sucursal";
import type { Page } from "@/types/pagination";
import type { Almacen } from "@/types/almacen";

type Props = {
    open: boolean;
    onClose: () => void;
    onPick: (a: Almacen) => void;
    /** opcional: iniciar con una búsqueda */
    initialQuery?: string;
};

type SucOpcion = { id: number; nombre: string };

export default function AlmacenPickerDialog({ open, onClose, onPick, initialQuery = "" }: Props) {
    const [q, setQ] = useState(initialQuery);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [page, setPage] = useState<Page<Almacen> | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [sucursales, setSucursales] = useState<SucOpcion[]>([]);

    const sucursalNombre = (id: number) => sucursales.find(s => s.id === id)?.nombre ?? `#${id}`;

    async function fetchSucursales() {
        try {
            const opts = await sucursalService.opciones();
            setSucursales(opts);
        } catch {
            /* silencioso */
        }
    }

    async function fetchList(idx = 0) {
        setLoading(true);
        setErr(null);
        try {
            const p = await almacenService.list({
                q: q.trim() || undefined,
                incluirInactivos: false,
                page: idx,
                size: 8,
                sort: "nombreAlmacen,asc",
            });
            setPage(p);
            setPageIndex(idx);
        } catch (e: any) {
            setErr(e?.message || "No se pudo listar almacenes.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!open) return;
        fetchSucursales();
        fetchList(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const items = useMemo(() => page?.content ?? [], [page]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            {/* dialog */}
            <div className="relative bg-white rounded-xl shadow-xl w-[720px] max-w-[95vw] max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="font-semibold">Seleccionar almacén</div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border text-neutral-700 hover:bg-neutral-50"
                        title="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                        <input
                            className="border rounded px-3 py-2 flex-1"
                            placeholder="Buscar por nombre o ID…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && fetchList(0)}
                        />
                        <button onClick={() => fetchList(0)} className="border rounded px-3 py-2">
                            Buscar
                        </button>
                    </div>

                    {err && <div className="text-red-600 text-sm">{err}</div>}
                    {loading && <div className="text-sm">Cargando…</div>}

                    {!loading && !err && (
                        <>
                            <div className="border rounded overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2 text-left">Almacén</th>
                                        <th className="p-2 text-left">Sucursal</th>
                                        <th className="p-2 text-left">Descripción</th>
                                        <th className="p-2 text-center w-28">Acción</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {items.map((a) => (
                                        <tr key={a.idAlmacen} className="border-t">
                                            <td className="p-2">{a.nombreAlmacen}</td>
                                            <td className="p-2">{sucursalNombre(a.idSucursal)}</td>
                                            <td className="p-2">{a.descripcion || "—"}</td>
                                            <td className="p-2 text-center">
                                                <button
                                                    className="px-2 py-1 border rounded hover:bg-neutral-50"
                                                    onClick={() => onPick(a)}
                                                >
                                                    Elegir
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-3 text-center text-neutral-500">
                                                Sin resultados
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="text-xs text-neutral-500">
                                    Página {pageIndex + 1} / {page?.totalPages ?? 1}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="border rounded px-2 py-1"
                                        onClick={() => fetchList(pageIndex - 1)}
                                        disabled={pageIndex <= 0}
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        className="border rounded px-2 py-1"
                                        onClick={() => fetchList(pageIndex + 1)}
                                        disabled={!page || pageIndex >= (page.totalPages || 1) - 1}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
