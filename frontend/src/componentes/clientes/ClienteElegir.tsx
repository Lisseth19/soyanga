import React, { useEffect, useMemo, useState } from "react";
import { ClienteService } from "@/servicios/cliente";
import type { Cliente } from "@/types/cliente";
import type { Page } from "@/types/pagination";

export interface ClienteElegirProps {
    open: boolean;
    onClose: () => void;
    onSelect: (cliente: Cliente) => void;
}

// === helpers ===
function formatId(n: number) {
    const num = Number.isFinite(n) ? Math.trunc(n) : 0;
    return `C${String(num).padStart(4, "0")}`;
}

export default function ClienteElegir({ open, onClose, onSelect }: ClienteElegirProps) {
    // búsqueda (input inmediato)
    const [q, setQ] = useState("");
    // búsqueda efectiva (debounce)
    const [query, setQuery] = useState("");

    // paginación actual (0-based)
    const [pageIndex, setPageIndex] = useState(0);

    // datos cargados
    const [page, setPage] = useState<Page<Cliente> | null>(null);

    // ui state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ===== debounce search =====
    useEffect(() => {
        const t = setTimeout(() => {
            setQuery(q.trim());
            setPageIndex(0); // cada vez que cambias búsqueda, volvemos a página 0
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    // ===== cargar clientes =====
    async function loadClientes() {
        // si el modal está cerrado no gastes request
        if (!open) return;

        setLoading(true);
        setError(null);
        try {
            const res = await ClienteService.listar({
                q: query || undefined,
                page: pageIndex,
                size: 20,
                sort: "razonSocialONombre,asc",
                soloActivos: true,
            });

            // normalizar limiteCreditoBob a number si viene string
            res.content = (res.content ?? []).map((c) => ({
                ...c,
                limiteCreditoBob:
                    typeof c.limiteCreditoBob === "string"
                        ? Number(c.limiteCreditoBob)
                        : c.limiteCreditoBob,
            }));

            setPage(res);
        } catch (e: any) {
            setError(e?.message ?? "Error al cargar clientes");
            setPage(null);
        } finally {
            setLoading(false);
        }
    }

    // cargar al abrir el modal por primera vez y cuando cambian query/pageIndex
    useEffect(() => {
        loadClientes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, query, pageIndex]);

    // ordenar por id asc como haces en tu página principal
    const rows: Cliente[] = useMemo(() => {
        return page?.content ? [...page.content].sort((a, b) => a.idCliente - b.idCliente) : [];
    }, [page]);

    const currentPage = page?.number ?? pageIndex ?? 0;
    const totalPages = page?.totalPages ?? 1;

    // páginas visibles para la barrita
    const paginasVisibles = useMemo(() => {
        const maxToShow = 5;
        const tp = totalPages;
        const arr = Array.from({ length: tp }, (_, i) => i);

        if (tp <= maxToShow) return arr;

        let start = currentPage - 2;
        let end = currentPage + 2;

        if (start < 0) {
            start = 0;
            end = maxToShow - 1;
        }
        if (end > tp - 1) {
            end = tp - 1;
            start = tp - maxToShow;
        }

        return arr.slice(start, end + 1);
    }, [currentPage, totalPages]);

    // handlers paginación
    function irPagina(n: number) {
        if (n < 0 || n > totalPages - 1) return;
        setPageIndex(n);
    }

    function paginaAnterior() {
        irPagina(currentPage - 1);
    }

    function paginaSiguiente() {
        irPagina(currentPage + 1);
    }

    // si el modal está cerrado, no renderizamos nada
    if (!open) return null;

    // ================= RENDER =================
    return (
        // Fondo semi-transparente que también cierra al hacer click
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            {/* Caja modal. stopPropagation evita que se cierre al hacer click adentro */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative flex h-auto w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl border border-gray-300"
            >
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 md:px-6 md:py-5">
                    <h2 className="text-2xl font-bold text-gray-800">Seleccionar Cliente</h2>

                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                        aria-label="Cerrar"
                    >
                        cerrar
                    </button>
                </div>

                {/* BODY */}
                <div className="flex flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
                    {/* BUSCADOR */}
                    <div className="w-full">
                        <label className="relative flex w-full items-center">
                            {/* ícono "🔍" simple para no depender de fuentes externas */}
                            <span className="absolute left-3 text-gray-400 text-sm pointer-events-none">🔍</span>
                            <input
                                className="w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400
                           py-2.5 pl-9 pr-4 text-sm
                           focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                                placeholder="Buscar por nombre, identificación..."
                                type="text"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </label>
                    </div>

                    {/* TABLA */}
                    <div className="overflow-hidden rounded-md border border-gray-300">
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-fixed border-collapse">
                                {/* ENCABEZADOS */}
                                <thead className="bg-gray-100">
                                <tr className="text-[11px] uppercase font-semibold text-gray-600 tracking-wide">
                                    <Th>Identificación</Th>
                                    <Th>Nombre</Th>
                                    <Th>Teléfono</Th>
                                    <Th>Correo</Th>
                                    <Th>Dirección</Th>
                                    <Th>Acciones</Th>
                                </tr>
                                </thead>

                                {/* CUERPO */}
                                <tbody className="bg-white divide-y divide-gray-200">
                                {/* loading */}
                                {loading && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-8 text-center text-sm text-gray-500"
                                        >
                                            Cargando...
                                        </td>
                                    </tr>
                                )}

                                {/* error */}
                                {!loading && error && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-8 text-center text-sm text-red-500"
                                        >
                                            {error}
                                        </td>
                                    </tr>
                                )}

                                {/* vacío */}
                                {!loading && !error && rows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-8 text-center text-sm text-gray-500"
                                        >
                                            No hay resultados
                                        </td>
                                    </tr>
                                )}

                                {/* filas */}
                                {!loading &&
                                    !error &&
                                    rows.map((c) => (
                                        <tr
                                            key={c.idCliente}
                                            className="hover:bg-gray-50"
                                        >
                                            {/* Identificación */}
                                            <Td className="font-semibold text-gray-900 whitespace-nowrap">
                                                {formatId(c.idCliente)}
                                            </Td>

                                            {/* Nombre */}
                                            <Td className="text-gray-900">
                                                <div
                                                    className="truncate"
                                                    title={c.razonSocialONombre || ""}
                                                >
                                                    {c.razonSocialONombre || "—"}
                                                </div>
                                            </Td>

                                            {/* Teléfono */}
                                            <Td className="text-gray-700 whitespace-nowrap">
                                                {c.telefono || "—"}
                                            </Td>

                                            {/* Correo */}
                                            <Td className="text-gray-700 whitespace-nowrap">
                                                {c.correoElectronico || "—"}
                                            </Td>

                                            {/* Dirección */}
                                            <Td
                                                className="text-gray-700 max-w-[200px] truncate">
                                                {c.direccion || "—"}
                                            </Td>

                                            {/* Acción Elegir */}
                                            <Td className="whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        onSelect(c);
                                                        onClose();
                                                    }}
                                                    className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                                >
                                                    Elegir
                                                </button>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* FOOTER / PAGINACIÓN */}
                <div className="flex items-center justify-center border-t border-gray-200 px-4 py-4">
                    <nav className="flex items-center space-x-1 text-sm text-gray-700">
                        {/* Prev */}
                        <button
                            onClick={paginaAnterior}
                            disabled={currentPage <= 0}
                            className={[
                                "flex h-8 w-8 items-center justify-center rounded-md border border-transparent",
                                currentPage <= 0
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-gray-600 hover:bg-gray-100 hover:border-gray-300",
                            ].join(" ")}
                        >
                            ‹
                        </button>

                        {/* Numeritos */}
                        {paginasVisibles.map((p) => (
                            <button
                                key={p}
                                onClick={() => irPagina(p)}
                                className={[
                                    "flex h-8 min-w-8 px-2 items-center justify-center rounded-md border text-sm font-medium",
                                    p === currentPage
                                        ? "bg-emerald-500 text-white border-emerald-500"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                                ].join(" ")}
                            >
                                {p + 1 /* mostrar 1-based */}
                            </button>
                        ))}

                        {/* Si hay hueco al final, mostramos ... y última */}
                        {totalPages > paginasVisibles.length &&
                        paginasVisibles[paginasVisibles.length - 1] < totalPages - 2 ? (
                            <>
                <span className="flex h-8 w-8 items-center justify-center text-gray-500">
                  …
                </span>
                                <button
                                    onClick={() => irPagina(totalPages - 1)}
                                    className="flex h-8 min-w-8 px-2 items-center justify-center rounded-md border text-sm font-medium bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                >
                                    {totalPages}
                                </button>
                            </>
                        ) : null}

                        {/* Next */}
                        <button
                            onClick={paginaSiguiente}
                            disabled={currentPage >= totalPages - 1}
                            className={[
                                "flex h-8 w-8 items-center justify-center rounded-md border border-transparent",
                                currentPage >= totalPages - 1
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-gray-600 hover:bg-gray-100 hover:border-gray-300",
                            ].join(" ")}
                        >
                            ›
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}

/* ========== subcomponentes internos para celdas/ths ========== */

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-6 py-3 text-left">
            {children}
        </th>
    );
}

function Td({
                children,
                className = "",
            }: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <td className={`px-6 py-4 align-top text-sm ${className}`}>
            {children}
        </td>
    );
}
