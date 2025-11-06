import { useEffect, useMemo, useState, type ReactNode } from "react";
import { unidadService } from "@/servicios/unidad";
import type { Unidad, UnidadCrearDTO, UnidadActualizarDTO } from "@/types/unidad";
import type { Page } from "@/types/pagination";
import { Pencil, Trash2, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/servicios/httpClient";

/* ===== Modal de confirmación compacto ===== */
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
      <div className="fixed inset-0 z-[80]">
        <div className="absolute inset-0 bg-black/35" onClick={() => !loading && onClose()} />
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
              <button
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
                  className="px-3 h-9 rounded-md border bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-60"
                  onClick={onClose}
                  disabled={loading}
              >
                {cancelLabel}
              </button>
              <button
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

/* ===== Toast flotante esquina (no intrusivo) ===== */
type ToastKind = "success" | "error" | "warn" | "info";
type Toast = { id: number; kind: ToastKind; content: ReactNode };

function ToastCorner({
                       toasts,
                       onClose,
                     }: {
  toasts: Toast[];
  onClose: (id: number) => void;
}) {
  const stylesByKind: Record<ToastKind, string> = {
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    warn: "bg-amber-600 text-white",
    info: "bg-neutral-800 text-white",
  };

  return (
      <>
        {/* mobile: bottom-center */}
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[95] w-[calc(100%-1.5rem)] max-w-md md:hidden pointer-events-none">
          <div className="flex flex-col items-stretch gap-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`pointer-events-auto w-full shadow-xl rounded-2xl px-4 py-3 text-sm ${stylesByKind[t.kind]} animate-in fade-in zoom-in`}
                    role="status"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 leading-5">{t.content}</div>
                    <button
                        className="shrink-0 p-1 rounded hover:bg-white/10"
                        onClick={() => onClose(t.id)}
                        aria-label="Cerrar aviso"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* desktop: bottom-right */}
        <div className="hidden md:block fixed bottom-4 right-4 z-[95] pointer-events-none">
          <div className="flex flex-col items-end gap-2 w-[360px] max-w-[90vw]">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`pointer-events-auto w-full shadow-xl rounded-2xl px-4 py-3 text-sm ${stylesByKind[t.kind]} animate-in fade-in zoom-in`}
                    role="status"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 leading-5">{t.content}</div>
                    <button
                        className="shrink-0 p-1 rounded hover:bg-white/10"
                        onClick={() => onClose(t.id)}
                        aria-label="Cerrar aviso"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </>
  );
}

