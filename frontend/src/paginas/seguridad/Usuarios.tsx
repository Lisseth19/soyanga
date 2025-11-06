// src/paginas/seguridad/Usuarios.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Page } from "@/types/pagination";
import type {
    UsuarioDTO,
    UsuarioCrearDTO,
    UsuarioEditarDTO,
} from "@/types/usuario";
import { UsuarioService } from "@/servicios/usuario";
import { Paginacion } from "@/componentes/Paginacion";
import { useAuth } from "@/context/AuthContext";
import { Pencil, Shield, Key, Trash2, Check, X } from "lucide-react";

/* =========================================================
   Helpers UI reusables (igual estilo que Categorías/Clientes)
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

/* Icon button compacto */
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

/* Modal de confirmación bonito */
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
   Utils de datos / normalizadores
   ========================================================= */

async function parseError(e: any) {
    if (e?.response?.data !== undefined) {
        const d = e.response.data;
        if (typeof d === "string") return d;
        if (d?.message) return d.message;
        if (Array.isArray(d?.errors)) return d.errors.join("\n");
        if (d?.errors && typeof d.errors === "object")
            return (Object.values(d.errors) as any[]).join("\n");
    }
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

function normalizeRolesList(
    rolesRaw: any
): Array<{ id: number; nombre: string }> {
    const arr = Array.isArray(rolesRaw) ? rolesRaw : [];
    return arr.map((r: any) => {
        if (typeof r === "string") return { id: 0, nombre: r };
        const nombre =
            r?.nombre ??
            r?.nombreRol ??
            r?.name ??
            r?.authority ??
            String(r ?? "");
        const id = r?.id ?? r?.idRol ?? r?.rolId ?? 0;
        return { id, nombre };
    });
}

function normalizeUsuario(x: any): UsuarioDTO {
    const activo =
        x?.activo ??
        x?.enabled ??
        x?.habilitado ??
        x?.estadoActivo ??
        x?.isActive ??
        (typeof x?.estado === "string"
            ? x.estado.toUpperCase() === "ACTIVO"
            : undefined);

    return {
        id: x?.id ?? x?.usuarioId ?? x?.idUsuario ?? x?.userId ?? 0,
        username: x?.username ?? x?.usuario ?? x?.nombreUsuario ?? "",
        nombreCompleto: x?.nombreCompleto ?? x?.nombre ?? x?.nombreYApellido ?? "",
        email: x?.email ?? x?.correo ?? x?.correoElectronico ?? "",
        telefono: x?.telefono ?? x?.celular ?? x?.telefonoMovil ?? undefined,
        roles: normalizeRolesList(x?.roles ?? []),
        activo: activo ?? true,
        creadoEn: x?.creadoEn ?? x?.createdAt ?? x?.fechaCreacion,
        actualizadoEn: x?.actualizadoEn ?? x?.updatedAt ?? x?.fechaActualizacion,
    };
}

function renderRolesChip(n?: number | string) {
    if (n === 0) return <span className="text-neutral-600">-</span>;
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-medium">
      {typeof n === "number" ? `${n} rol${n === 1 ? "" : "es"}` : n ?? "…"}
    </span>
    );
}

/* =========================================================
   Página principal
   ========================================================= */

