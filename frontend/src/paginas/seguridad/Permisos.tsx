// src/paginas/seguridad/Permisos.tsx
import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/types/pagination";
import type {
    PermisoDTO,
    PermisoCrearDTO,
    PermisoEditarDTO,
} from "@/types/permiso";
import { PermisoService } from "@/servicios/permiso";
import { Paginacion } from "@/componentes/Paginacion";
import { useAuth } from "@/context/AuthContext";
import {
    Pencil,
    Trash2,
    Check,
    X,
} from "lucide-react";

/* =========================================================
   Pequeños componentes reutilizables (mismo estilo Roles/Usuarios)
   ========================================================= */

/* Toggle ON/OFF mini, verde/rojo */
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

/* Modal de confirmación */
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
    message: React.ReactNode;
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
   Helpers de datos
   ========================================================= */

function normalizePermiso(x: any): PermisoDTO {
    const activoRaw =
        x?.activo ??
        x?.enabled ??
        x?.habilitado ??
        x?.estadoActivo ??
        x?.estado_activo ??
        x?.isActive ??
        (typeof x?.estado === "string"
            ? x.estado.toUpperCase() === "ACTIVO"
            : undefined) ??
        (typeof x?.estado === "number"
            ? x?.estado === 1
            : undefined);

    const id =
        x?.id ??
        x?.permisoId ??
        x?.idPermiso ??
        x?.id_permiso ??
        0;

    const codigo =
        x?.codigo ??
        x?.nombre ??
        x?.nombrePermiso ??
        x?.nombre_permiso ??
        x?.name ??
        x?.clave ??
        x?.authority ??
        "";

    return {
        id,
        codigo,
        descripcion:
            x?.descripcion ??
            x?.desc ??
            x?.detalle ??
            null,
        activo: Boolean(activoRaw),
        creadoEn:
            x?.creadoEn ??
            x?.createdAt ??
            x?.fechaCreacion ??
            undefined,
        actualizadoEn:
            x?.actualizadoEn ??
            x?.updatedAt ??
            x?.fechaActualizacion ??
            undefined,
    };
}

