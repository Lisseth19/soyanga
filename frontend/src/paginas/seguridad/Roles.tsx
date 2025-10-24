import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/types/pagination";
import type { RolDTO, RolCrearDTO, RolEditarDTO, RolAsignarPermisosDTO } from "@/types/rol";
import { RolService } from "@/servicios/rol";
import { Paginacion } from "@/componentes/Paginacion";
import { useAuth } from "@/context/AuthContext";

/** ---- utils ---- */
async function parseError(e: any) {
    try {
        const res = e?.details?.response ?? e?.response ?? e;
        const txt = await res?.text?.();
        if (!txt) return e?.message ?? String(e);
        try {
            const json = JSON.parse(txt);
            if (json?.message) return json.message;
            if (Array.isArray(json?.errors)) return json.errors.join("\n");
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

/** Normalizador para roles (tolerante a alias/snake_case) */
function normalizeRol(x: any): RolDTO {
    const estado =
        x?.estadoActivo ??
        x?.activo ??
        x?.enabled ??
        x?.habilitado ??
        (typeof x?.estado === "string" ? x.estado.toUpperCase() === "ACTIVO" : undefined);

    return {
        id: x?.id ?? x?.rolId ?? x?.idRol ?? x?.id_rol ?? 0,
        nombre: x?.nombre ?? x?.nombreRol ?? x?.name ?? "",
        descripcion: x?.descripcion ?? x?.desc ?? null,
        permisos: Array.isArray(x?.permisos) && x.permisos.length && typeof x.permisos[0] !== "number" ? x.permisos : [],
        estadoActivo: estado,
        creadoEn: x?.creadoEn ?? x?.createdAt ?? null,
        actualizadoEn: x?.actualizadoEn ?? x?.updatedAt ?? null,
    };
}

export default function RolesPage() {
    const { user } = useAuth() as { user?: any };

    // ===== helper de permisos (admin ve todo) =====
    const can = useMemo(() => {
        const perms: string[] = user?.permisos ?? [];
        const roles: string[] = user?.roles ?? [];
        const isAdmin = roles.includes("ADMIN");
        return (perm: string) => isAdmin || perms.includes(perm);
    }, [user]);

    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);

    const [data, setData] = useState<Page<RolDTO> | null>(null);
    const [loading, setLoading] = useState(false);
    const [hydrating, setHydrating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mostrarForm, setMostrarForm] = useState<{ modo: "crear" | "editar"; rol?: RolDTO } | null>(null);
    const [mostrarPermisos, setMostrarPermisos] = useState<RolDTO | null>(null);

    // Evita doble click en activar/desactivar
    const [togglingId, setTogglingId] = useState<number | null>(null);

    function show403() {
        alert("No tienes permiso para realizar esta acción.");
    }

    /** Hidrata DETALLES (estadoActivo real) y permisos */
    async function hidratarDetalles(items: RolDTO[]): Promise<RolDTO[]> {
        if (!items.length) return items;
        setHydrating(true);
        try {
            const out = await Promise.all(
                items.map(async (r) => {
                    try {
                        const [detalle, permisos] = await Promise.all([
                            RolService.obtener(r.id).catch(() => null),
                            RolService.obtenerPermisos(r.id).catch(() => [] as any[]),
                        ]);

                        const d: any = detalle || {};
                        const estadoActivo =
                            d?.estadoActivo ??
                            d?.activo ??
                            d?.enabled ??
                            d?.habilitado ??
                            (typeof d?.estado === "string" ? d.estado.toUpperCase() === "ACTIVO" : r.estadoActivo);

                        const permisosNorm = (permisos ?? []).map(normalizePermisoDesdeBackend);

                        return {
                            ...r,
                            estadoActivo,
                            permisos: permisosNorm.length ? permisosNorm : r.permisos,
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
            const res = await RolService.listar({ q, page, size });
            const base: Page<RolDTO> = {
                ...res,
                content: (res.content ?? []).map(normalizeRol),
            };

            const hydrated = await hidratarDetalles(base.content ?? []);
            setData({ ...base, content: hydrated });
        } catch (e: any) {
            if (e?.status === 403) setError("Acceso denegado.");
            else setError(e?.message ?? String(e));
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

    const rows = useMemo(() => data?.content ?? [], [data]);

    /** Toggle rápido de estadoActivo -> PATCH /roles/{id}/estado */
    async function toggleEstado(rol: RolDTO) {
        if (!can("roles:actualizar")) return show403();
        try {
            setTogglingId(rol.id);
            const activoActual = !!rol.estadoActivo;
            await RolService.cambiarEstado(rol.id, { estadoActivo: !activoActual });
            await cargar();
        } catch (e: any) {
            setTogglingId(null);
            if (e?.status === 403) return show403();
            alert(await parseError(e));
        }
    }

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-xl font-semibold">Roles</h1>
                <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
                    <input
                        className="border rounded px-3 py-2 w-72"
                        placeholder="Buscar"
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(0);
                        }}
                    />
                    {can("roles:crear") && (
                        <button className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setMostrarForm({ modo: "crear" })}>
                            + Nuevo rol
                        </button>
                    )}
                </div>
            </div>

            {loading && <div>Cargando…</div>}
            {error && <div className="text-red-600 whitespace-pre-wrap">{error}</div>}

            {!loading && !error && (
                <div className="border rounded overflow-x-auto">
                    <table className="w-full text-base">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left p-2">Nombre</th>
                            <th className="text-left p-2">Descripción</th>
                            <th className="text-left p-2">Permisos</th>
                            <th className="text-left p-2">Estado</th>
                            <th className="text-right p-2">Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((r, idx) => {
                            const list = Array.isArray(r.permisos) ? r.permisos : [];
                            const count = list.length;
                            const preview = count ? list.slice(0, 3).map((p: any) => p.codigo).join(", ") : "-";
                            const more = count > 3 ? ` +${count - 3}` : "";
                            const activo = !!r.estadoActivo;

                            return (
                                <tr key={r.id || r.nombre || idx} className="border-t">
                                    <td className="p-2">{r.nombre || "(sin nombre)"}</td>
                                    <td className="p-2">{r.descripcion ?? "-"}</td>
                                    <td className="p-2">
                                        <div className="text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">
                            {count}
                          </span>
                          <span className="text-neutral-700">
                            {preview}
                              {more}
                          </span>
                            {hydrating && <span className="text-xs text-gray-500"> (actualizando…)</span>}
                        </span>
                                        </div>
                                    </td>
                                    <td className="p-2">
                      <span
                          className={`px-2 py-1 rounded text-xs ${
                              activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                          }`}
                      >
                        {activo ? "Activo" : "Inactivo"}
                      </span>
                                    </td>
                                    <td className="p-2 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            {can("roles:actualizar") && (
                                                <button
                                                    className="px-2 py-1 border rounded hover:bg-gray-50"
                                                    onClick={() => setMostrarForm({ modo: "editar", rol: r })}
                                                    title="Editar rol"
                                                >
                                                    Editar
                                                </button>
                                            )}

                                            {can("roles:actualizar") && (
                                                <button
                                                    className="px-2 py-1 border rounded hover:bg-gray-50"
                                                    onClick={() => setMostrarPermisos(r)}
                                                    title="Asignar permisos"
                                                >
                                                    Permisos
                                                </button>
                                            )}

                                            {can("roles:actualizar") && (
                                                <button
                                                    className={`px-2 py-1 rounded text-white ${
                                                        activo ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                                                    }`}
                                                    onClick={() => toggleEstado(r)}
                                                    disabled={togglingId === r.id}
                                                    title={activo ? "Desactivar" : "Activar"}
                                                >
                                                    {togglingId === r.id ? "Guardando…" : activo ? "Desactivar" : "Activar"}
                                                </button>
                                            )}

                                            {can("roles:eliminar") && (
                                                <button
                                                    className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                                                    onClick={async () => {
                                                        if (!confirm("¿Eliminar rol?")) return;
                                                        try {
                                                            await RolService.eliminar(r.id);
                                                            cargar();
                                                        } catch (e: any) {
                                                            if (e?.status === 403) return show403();
                                                            alert(await parseError(e));
                                                        }
                                                    }}
                                                    title="Eliminar rol"
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
                                <td colSpan={5} className="p-6 text-center text-gray-500">
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
                />
            )}

            {mostrarPermisos && can("roles:actualizar") && (
                <RolPermisosModal
                    rol={mostrarPermisos}
                    onClose={() => setMostrarPermisos(null)}
                    onSaved={() => {
                        setMostrarPermisos(null);
                        cargar();
                    }}
                />
            )}
        </div>
    );
}

/** ======= Modales internos ======= */

function RolFormModal({
                          modo,
                          rol,
                          onClose,
                          onSaved,
                          canCrear,
                          canActualizar,
                      }: {
    modo: "crear" | "editar";
    rol?: RolDTO;
    onClose: () => void;
    onSaved: () => void;
    canCrear: boolean;
    canActualizar: boolean;
}) {
    const isEdit = modo === "editar";
    // sin campo de estado; crear = siempre activo, editar = no toca estado
    const [form, setForm] = useState<RolCrearDTO | RolEditarDTO>(() =>
        isEdit
            ? {
                nombre: rol!.nombre,
                descripcion: rol!.descripcion ?? "",
            }
            : { nombre: "", descripcion: "" }
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
            const cleaned: Record<string, any> = {};
            Object.entries(form as any).forEach(([k, v]) => {
                const vv = typeof v === "string" ? v.trim() : v;
                if (vv !== undefined && vv !== null && vv !== "") cleaned[k] = vv;
            });

            // Backend espera nombreRol
            cleaned.nombreRol = cleaned.nombre ?? cleaned.nombreRol;
            delete cleaned.nombre;

            if (isEdit) {
                await RolService.editar(rol!.id, cleaned as any);
            } else {
                cleaned.estadoActivo = true;
                await RolService.crear(cleaned as any);
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <form
                className="bg-white w-full max-w-lg rounded-xl p-6 space-y-3"
                onClick={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
            >
                <h3 className="text-lg font-semibold">{isEdit ? "Editar rol" : "Nuevo rol"}</h3>

                {/* Si intenta abrir creación sin permiso, mostramos aviso en lugar del form */}
                {!isEdit && !canCrear ? (
                    <div className="text-sm text-neutral-600">No tienes permiso para realizar esta acción.</div>
                ) : (
                    <>
                        <div className="space-y-1">
                            <label className="text-sm">Nombre</label>
                            <input
                                className="border rounded px-3 py-2 w-full"
                                required
                                value={(form as any).descripcion !== undefined ? (form as any).nombre ?? "" : (form as any).nombre ?? ""} // seguro
                                onChange={(e) => setForm((f) => ({ ...(f as any), nombre: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm">Descripción</label>
                            <input
                                className="border rounded px-3 py-2 w-full"
                                value={(form as any).descripcion ?? ""}
                                onChange={(e) => setForm((f) => ({ ...(f as any), descripcion: e.target.value }))}
                            />
                        </div>
                    </>
                )}

                {err && <div className="text-red-600 text-sm whitespace-pre-wrap">{err}</div>}

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" className="px-3 py-2 border rounded" onClick={onClose}>
                        Cancelar
                    </button>
                    {(!isEdit || canActualizar) && (
                        <button type="submit" className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving}>
                            {isEdit ? "Guardar" : "Crear"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

function RolPermisosModal({
                              rol,
                              onClose,
                              onSaved,
                          }: {
    rol: RolDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [permisos, setPermisos] = useState<Array<{ id: number; codigo: string }>>([]);
    const [seleccion, setSeleccion] = useState<number[]>((rol.permisos ?? []).map((p: any) => p.id).filter(Boolean));
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const { PermisoService } = await import("@/servicios/permiso");
                const page = await PermisoService.listar({ page: 0, size: 1000, soloActivos: false });

                const opts = (page.content ?? []).map((x: any, i: number) => {
                    const id = x.id ?? x.idPermiso ?? x.permisoId ?? x.id_permiso ?? i + 1;
                    const codigo = x.codigo ?? x.nombrePermiso ?? x.nombre ?? x.name ?? x.authority ?? "";
                    return { id, codigo };
                });

                if (!mounted) return;
                setPermisos(opts);

                if (
                    !seleccion.length &&
                    Array.isArray((rol as any)?.permisos) &&
                    (rol as any).permisos.length &&
                    typeof ((rol as any).permisos[0] as any) === "number"
                ) {
                    setSeleccion((rol as any).permisos as unknown as number[]);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function toggle(id: number) {
        setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const dto: RolAsignarPermisosDTO = { permisos: seleccion };
            await RolService.asignarPermisos(rol.id, dto);
            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                alert("No tienes permiso para realizar esta acción.");
                return;
            }
            alert(await parseError(e));
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <form className="bg-white w-full max-w-md rounded-xl p-6 space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
                <h3 className="text-lg font-semibold">Permisos — {rol.nombre || "(sin nombre)"}</h3>
                {loading && <div>Cargando…</div>}
                {err && <div className="text-red-600 text-sm whitespace-pre-wrap">{err}</div>}
                {!loading && !err && (
                    <div className="max-h-72 overflow-auto border rounded p-2 space-y-1">
                        {permisos.map((p) => (
                            <label key={p.id} className="flex items-center gap-2">
                                <input type="checkbox" checked={seleccion.includes(p.id)} onChange={() => toggle(p.id)} />
                                <span className="font-mono text-xs">{p.codigo}</span>
                            </label>
                        ))}
                        {permisos.length === 0 && <div className="text-sm text-gray-500">No hay permisos</div>}
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
