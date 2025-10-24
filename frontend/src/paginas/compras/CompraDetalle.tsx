import { useEffect, useMemo, useRef, useState } from "react";
import { comprasService } from "@/servicios/compras";
import { presentacionService } from "@/servicios/presentacion";
import type { Compra, CompraDetalleCrearDTO, CompraEstado } from "@/types/compras";
import type { PresentacionDTO } from "@/types/presentacion";
import { Calendar, Pencil, Trash2, Check, X, Link as LinkIcon } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

type PresOpcion = { value: number; label: string };

function presToLabel(p: Partial<PresentacionDTO>): string {
  const parts = [
    p.codigoSku ? String(p.codigoSku).toUpperCase() : null,
    p.idPresentacion || null,
    p.idProducto || null,
  ].filter(Boolean);
  return parts.join(" · ") || `#${p.idPresentacion}`;
}

const ESTADOS_BLOQUEADOS: CompraEstado[] = ["enviada", "parcial", "recibida", "anulada"];


export default function CompraDetallePage() {
  const id = Number(window.location.pathname.split("/").pop());
  const [data, setData] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // opciones para el selector de presentaciones (desde tu servicio)
  const [presOps, setPresOps] = useState<PresOpcion[]>([]);
  const [presFiltro, setPresFiltro] = useState("");
  const [cargandoPres, setCargandoPres] = useState(false);

  // mapa id -> label para mostrar en la tabla
  const [presMap, setPresMap] = useState<Record<number, string>>({});

  // --- Estado de edición en línea ---
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    cantidad?: number;
    costoUnitarioMoneda?: number;
    fechaEstimadaRecepcion?: string | null;
  }>({});
  const etaEditRef = useRef<HTMLInputElement>(null);

  const accionesBloqueadas = !!data && ESTADOS_BLOQUEADOS.includes(data.estado);
  // --- borrador vacío: pendiente + 0 ítems ---
  const itemsCount = useMemo(
    () => (data ? (data.totalItems ?? data.items?.length ?? 0) : 0),
    [data]
  );

  // Es borrador vacío sólo si está pendiente y no tiene ítems
  const isDraftEmpty = !!data && data.estado === "pendiente" && itemsCount === 0;

  // Flag para eliminar automáticamente si el usuario sale sin agregar ítems
  const autoDeleteRef = useRef(false);

  // cargar compra
  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const r = await comprasService.obtener(id);
      setData(r);
      autoDeleteRef.current = r?.estado === "pendiente" && ((r?.totalItems ?? r?.items?.length ?? 0) === 0);

      // asegura labels para los ids que ya están en la compra
      const ids = Array.from(new Set(r.items.map((it) => it.idPresentacion)));
      const faltan = ids.filter((x) => presMap[x] == null);
      if (faltan.length) {
        const nuevos: Record<number, string> = {};
        await Promise.all(
          faltan.map(async (pid) => {
            try {
              const p = await presentacionService.get(pid);
              nuevos[pid] = presToLabel(p);
            } catch {
              // ignora
            }
          })
        );
        if (Object.keys(nuevos).length) {
          setPresMap((m) => ({ ...m, ...nuevos }));
        }
      }
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  // buscar presentaciones contra backend
  async function buscarPresentaciones(q: string) {
    try {
      setCargandoPres(true);
      const page = await presentacionService.list({
        q,
        soloActivos: true,
        page: 0,
        size: 50,
        sort: "codigoSku,asc",
      });
      const ops: PresOpcion[] = page.content.map((p: PresentacionDTO) => ({
        value: p.idPresentacion,
        label: presToLabel(p),
      }));
      setPresOps(ops);

      // alimenta el map también (evita “#id” en la tabla si coincide)
      const extra: Record<number, string> = {};
      ops.forEach((o) => (extra[o.value] = o.label));
      if (Object.keys(extra).length) setPresMap((m) => ({ ...m, ...extra }));
    } finally {
      setCargandoPres(false);
    }
  }
  useEffect(() => {
    buscarPresentaciones(presFiltro);
  }, [presFiltro]);

  useEffect(() => {
    return () => {
      // si se sale/desmonta y sigue siendo borrador vacío, elimina
      if (autoDeleteRef.current) {
        comprasService.eliminar(id).catch(() => { });
      }
    };
  }, [id]);
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (autoDeleteRef.current) {
        e.preventDefault();
        e.returnValue = ""; // dispara confirm del navegador
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload as any);
  }, []);



  async function cambiarEstado(nuevo: CompraEstado) {
    if (!data) return;
    await comprasService.cambiarEstado(data.idCompra, nuevo);
    await load();
  }

  async function agregarItem(dto: CompraDetalleCrearDTO) {
    if (!data) return;
    await comprasService.agregarItem(data.idCompra, dto);
    // backend ya fusiona si existe -> recarga
    autoDeleteRef.current = false; // ya no es borrador vacío
    await load();
  }

  // --- handlers edición / borrado ---
  function startEdit(itId: number) {
    if (!data) return;
    const it = data.items.find((x) => x.idCompraDetalle === itId);
    if (!it) return;
    setEditId(itId);
    setEditForm({
      cantidad: it.cantidad,
      costoUnitarioMoneda: it.costoUnitarioMoneda,
      fechaEstimadaRecepcion: it.fechaEstimadaRecepcion ?? null,
    });
  }
  function cancelEdit() {
    setEditId(null);
    setEditForm({});
  }
  async function saveEdit() {
    if (!data || editId == null) return;
    await comprasService.actualizarItem(data.idCompra, editId, editForm);
    setEditId(null);
    setEditForm({});
    await load();
  }
  async function removeItem(detalleId: number) {
    if (!data) return;
    const ok = window.confirm("¿Eliminar este ítem?");
    if (!ok) return;
    await comprasService.eliminarItem(data.idCompra, detalleId);
    await load();
  }

  return (
    <div className="p-4 space-y-4">
      {!data && !err && <div>Cargando…</div>}
      {err && <div className="text-red-600 text-sm">{err}</div>}
      {data && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Compra #{data.idCompra}</h1>
              <div className="text-sm text-gray-600">
                Proveedor: <b>{data.proveedor ?? `#${data.idProveedor}`}</b>
              </div>
              <div className="text-sm text-gray-600">
                Fecha: {new Date(data.fechaCompra).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                Moneda: {data.idMoneda} · TC usado: {data.tipoCambioUsado}
              </div>
              <div className="text-sm">
                Estado:{" "}
                <span className="px-2 py-0.5 rounded bg-gray-100">{data.estado}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="px-3 py-2 border rounded"
                onClick={() => cambiarEstado("aprobada")}
              >
                Aprobar
              </button>
              <button
                className="px-3 py-2 border rounded"
                onClick={() => cambiarEstado("anulada")}
              >
                Anular
              </button>
              {isDraftEmpty && data && (
                <button
                  className="px-3 py-2 rounded border border-red-300 text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    await comprasService.eliminar(data.idCompra).catch(() => { });
                    window.location.assign("/compras/pedidos");
                  }}
                  title="Eliminar este pedido sin ítems"
                >
                  Eliminar borrador
                </button>
              )}

              {/* Recepcionar en verde */}
              <RouterLink
                to="recepciones/nueva"   // relativo a /compras/pedidos/:id  → /compras/pedidos/:id/recepciones/nueva
                className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center"
                aria-disabled={['anulada', 'recibida'].includes(data?.estado ?? '')}
                title="Registrar recepción para esta compra"
              >
                Recepcionar
              </RouterLink>


            </div>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Presentación</th>
                  <th className="p-2 text-right">Cantidad</th>
                  <th className="p-2 text-right">Costo unit.</th>
                  <th className="p-2 text-right">Importe</th>
                  <th className="p-2 text-left">Estimación de entrega</th>
                  <th className="p-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => {
                  const isEditing = editId === it.idCompraDetalle;
                  return (
                    <tr key={it.idCompraDetalle} className="border-t">
                      <td className="p-2">
                        {presMap[it.idPresentacion] ?? `#${it.idPresentacion}`}
                      </td>

                      {/* Cantidad */}
                      <td className="p-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            className="border rounded px-2 py-1 w-24 text-right"
                            value={editForm.cantidad ?? 0}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                cantidad: Number(e.target.value),
                              }))
                            }
                          />
                        ) : (
                          Number(it.cantidad).toFixed(3)
                        )}
                      </td>

                      {/* Costo unitario */}
                      <td className="p-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            className="border rounded px-2 py-1 w-28 text-right"
                            value={editForm.costoUnitarioMoneda ?? 0}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                costoUnitarioMoneda: Number(e.target.value),
                              }))
                            }
                          />
                        ) : (
                          Number(it.costoUnitarioMoneda).toFixed(6)
                        )}
                      </td>

                      {/* Importe */}
                      <td className="p-2 text-right">
                        {(
                          Number(isEditing ? editForm.cantidad ?? it.cantidad : it.cantidad) *
                          Number(
                            isEditing
                              ? editForm.costoUnitarioMoneda ?? it.costoUnitarioMoneda
                              : it.costoUnitarioMoneda
                          )
                        ).toFixed(2)}
                      </td>

                      {/* ETA */}
                      <td className="p-2">
                        {isEditing ? (
                          <div className="relative inline-flex">
                            <input
                              ref={etaEditRef}
                              type="date"
                              className="border rounded px-2 py-1 pr-8"
                              value={editForm.fechaEstimadaRecepcion ?? ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  fechaEstimadaRecepcion:
                                    e.target.value === "" ? null : e.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                (etaEditRef.current as any)?.showPicker
                                  ? (etaEditRef.current as any).showPicker()
                                  : etaEditRef.current?.focus()
                              }
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
                              title="Abrir calendario"
                            >
                              <Calendar className="h-4 w-4 text-neutral-500" />
                            </button>
                          </div>
                        ) : (
                          it.fechaEstimadaRecepcion ?? "—"
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-2 text-center">
                        {isEditing ? (
                          <div className="inline-flex gap-2">
                            <button
                              className="inline-flex items-center justify-center w-8 h-8 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Guardar"
                              onClick={saveEdit}
                              disabled={accionesBloqueadas}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              className="inline-flex items-center justify-center w-8 h-8 rounded border hover:bg-neutral-50"
                              title="Cancelar"
                              onClick={cancelEdit}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button
                              className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50 disabled:opacity-50"
                              title="Editar"
                              onClick={() => startEdit(it.idCompraDetalle)}
                              disabled={accionesBloqueadas}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50 disabled:opacity-50"
                              title="Eliminar"
                              onClick={() => removeItem(it.idCompraDetalle)}
                              disabled={accionesBloqueadas}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AgregarItemForm
            onSubmit={agregarItem}
            disabled={accionesBloqueadas}
            opciones={presOps}
            cargandoPres={cargandoPres}
            presFiltro={presFiltro}
            setPresFiltro={setPresFiltro}
          />

          <div className="text-right text-sm text-gray-700">
            Total ítems: {data.totalItems} · Total: {Number(data.totalMoneda).toFixed(2)}
          </div>
        </>
      )}
    </div>
  );
}

