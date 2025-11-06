import { useEffect, useMemo, useState, type ReactNode } from "react";
import { sucursalService } from "@/servicios/sucursal";
import type { Page } from "@/types/pagination";
import type { Sucursal, SucursalCreate, SucursalUpdate } from "@/types/sucursal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/servicios/httpClient";
import {
    Pencil,
    Trash2,
    Plus,
    Search,
    Check,
    X,
    Building2,
    MapPin,
    Landmark,
    Loader2,
    AlertTriangle,
} from "lucide-react";

/* ========= Toggle mini ========= */
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
                value ? "bg-emerald-400/90 border-emerald-500" : "bg-rose-400/90 border-rose-500",
            ].join(" ")}
        >
      <span className={["absolute left-1.5 text-white transition-opacity", value ? "opacity-100" : "opacity-0"].join(" ")}>
        <Check size={12} />
      </span>
            <span className={["absolute right-1.5 text-white transition-opacity", !value ? "opacity-100" : "opacity-0"].join(" ")}>
        <X size={12} />
      </span>
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

/* ========= Modal base ========= */
function Modal({
                   open,
                   title,
                   icon,
                   description,
                   onClose,
                   children,
                   width = "max-w-xl",
               }: {
    open: boolean;
    title: string;
    icon?: ReactNode;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    width?: string;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/35" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-3">
                <div className={`w-full ${width} bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden`}>
                    <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {icon && <span className="text-emerald-600">{icon}</span>}
                            <div className="flex flex-col">
                                <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
                                {description && <p className="text-[12px] text-neutral-500">{description}</p>}
                            </div>
                        </div>
                        <button className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500" onClick={onClose} aria-label="Cerrar">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

/* ========= Modal confirm ========= */
function ConfirmModal({
                          open,
                          title,
                          message,
                          confirmLabel = "Confirmar",
                          cancelLabel = "Cancelar",
                          kind = "default",
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
        <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/35" onClick={() => !loading && onClose()} />
            <div className="absolute inset-0 flex items-center justify-center p-3">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className={kind === "danger" ? "text-rose-600" : "text-amber-600"} size={20} />
                            <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
                        </div>
                        <button className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500" onClick={onClose} disabled={loading} aria-label="Cerrar">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="px-4 py-4 text-[14px] text-neutral-700 leading-relaxed">{message}</div>
                    <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                        <button className="px-3 h-9 rounded-md border bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-60" onClick={onClose} disabled={loading}>
                            {cancelLabel}
                        </button>
                        <button
                            className={[
                                "px-3 h-9 rounded-md font-medium text-white disabled:opacity-60 inline-flex items-center gap-2",
                                kind === "danger" ? "bg-rose-600 hover:bg-rose-700" : kind === "warn" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700",
                            ].join(" ")}
                            onClick={onConfirm}
                            disabled={loading}
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            <span>{confirmLabel}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ========= Mini toast ========= */
function useNotify() {
    const [note, setNote] = useState<{ type: "info" | "success" | "error"; message: string } | null>(null);
    useEffect(() => {
        if (!note) return;
        const t = setTimeout(() => setNote(null), 4200);
        return () => clearTimeout(t);
    }, [note]);
    return {
        note,
        notify: (type: "info" | "success" | "error", message: string) => setNote({ type, message }),
        clear: () => setNote(null),
    };
}

function Toast({ note, clear }: { note: { type: "info" | "success" | "error"; message: string } | null; clear: () => void }) {
    if (!note) return null;
    const color = note.type === "error" ? "bg-rose-600" : note.type === "success" ? "bg-emerald-600" : "bg-neutral-800";
    return (
        <div className="fixed bottom-4 right-4 z-[90]">
            <div className={`${color} text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-[360px]`}>
                {note.type === "error" ? <AlertTriangle size={18} /> : <Check size={18} />}
                <div className="text-sm leading-5">{note.message}</div>
                <button onClick={clear} className="ml-2 opacity-80 hover:opacity-100">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

/* ========= Formulario ========= */
function SucursalForm({
                          mode,
                          initial,
                          onSubmit,
                          onCancel,
                      }: {
    mode: "create" | "edit";
    initial?: Partial<Sucursal> | Partial<SucursalCreate>;
    onSubmit: (payload: SucursalCreate | SucursalUpdate) => Promise<void>;
    onCancel: () => void;
}) {
    const isCreate = mode === "create";

    const [form, setForm] = useState({
        nombreSucursal: (initial?.nombreSucursal as string) ?? "",
        direccion: (initial?.direccion as string) ?? "",
        ciudad: (initial?.ciudad as string) ?? "",
        estadoActivo: (initial?.estadoActivo as boolean) ?? true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [submitErr, setSubmitErr] = useState<string | null>(null);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.nombreSucursal.trim()) e.nombreSucursal = "Requerido";
        if (!form.ciudad.trim()) e.ciudad = "Requerido";
        if (!form.direccion.trim()) e.direccion = "Requerido";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setSubmitErr(null);
        if (!validate()) return;
        setBusy(true);
        try {
            await onSubmit({
                nombreSucursal: form.nombreSucursal.trim(),
                direccion: form.direccion.trim(),
                ciudad: form.ciudad.trim(),
                estadoActivo: !!form.estadoActivo,
            });
        } catch (e: any) {
            setSubmitErr(e?.message || "No se pudo guardar.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre (2 col) */}
                <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1">
                        <Building2 size={16} className="text-emerald-600" />
                        Nombre de la sucursal
                    </label>
                    <input
                        className="w-full sm:max-w-[420px] border rounded-lg px-3 py-2 bg-white/90 placeholder-neutral-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="p. ej., Sucursal Central"
                        value={form.nombreSucursal}
                        onChange={(e) => setForm((f) => ({ ...f, nombreSucursal: e.target.value }))}
                    />
                    {errors.nombreSucursal && <p className="text-xs text-rose-600 mt-1">{errors.nombreSucursal}</p>}
                </div>

                {/* Ciudad */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1">
                        <Landmark size={16} className="text-emerald-600" />
                        Ciudad
                    </label>
                    <input
                        className="w-full sm:max-w-[220px] border rounded-lg px-3 py-2 bg-white/90 placeholder-neutral-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Santa Cruz"
                        value={form.ciudad}
                        onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                    />
                    {errors.ciudad && <p className="text-xs text-rose-600 mt-1">{errors.ciudad}</p>}
                </div>

                {/* Estado */}
                <div className="flex items-end">
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            className="accent-emerald-600"
                            checked={!!form.estadoActivo}
                            onChange={(e) => setForm((f) => ({ ...f, estadoActivo: e.target.checked }))}
                        />
                        <span className="text-sm text-neutral-800">Activo</span>
                    </label>
                </div>

                {/* Dirección (2 col) */}
                <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1">
                        <MapPin size={16} className="text-emerald-600" />
                        Dirección
                    </label>
                    <input
                        className="w-full sm:max-w-[520px] border rounded-lg px-3 py-2 bg-white/90 placeholder-neutral-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Av. Siempre Viva 123"
                        value={form.direccion}
                        onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                    />
                    {errors.direccion && <p className="text-xs text-rose-600 mt-1">{errors.direccion}</p>}
                </div>
            </div>

            {submitErr && (
                <div className="text-rose-600 text-sm border border-rose-200 bg-rose-50 rounded px-3 py-2">
                    {submitErr}
                </div>
            )}

            <div className="flex gap-2 pt-1">
                <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    <span>{isCreate ? "Crear sucursal" : "Guardar cambios"}</span>
                </button>
                <button type="button" onClick={onCancel} className="h-10 px-4 rounded-lg border border-neutral-300 hover:bg-neutral-50">
                    Cancelar
                </button>
            </div>
        </form>
    );
}

export default function SucursalesList() {
    const { user } = useAuth() as { user?: any };

    /* ===== permisos ===== */
    const can = useMemo(() => {
        const perms: string[] = Array.isArray(user?.permisos) ? user.permisos : [];
        const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
        const isAdmin = roles.some((r) => String(r).toUpperCase().includes("ADMIN"));
        return (perm: string) => isAdmin || perms.includes(perm);
    }, [user]);

    const canVer = can("sucursales:ver");
    const canCrear = can("sucursales:crear");
    const canEditar = can("sucursales:actualizar");
    const canCambiarEstado = canEditar; // no granular
    const canEliminar = can("sucursales:eliminar");

    const show403 = (message = "No tienes permiso para realizar esta acción.") => {
        window.dispatchEvent(new CustomEvent("auth:forbidden", { detail: { source: "SucursalesList", message } }));
    };

    const { note, notify, clear } = useNotify();

    /* ===== listado/estado ===== */
    const [data, setData] = useState<Page<Sucursal> | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [mostrarInactivas, setMostrarInactivas] = useState(false);

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    const fetchList = async () => {
        if (!canVer) {
            setErr("Acceso denegado.");
            setData(null);
            show403("No tienes permiso para ver sucursales.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const res = await sucursalService.list({
                q: debouncedQ || undefined,
                incluirInactivos: mostrarInactivas ? true : undefined,
                page,
                size,
            } as any);
            setData(res);
        } catch (e: any) {
            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
                setErr("Acceso denegado.");
                setData(null);
                show403("No tienes permiso para ver sucursales.");
            } else {
                setErr(e?.message || "Error cargando sucursales.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQ, mostrarInactivas, page, size, canVer]);

    /* ===== modales crear/editar ===== */
    const [createOpen, setCreateOpen] = useState(false);
    const [editRow, setEditRow] = useState<Sucursal | null>(null);

    useEffect(() => {
        if (createOpen && !canCrear) setCreateOpen(false);
        if (editRow && !canEditar) setEditRow(null);
    }, [createOpen, editRow, canCrear, canEditar]);

    /* ===== confirmaciones ===== */
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [confirmKind, setConfirmKind] = useState<"desactivar" | "eliminar">("desactivar");
    const [confirmItem, setConfirmItem] = useState<Sucursal | null>(null);

    const askDesactivar = (s: Sucursal) => {
        if (!canCambiarEstado) return show403("No tienes permiso para cambiar el estado.");
        setConfirmKind("desactivar");
        setConfirmItem(s);
        setConfirmOpen(true);
    };
    const askEliminar = (s: Sucursal) => {
        if (!canEliminar) return show403("No tienes permiso para eliminar.");
        setConfirmKind("eliminar");
        setConfirmItem(s);
        setConfirmOpen(true);
    };

    const doConfirm = async () => {
        const s = confirmItem!;
        setConfirmBusy(true);
        try {
            if (confirmKind === "desactivar") {
                await sucursalService.toggleActivo(s.idSucursal, false);
                notify("success", "Sucursal desactivada.");
            } else {
                await sucursalService.remove(s.idSucursal);
                notify("success", "Sucursal eliminada.");
            }
            setConfirmOpen(false);
            setConfirmItem(null);
            if (editRow?.idSucursal === s.idSucursal) setEditRow(null);
            await fetchList();
        } catch (e: any) {
            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
                show403(confirmKind === "eliminar" ? "No tienes permiso para eliminar." : "No tienes permiso para cambiar el estado.");
            }
            if ((e instanceof ApiError && (e.status === 409 || e.status === 500)) || e?.status === 409 || e?.status === 500) {
                notify("error", "No se puede eliminar la sucursal. Puede estar en uso por otros recursos.");
            } else if (!((e instanceof ApiError && e.status === 403) || e?.status === 403)) {
                notify("error", e?.message || "Operación no realizada.");
            }
            setConfirmOpen(false);
            setConfirmItem(null);
        } finally {
            setConfirmBusy(false);
        }
    };

    const onActivar = async (s: Sucursal) => {
        if (!canCambiarEstado) return show403("No tienes permiso para cambiar el estado.");
        try {
            await sucursalService.toggleActivo(s.idSucursal, true);
            notify("success", "Sucursal activada.");
            await fetchList();
        } catch (e: any) {
            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) return show403("No tienes permiso para cambiar el estado.");
            notify("error", e?.message || "No se pudo activar.");
        }
    };

    if (!canVer) {
        return (
            <div className="p-6">
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
                    No tienes permiso para ver sucursales.
                </div>
            </div>
        );
    }

    const rows = data?.content ?? [];
    const badge =
        "inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-[2px] text-[12px] font-medium";

    return (
        <div className="p-6 space-y-6">
            {/* Header estilo Monedas */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Sucursales</h1>

                    <div className="flex items-center gap-3">
                        {/* Buscador */}
                        <div className="relative w-64">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                <Search size={18} />
              </span>
                            <input
                                value={q}
                                onChange={(e) => {
                                    setQ(e.target.value);
                                    setPage(0);
                                }}
                                placeholder="Buscar sucursal…"
                                className="border rounded-md w-full bg-gray-50 pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>

                        {/* Nueva sucursal */}
                        {canCrear && (
                            <button
                                onClick={() => setCreateOpen(true)}
                                className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                title="Nueva sucursal"
                            >
                                <Plus size={18} /> Nueva
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtro: mostrar inactivas (en su propia fila, a la derecha) */}
                <div className="mt-4 flex items-center justify-end gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-600"
                            checked={mostrarInactivas}
                            onChange={(e) => {
                                setMostrarInactivas(e.target.checked);
                                setPage(0);
                            }}
                        />
                        Mostrar sucursales inactivas
                    </label>
                </div>
            </div>

            {/* Lista */}
            {err && <div className="text-red-600 mb-3 border border-red-200 bg-red-50 rounded px-3 py-2 text-sm">{err}</div>}
            {loading ? (
                <div className="bg-white rounded-xl p-4 shadow-sm">Cargando…</div>
            ) : (
                <div className="space-y-3">
                    <div className="hidden md:grid w-full grid-cols-[1.1fr_1.4fr_1fr_0.8fr_160px] items-center text-xs uppercase text-neutral-500 px-3">
                        <div>Nombre</div>
                        <div>Dirección</div>
                        <div>Ciudad</div>
                        <div>Estado</div>
                        <div className="text-right pr-1">Acciones</div>
                    </div>

                    {rows.length ? (
                        rows.map((s) => (
                            <div
                                key={s.idSucursal}
                                className={[
                                    "grid grid-cols-1 md:grid-cols-[1.1fr_1.4fr_1fr_0.8fr_160px] items-start md:items-center gap-2",
                                    "bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition",
                                    !s.estadoActivo ? "opacity-60" : "",
                                ].join(" ")}
                            >
                                <div className="font-semibold text-neutral-800">
                                    <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Nombre</span>
                                    {s.nombreSucursal}
                                </div>

                                <div className="text-neutral-800 break-words">
                                    <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Dirección</span>
                                    {s.direccion || "—"}
                                </div>

                                <div className="text-neutral-800">
                                    <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Ciudad</span>
                                    {s.ciudad || "—"}
                                </div>

                                <div className="text-neutral-800">
                                    <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Estado</span>
                                    <span className={badge}>{s.estadoActivo ? "Activo" : "Inactivo"}</span>
                                </div>

                                <div className="flex items-center justify-end gap-1.5">
                                    {canCambiarEstado && (
                                        <ActiveToggleMini
                                            value={!!s.estadoActivo}
                                            title={s.estadoActivo ? "Desactivar" : "Activar"}
                                            onToggle={(next) => {
                                                if (next) onActivar(s);
                                                else askDesactivar(s);
                                            }}
                                        />
                                    )}

                                    {canEditar && (
                                        <button
                                            aria-label="Editar"
                                            title="Editar"
                                            onClick={() => setEditRow(s)}
                                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                    )}

                                    {canEliminar && (
                                        <button
                                            aria-label="Eliminar"
                                            title="Eliminar"
                                            onClick={() => askEliminar(s)}
                                            className="p-1.5 rounded-md hover:bg-neutral-100 text-rose-600 hover:text-rose-700"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">Sin registros</div>
                    )}
                </div>
            )}

            {/* Paginación estilo Monedas */}
            <div className="flex flex-wrap items-center gap-2">
                <button className="border rounded px-3 py-1" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                    Anterior
                </button>
                <span>
          Página {data ? data.number + 1 : page + 1} de {data ? data.totalPages : 1}
        </span>
                <button className="border rounded px-3 py-1" disabled={!data || data.last} onClick={() => setPage((p) => p + 1)}>
                    Siguiente
                </button>

                <select
                    className="border rounded px-2 py-1 ml-auto"
                    value={size}
                    onChange={(e) => {
                        setPage(0);
                        setSize(Number(e.target.value));
                    }}
                >
                    {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                            {n} por página
                        </option>
                    ))}
                </select>
            </div>

            {/* Modal crear */}
            <Modal
                open={createOpen}
                title="Nueva sucursal"
                description="Registra una nueva sucursal."
                icon={<Building2 size={20} />}
                onClose={() => setCreateOpen(false)}
            >
                <SucursalForm
                    mode="create"
                    onCancel={() => setCreateOpen(false)}
                    onSubmit={async (payload) => {
                        try {
                            if (!canCrear) return show403("No tienes permiso para crear.");
                            await sucursalService.create(payload as SucursalCreate);
                            setCreateOpen(false);
                            setPage(0);
                            await fetchList();
                            notify("success", "Sucursal creada.");
                        } catch (e: any) {
                            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) return show403();
                            throw e;
                        }
                    }}
                />
            </Modal>

            {/* Modal editar */}
            <Modal
                open={!!editRow}
                title="Editar sucursal"
                description="Actualiza los datos de la sucursal."
                icon={<Pencil size={20} />}
                onClose={() => setEditRow(null)}
            >
                {editRow && (
                    <SucursalForm
                        mode="edit"
                        initial={editRow}
                        onCancel={() => setEditRow(null)}
                        onSubmit={async (payload) => {
                            try {
                                if (!canEditar) return show403("No tienes permiso para actualizar.");
                                await sucursalService.update(editRow.idSucursal, payload as SucursalUpdate);
                                setEditRow(null);
                                await fetchList();
                                notify("success", "Sucursal actualizada.");
                            } catch (e: any) {
                                if ((e instanceof ApiError && e.status === 403) || e?.status === 403) return show403();
                                throw e;
                            }
                        }}
                    />
                )}
            </Modal>

            {/* Confirmaciones */}
            <ConfirmModal
                open={confirmOpen && !!confirmItem}
                title={confirmKind === "eliminar" ? "Eliminar sucursal" : "Desactivar sucursal"}
                message={
                    confirmKind === "eliminar" ? (
                        <>
                            ¿Eliminar <b>{confirmItem?.nombreSucursal}</b> permanentemente?
                            <br />
                            <span className="text-neutral-600">Esta acción no se puede deshacer.</span>
                        </>
                    ) : (
                        <>
                            ¿Desactivar <b>{confirmItem?.nombreSucursal}</b>?
                            <br />
                            <span className="text-neutral-600">No se eliminará; podrás activarla de nuevo cuando quieras.</span>
                        </>
                    )
                }
                confirmLabel={confirmKind === "eliminar" ? "Eliminar" : "Desactivar"}
                cancelLabel="Cancelar"
                kind={confirmKind === "eliminar" ? "danger" : "warn"}
                loading={confirmBusy}
                onConfirm={doConfirm}
                onClose={() => {
                    if (confirmBusy) return;
                    setConfirmOpen(false);
                    setConfirmItem(null);
                }}
            />

            {/* Toast */}
            <Toast note={note} clear={clear} />
        </div>
    );
}
