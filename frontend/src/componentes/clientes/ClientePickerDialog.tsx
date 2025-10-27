import { useEffect, useRef, useState } from "react";
import { ClienteService } from "../../servicios/cliente";

export type ClienteLite = { idCliente: number; nombre: string; nit?: string | null };

function toClienteLite(c: any): ClienteLite {
    const id = c?.id ?? c?.idCliente;
    const nombre =
        c?.razonSocialONombre ?? c?.razonSocial ?? c?.nombreCliente ?? c?.nombre ?? "";
    const nit = c?.nit ?? c?.nroDocumento ?? null;
    return { idCliente: Number(id ?? 0), nombre: String(nombre), nit };
}

export function ClientePickerDialog({
                                        onClose,
                                        onPick,
                                    }: {
    onClose: () => void;
    onPick: (c: ClienteLite) => void;
}) {
    // 🔒 Ya NO cerramos por click afuera (sin listeners globales)
    const panelRef = useRef<HTMLDivElement | null>(null);

    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ClienteLite[]>([]);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                setLoading(true);
                const r = await ClienteService.listar({
                    q,
                    page,
                    size,
                    soloActivos: true,
                    sort: "razonSocialONombre,asc",
                });
                if (cancel) return;
                const list = (r as any)?.content?.map(toClienteLite) ?? [];
                setRows(list);
                setTotalPages((r as any)?.totalPages ?? 0);
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => {
            cancel = true;
        };
    }, [q, page, size]);

    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center"
            // ⛔ evita que cualquier click del picker burbujee al padre
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* overlay: NO cierra al hacer click */}
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
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold">Lista de clientes</h4>
                    <button className="px-2 py-1 text-sm border rounded" onClick={onClose}>
                        Cerrar
                    </button>
                </div>

                <div className="mb-3 flex gap-2">
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(0);
                        }}
                        placeholder="Buscar por nombre o NIT"
                        className="border rounded px-3 py-2 w-full"
                    />
                    <button
                        type="button"
                        className="px-3 py-2 border rounded text-sm hover:bg-neutral-50"
                        onClick={() => setQ("")}
                    >
                        Limpiar
                    </button>
                </div>

                <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50">
                        <tr>
                            <th className="text-left p-2">Nombre</th>
                            <th className="text-left p-2">NIT</th>
                            <th className="p-2 w-28"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="p-3 text-center text-neutral-500">
                                    Cargando…
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-3 text-center text-neutral-500">
                                    Sin resultados
                                </td>
                            </tr>
                        ) : (
                            rows.map((c) => (
                                <tr key={c.idCliente} className="border-t">
                                    <td className="p-2">{c.nombre}</td>
                                    <td className="p-2">{c.nit ?? "-"}</td>
                                    <td className="p-2 text-right">
                                        <button
                                            className="px-2 py-1 text-sm border rounded hover:bg-emerald-50"
                                            onClick={() => onPick(c)}
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
