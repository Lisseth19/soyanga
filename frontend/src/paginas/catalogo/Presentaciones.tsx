import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { presentacionService } from "@/servicios/presentacion";
import type { Page } from "@/types/pagination";
import type { PresentacionDTO, PresentacionCrearDTO } from "@/types/presentacion";
import { Pencil, ImageUp, Check, X } from "lucide-react";
import { opcionesProductos } from "@/servicios/producto";
import { unidadService } from "@/servicios/unidad";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/servicios/httpClient";

type Opcion = { id: number; nombre: string };

/* ========= Modal de Confirmación ========= */
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
  kind?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
      <div className="fixed inset-0 z-[80]">
        <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200">
            <div className="px-4 py-3 border-b border-neutral-200">
              <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
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
                  className={
                      "px-3 h-9 rounded-md font-medium text-white disabled:opacity-60 " +
                      (kind === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700")
                  }
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

/* ========= Toggle compacto 45×20 (knob 16px) ========= */
function ActiveToggle({
                        value,
                        disabled,
                        onToggle,
                        title,
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
              "absolute top-[2px] left-[2px] inline-block w-[16px] h-[16px] bg-white rounded-full shadow transition-transform",
              value ? "translate-x-[25px]" : "translate-x-0",
            ].join(" ")}
        />
      </button>
  );
}

