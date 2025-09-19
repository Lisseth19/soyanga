import { useEffect, useState } from "react";
import {
    listarClientes,
    crearCliente,
    editarCliente,
    eliminarCliente,
} from "../../servicios/cliente";
import type { Cliente } from "../../types/cliente";
import type { Page } from "../../types/pagination";

const money = new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 0,
});

function formatId(n: number) {
    const num = Number.isFinite(n) ? Math.trunc(n) : 0;
    return `C${String(num).padStart(4, "0")}`;
}

export default function Clientes() {
    // búsqueda
    const [q, setQ] = useState("");
    const [query, setQuery] = useState("");

    // datos
    const [page, setPage] = useState<Page<Cliente> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // panel en layout (derecha)
    const [panelOpen, setPanelOpen] = useState(false);

    // form + edición
    const [edit, setEdit] = useState<Cliente | null>(null);
    const [form, setForm] = useState<Partial<Cliente>>({
        razonSocialONombre: "",
        nit: "",
        telefono: "",
        correoElectronico: "",
        direccion: "",
        ciudad: "",
        condicionDePago: "contado",
        limiteCreditoBob: undefined,
        estadoActivo: true,
    });

    // modal Ver Más
    const [verMas, setVerMas] = useState<Cliente | null>(null);

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
            const res = await listarClientes({ q: query, page: 0, size: 20 });
            res.content = res.content.map((c) => ({
                ...c,
                limiteCreditoBob:
                    typeof c.limiteCreditoBob === "string" ? Number(c.limiteCreditoBob) : c.limiteCreditoBob,
            }));
            setPage(res);
        } catch (e: any) {
            setError(e?.message ?? "Error al listar clientes");
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
            razonSocialONombre: "",
            nit: "",
            telefono: "",
            correoElectronico: "",
            direccion: "",
            ciudad: "",
            condicionDePago: "contado",
            limiteCreditoBob: undefined,
            estadoActivo: true,
        });
    }

    function startCreate() {
        resetForm();
        setPanelOpen(true);
        setTimeout(() => document.getElementById("f-nombre")?.focus(), 0);
    }

    function startEdit(c: Cliente) {
        setEdit(c);
        setForm({
            razonSocialONombre: c.razonSocialONombre || "",
            nit: c.nit || "",
            telefono: c.telefono || "",
            correoElectronico: c.correoElectronico || "",
            direccion: c.direccion || "",
            ciudad: c.ciudad || "",
            condicionDePago: c.condicionDePago ?? "contado",
            limiteCreditoBob:
                typeof c.limiteCreditoBob === "number" ? c.limiteCreditoBob : Number(c.limiteCreditoBob ?? 0),
            estadoActivo: !!c.estadoActivo,
        });
        setPanelOpen(true);
        setTimeout(() => document.getElementById("f-nombre")?.focus(), 0);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.razonSocialONombre?.trim()) {
            alert("El nombre es obligatorio");
            return;
        }
        try {
            setLoading(true);
            if (edit) await editarCliente(edit.idCliente, form);
            else await crearCliente(form as any);
            await load();
            resetForm();
            setPanelOpen(false);
        } catch (e: any) {
            alert(e?.message ?? "Error al guardar");
        } finally {
            setLoading(false);
        }
    }

    async function onDelete(c: Cliente) {
        if (!confirm(`¿Eliminar a "${c.razonSocialONombre}"?`)) return;
        try {
            setLoading(true);
            await eliminarCliente(c.idCliente);
            await load();
        } catch (e: any) {
            alert(e?.message ?? "Error al eliminar");
        } finally {
            setLoading(false);
        }
    }

    // ordenar por id ascendente
    const rows = (page?.content ?? []).slice().sort((a, b) => a.idCliente - b.idCliente);

    // anchos de columnas: compactamos cuando hay panel
    const wId = panelOpen ? "w-[90px]" : "w-[110px]";
    const wTel = panelOpen ? "w-[130px]" : "w-[150px]";
    const wPago = panelOpen ? "w-[150px]" : "w-[180px]";
    const wLimite = panelOpen ? "w-[140px]" : "w-[170px]";
    const wAcc = panelOpen ? "w-[150px]" : "w-[170px]";

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
                        Gestión de Clientes
                    </h1>

                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Buscador más corto */}
                        <div className="relative w-64 md:w-72">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Buscar cliente..."
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
                            Agregar cliente
                        </button>
                    </div>
                </div>

                {/* Tabla subida (menos margen) */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full table-fixed">
                        <colgroup>
                            <col className={wId} />
                            <col /> {/* nombre ocupa el resto */}
                            <col className={wTel} />
                            <col className={wPago} />
                            <col className={wLimite} />
                            <col className={wAcc} />
                        </colgroup>

                        <thead className="bg-gray-50 text-gray-600 text-[13px] uppercase font-bold">
                        <tr>
                            <th className="px-6 py-3 text-left">Identificación</th>
                            <th className="px-6 py-3 text-left">Nombre</th>
                            <th className="px-6 py-3 text-left">Teléfono</th>
                            <th className="px-6 py-3 text-left">Condiciones de Pago</th>
                            <th className="px-6 py-3 text-left">Límite de Crédito</th>
                            <th className="px-6 py-3 text-left">Acciones</th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                        {loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    Cargando…
                                </td>
                            </tr>
                        )}
                        {error && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-red-500">
                                    {error}
                                </td>
                            </tr>
                        )}
                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    No hay clientes
                                </td>
                            </tr>
                        )}

                        {rows.map((c) => (
                            <tr key={c.idCliente} className="bg-white">
                                <td className="px-6 py-4 font-extrabold text-gray-800 whitespace-nowrap">
                                    {formatId(c.idCliente)}
                                </td>

                                <td className="px-6 py-4 text-gray-900">
                                    <div className="truncate" title={c.razonSocialONombre}>
                                        {c.razonSocialONombre}
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                                    {c.telefono || "—"}
                                </td>

                                <td className="px-6 py-4">
                                    {c.condicionDePago ? (
                                        <Pill
                                            ok={c.condicionDePago === "contado"}
                                            text={c.condicionDePago === "contado" ? "Contado" : "Crédito"}
                                        />
                                    ) : (
                                        <span className="text-gray-500">—</span>
                                    )}
                                </td>

                                <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                                    {c.limiteCreditoBob != null ? money.format(Number(c.limiteCreditoBob)) : "—"}
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4 text-sm whitespace-nowrap">
                                        <button className="text-blue-600 hover:underline" onClick={() => startEdit(c)}>
                                            Editar
                                        </button>
                                        <button className="text-red-600 hover:underline" onClick={() => onDelete(c)}>
                                            Eliminar
                                        </button>
                                        <button className="text-gray-600 hover:underline" onClick={() => setVerMas(c)}>
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
                        // un pelín menos padding para ganar ancho útil
                        "px-6 md:px-7 py-5",
                        "self-start lg:sticky lg:top-20",
                        "max-h-[calc(100vh-6rem)] overflow-y-auto",
                        // NUEVO: ocupa toda su columna y muévete un poco a la izquierda
                        "w-full lg:-mr-4 xl:-mr-8",
                    ].join(" ")}
                >
                    <div className="flex items-center justify-between mb-3">
                        {/* título más pequeño ya estaba */}
                        <h2 className="text-xl font-bold tracking-wide">
                            {edit ? "Editar cliente" : "Agregar nuevo cliente"}
                        </h2>
                        <button className="text-gray-500 hover:text-gray-700" onClick={() => setPanelOpen(false)} aria-label="Cerrar">
                            ✕
                        </button>
                    </div>

                    <form className="space-y-5" onSubmit={onSubmit}>
                        <Field
                            id="f-nombre"
                            label="Nombre:"
                            value={form.razonSocialONombre || ""}
                            onChange={(v) => setForm((f) => ({ ...f, razonSocialONombre: v }))}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Field label="Nit/Ci:" value={form.nit || ""} onChange={(v) => setForm((f) => ({ ...f, nit: v }))} />
                            <Field label="Teléfono:" value={form.telefono || ""} onChange={(v) => setForm((f) => ({ ...f, telefono: v }))} />
                        </div>

                        <Field
                            label="Correo:"
                            type="email"
                            value={form.correoElectronico || ""}
                            onChange={(v) => setForm((f) => ({ ...f, correoElectronico: v }))}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Field label="Dirección:" value={form.direccion || ""} onChange={(v) => setForm((f) => ({ ...f, direccion: v }))} />
                            <Field label="Ciudad:" value={form.ciudad || ""} onChange={(v) => setForm((f) => ({ ...f, ciudad: v }))} />
                        </div>

                        <div>
                            <Label>Condición de Pago:</Label>
                            <select
                                className="mt-1 w-full border-b border-gray-400 outline-none pb-1"
                                value={form.condicionDePago || "contado"}
                                onChange={(e) => setForm((f) => ({ ...f, condicionDePago: e.target.value as any }))}
                            >
                                <option value="contado">Contado</option>
                                <option value="credito">Crédito</option>
                            </select>
                        </div>

                        <Field
                            label="Límite de Crédito (BOB):"
                            type="number"
                            value={form.limiteCreditoBob != null ? String(form.limiteCreditoBob) : ""}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, limiteCreditoBob: v === "" ? undefined : Number(v) }))
                            }
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
                                <h3 className="text-xl font-bold">Detalles del Cliente</h3>
                                <button className="text-gray-500 hover:text-gray-700" onClick={() => setVerMas(null)} aria-label="Cerrar">✕</button>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Detail label="ID" value={formatId(verMas.idCliente)} />
                                <Detail label="Nombre" value={verMas.razonSocialONombre} />
                                <Detail label="NIT" value={verMas.nit || "—"} />
                                <Detail label="Teléfono" value={verMas.telefono || "—"} />
                                <Detail label="Correo" value={verMas.correoElectronico || "—"} />
                                <Detail label="Dirección" value={verMas.direccion || "—"} />
                                <Detail label="Ciudad" value={verMas.ciudad || "—"} />
                                <Detail label="Condición de Pago" value={verMas.condicionDePago ? (verMas.condicionDePago === "contado" ? "Contado" : "Crédito") : "—"} />
                                <Detail label="Límite de Crédito" value={verMas.limiteCreditoBob != null ? money.format(Number(verMas.limiteCreditoBob)) : "—"} />
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

function Pill({ ok, text }: { ok: boolean; text: string }) {
    return (
        <span
            className={[
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
            ].join(" ")}
        >
      {text}
    </span>
    );
}
