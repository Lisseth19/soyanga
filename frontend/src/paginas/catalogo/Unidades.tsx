import { useEffect, useMemo, useState } from "react";
import { unidadService } from "@/servicios/unidad";
import type { Unidad, UnidadCrearDTO, UnidadActualizarDTO } from "@/types/unidad";
import type { Page } from "@/types/pagination";
import { Pencil, Trash2, Search } from "lucide-react";

export default function UnidadesPage() {
  // listado
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [data, setData] = useState<Page<Unidad> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form lateral (create/edit)
  const [editando, setEditando] = useState<Unidad | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<UnidadCrearDTO>({
    nombreUnidad: "",
    simboloUnidad: "",
    factorConversionBase: 1,
  });

  const tituloForm = useMemo(
    () => (editando ? "Editar Unidad" : "Agregar Nueva Unidad"),
    [editando]
  );
  const textoBtn = useMemo(
    () => (editando ? "Guardar Cambios" : "Agregar Unidad"),
    [editando]
  );

  async function cargar() {
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
      setErr(e?.message || "Error cargando unidades");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, size]);

  function onEditar(u: Unidad) {
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
    if (!form.nombreUnidad.trim() || !form.simboloUnidad.trim()) {
      alert("Nombre y símbolo son obligatorios");
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
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function onDelete(u: Unidad) {
    if (!confirm(`¿Eliminar la unidad "${u.nombreUnidad}"?`)) return;
    try {
      await unidadService.remove(u.idUnidad);
      await cargar();
      if (editando?.idUnidad === u.idUnidad) onCancelar();
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar");
    }
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
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
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
              className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border bg-white hover:bg-neutral-50"
              onClick={() => unidadService.exportCsv(q)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  d="M5 20h14v-2H5v2zm7-16l-5 5h3v4h4v-4h3l-5-5z"
                  fill="currentColor"
                />
              </svg>
              Exportar CSV
            </button>
          </div>

          {/* Errores / Loading */}
          {err && <div className="text-red-600 mb-3">Error: {err}</div>}
          {loading && !err && <div className="mb-3">Cargando…</div>}

          {/* Encabezado estilo presentaciones (md+) */}
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
                    <div className="font-semibold text-neutral-800 break-words">
                      <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">
                        Unidad
                      </span>
                      {u.nombreUnidad}
                    </div>

                    {/* Símbolo */}
                    <div className="text-neutral-800">
                      <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">
                        Símbolo
                      </span>
                      {u.simboloUnidad}
                    </div>

                    {/* Factor */}
                    <div className="text-neutral-800">
                      <span className="md:hidden block text-[11px] uppercase text-neutral-500 mb-1">
                        Factor base
                      </span>
                      {u.factorConversionBase ?? 1}
                    </div>

                    {/* Acciones con íconos */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        aria-label="Editar"
                        title="Editar"
                        onClick={() => onEditar(u)}
                        className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        aria-label="Eliminar"
                        title="Eliminar"
                        onClick={() => onDelete(u)}
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
          )}

          {/* Paginación */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="border rounded px-3 py-1"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <span>
              Página {data ? data.number + 1 : page + 1} de{" "}
              {data ? data.totalPages : 1}
            </span>
            <button
              className="border rounded px-3 py-1"
              disabled={!data || data.last}
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

        {/* DERECHA: formulario (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <div className="bg-white border rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">{tituloForm}</h2>
              <form className="space-y-3" onSubmit={onSubmit}>
                <div>
                  <label className="block text-sm text-neutral-700 mb-1">
                    Nombre
                  </label>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.nombreUnidad}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nombreUnidad: e.target.value }))
                    }
                    placeholder="p. ej., Kilogramo"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-700 mb-1">
                    Símbolo
                  </label>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.simboloUnidad}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, simboloUnidad: e.target.value }))
                    }
                    placeholder="p. ej., kg"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-700 mb-1">
                    Factor de Conversión (base)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.factorConversionBase ?? 1}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        factorConversionBase: Number(e.target.value),
                      }))
                    }
                    placeholder="p. ej., 1"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex-1 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {textoBtn}
                  </button>
                  {editando && (
                    <button
                      type="button"
                      className="h-10 px-4 rounded-lg border hover:bg-neutral-50"
                      onClick={onCancelar}
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
