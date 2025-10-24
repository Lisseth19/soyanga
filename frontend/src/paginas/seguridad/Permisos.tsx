import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/types/pagination";
import type { PermisoDTO, PermisoCrearDTO, PermisoEditarDTO } from "@/types/permiso";
import { PermisoService } from "@/servicios/permiso";
import { Paginacion } from "@/componentes/Paginacion";
import { useAuth } from "@/context/AuthContext";

/** Normalizador para permisos (ajustado a id_permiso, nombre_permiso, estado_activo) */
function normalizePermiso(x: any): PermisoDTO {
    const activoRaw =
        x.activo ??
        x.enabled ??
        x.habilitado ??
        x.estadoActivo ??
        x.estado_activo ??
        x.isActive ??
        (typeof x.estado === "string" ? x.estado.toUpperCase() === "ACTIVO" : undefined) ??
        (typeof x.estado === "number" ? x.estado === 1 : undefined);

    const id =
        x.id ??
        x.permisoId ??
        x.idPermiso ??
        x.id_permiso ?? // de tu tabla
        0;

    // “codigo” en el DTO del front lo mapeamos desde “nombre_permiso”
    const codigo =
        x.codigo ??
        x.nombre ??
        x.nombrePermiso ??
        x.nombre_permiso ?? // de tu tabla
        x.name ??
        x.clave ??
        x.authority ??
        "";

    return {
        id,
        codigo,
        descripcion: x.descripcion ?? x.desc ?? x.detalle ?? null,
        activo: (activoRaw ?? false) as boolean,
        creadoEn: x.creadoEn ?? x.createdAt ?? x.fechaCreacion ?? undefined,
        actualizadoEn: x.actualizadoEn ?? x.updatedAt ?? x.fechaActualizacion ?? undefined,
    };
}

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

