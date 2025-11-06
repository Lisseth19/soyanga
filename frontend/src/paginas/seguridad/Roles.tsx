import {
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import type { Page } from "@/types/pagination";
import type {
    RolDTO,
    RolCrearDTO,
    RolEditarDTO,
    RolAsignarPermisosDTO,
} from "@/types/rol";
import { RolService } from "@/servicios/rol";
import { Paginacion } from "@/componentes/Paginacion";
import { useAuth } from "@/context/AuthContext";
import { Pencil, Shield, Trash2, Check, X } from "lucide-react";

/* =========================================================
   UI Helpers reutilizables (mismo set que en UsuariosPage)
   ========================================================= */

/* Toggle mini ON/OFF (verde/rojo) */
function ActiveToggleMini({
                              value,
                              disabled,
                              title,
                              onToggle,
                          }: {
    value: boolean;
    disabled?: boolean;
    title?: string;
    onToggle: (next: boolean) => void | Promise<void>;
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

/* Botón de ícono compacto */
function IconBtn({
                     title,
                     onClick,
                     children,
                     className = "",
                     disabled,
                 }: {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
            className={[
                "p-1.5 rounded-md border border-transparent",
                "hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900",
                "disabled:opacity-50 disabled:pointer-events-none",
                className,
            ].join(" ")}
        >
            {children}
        </button>
    );
}

/* Modal de confirmación reutilizable */
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
                        <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
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

/* =========================================================
   utils de datos
   ========================================================= */

async function parseError(e: any) {
    try {
        const res = e?.details?.response ?? e?.response ?? e;
        const txt = await res?.text?.();
        if (!txt) return e?.message ?? String(e);
        try {
            const json = JSON.parse(txt);
            if (json?.message) return json.message;
            if (Array.isArray(json?.errors)) return json.errors.join("\n");
            if (json?.errors && typeof json.errors === "object")
                return (Object.values(json.errors) as any[]).join("\n");
            return txt;
        } catch {
            return txt;
        }
    } catch {
        return e?.message ?? String(e);
    }
}

/** Normaliza permiso devuelto por GET /roles/{id}/permisos (PermisoRespuestaDTO) */
function normalizePermisoDesdeBackend(p: any) {
    return {
        id: p?.idPermiso ?? p?.id ?? 0,
        codigo: p?.nombrePermiso ?? p?.codigo ?? p?.name ?? "",
        activo: p?.estadoActivo ?? p?.activo ?? true,
        descripcion: p?.descripcion ?? null,
    };
}

/** Normalizador para roles (tolerante con alias snake/camel) */
function normalizeRol(x: any): RolDTO {
    const estado =
        x?.estadoActivo ??
        x?.activo ??
        x?.enabled ??
        x?.habilitado ??
        (typeof x?.estado === "string"
            ? x.estado.toUpperCase() === "ACTIVO"
            : undefined);

    return {
        id: x?.id ?? x?.rolId ?? x?.idRol ?? x?.id_rol ?? 0,
        nombre: x?.nombre ?? x?.nombreRol ?? x?.name ?? "",
        descripcion: x?.descripcion ?? x?.desc ?? null,
        permisos:
            Array.isArray(x?.permisos) &&
            x.permisos.length &&
            typeof x.permisos[0] !== "number"
                ? x.permisos
                : [],
        estadoActivo: estado,
    } as RolDTO;
}

/* =========================================================
   Página principal RolesPage
   ========================================================= */
export default function RolesPage() {
    const { user } = useAuth() as { user?: any };

    // can(...) inline (similar a UsuariosPage)
    const can = useMemo(() => {
        const rawPerms: string[] = Array.isArray(user?.permisos)
            ? user!.permisos
            : [];
        const rawRoles: Array<
            string | { name?: string; authority?: string; nombre?: string }
        > = Array.isArray(user?.roles) ? user!.roles : [];

        const rolesStr: string[] = rawRoles
            .map((r) =>
                typeof r === "string"
                    ? r
                    : r?.name ?? r?.authority ?? r?.nombre ?? ""
            )
            .map((s) => String(s));

        const isAdmin = rolesStr.some((r: string) =>
            r.toUpperCase().includes("ADMIN")
        );
        const perms = new Set(rawPerms.map((p) => String(p)));

        return (perm: string) => isAdmin || perms.has(perm);
    }, [user]);

    // dispara modal global "Acceso denegado"
    function show403() {
        window.dispatchEvent(
            new CustomEvent("auth:forbidden", {
                detail: { source: "RolesPage" },
            })
        );
    }

    // filtros / paginación
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);

    // data
    const [data, setData] = useState<Page<RolDTO> | null>(null);
    const [loading, setLoading] = useState(false);
    const [hydrating, setHydrating] = useState(false);

    // error global pantalla
    const [error, setError] = useState<string | null>(null);

    // modales secundarios
    const [mostrarForm, setMostrarForm] = useState<{
        modo: "crear" | "editar";
        rol?: RolDTO;
    } | null>(null);

    const [mostrarPermisos, setMostrarPermisos] = useState<RolDTO | null>(
        null
    );

    // track estado toggle para deshabilitar
    const [togglingId, setTogglingId] = useState<number | null>(null);

    // modal confirmar eliminar
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [confirmRol, setConfirmRol] = useState<RolDTO | null>(null);

    async function hidratarDetalles(items: RolDTO[]): Promise<RolDTO[]> {
        if (!items.length) return items;
        setHydrating(true);
        try {
            const out = await Promise.all(
                items.map(async (r) => {
                    try {
                        const [detalle, permisos] = await Promise.all([
                            RolService.obtener(r.id).catch(() => null),
                            RolService.obtenerPermisos(r.id).catch(
                                () => [] as any[]
                            ),
                        ]);

                        const d: any = detalle || {};
                        const estadoActivo =
                            d?.estadoActivo ??
                            d?.activo ??
                            d?.enabled ??
                            d?.habilitado ??
                            (typeof d?.estado === "string"
                                ? d.estado.toUpperCase() === "ACTIVO"
                                : r.estadoActivo);

                        const permisosNorm = (permisos ?? []).map(
                            normalizePermisoDesdeBackend
                        );

                        return {
                            ...r,
                            estadoActivo,
                            permisos: permisosNorm.length
                                ? permisosNorm
                                : r.permisos,
                            nombre: d?.nombre ?? d?.nombreRol ?? r.nombre,
                            descripcion: d?.descripcion ?? r.descripcion,
                        } as RolDTO;
                    } catch {
                        return r;
                    }
                })
            );
            return out;
        } finally {
            setHydrating(false);
        }
    }

    async function cargar() {
        setLoading(true);
        setError(null);
        try {
            const res = await RolService.listar({
                q,
                page,
                size,
            });

            const base: Page<RolDTO> = {
                ...res,
                content: (res.content ?? []).map(normalizeRol),
            };

            const hydrated = await hidratarDetalles(base.content ?? []);
            setData({ ...base, content: hydrated });
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                setError("Acceso denegado.");
            } else {
                setError(e?.message ?? String(e));
            }
            setData(null);
        } finally {
            setLoading(false);
            setTogglingId(null);
        }
    }

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, page, size]);

    const rows = useMemo<RolDTO[]>(
        () => (data?.content as RolDTO[]) ?? [],
        [data]
    );

    /* === activar / desactivar con switch === */
    async function toggleEstado(rol: RolDTO) {
        if (!can("roles:cambiar-estado")) {
            show403();
            return;
        }
        try {
            setTogglingId(rol.id);
            const activoActual = !!rol.estadoActivo;
            await RolService.cambiarEstado(rol.id, {
                estadoActivo: !activoActual,
            });
            await cargar();
        } catch (e: any) {
            setTogglingId(null);
            if (e?.status === 403) {
                show403();
                return;
            }
            const msg = await parseError(e);
            setError(
                msg || "Error al cambiar el estado del rol."
            );
        }
    }

    /* === eliminar con ConfirmModal bonito === */
    function askEliminar(r: RolDTO) {
        if (!can("roles:eliminar")) {
            show403();
            return;
        }
        setConfirmRol(r);
        setConfirmOpen(true);
    }

    async function doEliminar() {
        const r = confirmRol!;
        setConfirmBusy(true);
        try {
            await RolService.eliminar(r.id);

            setConfirmOpen(false);
            setConfirmRol(null);

            await cargar();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                setConfirmOpen(false);
                setConfirmRol(null);
            } else {
                const msg = await parseError(e);
                setError(
                    msg || "No se pudo eliminar el rol."
                );
                setConfirmOpen(false);
                setConfirmRol(null);
            }
        } finally {
            setConfirmBusy(false);
        }
    }

    // autocerrar confirm si cambian permisos
    useEffect(() => {
        if (!confirmOpen || !confirmRol) return;
        if (!can("roles:eliminar")) {
            setConfirmOpen(false);
            setConfirmRol(null);
            show403();
        }
    }, [confirmOpen, confirmRol, can]);

    return (
        <div className="p-6 space-y-4">
            {/* HEADER búsqueda + botón nuevo */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-xl font-semibold">
                    Roles
                </h1>

                <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
                    <input
                        className="border border-gray-300 rounded-lg px-3 py-2 w-72 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Buscar"
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(0);
                        }}
                    />

                    {can("roles:crear") && (
                        <button
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm shadow-sm"
                            onClick={() =>
                                setMostrarForm({ modo: "crear" })
                            }
                        >
                            + Nuevo rol
                        </button>
                    )}
                </div>
            </div>

            {/* Mensajes globales */}
            {loading && <div>Cargando…</div>}

            {error && (
                <div className="text-red-600 whitespace-pre-wrap border border-red-200 bg-red-50 rounded px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            {/* TABLA */}
            {!loading && !error && (
                <div className="border rounded bg-white overflow-x-auto shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-[13px] uppercase font-bold">
                        <tr>
                            <th className="text-left p-2">
                                Nombre
                            </th>
                            <th className="text-left p-2">
                                Descripción
                            </th>
                            <th className="text-left p-2">
                                Permisos
                            </th>
                            <th className="text-left p-2">
                                Estado
                            </th>
                            <th className="text-right p-2">
                                Acciones
                            </th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {rows.map(
                            (r: RolDTO, idx: number) => {
                                const list = Array.isArray(
                                    r.permisos
                                )
                                    ? r.permisos
                                    : [];
                                const count = list.length;
                                const preview = count
                                    ? list
                                        .slice(0, 3)
                                        .map(
                                            (p: any) => p.codigo
                                        )
                                        .join(", ")
                                    : "-";
                                const more =
                                    count > 3
                                        ? ` +${count - 3}`
                                        : "";
                                const activo = !!r.estadoActivo;

                                return (
                                    <tr
                                        key={
                                            r.id ||
                                            r.nombre ||
                                            idx
                                        }
                                        className="bg-white align-top"
                                    >
                                        {/* Nombre */}
                                        <td className="p-2 text-neutral-800 break-words">
                                            {r.nombre || "(sin nombre)"}
                                        </td>

                                        {/* Desc */}
                                        <td className="p-2 text-neutral-800 break-words">
                                            {r.descripcion ?? "-"}
                                        </td>

                                        {/* Permisos (badge cantidad + mini preview) */}
                                        <td className="p-2 text-neutral-800">
                                            <div className="text-xs flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                            {count}
                          </span>
                                                <span className="text-neutral-700">
                            {preview}
                                                    {more}
                          </span>
                                                {hydrating && (
                                                    <span className="text-[11px] text-gray-500">
                              (actualizando…)
                            </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Estado */}
                                        <td className="p-2 align-top">
                                            {activo ? (
                                                <span className="px-2 py-1 rounded text-[11px] font-medium bg-green-100 text-green-700">
                            Activo
                          </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded text-[11px] font-medium bg-gray-200 text-gray-700">
                            Inactivo
                          </span>
                                            )}
                                        </td>

                                        {/* Acciones */}
                                        <td className="p-2 text-right align-top">
                                            <div className="flex flex-row flex-wrap items-center justify-end gap-1.5">
                                                {/* Editar rol */}
                                                {can("roles:actualizar") && (
                                                    <IconBtn
                                                        title="Editar"
                                                        onClick={() =>
                                                            setMostrarForm({
                                                                modo: "editar",
                                                                rol: r,
                                                            })
                                                        }
                                                    >
                                                        <Pencil
                                                            size={18}
                                                            className="text-neutral-700"
                                                        />
                                                    </IconBtn>
                                                )}

                                                {/* Asignar permisos */}
                                                {can(
                                                    "roles:asignar-permisos"
                                                ) && (
                                                    <IconBtn
                                                        title="Asignar permisos"
                                                        onClick={() =>
                                                            setMostrarPermisos(
                                                                r
                                                            )
                                                        }
                                                    >
                                                        <Shield
                                                            size={18}
                                                            className="text-neutral-700"
                                                        />
                                                    </IconBtn>
                                                )}

                                                {/* Toggle activo/inactivo */}
                                                {can(
                                                    "roles:cambiar-estado"
                                                ) && (
                                                    <ActiveToggleMini
                                                        value={!!r.estadoActivo}
                                                        title={
                                                            r.estadoActivo
                                                                ? "Desactivar rol"
                                                                : "Activar rol"
                                                        }
                                                        disabled={
                                                            togglingId ===
                                                            r.id
                                                        }
                                                        onToggle={async () => {
                                                            await toggleEstado(
                                                                r
                                                            );
                                                        }}
                                                    />
                                                )}

                                                {/* Eliminar */}
                                                {can("roles:eliminar") && (
                                                    <IconBtn
                                                        title="Eliminar"
                                                        onClick={() =>
                                                            askEliminar(r)
                                                        }
                                                        className="text-rose-600 hover:text-rose-700"
                                                    >
                                                        <Trash2
                                                            size={18}
                                                            className="text-rose-600"
                                                        />
                                                    </IconBtn>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                        )}

                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="p-6 text-center text-gray-500 text-sm"
                                >
                                    Sin resultados
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>

                    {/* Paginación */}
                    <div className="p-3 border-t">
                        <Paginacion
                            page={data?.number ?? 0}
                            totalPages={data?.totalPages ?? 0}
                            totalElements={data?.totalElements ?? 0}
                            size={size}
                            setPage={setPage}
                            setSize={setSize}
                            loading={loading}
                            isFirst={!!data?.first}
                            isLast={!!data?.last}
                        />
                    </div>
                </div>
            )}

            {/* MODAL CREAR / EDITAR ROL */}
            {mostrarForm && (
                <RolFormModal
                    modo={mostrarForm.modo}
                    rol={mostrarForm.rol}
                    onClose={() => setMostrarForm(null)}
                    onSaved={() => {
                        setMostrarForm(null);
                        cargar();
                    }}
                    canCrear={can("roles:crear")}
                    canActualizar={can("roles:actualizar")}
                    show403={show403}
                />
            )}

            {/* MODAL PERMISOS */}
            {mostrarPermisos &&
                can("roles:asignar-permisos") && (
                    <RolPermisosModal
                        rol={mostrarPermisos}
                        onClose={() => setMostrarPermisos(null)}
                        onSaved={() => {
                            setMostrarPermisos(null);
                            cargar();
                        }}
                        show403={show403}
                    />
                )}

            {/* MODAL CONFIRM ELIMINAR */}
            <ConfirmModal
                open={confirmOpen && !!confirmRol}
                title="Eliminar rol"
                message={
                    <>
                        ¿Eliminar el rol{" "}
                        <b>{confirmRol?.nombre}</b>{" "}
                        permanentemente?
                        <br />
                        <span className="text-neutral-600">
              Esta acción no se puede
              deshacer.
            </span>
                    </>
                }
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                kind="danger"
                loading={confirmBusy}
                onConfirm={doEliminar}
                onClose={() => {
                    if (confirmBusy) return;
                    setConfirmOpen(false);
                    setConfirmRol(null);
                }}
            />
        </div>
    );
}

/* =========================================================
   RolFormModal
   ========================================================= */

function RolFormModal({
                          modo,
                          rol,
                          onClose,
                          onSaved,
                          canCrear,
                          canActualizar,
                          show403,
                      }: {
    modo: "crear" | "editar";
    rol?: RolDTO;
    onClose: () => void;
    onSaved: () => void;
    canCrear: boolean;
    canActualizar: boolean;
    show403: () => void;
}) {
    const isEdit = modo === "editar";

    const [form, setForm] = useState<RolCrearDTO | RolEditarDTO>(
        () =>
            isEdit
                ? {
                    nombre: rol!.nombre,
                    descripcion: rol!.descripcion ?? "",
                }
                : { nombre: "", descripcion: "" }
    );

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (isEdit && !canActualizar) {
            show403();
            return;
        }
        if (!isEdit && !canCrear) {
            show403();
            return;
        }

        setSaving(true);
        setErr(null);

        try {
            // limpiamos strings vacíos y renombramos campos p/ backend
            const cleaned: Record<string, any> = {};
            Object.entries(form as any).forEach(([k, v]) => {
                const vv = typeof v === "string" ? v.trim() : v;
                if (vv !== undefined && vv !== null && vv !== "") {
                    cleaned[k] = vv;
                }
            });

            cleaned.nombreRol =
                cleaned.nombre ?? cleaned.nombreRol;
            delete cleaned.nombre;

            if (isEdit) {
                await RolService.editar(
                    rol!.id,
                    cleaned as any
                );
            } else {
                cleaned.estadoActivo = true;
                await RolService.crear(cleaned as any);
            }

            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                return;
            }
            const msg = await parseError(e);
            setErr(msg || "No se pudo guardar el rol.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center px-4 pt-16 pb-6"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <form
                className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
            >
                {/* HEADER sticky */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 leading-tight">
                        {isEdit ? "Editar rol" : "Nuevo rol"}
                        {!isEdit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                Paso 1: Datos básicos
              </span>
                        )}
                    </h3>

                    {!isEdit && !canCrear && (
                        <div className="text-sm text-neutral-600">
                            No tienes permiso para
                            realizar esta acción.
                        </div>
                    )}

                    {isEdit && !canActualizar && (
                        <div className="text-sm text-neutral-600">
                            No tienes permiso para
                            editar este rol.
                        </div>
                    )}
                </div>

                {/* BODY scrollable */}
                <div className="max-h-[60vh] overflow-y-auto px-5 py-5 space-y-4 text-sm text-neutral-800">
                    {(isEdit && canActualizar) ||
                    (!isEdit && canCrear) ? (
                        <>
                            <div className="grid grid-cols-1 gap-4">
                                {/* Nombre */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-neutral-700">
                                        Nombre{" "}
                                        <span className="text-red-500">
                      *
                    </span>
                                    </label>
                                    <input
                                        className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        required
                                        value={(form as any).nombre ?? ""}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...(f as any),
                                                nombre:
                                                e.target.value,
                                            }))
                                        }
                                        placeholder="Ej. SUPERVISOR_COMPRAS"
                                    />
                                    <p className="text-xs text-neutral-500">
                                        Debe ser único. Evita
                                        espacios si lo usas
                                        como código.
                                    </p>
                                </div>

                                {/* Descripción */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-neutral-700">
                                        Descripción{" "}
                                        <span className="text-neutral-400 font-normal">
                      (opcional)
                    </span>
                                    </label>
                                    <input
                                        className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        value={
                                            (form as any)
                                                .descripcion ?? ""
                                        }
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...(f as any),
                                                descripcion:
                                                e.target.value,
                                            }))
                                        }
                                        placeholder="Breve descripción funcional del rol"
                                    />
                                    <p className="text-xs text-neutral-500">
                                        Ej: “Puede gestionar
                                        proveedores y aprobar
                                        compras”.
                                    </p>
                                </div>
                            </div>

                            {err && (
                                <div className="text-red-600 text-sm whitespace-pre-wrap border border-red-200 bg-red-50 rounded px-3 py-2">
                                    {err}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm text-neutral-600">
                            No tienes permiso para
                            realizar esta acción.
                        </div>
                    )}
                </div>

                {/* FOOTER sticky */}
                <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t px-5 py-3 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm text-neutral-700"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    {((isEdit && canActualizar) ||
                        (!isEdit && canCrear)) && (
                        <button
                            type="submit"
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
                            disabled={saving}
                        >
                            {isEdit
                                ? "Guardar cambios"
                                : "Crear rol"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

/* =========================================================
   RolPermisosModal
   ========================================================= */

function RolPermisosModal({
                              rol,
                              onClose,
                              onSaved,
                              show403,
                          }: {
    rol: RolDTO;
    onClose: () => void;
    onSaved: () => void;
    show403: () => void;
}) {
    type PermOpcion = {
        id: number;
        codigo: string;
        descripcion?: string | null;
    };

    const [permisos, setPermisos] = useState<PermOpcion[]>(
        []
    );

    // IDs seleccionados
    const [seleccion, setSeleccion] = useState<
        number[]
    >(
        (rol.permisos ?? [])
            .map((p: any) => p.id)
            .filter(Boolean)
    );

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(
        null
    );
    const [filtro, setFiltro] = useState("");

    // cargar catálogo permisos
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const { PermisoService } = await import(
                    "@/servicios/permiso"
                    );
                const page = await PermisoService.listar({
                    page: 0,
                    size: 2000,
                    soloActivos: false,
                });

                const opts: PermOpcion[] = (
                    page.content ?? []
                ).map((x: any, i: number) => {
                    const id =
                        x.id ??
                        x.idPermiso ??
                        x.permisoId ??
                        x.id_permiso ??
                        i + 1;
                    const codigo =
                        x.codigo ??
                        x.nombrePermiso ??
                        x.nombre ??
                        x.name ??
                        x.authority ??
                        "";
                    const descripcion =
                        x.descripcion ?? null;
                    return { id, codigo, descripcion };
                });

                if (!mounted) return;
                setPermisos(opts);

                // fallback si vino como array numérico
                if (
                    !seleccion.length &&
                    Array.isArray((rol as any)?.permisos) &&
                    (rol as any).permisos.length &&
                    typeof (rol as any).permisos[0] ===
                    "number"
                ) {
                    setSeleccion(
                        (rol as any)
                            .permisos as unknown as number[]
                    );
                }
            } catch (e: any) {
                if (mounted)
                    setErr(e?.message ?? String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggle = useCallback((id: number) => {
        setSeleccion((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    }, []);

    const setGrupo = useCallback(
        (ids: number[], selected: boolean) => {
            setSeleccion((prev) => {
                const setPrev = new Set(prev);
                if (selected)
                    ids.forEach((id) => setPrev.add(id));
                else
                    ids.forEach((id) => setPrev.delete(id));
                return Array.from(setPrev);
            });
        },
        []
    );

    const seleccionarTodo = () =>
        setSeleccion(permisos.map((p) => p.id));
    const limpiarTodo = () => setSeleccion([]);

    // Agrupación por prefijo
    function sectorDe(codigo: string): string {
        const first = String(codigo ?? "")
            .split(":")[0]
            .trim();
        return first || "otros";
    }
    function labelSector(key: string): string {
        const map: Record<string, string> = {
            usuarios: "Usuarios",
            roles: "Roles",
            permisos: "Permisos",
            inventario: "Inventario",
            productos: "Productos",
            categorias: "Categorías",
            almacenes: "Almacenes",
            monedas: "Monedas",
            presentaciones: "Presentaciones",
            unidades: "Unidades",
            sucursales: "Sucursales",
            clientes: "Clientes",
            proveedores: "Proveedores",
            salud: "Salud",
            otros: "Otros",
        };
        return (
            map[key] ??
            key.charAt(0).toUpperCase() +
            key.slice(1)
        );
    }

    // filtro texto
    const filtrados = useMemo(() => {
        const q = filtro.trim().toLowerCase();
        if (!q) return permisos;
        return permisos.filter((p) => {
            const c = (p.codigo ?? "")
                .toLowerCase();
            const d = (p.descripcion ?? "")
                .toLowerCase();
            return (
                c.includes(q) || d.includes(q)
            );
        });
    }, [filtro, permisos]);

    // grupos según filtro
    const grupos = useMemo(() => {
        const map = new Map<
            string,
            PermOpcion[]
        >();
        filtrados.forEach((p) => {
            const k = sectorDe(p.codigo);
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(p);
        });
        return Array.from(map.entries()).sort(
            (a, b) => a[0].localeCompare(b[0])
        );
    }, [filtrados]);

    // para checkbox de grupo (indeterminado)
    type GrupoEstado = {
        total: number;
        marcados: number;
        ids: number[];
    };
    const estadosPorGrupo: Record<
        string,
        GrupoEstado
    > = useMemo(() => {
        const out: Record<
            string,
            GrupoEstado
        > = {};
        grupos.forEach(([k, lista]) => {
            const ids = lista.map((p) => p.id);
            const marcados = ids.filter((id) =>
                seleccion.includes(id)
            ).length;
            out[k] = { total: ids.length, marcados, ids };
        });
        return out;
    }, [grupos, seleccion]);

    const totalMarcados = seleccion.length;

    async function onSubmit(
        e: React.FormEvent
    ) {
        e.preventDefault();
        try {
            const dto: RolAsignarPermisosDTO = {
                permisos: seleccion,
            };
            await RolService.asignarPermisos(
                rol.id,
                dto
            );
            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                return;
            }
            const msg = await parseError(e);
            setErr(
                msg ||
                "No se pudieron guardar los permisos."
            );
        }
    }

    return (
        <div
            className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center px-4 pt-16 pb-6"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <form
                className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
            >
                {/* HEADER sticky */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold truncate leading-tight">
                            Permisos —{" "}
                            <span className="font-normal">
                {rol.nombre || "(sin nombre)"}
              </span>
                        </h3>
                        <div className="text-xs text-neutral-600">
                            Seleccionados:{" "}
                            <span className="font-semibold">
                {totalMarcados}
              </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        aria-label="Cerrar"
                        title="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* BARRA ACCIONES sticky */}
                <div className="sticky top-[46px] z-10 bg-white/95 backdrop-blur border-b px-5 py-3">
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <input
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-80 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-neutral-800 placeholder-neutral-400"
                            placeholder="Buscar permiso (código o descripción)"
                            value={filtro}
                            onChange={(e) =>
                                setFiltro(e.target.value)
                            }
                        />

                        <div className="sm:ml-auto flex gap-2">
                            <button
                                type="button"
                                className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-xs font-medium text-neutral-700"
                                onClick={seleccionarTodo}
                                disabled={!permisos.length}
                                title="Seleccionar todos los permisos"
                            >
                                Seleccionar todo
                            </button>

                            <button
                                type="button"
                                className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-xs font-medium text-neutral-700"
                                onClick={limpiarTodo}
                                disabled={!permisos.length}
                                title="Quitar toda la selección"
                            >
                                Limpiar todo
                            </button>
                        </div>
                    </div>
                </div>

                {/* CONTENIDO scrollable */}
                <div className="max-h-[65vh] overflow-y-auto px-5 py-4 text-sm text-neutral-800">
                    {loading && (
                        <div className="text-sm text-neutral-600">
                            Cargando…
                        </div>
                    )}

                    {err && (
                        <div className="text-red-600 text-sm whitespace-pre-wrap border border-red-200 bg-red-50 rounded px-3 py-2 mb-3">
                            {err}
                        </div>
                    )}

                    {!loading &&
                        !err &&
                        grupos.length === 0 && (
                            <div className="text-sm text-gray-500">
                                No hay permisos para
                                mostrar.
                            </div>
                        )}

                    {!loading &&
                        grupos.length > 0 && (
                            <div className="space-y-4">
                                {grupos.map(
                                    ([grupoKey, lista]) => (
                                        <GrupoCard
                                            key={grupoKey}
                                            label={labelSector(
                                                grupoKey
                                            )}
                                            permisos={lista}
                                            estado={
                                                estadosPorGrupo[
                                                    grupoKey
                                                    ]
                                            }
                                            onToggleGrupo={(
                                                checked
                                            ) =>
                                                setGrupo(
                                                    estadosPorGrupo[
                                                        grupoKey
                                                        ].ids,
                                                    checked
                                                )
                                            }
                                            onTogglePermiso={
                                                toggle
                                            }
                                            seleccion={
                                                seleccion
                                            }
                                        />
                                    )
                                )}
                            </div>
                        )}
                </div>

                {/* FOOTER sticky */}
                <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t px-5 py-3 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-xs font-medium text-neutral-700"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                    >
                        Guardar
                    </button>
                </div>
            </form>
        </div>
    );
}

/* =========================================================
   GrupoCard: listado por grupo de permisos
   ========================================================= */

function GrupoCard({
                       label,
                       permisos,
                       estado,
                       onToggleGrupo,
                       onTogglePermiso,
                       seleccion,
                   }: {
    label: string;
    permisos: Array<{
        id: number;
        codigo: string;
        descripcion?: string | null;
    }>;
    estado: { total: number; marcados: number; ids: number[] };
    onToggleGrupo: (checked: boolean) => void;
    onTogglePermiso: (id: number) => void;
    seleccion: number[];
}) {
    const groupRef = useRef<HTMLInputElement | null>(
        null
    );

    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.indeterminate =
                estado.marcados > 0 &&
                estado.marcados < estado.total;
        }
    }, [estado.marcados, estado.total]);

    return (
        <div className="border rounded-xl p-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b pb-2 mb-2 gap-2">
                <label className="flex items-start gap-2">
                    <input
                        ref={groupRef}
                        type="checkbox"
                        checked={
                            estado.marcados ===
                            estado.total &&
                            estado.total > 0
                        }
                        onChange={(e) =>
                            onToggleGrupo(
                                e.target.checked
                            )
                        }
                    />
                    <span className="flex flex-col">
            <span className="font-medium text-sm text-neutral-800">
              {label}
            </span>
            <span className="text-xs text-neutral-600">
              ({estado.marcados}/
                {estado.total})
            </span>
          </span>
                </label>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="px-2 py-1 text-[11px] border border-neutral-300 rounded-lg hover:bg-neutral-50 text-neutral-700"
                        onClick={() =>
                            onToggleGrupo(true)
                        }
                    >
                        Seleccionar grupo
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 text-[11px] border border-neutral-300 rounded-lg hover:bg-neutral-50 text-neutral-700"
                        onClick={() =>
                            onToggleGrupo(false)
                        }
                    >
                        Limpiar grupo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                {permisos.map((p) => (
                    <label
                        key={p.id}
                        className="flex items-start gap-2"
                    >
                        <input
                            type="checkbox"
                            checked={seleccion.includes(
                                p.id
                            )}
                            onChange={() =>
                                onTogglePermiso(p.id)
                            }
                        />
                        <div className="text-neutral-800">
                            <div className="font-mono text-[11px] leading-snug break-all text-neutral-900 bg-neutral-50 rounded px-1 py-[2px] border border-neutral-200">
                                {p.codigo}
                            </div>
                            {p.descripcion && (
                                <div className="text-[11px] text-neutral-600 leading-snug break-words mt-0.5">
                                    {p.descripcion}
                                </div>
                            )}
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
}
