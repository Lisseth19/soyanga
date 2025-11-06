// src/paginas/catalogo/Almacenes.tsx
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { almacenService } from "@/servicios/almacen";
import { sucursalService } from "@/servicios/sucursal";
import type { Page } from "@/types/pagination";
import type { Almacen, AlmacenCrear, AlmacenActualizar } from "@/types/almacen";
import { useAuth } from "@/context/AuthContext";
import {
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  AlertCircle,
  CheckCircle2,
  Info,
  Eraser,
} from "lucide-react";
import { ApiError } from "@/servicios/httpClient";

/* ===== Toggle compacto ===== */
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

/* ===== Modal Confirmación ===== */
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

/* ===== Toast minimal ===== */
type ToastKind = "error" | "success" | "info";
function Toast({ open, kind, message, onClose }: { open: boolean; kind: ToastKind; message: string; onClose: () => void }) {
  if (!open) return null;
  const base =
      "fixed bottom-4 right-4 z-[80] max-w-sm w-[360px] rounded-lg shadow-lg border px-3 py-2 flex items-start gap-2 animate-in fade-in zoom-in duration-150";
  const palette =
      kind === "error"
          ? "bg-rose-50 border-rose-200 text-rose-800"
          : kind === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-blue-50 border-blue-200 text-blue-800";

  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;

  return (
      <div className={`${base} ${palette}`} role="status" aria-live="polite">
        <div className="pt-[2px]">
          <Icon size={18} />
        </div>
        <div className="text-sm leading-relaxed">{message}</div>
        <button className="ml-auto p-1 rounded hover:bg-black/5" aria-label="Cerrar" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
  );
}

type Opcion = { id: number; nombre: string };

