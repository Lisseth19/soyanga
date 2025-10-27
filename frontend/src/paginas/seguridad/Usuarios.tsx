// src/paginas/seguridad/Usuarios.tsx
import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/types/pagination";
import type { UsuarioDTO, UsuarioCrearDTO, UsuarioEditarDTO } from "@/types/usuario";
import { UsuarioService } from "@/servicios/usuario";
import { Paginacion } from "@/componentes/Paginacion";
import { useAuth } from "@/context/AuthContext";

/* ---------------- Utils ---------------- */
async function parseError(e: any) {
    try {
        const res = e?.details?.response ?? e?.response ?? e;
        const txt = await res?.text?.();
        if (!txt) return e?.message ?? String(e);
        try {
            const json = JSON.parse(txt);
            if (json?.message) return json.message;
            if (Array.isArray(json?.errors)) return json.errors.join("\n");
            if (json?.errors && typeof json.errors === "object") {
                return Object.values(json.errors as Record<string, string>).join("\n");
            }
            return txt;
        } catch {
            return txt;
        }
    } catch {
        return e?.message ?? String(e);
    }
}

function normalizeRolesList(rolesRaw: any): Array<{ id: number; nombre: string }> {
    const arr = Array.isArray(rolesRaw) ? rolesRaw : [];
    return arr.map((r: any) => {
        if (typeof r === "string") return { id: 0, nombre: r };
        const nombre = r?.nombre ?? r?.nombreRol ?? r?.name ?? r?.authority ?? String(r);
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
        (typeof x?.estado === "string" ? x.estado.toUpperCase() === "ACTIVO" : undefined);

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

/* ---------------- Página ---------------- */
export default function UsuariosPage() {
    const { user } = useAuth() as { user?: any };

    // ===== helper de permisos (admin ve todo)
    const can = useMemo(() => {
        const perms: string[] = user?.permisos ?? [];
        const roles: string[] = user?.roles ?? [];
        const isAdmin = roles.includes("ADMIN");
        return (perm: string) => isAdmin || perms.includes(perm);
    }, [user]);

    const [q, setQ] = useState("");
    const [soloActivos, setSoloActivos] = useState(false);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);

    const [data, setData] = useState<Page<UsuarioDTO> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modales
    const [mostrarForm, setMostrarForm] = useState<{ modo: "crear" | "editar"; usuario?: UsuarioDTO } | null>(null);
    const [mostrarPwd, setMostrarPwd] = useState<UsuarioDTO | null>(null);
    const [mostrarRoles, setMostrarRoles] = useState<UsuarioDTO | null>(null);
    const [mostrarRolesVer, setMostrarRolesVer] = useState<{ usuario: UsuarioDTO; nombres: string[] } | null>(null);

    // Cache: conteo y nombres de roles por usuario
    const [roleCounts, setRoleCounts] = useState<Record<number, number>>({});
    const [roleNames, setRoleNames] = useState<Record<number, string[]>>({});
    const [hydratingCounts, setHydratingCounts] = useState(false);

    function show403() {
        alert("No tienes permiso para realizar esta acción.");
    }

    async function cargar() {
        setLoading(true);
        setError(null);
        try {
            const res = await UsuarioService.listar({ q, soloActivos, page, size });
            const pageData: Page<UsuarioDTO> = {
                ...res,
                content: (res.content ?? []).map(normalizeUsuario),
            };
            setData(pageData);

            // Prefetch de conteos y nombres de todos los usuarios visibles
            const ids = (pageData.content ?? []).map((u) => u.id).filter(Boolean) as number[];
            if (ids.length) {
                setHydratingCounts(true);
                const pendientes = ids.filter((id) => roleCounts[id] === undefined || roleNames[id] === undefined);
                if (pendientes.length) {
                    const detalles = await Promise.all(pendientes.map((id) => UsuarioService.obtener(id).catch(() => null)));
                    const nuevosCounts: Record<number, number> = {};
                    const nuevosNombres: Record<number, string[]> = {};
                    pendientes.forEach((id, idx) => {
                        const det: any = detalles[idx];
                        if (det) {
                            const roles = normalizeRolesList(
                                det?.roles ?? det?.authorities ?? det?.perfiles ?? det?.rolesNombres ?? []
                            );
                            nuevosCounts[id] = roles.length;
                            nuevosNombres[id] = roles.map((r) => r.nombre);
                        }
                    });
                    if (Object.keys(nuevosCounts).length) setRoleCounts((m) => ({ ...m, ...nuevosCounts }));
                    if (Object.keys(nuevosNombres).length) setRoleNames((m) => ({ ...m, ...nuevosNombres }));
                }
                setHydratingCounts(false);
            }
        } catch (e: any) {
            if (e?.status === 403) setError("Acceso denegado.");
            else setError(e?.message ?? String(e));
            setData(null);
            setLoading(false);
            setHydratingCounts(false);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, soloActivos, page, size]);

    const rows = useMemo(() => data?.content ?? [], [data]);

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-xl font-semibold">Usuarios</h1>
                <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
                    <input
                        className="border rounded px-3 py-2 w-72"
                        placeholder="Buscar por usuario/nombre/email"
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(0);
                        }}
                    />
                    <label className="inline-flex items-center gap-2 px-1">
                        <input
                            type="checkbox"
                            checked={soloActivos}
                            onChange={(e) => {
                                setSoloActivos(e.target.checked);
                                setPage(0);
                            }}
                        />
                        Sólo activos
                    </label>

                    {can("usuarios:crear") && (
                        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-sm" onClick={() => setMostrarForm({ modo: "crear" })}>
                            + Nuevo usuario
                        </button>
                    )}
                </div>
            </div>

            {loading && <div>Cargando…</div>}
            {error && <div className="text-red-600">{error}</div>}

            {/* Tabla */}
            {!loading && !error && (
                <div className="border rounded overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-2">Usuario</th>
                                <th className="text-left p-2">Nombre</th>
                                <th className="text-left p-2">Email</th>
                                <th className="text-left p-2">Roles</th>
                                <th className="text-left p-2">Estado</th>
                                <th className="text-right p-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((u, idx) => {
                                const count = roleCounts[u.id!] ?? (Array.isArray(u.roles) ? u.roles.length : undefined);
                                const nombres = roleNames[u.id!] ?? [];
                                const chip = count === undefined ? (hydratingCounts ? "…" : "…") : count;

                                return (
                                    <tr key={u.id || u.username || idx} className="border-t">
                                        <td className="p-2">{u.username}</td>
                                        <td className="p-2">{u.nombreCompleto}</td>
                                        <td className="p-2">{u.email}</td>
                                        <td className="p-2">
                                            <button
                                                type="button"
                                                className="hover:opacity-80"
                                                onClick={() => setMostrarRolesVer({ usuario: u, nombres })}
                                                title="Ver roles asignados"
                                            >
                                                {renderRolesChip(chip)}
                                            </button>
                                        </td>
                                        <td className="p-2">
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${u.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {u.activo ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="p-2 text-right">
                                            <div className="inline-flex gap-2">
                                                {can("usuarios:actualizar") && (
                                                    <button className="underline" onClick={() => setMostrarForm({ modo: "editar", usuario: u })}>
                                                        Editar
                                                    </button>
                                                )}

                                                {can("usuarios:actualizar") && (
                                                    <button
                                                        className="underline"
                                                        onClick={async () => {
                                                            try {
                                                                const detalle: any = await UsuarioService.obtener(u.id);
                                                                const actuales = normalizeRolesList(
                                                                    detalle?.roles ?? detalle?.authorities ?? detalle?.perfiles ?? detalle?.rolesNombres ?? []
                                                                );
                                                                setRoleCounts((m) => ({ ...m, [u.id!]: actuales.length }));
                                                                setRoleNames((m) => ({ ...m, [u.id!]: actuales.map((r) => r.nombre) }));
                                                                setMostrarRoles(u);
                                                            } catch {
                                                                setMostrarRoles(u);
                                                            }
                                                        }}
                                                        title="Asignar/Quitar roles"
                                                    >
                                                        Asignar roles
                                                    </button>
                                                )}

                                                {can("usuarios:actualizar") && (
                                                    <button className="underline" onClick={() => setMostrarPwd(u)}>
                                                        Password
                                                    </button>
                                                )}

                                                {can("usuarios:actualizar") && (
                                                    <button
                                                        className="underline"
                                                        title={u.activo ? "Desactivar" : "Activar"}
                                                        onClick={async () => {
                                                            try {
                                                                await UsuarioService.cambiarEstado(u.id, !u.activo);
                                                                await cargar();
                                                            } catch (e: any) {
                                                                if (e?.status === 403) return show403();
                                                                alert(await parseError(e));
                                                            }
                                                        }}
                                                    >
                                                        {u.activo ? "Desactivar" : "Activar"}
                                                    </button>
                                                )}

                                                {can("usuarios:eliminar") && (
                                                    <button
                                                        className="text-red-600 underline"
                                                        onClick={async () => {
                                                            if (!confirm("¿Eliminar usuario?")) return;
                                                            try {
                                                                await UsuarioService.eliminar(u.id);
                                                                await cargar();
                                                            } catch (e: any) {
                                                                if (e?.status === 403) return show403();
                                                                alert(await parseError(e));
                                                            }
                                                        }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-gray-500">
                                        Sin resultados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="p-3">
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

            {/* Modales */}
            {mostrarForm && (
                <UsuarioFormModal
                    modo={mostrarForm.modo}
                    usuario={mostrarForm.usuario}
                    onClose={() => setMostrarForm(null)}
                    onSaved={() => {
                        setMostrarForm(null);
                        cargar();
                    }}
                    canCrear={can("usuarios:crear")}
                    canActualizar={can("usuarios:actualizar")}
                />
            )}

            {mostrarPwd && can("usuarios:actualizar") && (
                <PasswordModal
                    usuario={mostrarPwd}
                    onClose={() => setMostrarPwd(null)}
                    onSaved={() => {
                        setMostrarPwd(null);
                    }}
                />
            )}

            {mostrarRoles && can("usuarios:actualizar") && (
                <RolesModal
                    usuario={mostrarRoles}
                    onClose={() => setMostrarRoles(null)}
                    onSaved={async () => {
                        try {
                            const detalle: any = await UsuarioService.obtener(mostrarRoles.id);
                            const roles = normalizeRolesList(
                                detalle?.roles ?? detalle?.authorities ?? detalle?.perfiles ?? detalle?.rolesNombres ?? []
                            );
                            setRoleCounts((m) => ({ ...m, [mostrarRoles.id!]: roles.length }));
                            setRoleNames((m) => ({ ...m, [mostrarRoles.id!]: roles.map((r) => r.nombre) }));
                        } catch {
                            // ignore
                        } finally {
                            setMostrarRoles(null);
                        }
                    }}
                />
            )}

            {mostrarRolesVer && (
                <RolesVerModal
                    usuario={mostrarRolesVer.usuario}
                    nombres={mostrarRolesVer.nombres}
                    onClose={() => setMostrarRolesVer(null)}
                />
            )}
        </div>
    );
}

/* ---------------- Modales ---------------- */

function UsuarioFormModal({
    modo,
    usuario,
    onClose,
    onSaved,
    canCrear,
    canActualizar,
}: {
    modo: "crear" | "editar";
    usuario?: UsuarioDTO;
    onClose: () => void;
    onSaved: () => void;
    canCrear: boolean;
    canActualizar: boolean;
}) {
    const isEdit = modo === "editar";
    const [form, setForm] = useState<UsuarioCrearDTO | UsuarioEditarDTO>(() =>
        isEdit
            ? {
                username: usuario!.username,
                nombreCompleto: usuario!.nombreCompleto,
                email: usuario!.email,
                telefono: usuario!.telefono ?? undefined,
                activo: usuario!.activo,
            }
            : { username: "", nombreCompleto: "", email: "", telefono: "", password: "", activo: true }
    );
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function show403() {
        alert("No tienes permiso para realizar esta acción.");
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (isEdit && !canActualizar) return show403();
        if (!isEdit && !canCrear) return show403();

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

                await UsuarioService.editar((usuario as UsuarioDTO).id, body as UsuarioEditarDTO);
            } else {
                const raw = form as any;
                const body: Record<string, any> = {
                    nombreUsuario: String(raw.username ?? "").trim(),
                    nombreCompleto: String(raw.nombreCompleto ?? "").trim(),
                    correoElectronico: String(raw.email ?? "").trim(),
                    contrasena: String(raw.password ?? "").trim(),
                    estadoActivo: !!raw.activo,
                };
                if (raw.telefono != null && String(raw.telefono).trim() !== "") body.telefono = String(raw.telefono).trim();

                await UsuarioService.crear(body as UsuarioCrearDTO);
            }
            onSaved();
        } catch (e: any) {
            if (e?.status === 403) return show403();
            setErr(await parseError(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/50 flex items-start md:items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >

            <form
                className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-3 shadow-xl border border-neutral-200 max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
            >
                <h3 className="text-lg font-semibold">{isEdit ? "Editar usuario" : "Nuevo usuario"}</h3>

                {/* Si intenta abrir creación sin permiso, muestra aviso */}
                {!isEdit && !canCrear ? (
                    <div className="text-sm text-neutral-600">No tienes permiso para realizar esta acción.</div>
                ) : (
                    <>
                        <div className="space-y-1">
                            <label className="text-sm">Usuario</label>
                            <input
                                className="border rounded px-3 py-2 w-full"
                                required
                                value={(form as any).username ?? ""}
                                onChange={(e) => setForm((f) => ({ ...(f as any), username: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm">Nombre completo</label>
                            <input
                                className="border rounded px-3 py-2 w-full"
                                required
                                value={(form as any).nombreCompleto ?? ""}
                                onChange={(e) => setForm((f) => ({ ...(f as any), nombreCompleto: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm">Email</label>
                            <input
                                type="email"
                                className="border rounded px-3 py-2 w-full"
                                required
                                value={(form as any).email ?? ""}
                                onChange={(e) => setForm((f) => ({ ...(f as any), email: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm">Teléfono</label>
                            <input
                                className="border rounded px-3 py-2 w-full"
                                value={(form as any).telefono ?? ""}
                                onChange={(e) => setForm((f) => ({ ...(f as any), telefono: e.target.value }))}
                            />
                        </div>

                        {!isEdit && (
                            <div className="space-y-1">
                                <label className="text-sm">Contraseña inicial</label>
                                <input
                                    type="password"
                                    className="border rounded px-3 py-2 w-full"
                                    required
                                    value={(form as any).password ?? ""}
                                    onChange={(e) => setForm((f) => ({ ...(f as any), password: e.target.value }))}
                                />
                            </div>
                        )}
                    </>
                )}

                {err && <div className="text-red-600 text-sm whitespace-pre-wrap">{err}</div>}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    {(!isEdit || canActualizar) && (
                        <button
                            type="submit"
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
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
    onClose,
    onSaved,
}: {
    usuario: UsuarioDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [passwordNueva, setPasswordNueva] = useState("");
    const [passwordActual, setPasswordActual] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErr(null);
        try {
            const body: Record<string, any> = {
                passwordNueva,
                ...(passwordActual ? { passwordActual } : {}),
            };
            await UsuarioService.cambiarPassword(usuario.id, body as any);
            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                alert("No tienes permiso para realizar esta acción.");
                return;
            }
            setErr(await parseError(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/50 flex items-start md:items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >

            <form className="bg-white w-full max-w-md rounded-2xl p-6 space-y-3 shadow-xl border border-neutral-200 max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
                <h3 className="text-lg font-semibold">Cambiar contraseña — {usuario.username}</h3>
                <input
                    type="password"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="(Opcional) Contraseña actual"
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                />
                <input
                    type="password"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Nueva contraseña"
                    required
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                />
                {err && <div className="text-red-600 text-sm whitespace-pre-wrap">{err}</div>}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving}>
                        Actualizar
                    </button>
                </div>
            </form>
        </div>
    );
}

/** Modal EDITABLE (asignar/quitar) */
function RolesModal({
    usuario,
    onClose,
    onSaved,
}: {
    usuario: UsuarioDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [roles, setRoles] = useState<Array<{ id: number; nombre: string }>>([]);
    const [seleccion, setSeleccion] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const { RolService } = await import("@/servicios/rol");
                const page = await RolService.listar({ page: 0, size: 1000 });
                const opciones = (page.content ?? []).map((r: any, i: number) => {
                    const id = r?.id ?? r?.rolId ?? r?.idRol ?? i + 1;
                    const nombre = r?.nombre ?? r?.nombreRol ?? r?.name ?? r?.authority ?? String(r);
                    return { id, nombre };
                });

                // Detalle del usuario para preselección
                const detalle: any = await UsuarioService.obtener(usuario.id);
                const rolesUsuario = normalizeRolesList(
                    detalle?.roles ?? detalle?.authorities ?? detalle?.perfiles ?? detalle?.rolesNombres ?? []
                );

                if (!mounted) return;
                setRoles(opciones);

                const ids = rolesUsuario.map((r) => r.id).filter(Boolean);
                if (ids.length) {
                    setSeleccion(ids as number[]);
                } else {
                    const nombres = rolesUsuario.map((r) => r.nombre);
                    const resolved = opciones.filter((o) => nombres.includes(o.nombre)).map((o) => o.id);
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
    }, [usuario.id]);

    function show403() {
        alert("No tienes permiso para realizar esta acción.");
    }

    function toggleRole(id: number) {
        setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            await UsuarioService.asignarRoles(usuario.id, { rolesIds: seleccion });
            onSaved();
        } catch (e: any) {
            if (e?.status === 403) return show403();
            alert(await parseError(e));
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <form className="bg-white w-full max-w-md rounded-xl p-6 space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
                <h3 className="text-lg font-semibold">Asignar roles — {usuario.username}</h3>
                {loading && <div>Cargando…</div>}
                {err && <div className="text-red-600 text-sm">{err}</div>}
                {!loading && !err && (
                    <div className="max-h-64 overflow-auto border rounded p-2 space-y-1">
                        {roles.map((r, idx) => (
                            <label key={r.id || r.nombre || idx} className="flex items-center gap-2">
                                <input type="checkbox" checked={seleccion.includes(r.id)} onChange={() => toggleRole(r.id)} />
                                <span>{r.nombre}</span>
                            </label>
                        ))}
                        {roles.length === 0 && <div className="text-sm text-gray-500">No hay roles</div>}
                    </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" className="px-3 py-2 border rounded" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" className="px-3 py-2 bg-black text-white rounded">
                        Guardar
                    </button>
                </div>
            </form>
        </div>
    );
}

/** Modal SOLO LECTURA para ver nombres (al click en el chip) */
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
            className="fixed inset-0 z-[60] bg-black/50 flex items-start md:items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >

            <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-3 shadow-xl border border-neutral-200 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold">Roles de {usuario.username}</h3>
                {list.length === 0 ? (
                    <div className="text-sm text-gray-500">Este usuario no tiene roles.</div>
                ) : (
                    <ul className="list-disc ml-5 space-y-1">
                        {list.map((n, i) => (
                            <li key={i}>{n}</li>
                        ))}
                    </ul>
                )}
                <div className="flex items-center justify-end pt-2">
                    <button className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50" onClick={onClose}>
                        Cerrar
                    </button>

                </div>
            </div>
        </div>
    );
}
