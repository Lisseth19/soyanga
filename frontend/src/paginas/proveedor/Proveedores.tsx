// src/paginas/Proveedores.tsx
import { useEffect, useState } from "react";
import {
    listarProveedores,
    crearProveedor,
    editarProveedor,
    eliminarProveedor,
} from "../../servicios/proveedor";
import type { Proveedor } from "../../types/proveedor";
import type { Page } from "../../types/pagination";

function formatId(n: number) {
    const num = Number.isFinite(n) ? Math.trunc(n) : 0;
    return `P${String(num).padStart(4, "0")}`;
}

export default function Proveedores() {
    // búsqueda
    const [q, setQ] = useState("");
    const [query, setQuery] = useState("");

    // datos
    const [page, setPage] = useState<Page<Proveedor> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // panel en layout (derecha)
    const [panelOpen, setPanelOpen] = useState(false);

    // form + edición
    const [edit, setEdit] = useState<Proveedor | null>(null);
    const [form, setForm] = useState<Partial<Proveedor>>({
        razonSocial: "",
        nit: "",
        contacto: "",
        telefono: "",
        correoElectronico: "",
        direccion: "",
        estadoActivo: true,
    });

    // modal Ver Más
    const [verMas, setVerMas] = useState<Proveedor | null>(null);

    // debounce búsqueda
    useEffect(() => {
        const t = setTimeout(() => setQuery(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    // cargar
    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await listarProveedores({ q: query, page: 0, size: 20 });
            setPage(res);
        } catch (e: any) {
            setError(e?.message ?? "Error al listar proveedores");
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    function resetForm() {
        setEdit(null);
        setForm({
            razonSocial: "",
            nit: "",
            contacto: "",
            telefono: "",
            correoElectronico: "",
            direccion: "",
            estadoActivo: true,
        });
    }

    function startCreate() {
        resetForm();
        setPanelOpen(true);
        setTimeout(() => document.getElementById("f-razon")?.focus(), 0);
    }

    function startEdit(p: Proveedor) {
        setEdit(p);
        setForm({
            razonSocial: p.razonSocial || "",
            nit: p.nit || "",
            contacto: p.contacto || "",
            telefono: p.telefono || "",
            correoElectronico: p.correoElectronico || "",
            direccion: p.direccion || "",
            estadoActivo: !!p.estadoActivo,
        });
        setPanelOpen(true);
        setTimeout(() => document.getElementById("f-razon")?.focus(), 0);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.razonSocial?.trim()) {
            alert("La razón social es obligatoria");
            return;
        }
        try {
            setLoading(true);
            if (edit) await editarProveedor(edit.idProveedor, form);
            else await crearProveedor(form as any);
            await load();
            resetForm();
            setPanelOpen(false);
        } catch (e: any) {
            alert(e?.message ?? "Error al guardar");
        } finally {
            setLoading(false);
        }
    }

    async function onDelete(p: Proveedor) {
        if (!confirm(`¿Eliminar a "${p.razonSocial}"?`)) return;
        try {
            setLoading(true);
            await eliminarProveedor(p.idProveedor);
            await load();
        } catch (e: any) {
            alert(e?.message ?? "Error al eliminar");
        } finally {
            setLoading(false);
        }
    }

    // ordenar por id ascendente (visual)
    const rows = (page?.content ?? []).slice().sort((a, b) => a.idProveedor - b.idProveedor);

    // anchos de columnas: compactamos cuando hay panel
    const wId = panelOpen ? "w-[90px]" : "w-[110px]";
    const wTel = panelOpen ? "w-[130px]" : "w-[150px]";
    const wCorreo = panelOpen ? "w-[220px]" : "w-[260px]";
    const wAcc = panelOpen ? "w-[170px]" : "w-[190px]";

    return (
        // GRID responsive: [listado] o [listado, panel]
        <div
            className={[
                "grid gap-6 px-4 md:px-6 lg:px-8 py-4 md:py-6 transition-all duration-300",
                panelOpen ? "lg:grid-cols-[1fr_420px]" : "lg:grid-cols-[1fr]",
            ].join(" ")}
        >
            {/* === LISTADO === */}
            <section>
                {/* Encabezado compacto + buscador + botón al lado */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-800">
                        Gestión de Proveedores
                    </h1>

                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Buscador más corto */}
                        <div className="relative w-64 md:w-72">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Buscar proveedor..."
                                className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50
                           text-sm placeholder-gray-400 text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                type="text"
                            />
                        </div>

                        {/* Botón a la derecha del buscador (se apilan en mobile) */}
                        <button
                            onClick={startCreate}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 shadow"
                        >
                            Agregar proveedor
                        </button>
                    </div>
                </div>

                {/* Tabla subida (menos margen) */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full table-fixed">
                        <colgroup>
                            <col className={wId} />
                            {/* Proveedor: reparte ~40% del ancho */}
                            <col className="w-[38%] md:w-[40%]" />
                            {/* Teléfono: ~15% */}
                            <col className={`${wTel} w-[16%] md:w-[15%]`} />
                            {/* Correo: ~25% */}
                            <col className={`${wCorreo} w-[26%] md:w-[25%]`} />
                            {/* Acciones: ~20% */}
                            <col className={`${wAcc} w-[18%] md:w-[20%]`} />
                        </colgroup>

                        <thead className="bg-gray-50 text-gray-600 text-[13px] uppercase font-bold">
                        <tr>
                            <th className="px-6 py-3 text-left">Identificación</th>
                            <th className="px-6 py-3 text-left">Proveedor</th>
                            <th className="px-6 py-3 text-left">Teléfono</th>
                            <th className="px-6 py-3 text-left">Correo</th>
                            <th className="px-6 py-3 text-left">Acciones</th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                        {loading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                    Cargando…
                                </td>
                            </tr>
                        )}
                        {error && !loading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-red-500">
                                    {error}
                                </td>
                            </tr>
                        )}
                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                    No hay proveedores
                                </td>
                            </tr>
                        )}

                        {rows.map((p) => (
                            <tr key={p.idProveedor} className="bg-white">
                                <td className="px-6 py-4 font-extrabold text-gray-800 whitespace-nowrap">
                                    {formatId(p.idProveedor)}
                                </td>

                                <td className="px-6 py-4 text-gray-900">
                                    <div className="truncate" title={p.razonSocial}>
                                        {p.razonSocial}
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                                    {p.telefono || "—"}
                                </td>

                                <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                                    {p.correoElectronico || "—"}
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4 text-sm whitespace-nowrap">
                                        <button className="text-blue-600 hover:underline" onClick={() => startEdit(p)}>
                                            Editar
                                        </button>
                                        <button className="text-red-600 hover:underline" onClick={() => onDelete(p)}>
                                            Eliminar
                                        </button>
                                        <button className="text-gray-600 hover:underline" onClick={() => setVerMas(p)}>
                                            Ver Más
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* === PANEL (visible completo) === */}
            {panelOpen && (
                <aside
                    className={[
                        "bg-white rounded-2xl border border-gray-300 shadow-2xl",
                        // menos padding para ganar ancho útil
                        "px-6 md:px-7 py-5",
                        "self-start lg:sticky lg:top-20",
                        "max-h-[calc(100vh-6rem)] overflow-y-auto",
                        // ocupa toda su columna y desplaza un poco a la izquierda (como clientes)
                        "w-full lg:-mr-4 xl:-mr-8",
                    ].join(" ")}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold tracking-wide">
                            {edit ? "Editar proveedor" : "Agregar nuevo proveedor"}
                        </h2>
                        <button className="text-gray-500 hover:text-gray-700" onClick={() => setPanelOpen(false)} aria-label="Cerrar">
                            ✕
                        </button>
                    </div>

                    <form className="space-y-5" onSubmit={onSubmit}>
                        <Field
                            id="f-razon"
                            label="Razón social:"
                            value={form.razonSocial || ""}
                            onChange={(v) => setForm((f) => ({ ...f, razonSocial: v }))}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Field label="NIT/ CI:" value={form.nit || ""} onChange={(v) => setForm((f) => ({ ...f, nit: v }))} />
                            <Field label="Contacto:" value={form.contacto || ""} onChange={(v) => setForm((f) => ({ ...f, contacto: v }))} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Field label="Teléfono:" value={form.telefono || ""} onChange={(v) => setForm((f) => ({ ...f, telefono: v }))} />
                            <Field
                                label="Correo:"
                                type="email"
                                value={form.correoElectronico || ""}
                                onChange={(v) => setForm((f) => ({ ...f, correoElectronico: v }))}
                            />
                        </div>

                        <Field
                            label="Dirección:"
                            value={form.direccion || ""}
                            onChange={(v) => setForm((f) => ({ ...f, direccion: v }))}
                        />

                        <div className="flex items-center gap-3 pt-2">
                            <input
                                id="f-activo"
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-400"
                                checked={!!form.estadoActivo}
                                onChange={(e) => setForm((f) => ({ ...f, estadoActivo: e.target.checked }))}
                            />
                            <label htmlFor="f-activo" className="text-[15px]">Activo</label>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <button type="submit" className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2">
                                {edit ? "Guardar" : "Crear"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { resetForm(); setPanelOpen(false); }}
                                className="rounded-lg bg-red-400 hover:bg-red-500 text-white font-semibold px-6 py-2"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </aside>
            )}

            {/* === MODAL VER MÁS (centrado) === */}
            {verMas && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setVerMas(null)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                            <div className="flex items-center justify-between px-6 py-4 border-b">
                                <h3 className="text-xl font-bold">Detalles del Proveedor</h3>
                                <button className="text-gray-500 hover:text-gray-700" onClick={() => setVerMas(null)} aria-label="Cerrar">✕</button>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Detail label="ID" value={formatId(verMas.idProveedor)} />
                                <Detail label="Razón social" value={verMas.razonSocial} />
                                <Detail label="NIT/ CI" value={verMas.nit || "—"} />
                                <Detail label="Contacto" value={verMas.contacto || "—"} />
                                <Detail label="Teléfono" value={verMas.telefono || "—"} />
                                <Detail label="Correo" value={verMas.correoElectronico || "—"} />
                                <Detail label="Dirección" value={verMas.direccion || "—"} />
                                <Detail label="Estado" value={verMas.estadoActivo ? "Activo" : "Inactivo"} />
                            </div>
                            <div className="flex justify-end gap-3 px-6 py-4 border-t">
                                <button className="rounded-md bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2" onClick={() => { startEdit(verMas); setVerMas(null); }}>
                                    Editar
                                </button>
                                <button className="rounded-md bg-red-500 hover:bg-red-600 text-white px-4 py-2" onClick={() => { onDelete(verMas); setVerMas(null); }}>
                                    Eliminar
                                </button>
                                <button className="rounded-md border px-4 py-2" onClick={() => setVerMas(null)}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* ===== Helpers UI ===== */
function Label({ children }: { children: React.ReactNode }) {
    return <label className="block text-[15px] font-medium mb-1">{children}</label>;
}

function Field({
                   id,
                   label,
                   type = "text",
                   value,
                   onChange,
                   className = "",
               }: {
    id?: string;
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    className?: string;
}) {
    return (
        <div className={className}>
            <Label>{label}</Label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full border-b border-gray-400 outline-none pb-1"
            />
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</div>
            <div className="text-sm mt-1">{value}</div>
        </div>
    );
}
