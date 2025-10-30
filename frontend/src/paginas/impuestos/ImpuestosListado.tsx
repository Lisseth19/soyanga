// src/paginas/impuestos/ImpuestosListado.tsx
import { useEffect, useMemo, useState } from "react";
import { impuestosService } from "@/servicios/impuestos";
import type { Impuesto, Page } from "@/types/impuestos";
import ImpuestoCrearForm from "./ImpuestoCrearForm";

function EstadoChip({ activo }: { activo: boolean }) {
    return (
        <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
                activo ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-700"
            }`}
        >
      {activo ? "Activo" : "Inactivo"}
    </span>
    );
}

export default function ImpuestosListado() {
    // filtros
    const [q, setQ] = useState("");
    const [soloActivos, setSoloActivos] = useState(false);

    // paginación
    const [page, setPage] = useState(0);
    const [size] = useState(20);

    // data/estado
    const [data, setData] = useState<Page<Impuesto> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // dentro de ImpuestosListado.tsx
    //const [showCrear, setShowCrear] = useState(false);
    const [editItem, setEditItem] = useState<Impuesto | null>(null);

    // modal crear
    const [showCrear, setShowCrear] = useState(false);

    async function fetchData() {
        try {
            setLoading(true);
            setErr(null);
            const res = await impuestosService.listar({ q, soloActivos, page, size });
            setData(res);
        } catch (e: any) {
            setErr(e?.message ?? "Error interno al listar impuestos");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, soloActivos, page, size]);

    const filas = useMemo(() => {
        const all = data?.content ?? [];
        const query = q.trim().toLowerCase();
        if (!query) return all;
        return all.filter(r => String(r.nombreImpuesto ?? "").toLowerCase().includes(query));
    }, [data, q]);

    async function onToggleActivo(it: Impuesto) {
        try {
            if (it.estadoActivo) await impuestosService.desactivar(it.idImpuesto);
            else await impuestosService.activar(it.idImpuesto);
            await fetchData();
        } catch (e: any) {
            alert(e?.message ?? "No se pudo cambiar el estado");
        }
    }

    async function onDelete(it: Impuesto) {
        if (!confirm(`¿Eliminar impuesto "${it.nombreImpuesto}"?`)) return;
        try {
            await impuestosService.eliminar(it.idImpuesto);
            if (filas.length === 1 && page > 0) setPage(p => Math.max(0, p - 1));
            else await fetchData();
        } catch (e: any) {
            alert(e?.message ?? "No se pudo eliminar");
        }
    }



    return (
        <div className="p-4 space-y-4">
            {/* Header + CTA */}
            <div className="flex flex-wrap items-end gap-2">
                <div className="text-xl font-semibold flex-1 min-w-[200px]">Impuestos</div>
                <button
                    onClick={() => setShowCrear(true)}
                    className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center"
                >
                    + Nuevo Impuesto
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-xs mb-1">Buscar por nombre</label>
                    <div className="relative">
                        <input
                            className="w-full border rounded-lg px-3 py-2 pr-10"
                            placeholder="Ej. IVA"
                            value={q}
                            onChange={e => {
                                setQ(e.target.value);
                                setPage(0);
                            }}
                        />
                        <svg
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>

                <label className="inline-flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={soloActivos}
                        onChange={e => {
                            setSoloActivos(e.target.checked);
                            setPage(0);
                        }}
                    />
                    <span>Solo activos</span>
                </label>

                <div className="ml-auto">
                    <button className="border rounded-lg px-3 py-2" onClick={fetchData}>
                        Refrescar
                    </button>
                </div>
            </div>

            {err && <div className="text-red-600 text-sm">{err}</div>}
            {loading && <div>Cargando…</div>}

            {/* Tabla */}
            <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">%</th>
                        <th className="p-2 text-left">Estado</th>
                        <th className="p-2 text-right">Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filas.map(it => (
                        <tr key={it.idImpuesto} className="border-t">
                            <td className="p-2">{it.nombreImpuesto}</td>
                            <td className="p-2">{it.porcentaje}</td>
                            <td className="p-2">
                                <EstadoChip activo={it.estadoActivo} />
                            </td>
                            <td className="p-2">
                                <div className="flex items-center gap-2 justify-end">
                                    <button
                                        onClick={() => setEditItem(it)}
                                        className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50"
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => onToggleActivo(it)}
                                        className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50"
                                        title={it.estadoActivo ? "Desactivar" : "Activar"}
                                    >
                                        🔄
                                    </button>
                                    <button
                                        onClick={() => onDelete(it)}
                                        className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50"
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}

                    {(!filas || filas.length === 0) && !loading && (
                        <tr>
                            <td colSpan={4} className="p-4 text-center text-neutral-500">
                                No hay resultados.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-end gap-2">
                <button
                    disabled={page <= 0}
                    onClick={() => setPage(p => p - 1)}
                    className="border px-2 py-1 rounded"
                >
                    Anterior
                </button>
                <span className="text-xs">Página {page + 1} / {data?.totalPages ?? 1}</span>
                <button
                    disabled={!!data && page >= ((data.totalPages || 1) - 1)}
                    onClick={() => setPage(p => p + 1)}
                    className="border px-2 py-1 rounded"
                >
                    Siguiente
                </button>
            </div>

            {/* Modal: crear */}
            {showCrear && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <ImpuestoCrearForm
                        onCancel={() => setShowCrear(false)}
                        onCreated={() => {
                            setShowCrear(false);
                            fetchData();
                        }}
                    />
                </div>
            )}


            {/* Modal: editar */}
            {editItem && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <ImpuestoCrearForm
                        impuesto={editItem}
                        onCancel={() => setEditItem(null)}
                        onUpdated={() => {
                            setEditItem(null);
                            fetchData();
                        }}
                    />
                </div>
            )}

        </div>
    );
}
