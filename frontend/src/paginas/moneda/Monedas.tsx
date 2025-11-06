// src/paginas/catalogo/Monedas.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { monedaService } from "@/servicios/moneda";
import type { Moneda } from "@/types/moneda";
import type { Page } from "@/types/pagination";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/servicios/httpClient";
import { Pencil, Trash2, Check, X, Search, ShieldAlert, Plus } from "lucide-react";

const DEFAULT_SORT = "nombreMoneda,asc";

type FormState = {
    codigo: string;
    nombre: string;
    tasa: string; // string para el input; se convierte antes de enviar
    esLocal: boolean;
};

/* ========= Toggle compacto ========= */
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

/* ========= Modal genérico de confirmación ========= */
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
        <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/35" onClick={() => !loading && onClose()} />
            <div className="absolute inset-0 flex items-center justify-center p-3">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
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
                                "px-3 h-9 rounded-md font-medium text-white disabled:opacity-60",
                                kind === "danger" ? "bg-rose-600 hover:bg-rose-700" : kind === "warn" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700",
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

/* ========= Modal Crear/Editar Moneda ========= */
function MonedaModal({
                         open,
                         mode,
                         moneda,
                         canCrear,
                         canEditar,
                         onClose,
                         onSaved,
                     }: {
    open: boolean;
    mode: "create" | "edit";
    moneda?: Moneda | null;
    canCrear: boolean;
    canEditar: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = mode === "edit";
    const [form, setForm] = useState<FormState>(() =>
        isEdit && moneda
            ? { codigo: moneda.codigo, nombre: moneda.nombre, tasa: moneda.esLocal ? "" : String(moneda.tasaCambioRespectoLocal ?? ""), esLocal: !!moneda.esLocal }
            : { codigo: "", nombre: "", tasa: "", esLocal: false }
    );
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isEdit && moneda) {
            setForm({ codigo: moneda.codigo, nombre: moneda.nombre, tasa: moneda.esLocal ? "" : String(moneda.tasaCambioRespectoLocal ?? ""), esLocal: !!moneda.esLocal });
        } else {
            setForm({ codigo: "", nombre: "", tasa: "", esLocal: false });
        }
    }, [isEdit, moneda, open]);

    const show403 = (message = "No tienes permiso para realizar esta acción.") => {
        window.dispatchEvent(new CustomEvent("auth:forbidden", { detail: { source: "MonedasPage", message } }));
    };

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (isEdit && !canEditar) return show403();
        if (!isEdit && !canCrear) return show403();

        const codigo = (form.codigo ?? "").trim().toUpperCase();
        const nombre = (form.nombre ?? "").trim();
        const tasaStr = (form.tasa ?? "").trim();

        if (!codigo || !nombre) {
            alert("Código y nombre son obligatorios");
            return;
        }

        let tasaNum: number | null = null;
        if (!form.esLocal && tasaStr) {
            tasaNum = Number(tasaStr);
            if (Number.isNaN(tasaNum) || tasaNum <= 0) {
                alert("Tipo de cambio inválido");
                return;
            }
        }

        const payload: any = {
            codigo,
            nombre,
            esLocal: !!form.esLocal,
            ...(isEdit && moneda ? { estadoActivo: moneda.estadoActivo } : {}),
            ...(form.esLocal ? { tasaCambioRespectoLocal: null } : { tasaCambioRespectoLocal: tasaNum ?? undefined }),
        };

        try {
            setSaving(true);
            if (isEdit && moneda) {
                await monedaService.update(moneda.idMoneda, payload);
            } else {
                await monedaService.create(payload);
            }
            onSaved();
            onClose();
        } catch (e: any) {
            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) return show403();
            alert(e?.message || "No se pudo guardar");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
            <div className="absolute inset-0 flex items-start justify-center p-4 md:p-6">
                <form
                    onSubmit={onSubmit}
                    className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{isEdit ? "Editar moneda" : "Nueva moneda"}</h3>
                            {!isEdit && <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Completa los datos</span>}
                        </div>
                        <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500" aria-label="Cerrar" disabled={saving}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-5 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                        {/* Código */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Código <span className="text-rose-600">*</span>
                            </label>
                            <input
                                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Ej.: USD"
                                value={form.codigo}
                                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase().slice(0, 10) }))}
                            />
                            <p className="text-[12px] text-neutral-500 mt-1">Usa el código de la moneda, preferentemente ISO (ej.: USD, EUR, BOB).</p>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Nombre <span className="text-rose-600">*</span>
                            </label>
                            <input
                                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Ej.: Dólar estadounidense"
                                value={form.nombre}
                                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                            />
                            <p className="text-[12px] text-neutral-500 mt-1">Nombre legible de la moneda.</p>
                        </div>

                        {/* Tasa */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de cambio</label>
                            <input
                                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-50"
                                placeholder={form.esLocal ? "1.00 (fijo para moneda local)" : "Ej.: 6.96"}
                                value={form.tasa}
                                onChange={(e) => setForm((f) => ({ ...f, tasa: e.target.value }))}
                                disabled={form.esLocal}
                            />
                            <p className="text-[12px] text-neutral-500 mt-1">
                                Para monedas no locales, ingresa la tasa respecto a la moneda local. Debe ser &gt; 0.
                            </p>
                        </div>

                        {/* Es local */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Es moneda local</label>
                            <select
                                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                value={form.esLocal ? "si" : "no"}
                                onChange={(e) => setForm((f) => ({ ...f, esLocal: e.target.value === "si", tasa: e.target.value === "si" ? "" : f.tasa }))}
                            >
                                <option value="no">No</option>
                                <option value="si">Sí</option>
                            </select>
                            <p className="text-[12px] text-neutral-500 mt-1">Debe existir siempre una moneda local en el sistema.</p>
                        </div>
                    </div>

                    <div className="px-5 py-3 border-t flex items-center justify-end gap-2 sticky bottom-0 bg-white">
                        <button type="button" onClick={onClose} className="px-3 h-9 rounded-md border border-neutral-300 hover:bg-neutral-50">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || (isEdit ? !canEditar : !canCrear)}
                            className="px-3 h-9 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {isEdit ? "Guardar cambios" : "Crear moneda"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function MonedasPage() {
    const { can } = useAuth() as { can: (perm: string) => boolean };

    // permisos
    const canVer = can("monedas:ver");
    const canCrear = can("monedas:crear");
    const canEditar = can("monedas:actualizar");
    const canCambiarEstado = can("monedas:cambiar-estado");
    const canEliminar = can("monedas:eliminar");

    const show403 = (message = "No tienes permiso para realizar esta acción.") => {
        window.dispatchEvent(new CustomEvent("auth:forbidden", { detail: { source: "MonedasPage", message } }));
    };

    // filtros
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [mostrarInactivas, setMostrarInactivas] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    // paginación / orden
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [sort] = useState(DEFAULT_SORT);

    // datos
    const [data, setData] = useState<Page<Moneda> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // modal crear/editar
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [selected, setSelected] = useState<Moneda | null>(null);

    // confirm
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmKind, setConfirmKind] = useState<"eliminar" | "desactivar">("eliminar");
    const [confirmItem, setConfirmItem] = useState<Moneda | null>(null);
    const [confirmBusy, setConfirmBusy] = useState(false);

    // activos param: undefined=todas; true=solo activas
    const activosParam = useMemo(() => (mostrarInactivas ? undefined : true), [mostrarInactivas]);

    const cargar = () => {
        if (!canVer) {
            setErr("Acceso denegado.");
            setData(null);
            show403("No tienes permiso para ver monedas.");
            return;
        }
        setLoading(true);
        setErr(null);
        monedaService
            .list({ q: debouncedQ || undefined, activos: activosParam, page, size, sort })
            .then(setData)
            .catch((e: any) => {
                if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
                    setErr("Acceso denegado.");
                    setData(null);
                    show403("No tienes permiso para ver monedas.");
                } else {
                    setErr(e?.message || "Error cargando monedas");
                }
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQ, activosParam, page, size, sort, canVer]);

    // acciones
    const openCreate = () => {
        if (!canCrear) return show403();
        setSelected(null);
        setModalMode("create");
        setModalOpen(true);
    };

    const openEdit = (m: Moneda) => {
        if (!canEditar) return show403();
        setSelected(m);
        setModalMode("edit");
        setModalOpen(true);
    };

    async function onToggleActivo(m: Moneda) {
        if (!canCambiarEstado) return show403();
        try {
            await monedaService.toggleActivo(m.idMoneda, !m.estadoActivo);
            await cargar();
        } catch (e: any) {
            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) return show403();
            alert(e?.message || "No se pudo cambiar el estado");
        }
    }

    const askEliminar = (m: Moneda) => {
        if (!canEliminar) return show403();
        setConfirmKind("eliminar");
        setConfirmItem(m);
        setConfirmOpen(true);
    };
    const askDesactivar = (m: Moneda) => {
        if (!canCambiarEstado) return show403();
        setConfirmKind("desactivar");
        setConfirmItem(m);
        setConfirmOpen(true);
    };

    const doConfirm = async () => {
        if (!confirmItem) return;
        setConfirmBusy(true);
        try {
            if (confirmKind === "eliminar") {
                await monedaService.remove(confirmItem.idMoneda);
                if (selected?.idMoneda === confirmItem.idMoneda) {
                    setModalOpen(false);
                    setSelected(null);
                }
            } else {
                await monedaService.toggleActivo(confirmItem.idMoneda, false);
            }
            setConfirmOpen(false);
            setConfirmItem(null);
            cargar();
        } catch (e: any) {
            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
                show403();
                setConfirmOpen(false);
                setConfirmItem(null);
            } else if ((e instanceof ApiError && e.status === 409) || e?.status === 409) {
                alert("No se puede eliminar la moneda porque está en uso.");
            } else if ((e instanceof ApiError && e.status === 400) || e?.status === 400) {
                alert(e?.message ?? "Operación no permitida (moneda local).");
            } else {
                alert(e?.message ?? "Operación no realizada.");
            }
        } finally {
            setConfirmBusy(false);
        }
    };

    // autocerrar confirm si cambian permisos
    useEffect(() => {
        if (!confirmOpen || !confirmItem) return;
        if (confirmKind === "eliminar" && !canEliminar) {
            setConfirmOpen(false);
            setConfirmItem(null);
            show403();
        }
        if (confirmKind === "desactivar" && !canCambiarEstado) {
            setConfirmOpen(false);
            setConfirmItem(null);
            show403();
        }
    }, [confirmOpen, confirmKind, confirmItem, canEliminar, canCambiarEstado]);

    if (!canVer) {
        return (
            <div className="p-6">
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm flex items-center gap-2">
                    <ShieldAlert size={16} /> No tienes permiso para ver monedas.
                </div>
            </div>
        );
    }

    const rows = (data?.content ?? []) as Moneda[];
    const badgeClass = (ok: boolean) =>
        ok
            ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-[2px] text-[12px] font-medium"
            : "inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-[2px] text-[12px] font-medium";

    return (
        <div className="p-6 space-y-6">
            {/* Encabezado + búsqueda + nuevo */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Monedas</h1>
                <div className="flex items-center gap-3">
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
                            placeholder="Buscar moneda…"
                            className="border rounded-md w-full bg-gray-50 pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    {canCrear && (
                        <button
                            className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={openCreate}
                            title="Nueva moneda"
                        >
                            <Plus size={18} /> Nueva
                        </button>
                    )}
                </div>
            </div>

            {/* Filtro: mostrar inactivas */}
            <div className="flex items-center justify-end gap-4">
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
                    Mostrar monedas inactivas
                </label>
            </div>

            {/* Lista (MISMO tamaño/columnas que tenías) */}
            {loading ? (
                <div className="p-4 text-sm text-gray-600">Cargando…</div>
            ) : err ? (
                <div className="text-red-600 text-sm mb-2 border border-red-200 bg-red-50 rounded px-3 py-2">{err}</div>
            ) : (
                <div className="space-y-3">
                    <div className="hidden md:grid w-full grid-cols-[0.8fr_1.2fr_0.8fr_0.6fr_0.6fr_160px] items-center text-xs uppercase text-neutral-500 px-3">
                        <div>Moneda</div>
                        <div>Nombre</div>
                        <div>Tipo cambio</div>
                        <div>Local</div>
                        <div>Estado</div>
                        <div className="text-right pr-1">Acciones</div>
                    </div>

                    {rows.length ? (
                        rows.map((m, i) => {
                            const disableDeactivate = !!m.esLocal && !!m.estadoActivo; // local activa no se desactiva
                            return (
                                <div
                                    key={m.idMoneda ?? m.codigo ?? i}
                                    className={[
                                        "grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr_0.8fr_0.6fr_0.6fr_160px] items-center gap-2",
                                        "bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition",
                                        !m.estadoActivo ? "opacity-60" : "",
                                    ].join(" ")}
                                >
                                    <div className="font-semibold truncate">{m.codigo}</div>
                                    <div className="truncate">{m.nombre}</div>
                                    <div>{m.esLocal ? 1 : m.tasaCambioRespectoLocal ?? "—"}</div>
                                    <div>
                                        <span className={badgeClass(!!m.esLocal)}>{m.esLocal ? "Sí" : "No"}</span>
                                    </div>
                                    <div>
                    <span
                        className={
                            m.estadoActivo
                                ? "px-2 py-1 rounded text-[11px] font-medium bg-green-100 text-green-700"
                                : "px-2 py-1 rounded text-[11px] font-medium bg-gray-200 text-gray-700"
                        }
                    >
                      {m.estadoActivo ? "Activo" : "Inactivo"}
                    </span>
                                    </div>

                                    <div className="flex items-center md:justify-end gap-1.5">
                                        {/* Toggle: SOLO si tiene permiso cambiar-estado */}
                                        {canCambiarEstado && (
                                            <ActiveToggleMini
                                                value={!!m.estadoActivo}
                                                title={
                                                    disableDeactivate
                                                        ? "La moneda local no puede desactivarse."
                                                        : m.estadoActivo
                                                            ? "Desactivar"
                                                            : "Activar"
                                                }
                                                disabled={disableDeactivate}
                                                onToggle={(next) => {
                                                    if (next) onToggleActivo(m);
                                                    else askDesactivar(m);
                                                }}
                                            />
                                        )}

                                        {/* Editar: SOLO si tiene permiso actualizar */}
                                        {canEditar && (
                                            <button
                                                aria-label="Editar"
                                                title="Editar"
                                                onClick={() => openEdit(m)}
                                                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        )}

                                        {/* Eliminar */}
                                        {canEliminar && (
                                            <button
                                                aria-label="Eliminar"
                                                title="Eliminar"
                                                onClick={() => askEliminar(m)}
                                                className="p-1.5 rounded-md hover:bg-neutral-100 text-rose-600 hover:text-rose-700"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">Sin resultados</div>
                    )}
                </div>
            )}

            {/* Paginación (sin cambios de tamaño) */}
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

            {/* Modal Crear/Editar */}
            <MonedaModal
                open={modalOpen}
                mode={modalMode}
                moneda={selected ?? undefined}
                canCrear={canCrear}
                canEditar={canEditar}
                onClose={() => setModalOpen(false)}
                onSaved={() => cargar()}
            />

            {/* Confirmaciones */}
            <ConfirmModal
                open={confirmOpen && !!confirmItem}
                title={confirmKind === "eliminar" ? "Eliminar moneda" : "Desactivar moneda"}
                message={
                    confirmKind === "eliminar" ? (
                        <>
                            ¿Eliminar <b>{confirmItem?.nombre}</b> permanentemente?
                            <br />
                            <span className="text-neutral-600">
                {confirmItem?.esLocal ? "Si es la moneda local, solo se eliminará si no está en uso." : "Esta acción no se puede deshacer."}
              </span>
                        </>
                    ) : (
                        <>
                            ¿Desactivar <b>{confirmItem?.nombre}</b>?
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
        </div>
    );
}