export default function AlmacenesPage() {
  const { user } = useAuth() as { user?: any };

  /* ===== permisos (con fallback para cambiar-estado) ===== */
  const can = useMemo(() => {
    const perms: string[] = Array.isArray(user?.permisos) ? user.permisos : [];
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    const isAdmin = roles.some((r) => String(r).toUpperCase().includes("ADMIN"));
    return (perm: string) => isAdmin || perms.includes(perm);
  }, [user]);

  const canVer = can("almacenes:ver");
  const canCrear = can("almacenes:crear");
  const canEditar = can("almacenes:actualizar");
  const canCambiarEstado = can("almacenes:cambiar-estado") || canEditar; // fallback si no existe el permiso granular
  const canEliminar = can("almacenes:eliminar");

  const show403 = (message = "No tienes permiso para realizar esta acción.") => {
    window.dispatchEvent(new CustomEvent("auth:forbidden", { detail: { source: "AlmacenesPage", message } }));
  };

  /* ===== estado lista / filtros ===== */
  const [page, setPage] = useState<Page<Almacen> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  /* ===== sucursales ===== */
  const [sucursales, setSucursales] = useState<Opcion[]>([]);
  const [cargandoSuc, setCargandoSuc] = useState(false);

  useEffect(() => {
    setCargandoSuc(true);
    sucursalService
        .opciones()
        .then(setSucursales)
        .catch(() => setSucursales([]))
        .finally(() => setCargandoSuc(false));
  }, []);

  /* ===== form crear/editar ===== */
  const [editando, setEditando] = useState<Almacen | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<AlmacenCrear>({
    idSucursal: 0,
    nombreAlmacen: "",
    descripcion: "",
    estadoActivo: true,
  });
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);

  const isEdit = !!editando;
  const tituloForm = isEdit ? "Editar almacén" : "Agregar almacén";
  const textoBoton = isEdit ? "Guardar cambios" : "Agregar almacén";

  /* ===== Toast state ===== */
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = (message: string, kind: ToastKind = "info") => {
    setToast({ kind, message });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };
  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const showFriendlyError = (e: any, fallback: string) => {
    const msg = e?.message || (e?.details ? JSON.stringify(e.details) : fallback);
    showToast(msg, "error");
  };

  /* ===== listar ===== */
  const fetchList = () => {
    if (!canVer) {
      setErr("Acceso denegado.");
      setPage(null);
      show403("No tienes permiso para ver almacenes.");
      return;
    }
    setLoading(true);
    setErr(null);
    almacenService
        .list({
          q: debouncedQ || undefined,
          incluirInactivos: mostrarInactivos || undefined,
          page: 0,
          size: 10,
        })
        .then(setPage)
        .catch((e: any) => {
          if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
            setErr("Acceso denegado.");
            setPage(null);
            show403("No tienes permiso para ver almacenes.");
          } else {
            setErr(e?.message || "Error cargando almacenes.");
          }
        })
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, mostrarInactivos, canVer]);

  /* ===== acciones ===== */
  const onToggleActivo = async (a: Almacen) => {
    if (!canCambiarEstado) return show403("No tienes permiso para cambiar el estado.");
    try {
      await almacenService.toggleActivo(a.idAlmacen, !a.estadoActivo);
      await fetchList();
      if (editando?.idAlmacen === a.idAlmacen) {
        setEditando({ ...a, estadoActivo: !a.estadoActivo });
        setForm((f) => ({ ...f, estadoActivo: !a.estadoActivo }));
      }
      showToast(a.estadoActivo ? "Almacén desactivado." : "Almacén activado.", "success");
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) return show403("No tienes permiso para cambiar el estado.");
      showFriendlyError(e, "No se pudo cambiar el estado.");
    }
  };

  const onDelete = (a: Almacen) => {
    if (!canEliminar) return show403("No tienes permiso para eliminar.");
    setConfirmKind("eliminar");
    setConfirmItem(a);
    setConfirmOpen(true);
  };

  const onEditar = (a: Almacen) => {
    if (!canEditar) return show403("No tienes permiso para actualizar.");
    setEditando(a);
    setForm({
      idSucursal: a.idSucursal,
      nombreAlmacen: a.nombreAlmacen,
      descripcion: a.descripcion || "",
      estadoActivo: a.estadoActivo,
    });
  };

  const onCancelar = () => {
    setEditando(null);
    setForm({
      idSucursal: 0,
      nombreAlmacen: "",
      descripcion: "",
      estadoActivo: true,
    });
    // Enfoca primer campo
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  };

  const onLimpiarCrear = () => {
    setEditando(null);
    setForm({
      idSucursal: 0,
      nombreAlmacen: "",
      descripcion: "",
      estadoActivo: true,
    });
    showToast("Formulario limpio.", "info");
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const creando = !isEdit;

    if (creando && !canCrear) return show403("No tienes permiso para crear.");
    if (!creando && !canEditar) return show403("No tienes permiso para actualizar.");

    if (!form.idSucursal || !String(form.nombreAlmacen).trim()) {
      return showToast("Selecciona una sucursal y escribe un nombre.", "info");
    }

    setGuardando(true);
    try {
      if (isEdit) {
        const dto: AlmacenActualizar = {
          idSucursal: form.idSucursal,
          nombreAlmacen: form.nombreAlmacen.trim(),
          descripcion: (form.descripcion ?? "").trim(),
          estadoActivo: !!form.estadoActivo,
        };
        await almacenService.update(editando!.idAlmacen, dto);
        showToast("Almacén actualizado.", "success");
      } else {
        const dto: AlmacenCrear = {
          idSucursal: form.idSucursal,
          nombreAlmacen: form.nombreAlmacen.trim(),
          descripcion: (form.descripcion ?? "").trim(),
          estadoActivo: !!form.estadoActivo,
        };
        await almacenService.create(dto);
        showToast("Almacén creado.", "success");
      }
      await fetchList();
      onCancelar();
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) return show403();
      showFriendlyError(e, "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const sucursalNombre = (id: number) => sucursales.find((s) => s.id === id)?.nombre ?? id;

  /* ===== modal confirm ===== */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"eliminar" | "desactivar">("eliminar");
  const [confirmItem, setConfirmItem] = useState<Almacen | null>(null);

  const doConfirm = async () => {
    const a = confirmItem!;
    setConfirmBusy(true);
    try {
      if (confirmKind === "eliminar") {
        await almacenService.remove(a.idAlmacen);
        showToast("Almacén eliminado.", "success");
      } else {
        await almacenService.toggleActivo(a.idAlmacen, false);
        showToast("Almacén desactivado.", "success");
      }
      setConfirmOpen(false);
      setConfirmItem(null);
      fetchList();
      if (editando?.idAlmacen === a.idAlmacen) onCancelar();
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        show403();
        setConfirmOpen(false);
        setConfirmItem(null);
      } else if ((e instanceof ApiError && e.status === 409) || e?.status === 409) {
        setConfirmOpen(false);
        setConfirmItem(null);
        showToast(e?.message ?? "No se puede eliminar: el almacén está en uso por otros recursos.", "error");
      } else {
        showFriendlyError(e, "Operación no realizada.");
      }
    } finally {
      setConfirmBusy(false);
    }
  };

  // autocerrar modales si se pierden permisos
  useEffect(() => {
    if (!confirmOpen || !confirmItem) return;
    if (confirmKind === "eliminar" && !canEliminar) {
      setConfirmOpen(false);
      setConfirmItem(null);
      show403("Perdiste el permiso para eliminar.");
    }
    if (confirmKind === "desactivar" && !canCambiarEstado) {
      setConfirmOpen(false);
      setConfirmItem(null);
      show403("Perdiste el permiso para cambiar estado.");
    }
  }, [confirmOpen, confirmKind, confirmItem, canEliminar, canCambiarEstado]);

  if (!canVer) {
    return (
        <div className="p-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            No tienes permiso para ver almacenes.
          </div>
        </div>
    );
  }

  const rows = page?.content ?? [];
  const badge =
      "inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-[2px] text-[12px] font-medium";

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
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar almacén…"
                    className="h-10 w-full pl-9 pr-3 rounded-lg border border-neutral-300 bg-white/90 placeholder-neutral-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Errores / loading */}
            {err && <div className="text-red-600 text-sm mb-2 border border-red-200 bg-red-50 rounded px-3 py-2">{err}</div>}
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

            {/* Filas */}
            {!loading && !err && (
                <div className="mt-2 space-y-3">
                  {rows.length ? (
                      rows.map((a) => {
                        return (
                            <div
                                key={a.idAlmacen}
                                className={[
                                  "grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr_1.6fr_0.6fr_120px] items-start md:items-center gap-2",
                                  "bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition",
                                  !a.estadoActivo ? "opacity-60" : "",
                                ].join(" ")}
                            >
                              {/* Nombre */}
                              <div className="font-semibold text-neutral-800 break-words">
                                <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Almacén</span>
                                {a.nombreAlmacen}
                              </div>

                              {/* Sucursal */}
                              <div className="text-neutral-800">
                                <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Sucursal</span>
                                {sucursalNombre(a.idSucursal)}
                              </div>

                              {/* Descripción */}
                              <div className="text-neutral-800 break-words">
                                <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Descripción</span>
                                {a.descripcion || "—"}
                              </div>

                              {/* Estado */}
                              <div className="text-neutral-800">
                                <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Estado</span>
                                <span className={badge}>{a.estadoActivo ? "Activo" : "Inactivo"}</span>
                              </div>

                              {/* Acciones */}
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Toggle activar/desactivar */}
                                {canCambiarEstado && (
                                    <ActiveToggleMini
                                        value={!!a.estadoActivo}
                                        title={a.estadoActivo ? "Desactivar" : "Activar"}
                                        onToggle={(next) => {
                                          if (next) onToggleActivo(a);
                                          else {
                                            setConfirmKind("desactivar");
                                            setConfirmItem(a);
                                            setConfirmOpen(true);
                                          }
                                        }}
                                    />
                                )}

                                {/* Editar */}
                                {canEditar && (
                                    <button
                                        aria-label="Editar"
                                        title="Editar"
                                        onClick={() => onEditar(a)}
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
                                        onClick={() => onDelete(a)}
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
                      <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">Sin registros</div>
                  )}
                </div>
            )}
          </div>

          {/* FORM (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="bg-white border rounded-xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{tituloForm}</h2>

                  {/* ⬇️ Aquí integramos tu bloque: Cancelar (si edita) / Limpiar (si crea) */}
                  {isEdit ? (
                      <button
                          type="button"
                          className="px-3 h-9 rounded-lg border border-neutral-300 hover:bg-neutral-50"
                          onClick={onCancelar}
                          title="Cancelar edición"
                      >
                        Cancelar
                      </button>
                  ) : (
                      canCrear && (
                          <button
                              type="button"
                              className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-neutral-300 hover:bg-neutral-50"
                              onClick={onLimpiarCrear}
                              title="Limpiar formulario"
                          >
                            <Eraser size={16} />
                            <span>Limpiar</span>
                          </button>
                      )
                  )}
                </div>

                {/* Bloquea creación si no tiene permiso y no está editando */}
                {!isEdit && !canCrear ? (
                    <div className="text-sm text-neutral-600">No tienes permiso para realizar esta acción.</div>
                ) : (
                    <form className="space-y-3" onSubmit={onSubmit}>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Sucursal</label>
                        <select
                            ref={firstFieldRef}
                            className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            value={form.idSucursal}
                            onChange={(e) => setForm((f) => ({ ...f, idSucursal: Number(e.target.value) }))}
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
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2 bg-white/90 placeholder-neutral-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            value={form.nombreAlmacen}
                            onChange={(e) => setForm((f) => ({ ...f, nombreAlmacen: e.target.value }))}
                            placeholder="p. ej., Almacén Central"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Descripción</label>
                        <textarea
                            className="w-full border rounded-lg px-3 py-2 min-h-[80px] bg-white/90 placeholder-neutral-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            value={form.descripcion || ""}
                            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                            placeholder="Opcional"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Estado</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            value={form.estadoActivo ? "si" : "no"}
                            onChange={(e) => setForm((f) => ({ ...f, estadoActivo: e.target.value === "si" }))}
                        >
                          <option value="si">Activo</option>
                          <option value="no">Inactivo</option>
                        </select>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                            type="submit"
                            disabled={guardando || (!isEdit && !canCrear) || (isEdit && !canEditar)}
                            className="flex-1 h-10 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {textoBoton}
                        </button>
                        {/* Se eliminó el botón 'Cancelar' inferior para no duplicar; queda solo el de la cabecera */}
                      </div>
                    </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Confirm modal */}
        <ConfirmModal
            open={confirmOpen && !!confirmItem}
            title={confirmKind === "eliminar" ? "Eliminar almacén" : "Desactivar almacén"}
            message={
              confirmKind === "eliminar" ? (
                  <>
                    ¿Eliminar <b>{confirmItem?.nombreAlmacen}</b> permanentemente?
                    <br />
                    <span className="text-neutral-600">Esta acción no se puede deshacer.</span>
                  </>
              ) : (
                  <>
                    ¿Desactivar <b>{confirmItem?.nombreAlmacen}</b>?
                    <br />
                    <span className="text-neutral-600">No se eliminará; podrás activarlo de nuevo cuando quieras.</span>
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
        <Toast open={!!toast} kind={toast?.kind ?? "info"} message={toast?.message ?? ""} onClose={() => setToast(null)} />
      </div>
  );
}
