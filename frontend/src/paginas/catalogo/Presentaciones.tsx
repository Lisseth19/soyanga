import { useEffect, useMemo, useRef, useState } from "react";
import { presentacionService } from "@/servicios/presentacion";
import type { Page, PresentacionDTO, PresentacionCrearDTO } from "@/types/presentacion";
import { Pencil, Trash2, ImageUp, CheckCircle2 } from "lucide-react"; // ← íconos
// ✅ usa tus servicios reales de opciones
import { opcionesProductos } from "@/servicios/producto";
import { unidadService } from "@/servicios/unidad";

type Opcion = { id: number; nombre: string };

export default function PresentacionesPage() {
  // filtros
  const [idProducto, setIdProducto] = useState<number | undefined>(undefined);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState("codigoSku,asc");
  const [soloActivos, setSoloActivos] = useState(true); // ← NUEVO, por defecto marcado

  // datos
  const [data, setData] = useState<Page<PresentacionDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // opciones
  const [productos, setProductos] = useState<Opcion[]>([]);
  const [unidades, setUnidades] = useState<Opcion[]>([]);

  const [prodFiltro, setProdFiltro] = useState(""); // texto de búsqueda en el panel derecho

const productosFiltrados = useMemo(() => {
  const q = prodFiltro.trim().toLowerCase();
  if (!q) return productos;
  return productos.filter(p => p.nombre.toLowerCase().includes(q));
}, [prodFiltro, productos]);



  // --- INICIO: helpers de panel crear/editar ---
  const INITIAL_FORM: PresentacionCrearDTO = {
    idProducto: 0,
    idUnidad: 0,
    contenidoPorUnidad: 1,
    codigoSku: "",
    costoBaseUsd: 0,
    margenVentaPorcentaje: 0,
    precioVentaBob: 0,
  };

  // ref del input file del FORM (no confundir con fileInputRef de las filas)
  const formFileRef = useRef<HTMLInputElement>(null);

  // función para resetear completamente el panel
  function resetPanel() {
    setEditando(null);
    setForm(INITIAL_FORM);
    setNewFile(null);
    setPreview(null);
    if (formFileRef.current) formFileRef.current.value = "";
  }
  // --- FIN: helpers de panel crear/editar ---


  // form
  const [form, setForm] = useState<PresentacionCrearDTO>(INITIAL_FORM);

  const [editando, setEditando] = useState<PresentacionDTO | null>(null);
  const tituloForm = editando ? "Editar Presentación" : "Agregar Presentación";
  const textoBoton = editando ? "Guardar" : "Agregar";

  // upload por fila
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetIdForUpload, setTargetIdForUpload] = useState<number | null>(null);

  // (opcional) upload desde el formulario de crear/editar
  const [newFile, setNewFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const ASSETS_BASE = import.meta.env.VITE_ASSETS_BASE ?? ""; // ej: http://localhost:8084
  function assetUrl(path?: string | null) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${ASSETS_BASE}${path}`;
  }

  // Arrastrar/soltar (UI)
  const [isDragging, setIsDragging] = useState(false);

  // Valida y setea archivo (tamaño y tipo)
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

  // Para abrir el diálogo de archivos desde el dropzone
  function pickFormFile() {
    formFileRef.current?.click();
  }

  // Drag & drop handlers
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
        ? (dt.items[0].kind === "file" ? dt.items[0].getAsFile() : null)
        : dt.files?.[0];
    if (file) validateAndSetFile(file);
  }

// opcional: cuando el form ya tiene idProducto, mostramos el nombre en el buscador
useEffect(() => {
  if (!form.idProducto) return;
  const m = productos.find(p => p.id === form.idProducto);
  if (m) setProdFiltro(m.nombre);
}, [form.idProducto, productos]);


  // ✅ cargar combos con servicios reales
  useEffect(() => {
    (async () => {
      try {
        const [prods, unis] = await Promise.all([
          opcionesProductos(),          // -> Array<{id, nombre}>
          unidadService.opciones(),     // -> Array<{id, nombre}> (símbolo o nombre corto)
        ]);
        setProductos(prods);
        setUnidades(unis);
      } catch {
        setProductos([]);
        setUnidades([]);
      }
    })();
  }, []);

  const params = useMemo(() => ({ idProducto, q, page, size, sort, soloActivos }), [idProducto, q, page, size, sort, soloActivos]);

  // listar
  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await presentacionService.list(params);
      setData(res);
    } catch (e: any) {
      setErr(e?.message || "Error cargando presentaciones");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params]);

  // acciones
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        // si hay imagen nueva, súbela
        if (newFile) {
          await presentacionService.subirImagen(saved.idPresentacion, newFile);
        }
      } else {
        saved = await presentacionService.create(form);
        if (newFile) {
          await presentacionService.subirImagen(saved.idPresentacion, newFile);
        }
      }
      // reset
      resetPanel()
      await load();
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar");
    }
  };

  const onEdit = (p: PresentacionDTO) => {
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

  const onDeactivate = async (p: PresentacionDTO) => {
    const ok = confirm(`¿Desactivar la presentación ${p.codigoSku}?`);
    if (!ok) return;
    await presentacionService.deactivate(p.idPresentacion);
    await load();
  };

  const onToggleEstado = async (p: PresentacionDTO) => {
    if (p.estadoActivo) {
      const ok = confirm(`¿Desactivar la presentación ${p.codigoSku}?`);
      if (!ok) return;
      await presentacionService.deactivate(p.idPresentacion); // ya lo tienes
    } else {
      // Activar usando el endpoint de update (PresentacionActualizarDTO tiene estadoActivo)
      await presentacionService.update(p.idPresentacion, { estadoActivo: true });
    }
    await load();
  };


  // helpers UI (muestran nombres en tabla)
  const nombreProducto = (id: number) => productos.find(x => x.id === id)?.nombre || id;
  const simboloUnidad = (id: number) => unidades.find(x => x.id === id)?.nombre || id;

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
              onChange={(e) => { setPage(0); setIdProducto(e.target.value ? Number(e.target.value) : undefined); }}
            >
              <option value="">Todos los productos</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>

            <input
              className="border rounded-lg px-3 py-2 w-full sm:flex-1"
              placeholder="Buscar por Nombre o Sku"
              value={q}
              onChange={(e) => { setPage(0); setQ(e.target.value); }}
            />

            <select
              className="border rounded-lg px-3 py-2 w-full sm:w-56"
              value={sort}
              onChange={(e) => { setPage(0); setSort(e.target.value); }}
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
                onChange={(e) => { setSoloActivos(e.target.checked); setPage(0); }}
              />
              Solo activos
            </label>

          </div>

          {err && <div className="text-red-600 mb-2">Error: {err}</div>}
          {loading ? (
            <div className="mb-2">Cargando…</div>
          ) : (
            <div className="space-y-3">

              {/* Encabezado: visible solo en md+ */}
              <div className="hidden md:grid w-full grid-cols-[64px_120px_1.2fr_0.8fr_0.8fr_0.8fr_132px] items-center text-xs uppercase text-neutral-500 px-3">
                <div>Img</div>
                <div>SKU</div>
                <div>Producto</div>
                <div>Unidad</div>
                <div>Contenido</div>
                <div>Precio BOB</div>
                <div className="text-right pr-1">Acciones</div>
              </div>


              {/* Filas como cards */}
              {data?.content?.length ? (
                data.content.map((p) => (
                  <div
                    key={p.idPresentacion}
                    className={
                      // Móvil: 2 columnas (img + contenido); Desktop: las 7 columnas “tabla”
                      "grid w-full grid-cols-[64px_1fr] md:grid-cols-[64px_120px_1.2fr_0.8fr_0.8fr_0.8fr_132px] " +
                      "items-center gap-2 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition " +
                      (!p.estadoActivo ? "opacity-60" : "")
                    }
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

                    {/* Contenido principal (columna 2 en móvil / varias en md+) */}
                    {/* SKU (solo md+) */}
                    <div className="hidden md:block font-semibold text-neutral-800">{p.codigoSku}</div>

                    {/* Producto */}
                    <div className="min-w-0">
                      <div className="font-semibold text-neutral-800 truncate">
                        {nombreProducto(p.idProducto)}
                      </div>

                      {/* Subtítulo compacto SOLO en móvil */}
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

                    {/* Unidad / Contenido / Precio (solo md+) */}
                    <div className="hidden md:block">{simboloUnidad(p.idUnidad)}</div>
                    <div className="hidden md:block">{p.contenidoPorUnidad}</div>
                    <div className="hidden md:block">{p.precioVentaBob}</div>

                    {/* Acciones */}
                    <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1 mt-2 md:mt-0">
                      <button
                        aria-label="Editar"
                        title="Editar"
                        onClick={() => onEdit(p)}
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

                      <button
                        aria-label="Cambiar imagen"
                        title="Cambiar imagen"
                        onClick={() => {
                          setTargetIdForUpload(p.idPresentacion);
                          fileInputRef.current?.click();
                        }}
                        className="p-2 rounded-md hover:bg-neutral-100 text-emerald-700 hover:text-emerald-800"
                      >
                        <ImageUp size={18} />
                      </button>
                    </div>
                  </div>

                ))
              ) : (
                <div className="text-center text-neutral-500 py-10 bg-white rounded-xl">
                  Sin registros
                </div>
              )}

              {/* input oculto para subir imagen (compartido por filas) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f || targetIdForUpload == null) return;

                  if (!f.type.startsWith("image/")) {
                    alert("Solo imágenes");
                    e.currentTarget.value = "";
                    return;
                  }
                  if (f.size > 5 * 1024 * 1024) {
                    alert("Máx. 5MB");
                    e.currentTarget.value = "";
                    return;
                  }

                  await presentacionService.subirImagen(targetIdForUpload, f);
                  setTargetIdForUpload(null);
                  e.currentTarget.value = "";
                  await load();
                }}
              />
            </div>
          )}


          {/* paginación */}
          <div className="mt-4 md:mt-3 flex flex-wrap items-center gap-2">
            <button className="border rounded px-3 py-1" disabled={!data || data.first} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</button>
            <span>Página {data ? data.number + 1 : page + 1} de {data ? data.totalPages : 1}</span>
            <button className="border rounded px-3 py-1" disabled={!data || data.last} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            <select className="border rounded px-2 py-1 ml-auto" value={size} onChange={(e) => { setPage(0); setSize(Number(e.target.value)); }}>
              {[10, 20, 50].map(n => <option key={n} value={n}>{n} por página</option>)}
            </select>
          </div>
        </div>

        {/* FORM */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <div className="bg-white border rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">{tituloForm}</h2>
              <form className="space-y-3" onSubmit={onSubmit}>
                <div>
  <label className="block text-sm text-neutral-700 mb-1">Producto</label>

  {/* 🔎 Buscador por nombre */}
  <input
    className="w-full border rounded-lg px-3 py-2 mb-2"
    placeholder="Buscar producto por nombre…"
    value={prodFiltro}
    onChange={(e) => setProdFiltro(e.target.value)}
  />

  {/* Selector filtrado */}
  <select
    className="w-full border rounded-lg px-3 py-2"
    value={form.idProducto > 0 ? form.idProducto : 0}
    onChange={(e) =>
      setForm(f => ({ ...f, idProducto: Number(e.target.value) }))
    }
  >
    <option value={0} disabled>Selecciona…</option>
    {productosFiltrados.slice(0, 100).map(p => (
      <option key={p.id} value={p.id}>{p.nombre}</option>
    ))}
  </select>

  {/* Hint cuando no hay resultados */}
  {prodFiltro && productosFiltrados.length === 0 && (
    <div className="text-xs text-amber-600 mt-1">
      No se encontraron productos con “{prodFiltro}”.
    </div>
  )}
</div>


                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">Unidad</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.idUnidad}
                      onChange={(e) => setForm(f => ({ ...f, idUnidad: Number(e.target.value) }))}
                    >
                      <option value={0} disabled>Selecciona…</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">Contenido</label>
                    <input
                      type="number" min={0} step="0.000001"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.contenidoPorUnidad}
                      onChange={(e) => setForm(f => ({ ...f, contenidoPorUnidad: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-neutral-700 mb-1">SKU</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.codigoSku}
                    onChange={(e) => setForm(f => ({ ...f, codigoSku: e.target.value }))}
                    placeholder="p. ej., GLI-1L"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">Costo USD</label>
                    <input
                      type="number" step="0.01" min={0}
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.costoBaseUsd ?? 0}
                      onChange={(e) => setForm(f => ({ ...f, costoBaseUsd: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">% Margen</label>
                    <input
                      type="number" step="0.01" min={0}
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.margenVentaPorcentaje ?? 0}
                      onChange={(e) => setForm(f => ({ ...f, margenVentaPorcentaje: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">Precio BOB</label>
                    <input
                      type="number" step="0.01" min={0}
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.precioVentaBob ?? 0}
                      onChange={(e) => setForm(f => ({ ...f, precioVentaBob: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                {/* Imagen de la presentación (opcional) */}
                {/* Imagen de la presentación (dropzone) */}
                <div>
                  <label className="block text-sm text-neutral-700 mb-1">Imagen</label>

                  {/* Dropzone */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={pickFormFile}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pickFormFile(); }}
                    onDragOver={onDragOver}
                    onDragEnter={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={[
                      "rounded-lg border-2 border-dashed p-4 flex items-center gap-4 cursor-pointer transition",
                      isDragging ? "border-emerald-500 bg-emerald-50/40" : "border-neutral-300 hover:bg-neutral-50"
                    ].join(" ")}
                  >
                    {/* Preview si hay archivo elegido */}
                    {preview ? (
                      <img
                        src={preview}
                        alt="preview"
                        className="w-16 h-16 object-cover rounded-md border"
                      />
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

                  {/* input real oculto (formulario) */}
                  <input
                    ref={formFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFormFileChange}
                  />
                </div>


                <div className="pt-2 flex gap-2">
                  <button type="submit" className="flex-1 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                    {textoBoton}
                  </button>
                  {editando && (
                    <button
                      type="button"
                      className="h-10 px-4 rounded-lg border hover:bg-neutral-50"
                      onClick={resetPanel}
                    >
                      Cancelar
                    </button>

                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
