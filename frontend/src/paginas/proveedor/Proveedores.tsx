// src/paginas/proveedor/Proveedores.tsx
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ProveedorService,
  cambiarEstadoProveedor as cambiarEstadoProveedorApi,
} from "@/servicios/proveedor";
import type { Proveedor } from "@/types/proveedor";
import type { Page } from "@/types/pagination";
import { GlobalAccessDeniedModal } from "@/componentes/GlobalAccessDeniedModal";
import { Pencil, Trash2, Eye, Check, X } from "lucide-react";

/* ===== Helpers ===== */
function deny(method: string, path: string, message = "No tienes permiso para realizar esta acción.") {
  window.dispatchEvent(
      new CustomEvent("auth:forbidden", {
        detail: { source: "ProveedoresPage", message, method, path },
      }),
  );
}
/** Bloquea el scroll del body cuando active=true */
function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

/* ========= Toggle compacto (45×20 con knob 16px) ========= */
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

/* ===== Botón icónico ===== */
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
            "inline-flex items-center justify-center rounded-md p-2",
            "border border-transparent hover:bg-neutral-100 transition",
            "disabled:opacity-50 disabled:pointer-events-none",
            className,
          ].join(" ")}
      >
        {children}
      </button>
  );
}

/* ===== Modal de confirmación ===== */
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
        <div className="absolute inset-0 bg-black/35" onClick={() => !loading && onClose()} />
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
            <div className="px-4 py-4 text-[14px] text-neutral-700 leading-relaxed">{message}</div>
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

/* ===== Toast (bottom-right, auto-hide) ===== */
function Toast({
                 open,
                 message,
                 kind = "warn",
                 onClose,
               }: {
  open: boolean;
  message: string;
  kind?: "info" | "warn" | "danger";
  onClose: () => void;
}) {
  if (!open) return null;
  const color =
      kind === "danger"
          ? "bg-rose-600"
          : kind === "warn"
              ? "bg-amber-600"
              : "bg-neutral-800";
  return (
      <div className="fixed bottom-4 right-4 z-[95]">
        <div className={`max-w-sm text-white shadow-lg rounded-xl ${color}`}>
          <div className="px-4 py-3 flex items-start gap-3">
            <div className="text-sm leading-5">{message}</div>
            <button
                className="ml-auto text-white/90 hover:text-white"
                aria-label="Cerrar"
                onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
  );
}

