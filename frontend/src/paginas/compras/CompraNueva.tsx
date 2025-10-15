import { useEffect, useRef, useState } from "react";
import { comprasService } from "@/servicios/compras";
import { listarProveedores } from "@/servicios/proveedor";
import { monedaService } from "@/servicios/moneda";
import type { CompraCrearDTO } from "@/types/compras";
import type { Proveedor } from "@/types/proveedor";
import type { Moneda } from "@/types/moneda";
import { Calendar } from "lucide-react";

type Opcion = { value: number; label: string };

export default function CompraNuevaPage() {
  // formulario base
  const [form, setForm] = useState<CompraCrearDTO>({
    idProveedor: 0,
    idMoneda: 0,
    tipoCambioUsado: 1,
  });

  // combos
  const [opsProv, setOpsProv] = useState<Opcion[]>([]);
  const [opsMon, setOpsMon] = useState<Opcion[]>([]);
  const [provFiltro, setProvFiltro] = useState("");
  const [monFiltro, setMonFiltro] = useState("");

  // fecha (solo date)
  const [fecha, setFecha] = useState<string>(""); // YYYY-MM-DD
  const fechaRef = useRef<HTMLInputElement>(null);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCat, setLoadingCat] = useState(false);

  useEffect(() => {
    // cargar proveedores y monedas desde TUS servicios
    (async () => {
      try {
        setLoadingCat(true);

        // Proveedores (primeras 200 filas; si necesitas más, cambiamos a autocomplete con q)
        const provPage = await listarProveedores({ page: 0, size: 200, soloActivos: true });
        const provOps: Opcion[] = (provPage.content as Proveedor[]).map((p) => ({
          value: p.idProveedor,
          label: p.razonSocial ?? `#${p.idProveedor}`,
        }));
        setOpsProv(provOps);

        // Monedas (activas)
        const monPage = await monedaService.list({ activos: true, page: 0, size: 100, sort: "nombreMoneda,asc" });
        const monOps: Opcion[] = (monPage.content as Moneda[]).map((m) => ({
          value: m.idMoneda,
          label: (m.codigo || m.nombre || `#${m.idMoneda}`).toUpperCase(),
        }));
        setOpsMon(monOps);

        // defaults si vienen vacíos
        setForm((f) => ({
          ...f,
          idProveedor: f.idProveedor || (provOps[0]?.value ?? 0),
          idMoneda: f.idMoneda || (monOps[0]?.value ?? 0),
        }));
      } catch (e: any) {
        setErr(e.message || "No se pudieron cargar catálogos");
      } finally {
        setLoadingCat(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const dto: CompraCrearDTO = {
        ...form,
        fechaCompra: fecha ? `${fecha}T00:00:00` : undefined,
      };
      const res = await comprasService.crear(dto);
      window.location.href = `/compras/${res.idCompra}`;
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  // filtros locales para los select (no llama al backend)
  const provFiltrados = opsProv.filter((o) =>
    o.label.toLowerCase().includes(provFiltro.toLowerCase())
  );
  const monFiltradas = opsMon.filter((o) =>
    o.label.toLowerCase().includes(monFiltro.toLowerCase())
  );

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Crear Orden de Compra</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg border p-4 space-y-4 bg-white">
          {/* Proveedor */}
          <div>
            <label className="block text-sm mb-1">Proveedor</label>

            {/* filtro local sobre el dropdown */}
            <input
              className="w-full border rounded-lg px-3 py-2 mb-2"
              placeholder="Filtrar proveedores…"
              value={provFiltro}
              onChange={(e) => setProvFiltro(e.target.value)}
            />

            <div className="relative">
              <select
                className="w-full border rounded-lg px-3 py-2 appearance-none"
                value={form.idProveedor}
                onChange={(e) =>
                  setForm({ ...form, idProveedor: Number(e.target.value) })
                }
                required
                disabled={loadingCat}
              >
                {provFiltrados.length === 0 && (
                  <option value={0}>Sin resultados</option>
                )}
                {provFiltrados.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">
                ▾
              </span>
            </div>
          </div>

          {/* Fecha + Moneda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha */}
            <div>
              <label className="block text-sm mb-1">Fecha de Compra</label>
              <div className="relative">
                <input
                  ref={fechaRef}
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 pr-9"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  placeholder="dd/mm/aaaa"
                />
                <button
                  type="button"
                  onClick={() =>
                    (fechaRef.current as any)?.showPicker
                      ? (fechaRef.current as any).showPicker()
                      : fechaRef.current?.focus()
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
                  title="Abrir calendario"
                >
                  <Calendar className="h-4 w-4 text-neutral-500" />
                </button>
              </div>
            </div>

            {/* Moneda */}
            <div>
              <label className="block text-sm mb-1">Moneda</label>

              {/* filtro local sobre el dropdown */}
              <input
                className="w-full border rounded-lg px-3 py-2 mb-2"
                placeholder="Filtrar monedas…"
                value={monFiltro}
                onChange={(e) => setMonFiltro(e.target.value)}
              />

              <div className="relative">
                <select
                  className="w-full border rounded-lg px-3 py-2 appearance-none"
                  value={form.idMoneda}
                  onChange={(e) =>
                    setForm({ ...form, idMoneda: Number(e.target.value) })
                  }
                  required
                  disabled={loadingCat}
                >
                  {monFiltradas.length === 0 && (
                    <option value={0}>Sin resultados</option>
                  )}
                  {monFiltradas.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">
                  ▾
                </span>
              </div>
            </div>
          </div>

          {/* TC + Estado (visual) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Tipo de Cambio</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Ingresar tipo de cambio"
                value={form.tipoCambioUsado}
                onChange={(e) =>
                  setForm({ ...form, tipoCambioUsado: Number(e.target.value) })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Estado de Compra</label>
              <select
                className="w-full border rounded-lg px-3 py-2 appearance-none bg-neutral-50 text-neutral-500"
                value={"pendiente"}
                disabled
                title="Se establece automáticamente al crear"
              >
                <option value="pendiente">pendiente</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                * El estado inicial es <b>pendiente</b>.
              </p>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm mb-1">Observaciones</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={4}
              placeholder="Ingresar observaciones"
              value={form.observaciones || ""}
              onChange={(e) =>
                setForm({ ...form, observaciones: e.target.value })
              }
            />
          </div>
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <div className="flex gap-2">
          <button
            disabled={loading || loadingCat || !form.idProveedor || !form.idMoneda}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
          >
            Crear
          </button>
          <a href="/compras" className="px-4 py-2 border rounded-lg">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