export default function UsuariosPage() {
    const { user, can } = useAuth() as {
        user?: any;
        can: (permiso: string) => boolean;
    };

    // @ts-ignore mantener navigate por si se usa luego
    const navigate = useNavigate();

    // ===== modal global de acceso denegado =====
    function show403() {
        window.dispatchEvent(
            new CustomEvent("auth:forbidden", {
                detail: { source: "UsuariosPage" },
            })
        );
    }

    // permisos memoizados
    const canCrearUser = useMemo(() => can("usuarios:crear"), [can]);
    const canActualizarUser = useMemo(
        () => can("usuarios:actualizar"),
        [can]
    );
    const canAsignarRoles = useMemo(
        () => can("usuarios:asignar-roles"),
        [can]
    );
    const canCambiarPwd = useMemo(
        () => can("usuarios:cambiar-password"),
        [can]
    );
    const canCambiarEstado = useMemo(
        () => can("usuarios:cambiar-estado"),
        [can]
    );
    const canEliminarUser = useMemo(
        () => can("usuarios:eliminar"),
        [can]
    );

    // ===== soy admin => puedo ver/editar admins
    const yoEsAdmin = useMemo(() => {
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
        return rolesStr.some((r: string) => r.toUpperCase().includes("ADMIN"));
    }, [user]);

    // ===== info del usuario logueado
    const me = useMemo(() => {
        const id = user?.id ?? user?.idUsuario ?? user?.userId ?? null;
        const username = (
            user?.username ??
            user?.nombreUsuario ??
            user?.usuario ??
            ""
        ).toString();
        return {
            id: typeof id === "number" ? id : null,
            username: username.toLowerCase(),
        };
    }, [user]);

    function isSelf(u: UsuarioDTO) {
        const uidOk = typeof me.id === "number" && me.id > 0 && u.id === me.id;
        const unameOk =
            !!me.username &&
            typeof u.username === "string" &&
            u.username.toLowerCase() === me.username;
        return uidOk || unameOk;
    }

    // ===== filtros / paginación =====
    const [q, setQ] = useState("");
    const [soloActivos, setSoloActivos] = useState(false);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);

    // ===== tabla / estados =====
    const [data, setData] = useState<Page<UsuarioDTO> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modales funcionales existentes
    const [mostrarForm, setMostrarForm] = useState<{
        modo: "crear" | "editar";
        usuario?: UsuarioDTO;
    } | null>(null);
    const [mostrarPwd, setMostrarPwd] = useState<UsuarioDTO | null>(null);
    const [mostrarRoles, setMostrarRoles] = useState<UsuarioDTO | null>(null);
    const [mostrarRolesVer, setMostrarRolesVer] = useState<{
        usuario: UsuarioDTO;
        nombres: string[];
    } | null>(null);

    // Cache de roles por usuario (conteo y lista de nombres)
    const [roleCounts, setRoleCounts] = useState<Record<number, number>>({});
    const [roleNames, setRoleNames] = useState<Record<number, string[]>>({});
    const [hydratingCounts, setHydratingCounts] = useState(false);

    // ==== modal confirmar eliminación usuario ====
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [confirmRow, setConfirmRow] = useState<UsuarioDTO | null>(null);

    // cargar tabla + prefetch roles
    async function cargar() {
        setLoading(true);
        setError(null);
        try {
            const res = await UsuarioService.listar({
                q,
                soloActivos,
                page,
                size,
            });

            const pageData: Page<UsuarioDTO> = {
                ...res,
                content: (res.content ?? []).map(normalizeUsuario),
            };

            setData(pageData);

            // Prefetch roles/nombres
            const ids = (pageData.content ?? [])
                .map((u) => u.id)
                .filter(Boolean) as number[];

            if (ids.length) {
                setHydratingCounts(true);

                const pendientes = ids.filter(
                    (id) =>
                        roleCounts[id] === undefined ||
                        roleNames[id] === undefined
                );

                if (pendientes.length) {
                    const detalles = await Promise.all(
                        pendientes.map((id) =>
                            UsuarioService.obtener(id).catch(() => null)
                        )
                    );

                    const nuevosCounts: Record<number, number> = {};
                    const nuevosNombres: Record<number, string[]> = {};

                    pendientes.forEach((id, idx) => {
                        const det: any = detalles[idx];
                        if (det) {
                            const rolesNorm = normalizeRolesList(
                                det?.roles ??
                                det?.authorities ??
                                det?.perfiles ??
                                det?.rolesNombres ??
                                []
                            );
                            nuevosCounts[id] = rolesNorm.length;
                            nuevosNombres[id] = rolesNorm.map((r) => r.nombre);
                        }
                    });

                    if (Object.keys(nuevosCounts).length)
                        setRoleCounts((m) => ({ ...m, ...nuevosCounts }));
                    if (Object.keys(nuevosNombres).length)
                        setRoleNames((m) => ({ ...m, ...nuevosNombres }));
                }

                setHydratingCounts(false);
            }
        } catch (e: any) {
            if (e?.status === 403) {
                // permiso "usuarios:ver" removido en caliente
                show403();
                setError("Acceso denegado.");
            } else {
                setError(e?.message ?? String(e));
            }
            setData(null);
            setHydratingCounts(false);
        } finally {
            setLoading(false);
        }
    }

    // recarga datos cuando cambian filtros/paginación
    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, soloActivos, page, size]);

    // helper: ¿fila tiene rol ADMIN?
    function filaEsAdmin(u: UsuarioDTO) {
        const names =
            roleNames[u.id!] ??
            (Array.isArray(u.roles) ? u.roles.map((r) => r.nombre) : []);
        return names.some((n) => String(n).toUpperCase().includes("ADMIN"));
    }

    // filas visibles: si NO soy admin, oculto usuarios admin
    // (y también oculto filas hasta hidratar roles)
    const rowsAll = useMemo<UsuarioDTO[]>(
        () => (data?.content as UsuarioDTO[]) ?? [],
        [data]
    );

    const rows = useMemo<UsuarioDTO[]>(() => {
        if (yoEsAdmin) return rowsAll;
        return rowsAll.filter((u) => {
            const names =
                roleNames[u.id!] ??
                (Array.isArray(u.roles) ? u.roles.map((r) => r.nombre) : []);
            if (!names || names.length === 0) return false;
            return !names.some((n) =>
                String(n).toUpperCase().includes("ADMIN")
            );
        });
    }, [rowsAll, yoEsAdmin, roleNames]);

    /* ===== eliminar usuario (con modal ConfirmModal bonito) ===== */
    function askEliminar(u: UsuarioDTO, soyYo: boolean, puedeGestionarEste: boolean) {
        if (!canEliminarUser || !puedeGestionarEste || soyYo) {
            // No hacemos nada si no puede
            return;
        }
        setConfirmRow(u);
        setConfirmOpen(true);
    }

    async function doEliminar() {
        const row = confirmRow!;
        setConfirmBusy(true);
        try {
            await UsuarioService.eliminar(row.id);

            setConfirmOpen(false);
            setConfirmRow(null);

            await cargar();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                setConfirmOpen(false);
                setConfirmRow(null);
            } else {
                const msg = await parseError(e);
                setError(msg || "No se pudo eliminar el usuario.");
                setConfirmOpen(false);
                setConfirmRow(null);
            }
        } finally {
            setConfirmBusy(false);
        }
    }

    // autocerrar confirm si pierde permiso mientras está abierto
    useEffect(() => {
        if (!confirmOpen || !confirmRow) return;
        if (!canEliminarUser) {
            setConfirmOpen(false);
            setConfirmRow(null);
            show403();
        }
    }, [confirmOpen, confirmRow, canEliminarUser]);

    return (
        <div className="p-6 space-y-4">
            {/* Header búsqueda + acciones */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-xl font-semibold">Usuarios</h1>

                <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
                    {/* Buscador */}
                    <div className="relative">
                        <input
                            className="border border-gray-300 rounded-lg px-3 py-2 w-72 pr-8 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Buscar por usuario/nombre/email"
                            value={q}
                            onChange={(e) => {
                                setQ(e.target.value);
                                setPage(0);
                            }}
                        />
                        {q && (
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800"
                                title="Limpiar búsqueda"
                                onClick={() => {
                                    setQ("");
                                    setPage(0);
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* toggle activos */}
                    <label className="inline-flex items-center gap-2 px-1 text-sm text-neutral-700">
                        <input
                            type="checkbox"
                            className="accent-emerald-600"
                            checked={soloActivos}
                            onChange={(e) => {
                                setSoloActivos(e.target.checked);
                                setPage(0);
                            }}
                        />
                        Sólo activos
                    </label>

                    {/* botón crear usuario */}
                    {canCrearUser && (
                        <button
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm shadow-sm"
                            onClick={() => setMostrarForm({ modo: "crear" })}
                        >
                            + Nuevo usuario
                        </button>
                    )}
                </div>
            </div>

            {/* aviso operadores (no admin) */}
            {!yoEsAdmin && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    Por política de seguridad, se ocultan los usuarios con rol{" "}
                    <b>ADMIN</b> y no puedes gestionarlos.
                </div>
            )}

            {/* estados */}
            {loading && <div>Cargando…</div>}

            {!yoEsAdmin && hydratingCounts && !loading && (
                <div className="text-xs text-neutral-600">
                    Verificando permisos sobre usuarios…
                </div>
            )}

            {error && (
                <div className="text-red-600 whitespace-pre-wrap border border-red-200 bg-red-50 rounded px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            {/* Tabla */}
            {!loading && !error && (
                <div className="border rounded bg-white overflow-x-auto shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-[13px] uppercase font-bold">
                        <tr>
                            <th className="text-left p-2">Usuario</th>
                            <th className="text-left p-2">Nombre</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Roles</th>
                            <th className="text-left p-2">Estado</th>
                            <th className="text-right p-2">Acciones</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {rows.map((u: UsuarioDTO, idx: number) => {
                            const count =
                                roleCounts[u.id!] ??
                                (Array.isArray(u.roles) ? u.roles.length : undefined);
                            const nombres = roleNames[u.id!] ?? [];
                            const chip = count === undefined ? "…" : count;

                            const soyYo = isSelf(u);
                            const usuarioEsAdmin = filaEsAdmin(u);
                            const puedeGestionarEste = yoEsAdmin || !usuarioEsAdmin;

                            return (
                                <tr
                                    key={u.id ?? u.username ?? idx}
                                    className="bg-white align-top"
                                >
                                    <td className="p-2">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {u.username}
                          {soyYo && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                            Tú
                          </span>
                          )}
                          {usuarioEsAdmin && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            ADMIN
                          </span>
                          )}
                      </span>
                                    </td>

                                    <td className="p-2 break-words">
                                        {u.nombreCompleto}
                                    </td>

                                    <td className="p-2 break-words">
                                        {u.email}
                                    </td>

                                    <td className="p-2">
                                        <button
                                            type="button"
                                            className="hover:opacity-80"
                                            onClick={() =>
                                                setMostrarRolesVer({
                                                    usuario: u,
                                                    nombres,
                                                })
                                            }
                                            title="Ver roles asignados"
                                        >
                                            {renderRolesChip(chip)}
                                        </button>
                                    </td>

                                    <td className="p-2 align-top">
                                        {u.activo ? (
                                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                          Activo
                        </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">
                          Inactivo
                        </span>
                                        )}
                                    </td>

                                    <td className="p-2 text-right align-top">
                                        <div className="inline-flex flex-wrap gap-1.5 justify-end">
                                            {/* Editar */}
                                            {canActualizarUser && puedeGestionarEste && (
                                                <IconBtn
                                                    title="Editar"
                                                    onClick={() =>
                                                        setMostrarForm({
                                                            modo: "editar",
                                                            usuario: u,
                                                        })
                                                    }
                                                >
                                                    <Pencil
                                                        size={18}
                                                        className="text-neutral-700"
                                                    />
                                                </IconBtn>
                                            )}

                                            {/* Roles */}
                                            {canAsignarRoles && puedeGestionarEste && (
                                                <IconBtn
                                                    title="Asignar/Quitar roles"
                                                    onClick={async () => {
                                                        try {
                                                            const detalle: any =
                                                                await UsuarioService.obtener(
                                                                    u.id
                                                                );
                                                            const actuales = normalizeRolesList(
                                                                detalle?.roles ??
                                                                detalle?.authorities ??
                                                                detalle?.perfiles ??
                                                                detalle?.rolesNombres ??
                                                                []
                                                            );
                                                            setRoleCounts((m) => ({
                                                                ...m,
                                                                [u.id!]: actuales.length,
                                                            }));
                                                            setRoleNames((m) => ({
                                                                ...m,
                                                                [u.id!]: actuales.map(
                                                                    (r) => r.nombre
                                                                ),
                                                            }));
                                                            setMostrarRoles(u);
                                                        } catch (e: any) {
                                                            if (e?.status === 403)
                                                                return show403();
                                                            setMostrarRoles(u);
                                                        }
                                                    }}
                                                >
                                                    <Shield
                                                        size={18}
                                                        className="text-neutral-700"
                                                    />
                                                </IconBtn>
                                            )}

                                            {/* Password */}
                                            {canCambiarPwd && puedeGestionarEste && (
                                                <IconBtn
                                                    title="Cambiar / Restablecer contraseña"
                                                    onClick={() => setMostrarPwd(u)}
                                                >
                                                    <Key
                                                        size={18}
                                                        className="text-neutral-700"
                                                    />
                                                </IconBtn>
                                            )}

                                            {/* Activar / Desactivar (toggle mini) */}
                                            {canCambiarEstado && puedeGestionarEste && (
                                                <ActiveToggleMini
                                                    value={!!u.activo}
                                                    title={
                                                        soyYo
                                                            ? "No puedes desactivarte/activarte a ti mismo"
                                                            : u.activo
                                                                ? "Desactivar"
                                                                : "Activar"
                                                    }
                                                    disabled={soyYo}
                                                    onToggle={async (next) => {
                                                        if (soyYo) return;
                                                        try {
                                                            await UsuarioService.cambiarEstado(
                                                                u.id,
                                                                next
                                                            );
                                                            await cargar();
                                                        } catch (e: any) {
                                                            if (e?.status === 403) {
                                                                show403();
                                                                return;
                                                            }
                                                            const msg = await parseError(e);
                                                            setError(
                                                                msg ??
                                                                "No se pudo cambiar el estado."
                                                            );
                                                        }
                                                    }}
                                                />
                                            )}

                                            {/* Eliminar */}
                                            {canEliminarUser && puedeGestionarEste && (
                                                <IconBtn
                                                    title={
                                                        soyYo
                                                            ? "No puedes eliminarte a ti mismo"
                                                            : "Eliminar"
                                                    }
                                                    onClick={() =>
                                                        askEliminar(u, soyYo, puedeGestionarEste)
                                                    }
                                                    disabled={soyYo}
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
                        })}

                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-6 text-center text-gray-500"
                                >
                                    Sin resultados
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>

                    {/* paginación */}
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

            {/* ===================== Modales existentes ===================== */}

            {/* Crear / Editar Usuario */}
            {mostrarForm && (
                <UsuarioFormModal
                    modo={mostrarForm.modo}
                    usuario={mostrarForm.usuario}
                    onClose={() => setMostrarForm(null)}
                    onSaved={() => {
                        setMostrarForm(null);
                        cargar();
                    }}
                    canCrear={canCrearUser}
                    canActualizar={canActualizarUser}
                    show403={show403}
                />
            )}

            {/* Cambiar / Resetear Password */}
            {mostrarPwd && canCambiarPwd && (
                <PasswordModal
                    usuario={mostrarPwd}
                    yoEsAdmin={yoEsAdmin}
                    esMiPerfil={isSelf(mostrarPwd)}
                    onClose={() => setMostrarPwd(null)}
                    onSaved={() => {
                        setMostrarPwd(null);
                    }}
                    show403={show403}
                />
            )}

            {/* Asignar/Quitar Roles */}
            {mostrarRoles && canAsignarRoles && (
                <RolesModal
                    usuario={mostrarRoles}
                    yoEsAdmin={yoEsAdmin}
                    onClose={() => setMostrarRoles(null)}
                    onSaved={async () => {
                        try {
                            const detalle: any = await UsuarioService.obtener(
                                mostrarRoles.id
                            );
                            const roles = normalizeRolesList(
                                detalle?.roles ??
                                detalle?.authorities ??
                                detalle?.perfiles ??
                                detalle?.rolesNombres ??
                                []
                            );
                            setRoleCounts((m) => ({
                                ...m,
                                [mostrarRoles.id!]: roles.length,
                            }));
                            setRoleNames((m) => ({
                                ...m,
                                [mostrarRoles.id!]: roles.map((r) => r.nombre),
                            }));
                        } catch {
                            // ignore
                        } finally {
                            setMostrarRoles(null);
                        }
                    }}
                    show403={show403}
                />
            )}

            {/* Ver Roles (solo lectura) */}
            {mostrarRolesVer && (
                <RolesVerModal
                    usuario={mostrarRolesVer.usuario}
                    nombres={mostrarRolesVer.nombres}
                    onClose={() => setMostrarRolesVer(null)}
                />
            )}

            {/* Confirmar eliminación usuario */}
            <ConfirmModal
                open={confirmOpen && !!confirmRow}
                title="Eliminar usuario"
                message={
                    <>
                        ¿Eliminar al usuario{" "}
                        <b>{confirmRow?.username}</b>{" "}
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
                onConfirm={doEliminar}
                onClose={() => {
                    if (confirmBusy) return;
                    setConfirmOpen(false);
                    setConfirmRow(null);
                }}
            />
        </div>
    );
}

/* =========================================================
   Modales secundarios (sin cambios de lógica)
   ========================================================= */

function UsuarioFormModal({
                              modo,
                              usuario,
                              onClose,
                              onSaved,
                              canCrear,
                              canActualizar,
                              show403,
                          }: {
    modo: "crear" | "editar";
    usuario?: UsuarioDTO;
    onClose: () => void;
    onSaved: () => void;
    canCrear: boolean;
    canActualizar: boolean;
    show403: () => void;
}) {
    const isEdit = modo === "editar";

    const [form, setForm] = useState<
        UsuarioCrearDTO | UsuarioEditarDTO
    >(() =>
        isEdit
            ? {
                username: usuario!.username,
                nombreCompleto: usuario!.nombreCompleto,
                email: usuario!.email,
                telefono: usuario!.telefono ?? undefined,
                activo: usuario!.activo,
            }
            : (({
                username: "",
                nombreCompleto: "",
                email: "",
                telefono: "",
                password: "",
                // campo solo UI
                passwordConfirm: "",
                activo: true,
            } as unknown) as any)
    );

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [showPwd, setShowPwd] = useState(false);

    function genPass(len = 12) {
        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?";
        let out = "";
        for (let i = 0; i < len; i++)
            out += chars[Math.floor(Math.random() * chars.length)];
        return out;
    }

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
            if (isEdit) {
                const raw = form as any;

                const body: Record<string, any> = {
                    nombreUsuario: String(raw.username ?? "").trim(),
                    nombreCompleto: String(raw.nombreCompleto ?? "").trim(),
                    correoElectronico: String(raw.email ?? "").trim(),
                };
                if (raw.telefono != null) body.telefono = String(raw.telefono).trim();
                if (raw.activo != null) body.estadoActivo = !!raw.activo;

                await UsuarioService.editar(
                    (usuario as UsuarioDTO).id,
                    body as UsuarioEditarDTO
                );
            } else {
                const raw = form as any;
                if (
                    String(raw.password ?? "") !==
                    String(raw.passwordConfirm ?? "")
                ) {
                    setErr("Las contraseñas no coinciden.");
                    setSaving(false);
                    return;
                }

                const body: Record<string, any> = {
                    nombreUsuario: String(raw.username ?? "").trim(),
                    nombreCompleto: String(raw.nombreCompleto ?? "").trim(),
                    correoElectronico: String(raw.email ?? "").trim(),
                    contrasena: String(raw.password ?? "").trim(),
                    estadoActivo: !!raw.activo,
                };
                if (
                    raw.telefono != null &&
                    String(raw.telefono).trim() !== ""
                )
                    body.telefono = String(raw.telefono).trim();

                await UsuarioService.crear(body as UsuarioCrearDTO);
            }

            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                return;
            }
            setErr(await parseError(e));
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
                className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
            >
                {/* Header sticky */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        {isEdit ? "Editar usuario" : "Nuevo usuario"}
                        {!isEdit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                Paso 1: Datos básicos
              </span>
                        )}
                    </h3>
                    {!isEdit && !canCrear && (
                        <div className="text-sm text-neutral-600">
                            No tienes permiso para realizar esta acción.
                        </div>
                    )}
                </div>

                {/* Contenido scrollable */}
                <div className="max-h-[65vh] overflow-y-auto px-5 py-5 space-y-4 text-sm text-neutral-800">
                    {isEdit || canCrear ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-neutral-700">
                                        Usuario
                                    </label>
                                    <input
                                        className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                        required
                                        value={(form as any).username ?? ""}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...(f as any),
                                                username: e.target.value,
                                            }))
                                        }
                                        placeholder="ej. jfernandez"
                                    />
                                    <p className="text-xs text-neutral-500">
                                        Debe ser único dentro del sistema.
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-neutral-700">
                                        Nombre completo
                                    </label>
                                    <input
                                        className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                        required
                                        value={(form as any).nombreCompleto ?? ""}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...(f as any),
                                                nombreCompleto: e.target.value,
                                            }))
                                        }
                                        placeholder="Nombre y apellido"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-neutral-700">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                        required
                                        value={(form as any).email ?? ""}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...(f as any),
                                                email: e.target.value,
                                            }))
                                        }
                                        placeholder="alguien@dominio.com"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-neutral-700">
                                        Teléfono
                                    </label>
                                    <input
                                        className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                        value={(form as any).telefono ?? ""}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...(f as any),
                                                telefono: e.target.value,
                                            }))
                                        }
                                        placeholder="Opcional"
                                    />
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium text-neutral-700">
                                        Estado
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            className={[
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition",
                                                (form as any).activo
                                                    ? "bg-emerald-600"
                                                    : "bg-neutral-300",
                                            ].join(" ")}
                                            onClick={() =>
                                                setForm((f) => ({
                                                    ...(f as any),
                                                    activo: !(f as any).activo,
                                                }))
                                            }
                                            title={(form as any).activo ? "Activo" : "Inactivo"}
                                        >
                      <span
                          className={[
                              "inline-block h-5 w-5 transform rounded-full bg-white transition",
                              (form as any).activo
                                  ? "translate-x-6"
                                  : "translate-x-1",
                          ].join(" ")}
                      />
                                        </button>
                                        <span className="text-sm text-neutral-700">
                      {(form as any).activo ? "Activo" : "Inactivo"}
                    </span>
                                    </div>
                                </div>

                                {!isEdit && (
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-sm font-medium text-neutral-700">
                                            Contraseña inicial
                                        </label>
                                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                            <input
                                                type={showPwd ? "text" : "password"}
                                                className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                                required
                                                value={(form as any).password ?? ""}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...(f as any),
                                                        password: e.target.value,
                                                    }))
                                                }
                                                placeholder="Mínimo 8 caracteres"
                                            />
                                            <button
                                                type="button"
                                                className="px-3 py-2 border rounded-lg text-sm hover:bg-neutral-50 border-neutral-300 text-neutral-700"
                                                onClick={() => setShowPwd((v) => !v)}
                                                title={
                                                    showPwd
                                                        ? "Ocultar contraseña"
                                                        : "Mostrar contraseña"
                                                }
                                            >
                                                {showPwd ? "Ocultar" : "Mostrar"}
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-2 border rounded-lg text-sm hover:bg-neutral-50 border-neutral-300 text-neutral-700"
                                                onClick={() => {
                                                    const p = genPass(12);
                                                    setForm((f) => ({
                                                        ...(f as any),
                                                        password: p,
                                                        passwordConfirm: p,
                                                    }));
                                                }}
                                                title="Generar contraseña aleatoria"
                                            >
                                                Generar
                                            </button>
                                        </div>
                                        <p className="text-xs text-neutral-500">
                                            Recomendada: 12+ caracteres.
                                        </p>
                                    </div>
                                )}

                                {!isEdit && (
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-sm font-medium text-neutral-700">
                                            Confirmar contraseña
                                        </label>
                                        <input
                                            type={showPwd ? "text" : "password"}
                                            className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                            required
                                            value={(form as any).passwordConfirm ?? ""}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...(f as any),
                                                    passwordConfirm: e.target.value,
                                                }))
                                            }
                                            placeholder="Repite la contraseña"
                                        />
                                    </div>
                                )}
                            </div>

                            {err && (
                                <div className="text-red-600 text-sm whitespace-pre-wrap">
                                    {err}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm text-neutral-600">
                            No tienes permiso para realizar esta acción.
                        </div>
                    )}
                </div>

                {/* Footer sticky */}
                <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t px-5 py-3 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm text-neutral-700"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    {(!isEdit || canActualizar) && (
                        <button
                            type="submit"
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
                            disabled={saving}
                        >
                            {isEdit ? "Guardar" : "Crear"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

function PasswordModal({
                           usuario,
                           yoEsAdmin,
                           esMiPerfil,
                           onClose,
                           onSaved,
                           show403,
                       }: {
    usuario: UsuarioDTO;
    yoEsAdmin: boolean;
    esMiPerfil: boolean;
    onClose: () => void;
    onSaved: () => void;
    show403: () => void;
}) {
    const [passwordNueva, setPasswordNueva] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [passwordActual, setPasswordActual] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmitMiPropia(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErr(null);

        try {
            if (!passwordActual.trim()) {
                setErr("Debes ingresar la contraseña actual.");
                setSaving(false);
                return;
            }
            if (passwordNueva !== passwordConfirm) {
                setErr("Las contraseñas no coinciden.");
                setSaving(false);
                return;
            }

            const body: Record<string, any> = {
                passwordActual: passwordActual,
                passwordNueva: passwordNueva,
            };

            await UsuarioService.cambiarPassword(usuario.id, body as any);

            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                return;
            }
            setErr(await parseError(e));
        } finally {
            setSaving(false);
        }
    }

    async function onEnviarResetLink() {
        setSaving(true);
        setErr(null);
        try {
            // Endpoint de reset (o fallback temporal)
            await UsuarioService.cambiarPassword(usuario.id, {
                resetPorEmail: true,
            } as any);

            onSaved();
            // Nota: seguimos mostrando alert acá porque es feedback inmediato del flujo "enviar link"
            alert(
                "Se envió un enlace de restablecimiento al correo del usuario."
            );
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                return;
            }
            setErr(await parseError(e));
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
                className="bg-white w-full max-w-md rounded-2xl p-0 shadow-xl border border-neutral-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onSubmit={esMiPerfil ? onSubmitMiPropia : (e) => e.preventDefault()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-3">
                    <h3 className="text-lg font-semibold">
                        {esMiPerfil ? "Cambiar contraseña" : "Restablecer contraseña"} —{" "}
                        {usuario.username}
                    </h3>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3 text-sm text-neutral-800">
                    {esMiPerfil ? (
                        <>
                            <input
                                type="password"
                                className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                placeholder="Contraseña actual"
                                value={passwordActual}
                                onChange={(e) => setPasswordActual(e.target.value)}
                                required
                            />
                            <input
                                type="password"
                                className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                placeholder="Nueva contraseña"
                                value={passwordNueva}
                                onChange={(e) => setPasswordNueva(e.target.value)}
                                required
                            />
                            <input
                                type="password"
                                className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                                placeholder="Confirmar nueva contraseña"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                required
                            />
                            {err && (
                                <div className="text-red-600 text-sm whitespace-pre-wrap">
                                    {err}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {yoEsAdmin ? (
                                <div className="space-y-3 text-sm text-neutral-700">
                                    <p>
                                        Por seguridad, nadie puede ver ni establecer la contraseña
                                        de otra persona directamente. Se enviará un{" "}
                                        <b>enlace de restablecimiento</b> al correo del usuario.
                                    </p>
                                    <p className="text-neutral-600">
                                        Con ese enlace, el usuario definirá su nueva contraseña. No
                                        se revela ninguna contraseña a administradores ni
                                        operadores.
                                    </p>
                                    {err && (
                                        <div className="text-red-600 whitespace-pre-wrap">
                                            {err}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-neutral-600">
                                    No tienes permisos para restablecer contraseñas de otros
                                    usuarios.
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t px-5 py-3 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm text-neutral-700"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    {esMiPerfil ? (
                        <button
                            type="submit"
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
                            disabled={saving}
                        >
                            Actualizar
                        </button>
                    ) : yoEsAdmin ? (
                        <button
                            type="button"
                            onClick={onEnviarResetLink}
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
                            disabled={saving}
                        >
                            Enviar enlace de restablecimiento
                        </button>
                    ) : null}
                </div>
            </form>
        </div>
    );
}

/* Modal EDITABLE (asignar/quitar roles) */
function RolesModal({
                        usuario,
                        yoEsAdmin,
                        onClose,
                        onSaved,
                        show403,
                    }: {
    usuario: UsuarioDTO;
    yoEsAdmin: boolean;
    onClose: () => void;
    onSaved: () => void;
    show403: () => void;
}) {
    const [roles, setRoles] = useState<Array<{ id: number; nombre: string }>>([]);
    const [seleccion, setSeleccion] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [filtro, setFiltro] = useState("");

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const { RolService } = await import("@/servicios/rol");

                // Traer todos los roles
                const page = await RolService.listar({
                    page: 0,
                    size: 1000,
                });
                let opciones = (page.content ?? []).map(
                    (r: any, i: number) => {
                        const id =
                            r?.id ?? r?.rolId ?? r?.idRol ?? i + 1;
                        const nombre =
                            r?.nombre ??
                            r?.nombreRol ??
                            r?.name ??
                            r?.authority ??
                            String(r ?? "");
                        return { id, nombre };
                    }
                );

                // si NO soy admin, oculto roles ADMIN de la lista
                if (!yoEsAdmin) {
                    opciones = opciones.filter(
                        (o) =>
                            !String(o.nombre)
                                .toUpperCase()
                                .includes("ADMIN")
                    );
                }

                // roles actuales del usuario
                const detalle: any = await UsuarioService.obtener(
                    usuario.id
                );
                const rolesUsuario = normalizeRolesList(
                    detalle?.roles ??
                    detalle?.authorities ??
                    detalle?.perfiles ??
                    detalle?.rolesNombres ??
                    []
                ).filter((r) =>
                    yoEsAdmin
                        ? true
                        : !String(r.nombre)
                            .toUpperCase()
                            .includes("ADMIN")
                );

                if (!mounted) return;

                setRoles(opciones);

                // intentar seleccionar por id
                const ids = rolesUsuario.map((r) => r.id).filter(Boolean);
                if (ids.length) {
                    setSeleccion(ids as number[]);
                } else {
                    // fallback por nombre
                    const nombres = rolesUsuario.map((r) => r.nombre);
                    const resolved = opciones
                        .filter((o) => nombres.includes(o.nombre))
                        .map((o) => o.id);
                    setSeleccion(resolved);
                }
            } catch (e: any) {
                if (mounted) setErr(e?.message ?? String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [usuario.id, yoEsAdmin]);

    // filtrado
    const filtrados = useMemo(() => {
        const q = filtro.trim().toLowerCase();
        if (!q) return roles;
        return roles.filter((r) =>
            r.nombre.toLowerCase().includes(q)
        );
    }, [filtro, roles]);

    function toggleRole(id: number) {
        setSeleccion((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    }

    const seleccionarTodo = () =>
        setSeleccion(filtrados.map((r) => r.id));
    const limpiarTodo = () => setSeleccion([]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            await UsuarioService.asignarRoles(usuario.id, {
                rolesIds: seleccion,
            });
            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                show403();
                return;
            }
            alert(await parseError(e));
        }
    }

    // estilos compactos internos del modal
    const btn =
        "px-2.5 py-1.5 rounded-md border border-neutral-300 text-[13px] hover:bg-neutral-50";
    const btnPrimary =
        "px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm";
    const chip =
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-neutral-100 text-neutral-700";

    return (
        <div
            className="fixed inset-0 z-[70] bg-black/40 flex items-start justify-center px-4 pt-16 pb-6"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <form
                className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="text-base font-semibold leading-tight">
                                Asignar roles —{" "}
                                <span className="font-normal">
                  {usuario.username}
                </span>
                            </h3>
                            <div className="mt-1 text-xs text-neutral-600">
                                Selecciona los roles que tendrá este
                                usuario.
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-8 w-8 grid place-items-center rounded-md border border-neutral-300 hover:bg-neutral-50 text-neutral-600"
                            aria-label="Cerrar"
                            title="Cerrar"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Barra acciones */}
                <div className="sticky top-[56px] z-10 bg-white/95 backdrop-blur border-b">
                    <div className="px-5 py-2.5 flex flex-col sm:flex-row gap-2 sm:items-center">
                        <input
                            className="border rounded-md px-3 py-2 w-full sm:w-80 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                            placeholder="Buscar rol…"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />

                        <div className="sm:ml-auto flex items-center gap-2">
              <span
                  className={chip}
                  title="Seleccionados / Total filtrados"
              >
                {
                    seleccion.filter((id) =>
                        filtrados.some((f) => f.id === id)
                    ).length
                }
                  /{filtrados.length}
              </span>

                            <button
                                type="button"
                                className={btn}
                                onClick={seleccionarTodo}
                                title="Seleccionar todos (filtrados)"
                            >
                                Seleccionar todos
                            </button>

                            <button
                                type="button"
                                className={btn}
                                onClick={limpiarTodo}
                                title="Limpiar selección"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lista roles */}
                <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
                    {loading && (
                        <div className="text-sm text-neutral-600">
                            Cargando…
                        </div>
                    )}
                    {err && (
                        <div className="text-sm text-red-600">
                            {err}
                        </div>
                    )}
                    {!loading && !err && (
                        <>
                            {filtrados.length === 0 ? (
                                <div className="text-sm text-neutral-500">
                                    No hay roles para mostrar.
                                </div>
                            ) : (
                                <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 overflow-hidden">
                                    {filtrados.map((r) => {
                                        const checked = seleccion.includes(r.id);
                                        return (
                                            <li
                                                key={r.id}
                                                className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition ${
                                                    checked
                                                        ? "bg-emerald-50/40"
                                                        : "bg-white"
                                                } hover:bg-neutral-50`}
                                            >
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleRole(r.id)}
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="select-none">
                            {r.nombre}
                          </span>
                                                </label>

                                                {checked && (
                                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            Seleccionado
                          </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t px-5 py-3 flex items-center justify-between">
                    <div className="text-xs text-neutral-600">
                        Total seleccionados:{" "}
                        <b>{seleccion.length}</b>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className={btn}
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={btnPrimary}
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

/* Modal SOLO LECTURA para ver roles asignados */
function RolesVerModal({
                           usuario,
                           nombres,
                           onClose,
                       }: {
    usuario: UsuarioDTO;
    nombres: string[];
    onClose: () => void;
}) {
    const list = Array.isArray(nombres) ? nombres : [];

    return (
        <div
            className="fixed inset-0 z-[70] bg-black/50 flex items-start md:items-center justify-center px-4 pt-16 pb-6"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white w-full max-w-md rounded-2xl p-0 shadow-xl border border-neutral-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-3">
                    <h3 className="text-lg font-semibold">
                        Roles de {usuario.username}
                    </h3>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto px-5 py-3 text-sm text-neutral-800">
                    {list.length === 0 ? (
                        <div className="text-sm text-gray-500">
                            Este usuario no tiene roles.
                        </div>
                    ) : (
                        <ul className="list-disc ml-5 space-y-1">
                            {list.map((n, i) => (
                                <li key={i}>{n}</li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t px-5 py-3 flex items-center justify-end">
                    <button
                        className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm text-neutral-700"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