export default function UnidadesPage() {
  const { can } = useAuth() as { can: (perm: string) => boolean };

  // permisos
  const canVer = useMemo(() => can("unidades:ver"), [can]);
  const canCrear = useMemo(() => can("unidades:crear"), [can]);
  const canEditar = useMemo(() => can("unidades:actualizar"), [can]);
  const canEliminar = useMemo(() => can("unidades:eliminar"), [can]);

  const show403 = (msg = "No tienes permiso para realizar esta acción.") => {
    window.dispatchEvent(new CustomEvent("auth:forbidden", { detail: { source: "UnidadesPage", message: msg } }));
  };

  // listado
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [data, setData] = useState<Page<Unidad> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (kind: ToastKind, content: ReactNode, ms = 4000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, kind, content }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  };
  const closeToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  // form lateral (create/edit)
  const [editando, setEditando] = useState<Unidad | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<UnidadCrearDTO>({
    nombreUnidad: "",
    simboloUnidad: "",
    factorConversionBase: 1,
  });

  const tituloForm = useMemo(() => (editando ? "Editar Unidad" : "Agregar Nueva Unidad"), [editando]);
  const textoBtn = useMemo(() => (editando ? "Guardar Cambios" : "Agregar Unidad"), [editando]);

  async function cargar() {
    if (!canVer) {
      setErr("Acceso denegado.");
      setData(null);
      show403("No tienes permiso para ver unidades.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await unidadService.list({
        q: q.trim() || undefined,
        page,
        size,
        sort: "nombreUnidad,asc",
      });
      setData(res);
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        setErr("Acceso denegado.");
        setData(null);
        show403("No tienes permiso para ver unidades.");
      } else {
        setErr(e?.message || "Error cargando unidades");
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, size, canVer]);

  function onEditar(u: Unidad) {
    if (!canEditar) return show403("No puedes actualizar unidades.");
    setEditando(u);
    setForm({
      nombreUnidad: u.nombreUnidad,
      simboloUnidad: u.simboloUnidad,
      factorConversionBase: u.factorConversionBase ?? 1,
    });
  }
  function onCancelar() {
    setEditando(null);
    setForm({ nombreUnidad: "", simboloUnidad: "", factorConversionBase: 1 });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editando ? !canEditar : !canCrear) {
      show403(editando ? "No puedes actualizar unidades." : "No puedes crear unidades.");
      return;
    }
    if (!form.nombreUnidad.trim() || !form.simboloUnidad.trim()) {
      pushToast("warn", <>Nombre y símbolo son obligatorios.</>);
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        const dto: UnidadActualizarDTO = {
          nombreUnidad: form.nombreUnidad.trim(),
          simboloUnidad: form.simboloUnidad.trim(),
          factorConversionBase: form.factorConversionBase ?? 1,
        };
        await unidadService.update(editando.idUnidad, dto);
      } else {
        const dto: UnidadCrearDTO = {
          nombreUnidad: form.nombreUnidad.trim(),
          simboloUnidad: form.simboloUnidad.trim(),
          factorConversionBase: form.factorConversionBase ?? 1,
        };
        await unidadService.create(dto);
      }
      await cargar();
      onCancelar();
      pushToast("success", <>✅ Unidad guardada correctamente.</>);
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        show403(editando ? "No puedes actualizar unidades." : "No puedes crear unidades.");
      } else if (e instanceof ApiError) {
        const serverMsg = (typeof (e as any).details === "string" && (e as any).details.trim())
            ? (e as any).details
            : (e.message || "Operación no realizada.");
        pushToast("error", serverMsg);
      } else {
        pushToast("error", e?.message || "No se pudo guardar.");
      }
    } finally {
      setGuardando(false);
    }
  }

  // confirmación eliminar
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmObj, setConfirmObj] = useState<Unidad | null>(null);

  function askDelete(u: Unidad) {
    if (!canEliminar) return show403("No puedes eliminar unidades.");
    setConfirmObj(u);
    setConfirmOpen(true);
  }

  async function doDelete() {
    const u = confirmObj!;
    setConfirmBusy(true);
    try {
      await unidadService.remove(u.idUnidad);
      setConfirmOpen(false);
      setConfirmObj(null);
      await cargar();
      if (editando?.idUnidad === u.idUnidad) onCancelar();
      pushToast("success", <>🗑️ Unidad eliminada.</>);
    } catch (e: any) {
      setConfirmOpen(false);
      setConfirmObj(null);

      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        show403("No puedes eliminar unidades.");
      } else if (e instanceof ApiError && e.status === 409) {
        // Usa el mensaje del backend tal cual (sin forzar)
        const serverMsg =
            (typeof (e as any).details === "string" && (e as any).details.trim())
                ? (e as any).details
                : (e.message || "No se puede eliminar porque está en uso.");
        pushToast("warn", <>{serverMsg}</>);
      } else if (e instanceof ApiError) {
        const serverMsg =
            (typeof (e as any).details === "string" && (e as any).details.trim())
                ? (e as any).details
                : (e.message || "No se pudo eliminar.");
        pushToast("error", serverMsg);
      } else {
        pushToast("error", e?.message || "No se pudo eliminar.");
      }
    } finally {
      setConfirmBusy(false);
    }
  }

  if (!canVer) {
    return (
        <div className="p-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            No tienes permiso para ver unidades.
          </div>
        </div>
    );
  }

  return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Gestión de Unidades</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* IZQUIERDA: buscador + lista (2/3) */}
          <div className="lg:col-span-2">
            {/* Barra superior */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="relative w-full sm:w-80">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                    className="h-10 w-full pl-9 pr-3 rounded-lg border border-neutral-300"
                    placeholder="Buscar unidad…"
                    value={q}
                    onChange={(e) => {
                      setPage(0);
                      setQ(e.target.value);
                    }}
                />
              </div>

              <button
                  className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border bg-white hover:bg-neutral-50 disabled:opacity-60"
                  onClick={() => unidadService.exportCsv(q)}
                  disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M5 20h14v-2H5v2zm7-16l-5 5h3v4h4v-4h3l-5-5z" fill="currentColor" />
                </svg>
                Exportar CSV
              </button>
            </div>

            {/* Errores / Loading */}
            {err && (
                <div className="text-rose-700 text-sm mb-2 border border-rose-200 bg-rose-50 rounded px-3 py-2">{err}</div>
            )}
            {loading && !err && <div className="mb-3">Cargando…</div>}

            {/* Encabezado md+ */}
            {!loading && !err && (
                <div className="hidden md:grid w-full grid-cols-[1.1fr_0.7fr_0.7fr_120px] items-center text-xs uppercase text-neutral-500 px-3">
                  <div>Unidad</div>
                  <div>Símbolo</div>
                  <div>Factor base</div>
                  <div className="text-right pr-1">Acciones</div>
                </div>
            )}

            {/* Tarjetas / filas */}
            {!loading && !err && (
                <div className="mt-2 space-y-3">
                  {data?.content?.length ? (
                      data.content.map((u) => (
                          <div
                              key={u.idUnidad}
                              className="grid grid-cols-1 md:grid-cols-[1.1fr_0.7fr_0.7fr_120px] items-start md:items-center gap-2 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition"
                          >
                            {/* Nombre */}
                            <div className="font-semibold text-neutral-800 break-words min-w-0">
                              <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Unidad</span>
                              {u.nombreUnidad}
                            </div>

                            {/* Símbolo */}
                            <div className="text-neutral-800 min-w-0">
                              <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Símbolo</span>
                              {u.simboloUnidad}
                            </div>

                            {/* Factor */}
                            <div className="text-neutral-800 min-w-0">
                              <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">Factor base</span>
                              {u.factorConversionBase ?? 1}
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center justify-end gap-1">
                              {canEditar && (
                                  <button
                                      aria-label="Editar"
                                      title="Editar"
                                      onClick={() => onEditar(u)}
                                      className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                                  >
                                    <Pencil size={18} />
                                  </button>
                              )}
                              {canEliminar && (
                                  <button
                                      aria-label="Eliminar"
                                      title="Eliminar"
                                      onClick={() => askDelete(u)}
                                      className="p-2 rounded-md hover:bg-neutral-100 text-rose-600 hover:text-rose-700"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                              )}
                            </div>
                          </div>
                      ))
                  ) : (
                      <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">Sin registros</div>
                  )}
                </div>
            )}

            {/* Paginación */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className="border rounded px-3 py-1" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Anterior
              </button>
              <span>
              Página {data ? data.number + 1 : page + 1} de {data ? data.totalPages : 1}
            </span>
              <button
                  className="border rounded px-3 py-1"
                  disabled={!data || (data as any).last}
                  onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
              <select
                  className="ml-auto border rounded px-2 py-1"
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
          </div>

          {/* DERECHA: formulario */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="bg-white border rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-3">{tituloForm}</h2>
                {!editando && !canCrear ? (
                    <div className="text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3">
                      No tienes permiso para crear unidades.
                    </div>
                ) : (
                    <form className="space-y-3" onSubmit={onSubmit}>
                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">Nombre</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.nombreUnidad}
                            onChange={(e) => setForm((f) => ({ ...f, nombreUnidad: e.target.value }))}
                            placeholder="p. ej., Kilogramo"
                            disabled={editando ? !canEditar : !canCrear}
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">Símbolo</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.simboloUnidad}
                            onChange={(e) => setForm((f) => ({ ...f, simboloUnidad: e.target.value }))}
                            placeholder="p. ej., kg"
                            disabled={editando ? !canEditar : !canCrear}
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">Factor de Conversión (base)</label>
                        <input
                            type="number"
                            step="0.000001"
                            min="0.000001"
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.factorConversionBase ?? 1}
                            onChange={(e) => setForm((f) => ({ ...f, factorConversionBase: Number(e.target.value) }))}
                            placeholder="p. ej., 1"
                            disabled={editando ? !canEditar : !canCrear}
                        />
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                            type="submit"
                            disabled={guardando || (editando ? !canEditar : !canCrear)}
                            className="flex-1 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {textoBtn}
                        </button>
                        {editando && (
                            <button type="button" className="h-10 px-4 rounded-lg border hover:bg-neutral-50" onClick={onCancelar}>
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

        {/* Confirmación */}
        <ConfirmModal
            open={confirmOpen && !!confirmObj}
            title="Eliminar unidad"
            message={
              <>
                ¿Eliminar <b>{confirmObj?.nombreUnidad}</b> permanentemente?
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

        {/* Toast esquina (no molesta) */}
        <ToastCorner toasts={toasts} onClose={closeToast} />
      </div>
  );
}