export default function PermisosPage() {
    const { user } = useAuth() as { user?: any };

    // ===== helper de permisos (admin ve todo) =====
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

    const [data, setData] = useState<Page<PermisoDTO> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mostrarForm, setMostrarForm] = useState<{ modo: "crear" | "editar"; permiso?: PermisoDTO } | null>(null);

    function show403() {
        alert("No tienes permiso para realizar esta acción.");
    }

    async function cargar() {
        setLoading(true);
        setError(null);
        try {
            const res = await PermisoService.listar({ q, soloActivos, page, size });
            setData({
                ...res,
                content: (res.content ?? []).map(normalizePermiso),
            } as Page<PermisoDTO>);
        } catch (e: any) {
            if (e?.status === 403) {
                setError("Acceso denegado.");
            } else {
                setError(e?.message ?? String(e));
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, soloActivos, page, size]);

    const rows = useMemo(() => data?.content ?? [], [data]);

    /** Si no tenemos id, lo resolvemos buscando por nombre (codigo) */
    async function ensureId(p: PermisoDTO): Promise<number> {
        if (p.id) return p.id;
        const code = p.codigo?.trim();
        if (!code) throw new Error("No se puede resolver el ID: el permiso no tiene nombre/código.");
        const r = await PermisoService.listar({ q: code, page: 0, size: 1 });
        const found = (r.content ?? []).map(normalizePermiso)[0];
        if (!found?.id) throw new Error(`Permiso no encontrado por nombre.`);
        return found.id;
    }

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-xl font-semibold">Permisos</h1>
                <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
                    <input
                        className="border rounded px-3 py-2 w-72"
                        placeholder="Buscar por nombre/descr."
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

                    {/* Botón crear sólo si tiene permiso */}
                    {can("permisos:crear") && (
                        <button className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setMostrarForm({ modo: "crear" })}>
                            + Nuevo permiso
                        </button>
                    )}
                </div>
            </div>

            {loading && <div>Cargando…</div>}
            {error && <div className="text-red-600">{error}</div>}

            {!loading && !error && (
                <div className="border rounded overflow-x-auto">
                    <table className="w-full text-base">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left p-2">Nombre</th>
                            <th className="text-left p-2">Descripción</th>
                            <th className="text-left p-2">Estado</th>
                            <th className="text-right p-2">Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((p, idx) => (
                            <tr key={p.id || p.codigo || idx} className="border-t">
                                <td className="p-2 font-medium">{p.codigo || "(s/ nombre)"}</td>
                                <td className="p-2">{p.descripcion ?? "-"}</td>
                                <td className="p-2">
                    <span
                        className={`px-2 py-1 rounded text-xs ${
                            p.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                        }`}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                                </td>
                                <td className="p-2 text-right">
                                    <div className="inline-flex gap-2">
                                        {/* Editar solo si tiene permisos:actualizar */}
                                        {can("permisos:actualizar") && (
                                            <button className="underline" onClick={() => setMostrarForm({ modo: "editar", permiso: p })}>
                                                Editar
                                            </button>
                                        )}

                                        {/* Activar/Desactivar sólo si tiene permisos:actualizar */}
                                        {can("permisos:actualizar") &&
                                            (p.activo ? (
                                                <button
                                                    className="underline"
                                                    onClick={async () => {
                                                        try {
                                                            const id = await ensureId(p);
                                                            await PermisoService.desactivar(id);
                                                            cargar();
                                                        } catch (e: any) {
                                                            if (e?.status === 403) return show403();
                                                            alert(await parseError(e));
                                                        }
                                                    }}
                                                >
                                                    Desactivar
                                                </button>
                                            ) : (
                                                <button
                                                    className="underline"
                                                    onClick={async () => {
                                                        try {
                                                            const id = await ensureId(p);
                                                            await PermisoService.activar(id);
                                                            cargar();
                                                        } catch (e: any) {
                                                            if (e?.status === 403) return show403();
                                                            alert(await parseError(e));
                                                        }
                                                    }}
                                                >
                                                    Activar
                                                </button>
                                            ))}

                                        {/* Eliminar sólo si tiene permisos:eliminar */}
                                        {can("permisos:eliminar") && (
                                            <button
                                                className="text-red-600 underline"
                                                onClick={async () => {
                                                    if (!confirm("¿Eliminar permiso?")) return;
                                                    try {
                                                        const id = await ensureId(p);
                                                        await PermisoService.eliminar(id);
                                                        cargar();
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
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-6 text-center text-gray-500">
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
                <PermisoFormModal
                    modo={mostrarForm.modo}
                    permiso={mostrarForm.permiso}
                    onClose={() => setMostrarForm(null)}
                    onSaved={() => {
                        setMostrarForm(null);
                        cargar();
                    }}
                    canActualizar={can("permisos:actualizar")}
                    canCrear={can("permisos:crear")}
                />
            )}
        </div>
    );
}

/** ======= Modal interno ======= */
function PermisoFormModal({
                              modo,
                              permiso,
                              onClose,
                              onSaved,
                              canCrear,
                              canActualizar,
                          }: {
    modo: "crear" | "editar";
    permiso?: PermisoDTO;
    onClose: () => void;
    onSaved: () => void;
    canCrear: boolean;
    canActualizar: boolean;
}) {
    const isEdit = modo === "editar";
    const [form, setForm] = useState<PermisoCrearDTO | PermisoEditarDTO>(() =>
        isEdit
            ? {
                // seguimos usando “codigo” en el front, pero lo mostramos como “Nombre”
                codigo: permiso!.codigo,
                descripcion: permiso!.descripcion ?? undefined,
                activo: permiso!.activo,
            }
            : { codigo: "", descripcion: "", activo: true }
    );
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function show403() {
        alert("No tienes permiso para realizar esta acción.");
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Guardavía en UI por si abrieron modal por URL o estado extraño:
        if (isEdit && !canActualizar) return show403();
        if (!isEdit && !canCrear) return show403();

        setSaving(true);
        setErr(null);
        try {
            // limpia undefined/null/"" antes de enviar
            const cleaned: Record<string, any> = {};
            Object.entries(form as any).forEach(([k, v]) => {
                const vv = typeof v === "string" ? v.trim() : v;
                if (vv !== undefined && vv !== null && vv !== "") cleaned[k] = vv;
            });

            // Mapeo amplio para satisfacer el DTO del backend:
            // - nombre del permiso: nombre / nombrePermiso / nombre_permiso (desde nuestro "codigo")
            // - estado: activo / estadoActivo / estado_activo
            const wire: Record<string, any> = {
                ...cleaned,
                nombre: cleaned.codigo,
                nombrePermiso: cleaned.codigo,
                nombre_permiso: cleaned.codigo,
                activo: cleaned.activo,
                estadoActivo: cleaned.activo,
                estado_activo: cleaned.activo,
            };
            delete wire.codigo; // el backend probablemente no lo usa tal cual

            if (isEdit) {
                await PermisoService.editar(permiso!.id || 0, wire as PermisoEditarDTO);
            } else {
                await PermisoService.crear(wire as PermisoCrearDTO);
            }
            onSaved();
        } catch (e: any) {
            if (e?.status === 403) {
                return show403();
            }
            setErr(await parseError(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <form className="bg-white w-full max-w-lg rounded-xl p-6 space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
                <h3 className="text-lg font-semibold">{isEdit ? "Editar permiso" : "Nuevo permiso"}</h3>

                {/* Si intenta abrir modal de creación sin permiso, lo avisamos en lugar del form */}
                {!isEdit && !canCrear ? (
                    <div className="text-sm text-neutral-600">No tienes permiso para realizar esta acción.</div>
                ) : (
                    <>
                        <div className="space-y-1">
                            <label className="text-sm">Nombre</label>
                            <input
                                className="border rounded px-3 py-2 w-full"
                                required
                                value={(form as any).codigo ?? ""}
                                onChange={(e) => setForm((f) => ({ ...(f as any), codigo: e.target.value }))}
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
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={!!(form as any).activo}
                                onChange={(e) => setForm((f) => ({ ...(f as any), activo: e.target.checked }))}
                            />
                            Activo
                        </label>
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
