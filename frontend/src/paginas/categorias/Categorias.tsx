import { useEffect, useMemo, useState } from "react";
import { categoriaService } from "@/servicios/categoria";
import type { Categoria, CategoriaCrearDTO } from "@/types/categoria";
// 👇 usa la ruta correcta y el tipo de export real de tu componente
import { Paginacion } from "@/componentes/Paginacion";
import CategoriaModal from "@/componentes/ui/CategoriaModal";


export default function Categorias() {
  const [q, setQ] = useState("");
  const [soloRaices, setSoloRaices] = useState(false);     // ← NUEVO filtro
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [rows, setRows] = useState<Categoria[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.ceil(total / size), [total, size]);
  const [loading, setLoading] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [editRow, setEditRow] = useState<Categoria | null>(null);

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

 useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, soloRaices, page, size]);
  
const onCrear = async (payload: CategoriaCrearDTO) => {
  await categoriaService.create(payload);
  setPage(0);
  await cargar();
};

const onEditar = async (id: number, payload: CategoriaCrearDTO) => {
  await categoriaService.update(id, payload);
  await cargar();
};

const onEliminar = async (id: number) => {
  if (!confirm("¿Eliminar esta categoría?")) return;
  await categoriaService.remove(id);
  await cargar();
};

  return (
    <div className="p-4">
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm text-gray-600">Buscar</div>
            <input
              value={q}
              onChange={(e) => { setPage(0); setQ(e.target.value); }}
              placeholder="Nombre o descripción…"
              className="border rounded px-3 py-2 w-72"
            />
          </div>
          <label className="inline-flex items-center gap-2 mt-5">
            <input
              type="checkbox"
              checked={soloRaices}
              onChange={(e) => { setPage(0); setSoloRaices(e.target.checked); }}
            />
            Solo raíces (sin padre)
          </label>
        </div>

        <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={() => setShowNew(true)}>
          + Nueva categoría
        </button>
      </div>

      <table className="min-w-[820px] border rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 w-[280px]">Nombre</th>
            <th className="text-left p-2">Padre</th>
            <th className="text-left p-2">Descripción</th>
            <th className="text-left p-2 w-[160px]">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.idCategoria} className="border-t">
              <td className="p-2 font-medium">{c.nombreCategoria}</td>
              <td className="p-2">{c.idCategoriaPadre ?? "—"}</td>
              <td className="p-2">{c.descripcion || "—"}</td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <button className="text-blue-600" onClick={() => setEditRow(c)}>Editar</button>
                  <button className="text-red-600" onClick={() => onEliminar(c.idCategoria)}>Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="p-4 text-center" colSpan={4}>Sin resultados</td></tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="mt-3">
          <Paginacion
            // usa la firma de props de TU componente Paginacion
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
          editRow ? {
            nombreCategoria: editRow.nombreCategoria,
            descripcion: editRow.descripcion ?? "",
            idCategoriaPadre: editRow.idCategoriaPadre ?? null,
          } : undefined
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
