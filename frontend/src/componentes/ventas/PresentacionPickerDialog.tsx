import { useEffect, useRef, useState } from "react";
import { presentacionService } from "@/servicios/presentacion";
import { opcionesProductos } from "@/servicios/producto";
import type { Page } from "@/types/ventas";

// ────────────────────────────────────────────────────────────
// Tipos que expone el Picker (lo que recibe el caller al elegir)
// ────────────────────────────────────────────────────────────
export type PresentacionLite = {
    idPresentacion: number;
    sku: string;
    producto: string;
    imagenUrl?: string | null;
    precioVentaBob?: number | null;
};

// ────────────────────────────────────────────────────────────
// Util: base de assets (misma lógica que usas en PresentacionesPage)
// ────────────────────────────────────────────────────────────
const ASSETS_BASE = import.meta.env.VITE_ASSETS_BASE ?? "";
function assetUrl(path?: string | null) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${ASSETS_BASE}${path}`;
}

export function PresentacionPickerDialog({
                                             onClose,
                                             onPick,
                                         }: {
    onClose: () => void;
    onPick: (p: PresentacionLite) => void;
}) {
    // 🔒 No cerramos por click fuera, igual que ClientePickerDialog
    const panelRef = useRef<HTMLDivElement | null>(null);

    // Filtros / estado
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    const [sort, setSort] = useState("codigoSku,asc");
    const [loading, setLoading] = useState(false);

    // Datos
    const [rows, setRows] = useState<PresentacionLite[]>([]);
    const [totalPages, setTotalPages] = useState(0);

    // Mapa de productos para mostrar nombre a partir de idProducto
    const [mapProdNombre, setMapProdNombre] = useState<Record<number, string>>({});

    // Cargar opciones de productos una vez
    useEffect(() => {
        (async () => {
            try {
                const ops = await opcionesProductos(); // Array<{id, nombre}>
                const m: Record<number, string> = {};
                ops.forEach((o: { id: number; nombre: string }) => (m[o.id] = o.nombre));
                setMapProdNombre(m);
            } catch {
                setMapProdNombre({});
            }
        })();
    }, []);

    // Listar presentaciones con paginación/filtros
    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                setLoading(true);
                const res: Page<any> = await presentacionService.list({
                    q,
                    page,
                    size,
                    sort,
                    soloActivos: true,
                });
                if (cancel) return;

                const content = res?.content ?? [];
                const mapped: PresentacionLite[] = content.map((p: any) => ({
                    idPresentacion: Number(p.idPresentacion),
                    sku: String(p.codigoSku ?? ""),
                    producto:
                        mapProdNombre[p.idProducto as number] ??
                        String(p.idProducto ?? ""),
                    imagenUrl: assetUrl(p.imagenUrl),
                    precioVentaBob:
                        p.precioVentaBob != null ? Number(p.precioVentaBob) : null,
                }));

                setRows(mapped);
                setTotalPages(res?.totalPages ?? 0);
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => {
            cancel = true;
        };
    }, [q, page, size, sort, mapProdNombre]);

    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* overlay (no cierra al click) */}
            <div
                className="absolute inset-0 bg-black/40"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            />
            <div
                ref={panelRef}
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl p-4"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold">Lista de presentaciones / productos</h4>
                    <button className="px-2 py-1 text-sm border rounded" onClick={onClose}>
                        Cerrar
                    </button>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(0);
                        }}
                        placeholder="Buscar por SKU o nombre de producto…"
                        className="border rounded px-3 py-2 w-full sm:flex-1"
                    />
                    <button
                        type="button"
                        className="px-3 py-2 border rounded text-sm hover:bg-neutral-50"
                        onClick={() => {
                            setQ("");
                            setPage(0);
                        }}
                    >
                        Limpiar
                    </button>

                    <select
                        className="border rounded px-2 py-2 w-full sm:w-56"
                        value={sort}
                        onChange={(e) => {
                            setSort(e.target.value);
                            setPage(0);
                        }}
                    >
                        <option value="codigoSku,asc">SKU (A→Z)</option>
                        <option value="codigoSku,desc">SKU (Z→A)</option>
                        <option value="idPresentacion,desc">Más recientes</option>
                        <option value="idPresentacion,asc">Más antiguas</option>
                    </select>
                </div>

                {/* Tabla */}
                <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50">
                        <tr>
                            <th className="text-left p-2">Imagen</th>
                            <th className="text-left p-2">SKU</th>
                            <th className="text-left p-2">Producto</th>
                            <th className="text-right p-2">Precio (BOB)</th>
                            <th className="p-2 w-28"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-3 text-center text-neutral-500">
                                    Cargando…
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-3 text-center text-neutral-500">
                                    Sin resultados
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r.idPresentacion} className="border-t">
                                    <td className="p-2">
                                        {r.imagenUrl ? (
                                            <img
                                                src={r.imagenUrl}
                                                alt={r.producto}
                                                className="w-12 h-12 object-cover rounded border"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded border border-dashed border-neutral-300 grid place-items-center text-[10px] text-neutral-400">
                                                Sin img
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2">{r.sku}</td>
                                    <td className="p-2">{r.producto}</td>
                                    <td className="p-2 text-right">
                                        {r.precioVentaBob != null ? r.precioVentaBob.toFixed(2) : "-"}
                                    </td>
                                    <td className="p-2 text-right">
                                        <button
                                            className="px-2 py-1 text-sm border rounded hover:bg-emerald-50"
                                            onClick={() => onPick(r)}
                                            title="Seleccionar esta presentación"
                                        >
                                            Elegir
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-neutral-600">
            Página {totalPages === 0 ? 0 : page + 1} de {totalPages}
          </span>
                    <div className="flex gap-2">
                        <button
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page <= 0}
                        >
                            Anterior
                        </button>
                        <button
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                            disabled={page + 1 >= totalPages}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