async function parseError(e: any) {
    // axios-style
    if (e?.response?.data !== undefined) {
        const d = e.response.data;
        if (typeof d === "string") return d;
        if (d?.message) return d.message;
        if (Array.isArray(d?.errors)) return d.errors.join("\n");
        if (d?.errors && typeof d.errors === "object")
            return (Object.values(d.errors) as any[]).join("\n");
    }

    // fetch-style
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

/** Debounce simple */
function useDebounced<T>(value: T, delay = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

/* =========================================================
   Página principal
   ========================================================= */

export default function PermisosPage() {
    const { user } = useAuth() as { user?: any };

    // can(...) igual estilo módulos anteriores
    const can = useMemo(() => {
        const rawPerms: string[] = Array.isArray(
            user?.permisos
        )
            ? user!.permisos
            : [];
        const rawRoles: Array<
            | string
            | {
            name?: string;
            authority?: string;
            nombre?: string;
        }
        > = Array.isArray(user?.roles)
            ? user!.roles
            : [];

        const rolesStr: string[] = rawRoles
            .map((r) =>
                typeof r === "string"
                    ? r
                    : r?.name ??
                    r?.authority ??
                    r?.nombre ??
                    ""
            )
            .map((s) => String(s));

        const isAdmin = rolesStr.some((r: string) =>
            r.toUpperCase().includes("ADMIN")
        );
        const perms = new Set(
            rawPerms.map((p) => String(p))
        );

        return (perm: string) =>
            isAdmin || perms.has(perm);
    }, [user]);

    // modal global Acceso Denegado
    function show403() {
        window.dispatchEvent(
            new CustomEvent("auth:forbidden", {
                detail: { source: "PermisosPage" },
            })
        );
    }

    // filtros
    const [q, setQ] = useState("");
    const dq = useDebounced(q, 300);
    const [soloActivos, setSoloActivos] =
        useState(false);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);

    // data
    const [data, setData] = useState<
        Page<PermisoDTO> | null
    >(null);
    const [loading, setLoading] = useState(false);

    // errores globales bonitos
    const [error, setError] = useState<
        string | null
    >(null);

    // modal crear / editar
    const [mostrarForm, setMostrarForm] =
        useState<{
            modo: "crear" | "editar";
            permiso?: PermisoDTO;
        } | null>(null);

    // toggle en curso
    const [togglingId, setTogglingId] =
        useState<number | null>(null);

    // agrupar por módulo
    const [agrupar, setAgrupar] = useState(true);

    // confirm delete modal
    const [confirmOpen, setConfirmOpen] =
        useState(false);
    const [confirmBusy, setConfirmBusy] =
        useState(false);
    const [confirmPerm, setConfirmPerm] =
        useState<PermisoDTO | null>(null);

    async function cargar() {
        setLoading(true);
        setError(null);
        try {
            const res = await PermisoService.listar({
                q: dq,
                soloActivos,
                page,
                size,
            });

            setData({
                ...res,
                content: (res.content ?? []).map(
                    normalizePermiso
                ),
            } as Page<PermisoDTO>);
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
        }
    }

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dq, soloActivos, page, size]);

    const rows = useMemo<PermisoDTO[]>(
        () =>
            (data?.content as PermisoDTO[]) ??
            [],
        [data]
    );

    /** Resuelve ID real si backend no lo incluye */
    async function ensureId(
        p: PermisoDTO
    ): Promise<number> {
        if (p.id) return p.id;
        const code = p.codigo?.trim();
        if (!code)
            throw new Error(
                "No se puede resolver el ID: el permiso no tiene nombre/código."
            );

        const r = await PermisoService.listar({
            q: code,
            page: 0,
            size: 1,
        });
        const found = (r.content ?? [])
            .map(normalizePermiso)[0];
        if (!found?.id)
            throw new Error(
                "Permiso no encontrado por nombre."
            );
        return found.id;
    }

    /** Toggle activo/inactivo con switch mini */
    async function toggleEstado(p: PermisoDTO) {
        try {
            // seguridad por permiso granular
            if (p.activo) {
                if (!can("permisos:desactivar")) {
                    show403();
                    return;
                }
            } else {
                if (!can("permisos:activar")) {
                    show403();
                    return;
                }
            }

            const id = await ensureId(p);
            setTogglingId(id);

            if (p.activo) {
                await PermisoService.desactivar(id);
            } else {
                await PermisoService.activar(id);
            }

            await cargar();
        } catch (e: any) {
            setTogglingId(null);
            if (e?.status === 403) {
                show403();
                return;
            }
            const msg = await parseError(e);
            setError(
                msg ||
                "No se pudo actualizar el estado del permiso."
            );
        }
    }

    function moduloDe(codigo?: string) {
        if (!codigo) return "otros";
        const i = codigo.indexOf(":");
        return i > 0
            ? codigo.slice(0, i)
            : "otros";
    }

    const grupos = useMemo(() => {
        if (!agrupar) return null;
        const map: Record<string, PermisoDTO[]> =
            {};
        rows.forEach((p) => {
            const k = moduloDe(p.codigo);
            (map[k] ||= []).push(p);
        });
        Object.keys(map).forEach((k) => {
            map[k].sort((a, b) =>
                (a.codigo || "").localeCompare(
                    b.codigo || ""
                )
            );
        });
        return Object.entries(map).sort((a, b) =>
            a[0].localeCompare(b[0])
        );
    }, [agrupar, rows]);

    // abrir modal de confirmación de borrado
    function askEliminar(p: PermisoDTO) {
        if (!can("permisos:eliminar")) {
            show403();
            return;
        }
        setConfirmPerm(p);
        setConfirmOpen(true);
    }

    async function doEliminar() {
        const p = confirmPerm!;
        setConfirmBusy(true);
        try {
            const id = await ensureId(p);
            await PermisoService.eliminar(id);
            setConfirmOpen(false);
            setConfirmPerm(null);
            await cargar();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                setConfirmOpen(false);
                setConfirmPerm(null);
            } else {
                const msg = await parseError(e);
                setError(
                    msg ||
                    "No se pudo eliminar el permiso."
                );
                setConfirmOpen(false);
                setConfirmPerm(null);
            }
        } finally {
            setConfirmBusy(false);
        }
    }

    // autocerrar confirm si se pierde permiso en caliente
    useEffect(() => {
        if (!confirmOpen || !confirmPerm) return;
        if (!can("permisos:eliminar")) {
            setConfirmOpen(false);
            setConfirmPerm(null);
            show403();
        }
    }, [confirmOpen, confirmPerm, can]);

    /* ============ UI PRINCIPAL ============ */

    return (
        <div className="p-6 space-y-4">
            {/* HEADER: título + filtros + crear */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-xl font-semibold">
                    Permisos
                </h1>

                <div className="md:ml-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    {/* búsqueda */}
                    <input
                        className="border border-gray-300 rounded-lg px-3 py-2 w-72 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Buscar por nombre/descr."
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(0);
                        }}
                    />

                    {/* sólo activos */}
                    <label className="inline-flex items-center gap-2 px-1 text-sm text-neutral-700">
                        <input
                            type="checkbox"
                            className="accent-emerald-600"
                            checked={soloActivos}
                            onChange={(e) => {
                                setSoloActivos(
                                    e.target.checked
                                );
                                setPage(0);
                            }}
                        />
                        Sólo activos
                    </label>

                    {/* agrupar */}
                    <label className="inline-flex items-center gap-2 px-1 text-sm text-neutral-700">
                        <input
                            type="checkbox"
                            className="accent-emerald-600"
                            checked={agrupar}
                            onChange={(e) =>
                                setAgrupar(
                                    e.target.checked
                                )
                            }
                        />
                        Agrupar por módulo
                    </label>

                    {/* tamaño página */}
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={size}
                        onChange={(e) => {
                            setSize(
                                Number(
                                    e.target.value
                                )
                            );
                            setPage(0);
                        }}
                        title="Resultados por página"
                    >
                        <option value={20}>
                            20
                        </option>
                        <option value={50}>
                            50
                        </option>
                        <option value={100}>
                            100
                        </option>
                    </select>

                    {/* crear */}
                    {can("permisos:crear") && (
                        <button
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm shadow-sm"
                            onClick={() =>
                                setMostrarForm({
                                    modo: "crear",
                                })
                            }
                        >
                            + Nuevo permiso
                        </button>
                    )}
                </div>
            </div>

            {/* MENSAJES DE ESTADO */}
            {loading && <div>Cargando…</div>}

            {error && (
                <div className="text-red-600 whitespace-pre-wrap border border-red-200 bg-red-50 rounded px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            {/* VISTA AGRUPADA */}
            {!loading && !error && agrupar && (
                <div className="border rounded bg-white shadow-sm overflow-hidden">
                    {(!grupos ||
                        grupos.length === 0) && (
                        <div className="p-6 text-center text-gray-500 text-sm">
                            Sin resultados
                        </div>
                    )}

                    {grupos?.map(
                        ([mod, lista]) => (
                            <details
                                key={mod}
                                open
                                className="border-b last:border-b-0"
                            >
                                <summary className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer select-none">
                  <span className="font-semibold text-sm text-neutral-800 break-all">
                    {mod}
                  </span>
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-medium">
                    {lista.length}
                  </span>
                                </summary>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-white text-gray-600 text-[13px] uppercase font-bold">
                                        <tr className="border-b">
                                            <th className="text-left p-2 w-[40%]">
                                                Código
                                            </th>
                                            <th className="text-left p-2">
                                                Descripción
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
                                        {lista.map(
                                            (p) => {
                                                const activo =
                                                    !!p.activo;
                                                const busy =
                                                    togglingId ===
                                                    (p.id ||
                                                        0);

                                                return (
                                                    <tr
                                                        key={`${mod}-${p.id || p.codigo}`}
                                                        className="bg-white align-top"
                                                    >
                                                        {/* código */}
                                                        <td className="p-2 text-sm text-neutral-800 font-mono break-all">
                                                            {p.codigo ||
                                                                "(s/ nombre)"}
                                                        </td>

                                                        {/* desc */}
                                                        <td className="p-2 text-sm text-neutral-800 break-words">
                                                            {p.descripcion ??
                                                                "-"}
                                                        </td>

                                                        {/* estado label + switch */}
                                                        <td className="p-2 text-sm text-neutral-800">
                                                            <div className="flex flex-col gap-1">
                                  <span
                                      className={`px-2 py-1 rounded text-[11px] font-medium w-fit ${
                                          activo
                                              ? "bg-green-100 text-green-700"
                                              : "bg-gray-200 text-gray-700"
                                      }`}
                                  >
                                    {activo
                                        ? "Activo"
                                        : "Inactivo"}
                                  </span>

                                                                {(can(
                                                                        "permisos:activar"
                                                                    ) ||
                                                                    can(
                                                                        "permisos:desactivar"
                                                                    )) && (
                                                                    <ActiveToggleMini
                                                                        value={
                                                                            activo
                                                                        }
                                                                        title={
                                                                            activo
                                                                                ? "Desactivar permiso"
                                                                                : "Activar permiso"
                                                                        }
                                                                        disabled={
                                                                            busy
                                                                        }
                                                                        onToggle={async () => {
                                                                            await toggleEstado(
                                                                                p
                                                                            );
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* acciones */}
                                                        <td className="p-2 text-right align-top">
                                                            <div className="flex flex-row flex-wrap items-center justify-end gap-1.5">
                                                                {/* editar */}
                                                                {can(
                                                                    "permisos:actualizar"
                                                                ) && (
                                                                    <IconBtn
                                                                        title="Editar permiso"
                                                                        onClick={() =>
                                                                            setMostrarForm({
                                                                                modo: "editar",
                                                                                permiso:
                                                                                p,
                                                                            })
                                                                        }
                                                                    >
                                                                        <Pencil
                                                                            size={
                                                                                18
                                                                            }
                                                                            className="text-neutral-700"
                                                                        />
                                                                    </IconBtn>
                                                                )}

                                                                {/* eliminar */}
                                                                {can(
                                                                    "permisos:eliminar"
                                                                ) && (
                                                                    <IconBtn
                                                                        title="Eliminar permiso"
                                                                        onClick={() =>
                                                                            askEliminar(
                                                                                p
                                                                            )
                                                                        }
                                                                        className="text-rose-600 hover:text-rose-700"
                                                                    >
                                                                        <Trash2
                                                                            size={
                                                                                18
                                                                            }
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
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        )
                    )}

                    <div className="p-3 border-t">
                        <Paginacion
                            page={data?.number ?? 0}
                            totalPages={data?.totalPages ?? 0}
                            totalElements={
                                data?.totalElements ?? 0
                            }
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

            {/* VISTA PLANA */}
            {!loading && !error && !agrupar && (
                <div className="border rounded bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-[13px] uppercase font-bold">
                        <tr>
                            <th className="text-left p-2">
                                Código
                            </th>
                            <th className="text-left p-2">
                                Descripción
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
                        {rows.map((p) => {
                            const activo = !!p.activo;
                            const busy =
                                togglingId ===
                                (p.id || 0);

                            return (
                                <tr
                                    key={p.id || p.codigo}
                                    className="bg-white align-top"
                                >
                                    {/* código */}
                                    <td className="p-2 text-sm text-neutral-800 font-mono break-all">
                                        {p.codigo ||
                                            "(s/ nombre)"}
                                    </td>

                                    {/* desc */}
                                    <td className="p-2 text-sm text-neutral-800 break-words">
                                        {p.descripcion ??
                                            "-"}
                                    </td>

                                    {/* estado + switch */}
                                    <td className="p-2 text-sm text-neutral-800">
                                        <div className="flex flex-col gap-1">
                        <span
                            className={`px-2 py-1 rounded text-[11px] font-medium w-fit ${
                                activo
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-200 text-gray-700"
                            }`}
                        >
                          {activo
                              ? "Activo"
                              : "Inactivo"}
                        </span>

                                            {(can(
                                                    "permisos:activar"
                                                ) ||
                                                can(
                                                    "permisos:desactivar"
                                                )) && (
                                                <ActiveToggleMini
                                                    value={
                                                        activo
                                                    }
                                                    title={
                                                        activo
                                                            ? "Desactivar permiso"
                                                            : "Activar permiso"
                                                    }
                                                    disabled={
                                                        busy
                                                    }
                                                    onToggle={async () => {
                                                        await toggleEstado(
                                                            p
                                                        );
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </td>

                                    {/* acciones */}
                                    <td className="p-2 text-right align-top">
                                        <div className="flex flex-row flex-wrap items-center justify-end gap-1.5">
                                            {/* editar */}
                                            {can(
                                                "permisos:actualizar"
                                            ) && (
                                                <IconBtn
                                                    title="Editar permiso"
                                                    onClick={() =>
                                                        setMostrarForm({
                                                            modo: "editar",
                                                            permiso:
                                                            p,
                                                        })
                                                    }
                                                >
                                                    <Pencil
                                                        size={
                                                            18
                                                        }
                                                        className="text-neutral-700"
                                                    />
                                                </IconBtn>
                                            )}

                                            {/* eliminar */}
                                            {can(
                                                "permisos:eliminar"
                                            ) && (
                                                <IconBtn
                                                    title="Eliminar permiso"
                                                    onClick={() =>
                                                        askEliminar(
                                                            p
                                                        )
                                                    }
                                                    className="text-rose-600 hover:text-rose-700"
                                                >
                                                    <Trash2
                                                        size={
                                                            18
                                                        }
                                                        className="text-rose-600"
                                                    />
                                                </IconBtn>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="p-6 text-center text-gray-500 text-sm"
                                >
                                    Sin resultados
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>

                    <div className="p-3 border-t">
                        <Paginacion
                            page={data?.number ?? 0}
                            totalPages={
                                data?.totalPages ?? 0
                            }
                            totalElements={
                                data?.totalElements ?? 0
                            }
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

            {/* MODAL CREAR / EDITAR PERMISO */}
            {mostrarForm && (
                <PermisoFormModal
                    modo={mostrarForm.modo}
                    permiso={mostrarForm.permiso}
                    onClose={() =>
                        setMostrarForm(null)
                    }
                    onSaved={() => {
                        setMostrarForm(null);
                        cargar();
                    }}
                    canActualizar={can(
                        "permisos:actualizar"
                    )}
                    canCrear={can(
                        "permisos:crear"
                    )}
                    show403={show403}
                />
            )}

            {/* MODAL CONFIRM ELIMINAR */}
            <ConfirmModal
                open={confirmOpen && !!confirmPerm}
                title="Eliminar permiso"
                message={
                    <>
                        ¿Eliminar el permiso{" "}
                        <b>{confirmPerm?.codigo}</b>?
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
                    setConfirmPerm(null);
                }}
            />
        </div>
    );
}

/* =========================================================
   Modal Crear / Editar
   ========================================================= */

function PermisoFormModal({
                              modo,
                              permiso,
                              onClose,
                              onSaved,
                              canCrear,
                              canActualizar,
                              show403,
                          }: {
    modo: "crear" | "editar";
    permiso?: PermisoDTO;
    onClose: () => void;
    onSaved: () => void;
    canCrear: boolean;
    canActualizar: boolean;
    show403: () => void;
}) {
    const isEdit = modo === "editar";

    const [form, setForm] = useState<
        PermisoCrearDTO | PermisoEditarDTO
    >(
        () =>
            isEdit
                ? {
                    codigo: permiso!.codigo,
                    descripcion:
                        permiso!.descripcion ??
                        undefined,
                    activo: permiso!.activo,
                }
                : {
                    codigo: "",
                    descripcion: "",
                    activo: true,
                }
    );

    const [saving, setSaving] =
        useState(false);
    const [err, setErr] = useState<
        string | null
    >(null);

    async function onSubmit(
        e: React.FormEvent
    ) {
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
            // limpiar payload
            const cleaned: Record<
                string,
                any
            > = {};
            Object.entries(form as any).forEach(
                ([k, v]) => {
                    const vv =
                        typeof v === "string"
                            ? v.trim()
                            : v;
                    if (
                        vv !== undefined &&
                        vv !== null &&
                        vv !== ""
                    ) {
                        cleaned[k] = vv;
                    }
                }
            );

            // mapear campos al backend
            const wire: Record<
                string,
                any
            > = {
                ...cleaned,
                nombre: cleaned.codigo,
                nombrePermiso:
                cleaned.codigo,
                nombre_permiso:
                cleaned.codigo,
                activo: cleaned.activo,
                estadoActivo:
                cleaned.activo,
                estado_activo:
                cleaned.activo,
            };
            delete wire.codigo;

            if (isEdit) {
                await PermisoService.editar(
                    permiso!.id || 0,
                    wire as PermisoEditarDTO
                );
            } else {
                await PermisoService.crear(
                    wire as PermisoCrearDTO
                );
            }

            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                return;
            }
            const msg = await parseError(e);
            setErr(
                msg ||
                "No se pudo guardar el permiso."
            );
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
                className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
            >
                {/* HEADER sticky */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 leading-tight">
                        {isEdit
                            ? "Editar permiso"
                            : "Nuevo permiso"}
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
                            editar este permiso.
                        </div>
                    )}
                </div>

                {/* BODY scrollable */}
                <div className="max-h-[60vh] overflow-y-auto px-5 py-5 space-y-4 text-sm text-neutral-800">
                    {(isEdit && canActualizar) ||
                    (!isEdit && canCrear) ? (
                        <>
                            {/* Código */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-neutral-700">
                                    Nombre / Código{" "}
                                    <span className="text-red-500">
                    *
                  </span>
                                </label>
                                <input
                                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    required
                                    value={(form as any)
                                        .codigo ?? ""}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...(f as any),
                                            codigo:
                                            e.target
                                                .value,
                                        }))
                                    }
                                    placeholder="ej. usuarios:crear"
                                />
                                <p className="text-xs text-neutral-500">
                                    Usa el formato
                                    módulo:acción (ej.
                                    compras:aprobar).
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
                                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    value={(form as any)
                                        .descripcion ?? ""}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...(f as any),
                                            descripcion:
                                            e.target
                                                .value,
                                        }))
                                    }
                                    placeholder="Breve explicación funcional"
                                />
                                <p className="text-xs text-neutral-500">
                                    Ejemplo:
                                    &quot;Puede crear
                                    nuevos usuarios
                                    en el sistema&quot;.
                                </p>
                            </div>

                            {/* Estado toggle grande (igual estilo Usuarios/Roles) */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-neutral-700 block">
                                    Estado
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        className={[
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition border",
                                            (form as any)
                                                .activo
                                                ? "bg-emerald-600 border-emerald-600"
                                                : "bg-neutral-300 border-neutral-300",
                                        ].join(" ")}
                                        onClick={() =>
                                            setForm(
                                                (f) => ({
                                                    ...(f as any),
                                                    activo:
                                                        !(f as any)
                                                            .activo,
                                                })
                                            )
                                        }
                                        title={
                                            (form as any)
                                                .activo
                                                ? "Activo"
                                                : "Inactivo"
                                        }
                                    >
                    <span
                        className={[
                            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                            (form as any)
                                .activo
                                ? "translate-x-6"
                                : "translate-x-1",
                        ].join(" ")}
                    />
                                    </button>
                                    <span className="text-sm text-neutral-700">
                    {(form as any).activo
                        ? "Activo"
                        : "Inactivo"}
                  </span>
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
                                : "Crear permiso"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
