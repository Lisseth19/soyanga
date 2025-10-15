import { useEffect, useMemo, useState } from "react";
import { almacenService } from "@/servicios/almacen";
import { sucursalService } from "@/servicios/sucursal";
import type { Page } from "@/types/pagination";
import type { Almacen, AlmacenCrear, AlmacenActualizar } from "@/types/almacen";
import { useAuth } from "@/context/AuthContext";
import { Pencil, Trash2, CheckCircle2, Search } from "lucide-react";

type Opcion = { id: number; nombre: string };

export default function AlmacenesPage() {
  const { user } = useAuth() as { user?: any };

  // ====== helper de permisos (admin ve todo) ======
  const can = useMemo(() => {
    const perms: string[] = user?.permisos ?? [];
    const roles: string[] = user?.roles ?? [];
    const isAdmin = roles.includes("ADMIN");
    return (perm: string) => isAdmin || perms.includes(perm);
  }, [user]);

  // ====== estado de lista / errores / filtros ======
  const [page, setPage] = useState<Page<Almacen> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  // ====== sucursales (combo) ======
  const [sucursales, setSucursales] = useState<Opcion[]>([]);
  const [cargandoSuc, setCargandoSuc] = useState(false);

  // ====== form (crear/editar) ======
  const [editando, setEditando] = useState<Almacen | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<AlmacenCrear>({
    idSucursal: 0,
    nombreAlmacen: "",
    descripcion: "",
    estadoActivo: true,
  });

  const tituloForm = useMemo(
      () => (editando ? "Editar Almacén" : "Agregar Nuevo Almacén"),
      [editando]
  );
  const textoBoton = useMemo(
      () => (editando ? "Guardar Cambios" : "Agregar Almacén"),
      [editando]
  );

  // ====== helpers ======
  function show403() {
    alert("No tienes permiso para realizar esta acción.");
  }
  const sucursalNombre = (id: number) =>
      sucursales.find((s) => s.id === id)?.nombre ?? id;

  // ====== cargar combos ======
  useEffect(() => {
    (async () => {
      try {
        setCargandoSuc(true);
        const opts = await sucursalService.opciones();
        setSucursales(opts);
      } finally {
        setCargandoSuc(false);
      }
    })();
  }, []);

  // ====== listar ======
  async function fetchList() {
    setLoading(true);
    setErr(null);
    try {
      const p = await almacenService.list({
        q: q.trim() || undefined,
        incluirInactivos: mostrarInactivos || undefined,
        page: 0,
        size: 10,
        sort: "nombreAlmacen,asc",
      });
      setPage(p);
    } catch (e: any) {
      if (e?.status === 403) setErr("Acceso denegado.");
      else setErr(e?.message || "Error cargando almacenes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, mostrarInactivos]);

  // ====== acciones ======
  async function onToggleActivo(a: Almacen) {
    if (!can("almacenes:actualizar")) return show403();
    try {
      await almacenService.toggleActivo(a.idAlmacen, !a.estadoActivo);
      await fetchList();
      if (editando?.idAlmacen === a.idAlmacen) {
        setEditando({ ...a, estadoActivo: !a.estadoActivo });
        setForm((f) => ({ ...f, estadoActivo: !a.estadoActivo }));
      }
    } catch (e: any) {
      if (e?.status === 403) return show403();
      alert(e?.message || "No se pudo cambiar el estado.");
    }
  }

  async function onDelete(a: Almacen) {
    if (!can("almacenes:eliminar")) return show403();
    const ok = confirm(`¿Eliminar el almacén "${a.nombreAlmacen}"?`);
    if (!ok) return;
    try {
      await almacenService.remove(a.idAlmacen);
      await fetchList();
      if (editando?.idAlmacen === a.idAlmacen) onCancelar();
    } catch (e: any) {
      if (e?.status === 403) return show403();
      alert(e?.message || "No se pudo eliminar.");
    }
  }

  function onEditar(a: Almacen) {
    if (!can("almacenes:actualizar")) return show403();
    setEditando(a);
    setForm({
      idSucursal: a.idSucursal,
      nombreAlmacen: a.nombreAlmacen,
      descripcion: a.descripcion || "",
      estadoActivo: a.estadoActivo,
    });
  }

  function onCancelar() {
    setEditando(null);
    setForm({
      idSucursal: 0,
      nombreAlmacen: "",
      descripcion: "",
      estadoActivo: true,
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const creando = !editando;

    if (creando && !can("almacenes:crear")) return show403();
    if (!creando && !can("almacenes:actualizar")) return show403();

    if (!form.idSucursal || !form.nombreAlmacen.trim()) {
      alert("Selecciona sucursal y escribe un nombre.");
      return;
    }

    setGuardando(true);
    try {
      if (editando) {
        const dto: AlmacenActualizar = {
          idSucursal: form.idSucursal,
          nombreAlmacen: form.nombreAlmacen.trim(),
          descripcion: form.descripcion?.trim() || "",
          estadoActivo: !!form.estadoActivo,
        };
        await almacenService.update(editando.idAlmacen, dto);
      } else {
        const dto: AlmacenCrear = {
          idSucursal: form.idSucursal,
          nombreAlmacen: form.nombreAlmacen.trim(),
          descripcion: form.descripcion?.trim() || "",
          estadoActivo: !!form.estadoActivo,
        };
        await almacenService.create(dto);
      }
      await fetchList();
      onCancelar();
    } catch (e: any) {
      if (e?.status === 403) return show403();
      alert(e?.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Gestión de Almacenes</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LISTA (2/3) */}
          <div className="lg:col-span-2">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={mostrarInactivos}
                    onChange={(e) => setMostrarInactivos(e.target.checked)}
                />
                Mostrar inactivos
              </label>

              <div className="relative w-full sm:w-80">
                <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar almacén…"
                    className="h-10 w-full pl-9 pr-3 rounded-lg border border-neutral-300"
                />
              </div>
            </div>

            {/* Errores / loading */}
            {err && <div className="text-red-600 mb-3">Error: {err}</div>}
            {loading && !err && <div className="mb-3">Cargando…</div>}

            {/* Encabezado (md+) */}
            {!loading && !err && (
                <div className="hidden md:grid w-full grid-cols-[1.1fr_0.9fr_1.6fr_0.6fr_120px] items-center text-xs uppercase text-neutral-500 px-3">
                  <div>Almacén</div>
                  <div>Sucursal</div>
                  <div>Descripción</div>
                  <div>Estado</div>
                  <div className="text-right pr-1">Acciones</div>
                </div>
            )}

            {/* Tarjetas / filas */}
            {!loading && !err && (
                <div className="mt-2 space-y-3">
                  {page?.content?.length ? (
                      page.content.map((a) => (
                          <div
                              key={a.idAlmacen}
                              className={
                                  "grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr_1.6fr_0.6fr_120px] items-start md:items-center gap-2 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition " +
                                  (!a.estadoActivo ? "opacity-60" : "")
                              }
                          >
                            {/* Nombre */}
                            <div className="font-semibold text-neutral-800 break-words">
                      <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">
                        Almacén
                      </span>
                              {a.nombreAlmacen}
                            </div>

                            {/* Sucursal */}
                            <div className="text-neutral-800">
                      <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">
                        Sucursal
                      </span>
                              {sucursalNombre(a.idSucursal)}
                            </div>

                            {/* Descripción */}
                            <div className="text-neutral-800 break-words">
                      <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">
                        Descripción
                      </span>
                              {a.descripcion || "—"}
                            </div>

                            {/* Estado */}
                            <div className="text-neutral-800">
                      <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">
                        Estado
                      </span>
                              {a.estadoActivo ? "Activo" : "Inactivo"}
                            </div>

                            {/* Acciones (protegidas por permiso) */}
                            <div className="flex items-center justify-end gap-1">
                              {can("almacenes:actualizar") && (
                                  <button
                                      aria-label="Editar"
                                      title="Editar"
                                      onClick={() => onEditar(a)}
                                      className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                                  >
                                    <Pencil size={18} />
                                  </button>
                              )}

                              {can("almacenes:actualizar") &&
                                  (a.estadoActivo ? (
                                      <button
                                          aria-label="Desactivar"
                                          title="Desactivar"
                                          onClick={() => onToggleActivo(a)}
                                          className="p-2 rounded-md hover:bg-neutral-100 text-rose-600 hover:text-rose-700"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                  ) : (
                                      <button
                                          aria-label="Activar"
                                          title="Activar"
                                          onClick={() => onToggleActivo(a)}
                                          className="p-2 rounded-md hover:bg-neutral-100 text-emerald-600 hover:text-emerald-700"
                                      >
                                        <CheckCircle2 size={18} />
                                      </button>
                                  ))}

                              {can("almacenes:eliminar") && (
                                  <button
                                      aria-label="Eliminar"
                                      title="Eliminar"
                                      onClick={() => onDelete(a)}
                                      className="p-2 rounded-md hover:bg-neutral-100 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                              )}
                            </div>
                          </div>
                      ))
                  ) : (
                      <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">
                        Sin registros
                      </div>
                  )}
                </div>
            )}
          </div>

          {/* FORM (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="bg-white border rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-2">{tituloForm}</h2>

                {/* Si NO puede crear y no está editando, muestra aviso genérico */}
                {!editando && !can("almacenes:crear") ? (
                    <div className="text-sm text-neutral-600">
                      No tienes permiso para realizar esta acción.
                    </div>
                ) : (
                    <form className="space-y-3" onSubmit={onSubmit}>
                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">
                          Sucursal
                        </label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.idSucursal}
                            onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  idSucursal: Number(e.target.value),
                                }))
                            }
                            disabled={cargandoSuc}
                        >
                          <option value={0} disabled>
                            Selecciona una sucursal…
                          </option>
                          {sucursales.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre}
                              </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">
                          Nombre
                        </label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.nombreAlmacen}
                            onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  nombreAlmacen: e.target.value,
                                }))
                            }
                            placeholder="p. ej., Almacén Central"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">
                          Descripción
                        </label>
                        <textarea
                            className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
                            value={form.descripcion || ""}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, descripcion: e.target.value }))
                            }
                            placeholder="Opcional"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">
                          Estado
                        </label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.estadoActivo ? "si" : "no"}
                            onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  estadoActivo: e.target.value === "si",
                                }))
                            }
                        >
                          <option value="si">Activo</option>
                          <option value="no">Inactivo</option>
                        </select>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex-1 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {textoBoton}
                        </button>
                        {editando && (
                            <button
                                type="button"
                                className="h-10 px-4 rounded-lg border border-neutral-300 hover:bg-neutral-50"
                                onClick={onCancelar}
                            >
                              Cancelar
                            </button>
                        )}
                      </div>
                    </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
