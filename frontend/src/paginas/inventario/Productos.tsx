import { useEffect, useMemo, useState } from 'react';
import { listarProductos, desactivarProducto } from '@/servicios/producto';
import type { ProductoDTO } from '@/types/producto';
import type { Page } from '@/types/pagination';
import ProductoModal from '@/componentes/ui/ProductoModal';
// ★ importar opciones de categorías
import { opcionesCategoria } from '@/servicios/categoria';

export default function Productos() {
  const [q, setQ] = useState('');
  const [idCategoria, setIdCategoria] = useState<number | undefined>(undefined);
  const [soloActivos, setSoloActivos] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState('nombreProducto,asc');

  const [categorias, setCategorias] = useState<Array<{id:number; nombre:string}>>([]);
  const [data, setData] = useState<Page<ProductoDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<ProductoDTO | undefined>(undefined);

  // ★ carga de categorías (soluciona el warning de setCategorias y llena el combo)
  useEffect(() => {
    opcionesCategoria()
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, []);

  // ★ mapa id→nombre para usar en la tabla
  const catMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categorias) m.set(c.id, c.nombre);
    return m;
  }, [categorias]);

  const params = useMemo(
    () => ({ q, idCategoria, soloActivos, page, size, sort }),
    [q, idCategoria, soloActivos, page, size, sort]
  );

  const refresh = () => {
    setLoading(true);
    setErrorMsg(null);
    listarProductos(params)
      .then(setData)
      .catch((e: any) => setErrorMsg(e?.message || 'Error cargando productos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, [params]);

  const onDesactivar = async (id: number) => {
    if (!confirm('¿Desactivar este producto?')) return;
    try {
      await desactivarProducto(id);
      refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo desactivar');
    }
  };

  const openCreate = () => {
    setSelected(undefined);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (p: ProductoDTO) => {
    setSelected(p);
    setModalMode("edit");
    setModalOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={openCreate}>
          Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          className="border rounded px-3 py-2"
          placeholder="Buscar por nombre, principio activo o registro"
          value={q}
          onChange={(e) => { setPage(0); setQ(e.target.value); }}
        />

        <select
          className="border rounded px-3 py-2"
          value={idCategoria ?? ''}
          onChange={(e) => { setPage(0); setIdCategoria(e.target.value ? Number(e.target.value) : undefined); }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <label className="inline-flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => { setPage(0); setSoloActivos(e.target.checked); }}
          />
          Solo activos
        </label>

        <select
          className="border rounded px-3 py-2"
          value={sort}
          onChange={(e) => { setPage(0); setSort(e.target.value); }}
        >
          <option value="nombreProducto,asc">Nombre (A→Z)</option>
          <option value="nombreProducto,desc">Nombre (Z→A)</option>
          <option value="idProducto,desc">Más recientes</option>
          <option value="idProducto,asc">Más antiguos</option>
        </select>
      </div>

      {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}
      {loading ? <div>Cargando…</div> : (
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Nombre</th>
                <th className="text-left p-2">Principio activo</th>
                <th className="text-left p-2">Registro sanitario</th>
                <th className="text-left p-2">Categoría</th>
                <th className="text-left p-2">Activo</th>
                <th className="text-left p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map(p => (
                <tr key={p.idProducto} className="border-t">
                  <td className="p-2">{p.idProducto}</td>
                  <td className="p-2">{p.nombreProducto}</td>
                  <td className="p-2">{p.principioActivo ?? '—'}</td>
                  <td className="p-2">{p.registroSanitario ?? '—'}</td>
                  {/* ★ nombre de categoría, con fallback al id */}
                  <td className="p-2">{catMap.get(p.idCategoria) ?? p.idCategoria}</td>
                  <td className="p-2">{p.estadoActivo ? 'Sí' : 'No'}</td>
                  <td className="p-2">
                    <button className="border rounded px-2 py-1 mr-2" onClick={() => openEdit(p)}>
                      Editar
                    </button>
                    <button className="border rounded px-2 py-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => onDesactivar(p.idProducto)}>
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.content?.length && (
                <tr><td className="p-4 text-center" colSpan={7}>Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div className="flex items-center gap-2">
        <button className="border rounded px-3 py-1" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
          Anterior
        </button>
        <span>Página {data ? data.number + 1 : page + 1} de {data ? data.totalPages : 1}</span>
        <button className="border rounded px-3 py-1" disabled={!data || data.last} onClick={() => setPage(p => p + 1)}>
          Siguiente
        </button>
        <select className="border rounded px-2 py-1 ml-auto" value={size} onChange={(e) => { setPage(0); setSize(Number(e.target.value)); }}>
          {[10, 20, 50].map(n => <option key={n} value={n}>{n} por página</option>)}
        </select>
      </div>

      <ProductoModal
        open={modalOpen}
        mode={modalMode}
        producto={selected}
        onClose={() => setModalOpen(false)}
        onSaved={() => refresh()}
      />
    </div>
  );
}
