import { useEffect, useMemo, useState } from "react";
import { categoriaService } from "@/servicios/categoria";
import type { Categoria, CategoriaCrearDTO } from "@/types/categoria";
import { Paginacion } from "@/componentes/Paginacion";
import CategoriaModal from "@/componentes/ui/CategoriaModal";
import { Pencil, Trash2 } from "lucide-react"; // ← íconos
import { ApiError } from "@/servicios/httpClient";

export default function Categorias() {
  // filtros
  const [q, setQ] = useState("");
  const [soloRaices, setSoloRaices] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // datos
  const [rows, setRows] = useState<Categoria[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.ceil(total / size), [total, size]);
  const [loading, setLoading] = useState(false);
  // ↓ NUEVO: opciones simples para mapear id → nombre
  const [catOpts, setCatOpts] = useState<Array<{ id: number; nombre: string }>>([]);


  // modales
  const [showNew, setShowNew] = useState(false);
  const [editRow, setEditRow] = useState<Categoria | null>(null);

  // carga
  const cargar = async () => {
    setLoading(true);
    try {
      const res = await categoriaService.list({
        q: q || undefined,
        soloRaices: soloRaices || undefined,
        page,
        size,
        sort: "nombreCategoria,asc",
      });
      setRows(res.content);
      setTotal(res.totalElements);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [q, soloRaices, page, size]);

  // ↓ NUEVO: carga de opciones {id, nombre} para mostrar el nombre del padre
  const cargarOpciones = async () => {
    try {
      const opts = await categoriaService.options({});
      setCatOpts(opts);
    } catch {
      setCatOpts([]);
    }
  };
  useEffect(() => { cargarOpciones(); }, []);

  // ↓ NUEVO: mapa para resolver rápido el nombre del padre
  const parentNameMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const o of catOpts) m.set(o.id, o.nombre);
    return m;
  }, [catOpts]);


  // acciones CRUD
  const onCrear = async (payload: CategoriaCrearDTO) => {
    await categoriaService.create(payload);
    setPage(0);
    await cargar();
    await cargarOpciones();
  };

  const onEditar = async (id: number, payload: CategoriaCrearDTO) => {
    await categoriaService.update(id, payload);
    await cargar();
    await cargarOpciones();
  };

  const onEliminar = async (id: number) => {
    if (!confirm("¿Eliminar esta categoría?")) return;

    try {
      await categoriaService.remove(id);
      await cargar();
      await cargarOpciones();
    } catch (e: any) {
      // Intenta usar el mensaje del backend; si no, mapea por código
      let msg = "No se pudo eliminar la categoría.";

      if (e instanceof ApiError) {
        // Si tu backend devuelve 409/400 para integridad referencial:
        if (e.status === 409 || e.status === 500) {
          msg =
            "No se puede eliminar la categoría porque tiene productos asociados.";
        } else if (typeof e.details === "string") {
          // A veces tu httpClient trae el body como texto
          const t = e.details.toLowerCase();
          if (t.includes("llave foránea") || t.includes("foreign key") || t.includes("23503")) {
            msg =
              "No se puede eliminar la categoría porque tiene productos asociados.";
          } else {
            msg = e.details;
          }
        } else if (typeof e.message === "string" && e.message.trim()) {
          msg = e.message;
        }
      }

      alert(msg);
    }
  };

  // helper para mostrar el padre
  // antes: const textoPadre = (c: Categoria) => (c.idCategoriaPadre ?? "—");
  const textoPadre = (c: Categoria) => {
    const idPadre = c.idCategoriaPadre;
    if (!idPadre) return "—";
    return parentNameMap.get(idPadre) ?? String(idPadre); // fallback al id si no está en el mapa
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Categorías</h1>

      {/* Filtros / acciones */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-neutral-600 mb-1">Buscar</label>
            <input
              value={q}
              onChange={(e) => { setPage(0); setQ(e.target.value); }}
              placeholder="Nombre o descripción…"
              className="border rounded-lg px-3 py-2 w-full sm:w-72"
            />

          </div>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-700 mb-1 sm:mb-0">
            <input
              type="checkbox"
              className="accent-emerald-600"
              checked={soloRaices}
              onChange={(e) => { setPage(0); setSoloRaices(e.target.checked); }}
            />
            Solo raíces (sin padre)
          </label>
        </div>

        <button
          className="h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setShowNew(true)}
        >
          + Nueva categoría
        </button>
      </div>

      {/* Encabezado solo en md+ */}
      <div className="hidden md:grid md:grid-cols-[1.2fr_0.6fr_1.8fr_120px] items-center text-xs uppercase text-neutral-500 px-3">
        <div>Nombre</div>
        <div>Padre</div>
        <div>Descripción</div>
        <div className="text-right pr-1">Acciones</div>
      </div>


      {/* Filas tipo card, sin tabla */}
      <div className="mt-2 space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">Cargando…</div>
        ) : rows.length ? (
          rows.map((c) => (
            <div
              key={c.idCategoria}
              // En móvil: 1 columna (card). En md+: 4 columnas (tabla).
              className="
      grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1.8fr_120px]
      items-center gap-2 bg-white rounded-xl p-3 shadow-sm
      hover:shadow-md transition
    "
            >
              {/* Columna 1: Nombre (siempre) */}
              <div className="min-w-0">
                <div className="font-semibold text-neutral-800 truncate">
                  {c.nombreCategoria}
                </div>

                {/* Subtítulo en móvil: Padre · Descripción */}
                <div className="mt-1 text-[13px] text-neutral-600 md:hidden break-words">
                  <span className="font-medium text-neutral-700">Padre:</span>{" "}
                  {textoPadre(c)}{" "}<span className="mx-1">·</span>{" "}
                  <span className="font-medium text-neutral-700">Desc:</span>{" "}
                  {c.descripcion || "—"}
                </div>
              </div>

              {/* Columna 2 (md+): Padre */}
              <div className="hidden md:block truncate">{textoPadre(c)}</div>

              {/* Columna 3 (md+): Descripción */}
              <div className="hidden md:block truncate">{c.descripcion || "—"}</div>

              {/* Columna 4: Acciones */}
              <div className="flex items-center md:justify-end gap-1 mt-2 md:mt-0">
                <button
                  aria-label="Editar"
                  title="Editar"
                  onClick={() => setEditRow(c)}
                  className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                >
                  <Pencil size={18} />
                </button>
                <button
                  aria-label="Eliminar"
                  title="Eliminar"
                  onClick={() => onEliminar(c.idCategoria)}
                  className="p-2 rounded-md hover:bg-neutral-100 text-rose-600 hover:text-rose-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))

        ) : (
          <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">
            Sin registros
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4">
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

      {/* Crear */}
      <CategoriaModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSubmit={onCrear}
        title="Nueva categoría"
      />

      {/* Editar */}
      <CategoriaModal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title="Editar categoría"
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
          setEditRow(null);
        }}
      />
    </div>
  );
}
