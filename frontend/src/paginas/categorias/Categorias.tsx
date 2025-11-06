import { useEffect, useMemo, useState, type ReactNode } from "react";
import { categoriaService } from "@/servicios/categoria";
import type { Categoria, CategoriaCrearDTO } from "@/types/categoria";
import { Paginacion } from "@/componentes/Paginacion";
import CategoriaModal from "@/componentes/ui/CategoriaModal";
import { Pencil, Trash2, X } from "lucide-react";
import { ApiError } from "@/servicios/httpClient";
import { useAuth } from "@/context/AuthContext";

/* ========= Botón de acción con icono (igual estilo que en Clientes/Product) ========= */
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

/* ========= Modal de confirmación bonito (mismo patrón que Clientes) ========= */
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

export default function Categorias() {
  const { can } = useAuth() as { can: (perm: string) => boolean };

  // ===== permisos =====
  const canVer = useMemo(() => can("categorias:ver"), [can]);
  const canCrear = useMemo(() => can("categorias:crear"), [can]);
  const canEditar = useMemo(() => can("categorias:actualizar"), [can]);
  const canEliminar = useMemo(() => can("categorias:eliminar"), [can]);

  // modal global de acceso denegado
  const show403 = (msg = "No tienes permiso para realizar esta acción.") => {
    window.dispatchEvent(
        new CustomEvent("auth:forbidden", {
          detail: { source: "CategoriasPage", message: msg },
        }),
    );
  };

  // filtros
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [soloRaices, setSoloRaices] = useState(false);

  // paginación
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // datos
  const [rows, setRows] = useState<Categoria[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(
      () => Math.ceil((total || 0) / (size || 20)) || 1,
      [total, size],
  );

  // estado UI
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // opciones padre
  const [catOpts, setCatOpts] = useState<Array<{ id: number; nombre: string }>>(
      [],
  );

  // modales crear / editar
  const [showNew, setShowNew] = useState(false);
  const [editRow, setEditRow] = useState<Categoria | null>(null);

  // modal confirmar eliminar
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmRow, setConfirmRow] = useState<Categoria | null>(null);

  // debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // cargar lista
  const cargar = async () => {
    if (!canVer) {
      show403("No tienes permiso para ver categorías.");
      setErr("Acceso denegado.");
      setRows([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await categoriaService.list({
        q: debouncedQ || undefined,
        soloRaices: soloRaices || undefined,
        page,
        size,
        sort: "nombreCategoria,asc",
      });

      setRows(res.content ?? []);
      setTotal(res.totalElements ?? res.content?.length ?? 0);
    } catch (e: any) {
      if (e?.status === 403) {
        show403("No tienes permiso para ver categorías.");
        setErr("Acceso denegado.");
      } else {
        setErr(e?.message ?? "Error al listar categorías");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, soloRaices, page, size, canVer]);

  // cargar opciones padre
  const cargarOpciones = async () => {
    try {
      const opts = await categoriaService.options({});
      setCatOpts(opts ?? []);
    } catch {
      setCatOpts([]);
    }
  };
  useEffect(() => {
    cargarOpciones();
  }, []);

  const parentNameMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const o of catOpts) m.set(o.id, o.nombre);
    return m;
  }, [catOpts]);

  // ===== Helpers =====
  const textoPadre = (c: Categoria) => {
    const idPadre = c.idCategoriaPadre;
    if (!idPadre) return "—";
    return parentNameMap.get(idPadre) ?? String(idPadre);
  };

  // ===== Crear =====
  const onCrear = async (payload: CategoriaCrearDTO) => {
    if (!canCrear) {
      show403();
      return;
    }
    try {
      setLoading(true);
      setErr(null);
      await categoriaService.create(payload);
      setShowNew(false);
      setPage(0);
      await Promise.all([cargar(), cargarOpciones()]);
    } catch (e: any) {
      if (e?.status === 403) {
        show403();
        return;
      }
      setErr(e?.message ?? "No se pudo crear la categoría.");
    } finally {
      setLoading(false);
    }
  };

  // ===== Editar =====
  const onEditar = async (id: number, payload: CategoriaCrearDTO) => {
    if (!canEditar) {
      show403();
      return;
    }
    try {
      setLoading(true);
      setErr(null);
      await categoriaService.update(id, payload);
      setEditRow(null);
      await Promise.all([cargar(), cargarOpciones()]);
    } catch (e: any) {
      if (e?.status === 403) {
        show403();
        return;
      }
      setErr(e?.message ?? "No se pudo actualizar la categoría.");
    } finally {
      setLoading(false);
    }
  };

  // ===== Eliminar (ConfirmModal bonito) =====
  function askEliminar(row: Categoria) {
    if (!canEliminar) {
      show403();
      return;
    }
    setConfirmRow(row);
    setConfirmOpen(true);
  }

  async function doEliminar() {
    const row = confirmRow!;
    setConfirmBusy(true);
    try {
      setLoading(true);
      setErr(null);

      await categoriaService.remove(row.idCategoria);

      setConfirmOpen(false);
      setConfirmRow(null);

      await Promise.all([cargar(), cargarOpciones()]);
    } catch (e: any) {
      // Perdida de permiso
      if (e instanceof ApiError && e.status === 403) {
        show403();
        setConfirmOpen(false);
        setConfirmRow(null);
        setLoading(false);
        setConfirmBusy(false);
        return;
      }

      // Mensaje más amigable como en tu código original
      let msg = "No se pudo eliminar la categoría.";
      if (e instanceof ApiError) {
        if (e.status === 409 || e.status === 500) {
          msg =
              "No se puede eliminar la categoría porque tiene productos o subcategorías asociadas.";
        } else if (typeof e.details === "string") {
          const t = e.details.toLowerCase();
          if (
              t.includes("llave foránea") ||
              t.includes("foreign key") ||
              t.includes("23503")
          ) {
            msg =
                "No se puede eliminar la categoría porque tiene productos o subcategorías asociadas.";
          } else {
            msg = e.details;
          }
        } else if (typeof e.message === "string" && e.message.trim()) {
          msg = e.message;
        }
      }

      // ahora mostramos el error arriba (no usamos alert)
      setErr(msg);

      setConfirmOpen(false);
      setConfirmRow(null);
    } finally {
      setLoading(false);
      setConfirmBusy(false);
    }
  }

  // autocerrar confirm si pierde permisos mientras el modal está abierto
  useEffect(() => {
    if (!confirmOpen || !confirmRow) return;
    if (!canEliminar) {
      setConfirmOpen(false);
      setConfirmRow(null);
      show403();
    }
  }, [confirmOpen, confirmRow, canEliminar]);

  // ===== Restricción visual si no puede ver =====
  if (!canVer) {
    return (
        <div className="p-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            No tienes permiso para ver categorías.
          </div>
        </div>
    );
  }

  return (
      <div className="p-6 space-y-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <h1 className="text-xl font-semibold text-neutral-800">Categorías</h1>

          <div className="md:ml-auto flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-end">
            {/* Buscar */}
            <div className="flex flex-col">
              <label className="text-[13px] text-neutral-600 mb-1">Buscar</label>
              <div className="relative">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nombre o descripción…"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-72 pr-8 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-[11px]">
                ⌘K
              </span>
              </div>
            </div>

            {/* Solo raíces */}
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
              <input
                  type="checkbox"
                  className="accent-emerald-600"
                  checked={soloRaices}
                  onChange={(e) => {
                    setSoloRaices(e.target.checked);
                    setPage(0);
                  }}
              />
              Solo raíces
            </label>

            {/* Nueva categoría */}
            {canCrear && (
                <button
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm shadow-sm disabled:opacity-50"
                    onClick={() => setShowNew(true)}
                    disabled={loading}
                >
                  + Nueva categoría
                </button>
            )}
          </div>
        </div>

        {/* Estado global */}
        {loading && <div>Cargando…</div>}

        {err && (
            <div className="text-red-600 whitespace-pre-wrap border border-red-200 bg-red-50 rounded px-3 py-2 text-sm">
              {err}
            </div>
        )}

        {/* Encabezado tabla desktop */}
        <div className="hidden md:grid md:grid-cols-[1.2fr_0.6fr_1.8fr_130px] items-center text-xs uppercase text-neutral-500 px-3">
          <div>Nombre</div>
          <div>Padre</div>
          <div>Descripción</div>
          <div className="text-right pr-1">Acciones</div>
        </div>

        {/* Lista */}
        <div className="mt-2 space-y-3">
          {!loading && !rows.length ? (
              <div className="text-center text-neutral-500 py-10 bg-white rounded-xl border border-neutral-200/60 text-sm">
                Sin registros
              </div>
          ) : null}

          {rows.map((c) => (
              <div
                  key={c.idCategoria}
                  className="grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1.8fr_130px] items-start gap-2 bg-white rounded-xl p-3 border border-neutral-200/60 shadow-sm hover:shadow-md transition"
              >
                {/* Nombre + resumen mobile */}
                <div className="min-w-0">
                  <div
                      className="font-semibold text-neutral-800 truncate"
                      title={c.nombreCategoria}
                  >
                    {c.nombreCategoria}
                  </div>

                  {/* Mobile extra info */}
                  <div className="mt-1 text-[13px] text-neutral-600 md:hidden break-words">
                    <span className="font-medium text-neutral-700">Padre:</span>{" "}
                    {textoPadre(c)}{" "}
                    <span className="mx-1">·</span>
                    <span className="font-medium text-neutral-700">Desc:</span>{" "}
                    {c.descripcion || "—"}
                  </div>
                </div>

                {/* Padre (md+) */}
                <div className="hidden md:block truncate text-sm text-neutral-800">
                  {textoPadre(c)}
                </div>

                {/* Descripción (md+) */}
                <div className="hidden md:block truncate text-sm text-neutral-700">
                  {c.descripcion || "—"}
                </div>

                {/* Acciones */}
                <div className="flex flex-row flex-wrap gap-1.5 text-sm md:justify-end md:items-start mt-2 md:mt-0">
                  {canEditar && (
                      <IconBtn
                          title="Editar"
                          onClick={() => setEditRow(c)}
                      >
                        <Pencil size={18} className="text-neutral-700" />
                      </IconBtn>
                  )}

                  {canEliminar && (
                      <IconBtn
                          title="Eliminar"
                          onClick={() => askEliminar(c)}
                      >
                        <Trash2 size={18} className="text-rose-600" />
                      </IconBtn>
                  )}
                </div>
              </div>
          ))}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
            <div className="mt-2">
              <Paginacion
                  page={page}
                  totalPages={totalPages}
                  totalElements={total}
                  size={size}
                  setPage={setPage}
                  setSize={setSize}
                  loading={loading}
                  isFirst={page === 0}
                  isLast={page + 1 >= totalPages}
              />
            </div>
        )}

        {/* MODAL CREAR */}
        {canCrear && (
            <CategoriaModal
                open={showNew}
                title="Nueva categoría"
                onClose={() => setShowNew(false)}
                onSubmit={onCrear}
            />
        )}

        {/* MODAL EDITAR */}
        {canEditar && (
            <CategoriaModal
                open={!!editRow}
                title="Editar categoría"
                onClose={() => setEditRow(null)}
                initial={
                  editRow
                      ? {
                        nombreCategoria: editRow.nombreCategoria,
                        descripcion: editRow.descripcion ?? "",
                        idCategoriaPadre: editRow.idCategoriaPadre ?? null,
                      }
                      : undefined
                }
                excludeIdAsParent={editRow?.idCategoria ?? null}
                onSubmit={async (payload) => {
                  if (!editRow) return;
                  await onEditar(editRow.idCategoria, payload);
                }}
            />
        )}

        {/* MODAL CONFIRM ELIMINAR */}
        <ConfirmModal
            open={confirmOpen && !!confirmRow}
            title="Eliminar categoría"
            message={
              <>
                ¿Eliminar la categoría{" "}
                <b>{confirmRow?.nombreCategoria}</b> de forma permanente?
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
