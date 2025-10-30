import { useEffect, useRef, useState } from "react";
import { impuestosService } from "@/servicios/impuestos";
import type { Page } from "@/types/pagination";

// ---- Tipo que exportamos para usar en VentaNueva.tsx ----
export type ImpuestoLite = {
    id: number;
    nombre: string;
    porcentaje: number;
    estadoActivo?: boolean;
};

type Props = {
    onClose: () => void;
    onPick: (i: ImpuestoLite) => void;
};

function toImpuestoLite(r: any): ImpuestoLite {
    // Mapeo tolerante a distintos nombres de campos del backend
    const id =
        r?.idImpuesto ?? r?.id ?? r?.impuestoId ?? 0;
    const nombre =
        r?.nombreImpuesto ?? r?.nombre ?? "";
    const porcentaje =
        Number(r?.porcentaje ?? 0);
    const estadoActivo =
        r?.estadoActivo ?? r?.activo ?? true;
    return { id: Number(id), nombre: String(nombre), porcentaje, estadoActivo };
}

export function ImpuestoPickerDialog({ onClose, onPick }: Props) {
    // 🔒 Igual que el ClientePickerDialog: no cerramos por click afuera ni overlay
    const panelRef = useRef<HTMLDivElement | null>(null);

    // Filtros / estado
    const [q, setQ] = useState("");
    const [soloActivos, setSoloActivos] = useState<boolean>(false);
    const [page, setPage] = useState(0);
    const [size] = useState(10);

    // Datos
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ImpuestoLite[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Cargar lista
    useEffect(() => {
        let cancel = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const r: Page<any> = await impuestosService.listar({
                    q,
                    soloActivos,
                    page,
                    size,
                });
                if (cancel) return;
                const list = (r?.content ?? []).map(toImpuestoLite);
                setRows(list);
                setTotalPages(r?.totalPages ?? 0);
            } catch (e: any) {
                if (!cancel) setError(e?.message ?? "No se pudo cargar impuestos");
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => {
            cancel = true;
        };
    }, [q, soloActivos, page, size]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            // ⛔ Evita cierre accidental por clicks en overlay
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Overlay (no cierra al click) */}
            <div
                className="absolute inset-0 bg-black/40"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            />
            <div
                ref={panelRef}
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl p-4"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold">Seleccionar impuesto</h4>
                    <button className="px-2 py-1 text-sm border rounded" onClick={onClose}>
                        Cerrar
                    </button>
                </div>

                {/* Filtros */}
                <div className="mb-3 flex flex-wrap gap-2">
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(0);
                        }}
                        placeholder="Buscar por nombre…"
                        className="border rounded px-3 py-2 w-full sm:flex-1"
                    />
                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                            type="checkbox"
                            className="accent-emerald-600"
                            checked={soloActivos}
                            onChange={(e) => {
                                setSoloActivos(e.target.checked);
                                setPage(0);
                            }}
                        />
                        Solo activos
                    </label>
                </div>

                {/* Tabla */}
                <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50">
                        <tr>
                            <th className="text-left p-2">Nombre</th>
                            <th className="text-left p-2">Porcentaje</th>
                            <th className="text-left p-2">Estado</th>
                            <th className="p-2 w-28"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-3 text-center text-neutral-500">Cargando…</td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={4} className="p-3 text-center text-rose-600">{error}</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-3 text-center text-neutral-500">Sin resultados</td>
                            </tr>
                        ) : (
                            rows.map((i) => (
                                <tr key={`${i.id}-${i.nombre}`} className="border-t">
                                    <td className="p-2">{i.nombre}</td>
                                    <td className="p-2">{i.porcentaje.toFixed(2)}%</td>
                                    <td className="p-2">
                                        {i.estadoActivo ? (
                                            <span className="text-emerald-700 text-xs font-medium bg-emerald-50 px-2 py-1 rounded">
                          Activo
                        </span>
                                        ) : (
                                            <span className="text-neutral-600 text-xs font-medium bg-neutral-100 px-2 py-1 rounded">
                          Inactivo
                        </span>
                                        )}
                                    </td>
                                    <td className="p-2 text-right">
                                        <button
                                            className="px-2 py-1 text-sm border rounded hover:bg-emerald-50"
                                            onClick={() => onPick(i)}
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
