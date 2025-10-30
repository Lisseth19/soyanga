import { useEffect, useState } from "react";
import { almacenService } from "@/servicios/almacen";
import { lotesOptionsByAlmacen } from "@/servicios/inventario";
import { transferenciasService } from "@/servicios/transferencias";
import type { Page } from "@/types/pagination";
import type {
  TransferenciaCrearDTO,
  TransferenciaDetalleDTO,
  TransferenciaListado,
  EstadoTransferencia,
} from "@/types/transferencias";
import {NavLink} from "react-router-dom";

function leftNavClass(active: boolean) {
  return [
    "flex items-center gap-2 px-3 py-2 rounded-lg",
    active ? "bg-emerald-600 text-white" : "hover:bg-emerald-50",
  ].join(" ");
}

type Opcion = { id: number; nombre: string };

export default function TransferenciasPage() {

  // filtros
  const [estado, setEstado] = useState<"" | EstadoTransferencia>("");
  const [origenId, setOrigenId] = useState<number | "">("");
  const [destinoId, setDestinoId] = useState<number | "">("");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [page, setPage] = useState(0);

  // datos
  const [almacenes, setAlmacenes] = useState<Opcion[]>([]);
  const [res, setRes] = useState<Page<TransferenciaListado> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal crear
  const [openNew, setOpenNew] = useState(false);
  const [oneStep, setOneStep] = useState(true);
  const [form, setForm] = useState<{
    idAlmacenOrigen: number | "";
    idAlmacenDestino: number | "";
    observaciones: string;
    items: Array<{ idTmp: string; idLote: number | ""; cantidad: string; stock?: number }>;
  }>({ idAlmacenOrigen: "", idAlmacenDestino: "", observaciones: "", items: [] });

  // lotes dependientes del almacén origen
  const [lotesOrigen, setLotesOrigen] = useState<Array<{ id: number; nombre: string; stock?: number }>>([]);

  // detalle modal
  const [detail, setDetail] = useState<TransferenciaDetalleDTO | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ops = await almacenService.options({ incluirInactivos: false });
        setAlmacenes(ops);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // cargar lotes cuando cambia almacén origen en el modal
  useEffect(() => {
    (async () => {
      if (!openNew) return;
      const a = form.idAlmacenOrigen;
      if (!a || typeof a !== "number") {
        setLotesOrigen([]);
        return;
      }
      try {
        const ops = await lotesOptionsByAlmacen(a);
        setLotesOrigen(ops);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [openNew, form.idAlmacenOrigen]);

  async function buscar(p = 0) {
    setLoading(true);
    setErr(null);
    try {
      const r = await transferenciasService.list({
        estado: estado || undefined,
        origenId: origenId ? Number(origenId) : undefined,
        destinoId: destinoId ? Number(destinoId) : undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page: p,
        size: 20,
      });
      setRes(r);
      setPage(p);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Error listando transferencias");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { buscar(0); }, []); // primera carga

  function resetNew() {
    setForm({ idAlmacenOrigen: "", idAlmacenDestino: "", observaciones: "", items: [] });
    setLotesOrigen([]);
    setOneStep(true);
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { idTmp: crypto.randomUUID(), idLote: "", cantidad: "" }] }));
  }
  function rmItem(idTmp: string) {
    setForm(f => ({ ...f, items: f.items.filter(i => i.idTmp !== idTmp) }));
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.idAlmacenOrigen || !form.idAlmacenDestino || form.items.length === 0) {
      setErr("Completa origen, destino y al menos un ítem");
      return;
    }
    const dto: TransferenciaCrearDTO = {
      idAlmacenOrigen: Number(form.idAlmacenOrigen),
      idAlmacenDestino: Number(form.idAlmacenDestino),
      observaciones: form.observaciones || undefined,
      items: form.items.map(i => ({ idLote: Number(i.idLote), cantidad: Number(i.cantidad) })),
    };
    try {
      if (oneStep) await transferenciasService.crearCompleta(dto);
      else await transferenciasService.crearPendiente(dto);
      setOpenNew(false);
      resetNew();
      await buscar(page);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "No se pudo crear la transferencia");
    }
  }

  async function abrirDetalle(id: number) {
    try {
      const d = await transferenciasService.detalle(id);
      setDetail(d);
    } catch (e) {
      console.error(e);
    }
  }

  async function onAccion(id: number, acc: "salida"|"ingreso"|"anular") {
    setErr(null);
    try {
      if (acc === "salida") await transferenciasService.confirmarSalida(id);
      if (acc === "ingreso") await transferenciasService.confirmarIngreso(id);
      if (acc === "anular") {
        const motivo = window.prompt("Motivo de anulación (opcional):") || undefined;
        await transferenciasService.anular(id, motivo);
      }
      await buscar(page);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || `No se pudo ${acc}`);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Layout con sidebar pegado a la izquierda */}
      <div className="grid grid-cols-12 gap-6">
        

        {/* CONTENIDO */}
        <section className="col-span-12 md:col-span-9 lg:col-span-9">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Transferencias entre almacenes</h1>
            <button
              onClick={() => { resetNew(); setOpenNew(true); }}
              className="px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              + Nueva transferencia
            </button>
          </div>

          {/* FILTROS */}
          <div className="bg-white border rounded-2xl p-4 mb-4 grid gap-3 md:grid-cols-5">
            <div>
              <label className="block text-sm mb-1">Estado</label>
              <select className="w-full border rounded-xl px-3 py-2" value={estado} onChange={e=>setEstado(e.target.value as any)}>
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_transito">En tránsito</option>
                <option value="completada">Completada</option>
                <option value="anulada">Anulada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Origen</label>
              <select className="w-full border rounded-xl px-3 py-2" value={origenId} onChange={e=>setOrigenId(e.target.value?Number(e.target.value):"")}>
                <option value="">Todos</option>
                {almacenes.map(a=> <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Destino</label>
              <select className="w-full border rounded-xl px-3 py-2" value={destinoId} onChange={e=>setDestinoId(e.target.value?Number(e.target.value):"")}>
                <option value="">Todos</option>
                {almacenes.map(a=> <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Desde</label>
              <input type="date" className="w-full border rounded-xl px-3 py-2" value={desde} onChange={e=>setDesde(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Hasta</label>
              <input type="date" className="w-full border rounded-xl px-3 py-2" value={hasta} onChange={e=>setHasta(e.target.value)} />
            </div>
            <div className="md:col-span-5 flex gap-2">
              <button onClick={()=>buscar(0)} className="px-4 py-2 rounded-xl border">Buscar</button>
              <button onClick={() => { setEstado(""); setOrigenId(""); setDestinoId(""); setDesde(""); setHasta(""); buscar(0); }}
                      className="px-4 py-2 rounded-xl">Limpiar</button>
            </div>
          </div>

          {err && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

          {/* TABLA */}
          <div className="bg-white border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Destino</th>
                  <th className="px-3 py-2">Ítems</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!loading && res?.content?.length ? res.content.map((t)=>(
                  <tr key={t.idTransferencia} className="border-t">
                    <td className="px-3 py-2">TX{t.idTransferencia}</td>
                    <td className="px-3 py-2">{new Date(t.fecha).toLocaleString()}</td>
                    <td className="px-3 py-2 capitalize">{t.estado.replace("_"," ")}</td>
                    <td className="px-3 py-2">{t.almacenOrigen ?? `#${t.idAlmacenOrigen}`}</td>
                    <td className="px-3 py-2">{t.almacenDestino ?? `#${t.idAlmacenDestino}`}</td>
                    <td className="px-3 py-2">{t.items ?? "—"}</td>
                    <td className="px-3 py-2 flex gap-2">
                      <button onClick={()=>abrirDetalle(t.idTransferencia)} className="px-2 py-1 rounded border">Ver</button>
                      {t.estado === "pendiente" && (
                        <button onClick={()=>onAccion(t.idTransferencia,"salida")} className="px-2 py-1 rounded bg-amber-600 text-white">Confirmar salida</button>
                      )}
                      {t.estado === "en_transito" && (
                        <button onClick={()=>onAccion(t.idTransferencia,"ingreso")} className="px-2 py-1 rounded bg-emerald-600 text-white">Confirmar ingreso</button>
                      )}
                      {t.estado !== "anulada" && (
                        <button onClick={()=>onAccion(t.idTransferencia,"anular")} className="px-2 py-1 rounded bg-red-600 text-white">Anular</button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td className="px-3 py-6 text-center text-neutral-500" colSpan={7}>{loading ? "Cargando..." : "Sin resultados"}</td></tr>
                )}
              </tbody>
            </table>

            {/* paginación simple */}
            {res && (
              <div className="flex items-center justify-between p-3 border-t text-sm">
                <div>Página {res.number + 1} / {res.totalPages || 1}</div>
                <div className="flex gap-2">
                  <button disabled={page<=0} onClick={()=>buscar(page-1)} className="px-3 py-1 rounded border disabled:opacity-50">Anterior</button>
                  <button disabled={res.last} onClick={()=>buscar(page+1)} className="px-3 py-1 rounded border disabled:opacity-50">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODAL NUEVA */}
      {openNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nueva transferencia</h3>
              <button onClick={()=>setOpenNew(false)} className="px-2 py-1 rounded border">Cerrar</button>
            </div>

            <form onSubmit={submitNew} className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={oneStep} onChange={e=>setOneStep(e.target.checked)} />
                  Completar en 1 paso
                </label>
                <span className="text-xs text-neutral-500">Si se desmarca, quedará en estado <b>pendiente</b>.</span>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Almacén origen</label>
                  <select className="w-full border rounded-xl px-3 py-2"
                          value={form.idAlmacenOrigen}
                          onChange={e=>setForm(f=>({...f, idAlmacenOrigen: e.target.value?Number(e.target.value):""}))}
                          required>
                    <option value="">— Selecciona —</option>
                    {almacenes.map(a=> <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Almacén destino</label>
                  <select className="w-full border rounded-xl px-3 py-2"
                          value={form.idAlmacenDestino}
                          onChange={e=>setForm(f=>({...f, idAlmacenDestino: e.target.value?Number(e.target.value):""}))}
                          required>
                    <option value="">— Selecciona —</option>
                    {almacenes.map(a=> <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Observación</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.observaciones}
                       onChange={e=>setForm(f=>({...f, observaciones: e.target.value}))}/>
              </div>

              {/* Items */}
              <div className="border rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Ítems</div>
                  <button type="button" onClick={addItem} className="px-3 py-1 rounded border">+ Agregar</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((it) => (

                    <div key={it.idTmp} className="grid md:grid-cols-5 gap-2 items-end">
                      <div className="md:col-span-3">
                        <label className="block text-xs mb-1">Lote (del origen)</label>
                        <select className="w-full border rounded-xl px-3 py-2"
                                value={it.idLote}
                                onChange={e=>{
                                  const v = e.target.value?Number(e.target.value):"";
                                  const lote = lotesOrigen.find(x=>x.id===v);
                                  setForm(f=> ({...f, items: f.items.map(x=> x.idTmp===it.idTmp ? ({...x, idLote: v, stock: lote?.stock}) : x)}));
                                }}
                                disabled={!form.idAlmacenOrigen}
                                required>
                          <option value="">— Selecciona —</option>
                          {lotesOrigen.map(l=>(
                            <option key={l.id} value={l.id}>{l.nombre}{l.stock!=null ? ` — Stock: ${l.stock}`:""}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs mb-1">Cantidad</label>
                        <input type="number" step="0.001" min="0" className="w-full border rounded-xl px-3 py-2"
                               value={it.cantidad} onChange={e=>{
                                 const v = e.target.value;
                                 setForm(f=> ({...f, items: f.items.map(x=> x.idTmp===it.idTmp ? ({...x, cantidad: v}) : x)}));
                               }} required />
                      </div>
                      <div className="md:col-span-1 flex gap-2">
                        {it.stock!=null && <span className="text-xs text-neutral-500 self-center">Disp: {it.stock}</span>}
                        <button type="button" onClick={()=>rmItem(it.idTmp)} className="px-3 py-2 rounded border self-center">Quitar</button>
                      </div>
                    </div>
                  ))}
                  {form.items.length===0 && <div className="text-sm text-neutral-500">Añade al menos un lote.</div>}
                </div>
              </div>

              {err && <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setOpenNew(false)} className="px-4 py-2 rounded-xl border">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-2xl bg-emerald-600 text-white">
                  {oneStep ? "Crear y completar" : "Crear pendiente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Transferencia TX{detail.idTransferencia}</h3>
              <button onClick={()=>setDetail(null)} className="px-2 py-1 rounded border">Cerrar</button>
            </div>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div><b>Fecha:</b> {new Date(detail.fecha).toLocaleString()}</div>
              <div className="capitalize"><b>Estado:</b> {detail.estado.replace("_"," ")}</div>
              <div><b>Origen:</b> {detail.almacenOrigen ?? `#${detail.idAlmacenOrigen}`}</div>
              <div><b>Destino:</b> {detail.almacenDestino ?? `#${detail.idAlmacenDestino}`}</div>
              {detail.observaciones && <div className="md:col-span-2"><b>Obs.:</b> {detail.observaciones}</div>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-2xl p-3">
                <div className="font-medium mb-2">Ítems</div>
                <ul className="space-y-1 text-sm">
                  {detail.items.map(it=>(
                    <li key={it.idLote} className="flex justify-between border-b py-1">
                      <div>{it.sku} — {it.producto} <span className="text-neutral-500">({it.numeroLote})</span></div>
                      <div className="font-medium">{it.cantidad}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border rounded-2xl p-3">
                <div className="font-medium mb-2">Movimientos</div>
                <ul className="space-y-1 text-sm">
                  {detail.movimientos.map(m=>(
                    <li key={m.idMovimiento} className="flex justify-between border-b py-1">
                      <div>{new Date(m.fechaMovimiento).toLocaleString()} — {m.tipoMovimiento}</div>
                      <div className="font-medium">{m.cantidad}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
