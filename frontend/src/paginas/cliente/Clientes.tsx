import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClienteService } from "@/servicios/cliente";
import type { Cliente } from "@/types/cliente";
import type { Page } from "@/types/pagination";
import { useAuth } from "@/context/AuthContext";
import { GlobalAccessDeniedModal } from "@/componentes/GlobalAccessDeniedModal";
import { Pencil, Trash2, Eye, Check, X } from "lucide-react";

/* ===== Helpers ===== */
const money = new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 0,
});
function formatId(n: number) {
    const num = Number.isFinite(n) ? Math.trunc(n) : 0;
    return `C${String(num).padStart(4, "0")}`;
}
/** Emite evento para el modal global de acceso denegado */
function deny(method: string, path: string, message = "No tienes permiso para realizar esta acción.") {
    window.dispatchEvent(
        new CustomEvent("auth:forbidden", {
            detail: { source: "ClientesPage", message, method, path },
        }),
    );
}
/** Bloquea el scroll del body cuando active=true */
function useLockBodyScroll(active: boolean) {
    useEffect(() => {
        if (!active) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [active]);
}

/* ========= Toggle compacto (45×20 con knob 16px) ========= */
function ActiveToggleMini({
                              value,
                              disabled,
                              title,
                              onToggle,
                          }: {
    value: boolean;
    disabled?: boolean;
    title?: string;
    onToggle: (next: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={value}
            title={title}
            disabled={!!disabled}
            onClick={() => !disabled && onToggle(!value)}
            className={[
                "relative inline-flex w-[45px] h-[20px] items-center rounded-full transition",
                "border shadow-sm disabled:opacity-50 disabled:pointer-events-none",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
                value
                    ? "bg-emerald-400/90 border-emerald-500"
                    : "bg-rose-400/90 border-rose-500",
            ].join(" ")}
        >
            <span
                className={[
                    "absolute left-1.5 text-white transition-opacity",
                    value ? "opacity-100" : "opacity-0",
                ].join(" ")}
            >
                <Check size={12} />
            </span>
            <span
                className={[
                    "absolute right-1.5 text-white transition-opacity",
                    !value ? "opacity-100" : "opacity-0",
                ].join(" ")}
            >
                <X size={12} />
            </span>

            {/* knob 16px, margen 2px, travel 25px */}
            <span
                className={[
                    "absolute top-[2px] left-[2px] inline-block w-[16px] h-[16px]",
                    "bg-white rounded-full shadow transition-transform",
                    value ? "translate-x-[25px]" : "translate-x-0",
                ].join(" ")}
            />
        </button>
    );
}

/* ===== Modal de confirmación (bonito) ===== */
function ConfirmModal({
                          open,
                          title,
                          message,
                          confirmLabel = "Confirmar",
                          cancelLabel = "Cancelar",
                          kind = "danger",
                          loading = false,
                          onConfirm,
                          onClose,
                      }: {
    open: boolean;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    kind?: "default" | "danger" | "warn";
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[90]">
            <div
                className="absolute inset-0 bg-black/35"
                onClick={() => !loading && onClose()}
            />
            <div className="absolute inset-0 flex items-center justify-center p-3">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-neutral-800">
                            {title}
                        </h3>
                        <button
                            type="button"
                            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500"
                            onClick={onClose}
                            disabled={loading}
                            aria-label="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="px-4 py-4 text-[14px] text-neutral-700 leading-relaxed">
                        {message}
                    </div>
                    <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            className="px-3 h-9 rounded-md border bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-60"
                            onClick={onClose}
                            disabled={loading}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            className={[
                                "px-3 h-9 rounded-md font-medium text-white disabled:opacity-60",
                                kind === "danger"
                                    ? "bg-rose-600 hover:bg-rose-700"
                                    : kind === "warn"
                                        ? "bg-amber-600 hover:bg-amber-700"
                                        : "bg-emerald-600 hover:bg-emerald-700",
                            ].join(" ")}
                            onClick={onConfirm}
                            disabled={loading}
                        >
                            {loading ? "Procesando…" : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ===== Botón icónico ===== */
function IconBtn(props: {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}) {
    const { title, onClick, children, className = "", disabled } = props;
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
            className={[
                "inline-flex items-center justify-center rounded-md p-2",
                "border border-transparent hover:bg-neutral-100 transition",
                "disabled:opacity-50 disabled:pointer-events-none",
                className,
            ].join(" ")}
        >
            {children}
        </button>
    );
}

/* ===== Página ===== */
export default function ClientesPage() {
    const { can } = useAuth() as { can: (perm: string) => boolean };

    // permisos
    const canVer = useMemo(() => can("clientes:ver"), [can]);
    const canCrear = useMemo(() => can("clientes:crear"), [can]);
    const canEditar = useMemo(() => can("clientes:actualizar"), [can]);
    const canEliminar = useMemo(() => can("clientes:eliminar"), [can]);
    const canCambiarEstado = canEditar; // activar/desactivar requiere actualizar

    // estados tabla / filtros
    const [q, setQ] = useState("");
    const [query, setQuery] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setQuery(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    const [soloActivos, setSoloActivos] = useState(false);
    const [page, setPage] = useState<Page<Cliente> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // para toggle estado
    const [togglingId, setTogglingId] = useState<number | null>(null);

    // modal form
    const [formOpen, setFormOpen] = useState(false);
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

    // errores de servidor por campo (ej. NIT duplicado)
    const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

    // modal detalle
    const [verMas, setVerMas] = useState<Cliente | null>(null);

    // confirm delete
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [confirmObj, setConfirmObj] = useState<Cliente | null>(null);

    const DEFAULT_SORT = "razonSocialONombre,asc";

    // cargar lista
    async function load(pageIndex = 0) {
        if (!canVer) {
            setError("Acceso denegado.");
            setPage(null);
            deny("GET", "/api/v1/clientes", "No tienes permiso para ver clientes.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await ClienteService.listar({
                q: query || undefined,
                page: pageIndex,
                size: 20,
                sort: DEFAULT_SORT,
                soloActivos,
            });
            res.content = (res.content ?? []).map((c) => ({
                ...c,
                limiteCreditoBob:
                    typeof c.limiteCreditoBob === "string"
                        ? Number(c.limiteCreditoBob)
                        : c.limiteCreditoBob,
            }));
            setPage(res);
        } catch (e: any) {
            if (e?.status === 403) {
                setError("Acceso denegado.");
                setPage(null);
                deny("GET", "/api/v1/clientes", "No tienes permiso para ver clientes.");
            } else if (e?.status === 401) {
                setError("No autorizado. Inicia sesión nuevamente.");
                setPage(null);
            } else {
                setError(e?.message ?? "Error al listar clientes");
                setPage(null);
            }
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, soloActivos, canVer]);

    // autocierre modal form si cambian permisos
    useEffect(() => {
        if (!formOpen) return;
        if (edit && !canEditar) {
            setFormOpen(false);
            setEdit(null);
            deny("PUT", "/api/v1/clientes/{id}", "Perdiste el permiso para actualizar clientes.");
        } else if (!edit && !canCrear) {
            setFormOpen(false);
            deny("POST", "/api/v1/clientes", "Perdiste el permiso para crear clientes.");
        }
    }, [formOpen, edit, canEditar, canCrear]);

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
        setServerFieldErrors({});
    }

    function startCreate() {
        if (!canCrear) {
            deny("POST", "/api/v1/clientes", "No tienes permiso para crear clientes.");
            return;
        }
        resetForm();
        setFormOpen(true);
        setTimeout(() => document.getElementById("f-nombre")?.focus(), 0);
    }

    function startEdit(c: Cliente) {
        if (!canEditar) {
            deny("PUT", `/api/v1/clientes/${c.idCliente}`, "No tienes permiso para actualizar clientes.");
            return;
        }
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
                typeof c.limiteCreditoBob === "number"
                    ? c.limiteCreditoBob
                    : Number(c.limiteCreditoBob ?? 0),
            estadoActivo: !!c.estadoActivo,
        });
        setServerFieldErrors({});
        setFormOpen(true);
        setTimeout(() => document.getElementById("f-nombre")?.focus(), 0);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        const limite =
            form.limiteCreditoBob === "" || form.limiteCreditoBob == null
                ? undefined
                : Number(form.limiteCreditoBob);

        const payload: any = {
            razonSocialONombre: form.razonSocialONombre?.trim(),
            nit: form.nit?.trim() || undefined,
            telefono: form.telefono?.trim() || undefined,
            correoElectronico: form.correoElectronico?.trim() || undefined,
            direccion: form.direccion?.trim() || undefined,
            ciudad: form.ciudad?.trim() || undefined,
            condicionDePago: form.condicionDePago ?? "contado",
            limiteCreditoBob: Number.isFinite(limite as number)
                ? (limite as number)
                : undefined,
            estadoActivo: !!form.estadoActivo,
        };

        try {
            setLoading(true);
            setError(null);
            setServerFieldErrors({}); // limpiamos errores de servidor previos

            if (edit) {
                if (!canEditar) {
                    deny("PUT", `/api/v1/clientes/${edit.idCliente}`);
                    setFormOpen(false);
                    setEdit(null);
                    return;
                }
                await ClienteService.editar(edit.idCliente, payload);
            } else {
                if (!canCrear) {
                    deny("POST", "/api/v1/clientes");
                    setFormOpen(false);
                    return;
                }
                await ClienteService.crear(payload);
            }

            // Si todo salió bien, refrescamos la lista, limpiamos y cerramos modal
            await load(page?.number ?? 0);
            resetForm();
            setFormOpen(false);
        } catch (e: any) {
            // 1. Sin permiso -> cerramos modal + disparamos deny()
            if (e?.status === 403) {
                if (edit) {
                    deny("PUT", `/api/v1/clientes/${edit.idCliente}`);
                } else {
                    deny("POST", "/api/v1/clientes");
                }
                setFormOpen(false);
                setEdit(null);
                return;
            }

            // 2. Duplicado de NIT u otro conflicto de unicidad
            //    A veces viene con status 409, a veces 400, a veces solo message.
            const msg = (e?.message || "").toString().trim().toLowerCase();

            const looksLikeNitDuplicate =
                e?.status === 409 ||
                msg.includes("nit") ||
                msg.includes("ya existe") ||
                msg.includes("existe un cliente con ese nit");

            if (looksLikeNitDuplicate) {
                // Mostramos el error directamente en el campo NIT dentro del modal.
                // Usamos el mensaje del backend si existe,
                // o caemos a uno genérico.
                setServerFieldErrors({
                    nit: e?.message || "Este NIT ya está registrado.",
                });

                // IMPORTANTE:
                // NO cerramos el modal
                // NO ponemos setError(...) global
                // NO tocamos la lista
                return;
            }

            // 3. Otros errores reales del server -> mostramos global
            setError(e?.message ?? "Error al guardar");
        } finally {
            setLoading(false);
        }
    }

    function askDelete(c: Cliente) {
        if (!canEliminar) {
            deny("DELETE", `/api/v1/clientes/${c.idCliente}`, "No tienes permiso para eliminar clientes.");
            return;
        }
        setConfirmObj(c);
        setConfirmOpen(true);
    }

    async function doDelete() {
        const c = confirmObj!;
        setConfirmBusy(true);
        try {
            await ClienteService.eliminar(c.idCliente); // DELETE real
            setConfirmOpen(false);
            setConfirmObj(null);
            await load(page?.number ?? 0);
        } catch (e: any) {
            setConfirmOpen(false);
            setConfirmObj(null);
            if (e?.status === 403) {
                deny("DELETE", `/api/v1/clientes/${c.idCliente}`, "No tienes permiso para eliminar clientes.");
            } else if (e?.status === 409) {
                setError(
                    "No se puede eliminar el cliente porque está en uso (referenciado por otros registros).",
                );
            } else {
                setError(e?.message ?? "Error al eliminar");
            }
        } finally {
            setConfirmBusy(false);
        }
    }

    async function onToggleEstado(c: Cliente) {
        if (!canCambiarEstado) {
            deny("PATCH", `/api/v1/clientes/${c.idCliente}/estado`, "No tienes permiso para cambiar el estado de clientes.");
            return;
        }
        try {
            setTogglingId(c.idCliente);
            setError(null);
            await ClienteService.cambiarEstado(c.idCliente, !c.estadoActivo);
            await load(page?.number ?? 0);
        } catch (e: any) {
            if (e?.status === 403) {
                deny("PATCH", `/api/v1/clientes/${c.idCliente}/estado`);
            } else {
                setError(e?.message ?? "No se pudo cambiar el estado del cliente");
            }
        } finally {
            setTogglingId(null);
        }
    }

    const rows = (page?.content ?? [])
        .slice()
        .sort((a, b) => a.idCliente - b.idCliente);

    return (
        <div className="p-6 space-y-4">
            <GlobalAccessDeniedModal />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-xl font-semibold text-neutral-800">Clientes</h1>

                <div className="md:ml-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar cliente..."
                        className="border rounded px-3 py-2 w-72 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                        type="text"
                    />
                    <label className="inline-flex items-center gap-2 text-sm text-neutral-700 px-1">
                        <input
                            type="checkbox"
                            checked={soloActivos}
                            onChange={(e) => setSoloActivos(e.target.checked)}
                        />
                        Sólo activos
                    </label>
                    {canCrear && (
                        <button
                            type="button"
                            onClick={startCreate}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm shadow-sm"
                        >
                            Agregar cliente
                        </button>
                    )}
                </div>
            </div>

            {/* MENSAJES */}
            {loading && <div>Cargando…</div>}
            {error && (
                <div className="text-red-600 whitespace-pre-wrap border border-red-200 bg-red-50 rounded px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            {/* LISTA */}
            {!error && (
                <section className="space-y-4">
                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {!loading && rows.length === 0 && (
                            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center text-gray-400 text-sm">
                                No hay clientes
                            </div>
                        )}

                        {!loading &&
                            rows.map((c) => {
                                const toggling = togglingId === c.idCliente;
                                return (
                                    <div
                                        key={c.idCliente}
                                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                                                    ID
                                                </div>
                                                <div className="text-base font-extrabold text-gray-800">
                                                    {formatId(c.idCliente)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {c.estadoActivo ? (
                                                    <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
                                                        Activo
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-medium">
                                                        Inactivo
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                                                Nombre
                                            </div>
                                            <div className="text-sm text-gray-900 break-words">
                                                {c.razonSocialONombre || "—"}
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-neutral-800">
                                            <div>
                                                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                                                    Teléfono
                                                </div>
                                                <div className="text-sm mt-0.5">
                                                    {c.telefono || "—"}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                                                    Cond. de Pago
                                                </div>
                                                <div className="mt-0.5">
                                                    {c.condicionDePago ? (
                                                        <Pill
                                                            ok={c.condicionDePago === "contado"}
                                                            text={
                                                                c.condicionDePago === "contado"
                                                                    ? "Contado"
                                                                    : "Crédito"
                                                            }
                                                        />
                                                    ) : (
                                                        <span className="text-gray-500 text-sm">—</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                                                    Límite Crédito
                                                </div>
                                                <div className="text-sm mt-0.5">
                                                    {c.limiteCreditoBob != null
                                                        ? money.format(Number(c.limiteCreditoBob))
                                                        : "—"}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                                                    Ciudad
                                                </div>
                                                <div className="text-sm mt-0.5 break-words">
                                                    {c.ciudad || "—"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Acciones móvil */}
                                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                                            {canCambiarEstado && (
                                                <ActiveToggleMini
                                                    value={!!c.estadoActivo}
                                                    title={
                                                        c.estadoActivo
                                                            ? "Desactivar (no elimina)"
                                                            : "Activar"
                                                    }
                                                    disabled={toggling || !canCambiarEstado}
                                                    onToggle={() => onToggleEstado(c)}
                                                />
                                            )}

                                            {canEditar && (
                                                <IconBtn
                                                    title="Editar"
                                                    onClick={() => startEdit(c)}
                                                >
                                                    <Pencil
                                                        size={18}
                                                        className="text-neutral-700"
                                                    />
                                                </IconBtn>
                                            )}

                                            {canEliminar && (
                                                <IconBtn
                                                    title="Eliminar"
                                                    onClick={() => askDelete(c)}
                                                >
                                                    <Trash2
                                                        size={18}
                                                        className="text-rose-600"
                                                    />
                                                </IconBtn>
                                            )}

                                            <IconBtn
                                                title="Ver más"
                                                onClick={() => setVerMas(c)}
                                            >
                                                <Eye
                                                    size={18}
                                                    className="text-neutral-700"
                                                />
                                            </IconBtn>
                                        </div>
                                    </div>
                                );
                            })}

                        {!loading && rows.length > 0 && (
                            <div className="flex flex-col items-center gap-2 text-sm text-gray-600 border-t border-gray-200 pt-4">
                                <div>
                                    Página {(page?.number ?? 0) + 1} de{" "}
                                    {page?.totalPages ?? 1}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border disabled:opacity-50"
                                        disabled={!!page?.first}
                                        onClick={() =>
                                            load((page?.number ?? 0) - 1)
                                        }
                                    >
                                        ← Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border disabled:opacity-50"
                                        disabled={!!page?.last}
                                        onClick={() =>
                                            load((page?.number ?? 0) + 1)
                                        }
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                        <div className="border rounded bg-white">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 text-[13px] uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-3 text-left align-top">
                                        Identificación
                                    </th>
                                    <th className="px-6 py-3 text-left align-top">
                                        Nombre
                                    </th>
                                    <th className="px-6 py-3 text-left align-top">
                                        Teléfono
                                    </th>
                                    <th className="px-6 py-3 text-left align-top">
                                        Condiciones de Pago
                                    </th>
                                    <th className="px-6 py-3 text-left align-top">
                                        Límite de Crédito
                                    </th>
                                    <th className="px-6 py-3 text-left align-top">
                                        Acciones
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {!loading && rows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-8 text-center text-gray-400"
                                        >
                                            No hay clientes
                                        </td>
                                    </tr>
                                )}

                                {!loading &&
                                    rows.map((c) => {
                                        const toggling =
                                            togglingId === c.idCliente;
                                        return (
                                            <tr
                                                key={c.idCliente}
                                                className="bg-white align-top"
                                            >
                                                <td className="px-6 py-4 font-extrabold text-gray-800 whitespace-nowrap">
                                                    {formatId(c.idCliente)}
                                                    <div className="mt-1 text-xs">
                                                        {c.estadoActivo ? (
                                                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                                                                    Activo
                                                                </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                                                                    Inactivo
                                                                </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 text-gray-900 break-words"
                                                    title={c.razonSocialONombre}
                                                >
                                                    {c.razonSocialONombre ||
                                                        "—"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                                                    {c.telefono || "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {c.condicionDePago ? (
                                                        <Pill
                                                            ok={
                                                                c.condicionDePago ===
                                                                "contado"
                                                            }
                                                            text={
                                                                c.condicionDePago ===
                                                                "contado"
                                                                    ? "Contado"
                                                                    : "Crédito"
                                                            }
                                                        />
                                                    ) : (
                                                        <span className="text-gray-500">
                                                                —
                                                            </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                                                    {c.limiteCreditoBob != null
                                                        ? money.format(
                                                            Number(
                                                                c.limiteCreditoBob,
                                                            ),
                                                        )
                                                        : "—"}
                                                </td>
                                                <td className="px-6 py-2 align-top">
                                                    <div className="flex flex-row flex-wrap items-center gap-1.5">
                                                        {canCambiarEstado && (
                                                            <ActiveToggleMini
                                                                value={
                                                                    !!c.estadoActivo
                                                                }
                                                                title={
                                                                    c.estadoActivo
                                                                        ? "Desactivar (no elimina)"
                                                                        : "Activar"
                                                                }
                                                                disabled={
                                                                    toggling ||
                                                                    !canCambiarEstado
                                                                }
                                                                onToggle={() =>
                                                                    onToggleEstado(
                                                                        c,
                                                                    )
                                                                }
                                                            />
                                                        )}

                                                        {canEditar && (
                                                            <IconBtn
                                                                title="Editar"
                                                                onClick={() =>
                                                                    startEdit(
                                                                        c,
                                                                    )
                                                                }
                                                            >
                                                                <Pencil
                                                                    size={18}
                                                                    className="text-neutral-700"
                                                                />
                                                            </IconBtn>
                                                        )}

                                                        {canEliminar && (
                                                            <IconBtn
                                                                title="Eliminar"
                                                                onClick={() =>
                                                                    askDelete(
                                                                        c,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2
                                                                    size={18}
                                                                    className="text-rose-600"
                                                                />
                                                            </IconBtn>
                                                        )}

                                                        <IconBtn
                                                            title="Ver más"
                                                            onClick={() =>
                                                                setVerMas(
                                                                    c,
                                                                )
                                                            }
                                                        >
                                                            <Eye
                                                                size={18}
                                                                className="text-neutral-700"
                                                            />
                                                        </IconBtn>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="flex items-center justify-between px-4 py-3 border-t">
                                <div className="text-sm text-gray-600">
                                    Página {(page?.number ?? 0) + 1} de{" "}
                                    {page?.totalPages ?? 1}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border disabled:opacity-50"
                                        disabled={!!page?.first}
                                        onClick={() =>
                                            load((page?.number ?? 0) - 1)
                                        }
                                    >
                                        ← Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border disabled:opacity-50"
                                        disabled={!!page?.last}
                                        onClick={() =>
                                            load((page?.number ?? 0) + 1)
                                        }
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* MODAL CREAR/EDITAR */}
            {formOpen && (
                <ClienteFormModal
                    isEdit={!!edit}
                    form={form}
                    setForm={setForm}
                    serverErrors={serverFieldErrors}
                    setServerErrors={setServerFieldErrors}
                    onClose={() => {
                        resetForm();
                        setFormOpen(false);
                    }}
                    onSubmit={onSubmit}
                />
            )}

            {/* MODAL VER MÁS */}
            {verMas && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={() => setVerMas(null)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-neutral-200/80 overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                                <h3 className="text-lg font-semibold">
                                    Detalles del Cliente
                                </h3>
                                <button
                                    type="button"
                                    className="text-gray-500 hover:text-gray-700 rounded p-1"
                                    onClick={() => setVerMas(null)}
                                    aria-label="Cerrar"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-neutral-800">
                                <Detail
                                    label="ID"
                                    value={formatId(verMas.idCliente)}
                                />
                                <Detail
                                    label="Nombre"
                                    value={verMas.razonSocialONombre}
                                />
                                <Detail label="NIT" value={verMas.nit || "—"} />
                                <Detail
                                    label="Teléfono"
                                    value={verMas.telefono || "—"}
                                />
                                <Detail
                                    label="Correo"
                                    value={
                                        verMas.correoElectronico || "—"
                                    }
                                />
                                <Detail
                                    label="Dirección"
                                    value={verMas.direccion || "—"}
                                />
                                <Detail
                                    label="Ciudad"
                                    value={verMas.ciudad || "—"}
                                />
                                <Detail
                                    label="Condición de Pago"
                                    value={
                                        verMas.condicionDePago
                                            ? verMas.condicionDePago ===
                                            "contado"
                                                ? "Contado"
                                                : "Crédito"
                                            : "—"
                                    }
                                />
                                <Detail
                                    label="Límite de Crédito"
                                    value={
                                        verMas.limiteCreditoBob != null
                                            ? money.format(
                                                Number(
                                                    verMas.limiteCreditoBob,
                                                ),
                                            )
                                            : "—"
                                    }
                                />
                                <Detail
                                    label="Estado"
                                    value={
                                        verMas.estadoActivo
                                            ? "Activo"
                                            : "Inactivo"
                                    }
                                />
                            </div>
                            <div className="flex flex-wrap md:flex-nowrap justify-end gap-2 px-6 py-4 border-t bg-white text-sm">
                                {canEditar && (
                                    <button
                                        type="button"
                                        className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium"
                                        onClick={() => {
                                            startEdit(verMas);
                                            setVerMas(null);
                                        }}
                                    >
                                        Editar
                                    </button>
                                )}
                                {canEliminar && (
                                    <button
                                        type="button"
                                        className="rounded-md bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-medium"
                                        onClick={() => {
                                            askDelete(verMas);
                                            setVerMas(null);
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="rounded-md border px-4 py-2 font-medium hover:bg-neutral-50"
                                    onClick={() => setVerMas(null)}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL CONFIRM ELIMINACIÓN */}
            <ConfirmModal
                open={confirmOpen && !!confirmObj}
                title="Eliminar cliente (borrado definitivo)"
                message={
                    <>
                        ¿Eliminar{" "}
                        <b>{confirmObj?.razonSocialONombre}</b>{" "}
                        de forma permanente?
                        <br />
                        <span className="text-neutral-600">
                            Esta acción no se puede deshacer.
                        </span>
                    </>
                }
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                kind="danger"
                loading={confirmBusy}
                onConfirm={doDelete}
                onClose={() => {
                    if (confirmBusy) return;
                    setConfirmOpen(false);
                    setConfirmObj(null);
                }}
            />
        </div>
    );
}

/* ===== Modal Form ===== */
function ClienteFormModal({
                              isEdit,
                              form,
                              setForm,
                              serverErrors,
                              setServerErrors,
                              onClose,
                              onSubmit,
                          }: {
    isEdit: boolean;
    form: Partial<Cliente>;
    setForm: React.Dispatch<React.SetStateAction<Partial<Cliente>>>;
    serverErrors: Record<string, string>;
    setServerErrors: React.Dispatch<
        React.SetStateAction<Record<string, string>>
    >;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}) {
    useLockBodyScroll(true);

    const overlayRef = useRef<HTMLDivElement | null>(null);
    const mouseDownOnOverlay = useRef(false);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
        mouseDownOnOverlay.current = e.target === overlayRef.current;
    };
    const handleMouseUp: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (mouseDownOnOverlay.current && e.target === overlayRef.current)
            onClose();
        mouseDownOnOverlay.current = false;
    };

    type Errors = Partial<Record<keyof Cliente | "limiteCreditoBob", string>>;
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [errorsClient, setErrorsClient] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);

    function validate(values: Partial<Cliente>): Errors {
        const e: Errors = {};
        if (
            !values.razonSocialONombre ||
            values.razonSocialONombre.trim().length < 2
        )
            e.razonSocialONombre = "Ingresa al menos 2 caracteres.";

        if (values.correoElectronico) {
            const rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!rx.test(values.correoElectronico.trim()))
                e.correoElectronico = "Correo no válido.";
        }
        if (values.telefono && values.telefono.trim().length < 6)
            e.telefono = "Demasiado corto. Mínimo 6 dígitos/caracteres.";

        if (
            values.limiteCreditoBob !== undefined &&
            values.limiteCreditoBob !== null &&
            values.limiteCreditoBob !== ""
        ) {
            const n = Number(values.limiteCreditoBob);
            if (!Number.isFinite(n))
                e.limiteCreditoBob = "Debe ser un número.";
            else if (n < 0) e.limiteCreditoBob = "No puede ser negativo.";
        }
        if (!values.condicionDePago)
            e.condicionDePago = "Selecciona una opción.";
        return e;
    }

    useEffect(() => {
        setErrorsClient(validate(form));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        form.razonSocialONombre,
        form.correoElectronico,
        form.telefono,
        form.limiteCreditoBob,
        form.condicionDePago,
    ]);

    function markTouched(name: string) {
        setTouched((t) => ({ ...t, [name]: true }));
    }

    // error final que se muestra para cada campo = error local || error servidor
    function mergedErrorFor(field: keyof Errors | string): string | undefined {
        return serverErrors[field] || (errorsClient as any)[field] || undefined;
    }

    const isValid =
        Object.keys({
            ...errorsClient,
            ...serverErrors,
        }).length === 0;

    function updateField(field: keyof Cliente | "limiteCreditoBob", value: any) {
        // limpiamos error de servidor de ese campo cuando el usuario lo toca
        setServerErrors((prev) => {
            const { [field]: _drop, ...rest } = prev;
            return rest;
        });
        setForm((f) => ({ ...f, [field]: value }));
    }

    const handleSubmit: React.FormEventHandler = (e) => {
        e.preventDefault();
        // marcar todos como tocados (para mostrar errors)
        setTouched({
            razonSocialONombre: true,
            nit: true,
            telefono: true,
            correoElectronico: true,
            direccion: true,
            ciudad: true,
            condicionDePago: true,
            limiteCreditoBob: true,
            estadoActivo: true,
        });

        const localErrors = validate(form);
        const combined = { ...localErrors, ...serverErrors };
        if (Object.keys(combined).length > 0) {
            return; // hay errores, no mandar submit real
        }

        setSubmitting(true);
        try {
            onSubmit(e as any);
        } finally {
            setTimeout(() => setSubmitting(false), 0);
        }
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[80] bg-black/50 overflow-y-auto"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            role="dialog"
            aria-modal="true"
        >
            <div className="min-h-full flex items-start justify-center px-4 py-10">
                <form
                    className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={handleSubmit}
                >
                    <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold tracking-wide">
                                {isEdit
                                    ? "Editar cliente"
                                    : "Agregar nuevo cliente"}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Los campos marcados con{" "}
                                <span className="text-rose-600">*</span> son
                                obligatorios.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700 rounded p-1"
                            onClick={onClose}
                            aria-label="Cerrar"
                            title="Cerrar (Esc)"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="px-6 py-5">
                        <div className="space-y-5 text-sm text-neutral-800">
                            <FieldPro
                                id="f-nombre"
                                label="Nombre"
                                required
                                placeholder="Razón social o nombre completo"
                                value={form.razonSocialONombre || ""}
                                error={
                                    touched.razonSocialONombre
                                        ? mergedErrorFor("razonSocialONombre")
                                        : mergedErrorFor("razonSocialONombre")
                                }
                                hint="Ej: 'Comercial Andina SRL' o 'Juan Pérez'."
                                onBlur={() => markTouched("razonSocialONombre")}
                                onChange={(v) =>
                                    updateField(
                                        "razonSocialONombre",
                                        v,
                                    )
                                }
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FieldPro
                                    label="NIT/CI"
                                    placeholder="Opcional"
                                    value={form.nit || ""}
                                    error={
                                        touched.nit
                                            ? mergedErrorFor("nit")
                                            : mergedErrorFor("nit")
                                    }
                                    onBlur={() => markTouched("nit")}
                                    onChange={(v) =>
                                        updateField("nit", v)
                                    }
                                />
                                <FieldPro
                                    label="Teléfono"
                                    placeholder="Ej: 76543210"
                                    value={form.telefono || ""}
                                    error={
                                        touched.telefono
                                            ? mergedErrorFor("telefono")
                                            : mergedErrorFor("telefono")
                                    }
                                    onBlur={() => markTouched("telefono")}
                                    onChange={(v) =>
                                        updateField("telefono", v)
                                    }
                                />
                            </div>

                            <FieldPro
                                label="Correo"
                                placeholder="nombre@dominio.com"
                                type="email"
                                value={form.correoElectronico || ""}
                                error={
                                    touched.correoElectronico
                                        ? mergedErrorFor(
                                            "correoElectronico",
                                        )
                                        : mergedErrorFor(
                                            "correoElectronico",
                                        )
                                }
                                onBlur={() =>
                                    markTouched(
                                        "correoElectronico",
                                    )
                                }
                                onChange={(v) =>
                                    updateField(
                                        "correoElectronico",
                                        v,
                                    )
                                }
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FieldPro
                                    label="Dirección"
                                    placeholder="Calle, número, zona…"
                                    value={form.direccion || ""}
                                    error={
                                        touched.direccion
                                            ? mergedErrorFor(
                                                "direccion",
                                            )
                                            : mergedErrorFor(
                                                "direccion",
                                            )
                                    }
                                    onBlur={() =>
                                        markTouched(
                                            "direccion",
                                        )
                                    }
                                    onChange={(v) =>
                                        updateField(
                                            "direccion",
                                            v,
                                        )
                                    }
                                />
                                <FieldPro
                                    label="Ciudad"
                                    placeholder="Ej: Santa Cruz"
                                    value={form.ciudad || ""}
                                    error={
                                        touched.ciudad
                                            ? mergedErrorFor(
                                                "ciudad",
                                            )
                                            : mergedErrorFor(
                                                "ciudad",
                                            )
                                    }
                                    onBlur={() =>
                                        markTouched("ciudad")
                                    }
                                    onChange={(v) =>
                                        updateField(
                                            "ciudad",
                                            v,
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-[15px] font-medium mb-1">
                                    Condición de Pago{" "}
                                    <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    className={[
                                        "mt-1 w-full border rounded-lg px-3 py-2 outline-none text-sm",
                                        "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
                                    ].join(" ")}
                                    value={form.condicionDePago || "contado"}
                                    onChange={(e) =>
                                        updateField(
                                            "condicionDePago",
                                            e.target.value as any,
                                        )
                                    }
                                    onBlur={() =>
                                        markTouched(
                                            "condicionDePago",
                                        )
                                    }
                                >
                                    <option value="contado">Contado</option>
                                    <option value="credito">Crédito</option>
                                </select>
                                <div className="mt-1 text-xs">
                                    {touched.condicionDePago
                                        ? mergedErrorFor(
                                        "condicionDePago",
                                    ) && (
                                        <span className="text-rose-600">
                                                  {mergedErrorFor(
                                                      "condicionDePago",
                                                  )}
                                              </span>
                                    )
                                        : mergedErrorFor(
                                        "condicionDePago",
                                    ) && (
                                        <span className="text-rose-600">
                                                  {mergedErrorFor(
                                                      "condicionDePago",
                                                  )}
                                              </span>
                                    )}
                                    {!mergedErrorFor(
                                        "condicionDePago",
                                    ) && (
                                        <span className="text-gray-500">
                                            Condición de pago por defecto.
                                        </span>
                                    )}
                                </div>
                            </div>

                            <FieldPro
                                label="Límite de Crédito (BOB)"
                                type="number"
                                min={0}
                                step="1"
                                placeholder="Ej: 10000 (opcional)"
                                value={
                                    form.limiteCreditoBob != null
                                        ? String(form.limiteCreditoBob)
                                        : ""
                                }
                                error={
                                    touched.limiteCreditoBob
                                        ? mergedErrorFor(
                                            "limiteCreditoBob",
                                        )
                                        : mergedErrorFor(
                                            "limiteCreditoBob",
                                        )
                                }
                                onBlur={() =>
                                    markTouched(
                                        "limiteCreditoBob",
                                    )
                                }
                                onChange={(v) =>
                                    updateField(
                                        "limiteCreditoBob",
                                        v === ""
                                            ? undefined
                                            : Number(v),
                                    )
                                }
                            />

                            <div className="flex items-center gap-3 pt-2">
                                <input
                                    id="f-activo"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-400"
                                    checked={!!form.estadoActivo}
                                    onChange={(e) =>
                                        updateField(
                                            "estadoActivo",
                                            e.target.checked,
                                        )
                                    }
                                />
                                <label
                                    htmlFor="f-activo"
                                    className="text-[15px]"
                                >
                                    Activo
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t bg-white flex items-center justify-end gap-2">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-neutral-50"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !isValid}
                            className={[
                                "px-5 py-2 rounded-lg text-white font-semibold text-sm",
                                submitting || !isValid
                                    ? "bg-emerald-400 cursor-not-allowed opacity-70"
                                    : "bg-emerald-600 hover:bg-emerald-700",
                            ].join(" ")}
                        >
                            {isEdit ? "Guardar" : "Crear"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ===== Field / Detail / Pill ===== */
function FieldPro({
                      id,
                      label,
                      required = false,
                      type = "text",
                      value,
                      placeholder,
                      error,
                      hint,
                      min,
                      step,
                      onChange,
                      onBlur,
                  }: {
    id?: string;
    label: string;
    required?: boolean;
    type?: string;
    value: string;
    placeholder?: string;
    error?: string;
    hint?: string;
    min?: number;
    step?: string | number;
    onChange: (v: string) => void;
    onBlur?: () => void;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="block text-[15px] font-medium mb-1"
            >
                {label}{" "}
                {required && (
                    <span className="text-rose-600">*</span>
                )}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                min={min}
                step={step as any}
                className={[
                    "w-full rounded-lg px-3 py-2 border outline-none text-sm",
                    error
                        ? "border-rose-400 focus:ring-2 focus:ring-rose-500"
                        : "border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
                ].join(" ")}
            />
            <div className="mt-1 text-xs">
                {error ? (
                    <span className="text-rose-600">{error}</span>
                ) : hint ? (
                    <span className="text-gray-500">{hint}</span>
                ) : null}
            </div>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                {label}
            </div>
            <div className="text-sm mt-1 text-neutral-800 break-words">
                {value}
            </div>
        </div>
    );
}

function Pill({ ok, text }: { ok: boolean; text: string }) {
    return (
        <span
            className={[
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                ok
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700",
            ].join(" ")}
        >
            {text}
        </span>
    );
}
