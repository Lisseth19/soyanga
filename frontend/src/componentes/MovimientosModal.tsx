import type { MovimientoDeInventario } from "@/servicios/inventario";

export function MovimientosModal({
  open, onClose, titulo, loading, error, items
}:{
  open:boolean; onClose:()=>void; titulo:string;
  loading:boolean; error:string|null; items:MovimientoDeInventario[];
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[min(900px,95vw)] max-h-[85vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold">Movimientos — {titulo}</h2>
          <button className="px-2 py-1 text-sm border rounded" onClick={onClose}>Cerrar</button>
        </div>
        <div className="p-4 space-y-3 overflow-auto">
          {loading && <div className="text-sm text-gray-600">Cargando movimientos…</div>}
          {error && <div className="text-sm text-red-600">Error: {error}</div>}
          {!loading && !error && items.length === 0 && <div className="text-sm text-gray-500">Sin movimientos recientes.</div>}
          {items.length>0 && (
            <table className="min-w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-right px-3 py-2">Cantidad</th>
                  <th className="text-left px-3 py-2">Origen</th>
                  <th className="text-left px-3 py-2">Destino</th>
                  <th className="text-left px-3 py-2">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m,i)=>{
                  const negativo = ["salida_venta","reserva_anticipo","transferencia_salida"].includes(m.tipoMovimiento);
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{m.fechaMovimiento}</td>
                      <td className="px-3 py-2">{m.tipoMovimiento}</td>
                      <td className={`px-3 py-2 text-right ${negativo?"text-red-600":"text-green-700"}`}>{negativo?"-":"+"}{m.cantidad}</td>
                      <td className="px-3 py-2">{m.almacenOrigen ?? "—"}</td>
                      <td className="px-3 py-2">{m.almacenDestino ?? "—"}</td>
                      <td className="px-3 py-2">{m.referenciaModulo} #{m.idReferencia}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