/* ===== Página ===== */
export default function ProveedoresPage() {
  const { can } = useAuth() as { can: (permiso: string) => boolean };

  // permisos
  const canVer = useMemo(() => can("proveedores:ver"), [can]);
  const canCrear = useMemo(() => can("proveedores:crear"), [can]);
  const canEditar = useMemo(() => can("proveedores:actualizar"), [can]);
  const canEliminar = useMemo(() => can("proveedores:eliminar"), [can]);
  const canCambiarEstado = canEditar; // activar/desactivar requiere actualizar

  // filtros / búsqueda con debounce
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const [soloActivos, setSoloActivos] = useState(false);

  // datos
  const [page, setPage] = useState<Page<Proveedor> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastKind, setToastKind] = useState<"info" | "warn" | "danger">("warn");
  function notify(msg: string, kind: "info" | "warn" | "danger" = "warn") {
    setToastMsg(msg);
    setToastKind(kind);
    setToastOpen(true);
  }
  useEffect(() => {
    if (!toastOpen) return;
    const id = setTimeout(() => setToastOpen(false), 4000);
    return () => clearTimeout(id);
  }, [toastOpen]);

  // modal detalle / confirmación eliminar
  const [verMas, setVerMas] = useState<Proveedor | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmObj, setConfirmObj] = useState<Proveedor | null>(null);

  // **modal confirmación activar/desactivar**
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toggleConfirmBusy, setToggleConfirmBusy] = useState(false);
  const [toggleObj, setToggleObj] = useState<Proveedor | null>(null);
  const [toggleNext, setToggleNext] = useState<boolean>(true);

  // form
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<Proveedor | null>(null);
  const [form, setForm] = useState<Partial<Proveedor>>({
    razonSocial: "",
    nit: "",
    contacto: "",
    telefono: "",
    correoElectronico: "",
    direccion: "",
    estadoActivo: true,
  });
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const DEFAULT_SORT = "razonSocial,asc";

  // cargar lista
  async function load(pageIndex = 0) {
    if (!canVer) {
      setError("Acceso denegado.");
      setPage(null);
      deny("GET", "/api/v1/proveedores", "No tienes permiso para ver proveedores.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await ProveedorService.listar({
        q: query || undefined,
        page: pageIndex,
        size: 20,
        sort: DEFAULT_SORT,
        soloActivos,
      });
      setPage(res);
    } catch (e: any) {
      if (e?.status === 403) {
        setError("Acceso denegado.");
        setPage(null);
        deny("GET", "/api/v1/proveedores");
      } else if (e?.status === 401) {
        setError("No autorizado. Inicia sesión nuevamente.");
        setPage(null);
      } else {
        setError(e?.message ?? "Error al listar proveedores");
        setPage(null);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, soloActivos, canVer]);

  // autocierre modal form si cambian permisos
  useEffect(() => {
    if (!formOpen) return;
    if (edit && !canEditar) {
      setFormOpen(false);
      setEdit(null);
      deny("PUT", "/api/v1/proveedores/{id}", "Perdiste el permiso para actualizar proveedores.");
    } else if (!edit && !canCrear) {
      setFormOpen(false);
      deny("POST", "/api/v1/proveedores", "Perdiste el permiso para crear proveedores.");
    }
  }, [formOpen, edit, canEditar, canCrear]);

  function resetForm() {
    setEdit(null);
    setForm({
      razonSocial: "",
      nit: "",
      contacto: "",
      telefono: "",
      correoElectronico: "",
      direccion: "",
      estadoActivo: true,
    });
    setServerFieldErrors({});
  }

  function startCreate() {
    if (!canCrear) {
      deny("POST", "/api/v1/proveedores", "No tienes permiso para crear proveedores.");
      return;
    }
    resetForm();
    setFormOpen(true);
    setTimeout(() => document.getElementById("f-razon")?.focus(), 0);
  }

  function startEdit(p: Proveedor) {
    if (!canEditar) {
      deny("PUT", `/api/v1/proveedores/${p.idProveedor}`, "No tienes permiso para actualizar proveedores.");
      return;
    }
    setEdit(p);
    setForm({
      razonSocial: p.razonSocial || "",
      nit: p.nit || "",
      contacto: p.contacto || "",
      telefono: p.telefono || "",
      correoElectronico: p.correoElectronico || "",
      direccion: p.direccion || "",
      estadoActivo: !!p.estadoActivo,
    });
    setServerFieldErrors({});
    setFormOpen(true);
    setTimeout(() => document.getElementById("f-razon")?.focus(), 0);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload: any = {
      razonSocial: form.razonSocial?.trim(),
      nit: form.nit?.trim() || undefined,
      contacto: form.contacto?.trim() || undefined,
      telefono: form.telefono?.trim() || undefined,
      correoElectronico: form.correoElectronico?.trim() || undefined,
      direccion: form.direccion?.trim() || undefined,
      estadoActivo: !!form.estadoActivo,
    };

    try {
      setLoading(true);
      setError(null);
      setServerFieldErrors({});

      if (edit) {
        if (!canEditar) {
          deny("PUT", `/api/v1/proveedores/${edit.idProveedor}`);
          setFormOpen(false);
          setEdit(null);
          return;
        }
        await ProveedorService.editar(edit.idProveedor, payload);
      } else {
        if (!canCrear) {
          deny("POST", "/api/v1/proveedores");
          setFormOpen(false);
          return;
        }
        await ProveedorService.crear(payload);
      }

      await load(page?.number ?? 0);
      resetForm();
      setFormOpen(false);
    } catch (e: any) {
      if (e?.status === 403) {
        if (edit) deny("PUT", `/api/v1/proveedores/${edit.idProveedor}`);
        else deny("POST", "/api/v1/proveedores");
        setFormOpen(false);
        setEdit(null);
        return;
      }

      const msg = (e?.message || "").toString().toLowerCase();
      const looksLikeDuplicated =
          e?.status === 409 || msg.includes("nit") || msg.includes("ya existe") || msg.includes("existe un proveedor");
      if (looksLikeDuplicated) {
        setServerFieldErrors({
          nit: e?.message || "Este NIT ya está registrado.",
        });
        return;
      }

      setError(e?.message ?? "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  function askDelete(p: Proveedor) {
    if (!canEliminar) {
      deny("DELETE", `/api/v1/proveedores/${p.idProveedor}`, "No tienes permiso para eliminar proveedores.");
      return;
    }
    setConfirmObj(p);
    setConfirmOpen(true);
  }

  async function doDelete() {
    const p = confirmObj!;
    setConfirmBusy(true);
    try {
      await ProveedorService.eliminar(p.idProveedor);
      setConfirmOpen(false);
      setConfirmObj(null);
      await load(page?.number ?? 0);
    } catch (e: any) {
      setConfirmOpen(false);
      setConfirmObj(null);
      if (e?.status === 403) {
        deny("DELETE", `/api/v1/proveedores/${p.idProveedor}`, "No tienes permiso para eliminar proveedores.");
      } else if (e?.status === 409) {
        notify("No se puede eliminar el proveedor porque está en uso (referenciado por otros registros).", "warn");
      } else {
        setError(e?.message ?? "Error al eliminar");
      }
    } finally {
      setConfirmBusy(false);
    }
  }

  /* === Confirmación de activar/desactivar === */
  function askToggle(p: Proveedor) {
    if (!canCambiarEstado) {
      deny("PATCH", `/api/v1/proveedores/${p.idProveedor}/estado`, "No tienes permiso para cambiar el estado de proveedores.");
      return;
    }
    setToggleObj(p);
    setToggleNext(!p.estadoActivo);
    setToggleConfirmOpen(true);
  }

  async function doConfirmToggle() {
    if (!toggleObj) return;
    const p = toggleObj;
    try {
      setToggleConfirmBusy(true);
      setTogglingId(p.idProveedor);
      await cambiarEstadoProveedorApi(p.idProveedor, toggleNext);
      setToggleConfirmOpen(false);
      setToggleObj(null);
      await load(page?.number ?? 0);
    } catch (e: any) {
      setToggleConfirmOpen(false);
      setToggleObj(null);
      if (e?.status === 403) {
        deny("PATCH", `/api/v1/proveedores/${p.idProveedor}/estado`);
      } else {
        setError(e?.message ?? "No se pudo cambiar el estado del proveedor");
      }
    } finally {
      setToggleConfirmBusy(false);
      setTogglingId(null);
    }
  }

  const rows = (page?.content ?? []).slice().sort((a, b) => a.idProveedor - b.idProveedor);
  const total = page?.totalElements ?? 0;

  return (
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 relative">
        <GlobalAccessDeniedModal />

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-neutral-800">Proveedores</h1>
            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
            Total: {total}
          </span>
          </div>

          <div className="md:ml-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar proveedor..."
                className="border rounded px-3 py-2 w-72 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
                type="text"
            />
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700 px-1">
              <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} />
              Sólo activos
            </label>
            {canCrear && (
                <button
                    type="button"
                    onClick={startCreate}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm shadow-sm"
                >
                  Agregar proveedor
                </button>
            )}
          </div>
        </div>

        {/* MENSAJES */}
        {loading && <div className="mt-3">Cargando…</div>}
        {error && (
            <div className="mt-3 text-red-600 whitespace-pre-wrap border border-red-200 bg-red-50 rounded px-3 py-2 text-sm">
              {error}
            </div>
        )}

        {/* LISTA */}
        {!error && (
            <section className="mt-4 space-y-4">
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {!loading && rows.length === 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center text-gray-400 text-sm">
                      No hay proveedores
                    </div>
                )}

                {!loading &&
                    rows.map((p) => {
                      const toggling = togglingId === p.idProveedor;
                      return (
                          <div key={p.idProveedor} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">NIT</div>
                                <div className="text-base font-semibold text-gray-800">
                                  {p.nit || <span className="text-gray-400">—</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                {p.estadoActivo ? (
                                    <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
                            Activo
                          </span>
                                ) : (
                                    <span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-medium">
                            Inactivo
                          </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Proveedor</div>
                              <div className="text-sm text-gray-900 break-words">{p.razonSocial || "—"}</div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-neutral-800">
                              <div>
                                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Teléfono</div>
                                <div className="text-sm mt-0.5">{p.telefono || "—"}</div>
                              </div>
                              <div>
                                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Correo</div>
                                <div className="text-sm mt-0.5 break-words">{p.correoElectronico || "—"}</div>
                              </div>
                            </div>

                            {p.direccion && (
                                <div className="mt-3">
                                  <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Dirección</div>
                                  <div className="text-sm mt-0.5 break-words">{p.direccion}</div>
                                </div>
                            )}

                            {/* Acciones móvil */}
                            <div className="mt-4 flex flex-wrap gap-2 items-center">
                              {canCambiarEstado && (
                                  <ActiveToggleMini
                                      value={!!p.estadoActivo}
                                      title={p.estadoActivo ? "Desactivar (no elimina)" : "Activar"}
                                      disabled={toggling || !canCambiarEstado}
                                      onToggle={() => askToggle(p)}
                                  />
                              )}

                              {canEditar && (
                                  <IconBtn title="Editar" onClick={() => startEdit(p)}>
                                    <Pencil size={18} className="text-neutral-700" />
                                  </IconBtn>
                              )}

                              {canEliminar && (
                                  <IconBtn title="Eliminar" onClick={() => askDelete(p)}>
                                    <Trash2 size={18} className="text-rose-600" />
                                  </IconBtn>
                              )}

                              <IconBtn title="Ver más" onClick={() => setVerMas(p)}>
                                <Eye size={18} className="text-neutral-700" />
                              </IconBtn>
                            </div>
                          </div>
                      );
                    })}

                {!loading && rows.length > 0 && (
                    <div className="flex flex-col items-center gap-2 text-sm text-gray-600 border-t border-gray-200 pt-4">
                      <div>
                        Página {(page?.number ?? 0) + 1} de {page?.totalPages ?? 1}
                      </div>
                      <div className="flex gap-2">
                        <button
                            type="button"
                            className="px-3 py-1.5 rounded border disabled:opacity-50"
                            disabled={!!page?.first}
                            onClick={() => load((page?.number ?? 0) - 1)}
                        >
                          ← Anterior
                        </button>
                        <button
                            type="button"
                            className="px-3 py-1.5 rounded border disabled:opacity-50"
                            disabled={!!page?.last}
                            onClick={() => load((page?.number ?? 0) + 1)}
                        >
                          Siguiente →
                        </button>
                      </div>
                    </div>
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="border rounded bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-[13px] uppercase font-bold">
                    <tr>
                      <th className="px-6 py-3 text-left align-top">NIT</th>
                      <th className="px-6 py-3 text-left align-top">Proveedor</th>
                      <th className="px-6 py-3 text-left align-top">Teléfono</th>
                      <th className="px-6 py-3 text-left align-top">Correo</th>
                      <th className="px-6 py-3 text-left align-top">Acciones</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {!loading && rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                            No hay proveedores
                          </td>
                        </tr>
                    )}

                    {!loading &&
                        rows.map((p) => {
                          const toggling = togglingId === p.idProveedor;
                          return (
                              <tr key={p.idProveedor} className="bg-white align-top">
                                <td className="px-6 py-4 font-semibold text-gray-800 whitespace-nowrap">
                                  {p.nit || <span className="text-gray-400">—</span>}
                                  <div className="mt-1 text-xs">
                                    {p.estadoActivo ? (
                                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">Activo</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700">Inactivo</span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-6 py-4 text-gray-900 break-words" title={p.razonSocial}>
                                  <div className="font-medium">{p.razonSocial || "—"}</div>
                                  <div className="text-xs text-gray-500 mt-1">{p.direccion || ""}</div>
                                </td>

                                <td className="px-6 py-4 text-gray-900 whitespace-nowrap">{p.telefono || "—"}</td>
                                <td className="px-6 py-4 text-gray-900 break-words">{p.correoElectronico || "—"}</td>

                                <td className="px-6 py-2 align-top">
                                  <div className="flex flex-row flex-wrap items-center gap-1.5">
                                    {canCambiarEstado && (
                                        <ActiveToggleMini
                                            value={!!p.estadoActivo}
                                            title={p.estadoActivo ? "Desactivar (no elimina)" : "Activar"}
                                            disabled={toggling || !canCambiarEstado}
                                            onToggle={() => askToggle(p)}
                                        />
                                    )}

                                    {canEditar && (
                                        <IconBtn title="Editar" onClick={() => startEdit(p)}>
                                          <Pencil size={18} className="text-neutral-700" />
                                        </IconBtn>
                                    )}

                                    {canEliminar && (
                                        <IconBtn title="Eliminar" onClick={() => askDelete(p)}>
                                          <Trash2 size={18} className="text-rose-600" />
                                        </IconBtn>
                                    )}

                                    <IconBtn title="Ver más" onClick={() => setVerMas(p)}>
                                      <Eye size={18} className="text-neutral-700" />
                                    </IconBtn>
                                  </div>
                                </td>
                              </tr>
                          );
                        })}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-gray-600">
                      Página {(page?.number ?? 0) + 1} de {page?.totalPages ?? 1}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-600">Total: {total}</span>
                      <div className="flex gap-2">
                        <button
                            type="button"
                            className="px-3 py-1.5 rounded border disabled:opacity-50"
                            disabled={!!page?.first}
                            onClick={() => load((page?.number ?? 0) - 1)}
                        >
                          ← Anterior
                        </button>
                        <button
                            type="button"
                            className="px-3 py-1.5 rounded border disabled:opacity-50"
                            disabled={!!page?.last}
                            onClick={() => load((page?.number ?? 0) + 1)}
                        >
                          Siguiente →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
        )}

        {/* MODAL CREAR/EDITAR */}
        {formOpen && (
            <ProveedorFormModal
                isEdit={!!edit}
                form={form}
                setForm={setForm}
                serverErrors={serverFieldErrors}
                setServerErrors={setServerFieldErrors}
                onClose={() => {
                  resetForm();
                  setFormOpen(false);
                }}
                onSubmit={onSubmit}
            />
        )}

        {/* MODAL VER MÁS */}
        {verMas && (
            <>
              <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setVerMas(null)} />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-neutral-200/80 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                    <h3 className="text-lg font-semibold">Detalles del Proveedor</h3>
                    <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700 rounded p-1"
                        onClick={() => setVerMas(null)}
                        aria-label="Cerrar"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-neutral-800">
                    <Detail label="Razón social" value={verMas.razonSocial || "—"} />
                    <Detail label="NIT/CI" value={verMas.nit || "—"} />
                    <Detail label="Contacto" value={verMas.contacto || "—"} />
                    <Detail label="Teléfono" value={verMas.telefono || "—"} />
                    <Detail label="Correo" value={verMas.correoElectronico || "—"} />
                    <Detail label="Dirección" value={verMas.direccion || "—"} />
                    <Detail label="Estado" value={verMas.estadoActivo ? "Activo" : "Inactivo"} />
                  </div>
                  <div className="flex flex-wrap md:flex-nowrap justify-end gap-2 px-6 py-4 border-t bg-white text-sm">
                    {canEditar && (
                        <button
                            type="button"
                            className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium"
                            onClick={() => {
                              startEdit(verMas);
                              setVerMas(null);
                            }}
                        >
                          Editar
                        </button>
                    )}
                    {canEliminar && (
                        <button
                            type="button"
                            className="rounded-md bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-medium"
                            onClick={() => {
                              askDelete(verMas);
                              setVerMas(null);
                            }}
                        >
                          Eliminar
                        </button>
                    )}
                    <button type="button" className="rounded-md border px-4 py-2 font-medium hover:bg-neutral-50" onClick={() => setVerMas(null)}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </>
        )}

        {/* MODAL CONFIRM ELIMINACIÓN */}
        <ConfirmModal
            open={confirmOpen && !!confirmObj}
            title="Eliminar proveedor (borrado definitivo)"
            message={
              <>
                ¿Eliminar <b>{confirmObj?.razonSocial}</b> de forma permanente?
                <br />
                <span className="text-neutral-600">Esta acción no se puede deshacer.</span>
              </>
            }
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
            kind="danger"
            loading={confirmBusy}
            onConfirm={doDelete}
            onClose={() => {
              if (confirmBusy) return;
              setConfirmOpen(false);
              setConfirmObj(null);
            }}
        />

        {/* MODAL CONFIRM ACTIVAR/DESACTIVAR */}
        <ConfirmModal
            open={toggleConfirmOpen && !!toggleObj}
            title={toggleNext ? "Activar proveedor" : "Desactivar proveedor"}
            message={
              toggleNext ? (
                  <>¿Deseas <b>activar</b> al proveedor <b>{toggleObj?.razonSocial}</b>? Podrá volver a ser usado en compras.</>
              ) : (
                  <>¿Deseas <b>desactivar</b> al proveedor <b>{toggleObj?.razonSocial}</b>? No podrá seleccionarse mientras esté inactivo.</>
              )
            }
            confirmLabel={toggleNext ? "Activar" : "Desactivar"}
            cancelLabel="Cancelar"
            kind={toggleNext ? "default" : "warn"}
            loading={toggleConfirmBusy}
            onConfirm={doConfirmToggle}
            onClose={() => {
              if (toggleConfirmBusy) return;
              setToggleConfirmOpen(false);
              setToggleObj(null);
            }}
        />

        {/* TOAST */}
        <Toast open={toastOpen} message={toastMsg} kind={toastKind} onClose={() => setToastOpen(false)} />
      </div>
  );
}

/* ===== Modal Form ===== */
function ProveedorFormModal({
                              isEdit,
                              form,
                              setForm,
                              serverErrors,
                              setServerErrors,
                              onClose,
                              onSubmit,
                            }: {
  isEdit: boolean;
  form: Partial<Proveedor>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Proveedor>>>;
  serverErrors: Record<string, string>;
  setServerErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  useLockBodyScroll(true);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const mouseDownOnOverlay = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    mouseDownOnOverlay.current = e.target === overlayRef.current;
  };
  const handleMouseUp: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (mouseDownOnOverlay.current && e.target === overlayRef.current) onClose();
    mouseDownOnOverlay.current = false;
  };

  type Errors = Partial<Record<keyof Proveedor, string>>;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errorsClient, setErrorsClient] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(values: Partial<Proveedor>): Errors {
    const e: Errors = {};
    if (!values.razonSocial || values.razonSocial.trim().length < 2) e.razonSocial = "Ingresa al menos 2 caracteres.";
    if (values.correoElectronico) {
      const rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!rx.test(values.correoElectronico.trim())) e.correoElectronico = "Correo no válido.";
    }
    if (values.telefono && values.telefono.trim().length < 6) e.telefono = "Demasiado corto. Mínimo 6 dígitos/caracteres.";
    return e;
  }

  useEffect(() => {
    setErrorsClient(validate(form));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.razonSocial, form.correoElectronico, form.telefono]);

  function markTouched(name: string) {
    setTouched((t) => ({ ...t, [name]: true }));
  }

  // error final por campo = error local || error servidor
  function mergedErrorFor(field: keyof Errors | string): string | undefined {
    return serverErrors[field] || (errorsClient as any)[field] || undefined;
  }

  const isValid = Object.keys({ ...errorsClient, ...serverErrors }).length === 0;

  function updateField(field: keyof Proveedor, value: any) {
    // limpiar error de servidor del campo, si existiera
    setServerErrors((prev) => {
      const { [field]: _drop, ...rest } = prev;
      return rest;
    });
    setForm((f) => ({ ...f, [field]: value }));
  }

  const handleSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    setTouched({
      razonSocial: true,
      nit: true,
      contacto: true,
      telefono: true,
      correoElectronico: true,
      direccion: true,
      estadoActivo: true,
    });

    const localErrors = validate(form);
    const combined = { ...localErrors, ...serverErrors };
    if (Object.keys(combined).length > 0) return;

    setSubmitting(true);
    try {
      onSubmit(e as any);
    } finally {
      setTimeout(() => setSubmitting(false), 0);
    }
  };

  return (
      <div
          ref={overlayRef}
          className="fixed inset-0 z-[80] bg-black/50 overflow-y-auto"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          role="dialog"
          aria-modal="true"
      >
        <div className="min-h-full flex items-start justify-center px-4 py-10">
          <form
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
          >
            <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-wide">{isEdit ? "Editar proveedor" : "Agregar nuevo proveedor"}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Los campos marcados con <span className="text-rose-600">*</span> son obligatorios.
                </p>
              </div>
              <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 rounded p-1"
                  onClick={onClose}
                  aria-label="Cerrar"
                  title="Cerrar (Esc)"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="space-y-5 text-sm text-neutral-800">
                {/* Mantener tamaños adecuados por campo */}
                <FieldPro
                    id="f-razon"
                    label="Razón social"
                    required
                    placeholder="Ej: Comercial Andina SRL"
                    value={form.razonSocial || ""}
                    error={touched.razonSocial ? mergedErrorFor("razonSocial") : mergedErrorFor("razonSocial")}
                    onBlur={() => markTouched("razonSocial")}
                    onChange={(v) => updateField("razonSocial", v)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FieldPro
                      label="NIT/CI"
                      placeholder="Opcional"
                      value={form.nit || ""}
                      error={touched.nit ? mergedErrorFor("nit") : mergedErrorFor("nit")}
                      onBlur={() => markTouched("nit")}
                      onChange={(v) => updateField("nit", v)}
                  />
                  <FieldPro
                      label="Contacto"
                      placeholder="Nombre del contacto"
                      value={form.contacto || ""}
                      error={touched.contacto ? mergedErrorFor("contacto") : mergedErrorFor("contacto")}
                      onBlur={() => markTouched("contacto")}
                      onChange={(v) => updateField("contacto", v)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FieldPro
                      label="Teléfono"
                      placeholder="Ej: 76543210"
                      value={form.telefono || ""}
                      error={touched.telefono ? mergedErrorFor("telefono") : mergedErrorFor("telefono")}
                      onBlur={() => markTouched("telefono")}
                      onChange={(v) => updateField("telefono", v)}
                  />
                  <FieldPro
                      label="Correo"
                      placeholder="nombre@dominio.com"
                      type="email"
                      value={form.correoElectronico || ""}
                      error={touched.correoElectronico ? mergedErrorFor("correoElectronico") : mergedErrorFor("correoElectronico")}
                      onBlur={() => markTouched("correoElectronico")}
                      onChange={(v) => updateField("correoElectronico", v)}
                  />
                </div>

                <FieldPro
                    label="Dirección"
                    placeholder="Calle, número, zona…"
                    value={form.direccion || ""}
                    error={touched.direccion ? mergedErrorFor("direccion") : mergedErrorFor("direccion")}
                    onBlur={() => markTouched("direccion")}
                    onChange={(v) => updateField("direccion", v)}
                />

                <div className="flex items-center gap-3 pt-2">
                  <input
                      id="f-activo"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-400"
                      checked={!!form.estadoActivo}
                      onChange={(e) => updateField("estadoActivo", e.target.checked)}
                  />
                  <label htmlFor="f-activo" className="text-[15px]">
                    Activo
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-white flex items-center justify-end gap-2">
              <button
                  type="button"
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-neutral-50"
                  onClick={onClose}
              >
                Cancelar
              </button>
              <button
                  type="submit"
                  disabled={submitting || !isValid}
                  className={[
                    "px-5 py-2 rounded-lg text-white font-semibold text-sm",
                    submitting || !isValid ? "bg-emerald-400 cursor-not-allowed opacity-70" : "bg-emerald-600 hover:bg-emerald-700",
                  ].join(" ")}
              >
                {isEdit ? "Guardar" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}

/* ===== Field / Detail ===== */
function FieldPro({
                    id,
                    label,
                    required = false,
                    type = "text",
                    value,
                    placeholder,
                    error,
                    hint,
                    onChange,
                    onBlur,
                  }: {
  id?: string;
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  return (
      <div>
        <label htmlFor={id} className="block text-[15px] font-medium mb-1">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
        <input
            id={id}
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={[
              "w-full rounded-lg px-3 py-2 border outline-none text-sm",
              error ? "border-rose-400 focus:ring-2 focus:ring-rose-500" : "border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
            ].join(" ")}
        />
        <div className="mt-1 text-xs">
          {error ? <span className="text-rose-600">{error}</span> : hint ? <span className="text-gray-500">{hint}</span> : null}
        </div>
      </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
      <div>
        <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">{label}</div>
        <div className="text-sm mt-1 text-neutral-800 break-words">{value}</div>
      </div>
  );
}
