// REEMPLAZA COMPLETO el contenido de src/paginas/inventario/Productos.tsx por esto:

import { useEffect, useMemo, useState } from "react";
import {
  listarProductos,
  desactivarProducto,
  updateProducto, // 👈 para activar
} from "@/servicios/producto";
import type { ProductoDTO } from "@/types/producto";
import type { Page } from "@/types/pagination";
import ProductoModal from "@/componentes/ui/ProductoModal";
import { opcionesCategoria } from "@/servicios/categoria";

// Íconos igual que en Presentaciones:
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { presentacionService } from "@/servicios/presentacion";

export default function Productos() {
  // filtros
  const [q, setQ] = useState("");
  const [idCategoria, setIdCategoria] = useState<number | undefined>(undefined);
  const [soloActivos, setSoloActivos] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState("nombreProducto,asc");

  const [categorias, setCategorias] = useState<Array<{ id: number; nombre: string }>>([]);
  const [data, setData] = useState<Page<ProductoDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<ProductoDTO | undefined>(undefined);

  // cargar categorías
  useEffect(() => {
    opcionesCategoria()
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    // si aún no hay data
    if (!data?.content?.length) {
      setHasPres({});
      return;
    }

    // pedimos para cada producto si tiene al menos 1 presentación
    Promise.all(
      data.content.map(p =>
        presentacionService
          .list({ idProducto: p.idProducto, page: 0, size: 1 })  // puedes añadir soloActivos: true si solo te importa activas
          .then(r => [p.idProducto, r.totalElements > 0] as const)
          .catch(() => [p.idProducto, false] as const)
      )
    ).then(entries => {
      setHasPres(Object.fromEntries(entries));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.content?.map(p => p.idProducto).join(",")]);


  // mapa id→nombre para mostrar en tarjetas
  const catMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categorias) m.set(c.id, c.nombre);
    return m;
  }, [categorias]);

  const params = useMemo(
    () => ({ q, idCategoria, soloActivos, page, size, sort }),
    [q, idCategoria, soloActivos, page, size, sort]
  );

  const [hasPres, setHasPres] = useState<Record<number, boolean>>({});


  const refresh = () => {
    setLoading(true);
    setErrorMsg(null);
    listarProductos(params)
      .then(setData)
      .catch((e: any) => setErrorMsg(e?.message || "Error cargando productos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // acciones
  const onToggleEstado = async (p: ProductoDTO) => {
    // si está ACTIVO y TIENE presentaciones → bloquear
    if (p.estadoActivo && hasPres[p.idProducto]) {
      alert(`No se puede desactivar "${p.nombreProducto}" porque tiene presentaciones.`);
      return;
    }

    if (p.estadoActivo) {
      const ok = confirm(`¿Desactivar el producto "${p.nombreProducto}"?`);
      if (!ok) return;
      await desactivarProducto(p.idProducto);
    } else {
      // activar
      await updateProducto(p.idProducto, { estadoActivo: true }); // o activarProducto(...)
    }
    refresh();
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

  const catName = (id: number) => catMap.get(id) ?? id;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <button
          className="px-4 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={openCreate}
        >
          Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Buscar por nombre, principio activo o registro"
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
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

      {errorMsg && <div className="text-red-600 text-sm mb-2">{errorMsg}</div>}

      {loading ? (
        <div>Cargando…</div>
      ) : (
        <div className="space-y-3">
          {/* Encabezado solo en md+ */}
          <div className="hidden md:grid w-full grid-cols-[1.2fr_1fr_0.9fr_0.9fr_120px] items-center text-xs uppercase text-neutral-500 px-3">
            <div>Nombre</div>
            <div>Principio activo</div>
            <div>Registro</div>
            <div>Categoría</div>
            <div className="text-right pr-1">Acciones</div>
          </div>


          {/* Tarjetas */}
          {data?.content?.length ? (
  data.content.map((p) => (
    <div
      key={p.idProducto}
      className={
        // En móvil: card a 1 columna; en md+: 5 columnas “tabla”
        "grid grid-cols-1 md:grid-cols-[1.2fr_1fr_0.9fr_0.9fr_120px] " +
        "items-center gap-2 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition " +
        (!p.estadoActivo ? "opacity-60" : "")
      }
    >
      {/* Columna 1: Nombre (siempre visible) */}
      <div className="min-w-0">
        <div className="font-semibold text-neutral-800 truncate">
          {p.nombreProducto}
        </div>

        {/* Subtítulo SOLO en móvil: Principio · Registro · Categoría */}
        <div className="mt-1 text-[13px] text-neutral-600 md:hidden break-words">
          <span className="font-medium text-neutral-700">Prin:</span>{" "}
          {p.principioActivo ?? "—"}
          <span className="mx-1">·</span>
          <span className="font-medium text-neutral-700">Reg:</span>{" "}
          {p.registroSanitario ?? "—"}
          <span className="mx-1">·</span>
          <span className="font-medium text-neutral-700">Cat:</span>{" "}
          {catName(p.idCategoria)}
        </div>
      </div>

      {/* Columnas solo en md+ */}
      <div className="hidden md:block truncate">{p.principioActivo ?? "—"}</div>
      <div className="hidden md:block truncate">{p.registroSanitario ?? "—"}</div>
      <div className="hidden md:block truncate">{catName(p.idCategoria)}</div>

      {/* Acciones */}
      <div className="flex items-center md:justify-end gap-1 mt-2 md:mt-0">
        <button
          aria-label="Editar"
          title="Editar"
          onClick={() => openEdit(p)}
          className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
        >
          <Pencil size={18} />
        </button>

        {p.estadoActivo ? (
          <button
            aria-label="Desactivar"
            title="Desactivar"
            onClick={() => onToggleEstado(p)}
            className="p-2 rounded-md hover:bg-neutral-100 text-rose-600 hover:text-rose-700"
          >
            <Trash2 size={18} />
          </button>
        ) : (
          <button
            aria-label="Activar"
            title="Activar"
            onClick={() => onToggleEstado(p)}
            className="p-2 rounded-md hover:bg-neutral-100 text-emerald-600 hover:text-emerald-700"
          >
            <CheckCircle2 size={18} />
          </button>
        )}
      </div>
    </div>
  ))
) : (
  <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">
    Sin resultados
  </div>
)}

        </div>
      )}

      {/* Paginación */}
      <div className="mt-4 md:mt-3 flex flex-wrap items-center gap-2">
        <button
          className="border rounded px-3 py-1"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </button>
        <span>
          Página {data ? data.number + 1 : page + 1} de {data ? data.totalPages : 1}
        </span>
        <button
          className="border rounded px-3 py-1"
          disabled={!data || data.last}
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
