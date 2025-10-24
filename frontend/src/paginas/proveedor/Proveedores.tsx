// src/paginas/proveedor/Proveedores.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ProveedorService } from "@/servicios/proveedor";
import type { Proveedor } from "@/types/proveedor";
import type { Page } from "@/types/pagination";

function formatId(n: number) {
  const num = Number.isFinite(n) ? Math.trunc(n) : 0;
  return `P${String(num).padStart(4, "0")}`;
}

export default function ProveedoresPage() {
  const { can } = useAuth() as { can: (permiso: string) => boolean };

  // permisos
  const canVer = useMemo(() => can("proveedores:ver"), [can]);
  const canCrear = useMemo(() => can("proveedores:crear"), [can]);
  const canEditar = useMemo(() => can("proveedores:actualizar"), [can]);
  const canEliminar = useMemo(() => can("proveedores:eliminar"), [can]);

  // búsqueda con debounce
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");

  // datos
  const [page, setPage] = useState<Page<Proveedor> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal crear/editar y modal ver-más
  const [panelOpen, setPanelOpen] = useState(false);
  const [verMas, setVerMas] = useState<Proveedor | null>(null);

  // form + edición
  const [edit, setEdit] = useState<Proveedor | null>(null);
  const [form, setForm] = useState<Partial<Proveedor>>({
    razonSocial: "",
    nit: "",
    contacto: "",
    telefono: "",
    correoElectronico: "",
    direccion: "",
    estadoActivo: true,
  });

  const DEFAULT_SORT = "razonSocial,asc";
  const show403 = () => alert("No tienes permiso para realizar esta acción.");

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // cargar
  async function load() {
    if (!canVer) {
      setError("Acceso denegado.");
      setPage(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await ProveedorService.listar({
        q: query || undefined,
        page: 0,
        size: 20,
        sort: DEFAULT_SORT,
        soloActivos: false,
      });
      setPage(res);
    } catch (e: any) {
      if (e?.status === 401) setError("No autorizado. Inicia sesión nuevamente.");
      else if (e?.status === 403) setError("Acceso denegado.");
      else setError(e?.message ?? "Error al listar proveedores");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function resetForm() {
    setEdit(null);
    setForm({
      razonSocial: "",
      nit: "",
      contacto: "",
      telefono: "",
      correoElectronico: "",
      direccion: "",
      estadoActivo: true,
    });
  }

  function startCreate() {
    if (!canCrear) return show403();
    resetForm();
    setPanelOpen(true);
    setTimeout(() => document.getElementById("f-razon")?.focus(), 0);
  }

  function startEdit(p: Proveedor) {
    if (!canEditar) return show403();
    setEdit(p);
    setForm({
      razonSocial: p.razonSocial || "",
      nit: p.nit || "",
      contacto: p.contacto || "",
      telefono: p.telefono || "",
      correoElectronico: p.correoElectronico || "",
      direccion: p.direccion || "",
      estadoActivo: !!p.estadoActivo,
    });
    setPanelOpen(true);
    setTimeout(() => document.getElementById("f-razon")?.focus(), 0);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razonSocial?.trim()) {
      alert("La razón social es obligatoria");
      return;
    }
    const payload: any = {
      razonSocial: form.razonSocial?.trim(),
      nit: form.nit?.trim() || undefined,
      contacto: form.contacto?.trim() || undefined,
      telefono: form.telefono?.trim() || undefined,
      correoElectronico: form.correoElectronico?.trim() || undefined,
      direccion: form.direccion?.trim() || undefined,
      estadoActivo: !!form.estadoActivo,
    };

    try {
      setLoading(true);
      if (edit) {
        if (!canEditar) return show403();
        await ProveedorService.editar(edit.idProveedor, payload);
      } else {
        if (!canCrear) return show403();
        await ProveedorService.crear(payload);
      }
      await load();
      resetForm();
      setPanelOpen(false);
    } catch (e: any) {
      if (e?.status === 403) return show403();
      alert(e?.message ?? "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(p: Proveedor) {
    if (!canEliminar) return show403();
    if (!confirm(`¿Eliminar a "${p.razonSocial}"?`)) return;
    try {
      setLoading(true);
      await ProveedorService.eliminar(p.idProveedor);
      await load();
    } catch (e: any) {
      if (e?.status === 403) return show403();
      alert(e?.message ?? "Error al eliminar");
    } finally {
      setLoading(false);
    }
  }

  // ordenar por id ascendente (visual)
  const rows = (page?.content ?? []).slice().sort((a, b) => a.idProveedor - b.idProveedor);

  return (
    <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-3">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-800">
          Gestión de Proveedores
        </h1>

        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar proveedor..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50
                text-sm placeholder-gray-400 text-gray-800
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              type="text"
            />
          </div>

          {canCrear && (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 shadow w-full sm:w-auto"
            >
              Agregar proveedor
            </button>
          )}
        </div>
      </div>

      {/* ======= LISTA RESPONSIVE ======= */}
      {/* Desktop / Tablet: TABLA */}
      <div className="hidden md:block">
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <colgroup>
                <col className="w-[110px]" />
                <col className="w-[40%]" />
                <col className="w-[15%]" />
                <col className="w-[25%]" />
                <col className="w-[20%]" />
              </colgroup>

              <thead className="bg-gray-50 text-gray-600 text-[13px] uppercase font-bold">
                <tr>
                  <th className="px-6 py-3 text-left">Identificación</th>
                  <th className="px-6 py-3 text-left">Proveedor</th>
                  <th className="px-6 py-3 text-left">Teléfono</th>
                  <th className="px-6 py-3 text-left">Correo</th>
                  <th className="px-6 py-3 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      Cargando…
                    </td>
                  </tr>
                )}
                {error && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No hay proveedores
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  rows.map((p) => (
                    <tr key={p.idProveedor} className="bg-white align-top">
                      <td className="px-6 py-4 font-extrabold text-gray-800">
                        {formatId(p.idProveedor)}
                      </td>

                      <td className="px-6 py-4 text-gray-900 whitespace-normal break-words">
                        <div title={p.razonSocial}>{p.razonSocial}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {p.direccion ? p.direccion : ""}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-900 whitespace-normal break-words">
                        {p.telefono || "—"}
                      </td>

                      <td className="px-6 py-4 text-gray-900 whitespace-normal break-words">
                        {p.correoElectronico || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          {canEditar && (
                            <button
                              className="text-blue-600 hover:underline"
                              onClick={() => startEdit(p)}
                            >
                              Editar
                            </button>
                          )}
                          {canEliminar && (
                            <button
                              className="text-red-600 hover:underline"
                              onClick={() => onDelete(p)}
                            >
                              Eliminar
                            </button>
                          )}
                          <button
                            className="text-gray-600 hover:underline"
                            onClick={() => setVerMas(p)}
                          >
                            Ver Más
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile: TARJETAS */}
      <div className="md:hidden space-y-3">
        {loading && <div className="text-center text-gray-400 py-6">Cargando…</div>}
        {error && !loading && <div className="text-center text-red-500 py-6">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="text-center text-gray-400 py-6">No hay proveedores</div>
        )}

        {!loading &&
          !error &&
          rows.map((p) => (
            <article
              key={p.idProveedor}
              className="border rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-500">ID</div>
                <div className="font-semibold">{formatId(p.idProveedor)}</div>
              </div>

              <div className="mt-2">
                <div className="text-xs text-gray-500">Proveedor</div>
                <div className="text-[15px] font-medium whitespace-normal break-words">
                  {p.razonSocial}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500">Teléfono</div>
                  <div className="text-sm whitespace-normal break-words">
                    {p.telefono || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Correo</div>
                  <div className="text-sm whitespace-normal break-words">
                    {p.correoElectronico || "—"}
                  </div>
                </div>
              </div>

              {p.direccion && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500">Dirección</div>
                  <div className="text-sm whitespace-normal break-words">{p.direccion}</div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-4 text-sm">
                {canEditar && (
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => startEdit(p)}
                  >
                    Editar
                  </button>
                )}
                {canEliminar && (
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => onDelete(p)}
                  >
                    Eliminar
                  </button>
                )}
                <button
                  className="text-gray-600 hover:underline"
                  onClick={() => setVerMas(p)}
                >
                  Ver Más
                </button>
              </div>
            </article>
          ))}
      </div>

      {/* === MODAL (centrado) AGREGAR / EDITAR === */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setPanelOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <aside
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="proveedor-form-title"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 id="proveedor-form-title" className="text-xl font-bold tracking-wide">
                  {edit ? "Editar proveedor" : "Agregar nuevo proveedor"}
                </h2>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              <form className="p-6 space-y-5" onSubmit={onSubmit}>
                <Field
                  id="f-razon"
                  label="Razón social:"
                  value={form.razonSocial || ""}
                  onChange={(v) => setForm((f) => ({ ...f, razonSocial: v }))}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="NIT/ CI:" value={form.nit || ""} onChange={(v) => setForm((f) => ({ ...f, nit: v }))} />
                  <Field
                    label="Contacto:"
                    value={form.contacto || ""}
                    onChange={(v) => setForm((f) => ({ ...f, contacto: v }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field
                    label="Teléfono:"
                    value={form.telefono || ""}
                    onChange={(v) => setForm((f) => ({ ...f, telefono: v }))}
                  />
                  <Field
                    label="Correo:"
                    type="email"
                    value={form.correoElectronico || ""}
                    onChange={(v) => setForm((f) => ({ ...f, correoElectronico: v }))}
                  />
                </div>

                <Field
                  label="Dirección:"
                  value={form.direccion || ""}
                  onChange={(v) => setForm((f) => ({ ...f, direccion: v }))}
                />

                <div className="flex items-center gap-3 pt-2">
                  <input
                    id="f-activo"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-400"
                    checked={!!form.estadoActivo}
                    onChange={(e) => setForm((f) => ({ ...f, estadoActivo: e.target.checked }))}
                  />
                  <label htmlFor="f-activo" className="text-[15px]">Activo</label>
                </div>

                <div className="flex items-center gap-4 pt-2 justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2"
                  >
                    {edit ? "Guardar" : "Crear"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setPanelOpen(false);
                    }}
                    className="rounded-md border px-6 py-2 hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </aside>
          </div>
        </>
      )}

      {/* === MODAL VER MÁS === */}
      {verMas && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setVerMas(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-xl font-bold">Detalles del Proveedor</h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setVerMas(null)}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Detail label="ID" value={formatId(verMas.idProveedor)} />
                <Detail label="Razón social" value={verMas.razonSocial} />
                <Detail label="NIT/ CI" value={verMas.nit || "—"} />
                <Detail label="Contacto" value={verMas.contacto || "—"} />
                <Detail label="Teléfono" value={verMas.telefono || "—"} />
                <Detail label="Correo" value={verMas.correoElectronico || "—"} />
                <Detail label="Dirección" value={verMas.direccion || "—"} />
                <Detail label="Estado" value={verMas.estadoActivo ? "Activo" : "Inactivo"} />
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                {canEditar && (
                  <button
                    className="rounded-md bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2"
                    onClick={() => {
                      startEdit(verMas);
                      setVerMas(null);
                    }}
                  >
                    Editar
                  </button>
                )}
                {canEliminar && (
                  <button
                    className="rounded-md bg-red-500 hover:bg-red-600 text-white px-4 py-2"
                    onClick={() => {
                      onDelete(verMas);
                      setVerMas(null);
                    }}
                  >
                    Eliminar
                  </button>
                )}
                <button className="rounded-md border px-4 py-2" onClick={() => setVerMas(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ===== Helpers UI ===== */
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[15px] font-medium mb-1">{children}</label>;
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  className = "",
}: {
  id?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-gray-400 outline-none pb-1"
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</div>
      <div className="text-sm mt-1">{value}</div>
    </div>
  );
}
