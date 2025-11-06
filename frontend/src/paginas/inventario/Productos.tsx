import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  listarProductos,
  desactivarProducto,   // PATCH /{id}/desactivar (soft off)
  updateProducto,      // PUT /{id}  { estadoActivo: true } (activar)
  eliminarProducto,    // DELETE /{id} (hard delete)
} from "@/servicios/producto";
import type { ProductoDTO } from "@/types/producto";
import type { Page } from "@/types/pagination";
import ProductoModal from "@/componentes/ui/ProductoModal";
import { opcionesCategoria } from "@/servicios/categoria";

import { Pencil, Trash2, Check, X } from "lucide-react";
import { presentacionService } from "@/servicios/presentacion";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/servicios/httpClient";

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

/* ========= Modal de confirmación compacto ========= */
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

export default function Productos() {
  const { can } = useAuth() as { can: (perm: string) => boolean };

  // permisos
  const canVer = useMemo(() => can("productos:ver"), [can]);
  const canCrear = useMemo(() => can("productos:crear"), [can]);
  const canEditar = useMemo(() => can("productos:actualizar"), [can]);
  const canEliminar = useMemo(() => can("productos:eliminar"), [can]);

  const show403 = (msg = "No tienes permiso para realizar esta acción.") => {
    window.dispatchEvent(new CustomEvent("auth:forbidden", { detail: { source: "ProductosPage", message: msg } }));
  };

  // filtros
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [idCategoria, setIdCategoria] = useState<number | undefined>(undefined);
  const [soloActivos, setSoloActivos] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState("nombreProducto,asc");

  // catálogos
  const [categorias, setCategorias] = useState<Array<{ id: number; nombre: string }>>([]);

  // data
  const [data, setData] = useState<Page<ProductoDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // modal producto
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<ProductoDTO | undefined>(undefined);

  // modal confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"eliminar" | "desactivar">("eliminar");
  const [confirmProd, setConfirmProd] = useState<ProductoDTO | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // conteo de presentaciones
  const [presCount, setPresCount] = useState<Record<number, number | null>>({});

  // cargar categorías
  useEffect(() => {
    opcionesCategoria().then(setCategorias).catch(() => setCategorias([]));
  }, []);

  // debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // map id→nombre
  const catMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categorias) m.set(c.id, c.nombre);
    return m;
  }, [categorias]);

  // params
  const params = useMemo(
      () => ({ q: debouncedQ, idCategoria, soloActivos, page, size, sort }),
      [debouncedQ, idCategoria, soloActivos, page, size, sort]
  );

  // cargar lista
  const refresh = () => {
    if (!canVer) {
      show403("No tienes permiso para ver productos.");
      setErrorMsg("Acceso denegado.");
      setData(null);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    listarProductos(params)
        .then(setData)
        .catch((e: any) => {
          if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
            show403("No tienes permiso para ver productos.");
            setErrorMsg("Acceso denegado.");
            setData(null);
          } else {
            setErrorMsg(e?.message || "Error cargando productos");
          }
        })
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, canVer]);

  // cargar conteo de presentaciones
  useEffect(() => {
    const items = data?.content ?? [];
    if (!items.length) {
      setPresCount({});
      return;
    }
    setPresCount((prev) => {
      const next = { ...prev };
      for (const p of items) next[p.idProducto] = prev[p.idProducto] ?? null;
      return next;
    });
    let cancelled = false;
    Promise.all(
        items.map((p) =>
            presentacionService
                .list({ idProducto: p.idProducto, page: 0, size: 1 })
                .then((r) => [p.idProducto, r.totalElements as number] as const)
                .catch(() => [p.idProducto, 0] as const)
        )
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<number, number | null> = {};
      for (const [idProd, count] of entries) next[idProd] = count;
      setPresCount(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.content?.map((p) => p.idProducto).join(",")]);

  // confirm helpers
  const askEliminar = (p: ProductoDTO) => {
    if (!canEliminar) return show403();
    setConfirmKind("eliminar");
    setConfirmProd(p);
    setConfirmOpen(true);
  };
  const askDesactivar = (p: ProductoDTO) => {
    if (!canEditar) return show403();
    setConfirmKind("desactivar");
    setConfirmProd(p);
    setConfirmOpen(true);
  };

  const doConfirm = async () => {
    const p = confirmProd!;
    setConfirmBusy(true);
    try {
      if (confirmKind === "eliminar") {
        await eliminarProducto(p.idProducto);
      } else {
        await desactivarProducto(p.idProducto);
      }
      setConfirmOpen(false);
      setConfirmProd(null);
      refresh();
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        show403();
        setConfirmOpen(false);
        setConfirmProd(null);
      } else if ((e instanceof ApiError && e.status === 409) || e?.status === 409) {
        alert("No se puede eliminar el producto porque tiene presentaciones.");
      } else {
        alert(e?.message ?? "Operación no realizada.");
      }
    } finally {
      setConfirmBusy(false);
    }
  };

  // activar
  const onActivar = async (p: ProductoDTO) => {
    if (!canEditar) return show403();
    try {
      await updateProducto(p.idProducto, { estadoActivo: true });
      refresh();
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        show403();
        setModalOpen(false);
      } else {
        alert(e?.message ?? "No se pudo activar el producto.");
      }
    }
  };

  // abrir modales de edición/creación
  const openCreate = () => {
    if (!canCrear) return show403();
    setSelected(undefined);
    setModalMode("create");
    setModalOpen(true);
  };
  const openEdit = (p: ProductoDTO) => {
    if (!canEditar) return show403();
    setSelected(p);
    setModalMode("edit");
    setModalOpen(true);
  };

  const catName = (id: number) => catMap.get(id) ?? id;

  // autocerrar modal edición si cambian permisos
  useEffect(() => {
    if (!modalOpen) return;
    if (!canVer) return setModalOpen(false);
    const need = modalMode === "create" ? canCrear : canEditar;
    if (!need) {
      setModalOpen(false);
      show403(modalMode === "create" ? "Perdiste el permiso para crear productos." : "Perdiste el permiso para actualizar productos.");
    }
  }, [canVer, canCrear, canEditar, modalMode, modalOpen]);

  // autocerrar confirm si cambian permisos
  useEffect(() => {
    if (!confirmOpen || !confirmProd) return;
    if (confirmKind === "eliminar" && !canEliminar) {
      setConfirmOpen(false);
      setConfirmProd(null);
      show403();
    }
    if (confirmKind === "desactivar" && !canEditar) {
      setConfirmOpen(false);
      setConfirmProd(null);
      show403();
    }
  }, [confirmOpen, confirmKind, confirmProd, canEliminar, canEditar]);

  if (!canVer) {
    return (
        <div className="p-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            No tienes permiso para ver productos.
          </div>
        </div>
    );
  }

  // badges
  const badgeGreen =
      "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-[2px] text-[12px] font-medium";
  const badgeLoading =
      "inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500 px-2 py-[2px] text-[12px] font-medium";

  return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Productos</h1>
          {canCrear && (
              <button
                  className="px-4 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  onClick={openCreate}
                  disabled={loading}
              >
                Nuevo producto
              </button>
          )}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input
              className="border rounded-lg px-3 py-2"
              placeholder="Buscar por nombre, principio activo o registro"
              value={q}
              onChange={(e) => setQ(e.target.value)}
          />

          <select
              className="border rounded-lg px-3 py-2"
              value={idCategoria ?? ""}
              onChange={(e) => {
                setPage(0);
                setIdCategoria(e.target.value ? Number(e.target.value) : undefined);
              }}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 px-1 text-sm text-neutral-700">
            <input
                type="checkbox"
                className="accent-emerald-600"
                checked={soloActivos}
                onChange={(e) => {
                  setPage(0);
                  setSoloActivos(e.target.checked);
                }}
            />
            Solo activos
          </label>

          <select
              className="border rounded-lg px-3 py-2"
              value={sort}
              onChange={(e) => {
                setPage(0);
                setSort(e.target.value);
              }}
          >
            <option value="nombreProducto,asc">Nombre (A→Z)</option>
            <option value="nombreProducto,desc">Nombre (Z→A)</option>
            <option value="idProducto,desc">Más recientes</option>
            <option value="idProducto,asc">Más antiguos</option>
          </select>
        </div>

        {errorMsg && (
            <div className="text-red-600 text-sm mb-2 border border-red-200 bg-red-50 rounded px-3 py-2">
              {errorMsg}
            </div>
        )}

        {loading ? (
            <div>Cargando…</div>
        ) : (
            <div className="space-y-3">
              {/* Encabezado md+ */}
              <div className="hidden md:grid w-full grid-cols-[1.2fr_1fr_0.9fr_0.6fr_0.6fr_150px] items-center text-xs uppercase text-neutral-500 px-3">
                <div>Nombre</div>
                <div>Principio activo</div>
                <div>Registro</div>
                <div>Categoría</div>
                <div className="text-center">Pres.</div>
                <div className="text-right pr-1">Acciones</div>
              </div>

              {/* Tarjetas */}
              {data?.content?.length ? (
                  data.content.map((p) => {
                    const count = presCount[p.idProducto];
                    const tienePres = (count ?? 0) > 0;

                    return (
                        <div
                            key={p.idProducto}
                            className={
                                "grid grid-cols-1 md:grid-cols-[1.2fr_1fr_0.9fr_0.6fr_0.6fr_150px] " +
                                "items-center gap-2 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition " +
                                (!p.estadoActivo ? "opacity-60" : "")
                            }
                        >
                          {/* Nombre */}
                          <div className="min-w-0">
                            <div className="font-semibold text-neutral-800 truncate">
                              {p.nombreProducto}
                              <span className={`md:hidden ml-2 align-middle ${count == null ? badgeLoading : badgeGreen}`}>
                        {count == null ? "…" : `${count} pres.`}
                      </span>
                            </div>
                            <div className="mt-1 text-[13px] text-neutral-600 md:hidden break-words">
                              <span className="font-medium text-neutral-700">Prin:</span> {p.principioActivo ?? "—"}
                              <span className="mx-1">·</span>
                              <span className="font-medium text-neutral-700">Reg:</span> {p.registroSanitario ?? "—"}
                              <span className="mx-1">·</span>
                              <span className="font-medium text-neutral-700">Cat:</span> {catName(p.idCategoria)}
                            </div>
                          </div>

                          {/* md+ cols */}
                          <div className="hidden md:block truncate">{p.principioActivo ?? "—"}</div>
                          <div className="hidden md:block truncate">{p.registroSanitario ?? "—"}</div>
                          <div className="hidden md:block truncate">{catName(p.idCategoria)}</div>

                          {/* Pres count */}
                          <div className="hidden md:flex justify-center">
                            <span className={count == null ? badgeLoading : badgeGreen}>{count == null ? "…" : count}</span>
                          </div>

                          {/* Acciones: toggle + (trash si corresponde) + editar */}
                          <div className="flex items-center md:justify-end gap-1.5 mt-2 md:mt-0">
                            {/* Toggle activar/desactivar (no elimina) */}
                            <ActiveToggleMini
                                value={!!p.estadoActivo}
                                title={p.estadoActivo ? "Desactivar (no elimina)" : "Activar"}
                                disabled={!canEditar} // ambos requieren actualizar
                                onToggle={(next) => {
                                  if (next) onActivar(p);
                                  else askDesactivar(p);
                                }}
                            />

                            {/* Eliminar permanente: solo si está ACTIVO y SIN presentaciones */}
                            {p.estadoActivo && !tienePres && canEliminar && (
                                <button
                                    aria-label="Eliminar permanentemente"
                                    title="Eliminar permanentemente"
                                    onClick={() => askEliminar(p)}
                                    className="p-1.5 rounded-md hover:bg-neutral-100 text-rose-600 hover:text-rose-700"
                                >
                                  <Trash2 size={18} />
                                </button>
                            )}

                            {/* Editar */}
                            {canEditar && (
                                <button
                                    aria-label="Editar"
                                    title="Editar"
                                    onClick={() => openEdit(p)}
                                    className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                                >
                                  <Pencil size={18} />
                                </button>
                            )}
                          </div>
                        </div>
                    );
                  })
              ) : (
                  <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">Sin resultados</div>
              )}
            </div>
        )}

        {/* Paginación */}
        <div className="mt-4 md:mt-3 flex flex-wrap items-center gap-2">
          <button className="border rounded px-3 py-1" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Anterior
          </button>
          <span>
          Página {data ? data.number + 1 : page + 1} de {data ? data.totalPages : 1}
        </span>
          <button className="border rounded px-3 py-1" disabled={!data || data.last} onClick={() => setPage((p) => p + 1)}>
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

        {/* Modal Producto */}
        {((modalMode === "create" && canCrear) || (modalMode === "edit" && canEditar)) && (
            <ProductoModal open={modalOpen} mode={modalMode} producto={selected} onClose={() => setModalOpen(false)} onSaved={() => refresh()} />
        )}

        {/* Modal Confirm */}
        <ConfirmModal
            open={confirmOpen && !!confirmProd}
            title={confirmKind === "eliminar" ? "Eliminar producto" : "Desactivar producto"}
            message={
              confirmKind === "eliminar" ? (
                  <>
                    ¿Eliminar <b>{confirmProd?.nombreProducto}</b> <u>permanentemente</u>?<br />
                    <span className="text-neutral-600">Esta acción no se puede deshacer.</span>
                  </>
              ) : (
                  <>
                    ¿Desactivar <b>{confirmProd?.nombreProducto}</b>?<br />
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
              setConfirmProd(null);
            }}
        />
      </div>
  );
}