function AgregarItemForm({
  onSubmit,
  disabled,
  opciones,
  cargandoPres,
  presFiltro,
  setPresFiltro,
}: {
  onSubmit: (dto: CompraDetalleCrearDTO) => void;
  disabled?: boolean;
  opciones: PresOpcion[];
  cargandoPres: boolean;
  presFiltro: string;
  setPresFiltro: (s: string) => void;
}) {
  const [f, setF] = useState<CompraDetalleCrearDTO>({
    idPresentacion: 0,
    cantidad: 1,
    costoUnitarioMoneda: 0,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // calendario con icono para ETA
  const etaRef = useRef<HTMLInputElement>(null);

  const puedeEnviar =
    !disabled &&
    !loading &&
    !cargandoPres &&
    f.idPresentacion > 0 &&
    Number(f.cantidad) > 0 &&
    Number(f.costoUnitarioMoneda) >= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEnviar) return;
    setErr(null);
    setLoading(true);
    try {
      await onSubmit(f);
      // limpiar (el backend fusiona si corresponde)
      setF({ idPresentacion: 0, cantidad: 1, costoUnitarioMoneda: 0 });
      setPresFiltro("");
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 border rounded space-y-3 bg-gray-50">
      <div className="font-medium">Agregar ítem</div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
        {/* Presentación (buscar + seleccionar) */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Presentación</label>

          <input
            className="w-full border rounded px-2 py-1 mb-2"
            placeholder="Buscar por SKU / nombre…"
            value={presFiltro}
            onChange={(e) => setPresFiltro(e.target.value)}
          />

          <select
            className={`w-full border rounded px-2 py-1`}
            value={f.idPresentacion}
            onChange={(e) => setF({ ...f, idPresentacion: Number(e.target.value) })}
            required
            disabled={cargandoPres}
          >
            <option value={0} disabled>
              {cargandoPres ? "Buscando…" : "Seleccione una opción"}
            </option>
            {opciones.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cantidad */}
        <label className="flex flex-col">
          <span className="text-sm mb-1">Cantidad</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className="border rounded px-2 py-1"
            value={f.cantidad}
            onChange={(e) => setF({ ...f, cantidad: Number(e.target.value) })}
            required
          />
        </label>

        {/* Costo unitario */}
        <label className="flex flex-col">
          <span className="text-sm mb-1">Costo unitario</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className="border rounded px-2 py-1"
            value={f.costoUnitarioMoneda}
            onChange={(e) => setF({ ...f, costoUnitarioMoneda: Number(e.target.value) })}
            required
          />
        </label>

        {/* ETA con calendario */}
        <label className="flex flex-col">
          <span className="text-sm mb-1">Estimación de entrega (opcional)</span>
          <div className="relative">
            <input
              ref={etaRef}
              type="date"
              className="w-full border rounded px-2 py-1 pr-9"
              value={f.fechaEstimadaRecepcion || ""}
              onChange={(e) =>
                setF({
                  ...f,
                  fechaEstimadaRecepcion: e.target.value || undefined,
                })
              }
            />
            <button
              type="button"
              onClick={() =>
                (etaRef.current as any)?.showPicker
                  ? (etaRef.current as any).showPicker()
                  : etaRef.current?.focus()
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
              title="Abrir calendario"
            >
              <Calendar className="h-4 w-4 text-neutral-500" />
            </button>
          </div>
        </label>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <div>
        <button
          disabled={!puedeEnviar}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded disabled:opacity-60"
        >
          Agregar
        </button>
      </div>
    </form>
  );
}