export default function PresentacionesPage() {
  const { can } = useAuth() as { can: (perm: string) => boolean };

  // permisos
  const canVer = useMemo(() => can("presentaciones:ver"), [can]);
  const canCrear = useMemo(() => can("presentaciones:crear"), [can]);
  const canEditar = useMemo(() => can("presentaciones:actualizar"), [can]); // activar/desactivar/editar/imagen

  const show403 = (msg = "No tienes permiso para realizar esta acción.") => {
    window.dispatchEvent(
        new CustomEvent("auth:forbidden", { detail: { source: "PresentacionesPage", message: msg } })
    );
  };

  // filtros
  const [idProducto, setIdProducto] = useState<number | undefined>(undefined);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState("codigoSku,asc");
  const [soloActivos, setSoloActivos] = useState(true);

  // datos
  const [data, setData] = useState<Page<PresentacionDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // opciones
  const [productos, setProductos] = useState<Opcion[]>([]);
  const [unidades, setUnidades] = useState<Opcion[]>([]);

  // buscador producto (panel)
  const [prodFiltro, setProdFiltro] = useState("");
  const productosFiltrados = useMemo(() => {
    const s = prodFiltro.trim().toLowerCase();
    if (!s) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(s));
  }, [prodFiltro, productos]);

  // form panel
  const INITIAL_FORM: PresentacionCrearDTO = {
    idProducto: 0,
    idUnidad: 0,
    contenidoPorUnidad: 1,
    codigoSku: "",
    costoBaseUsd: 0,
    margenVentaPorcentaje: 0,
    precioVentaBob: 0,
  };
  const [form, setForm] = useState<PresentacionCrearDTO>(INITIAL_FORM);
  const [editando, setEditando] = useState<PresentacionDTO | null>(null);
  const tituloForm = editando ? "Editar Presentación" : "Agregar Presentación";
  const textoBoton = editando ? "Guardar" : "Agregar";

  // upload por fila
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetIdForUpload, setTargetIdForUpload] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  // upload desde el formulario
  const formFileRef = useRef<HTMLInputElement>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const ASSETS_BASE = import.meta.env.VITE_ASSETS_BASE ?? "";
  function assetUrl(path?: string | null) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${ASSETS_BASE}${path}`;
  }

  // drag & drop (form)
  const [isDragging, setIsDragging] = useState(false);
  function validateAndSetFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Solo se permiten imágenes");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Máx. 5MB");
      return false;
    }
    setNewFile(file);
    setPreview(URL.createObjectURL(file));
    return true;
  }
  function onFormFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    validateAndSetFile(f);
  }
  function pickFormFile() {
    formFileRef.current?.click();
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dt = e.dataTransfer;
    const file =
        dt.items && dt.items.length
            ? dt.items[0].kind === "file"
                ? dt.items[0].getAsFile()
                : null
            : dt.files?.[0];
    if (file) validateAndSetFile(file);
  }

  function resetPanel() {
    setEditando(null);
    setForm(INITIAL_FORM);
    setNewFile(null);
    setPreview(null);
    if (formFileRef.current) formFileRef.current.value = "";
  }

  // combos
  useEffect(() => {
    (async () => {
      try {
        const [prods, unis] = await Promise.all([opcionesProductos(), unidadService.opciones()]);
        setProductos(prods);
        setUnidades(unis);
      } catch {
        setProductos([]);
        setUnidades([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!form.idProducto) return;
    const m = productos.find((p) => p.id === form.idProducto);
    if (m) setProdFiltro(m.nombre);
  }, [form.idProducto, productos]);

  const params = useMemo(
      () => ({ idProducto, q, page, size, sort, soloActivos }),
      [idProducto, q, page, size, sort, soloActivos]
  );

  // listar
  const load = async () => {
    if (!canVer) {
      show403("No tienes permiso para ver presentaciones.");
      setErr("Acceso denegado.");
      setData(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await presentacionService.list(params);
      setData(res);
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        show403("No tienes permiso para ver presentaciones.");
        setErr("Acceso denegado.");
        setData(null);
      } else {
        setErr(e?.message || "Error cargando presentaciones");
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, canVer]);

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState<{
    title: string;
    message: ReactNode;
    kind?: "default" | "danger";
    onConfirm: () => Promise<void> | void;
    confirmLabel?: string;
    cancelLabel?: string;
  } | null>(null);

  function openConfirm(cfg: typeof confirmCfg) {
    if (!cfg) return;
    setConfirmCfg(cfg);
    setConfirmOpen(true);
  }
  function closeConfirm() {
    if (confirmLoading) return;
    setConfirmOpen(false);
    setTimeout(() => setConfirmCfg(null), 200);
  }

  // acciones
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editando ? !canEditar : !canCrear) {
      show403(editando ? "No puedes actualizar presentaciones." : "No puedes crear presentaciones.");
      return;
    }
    try {
      let saved: PresentacionDTO;
      if (editando) {
        saved = await presentacionService.update(editando.idPresentacion, {
          idUnidad: form.idUnidad,
          contenidoPorUnidad: form.contenidoPorUnidad,
          codigoSku: form.codigoSku,
          costoBaseUsd: form.costoBaseUsd,
          margenVentaPorcentaje: form.margenVentaPorcentaje,
          precioVentaBob: form.precioVentaBob,
        });
        if (newFile) await presentacionService.subirImagen(saved.idPresentacion, newFile);
      } else {
        saved = await presentacionService.create(form);
        if (newFile) await presentacionService.subirImagen(saved.idPresentacion, newFile);
      }
      resetPanel();
      await load();
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        show403(editando ? "No puedes actualizar presentaciones." : "No puedes crear presentaciones.");
        return;
      }
      alert(e?.message || "No se pudo guardar");
    }
  };

  const onEdit = (p: PresentacionDTO) => {
    if (!canEditar) {
      show403();
      return;
    }
    setEditando(p);
    setForm({
      idProducto: p.idProducto,
      idUnidad: p.idUnidad,
      contenidoPorUnidad: Number(p.contenidoPorUnidad),
      codigoSku: p.codigoSku,
      costoBaseUsd: Number(p.costoBaseUsd),
      margenVentaPorcentaje: Number(p.margenVentaPorcentaje),
      precioVentaBob: Number(p.precioVentaBob),
    });
  };

  // activar/desactivar — AMBOS requieren "presentaciones:actualizar"
  const onToggleSwitch = (p: PresentacionDTO, next: boolean) => {
    if (!canEditar) {
      show403("No tienes permiso para actualizar presentaciones.");
      return;
    }
    if (!next) {
      // desactivar (soft-off)
      openConfirm({
        title: "Desactivar presentación",
        message: (
            <>
              ¿Desactivar la presentación <span className="font-semibold">{p.codigoSku}</span>?<br />
              <span className="text-neutral-600">
              <strong>No se eliminará</strong>; podrás activarla nuevamente cuando lo necesites.
            </span>
            </>
        ),
        kind: "danger",
        confirmLabel: "Desactivar",
        cancelLabel: "Cancelar",
        onConfirm: async () => {
          try {
            setConfirmLoading(true);
            await presentacionService.deactivate(p.idPresentacion);
            await load();
            closeConfirm();
          } catch (e: any) {
            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
              show403("No tienes permiso para actualizar presentaciones.");
              closeConfirm();
              return;
            }
            alert(e?.message || "No se pudo desactivar");
          } finally {
            setConfirmLoading(false);
          }
        },
      });
    } else {
      // activar
      presentacionService
          .update(p.idPresentacion, { estadoActivo: true })
          .then(load)
          .catch((e: any) => {
            if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
              show403("No tienes permiso para actualizar presentaciones.");
            } else {
              alert(e?.message || "No se pudo activar");
            }
          });
    }
  };

  // auto-limpieza si cambian permisos
  useEffect(() => {
    if (!canVer) {
      resetPanel();
      return;
    }
    if (editando && !canEditar) {
      resetPanel();
      show403("Perdiste el permiso para actualizar presentaciones.");
    }
  }, [canVer, canEditar, editando]);

  const nombreProducto = (id: number) => productos.find((x) => x.id === id)?.nombre || id;
  const simboloUnidad = (id: number) => unidades.find((x) => x.id === id)?.nombre || id;

  if (!canVer) {
    return (
        <div className="p-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            No tienes permiso para ver presentaciones.
          </div>
        </div>
    );
  }

  const stateBadge = (ok: boolean) =>
      [
        "inline-flex items-center rounded-full border px-2 py-[2px] text-[12px] font-medium",
        ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-neutral-200 bg-neutral-50 text-neutral-500",
      ].join(" ");

  return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Gestión de Presentaciones</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LISTA */}
          <div className="lg:col-span-2">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <select
                  className="border rounded-lg px-3 py-2 w-full sm:w-64"
                  value={idProducto ?? ""}
                  onChange={(e) => {
                    setPage(0);
                    setIdProducto(e.target.value ? Number(e.target.value) : undefined);
                  }}
              >
                <option value="">Todos los productos</option>
                {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                ))}
              </select>

              <input
                  className="border rounded-lg px-3 py-2 w-full sm:flex-1"
                  placeholder="Buscar por SKU…"
                  value={q}
                  onChange={(e) => {
                    setPage(0);
                    setQ(e.target.value);
                  }}
              />

              <select
                  className="border rounded-lg px-3 py-2 w-full sm:w-56"
                  value={sort}
                  onChange={(e) => {
                    setPage(0);
                    setSort(e.target.value);
                  }}
              >
                <option value="codigoSku,asc">SKU (A→Z)</option>
                <option value="codigoSku,desc">SKU (Z→A)</option>
                <option value="idPresentacion,desc">Más recientes</option>
                <option value="idPresentacion,asc">Más antiguas</option>
              </select>

              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={soloActivos}
                    onChange={(e) => {
                      setSoloActivos(e.target.checked);
                      setPage(0);
                    }}
                />
                Solo activos
              </label>
            </div>

            {err && (
                <div className="text-red-600 text-sm mb-2 border border-red-200 bg-red-50 rounded px-3 py-2">{err}</div>
            )}

            {/* ===== Encabezados responsive sin scroll ===== */}
            {/* md: Img | SKU | Producto | Precio | Acciones */}
            <div className="hidden md:grid lg:hidden w-full grid-cols-[64px_110px_1fr_0.6fr_140px] items-center text-xs uppercase text-neutral-500 px-3">
              <div>Img</div>
              <div>SKU</div>
              <div>Producto</div>
              <div>Precio</div>
              <div className="text-right pr-1 whitespace-nowrap">Acciones</div>
            </div>
            {/* lg+: Img | SKU | Producto | Unidad | Contenido | Precio | Acciones */}
            <div className="hidden lg:grid w-full grid-cols-[64px_110px_1fr_0.5fr_0.5fr_0.6fr_150px] items-center text-xs uppercase text-neutral-500 px-3">
              <div>Img</div>
              <div>SKU</div>
              <div>Producto</div>
              <div>Unidad</div>
              <div>Contenido</div>
              <div>Precio BOB</div>
              <div className="text-right pr-1 whitespace-nowrap">Acciones</div>
            </div>

            {/* Filas */}
            {loading ? (
                <div className="mb-2">Cargando…</div>
            ) : data?.content?.length ? (
                <div className="space-y-3 mt-1">
                  {data.content.map((p) => (
                      <div
                          key={p.idPresentacion}
                          className={[
                            "grid w-full grid-cols-[64px_1fr]", // móvil
                            "md:grid-cols-[64px_110px_1fr_0.6fr_140px]", // md (sin unidad/cont.)
                            "lg:grid-cols-[64px_110px_1fr_0.5fr_0.5fr_0.6fr_150px]", // lg completo
                            "items-center gap-2 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition",
                            !p.estadoActivo ? "opacity-60" : "",
                          ].join(" ")}
                      >
                        {/* Img */}
                        <div className="w-12 h-12">
                          {p.imagenUrl ? (
                              <img
                                  src={assetUrl(p.imagenUrl)}
                                  alt={p.codigoSku}
                                  className="w-12 h-12 object-cover rounded-md border"
                                  loading="lazy"
                              />
                          ) : (
                              <div className="w-12 h-12 rounded-md border border-dashed border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400">
                                Sin img
                              </div>
                          )}
                        </div>

                        {/* SKU md+ */}
                        <div className="hidden md:block font-semibold text-neutral-800">{p.codigoSku}</div>

                        {/* Producto */}
                        <div className="min-w-0">
                          <div className="font-semibold text-neutral-800 truncate">{nombreProducto(p.idProducto)}</div>
                          {/* Subtítulo móvil */}
                          <div className="mt-1 text-[13px] text-neutral-600 md:hidden">
                            <span className="font-medium text-neutral-700">SKU:</span> {p.codigoSku}
                            <span className="mx-1">·</span>
                            <span className="font-medium text-neutral-700">Unid:</span> {simboloUnidad(p.idUnidad)}
                            <span className="mx-1">·</span>
                            <span className="font-medium text-neutral-700">Cont:</span> {p.contenidoPorUnidad}
                            <span className="mx-1">·</span>
                            <span className="font-medium text-neutral-700">Bs:</span> {p.precioVentaBob}
                          </div>
                        </div>

                        {/* Unidad (solo lg) */}
                        <div className="hidden lg:block">{simboloUnidad(p.idUnidad)}</div>
                        {/* Contenido (solo lg) */}
                        <div className="hidden lg:block">{p.contenidoPorUnidad}</div>
                        {/* Precio (md y lg) */}
                        <div className="hidden md:block">{p.precioVentaBob}</div>

                        {/* Acciones */}
                        <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-2 mt-2 md:mt-0">
                          {/* Si NO puede actualizar: mostrar estado como badge y ocultar toggle */}
                          {!canEditar ? (
                              <span className={stateBadge(!!p.estadoActivo)}>{p.estadoActivo ? "Activo" : "Inactivo"}</span>
                          ) : (
                              <ActiveToggle
                                  value={!!p.estadoActivo}
                                  onToggle={(next) => onToggleSwitch(p, next)}
                                  disabled={!canEditar}
                                  title={p.estadoActivo ? "Desactivar (no elimina)" : "Activar"}
                              />
                          )}

                          {/* Editar */}
                          {canEditar && (
                              <button
                                  aria-label="Editar"
                                  title="Editar"
                                  onClick={() => onEdit(p)}
                                  className="px-2.5 py-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                              >
                                <Pencil size={18} />
                              </button>
                          )}

                          {/* Cambiar imagen */}
                          {canEditar && (
                              <button
                                  aria-label="Cambiar imagen"
                                  title="Cambiar imagen"
                                  onClick={() => {
                                    setTargetIdForUpload(p.idPresentacion);
                                    fileInputRef.current?.click();
                                  }}
                                  disabled={uploadingId === p.idPresentacion}
                                  className="px-2.5 py-1.5 rounded-md hover:bg-neutral-100 text-emerald-700 hover:text-emerald-800 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                              >
                                <ImageUp size={18} />
                              </button>
                          )}
                        </div>
                      </div>
                  ))}
                </div>
            ) : (
                <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">Sin registros</div>
            )}

            {/* input oculto para subir imagen (compartido por filas) */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const inputEl = e.currentTarget;
                  const file = inputEl.files?.[0];
                  const id = targetIdForUpload;

                  if (!file || id == null) {
                    inputEl.value = "";
                    return;
                  }

                  if (!canEditar) {
                    show403("No puedes actualizar presentaciones.");
                    inputEl.value = "";
                    return;
                  }

                  if (!file.type.startsWith("image/")) {
                    alert("Solo imágenes");
                    inputEl.value = "";
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    alert("Máx. 5MB");
                    inputEl.value = "";
                    return;
                  }

                  try {
                    setUploadingId(id);
                    await presentacionService.subirImagen(id, file);
                    await load();
                  } catch (err: any) {
                    if ((err instanceof ApiError && err.status === 403) || err?.status === 403) {
                      show403("No puedes actualizar presentaciones.");
                    } else {
                      alert(err?.message || "No se pudo subir la imagen");
                    }
                  } finally {
                    setUploadingId(null);
                    setTargetIdForUpload(null);
                    inputEl.value = "";
                  }
                }}
            />

            {/* paginación */}
            <div className="mt-4 md:mt-3 flex flex-wrap items-center gap-2">
              <button
                  className="border rounded px-3 py-1"
                  disabled={!data || (data as any).first}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </button>
              <span>
              Página {(data as any)?.number + 1 || page + 1} de {(data as any)?.totalPages || 1}
            </span>
              <button
                  className="border rounded px-3 py-1"
                  disabled={!data || (data as any).last}
                  onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
              <select
                  className="border rounded px-2 py-1 ml-auto"
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

          {/* PANEL FORM */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="bg-white border rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-2">{tituloForm}</h2>

                {!editando && !canCrear ? (
                    <div className="text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3">
                      No tienes permiso para crear presentaciones.
                    </div>
                ) : (
                    <form className="space-y-3" onSubmit={onSubmit}>
                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">Producto</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2 mb-2"
                            placeholder="Buscar producto por nombre…"
                            value={prodFiltro}
                            onChange={(e) => setProdFiltro(e.target.value)}
                            disabled={!!editando ? false : !canCrear}
                        />
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.idProducto > 0 ? form.idProducto : 0}
                            onChange={(e) => setForm((f) => ({ ...f, idProducto: Number(e.target.value) }))}
                            disabled={!!editando ? false : !canCrear}
                        >
                          <option value={0} disabled>
                            Selecciona…
                          </option>
                          {productosFiltrados.slice(0, 100).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre}
                              </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-neutral-700 mb-1">Unidad</label>
                          <select
                              className="w-full border rounded-lg px-3 py-2"
                              value={form.idUnidad}
                              onChange={(e) => setForm((f) => ({ ...f, idUnidad: Number(e.target.value) }))}
                              disabled={!canCrear && !editando}
                          >
                            <option value={0} disabled>
                              Selecciona…
                            </option>
                            {unidades.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.nombre}
                                </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-neutral-700 mb-1">Contenido</label>
                          <input
                              type="number"
                              min={0}
                              step="0.000001"
                              className="w-full border rounded-lg px-3 py-2"
                              value={form.contenidoPorUnidad}
                              onChange={(e) =>
                                  setForm((f) => ({ ...f, contenidoPorUnidad: Number(e.target.value) }))
                              }
                              disabled={!canCrear && !editando}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">SKU</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.codigoSku}
                            onChange={(e) => setForm((f) => ({ ...f, codigoSku: e.target.value }))}
                            placeholder="p. ej., GLI-1L"
                            disabled={!canCrear && !editando}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-neutral-700 mb-1">Costo USD</label>
                          <input
                              type="number"
                              step="0.01"
                              min={0}
                              className="w-full border rounded-lg px-3 py-2"
                              value={form.costoBaseUsd ?? 0}
                              onChange={(e) => setForm((f) => ({ ...f, costoBaseUsd: Number(e.target.value) }))}
                              disabled={!canCrear && !editando}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-neutral-700 mb-1">% Margen</label>
                          <input
                              type="number"
                              step="0.01"
                              min={0}
                              className="w-full border rounded-lg px-3 py-2"
                              value={form.margenVentaPorcentaje ?? 0}
                              onChange={(e) =>
                                  setForm((f) => ({ ...f, margenVentaPorcentaje: Number(e.target.value) }))
                              }
                              disabled={!canCrear && !editando}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-neutral-700 mb-1">Precio BOB</label>
                          <input
                              type="number"
                              step="0.01"
                              min={0}
                              className="w-full border rounded-lg px-3 py-2"
                              value={form.precioVentaBob ?? 0}
                              onChange={(e) => setForm((f) => ({ ...f, precioVentaBob: Number(e.target.value) }))}
                              disabled={!canCrear && !editando}
                          />
                        </div>
                      </div>

                      {/* Imagen (dropzone) */}
                      <div>
                        <label className="block text-sm text-neutral-700 mb-1">Imagen</label>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (!canCrear && !editando) return;
                              pickFormFile();
                            }}
                            onKeyDown={(e) => {
                              if (!canCrear && !editando) return;
                              if (e.key === "Enter" || e.key === " ") pickFormFile();
                            }}
                            onDragOver={(e) => {
                              if (!canCrear && !editando) return;
                              onDragOver(e);
                            }}
                            onDragEnter={(e) => {
                              if (!canCrear && !editando) return;
                              onDragOver(e);
                            }}
                            onDragLeave={(e) => {
                              if (!canCrear && !editando) return;
                              onDragLeave(e);
                            }}
                            onDrop={(e) => {
                              if (!canCrear && !editando) return;
                              onDrop(e);
                            }}
                            className={[
                              "rounded-lg border-2 border-dashed p-4 flex items-center gap-4 cursor-pointer transition",
                              !canCrear && !editando
                                  ? "opacity-60 pointer-events-none"
                                  : isDragging
                                      ? "border-emerald-500 bg-emerald-50/40"
                                      : "border-neutral-300 hover:bg-neutral-50",
                            ].join(" ")}
                        >
                          {preview ? (
                              <img src={preview} alt="preview" className="w-16 h-16 object-cover rounded-md border" />
                          ) : (
                              <div className="w-16 h-16 rounded-md border border-dashed border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400">
                                Sin img
                              </div>
                          )}

                          <div className="text-sm text-neutral-700">
                            <div className="font-medium">Arrastra una imagen aquí o haz clic</div>
                            <div className="text-xs text-neutral-500">Formatos: JPG/PNG. Máx: 5MB</div>
                          </div>
                        </div>

                        <input ref={formFileRef} type="file" accept="image/*" className="hidden" onChange={onFormFileChange} />
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                            disabled={editando ? !canEditar : !canCrear}
                        >
                          {textoBoton}
                        </button>
                        {editando ? (
                            <button type="button" className="h-10 px-4 rounded-lg border hover:bg-neutral-50" onClick={resetPanel}>
                              Cancelar
                            </button>
                        ) : null}
                      </div>
                    </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL DE CONFIRMACIÓN */}
        <ConfirmModal
            open={confirmOpen}
            title={confirmCfg?.title ?? ""}
            message={confirmCfg?.message ?? ""}
            kind={confirmCfg?.kind ?? "default"}
            confirmLabel={confirmCfg?.confirmLabel ?? "Confirmar"}
            cancelLabel={confirmCfg?.cancelLabel ?? "Cancelar"}
            loading={confirmLoading}
            onConfirm={() => confirmCfg?.onConfirm?.()}
            onClose={closeConfirm}
        />
      </div>
  );
}
